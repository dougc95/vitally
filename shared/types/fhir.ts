
// Minimal FHIR R4 Type Definitions needed for this project

export type FHIRResourceType = "Patient" | "Observation" | "Goal" | "Bundle";

export interface FHIRResource {
  resourceType: FHIRResourceType;
  id: string;
  meta?: {
    profile?: string[];
    [key: string]: any;
  };
  text?: {
    status: "generated" | "extensions" | "additional" | "empty";
    div: string;
  };
}

export interface FHIRCoding {
  system: string; // e.g., "http://loinc.org"
  code: string;
  display?: string;
}

export interface FHIRCodeableConcept {
  coding: FHIRCoding[];
  text?: string;
}

export interface FHIRReference {
  reference: string;
  display?: string;
}

export interface FHIRPatient extends FHIRResource {
  resourceType: "Patient";
  identifier?: {
    system?: string;
    value: string;
  }[];
  active?: boolean;
  name?: {
    use?: "official" | "usual" | "nickname";
    family?: string;
    given?: string[];
    text?: string;
  }[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  address?: {
      line?: string[];
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
  }[];
}

export interface FHIRObservation extends FHIRResource {
  resourceType: "Observation";
  status: "final" | "preliminary" | "amended" | "corrected";
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference; // Reference to Patient
  effectiveDateTime?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string; // e.g., "http://unitsofmeasure.org"
    code?: string;
  };
  valueString?: string;
  note?: {
    text: string;
  }[];
}

export interface FHIRGoal extends FHIRResource {
  resourceType: "Goal";
  lifecycleStatus: "proposed" | "planned" | "accepted" | "active" | "on-hold" | "completed" | "cancelled" | "entered-in-error" | "rejected";
  description: FHIRCodeableConcept;
  subject: FHIRReference;
  target?: {
    measure?: FHIRCodeableConcept;
    detailQuantity?: {
      value: number;
      unit: string;
    };
    dueDate?: string;
  }[];
}

export interface FHIRBundle extends FHIRResource {
  resourceType: "Bundle";
  type: "document" | "message" | "transaction" | "transaction-response" | "batch" | "batch-response" | "history" | "searchset" | "collection";
  timestamp?: string;
  entry?: {
    fullUrl?: string;
    resource: FHIRResource;
  }[];
}
