
import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportPatientFHIR, exportObservationsFHIR, mapObservationToFHIR } from "./export-fhir";
import { storage } from "../storage";

// Mock storage
vi.mock("../storage", () => ({
    storage: {
        getPatient: vi.fn(),
        getUser: vi.fn(),
        getObservations: vi.fn()
    }
}));

describe("FHIR Export Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("exportPatientFHIR", () => {
        it("should format Patient resource correctly", async () => {
            (storage.getPatient as any).mockResolvedValue({
                id: 1,
                userId: "user-123",
                displayName: "Test User",
                gender: "male",
                dateOfBirth: "1990-01-01",
                heightCm: 180
            });
            (storage.getUser as any).mockResolvedValue({
                id: "user-123",
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com"
            });

            const result = await exportPatientFHIR(1);
            
            expect(result.resourceType).toBe("Patient");
            expect(result.id).toBe("1");
            expect(result.name?.[0].family).toBe("Doe");
            expect(result.name?.[0].given).toContain("John");
            expect(result.gender).toBe("male");
            expect(result.birthDate).toBe("1990-01-01");
        });

        it("should throw if patient not found", async () => {
            (storage.getPatient as any).mockResolvedValue(undefined);
            await expect(exportPatientFHIR(1)).rejects.toThrow("Patient not found");
        });
    });

    describe("exportObservationsFHIR", () => {
        it("should format Bundle with Observations", async () => {
            (storage.getPatient as any).mockResolvedValue({ id: 1, userId: "u1" });
            (storage.getObservations as any).mockResolvedValue([
                {
                    id: 100,
                    effectiveAt: new Date("2025-01-01T10:00:00Z"),
                    components: [
                        { id: 201, metricCode: "weight", value: 80, unit: "kg" }
                    ]
                }
            ]);

            const result = await exportObservationsFHIR(1);
            
            expect(result.resourceType).toBe("Bundle");
            expect(result.entry).toHaveLength(1);
            const res = result.entry?.[0].resource as any;
            expect(res.resourceType).toBe("Observation");
            expect(res.valueQuantity.value).toBe(80);
            expect(res.valueQuantity.unit).toBe("kg");
            // Check LOINC mapping (assuming weight is mapped in config)
            expect(res.code.coding[0].code).toBe("29463-7"); 
        });
    });
});
