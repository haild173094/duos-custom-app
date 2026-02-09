import { useContext } from 'preact/hooks';
import { createContext } from 'preact';
import type { IAppContext } from '@app/types';

export const AppContext = createContext<IAppContext | null>(null);

export function useApp() {
  const app = useContext(AppContext);

  return app;
}
