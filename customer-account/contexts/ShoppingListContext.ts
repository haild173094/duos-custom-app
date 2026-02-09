import { createContext } from 'preact';
import { IShoppingListDetail, ShoppingListContext } from '@app/types'

const ShoppingListContext = createContext<ShoppingListContext>({
  shoppingList: [],
  setShoppingList: () => {},
  currentLocations: [],
});

export default ShoppingListContext;
