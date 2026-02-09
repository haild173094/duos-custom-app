import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { useSessionToken, useExtensionEditor } from '@shopify/ui-extensions/customer-account/preact';
import {
  useSubscription,
  useExtensionCustomer,
  useLocation,
  useExtensionShop,
  useHttp,
} from '.';

export default function useAppProvider(extensionKey: string) {
  const sessionToken = useSessionToken();
  const extensionEditor = useExtensionEditor();

  const { shop } = useExtensionShop();
  // const { customer, setCustomer, loadingCustomer } = useExtensionCustomer();
  const { location } = useLocation();
  const { isPaid } = useSubscription();
  console.log('Test custom app - useAppProvider', sessionToken.get());

  const { getCustomerConfig } = useHttp(sessionToken.get);

  const [app, setApp] = useState<Record<string, any> | null>(null);

  const extensionSettingsKey = useMemo(() => {
    const extensionSettingsKey = extensionKey
      .split('-')
      .map((part: string, index) => index === 0
        ? part
        : part[0].toUpperCase() + part.slice(1))
        .join('');

    return `${extensionSettingsKey}Settings`;
  }, [extensionKey]);

  const fetchAppSetting = useCallback(async () => {
    if (!shop?.id || extensionEditor) return;

    try {
      const appSettings = await getCustomerConfig(shop.id);
      if (appSettings?.data?.[extensionKey]) {
        const appData = {
          [extensionSettingsKey]: appSettings.data[extensionKey],
        }

        setApp(appData);
      }
    } catch (error) {
      console.error('Fail to fetch app settings', error?.message);
    }
}, [extensionEditor, shop?.id, extensionKey, extensionSettingsKey]);

  useEffect(async () => {
    const fetchSessionToken = async () => {
      const sessionTokenValue = await sessionToken.get();
      console.log('Test custom app - useAppProvider session token', sessionTokenValue);
    };

    fetchSessionToken();
  }, []);

  return {
    shop,
    // customer,
    // setCustomer,
    // loadingCustomer,
    location,
    // isPaid,
    app,
  };
}
