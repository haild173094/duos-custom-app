import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks';
import { memo } from 'preact/compat';
import {
  useSessionToken,
} from '@shopify/ui-extensions/customer-account/preact';
import { IOrderItem } from '@app/types';
import { useValidationSkus, useQuantityValidation } from '@app/customer-account/hook';
import { skuErrorType } from '@app/config';
import { LocationContext } from '@app/customer-account/contexts';

type Props = {
  index: number,
  line: IOrderItem,
  updateOrderItem: Function,
  removeOrderItem: Function,
  contents: any,
  hideVariantDetail?: boolean,
}

const QuickOrderRow = ({
  index,
  line,
  updateOrderItem,
  removeOrderItem,
  contents,
  hideVariantDetail = false,
}: Props) => {
  const sessionToken = useSessionToken();
  const {
    validVariants,
    error: skuValidationError,
    loading: isValidatingSku,
    validateSkus,
  } = useValidationSkus(false, sessionToken.get);

  const location = useContext(LocationContext);

  const { errorType: quantityErrorType } = useQuantityValidation(line);

  const [debounced, setDebounced] = useState(null);

  const DEBOUNCED_TIMER = 1000;
  const INVENTORY_POLICY_CONTINUE = 'CONTINUE';

  const displayedInventoryInfo = useMemo(() => {
    if (line.availableStock === undefined) {
      return 'N/A';
    }

    if (line.inventoryPolicy !== INVENTORY_POLICY_CONTINUE) {
      return line.availableStock;
    }

    return contents.inventory_not_tracked;
  }, [line.availableStock, line.inventoryPolicy]);

  const updateSkuError = useCallback((skuError: string) => {
    updateOrderItem(index, { skuError });
  }, [index]);

  const updateQuantityError = useCallback((quantityError: string) => {
    updateOrderItem(index, { quantityError });
  }, [index]);

  const updateIsProcessingFlag = useCallback((isProcessing: boolean) => {
    updateOrderItem(index, { isProcessing });
  }, [index]);

  const handleValidateSku = useCallback(async (sku: string) => {
    if (!location?.id) return;

    if (!sku) {
      updateSkuError(contents.empty_field);
      return;
    }

    const isPassSkusValidations = await validateSkus([sku]);

    if (isPassSkusValidations) {
      updateSkuError('');
      updateOrderItem(index, validVariants.current[0]);

      return;
    }

    const errorType = skuValidationError.current.type;

    if (errorType === skuErrorType.DUPLICATE) {
      updateSkuError(contents.duplicate_product);
    } else if (errorType === skuErrorType.NOT_EXIST_VARIANT) {
      updateSkuError(contents.no_product);
    } else if (errorType === skuErrorType.NOT_IN_LOCATION) {
      updateSkuError(contents.not_available);
    }
  }, [
    index,
    validateSkus,
    location?.id,
  ]);

  const debouncedUpdateSku = useCallback((value: string) => {
    updateOrderItem(index, { sku: value, isDebounce: true });

    if (debounced) {
      clearTimeout(debounced);
    }

    const newDebounced = setTimeout(() => {
      handleValidateSku(value);
      updateOrderItem(index, { isDebounce: false });
    }, DEBOUNCED_TIMER);

    setDebounced(newDebounced);
  }, [debounced, handleValidateSku]);

  const updateQuantity = useCallback((value: number) => {
    if (value === line.quantity) {
      return;
    }

    updateOrderItem(index, { quantity: value });
  }, [index, line]);

  useEffect(() => {
    let errorMessage = '';
    const { min, max, step, } = line;

    if (quantityErrorType) {
      errorMessage = contents[quantityErrorType]
        .replaceAll('{{min}}', min)
        .replaceAll('{{max}}', max)
        .replaceAll('{{step}}', step);
    }

    updateQuantityError(errorMessage);
  }, [
    quantityErrorType,
    updateQuantityError,
    line.min,
    line.max,
    line.step,
  ]);

  const loadingVariantSpinner = useMemo(() => (isValidatingSku && <s-spinner size="base" />), [isValidatingSku]);

  return (
    <s-grid
      gridTemplateColumns={hideVariantDetail ? "45% 45% auto" : "25% 20% 40% 15%" }
      gap="base"
    >
      {!line.sku && line.id ? (
        <s-stack direction='inline' alignItems="center">
          <s-text>
            {line.productTitle} - {line.variantTitle}
          </s-text>
        </s-stack>
      ) : (<s-text-field
        label={contents.sku}
        value={line.sku}
        onChange={(e: Event) => debouncedUpdateSku(e.target.value)}
        error={line.skuError}
        // accessory={loadingVariantSpinner}
      >
        <s-box slot="accessory">
          {loadingVariantSpinner}
        </s-box>
      </s-text-field>
      )}
      <s-number-field
        label={contents.quantity}
        controls="stepper"
        min={line.min || 1}
        max={line.max || undefined}
        value={String(line.quantity)}
        onChange={(e: Event) => updateQuantity(parseFloat(e.target.value) || 0)}
        error={line.quantityError}
        step={line.step || 1}
      />
      {!hideVariantDetail && (
        <s-grid gridTemplateColumns='25% 25% 25% 25%' gap="base" alignItems="start" padding="small-100 none none none">
          <s-text>{displayedInventoryInfo}</s-text>
          <s-text>{line.step || 'N/A'}</s-text>
          <s-text>{line.min || 'N/A'}</s-text>
          <s-text>{line.max || 'N/A'}</s-text>
        </s-grid>
      )}
      <s-stack direction='inline' alignItems="start" padding="base none none none" justifyContent='center'>
        <s-clickable
          onClick={() => removeOrderItem(index)}
        >
          <s-icon type="delete" />
        </s-clickable>
      </s-stack>
    </s-grid>
  )
};

export default memo(QuickOrderRow);
