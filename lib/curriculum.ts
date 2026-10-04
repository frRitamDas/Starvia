/**
 * Indian school curriculum reference data.
 *
 * Used for onboarding, generators and forms. Chapter lists are curated starting
 * points (not exhaustive) — students can always type a custom chapter/topic.
 * Keep this file data-only so it can later be moved to Supabase without code churn.
 */

export const BOARDS = [
  {
    id: "CBSE",
    name: "CBSE",
    fullName: "Central Board of Secondary Education",
    note: "NCERT syllabus · Classes 6–12",
  },
  {
    id: "ICSE",
    name: "ICSE / ISC",
    fullName: "Indian Certificate of Secondary Education",
    note: "CISCE syllabus · Classes 6–12",
  },
  {
    id: "STATE",
    name: "State Board",
    fullName: "State Board (SCERT)",
    note: "State-specific syllabus & textbooks",
  },
  {
    id: "OTHER",
    name: "Other / Not sure",
    fullName: "Other curriculum",
    note: "NIOS, IGCSE, IB or another board",
  },
] as const;

export type BoardId = (typeof BOARDS)[number]["id"];

export const BOARD_IDS = BOARDS.map((board) => board.id) as BoardId[];

export const CLASSES = ["6", "7", "8", "9", "10", "11", "12"] as const;
export type ClassLevel = (typeof CLASSES)[number];

export const LEARNING_LEVELS = [
  {
    id: "foundation",
    name: "Foundation",
    description: "I need the basics explained slowly, from the ground up.",
  },
  {
    id: "developing",
    name: "Developing",
    description: "I understand basics but lose marks on tricky questions.",
  },
  {
    id: "proficient",
    name: "Proficient",
    description: "I'm comfortable with most chapters and want speed + accuracy.",
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "I'm aiming for top marks and tougher, exam-level problems.",
  },
] as const;

export type LearningLevel = (typeof LEARNING_LEVELS)[number]["id"];
export const LEARNING_LEVEL_IDS = LEARNING_LEVELS.map((level) => level.id) as LearningLevel[];

export const EXAM_TARGETS = [
  "Board Exams",
  "JEE",
  "NEET",
  "NTSE",
  "Olympiads",
  "CUET",
  "School Unit Tests",
  "Not decided yet",
] as const;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** Subject sets by class band. */
const PRIMARY_SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Hindi"];
const SECONDARY_SUBJECTS = [
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Social Science",
  "History",
  "Geography",
  "Hindi",
  "Computer Applications",
];
const SENIOR_SCIENCE = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "English",
  "Computer Science",
  "Physical Education",
];
const SENIOR_COMMERCE = [
  "Accountancy",
  "Business Studies",
  "Economics",
  "Mathematics",
  "English",
  "Informatics Practices",
];

export function subjectsForClass(classLevel: string): string[] {
  const numeric = Number(classLevel);
  if (!Number.isFinite(numeric)) return SECONDARY_SUBJECTS;
  if (numeric <= 8) return PRIMARY_SUBJECTS;
  if (numeric <= 10) return SECONDARY_SUBJECTS;
  return [...new Set([...SENIOR_SCIENCE, ...SENIOR_COMMERCE])];
}

export const ALL_SUBJECTS = [...new Set([...SECONDARY_SUBJECTS, ...SENIOR_SCIENCE, ...SENIOR_COMMERCE])].sort();

/** Curated chapter seeds for the most-used class/subject pairs. */
export const CHAPTER_SEEDS: Record<string, string[]> = {
  "9:Science": [
    "Matter in Our Surroundings",
    "Is Matter Around Us Pure",
    "Atoms and Molecules",
    "Structure of the Atom",
    "The Fundamental Unit of Life",
    "Tissues",
    "Motion",
    "Force and Laws of Motion",
    "Gravitation",
    "Work and Energy",
    "Sound",
    "Improvement in Food Resources",
  ],
  "9:Mathematics": [
    "Number Systems",
    "Polynomials",
    "Coordinate Geometry",
    "Linear Equations in Two Variables",
    "Lines and Angles",
    "Triangles",
    "Quadrilaterals",
    "Circles",
    "Heron's Formula",
    "Surface Areas and Volumes",
    "Statistics",
    "Probability",
  ],
  "10:Science": [
    "Chemical Reactions and Equations",
    "Acids, Bases and Salts",
    "Metals and Non-metals",
    "Carbon and its Compounds",
    "Life Processes",
    "Control and Coordination",
    "How do Organisms Reproduce",
    "Heredity and Evolution",
    "Light — Reflection and Refraction",
    "The Human Eye and the Colourful World",
    "Electricity",
    "Magnetic Effects of Electric Current",
    "Our Environment",
  ],
  "10:Mathematics": [
    "Real Numbers",
    "Polynomials",
    "Pair of Linear Equations",
    "Quadratic Equations",
    "Arithmetic Progressions",
    "Triangles",
    "Coordinate Geometry",
    "Introduction to Trigonometry",
    "Applications of Trigonometry",
    "Circles",
    "Areas Related to Circles",
    "Surface Areas and Volumes",
    "Statistics",
    "Probability",
  ],
  "11:Physics": [
    "Units and Measurements",
    "Motion in a Straight Line",
    "Motion in a Plane",
    "Laws of Motion",
    "Work, Energy and Power",
    "System of Particles and Rotational Motion",
    "Gravitation",
    "Mechanical Properties of Solids",
    "Mechanical Properties of Fluids",
    "Thermal Properties of Matter",
    "Thermodynamics",
    "Kinetic Theory",
    "Oscillations",
    "Waves",
  ],
  "11:Chemistry": [
    "Some Basic Concepts of Chemistry",
    "Structure of Atom",
    "Classification of Elements and Periodicity",
    "Chemical Bonding and Molecular Structure",
    "States of Matter",
    "Thermodynamics",
    "Equilibrium",
    "Redox Reactions",
    "Hydrogen",
    "The s-Block Elements",
    "The p-Block Elements",
    "Organic Chemistry — Basic Principles",
    "Hydrocarbons",
  ],
  "11:Biology": [
    "The Living World",
    "Biological Classification",
    "Plant Kingdom",
    "Animal Kingdom",
    "Morphology of Flowering Plants",
    "Anatomy of Flowering Plants",
    "Structural Organisation in Animals",
    "Cell: The Unit of Life",
    "Biomolecules",
    "Cell Cycle and Cell Division",
    "Photosynthesis in Higher Plants",
    "Respiration in Plants",
    "Plant Growth and Development",
    "Human Respiration",
    "Body Fluids and Circulation",
  ],
  "11:Mathematics": [
    "Sets",
    "Relations and Functions",
    "Trigonometric Functions",
    "Complex Numbers and Quadratic Equations",
    "Linear Inequalities",
    "Permutations and Combinations",
    "Binomial Theorem",
    "Sequences and Series",
    "Straight Lines",
    "Conic Sections",
    "Introduction to 3D Geometry",
    "Limits and Derivatives",
    "Statistics",
    "Probability",
  ],
  "12:Physics": [
    "Electric Charges and Fields",
    "Electrostatic Potential and Capacitance",
    "Current Electricity",
    "Moving Charges and Magnetism",
    "Magnetism and Matter",
    "Electromagnetic Induction",
    "Alternating Current",
    "Electromagnetic Waves",
    "Ray Optics and Optical Instruments",
    "Wave Optics",
    "Dual Nature of Radiation and Matter",
    "Atoms",
    "Nuclei",
    "Semiconductor Electronics",
  ],
  "12:Chemistry": [
    "Solutions",
    "Electrochemistry",
    "Chemical Kinetics",
    "The d- and f-Block Elements",
    "Coordination Compounds",
    "Haloalkanes and Haloarenes",
    "Alcohols, Phenols and Ethers",
    "Aldehydes, Ketones and Carboxylic Acids",
    "Amines",
    "Biomolecules",
  ],
  "12:Biology": [
    "Sexual Reproduction in Flowering Plants",
    "Human Reproduction",
    "Reproductive Health",
    "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance",
    "Evolution",
    "Human Health and Disease",
    "Microbes in Human Welfare",
    "Biotechnology — Principles and Processes",
    "Biotechnology and its Applications",
    "Organisms and Populations",
    "Ecosystem",
    "Biodiversity and Conservation",
  ],
  "12:Mathematics": [
    "Relations and Functions",
    "Inverse Trigonometric Functions",
    "Matrices",
    "Determinants",
    "Continuity and Differentiability",
    "Application of Derivatives",
    "Integrals",
    "Application of Integrals",
    "Differential Equations",
    "Vector Algebra",
    "Three Dimensional Geometry",
    "Linear Programming",
    "Probability",
  ],
  "8:Science": [
    "Crop Production and Management",
    "Microorganisms",
    "Coal and Petroleum",
    "Combustion and Flame",
    "Cell — Structure and Functions",
    "Force and Pressure",
    "Friction",
    "Sound",
    "Chemical Effects of Electric Current",
    "Light",
  ],
  "7:Science": [
    "Nutrition in Plants",
    "Nutrition in Animals",
    "Heat",
    "Acids, Bases and Salts",
    "Physical and Chemical Changes",
    "Respiration in Organisms",
    "Transportation in Animals and Plants",
    "Light",
  ],
  "6:Science": [
    "Food: Where Does It Come From",
    "Components of Food",
    "Fibre to Fabric",
    "Sorting Materials into Groups",
    "Separation of Substances",
    "Changes Around Us",
    "Getting to Know Plants",
    "Body Movements",
    "Light, Shadows and Reflections",
  ],
};

export function chaptersFor(classLevel: string, subject: string): string[] {
  const direct = CHAPTER_SEEDS[`${classLevel}:${subject}`];
  if (direct) return direct;
  // Fall back to the same subject at a nearby class so the picker is never empty.
  const forSubject = Object.entries(CHAPTER_SEEDS)
    .filter(([key]) => key.split(":")[1] === subject)
    .flatMap(([, chapters]) => chapters);
  return [...new Set(forSubject)];
}

/** Exam types offered on /exam-prep. */
export const EXAM_TYPES = [
  { id: "unit_test", name: "School unit test", durationMinutes: 45, questions: 10 },
  { id: "half_yearly", name: "Half-yearly", durationMinutes: 90, questions: 15 },
  { id: "board", name: "Board exam", durationMinutes: 120, questions: 20 },
  { id: "competitive", name: "Competitive (JEE/NEET style)", durationMinutes: 60, questions: 15 },
] as const;

export type ExamTypeId = (typeof EXAM_TYPES)[number]["id"];
export const EXAM_TYPE_IDS = EXAM_TYPES.map((exam) => exam.id) as ExamTypeId[];

export function examTypeLabel(examType: string) {
  return EXAM_TYPES.find((exam) => exam.id === examType)?.name ?? examType;
}

export function examTypeConfig(examType: string) {
  return EXAM_TYPES.find((exam) => exam.id === examType) ?? EXAM_TYPES[0];
}

export function boardDisplayName(board: string) {
  return BOARDS.find((item) => item.id === board)?.name ?? board;
}

export function classDisplayName(classLevel: string | null | undefined) {
  if (!classLevel) return "Class —";
  return `Class ${classLevel}`;
}
