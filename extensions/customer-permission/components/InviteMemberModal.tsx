import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  useSessionToken,
} from "@shopify/ui-extensions/customer-account/preact";
import { useShop, useCustomer, LocationContext } from '@/customer-account/contexts';
import { useHttp } from "@/customer-account/hook";
import { getShopifyGidPrefix } from "@/services";
import { ModalElement } from '@shopify/ui-extensions/build/ts/surfaces/customer-account/components/Modal';

const InviteMemberModal = ({ listRole, refreshMemberList, shopifyRoles, refreshListRoles, contents }) => {
  type EditData = {
    first_name: string;
    last_name: string;
    email: string;
    role_id?: string;
  }

  const INVITE_MEMBER_MODAL_ID = 'invite-member-modal';
  const defaultEditData = {
    first_name: '',
    last_name: '',
    email: '',
  }

  const sessionToken = useSessionToken();
  const { inviteMember, createRole, } = useHttp(sessionToken.get);
  const { customer } = useCustomer();
  const shop = useShop();

  const location = useContext(LocationContext);

  const [editData, setEditData] = useState<EditData | null>(defaultEditData);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const inviteMemberModalRef = useRef<ModalElement | null>(null);

  const clearData = () => {
    setEditData(defaultEditData);
    setSelectedRole(listRole[0]?.value);
    setErrors([]);
  };

  const roleData = useMemo(() => {
    const currentRole = listRole.find((role) => role.value == selectedRole);

    if (!currentRole) {
      return null;
    }

    let shopifyRoleAssignmentId = '';
    if (currentRole.permissions && shopifyRoles.length > 0) {
      if (currentRole.permissions.includes('view_all_orders')){
        const locationAdminRoleId = shopifyRoles.find((role) => role.name === 'Location admin')?.id;

        shopifyRoleAssignmentId = locationAdminRoleId || '';
      } else {
        const orderingOnlyRoleId = shopifyRoles.find((role) => role.name === 'Ordering only')?.id;

        shopifyRoleAssignmentId = orderingOnlyRoleId || '';
      }
    }

    return {
      role_id: selectedRole,
      shopify_company_contact_role_gid: shopifyRoleAssignmentId,
      shopify_company_gid: getShopifyGidPrefix(customer.companyId, 'Company'),
    }
  }, [listRole, shopifyRoles, selectedRole, customer.companyId]);

  useEffect(() => {
    setSelectedRole(listRole[0]?.value);
  }, [listRole]);

  // assign EditData to member
  useEffect(() => {
    if (!roleData) {
      return;
    }

    setEditData({ ...editData, ...roleData });

  }, [listRole, roleData, selectedRole]);

  const handleInviteMember = useCallback(async () => {
    if (!location?.id || !shop?.id) return;

    try {
      setIsLoading(true);
      setErrors([]);
      // Handle for not exist role in DB
      if (typeof editData.role_id === 'string' && editData?.role_id?.includes('unassigned')) {
        // Create Role
        const roleName = editData.role_id.replace(/^unassigned_/, '');
        const requestBody = {
          name: roleName,
          permissions: listRole.find((role) => role.value === editData.role_id)?.permissions,
        };

        const roleCreated = await createRole(location.id, requestBody);

        // Update Member
        const body = {
          ...editData,
          role_id: roleCreated.data.id,
        };

        await inviteMember(location.id, shop.id, body);

        setIsLoading(false);

        await refreshMemberList();

        await refreshListRoles();

        inviteMemberModalRef.current.hideOverlay();
        clearData();
        return;
      }

      const body = {
        ...editData,
      };

      await inviteMember(location.id, shop.id, body);
      setIsLoading(false);

      await refreshMemberList();

      inviteMemberModalRef.current.hideOverlay();
      clearData();
    } catch (error) {
      console.error('Error inviting member:', error);
      setErrors([error]);
      setIsLoading(false);
    }
  }, [
    location?.id,
    shop?.id,
    editData,
    listRole,
    createRole,
    inviteMember,
    refreshMemberList,
    refreshListRoles,
  ]);

  const handleChangeEditData = (key: string, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getErrorMessage = (error: any) => {
    const message = error.split(':')[1]?.trim();

    return message || error || 'Something went wrong';
  };

 return (
  <s-modal
    ref={inviteMemberModalRef}
    id={INVITE_MEMBER_MODAL_ID}
    padding="base"
    heading={contents.invite_member_modal_title}
  >
    <s-stack direction="block" gap={'base'}>
      <s-grid gridTemplateColumns="50% 50%" gap={'base'} paddingInlineEnd="base">
        <s-text-field
          label={contents.invite_member_modal_first_name}
          value={editData?.first_name || ''}
          onChange={(e: Event) => handleChangeEditData('first_name', e.target.value)}
        />
        <s-text-field
          label={contents.invite_member_modal_last_name}
          value={editData?.last_name}
          onChange={(e: Event) => handleChangeEditData('last_name', e.target.value)}
        />
      </s-grid>
      <s-text-field
        label={contents.email}
        value={editData?.email}
        onChange={(e: Event) => handleChangeEditData('email', e.target.value)}
      />
      <s-select
        label={contents.role}
        value={editData?.role_id}
        onChange={(e: Event) => { handleChangeEditData('role_id', e.target.value); setSelectedRole(e.target.value); }}
      >
        {
          listRole.map((option) => (
            <s-option key={option.value} value={option.value}>
              {option.label}
            </s-option>
          ))
        }
      </s-select>
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
      <s-stack direction="inline" justifyContent={'end'}>
          <s-button
            variant="primary"
            loading={isLoading}
            onClick={handleInviteMember}
          >
            {contents.save}
          </s-button>
      </s-stack>
    </s-stack>
  </s-modal>
 )
};

export default InviteMemberModal;
