const dbRoleNameWithBaseRoleRegex = /(admin|senior_buyer|junior_buyer)_/;
const trimUnderscores = (str: string) => str.replace(/^_+|_+$/g, '');
const removeUnderscoresAndUpperCaseFirstLetter = (text: string) => text
  .replace(/_/g, ' ')
  .replace(/^(\w)(.*)/, (_, f, r) => f.toUpperCase() + r);


export const toDbRoleName = (roleName: string, rawBaseRole: string) => {
  const rawRoleName = trimUnderscores(roleName)
    .toLowerCase()
    .replace(/ /g, '_');

  return rawBaseRole ? `${rawBaseRole}_${rawRoleName}` : rawRoleName;
};

export const getRawBaseRole = (dbRoleName: string) => dbRoleNameWithBaseRoleRegex.test(dbRoleName)
  ? dbRoleName.match(dbRoleNameWithBaseRoleRegex)?.[1]
  : dbRoleName;

export const getDisplayedBaseRole = (dbRoleName: string) => {
  const rawBaseRole = getRawBaseRole(dbRoleName);

  return rawBaseRole ? removeUnderscoresAndUpperCaseFirstLetter(rawBaseRole) : '';
};

export const getDisplayedRoleNameWithoutBaseRole = (dbRoleName: string) => {
  const rawRoleName = dbRoleName.replace(dbRoleNameWithBaseRoleRegex, '');

  return removeUnderscoresAndUpperCaseFirstLetter(rawRoleName);
};

export const getDisplayedRoleName = (dbRoleName: string, contents: Record<string, any>) => {
  const baseRoleNames = ['admin', 'senior_buyer', 'junior_buyer'];
  
  if (baseRoleNames.includes(dbRoleName)) {
    const roleMap: Record<string, string | undefined> = {
      admin: contents?.default_role_admin,
      senior_buyer: contents?.default_role_senior_buyer,
      junior_buyer: contents?.default_role_junior_buyer,
    };
    
    return roleMap[dbRoleName] || removeUnderscoresAndUpperCaseFirstLetter(dbRoleName);
  }

  const rawBaseRole = getRawBaseRole(dbRoleName);
  const customRolePart = dbRoleName.replace(dbRoleNameWithBaseRoleRegex, '');
  
  if (rawBaseRole && customRolePart) {
    const baseRoleMap: Record<string, string | undefined> = {
      admin: contents?.default_role_admin,
      senior_buyer: contents?.default_role_senior_buyer,
      junior_buyer: contents?.default_role_junior_buyer,
    };
    
    const baseRoleDisplay = baseRoleMap[rawBaseRole] || removeUnderscoresAndUpperCaseFirstLetter(rawBaseRole);
    const customRoleDisplay = removeUnderscoresAndUpperCaseFirstLetter(customRolePart);

    if (baseRoleDisplay === customRoleDisplay) {
      return baseRoleDisplay;
    }

    return `${baseRoleDisplay} - ${customRoleDisplay}`;
  }

  return removeUnderscoresAndUpperCaseFirstLetter(dbRoleName);
};
