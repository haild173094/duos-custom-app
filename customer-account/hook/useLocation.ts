import {
  useSessionToken,
  useAuthenticatedAccountPurchasingCompany,
} from '@shopify/ui-extensions/customer-account/preact';
import useHttp from './useHttp';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { ICompanyLocation } from '@app/types';

export default function useExtensionCustomer() {
  const [location, setLocation] = useState<ICompanyLocation | null>(null);
  const { location: shopifyLocation } = useAuthenticatedAccountPurchasingCompany();
  const sessionToken = useSessionToken();

  const {
    getLocationCurrency,
    getCompanyLocationDetail,
  } = useHttp(sessionToken.get);

  useEffect(() => {
    if (!shopifyLocation?.id) return;

    setLocation((prev) => ({
      ...prev,
      id: shopifyLocation?.id
    }));
  }, [shopifyLocation?.id]);

  const fetchLocationCurrency = useCallback(async () => {
    if (!shopifyLocation?.id) return;

    try {
      const currency = await getLocationCurrency(shopifyLocation.id);
      const locationDetail = await getCompanyLocationDetail(shopifyLocation.id);

      setLocation(prev => ({
        ...prev,
        currency,
        name: locationDetail?.name || '',
      }));
    } catch (error) {
      console.error('Fail to fetch location currency', error?.message);
    }
  }, [shopifyLocation?.id]);

  // useEffect(() => {
  //   fetchLocationCurrency();
  // }, [fetchLocationCurrency]);

  return { location };
}
