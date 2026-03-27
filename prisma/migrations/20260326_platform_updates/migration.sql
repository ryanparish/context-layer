-- Add connection scheduling fields.
ALTER TABLE "Connection"
  ADD COLUMN IF NOT EXISTS "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "syncCron" TEXT;

-- xAPI verb catalog.
CREATE TABLE IF NOT EXISTS "XapiVerb" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "iri" TEXT NOT NULL,
  "display" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "XapiVerb_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "XapiVerb_tenantId_iri_key" ON "XapiVerb"("tenantId", "iri");
CREATE INDEX IF NOT EXISTS "XapiVerb_tenantId_idx" ON "XapiVerb"("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'XapiVerb_tenantId_fkey') THEN
    ALTER TABLE "XapiVerb"
      ADD CONSTRAINT "XapiVerb_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- xAPI URI catalog.
CREATE TABLE IF NOT EXISTS "XapiUri" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "iri" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'CUSTOM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "XapiUri_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "XapiUri_tenantId_iri_key" ON "XapiUri"("tenantId", "iri");
CREATE INDEX IF NOT EXISTS "XapiUri_tenantId_kind_idx" ON "XapiUri"("tenantId", "kind");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'XapiUri_tenantId_fkey') THEN
    ALTER TABLE "XapiUri"
      ADD CONSTRAINT "XapiUri_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Storyline bridge models.
CREATE TABLE IF NOT EXISTS "StorylineBridge" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorylineBridge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StorylineBridge_tenantId_idx" ON "StorylineBridge"("tenantId");
CREATE INDEX IF NOT EXISTS "StorylineBridge_connectionId_idx" ON "StorylineBridge"("connectionId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StorylineBridge_tenantId_fkey') THEN
    ALTER TABLE "StorylineBridge"
      ADD CONSTRAINT "StorylineBridge_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StorylineBridge_connectionId_fkey') THEN
    ALTER TABLE "StorylineBridge"
      ADD CONSTRAINT "StorylineBridge_connectionId_fkey"
      FOREIGN KEY ("connectionId") REFERENCES "Connection"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "StorylineVariable" (
  "id" TEXT NOT NULL,
  "bridgeId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "storylineName" TEXT NOT NULL,
  "jsonPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorylineVariable_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StorylineVariable_bridgeId_key_key" ON "StorylineVariable"("bridgeId", "key");
CREATE INDEX IF NOT EXISTS "StorylineVariable_bridgeId_idx" ON "StorylineVariable"("bridgeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StorylineVariable_bridgeId_fkey') THEN
    ALTER TABLE "StorylineVariable"
      ADD CONSTRAINT "StorylineVariable_bridgeId_fkey"
      FOREIGN KEY ("bridgeId") REFERENCES "StorylineBridge"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
