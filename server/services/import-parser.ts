
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ImportRow } from "@shared/types/import-export";

// Map common variations to internal field names
const COLUMN_MAPPING: Record<string, keyof ImportRow> = {
  "date": "date",
  "effective date": "date",
  "time": "date",
  "metric": "metricCode",
  "metric code": "metricCode",
  "type": "metricCode",
  "value": "value",
  "measurement": "value",
  "unit": "unit",
  "units": "unit",
  "note": "note",
  "notes": "note",
  "comment": "note",
};

interface RawRow {
  [key: string]: any;
}

export async function parseImportFile(buffer: Buffer, mimeType: string): Promise<ImportRow[]> {
  let rawRows: RawRow[] = [];

  // 1. Parse based on type (or try both if unsure)
  if (mimeType.includes("csv") || mimeType.includes("text")) {
    const text = buffer.toString("utf-8");
    const result = Papa.parse<RawRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.toLowerCase().trim(),
    });
    rawRows = result.data;
  } else if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("spreadsheet")) {
    // Assume Excel
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(worksheet, {
      raw: false, // Convert dates to strings?
    });
  } else {
    throw new Error("Unsupported file type: " + mimeType);
  }

  // 2. Normalize and Map to ImportRow
  const parsedRows: ImportRow[] = rawRows.map((row, index) => {
    const newRow: any = { sourceRowIndex: index };
    
    // Normalize keys
    Object.keys(row).forEach((key) => {
      const normalizedKey = key.toLowerCase().trim();
      const mappedKey = COLUMN_MAPPING[normalizedKey];
      
      if (mappedKey) {
        const cellValue = row[key];
        newRow[mappedKey] = typeof cellValue === 'string' ? cellValue.trim() : cellValue;
      } else {
        // Try direct match if no mapping found (e.g. if user used perfect headers)
        if (["date", "metricCode", "value", "unit", "note"].includes(normalizedKey)) { // Check if key is valid ImportRow key (ignoring casing) - actually mappedKey handles this if we map identity
           // handled by mapping identity above? No, I need to ensure identity is in map.
           // Added identities to map.
        }
      }
    });

    // Basic cleaning
    if (newRow.value) {
        newRow.value = parseFloat(newRow.value);
    }
    
    return newRow as ImportRow;
  });

  return parsedRows.filter(r => r.date && r.metricCode && r.value !== undefined && !isNaN(r.value));
}
