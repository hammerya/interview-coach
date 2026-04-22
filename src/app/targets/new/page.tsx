import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getAuthedClient } from "@/lib/supabase/server";
import { NewTargetForm } from "./form";

export default async function NewTargetPage() {
  const { supabase, user, configured } = await getAuthedClient();
  if (!configured) redirect("/");
  if (!user || !supabase) redirect("/sign-in?next=/targets/new");

  const { data: profile } = await supabase
    .from("profiles")
    .select("intake_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.intake_completed) {
    redirect("/onboarding");
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <span className="text-sm font-medium text-[var(--color-primary)]">
            Section 2 of 3
          </span>
          <h1 className="display mt-2 text-4xl font-semibold">Where are you interviewing?</h1>
          <p className="mt-3 text-[var(--color-muted-foreground)] leading-relaxed">
            Tell us the company, the role, and (if you know) who's interviewing you.
            We'll research all three and build a tailored question list with reasoning,
            answer formats, and sample answers.
          </p>
        </div>
        <NewTargetForm />
      </main>
    </>
  );
}
