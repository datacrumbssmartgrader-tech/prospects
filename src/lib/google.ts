import { google } from "googleapis";

export type Prospect = {
  id: string;
  prospectName: string;
  phoneNumber: string;
  stage: string;

  sourceSheet: string;
  rowIndex: number;
};

// Lazy initialization so env vars are guaranteed to be loaded before use
function getSheetsClient() {
  // Handle Vercel/local env variable formatting for private keys
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

  if (!clientEmail || !privateKey) {
    throw new Error(
      `Missing Google credentials. Ensure GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are set in your .env file.`
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

// Helper to convert column index (0-based) to letter (A, B, C...)
function colIndexToLetter(index: number): string {
  let temp = index;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export async function fetchAllProspects(): Promise<Prospect[]> {
  const sheets = getSheetsClient();
  const rawId = (process.env.GOOGLE_SHEET_ID || "").trim();
  const spreadsheetId = rawId.includes("/d/") 
    ? rawId.split("/d/")[1].split("/")[0] 
    : rawId;

  // 1. Get all sheet names
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetTitles = spreadsheet.data.sheets?.map(
    (sheet) => sheet.properties?.title
  ) || [];

  const allProspects: Prospect[] = [];

  // 2. Fetch data for all sheets
  for (const title of sheetTitles) {
    if (!title) continue;

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: title, // fetches the entire sheet
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) continue;

      const headers = rows[0] as string[];

      // Identify column indices based on header names
      const nameIdx = headers.findIndex((h) => h?.trim() === "Prospect Name");
      const phoneIdx = headers.findIndex((h) => h?.trim() === "Phone Number");
      const stageIdx = headers.findIndex((h) => h?.trim() === "Stage");

      // Skip sheet if it doesn't have the required columns
      if (nameIdx === -1 || phoneIdx === -1 || stageIdx === -1) {
        continue;
      }

      // Read rows (skip header, so starting from index 1)
      // Note: Google Sheets row index is 1-based, so row[0] is row 1, row[1] is row 2.
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Skip entirely empty rows
        if (!row || row.length === 0 || (!row[nameIdx] && !row[phoneIdx] && !row[stageIdx])) continue;

        allProspects.push({
          id: `${title}-${i + 1}`, // unique ID
          prospectName: row[nameIdx] || "",
          phoneNumber: row[phoneIdx] || "",
          stage: row[stageIdx] || "",
          sourceSheet: title,
          rowIndex: i + 1, // 1-based index in the actual sheet
        });
      }
    } catch (error) {
      console.error(`Error fetching sheet ${title}:`, error);
      // continue to next sheet even if one fails
    }
  }

  return allProspects;
}

export async function updateProspectField(
  sourceSheet: string,
  rowIndex: number,
  field: "Prospect Name" | "Phone Number" | "Stage",
  newValue: string
) {
  const sheets = getSheetsClient();
  const rawId = (process.env.GOOGLE_SHEET_ID || "").trim();
  const spreadsheetId = rawId.includes("/d/") 
    ? rawId.split("/d/")[1].split("/")[0] 
    : rawId;

  // 1. Fetch headers to know which column to update dynamically
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sourceSheet}!1:1`, // Just row 1 for headers
  });

  const headers = response.data.values?.[0] as string[];
  if (!headers) throw new Error("Could not fetch headers to map column.");

  const colIdx = headers.findIndex((h) => h?.trim() === field);
  if (colIdx === -1) {
    throw new Error(`Column "${field}" not found in sheet "${sourceSheet}".`);
  }

  const colLetter = colIndexToLetter(colIdx);
  const cellRange = `${sourceSheet}!${colLetter}${rowIndex}`;

  // 2. Update the specific cell
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: cellRange,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[newValue]],
    },
  });
}

export async function addProspect(
  prospect: Omit<Prospect, "id" | "sourceSheet" | "rowIndex">,
  targetSheet?: string
): Promise<Prospect> {
  const sheets = getSheetsClient();
  const rawId = (process.env.GOOGLE_SHEET_ID || "").trim();
  const spreadsheetId = rawId.includes("/d/") 
    ? rawId.split("/d/")[1].split("/")[0] 
    : rawId;

  // 1. Get sheets to find the first matching or the specified sheet
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetsList = spreadsheet.data.sheets || [];
  let sheetTitle = targetSheet;

  if (!sheetTitle) {
    // Find the first sheet that has the required headers
    for (const s of sheetsList) {
      const title = s.properties?.title;
      if (!title) continue;

      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${title}!1:1`,
        });

        const headers = response.data.values?.[0] as string[];
        if (!headers) continue;

        const nameIdx = headers.findIndex((h) => h?.trim() === "Prospect Name");
        const phoneIdx = headers.findIndex((h) => h?.trim() === "Phone Number");
        const stageIdx = headers.findIndex((h) => h?.trim() === "Stage");

        if (nameIdx !== -1 && phoneIdx !== -1 && stageIdx !== -1) {
          sheetTitle = title;
          break;
        }
      } catch (err) {
        // ignore sheet read error and continue
      }
    }
  }

  if (!sheetTitle) {
    throw new Error("No sheet found with the required headers (Prospect Name, Phone Number, Stage).");
  }

  // Get the headers for the selected sheet to know the correct column positions
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!1:1`,
  });
  const headers = headerResponse.data.values?.[0] as string[];
  if (!headers) throw new Error("Could not fetch headers for the target sheet.");

  const nameIdx = headers.findIndex((h) => h?.trim() === "Prospect Name");
  const phoneIdx = headers.findIndex((h) => h?.trim() === "Phone Number");
  const stageIdx = headers.findIndex((h) => h?.trim() === "Stage");

  if (nameIdx === -1 || phoneIdx === -1 || stageIdx === -1) {
    throw new Error(`The target sheet "${sheetTitle}" is missing some required headers.`);
  }

  // Construct the row array based on column indices
  const maxIdx = Math.max(nameIdx, phoneIdx, stageIdx);
  const newRow = new Array(maxIdx + 1).fill("");
  newRow[nameIdx] = prospect.prospectName;
  newRow[phoneIdx] = prospect.phoneNumber;
  newRow[stageIdx] = prospect.stage;

  // Append row
  const appendResponse = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetTitle}!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [newRow],
    },
  });

  // Extract row index from updatedRange response
  const updatedRange = appendResponse.data.updates?.updatedRange;
  let rowIndex = 2; // fallback default
  if (updatedRange) {
    const match = updatedRange.match(/!.*?[A-Z]+(\d+)/i);
    if (match) {
      rowIndex = parseInt(match[1], 10);
    }
  }

  return {
    id: `${sheetTitle}-${rowIndex}`,
    prospectName: prospect.prospectName,
    phoneNumber: prospect.phoneNumber,
    stage: prospect.stage,
    sourceSheet: sheetTitle,
    rowIndex,
  };
}
