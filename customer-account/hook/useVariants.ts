import { useCallback, useContext, useMemo, useState } from 'preact/hooks';
import { VariantsContext, useShop, LocationContext } from '@customer-account/contexts';
import { normalizeProductVariants } from '@app/services/response';
import useHttp from './useHttp';
import { useLocalizationCountry } from '@shopify/ui-extensions/customer-account/preact';

const useVariants = (getToken?: () => Promise<string>) => {
  const shop = useShop();
  const { id: locationId } = useContext(LocationContext);
  const { getProductVariantsByProductId } = useHttp(getToken);
  const { isoCode: countryCode } = useLocalizationCountry();

  const [isLoadingVariants, setIsLoadingVariants] = useState<boolean>(false);
  const { variantsData, setVariantsData } = useContext(VariantsContext);

  const shopId = useMemo(() => shop?.id || '', [shop?.id]);

  const formatResponseProductVariant = (res: Record<string, any>) => {
    const { data, meta } = res;
    const variants = normalizeProductVariants(data || []);
    const {
      end_cursor: endCursor,
      has_next_page: hasNextPage,
    } = meta || {};

    return {
      variants,
      endCursor,
      hasNextPage,
    }
  };

  const getProductVariants = useCallback(async (productId: string) => {
    if (isLoadingVariants || !productId) return;

    const currentProductVariantsData = variantsData?.[productId];

    if (currentProductVariantsData?.hasNextPage === false) return;

    try {
      setIsLoadingVariants(true);

      const res = await getProductVariantsByProductId(shopId, locationId, productId, countryCode, currentProductVariantsData?.endCursor);

      const formattedRes = formatResponseProductVariant(res);
      const newVariants = [
        ...(currentProductVariantsData?.variants || []),
        ...formattedRes.variants,
      ];

      setVariantsData(prev => ({
        ...(prev || {}),
        [productId]: {
          hasNextPage: formattedRes.hasNextPage,
          endCursor: formattedRes.endCursor,
          variants: newVariants,
        },
      }));
    } catch (error) {
      console.error('Can not fetch variants data', error?.message);
    } finally {
      setIsLoadingVariants(false);
    }
  }, [
    isLoadingVariants,
    variantsData,
    countryCode,
    locationId,
    shopId,
  ]);

  const getAllVariantsForProduct = useCallback((product: Record<string, any>): Record<string, any>[] => {
    const baseVariants = product?.variants || [];
    const loadedVariantsData = variantsData?.[product?.id] as any;
    const additionalVariants = loadedVariantsData?.variants || [];

    if (!additionalVariants.length) {
      return baseVariants;
    }

    const variantIds = new Set(baseVariants.map((v: Record<string, any>) => v.id));
    const uniqueAdditionalVariants = additionalVariants.filter(
      (v: Record<string, any>) => !variantIds.has(v.id),
    );

    return [...baseVariants, ...uniqueAdditionalVariants];
  }, [variantsData]);

  const getVariantsDataForProduct = useCallback((product: Record<string, any>) => {
    const loadedVariantsData = variantsData?.[product?.id] as any;
    const allVariants = getAllVariantsForProduct(product);
    const hasNextPage = loadedVariantsData?.hasNextPage ?? product?.variantsMeta?.has_next_page ?? false;

    return {
      variants: allVariants,
      hasNextPage,
    };
  }, [variantsData, getAllVariantsForProduct]);

  return {
    getProductVariants,
    isLoadingVariants,
    variantsData,
    getAllVariantsForProduct,
    getVariantsDataForProduct,
  }
}

export default useVariants;
