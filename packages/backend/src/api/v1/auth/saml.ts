import sql from "@/src/utils/db";

import Context from "@/src/utils/koa";
import Router from "koa-router";
import * as samlify from "samlify";
import * as validator from "@authenio/samlify-node-xmllint";
import { sanitizeEmail } from "./utils";
import { randomBytes } from "crypto";
import { SignJWT } from "jose";
import z from "zod";
import { aggressiveRatelimit } from "@/src/utils/ratelimit";
import { checkAccess } from "@/src/utils/authorization";
import { hasAccess } from "shared";
import { verifyJWT } from "./utils";

// Required for SAMLify to work
samlify.setSchemaValidator(validator);

const route = new Router({
  prefix: "/saml/:orgId",
});

// This function generates a secure, one-time-use token
export async function generateOneTimeToken(): Promise<string> {
  // Generate a 32-byte random buffer
  const buffer = randomBytes(32);
  const token = buffer.toString("hex");

  const iat = Math.floor(Date.now() / 1000);

  return new SignJWT({ token })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("5m") // Set a short expiration time, e.g., 5 minutes
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

function getSpMetadata(orgId: string) {
  return `<?xml version="1.0"?>
<EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" entityID="${process.env.SAML_ENTITY_ID || "urn:lunary.ai:saml:sp"}">
    <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${process.env.API_URL}/auth/saml/${orgId}/slo" />
        <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</NameIDFormat>
        <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${process.env.API_URL}/auth/saml/${orgId}/acs" index="1" />
    </SPSSODescriptor>
    <Organization>
        <OrganizationName xml:lang="en-US">Lunary LLC</OrganizationName>
        <OrganizationDisplayName xml:lang="en-US">Lunary.ai</OrganizationDisplayName>
        <OrganizationURL xml:lang="en-US">https://lunary.ai</OrganizationURL>
    </Organization>
</EntityDescriptor>`;
}

async function getOrgIdp(orgId: string) {
  const [org] = await sql`select id, saml_idp_xml from org where id = ${orgId}`;

  if (!org) throw new Error("Org not found");
  if (!org.samlIdpXml) throw new Error("SAML IDP XML not found");

  return samlify.IdentityProvider({
    metadata: org.samlIdpXml,
  });
}

async function getOrgSp(orgId: string) {
  return samlify.ServiceProvider({
    // authnRequestsSigned: true,
    wantAssertionsSigned: true,
    // isAssertionEncrypted: false,
    metadata: getSpMetadata(orgId),
  });
}

export async function getLoginUrl(orgId: string, relayState?: string) {
  const idp = await getOrgIdp(orgId);
  const sp = await getOrgSp(orgId);
  
  if (relayState) {
    const { context } = sp.createLoginRequest(idp, "redirect", { relayState });
    return context;
  } else {
    const { context } = sp.createLoginRequest(idp, "redirect");
    return context;
  }
}

// This function parses the attributes from the SAML response
// and returns the email and name
function parseAttributes(attributes: any, nameID: string) {
  let email = nameID;
  let name = "";

  for (const key in attributes) {
    if (
      key.toLowerCase().includes("emailaddress") ||
      key.toLowerCase() === "email"
    ) {
      email = sanitizeEmail(attributes[key]);
    } else if (
      key.toLowerCase().includes("displayname") ||
      key.toLowerCase() === "name"
    ) {
      name = attributes[key];
    }
  }

  if (!name && attributes.firstname && attributes.lastname) {
    name = `${attributes.firstname} ${attributes.lastname}`;
  }

  return { email, name };
}

route.get("/success", async (ctx: Context) => {
  ctx.redirect(process.env.APP_URL!);
});

// Returns the Service Provider metadata
route.get("/metadata", async (ctx: Context) => {
  const paramsSchema = z.object({
    orgId: z.string().uuid(),
  });
  const { orgId } = paramsSchema.parse(ctx.params);
  const sp = await getOrgSp(orgId);

  ctx.type = "application/xml";
  ctx.body = sp.getMetadata();
});

route.post("/download-idp-xml", aggressiveRatelimit, async (ctx: Context) => {
  const { orgId } = ctx.params as { orgId: string };
  const { userId } = ctx.state;

  const bodySchema = z.object({
    content: z.string().url().or(z.string().min(1)),
  });

  const { content } = bodySchema.parse(ctx.request.body);

  const [user] = await sql`select * from account where id = ${userId}`;
  if (user?.orgId !== orgId) {
    ctx.throw(403, "Forbidden: Insufficient permissions");
  }

  let xml = content;

  if (content.startsWith("http")) {
    const url = new URL(content);
    if (
      url.hostname === "login.microsoftonline.com" ||
      url.hostname.endsWith(".okta.com") ||
      url.hostname.endsWith(".oktapreview.com")
    ) {
      const response = await fetch(content);
      const data = await response.text();
      xml = data;
    }
  }

  if (hasAccess(user?.role, "settings", "create")) {
    await sql`
    update 
     org 
    set 
      saml_idp_xml = ${xml},
      saml_enabled = true
    where 
      id = ${orgId}
    `;
  }

  ctx.body = { success: true };
  ctx.status = 201;
});

// Assertion Consumer Service
route.post("/acs", async (ctx: Context) => {
  const { orgId } = ctx.params as { orgId: string };

  const idp = await getOrgIdp(orgId);
  const sp = await getOrgSp(orgId);

  const parsedResult = await sp.parseLoginResponse(idp, "post", ctx.request);

  console.log("[SAML ACS] Request body keys:", Object.keys(ctx.request.body || {}));
  console.log("[SAML ACS] Parsed result extract keys:", Object.keys(parsedResult.extract || {}));

  const { attributes, conditions, nameID } = parsedResult.extract;
  const relayState = (ctx.request.body as any)?.RelayState || parsedResult.extract?.relayState || parsedResult.extract?.RelayState;

  if (!attributes) {
    ctx.throw(400, "No attributes found");
  }

  if (conditions?.notBefore && conditions?.notOnOrAfter) {
    const notBefore = new Date(conditions.notBefore);
    const notOnOrAfter = new Date(conditions.notOnOrAfter);
    const now = new Date();

    if (now < notBefore || now > notOnOrAfter) {
      ctx.throw(400, "Invalid SAML response");
    }
  }

  const { email, name } = parseAttributes(attributes, nameID);

  const singleUseToken = await generateOneTimeToken();

  console.log("[SAML ACS] Processing for email:", email, "orgId:", orgId);
  console.log("[SAML ACS] RelayState:", relayState);

  // Check if this is a join flow (RelayState contains the join token)
  let account;
  if (relayState) {
    try {
      const { payload } = await verifyJWT(relayState);
      console.log("[SAML ACS] JWT payload:", payload);
      
      // Check if this is a valid join token for this org and email
      if (payload.orgId === orgId && payload.email?.toLowerCase() === email?.toLowerCase()) {
        console.log("[SAML ACS] Join flow detected, creating account");
        console.log("[SAML ACS] Token email:", payload.email, "SAML email:", email);
        // This is a join flow, create the account
        const newUser = {
          name,
          email,
          org_id: orgId,  // Note: using org_id not orgId
          role: payload.role as string,
          verified: true,
          last_login_at: new Date(),
          single_use_token: singleUseToken,
          password_hash: null,  // SAML users don't have passwords
          created_at: new Date(),
        };

        console.log("[SAML ACS] Creating user with data:", newUser);

        try {
          // First check if account already exists for this email/org combination
          const [existingAccount] = await sql`
            select * from account 
            where email = ${email} 
            and org_id = ${orgId}
          `;

          if (existingAccount) {
            console.log("[SAML ACS] Account already exists, updating...");
            [account] = await sql`
              update account set
                name = ${name},
                single_use_token = ${singleUseToken},
                last_login_at = ${new Date()},
                verified = true
              where email = ${email} 
              and org_id = ${orgId}
              returning *
            `;
          } else {
            console.log("[SAML ACS] Creating new account");
            [account] = await sql`
              insert into account ${sql(newUser)} 
              returning *
            `;
          }
          console.log("[SAML ACS] Account created/updated:", account?.id);
        } catch (sqlError) {
          console.error("[SAML ACS] SQL Error creating account:", sqlError);
          throw sqlError;
        }

        // Add user to projects if specified in the invitation
        if (payload.projects && Array.isArray(payload.projects)) {
          for (const projectId of payload.projects) {
            await sql`insert into account_project ${sql({ accountId: account.id, projectId })} on conflict do nothing`;
          }
        }

        // Delete the invitation
        await sql`delete from org_invitation where email = ${email} and org_id = ${orgId}`;
      } else {
        console.log("[SAML ACS] Email/OrgId mismatch - payload:", payload.email, payload.orgId, "vs actual:", email, orgId);
      }
    } catch (error) {
      console.error("[SAML ACS] Error processing join token:", error);
      // Invalid or expired token, fall through to regular login
    }
  } else {
    console.log("[SAML ACS] No RelayState found");
  }

  // If not a join flow or join failed, try regular login
  if (!account) {
    console.log("[SAML ACS] Trying regular login update");
    [account] = await sql`
      update 
        account 
      set 
        name = ${name},
        single_use_token = ${singleUseToken},
        last_login_at = ${new Date()}
      where 
        email = ${email} 
        and org_id = ${orgId} 
      returning *
    `;
    console.log("[SAML ACS] Regular login result:", account?.id);
  }

  if (!account) {
    console.error("[SAML ACS] No account found or created for:", email, "in org:", orgId);
    ctx.throw(
      400,
      "Account not found. Please ask your administrator to invite you.",
    );
  }

  // OTT is safe for passing through the URL, then exchanged for real auth token
  ctx.redirect(`${process.env.APP_URL!}/login?ott=${singleUseToken}`);
});

route.post("/slo", async (ctx: Context) => {
  ctx.body = "SAML SLO";
});

export default route;
