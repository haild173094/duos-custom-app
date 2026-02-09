import { useCallback, useContext, useMemo, useState } from 'preact/hooks';
import { ProductsContext, useShop, LocationContext } from '@customer-account/contexts';
import { removeShopifyGidPrefix } from '@app/services/gid';
import { normalizeProductVariants } from '@app/services/response';
import useHttp from './useHttp';
import { useLocalizationCountry } from '@shopify/ui-extensions/customer-account/preact';

const useProducts = (getToken?: () => Promise<string>) => {
  const shop = useShop();
  const { id: locationId } = useContext(LocationContext);
  const { getProductsByTitlte, getPublicationIds } = useHttp(getToken);

  const { productsData, setProductsData } = useContext(ProductsContext);
  const [productsDataByFilter, setProductsDataByFilter] = useState<Record<string, any> | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [cachedPublicationIds, setCachedPublicationIds] = useState<string[]>([]);
  const { isoCode: countryCode } = useLocalizationCountry();

  const formatResponseProduct = (res: Record<string, any>) => {
    const { data, meta } = res;

    const products = (data || [])
      .filter((product: Record<string, any>) => product.published_in_context)
      .map((product: Record<string, any>) => {
        const variants = (product.variants?.data || []).map((variant: Record<string, any>) => ({
          ...variant,
          product: {
            id: product.id,
            title: product.title,
            featured_media: product.featured_media,
            published_in_context: product.published_in_context,
          },
        }));
        
        return {
          id: removeShopifyGidPrefix(product.id, 'Product'),
          title: product.title,
          image: product.featured_media?.preview?.image?.url,
          skus: variants
            .map((item: Record<string, any>) => item.sku)
            .filter((sku: string | null) => Boolean(sku)),
          variants: normalizeProductVariants(variants),
          variantsMeta: product.variants?.meta || {
            has_next_page: false,
            end_cursor: null,
          },
        };
      });

    const {
      end_cursor: endCursor,
      has_next_page: hasNextPage
    } = meta || { has_next_page: false };

    return {
      products,
      endCursor,
      hasNextPage,
    };
  };

  const getProducts = useCallback(async (query: string = '') => {
    if (isLoadingProducts) {
      return;
    }

    let currentProductsData = null;

    if (!query) {
      currentProductsData = productsData;
    } else if (query !== filter) {
      setFilter(query);
      setProductsDataByFilter(null);
      currentProductsData = null;
    } else {
      currentProductsData = productsDataByFilter;
    }

    if (currentProductsData?.hasNextPage === false) return;

    try {
      setIsLoadingProducts(true);

      // Check cache for publication IDs to avoid redundant API calls
      let publicationIdsRes = cachedPublicationIds.length > 0 ? cachedPublicationIds : null;
      
      if (!publicationIdsRes) {
        publicationIdsRes = await getPublicationIds(locationId);
        setCachedPublicationIds(publicationIdsRes);
      }

      const res = await getProductsByTitlte(publicationIdsRes, locationId, query, countryCode, currentProductsData?.endCursor);

      const formattedRes = formatResponseProduct(res);
      const newProducts = [
        ...(currentProductsData?.products || []),
        ...formattedRes.products,
      ];
      const newProductsData = {
        hasNextPage: formattedRes.hasNextPage,
        endCursor: formattedRes.endCursor,
        products: newProducts,
      }

      if (!query) {
        setProductsData(newProductsData);
      } else {
        setProductsDataByFilter(newProductsData);
      }
    } catch (error) {
      console.error('Can not fetch products data', error?.message);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [
    productsData,
    productsDataByFilter,
    isLoadingProducts,
    countryCode,
    locationId,
    cachedPublicationIds,
    getPublicationIds,
    getProductsByTitlte,
    filter,
  ]);

  return {
    getProducts,
    isLoadingProducts,
    productsData,
    productsDataByFilter,
  }
}

export default useProducts;
