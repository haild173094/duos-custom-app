import { useCallback, useContext, useEffect, useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';
import { hexCodeToImage, truncate } from '@/services';
import { LocationContext } from '@/customer-account/contexts';
import { useMoney, useQuantityValidation } from '@/customer-account/hook';

type Props = {
  item: Record<string, any>,
  index: number,
  contents: Record<string, any>,
  updateItem: (...args) => void,
  removeItem: (...args) => void,
};

export type ShoppingListOrderItemRef = {
  quantityError: string,
};

const ShoppingListOrderItem: React.FC<Props> = ({
  item,
  index,
  updateItem,
  removeItem,
  contents,
}) => {
  const location = useContext(LocationContext);
  const { formatMoney } = useMoney();
  const { errorType: quantityErrorType } = useQuantityValidation(item);

  const updateQuantity = useCallback((value: number) => {
    updateItem(index, { quantity: value });
  }, [index, item]);

  const updateQuantityError = useCallback((quantityError: string) => {
    updateItem(index, { quantityError });
  }, [index]);

  useEffect(() => {
    let errorMessage = '';
    const { min, max, step, } = item;

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
    item.min,
    item.max,
    item.step,
  ]);

  return (
    <s-stack direction="block">
      <s-grid gridTemplateColumns="45% 25% 20% 10%" padding="base" gap="none">
        <s-stack direction='inline' padding="small-300" gap="small">
          <s-box minInlineSize="60px" minBlockSize="60px">
            <s-image
              borderRadius="large"
              aspectRatio="1"
              src={item.image || hexCodeToImage('#f5f5f5')}
              objectFit='cover'
            />
          </s-box>
          <s-stack direction='block' gap="none" alignItems="start">
            <s-text>{truncate(item.productTitle || '')}</s-text>
            <s-text color="subdued" type="small">{truncate(item.variantTitle || '')}</s-text>
            <s-text color="subdued" type="small">{`${formatMoney(item.price, location?.currency)}/ea`}</s-text>
          </s-stack>
        </s-stack>
        <s-box padding="small-300">
          <s-number-field
            label={contents.quantity}
            controls='stepper'
            value={item.quantity}
            error={item.quantityError}
            min={item.min || 1}
            max={item.max || undefined}
            step={item.step || 1}
            onChange={(e: Event) => updateQuantity(e.target.value)}
          />
        </s-box>

        <s-stack direction='inline' alignItems="center" padding="small-300">
          <s-text>{formatMoney(item.price * item.quantity, location?.currency)}</s-text>
        </s-stack>
        <s-stack direction='inline' alignItems="center" padding="small-300">
          <s-clickable
            onClick={() => removeItem(index)}
          >
            <s-icon type="delete" tone="custom"/>
          </s-clickable>
        </s-stack>
      </s-grid>
    </s-stack>
  )
};

export default memo(ShoppingListOrderItem);
