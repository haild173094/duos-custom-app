import { useLanguage, useLocalizationCountry, useApi } from '@shopify/ui-extensions/customer-account/preact';
import { useCallback, useMemo, useState, useEffect } from 'preact/hooks';
import AppConfig from '../../config/app';

export default function useMoney() {
  const { isoCode: languageCode } = useLanguage();
  const { isoCode: countryCode } = useLocalizationCountry();
  const { query } = useApi();
  const [rate, setRate] = useState<number>(1);

  const localiziedContext = useMemo(
    () => countryCode ? `${languageCode}-${countryCode}` : languageCode, [languageCode, countryCode]
  );

  const formatMoney = useCallback((amount: number | string, currency: string) => {
    return Intl.NumberFormat(languageCode, { style: 'currency', currency })
      .format(+amount);
  }, [languageCode]);

  const formattedLanguageCode = useMemo(() => {
    return languageCode?.indexOf('-') === -1
      ? languageCode
      : languageCode.split('-')[0];
  }, [languageCode]);

  useEffect(() => {
    const getConversionRate = async () => {
      const res = await query(`
        query @inContext(language: ${formattedLanguageCode.toUpperCase()}, country: ${countryCode}) {
          metaobject(handle: {
            type: "${AppConfig.STORE_CURRENCY_CONVERSION_TYPE}",
            handle: "${AppConfig.STORE_CURRENCY_CONVERSION_HANDLE}"
          }) {
            id
            type
            rate: field(key: "${AppConfig.STORE_CURRENCY_CONVERSION_KEY}") {
              value
            }
          }
        }`
      );

      const raw = (res.data as any)?.metaobject?.rate?.value;
      const value = raw ? JSON.parse(raw) : null;

      setRate((parseFloat(value?.amount) || AppConfig.DEFAULT_EXCHANGE_BASE) / AppConfig.DEFAULT_EXCHANGE_BASE);
    };

    getConversionRate();
  }, [
    formattedLanguageCode,
    countryCode,
  ]);

  return {
    formatMoney,
    rate,
  };
}
