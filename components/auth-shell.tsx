import { SupportLinks } from "@/components/support-links";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthWordmark } from "@/components/auth-wordmark";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-split">
      <AuthWordmark />
      <section className="auth-account" aria-label={title}>
        <Link href="/preview" className="auth-back">
          Explore preview <ArrowRight size={14} />
        </Link>
        <div className="auth-account-inner">
          <Link href="/" className="brand">
            tabd<span className="brand-period">.</span>
          </Link>
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
        </div>
        <div className="auth-account-footer">
          <SupportLinks />
        </div>
      </section>
    </main>
  );
}
