// test-stage-fetch.ts
// This script fetches all prospects and prints a summary of which canonical stages are present.
// It also validates that the four problematic stages have at least one prospect.

import { fetchAllProspects } from "./google";
import { STAGES } from "./stages";
import { getCanonicalStage } from "./stages";

async function main() {
  const prospects = await fetchAllProspects();
  console.log(`Total prospects fetched: ${prospects.length}`);

  // Build a set of stages present in the data
  const stageSet = new Set<string>();
  for (const p of prospects) {
    const canonical = getCanonicalStage(p.stage);
    if (canonical) stageSet.add(canonical);
  }

  console.log("Stages present in fetched data:");
  console.log(Array.from(stageSet).sort().join(", "));

  // Verify the four stages we care about
  const required = [
    "Call Not Received",
    "International Num",
    "Enroll In Next Batch",
    "Awaiting Payment",
  ];
  const missing = required.filter((s) => !stageSet.has(s));
  if (missing.length === 0) {
    console.log("✅ All required stages have data.");
  } else {
    console.warn(`⚠️ Missing data for stages: ${missing.join(", ")}`);
  }
}

main().catch((err) => {
  console.error("Error running test script:", err);
});
