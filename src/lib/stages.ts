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

/**
 * Matches a stage string case-insensitively against aliases and returns the canonical version.
 * If the input does not match any alias, it returns the trimmed input value.
 */
export function getCanonicalStage(stage: string): string {
  const trimmed = (stage || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (stageAliases[lower]) return stageAliases[lower];
  return trimmed;
}
