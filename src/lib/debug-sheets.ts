import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

import { google } from "googleapis";

function getSheetsClient() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google credentials.");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

async function listSheets() {
  const sheets = getSheetsClient();
  const rawId = (process.env.GOOGLE_SHEET_ID || "").trim();
  const spreadsheetId = rawId.includes("/d/") ? rawId.split("/d/")[1].split("/")[0] : rawId;
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const titles = (spreadsheet.data.sheets ?? [])
    .map(s => s.properties?.title)
    .filter(Boolean);
  console.log("Sheets in spreadsheet:");
  titles.forEach(t => console.log("-", t));
}

listSheets().catch(err => {
  console.error("Error listing sheets:", err);
  process.exit(1);
});
