import * as jose from "jose";

export type VerifiedAccessToken = {
  sub: string;
  email: string | null;
  /** OAuth provider avatar (avatar_url / picture from user_metadata). */
  avatarUrl: string | null;
};

function getJwksUrl(): string | null {
  const explicit = process.env.SUPABASE_JWKS_URL?.trim();
  if (explicit) return explicit;
  const base = process.env.SUPABASE_URL?.trim();
  if (!base) return null;
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  return new URL("/auth/v1/.well-known/jwks.json", normalized).toString();
}

function getIssuer(): string | null {
  const iss = process.env.SUPABASE_JWT_ISSUER?.trim();
  if (iss) return iss;
  const base = process.env.SUPABASE_URL?.trim();
  if (!base) return null;
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  const u = new URL(normalized);
  return `${u.origin}/auth/v1`;
}

function getAudience(): string | undefined {
  const a = process.env.SUPABASE_JWT_AUDIENCE?.trim();
  if (a === "") return undefined;
  return a ?? "authenticated";
}

let remoteJwks: jose.JWTVerifyGetKey | null = null;

function getRemoteJwks(): jose.JWTVerifyGetKey | null {
  const url = getJwksUrl();
  if (!url) return null;
  if (!remoteJwks) {
    remoteJwks = jose.createRemoteJWKSet(new URL(url));
  }
  return remoteJwks;
}

export type VerifySupabaseJwtDeps = {
  getKey: jose.JWTVerifyGetKey;
  issuer: string;
  audience?: string;
};

/**
 * Verifies a Supabase Auth access token using JWKS (cached by jose).
 * Returns null if verification fails or if JWKS / issuer env is not configured.
 */
export async function verifySupabaseAccessToken(
  rawToken: string,
  deps?: Partial<VerifySupabaseJwtDeps>,
): Promise<VerifiedAccessToken | null> {
  const getKey = deps?.getKey ?? getRemoteJwks();
  if (!getKey) {
    return null;
  }

  const issuer = deps?.issuer ?? getIssuer();
  if (!issuer) {
    return null;
  }

  const audience = deps?.audience ?? getAudience();

  try {
    const { payload } = await jose.jwtVerify(rawToken, getKey, {
      issuer,
      ...(audience ? { audience } : {}),
    });
    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }
    const email = typeof payload.email === "string" ? payload.email : null;
    const meta =
      payload.user_metadata && typeof payload.user_metadata === "object"
        ? (payload.user_metadata as Record<string, unknown>)
        : null;
    const rawAvatar =
      (typeof meta?.avatar_url === "string" ? meta.avatar_url : null) ??
      (typeof meta?.picture === "string" ? meta.picture : null);
    const avatarUrl = rawAvatar && rawAvatar.length > 0 ? rawAvatar : null;
    return { sub: payload.sub, email, avatarUrl };
  } catch {
    return null;
  }
}

/** @internal Test helper */
export function __resetRemoteJwksCacheForTests(): void {
  remoteJwks = null;
}
