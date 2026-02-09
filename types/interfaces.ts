export type IOrderItem = {
  id: number,
  displayId: number,
  sku: string,
  quantity: number,
  variantTitle?: string,
  productTitle?: string,
  image?: string,
  price?: number,
  min?: number,
  max?: number | undefined,
  step?: number,
  inventoryPolicy?: 'DENY' | 'CONTINUE',
  availableStock?: number,
  availableInLocation?: boolean,
  skuError?: string,
  quantityError?: string,
  isProcessing?: boolean,
  isDebounce?: boolean,
  isTracked?: boolean,
};

export type IOrderSummaryItem = {
  title: string,
  price: number,
  id?: string | number,
}

export type IShop = {
  id: string,
  name: string,
  primaryDomain: {
    url: string,
    host: string,
  }
};

export type IShoppingListItem = {
  variant_id: string,
  quantity: number,
};

export type ICompanyLocation = {
  id: string,
  currency?: string,
  name?: string,
  countryCode?: string,
  languageCode?: string,
};

export type ICustomer = {
  customerId: string,
  customerName: string,
  companyContactId: string,
  companyId: string,
  permissions?: string[],
  currentRole?: string,
  shoppingList?: {
    id: number,
    title: string,
    items: IShoppingListItem[],
  }[],
  email: string,
  phone: string,
};

export type IQuickOrderSettings = {
  create_order_action: string[],
  enable_bulk_add_skus_button: boolean,
  enable_download_catalog_button: boolean,
  enable_shopping_list: boolean,
};

export type ICsvUploadSettings = {
  create_order_action: string[],
  enable_shopping_list: boolean,
};

export type IShoppingListSettings = {
  create_order_action: string[],
};

export type ICustomerContext = {
  customer: ICustomer,
  updateCustomer?: Function,
  loadingCustomer?: boolean,
};

export type IAppContext = {
  quickOrderSettings?: IQuickOrderSettings,
  csvUploadSettings?: ICsvUploadSettings,
  shoppingListSettings?: IShoppingListSettings,
}

export type QuickOrderContext = {
  orderList: IOrderItem[],
  currentLocations: Record<string, any>[],
  setOrderList: Function,
};

export type ICalculateDraftOrder = {
  totalQuantityOfLineItems: string | number,
  total_price_set: {
    presentment_money: {
      amount: string,
    }
  },
  total_shipping_price_set: {
    presentment_money: {
      amount: string,
    }
  },
  total_tax_set: {
    presentment_money: {
      amount: string,
    }
  },
  subtotal_price_set: {
    presentment_money: {
      amount: string,
    }
  },
  currency_code: string,
  line_items: {
    original_total_set: {
      presentment_money: {
        amount: string,
      }
    },
    quantity: number,
    title: string,
    variant: {
      title: string,
      image: {
        src: string,
      },
      contextual_pricing: {
        price: {
          amount: string,
          currency_code: string,
        }
      },
      inventory_item: {
        tracked: boolean,
      },
      inventory_quantity: number,
    }
  }[]
};

export type ISkuError = {
  type?: string,
  invalidSkus?: string[],
  errorKey?: string,
}

export type IShoppingListDetail = {
  id: number,
}

export type ShoppingListContext = {
  shoppingList: IShoppingListDetail[],
  setShoppingList: Function,
  currentLocations: Record<string, any>[],
};

export type ISchemaField = {
  name: string,
  label: string,
  defaultValue: boolean,
  disabled?: boolean,
  helpText?: string,
  control?: string[],
};

export type ISchemaGroup = {
  id: string,
  title: string,
  fields: ISchemaField[],
}[];

export type IShoppingListOrderItem = {
  id: number,
  price: number,
  quantity: number,
  productTitle: string,
  variantTitle: string,
  step: number,
  min: number,
  max: number | undefined,
  availableStock: number | undefined,
  image: string | undefined,
  inventoryPolicy: string,
};

export type IProduct = {
  title: string,
  id: string,
  image: string | undefined,
  variants: {
    data: Record<string, any>[],
    loadedAll: boolean,
    hasNextPage: boolean,
    endCursor: string,
  },
}

export type IProductsData = {
  products: Record<string, any>[],
  endCursor: string,
  hasNextPage: boolean,
}

export type IProductsContext = {
  productsData: IProductsData,
  setProductsData: Function,
}

export type IVariantsData = Record<number, {
  products: Record<string, any>[],
  endCursor: string,
  hasNextPage: boolean,
}>

export type IVariantsContext = {
  variantsData: IVariantsData,
  setVariantsData: Function,
}

export type IPlan = {
  id: number,
  name?: string,
  slug?: string,
}

export type IQuoteItem = {
  productId: number,
  productTitle: string,
  productHandle: string,
  variantId: number,
  variantTitle: string,
  price: number,
  quotedPrice?: number,
  image: string,
  quantity: number,
  sku: string,
  url: string,
  quantityError?: string,
  inventoryPolicy?: string,
  availableStock?: number,
  min?: number,
  max?: number,
  step?: number,
  isTracked?: boolean,
}

export type FieldsKey = 'location_id' | 'customer_id' | 'company_id' | 'status' | 'name' | 'data';

export type IShoppingListFieldItem = {
  json_value: string | JSON,
  key: FieldsKey,
  value: string,
}

export type IShoppingListFields = {
  fields: IShoppingListFieldItem[],
}
