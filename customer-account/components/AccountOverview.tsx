import { useContext, useState, useEffect } from 'preact/hooks';
import { useSessionToken } from '@shopify/ui-extensions/customer-account/preact';
import { useMoney, useHttp } from '../hook';
import { LocationContext } from '../contexts';
import { FinancialViewMode } from '@app/types';

type Props = {
  contents: Record<string, any>,
  selectType: FinancialViewMode,
}

type AccountOverviewData = {
  total_purchased_amount: string;
  total_payments_amount: number;
  currency: string;
  orders_count: {
    count: number | string;
    precision: string;
  };
};

const AccountOverview = ({ contents, selectType }: Props) => {
  const { formatMoney } = useMoney();
  const location = useContext(LocationContext);
  const sessionToken = useSessionToken();
  const { getLocationAccountOverview, getCustomerAccountOverview } = useHttp(sessionToken.get);
  const [accountData, setAccountData] = useState<AccountOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!location?.id) return;

    const fetchAccountOverview = async () => {
      setIsLoading(true);
      try {
        const fetcher = selectType === FinancialViewMode.Individual ? getCustomerAccountOverview : getLocationAccountOverview;
        const data = await fetcher(location.id);
        setAccountData(data);
      } catch (error) {
        console.error('Fail to fetch account overview', error?.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountOverview();
  }, [location?.id, selectType]);

  const StatCard = ({ title, value, isNumber = false }: { title: string, value: number | string, isNumber?: boolean }) => {
    const currency = accountData?.currency || 'USD';
    return (
      <s-box border='base' borderRadius='base' padding='base'>
        <s-stack direction='block' gap='base'>
          <s-text color='subdued'>{title}</s-text>
          <s-text type='strong'>
            {isNumber ? value : formatMoney(value, currency)}
          </s-text>
        </s-stack>
      </s-box>
    )
  }

  if (isLoading) {
    return (
      <s-stack direction='block' gap='base'>
        <s-text type='strong'>{contents.account_overview || 'Account overview'}</s-text>
        <s-grid gridTemplateColumns='1fr 1fr 1fr' gap='base'>
          {Array.from({ length: 3 }).map((_, index) => (
            <s-box key={index} border='base' borderRadius='base' padding='base'>
              <s-skeleton-paragraph />
            </s-box>
          ))}
        </s-grid>
      </s-stack>
    );
  }

  return (
    <s-stack direction='block' gap='base'>
      <s-text type='strong'>{contents.account_overview || 'Account overview'}</s-text>
      <s-grid gridTemplateColumns='1fr 1fr 1fr' gap='base'>
        <StatCard 
          title={contents.total_orders} 
          value={accountData?.orders_count?.count}
          isNumber={true}
        />
        <StatCard 
          title={contents.total_payments} 
          value={accountData?.total_payments_amount}
        />
        <StatCard 
          title={contents.total_purchases} 
          value={accountData?.total_purchased_amount}
        />
      </s-grid>
    </s-stack>
  );
}

export default AccountOverview;
