import { signJWT } from "@/src/api/v1/auth/utils";
import { sendEmail } from "./sender";
import { CONFIRM_EMAIL } from "./templates";
import config from "../utils/config";

function sanitizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

export function extractFirstName(name: string): string {
  if (!name) return "there";
  const sanitizedName = sanitizeName(name);
  return sanitizedName.split(" ")[0];
}

export async function sendVerifyEmail(email: string, name: string = "") {
  const token = await signJWT({ email });

  const confirmLink = `${process.env.APP_URL}/verify-email?token=${token}`;

  if (config.IS_CLOUD) {
    await sendEmail(CONFIRM_EMAIL(email, name, confirmLink));
    console.info("[EMAIL] Sent verification email to", email);
  }
}
