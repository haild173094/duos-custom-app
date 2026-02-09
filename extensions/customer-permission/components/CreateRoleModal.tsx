import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  useSessionToken,
} from "@shopify/ui-extensions/customer-account/preact";
import { useAdminSchema, useJuniorBuyerSchema, useSeniorBuyerSchema } from '../schema';
import { useContents, useHttp } from "@/customer-account/hook";
import { useShop, useCustomer, LocationContext } from '@/customer-account/contexts';
import { DEFAULT_INITIAL_OPEN_DISCLOSURE_LIST } from "../config";
import { getDisplayedRoleName, toDbRoleName } from "../services";
import { ModalElement } from '@shopify/ui-extensions/build/ts/surfaces/customer-account/components/Modal';

const CreateRoleModal = ({ disableEdit, refreshRoleList, contents }) => {
  const CREATE_ROLE_MODAL_ID = 'create-role-modal';

  const sessionToken = useSessionToken();
  const { createRole } = useHttp(sessionToken.get);
  const { customer } = useCustomer();
  const shop = useShop();

  const location = useContext(LocationContext);

  const [roleName, setRoleName] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [step, setStep] = useState(0);
  const [openDisclosureList, setOpenDisclosureList] = useState(DEFAULT_INITIAL_OPEN_DISCLOSURE_LIST);
  const [permissionData, setPermissionData] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<any>([]);
  const createModalRef = useRef<ModalElement | null>(null);

  const { seniorBuyerSettings } = useSeniorBuyerSchema(contents);
  const { juniorBuyerSettings } = useJuniorBuyerSchema(contents);
  const { locationAdminSettings } = useAdminSchema(contents);

  const listRoleOptions = useMemo(() => {
    const defaultRoles = [
      {
        id: null,
        name: 'admin',
        disableEdit: true,
        type: 'default'
      },
      {
        id: null,
        name: 'senior_buyer',
        lastUpdate: 'March 21, 2025',
        type: 'default'
      },
      {
        id: null,
        name: 'junior_buyer',
        lastUpdate: 'March 21, 2025',
        type: 'default',
      }
    ];

    return defaultRoles.map((role) => {
      return {
        label: getDisplayedRoleName(role.name, contents),
        value: role.name,
      }
    });
  }, [contents]);

  const renderedSchema = useMemo(() => {
    switch (selectedRole) {
      case 'admin':
        return locationAdminSettings;
      case 'senior_buyer':
        return seniorBuyerSettings;
      case 'junior_buyer':
        return juniorBuyerSettings;
      default:
        return locationAdminSettings;
    }
  }, [
    selectedRole,
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
      setIsCreating(true);

      const listActiveKey = Object.keys(permissionData).filter((key) => {
        return permissionData[key] === true;
      });

      const requestBody = {
        name: toDbRoleName(roleName, selectedRole),
        permissions: listActiveKey,
      }

      // Create api
      const res = await createRole(location.id, requestBody);

      await refreshRoleList();

      setIsCreating(false);

      createModalRef.current.hideOverlay();

      clearData();
    } catch(error) {
      // handle error
      setErrors([error]);
      setIsCreating(false);
    }
  }, [
    location?.id,
    roleName,
    permissionData,
  ]);

  useEffect(() => {
    if (!customer || !shop) return;

    let defaultPermissionData = {};

    renderedSchema.map((group) => {
      group.fields.map((field) => {
        defaultPermissionData[field.name] = field.defaultValue;
      });
    });

    setPermissionData(defaultPermissionData);
  }, [customer, shop, renderedSchema]);

  useEffect(() => {
    if (step === 1) {
      const newPermissionData = {};

      renderedSchema.map((group) => {
        group.fields.map((field) => {
          newPermissionData[field.name] = field.defaultValue;
        });
      });

      setPermissionData(newPermissionData);
    }
  },[step]);

  const getErrorMessage = (error: any) => {
    const message = error.split(':')[1]?.trim();

    return message || error || 'Something went wrong';
  };

  const clearData = () => {
    setRoleName('');
    setSelectedRole('admin');
    setStep(0);
    setPermissionData({});
    setErrors([]);
  };

  const handleNextStep = useCallback(() => {
    if (!roleName) {
      setErrors([{ message: contents.invite_member_modal_no_role_name }]);
      return;
    }

    setErrors([]);
    setStep(1);
  }, [roleName]);

  return (
    <s-modal
      ref={createModalRef}
      id={CREATE_ROLE_MODAL_ID}
      padding="base"
      heading={contents.create_role_modal_title}
      size="large"
    >
      {
        step === 0
        ? (
          <s-box padding="base none none none">
            <s-grid gridTemplateColumns="50% 50%" gap="base" paddingInlineEnd="base">
              <s-text-field
                label={contents.role_name}
                value={roleName}
                onChange={(e: Event) => { setRoleName(e.target.value); }}
              />
              <s-select
                label={contents.select_base_role}
                value={selectedRole}
                onChange={(e: Event) => { setSelectedRole(e.target.value); }}
              >
                {
                  listRoleOptions.map((option) => (
                    <s-option key={option.value} value={option.value}>
                      {option.label}
                    </s-option>
                  ))
                }
              </s-select>
            </s-grid>
          </s-box>
        )
        :(
          <s-box padding="base none none none">
            {
              renderedSchema?.length && renderedSchema.map((group) => {
                return (
                  <s-stack
                    key={group.id}
                    direction="block"
                    padding="none none base none"
                  >
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
                      <s-details defaultOpen={true} open={openDisclosureList.includes(group.id)} onToggle={(e: Event) => handleToggle(e.target.value)}>
                        <s-box id={group.id} padding="base none none none">
                          {
                            group.fields?.map((field) => {
                              return (
                                <s-box padding="none none base none" key={field.label}>
                                  <s-checkbox
                                    checked={permissionData[field.name]}
                                    disabled={field.disabled ?? (disableEdit || false)}
                                    label={field.label}
                                    onChange={(event: Event) => handleTogglePermission(event.target.checked, field)}
                                  >
                                  </s-checkbox>
                                  {
                                    field.helpText
                                      ? (
                                        <s-box padding="none none none large">
                                          <s-text color="subdued">{field.helpText}</s-text>
                                        </s-box>
                                      )
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
       {/* Errors */}
       {
        errors.length > 0 && (
          <s-stack direction="block" gap={'small'}>
            {errors.map((error, index) => (
              <s-text key={index} tone="critical">{getErrorMessage(error.message)}</s-text>
            ))}
          </s-stack>
        )
      }
      <s-stack direction="inline" justifyContent={'end'} paddingBlockStart="base" gap="small">
        {
          step === 1
            ? (
              <s-button
                variant="secondary"
                onClick={() => { setErrors([]); setStep(0) }}
              >
                {contents.back}
              </s-button>
            ) : (
              <s-button
                variant="secondary"
                command="--hide"
                commandFor={CREATE_ROLE_MODAL_ID}
              >
                {contents.close}
              </s-button>
            )
        }
        {
          step === 0
            ? (
              <s-button variant="primary" onClick={handleNextStep}>{contents.next}</s-button>
            )
            : (
              <s-button variant="primary" loading={isCreating} onClick={handleSavePermission}>{contents.save}</s-button>
            )
        }
      </s-stack>
    </s-modal>
  )
};

export default CreateRoleModal;
