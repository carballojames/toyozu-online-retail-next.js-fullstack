-- CreateTable
CREATE TABLE "approved_address" (
    "approved_address_id" SERIAL NOT NULL,
    "street_house_building_no" VARCHAR(255) NOT NULL,
    "barangay_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "approved_address_pkey" PRIMARY KEY ("approved_address_id")
);

-- AddColumn
ALTER TABLE "address" ADD COLUMN "approved_address_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_approved_address_barangay" ON "approved_address"("barangay_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_approved_address_barangay_street" ON "approved_address"("barangay_id", "street_house_building_no");

-- AddForeignKey
ALTER TABLE "approved_address" ADD CONSTRAINT "approved_address_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangay"("barangay_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_approved_address_id_fkey" FOREIGN KEY ("approved_address_id") REFERENCES "approved_address"("approved_address_id") ON DELETE SET NULL ON UPDATE NO ACTION;
