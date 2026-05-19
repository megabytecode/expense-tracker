CREATE INDEX IF NOT EXISTS "auth_otps_email_consumed_expires_created_idx"
  ON "auth_otps" ("email", "consumedAt", "expiresAt", "createdAt");

CREATE INDEX IF NOT EXISTS "sessions_user_revoked_idx"
  ON "sessions" ("userId", "revokedAt");

CREATE INDEX IF NOT EXISTS "accounts_user_active_deleted_idx"
  ON "accounts" ("userId", "isActive", "deletedAt");

CREATE INDEX IF NOT EXISTS "accounts_user_type_active_deleted_idx"
  ON "accounts" ("userId", "type", "isActive", "deletedAt");

CREATE INDEX IF NOT EXISTS "categories_user_type_active_deleted_idx"
  ON "categories" ("userId", "type", "isActive", "deletedAt");

CREATE INDEX IF NOT EXISTS "categories_user_system_key_idx"
  ON "categories" ("userId", "systemKey");

CREATE INDEX IF NOT EXISTS "transactions_user_type_occurred_idx"
  ON "transactions" ("userId", "type", "occurredAt");

CREATE INDEX IF NOT EXISTS "transactions_user_category_occurred_idx"
  ON "transactions" ("userId", "categoryId", "occurredAt");

CREATE INDEX IF NOT EXISTS "transaction_allocations_transaction_idx"
  ON "transaction_allocations" ("transactionId");

CREATE INDEX IF NOT EXISTS "transaction_allocations_account_idx"
  ON "transaction_allocations" ("accountId");

CREATE INDEX IF NOT EXISTS "transfers_user_occurred_idx"
  ON "transfers" ("userId", "occurredAt");

CREATE INDEX IF NOT EXISTS "transfers_source_occurred_idx"
  ON "transfers" ("sourceAccountId", "occurredAt");

CREATE INDEX IF NOT EXISTS "transfers_destination_occurred_idx"
  ON "transfers" ("destinationAccountId", "occurredAt");

CREATE UNIQUE INDEX IF NOT EXISTS "category_budget_allocations_user_category_key"
  ON "category_budget_allocations" ("userId", "categoryId");

CREATE INDEX IF NOT EXISTS "category_budget_allocations_category_idx"
  ON "category_budget_allocations" ("categoryId");

CREATE INDEX IF NOT EXISTS "audit_logs_user_created_idx"
  ON "audit_logs" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx"
  ON "audit_logs" ("entityType", "entityId");
