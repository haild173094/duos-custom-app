import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  useSessionToken,
} from '@shopify/ui-extensions/customer-account/preact';
import { useShop, useCustomer, useApp, LocationContext } from '@/customer-account/contexts';
import { useContents, useHttp } from '@/customer-account/hook'
import { ManagePermissionModal, CreateRoleModal } from '../components';
import {
  getDisplayedRoleName,
  getDisplayedRoleNameWithoutBaseRole,
  toDbRoleName,
  getRawBaseRole,
} from '../services';
import { ExtensionType, TranslationType } from '@/types';
import { ICompanyLocation } from '@/types';
import { ModalElement } from '@shopify/ui-extensions/build/ts/surfaces/customer-account/components/Modal';

function RoleManage() {
  const shop = useShop();
  const {
    customer,
    updateCustomer,
    loadingCustomer,
  } = useCustomer();
  const sessionToken = useSessionToken();
  const {
    getListRoles,
    deleteRole,
    updateRolePermission,
    getTranslationData
  } = useHttp(sessionToken.get);
  const app = useApp();
  const location = useContext(LocationContext);

  const [isCollectContents, setIsCollectContents] = useState(true);
  const [metaFieldContents, setMetaFieldContent] = useState({});
  const { contents } = useContents(ExtensionType.CustomerPermission, metaFieldContents);

  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Record<string, any>>({ name: 'admin' });
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [listRole, setListRole] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    next: null,
    prev: null
  });
  const deleteRoleModalRef = useRef<ModalElement | null>(null);

  const defaultRoles = [
    {
      id: null,
      name: 'admin',
      memberCount: 1,
      lastUpdate: 'March 21, 2025',
      disableEdit: true,
      type: 'default'
    },
    {
      id: null,
      name: 'senior_buyer',
      memberCount: 3,
      lastUpdate: 'March 21, 2025',
      disableEdit: true,
      type: 'default'
    },
    {
      id: null,
      name: 'junior_buyer',
      memberCount: 10,
      disableEdit: true,
      lastUpdate: 'March 21, 2025',
      type: 'default',
    }
  ];

  const selectedRoleData = useMemo(() => defaultRoles.find((role) => role.name === selectedRole?.name), [selectedRole?.name]);

  const isAdmin = useMemo(() => customer && customer.currentRole && customer.currentRole === 'admin', [customer]);

  const isEnableReadRoles = useMemo(() => {
    if (loadingCustomer) {
      return false;
    }

    if (customer && customer.permissions) {
      return customer.permissions.includes('read_roles') || isAdmin;
    }

    return false
  }, [customer.permissions, loadingCustomer]);

  const isEditRoles = useMemo(() => {
    if (loadingCustomer) {
      return false;
    }

    if (customer && customer.permissions) {
      return customer.permissions.includes('write_roles') || isAdmin;
    }

    return false
  }, [customer.permissions, loadingCustomer]);

  const updateCustomerLocation = (newLocation: ICompanyLocation) => {
    updateCustomer((prev: any) => ({
      ...prev,
      selectedLocation: newLocation,
    }));
  };

  const getRoles = useCallback(async (pageInfo?: any) => {
    if (!location?.id) return;

    try {
      setLoadingRoles(true);

      const res = await getListRoles(location.id, pageInfo);

      setPageInfo(res.links);

      // Merge by name
      const merged = defaultRoles.map(role => {
        const match = res.data?.find(apiRole => apiRole.name === role.name);
        return {
          ...role,
          ...match
        };
      });

      // Find new roles from API that aren't in defaultRoles
      const additionalRoles = res.data?.filter(apiRole =>
        !defaultRoles.find(role => role.name === apiRole.name)
      );

      let finalRoles = [];

      // Final array show default roles only in first page
      if (!res.links?.prev) {
        finalRoles = [...merged, ...additionalRoles];
      } else {
        finalRoles = res.data;
      }

      setListRole(finalRoles);

      setLoadingRoles(false);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setLoadingRoles(false);
    }
  }, [
    location?.id,
  ]);

  useEffect(() => {
    if (!isEnableReadRoles || loadingCustomer) {
      return;
    }

    getRoles();
  }, [isEnableReadRoles, loadingCustomer, getRoles]);

  useEffect(() => {
    if (!shop?.id) return;

    const collectContents = async () => {
      try {
        setIsCollectContents(true);
        const contentsData = await getTranslationData({
          type: TranslationType.CustomerPermission,
          shopId: shop.id,
        });

        setMetaFieldContent(contentsData?.data);
      } finally {
        setIsCollectContents(false);
      }
    }

    collectContents();
  }, [shop]);

  const handleDeleteRole = useCallback((id: string) => async () => {
    try {
      setIsDeletingRole(true);

      await deleteRole(location.id, id);

      await getRoles();

      setIsDeletingRole(false);

      deleteRoleModalRef.current?.hideOverlay();
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  }, [
    location?.id,
    getRoles,
  ]);

  const handleUpdateRole = useCallback((role: any) => async () => {
    if (!location?.id) return;

    const body = {
      name: role.name,
      permissions: role.permissions,
    }

    await updateRolePermission(location.id, role.id, body);

    await getRoles();
  }, [location?.id, getRoles]);

  const handlePreviousPage = useCallback(() => {
    const match = pageInfo.prev?.match(/[\?&]page=(\d+)/);
    const page = match ? match[1] : null;

    const prevQuery = {
      page
    }

    getRoles(prevQuery);
  }, [getRoles, pageInfo]);

  const handleNextPage = useCallback(() => {
    const match = pageInfo.next?.match(/[\?&]page=(\d+)/);
    const page = match ? match[1] : null;

    const nextQuery = {
      page,
    };

    getRoles(nextQuery);
  }, [getRoles, pageInfo]);

  return (
    <s-page
      heading={contents.member_role}
      subheading={contents.page_subtitle}
    >
      <s-button slot="breadcrumb-actions" href="/" />
      <s-button
        disabled={!isEditRoles}
        slot="secondary-actions"
        command="--show"
        commandFor="create-role-modal"
      >{contents.create_role}</s-button>
      <CreateRoleModal
        disableEdit={false}
        refreshRoleList={getRoles}
        contents={contents}
      />
      <s-section>
        <s-stack direction="block">
          <s-grid
            padding={'base'}
            gridTemplateColumns="55% 30% 15%"
            justifyContent={'center'}
            alignItems={'start'}
          >
            <s-text color={'subdued'}>{contents.name}</s-text>
            <s-text color={'subdued'}>{contents.type}</s-text>
            <s-text color={'subdued'}>{contents.action}</s-text>
          </s-grid>
          {
            loadingRoles || loadingCustomer
              ? (
                <s-stack direction="inline" padding={'base'} justifyContent={'center'} alignItems={'center'}>
                  <s-spinner size="large" accessibilityLabel="Loading roles" />
                </s-stack>
              )
              : (
                !isEnableReadRoles ? (
                  <s-stack direction="inline" padding={'base'} justifyContent={'center'} alignItems={'center'}>
                    <s-text>{contents.no_permission_view_roles}</s-text>
                  </s-stack>
                ) :
                  listRole.map((role) => (
                    <s-grid
                      padding={'base'}
                      gridTemplateColumns="55% 30% 15%"
                      justifyContent={'center'}
                      alignItems={'start'}
                      key={role.name}
                    >
                      <s-stack direction="inline" gap="small">
                        <s-text tone="custom">{getDisplayedRoleName(role.name, contents)}</s-text>
                        {
                          role.type !== 'default' && (
                            <>
                              <s-clickable commandFor="edit-role-name-popover" command="--toggle">
                                <s-icon type="edit" tone="custom"/>
                              </s-clickable>
                              <s-popover id="edit-role-name-popover">
                                <s-box
                                  maxInlineSize="300px"
                                  padding="base"
                                >
                                  <s-grid gridTemplateColumns="75% 25%" gap="small-200">
                                    <s-text-field
                                      label="Edit role name"
                                      value={getDisplayedRoleNameWithoutBaseRole(role.name)}
                                      onChange={(e: Event) => role.name = toDbRoleName(e.target.value, getRawBaseRole(role.name))}
                                    />
                                    <s-button
                                      onClick={handleUpdateRole(role)}
                                    >{contents.save}</s-button>
                                  </s-grid>
                                </s-box>
                              </s-popover>
                            </>
                          )
                        }
                      </s-stack>
                      <s-text>{getDisplayedRoleName(role.type || 'custom', contents)}</s-text>
                      <s-stack direction="inline" justifyContent={'start'} gap="small-100">
                        <s-clickable
                          onClick={() => setSelectedRole(role)}
                          disabled={role.type === 'default' ? false : !isEditRoles}
                          command="--show"
                          commandFor="detail-permission"
                        >
                          <s-text tone="custom">{role.type === 'default' ? contents.view : contents.edit}</s-text>
                        </s-clickable>
                        <ManagePermissionModal
                          disableEdit={selectedRole?.disableEdit}
                          selectedRoleName={selectedRole.name}
                          id={selectedRole.id}
                          type={'custom'}
                          refreshRoleList={getRoles}
                          contents={contents}
                        />
                        {
                          role.type !== 'default' && (
                            <>
                              <s-clickable
                                disabled={!isEditRoles}
                                onClick={() => setSelectedRole(role)}
                                command="--show"
                                commandFor="delete-role"
                              >
                                <s-text tone="critical">{contents.delete}</s-text>
                              </s-clickable>
                              <s-modal
                                ref={deleteRoleModalRef}
                                id="delete-role"
                                padding="base"
                                heading="Are you sure?"
                              >
                                <s-button
                                  slot="primary-action"
                                  tone="critical"
                                  loading={isDeletingRole}
                                  onClick={handleDeleteRole(selectedRole.id)}
                                >
                                  {contents.delete}
                                </s-button>
                                <s-button
                                  variant="secondary"
                                  slot="secondary-actions"
                                  command="--hide"
                                  commandFor="delete-role"
                                >
                                  {contents.cancel}
                                </s-button>
                                <s-text>{`${contents.delete_member_modal_content} "${getDisplayedRoleName(role.name, contents)}"`}</s-text>
                              </s-modal>
                            </>
                          )
                        }
                      </s-stack>
                    </s-grid>
                  ))
              )
          }
          {
            pageInfo && (pageInfo?.next || pageInfo.prev) && (
              <s-stack direction="inline" justifyContent={'center'} padding="base none" gap="base">
                <s-clickable disabled={!pageInfo.prev} onClick={() => handlePreviousPage()}>
                  <s-icon type="chevron-left" tone="custom"></s-icon>
                </s-clickable>
                <s-clickable disabled={!pageInfo.next} onClick={() => handleNextPage()}>
                  <s-icon type="chevron-right" tone="custom"></s-icon>
                </s-clickable>
              </s-stack>
            )
          }
        </s-stack>
      </s-section>
    </s-page>
  );
}

export default RoleManage;
