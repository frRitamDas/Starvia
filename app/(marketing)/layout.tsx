import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSessionContext } from "@/lib/session";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext().catch(() => null);
  const signedIn = Boolean(session?.user && (session.onboarded || session.demo));

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip">
      <SiteHeader signedIn={signedIn} />
      <main id="main" className="min-w-0 flex-1 pt-[calc(4rem+env(safe-area-inset-top))]">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
