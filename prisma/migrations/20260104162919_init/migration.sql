-- CreateTable
CREATE TABLE "address" (
    "address_id" SERIAL NOT NULL,
    "street_house_building_no" VARCHAR(255),
    "barangay_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "is_default" BOOLEAN DEFAULT false,

    CONSTRAINT "address_pkey" PRIMARY KEY ("address_id")
);

-- CreateTable
CREATE TABLE "auth_group" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,

    CONSTRAINT "auth_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_group_permissions" (
    "id" BIGSERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "auth_group_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_permission" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "content_type_id" INTEGER NOT NULL,
    "codename" VARCHAR(100) NOT NULL,

    CONSTRAINT "auth_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barangay" (
    "barangay_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "municipality_id" INTEGER,

    CONSTRAINT "barangay_pkey" PRIMARY KEY ("barangay_id")
);

-- CreateTable
CREATE TABLE "brand" (
    "brand_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "brand_pkey" PRIMARY KEY ("brand_id")
);

-- CreateTable
CREATE TABLE "car_models" (
    "model_id" SERIAL NOT NULL,
    "car_id" INTEGER NOT NULL,
    "model_name" VARCHAR(255) NOT NULL,

    CONSTRAINT "car_models_pkey" PRIMARY KEY ("model_id")
);

-- CreateTable
CREATE TABLE "cars" (
    "car_id" SERIAL NOT NULL,
    "make" VARCHAR(255) NOT NULL,

    CONSTRAINT "cars_pkey" PRIMARY KEY ("car_id")
);

-- CreateTable
CREATE TABLE "category" (
    "category_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "category_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "condition_item" (
    "condition_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "condition_item_pkey" PRIMARY KEY ("condition_id")
);

-- CreateTable
CREATE TABLE "courier" (
    "courier_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "base_rate" DECIMAL(10,2) DEFAULT 50.00,
    "rate_per_kg" DECIMAL(10,2) DEFAULT 30.00,
    "max_weight" DECIMAL(10,2),
    "delivery_time" VARCHAR(100),

    CONSTRAINT "courier_pkey" PRIMARY KEY ("courier_id")
);

-- CreateTable
CREATE TABLE "customer" (
    "customer_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact_number" VARCHAR(20),
    "address_id" INTEGER,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "delivery" (
    "delivery_id" SERIAL NOT NULL,
    "sale_id" INTEGER,
    "courier_id" INTEGER,
    "address_id" INTEGER,
    "delivery_fee" INTEGER,
    "overall_total" INTEGER NOT NULL,
    "date" DATE,
    "status_id" INTEGER,
    "tracking_number" VARCHAR(255),

    CONSTRAINT "delivery_pkey" PRIMARY KEY ("delivery_id")
);

-- CreateTable
CREATE TABLE "delivery_history" (
    "history_id" BIGSERIAL NOT NULL,
    "delivery_id" INTEGER NOT NULL,
    "status_id" INTEGER NOT NULL,
    "timestamp_changed" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    "location_details" VARCHAR(255),

    CONSTRAINT "delivery_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "delivery_statuses" (
    "status_id" SERIAL NOT NULL,
    "status_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sequence_order" INTEGER NOT NULL,

    CONSTRAINT "delivery_statuses_pkey" PRIMARY KEY ("status_id")
);

-- CreateTable
CREATE TABLE "django_admin_log" (
    "id" SERIAL NOT NULL,
    "action_time" TIMESTAMPTZ(6) NOT NULL,
    "object_id" TEXT,
    "object_repr" VARCHAR(200) NOT NULL,
    "action_flag" SMALLINT NOT NULL,
    "change_message" TEXT NOT NULL,
    "content_type_id" INTEGER,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "django_admin_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "django_content_type" (
    "id" SERIAL NOT NULL,
    "app_label" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,

    CONSTRAINT "django_content_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "django_migrations" (
    "id" BIGSERIAL NOT NULL,
    "app" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "applied" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "django_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "django_session" (
    "session_key" VARCHAR(40) NOT NULL,
    "session_data" TEXT NOT NULL,
    "expire_date" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "django_session_pkey" PRIMARY KEY ("session_key")
);

-- CreateTable
CREATE TABLE "merchant" (
    "merchant_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "merchant_pkey" PRIMARY KEY ("merchant_id")
);

-- CreateTable
CREATE TABLE "mode_payment" (
    "payment_id" SERIAL NOT NULL,
    "merchant_id" INTEGER,
    "sale_id" INTEGER,
    "ref" VARCHAR(255),

    CONSTRAINT "mode_payment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "municipality" (
    "municipality_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "postal_code" VARCHAR(20),
    "province_id" INTEGER,

    CONSTRAINT "municipality_pkey" PRIMARY KEY ("municipality_id")
);

-- CreateTable
CREATE TABLE "otp_email_emaildevice" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(16),
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "email" VARCHAR(254),
    "throttling_failure_count" INTEGER NOT NULL,
    "throttling_failure_timestamp" TIMESTAMPTZ(6),
    "last_generated_timestamp" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),

    CONSTRAINT "otp_email_emaildevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "product_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "brand_id" INTEGER,
    "category_id" INTEGER,
    "purchase_price" INTEGER,
    "selling_price" INTEGER,
    "quantity" INTEGER,
    "weight" DOUBLE PRECISION DEFAULT 0.5,

    CONSTRAINT "product_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "product_car_compatibility" (
    "product_id" INTEGER NOT NULL,
    "model_id" INTEGER NOT NULL,
    "start_year_id" INTEGER NOT NULL,
    "end_year_id" INTEGER NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "product_car_compatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_image" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "image" VARCHAR(100) NOT NULL,
    "image_bytes" BYTEA,
    "image_mime" VARCHAR(100),
    "image_updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "product_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_years" (
    "year_id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "product_years_pkey" PRIMARY KEY ("year_id")
);

-- CreateTable
CREATE TABLE "province" (
    "province_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "region_id" INTEGER,

    CONSTRAINT "province_pkey" PRIMARY KEY ("province_id")
);

-- CreateTable
CREATE TABLE "region" (
    "region_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "region_pkey" PRIMARY KEY ("region_id")
);

-- CreateTable
CREATE TABLE "return_item" (
    "return_id" SERIAL NOT NULL,
    "sale_id" INTEGER,
    "product_id" INTEGER,
    "quantity" INTEGER,
    "reason" VARCHAR(255),
    "date" DATE,

    CONSTRAINT "return_item_pkey" PRIMARY KEY ("return_id")
);

-- CreateTable
CREATE TABLE "role_type" (
    "role_id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,

    CONSTRAINT "role_type_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "sale" (
    "sale_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "total_amount" INTEGER,
    "payment_type" VARCHAR(255),
    "date" DATE,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("sale_id")
);

-- CreateTable
CREATE TABLE "sale_details" (
    "sale_detail_id" SERIAL NOT NULL,
    "sale_id" INTEGER,
    "product_id" INTEGER,
    "quantity" INTEGER,
    "selling_price" INTEGER,
    "sub_total" INTEGER,

    CONSTRAINT "sale_details_pkey" PRIMARY KEY ("sale_detail_id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "supplier_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact_number" VARCHAR(20),
    "address" VARCHAR(255),

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "supplier_email" (
    "email_id" SERIAL NOT NULL,
    "email" VARCHAR(255),
    "supplier_id" INTEGER,

    CONSTRAINT "supplier_email_pkey" PRIMARY KEY ("email_id")
);

-- CreateTable
CREATE TABLE "supply" (
    "supply_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "supplier_id" INTEGER,
    "total_cost" DECIMAL(10,2),
    "receipt_number" TEXT NOT NULL,
    "date" DATE,

    CONSTRAINT "supply_pkey" PRIMARY KEY ("supply_id")
);

-- CreateTable
CREATE TABLE "supply_details" (
    "id" SERIAL NOT NULL,
    "supply_id" INTEGER,
    "product_id" INTEGER,
    "quantity" INTEGER,
    "price" INTEGER,
    "sub_total" DECIMAL(10,2),
    "condition_id" INTEGER,

    CONSTRAINT "supply_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cart" (
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_at_addition" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "cart_id" SERIAL NOT NULL,

    CONSTRAINT "user_cart_pkey" PRIMARY KEY ("cart_id")
);

-- CreateTable
CREATE TABLE "user_employee" (
    "user_id" SERIAL NOT NULL,
    "user_name" VARCHAR(255) NOT NULL,
    "username" VARCHAR(150) NOT NULL,
    "password" VARCHAR(128) NOT NULL,
    "email" VARCHAR(255),
    "mobile_phone" VARCHAR(20),
    "role_id" INTEGER NOT NULL,
    "profile_picture" VARCHAR(255),
    "profile_picture_bytes" BYTEA,
    "profile_picture_mime" VARCHAR(100),
    "profile_picture_updated_at" TIMESTAMPTZ(6),
    "is_superuser" BOOLEAN DEFAULT false,
    "last_login" TIMESTAMP(6),
    "contact_type" VARCHAR(10) DEFAULT 'email',

    CONSTRAINT "user_employee_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_otp" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "used" BOOLEAN NOT NULL,
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "user_otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_group_name_key" ON "auth_group"("name");

-- CreateIndex
CREATE INDEX "auth_group_name_a6ea08ec_like" ON "auth_group"("name");

-- CreateIndex
CREATE INDEX "auth_group_permissions_group_id_b120cbf9" ON "auth_group_permissions"("group_id");

-- CreateIndex
CREATE INDEX "auth_group_permissions_permission_id_84c5c92e" ON "auth_group_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_group_permissions_group_id_permission_id_0cd325b0_uniq" ON "auth_group_permissions"("group_id", "permission_id");

-- CreateIndex
CREATE INDEX "auth_permission_content_type_id_2f476e4b" ON "auth_permission"("content_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_permission_content_type_id_codename_01ab375a_uniq" ON "auth_permission"("content_type_id", "codename");

-- CreateIndex
CREATE UNIQUE INDEX "car_models_car_id_model_name_key" ON "car_models"("car_id", "model_name");

-- CreateIndex
CREATE UNIQUE INDEX "cars_make_key" ON "cars"("make");

-- CreateIndex
CREATE INDEX "idx_delivery_history_delivery_ts" ON "delivery_history"("delivery_id", "timestamp_changed" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_statuses_status_name_key" ON "delivery_statuses"("status_name");

-- CreateIndex
CREATE INDEX "django_admin_log_content_type_id_c4bce8eb" ON "django_admin_log"("content_type_id");

-- CreateIndex
CREATE INDEX "django_admin_log_user_id_c564eba6" ON "django_admin_log"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "django_content_type_app_label_model_76bd3d3b_uniq" ON "django_content_type"("app_label", "model");

-- CreateIndex
CREATE INDEX "django_session_expire_date_a5c62663" ON "django_session"("expire_date");

-- CreateIndex
CREATE INDEX "django_session_session_key_c0390e0f_like" ON "django_session"("session_key");

-- CreateIndex
CREATE INDEX "otp_email_emaildevice_user_id_0215c274" ON "otp_email_emaildevice"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_years_year_key" ON "product_years"("year");

-- CreateIndex
CREATE UNIQUE INDEX "user_cart_user_product_unique" ON "user_cart"("user_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_employee_username_key" ON "user_employee"("username");

-- CreateIndex
CREATE INDEX "user_otp_user_id_c742b812" ON "user_otp"("user_id");

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangay"("barangay_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "fk_address_user" FOREIGN KEY ("user_id") REFERENCES "user_employee"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_group_permissions" ADD CONSTRAINT "auth_group_permissio_permission_id_84c5c92e_fk_auth_perm" FOREIGN KEY ("permission_id") REFERENCES "auth_permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_group_permissions" ADD CONSTRAINT "auth_group_permissions_group_id_b120cbf9_fk_auth_group_id" FOREIGN KEY ("group_id") REFERENCES "auth_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_permission" ADD CONSTRAINT "auth_permission_content_type_id_2f476e4b_fk_django_co" FOREIGN KEY ("content_type_id") REFERENCES "django_content_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "barangay" ADD CONSTRAINT "barangay_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipality"("municipality_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "car_models" ADD CONSTRAINT "car_models_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("car_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "address"("address_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "address"("address_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier"("courier_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("sale_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "fk_delivery_current_status" FOREIGN KEY ("status_id") REFERENCES "delivery_statuses"("status_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delivery_history" ADD CONSTRAINT "delivery_history_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "delivery"("delivery_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delivery_history" ADD CONSTRAINT "delivery_history_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "delivery_statuses"("status_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delivery_history" ADD CONSTRAINT "delivery_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_employee"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "django_admin_log" ADD CONSTRAINT "django_admin_log_content_type_id_c4bce8eb_fk_django_co" FOREIGN KEY ("content_type_id") REFERENCES "django_content_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mode_payment" ADD CONSTRAINT "mode_payment_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("merchant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mode_payment" ADD CONSTRAINT "mode_payment_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("sale_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "municipality" ADD CONSTRAINT "municipality_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "province"("province_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("brand_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_car_compatibility" ADD CONSTRAINT "product_car_compatibility_end_year_id_fkey" FOREIGN KEY ("end_year_id") REFERENCES "product_years"("year_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_car_compatibility" ADD CONSTRAINT "product_car_compatibility_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "car_models"("model_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_car_compatibility" ADD CONSTRAINT "product_car_compatibility_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_car_compatibility" ADD CONSTRAINT "product_car_compatibility_start_year_id_fkey" FOREIGN KEY ("start_year_id") REFERENCES "product_years"("year_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "fk_product" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "province" ADD CONSTRAINT "province_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "region"("region_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "return_item" ADD CONSTRAINT "return_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "return_item" ADD CONSTRAINT "return_item_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("sale_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("sale_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_email" ADD CONSTRAINT "supplier_email_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supply" ADD CONSTRAINT "supply_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supply_details" ADD CONSTRAINT "supply_details_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "condition_item"("condition_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supply_details" ADD CONSTRAINT "supply_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supply_details" ADD CONSTRAINT "supply_details_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supply"("supply_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_cart" ADD CONSTRAINT "user_cart_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_cart" ADD CONSTRAINT "user_cart_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_employee"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_employee" ADD CONSTRAINT "user_employee_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "role_type"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
