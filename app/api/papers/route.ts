import { NextResponse } from "next/server";
import { searchStudyPapers } from "@/lib/data/papers";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const papers = searchStudyPapers({
    q: url.searchParams.get("q") ?? "",
    board: url.searchParams.get("board") ?? "all",
    classLevel: url.searchParams.get("classLevel") ?? "all",
    subject: url.searchParams.get("subject") ?? "all",
    year: url.searchParams.get("year") ?? "all",
    type: url.searchParams.get("type") ?? "all",
  });

  return NextResponse.json(
    { papers, total: papers.length },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
