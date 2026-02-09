import { createContext } from 'preact';
import { QuickOrderContext } from '@app/types';

const QuickOrderContext = createContext<QuickOrderContext>({
  orderList: [],
  setOrderList: () => {},
  currentLocations: [],
});

export default QuickOrderContext;
