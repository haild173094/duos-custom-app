import { useLanguage } from '@shopify/ui-extensions/customer-account/preact';
import { useCallback } from 'preact/hooks';

const useStore = () => {
  const { isoCode } = useLanguage();

  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString(isoCode);
  }, [isoCode]);

  return {
    formatDate,
  }
}

export default useStore;
