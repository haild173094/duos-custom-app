import { useContext } from 'preact/hooks';
import { createContext } from 'preact';
import { storefrontRequest } from '@app/services/https';
import type { IShop } from '@app/types';

export const ShopContext = createContext<IShop | null>(null);

export const getShop = () => {
  return storefrontRequest({
    query: `{
      shop {
        id
        name
        primaryDomain {
          url
          host
        }
        moneyFormat
      }
    }`,
  }) as Promise<{ shop: IShop }>;
}

export function useShop() {
  const shop = useContext(ShopContext);

  return shop;
}
