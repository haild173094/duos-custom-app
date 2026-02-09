import { useState, useContext, useMemo, useCallback, useRef } from 'preact/hooks';
import { QuickOrderContext, useShop, LocationContext } from '../contexts';
import { randomId, normalizeProductVariant } from '@app/services';
import useHttp from './useHttp';
import { IOrderItem, ISkuError } from '@app/types';
import { skuErrorType } from '@app/config';
import { useLocalizationCountry } from '@shopify/ui-extensions/customer-account/preact';

const MAX_SKUS_PER_REQUEST = 100;
const NUMBER_OF_ORDER_ROWS_PER_ONE_SKU = 1
const ERROR_KEY = {
  wrong_format: 'bulk_sku_wrong_format',
  duplicate: 'bulk_sku_duplicate',
  not_available: 'bulk_sku_not_available',
  not_exist: 'bulk_sku_not_exist',
  exceed_limit: 'bulk_sku_exceed_limit',
}

const useValidationSkus = (isValidateForBulkAdd: boolean = true, getToken: () => Promise<string>) => {
  const shop = useShop();
  const { getProductVariantsBySkus } = useHttp(getToken);

  const { orderList } = useContext(QuickOrderContext);
  const location = useContext(LocationContext);
  const { isoCode: countryCode } = useLocalizationCountry();

  const [loading, setLoading] = useState<boolean>(false);

  const error = useRef<ISkuError | null>(null);
  const validVariants = useRef<IOrderItem[]>([]);

  const currentOrderListSkus = useMemo(() => orderList.map(item => item.sku), [orderList]);

  const validateSkusLimitations = (skus: string[]) => {
    if (skus.length > MAX_SKUS_PER_REQUEST) {
      error.current = {
        type: skuErrorType.EXCEED_SKU_LIMITATION,
        errorKey: ERROR_KEY.exceed_limit,
      };

      return false;
    }

    return true;
  };

  const validateSkusDuplication = useCallback((skus: string[]) => {
    if (!isValidateForBulkAdd) {
      return true;
    }

    // check duplication inside current skus input
    const skusSet = new Set(skus);
    if (skusSet.size !== skus.length) {
      error.current = {
        type: skuErrorType.DUPLICATE,
        errorKey: ERROR_KEY.duplicate,
        invalidSkus: [],
      };

      return false;
    }

    // check duplication with current order list skus
    const duplicatedSkus = skus.filter(sku => currentOrderListSkus.indexOf(sku) !== -1);

    if (duplicatedSkus.length) {
      error.current = {
        type: skuErrorType.DUPLICATE,
        errorKey: ERROR_KEY.duplicate,
        invalidSkus: duplicatedSkus,
      };

      return false;
    }

    return true;
  }, [currentOrderListSkus]);

  const formatResponseSkuRequest = (res: Record<string, any>) => {
    let formattedRes = normalizeProductVariant(res);

    if (isValidateForBulkAdd) {
      formattedRes = {
        ...formattedRes,
        displayId: randomId(),
      }
    }

    return formattedRes;
  };

  const validateSkusByCustomerContext = useCallback(async (skus: string[]) => {
    if (!shop?.id || !location?.id || !countryCode) return;

    try {
      setLoading(true);

      const data = await getProductVariantsBySkus(skus, shop.id, location.id, countryCode);

      if (!data.length) {
        error.current = {
          type: skuErrorType.NOT_EXIST_VARIANT,
          errorKey: ERROR_KEY.not_exist,
          invalidSkus: skus,
        };

        return false;
      }

      const formattedData = data.map((productVariantRes: Record<string, any>) => formatResponseSkuRequest(productVariantRes));
      const resSkus = formattedData.map((item: { sku: any; }) => item.sku);

      if (resSkus.length !== skus.length) {
        const invalidSkus = skus.filter((sku) => resSkus.indexOf(sku) === -1);

        error.current = {
          type: skuErrorType.NOT_EXIST_VARIANT,
          errorKey: ERROR_KEY.not_exist,
          invalidSkus,
        };

        return false;
      }

      const skusNotInLocation = formattedData
        .filter((item: { availableInLocation: any; }) => !item.availableInLocation)
        .map((item: { sku: any; }) => item.sku);

      if (skusNotInLocation.length) {
        error.current = {
          type: skuErrorType.NOT_IN_LOCATION,
          errorKey: ERROR_KEY.not_available,
          invalidSkus: skusNotInLocation
        };

        return false;
      }

      validVariants.current = formattedData;
      return true;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [shop?.id, location?.id, countryCode]);

  const validateSkus = useCallback((skus: string[]) => {
    if (!skus.length || !location?.id || !countryCode) return false;

    error.current = null;

    if (!validateSkusLimitations(skus)) {
      return false;
    }

    if (!validateSkusDuplication(skus)) {
      return false;
    }

    return validateSkusByCustomerContext(skus);
  }, [validateSkusByCustomerContext, validateSkusDuplication, location?.id, countryCode]);

  return {
    error,
    loading,
    validVariants,
    validateSkus,
  }
};

export default useValidationSkus;
