import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import ShoppingList from './components/ShoppingList';
import { AppProvider } from '@/customer-account/components';

export default async () => {
  render(
  <AppProvider extensionKey="shopping-list">
    <ShoppingList />
  </AppProvider>
  , document.body);
};
