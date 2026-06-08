import { google } from "googleapis";
import { getCanonicalStage } from "./stages";

export type Prospect = {
  id: string;
  prospectName: string;
  phoneNumber: string;
  stage: string;
  comments: string;
  commentBy: string;

  sourceSheet: string;
  sheetGid: number;
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

  // 1. Get all sheet names and their gids
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetMeta = spreadsheet.data.sheets || [];

  // Build a map: title -> sheetGid
  const gidMap: Record<string, number> = {};
  for (const s of sheetMeta) {
    const title = s.properties?.title;
    const gid = s.properties?.sheetId;
    if (title && gid !== undefined && gid !== null) {
      gidMap[title] = gid;
    }
  }

  const sheetTitles = sheetMeta.map((s) => s.properties?.title).filter(Boolean) as string[];

  const allProspects: Prospect[] = [];

  // 2. Fetch data for all sheets
  for (const title of sheetTitles) {
    console.log(`\nProcessing sheet: "${title}"`);
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: title, // fetches the entire sheet
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) continue;

      const headers = rows[0] as string[];

      // Identify column indices based on header names
      const nameIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "prospect name");
      const phoneIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "number");
      const stageIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "stage");
      const commentsIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "comments");
      const commentByIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "comment by");

      console.log(`  Headers found: ${JSON.stringify(headers)}`);
      console.log(`  Column indexes - Name:${nameIdx}, Phone:${phoneIdx}, Stage:${stageIdx}, Comments:${commentsIdx}, CommentBy:${commentByIdx}`);

      // Skip sheet if it doesn't have the required columns
      if (nameIdx === -1 || phoneIdx === -1 || stageIdx === -1) {
        console.warn(`  Skipping sheet "${title}" due to missing required columns.`);
        continue;
      }

      const sheetGid = gidMap[title] ?? 0;

      // Read rows (skip header, so starting from index 1)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        // Skip entirely empty rows
        if (!row || row.length === 0 || (!row[nameIdx] && !row[phoneIdx] && !row[stageIdx])) continue;

        // Ensure row has same length as headers (fill missing cells with empty strings)
        const paddedRow = [...row];
        while (paddedRow.length < headers.length) paddedRow.push("");

        allProspects.push({
          id: `${title}-${i + 1}`,
          prospectName: paddedRow[nameIdx] || "",
          phoneNumber: paddedRow[phoneIdx] || "",
          stage: getCanonicalStage(paddedRow[stageIdx] || ""),
          comments: commentsIdx !== -1 ? (paddedRow[commentsIdx] || "") : "",
          commentBy: commentByIdx !== -1 ? (paddedRow[commentByIdx] || "") : "",
          sourceSheet: title,
          sheetGid,
          rowIndex: i + 1,
        });
      }
    } catch (error) {
      console.error(`Error fetching sheet ${title}:`, error);
    }
  }

  console.log(`\nTotal prospects collected: ${allProspects.length}`);
  return allProspects;
}

export async function updateProspectField(
  sourceSheet: string,
  rowIndex: number,
  field: "Prospect Name" | "Number" | "stage" | "Comments" | "Comment By",
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
    range: `${sourceSheet}!1:1`,
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
  prospect: Omit<Prospect, "id" | "sourceSheet" | "sheetGid" | "rowIndex" | "comments" | "commentBy">,
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

  // Build gid map
  const gidMap: Record<string, number> = {};
  for (const s of sheetsList) {
    const title = s.properties?.title;
    const gid = s.properties?.sheetId;
    if (title && gid !== undefined && gid !== null) {
      gidMap[title] = gid;
    }
  }

  let sheetTitle = targetSheet;

  if (!sheetTitle) {
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

        const nameIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "prospect name");
        const phoneIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "number");
        const stageIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "stage");

        if (nameIdx !== -1 && phoneIdx !== -1 && stageIdx !== -1) {
          sheetTitle = title;
          break;
        }
      } catch {
        // ignore and continue
      }
    }
  }

  if (!sheetTitle) {
    throw new Error("No sheet found with the required headers (Prospect Name, Number, stage).");
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!1:1`,
  });
  const headers = headerResponse.data.values?.[0] as string[];
  if (!headers) throw new Error("Could not fetch headers for the target sheet.");

  const nameIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "prospect name");
  const phoneIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "number");
  const stageIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "stage");

  if (nameIdx === -1 || phoneIdx === -1 || stageIdx === -1) {
    throw new Error(`The target sheet "${sheetTitle}" is missing required headers.`);
  }

  const maxIdx = Math.max(nameIdx, phoneIdx, stageIdx);
  const newRow = new Array(maxIdx + 1).fill("");
  newRow[nameIdx] = prospect.prospectName;
  newRow[phoneIdx] = prospect.phoneNumber;
  newRow[stageIdx] = prospect.stage;

  const appendResponse = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetTitle}!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [newRow],
    },
  });

  const updatedRange = appendResponse.data.updates?.updatedRange;
  let rowIndex = 2;
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
    stage: getCanonicalStage(prospect.stage),
    comments: "",
    commentBy: "",
    sourceSheet: sheetTitle,
    sheetGid: gidMap[sheetTitle] ?? 0,
    rowIndex,
  };
}
