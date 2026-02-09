import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  useExtensionEditor,
  useSessionToken,
  useAuthenticatedAccountPurchasingCompany,
} from '@shopify/ui-extensions/customer-account/preact';
import useHttp from './useHttp';
import { ICustomer } from '@app/types/interfaces';
import { removeShopifyGidPrefix } from '@app/services';

export default function useExtensionCustomer() {
  const extensionEditor = useExtensionEditor();
  const sessionToken = useSessionToken();
  const { location: shopifyLocation } = useAuthenticatedAccountPurchasingCompany();

  const {
    getCustomer,
    getCurrentCustomerPermissions,
  } = useHttp(sessionToken.get);

  const [customer, setCustomer] = useState<ICustomer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState<boolean>(false);

  const fetchCustomer = async () => {
    setLoadingCustomer(true);

    try {
      const customerRes = await getCustomer();
      setCustomer(prev => ({
        ...prev,
        ...customerRes,
        customerId: removeShopifyGidPrefix(customerRes.customerId, 'Customer'),
        companyId: removeShopifyGidPrefix(customerRes.companyId, 'Company'),
      }));
    } catch (error) {
      console.error('Fail to fetch customer data', error?.message);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const fetchCustomerPermission = useCallback(async () => {
    if (!customer?.customerId || !shopifyLocation?.id) return;

    setLoadingCustomer(true);

    try {
      const res = await getCurrentCustomerPermissions(shopifyLocation.id, customer.customerId);
      if (res.permissions) {
        const customerPermissions = res.permissions.map(item => item.name);

        setCustomer(prev => ({
          ...prev,
          permissions: customerPermissions,
          currentRole: res.name,
        }));
      }
    } catch (error) {
      console.log('Fail to fetch customer permission', error?.message);
    } finally {
      setLoadingCustomer(false);
    }
  }, [
    customer?.customerId,
    shopifyLocation?.id,
  ]);

  useEffect(() => {
    if (extensionEditor) return;

    fetchCustomer();
  }, [extensionEditor]);

  useEffect(() => {
    fetchCustomerPermission();
  }, [fetchCustomerPermission]);

  return {
    customer,
    setCustomer,
    loadingCustomer,
  };
};
