import { memo } from 'preact/compat';

type Props = {
  id: string,
  title: string,
  modalContent: string,
  contents: Record<string, any>,
  onCancel?: () => void,
  onDelete: () => void,
}

const DeleteConfirmModal: React.FC<Props> = ({ id, title, modalContent, contents, onCancel, onDelete }) => {
  return (
    <s-modal
      id={id}
      heading={title}
      onHide={onCancel}
    >
      <s-button
        slot='primary-action'
        onClick={onDelete}
        tone="critical"
        variant='primary'
      >
        {contents.delete}
      </s-button>
      <s-button
        slot='secondary-actions'
        onClick={onCancel}
        variant="secondary"
      >
        {contents.cancel}
      </s-button>
      <s-text>{modalContent}</s-text>
    </s-modal>
  )
}

export default memo(DeleteConfirmModal);
