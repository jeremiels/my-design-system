/** A request of a citizen, as the server sends it. */
export interface Request {
  id: string;
  applicant: string;
  subject: string;
  /** `YYYY-MM-DD`. */
  receivedOn: string;
  amount: number;
  status: Status;
  comment: string;
}

export type Status = "received" | "review" | "accepted" | "refused";

export const STATUSES: Record<
  Status,
  { label: string; variant: "information" | "warning" | "success" | "danger" }
> = {
  received: { label: "Reçue", variant: "information" },
  review: { label: "En instruction", variant: "warning" },
  accepted: { label: "Acceptée", variant: "success" },
  refused: { label: "Refusée", variant: "danger" },
};

const APPLICANTS = ["Martin", "Dupont", "Petit", "Bernard", "Durand", "Leroy", "Moreau", "Simon"];
const SUBJECTS = ["Transport scolaire", "Aide au logement", "Chèque énergie", "Garde d'enfant"];
const ORDER: Status[] = ["received", "review", "accepted", "refused"];

/** 23 requests, the same on every load: the tests count on them. */
export function requests(): Request[] {
  // A small linear congruential generator: varied, and the same every time.
  let seed = 7;
  const next = (max: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    // The high bits: the low bits of such a generator repeat quickly.
    return Math.floor(seed / 65536) % max;
  };
  return Array.from({ length: 23 }, (_, index) => ({
    id: `R-${String(100 + index * 3).padStart(3, "0")}`,
    applicant: APPLICANTS[next(APPLICANTS.length)]!,
    subject: SUBJECTS[next(SUBJECTS.length)]!,
    receivedOn: `2026-${next(2) === 0 ? "10" : "11"}-${String(next(28) + 1).padStart(2, "0")}`,
    amount: next(900) + 50,
    status: ORDER[next(ORDER.length)]!,
    comment: "",
  }));
}
