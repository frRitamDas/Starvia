import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TutorialView } from "@/components/learn/tutorial-view";
import { getTutorial } from "@/lib/data/tutorials";
import { requireOnboarded } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const context = await requireOnboarded().catch(() => null);
  if (!context) return { title: "Tutorial", robots: { index: false, follow: false } };

  const tutorial = await getTutorial(context, id);
  return {
    title: tutorial?.title ?? "Tutorial",
    description: tutorial?.content?.introduction?.slice(0, 150),
    robots: { index: false, follow: false },
  };
}

export default async function TutorialPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireOnboarded();
  const { id } = await params;

  const tutorial = await getTutorial(context, id);
  if (!tutorial) notFound();

  return <TutorialView tutorial={tutorial} />;
}
