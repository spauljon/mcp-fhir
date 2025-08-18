import jwtsigner from "jsonwebtoken";
import {config} from "./config.mjs";
import {generateAdminUser, generateStaffUser, generateVeteranUser, JwtUser,} from "./jwtuser.mjs";

export enum JwtRole {
  VETERAN = "veteran",
  STAFF = "staff",
  ADMIN = "admin",
}

export const generateJws = (jwtUser: JwtUser): string => {
  return jwtsigner.sign(jwtUser, config.jwtPrivateKey, {algorithm: "RS512"});
};

const nowSeconds = (): number => {
  return Math.floor(Date.now() / 1000);
};

const MINUTE_SECONDS = 60;
const JWT_EXPIRE_MINUTES = 15;

const userGenerators: Record<JwtRole, (id: string) => JwtUser> = {
  [JwtRole.VETERAN]: (id) =>
    generateVeteranUser({sub: id, patient: {icn: id}}),
  [JwtRole.ADMIN]: (id) => generateAdminUser({sub: id}),
  [JwtRole.STAFF]: (id) =>
    generateStaffUser({sub: id, attributes: {secid: id}}),
};

export class Jwt {
  id: string;
  role: JwtRole;
  jwtUser: JwtUser;
  exp?: number;
  jws?: string;

  constructor(id: string, role: JwtRole) {
    this.id = id;
    this.role = role;
    this.jwtUser = userGenerators[role]?.(id);
  }

  get(): string | undefined {
    const _now = nowSeconds();

    // gen a new jwt when it expires (or the first time)
    if ((!this.exp || !this.jws || _now >= this.exp) && this.jwtUser) {
      this.exp = _now + MINUTE_SECONDS * JWT_EXPIRE_MINUTES;
      this.jwtUser.nbf = _now;
      this.jwtUser.sst = _now;
      this.jwtUser.exp = this.exp;
      this.jws = generateJws(this.jwtUser);
    }

    return this.jws;
  }
}

