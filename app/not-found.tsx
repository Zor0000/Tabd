import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>This page wandered off.</h1>
        <p>Your library is still right where you left it.</p>
        <Button asChild>
          <Link href="/">Back to your library</Link>
        </Button>
      </div>
    </main>
  );
}
