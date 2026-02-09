// Use for both api calls in CSVupload and QuickOrder
import { customerAccountRequest, request } from '@app/services/https';
import AppConfig from '@app/config/app';
import { type ICalculateDraftOrder, type IPlan } from '@app/types';
import { FinancialViewMode, TranslationType } from '@app/types/enum';
import { storefrontRequest } from '@app/services/https';
import { delay } from "@app/services/helper";

export const useHttp = (getToken: () => Promise<string>) => {
  const fakeRequest = (response: any | null): any => delay(1000).then(() => new Promise((resolve, reject) => {
    if (!response || response.error) {
      return reject(response);
    }

    return resolve(response);
  }));

  const backendRequest = (async (endpoint: string, options: Record<string, any>) => {
    const token = await getToken();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    };

    const url = `${AppConfig.API_URL}/api/${endpoint}`;

    let requestOptions = options;

    requestOptions.headers = {
      ...headers,
      ...options.headers,
    }

    return request(url, requestOptions);
  });

  const getCustomerConfig = async (shopId: string) => {
    const res = await backendRequest('customer-account/config', {
      method: 'GET',
    });

    return res;
  };

  const createDraftOrder = async (
    customerId: string,
    body: { shop_id: string, company_location_id: string, line_items: any }
  ) => {

    const requestUrl = `customers/${customerId}/draft-order`;

    const res = await backendRequest(requestUrl, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return res;
  };

  const createDraftOrderFromQuote = async (companyLocationId: string, quoteId: string, body: {
    company_location_id: string,
    line_items: any,
  }) => {
    const requestUrl = `customer-account/company-locations/${companyLocationId}/quotations/${quoteId}/draft-order`;

    try {
      const res = await backendRequest(requestUrl, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return res;
    } catch (error) {
      console.error('Error creating draft order from quote:', error);
      throw error;
    }
  };

  const calculateDraftOrderFromQuote = async (companyLocationId: string, quoteId: string, quoteData?: Record<string, any>) => {
    const url = `customer-account/company-locations/${companyLocationId}/quotations/${quoteId}/draft-order/calculate`;

    const requestBody = {
      ...quoteData,
    };

    return backendRequest(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  };

  const exportQuotePdf = (companyLocationId: string, quoteId: string, quoteData: Record<string, any>, countryCode?: string) => {
    const url = `customer-account/company-locations/${companyLocationId}/quotations/${quoteId}/preview?type=pdf&locale=${countryCode || 'en'}`;

    const requestBody = {
      ...quoteData,
    };

    return backendRequest(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  };

  const draftOrderCalculate = async (customerId: string, body: {
    shop_id: string,
    company_location_id: string,
    presentment_currency_code: string,
    line_items: any,
  }): Promise<ICalculateDraftOrder> => {
    const requestUrl = `customers/${customerId}/draft-order/calculate`;

    const draftOrder = await backendRequest(requestUrl, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return draftOrder.data;
  };

  const getCustomerLocations = (params: { customerId: string, shopId, companyContactId: string }) => {
    const { customerId, shopId, companyContactId } = params;
    const requestUrl = `customers/${customerId}/locations`

    return backendRequest(requestUrl, {
      query: {
        shop_id: shopId,
        company_contact_id: companyContactId,
      }
    });
  };

  const getCustomer = async () => {
    const response = await customerAccountRequest({
      query: `query {
        customer {
          id
          displayName
          companyContacts(first: 10) {
            nodes {
              id
              company {
                id
              }
            }
          }
        }
      }`
    });

    const result = {
      customerId: response.customer.id,
      customerName: response.customer.displayName,
      companyContactId: response.customer.companyContacts.nodes[0]?.id,
      companyId: response.customer.companyContacts.nodes[0]?.company?.id,
    }

    return result;
  };

  const getProductVariantBySku = async (sku: string, shopId: string, locationId: string, countryCode: string | undefined = undefined) => {
    const requestUrl = `product-variants/${sku}`;

    const { data } = await backendRequest(requestUrl, {
      method: 'GET',
      query: {
        product: shopId,
        company_location_id: locationId,
        ...(countryCode && { country: countryCode } || {}),
      },
    });

    return data;
  };

  const getProductVariantByIds = async (ids: number[], shopId: string, locationId: string | undefined, countryCode: string | undefined) => {
    const requestUrl = `product-variants`;

    const { data } = await backendRequest(requestUrl, {
      method: 'GET',
      query: {
        ids: ids.join(','),
        shop_id: shopId,
        company_location_id: locationId,
        ...(countryCode && { country: countryCode } || {}),
      },
    });

    return data;
  };

  const getProductVariantsBySkus = async (skus: string[], shopId: string, locationId: string, countryCode: string | undefined = undefined) => {
    const requestUrl = `product-variants`;

    const { data } = await backendRequest(requestUrl, {
      method: 'GET',
      query: {
        sku: skus.join(','),
        shop_id: shopId,
        company_location_id: locationId,
        ...(countryCode && { country: countryCode } || {}),
        first: skus.length,
      },
    });

    return data;
  };

  const downloadCatalog = async (shopId: string, companyId: string, countryCode?: string) => {
    const requestUrl = 'location-catalogs/export';

    const { data } = await backendRequest(requestUrl, {
      method: 'GET',
      query: {
        shop_id: shopId,
        shopify_company_location_id: companyId,
        country_code: countryCode,
      },
    });

    return data;
  };

  const exportCatalog = async (exportId: string, shopId: string, companyId: string) => {
    const requestUrl = `location-catalogs/${exportId}/status`;

    const { data } = await backendRequest(requestUrl, {
      method: 'GET',
      query: {
        shop_id: shopId,
        shopify_company_location_id: companyId,
      },
    });

    return data;
  };

  const getTranslationData = (params: { type: TranslationType, shopId: string }) => {
    const { type, shopId } = params;
    const requestUrl = `customer-account/translations/${type}`;

    return backendRequest(requestUrl, { query: { shop_id: shopId } });
  };

  // Shopping List API
  const getCurrentCustomerShoppingList = (companyLocationId: string, params?: Record<string, any>) => {
    const defaultParams = {
      sort_key: 'updated_at',
      reverse: true,
    }

    const mergedParams: Record<string, any> = { ...defaultParams, ...params };

    const requestParams = new URLSearchParams(mergedParams).toString();

    const url = `customer-account/company-locations/${companyLocationId}/my-shopping-lists?${requestParams}`;

    return backendRequest(url, {
      method: 'GET',
    });
  };

  const getListShoppingList = async (companyLocationId: string, params?: Record<string, any>) => {
    const defaultParams = {
      sort_key: 'updated_at',
      reverse: true,
    }

    const mergedParams: Record<string, any> = { ...defaultParams, ...params };

    const requestParams = new URLSearchParams(mergedParams).toString();

    const url = `customer-account/company-locations/${companyLocationId}/shopping-lists?${requestParams}`;

    return backendRequest(url, {
      method: 'GET',
    });
  };

  const getShoppingListDetail = async (companyLocationId: string, shoppingListId: string) => {
    const url = `customer-account/company-locations/${companyLocationId}/shopping-lists/${shoppingListId}`;

    return backendRequest(url, {
      method: 'GET',
    });
  };

  const createShoppingList = async (companyLocationId: string, body: Record<string, any>) => {
    const url = `customer-account/company-locations/${companyLocationId}/shopping-lists`;

    return backendRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  const deleteShoppingList = async (companyLocationId: string, shoppingListId: string) => {
    const url = `customer-account/company-locations/${companyLocationId}/shopping-lists/${shoppingListId}`;

    return backendRequest(url, {
      method: 'DELETE',
    });
  };

  const updateCustomerShoppingList = async (locationId: string, shoppingListId: string, body) => {
    const url = `customer-account/company-locations/${locationId}/shopping-lists/${shoppingListId}`;

    const res = await backendRequest(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    })

    return res;
  };
  // End Shopping List API

  const getCompanyRoles = async (companyId: string) => {
    const url = `companies/${companyId}/contact-roles`

    const response = await backendRequest(url, {
      method: 'GET',
    });

    const listRoleAssignments = response.data?.contact_roles?.data || [];

    return listRoleAssignments;
  };

  const getProductsByTitlte = async (
    publicationIds: string[],
    locationId: string,
    productTitle: string,
    countryCode: string | undefined = undefined,
    after: string | undefined,
    first: number = 50,
  ) => {
    const res = await backendRequest('products', {
      method: 'GET',
      query: {
        company_location_id: locationId,
        publication_ids: publicationIds.join(','),
        title: productTitle,
        ...(after && { after }),
        first,
        ...(countryCode && { country: countryCode } || {}),
      }
    });

    return res;
  };

  const getPublicationIds = async (locationId: string) => {
    const res = await backendRequest('catalogs/publication-ids', {
      method: 'GET',
      query: {
        shopify_company_location_id: locationId,
      }
    });

    return res.data?.publication_ids || [];
  };

  const getProductVariantsByProductId = async (
    shopId: string,
    locationId: string,
    productId: string,
    countryCode: string | undefined = undefined,
    after: string | undefined,
    first: number = 50,
  ) => {
    const res = await backendRequest('product-variants', {
      method: 'GET',
      query: {
        shop_id: shopId,
        company_location_id: locationId,
        product_id: productId,
        ...(countryCode && { country: countryCode } || {}),
        ...(after && { after }),
        first,
      }
    });

    return res;
  };

  // Role Api
  const getListRoles = async (companyLocationId: string, pageInfo?: any) => {
    const requestUrl = `company-locations/${companyLocationId}/roles`;

    const res = await backendRequest(requestUrl, {
      method: 'GET',
      query: {
        ...pageInfo,
      }
    });

    const serializeData = res.data.map((item) => {
      return {
        id: item.id,
        name: item.name,
        team_id: item.team_id,
      }
    });

    return {
      data: serializeData,
      meta: res.meta,
      links: res.links,
    };
  };

  const getRolePermissionById = async (companyLocationId: string, roleId: string) => {
    const url = `company-locations/${companyLocationId}/roles/${roleId}`;

    return backendRequest(url, {
      method: 'GET',
    });
  };

  const createRole = async (companyLocationId: string, body: any) => {
    return backendRequest(`company-locations/${companyLocationId}/roles`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  const updateRolePermission = async (companyLocationId: string, roleId: string, body: any) => {
    const url = `company-locations/${companyLocationId}/roles/${roleId}`;

    const res = await backendRequest(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (!res.data) {
      return res;
    }

    res.data.permissions = res.data?.permissions.map(permission => permission.name);

    return res.data;
  };

  const deleteRole = async (companyLocationId: string, roleId: string) => {
    const url = `company-locations/${companyLocationId}/roles/${roleId}`;

    return backendRequest(url, {
      method: 'DELETE',
    });
  }

  // Member api
  const getMemberList = async (locationId: string, pageInfo: any) => {
    const url = `company-locations/${locationId}/customers`;

    return backendRequest(url, {
      method: 'GET',
      query: {
        ...pageInfo,
      }
    });
  };

  const getMemberAdminCount = async (locationId: string, pageInfo: Record<string, any>) => {
    const url = `company-locations/${locationId}/roles/admin/count`;

    return backendRequest(url, {
      method: 'GET',
      query: {
        ...pageInfo,
      }
    });
  };

  const updateMember = async (locationId: string, shopId: string, body: any) => {
    const url = `company-locations/${locationId}/customers`;

    return backendRequest(url, {
      method: 'PUT',
      query: {
        shop_id: shopId,
      },
      body: JSON.stringify(body),
    });
  };

  const inviteMember = async (locationId: string, shopId: string, body: any) => {
    const url = `company-locations/${locationId}/customers`;

    return backendRequest(url, {
      method: 'PUT',
      query: {
        shop_id: shopId,
      },
      body: JSON.stringify(body),
    });
  };

  const deleteMember = async (locationId: string, customerId: string) => {
    const url = `company-locations/${locationId}/customers/${customerId}`;

    return backendRequest(url, {
      method: 'DELETE',
    });
  };

  const getCurrentCustomerPermissions = async (companyLocationId: string, customerId: string) => {
    const url = `company-locations/${companyLocationId}/customer`;

    const res = await backendRequest(url, {
      method: 'GET',
    });

    return {
      ...res.data,
      permissions: [...(res.data.permissions) || [], { name: 'create_order_from_quotation' }]
    };
  };

  const getSubscription = async () => {
    const { plan } = await backendRequest('subscription', { method: 'GET' });

    return plan as IPlan;
  };

  const getQuoteDetail = async (companyLocationId: string, quoteId: string) => {
    const url = `customer-account/company-locations/${companyLocationId}/quotations/${quoteId}`;
    return backendRequest(url, {
      method: 'GET',
    });
  };

  const getCurrentCustomerQuoteList = async (companyLocationId: string) => {
    const url = `customer-account/company-locations/${companyLocationId}/my-quotations`;

    return backendRequest(url, {
      method: 'GET',
    });
  };

  const getLocationAddress = async (companyLocationId: string) => {
    const url = `customer-account/company-locations/${companyLocationId}/address`;
    return backendRequest(url, {
      method: 'GET',
    });
  };

  const getCompanyLocationDetail = async (companyLocationId: string) => {
    const res = await customerAccountRequest({
      query: `
        query ($id: ID!) {
          companyLocation(id: $id) {
            id
            name
          }
        }
      `,
      variables: {
        id: `gid://shopify/CompanyLocation/${companyLocationId}`,
      },
    });

    return res.companyLocation;
  };

  const getQuoteList = async (companyLocationId: string, params: { page: number, limit: number, status: string } = { page: 1, limit: 10, status: '' }) => {
    const url = `customer-account/company-locations/${companyLocationId}/quotations`;

    return backendRequest(url, {
      method: 'GET',
      query: {
        ...params,
      },
    });
  };

  const getLocationCredit = async (companyLocationId: string) => {
    const url = `customer-account/company-locations/${companyLocationId}`;
    return backendRequest(url, {
      method: 'GET',
    });
  };

  const getTransactionList = async (companyLocationId: string, params: { page: number, limit: number } = { page: 1, limit: 10 }) => {
    const url = `customer-account/company-locations/${companyLocationId}/transactions`;

    return backendRequest(url, {
      method: 'GET',
      query: {
        ...params,
      },
    });
  };

  const downloadStatement = async (companyLocationId: string, params: { start: string, end: string }) => {
    const url = `customer-account/company-locations/${companyLocationId}/transactions/export`;
    return backendRequest(url, {
      method: 'GET',
      query: {
        ...params,
      },
    });
  };

  const getLocationCurrency = async (locationId: string) => {
    const url = `customer-account/company-locations/${locationId}/currency`;

    const res = await backendRequest(url, {
      method: 'GET',
    });

    return res?.data?.currency || 'USD';
  }

  const getPaymentOverview = async (companyLocationId: string, params: { shopify_company_id?: string } = {}) => {
    const url = `customer-account/company-locations/${companyLocationId}/payments/overview`;

    return backendRequest(url, {
      method: 'GET',
      query: {
        test: 'false',
        ...(params.shopify_company_id && { shopify_company_id: params.shopify_company_id }),
      },
    });
  };

  const getMyPaymentOverview = async (companyLocationId: string, params: { shopify_company_id?: string } = {}) => {
    const url = `customer-account/company-locations/${companyLocationId}/payments/my-overview`;

    return backendRequest(url, {
      method: 'GET',
      query: {
        test: 'false',
        ...(params.shopify_company_id && { shopify_company_id: params.shopify_company_id }),
      },
    });
  };

  const getMyQuotation = async (companyLocationId: string, params: { page: number, limit: number, status: string } = { page: 1, limit: 10, status: '' }) => {
    const url = `customer-account/company-locations/${companyLocationId}/my-quotations`;

    return backendRequest(url, {
      method: 'GET',
      query: {
        ...params,
      },
    });
  };

  const updateQuote = (locationId: string, quotationId: string, data: Record<string, any>) => {
    const url = `customer-account/company-locations/${locationId}/quotations/${quotationId}`;

    return backendRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  const getQuoteTimeLine = async (quotationId: number, companyLocationId: string, requestParams?: Record<string, any>) => {
    const defaultParams = {
      order_by: 'created_at',
      direction: 'desc',
      limit: 10,
      page: 1,
    }

    const mergedParams = { ...defaultParams, ...requestParams };

    const res = await backendRequest(`customer-account/company-locations/${companyLocationId}/quotations/${quotationId}/logs`, { query: mergedParams });

    return res || [];
  };

  const getStoreLocales = async () => {
    const res = await storefrontRequest({
      query: `
        query {
          localization {
            availableLanguages {
              isoCode
              name
            }
          }
        }
      `
    });

    const listLocales = res?.localization?.availableLanguages.map(lang => {
      return {
        label: lang.name,
        value: lang.isoCode?.toLowerCase() || '',
      };
    });

    return listLocales;
  };

  // get for all customers in locations -> admin | has permission
  const getFinancialLedger = async (companyLocationId: string, params: any) => {
    const res = await backendRequest(`customer-account/company-locations/${companyLocationId}/financial-ledgers`, {
      query: {
        ...params,
      },
    });

    return res;
  };

  // get my financial ledger -> customer
  const getMyFinancialLedger = async (companyLocationId: string, params: any) => {
    const res = await backendRequest(`customer-account/company-locations/${companyLocationId}/my-financial-ledgers`, {
      query: {
        ...params,
      },
    });

    return res;
  };

  const getLocationAccountOverview = async (companyLocationId: string, shopifyCompanyId?: string) => {
    const url = `customer-account/company-locations/${companyLocationId}/accounts/overview`;

    const res = await backendRequest(url, {
      method: 'GET',
      query: {
        test: 'false',
        ...(shopifyCompanyId && { shopify_company_id: shopifyCompanyId }),
      },
    });

    return res.data;
  };

  const getCustomerAccountOverview = async (companyLocationId: string, shopifyCompanyId?: string) => {
    const url = `customer-account/company-locations/${companyLocationId}/accounts/my-overview`;

    const res = await backendRequest(url, {
      method: 'GET',
      query: {
        test: 'false',
        ...(shopifyCompanyId && { shopify_company_id: shopifyCompanyId }),
      },
    });

    return res.data;
  };

  const getOrderHistoryList = async ({
    companyLocationId,
    orderName,
    after,
    financialStatus,
    viewMode,
    first = 20,
    sortKey = 'CREATED_AT',
    reverse = true,
  }: {
    companyLocationId: string,
    orderName?: string,
    first?: number,
    after?: string,
    q?: string,
    financialStatus?: string,
    sortKey?: string,
    reverse?: boolean,
    viewMode?: string,

  }) => {
    const target = viewMode === FinancialViewMode.Location ? 'orders' : 'my-orders';
    const url = `customer-account/company-locations/${companyLocationId}/${target}`;

    return backendRequest(url, {
      method: 'GET',
      query: {
        ...(orderName && { q: orderName }),
        ...(first && { first }),
        ...(after && { after }),
        ...(financialStatus && { financial_status: financialStatus }),
        sort_key: sortKey,
        reverse: Number(reverse),
      },
    });
  }

  const sendPaymentLink = ({
    companyLocationId,
    orderId,
    email,
  }: {
    companyLocationId: string,
    orderId: string,
    email: string,
  }) => {
    const url = `customer-account/company-locations/${companyLocationId}/orders/${orderId}/invoice/send`;

    return backendRequest(url, {
      method: 'POST',
      query: {
        email,
      }
    });
  }

  return {
    fakeRequest,
    createDraftOrder,
    draftOrderCalculate,
    getCustomerLocations,
    getCustomer,
    getMemberList,
    getProductVariantBySku,
    getProductVariantByIds,
    getProductVariantsBySkus,
    downloadCatalog,
    exportCatalog,
    getCustomerConfig,
    getTranslationData,
    getCurrentCustomerShoppingList,
    getListShoppingList,
    updateCustomerShoppingList,
    updateRolePermission,
    updateMember,
    inviteMember,
    deleteMember,
    getCompanyRoles,
    getProductsByTitlte,
    getProductVariantsByProductId,
    getCurrentCustomerPermissions,
    getListRoles,
    createRole,
    deleteRole,
    getSubscription,
    getQuoteDetail,
    getLocationAddress,
    updateQuote,
    getCurrentCustomerQuoteList,
    getQuoteList,
    getTransactionList,
    getLocationCredit,
    downloadStatement,
    getMyQuotation,
    getQuoteTimeLine,
    createDraftOrderFromQuote,
    calculateDraftOrderFromQuote,
    exportQuotePdf,
    getLocationCurrency,
    getPaymentOverview,
    getMyPaymentOverview,
    getStoreLocales,
    getFinancialLedger,
    getMyFinancialLedger,
    getLocationAccountOverview,
    getCustomerAccountOverview,
    getCompanyLocationDetail,
    getOrderHistoryList,
    sendPaymentLink,
    getMemberAdminCount,
    getRolePermissionById,
    getPublicationIds,
    createShoppingList,
    getShoppingListDetail,
    deleteShoppingList,
  }
};

export default useHttp;
