-- CreateTable
CREATE TABLE "Endpoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "headers" JSONB NOT NULL DEFAULT '{}',
    "body" TEXT,
    "expectedStatus" INTEGER NOT NULL DEFAULT 200,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EndpointCheck" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "responseMs" INTEGER,
    "error" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EndpointCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EndpointCheck_endpointId_checkedAt_idx" ON "EndpointCheck"("endpointId", "checkedAt" DESC);

-- AddForeignKey
ALTER TABLE "EndpointCheck" ADD CONSTRAINT "EndpointCheck_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "Endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
