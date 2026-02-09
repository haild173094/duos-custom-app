import { useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';
import ShoppingListOrderItem from './ShoppingListOrderItem';
import { useMoney } from '@/customer-account/hook';

type Props = {
  items?: Record<string, any>[],
  updateItem: (...args) => void,
  removeItem: (...args) => void,
  contents: Record<string, any>,
};

export type ShoppingListOrderTableRefs = {
  validate: Function,
  notInLocationItems: Record<string, any>[],
  invalidQuantityItems: Record<string, any>[],
};

const ShoppingListOrderTable: React.FC<Props> = ({
  items,
  updateItem,
  removeItem,
  contents,
}) => {
  const { formatMoney } = useMoney();

  const total = useMemo(() => items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0), [items]);

  const shoppingListCurrency = useMemo(() => items?.[0]?.currency || 'USD', [items]);

  const displayedShoppingListItems = items.map((item, index) => (
    <ShoppingListOrderItem
      item={item}
      key={item.id}
      index={index}
      updateItem={updateItem}
      removeItem={removeItem}
      contents={contents}
    />
  ));

  return (
    <s-stack direction="block" gap="base">
      <s-scroll-box >
        <s-stack direction='block' gap="none">
          <s-grid gridTemplateColumns="45% 25% 20% 10%" padding="base" gap="none">
            <s-text color="subdued">{contents.items}</s-text>
            <s-text color="subdued">{contents.quantity}</s-text>
            <s-text color="subdued">{contents.total}</s-text>
            <s-text color="subdued">{contents.actions}</s-text>
          </s-grid>
          <s-divider />
          <s-scroll-box maxBlockSize="700px">
            { items.length
              ? displayedShoppingListItems
              : (
                <s-stack alignItems="center" justifyContent="center" minBlockSize="300px" padding="base">
                  <s-text>{contents.empty_shopping_list_placeholder}</s-text>
                </s-stack>
              )
            }
          </s-scroll-box>

          <s-divider />
          <s-grid padding="base" gridTemplateColumns="50% 50%">
            <s-text type="strong">Total</s-text>
            <s-stack direction="inline" justifyContent="end">
              <s-text type="strong">{formatMoney(total, shoppingListCurrency)}</s-text>
            </s-stack>
          </s-grid>
        </s-stack>
      </s-scroll-box>
    </s-stack>
  )
};

export default memo(ShoppingListOrderTable);
