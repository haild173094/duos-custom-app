import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  useSessionToken,
} from '@shopify/ui-extensions/customer-account/preact';
import { useAdminSchema, useJuniorBuyerSchema, useSeniorBuyerSchema } from '../schema';
import { useHttp } from '@/customer-account/hook';
import { useShop, useCustomer, LocationContext } from '@/customer-account/contexts';
import { DEFAULT_INITIAL_OPEN_DISCLOSURE_LIST } from '../config';
import { getDisplayedRoleName, getRawBaseRole } from '../services';
import { ModalElement } from '@shopify/ui-extensions/build/ts/surfaces/customer-account/components/Modal';

const ManagePermissionModal = ({
  selectedRoleName,
  id,
  disableEdit,
  type,
  refreshRoleList,
  contents
}) => {
  const PERMISSION_MODAL_ID = 'detail-permission';

  const sessionToken = useSessionToken();
  const {
    createRole,
    updateRolePermission,
    getRolePermissionById,
  } = useHttp(sessionToken.get);
  const { customer } = useCustomer();
  const location = useContext(LocationContext);

  const { seniorBuyerSettings } = useSeniorBuyerSchema(contents);
  const { juniorBuyerSettings } = useJuniorBuyerSchema(contents);
  const { locationAdminSettings } = useAdminSchema(contents);

  const shop = useShop();

  const [loadingPermission, setLoadingPermission] = useState(false);
  const [currentPermission, setCurrentPermission] = useState({});
  const [openDisclosureList, setOpenDisclosureList] = useState(DEFAULT_INITIAL_OPEN_DISCLOSURE_LIST);
  const [permissionData, setPermissionData] = useState<any>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const modalRef = useRef<ModalElement | null>(null);

  const renderedSchema = useMemo(() => {
    const baseRole = getRawBaseRole(selectedRoleName)

    switch (baseRole) {
      case 'admin':
        return locationAdminSettings;
      case 'senior_buyer':
        return seniorBuyerSettings;
      case 'junior_buyer':
        return juniorBuyerSettings;
      default:
        return seniorBuyerSettings;
    }
  }, [
    selectedRoleName,
    seniorBuyerSettings,
    juniorBuyerSettings,
    locationAdminSettings,
  ]);

  const handleToggle = useCallback((id: string) => {
    if (openDisclosureList.includes(id)) {
      const newOpenList = openDisclosureList.filter((item) => item !== id);
      setOpenDisclosureList(newOpenList);
    } else {
      setOpenDisclosureList([...openDisclosureList, id]);
    }
  }, [openDisclosureList, setOpenDisclosureList]);

  const handleTogglePermission = (value: boolean, field: any) => {
    if (field.control && field.control.length && value) {
      const newPermissionData = { ...permissionData };

      field.control.map((control: any) => {
        newPermissionData[control] = value;
      });

      setPermissionData({
        ...newPermissionData,
        [field.name]: value,
      });

      return;
    }

    setPermissionData({
      ...permissionData,
      [field.name]: value,
    });
  };

  const handleSavePermission = useCallback(async () => {
    if (!location?.id) return;

    try {
      setIsSaving(true);

      const listActiveKey = Object.keys(permissionData).filter((key) => {
        return permissionData[key] === true;
      });

      const requestBody = {
        name: selectedRoleName,
        permissions: listActiveKey,
      }

      // Edit api
      if (id) {
        const res = await updateRolePermission(location.id, id, requestBody);

        let updatedPermission = {};

        renderedSchema.map((group) => {
          group.fields.map((field) => {
            updatedPermission[field.name] = res.permissions?.includes(field.name) || false;
          });
        });

        setPermissionData(updatedPermission);
        setCurrentPermission(updatedPermission);

        await refreshRoleList();

        // ui.overlay.close(PERMISSION_MODAL_ID);
        modalRef.current?.hideOverlay();

        return;
      }

      // Create api
      const res = await createRole(location.id, requestBody);

      let updatedPermission = {};

      renderedSchema.map((group) => {
        group.fields.map((field) => {
          updatedPermission[field.name] = res.permissions.includes(field.name) || false;
        });
      });

      setPermissionData(updatedPermission);
      setCurrentPermission(updatedPermission);

      await refreshRoleList();

      modalRef.current.hideOverlay();
    } catch {
      // handle error
      console.log('Error when save permission');
    } finally {
      setIsSaving(false);
    }
  }, [
    location?.id,
    selectedRoleName,
    permissionData,
    refreshRoleList,
  ]);

  const handleOnOpenModal = useCallback(async () => {
    if (!customer || !shop) return;

    try {
      setLoadingPermission(true);

      if (!id) {
        let defaultPermissionData = {};

        renderedSchema.map((group) => {
          group.fields.map((field) => {
            defaultPermissionData[field.name] = field.defaultValue;
          });
        });

        setPermissionData(defaultPermissionData);
        setCurrentPermission(defaultPermissionData);

        setLoadingPermission(false);

        return;
      }

      const res = await getRolePermissionById(location?.id, id)

      if (res && res.data && res.data.permissions.length) {
        let defaultPermissionData = {};

        // if field.name exist in rolePermission then set value to true
        renderedSchema.map((group) => {
          group.fields.map((field) => {
            const listExistingPermissionNames = res.data.permissions.map((permission) => permission.name);
            defaultPermissionData[field.name] = listExistingPermissionNames.includes(field.name) || false;
          });
        });

        setPermissionData(defaultPermissionData);
        setCurrentPermission(defaultPermissionData);
        setLoadingPermission(false);
      }
    } catch (error) {
      console.error('Error when load permission data', error);
    }
  }, [customer, shop, id, renderedSchema, location?.id]);

  return (
    <s-modal
      ref={modalRef}
      id={PERMISSION_MODAL_ID}
      padding="base"
      heading={`${getDisplayedRoleName(selectedRoleName, contents)}'s ${contents.permissions}`}
      size="large"
      onHide={() => { setPermissionData(currentPermission) }}
      onShow={() => handleOnOpenModal()}
    >
      {
      loadingPermission
        ? (
          <s-stack direction="inline" padding="base none" justifyContent="center" alignItems="center">
            <s-spinner size="large" accessibilityLabel="Loading permission" />
          </s-stack>
        )
        : (
          <s-box padding="base none none none">
            {
              renderedSchema?.length && renderedSchema.map((group) => {
                return (
                  <s-stack direction="block" key={group.id} gap="none">
                    <s-box paddingBlockEnd="base">
                      <s-grid gridTemplateColumns="auto 10%" alignItems={"center"}>
                        <s-text color="subdued">{group.title}</s-text>
                        <s-clickable onClick={() => handleToggle(group.id)}>
                          <s-icon type={
                            openDisclosureList.includes(group.id)
                              ? 'chevron-up'
                              : 'chevron-down'
                          }></s-icon>
                        </s-clickable>
                      </s-grid>
                      <s-details open={openDisclosureList.includes(group.id)} onToggle={(e: Event) => handleToggle((e.target.value))}>
                        <s-box id={group.id} padding="base none none none">
                          {
                            group.fields?.map((field) => {
                              return (
                                <s-box
                                  padding="none none base none"
                                  key={field.label}
                                >
                                  <s-checkbox
                                    checked={permissionData[field.name]}
                                    disabled={field.disabled ?? (disableEdit || false)}
                                    onChange={(e: Event) => handleTogglePermission((e.target as HTMLInputElement).checked, field)}
                                    label={field.label}
                                  >
                                  </s-checkbox>
                                  {
                                    field.helpText
                                      ? (<s-box padding="none none none large"><s-text color="subdued">{field.helpText}</s-text></s-box>)
                                      : null
                                  }
                                </s-box>
                              )
                            })
                          }
                        </s-box>
                      </s-details>
                    </s-box>
                  </s-stack>
                );
              })
            }
          </s-box>
        )
      }
      <s-stack direction="inline" justifyContent={'end'}>
        <s-button loading={isSaving} onClick={handleSavePermission} disabled={type === 'default'}>{contents.save}</s-button>
      </s-stack>
    </s-modal>
  )
};

export default ManagePermissionModal;
