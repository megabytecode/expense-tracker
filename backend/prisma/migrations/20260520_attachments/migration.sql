CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT,
    "transferId" TEXT,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "storageKey" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attachments_single_owner_chk" CHECK (
        ("transactionId" IS NOT NULL AND "transferId" IS NULL)
        OR ("transactionId" IS NULL AND "transferId" IS NOT NULL)
    )
);

CREATE INDEX "attachments_userId_isDeleted_idx" ON "attachments"("userId", "isDeleted");
CREATE INDEX "attachments_transactionId_idx" ON "attachments"("transactionId");
CREATE INDEX "attachments_transferId_idx" ON "attachments"("transferId");

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_transferId_fkey"
    FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
