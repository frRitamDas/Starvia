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
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={signedIn} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
