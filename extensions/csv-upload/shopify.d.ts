import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/App.tsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.order-index.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/CsvUploadBlock.tsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.order-index.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/CsvUploader.tsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.order-index.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/CsvUploadSummary.tsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.order-index.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/CsvUploadModal.tsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.order-index.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}
