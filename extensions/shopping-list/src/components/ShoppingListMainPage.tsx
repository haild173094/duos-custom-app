import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks';
import {
  useSessionToken,
  useLanguage,
  useLocalizationCountry,
} from '@shopify/ui-extensions/customer-account/preact';
import {
  formatDate,
  generateId,
  capitalizeFirstLetter,
} from '@/services'
import { useCustomer, LocationContext } from '@/customer-account/contexts';
import { useHttp, useMoney } from '@/customer-account/hook';
import { useShoppingList } from '../hooks';
import  DeleteConfirmModal from '@/customer-account/components/others/DeleteConfirmModal';
import { IShoppingListFields, ShoppingListStatus } from '@/types';
import { delay } from '@/services/helper';

const DEFAULT_PAGE_LIMIT = 10;

const STATUS = {
  all: 'all',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
};

type Props = {
  contents: Record<string, any>,
  viewType?: 'grid' | 'list',
  setViewType: (type: 'grid' | 'list') => void,
}

const ShoppingListMainPage: React.FC<Props> = ({ contents, viewType = 'list', setViewType }) => {
  const sessionToken = useSessionToken();
  const { customer } = useCustomer();

  const { isoCode: languageCode } = useLanguage();
  const { isoCode: countryCode } = useLocalizationCountry();

  const {
    createShoppingList,
    deleteShoppingList,
  } = useHttp(sessionToken.get);

  const { formatMoney } = useMoney();

  const {
    listShoppingList,
    isLoadingListShoppingList,
    allListShoppingList,
    paginationInfo,
    getAllCustomerShoppingList,
    getShoppingList,
    convertToShoppingListFields,
    handleNextPage,
    handlePreviousPage,
  } = useShoppingList();

  const location = useContext(LocationContext);

  const DELETE_MODAL_ID = 'delete-shopping-list-modal';
  const ACTIONS_MENU_ID = 'actions-menu-overlay';

  const [filteredShoppingList, setFilteredShoppingList] = useState([]);
  const [processingIds, setProcessingIds] = useState<number[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');

  const tabs = useMemo(() => {
    return [
      {
        title: contents.status_all,
        status: STATUS.all,
        numberOfItems: listShoppingList?.length ?? 0,
      },
      {
        title: contents.status_draft,
        status: ShoppingListStatus.Draft,
        numberOfItems: (listShoppingList || []).reduce((count, item) => count + (item.status === ShoppingListStatus.Draft ? 1 : 0), 0),
      },
      {
        title: contents.status_pending,
        status: ShoppingListStatus.Pending,
        numberOfItems: (listShoppingList || []).reduce((count, item) => count + (item.status === ShoppingListStatus.Pending ? 1 : 0), 0),
      },
      {
        title: contents.status_approved,
        status: ShoppingListStatus.Approved,
        numberOfItems: (listShoppingList || []).reduce((count, item) => count + (item.status === ShoppingListStatus.Approved ? 1 : 0), 0),
      },
      {
        title: contents.status_rejected,
        status: ShoppingListStatus.Rejected,
        numberOfItems: (listShoppingList || []).reduce((count, item) => count + (item.status === ShoppingListStatus.Rejected ? 1 : 0), 0),
      }
    ];
  }, [listShoppingList]);

  const isEditable = useMemo(() => {
    if (!customer?.permissions) return false;

    const writePermission = customer.permissions.includes('write_shopping_list');

    return writePermission;
  }, [customer?.permissions]);

  // filter shopping list by status
  useEffect(() => {
    const filteredList = listShoppingList.filter(item => {
      if (selectedTab === STATUS.all) return true;
      return item.status === selectedTab;
    });

    setFilteredShoppingList(filteredList);
  }, [selectedTab, listShoppingList]);

  const addProcessingId = (id: number) => {
    setProcessingIds(prev => [
      ...prev,
      id,
    ]);
  };

  const removeProcessingId = (id: number) => {
    setProcessingIds(prev => prev.filter(currId => currId !== id));
  };

  const deleteItem = useCallback(async (id: number) => {
    if (!location?.id) return;

    try {
      addProcessingId(id);
      await deleteShoppingList(location.id, id.toString());

      if (customer.permissions && customer.permissions.includes('read_shopping_list')) {
        await getAllCustomerShoppingList({ first: DEFAULT_PAGE_LIMIT });
      } else {
        await getShoppingList({ first: DEFAULT_PAGE_LIMIT });
      }

      shopify.toast.show(contents.delete_shopping_list_message);
    } catch (error) {
      shopify.toast.show(error?.description || error?.message);
    } finally {
      removeProcessingId(id);
    }
  }, [
    location?.id,
    getAllCustomerShoppingList,
    getShoppingList,
    listShoppingList,
    allListShoppingList,
    customer,
  ]);

  const duplicateShoppingList = useCallback(async (id: number) => {
    if (!location?.id || !customer?.customerId) return;

    const currentList = listShoppingList || [];
    const duplicateIndex = currentList.findIndex(item => item.id === id);

    if (duplicateIndex === -1) return;

    try {
      addProcessingId(id);

      const newCloneItem = {
        ...(currentList[duplicateIndex]),
        createdBy: {
          id: customer.customerId,
          name: customer.customerName,
        },
        status: ShoppingListStatus.Draft,
        title: `${(currentList[duplicateIndex]).title} (copy)`,
        updatedAt: new Date().toString(),
        createdAt: new Date().toString(),
      };

      const requestShoppingList = convertToShoppingListFields(newCloneItem);

      await createShoppingList(location?.id, requestShoppingList);

      await delay(6000); // wait for a while to make sure the data is updated

      if (customer.permissions && customer.permissions.includes('read_shopping_list')) {
        await getAllCustomerShoppingList({ first: DEFAULT_PAGE_LIMIT });
      } else {
        await getShoppingList({ first: DEFAULT_PAGE_LIMIT });
      }

      shopify.toast.show(contents.duplicate_shopping_list_message);
    } catch (error) {
      shopify.toast.show(error?.description || error?.message);
    } finally {
      removeProcessingId(id);
    }
  }, [
    listShoppingList,
    allListShoppingList,
    getShoppingList,
    getAllCustomerShoppingList,
    location?.id,
    customer,
  ]);

  const getSubtotalItems = (
    items: Record<string, any>[],
  ) => items.reduce((total, item) => total + parseFloat(item.quantity) || 1, 0);

  const getDisplayedShoppingListTotal = (listItems: Record<string, any>[]) => {
    if (!listItems || !listItems.length) return 0;

    const currency = listItems[0].currency || 'USD';
    const total = listItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

    return formatMoney(total, currency);
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

  const emptyState = (
    <s-section>
      <s-stack direction='inline' justifyContent="center" alignItems="center" minBlockSize="500px">
        <s-stack direction='block' justifyContent="center" alignItems="center" gap="small-200">
          <s-heading>{contents.empty_shopping_list_table_placeholder_header}</s-heading>
          <s-text>{contents.empty_shopping_list_table_placeholder}</s-text>
          <s-button disabled={!isEditable} href="/shopping-list/new" variant='primary'>
            {contents.create_shopping_list}
          </s-button>
        </s-stack>
      </s-stack>
    </s-section>
  );

  const renderListItem = (list: any[]) => {
    return (
      <s-scroll-box maxBlockSize='600px' overflow='auto auto'>
        <s-section>
            <s-grid
              padding={'base'}
              gridTemplateColumns="15% auto 10% 10% 20% 15% 10%"
              alignItems={'center'}
              gap='small-300'
            >
              <s-text color={'subdued'}>{contents.image}</s-text>
              <s-text color={'subdued'}>{contents.name}</s-text>
              <s-text color={'subdued'}>{contents.status}</s-text>
              <s-text color={'subdued'}>{contents.total}</s-text>
              <s-stack justifyContent={'center'}>
                <s-text color={'subdued'}>{contents.created_by}</s-text>
              </s-stack>
              <s-text color={'subdued'}>{contents.last_update}</s-text>
              <s-grid-item>
                <s-stack justifyContent={'center'} alignItems='end'>
                  <s-text color={'subdued'}>{contents.action}</s-text>
                </s-stack>
              </s-grid-item>
            </s-grid>
            <s-divider />
              {list.map(listItem => {
                return (
                  <s-grid
                    padding={'base'}
                    gridTemplateColumns="15% auto 10% 10% 20% 15% 10%"
                    alignItems={'center'}
                    key={listItem?.id?.toString()}
                    gap='small-300'
                  >
                    <s-stack direction='inline' gap="none">
                      {
                        /* Only show the first 3 images */
                        listItem.lineItems?.slice(0, 1).map((lineItem, index) =>
                          <s-product-thumbnail src={lineItem.image} key={index.toString()} />
                        )
                      }
                    </s-stack>
                    <s-clickable href={`/shopping-list/${listItem.id}`}>
                      <s-stack direction='block' gap={'none'}>
                        <s-text>
                          {listItem.title}
                        </s-text>
                        <s-text color={'subdued'}>
                          {getSubtotalItems(listItem.lineItems || [])} {contents.items}
                        </s-text>
                      </s-stack>
                    </s-clickable>
                    <s-text
                      tone={
                        listItem.status === ShoppingListStatus.Approved
                          ? 'success'
                          : listItem.status === ShoppingListStatus.Pending
                            ? 'warning'
                            : listItem.status === ShoppingListStatus.Rejected
                              ? 'critical'
                              : undefined
                      }
                    >{getItemStatus(listItem.status)}
                    </s-text>
                    <s-text>
                      {getDisplayedShoppingListTotal(listItem.lineItems)}
                    </s-text>
                    <s-box minInlineSize="200px">
                      <s-stack justifyContent={'center'}>
                        <s-text>
                          {listItem?.createdBy?.name}
                        </s-text>
                      </s-stack>
                    </s-box>
                    <s-text>
                      {listItem.updatedAt ? formatDate(listItem.updatedAt, `${languageCode}-${countryCode}`) : ''}
                    </s-text>
                    {!processingIds.includes(listItem.id)
                      ? (
                        <s-stack justifyContent='center' alignItems='end' key={listItem.id.toString()}>
                          <s-clickable disabled={!isEditable} commandFor={`${ACTIONS_MENU_ID}-${listItem.id}`}>
                            <s-icon type={'menu-horizontal'} tone={'custom'} />
                          </s-clickable>
                          <s-popover id={`${ACTIONS_MENU_ID}-${listItem.id}`}>
                            <s-stack direction='block' gap="base" minInlineSize="150px" padding="small-200">
                              <s-clickable
                                href={`/shopping-list/${listItem.id}`}
                              >
                                <s-text>{contents.view}</s-text>
                              </s-clickable>
                              <s-clickable
                                onClick={() => duplicateShoppingList(listItem.id)}
                              >
                                <s-text>{contents.duplicate}</s-text>
                              </s-clickable>
                              <s-clickable commandFor={DELETE_MODAL_ID}>
                                <s-text>{contents.delete}</s-text>
                              </s-clickable>
                              <DeleteConfirmModal
                                id={DELETE_MODAL_ID}
                                contents={contents}
                                title={contents.delete_modal_title}
                                modalContent={contents.delete_modal_content}
                                onDelete={() => deleteItem(listItem.id)}
                              />
                            </s-stack>
                          </s-popover>
                        </s-stack>
                      ) : (
                        <s-stack
                          direction='inline'
                          justifyContent="end"
                          alignItems="center"
                        >
                          <s-spinner />
                        </s-stack>
                      )}
                  </s-grid>
                );
              })}
        </s-section>
      </s-scroll-box>
    );
  }

  const renderGridItem = (list: any[]) => {
    return (
      <s-grid
        gridTemplateColumns="1fr 1fr 1fr"
        gap={'base'}
      >
        {list.map(listItem => {
          return (
            <s-section key={listItem.id.toString()}>
              <s-stack direction='block' gap={'base'} justifyContent='center'>
                <s-image-group>
                  {
                    listItem.lineItems?.slice(0, 4).map((lineItem, index) =>
                      <s-image src={lineItem.image} key={index.toString()} />
                    )
                  }
                </s-image-group>
                <s-stack direction='block' alignItems='start' gap="base">
                  <s-box padding="base none">
                    <s-heading>
                      {listItem.title}
                    </s-heading>
                    {listItem?.description && <s-text color="subdued">
                      {listItem.description}
                    </s-text>}
                  </s-box>
                  <s-box>
                    <s-text type="strong">
                      {getSubtotalItems(listItem.lineItems || [])} {contents.items}
                    </s-text>
                  </s-box>
                  <s-box>
                    <s-text color="subdued">
                      {contents.last_update}: {listItem.updatedAt ? formatDate(listItem.updatedAt, `${languageCode}-${countryCode}`) : ''}
                    </s-text>
                  </s-box>
                  <s-box padding="none none base none">
                    <s-text type="strong">
                      {listItem.createdBy.name}
                    </s-text>
                  </s-box>
                  <s-box inlineSize='100%'>
                    <s-grid gridTemplateColumns='1fr 1fr' gap={'base'}>
                      <s-button
                        inlineSize='fill'
                        variant="secondary"
                        href={`/shopping-list/${listItem.id}`}
                      >
                        {contents.view}
                      </s-button>
                      {!processingIds.includes(listItem.id)
                        ? (
                          <>
                            <s-button variant="secondary" commandFor={`${ACTIONS_MENU_ID}-${listItem.id}`} inlineSize='fill'>
                              {contents.more_actions}
                            </s-button>
                            <s-popover id={`${ACTIONS_MENU_ID}-${listItem.id}`}>
                              <s-stack direction="block" gap="base" minInlineSize="150px" padding="small-200">
                                <s-clickable
                                  onClick={() => duplicateShoppingList(listItem.id)}
                                >
                                  <s-text>{contents.duplicate}</s-text>
                                </s-clickable>
                                <s-clickable commandFor={DELETE_MODAL_ID}>
                                  <s-text>{contents.delete}</s-text>
                                </s-clickable>
                                <DeleteConfirmModal
                                  id={DELETE_MODAL_ID}
                                  contents={contents}
                                  title={contents.delete_modal_title}
                                  modalContent={contents.delete_modal_content}
                                  onDelete={() => deleteItem(listItem.id)}
                                />
                              </s-stack>
                            </s-popover>
                          </>
                        ) : (
                          <s-button variant="secondary" inlineSize='fill'>
                            <s-spinner />
                          </s-button>
                        )
                      }
                    </s-grid>
                  </s-box>
                </s-stack>
              </s-stack>
            </s-section>
          );
        })}
      </s-grid>
    );
  }

  console.log('Test custom app - haild', sessionToken.get());

  return (
    <s-box>
      <s-stack direction='block' gap={'base'}>
        <s-stack direction='inline' alignItems={'center'} justifyContent='space-between' padding='none none large none'>
          <s-heading>
            {contents.page_title}
          </s-heading>
          <s-stack direction='inline' justifyContent={'end'}>
            <s-stack direction='inline' background={'subdued'} gap={'small-100'} padding={'small-300'} borderRadius={'base'}>
              <s-clickable
                background={viewType === 'grid' ? 'base' : 'transparent'}
                padding={'small-100'}
                borderRadius={'base'}
                onClick={() => setViewType('grid')}
              >
                <s-icon type={'grid'} />
              </s-clickable>
              <s-clickable
                background={viewType === 'list' ? 'base' : 'transparent'}
                padding={'small-100'}
                borderRadius={'base'}
                onClick={() => setViewType('list')}
              >
                <s-icon type={'list-bulleted'} />
              </s-clickable>
            </s-stack>
          </s-stack>
        </s-stack>
        <s-section>
          <s-grid gridTemplateColumns='80% 20%' alignItems={'center'}>
            <s-grid-item>
              <s-stack direction='inline' gap={'large-100'}>
                {
                  tabs.map(tab => {
                    return (
                      <s-box>
                        <s-clickable
                          key={tab.status}
                          background={tab.status === selectedTab ? 'subdued' : 'base'}
                          padding={'base'}
                          borderRadius={'base'}
                          onClick={() => {
                            setSelectedTab(tab.status);
                          }}
                        >
                          <s-stack direction='inline' gap='small-200' alignItems='center'>
                            <s-text tone={tab.status === selectedTab ? 'custom' : undefined}>
                              {tab.title}
                            </s-text>
                          </s-stack>
                        </s-clickable>
                      </s-box>
                    );
                  })
                }
              </s-stack>
            </s-grid-item>
            <s-grid-item>
              <s-stack alignItems={'end'}>
                <s-button href='/shopping-list/new' disabled={!isEditable} variant='primary'>
                  {contents.create_new}
                </s-button>
              </s-stack>
            </s-grid-item>
          </s-grid>
        </s-section>
        {
          isLoadingListShoppingList ? (
            <s-stack justifyContent='center' alignItems='center'>
              <s-spinner />
            </s-stack>
          ) :
            filteredShoppingList.length
              ? (
                (
                  (viewType === 'grid') && renderGridItem(filteredShoppingList)
                ) || (
                  viewType === 'list' && renderListItem(filteredShoppingList)
                )
              ) : emptyState

        }
        {
          paginationInfo && (
            <s-stack direction='inline' alignItems={'center'} padding='base none none none' justifyContent='center' gap='base'>
              <>
                <s-clickable disabled={!paginationInfo.current.has_previous_page} onClick={() => handlePreviousPage()}>
                  <s-icon type='chevron-left' tone='custom'></s-icon>
                </s-clickable>
                <s-clickable disabled={!paginationInfo.current.has_next_page} onClick={() => handleNextPage()}>
                  <s-icon type='chevron-right' tone='custom'></s-icon>
                </s-clickable>
              </>
            </s-stack>
          )
        }
      </s-stack>
    </s-box>
  );
}

export default ShoppingListMainPage;
