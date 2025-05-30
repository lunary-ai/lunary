import {
  INVITE_EMAIL,
  sendEmail,
  sendVerifyEmail,
  WELCOME_EMAIL,
} from "@/src/emails";
import { checkAccess } from "@/src/utils/authorization";
import config from "@/src/utils/config";
import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import { sendSlackMessage } from "@/src/utils/notifications";
import { jwtVerify } from "jose";
import Router from "koa-router";
import { hasAccess, roles } from "shared";
import { z } from "zod";
import { recordAuditLog } from "./audit-logs/utils";
import { sanitizeEmail, signJWT } from "./auth/utils";

const users = new Router({
  prefix: "/users",
});

users.get("/me/org", async (ctx: Context) => {
  const { userId } = ctx.state;

  const [user] =
    await sql`select * from account where id = ${ctx.state.userId}`;
  const isAdmin = user.role === "admin" || user.role === "owner";

  const [org] = await sql`
      select * from org where id = (select org_id from account where id = ${userId})
    `;

  if (!org) {
    ctx.status = 401;
    ctx.body = { message: "Unauthorized" };
    return;
  }

  if (hasAccess(user.role, "teamMembers", "list")) {
    org.users = await sql`
      select
        account.id,
        account.created_at,
        account.email,
        account.name,
        account.org_id,
        account.role,
        account.verified,
        account.avatar_url,
        account.last_login_at,
        ${isAdmin ? sql`account.single_use_token,` : sql``}
        array_agg(account_project.project_id) as projects
      from
        account
        left join account_project on account.id = account_project.account_id
      where
        account.org_id = ${org.id}
      group by
        account.id
      order by
        account.role,
        account.name
    `;
  }
  org.license = ctx.state.license || {};
  ctx.body = org;
});

users.post("/feedback", async (ctx: Context) => {
  const bodySchema = z.object({
    text: z.string()
  });
  const { text } = bodySchema.parse(ctx.request.body);
  await sendSlackMessage(text, "feedback");
  ctx.body = { ok: true };
});

users.get("/me", async (ctx: Context) => {
  const { userId } = ctx.state;

  const [user] = await sql`
    select
      account.id,
      account.name,
      account.created_at,
      account.email,
      account.org_id,
      account.role,
      account.verified,
      account.avatar_url,
      account.last_login_at,
      array_agg(account_project.project_id) as projects
    from
      account
      left join account_project on account.id = account_project.account_id
    where
      id = ${userId}
    group by
      account.id
  `;

  ctx.body = user;
});

users.get("/verify-email", async (ctx: Context) => {
  const bodySchema = z.object({
    token: z.string(),
  });
  const { token } = bodySchema.parse(ctx.request.query);

  const {
    payload: { email },
  }: {
    payload: { email: string };
  } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));

  const [account] = await sql`
      select *
      from account
      where email = ${email}
    `;

  const [orgInvitation] =
    await sql`select * from org_invitation where email = ${account.email}`;
  if (orgInvitation) {
    await sql`update org_invitation set email_verified = true where id = ${orgInvitation.id}`;
  }

  if (account.verified) {
    ctx.body = { message: "Email already verified" };
    return;
  }

  const [acc] = await sql`
    update account
    set verified = true
    where email = ${email}
    returning org_id, name
  `;
  const { orgId, name } = acc;

  const [project] = await sql`
      select 
        id
      from 
        project
      where 
        org_id = ${orgId}
    `;
  const id = project?.id;

  if (config.IS_CLOUD) {
    await sendEmail(WELCOME_EMAIL(email, name, id));
  }
  ctx.redirect(process.env.APP_URL!);
});

users.post("/send-verification", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email(),
    name: z.string().optional(),
  });
  const { email, name } = bodySchema.parse(ctx.request.body);

  await sendVerifyEmail(email, name);

  ctx.body = { ok: true };
});

users.get("/invited", async (ctx: Context) => {
  const { orgId } = ctx.state;
  const invitedUsers =
    await sql`select * from org_invitation where org_id = ${orgId}`;
  ctx.body = invitedUsers;
});

users.get(
  "/:userId",
  checkAccess("teamMembers", "read"),
  async (ctx: Context) => {
    const { userId } = ctx.params;
    const { orgId } = ctx.state;

    const [user] = await sql`
      select
        id,
        name,
        email,
        verified
      from
        account
      where
        id = ${userId} and org_id = ${orgId}`;

    ctx.body = user;
  },
);

users.post("/", checkAccess("teamMembers", "create"), async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email(),
    role: z.enum(Object.keys(roles) as [string, ...string[]]),
    projects: z.array(z.string()).min(1),
  });
  const { email, role, projects } = bodySchema.parse(ctx.request.body);
  const { orgId, userId } = ctx.state;

  const FIFTEEN_DAYS = 60 * 60 * 24 * 15;

  const [org] = await sql`
    select name, plan from org where id = ${orgId}
  `;

  if (
    role !== "member" &&
    role !== "admin" &&
    (org.plan === "free" || org.plan === "pro")
  ) {
    ctx.throw(401, "Your plan doesn't allow granular access control");
  }

  const [currentUser] = await sql`select * from account where id = ${userId}`;
  if (currentUser.role !== "owner" && role === "billing") {
    ctx.throw(403, "Only owners can add billing members to the organization.");
  }

  const token = await signJWT({ email, orgId }, FIFTEEN_DAYS);
  const userToInsert = {
    email,
    orgId,
    role,
    singleUseToken: token,
  };

  const [existingUser] = await sql`
    select id, org_id from account where email = ${email}
  `;
  if (existingUser && existingUser.orgId !== orgId) {
    ctx.throw(400, "This user is part of a different Organization.");
  }

  if (existingUser) {
    ctx.throw(400, "This user is already part of your Organization.");
  }

  for (const projectId of projects) {
    const [project] =
      await sql`select org_id from project where id = ${projectId}`;
    if (project.orgId !== orgId) {
      ctx.throw(
        403,
        "Unauthorized: Project does not belong to the specified organization",
      );
    }
  }

  const [user] =
    await sql`insert into account ${sql(userToInsert)} returning *`;

  for (const projectId of projects) {
    await sql`
      insert into account_project 
        (account_id, project_id)
      values 
        (${user.id}, ${projectId})
      returning *
      `;
  }

  const [finalUser] = await sql`
      select
        account.*,
        array_agg(account_project.project_id) as project_ids
    from account 
        left join account_project on account.id = account_project.account_id
    where account.email = ${email} 
    group by account.id
    `;

  recordAuditLog("team_member", "invite", ctx, finalUser.id);

  const link = org.samlEnabled
    ? process.env.APP_URL
    : `${process.env.APP_URL}/join?token=${token}`;

  if (!org.samlEnabled) {
    await sendEmail(INVITE_EMAIL(email, org.name, link));
  }

  ctx.status = 201;
  ctx.body = { user: finalUser };
});

users.delete(
  "/:userId",
  checkAccess("teamMembers", "delete"),
  async (ctx: Context) => {
    const { userId: userToDeleteId } = ctx.params;
    const { userId: currentUserId, orgId } = ctx.state;

    const [currentUser] =
      await sql`select * from account where id = ${currentUserId}`;

    const [userToDelete] =
      await sql`select * from account where id = ${userToDeleteId}`;

    if (!["owner", "admin"].includes(currentUser.role)) {
      ctx.throw(
        401,
        "You must be an owner or an admin to remove a user from your team",
      );
    }

    if (currentUser.orgId !== userToDelete.orgId) {
      ctx.throw(401, "Forbidden");
    }

    await sql`delete from account where id = ${userToDeleteId}`;

    recordAuditLog("team_member", "remove_from_team", ctx, userToDeleteId);

    ctx.status = 200;
    ctx.body = {};
  },
);

users.patch(
  "/:userId",
  checkAccess("teamMembers", "update"),
  async (ctx: Context) => {
    const UpdateUserSchema = z.object({
      projects: z.array(z.string()).min(1),
      role: z.enum(Object.keys(roles) as [string, ...string[]]),
    });
    const { userId } = ctx.params;
    const { userId: currentUserId, orgId } = ctx.state;

    const { projects, role } = UpdateUserSchema.parse(ctx.request.body);

    const [{ plan }] =
      await sql`select plan, eval_allowance from org where id = ${orgId}`;

    if (["free", "pro", "team", "unlimited"].includes(plan)) {
      ctx.throw(
        403,
        "You must be an enterprise customer to change a user role",
      );
    }

    for (const projectId of projects) {
      const [project] =
        await sql`select org_id from project where id = ${projectId}`;
      if (project.orgId !== orgId) {
        ctx.throw(
          403,
          "Unauthorized: Project does not belong to the specified organization",
        );
      }
    }

    const [currentUser] =
      await sql`select * from account where id = ${currentUserId}`;

    if (!["owner", "admin"].includes(currentUser.role)) {
      ctx.throw(403, "You do not have permission to modify this user");
    }

    if (role === "billing" && currentUser.role !== "owner") {
      ctx.throw(
        403,
        "Only owners can add billing members to the organization.",
      );
    }

    const [userToModify] =
      await sql`select * from account where id = ${userId}`;

    if (!userToModify || userToModify.orgId !== currentUser.orgId) {
      ctx.throw(404, "User not found in your organization");
    }

    if (role === "owner") {
      await sql`update account set role = ${"admin"} where id = ${currentUserId}`;
    }

    await sql`update account set role = ${role} where id = ${userId}`;

    const existingProjects = await sql`
      select project_id from account_project where account_id = ${userId}
    `;

    const existingProjectIds = existingProjects.map((row) => row.projectId);

    const projectsToDelete = existingProjectIds.filter(
      (projectId) => !projects.includes(projectId),
    );

    for (const projectId of projectsToDelete) {
      await sql`
        delete from account_project
        where account_id = ${userId} and project_id = ${projectId}
      `;
    }

    for (const projectId of projects) {
      await sql`
        insert into account_project (account_id, project_id)
        values (${userId}, ${projectId})
        on conflict (account_id, project_id)
        do nothing
      `;
    }

    recordAuditLog("team_member", "update", ctx, userId);

    ctx.status = 200;
    ctx.body = { message: "User updated successfully" };
  },
);

users.post("/invitation", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email().transform(sanitizeEmail),
    role: z.enum(Object.keys(roles) as [string, ...string[]]),
    projects: z.array(z.string()).min(1),
  });
  const { email, role, projects } = bodySchema.parse(ctx.request.body);
  const { orgId } = ctx.state;

  const tokenExpiry = 60 * 60 * 24 * 15;
  const [user] = await sql`select role from account where email = ${email}`;

  const token = await signJWT(
    { email, orgId, role, projects, oldRole: user?.role },
    tokenExpiry,
  );

  await sql`
    insert into org_invitation (email, org_id, role, token)
    values (${email}, ${orgId}, ${role}, ${token})
  `;

  const [existing] =
    await sql`select id from account where lower(email)=lower(${email}) and org_id = ${orgId}`;

  if (existing) {
    ctx.throw(400, "This user is already part of your Organization.");
  }

  const [org] =
    await sql`select name, saml_enabled from org where id = ${orgId}`;

  const link = org.samlEnabled
    ? process.env.APP_URL!
    : `${process.env.APP_URL}/join?token=${token}`;

  if (!org.samlEnabled) {
    await sendEmail(INVITE_EMAIL(email, org.name!, link));
  }

  recordAuditLog("team_member", "invite", ctx);

  ctx.body = {};
});

users.delete("/invitation/:id", async (ctx: Context) => {
  const { id } = ctx.params;
  const { orgId } = ctx.state;
  await sql`delete from org_invitation where id = ${id} and org_id = ${orgId}`;
  ctx.status = 200;
  ctx.body = {};
});

export default users;
