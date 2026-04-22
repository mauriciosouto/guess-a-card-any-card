import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it } from "vitest";

import {
  __resetRemoteJwksCacheForTests,
  verifySupabaseAccessToken,
} from "@/server/auth/supabase-jwt";

const ISSUER = "https://test-project.supabase.co/auth/v1";
const SUB = "11111111-1111-4111-8111-111111111111";

describe("verifySupabaseAccessToken (local JWKS)", () => {
  afterEach(() => {
    __resetRemoteJwksCacheForTests();
  });

  it("accepts a valid ES256 token signed with keys from a local JWKS", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256", {
      extractable: true,
    });
    const jwk = await exportJWK(publicKey);
    jwk.kid = "unit-test-kid";
    const getKey = createLocalJWKSet({ keys: [jwk] });

    const token = await new SignJWT({ sub: SUB, email: "u@example.com" })
      .setProtectedHeader({ alg: "ES256", kid: "unit-test-kid" })
      .setIssuer(ISSUER)
      .setAudience("authenticated")
      .setExpirationTime("1h")
      .sign(privateKey);

    const out = await verifySupabaseAccessToken(token, {
      getKey,
      issuer: ISSUER,
      audience: "authenticated",
    });

    expect(out).toEqual({ sub: SUB, email: "u@example.com" });
  });

  it("returns null for wrong issuer", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256", {
      extractable: true,
    });
    const jwk = await exportJWK(publicKey);
    jwk.kid = "kid2";
    const getKey = createLocalJWKSet({ keys: [jwk] });

    const token = await new SignJWT({ sub: SUB })
      .setProtectedHeader({ alg: "ES256", kid: "kid2" })
      .setIssuer("https://evil.example/auth/v1")
      .setAudience("authenticated")
      .setExpirationTime("1h")
      .sign(privateKey);

    const out = await verifySupabaseAccessToken(token, {
      getKey,
      issuer: ISSUER,
      audience: "authenticated",
    });

    expect(out).toBeNull();
  });
});
