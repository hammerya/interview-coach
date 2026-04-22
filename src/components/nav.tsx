import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { Sparkles } from "lucide-react";

export async function Nav() {
  const user = await getCurrentUser();

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-background)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="display text-xl font-semibold">Interview Coach</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {!user ? (
            <div className="hidden sm:flex items-center gap-1">
              <Link href="/process">
                <Button variant="ghost" size="sm">
                  Our process
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="ghost" size="sm">
                  About
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="ghost" size="sm">
                  Pricing
                </Button>
              </Link>
            </div>
          ) : null}
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
