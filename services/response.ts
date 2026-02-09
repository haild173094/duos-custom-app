import { removeShopifyGidPrefix } from './gid';

export const normalizeProductVariant = (
  variant: Record<string, any>
) => ({
  id: removeShopifyGidPrefix(variant.id, 'ProductVariant'),
  sku: variant.sku,
  price: variant.contextual_pricing?.price?.amount,
  currency: variant.contextual_pricing?.price?.currency_code,
  productTitle: variant.product.title,
  variantTitle: variant.title,
  availableInLocation: variant.product.published_in_context,
  inventoryPolicy: variant.inventory_policy,
  availableStock: variant.inventory_quantity,
  image: variant.product.featured_media?.preview?.image?.url,
  min: variant.contextual_pricing?.quantity_rule?.minimum || 1,
  max: variant.contextual_pricing?.quantity_rule?.maximum,
  step: variant.contextual_pricing?.quantity_rule?.increment || 1,
  isTracked: variant.inventory_item?.tracked,
});

export const normalizeProductVariants = (
  variants: Record<string, any>[],
) => variants.map(variant => normalizeProductVariant(variant));
