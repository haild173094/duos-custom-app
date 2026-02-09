import { useEffect, useState, useCallback, useImperativeHandle, useContext, useMemo, useRef } from 'preact/hooks';
import { forwardRef, memo } from 'preact/compat';
import {
  useSessionToken,
  useLocalizationCountry,
} from '@shopify/ui-extensions/customer-account/preact';
import CsvUploadModal from './CsvUploadModal';
import {
  convertCsvToArray,
  convertCsvArrayToLineItems,
  validateCsv,
  validateLineItems,
  translateErrorsText,
} from '@/services';
import { useShop, LocationContext } from '@/customer-account/contexts';
import { useHttp } from '@/customer-account/hook';
import { CsvPollingStatus } from '@/types/enum';

type DISPLAY_TYPE = 'row' | 'column';

type Props = {
  modelValue: Record<string, any>[],
  setModelValue: (value: Record<string, any>[]) => void,
  processingCsvData?: boolean,
  setProcessingCsvData?: Function,
  errors?: any[],
  setErrors?: Function,
  displayType?: DISPLAY_TYPE,
  contents: Record<string, string>,
}

export type CsvUploaderRefs = {
  setDownloadUrl: (value: string) => void,
  removeCsv: () => void,
}

const CsvUploader = forwardRef<CsvUploaderRefs, Props>(({
  modelValue,
  setModelValue,
  processingCsvData = false,
  errors = [],
  setProcessingCsvData = () => {},
  setErrors = () => {},
  displayType = 'row',
  contents
}, ref) => {
  const shop = useShop();
  const location = useContext(LocationContext);
  const sessionToken = useSessionToken();
  const { isoCode: countryCode } = useLocalizationCountry();

  const { downloadCatalog, exportCatalog, getProductVariantByIds } = useHttp(sessionToken.get);

  const [file, setFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string>('');
  const [isDownloadingCatalog, setIsDownloadingCatalog] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string>('');

  const [isExpandErrors, setIsExpandErrors] = useState<boolean>(false);
  const [realVariantData, setRealVariantData] = useState<Record<string, any>[]>([])

  const pollingRef = useRef(null);

  const runDownload = useCallback(async () => {
    if (!shop?.id || !location?.id) return;

    setDownloadUrl('');

    setIsDownloadingCatalog(true);

    try {
      const shopId = shop.id;
      const locationId = location.id;

      const res = await downloadCatalog(shopId, locationId, countryCode);

      return res.id; // exportId
    } catch (err) {
      console.error("RunDownload error:", err);
      setIsDownloadingCatalog(false);
      return null;
    }
  }, [shop?.id, location?.id, countryCode]);

  const getStatus = useCallback(async (exportId) => {
    try {
      const shopId = shop.id;
      const locationId = location.id;

      return await exportCatalog(exportId, shopId, locationId);
    } catch (err) {
      console.error("GetStatus error:", err);
      return null;
    }
  }, [shop?.id, location?.id]);

  const startPolling = useCallback((exportId) => {
    if (pollingRef.current) return; // double polling avoid

    pollingRef.current = setInterval(async () => {
      const res = await getStatus(exportId);
      if (!res) return;

      // done → stop
      if (res && res.url) {
        setDownloadUrl(res.url);
        setIsDownloadingCatalog(false);
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      if (res.status === CsvPollingStatus.Failed && !res.url) {
        setDownloadError(res.error_message);

        setIsDownloadingCatalog(false);
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 30000); // Retry every 30 seconds
  }, [getStatus]);

  const handleDownloadCatalog = useCallback(async () => {
    setDownloadError('');

    const exportId = await runDownload();
    if (!exportId) return;

    // start polling
    startPolling(exportId);
  }, [runDownload, startPolling]);

  const uploadCsv = (files: any) => {
    const csv = files.currentTarget.files[0];

    if (csv) {
      setFile(csv);
    } else {
      setFile(null);
    }
  };

  const removeCsv = () => {
    setFile(null);
  };

  const getValidatedLineItem = (lineItems: any[], variants: any[]) => {
    const { validatedLineItems, lineItemErrors } = validateLineItems(lineItems, variants);
    const errors = translateErrorsText(lineItemErrors, contents);

    setErrors(errors);
    setModelValue(validatedLineItems);
  };

  useEffect(() => {
    if (!file) {
      setModelValue([]);
      setErrors([]);
      setSubmitError('');
    }
  }, [file]);

  const submitFile = useCallback(() => {
    setSubmitError('');

    if (!shop?.id || !location?.id || !countryCode) return;

    try {
      // ui.overlay.close('upload-csv-modal');
      setProcessingCsvData(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result as string;

        const csvErrors = validateCsv(text);
        if (csvErrors.length) {
          const errors = translateErrorsText(csvErrors, contents);
          setErrors(errors);
          return;
        }
        const csvArray = convertCsvToArray(text);
        const lineItems = convertCsvArrayToLineItems(csvArray);

        if (lineItems.length) {
          const variantIds = lineItems.map(item => item.variantId);

          getProductVariantByIds(variantIds, shop.id, location.id, countryCode)
            .then(data => {
              getValidatedLineItem(lineItems, data);
              setRealVariantData(data);
            }).catch(error => {
              setSubmitError(error.message || 'Failed to fetch product variants');
            });
        }
      };

      reader.readAsText(file);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingCsvData(false);
    }
  }, [location?.id, shop?.id, countryCode, file]);

  useEffect(() => {
    getValidatedLineItem(modelValue, realVariantData);
  }, [modelValue.length, realVariantData]);

  useImperativeHandle(ref, () => ({
    setDownloadUrl,
    removeCsv,
  }));

  const uploadDirectionType = displayType === 'row' ? 'inline' : 'block';

  const downloadButton = useMemo(() => {
    if (downloadUrl) {
      return (
        <s-clickable href={downloadUrl}><s-text tone="custom">{contents.open_catalog}</s-text></s-clickable>
      );
    }

    if (isDownloadingCatalog) {
      return (
        <s-spinner accessibilityLabel={contents.downloading_catalog} size="small" />
      );
    }

    return (
      <s-stack direction="block">
        <s-clickable loading={isDownloadingCatalog} onClick={handleDownloadCatalog}>
          <s-text tone="custom">
            {contents.download_catalog}
          </s-text>
        </s-clickable>
      </s-stack>

    )

  }, [isDownloadingCatalog, downloadUrl, handleDownloadCatalog, contents, downloadError]);

  return (
    <s-stack direction="block" gap="base">
      {
        file
          ?
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-text>{file.name}</s-text>
            <s-clickable onClick={() => {removeCsv()}}>
              <s-icon type="x" />
            </s-clickable>
          </s-stack>
          :
          null
      }
      {
        errors.length
          ?
          <s-banner tone={'critical'}>
            <s-stack direction="inline" justifyContent='space-between' alignItems="center">
              <s-box maxInlineSize='90%'>
                <s-text>{contents.error_title}</s-text>
              </s-box>
              <s-clickable onClick={() => {setIsExpandErrors(!isExpandErrors)}}>
                <s-stack direction="inline" alignItems="center">
                  {
                    isExpandErrors
                      ?
                      <s-icon type="chevron-up"/>
                      :
                      <s-icon type="chevron-down"/>
                  }
                </s-stack>
              </s-clickable>
            </s-stack>
            <>
              {
                isExpandErrors
                ?
                  <s-stack direction="block" gap="small">
                    {
                      errors.map((e, index) => {
                        if (e.errorType === 'lineItem') {
                          return <s-text key={index.toString()}>{`${e.item.productName} ${e.item.variantName === 'Default Title' ? '' : `- ${e.item.variantName}`}: ${e.errorText}`}</s-text>
                        }
                        return <s-text key={index.toString()}>{e.errorText}</s-text>
                      })
                    }
                  </s-stack>
                  :
                  <s-clickable onClick={() => {setIsExpandErrors(true)}}>
                    <s-text color="subdued">{contents.error_show_more}</s-text>
                  </s-clickable>
              }
            </>
          </s-banner>
          :
          null
      }
      {
        !file || !modelValue.length
          ?
          <s-stack direction={uploadDirectionType} alignItems={'center'} gap="base">
            <CsvUploadModal
              title={contents.upload_csv}
              onSubmit={() => submitFile()}
              onUpload={(files: any[]) => uploadCsv(files)}
              file={file}
              contents={contents}
              submitError={submitError}
            />
            { downloadButton }
          </s-stack>
          :
          null
      }
      {
        downloadError && (
          <s-text tone="critical">{downloadError}</s-text>
        )
      }
    </s-stack>
  )
})

export default memo(CsvUploader);
