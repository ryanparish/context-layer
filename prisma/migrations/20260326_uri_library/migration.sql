CREATE TABLE IF NOT EXISTS "UriTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'ANY',
  "baseUrl" TEXT NOT NULL,
  "segments" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UriTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UriTemplate_tenantId_category_idx" ON "UriTemplate"("tenantId", "category");
CREATE INDEX IF NOT EXISTS "UriTemplate_tenantId_sourceType_idx" ON "UriTemplate"("tenantId", "sourceType");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UriTemplate_tenantId_fkey') THEN
    ALTER TABLE "UriTemplate"
      ADD CONSTRAINT "UriTemplate_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
