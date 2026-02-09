import { useCallback, useEffect, useState } from 'preact/hooks';
import { memo } from 'preact/compat';
type Props = {
  shoppingList: Record<string, any>,
  setShoppingList: (value: Record<string, any>) => void,
  contents: Record<string, any>
}

const ShoppingListDetailEditModal: React.FC<Props> = ({ shoppingList, setShoppingList, contents }) => {
  const EDIT_MODAL_ID = 'shopping-list-detail-editor';

  const [localValue, setLocalValue] = useState<Record<string, any>>({});
  const [nameInputError, setNameInputError] = useState<string>('');

  const updateLocalValue = (key: string, value: string) => {
    setLocalValue(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  useEffect(() => {
    setLocalValue(shoppingList);
  }, [shoppingList]);

  useEffect(() => {
    if (!localValue.title) {
      setNameInputError(contents.editor_name_empty_error);
    } else {
      setNameInputError('');
    }
  }, [localValue]);

  const onOpen = useCallback(() => {
    setLocalValue(shoppingList);
  }, [shoppingList]);

  const save = useCallback(() => {
    setShoppingList(prev => ({
      ...prev,
      ...localValue,
    }));
  }, [localValue]);

  return (
    <>
      <s-clickable
        command='--show'
        commandFor={EDIT_MODAL_ID}
      >
        <s-icon type="edit" tone="custom"/>
      </s-clickable>
      <s-modal
        id={EDIT_MODAL_ID}
        padding="base"
        heading={contents.editor_title}
        onShow={onOpen}
        key={`${shoppingList.title}-${shoppingList.description}`}
      >
        <s-stack direction='block' gap="base">
          <s-text>{shoppingList.title}</s-text>
          <s-text-field
            label={contents.editor_name_label}
            value={localValue.title}
            onChange={(e) => updateLocalValue('title', e.target.value)}
            error={nameInputError}
          />
          <s-text-field
            label={contents.editor_note_label}
            value={localValue.description}
            onChange={(e) => updateLocalValue('description', e.target.value)}
          />
          <s-stack direction='inline' justifyContent="end" gap="base">
            <s-button
              command='--hide'
              commandFor={EDIT_MODAL_ID}
              variant="secondary"
            >
              <s-text>
                {contents.cancel}
              </s-text>
            </s-button>
            <s-button
              command='--hide'
              commandFor={EDIT_MODAL_ID}
              disabled={Boolean(nameInputError)}
              variant='primary'
              onClick={save}
            >
              <s-text>
                {contents.save}
              </s-text>
            </s-button>
          </s-stack>
        </s-stack>
      </s-modal>
    </>
  )
};

export default memo(ShoppingListDetailEditModal);
