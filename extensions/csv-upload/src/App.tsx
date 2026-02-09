import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import CsvUploadBlock from './CsvUploadBlock';
import { AppProvider } from '@/customer-account/components';

export default async () => {
  render(
  <AppProvider extensionKey='csv-upload'>
    <CsvUploadBlock />
  </AppProvider>
  , document.body);
};
