import { fetchAllProspects } from "./google.ts";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

async function main() {
  try {
    const prospects = await fetchAllProspects();
    console.log("Prospects count:", prospects.length);
    for (const p of prospects) {
      console.log(`ID:${p.id} Sheet:${p.sourceSheet} Stage:${p.stage}`);
    }
  } catch (err) {
    console.error("Error fetching prospects", err);
  }
}

main();
