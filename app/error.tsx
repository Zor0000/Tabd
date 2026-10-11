"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>A small interruption.</h1>
        <p>
          Tabd couldn’t load this page. Check your connection and try again.
        </p>
        <div style={{ marginTop: 24 }}>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </main>
  );
}
