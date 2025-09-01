import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import { sendSlackMessage } from "@/src/utils/notifications";
import Router from "koa-router";
import { z } from "zod";
import { signJWT, verifyJWT } from "./utils";
import config from "@/src/utils/config";

const google = new Router({
  prefix: "/google",
});

async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.statusText}`);
  }

  const data = await response.json();

  console.log("\n\n\nGOOGLE DATA:");
  console.log(data);
  console.log(config);
  console.log("\n\n\n");
  if (data.aud !== config.GOOGLE_CLIENT_ID) {
    console.error("Invalid audience");
    throw new Error("Invalid audience");
  }

  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
    verified: data.email_verified,
  };
}

google.post("/", async (ctx: Context) => {
  const bodySchema = z.object({
    accessToken: z.string(),
    joinToken: z.string().optional(),
  });

  const { accessToken, joinToken } = bodySchema.parse(ctx.request.body);

  const userData = await getGoogleUserInfo(accessToken).catch(() =>
    ctx.throw(400, "Failed to verify Google account"),
  );

  if (!userData.email || !userData.verified) {
    ctx.throw(400, "Invalid email or unverified account");
  }

  if (joinToken) {
    const { payload } = await verifyJWT(joinToken);

    if (payload.email !== userData.email) {
      ctx.throw(403, "Invalid token");
    }

    // user already owner of an org
    if (payload.oldRole === "owner") {
      const [user] =
        await sql`select * from account where email = ${userData.email}`;
      const [org] = await sql`select * from org where id = ${user.orgId}`;
      await sql`delete from org where id = ${org.id}`;

      const newUser = {
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.picture,
        orgId: payload.orgId as string,
        role: payload.role as string,
        verified: true,
        lastLoginAt: new Date(),
      };

      const [createdUser] =
        await sql`insert into account ${sql(newUser)} returning *`;
      await sql`delete from org_invitation where email = ${userData.email}`;

      for (const projectId of payload.projects as string[]) {
        await sql`insert into account_project ${sql({ accountId: createdUser.id, projectId })}`;
      }

      const authToken = await signJWT({
        userId: createdUser.id,
        email: createdUser.email,
        orgId: createdUser.orgId,
      });
      ctx.body = { token: authToken };
      return;
    }

    // user is part of an org, but not owner
    if (payload.oldRole && payload.oldRole !== "owner") {
      const [user] =
        await sql`select * from account where email = ${userData.email}`;
      await sql`delete from account where id = ${user.id}`;

      const newUser = {
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.picture,
        orgId: payload.orgId as string,
        role: payload.role as string,
        verified: true,
        lastLoginAt: new Date(),
      };

      const [createdUser] =
        await sql`insert into account ${sql(newUser)} returning *`;
      await sql`delete from org_invitation where email = ${userData.email}`;

      for (const projectId of payload.projects as string[]) {
        await sql`insert into account_project ${sql({ accountId: createdUser.id, projectId })}`;
      }
      const authToken = await signJWT({
        userId: createdUser.id,
        email: createdUser.email,
        orgId: createdUser.orgId,
      });
      ctx.body = { token: authToken };
      return;
    }

    const newUser = {
      name: userData.name,
      email: userData.email,
      avatarUrl: userData.picture,
      orgId: payload.orgId as string,
      role: payload.role as string,
      verified: true,
      lastLoginAt: new Date(),
    };

    const [createdUser] =
      await sql`insert into account ${sql(newUser)} returning *`;
    await sql`delete from org_invitation where email = ${userData.email}`;

    for (const projectId of payload.projects as string[]) {
      await sql`insert into account_project ${sql({ accountId: createdUser.id, projectId })}`;
    }

    const authToken = await signJWT({
      userId: createdUser.id,
      email: createdUser.email,
      orgId: createdUser.orgId,
    });
    ctx.body = { token: authToken };
    return;
  }

  const [existingUser] =
    await sql`select * from account where email = ${userData.email}`;

  if (existingUser) {
    await sql`
        update account 
        set 
          last_login_at = now(),
          avatar_url = coalesce(${userData.picture}, avatar_url),
          verified = ${true}
        where 
          id = ${existingUser.id}
      `;

    const jwt = await signJWT({
      userId: existingUser.id,
      email: existingUser.email,
      orgId: existingUser.orgId,
    });

    ctx.body = { token: jwt, isNewUser: false };
    return;
  }

  const { user, org } = await sql.begin(async (sql) => {
    const plan = process.env.DEFAULT_PLAN || "free";

    const [org] = await sql`
        insert into org ${sql({
          name: `${userData.name}'s Org`,
          plan,
        })} 
        returning *
      `;

    const [user] = await sql`
        insert into account ${sql({
          name: userData.name,
          email: userData.email,
          orgId: org.id,
          role: "owner",
          verified: true,
          avatarUrl: userData.picture,
          lastLoginAt: new Date(),
        })} 
        returning *
      `;

    const [project] = await sql`
        insert into project ${sql({
          name: "My First Project",
          orgId: org.id,
        })} 
        returning *
      `;

    await sql`
        insert into account_project ${sql({
          accountId: user.id,
          projectId: project.id,
        })}
      `;

    const publicKey = {
      type: "public",
      projectId: project.id,
      apiKey: project.id,
    };
    await sql`insert into api_key ${sql(publicKey)}`;

    const privateKey = {
      type: "private",
      projectId: project.id,
    };
    await sql`insert into api_key ${sql(privateKey)}`;

    return { user, org };
  });

  await sendSlackMessage(
    `🔔 New Google signup from ${userData.email}
      ${userData.name} created a new account.`,
    "users",
  );

  const token = await signJWT({
    userId: user.id,
    email: user.email,
    orgId: org.id,
  });

  ctx.body = { token, isNewUser: true, email: user.email, name: userData.name };
});

export default google;
