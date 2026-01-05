
import {
  FHIRPatient,
  FHIRObservation,
  FHIRGoal,
  FHIRBundle,
  FHIRResource
} from "@shared/types/fhir";
import { LOINC_MAPPING } from "../config/loinc";
import { storage } from "../storage";
import { ObservationWithComponents, GoalWithTargets } from "@shared/schema";
import { User } from "@shared/schema";

export async function exportPatientFHIR(patientId: number): Promise<FHIRPatient> {
    const patient = await storage.getPatient(patientId);
    if (!patient) throw new Error("Patient not found");
    if (!patient.userId) throw new Error("Patient has no associated user");
    
    // Check if getUser exists on storage (it should now)
    const user = await storage.getUser(patient.userId);
    if (!user) throw new Error("User not found");

    return {
        resourceType: "Patient",
        id: String(patient.id),
        identifier: [
            {
                system: "https://body-metrics-tracker.com/patient",
                value: String(patient.id)
            }
        ],
        active: true,
        name: [
            {
                use: "official",
                family: user.lastName || undefined,
                given: user.firstName ? [user.firstName] : undefined,
                text: `${user.firstName} ${user.lastName || ""}`.trim()
            }
        ],
        gender: (patient.gender as any) || "unknown", // Schema gender matches or needs mapping
        birthDate: patient.dateOfBirth ? String(patient.dateOfBirth) : undefined // schema date is likely string or Date object depending on driver
    };
}

export function mapObservationToFHIR(obs: ObservationWithComponents, patientId: number): FHIRObservation[] {
    const fhirObs: FHIRObservation[] = [];

    obs.components.forEach(comp => {
        const loinc = LOINC_MAPPING[comp.metricCode];
        
        fhirObs.push({
            resourceType: "Observation",
            id: `${obs.id}-${comp.id}`,
            status: "final",
            category: [
                {
                    coding: [
                        {
                            system: "http://terminology.hl7.org/CodeSystem/observation-category",
                            code: "vital-signs",
                            display: "Vital Signs"
                        }
                    ]
                }
            ],
            code: {
                coding: loinc ? [
                    {
                        system: "http://loinc.org",
                        code: loinc.code,
                        display: loinc.display
                    }
                ] : [],
                text: comp.metricCode // Fallback
            },
            subject: {
                reference: `Patient/${patientId}`
            },
            effectiveDateTime: obs.effectiveAt.toISOString(),
            valueQuantity: {
                value: Number(comp.value),
                unit: comp.unit,
                system: "http://unitsofmeasure.org",
                code: comp.unit 
            }
        });
    });

    return fhirObs;
}

export async function exportObservationsFHIR(patientId: number, from?: string, to?: string): Promise<FHIRBundle> {
     // Default range if not provided: last 1 year? or all?
     // storage.getObservations requires from/to.
     const startDate = from || new Date(0).toISOString();
     const endDate = to || new Date().toISOString(); 
     
     // getUserID needed for getObservations? 
     // storage.getObservations signature: (patientId, from, to, userId).
     // Wait, I need userId. I should get it from patient.
     const patient = await storage.getPatient(patientId);
     if(!patient) throw new Error("Patient not found");
     if(!patient.userId) throw new Error("Patient detached from user");

     const observations = await storage.getObservations(patientId, startDate, endDate, patient.userId);
     
     const entries: any[] = [];
     observations.forEach(obs => {
         const resources = mapObservationToFHIR(obs, patientId);
         resources.forEach(r => {
             entries.push({
                 fullUrl: `urn:uuid:${r.id}`,
                 resource: r
             });
         });
     });

     return {
         resourceType: "Bundle",
         id: `bundle-observations-${Date.now()}`,
         type: "collection",
         timestamp: new Date().toISOString(),
         entry: entries
     };
}

export function mapGoalToFHIR(goal: GoalWithTargets, patientId: number): FHIRGoal {
     // Map specific goal logic if needed. keeping simple.
     return {
         resourceType: "Goal",
         id: String(goal.id),
         lifecycleStatus: "active",
         description: {
             text: `Goal for ${goal.monthStart} to ${goal.monthEnd}`,
             coding: []
         },
         subject: {
             reference: `Patient/${patientId}`
         },
     };
}

export async function exportGoalsFHIR(patientId: number, from?: string, to?: string): Promise<FHIRBundle> {
     return {
         resourceType: "Bundle",
         id: `bundle-goals-${Date.now()}`,
         type: "collection",
         timestamp: new Date().toISOString(),
         entry: []
     };
}

export async function exportFullBundleFHIR(patientId: number, from?: string, to?: string): Promise<FHIRBundle> {
    const patientResource = await exportPatientFHIR(patientId);
    const obsBundle = await exportObservationsFHIR(patientId, from, to);
    
    const entries: any[] = [
        { fullUrl: `urn:uuid:${patientResource.id}`, resource: patientResource }
    ];
    
    if (obsBundle.entry) {
        entries.push(...obsBundle.entry);
    }
    
    return {
        resourceType: "Bundle",
        id: `bundle-full-${Date.now()}`,
        type: "collection",
        timestamp: new Date().toISOString(),
        entry: entries
    };
}
