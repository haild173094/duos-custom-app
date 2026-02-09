import { ISchemaField, ISchemaGroup } from '@/types';
import { useMemo } from 'preact/hooks';

export function useAdminSchema(contents?: Record<string, string>) {
  const orderHistory: ISchemaField[] = useMemo(() => [
    {
      name: 'view_all_orders',
      label: contents.view_all_orders,
      defaultValue: true,
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
      defaultValue: true,
      disabled: true,
    }
  ], [contents]);

  const memberSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'read_members',
      label: contents.read_members,
      defaultValue: true,
    },
    {
      name: 'write_members',
      label: contents.write_members,
      defaultValue: true,
      control: ['read_members', 'read_roles'],
    },
  ], [contents]);

  const roleSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'read_roles',
      label: contents.read_roles,
      defaultValue: true,
    },
    {
      name: 'write_roles',
      label: contents.write_roles,
      defaultValue: true,
      control: ['read_roles'],
    },
  ], [contents]);

  const shoppingListSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'read_shopping_list',
      label: contents.read_shopping_list,
      defaultValue: true,
    },
    {
      name: 'write_shopping_list',
      label: contents.write_shopping_list,
      defaultValue: true,
    },
    {
      name: 'approve_shopping_list',
      label: contents.approve_shopping_list,
      defaultValue: true,
      control: ['write_shopping_list'],
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
      defaultValue: true,
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
      defaultValue: true,
    },
  ], [contents]);

  const quotesSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'read_quotations',
      label: contents.read_quotations,
      defaultValue: true,
    },
    {
      name: 'write_quotations',
      label: contents.write_quotations,
      defaultValue: true,
    },
    {
      name: 'create_order_from_quotation',
      label: contents.create_order_from_quotation,
      defaultValue: true,
    },
  ], [contents]);

  const purchasesSettings: ISchemaField[] = useMemo(() => [
    {
      name: 'purchase_online_store',
      label: contents.purchase_online_store,
      helpText: contents.purchase_online_store_help_text,
      defaultValue: true,
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

  const locationAdminSettings: ISchemaGroup = useMemo(() => [
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
      id: 'members',
      title: contents.members,
      fields: memberSettings,
    },
    {
      id: 'roles',
      title: contents.roles,
      fields: roleSettings,
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
    memberSettings,
    roleSettings,
    shoppingListSettings,
    CSVSettings,
    quickOrderSettings,
    quotesSettings,
    purchasesSettings,
    financeCreditSettings
  ]);

  return { locationAdminSettings };
}
