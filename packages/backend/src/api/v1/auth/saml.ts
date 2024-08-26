import sql from "@/src/utils/db"

import Context from "@/src/utils/koa"
import Router from "koa-router"
import * as samlify from "samlify"
import * as validator from "@authenio/samlify-node-xmllint"
import { sanitizeEmail } from "./utils"
import { randomBytes } from "crypto"
import { SignJWT } from "jose"
import z from "zod"
import { aggressiveRatelimit } from "@/src/utils/ratelimit"

// Required for SAMLify to work
samlify.setSchemaValidator(validator)

const route = new Router({
  prefix: "/saml/:orgId",
})

// This function generates a secure, one-time-use token
export async function generateOneTimeToken(): Promise<string> {
  // Generate a 32-byte random buffer
  const buffer = randomBytes(32)
  const token = buffer.toString("hex")

  const iat = Math.floor(Date.now() / 1000)

  return new SignJWT({ token })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("5m") // Set a short expiration time, e.g., 5 minutes
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET))
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
</EntityDescriptor>`
}

async function getOrgIdp(orgId: string) {
  const [org] = await sql`select id, saml_idp_xml from org where id = ${orgId}`

  if (!org) throw new Error("Org not found")
  if (!org.samlIdpXml) throw new Error("SAML IDP XML not found")

  return samlify.IdentityProvider({
    metadata: org.samlIdpXml,
  })
}

async function getOrgSp(orgId: string) {
  console.log(`Getting SP for orgId: ${orgId}`)
  return samlify.ServiceProvider({
    // authnRequestsSigned: true,
    wantAssertionsSigned: true,
    // isAssertionEncrypted: false,
    metadata: getSpMetadata(orgId),
  })
}

export async function getLoginUrl(orgId: string) {
  const idp = await getOrgIdp(orgId)
  const sp = await getOrgSp(orgId)
  const { context } = sp.createLoginRequest(idp, "redirect")
  return context
}

// This function parses the attributes from the SAML response
// and returns the email and name
function parseAttributes(attributes: any, nameID: string) {
  let email = nameID
  let name = ""

  for (const key in attributes) {
    if (
      key.toLowerCase().includes("emailaddress") ||
      key.toLowerCase() === "email"
    ) {
      email = sanitizeEmail(attributes[key])
    } else if (
      key.toLowerCase().includes("displayname") ||
      key.toLowerCase() === "name"
    ) {
      name = attributes[key]
    }
  }

  if (!name && attributes.firstname && attributes.lastname) {
    name = `${attributes.firstname} ${attributes.lastname}`
  }

  return { email, name }
}

route.get("/success", async (ctx: Context) => {
  ctx.redirect(process.env.APP_URL!)
})

// Returns the Service Provider metadata
route.get("/metadata", async (ctx: Context) => {
  const paramsSchema = z.object({
    orgId: z.string().uuid(),
  })
  const { orgId } = paramsSchema.parse(ctx.params)
  const sp = await getOrgSp(orgId)

  ctx.type = "application/xml"
  ctx.body = sp.getMetadata()
})

route.post("/download-idp-xml", aggressiveRatelimit, async (ctx: Context) => {
  const { orgId } = ctx.params as { orgId: string }
  const { userId } = ctx.state

  const bodySchema = z.object({
    content: z.string().url().or(z.string().min(1)),
  })

  const { content } = bodySchema.parse(ctx.request.body)

  const [user] = await sql`select * from account where id = ${userId}`
  if (user?.orgId !== orgId) {
    ctx.throw(403, "Forbidden: Insufficient permissions")
  }

  let xml = content

  if (content.startsWith("http")) {
    const url = new URL(content)
    if (
      url.hostname === "login.microsoftonline.com" ||
      url.hostname.endsWith(".okta.com") ||
      url.hostname.endsWith(".oktapreview.com")
    ) {
      const response = await fetch(content)
      const data = await response.text()
      xml = data
    }
  }

  await sql`
    update 
     org 
    set 
      saml_idp_xml = ${xml} 
    where 
      id = ${orgId}
    `

  ctx.body = { success: true }
  ctx.status = 201
})

// Assertion Consumer Service
route.post("/acs", async (ctx: Context) => {
  const { orgId } = ctx.params as { orgId: string }
  const { userId } = ctx.state

  const [user] = await sql`select * from account where id = ${userId}`
  if (user?.orgId !== orgId) {
    ctx.throw(403, "Forbidden: Insufficient permissions")
  }

  const idp = await getOrgIdp(orgId)
  const sp = await getOrgSp(orgId)

  const parsedResult = await sp.parseLoginResponse(idp, "post", ctx.request)

  const { attributes, conditions, nameID } = parsedResult.extract

  if (!attributes) {
    ctx.throw(400, "No attributes found")
  }

  if (conditions?.notBefore && conditions?.notOnOrAfter) {
    const notBefore = new Date(conditions.notBefore)
    const notOnOrAfter = new Date(conditions.notOnOrAfter)
    const now = new Date()

    if (now < notBefore || now > notOnOrAfter) {
      ctx.throw(400, "Invalid SAML response")
    }
  }

  const { email, name } = parseAttributes(attributes, nameID)

  const singleUseToken = await generateOneTimeToken()

  const [account] = await sql`
    update 
      account 
    set 
      ${sql({ name, singleUseToken, lastLoginAt: new Date() })} 
    where 
      email = ${email} 
      and org_id = ${orgId} 
    returning *
  `

  if (!account) {
    ctx.throw(
      400,
      "Account not found. Please ask your administrator to invite you.",
    )
  }

  ctx.redirect(`${process.env.APP_URL!}/login?ott=${singleUseToken}`)
})

route.post("/slo", async (ctx: Context) => {
  ctx.body = "SAML SLO"
})

export default route
