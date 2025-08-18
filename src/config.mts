import * as process from "node:process";

import {z} from 'zod';
import {Jwt, JwtRole} from "./jwt.mjs";
import * as fs from "node:fs";

const configSchema = z.object({
  fhirBaseUrl: z.string().url({message: 'Please provide a valid FHIR_BASE_URL'}),
  secretsDir: z.string().min(1,
    {message: 'Please provide a valid SECRETS_DIR (path to project secrets)'}),
  jwtPrivateKey: z.string().min(100, {message: 'JWT_PRIVATE_KEY must be a non-empty string'})
});

export const config = configSchema.parse({
  fhirBaseUrl: process.env.FHIR_BASE_URL,
  secretsDir: process.env.SECRETS_DIR,
  jwtPrivateKey: fs.readFileSync(`${process.env.SECRETS_DIR}/jwt-private-key.pem`, "utf8")
});

export const adminJwt = new Jwt("admin", JwtRole.ADMIN);
