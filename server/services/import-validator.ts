
import { ImportRow, ImportValidationError, ImportPreview } from "@shared/types/import-export";
import { Metric } from "@shared/schema";
import { storage } from "../storage";

export async function validateImport(rows: ImportRow[], fileName: string, fileSize: number): Promise<ImportPreview> {
  const metrics = await storage.getMetrics();
  const validMetricCodes = new Set(metrics.map(m => m.code));
  
  const validRows: ImportRow[] = [];
  const errors: ImportValidationError[] = [];
  
  rows.forEach((row, index) => {
      const rowErrors: ImportValidationError[] = [];
      
      // 1. Validate Date
      const date = new Date(row.date);
      if (isNaN(date.getTime())) {
          rowErrors.push({
              rowIndex: row.sourceRowIndex ?? index,
              field: "date",
              message: "Invalid date format",
              value: row.date
          });
      }

      // 2. Validate Metric Code
      if (!validMetricCodes.has(row.metricCode)) {
           rowErrors.push({
              rowIndex: row.sourceRowIndex ?? index,
              field: "metricCode",
              message: `Unknown metric code: ${row.metricCode}`,
              value: row.metricCode
          });
      }

      // 3. Validate Value
      if (typeof row.value !== 'number' || isNaN(row.value)) {
           rowErrors.push({
              rowIndex: row.sourceRowIndex ?? index,
              field: "value",
              message: "Invalid numeric value",
              value: row.value
          });
      }

      if (rowErrors.length > 0) {
          errors.push(...rowErrors);
      } else {
          // Normalize date to ISO string for consistency
          row.date = date.toISOString();
          validRows.push(row);
      }
  });

  return {
    fileName,
    fileSize,
    totalRows: rows.length,
    validRows,
    errors,
    summary: {
       total: rows.length,
       valid: validRows.length,
       invalid: rows.length - validRows.length,
       ignored: 0 
    }
  };
}
