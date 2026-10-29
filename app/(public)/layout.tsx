import Link from "next/link";
import { SupportLinks } from "@/components/support-links";
import styles from "./public.module.css";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className="brand" aria-label="Tabd home">
          tabd<span className="brand-period">.</span>
        </Link>
        <SupportLinks />
      </header>
      <main className={styles.content}>{children}</main>
      <footer className={styles.footer}>
        <Link href="/">Back to Tabd</Link>
        <SupportLinks />
      </footer>
    </div>
  );
}
