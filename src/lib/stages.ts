export const STAGES = [
  "Contacted",
  "Awaiting Response",
  "Closed - Won",
  "Closed - Lost",
  "Call Not Received",
  "Referred to",
  "Awaiting Payment",
  "International Num",
  "Form Filled",
  "Enroll In Next Batch",
] as const;

// Map common misspellings / case variations to the canonical stage names
const stageAliases: Record<string, string> = {
  // typo
  "call not recieved": "Call Not Received",
  // lower‑case variants (handled case‑insensitively but kept for clarity)
  "awaiting payment": "Awaiting Payment",
  "international num": "International Num",
  "enroll in next batch": "Enroll In Next Batch",
  // additional variants you may encounter
  "call not received": "Call Not Received",
  "awaiting payment ": "Awaiting Payment",
  "form filled": "Form Filled",
  "form unfilled": "Form Filled",
  "demo": "Demo",
  "please call later": "Call Not Received",
  "call later": "Call Not Received",
  "call pending": "Call Not Received",
  "not received": "Call Not Received",
};

export type Stage = typeof STAGES[number];

/**
 * Matches a stage string case‑insensitively and returns the canonical cased version.
 * If the input does not match any stage, it returns the trimmed input value.
 */
export function getCanonicalStage(stage: string): string {
  const trimmed = (stage || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  // First check explicit alias map (covers typos, alternate wording)
  if (stageAliases[lower]) return stageAliases[lower];
  // Then try direct match against canonical list (case‑insensitive)
  const found = STAGES.find((s) => s.toLowerCase() === lower);
  return found || trimmed;
}
