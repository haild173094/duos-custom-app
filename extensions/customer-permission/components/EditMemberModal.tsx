import { useCallback, useContext, useEffect, useMemo, useState } from "preact/hooks";
import {
  useSessionToken,
} from "@shopify/ui-extensions/customer-account/preact";
import { useCustomer, useShop, LocationContext } from '@/customer-account/contexts';
import { useHttp } from "@/customer-account/hook";
import { removeShopifyGidPrefix, getShopifyGidPrefix } from "@/services";

const EditMemberModal = ({ listRole, member, refreshMemberList, shopifyRoles, refreshListRoles, contents }) => {
  type EditData = {
    first_name: string;
    last_name: string;
    email: string;
    role_id: string;
  }

  const EDIT_MEMBER_MODAL_ID = 'edit-member-modal';

  const sessionToken = useSessionToken();
  const { updateMember, createRole } = useHttp(sessionToken.get);
  const { customer } = useCustomer();
  const shop = useShop();

  const location = useContext(LocationContext);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editData, setEditData] = useState<EditData | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(null);
  const [errors, setErrors] = useState<any>([]);

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
      shopify_company_gid: getShopifyGidPrefix(customer.companyId, 'Conpany'),
    }
  }, [listRole, shopifyRoles, selectedRole, customer.companyId]);

  useEffect(() => {
    if (member?.system_role && member?.system_role?.id) {
      setSelectedRole(member.system_role.id);
    } else {
      setSelectedRole(listRole[0]?.value);
    }
  }, [member, listRole]);

  const handleAssignEditData = useCallback((memberData) => {
    if (!memberData) {
      return;
    }

    const editMember = {
      first_name: memberData?.company_contact?.customer?.first_name,
      last_name: memberData?.company_contact?.customer?.last_name,
      email: memberData?.company_contact?.customer?.default_email_address?.email_address,
      shopify_contact_role_assignment_gid: memberData?.id,
      ...roleData,
    };

    setEditData(editMember);
  }, [roleData]);

  // assign EditData to member
  useEffect(() => {
    if (!roleData) {
      return;
    }

    const editMember = {
      first_name: member?.company_contact?.customer?.first_name,
      last_name: member?.company_contact?.customer?.last_name,
      email: member?.company_contact?.customer?.default_email_address?.email_address,
      shopify_contact_role_assignment_gid: member?.id,
      ...roleData,
    };

    setEditData(editMember);

  }, [member, roleData]);

  const handleEditMember = useCallback(async () => {
    try {
      setIsEditing(true);

      const shopId = removeShopifyGidPrefix(shop.id, 'Shop');

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

        await updateMember(location.id, shopId, body);

        setIsEditing(false);

        await refreshMemberList();

        await refreshListRoles();

        return;
      }

      const body = {
        ...editData,
        role_id: +editData?.role_id,
      };

      const res = await updateMember(location.id, shopId, body);
      setIsEditing(false);

      await refreshMemberList();
    } catch (error) {
      console.log('error', error);
      setErrors([error]);
    }
  }, [location?.id, shop?.id, editData, refreshMemberList, refreshListRoles]);

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
    id={EDIT_MEMBER_MODAL_ID}
    padding="base"
    heading={contents.edit_member_modal_title}
    onShow={() => handleAssignEditData(member)}
  >
    <s-stack direction="block" gap={'base'}>
      <s-grid gridTemplateColumns="50% 50%" gap={'small'} paddingInlineEnd="small">
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
      <s-text-field disabled label={contents.email} value={editData?.email}/>
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
            loading={isEditing}
            onClick={handleEditMember}
          >
            {contents.save}
          </s-button>
      </s-stack>
    </s-stack>
  </s-modal>
 )
};

export default EditMemberModal;
