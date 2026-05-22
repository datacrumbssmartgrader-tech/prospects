import { fetchAllProspects } from "./src/lib/google";
import * as dotenv from "dotenv";

// Load .env variables locally for this test script
dotenv.config();

async function runTest() {
  console.log("-----------------------------------------");
  console.log("🧪 TESTING GOOGLE SHEETS FETCH FUNCTION 🧪");
  console.log("-----------------------------------------");
  try {
    console.log("⏳ Fetching data from Google Sheets...");
    const prospects = await fetchAllProspects();
    console.log(`✅ Success! Fetched a total of ${prospects.length} prospects.`);
    
    if (prospects.length > 0) {
      console.log("📄 First 3 prospects fetched:");
      console.dir(prospects.slice(0, 3), { depth: null, colors: true });
    } else {
      console.log("⚠️ No prospects found. Ensure your sheet has data and the correct headers ('Prospect Name', 'Phone Number', 'Stage').");
    }
  } catch (error) {
    console.error("❌ FAILED TO FETCH DATA.");
    console.error(error);
  }
}

runTest();
