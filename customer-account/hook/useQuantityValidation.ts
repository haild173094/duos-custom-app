import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { IOrderItem, QuantityErrorType } from '@app/types';

const INVENTORY_POLICY_CONTINUE = 'CONTINUE';

export default function useQuantityValidation(line: IOrderItem) {
  const [errorType, setErrorType] = useState<string | null>(null);

  const stringifiedQuantityRuleProperties = useMemo(() => {
    const { quantity, inventoryPolicy, availableStock, isTracked, min, max, step } = line;

    return JSON.stringify({
      quantity,
      inventoryPolicy,
      availableStock,
      isTracked,
      min,
      max,
      step,
    });
  }, [line]);

  const validateQuantityRule = useCallback(() => {
    const { min, max, step, quantity } = line;

    if (!min && !max && !step) return true;

    const isInvalidQuantity = (quantity < min) || ((quantity - min) % step !== 0) || (max && quantity > max);
    if (!isInvalidQuantity) {
      return true;
    }

    if (max) {
      setErrorType(QuantityErrorType.OutOfRangeAndStep);
    } else {
      setErrorType(QuantityErrorType.BelowMinAndStep);
    }

    return false;
  }, [line.quantity, line.min, line.max, line.step]);

  const validateQuantityInventory = useCallback(() => {
    if (typeof line.isTracked === 'boolean' && !line.isTracked) {
      return true;
    }

    if (line.inventoryPolicy !== INVENTORY_POLICY_CONTINUE && line.quantity > line.availableStock) {
      setErrorType(QuantityErrorType.ExceedInventory);

      return false;
    }

    return true;
  }, [line.quantity, line.availableStock]);

  const handleValidateQuantity = useCallback(() => {
    if (!validateQuantityRule()) {
      return;
    }

    if (validateQuantityInventory()) {
      setErrorType(null);
    }
  }, [validateQuantityInventory, validateQuantityRule]);

  useEffect(() => {
    handleValidateQuantity();
  }, [handleValidateQuantity, stringifiedQuantityRuleProperties]);

  return {
    errorType,
  };
}
