import Link from "next/link";

export function SupportLinks() {
  return (
    <nav aria-label="Privacy and support" className="support-links">
      <Link href="/privacy">Privacy</Link>
      <Link href="/support">Support</Link>
    </nav>
  );
}
