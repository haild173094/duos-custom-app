import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { memo } from 'preact/compat';
import {
  useSessionToken,
  useLocalizationCountry,
  useLanguage,
} from '@shopify/ui-extensions/customer-account/preact';
import {
  QuickOrderRow,
  VariantPicker,
} from '@/customer-account/components';
import { ShoppingListOrderTable, ShoppingListDetailEditor } from '.';
import CsvUploader from '../../../csv-upload/src/CsvUploader';
import { type CsvUploaderRefs } from '../../../csv-upload/src/CsvUploader';
import { type IOrderItem } from '@/types';
import {
  randomId,
  generateId,
  removeShopifyGidPrefix,
  formatDate,
  normalizeProductVariants,
  capitalizeFirstLetter,
} from '@/services';
import { useApp, useCustomer, useShop, LocationContext } from '@/customer-account/contexts';
import { useHttp } from '@/customer-account/hook';
import { useShoppingList } from '../hooks';
import isEqual from 'lodash/isEqual';
import { ShoppingListStatus, IShoppingListFields } from '@/types';

type Props = {
  id: string | number,
  contents: Record<string, any>,
}

const ShoppingListDetailPage: React.FC<Props> = ({ id, contents }) => {
  const { customer } = useCustomer();
  const location = useContext(LocationContext);
  const sessionToken = useSessionToken();
  const { isoCode: countryCode } = useLocalizationCountry();
  const { isoCode: languageCode } = useLanguage();
  const shop = useShop();
  const {
    createShoppingList,
    updateCustomerShoppingList,
    getProductVariantByIds,
    getShoppingListDetail,
  } = useHttp(sessionToken.get);
  const app = useApp();

  const {
    listShoppingList,
    allListShoppingList,
    convertToShoppingListFields,
  } = useShoppingList();

  const defaultShoppingList = {
    title: 'New Shopping List',
    description: '',
    lineItems: []
  };

  const defaultSkuOrderList = [
    {
      id: '',
      displayId: 1,
      sku: '',
      quantity: 1,
      isError: false,
    }
  ];

  const INVENTORY_POLICY_CONTINUE = 'CONTINUE';

  const [isCreate, setIsCreate] = useState<boolean>(Number.isNaN(id));
  const [shoppingList, setShoppingList] = useState<Record<string, any>>({});
  const [orderList, setOrderList] = useState<Record<string, any>[]>([]);
  const [skuOrderList, setSkuOrderList] = useState<Record<string, any>[]>(defaultSkuOrderList);
  const [csvOrderList, setCsvOrderList] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [notInLocationItems, setNotInLocationItems] = useState<Record<string, any>[]>([]);
  const [invalidQuantityItems, setInvalidQuantityItems] = useState<Record<string, any>[]>([]);
  const [isExpandErrors, setIsExpandErrors] = useState<boolean>(false);
  const [loadingCreateCart, setLoadingCreateCart] = useState<boolean>(false);
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, any>[]>([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [link, setLink] = useState<string>('');
  const [preparingShoppingList, setPreparingShoppingList] = useState<boolean>(true);
  const [isChanged, setIsChanged] = useState<boolean>(false);
  const [originalShoppingList, setOriginalShoppingList] = useState<Record<string, any> | null>(null);
  const [reasonValue, setReasonValue] = useState<string>('');
  const [shoppingListId, setShoppingListId] = useState<string | number>(id || '');

  const csvUploader = useRef<CsvUploaderRefs | null>(null);

  const hasInvalidSkuLine = useMemo(() => !skuOrderList.length
    || skuOrderList.some(
      (line) => !line.sku || line.skuError || line.quantityError || line.isProcessing || line.isDebounce
    ), [skuOrderList],
  );

  const pageSubtitle = useMemo(
    () => shoppingList.updatedAt
      ? contents.updated_at.replaceAll('{{time}}', formatDate(shoppingList.updatedAt, `${languageCode}-${countryCode}`))
      : ''
    , [shoppingList.updatedAt, contents]
  );

  const itemIds = useMemo(() => orderList.map(item => item.id.toString()), [orderList]);

  const notInLocationItemTitles = useMemo(
    () => (notInLocationItems || []).map(item => `${item.productTitle} - ${item.variantTitle}`), [
    notInLocationItems,
  ]);

  const notInLocationErrorMessage = useMemo(
    () => (
      notInLocationItemTitles.length
        ? contents.error_not_in_location.replaceAll('{{titles}}', notInLocationItemTitles.join(', '))
        : ''
    ), [
    notInLocationItemTitles.length,
  ]);

  const invalidQuantityItemTitles = useMemo(
    () => (invalidQuantityItems || []).map(item => `${item.productTitle} - ${item.variantTitle}`), [
    invalidQuantityItems,
  ]);

  const inValidQuantityErrorMessage = useMemo(
    () => (invalidQuantityItemTitles.length
      ? contents.error_invalid_quantity.replaceAll('{{titles}}', invalidQuantityItemTitles.join(', '))
      : ''
    ), [
    invalidQuantityItemTitles.length,
  ]);

  const isEditable = useMemo(() => {
    if (!customer?.permissions) return false;

    const writePermission = customer.permissions.includes('write_shopping_list');

    return writePermission;
  }, [customer?.permissions]);

  const isApprovePermission = useMemo<boolean>(() => {
    return isEditable && customer?.permissions?.includes('approve_shopping_list');
  }, [customer?.permissions, isEditable]);

  const isCreateOrderPermission = useMemo<boolean>(() => {
    return customer?.permissions?.includes('create_order_shopping_list');
  }, [customer?.permissions]);

  const handleChangeReason = (value: string) => {
    setReasonValue(value);
  };

  const getItemStatus = (status: string) => {
    const mapStatusLabel = {
      [ShoppingListStatus.Draft]: contents.status_draft,
      [ShoppingListStatus.Pending]: contents.status_pending,
      [ShoppingListStatus.Approved]: contents.status_approved,
      [ShoppingListStatus.Rejected]: contents.status_rejected,
    }

    return mapStatusLabel[status] || status;
  };

  const addNewDataToOrderList = (data: Record<string, any>[]) => {
    setOrderList((prev: any) => {
      return [
        ...prev,
        ...data,
      ].reduce((acc: Record<string, any>[], curr: Record<string, any>) => {
        const isOrderItemChecked = acc.some((item) => item.id === curr.id);

        if (!isOrderItemChecked) {
          return [
            ...acc,
            curr,
          ];
        }

        return acc.map(
          (item) => item.id === curr.id
            ? {
              ...item,
              quantity: item.quantity + curr.quantity,
            } : item,
        );
      }, []);
    })
  }

  const addSkuOrderListToShoppingList = useCallback(() => {
    if (!skuOrderList.length) return;

    const formattedSkuOrderList = skuOrderList.map((item) => ({
      id: item.id,
      productTitle: item.productTitle,
      variantTitle: item.variantTitle,
      min: item.min || 1,
      max: item.max,
      step: item.step || 1,
      quantity: item.quantity,
      availableStock: item.availableStock,
      inventoryPolicy: item.inventoryPolicy,
      price: parseFloat(item.price),
      image: item.image,
    }));

    addNewDataToOrderList(formattedSkuOrderList);
    setSkuOrderList(defaultSkuOrderList);
  }, [skuOrderList]);

  const addCsvOrderListToShoppingList = useCallback(() => {
    if (!csvOrderList.length) return;

    const formattedCsvOrderList = csvOrderList.map((item) => ({
      id: item.variantId,
      productTitle: item.productName,
      variantTitle: item.variantName,
      min: item.minimum,
      max: item.maximum,
      availableStock: item.availableStock,
      quantity: item.quantity,
      price: parseFloat(item.price),
      step: item.increment,
      inventoryPolicy: item.inventoryPolicy,
      image: item.image,
    }));

    addNewDataToOrderList(formattedCsvOrderList);

    setCsvOrderList([]);
  }, [csvOrderList]);

  // validate functions start
  const validateItemsByLocations = (items: Record<string, any>[]) => {
    const inValidItems = items.filter(variant => !variant.availableInLocation)

    setNotInLocationItems(inValidItems);

    return !Boolean(inValidItems.length);
  };

  const validateItemQuantityRule = (item: Record<string, any>) => {
    const { min, max, step, quantity } = item;

    if ((quantity < min) || ((quantity - min) % step !== 0) || (max && quantity > max)) {
      return false;
    }

    return true;
  };

  const validateItemInventory = (item: Record<string, any>) => {
    const { inventoryPolicy, availableStock, quantity, isTracked } = item;

    if (typeof isTracked === 'boolean' && !isTracked) {
      return true;
    }

    if (inventoryPolicy !== INVENTORY_POLICY_CONTINUE && quantity > availableStock) {
      return false;
    }

    return true;
  };

  const validateItemQuantity = (item: Record<string, any>) => {
    if (!validateItemQuantityRule(item)) {
      return false;
    }

    return validateItemInventory(item);
  };

  const validateItemsByQuantity = (items: Record<string, any>[]) => {
    const inValidItems = items.filter(item => !validateItemQuantity(item));

    setInvalidQuantityItems(inValidItems);

    return !Boolean(inValidItems.length);
  };

  const validate = useCallback(async () => {
    // fetch real data of variants by ids
    const res = await getProductVariantByIds(itemIds, shop?.id, location?.id, countryCode);
    const variants = normalizeProductVariants(res);
    let result = {
      isValid: false,
      realLinesData: [],
    }

    // re-mapping orderlist with real variants data
    const newOrderList = orderList
      .map((item) => {
        const realData = variants.find(v => item.id === v.id);

        return realData
          ? {
            ...realData,
            productTitle: item.productTitle,
            quantity: item.quantity,
          } : null
      })
      .filter(item => Boolean(item))

    result = {
      ...result,
      realLinesData: newOrderList,
    }

    // calculate none location item and wrong quantity
    if (validateItemsByLocations(newOrderList)) {
      result = {
        ...result,
        isValid: validateItemsByQuantity(newOrderList),
      }
    }

    return result;
  }, [
    shop?.id,
    location?.id,
    itemIds,
    validateItemsByLocations,
    validateItemsByQuantity,
    orderList,
    countryCode,
  ]);
  // validate functions end

  const handleUpdateShoppingList = useCallback(async (status?: string) => {
    if (
      !listShoppingList
      || !listShoppingList.length
      || !orderList.length
      || !location?.id
    ) {
      return;
    }

    try {
      setLoading(true);

      if (status && status === ShoppingListStatus.Rejected) {
        setIsRejecting(true);
      } else if (status && status === ShoppingListStatus.Approved) {
        setIsAccepting(true);
      }

      const { isValid: isValidShoppingList, realLinesData } = await validate();

      if (!isValidShoppingList) {
        setLoading(false);

        return;
      }

      const updatedShoppingList = {
        ...shoppingList,
        lineItems: realLinesData,
        updatedAt: new Date().toString(),
        location: location.id,
        reason: reasonValue,
        status: status || shoppingList.status,
      }

      const requestShoppingList = convertToShoppingListFields(updatedShoppingList);

      await updateCustomerShoppingList(location?.id, id.toString(), requestShoppingList);

      setOriginalShoppingList(updatedShoppingList)
      setShoppingList(updatedShoppingList);
      setOrderList(realLinesData);

      let toastMessage = contents.save_shopping_list_detail_message;

      if (status) {
        toastMessage = status === ShoppingListStatus.Pending ?
          contents.submit_shopping_list_message :
          (status === ShoppingListStatus.Approved ?
            contents.approve_shopping_list_message :
            contents.reject_shopping_list_message);
      }

      shopify.toast.show(toastMessage);
    } catch (error) {
      shopify.toast.show(error?.description || error?.message);
    } finally {
      setLoading(false);
      setIsRejecting(false);
      setIsAccepting(false);
    }
  }, [
    id,
    listShoppingList,
    allListShoppingList,
    shoppingList,
    orderList,
    customer,
    reasonValue,
    validate,
    location?.id,
    isRejecting,
    isAccepting,
  ]);

  const handleCreateShoppingList = useCallback(async () => {
    if (!orderList.length || !location?.id) {
      return;
    }

    try {
      setLoading(true);

      const { isValid: isValidShoppingList, realLinesData } = await validate();

      if (!isValidShoppingList) {
        setLoading(false);

        return;
      }

      const newShoppingList = {
        title: shoppingList.title,
        description: shoppingList.description,
        lineItems: realLinesData,
        updatedAt: new Date().toString(),
        createdAt: new Date().toString(),
        location: location.id,
        status: isApprovePermission ? ShoppingListStatus.Approved : ShoppingListStatus.Draft,
        countryCode,
        createdBy: {
          id: removeShopifyGidPrefix(customer.customerId, 'Customer'),
          name: customer.customerName,
        },
      };

      const requestShoppingList = convertToShoppingListFields(newShoppingList);

      const res = await createShoppingList(location.id, requestShoppingList);
      const createdId = removeShopifyGidPrefix(res.data?.id, 'Metaobject');

      setIsCreate(false);

      setOriginalShoppingList(newShoppingList)
      setShoppingList(newShoppingList);
      setOrderList(realLinesData);
      setShoppingListId(createdId);

      navigation.navigate(`/shopping-list/${createdId}`);

      shopify.toast.show(contents.shopping_list_created);
    } catch (error) {
      shopify.toast.show(error?.description || error?.message);
    } finally {
      setLoading(false);
    }
  }, [
    originalShoppingList,
    shoppingList,
    orderList,
    customer,
    validate,
    setIsCreate,
    location?.id,
  ]);

  const compareShoppingList = useCallback(() => {
    if (!originalShoppingList || !shoppingList) return;

    let originalData = originalShoppingList;
    let currentData = shoppingList;

    originalData = {
      ...originalData,
      lineItems: originalData.lineItems.map((item: Record<string, any>) => {
        const newItem: any = {
          ...item,
          quantity: Number(item.quantity),
        };

        delete newItem.quantityError;

        return newItem;
      })
    }

    currentData = {
      ...currentData,
      lineItems: currentData.lineItems.map((item: Record<string, any>) => {
        const newItem: any = {
          ...item,
          quantity: Number(item.quantity),
        };

        delete newItem.quantityError;

        return newItem;
      })
    }

    if (isEqual(JSON.stringify(originalData), JSON.stringify(currentData))) {
      setIsChanged(false);
    } else {
      setIsChanged(true);
    }
  }, [originalShoppingList, shoppingList]);

  const updateOrderItem = (index: number, data: Record<string, any>) => {
    setOrderList((prev: IOrderItem[]) => prev.map((line: IOrderItem, i) => index !== i
      ? line
      : {
        ...line,
        ...data,
      },
    ));
  };

  const removeOrderItem = (index: number) => {
    setOrderList((prev: any) => {
      const clonePrev = [...prev];
      clonePrev.splice(index, 1);

      return clonePrev;
    });
  };

  const updateSkuOrderItem = (index: number, data: Record<string, any>) => {
    setSkuOrderList((prev: IOrderItem[]) => prev.map((line: IOrderItem, i) => index !== i
      ? line
      : {
        ...line,
        ...data,
      },
    ));
  };

  const removeSkuOrderItem = (index: number) => {
    setSkuOrderList((prev: any) => {
      const clonePrev = [...prev];
      clonePrev.splice(index, 1);

      return clonePrev;
    });
  };

  const getDefaultSkuOrderItem = () => ({
    displayId: randomId(),
    sku: '',
    quantity: 1,
  });

  const addSkuOrderItem = () => {
    const newItem = getDefaultSkuOrderItem();

    setSkuOrderList((prev: any) => ([
      ...prev,
      newItem,
    ]));
  };

  const updateShoppingList = (key: string, value: string) => {
    setShoppingList(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  useEffect(async () => {
    setPreparingShoppingList(true);

    if (isCreate) { // create shopping list case
      setShoppingList(defaultShoppingList);
      setOriginalShoppingList(defaultShoppingList);

      setPreparingShoppingList(false);
      return;
    }

    // Edit shopping list case
    try {
      const res = await getShoppingListDetail(location?.id, shoppingListId);

      if (res && res.data && res.data.fields) {
        const shoppingListDataString = res.data.fields.find((field: any) => field.key === 'data')?.value;

        const shoppingListData = shoppingListDataString ? JSON.parse(shoppingListDataString) : null;

        if (shoppingListData) {
          setShoppingList(shoppingListData);
          setOrderList(shoppingListData.lineItems || []);
          setOriginalShoppingList(shoppingListData);
          setPreparingShoppingList(false);
        }
      }
    } catch (error) {
      shopify.toast.show(error?.description || error?.message);
    }
  }, [isCreate, location?.id, shoppingListId]);

  useEffect(() => {
    if (csvErrors.length) return;

    addCsvOrderListToShoppingList();
  }, [addCsvOrderListToShoppingList]);

  useEffect(() => {
    if (!selectedProductVariants.length) return;

    setOrderList(prev => ([
      ...prev,
      ...(selectedProductVariants.map(variant => ({
        ...variant,
        quantity: variant.min || 1,
      }))),
    ])
      .reduce((acc: IOrderItem[], curr: IOrderItem) => {
        const isItemTracked = acc.some(item => item.id === curr.id);

        if (!isItemTracked) {
          return [
            ...acc,
            curr,
          ]
        }

        return acc.map((item: IOrderItem) => item.id === curr.id
          ? { ...item, quantity: item.quantity + curr.quantity }
          : item);
      }, [])
      .filter((item: IOrderItem) => item.id)
    );

    setSelectedProductVariants([]);
  }, [selectedProductVariants]);

  useEffect(() => {
    setLink(''); // Reset link when order list is changed
    setShoppingList(prev => ({
      ...prev,
      lineItems: [...orderList],
    }));
  }, [orderList]);

  useEffect(() => {
    compareShoppingList();
  }, [shoppingList]);

  const cartPermalink = useMemo(() => {
    const variantLink = orderList.map(obj => `${obj.id}:${obj.quantity}`).join(',');

    if (app && app.shoppingListSettings?.create_order_action[0] === 'cart') {
      return `${shop?.primaryDomain?.url}/cart/${variantLink}?storefront=true&attributes[create-from-duos]=shopping-list`;
    }

    return `${shop?.primaryDomain?.url}/cart/${variantLink}?attributes[create-from-duos]=shopping-list`;
  }, [orderList, shop]);

  const skuOrderRows = useMemo(() => {
    return skuOrderList.map((line, index) => (
      <QuickOrderRow
        key={line.displayId}
        index={index}
        line={line}
        updateOrderItem={updateSkuOrderItem}
        removeOrderItem={removeSkuOrderItem}
        contents={contents}
        hideVariantDetail
      />
    ));
  }, [skuOrderList]);

  const errorBanner = useMemo(() => {
    if (!notInLocationErrorMessage && !inValidQuantityErrorMessage) {
      return null;
    }

    return (
      <s-banner tone={'critical'}>
        <s-grid gridTemplateColumns="auto, 5%">
          <s-text>{contents.error_shopping_list_banner_title}</s-text>
          <s-clickable onClick={() => { setIsExpandErrors(!isExpandErrors) }}>
            <s-stack justifyContent={'end'}>
              {
                isExpandErrors
                  ?
                  <s-icon type={'chevron-up'} tone={'custom'} />
                  :
                  <s-icon type={'chevron-down'} tone={'custom'} />
              }
            </s-stack>
          </s-clickable>
        </s-grid>
        <>
          {
            isExpandErrors
              ?
              <s-stack direction='block'>
                {notInLocationErrorMessage && <s-text>{notInLocationErrorMessage}</s-text>}
                {inValidQuantityErrorMessage && <s-text>{inValidQuantityErrorMessage}</s-text>}
              </s-stack>
              :
              <s-clickable onClick={() => { setIsExpandErrors(true) }}>
                <s-text color={'subdued'}>{contents.error_show_more}</s-text>
              </s-clickable>
          }
        </>
      </s-banner>
    );
  }, [
    notInLocationErrorMessage,
    inValidQuantityErrorMessage,
    isExpandErrors,
  ]);

  const buttonStatus = useMemo(() => {
    if (shoppingList.status === ShoppingListStatus.Draft) {
      return (
        <s-button
          disabled={!isEditable || isChanged}
          loading={loading}
          variant="secondary"
          onClick={() => handleUpdateShoppingList(ShoppingListStatus.Pending)}
        >
          {contents.submit_for_approval}
        </s-button>
      );
    } else if (shoppingList.status === ShoppingListStatus.Pending && isApprovePermission) {
      return (
        <>
          <s-button
            disabled={!isApprovePermission}
            variant='secondary'
            loading={isAccepting}
            command='--show'
            commandFor='accept-confirm'
          >
            {contents.approve}
          </s-button>
          <s-modal
            id="accept-confirm"
            heading={contents.approve_confirm_title}
          >
            <s-button
              slot='primary-action'
              variant='primary'
              loading={loading}
              onClick={() => handleUpdateShoppingList(ShoppingListStatus.Approved)}
            >
              {contents.approve}
            </s-button>
            <s-button
              slot='secondary-actions'
              variant='secondary'
              command='--hide'
              commandFor='accept-confirm'
            >
              {contents.cancel}
            </s-button>
            <s-box padding='small-200 none none none'>
              <s-text>
                {contents.approve_confirm_message}
              </s-text>
              <s-box padding='base none'>
                <s-text-field
                  label={contents.reason}
                  value={reasonValue}
                  onChange={(e) => handleChangeReason(e.target.value)}
                />
              </s-box>
            </s-box>
          </s-modal>
          <s-button
            disabled={!isApprovePermission}
            variant='secondary'
            loading={isRejecting}
            command='--show'
            commandFor='reject-confirm'
          >
            {contents.reject}
          </s-button>
          <s-modal
            id='reject-confirm'
            heading={contents.reject_confirm_title}
          >
            <s-button
              slot='primary-action'
              variant='primary'
              tone='critical'
              loading={loading}
              onClick={() => handleUpdateShoppingList(ShoppingListStatus.Rejected)}
            >
              {contents.reject}
            </s-button>
            <s-button
              slot='secondary-actions'
              variant='secondary'
              command='--hide'
              commandFor='reject-confirm'
            >
              {contents.cancel}
            </s-button>
            <s-box padding='small-200 none none none'>
              <s-text>
                {contents.reject_confirm_message}
              </s-text>
             <s-box padding='base none'>
                <s-text-field
                  label={contents.reason}
                  value={reasonValue}
                  onChange={(e) => handleChangeReason(e.target.value)}
                />
              </s-box>
            </s-box>
          </s-modal>
        </>
      )
    }

    return null;
  }, [
    shoppingList.status,
    loading,
    id,
    reasonValue,
    isRejecting,
    isAccepting,
    isChanged,
    contents,
    isEditable,
    isApprovePermission,
    handleUpdateShoppingList,
  ]);

  const handleCreateCart = async () => {
    setLoadingCreateCart(true);

    setTimeout(() => {
      setLink(cartPermalink);

      setLoadingCreateCart(false);
    }, 500);
  };

  if (preparingShoppingList) {
    return null;
  }

  return (
    <s-box>
      {/* Page - custom for primary action button not work with link */}
      <s-grid gridTemplateColumns="auto 30%" alignItems={"center"}>
        <s-stack direction='inline' alignItems='center' gap="small-200">
          <s-button variant="secondary" href="/">
            <s-icon type="arrow-left" />
          </s-button>
          <s-stack direction='block' gap="none">
            <s-stack direction='inline' alignItems="center" gap="small">
              <s-heading>{shoppingList.title}</s-heading>
              {
                shoppingListId ? (
                  <s-badge>{getItemStatus(shoppingList.status)}</s-badge>
                ) : null
              }
            </s-stack>
            <s-text color="subdued">{pageSubtitle}</s-text>
          </s-stack>
        </s-stack>
        <s-stack direction='inline' justifyContent={"end"} gap="small" alignItems='center'>
          {buttonStatus}
          {
            (shoppingList.status === ShoppingListStatus.Draft || !id || (isApprovePermission && shoppingList.status !== ShoppingListStatus.Pending))
              ? (<s-button
                onClick={() => id ? handleUpdateShoppingList() : handleCreateShoppingList()}
                disabled={!isEditable || !orderList.length || !isChanged || (shoppingList.status === ShoppingListStatus.Rejected)}
                variant='primary'
                loading={loading}
              >
                {id ? contents.save : contents.create}
              </s-button>)
              : null
          }
          {
            shoppingList.status === ShoppingListStatus.Approved
              ? (orderList.length
                ? (link
                  ? (<s-button disabled={!isCreateOrderPermission} href={link} target="_blank" variant="secondary">
                      <s-text tone="custom">{app?.shoppingListSettings?.create_order_action[0] === 'cart' ? contents.go_to_cart : contents.go_to_checkout}</s-text>
                    </s-button>
                  )
                  : (<s-button
                    variant="secondary"
                    disabled={!isCreateOrderPermission || isChanged}
                    onClick={handleCreateCart}
                    loading={loadingCreateCart}
                  >
                    {contents.create_order}
                  </s-button>))
                : null)
              : null
          }
        </s-stack>
      </s-grid>
      {/* End Page */}
      <s-grid
        gridTemplateColumns={"40% 60%"}
        gap="base"
        paddingBlockStart='large-100'
      >
        <s-box>
          <s-stack direction='block' gap="base">
            <s-section>
              <s-stack direction='block' gap="base">
                <s-stack direction='inline' justifyContent='space-between' alignItems='center'>
                  <s-text type="strong">{shoppingList.title}</s-text>
                  <s-stack justifyContent='end'>
                    <ShoppingListDetailEditor
                      shoppingList={shoppingList}
                      setShoppingList={setShoppingList}
                      contents={contents}
                    />
                  </s-stack>
                </s-stack>
                <s-paragraph color={shoppingList.description ? undefined : 'subdued'}>
                  {shoppingList.description || contents.note_placeholder}
                </s-paragraph>
                {
                  shoppingList.reason && (
                    <s-paragraph>
                      <s-text>{(shoppingList.status === ShoppingListStatus.Approved) ? contents.reason_label_accept : contents.reason_label_reject}: </s-text>
                      {shoppingList.reason}
                    </s-paragraph>
                  )
                }
              </s-stack>
            </s-section>

            <s-section>
              <s-stack direction='block' gap="base">
                <s-stack direction='inline' gap="small" alignContent='center' justifyContent='space-between'>
                  <s-text type="strong">{contents.search_by_product_name}</s-text>
                  <s-stack justifyContent="end">
                    <VariantPicker
                      contents={contents}
                      modelValue={selectedProductVariants}
                      setModelValue={setSelectedProductVariants}
                      activator={{
                        content: contents.search,
                        icon: 'search',
                      }}
                    />
                  </s-stack>
                </s-stack>
                <s-divider />
                <s-stack direction='inline' justifyContent='space-between' alignItems='center'>
                  <s-text type="strong">{contents.quick_add_skus}</s-text>
                  <s-stack justifyContent="end">
                    <s-clickable onClick={addSkuOrderItem}>
                      <s-text tone="custom">+ {contents.add_line}</s-text>
                    </s-clickable>
                  </s-stack>
                </s-stack>
                <s-stack direction='block' gap="base">
                  {skuOrderRows}
                  <s-button
                    variant="secondary"
                    disabled={hasInvalidSkuLine}
                    onClick={addSkuOrderListToShoppingList}
                    inlineSize='fill'
                  >
                    {contents.add_to_shopping_list}
                  </s-button>
                </s-stack>
                <s-divider />
                <s-stack direction='block'>
                  <s-box paddingBlockEnd="base">
                    <s-text type="strong">{contents.upload_csv}</s-text>
                  </s-box>
                  <CsvUploader
                    ref={csvUploader}
                    displayType="column"
                    modelValue={csvOrderList}
                    setModelValue={setCsvOrderList}
                    errors={csvErrors}
                    setErrors={setCsvErrors}
                    contents={contents}
                  />
                </s-stack>
              </s-stack>
            </s-section>
          </s-stack>
        </s-box>
        <s-grid-item>
          <s-section>
            <s-stack direction='block'>
              {errorBanner}
              <s-box>
                <ShoppingListOrderTable
                  items={orderList}
                  updateItem={updateOrderItem}
                  removeItem={removeOrderItem}
                  contents={contents}
                />
              </s-box>
            </s-stack>
          </s-section>
        </s-grid-item>
      </s-grid>
    </s-box>
  )
};

export default memo(ShoppingListDetailPage);
