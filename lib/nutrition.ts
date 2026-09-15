export type NutritionIngredient = { name: string; grams: number };

type NutritionRow = { terms: string[]; calories: number; protein: number };

// 每 100g 常见可食部的近似值。这里用于稳定计算，不让模型直接随口报总热量。
const NUTRITION_ROWS: NutritionRow[] = [
  { terms: ["鸡胸肉", "鸡胸"], calories: 133, protein: 24.6 },
  { terms: ["鸡腿肉", "鸡腿"], calories: 181, protein: 16 },
  { terms: ["瘦猪肉", "猪里脊", "里脊肉"], calories: 143, protein: 20.3 },
  { terms: ["牛肉"], calories: 125, protein: 20 },
  { terms: ["鱼肉", "鱼片", "鱼"], calories: 110, protein: 20 },
  { terms: ["虾仁", "虾"], calories: 93, protein: 18.6 },
  { terms: ["鸡蛋", "蛋液"], calories: 144, protein: 13.3 },
  { terms: ["嫩豆腐", "豆腐"], calories: 70, protein: 6.5 },
  { terms: ["熟米饭", "剩米饭", "米饭"], calories: 116, protein: 2.6 },
  { terms: ["熟面条", "面条"], calories: 110, protein: 3.5 },
  { terms: ["燕麦"], calories: 338, protein: 10.1 },
  { terms: ["红薯", "地瓜"], calories: 86, protein: 1.6 },
  { terms: ["土豆", "马铃薯"], calories: 77, protein: 2 },
  { terms: ["玉米"], calories: 112, protein: 4 },
  { terms: ["番茄", "西红柿"], calories: 15, protein: .9 },
  { terms: ["卷心菜", "包菜", "圆白菜"], calories: 24, protein: 1.5 },
  { terms: ["西兰花"], calories: 36, protein: 4.1 },
  { terms: ["菠菜"], calories: 28, protein: 2.6 },
  { terms: ["生菜"], calories: 16, protein: 1.3 },
  { terms: ["黄瓜"], calories: 16, protein: .8 },
  { terms: ["胡萝卜"], calories: 32, protein: 1 },
  { terms: ["青椒", "彩椒"], calories: 22, protein: 1 },
  { terms: ["蘑菇", "香菇", "菌菇"], calories: 26, protein: 2.7 },
  { terms: ["洋葱"], calories: 40, protein: 1.1 },
  { terms: ["小葱", "葱花", "葱"], calories: 27, protein: 1.6 },
  { terms: ["牛奶"], calories: 54, protein: 3 },
  { terms: ["酸奶"], calories: 72, protein: 2.5 },
];

function findNutrition(name: string) {
  const normalized = name.replace(/\s/g, "");
  return NUTRITION_ROWS.find((row) => row.terms.some((term) => normalized.includes(term)));
}

function roundTo(value: number, step: number) {
  return Math.max(0, Math.round(value / step) * step);
}

export function estimateRecipeNutrition(input: {
  ingredients?: NutritionIngredient[];
  baseCalories?: number;
  baseProtein?: number;
  baseOilGrams?: number;
  portionScale: number;
  oilGrams: number;
}) {
  const portionScale = Math.max(.5, Math.min(2, input.portionScale));
  const oilGrams = Math.max(0, Math.min(30, input.oilGrams));
  const ingredients = (input.ingredients || []).filter((item) => item.name && Number.isFinite(item.grams) && item.grams > 0);
  let foodCalories = 0;
  let protein = 0;
  let matched = 0;

  for (const ingredient of ingredients) {
    const row = findNutrition(ingredient.name);
    if (!row) continue;
    matched += 1;
    const grams = ingredient.grams * portionScale;
    foodCalories += grams * row.calories / 100;
    protein += grams * row.protein / 100;
  }

  const databaseBased = ingredients.length > 0 && matched === ingredients.length;
  if (!databaseBased) {
    const originalOilCalories = (input.baseOilGrams ?? 8) * 9;
    foodCalories = Math.max(0, (input.baseCalories ?? 450) - originalOilCalories) * portionScale;
    protein = (input.baseProtein ?? 20) * portionScale;
  }

  const calories = foodCalories + oilGrams * 9;
  const calorieMargin = Math.max(25, calories * .12);
  const proteinMargin = Math.max(1, protein * .1);

  return {
    calories: roundTo(calories, 10),
    calorieLow: roundTo(calories - calorieMargin, 10),
    calorieHigh: roundTo(calories + calorieMargin, 10),
    protein: roundTo(protein, 1),
    proteinLow: roundTo(protein - proteinMargin, 1),
    proteinHigh: roundTo(protein + proteinMargin, 1),
    source: databaseBased ? "按常见食材营养数据计算" : "按识别份量与菜谱估算",
    assumptions: ingredients.map((item) => ({ name: item.name, grams: roundTo(item.grams * portionScale, 5) })),
  };
}
