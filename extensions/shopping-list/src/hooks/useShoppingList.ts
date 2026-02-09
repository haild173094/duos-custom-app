import { useCallback, useContext, useEffect, useState, useRef } from 'preact/hooks';
import { useSessionToken } from '@shopify/ui-extensions/customer-account/preact';
import { useHttp } from '@/customer-account/hook';
import { removeShopifyGidPrefix } from '@/services';
import { LocationContext, useCustomer } from '@/customer-account/contexts';
import { IShoppingListFields, CustomerPermission } from '@/types';

export default function useShoppingList(handleError?: (...args: any) => void) {
  const DEFAULT_PAGE_LIMIT = 10;

  const sessionToken = useSessionToken();
  const {
    getCurrentCustomerShoppingList,
    getListShoppingList,
  } = useHttp(sessionToken.get);

  const location = useContext(LocationContext);
  const { customer } = useCustomer();

  const [listShoppingList, setListShoppingList] = useState<Record<string, any>[]>([]);
  const [allListShoppingList, setAllListShoppingList] = useState<Record<string, any>[]>([]);
  const [isLoadingListShoppingList, setIsLoadingListShoppingList] = useState<boolean>(false);
  const paginationInfo = useRef<{
    end_cursor: string,
    has_next_page: boolean,
    has_previous_page: boolean,
    start_cursor: string,
  }>({
    end_cursor: '',
    has_next_page: false,
    has_previous_page: false,
    start_cursor: '',
  });

  // Get list shopping list from API
  const getAllCustomerShoppingList = useCallback(async (query?: Record<string, any>) => {
    if (!location?.id) return;

    try {
      setIsLoadingListShoppingList(true);
      setListShoppingList([]);

      const res = await getListShoppingList(location.id, query);

      setAllListShoppingList(res.data);

      if (res.data) {
        const SlData = res.data.map((item: any) => {
          const itemId = removeShopifyGidPrefix(item.id, 'Metaobject');

          const itemData = item.fields.find((field: any) => field.key === 'data');

          return {
            ...itemData.json_value,
            id: itemId,
          };
        });

        setListShoppingList(SlData);
      }

      if (res?.meta) {
        paginationInfo.current = res.meta;
      }

      setIsLoadingListShoppingList(false);
    } catch (error) {
      setIsLoadingListShoppingList(false);
      handleError?.(error)
    }
  }, [location?.id]);

  const getShoppingList = useCallback(async (query?: Record<string, any>) => {
    if (!location?.id) return;

    try {
      setIsLoadingListShoppingList(true);
      setListShoppingList([]);

      const response = await getCurrentCustomerShoppingList(location.id, query);

      if (response.data) {
        const SlData = response.data.map((item: any) => {
          const itemId = removeShopifyGidPrefix(item.id, 'Metaobject');

          const itemData = item.fields.find((field: any) => field.key === 'data');

          return {
            ...itemData.json_value,
            id: itemId,
          };
        });

        setListShoppingList(SlData);
      }

      if (response?.meta) {
        paginationInfo.current = response.meta;
      }

      setIsLoadingListShoppingList(false);
    } catch (error) {
      setIsLoadingListShoppingList(false);
      handleError?.(error);
    }
  }, [
    location?.id,
  ]);

  // Convert data to shopping list fields -> for API request body
  const convertToShoppingListFields = useCallback((data: Record<string, any>) => {
    if (!location || !customer) return null;

    const fields: IShoppingListFields = {
      fields: [
        {
          key: 'location_id',
          value: location?.id.toString() || '',
          json_value: location?.id.toString() || '',
        },
        {
          key: 'company_id',
          value: customer?.companyId.toString() || '',
          json_value: customer?.companyId.toString() || '',
        },
        {
          key: 'customer_id',
          value: data.createdBy.id.toString() || customer?.customerId.toString(),
          json_value: data.createdBy.id.toString() || customer?.customerId.toString(),
        },
        {
          key: 'status',
          value: data.status || 'active',
          json_value: data.status || 'active',
        },
        {
          key: 'name',
          value: data.title || '',
          json_value: data.title || '',
        },
        {
          key: 'data',
          value: JSON.stringify(data),
          json_value: JSON.parse(JSON.stringify(data)) || {},
        }
      ],
    };

    return fields;
  }, [location, customer]);

  const handlePreviousPage = useCallback(() => {
    try {
      const prevQuery = {
        last: DEFAULT_PAGE_LIMIT,
        before: paginationInfo.current.start_cursor,
      }

      if (customer.permissions.includes(CustomerPermission.ReadAllShoppingList)) {
        getAllCustomerShoppingList(prevQuery);
      } else {
        getShoppingList(prevQuery);
      }
    } catch (error) {
      console.error('Error fetching previous page:', error);
    }
  }, [customer?.permissions, getAllCustomerShoppingList, getShoppingList]);

  const handleNextPage = useCallback(() => {
    try {
      const nextQuery = {
        first: DEFAULT_PAGE_LIMIT,
        after: paginationInfo.current.end_cursor,
      }

      if (customer.permissions.includes(CustomerPermission.ReadAllShoppingList)) {
        getAllCustomerShoppingList(nextQuery);
      } else {
        getShoppingList(nextQuery);
      }
    } catch (error) {
      console.error('Error fetching next page:', error);
    }
  }, [customer?.permissions, getAllCustomerShoppingList, getShoppingList]);

  useEffect(() => {
    if (!customer?.permissions || !customer.permissions.length) return;

    if (customer.permissions.includes(CustomerPermission.ReadAllShoppingList)) {
      getAllCustomerShoppingList({ first: DEFAULT_PAGE_LIMIT });
    } else {
      getShoppingList({ first: DEFAULT_PAGE_LIMIT });
    }
  }, [
    customer?.permissions,
    getAllCustomerShoppingList,
    getShoppingList,
  ]);

  return {
    listShoppingList,
    allListShoppingList,
    isLoadingListShoppingList,
    paginationInfo,
    setListShoppingList,
    setAllListShoppingList,
    getAllCustomerShoppingList,
    getShoppingList,
    convertToShoppingListFields,
    handleNextPage,
    handlePreviousPage,
  }
}
