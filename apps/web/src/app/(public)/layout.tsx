import type { ReactNode } from "react";
import { AppFrame } from "@/components/layout/app-frame";
import { SiteHeader } from "@/components/layout/site-header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col">
        <AppFrame variant="game" compactTop>
          {children}
        </AppFrame>
      </main>
    </>
  );
}
