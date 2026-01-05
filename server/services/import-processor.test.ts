
import { describe, it, expect, vi, beforeEach } from "vitest";
import { processImport } from "./import-processor";
import { storage } from "../storage";

// Mock storage
vi.mock("../storage", () => ({
    storage: {
        importMeasurements: vi.fn(),
        getMetrics: vi.fn(),
        getMetric: vi.fn() // if needed by validator
    }
}));

describe("Import Processor Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should call storage.importMeasurements with correct args", async () => {
        const rows = [
            { date: "2025-01-01", metricCode: "weight", value: 75, unit: "kg" }
        ];
        
        // Mock successful import
        (storage.importMeasurements as any).mockResolvedValue({
            success: true,
            importedCount: 1,
            skippedCount: 0,
            errors: []
        });

        const result = await processImport(1, rows, "overwrite");
        
        expect(storage.importMeasurements).toHaveBeenCalledWith(1, rows, "overwrite");
        expect(result.success).toBe(true);
        expect(result.importedCount).toBe(1);
    });

    it("should handle storage errors", async () => {
        const rows = [{ date: "2025-01-01", metricCode: "weight", value: "75", unit: "kg" }];
        
        (storage.importMeasurements as any).mockRejectedValue(new Error("DB Error"));

        await expect(processImport(1, rows, "overwrite")).rejects.toThrow("DB Error");
    });
});
