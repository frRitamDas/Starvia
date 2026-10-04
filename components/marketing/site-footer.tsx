import Link from "next/link";
import { Instagram, Mail, ShieldCheck } from "lucide-react";

import { StarviaLogo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-muted/25">
      <div className="container py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <StarviaLogo />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {siteConfig.shortDescription}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="gap-1.5">
                <ShieldCheck className="size-3.5" />
                {siteConfig.version}
              </Badge>
              <Badge variant="secondary">Made in India 🇮🇳</Badge>
            </div>
          </div>

          <FooterColumn title="Product" links={[...siteConfig.footerLinks.product]} />
          <FooterColumn title="Company" links={[...siteConfig.footerLinks.company]} />
          <FooterColumn title="Legal" links={[...siteConfig.footerLinks.legal]} />
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-border/70 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>
              Founded by{" "}
              <span className="font-medium text-foreground">{siteConfig.founder}</span>
              {" · "}
              <a
                href={siteConfig.instagram}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary"
              >
                <Instagram className="size-4" />
                {siteConfig.instagramHandle}
              </a>
            </p>
            <p className="flex items-center gap-1.5">
              <Mail className="size-4" />
              <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-foreground">
                {siteConfig.supportEmail}
              </a>
            </p>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground lg:max-w-md lg:text-right">
            © {year} {siteConfig.name} · All rights reserved.
            <br />
            AI answers can be imperfect — always cross-check with your textbook. Starvia supports
            learning, it does not replace your teacher.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { title: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
