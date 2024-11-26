import sql from "@/src/utils/db";
import { sendSlackMessage } from "@/src/utils/notifications";
import { signJWT } from "./utils";
import Router from "koa-router";
import { z } from "zod";
import Context from "@/src/utils/koa";

const github = new Router({
  prefix: "/github",
});

async function getGithubUserInfo(accessToken: string) {
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const emailResponse = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userResponse.ok || !emailResponse.ok) {
    throw new Error(`Github API error: ${emailResponse.statusText}`);
  }

  const userData = await userResponse.json();
  console.log(userData);
  const emails = await emailResponse.json();

  const email = emails?.find((email: any) => email.primary);

  return {
    email: email.email,
    name: userData.name,
    avatar_url: userData.avatar_url,
    verified: email.verified,
  };
}

github.post("/", async (ctx: Context) => {
  const { accessToken } = z
    .object({ accessToken: z.string() })
    .parse(ctx.request.body);

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: accessToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Github API error: ${response.statusText}`);
  }

  const data = await response.json();

  const { access_token, error } = data;

  if (error) {
    ctx.throw(500, data.error_description);
  }

  const userData = await getGithubUserInfo(access_token);

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
          avatar_url = coalesce(${userData.avatar_url}, avatar_url)
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
        insert into org ${sql({ name: `${userData.name}'s Org`, plan })} returning *`;

    const [user] = await sql`
        insert into account ${sql({
          name: userData.name,
          email: userData.email,
          orgId: org.id,
          role: "owner",
          verified: true,
          avatarUrl: userData.avatar_url,
          lastLoginAt: new Date(),
        })} 
        returning *`;

    const [project] = await sql`
        insert into project ${sql({
          name: "My First Project",
          orgId: org.id,
        })} 
        returning *`;

    await sql`
        insert into account_project ${sql({ accountId: user.id, projectId: project.id })}
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
    `🔔 New Github signup from ${userData.email}
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

export default github;
