import { useState } from 'preact/hooks';
export default function CsvUploadModal({ title, onOpen = () => {}, onClose = () => {}, onSubmit, onUpload, file, contents, submitError }) {
  const [loadingUploadCsv, setLoadingUploadCsv] = useState<boolean>(false);
  const CSV_UPLOAD_MODAL_ID = 'upload-csv-modal'
  return (
    <>
      <s-button variant={'secondary'} command='--show' commandFor={CSV_UPLOAD_MODAL_ID}>
        {title}
      </s-button>
      <s-modal
        id={CSV_UPLOAD_MODAL_ID}
        heading={contents.upload_csv_modal_title}
        onShow={() => onOpen()}
        onHide={() => onClose()}
      >
      <s-drop-zone
        accept=".csv"
        required
        value={file?.name || ''}
        onInput={(files) => onUpload(files)}
      >
        </s-drop-zone>
        {
          file && file.name ? (
            <s-box padding="small">
              <s-stack direction="inline" alignItems="center">
                <s-text type="strong">{contents.selected_file}:&nbsp;</s-text>
                <s-text>{file.name}</s-text>
                {
                  submitError && (
                    <s-text tone="critical">{submitError}</s-text>
                  )
                }
              </s-stack>
            </s-box>
          ) : null
        }
        <s-button variant={'secondary'} command='--hide' commandFor={CSV_UPLOAD_MODAL_ID} slot="secondary-actions">
          {contents.cancel}
        </s-button>
        <s-button
          variant={'primary'}
          loading={loadingUploadCsv}
          disabled={!file}
          onClick={() => {
            setLoadingUploadCsv(true);
            onSubmit();
            setLoadingUploadCsv(false);
          }}
          slot="primary-action"
        >
          {contents.submit}
        </s-button>
      </s-modal>
    </>
  );
}
