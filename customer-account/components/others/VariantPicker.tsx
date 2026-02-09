import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import '@shopify/ui-extensions';
import { useSessionToken } from '@shopify/ui-extensions/customer-account/preact';
import { hexCodeToImage } from '@app/services/helper';
import useProducts from '@customer-account/hook/useProducts';
import useVariants from '@customer-account/hook/useVariants';
import LocationContext from '@customer-account/contexts/LocationContext';
import { ModalElement } from '@shopify/ui-extensions/build/ts/surfaces/customer-account/components/Modal';
import { ReducedIconTypes } from '@shopify/ui-extensions/build/ts/surfaces/customer-account/components/Badge';
import LayoutCenter from './LayoutCenter';

type Props = {
  contents: Record<string, string>,
  modelValue: Record<string, any> | Record<string, any>[] | null,
  setModelValue: (val: Record<string, any> | Record<string, any>[] | null) => void,
  activator: {
    type?: string,
    content: string,
    icon?: ReducedIconTypes,
  },
  isMultiple?: boolean,
}

const VariantPicker = ({
  contents,
  modelValue,
  setModelValue,
  activator,
  isMultiple = true,
}: Props) => {
  const sessionToken = useSessionToken();
  const {
    getProducts,
    isLoadingProducts,
    productsData,
    productsDataByFilter,
  } = useProducts(sessionToken.get);

  const {
    getProductVariants,
    isLoadingVariants,
    variantsData,
    getAllVariantsForProduct,
    getVariantsDataForProduct,
  } = useVariants(sessionToken.get);

  const location = useContext(LocationContext);

  const MODAL_ID = 'variant-picker-modal';
  const NUMBER_OF_PRODUCCTS_TO_STOP_FETCH = 10;

  const [searchValue, setSearchValue] = useState<string>('');
  const [debounced, setDebounced] = useState(null);
  const [localValue, setLocalValue] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const modalRef = useRef<ModalElement | null>(null);
  const autoSelectRef = useRef<boolean>(false);

  const usedProductsData = useMemo(() => searchValue ? productsDataByFilter : productsData, [
    productsData,
    productsDataByFilter,
    searchValue,
  ]);

  const selectedProductVariantsData = useMemo(() => {
    if (!expandedId || !usedProductsData?.products) return null;
    const product = usedProductsData.products.find((p: Record<string, any>) => p.id === expandedId);
    if (!product) return null;

    return getVariantsDataForProduct(product);
  }, [
    expandedId,
    usedProductsData,
    getVariantsDataForProduct,
  ]);

  const loadedVariants = useMemo(() => {
    if (!usedProductsData?.products) return [];

    // Get all variants from products
    const productVariants = usedProductsData.products.flatMap((product: Record<string, any>) => {
      return getAllVariantsForProduct(product);
    });
    
    return productVariants;
  }, [usedProductsData, getAllVariantsForProduct]);


  const getProductSelectionState = useCallback((product: Record<string, any>) => {
    const productVariants = getAllVariantsForProduct(product);
    if (productVariants.length === 0) return { isSelected: false, isIndeterminate: false };

    const selectedVariants = productVariants.filter((variant: Record<string, any>) => 
      localValue.includes(variant.id.toString())
    );
    
    const allSelected = selectedVariants.length === productVariants.length && productVariants.length > 0;
    const someSelected = selectedVariants.length > 0 && selectedVariants.length < productVariants.length;
    
    return {
      isSelected: allSelected,
      isIndeterminate: someSelected,
    };
  }, [localValue, getAllVariantsForProduct]);

  const handleProductCheckboxChange = useCallback((product: Record<string, any>, checked: boolean) => {
    const productVariants = getAllVariantsForProduct(product);
    const variantIds = productVariants.map((v: Record<string, any>) => v.id.toString());

    if (!variantIds.length) return;

    // When the parent (product) is checked, expand it and ensure its variants
    // are selected. When unchecked, remove its variants.
    if (checked) {
      if (isMultiple) {
        setLocalValue((prev: string[]) => {
          const newValue = [...prev];

          variantIds.forEach((id: string) => {
            if (!newValue.includes(id)) {
              newValue.push(id);
            }
          });

          return newValue;
        });
      } else {
        // Single select mode: select the first variant
        setLocalValue([variantIds[0]]);
      }

      // Only expand if there's more than 1 variant
      if (productVariants.length > 1) {
        setExpandedId(product.id);
      }
    } else {
      if (isMultiple) {
        setLocalValue((prev: string[]) =>
          prev.filter((id: string) => !variantIds.includes(id)),
        );
      } else {
        const firstId = variantIds[0];
        setLocalValue((prev: string[]) =>
          prev.filter((id: string) => id !== firstId),
        );
      }

      // Optionally collapse when completely unchecked
      if (expandedId === product.id) {
        setExpandedId(null);
      }
    }
  }, [expandedId, isMultiple, getAllVariantsForProduct]);

  const handleVariantCheckboxChange = useCallback((variantId: string, checked: boolean) => {
    setLocalValue((prev: string[]) => {
      if (checked) {
        if (isMultiple) {
          if (prev.includes(variantId)) return prev;
          return [...prev, variantId];
        }

        // Single select mode: only keep the newly selected variant
        return [variantId];
      }

      // Uncheck
      return prev.filter((id: string) => id !== variantId);
    });
  }, [isMultiple]);

  useEffect(() => {
    if (Array.isArray(modelValue)) {
      setLocalValue(modelValue.map((variant: Record<string, any>) => variant.id))
    } else {
      setLocalValue([modelValue?.id || '']);
    }
  }, [modelValue]);

  useEffect(() => {
    if (
      !isActive
      || debounced
      || isLoadingProducts
      || !usedProductsData?.products
    ) {
      return;
    }

    if (usedProductsData.products.length < NUMBER_OF_PRODUCCTS_TO_STOP_FETCH) {
      getProducts(searchValue);
    }
  }, [
    isActive,
    isLoadingProducts,
    usedProductsData,
    searchValue,
    debounced,
  ]);

  // Auto-check newly loaded variants if parent is checked
  useEffect(() => {
    // Only proceed if loading completed and should auto-select
    if (isLoadingVariants || !autoSelectRef.current || !expandedId || !usedProductsData?.products) {
      return;
    }

    const product = usedProductsData.products.find((p: Record<string, any>) => p.id === expandedId);
    if (!product) return;

    // Get all variants including newly loaded ones
    const productVariants = getAllVariantsForProduct(product);
    const allVariantIds = productVariants.map((v: Record<string, any>) => v.id.toString());

    // Add all newly loaded variants to checked state
    setLocalValue((prev: string[]) => {
      const newValue = [...prev];
      let hasChanges = false;

      allVariantIds.forEach((id: string) => {
        if (!newValue.includes(id)) {
          newValue.push(id);
          hasChanges = true;
        }
      });

      return hasChanges ? newValue : prev;
    });

    // Reset flag
    autoSelectRef.current = false;
  }, [
    isLoadingVariants,
    expandedId,
    usedProductsData,
    getAllVariantsForProduct,
  ]);

  const debouncedUpdateSearchProduct = useCallback((value: string) => {
    setSearchValue(value);

    if (!location?.id) return;

    if (debounced) {
      clearTimeout(debounced);
    }

    const newDebounced = setTimeout(() => {
      getProducts(value);
      setDebounced(null);
    }, 1000);

    setDebounced(newDebounced);
  }, [debounced, location?.id, getProducts]);

  const updateSelectedVariants = useCallback(() => {
    if (!localValue.length) return;

    let currentVariants = null;

    if (!isMultiple) {
      currentVariants = loadedVariants.find((v: Record<string, any>) => v.id === localValue[0]);
    } else {
      currentVariants = loadedVariants.filter((v: Record<string, any>) => localValue.some(id => id === v.id));
    }

    setModelValue(currentVariants);
  }, [
    isMultiple,
    localValue,
    loadedVariants,
  ]);

  const save = useCallback(() => {
    updateSelectedVariants();
    modalRef.current.hideOverlay();
  }, [localValue,
    updateSelectedVariants
  ]);

  const modalOnScrolledToEdge = useCallback((searchValue: string) => {
    if (!usedProductsData?.products?.length) {
      return;
    }

    getProducts(searchValue);
  }, [
    getProducts,
    usedProductsData?.products?.length
  ]);

  const modalOnOpen = useCallback(() => {
    setIsActive(true);
    setSearchValue('');
    getProducts();
  }, [
    getProducts,
  ]);

  const modalOnClose = () => {
    setExpandedId(null);
    setIsActive(false);
    // Reset localValue to match modelValue when modal closes
    if (Array.isArray(modelValue)) {
      setLocalValue(modelValue.map((variant: Record<string, any>) => variant.id))
    } else {
      setLocalValue([modelValue?.id || '']);
    }
  };

  const handleLoadMoreVariants = useCallback(() => {
    if (expandedId && !isLoadingVariants) {
      // Check if parent product is selected before loading
      const product = usedProductsData?.products?.find((p: Record<string, any>) => p.id === expandedId);
      if (product) {
        const baseVariants = product.variants || [];
        const baseVariantIds = baseVariants.map((v: Record<string, any>) => v.id.toString());
        // Set flag to auto-select variants after loading completes
        autoSelectRef.current = baseVariantIds.length > 0 && 
          baseVariantIds.every((id: string) => localValue.includes(id));
      }
      getProductVariants(expandedId);
    }
  }, [expandedId, isLoadingVariants, usedProductsData, localValue, getProductVariants]);

  const resourceItems = useMemo(() => usedProductsData?.products?.map((product: Record<string, any>, index: number) => {
    const productVariants = getAllVariantsForProduct(product);
    const variantCount = productVariants.length;
    const variantsDataForProduct = getVariantsDataForProduct(product);
    const hasNextPage = variantsDataForProduct.hasNextPage;
    const selectionState = getProductSelectionState(product);
    const hasVariants = variantCount > 0;

    const toggleProductExpanded = () => {
      // If product has only 1 variant, directly select it instead of expanding
      if (variantCount === 1) {
        const singleVariant = productVariants[0];
        if (singleVariant) {
          handleVariantCheckboxChange(singleVariant.id.toString(), true);
        }
        return;
      }
      setExpandedId(prev => (prev === product.id ? null : product.id));
    };
    
    return (
      <s-stack key={product.id} gap='none'>
        <s-grid
          gridTemplateColumns='auto 1fr auto auto'
          gap='small'
          alignItems='center'
          padding='base'
        >
          {hasVariants && (
            <s-checkbox
              checked={selectionState.isSelected}
              onChange={(e: Event) => {
                e.stopPropagation();
                handleProductCheckboxChange(product, (e.target as HTMLInputElement).checked);
              }}
            />
          )}
          <s-clickable
            inlineSize='100%'
            onClick={toggleProductExpanded}
          >
            <s-grid
              gridTemplateColumns='50px auto'
              gap='small'
              alignItems='center'
            >
              <s-image
                borderRadius='small'
                objectFit='cover'
                aspectRatio='1/1'
                src={product.image || hexCodeToImage('#f5f5f5')}
              />
              <s-text>{product.title || 'product title'}</s-text>
            </s-grid>
          </s-clickable>
          <s-clickable
            onClick={toggleProductExpanded}
          >
            <s-grid
              alignItems='center'
              gap='small'
              gridTemplateColumns='auto auto'
            >
              {hasVariants && (
                <s-text tone='neutral'>
                  {variantCount}{hasNextPage ? '+' : ''} {variantCount === 1 ? 'variant' : 'variants'}
                </s-text>
              )}
              {variantCount > 1 && (
                <s-icon
                  type={expandedId === product.id ? 'chevron-up' : 'chevron-down'}
                  size='small'
                />
              )}
            </s-grid>
          </s-clickable>
        </s-grid>

        {expandedId === product.id && <s-box>
          <s-stack padding='base' gap='small'>
            {
              selectedProductVariantsData?.variants?.map((variant: Record<string, any>) => {
                const variantId = variant.id.toString();

                return (
                  <s-checkbox
                    key={variant.id}
                    checked={localValue.includes(variantId)}
                    onChange={(e: Event) => {
                      const isChecked = (e.target as HTMLInputElement).checked;
                      handleVariantCheckboxChange(variantId, isChecked);
                    }}
                    label={variant.variantTitle}
                  />
                );
              })
            }
            {
              selectedProductVariantsData?.hasNextPage && (
                <s-clickable 
                  disabled={isLoadingVariants}
                  onClick={handleLoadMoreVariants}
                >
                  {isLoadingVariants ? (
                    <s-stack direction='inline' gap='small' alignItems='center'>
                      <s-spinner />
                    </s-stack>
                  ) : (
                    <s-text tone='custom'>{contents.load_more}</s-text>
                  )}
                </s-clickable>
              )
            }
          </s-stack>
        </s-box>}
        {index !== usedProductsData?.products?.length - 1 && <s-divider />}
      </s-stack>
    );
  }), [
    usedProductsData,
    location?.id,
    isLoadingProducts,
    isLoadingVariants,
    expandedId,
    selectedProductVariantsData,
    localValue,
    getProductSelectionState,
    handleProductCheckboxChange,
    handleVariantCheckboxChange,
    getProductVariants,
    getAllVariantsForProduct,
    getVariantsDataForProduct,
    contents,
    handleLoadMoreVariants,
  ]);

  const resourceItemsLoadMore = useMemo(() => {
    if (isLoadingProducts) {
      return (
        <s-grid
          minBlockSize='50px'
          alignItems='center'
          justifyContent='center'
        >
          <s-spinner />
        </s-grid>
      )
    }

    if (usedProductsData?.hasNextPage) {
      return (
        <s-stack direction='block'>
          <s-divider />
          <s-clickable onClick={() => getProducts(searchValue)} disabled={isLoadingProducts}>
            <LayoutCenter customAttributes={{ blockSize: '50px' }}>
              <s-text tone='custom'>
                {contents.load_more}
              </s-text>
            </LayoutCenter>
          </s-clickable>
        </s-stack>
      )
    }

    return null;
  }, [
    usedProductsData,
    isLoadingProducts,
    searchValue,
    getProducts,
  ]);

  const modal = useMemo(() => (
    <s-modal
      ref={modalRef}
      id={MODAL_ID}
      size='large'
      padding='none'
      onShow={modalOnOpen}
      onHide={modalOnClose}
      heading={contents.variant_picker_modal_title}
    >
      <s-button
        slot='primary-action'
        variant='primary'
        onClick={save}
      >
        {localValue.length > 0 ? `${contents.add} (${localValue.length})` : contents.add}
      </s-button>

      <s-button
        slot='secondary-actions'
        commandFor={MODAL_ID}
        command='--hide'
        variant="secondary"
      >
        {contents.cancel}
      </s-button>
      <s-stack direction='block' gap="none">
        <s-box padding="base">
          <s-text-field
            label={contents.variant_picker_search_label}
            value={searchValue}
            onChange={e => debouncedUpdateSearchProduct((e.target as HTMLInputElement).value)}
          />
        </s-box>

        <s-scroll-box
          blockSize='500px'
          padding='none'
        >
          <s-box inlineSize='98%'>
            {usedProductsData?.products?.length || isLoadingProducts || debounced ? (
              <s-stack rowGap='none'>
                {resourceItems}
                {resourceItemsLoadMore}
              </s-stack>
            ) : (
              <s-box padding='base'>
                <s-stack direction='inline' justifyContent='center'>
                  <s-text>{contents.empty_products}</s-text>
                </s-stack>
              </s-box>
            )}
          </s-box>

        </s-scroll-box>
      </s-stack>

    </s-modal>
  ), [
    debouncedUpdateSearchProduct,
    modalOnScrolledToEdge,
    isLoadingProducts,
    resourceItems,
    localValue,
    searchValue,
    debounced,
    resourceItemsLoadMore
  ]);

  if (activator?.type === 'button') {
    return (
      <>
        <s-button
          command='--show'
          commandFor={MODAL_ID}
          variant="secondary"
        >
          <s-stack direction='inline' gap='small'>
            {activator.icon && <s-icon type={activator.icon} tone='custom'></s-icon>}
            <s-text tone='custom'>{activator.content}</s-text>
          </s-stack>
        </s-button>
        {modal}
      </>);
  }

  return (
    <>
      <s-clickable
        command='--show'
        commandFor={MODAL_ID}
      >
        <s-stack direction='inline' gap='small'>
          {activator.icon && <s-icon type={activator.icon} tone='custom'></s-icon>}
          <s-text tone='custom'>{activator.content}</s-text>
        </s-stack>
      </s-clickable>
      {modal}
    </>
  )
}

export default VariantPicker;
