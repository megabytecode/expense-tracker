import type { CategoryBudgetRow, IncomeCategoryRow } from "./CategoryBudgetTables";

export function getExpenseCategoryValue(category: CategoryBudgetRow) {
  return category.actualAmount ?? 0;
}

export function getIncomeCategoryValue(category: IncomeCategoryRow) {
  return category.totalAmount ?? 0;
}

export function sortExpenseCategories(categories: CategoryBudgetRow[]) {
  return [...categories].sort((left, right) => {
    const valueDelta = getExpenseCategoryValue(right) - getExpenseCategoryValue(left);
    if (valueDelta !== 0) return valueDelta;
    return left.name.localeCompare(right.name, "es");
  });
}

export function sortIncomeCategories(categories: IncomeCategoryRow[]) {
  return [...categories].sort((left, right) => {
    const valueDelta = getIncomeCategoryValue(right) - getIncomeCategoryValue(left);
    if (valueDelta !== 0) return valueDelta;
    return left.name.localeCompare(right.name, "es");
  });
}

export function sumExpenseCategories(categories: CategoryBudgetRow[]) {
  return categories.reduce((sum, category) => sum + getExpenseCategoryValue(category), 0);
}

export function sumIncomeCategories(categories: IncomeCategoryRow[]) {
  return categories.reduce((sum, category) => sum + getIncomeCategoryValue(category), 0);
}
