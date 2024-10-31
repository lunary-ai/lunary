import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import { sendSlackMessage } from "@/src/utils/notifications";
import Router from "koa-router";
import { z } from "zod";
import { signJWT } from "./utils";

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
  });

  const { accessToken } = bodySchema.parse(ctx.request.body);

  const userData = await getGoogleUserInfo(accessToken).catch(() =>
    ctx.throw(400, "Failed to verify Google account"),
  );

  if (!userData.email || !userData.verified) {
    ctx.throw(400, "Invalid email or unverified account");
  }

  const [existingUser] =
    await sql`select * from account where email = ${userData.email}`;

  if (existingUser) {
    await sql`
        update account 
        set 
          last_login_at = now(),
          avatar_url = coalesce(${userData.picture}, avatar_url)
        where 
          id = ${existingUser.id}
      `;

    const jwt = await signJWT({
      userId: existingUser.id,
      email: existingUser.email,
      orgId: existingUser.orgId,
    });

    ctx.body = { token: jwt };
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

  ctx.body = { token, isNewUser: true };
});

export default google;
