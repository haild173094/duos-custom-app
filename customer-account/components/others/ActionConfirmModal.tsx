
import { ModalElement } from '@shopify/ui-extensions/build/ts/surfaces/customer-account/components/Modal';
import { forwardRef } from 'preact/compat';

type ActionButton = {
  content: string,
  variant?: 'secondary' | 'primary' | 'auto',
  tone?: 'auto' | 'neutral' | 'critical',
  onAction: (inputValue?: string) => void,
};

type Props = {
  id: string,
  heading: string,
  modalContent: string,
  primaryButton: ActionButton,
  secondaryButton?: ActionButton,
  extraContents?: React.ReactNode,
}

const ActionConfirmModal = forwardRef<ModalElement, Props>(({
  id,
  heading,
  modalContent,
  primaryButton,
  secondaryButton,
  extraContents,
}, ref) => {
  return (
    <s-modal
      id={id}
      heading={heading}
      ref={ref}
    >
      <s-button
        slot='primary-action'
        onClick={e => primaryButton.onAction(e.target.value)}
        variant={primaryButton.variant}
        tone={primaryButton.tone}
      >
        {primaryButton.content}
      </s-button>
      <s-button
        slot='secondary-actions'
        onClick={e => secondaryButton.onAction(e.target.value)}
        variant={secondaryButton.variant}
        tone={secondaryButton.tone}
      >
        {secondaryButton.content}
      </s-button>
      <s-stack gap='base'>
        <s-box>{modalContent}</s-box>
        {extraContents}
      </s-stack>
    </s-modal>
  )
});

export default ActionConfirmModal;
