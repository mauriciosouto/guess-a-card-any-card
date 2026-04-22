import Link from "next/link";
import { LoginPanel } from "@/components/auth/login-panel";
import { RouteShell } from "@/components/layout/route-shell";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = (await searchParams) ?? {};
  const err = sp.error;

  return (
    <RouteShell
      title="Sign in"
      description="Optional account — guest play stays available everywhere."
    >
      {err === "auth" ? (
        <p className="mb-4 rounded-md border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-200/95">
          Sign-in could not be completed. Try again or use a magic link.
        </p>
      ) : null}
      {err === "config" ? (
        <p className="mb-4 rounded-md border border-amber-400/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100/95">
          Sign-in is temporarily unavailable. Please try again later.
        </p>
      ) : null}

      <LoginPanel variant="page" className="max-w-md" />

      <p className="mt-8 text-center text-sm text-[var(--mist)]">
        <Link href="/" className="text-[var(--gold-bright)] underline-offset-2 hover:underline">
          Back to home
        </Link>
      </p>
    </RouteShell>
  );
}
