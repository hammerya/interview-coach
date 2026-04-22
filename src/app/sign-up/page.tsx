import Link from "next/link";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from "./form";

export default function SignUpPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Let's get you set up</CardTitle>
            <CardDescription>
              Create an account to save your progress, question lists, and mock interview history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignUpForm />
            <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
              Already have an account?{" "}
              <Link className="text-[var(--color-primary)] font-medium" href="/sign-in">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
