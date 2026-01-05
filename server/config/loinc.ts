
export const LOINC_MAPPING: Record<string, { code: string; display: string }> = {
  // Weights
  "weight": { code: "29463-7", display: "Body weight" },

  // Circumferences
  "waist": { code: "56115-9", display: "Waist Circumference by Tape measure" },
  "hips": { code: "56114-2", display: "Hip Circumference" },
  "chest": { code: "56110-0", display: "Chest Circumference" },
  
  // Specific body parts often map to generic circumference + body site qualifier in full FHIR
  // But for simple coding we might use available specific codes or generic "Body part Circumference"
  // Using best effort standard codes:
  "bicep_r": { code: "56113-4", display: "Upper arm Circumference" }, // Note: Needs bodySite: Right
  "bicep_l": { code: "56113-4", display: "Upper arm Circumference" }, // Note: Needs bodySite: Left
  "thigh_r": { code: "56117-5", display: "Thigh Circumference" },
  "thigh_l": { code: "56117-5", display: "Thigh Circumference" },
  
  // Shoulders is tricky, often "Shoulder Girth"
  "shoulders": { code: "8289-1", display: "Shoulder girth" }, // "Head, Chest, Waist, Hip, Mid Upper Arm, Thigh, Calf, Ankle Circumference" panel? No.
  // 8289-1 is "Shoulder circumference" (Deprecated? No, often used).
  
  // Body Fat
  "body_fat": { code: "41982-0", display: "Percentage of body fat Measured" },
};
