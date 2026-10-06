"use client";

import * as React from "react";
import { ExternalLink, FileText, Filter, Search, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STUDY_PAPERS, type StudyPaper } from "@/lib/data/papers";

const STORAGE_KEY = "starvia-saved-papers";

export function PaperFinder({ initialBoard, initialClass }: { initialBoard?: string | null; initialClass?: string | null }) {
   const [q, setQ] = React.useState("");
  const [board, setBoard] = React.useState(initialBoard ?? "all");
  const [classLevel, setClassLevel] = React.useState(initialClass ?? "all");
  const [subject, setSubject] = React.useState("all");
  const [year, setYear] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [savedOnly, setSavedOnly] = React.useState(false);
  const [saved, setSaved] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw) as string[]);
    } catch { /* local-only enhancement; ignore malformed storage */ }
  }, []);

  const visible = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return STUDY_PAPERS.filter((paper) => {
      if (board !== "all" && paper.board !== board) return false;
      if (classLevel !== "all" && paper.classLevel !== classLevel) return false;
      if (subject !== "all" && paper.subject !== subject) return false;
      if (year !== "all" && String(paper.year) !== year) return false;
      if (type !== "all" && paper.type !== type) return false;
      if (savedOnly && !saved.includes(paper.id)) return false;
      if (!query) return true;
      return [paper.title, paper.description, paper.subject, paper.board, paper.sourceLabel, ...paper.tags]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [board, classLevel, q, saved, savedOnly, subject, type, year]);

  function toggleSaved(id: string) {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      toast.success(current.includes(id) ? "Removed from saved papers." : "Saved to this device.");
      return next;
    });
  }

  const subjects = Array.from(new Set(STUDY_PAPERS.map((paper) => paper.subject))).sort();
  const years = Array.from(new Set(STUDY_PAPERS.map((paper) => String(paper.year)))).sort().reverse();

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="relative border-b border-border/70 p-5 sm:p-6">
          <div className="absolute inset-0 surface-grid opacity-60" aria-hidden />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gradient" className="gap-1.5"><Sparkles className="size-3.5" /> Exam intelligence</Badge>
              <Badge variant="outline">Official sources first</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold sm:text-2xl">Find a paper. Then turn it into practice.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Start with official board archives and specimen papers. Open the source paper, then use Starvia&apos;s photo or text solver for the questions you are stuck on.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5">Board & specimen</span>
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5">Saved on this device</span>
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5">AI solve workflow</span>
            </div>
          </div>
        </div>
        <CardContent className="space-y-3 pt-4">
          <div className="grid gap-2 md:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input value={q} onChange={(event) => setQ(event.target.value)} className="pl-9" placeholder="Search subject, year or paper..." inputMode="search" />
            </div>
            <Select value={board} onValueChange={setBoard}><SelectTrigger><SelectValue placeholder="Board" /></SelectTrigger><SelectContent><SelectItem value="all">All boards</SelectItem><SelectItem value="CBSE">CBSE</SelectItem><SelectItem value="ICSE">ICSE</SelectItem></SelectContent></Select>
            <Select value={classLevel} onValueChange={setClassLevel}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent><SelectItem value="all">All classes</SelectItem>{["6","7","8","9","10","11","12"].map((value)=><SelectItem key={value} value={value}>Class {value}</SelectItem>)}</SelectContent></Select>
            <Select value={subject} onValueChange={setSubject}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent><SelectItem value="all">All subjects</SelectItem>{subjects.map((value)=><SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
            <Select value={year} onValueChange={setYear}><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger><SelectContent><SelectItem value="all">All years</SelectItem>{years.map((value)=><SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
            <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{["Board","Specimen"].map((value)=><SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground"><Filter className="size-3.5" /> ${visible.length} ${visible.length === 1 ? "paper" : "papers"}</div>
            <Button type="button" size="sm" variant={savedOnly ? "secondary" : "ghost"} onClick={() => setSavedOnly((value) => !value)}>
              <Star className={savedOnly ? "size-4 fill-current" : "size-4"} /> {savedOnly ? "Showing saved" : "Saved papers"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {visible.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center"><FileText className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No matching papers</p><p className="mt-1 text-xs text-muted-foreground">Try another board, year or subject.</p></CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((paper, index) => (
            <Card key={paper.id} className="interactive-card page-enter" style={{ animationDelay: `${Math.min(index,8) * 35}ms` }}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileText className="size-5" /></div>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={saved.includes(paper.id) ? "Remove from saved" : "Save paper"} onClick={() => toggleSaved(paper.id)}>
                    <Star className={saved.includes(paper.id) ? "size-4 fill-current" : "size-4"} />
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge variant="outline">{paper.board}</Badge>
                  <Badge variant="secondary">Class {paper.classLevel}</Badge>
                  <Badge variant="secondary">{paper.year}</Badge>
                  <Badge variant={paper.type === "Board" ? "success" : "outline"}>{paper.type}</Badge>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold leading-5">{paper.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{paper.description}</p>
                <p className="mt-3 text-[11px] text-muted-foreground">{paper.sourceLabel}</p>
                <div className="mt-auto flex gap-2 pt-5">
                  <Button asChild size="sm" className="min-w-0" variant="outline"><a href={paper.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Open paper</a></Button>
                  <Button asChild size="sm" className="min-w-0" variant="gradient"><Link href="/solve"><Sparkles className="size-3.5" /> Solve with AI</Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Have a school pre-board?</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                Starvia already solves question photos. Take a clear photo of any pre-board question and get a class-aware step-by-step explanation, then practise a similar question.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0"><Link href="/solve">Open question solver <Sparkles className="size-4" /></Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
