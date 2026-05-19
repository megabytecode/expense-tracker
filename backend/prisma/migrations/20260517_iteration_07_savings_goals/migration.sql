ALTER TABLE "users"
ADD COLUMN "savingsGoalRebalanceNotifiedAt" TIMESTAMP(3),
ADD COLUMN "savingsGoalRebalanceSeenAt" TIMESTAMP(3);

ALTER TABLE "savings_goals"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

UPDATE "savings_goals"
SET "status" = CASE
  WHEN "isActive" = TRUE THEN 'active'
  ELSE 'inactive'
END;

CREATE INDEX "savings_goals_user_id_status_idx"
ON "savings_goals"("userId", "status");

DELETE FROM "savings_goal_allocations" a
USING "savings_goal_allocations" b
WHERE a."id" < b."id"
  AND a."savingsGoalId" = b."savingsGoalId";

CREATE UNIQUE INDEX "savings_goal_allocations_savings_goal_id_key"
ON "savings_goal_allocations"("savingsGoalId");
