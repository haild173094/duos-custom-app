export const removeShopifyGidPrefix = (originString: string, type: string): string => `${originString}`.replace(`gid://shopify/${type}/`, '');
export const getShopifyGidPrefix = (originString: string, type: string): string => `gid://shopify/${type}/${originString}`;
