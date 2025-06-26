import { sendVerifyEmail } from "@/src/emails";
import * as Sentry from "@sentry/bun";
import { Db } from "@/src/types";
import config from "@/src/utils/config";
import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";
import google from "./google";
import saml, { getLoginUrl } from "./saml";

import { recordAuditLog } from "../audit-logs/utils";
import github from "./github";
import {
  hashPassword,
  isJWTExpired,
  requestPasswordReset,
  sanitizeEmail,
  signJWT,
  verifyJWT,
  verifyPassword,
  verifyRecaptcha,
} from "./utils";

const auth = new Router({
  prefix: "/auth",
});

auth.post("/method", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email().transform(sanitizeEmail),
    joinToken: z.string().optional(),
  });

  const { email, joinToken } = bodySchema.parse(ctx.request.body);

  // First check if there's an existing account with SAML
  const [samlOrg] = await sql`
    select org.* from org
    join account on account.org_id = org.id
    where account.email = ${email}
    and org.saml_enabled = true
    and org.saml_idp_xml is not null
  `;

  // If no existing account but we have a join token, check the org from the token
  let orgToCheck = samlOrg;
  if (!samlOrg && joinToken) {
    try {
      const { payload } = await verifyJWT(joinToken);
      if (payload.email === email && payload.orgId) {
        const [inviteOrg] = await sql`
          select * from org
          where id = ${payload.orgId}
          and saml_enabled = true
          and saml_idp_xml is not null
        `;
        orgToCheck = inviteOrg;
      }
    } catch (error) {
      // Invalid token, ignore
    }
  }

  if (!orgToCheck || !orgToCheck.samlIdpXml) {
    ctx.body = { method: "password" };
  } else {
    const url = await getLoginUrl(orgToCheck.id, joinToken);

    ctx.body = { method: "saml", redirect: url };
  }
});

// TODO: split signup and join
auth.post("/signup", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email().transform(sanitizeEmail),
    password: z.string().min(6).optional(), // optional if SAML flow
    name: z.string(),
    orgName: z.string().optional(),
    projectName: z.string().optional(),
    employeeCount: z.string().optional(),
    orgId: z.string().optional(),
    token: z.string().optional(),
    whereFindUs: z.string().optional(),
    redirectUrl: z.string().optional(),
    signupMethod: z.enum(["signup", "join"]),
    recaptchaToken: z.string().optional(),
  });

  const {
    email,
    password,
    name,
    orgName,
    projectName,
    orgId,
    signupMethod,
    token,
    recaptchaToken,
  } = bodySchema.parse(ctx.request.body);

  // Prevent spaming
  if (orgName?.includes("https://") || name.includes("http://")) {
    ctx.throw(403, "Bad request");
  }

  const whitelistedDomainsRes = await sql<
    { domain: string }[]
  >`select domain from _whitelisted_domain`;

  const whiteListedDomains = whitelistedDomainsRes.map(({ domain }) => domain);
  const emailDomain = email.split("@")[1];
  const shouldRunRecaptcha =
    config.RECAPTCHA_SECRET_KEY && !whiteListedDomains.includes(emailDomain);

  if (shouldRunRecaptcha) {
    const recaptchaResponse = await verifyRecaptcha(recaptchaToken!);
    if (!recaptchaResponse.success) {
      ctx.throw(400, "Failed reCAPTCHA verification");
    }
  }

  if (signupMethod === "signup") {
    const { user, org } = await sql.begin(async (sql) => {
      const plan = process.env.DEFAULT_PLAN || "free";

      const [existingUser] = await sql`
        select * from account where lower(email) = lower(${email})
      `;

      if (!password) {
        ctx.throw(403, "Password is required");
      }

      if (existingUser) {
        ctx.throw(403, "User already exists");
      }

      const [org] =
        await sql`insert into org ${sql({ name: orgName || `${name}'s Org`, plan })} returning *`;

      const newUser = {
        name,
        passwordHash: await hashPassword(password!),
        email,
        orgId: org.id,
        role: "owner",
        verified: config.SKIP_EMAIL_VERIFY,
        lastLoginAt: new Date(),
      };

      const [user] = await sql`
        insert into account ${sql(newUser)} 
        returning *
      `;

      const newProject = {
        name: projectName,
        orgId: org.id,
      };
      const [project] = await sql`
        insert into project ${sql(newProject)} returning *
      `;

      await sql`
        insert into account_project ${sql({ accountId: user.id, projectId: project.id })}
      `;

      const publicKey = {
        type: "public",
        projectId: project.id,
        apiKey: project.id,
      };

      await sql`
        insert into api_key ${sql(publicKey)}
      `;
      const privateKey = [
        {
          type: "private",
          projectId: project.id,
        },
      ];
      await sql`
        insert into api_key ${sql(privateKey)}
      `;

      return { user, org };
    });

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      orgId: org.id,
    });

    sendVerifyEmail(email, name);

    ctx.body = { token };

    return;
  } else if (signupMethod === "join") {
    const { payload } = await verifyJWT(token!);

    if (payload.email !== email) {
      ctx.throw(403, "Invalid token");
    }

    // user already owner of an org
    if (payload.oldRole === "owner") {
      const [orgInvitation] =
        await sql`select * from org_invitation where email = ${email} and org_id = ${payload.orgId as string}`;
      if (!orgInvitation.emailVerified) {
        // prevent malicious user from deleting other orgs
        ctx.throw(403, "Email not verified");
      }
      const [user] =
        await sql`select * from account where email = ${email} order by created_at desc limit 1`;
      const [org] = await sql`select * from org where id = ${user.orgId}`;
      await sql`delete from org where id = ${org.id}`;

      const newUser = {
        name,
        passwordHash: await hashPassword(password!),
        email,
        orgId: payload.orgId as string,
        role: payload.role as string,
        verified: true,
        lastLoginAt: new Date(),
      };

      const [createdUser] =
        await sql`insert into account ${sql(newUser)} returning *`;
      await sql`delete from org_invitation where email = ${email}`;

      for (const projectId of payload.projects as string[]) {
        await sql`insert into account_project ${sql({ accountId: createdUser.id, projectId })}`;
      }

      const authToken = await signJWT({
        userId: createdUser.id,
        email: createdUser.email,
        orgId: createdUser.orgId,
      });
      ctx.body = { authToken };
      return;
    }

    // user is part of an org, but not owner
    if (payload.oldRole && payload.oldRole !== "owner") {
      // prevent malicious user from deleting other orgs
      const [orgInvitation] =
        await sql`select * from org_invitation where email = ${email} and org_id = ${payload.orgId as string}`;
      if (!orgInvitation.emailVerified) {
        ctx.throw(403, "Email not verified");
      }
      const [user] = await sql`select * from account where email = ${email}`;
      await sql`delete from account where id = ${user.id}`;

      const newUser = {
        name,
        passwordHash: await hashPassword(password!),
        email,
        orgId: payload.orgId as string,
        role: payload.role as string,
        verified: true,
        lastLoginAt: new Date(),
      };

      const [createdUser] =
        await sql`insert into account ${sql(newUser)} returning *`;
      await sql`delete from org_invitation where email = ${email}`;

      for (const projectId of payload.projects as string[]) {
        await sql`insert into account_project ${sql({ accountId: createdUser.id, projectId })}`;
      }
      const authToken = await signJWT({
        userId: createdUser.id,
        email: createdUser.email,
        orgId: createdUser.orgId,
      });
      ctx.body = { authToken };
      return;
    }

    const newUser = {
      name,
      passwordHash: await hashPassword(password!),
      email,
      orgId: payload.orgId as string,
      role: payload.role as string,
      verified: config.SKIP_EMAIL_VERIFY,
      lastLoginAt: new Date(),
    };

    const [createdUser] =
      await sql`insert into account ${sql(newUser)} returning *`;
    await sql`delete from org_invitation where email = ${email}`;

    for (const projectId of payload.projects as string[]) {
      await sql`insert into account_project ${sql({ accountId: createdUser.id, projectId })}`;
    }

    const authToken = await signJWT({
      userId: createdUser.id,
      email: createdUser.email,
      orgId: createdUser.orgId,
    });
    ctx.body = { authToken };
    return;
  }
});

auth.get("/join-data", async (ctx: Context) => {
  const token = z.string().parse(ctx.query.token);

  const {
    payload: { orgId, oldRole },
  } = await verifyJWT(token);

  const [org] = await sql`
    select name, plan, seat_allowance, saml_enabled, saml_idp_xml from org where id = ${orgId}
  `;

  const [orgUserCountResult] = await sql`
    select count(*) from account where org_id = ${orgId}
  `;
  const orgUserCount = parseInt(orgUserCountResult.count, 10);

  ctx.body = {
    orgUserCount,
    orgName: org?.name,
    orgPlan: org?.plan,
    orgId: orgId,
    orgSeatAllowance: org?.seatAllowance,
    oldRole,
    samlEnabled: org?.samlEnabled && !!org?.samlIdpXml,
  };
});

auth.get("/saml-url/:orgId", async (ctx: Context) => {
  const orgId = z.string().parse(ctx.params.orgId);
  const joinToken = z.string().optional().parse(ctx.query.joinToken);

  const [org] = await sql`
    select saml_enabled, saml_idp_xml from org where id = ${orgId}
  `;

  if (!org || !org.samlEnabled || !org.samlIdpXml) {
    ctx.status = 404;
    ctx.body = { error: "SAML not enabled for this organization" };
    return;
  }

  const url = await getLoginUrl(orgId, joinToken);
  ctx.body = { url };
});

auth.post("/login", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email().transform(sanitizeEmail),
    password: z.string(),
  });

  const body = bodySchema.safeParse(ctx.request.body);
  if (!body.success) {
    ctx.status = 402;
    ctx.body = {
      error: "Unauthorized",
      message: "Email must be of valid format, and password must be a string",
    };
    return;
  }

  const { email, password } = body.data;

  const [user] = await sql`
    select * from account where email = ${email}
  `;
  if (!user) {
    ctx.body = ctx.throw(403, "Invalid email or password");
  }

  if (!user.passwordHash) {
    // If SAML was the only auth method allowed since the account creation,
    // and that SAML is disabled by admin, accounts don't have a password yet
    await requestPasswordReset(email);

    ctx.body = { message: "We sent you an email to reset your password" };
    return;
  }

  const passwordCorrect = await verifyPassword(password, user.passwordHash);

  if (!passwordCorrect) {
    ctx.status = 403;
    ctx.body = { error: "Unauthorized", message: "Invalid email or password" };
    return;
  }

  // update last login
  await sql`update account set last_login_at = now() where id = ${user.id}`;

  ctx.state.userId = user.id;
  ctx.state.orgId = user.orgId;
  recordAuditLog("team_member", "login", ctx, user.id);

  const token = await signJWT({
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
  });

  ctx.body = { token };
});

auth.post("/request-password-reset", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email().transform(sanitizeEmail),
  });

  try {
    const body = bodySchema.safeParse(ctx.request.body);
    if (!body.success) {
      ctx.status = 400;
      ctx.body = { error: "Invalid email format" };
      return;
    }
    const { email } = body.data;

    const [{ recoveryToken }] = await sql<
      Db.Account[]
    >`select * from account where email = ${email}`;

    if (recoveryToken && !(await isJWTExpired(recoveryToken))) {
      await requestPasswordReset(email);
      ctx.body = { ok: true };
      return;
    }

    await requestPasswordReset(email);
    ctx.body = { ok: true };
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    // Do not send error message to client if email is not found
    ctx.body = { ok: true };
  }
});

auth.post("/reset-password", async (ctx: Context) => {
  const bodySchema = z.object({
    token: z.string(),
    password: z.string(),
  });
  const { token, password } = bodySchema.parse(ctx.request.body);

  const {
    payload: { email, type },
  } = await verifyJWT<{ email: string }>(token);
  if (type !== "password_reset") {
    ctx.throw(403, "Unauthorized");
  }

  const passwordHash = await hashPassword(password);

  const [user] = await sql`
    update 
      account 
    set 
      password_hash = ${passwordHash}, 
      last_login_at = now() 
    where 
      email = ${email} 
    returning *
  `;

  const authToken = await signJWT({
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
  });

  ctx.body = { token: authToken };
});

// Used after the SAML flow to exchange the onetime token for an auth token
auth.post("/exchange-token", async (ctx: Context) => {
  const bodySchema = z.object({
    onetimeToken: z.string()
  });
  const { onetimeToken } = bodySchema.parse(ctx.request.body);

  await verifyJWT(onetimeToken);

  // get account with onetime_token = token
  const [account] = await sql`
    update account set single_use_token = null where single_use_token = ${onetimeToken} returning *
  `;

  if (!account) {
    ctx.throw(401, "Invalid onetime token");
  }

  const oneDay = 60 * 60 * 24;

  const authToken = await signJWT(
    {
      userId: account.id,
      email: account.email,
      orgId: account.orgId,
    },
    oneDay,
  );

  ctx.body = { token: authToken };
});

auth.use(saml.routes());
auth.use(google.routes());
auth.use(github.routes());

export default auth;
