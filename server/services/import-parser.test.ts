
import { describe, it, expect } from "vitest";
import { parseImportFile } from "./import-parser";
import * as xlsx from "xlsx";

describe("Import Parser Service", () => {
    it("should parse CSV correctly", async () => {
        const csvContent = "Date,Metric,Value,Unit,Note\n2025-01-01,weight,75,kg,initial";
        const buffer = Buffer.from(csvContent);
        
        const result = await parseImportFile(buffer, "text/csv");
        
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            date: "2025-01-01",
            metricCode: "weight",
            value: 75,
            unit: "kg",
            note: "initial"
        });
    });

    it("should handle CSV with extra whitespace", async () => {
        const csvContent = "Date , Metric , Value , Unit \n2025-01-01 , weight , 75 , kg ";
        const buffer = Buffer.from(csvContent);
        
        const result = await parseImportFile(buffer, "text/csv");
        
        expect(result[0].metricCode).toBe("weight");
        expect(result[0].value).toBe(75);
    });

    it("should parse Excel correctly", async () => {
        // Create a real excel buffer
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet([
            { Date: "2025-01-01", Metric: "weight", Value: 75, Unit: "kg" }
        ]);
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
        const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

        const result = await parseImportFile(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        
        expect(result).toHaveLength(1);
        expect(result[0].metricCode).toBe("weight");
        // Value might be number types from excel, parser should handle or return strings?
        // Parser implementation: row[header] -> String(cell).trim()
        expect(result[0].value).toBe(75);
    });

    it("should throw error for unsupported mime type", async () => {
        const buffer = Buffer.from("test");
        await expect(parseImportFile(buffer, "application/pdf"))
            .rejects.toThrow("Unsupported file type");
    });
});
