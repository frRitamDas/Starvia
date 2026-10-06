export type PaperType = "Board" | "Specimen" | "Practice" | "Pre-board";
export type PaperBoard = "CBSE" | "ICSE" | "ISC";

export interface StudyPaper {
  id: string;
  board: PaperBoard;
  classLevel: string;
  year: number;
  type: PaperType;
  subject: string;
  title: string;
  description: string;
  official: boolean;
  sourceLabel: string;
  sourceUrl: string;
  tags: string[];
}

const CBSE_ARCHIVE = "https://www.cbse.gov.in/cbsenew/question-paper.html";
const CBSE_HOME = "https://www.cbse.gov.in/cbsenew/cbse.html";
const CISCE_CIRCULAR = "https://cisce.org/wp-content/uploads/2025/09/Circular-Release-of-Speimen-Question-papers-and-Question-Papers-of-the-Year-2025-Main-and-Improvement-Examinations.pdf";

export const STUDY_PAPERS: StudyPaper[] = [
  { id:"cbse-x-2026-maths", board:"CBSE", classLevel:"10", year:2026, type:"Board", subject:"Mathematics", title:"CBSE Class 10 Mathematics — 2026", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 10","mathematics","2026"] },
  { id:"cbse-x-2026-science", board:"CBSE", classLevel:"10", year:2026, type:"Board", subject:"Science", title:"CBSE Class 10 Science — 2026", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 10","science","2026"] },
  { id:"cbse-x-2026-sst", board:"CBSE", classLevel:"10", year:2026, type:"Board", subject:"Social Science", title:"CBSE Class 10 Social Science — 2026", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 10","social science","2026"] },
  { id:"cbse-x-2025-maths", board:"CBSE", classLevel:"10", year:2025, type:"Board", subject:"Mathematics", title:"CBSE Class 10 Mathematics — 2025", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 10","mathematics","2025"] },
  { id:"cbse-x-2025-science", board:"CBSE", classLevel:"10", year:2025, type:"Board", subject:"Science", title:"CBSE Class 10 Science — 2025", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 10","science","2025"] },
  { id:"cbse-x-2024-maths", board:"CBSE", classLevel:"10", year:2024, type:"Board", subject:"Mathematics", title:"CBSE Class 10 Mathematics — 2024", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 10","mathematics","2024"] },
  { id:"cbse-x-2024-science", board:"CBSE", classLevel:"10", year:2024, type:"Board", subject:"Science", title:"CBSE Class 10 Science — 2024", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 10","science","2024"] },
  { id:"cbse-x-2023-maths", board:"CBSE", classLevel:"10", year:2023, type:"Board", subject:"Mathematics", title:"CBSE Class 10 Mathematics — 2023", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 10","mathematics","2023"] },
  { id:"cbse-xii-2026-physics", board:"CBSE", classLevel:"12", year:2026, type:"Board", subject:"Physics", title:"CBSE Class 12 Physics — 2026", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 12","physics","2026"] },
  { id:"cbse-xii-2026-chemistry", board:"CBSE", classLevel:"12", year:2026, type:"Board", subject:"Chemistry", title:"CBSE Class 12 Chemistry — 2026", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 12","chemistry","2026"] },
  { id:"cbse-xii-2026-maths", board:"CBSE", classLevel:"12", year:2026, type:"Board", subject:"Mathematics", title:"CBSE Class 12 Mathematics — 2026", description:"Official CBSE previous-year question paper archive entry.", official:true, sourceLabel:"CBSE official archive", sourceUrl:CBSE_ARCHIVE, tags:["board","class 12","mathematics","2026"] },
  { id:"icse-x-2026-maths", board:"ICSE", classLevel:"10", year:2026, type:"Specimen", subject:"Mathematics", title:"ICSE Class 10 Mathematics — 2026 Specimen", description:"Official CISCE specimen paper for ICSE 2026.", official:true, sourceLabel:"CISCE official", sourceUrl:"https://cisce.org/wp-content/uploads/2025/11/ICSE-2026-SPECIMEN-511-MAT.pdf", tags:["specimen","class 10","mathematics","2026"] },
  { id:"icse-x-2026-hcg", board:"ICSE", classLevel:"10", year:2026, type:"Specimen", subject:"History & Civics", title:"ICSE Class 10 History & Civics — 2026 Specimen", description:"Official CISCE specimen paper for ICSE 2026.", official:true, sourceLabel:"CISCE official", sourceUrl:"https://cisce.org/wp-content/uploads/2025/07/ICSE-2026-SPECIMEN-501-HCG1.pdf", tags:["specimen","class 10","history","civics","2026"] },
  { id:"icse-x-2026-physics", board:"ICSE", classLevel:"10", year:2026, type:"Specimen", subject:"Physics", title:"ICSE Class 10 Physics — 2026 Specimen", description:"Official CISCE specimen paper for ICSE 2026.", official:true, sourceLabel:"CISCE official", sourceUrl:"https://cisce.org/wp-content/uploads/2025/11/ICSE-2026-SPECIMEN-521-SCI1.pdf", tags:["specimen","class 10","physics","2026"] },
  { id:"icse-x-2026-chemistry", board:"ICSE", classLevel:"10", year:2026, type:"Specimen", subject:"Chemistry", title:"ICSE Class 10 Chemistry — 2026 Specimen", description:"Official CISCE specimen paper for ICSE 2026.", official:true, sourceLabel:"CISCE official", sourceUrl:"https://cisce.org/wp-content/uploads/2025/07/ICSE-2026-SPECIMEN-522-SCI2.pdf", tags:["specimen","class 10","chemistry","2026"] },
  { id:"icse-x-2026-english", board:"ICSE", classLevel:"10", year:2026, type:"Specimen", subject:"English Language", title:"ICSE Class 10 English Language — 2026 Specimen", description:"Official CISCE specimen questions for ICSE 2026.", official:true, sourceLabel:"CISCE official", sourceUrl:"https://cisce.org/wp-content/uploads/2025/07/ICSE-2026-SPECIMEN-011-ENG1.pdf", tags:["specimen","class 10","english","2026"] },
  { id:"icse-x-2026-official-hub", board:"ICSE", classLevel:"10", year:2026, type:"Specimen", subject:"All subjects", title:"ICSE 2026 specimen papers — official release", description:"Official CISCE release covering specimen papers and answer keys across selected subjects.", official:true, sourceLabel:"CISCE official circular", sourceUrl:CISCE_CIRCULAR, tags:["specimen","class 10","official","2026"] },
];

export function searchStudyPapers(input: { q?: string; board?: string; classLevel?: string; subject?: string; year?: string; type?: string }) {
  const q = (input.q ?? "").trim().toLowerCase();
  return STUDY_PAPERS.filter((paper) => {
    if (input.board && input.board !== "all" && paper.board !== input.board) return false;
    if (input.classLevel && input.classLevel !== "all" && paper.classLevel !== input.classLevel) return false;
    if (input.subject && input.subject !== "all" && paper.subject !== input.subject) return false;
    if (input.year && input.year !== "all" && String(paper.year) !== input.year) return false;
    if (input.type && input.type !== "all" && paper.type !== input.type) return false;
    if (!q) return true;
    return [paper.title, paper.description, paper.subject, paper.board, ...paper.tags].join(" ").toLowerCase().includes(q);
  });
}
