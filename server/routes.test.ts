
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

// Mock Authentication
vi.mock("./auth", () => ({
    setupAuth: vi.fn(),
    registerAuthRoutes: vi.fn(),
    isAuthenticated: (req: any, res: any, next: any) => {
        req.user = { id: "user-123" }; // Simulate logged in user
        req.isAuthenticated = () => true;
        next();
    }
}));

// Mock Storage
vi.mock("./storage", () => ({
    storage: {
        getPatientByUserId: vi.fn(),
        getUser: vi.fn(),
        seedMetrics: vi.fn(),
        // Add other methods needed by routes or auth
        sessionStore: {
            on: vi.fn() // referenced in routes? Maybe not, but good to be safe if auth setup interacts
        }
    }
}));

// Mock Services
vi.mock("./services/import-processor", () => ({
    createImportPreview: vi.fn(),
    processImport: vi.fn()
}));

vi.mock("./services/export-fhir", () => ({
    exportPatientFHIR: vi.fn(),
    exportObservationsFHIR: vi.fn(),
    exportGoalsFHIR: vi.fn(),
    exportFullBundleFHIR: vi.fn()
}));

import { createImportPreview, processImport } from "./services/import-processor";
import { exportPatientFHIR } from "./services/export-fhir";

describe("API Endpoints", () => {
    let app: express.Express;

    beforeAll(async () => {
        app = express();
        app.use(express.json());
        const server = await registerRoutes(app as any, app); // Helper registers routes
        // Note: registerRoutes might try to connect to S3 via initBucket?
        // If s3 is imported in routes or index, we might need to mock it too.
        // routes.ts imports "./s3" ? NO. index.ts imports s3. routes.ts does NOT import s3.
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("POST /api/import/preview", () => {
        it("should return preview on success", async () => {
            (createImportPreview as any).mockResolvedValue({
                validCount: 1,
                errorCount: 0,
                previewRows: []
            });

            // Need to mock multer file upload? 
            // uploadMiddleware handles this. If we use supertest .attach(), it should work if storage is mocked?
            // Middleware uses 'multer.memoryStorage()'. 
            // So we don't need to mock disk storage.
            
            const buffer = Buffer.from("Date,Metric,Value\n2025-01-01,weight,75");
            
            const res = await request(app)
                .post("/api/import/preview")
                .attach("file", buffer, "test.csv");

            expect(res.status).toBe(200);
            expect(res.body.validCount).toBe(1);
        });
    });

    describe("GET /api/export/fhir/patient", () => {
        it("should return patient resource", async () => {
            (storage.getPatientByUserId as any).mockResolvedValue({ id: 1 });
            (exportPatientFHIR as any).mockResolvedValue({ resourceType: "Patient", id: "1" });

            const res = await request(app).get("/api/export/fhir/patient");
            
            expect(res.status).toBe(200);
            expect(res.body.resourceType).toBe("Patient");
        });
    });
});
