
import { parseImportFile } from "./import-parser";
import { validateImport } from "./import-validator";
import { storage } from "../storage";
import { ImportRow, ImportResult, ImportPreview } from "@shared/types/import-export";

export async function createImportPreview(buffer: Buffer, mimeType: string, fileName: string, fileSize: number): Promise<ImportPreview> {
  const rows = await parseImportFile(buffer, mimeType);
  return validateImport(rows, fileName, fileSize);
}

export async function processImport(patientId: number, rows: ImportRow[], strategy: 'skip' | 'overwrite'): Promise<ImportResult> {
  // Direct delegation to storage which handles the transactional update
  return storage.importMeasurements(patientId, rows, strategy);
}
