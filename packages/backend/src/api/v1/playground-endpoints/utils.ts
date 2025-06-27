import crypto from "crypto";

interface BearerAuth {
  type: "bearer";
  token: string;
}

interface ApiKeyAuth {
  type: "api_key";
  key: string;
}

interface BasicAuth {
  type: "basic";
  username?: string;
  password: string;
}

type AuthData = BearerAuth | ApiKeyAuth | BasicAuth;

interface EncryptedBearerAuth {
  type: "bearer";
  token: string;
}

interface EncryptedApiKeyAuth {
  type: "api_key";
  key: string;
}

interface EncryptedBasicAuth {
  type: "basic";
  username?: string;
  password: string;
}

type EncryptedAuthData =
  | EncryptedBearerAuth
  | EncryptedApiKeyAuth
  | EncryptedBasicAuth;

export function encrypt(text: string): string {
  const algorithm = "aes-256-gcm";
  const key = crypto
    .createHash("sha256")
    .update(process.env.JWT_SECRET || "")
    .digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

export function decrypt(text: string): string {
  const algorithm = "aes-256-gcm";
  const key = crypto
    .createHash("sha256")
    .update(process.env.JWT_SECRET || "")
    .digest();

  const parts = text.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const authTag = Buffer.from(parts.shift()!, "hex");
  const encrypted = parts.join(":");

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export const encryptAuth = (
  auth: AuthData | null,
): EncryptedAuthData | null => {
  if (!auth) return null;

  switch (auth.type) {
    case "bearer":
      return {
        ...auth,
        token: encrypt(auth.token),
      };
    case "api_key":
      return {
        ...auth,
        key: encrypt(auth.key),
      };
    case "basic":
      return {
        ...auth,
        password: encrypt(auth.password),
      };
  }
};

export const decryptAuth = (
  auth: EncryptedAuthData | null,
): AuthData | null => {
  if (!auth) return null;

  try {
    switch (auth.type) {
      case "bearer":
        return {
          ...auth,
          token: decrypt(auth.token),
        };
      case "api_key":
        return {
          ...auth,
          key: decrypt(auth.key),
        };
      case "basic":
        return {
          ...auth,
          password: decrypt(auth.password),
        };
    }
  } catch (error) {
    console.error("Failed to decrypt auth data:", error);
    switch (auth.type) {
      case "bearer":
        return {
          ...auth,
          token: "****",
        };
      case "api_key":
        return {
          ...auth,
          key: "****",
        };
      case "basic":
        return {
          ...auth,
          password: "****",
        };
    }
  }
};
