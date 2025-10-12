import sql from "./db";

type OrgApiKeyRow = {
  apiKey: string;
};

export async function ensureOrgPrivateKey(orgId: string) {
  const [existing] =
    await sql<OrgApiKeyRow[]>`select api_key from api_key where org_id = ${orgId} and type = 'org_private'`;

  if (existing?.apiKey) {
    return existing.apiKey;
  }

  const [created] =
    await sql<OrgApiKeyRow[]>`insert into api_key (type, org_id) values ('org_private', ${orgId}) returning api_key`;

  return created.apiKey;
}

export async function regenerateOrgPrivateKey(orgId: string) {
  const [updated] =
    await sql<OrgApiKeyRow[]>`update api_key set api_key = uuid_generate_v4(), created_at = now() where org_id = ${orgId} and type = 'org_private' returning api_key`;

  if (updated?.apiKey) {
    return updated.apiKey;
  }

  return ensureOrgPrivateKey(orgId);
}
