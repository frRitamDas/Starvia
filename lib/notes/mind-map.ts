import type { StudyMindMap } from "@/lib/types";

/**
 * Demo-only outline builder. It rearranges material already present in a note
 * and never invents curriculum facts while AI credentials are not configured.
 */
export function buildDemoMindMap(title: string, content: string): StudyMindMap {
  const sections: { title: string; details: string[] }[] = [];
  let current: { title: string; details: string[] } | null = null;
  const plainLines: string[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading?.[1]) {
      if (current) sections.push(current);
      current = { title: heading[1].trim(), details: [] };
      continue;
    }

    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    const value = bullet?.[1]?.trim() ?? line;
    if (!heading && current) current.details.push(value);
    else plainLines.push(value);
  }
  if (current) sections.push(current);

  const root = title.trim() || sections[0]?.title || "Study note";
  const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const rootKey = normalise(root);
  let branches = sections
    .filter((section) => normalise(section.title) !== rootKey)
    .map((section) => ({
      title: section.title,
      details: unique(section.details).slice(0, 4),
    }))
    .filter((section) => section.details.length > 0);

  const sentences = unique(
    [...plainLines, ...content.split(/(?<=[.!?])\s+/)]
      .map((line) => line.replace(/^#{1,3}\s+|^(?:[-*•]|\d+[.)])\s+/, "").trim())
      .filter((line) => line.length >= 18 && normalise(line) !== rootKey),
  );

  for (const sentence of sentences) {
    if (branches.length >= 6) break;
    if (branches.some((branch) => branch.details.includes(sentence))) continue;
    branches.push({
      title: `Key idea ${branches.length + 1}`,
      details: [sentence.slice(0, 180)],
    });
  }

  if (branches.length === 0) {
    branches = [
      { title: "Main idea", details: [root] },
      { title: "Key terms", details: ["Add a few headings or bullets to organise this note."] },
      { title: "Next step", details: ["Add one example or question you want to remember."] },
    ];
  } else if (branches.length < 3) {
    branches.push({
      title: "Quick recall",
      details: [sentences[branches.length] ?? `Review the key points in ${root}.`],
    });
  }

  return { root, branches: branches.slice(0, 7) };
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
