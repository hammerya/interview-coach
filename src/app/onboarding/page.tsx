import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getAuthedClient } from "@/lib/supabase/server";
import { IntakeForm } from "./form";
import type { Profile } from "@/lib/types";

export default async function OnboardingPage() {
  const { supabase, user, configured } = await getAuthedClient();
  if (!configured) redirect("/");
  if (!user || !supabase) redirect("/sign-in?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <span className="text-sm font-medium text-[var(--color-primary)]">
            Section 1 of 3
          </span>
          <h1 className="display mt-2 text-4xl font-semibold">
            Let's get to know you
          </h1>
          <p className="mt-3 text-[var(--color-muted-foreground)] leading-relaxed">
            Your answers here shape every question list and practice interview going forward.
            Be honest — there's no wrong answer. You can update any of this later.
          </p>
        </div>
        <IntakeForm profile={(profile as Profile | null) ?? null} />
      </main>
    </>
  );
}
