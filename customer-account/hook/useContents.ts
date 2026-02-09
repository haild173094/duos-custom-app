import { useMemo, useCallback } from 'preact/hooks';
import { useLanguage } from "@shopify/ui-extensions/customer-account/preact";
import { ExtensionType } from '@app/types/enum';
import { CUSTOMER_ACCOUNT_CONTENTS } from '@customer-account/constants';
import { removeEmpty, isEmptyObj } from '@app/services';

const useContents = (extensionType: ExtensionType, metafieldData: any) => {
  const { isoCode } = useLanguage();

  const getTranslatedData = useCallback((translatedData) => {
    // Iso code is come from BCP 47 language tag, example: 'en', 'en-VN', ...
    const code = isoCode.toLowerCase();
    const data = translatedData[isoCode] || translatedData[code] || translatedData[code.substring(0, 2)];

    return data || {};
  }, [isoCode]);

  const contents = useMemo(() => {
    const defaultData = CUSTOMER_ACCOUNT_CONTENTS[extensionType];

    if (isEmptyObj(metafieldData)) {
      return defaultData;
    }

    const defaultSetting = (metafieldData['default'] || {})[extensionType];
    const translatedData = getTranslatedData(metafieldData)[extensionType];

    return {
      ...defaultData,
      ...removeEmpty(defaultSetting),
      ...removeEmpty(translatedData),
    };
  }, [metafieldData, getTranslatedData])

  return {
    contents,
  } as Record<string, any>;
};

export default useContents;
