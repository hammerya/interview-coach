import Link from "next/link";
import { Suspense } from "react";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "./form";

export default function SignInPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Pick up where you left off.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <SignInForm />
            </Suspense>
            <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
              New here?{" "}
              <Link className="text-[var(--color-primary)] font-medium" href="/sign-up">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
