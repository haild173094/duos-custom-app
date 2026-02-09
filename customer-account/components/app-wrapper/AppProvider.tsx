import { useMemo, useState } from 'preact/hooks';
import { ReactNode } from 'preact/compat';
import { useExtensionEditor } from '@shopify/ui-extensions/customer-account/preact';
import useAppProvider from '@customer-account/hook/useAppProvider';
import { CustomerContext } from '@customer-account/contexts/customer';
import { ShopContext } from '@customer-account/contexts/shop';
import { AppContext } from '@customer-account/contexts/app';
import { LocationContext, ProductsContext, VariantsContext } from '@customer-account/contexts';
import { IProductsData, IVariantsData } from '@app/types';

const AppProvider = ({ children, extensionKey }: { children: ReactNode, extensionKey: string }) => {
  const extensionEditor = useExtensionEditor();

  const PREVIEW_URLS = {
    QUOTATION: 'https://cdn.getduos.io/customer-account/Quotation%20-%20preview.png',
    SHOPPING_LIST: 'https://cdn.getduos.io/customer-account/preview-shopping-list.png',
    QUICK_ORDER: 'https://cdn.getduos.io/customer-account/preview-sku-page.png',
    CSV_UPLOAD: 'https://cdn.getduos.io/customer-account/preview-csv.png',
    CUSTOMER_PERMISSION: 'https://cdn.getduos.io/customer-account/company-member.png',
    FINANCE_CREDIT: 'https://cdn.getduos.io/customer-account/Credit%20limit%20-%20preview.png',
  };

  const previewImage = useMemo(() => {
    const key = extensionKey.replace(/-/g, '_').toUpperCase();

    return PREVIEW_URLS[key as keyof typeof PREVIEW_URLS] || '';
  }, [extensionKey]);

  if (extensionEditor) {
    return (
      <s-stack>
        <s-image src={previewImage} inlineSize='auto'/>
      </s-stack>
    )
  }

  const {
    shop,
    customer,
    setCustomer,
    loadingCustomer,
    location,
    isPaid,
    app,
  } = useAppProvider(extensionKey);

  const [productsData, setProductsData] = useState<IProductsData | null>(null);
  const [variantsData, setVariantsData] = useState<IVariantsData | null>(null);

  if (!shop || !customer || !isPaid) {
    return null;
  }

  return (
    <ShopContext.Provider value={shop}>
      <CustomerContext.Provider value={{
        customer,
        updateCustomer: setCustomer,
        loadingCustomer: loadingCustomer,
      }}>
        <LocationContext.Provider value={location}>
          <AppContext.Provider value={app}>
            <ProductsContext.Provider value={{
              productsData,
              setProductsData,
            }}>
              <VariantsContext.Provider value={{
                variantsData,
                setVariantsData,
              }}>
                {children}
              </VariantsContext.Provider>
            </ProductsContext.Provider>
          </AppContext.Provider>
        </LocationContext.Provider>
      </CustomerContext.Provider>
    </ShopContext.Provider>
  );
}

export default AppProvider;
