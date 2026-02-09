import { useEffect, useState } from 'preact/hooks';
import { useNavigationCurrentEntry, useSessionToken } from '@shopify/ui-extensions/customer-account/preact';
import ShoppingListMainPage from './ShoppingListMainPage';
import ShoppingListDetailPage from './ShoppingListDetailPage';
import { useShop } from '@/customer-account/contexts';
import { useContents, useHttp } from '@/customer-account/hook';
import { ExtensionType, TranslationType } from '@/types';
import { extractId } from '@/services';

function ShoppingList() {
  const currentEntry = useNavigationCurrentEntry();
  const shop = useShop();
  const sessionToken = useSessionToken();

  const [metaFieldContents, setMetaFieldContent] = useState({});
  const [isCollectingContents, setIsCollectingContents] = useState(true);
  const [viewType, setViewType] = useState<'list' | 'grid'>('list');
  const [id, setId] = useState<number | null>(null);

  const { getTranslationData } = useHttp(sessionToken.get);

  const { contents } = useContents(ExtensionType.ShoppingList, metaFieldContents);

  useEffect(() => {
    if (!shop?.id) return;

    const collectContents = async () => {
      try {
        setIsCollectingContents(true);

        const contentsData = await getTranslationData({
          type: TranslationType.ShoppingList,
          shopId: extractId(shop.id),
        });

        setMetaFieldContent(contentsData?.data);
      } finally {
        setIsCollectingContents(false);
      }
    }

    collectContents();
  }, [shop?.id]);

  const handleRedirect = (currentUrl: string) => {
    const shoppingListDetailPattern = /^extension:\/shopping-list\/(\d+|new)$/;

    const shoppingListDetailsMatch = currentUrl.match(
      shoppingListDetailPattern,
    );

    if (shoppingListDetailsMatch) {
      setId(shoppingListDetailsMatch[1]);
    } else {
      setId(null);
    }
  };

  useEffect(() => {
    handleRedirect(navigation.currentEntry.url);

    navigation.addEventListener('currententrychange', (e) => {
      handleRedirect(e.from.url);
    });
  }, []);

  if (isCollectingContents) {
    return null;
  }

  if (id) {
    return <ShoppingListDetailPage id={parseFloat(id)} contents={contents} />
  }

  return <ShoppingListMainPage
    viewType={viewType}
    setViewType={setViewType}
    contents={contents}
    />
}

export default ShoppingList;
