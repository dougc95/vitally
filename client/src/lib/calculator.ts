import { type MacroCalcInput } from "@shared/schema";

// Types for calculation results
export interface CalculationResult {
  bmrMifflin: number;
  bmrHarrisBenedict: number;
  bmrAverage: number;
  tdee: number;
  goalCalories: number;
  macros: {
    protein: { g: number; kcal: number; pct: number };
    fat: { g: number; kcal: number; pct: number };
    carbs: { g: number; kcal: number; pct: number };
  };
}

// Mifflin-St Jeor Equation
// Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
// Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
export function calculateMifflin(
  weight: number,
  height: number,
  age: number,
  sex: "male" | "female"
): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

// Harris-Benedict Revised (1984) Equation
// Men: 88.362 + (13.397 × weight in kg) + (4.799 × height in cm) - (5.677 × age in years)
// Women: 447.593 + (9.247 × weight in kg) + (3.098 × height in cm) - (4.330 × age in years)
export function calculateHarrisBenedict(
  weight: number,
  height: number,
  age: number,
  sex: "male" | "female"
): number {
  if (sex === "male") {
    return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  } else {
    return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
  }
}

export function calculateMacros(input: MacroCalcInput): CalculationResult {
  // 1. Calculate BMRs
  const bmrMifflin = calculateMifflin(
    input.weightKg,
    input.heightCm,
    input.age,
    input.sex
  );
  const bmrHarrisBenedict = calculateHarrisBenedict(
    input.weightKg,
    input.heightCm,
    input.age,
    input.sex
  );
  const bmrAverage = (bmrMifflin + bmrHarrisBenedict) / 2;

  // 2. Calculate TDEE
  const tdee = bmrAverage * input.activityFactor;

  // 3. Goal Calories
  const goalCalories = tdee + input.goalAdjustmentKcal;

  // 4. Macros
  let proteinG = 0;

  // Protein Logic
  // If BF% >= Threshold (default 20%) AND use FFM is true:
  if (input.bodyFatPct >= input.bfThresholdPct && input.useFFMWhenHighBF) {
    const ffm = input.weightKg * (1 - input.bodyFatPct / 100);
    proteinG = ffm * input.proteinFactorFFM;
  } else {
    // Standard lean mass logic or standard total weight logic
    proteinG = input.weightKg * input.proteinFactor;
  }

  // Fat Logic
  const fatG = input.weightKg * input.fatGPerKg;

  // Calories from P & F
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;

  // Carbs Logic (Remainder)
  let carbsKcal = goalCalories - proteinKcal - fatKcal;

  // Safety check for negative carbs (if calorie deficit is too aggressive)
  if (carbsKcal < 0) carbsKcal = 0;

  const carbsG = carbsKcal / 4;

  // Calculate percentages
  const totalKcalCalc = proteinKcal + fatKcal + carbsKcal; // Actual total from macros

  return {
    bmrMifflin: Math.round(bmrMifflin),
    bmrHarrisBenedict: Math.round(bmrHarrisBenedict),
    bmrAverage: Math.round(bmrAverage),
    tdee: Math.round(tdee),
    goalCalories: Math.round(goalCalories),
    macros: {
      protein: {
        g: Math.round(proteinG),
        kcal: Math.round(proteinKcal),
        pct: Math.round((proteinKcal / totalKcalCalc) * 100),
      },
      fat: {
        g: Math.round(fatG),
        kcal: Math.round(fatKcal),
        pct: Math.round((fatKcal / totalKcalCalc) * 100),
      },
      carbs: {
        g: Math.round(carbsG),
        kcal: Math.round(carbsKcal),
        pct: Math.round((carbsKcal / totalKcalCalc) * 100),
      },
    },
  };
}
