import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getAuthedClient } from "@/lib/supabase/server";
import { NewMockForm } from "./form";
import type { InterviewTarget } from "@/lib/types";

export default async function NewMockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, configured } = await getAuthedClient();
  if (!configured) redirect("/");
  if (!user || !supabase) redirect(`/sign-in?next=/targets/${id}/mock/new`);

  const { data: target } = await supabase
    .from("interview_targets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!target) notFound();
  const t = target as InterviewTarget;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <span className="text-sm font-medium text-[var(--color-primary)]">
            Section 3 of 3
          </span>
          <h1 className="display mt-2 text-4xl font-semibold">
            Let's set up your practice interview
          </h1>
          <p className="mt-3 text-[var(--color-muted-foreground)] leading-relaxed">
            Pick a length and an interviewer style. You can do this as many times as you want —
            each attempt is saved so you can track your progress.
          </p>
        </div>
        <NewMockForm targetId={t.id} questions={t.questions ?? []} />
      </main>
    </>
  );
}
