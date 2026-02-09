import { useEffect, useState } from 'preact/hooks';
import { removeShopifyGidPrefix, storefrontRequest } from '@app/services';
import { IShop } from '@app/types';

export default function useExtesnionShop() {
  const [shop, setShop] = useState<IShop | null>(null);

  const fetchShop = async () => {
    try {
      const { shop } = await storefrontRequest({
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
      });

      if (shop) {
        setShop({
          ...shop,
          id: removeShopifyGidPrefix(shop.id, 'Shop'),
        });
      }
    } catch (error) {
      console.error('Fail to fetch shop', error?.message);
    }
  };

  useEffect(() => {
    fetchShop();
  }, []);
  return { shop };
}
