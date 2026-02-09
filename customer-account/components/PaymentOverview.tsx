import { useMemo, useState, useEffect, useContext } from 'preact/hooks';
import { useSessionToken } from '@shopify/ui-extensions/customer-account/preact';
import { useMoney, useHttp } from '../hook';
import { formatDate } from '../../services';
import { LocationContext } from '../contexts';
import { FinancialViewMode } from '@app/types';

type PaymentOverviewData = {
  currency: string;
  totalOutstanding: number;
  totalOutstandingOrders: number;
  nextDueAmount: number;
  nextDueDate: string;
  nextDueOrders: number;
  overdueAmount: number;
  overdueOrders: number;
  oldestOverdueDate: string;
};

type BadgeTone = 'critical' | 'info' | 'auto' | 'custom' | 'success' | 'warning';
type ValueTone = 'critical' | 'info' | 'auto' | 'custom' | 'success' | 'warning';

type Metric = {
  key: string;
  title: string;
  value: string;
  badge?: {
    text: string;
    tone?: BadgeTone;
  };
  tone?: ValueTone;
};

export type ApiPaymentOverviewResponse = {
  data: {
    outstanding: {
      amount: number;
      orders_count: number;
      currency: string | null;
    };
    due: {
      amount: number;
      currency: string;
      orders_count: number;
      due_date: string;
      overdue: boolean;
    } | null;
  };
};

const PaymentOverview = ({ 
  contents,
  linkHref,
  selectType,
}: { 
  contents: Record<string, any>, 
  linkHref?: string,
  selectType: FinancialViewMode,
}) => {
  const { formatMoney } = useMoney();
  const sessionToken = useSessionToken();
  const { getPaymentOverview, getMyPaymentOverview } = useHttp(sessionToken.get);
  const location = useContext(LocationContext);
  const [paymentData, setPaymentData] = useState<PaymentOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location?.id) {
      setIsLoading(false);
      return;
    }

    const fetchPaymentOverview = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const fetcher = selectType === FinancialViewMode.Individual ? getMyPaymentOverview : getPaymentOverview;
        const response = await fetcher(location.id) as ApiPaymentOverviewResponse;

        if (!response?.data) return;

        const { outstanding, due } = response.data;
        const currency = outstanding?.currency ?? due?.currency ?? 'USD';
        const isOverdue = Boolean(due?.overdue);

        const mappedData: PaymentOverviewData = {
          currency,
          totalOutstanding: outstanding?.amount ?? 0,
          totalOutstandingOrders: outstanding?.orders_count ?? 0,
          nextDueAmount: due?.amount ?? 0,
          nextDueDate: due?.due_date ?? '',
          nextDueOrders: due?.orders_count ?? 0,
          overdueAmount: isOverdue ? (due?.amount ?? 0) : 0,
          overdueOrders: isOverdue ? (due?.orders_count ?? 0) : 0,
          oldestOverdueDate: isOverdue ? (due?.due_date ?? '') : '',
        };

        setPaymentData(mappedData);
      } catch (err) {
        console.error('Error fetching payment overview:', err);
        setError(contents.failed_to_load_payment_overview);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentOverview();
  }, [location?.id, selectType]);

  const formattedMetrics = useMemo(() => {
    if (!paymentData) return [];

    const { currency } = paymentData;
    const hasOverdue = paymentData.overdueAmount > 0;

    const baseMetrics: Metric[] = [
      createTotalOutstandingMetric(paymentData, currency, contents, formatMoney),
    ];

    const overdueMetrics = hasOverdue
      ? createOverdueMetrics(paymentData, currency, contents, formatMoney)
      : createNextDueMetrics(paymentData, currency, contents, formatMoney);

    return [...baseMetrics, ...overdueMetrics].filter(Boolean);
  }, [formatMoney, paymentData, contents]);

  if (isLoading) {
    return (
      <s-stack direction='block' gap='base'>
        <s-text type='strong'>{contents.payment_overview}</s-text>
        <s-grid gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap='base'>
          {[...Array(3)].map((_, index) => (
            <s-box
              key={index}
              border='base'
              borderRadius='base'
              padding='base'
            >
              <s-skeleton-paragraph />
            </s-box>
          ))}
        </s-grid>
      </s-stack>
    );
  }

  if (error || !paymentData) {
    return (
      <s-stack direction='block' gap='base'>
        <s-text type='strong'>{contents.payment_overview}</s-text>
        <s-box border='base' borderRadius='base' padding='base'>
          <s-text color='subdued'>{error || contents.no_payment_data_available}</s-text>
        </s-box>
      </s-stack>
    );
  }

  return (
    <s-stack direction='block' gap='base'>
      <s-text type='strong'>{contents.payment_overview}</s-text>
      <s-grid gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap='base'>
        {formattedMetrics.map((metric) => (
          <s-box
            key={metric.key}
            border='base'
            borderRadius='base'
            padding='base'
          >
            <s-stack direction='block' gap='small'>
              <s-stack direction='inline' alignItems='center' gap='base'>
                <s-text color='subdued'>{metric.title}</s-text>
                {metric.badge && (
                  <s-badge color='subdued'>
                    <s-text tone={metric.badge.tone}>
                      {metric.badge.text}
                    </s-text>
                  </s-badge>
                )}
              </s-stack>
              <s-text type='strong' tone={metric.tone}>
                {metric.value}
              </s-text>
            </s-stack>
          </s-box>
        ))}
      </s-grid>
      {linkHref && (
        <s-stack direction='inline' justifyContent='end'>
          <s-clickable href={linkHref}>
            <s-text tone='custom'>{contents.view_all_payment_details}</s-text>
          </s-clickable>
        </s-stack>
      )}
    </s-stack>
  );
};

// Helper functions for date validation and formatting
function isValidDate(dateString: string): boolean {
  return Boolean(dateString?.trim() && !isNaN(new Date(dateString).getTime()));
}

function safeFormatDate(dateString: string): string {
  if (!isValidDate(dateString)) return '-';
  try {
    return formatDate(dateString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

function calculateDaysDifference(dateString: string, isPast: boolean = false): number {
  if (!isValidDate(dateString)) return 0;
  
  const now = new Date();
  const targetDate = new Date(dateString);
  const diffInMs = isPast 
    ? now.getTime() - targetDate.getTime()
    : targetDate.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  return Math.max(diffInDays, 0);
}

type MetricConfig = {
  key: string;
  titleKey: string;
  amount: number;
  ordersCount: number;
  currency: string;
  tone?: ValueTone;
  badgeTone?: BadgeTone;
};

type DateMetricConfig = {
  key: string;
  titleKey: string;
  dateString: string;
  daysLabelKey: string;
  tone?: ValueTone;
  badgeTone?: BadgeTone;
  isPast?: boolean;
  fallbackValue?: string;
};

function createAmountMetric(
  config: MetricConfig,
  contents: Record<string, any>,
  formatMoney: (amount: number, currency: string) => string
): Metric {
  return {
    key: config.key,
    title: contents[config.titleKey],
    value: formatMoney(config.amount, config.currency),
    tone: config.tone,
    badge: {
      text: `${config.ordersCount} ${contents.orders}`,
      tone: config.badgeTone ?? 'auto',
    },
  };
}

function createDateMetric(
  config: DateMetricConfig,
  contents: Record<string, any>
): Metric | null {
  if (isValidDate(config.dateString)) {
    return {
      key: config.key,
      title: contents[config.titleKey],
      value: safeFormatDate(config.dateString),
      tone: config.tone,
      badge: {
        text: `${calculateDaysDifference(config.dateString, config.isPast ?? false)} ${contents[config.daysLabelKey]}`,
        tone: (config.badgeTone ?? 'auto') as BadgeTone,
      },
    };
  }
  
  if (config.fallbackValue !== undefined) {
    return {
      key: config.key,
      title: contents[config.titleKey],
      value: config.fallbackValue,
    };
  }
  
  return null;
}

function createTotalOutstandingMetric(
  data: PaymentOverviewData,
  currency: string,
  contents: Record<string, any>,
  formatMoney: (amount: number, currency: string) => string
): Metric {
  return createAmountMetric(
    {
      key: 'totalOutstanding',
      titleKey: 'total_outstanding',
      amount: data.totalOutstanding,
      ordersCount: data.totalOutstandingOrders,
      currency,
      badgeTone: 'auto',
    },
    contents,
    formatMoney
  );
}

function createOverdueMetrics(
  data: PaymentOverviewData,
  currency: string,
  contents: Record<string, any>,
  formatMoney: (amount: number, currency: string) => string
): Metric[] {
  const metrics: Metric[] = [
    createAmountMetric(
      {
        key: 'overdueAmount',
        titleKey: 'overdue_amount',
        amount: data.overdueAmount,
        ordersCount: data.overdueOrders,
        currency,
        tone: 'critical',
        badgeTone: 'critical',
      },
      contents,
      formatMoney
    ),
  ];

  const overdueDateMetric = createDateMetric(
    {
      key: 'oldestOverdueDate',
      titleKey: 'oldest_overdue_date',
      dateString: data.oldestOverdueDate,
      daysLabelKey: 'days_late',
      tone: 'critical',
      badgeTone: 'critical',
      isPast: true,
    },
    contents
  );

  return overdueDateMetric ? [...metrics, overdueDateMetric] : metrics;
}

function createNextDueMetrics(
  data: PaymentOverviewData,
  currency: string,
  contents: Record<string, any>,
  formatMoney: (amount: number, currency: string) => string
): Metric[] {
  const metrics: Metric[] = [
    createAmountMetric(
      {
        key: 'nextDueAmount',
        titleKey: 'next_due_amount',
        amount: data.nextDueAmount,
        ordersCount: data.nextDueOrders,
        currency,
        badgeTone: 'auto',
      },
      contents,
      formatMoney
    ),
  ];

  const nextDueDateMetric = createDateMetric(
    {
      key: 'nextDueDate',
      titleKey: 'next_due_date',
      dateString: data.nextDueDate,
      daysLabelKey: 'days_left',
      badgeTone: 'info',
      fallbackValue: '_',
    },
    contents
  );

  return [...metrics, nextDueDateMetric!];
}

export default PaymentOverview;
