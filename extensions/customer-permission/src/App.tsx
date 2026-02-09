import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import CustomerPermissionPage from './CustomerPermissionPage';
import { AppProvider } from '@/customer-account/components';

export default async () => {
  render(
  <AppProvider extensionKey="customer-permission">
    <CustomerPermissionPage />
  </AppProvider>
  , document.body);
};
