import { createContext } from 'preact';
import type { IProductsContext } from '@app/types';

const ProductsContext = createContext<IProductsContext>({
  setProductsData: () => {},
  productsData: null,
});

export default ProductsContext;
