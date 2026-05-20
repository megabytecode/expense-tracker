ALTER TABLE "users"
ADD COLUMN "monthlyPlanMode" TEXT NOT NULL DEFAULT 'amount';

ALTER TABLE "category_budget_allocations"
ADD COLUMN "amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0;

UPDATE "category_budget_allocations" cba
SET "amount" = ROUND((u."monthlyExpenseBase" * cba."percentage" / 100.0)::numeric, 2)
FROM "users" u
WHERE u."id" = cba."userId";
