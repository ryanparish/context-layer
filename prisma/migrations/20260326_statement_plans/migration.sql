CREATE TABLE IF NOT EXISTS "XapiStatementPlan" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "uriTemplateId" TEXT,
  "mapping" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "XapiStatementPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "XapiStatementPlan_tenantId_active_idx" ON "XapiStatementPlan"("tenantId", "active");
CREATE INDEX IF NOT EXISTS "XapiStatementPlan_tenantId_uriTemplateId_idx" ON "XapiStatementPlan"("tenantId", "uriTemplateId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'XapiStatementPlan_tenantId_fkey') THEN
    ALTER TABLE "XapiStatementPlan"
      ADD CONSTRAINT "XapiStatementPlan_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
