import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  useContext,
} from 'preact/hooks';
import { memo } from 'preact/compat';
import {
  useLocalizationCountry,
  useSessionToken,
} from '@shopify/ui-extensions/customer-account/preact';
import CsvUploader from './CsvUploader';
import CsvUploadSummary from './CsvUploadSummary';
import { type CsvUploaderRefs } from './CsvUploader';
import {
  extractId,
  convertToShoppingListFields,
  removeShopifyGidPrefix,
} from '@/services'
import { useShop, useCustomer, useApp, LocationContext } from '@/customer-account/contexts';
import { useHttp, useContents } from '@/customer-account/hook';
import { ExtensionType, TranslationType } from '@/types/enum';

const CsvUploadSection = () => {
  const shop = useShop();
  const app = useApp();
  const { customer } = useCustomer();
  const sessionToken = useSessionToken();
  const { isoCode: countryCode } = useLocalizationCountry();

  const {
    getTranslationData,
    getCurrentCustomerShoppingList,
    createShoppingList,
  } = useHttp(sessionToken.get);

  const location = useContext(LocationContext);

  const [listShoppingList, setListShoppingList] = useState([]);
  const [lineItems, setLineItems] = useState([]);;
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [createLink, setCreateLink] = useState('');
  const [isCollectContents, setIsCollectContents] = useState(true);
  const [loadingCreateShoppingList, setLoadingCreateShoppingList] = useState(false);
  const [isShoppingListCreated, setIsShoppingListCreated] = useState(false);
  const [metaFieldContents, setMetaFieldContent] = useState({});
  const [processingCsvData, setProcessingCsvData] = useState<boolean>(false);
  const [errors, setErrors] = useState([]);

  const csvUploader = useRef<CsvUploaderRefs | null>(null);

  const { contents } = useContents(ExtensionType.CsvUpload, metaFieldContents);

  const fetchShoppingList = useCallback(async () => {
    if (!location?.id) return;

    try {
      const shoppingList = await getCurrentCustomerShoppingList(location?.id);

      if (shoppingList?.data?.list && shoppingList?.data?.list.length) {
        setListShoppingList(shoppingList.data.list);
      }
    } catch (error) {
      console.error('Error fetching shopping list:', error);
    }
  },[location?.id]);

  useEffect(() => {
    if (!shop?.id) return;

    const collectContents = async () => {
      try {
        setIsCollectContents(true);
        const contentsData = await getTranslationData({
          type: TranslationType.CsvUpload,
          shopId: extractId(shop.id),
        });

        setMetaFieldContent(contentsData?.data);
      } finally {
        setIsCollectContents(false);
      }
    }

    collectContents();
  }, [shop]);

  useEffect(() => {
    if (!location?.id) return;

    fetchShoppingList();
  }, [location?.id, fetchShoppingList]);

  const isCreateOrderPermission = useMemo(() => {
    if (!customer?.permissions) return false;

    const isCreateOrder = customer?.permissions?.includes('create_order_from_csv');

    return isCreateOrder;
  },[customer?.permissions]);

  const isCreateShoppingListPermission = useMemo(() => {
    if (!customer?.permissions) return false;

    const isCreateShoppingList = customer?.permissions?.includes('create_shopping_list_from_csv');

    return isCreateShoppingList;
  },[customer?.permissions]);

  const cartPermalink= useMemo(() => {
    const variantLink = lineItems.map(obj => `${obj.variantId}:${obj.quantity}`).join(',');

    if (app && app.csvUploadSettings?.create_order_action[0] === 'cart') {
      return `${shop?.primaryDomain?.url}/cart/${variantLink}?storefront=true&attributes[create-from-duos]=csv-upload`;
    }

    return `${shop?.primaryDomain?.url}/cart/${variantLink}?attributes[create-from-duos]=csv-upload`;
  }, [lineItems, shop, app]);

  const handleCreateOrder = () => {
    setIsCreatingOrder(true);

    setTimeout(() => {
      setCreateLink(cartPermalink);

      setIsCreatingOrder(false);
    }, 500);
  };

  const handleCreateShoppingList = useCallback(async () => {
    if (!location) return;
    try {
      setLoadingCreateShoppingList(true);

      const newShoppingList = {
        title: 'New Shopping List',
        description: 'Shopping list create form CSV upload',
        status: customer.permissions?.includes('approve_shopping_list') ? 'approved' :'draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        countryCode,
        createdBy: {
          id: removeShopifyGidPrefix(customer.customerId, 'Customer'),
          name: customer.customerName,
        },
        location: location,
        lineItems: lineItems.map((item) => ({
          id: item.variantId,
          title: item.productName,
          productTitle: item.productName,
          variantTitle: item.variantName,
          quantity: item.quantity,
          price: item.price,
          total: Number(item.quantity) * Number(item.price),
          image: item.image,
          min: item.minimum || 1,
          max: item.maximum,
          step: item.increment || 1,
          availableStock: item.availableStock,
          inventoryPolicy: item.inventoryPolicy,
          currency: location?.currency,
        })),
      };

      const requestShoppingList = convertToShoppingListFields(location, customer, newShoppingList);

      await createShoppingList(location?.id, requestShoppingList);

      setLoadingCreateShoppingList(false);
      setIsShoppingListCreated(true);
    } catch (error) {
      console.error('Error creating shopping list:', error);
    }
  }, [location, shop?.id, customer, lineItems, listShoppingList]);

  useEffect(() => {
    setCreateLink('');
    setIsShoppingListCreated(false);
  }, [lineItems]);

  return (
    <s-section>
      <s-stack gap="small">
        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
          <s-box maxInlineSize="80%">
            <s-stack direction="block" gap="small">
              <s-heading>{contents.title}</s-heading>
              <s-text>{contents.sub_title}</s-text>
            </s-stack>
          </s-box>
          <s-box maxInlineSize="100px">
            <s-image
              src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              alt="CSV Upload Illustration"
              inlineSize="auto"
            />
          </s-box>
        </s-stack>
        <CsvUploader
          ref={csvUploader}
          modelValue={lineItems}
          setModelValue={setLineItems}
          errors={errors}
          processingCsvData={processingCsvData}
          setErrors={setErrors}
          setProcessingCsvData={setProcessingCsvData}
          contents={contents}
        />
      </s-stack>
      <CsvUploadSummary
        children={
          <s-box padding="base none none none">
            {
              createLink
                ?
                <s-link href={createLink} target='_blank'>
                  <s-grid gridTemplateColumns="fill">
                    <s-button variant="secondary">
                      {app?.csvUploadSettings?.create_order_action[0] === 'cart' ? contents.go_to_cart : contents.go_to_checkout}
                    </s-button>
                  </s-grid>
                </s-link>
                :
                <s-stack direction='inline' alignContent={"center"} gap="base">
                  <s-button
                    loading={isCreatingOrder}
                    variant={'secondary'}
                    disabled={Boolean(errors.length) || !isCreateOrderPermission}
                    onClick={() => { handleCreateOrder() }}
                  >
                    {contents.create_order}
                  </s-button>
                  {
                    errors.length
                      ? (
                        <s-button variant={'secondary'} onClick={() => csvUploader.current?.removeCsv()}>
                          {contents.re_upload_csv}
                        </s-button>
                      )
                      : (
                        app && app?.csvUploadSettings?.enable_shopping_list ? (
                          isShoppingListCreated ? (
                            <s-stack direction='inline' alignContent={"center"}>
                              <s-icon type="check" tone="success"></s-icon>
                              <s-text tone="success">{contents.shopping_list_created}</s-text>
                            </s-stack>
                          ) : (
                          <s-button
                            disabled={!isCreateShoppingListPermission}
                            loading={loadingCreateShoppingList}
                            variant="secondary"
                            onClick={handleCreateShoppingList}
                          >
                            {contents.create_shopping_list}
                          </s-button>
                          )
                        ) : null
                      )

                  }
                </s-stack>
            }
          </s-box>
        }
        lineItems={lineItems}
        setLineItems={(lineItems: any[]) => setLineItems(lineItems)}
        errors={errors}
        processingCsvData={processingCsvData}
        contents={contents}
      />
    </s-section>
  );
}

export default memo(CsvUploadSection);
