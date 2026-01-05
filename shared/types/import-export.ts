
export interface ImportRow {
  date: string; // ISO 8601 date (YYYY-MM-DD or full timestamp)
  metricCode: string;
  value: number;
  unit: string;
  note?: string;
  sourceRowIndex?: number; // 0-based index from original file
}

export interface ImportValidationError {
  rowIndex: number; // 0-based index
  field: keyof ImportRow | "row" | "date" | "metricCode" | "value" | "unit" | "note";
  message: string;
  value?: any; // The invalid value
}

export interface ImportPreview {
  fileName: string;
  fileSize: number;
  totalRows: number;
  validRows: ImportRow[];
  errors: ImportValidationError[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    ignored: number; // Empty rows or non-data
  }
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number; // Duplicates skipped
  failedCount: number; // Runtime errors
  errors: ImportValidationError[];
}

export enum SUPPORTED_FILE_FORMATS {
  CSV = "text/csv",
  EXCEL_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  EXCEL_XLS = "application/vnd.ms-excel",
}
