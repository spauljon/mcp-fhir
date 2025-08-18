
export type VistaId = {
  siteId: string;
  patientId: string;
};

export type Patient = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  ssn?: string;
  icn: string;
  edipid?: string;
  dob?: string;
};

export type JwtUser = AdminUser | StaffUser | VeteranUser;

export type VeteranUserAttributes = {
  eulaAccepted: string;
  edipi: string;
  icns: string;
};

export type AdminUser = {
  authenticated: boolean;
  sub: string;
  lastName: "User";
  authenticationAuthority: string;
  idType: string;
  iss: "gov.va.vamf.userservice.v2";
  "vamf.auth.resources": string[];
  version: 2.8;
  firstName: "Test";
  nbf: number;
  sst: number;
  attributes: {
    memberOf?: string;
    secid?: string;
  };
  "vamf.auth.roles": string[];
  exp: number;
  jti: string;
};

export type StaffUser = {
  authenticated: boolean;
  lastName: string;
  sub: string;
  authenticationAuthority: string;
  idType: string;
  iss: "gov.va.vamf.userservice.v2";
  "vamf.auth.resources": ["^.*(\\/)?.*(\\/)?.*$"];
  version: 2.8;
  vistaIds: [
    {
      siteId: string;
      siteName: string;
      duz: string;
    },
    {
      siteId: string;
      siteName: string;
      duz: string;
    },
  ];
  firstName: string;
  staffDisclaimerAccepted: true;
  nbf: number;
  sst: number;
  attributes: {
    memberOf?: string;
    secid?: string;
  };
  userType: string;
  "vamf.auth.roles": string[];
  exp: number;
  email: string;
  jti: string;
  loa: 3;
};

export type VeteranUser = {
  authenticated: boolean;
  lastName: string;
  sub: string;
  authenticationAuthority: string;
  idType: string;
  iss: string;
  "vamf.auth.resources": string[];
  version: number;
  vistaIds: VistaId[];
  firstName: string;
  staffDisclaimerAccepted: boolean;
  nbf: number;
  sst: number;
  patient: Patient;
  attributes: VeteranUserAttributes;
  rightOfAccessAccepted: boolean;
  userType: string;
  "vamf.auth.roles": string[];
  exp: number;
  email: string;
  jti: string;
  loa: number;
};

export const defaultAdminUser: AdminUser = {
  authenticated: true,
  sub: "12345",
  lastName: "User",
  authenticationAuthority: "gov.va.vamf.adminidp.v2",
  idType: "AdminUid",
  iss: "gov.va.vamf.userservice.v2",
  "vamf.auth.resources": ["^.*(\\/)?.*(\\/)?.*$"],
  version: 2.8,
  firstName: "Test",
  nbf: 0,
  sst: 0,
  attributes: {
    memberOf: "cn=admins,ou=groups,dc=ldap,dc=admin,dc=mobile,dc=va,dc=gov",
  },
  "vamf.auth.roles": ["admin"],
  exp: 0,
  jti: "569e1c67-3eb1-4885-bfd0-6ae31fc6a3dd",
};

export const generateAdminUser = (
  overrides: Partial<AdminUser> = {},
): AdminUser => {
  return {
    ...defaultAdminUser,
    ...overrides,
  };
};

export const defaultStaffUser: StaffUser = {
  authenticated: true,
  lastName: "User",
  sub: "12345",
  authenticationAuthority: "gov.va.iam.ssoi.v1",
  idType: "SECID",
  iss: "gov.va.vamf.userservice.v2",
  "vamf.auth.resources": ["^.*(\\/)?.*(\\/)?.*$"],
  version: 2.8,
  vistaIds: [
    {
      siteId: "500",
      siteName: "Camp Master",
      duz: "520824665",
    },
    {
      siteId: "510",
      siteName: "Camp Paris",
      duz: "520824665",
    },
  ],
  firstName: "Test",
  staffDisclaimerAccepted: true,
  nbf: 0,
  sst: 0,
  attributes: {
    secid: "12345",
  },
  userType: "user",
  "vamf.auth.roles": ["staff"],
  exp: 0,
  email: "Test.User@va.gov",
  jti: "569e1c67-3eb1-4885-bfd0-6ae31fc6a3dd",
  loa: 3,
};

export const generateStaffUser = (
  overrides: Partial<StaffUser> = {},
): StaffUser => {
  return {
    ...defaultStaffUser,
    ...overrides,
  };
};

const defaultVeteranUser: VeteranUser = {
  authenticated: true,
  lastName: "User",
  sub: "12345",
  authenticationAuthority: "gov.va.iam.ssoe.v1",
  idType: "ICN",
  iss: "gov.va.vamf.userservice.v2",
  "vamf.auth.resources": ["^.*(\\/)?.*(\\/)?.*$"],
  version: 2.8,
  vistaIds: [
    { siteId: "500", patientId: "1" },
    { siteId: "510", patientId: "1" },
  ],
  firstName: "Test",
  staffDisclaimerAccepted: true,
  nbf: 1747910770,
  sst: 1747910950,
  patient: {
    firstName: "Test",
    lastName: "User",
    dateOfBirth: "1962-01-01",
    gender: "Male",
    ssn: "000000029",
    icn: "12345",
    edipid: "1234567890",
    dob: "1962-01-01",
  },
  attributes: {
    eulaAccepted: "true",
    edipi: "1234567890",
    icns: "12345",
  },
  rightOfAccessAccepted: true,
  userType: "user",
  "vamf.auth.roles": ["veteran"],
  exp: 1747911850,
  email: "Test.User@va.gov",
  jti: "a524c45f-e8a9-4002-a360-3d3ebf815a3c",
  loa: 2,
};

export const generateVeteranUser = (
  overrides: Partial<VeteranUser> = {},
): VeteranUser => {
  return {
    ...defaultVeteranUser,
    ...overrides,
    patient: {
      ...defaultVeteranUser.patient,
      ...overrides.patient,
    },
    attributes: {
      ...defaultVeteranUser.attributes,
      ...overrides.attributes,
    },
    vistaIds: overrides.vistaIds ?? defaultVeteranUser.vistaIds,
    "vamf.auth.resources":
      overrides["vamf.auth.resources"] ??
      defaultVeteranUser["vamf.auth.resources"],
    "vamf.auth.roles":
      overrides["vamf.auth.roles"] ?? defaultVeteranUser["vamf.auth.roles"],
  };
};
