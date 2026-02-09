import { useEffect, useState } from 'preact/hooks';
import { useSessionToken } from '@shopify/ui-extensions/customer-account/preact';
import useHttp from './useHttp';

const useSubscription = () => {
  const sessionToken = useSessionToken();
  const { getSubscription } = useHttp(sessionToken.get);

  const [isPaid, setIsPaid] = useState<boolean>(false);

  useEffect(() => {
    const checkSubscription = async () => {
      const plan = await getSubscription();

      setIsPaid(plan.slug && !/free/.test(plan.slug));
    };

    checkSubscription();
  }, []);

  return {
    isPaid,
  }
};

export default useSubscription;
