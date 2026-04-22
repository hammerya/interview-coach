import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getAuthedClient } from "@/lib/supabase/server";
import { MockRunner } from "./runner";
import type { GeneratedQuestion, InterviewTarget, MockInterview } from "@/lib/types";

export default async function MockRunPage({
  params,
}: {
  params: Promise<{ id: string; mockId: string }>;
}) {
  const { id, mockId } = await params;
  const { supabase, user, configured } = await getAuthedClient();
  if (!configured) redirect("/");
  if (!user || !supabase) redirect(`/sign-in?next=/targets/${id}/mock/${mockId}`);

  const { data: mockRow } = await supabase
    .from("mock_interviews")
    .select("*")
    .eq("id", mockId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mockRow) notFound();
  const mock = mockRow as MockInterview;

  if (mock.completed) {
    redirect(`/targets/${id}/mock/${mockId}/results`);
  }

  const { data: targetRow } = await supabase
    .from("interview_targets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!targetRow) notFound();
  const target = targetRow as InterviewTarget;

  // Reconcile selected questions with the target's question list
  const byId = new Map((target.questions ?? []).map((q) => [q.id, q]));
  const selected: GeneratedQuestion[] = mock.answers
    .map((a) => byId.get(a.questionId))
    .filter((q): q is GeneratedQuestion => !!q);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <MockRunner
          targetId={id}
          mock={mock}
          questions={selected}
          companyName={target.company_name}
          jobTitle={target.job_title}
        />
      </main>
    </>
  );
}
