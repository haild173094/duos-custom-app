import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks'
import {
  useLanguage,
  useLocalizationCountry,
  useSessionToken,
} from '@shopify/ui-extensions/customer-account/preact'
import { extractId, formatDate } from '@/services'
import { useCustomer, useShop, LocationContext } from '@/customer-account/contexts';
import { useContents, useHttp } from '@/customer-account/hook';
import { EditMemberModal, InviteMemberModal } from '../components';
import { defaultRoles } from '../config';
import { getDisplayedRoleName } from '../services';
import {
  ExtensionType,
  Roles,
  Permissions,
  TranslationType,
} from '@/types';

export default function CustomerManagement() {
  const shop = useShop();
  const {
    customer,
    loadingCustomer,
  } = useCustomer();
  const sessionToken = useSessionToken();

  const { isoCode: languageCode } = useLanguage();
  const { isoCode: countryCode } = useLocalizationCountry();

  const location = useContext(LocationContext);

  const DEFAULT_QUERY_MEMBER = {
    first: 10,
  }

  const {
    getCompanyRoles,
    getMemberList,
    getListRoles,
    deleteMember,
    getTranslationData,
    getMemberAdminCount,
  } = useHttp(sessionToken.get);

  const [metaFieldContents, setMetaFieldContent] = useState({});

  const { contents } = useContents(ExtensionType.CustomerPermission, metaFieldContents);

  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [shopifyRoles, setShopifyRoles] = useState([]);
  const [listRole, setListRole] = useState([]);
  const [pageInfo, setPageInfo] = useState<any>({});
  const [isCollectingContents, setIsCollectingContents] = useState(true);
  const [adminRolesCount, setAdminRolesCount] = useState<number>(0);

  const isAdmin = useMemo(() => {
    if (customer?.currentRole) {
      return customer.currentRole === Roles.Admin;
    }

    return false;
  }, [customer?.currentRole]);

  const isEditMember = useMemo(() => {
    if (customer?.permissions) {
      const isAvailable = (customer.permissions.includes(Permissions.WriteMembers) && customer.permissions.includes(Permissions.ReadRoles)) || isAdmin;

      return isAvailable;
    }

    return false;
  }, [customer?.permissions]);

  const isReadRolesAllow = useMemo(() => {
    if (customer?.permissions) {
      return customer.permissions.includes(Permissions.ReadRoles);
    }

    return false;
  }, [customer?.permissions]);

  const isEnableReadMembers = useMemo(() => {
    if (isAdmin) {
      return true;
    }

    if (customer?.permissions) {
      return customer.permissions.includes(Permissions.ReadMembers);
    }

    return false
  }, [isAdmin, customer?.permissions]);

  const primaryAction = useMemo(() => {
    return (
      <>
        <s-button
          slot="secondary-actions"
          disabled={!isReadRolesAllow}
          href="/customer-permission/role"
        >Role manage</s-button>
      </>
    );
  }, [isReadRolesAllow, contents]);

  const getRoles = useCallback(async () => {
    if (!location?.id) return;

    getListRoles(location.id, { limit: 50 }).then(res => {
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

      // Final array
      const mergedRoles = [...merged, ...additionalRoles];

      const finalRoles = mergedRoles.map(item => {
        return {
          value: item.id || `unassigned_${item.name}`,
          permissions: item.permissions || [],
          label: getDisplayedRoleName(item.name, contents),
        };
      })

      if (finalRoles.length) {
        setListRole(finalRoles);
      }
    });
  }, [location?.id, contents]);

  const getMembers = useCallback(async (pageInfo?: Record<string, any>) => {
    if (!location?.id) return;

    try {
      setLoadingMembers(true);

      await getMemberList(location.id, pageInfo).then((res: any) => {
        if (res?.data?.length) {
          setMembers(res.data);
        }
        if (res?.meta) {
          setPageInfo(res.meta);
        }
      });

      const count = await getMemberAdminCount(location.id, pageInfo);

      if (count && typeof count.admin_count === 'number') {
        setAdminRolesCount(count.admin_count);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setPageInfo({});
    } finally {
      setLoadingMembers(false);

    }
  }, [location?.id]);

  useEffect(() => {
    if (isEditMember) {
      getRoles();
    }

    if (isEnableReadMembers) {
      getMembers(DEFAULT_QUERY_MEMBER);
    } else {
      setLoadingMembers(false);
    }
  }, [isEnableReadMembers, isEditMember, getRoles, getMembers]);

  useEffect(() => {
    if (!customer || !customer?.companyId) {
      return;
    }

    async function fetchCompanyRole() {
      const roles = await getCompanyRoles(customer.companyId);

      if (roles && roles.length > 0) {
        setShopifyRoles(roles);
      }
    }

    fetchCompanyRole();
  }, [customer?.companyId]);

  useEffect(() => {
    if (!shop?.id) return;

    const collectContents = async () => {
      try {
        setIsCollectingContents(true);

        const contentsData = await getTranslationData({
          type: TranslationType.CustomerPermission,
          shopId: extractId(shop.id),
        });

        setMetaFieldContent(contentsData?.data);
      } finally {
        setIsCollectingContents(false);
      }
    }

    collectContents();
  }, [shop]);


  const isDisableDelete = useCallback((member): boolean => {
    // Disable if member is admin and at least 1 admin in company
    if (member.system_role.name === Roles.Admin) {
      return adminRolesCount <= 1;
    }

    return false
  }, [adminRolesCount]);

  const getMemberName = useCallback((member: Record<string, any>) => {
    if (!customer?.customerId || !member.company_contact?.customer?.id) {
      return '';
    }

    // Find current member by customerId
    if (customer.customerId === member.company_contact.customer.id) {
      return `${member.company_contact.customer?.display_name} (You)`;
    }

    return member.company_contact.customer?.display_name;
  }, [customer?.customerId]);

  const handlePreviousPage = useCallback(() => {
    const prevQuery = {
      last: 10,
      before: pageInfo.start_cursor,
    }

    getMembers(prevQuery);
  }, [getMembers, pageInfo]);

  const handleNextPage = useCallback(() => {
    const nextQuery = {
      first: 10,
      after: pageInfo.end_cursor,
    };

    getMembers(nextQuery);
  }, [getMembers, pageInfo]);

  const handleDeleteMember = useCallback(async (memberId: string) => {
    if (!location?.id) return;

    try {
      setIsDeletingMember(true);

      await deleteMember(location.id, memberId);

      setIsDeletingMember(false);

      if (isEnableReadMembers) {
        await getMembers(DEFAULT_QUERY_MEMBER);
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      setIsDeletingMember(false);
    }
  }, [isEnableReadMembers, location?.id, getMembers]);

  if (isCollectingContents) {
    return null;
  }

  return (
    <s-page
      heading={contents.page_members_title}
      subheading={contents.page_members_subtitle}
    >
      {primaryAction}
      <s-section>
        <s-stack direction="block">
          <s-stack direction="inline" justifyContent='end' alignItems={'center'} padding="base none" gap="small">
            <s-clickable
              disabled={!isEditMember}
              command='--show'
              commandFor="invite-member-modal"
            >
              <s-stack direction='inline'>
                <s-icon type={'plus'} tone={'custom'}/>
                <s-text tone={'custom'}>{contents.invite_member}</s-text>
              </s-stack>
            </s-clickable>
            <InviteMemberModal
              listRole={listRole}
              refreshMemberList={() => getMembers(DEFAULT_QUERY_MEMBER)}
              refreshListRoles={getRoles}
              shopifyRoles={shopifyRoles}
              contents={contents}
            />
          </s-stack>
          <s-stack direction='block' gap="none">
            <s-divider/>
            <s-grid
              gridTemplateColumns="auto 15% 20% 15% 5% 15% 10%"
              padding={'large base'}
            >
              <s-text color={'subdued'}>{contents.name}</s-text>
              <s-text color={'subdued'}>{contents.phone}</s-text>
              <s-text color={'subdued'}>{contents.email}</s-text>
              <s-text color={'subdued'}>{contents.role}</s-text>
              <s-text color={'subdued'}>{contents.status}</s-text>
              <s-stack direction='inline' justifyContent='center'>
                <s-text color={'subdued'}>{contents.last_update}</s-text>
              </s-stack>
              <s-stack direction='inline' justifyContent='center'>
                <s-text color={'subdued'}>{contents.action}</s-text>
              </s-stack>
            </s-grid>
            <s-divider/>
          <s-box>
            {
              (loadingMembers || loadingCustomer || !customer) ? (
                <s-stack direction='block' padding={'base'} alignItems={'center'} justifyContent={'center'}>
                  <s-spinner></s-spinner>
                </s-stack>
              ) :
              !isEnableReadMembers ? (
                <s-stack direction='block' padding={'base'} alignItems={'center'} justifyContent={'center'}>
                  <s-text color={'subdued'}>{contents.no_permission_view_members}</s-text>
                </s-stack>
              ) :
              (members.length ?
                members.map(member => {
                  return (
                    <s-grid
                      key={member.company_contact.customer.id}
                      gridTemplateColumns="auto 15% 20% 15% 5% 15% 10%"
                      padding={'base'}
                    >
                      <s-stack direction='inline' alignItems="center">
                        <s-text tone={'custom'}>{getMemberName(member)}</s-text>
                      </s-stack>
                      <s-text>{member.company_contact.customer.default_phone_number?.phone_number}</s-text>
                      <s-text>{member.company_contact.customer?.default_email_address?.email_address}</s-text>
                      <s-box>
                        <s-badge>{getDisplayedRoleName(member.system_role.name || 'member', contents)}</s-badge>
                      </s-box>
                      <s-box>
                        <s-badge color={'subdued'}>Active</s-badge>
                      </s-box>
                      <s-stack direction='inline' justifyContent='center'>
                        <s-text>{formatDate(member.company_contact.customer?.created_at)}</s-text>
                      </s-stack>
                      <s-stack direction='inline' gap="small" justifyContent='center'>
                        <s-clickable
                          command="--show"
                          commandFor="edit-member-modal"
                          onClick={() => setSelectedMember(member)}
                        >
                          <s-text tone="custom">{contents.edit}</s-text>
                        </s-clickable>
                        <EditMemberModal
                          listRole={listRole}
                          member={selectedMember}
                          refreshMemberList={() => getMembers(DEFAULT_QUERY_MEMBER)}
                          shopifyRoles={shopifyRoles}
                          refreshListRoles={getRoles}
                          contents={contents}
                        />
                        <s-clickable
                          disabled={isDisableDelete(member)}
                          command='--show'
                          commandFor={`delete-member-${member.company_contact.customer.id}`}
                        >
                          <s-text tone="critical">{contents.delete}</s-text>
                        </s-clickable>
                        <s-modal
                          id={`delete-member-${member.company_contact.customer.id}`}
                          padding="base"
                          heading="Are you sure?"
                        >
                          <s-button
                            slot="primary-action"
                            tone="critical"
                            variant="primary"
                            loading={isDeletingMember}
                            onClick={() => handleDeleteMember(member.company_contact.customer?.id)}
                          >
                            {contents.delete}
                          </s-button>
                          <s-button
                            slot="secondary-actions"
                            variant="secondary"
                            command='--hide'
                            commandFor={`delete-member-${member.company_contact.customer.id}`}
                          >
                            {contents.cancel}
                            </s-button>
                            <s-text>{`Are you sure want to delete "${getMemberName(member)}"`}</s-text>
                          </s-modal>
                        </s-stack>
                    </s-grid>
                  );
                })
                :
                null
              )
            }
          </s-box>
          {
            pageInfo && (pageInfo?.has_next_page || pageInfo.has_previous_page) && (
              <s-stack direction="inline" alignItems={'center'} padding="base none none none" justifyContent='center' gap="base">
                <>
                  <s-clickable disabled={!pageInfo.has_previous_page || loadingMembers} onClick={() => handlePreviousPage()}>
                    <s-icon type="chevron-left" tone="custom"></s-icon>
                  </s-clickable>
                  <s-clickable disabled={!pageInfo.has_next_page || loadingMembers} onClick={() => handleNextPage()}>
                    <s-icon type="chevron-right" tone="custom"></s-icon>
                  </s-clickable>
                </>
              </s-stack>
            )
          }
          </s-stack>
        </s-stack>
      </s-section>
    </s-page>
  );
};
