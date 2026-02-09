import { useState, useEffect } from 'preact/hooks';
import CustomerManagement from './CustomerManagement';
import RoleManage from './RoleManage';

function CustomerPermissionPage() {
  const [type, setType] = useState<string | null>(null);

  const handleRedirect = (currentUrl: string) => {
      const RoleManagePattern = /^extension:\/customer-permission\/(\d+|role)$/;
      const RoleManageMatch =
        currentUrl.match(
          RoleManagePattern,
        );

    if (RoleManageMatch) {
      setType(RoleManageMatch[1]);
    } else {
      setType(null);
    }
  };

  useEffect(() => {
    handleRedirect(navigation.currentEntry.url);
    navigation.addEventListener('currententrychange', (e) => {
      handleRedirect(e.from.url);
    });
  }, []);

  if (type === 'role') {
    return <RoleManage/>;
  }

  return <CustomerManagement />;
}

export default CustomerPermissionPage;
