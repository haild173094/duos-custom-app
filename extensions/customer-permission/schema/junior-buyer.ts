import { ISchemaField, ISchemaGroup } from '@/types';
import { useMemo } from 'preact/hooks';

export function useJuniorBuyerSchema(contents?: Record<string, string>) {
  const orderHistory: ISchemaField[] = useMemo(() => [
    {
      name: 'view_all_orders',
      label: contents.view_all_orders,
      defaultValue: false,
      disabled: true,
    },
    {
      name: 'view_own_orders',
      label: contents.view_own_orders,
      defaultValue: true,
      disabled: true,
    },
  ], [contents]);

  const shippingAndBilling: ISchemaField[] = useMemo(() => [
    {
      name: 'edit_shipping_billing_address',
      label: contents.edit_shipping_billing_address,
      defaultValue: false,
      disabled: true,
    }
  ], [contents]);


  const shoppingListSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'read_shopping_list',
      label: contents.read_shopping_list,
      defaultValue: false,
    },
    {
      name: 'write_shopping_list',
      label: contents.write_shopping_list,
      defaultValue: true,
    },
    {
      name: 'submit_shopping_list',
      label: contents.submit_shopping_list,
      defaultValue: true,
    },
    {
      name: 'create_order_shopping_list',
      label: contents.create_order_shopping_list,
      defaultValue: true,
    },
  ], [contents]);

  const CSVSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'create_shopping_list_from_csv',
      label: contents.create_shopping_list_from_csv,
      defaultValue: true,
    },
    {
      name: 'create_order_from_csv',
      label: contents.create_order_from_csv,
      defaultValue: false,
    },
  ], [contents]);

  const quickOrderSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'create_shopping_list_from_sku',
      label: contents.create_shopping_list_from_sku,
      defaultValue: true,
    },
    {
      name: 'create_order_from_sku',
      label: contents.create_order_from_sku,
      defaultValue: false,
    },
  ], [contents]);

  const quotesSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'read_quotations',
      label: contents.read_quotations,
      defaultValue: false,
    },
    {
      name: 'write_quotations',
      label: contents.write_quotations,
      defaultValue: true,
    },
    {
      name: 'create_order_from_quotation',
      label: contents.create_order_from_quotation,
      defaultValue: false,
    },
  ], [contents]);

  const purchasesSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'purchase_online_store',
      label: contents.purchase_online_store,
      helpText: contents.purchase_online_store_help_text,
      defaultValue: false,
    },
  ], [contents]);

  const financeCreditSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'enable_finance_account',
      label: contents.enable_finance_account,
      defaultValue: true,
    },
    {
      name: 'enable_finance_payment',
      label: contents.enable_finance_payment,
      defaultValue: true,
    },
    {
      name: 'enable_finance_credit_limit',
      label: contents.enable_finance_credit_limit,
      defaultValue: true,
    },
    {
      name: 'enable_finance_order_history',
      label: contents.enable_finance_order_history,
      defaultValue: true,
    },
    {
      name: 'enable_finance_ledger',
      label: contents.enable_finance_ledger,
      defaultValue: true,
    }
  ], [contents]);

  const juniorBuyerSettings: ISchemaGroup = useMemo(() => [
    {
      id: 'order-history',
      title: contents.order_history,
      fields: orderHistory,
    },
    {
      id: 'shipping-and-billing',
      title: contents.shipping_and_billing,
      fields: shippingAndBilling,
    },
    {
      id: 'finance-credit',
      title: contents.finance_credit,
      fields: financeCreditSettings,
    },
    {
      id: 'shopping-list',
      title: contents.shopping_list,
      fields: shoppingListSettings,
    },
    {
      id: 'csv-upload',
      title: contents.csv_upload,
      fields: CSVSettings,
    },
    {
      id: 'sku',
      title: contents.sku,
      fields: quickOrderSettings,
    },
    {
      id: 'quotes',
      title: contents.quotes,
      fields: quotesSettings,
    },
    {
      id: 'purchases',
      title: contents.purchase,
      fields: purchasesSettings,
    },
  ], [
    contents,
    orderHistory,
    shippingAndBilling,
    shoppingListSettings,
    CSVSettings,
    quickOrderSettings,
    quotesSettings,
    purchasesSettings,
  ]);

  return {
    juniorBuyerSettings,
  };
}
