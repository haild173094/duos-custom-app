import { createContext } from 'preact';
import type { IVariantsContext } from '@app/types';

const VariantsContext = createContext<IVariantsContext>({
  setVariantsData: () => {},
  variantsData: null,
});

export default VariantsContext;
