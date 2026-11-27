-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "full_name" VARCHAR(100) NOT NULL,
    "role_id" UUID NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "otp_hash" VARCHAR(128) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "address" TEXT NOT NULL,
    "city" VARCHAR(80) NOT NULL DEFAULT 'Bengaluru',
    "postal_code" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "total_floors" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartments" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "building_id" UUID,
    "unit_number" VARCHAR(30) NOT NULL,
    "floor_number" INTEGER,

    CONSTRAINT "apartments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_memberships" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "apartment_id" UUID,
    "role" VARCHAR(30) NOT NULL DEFAULT 'resident',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "store_name" VARCHAR(120) NOT NULL,
    "business_address" TEXT NOT NULL,
    "gstin" VARCHAR(30),
    "phone" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "retailers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailer_communities" (
    "id" UUID NOT NULL,
    "retailer_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "delivery_fee_paise" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retailer_communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "icon" VARCHAR(50),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "brand" VARCHAR(100),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(60) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "unit" VARCHAR(40) NOT NULL,
    "pack_quantity" INTEGER NOT NULL DEFAULT 1,
    "mrp_paise" INTEGER NOT NULL,
    "default_price_paise" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "alt_text" VARCHAR(200),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "retailer_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "current_stock_qty" INTEGER NOT NULL DEFAULT 0,
    "reserved_stock_qty" INTEGER NOT NULL DEFAULT 0,
    "reorder_level_qty" INTEGER NOT NULL DEFAULT 15,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" UUID NOT NULL,
    "retailer_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "batch_number" VARCHAR(60) NOT NULL,
    "inward_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMPTZ,
    "quantity" INTEGER NOT NULL,
    "cost_price_paise" INTEGER NOT NULL,
    "supplier_name" VARCHAR(120),

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "retailer_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "movement_type" VARCHAR(30) NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "reference_id" VARCHAR(80),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_cycles" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "cycle_month" VARCHAR(7) NOT NULL,
    "cutoff_at" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "shopping_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_cart_items" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_orders" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "retailer_id" UUID NOT NULL,
    "order_number" VARCHAR(60) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "total_requested_items" INTEGER NOT NULL DEFAULT 0,
    "total_packed_items" INTEGER NOT NULL DEFAULT 0,
    "subtotal_paise" INTEGER NOT NULL DEFAULT 0,
    "discount_paise" INTEGER NOT NULL DEFAULT 0,
    "delivery_fee_paise" INTEGER NOT NULL DEFAULT 0,
    "total_paise" INTEGER NOT NULL DEFAULT 0,
    "placed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ,
    "dispatched_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,

    CONSTRAINT "bulk_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_order_items" (
    "id" UUID NOT NULL,
    "bulk_order_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "requested_qty" INTEGER NOT NULL,
    "packed_qty" INTEGER NOT NULL DEFAULT 0,
    "unit_price_paise" INTEGER NOT NULL,
    "subtotal_paise" INTEGER NOT NULL,
    "is_unavailable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bulk_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailer_packing_items" (
    "id" UUID NOT NULL,
    "bulk_order_item_id" UUID NOT NULL,
    "batch_id" UUID,
    "packed_qty" INTEGER NOT NULL,
    "notes" VARCHAR(255),
    "packed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retailer_packing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailer_bills" (
    "id" UUID NOT NULL,
    "bulk_order_id" UUID NOT NULL,
    "retailer_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "bill_number" VARCHAR(60) NOT NULL,
    "gross_amount_paise" INTEGER NOT NULL,
    "discount_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "delivery_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "net_amount_paise" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'finalized',
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ,

    CONSTRAINT "retailer_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "bulk_order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "invoice_number" VARCHAR(60) NOT NULL,
    "base_amount_paise" INTEGER NOT NULL,
    "discount_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "delivery_fee_paise" INTEGER NOT NULL DEFAULT 0,
    "total_amount_paise" INTEGER NOT NULL,
    "paid_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'unpaid',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "requested_qty" INTEGER NOT NULL,
    "packed_qty" INTEGER NOT NULL,
    "unit_price_paise" INTEGER NOT NULL,
    "line_total_paise" INTEGER NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_allocations" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "discount_type" VARCHAR(50) NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "description" VARCHAR(200),

    CONSTRAINT "discount_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "gateway" VARCHAR(40) NOT NULL DEFAULT 'mock',
    "transaction_id" VARCHAR(100),
    "gateway_order_id" VARCHAR(100),
    "status" VARCHAR(30) NOT NULL DEFAULT 'initiated',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_record_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
    "initiated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "bulk_order_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    "dispatched_at" TIMESTAMPTZ,
    "arrived_at_gate" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_handovers" (
    "id" UUID NOT NULL,
    "delivery_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "handed_over_by_user_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "handover_timestamp" TIMESTAMPTZ,
    "notes" TEXT,

    CONSTRAINT "delivery_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "message" TEXT NOT NULL,
    "kind" VARCHAR(40) NOT NULL DEFAULT 'general',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" VARCHAR(30) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(60) NOT NULL,
    "entity_id" VARCHAR(80) NOT NULL,
    "payload_after" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "payload" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "request_path" VARCHAR(255) NOT NULL,
    "response_code" INTEGER NOT NULL,
    "response_body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_configs" (
    "key" VARCHAR(80) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "otp_verifications_phone_created_at_idx" ON "otp_verifications"("phone", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "communities_code_key" ON "communities"("code");

-- CreateIndex
CREATE INDEX "buildings_community_id_idx" ON "buildings"("community_id");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_community_id_name_key" ON "buildings"("community_id", "name");

-- CreateIndex
CREATE INDEX "apartments_community_id_idx" ON "apartments"("community_id");

-- CreateIndex
CREATE INDEX "apartments_building_id_idx" ON "apartments"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "apartments_community_id_unit_number_key" ON "apartments"("community_id", "unit_number");

-- CreateIndex
CREATE INDEX "community_memberships_community_id_idx" ON "community_memberships"("community_id");

-- CreateIndex
CREATE INDEX "community_memberships_user_id_idx" ON "community_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_memberships_community_id_user_id_key" ON "community_memberships"("community_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "retailers_user_id_key" ON "retailers"("user_id");

-- CreateIndex
CREATE INDEX "retailers_store_name_idx" ON "retailers"("store_name");

-- CreateIndex
CREATE INDEX "retailer_communities_retailer_id_idx" ON "retailer_communities"("retailer_id");

-- CreateIndex
CREATE INDEX "retailer_communities_community_id_idx" ON "retailer_communities"("community_id");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_communities_retailer_id_community_id_key" ON "retailer_communities"("retailer_id", "community_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_title_idx" ON "products"("title");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE INDEX "inventory_items_retailer_id_idx" ON "inventory_items"("retailer_id");

-- CreateIndex
CREATE INDEX "inventory_items_variant_id_idx" ON "inventory_items"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_retailer_id_variant_id_key" ON "inventory_items"("retailer_id", "variant_id");

-- CreateIndex
CREATE INDEX "stock_batches_retailer_id_idx" ON "stock_batches"("retailer_id");

-- CreateIndex
CREATE INDEX "stock_batches_variant_id_idx" ON "stock_batches"("variant_id");

-- CreateIndex
CREATE INDEX "inventory_movements_retailer_id_idx" ON "inventory_movements"("retailer_id");

-- CreateIndex
CREATE INDEX "inventory_movements_variant_id_idx" ON "inventory_movements"("variant_id");

-- CreateIndex
CREATE INDEX "shopping_cycles_community_id_idx" ON "shopping_cycles"("community_id");

-- CreateIndex
CREATE INDEX "shopping_cycles_status_idx" ON "shopping_cycles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_cycles_community_id_cycle_month_key" ON "shopping_cycles"("community_id", "cycle_month");

-- CreateIndex
CREATE INDEX "community_cart_items_cycle_id_idx" ON "community_cart_items"("cycle_id");

-- CreateIndex
CREATE INDEX "community_cart_items_community_id_idx" ON "community_cart_items"("community_id");

-- CreateIndex
CREATE INDEX "community_cart_items_user_id_idx" ON "community_cart_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_cart_items_cycle_id_user_id_variant_id_key" ON "community_cart_items"("cycle_id", "user_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_orders_order_number_key" ON "bulk_orders"("order_number");

-- CreateIndex
CREATE INDEX "bulk_orders_retailer_id_idx" ON "bulk_orders"("retailer_id");

-- CreateIndex
CREATE INDEX "bulk_orders_status_idx" ON "bulk_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_orders_cycle_id_community_id_key" ON "bulk_orders"("cycle_id", "community_id");

-- CreateIndex
CREATE INDEX "bulk_order_items_bulk_order_id_idx" ON "bulk_order_items"("bulk_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_order_items_bulk_order_id_variant_id_key" ON "bulk_order_items"("bulk_order_id", "variant_id");

-- CreateIndex
CREATE INDEX "retailer_packing_items_bulk_order_item_id_idx" ON "retailer_packing_items"("bulk_order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_bills_bulk_order_id_key" ON "retailer_bills"("bulk_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_bills_bill_number_key" ON "retailer_bills"("bill_number");

-- CreateIndex
CREATE INDEX "retailer_bills_retailer_id_idx" ON "retailer_bills"("retailer_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_user_id_idx" ON "invoices"("user_id");

-- CreateIndex
CREATE INDEX "invoices_community_id_idx" ON "invoices"("community_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_bulk_order_id_user_id_key" ON "invoices"("bulk_order_id", "user_id");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "discount_allocations_invoice_id_idx" ON "discount_allocations"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_transaction_id_key" ON "payment_records"("transaction_id");

-- CreateIndex
CREATE INDEX "payment_records_invoice_id_idx" ON "payment_records"("invoice_id");

-- CreateIndex
CREATE INDEX "payment_records_gateway_order_id_idx" ON "payment_records"("gateway_order_id");

-- CreateIndex
CREATE INDEX "refunds_payment_record_id_idx" ON "refunds"("payment_record_id");

-- CreateIndex
CREATE INDEX "refunds_invoice_id_idx" ON "refunds"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_bulk_order_id_key" ON "deliveries"("bulk_order_id");

-- CreateIndex
CREATE INDEX "deliveries_community_id_idx" ON "deliveries"("community_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_handovers_invoice_id_key" ON "delivery_handovers"("invoice_id");

-- CreateIndex
CREATE INDEX "delivery_handovers_delivery_id_idx" ON "delivery_handovers"("delivery_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_channel_key" ON "notification_preferences"("user_id", "channel");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "outbox_events_is_processed_created_at_idx" ON "outbox_events"("is_processed", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_idempotency_key_key" ON "idempotency_records"("idempotency_key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailers" ADD CONSTRAINT "retailers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_communities" ADD CONSTRAINT "retailer_communities_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_communities" ADD CONSTRAINT "retailer_communities_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_cycles" ADD CONSTRAINT "shopping_cycles_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_cart_items" ADD CONSTRAINT "community_cart_items_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "shopping_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_cart_items" ADD CONSTRAINT "community_cart_items_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_cart_items" ADD CONSTRAINT "community_cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_cart_items" ADD CONSTRAINT "community_cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_orders" ADD CONSTRAINT "bulk_orders_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "shopping_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_orders" ADD CONSTRAINT "bulk_orders_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_orders" ADD CONSTRAINT "bulk_orders_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_order_items" ADD CONSTRAINT "bulk_order_items_bulk_order_id_fkey" FOREIGN KEY ("bulk_order_id") REFERENCES "bulk_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_order_items" ADD CONSTRAINT "bulk_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_packing_items" ADD CONSTRAINT "retailer_packing_items_bulk_order_item_id_fkey" FOREIGN KEY ("bulk_order_item_id") REFERENCES "bulk_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_packing_items" ADD CONSTRAINT "retailer_packing_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_bills" ADD CONSTRAINT "retailer_bills_bulk_order_id_fkey" FOREIGN KEY ("bulk_order_id") REFERENCES "bulk_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_bills" ADD CONSTRAINT "retailer_bills_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_bills" ADD CONSTRAINT "retailer_bills_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bulk_order_id_fkey" FOREIGN KEY ("bulk_order_id") REFERENCES "bulk_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_allocations" ADD CONSTRAINT "discount_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_record_id_fkey" FOREIGN KEY ("payment_record_id") REFERENCES "payment_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_bulk_order_id_fkey" FOREIGN KEY ("bulk_order_id") REFERENCES "bulk_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_handovers" ADD CONSTRAINT "delivery_handovers_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_handovers" ADD CONSTRAINT "delivery_handovers_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_handovers" ADD CONSTRAINT "delivery_handovers_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_handovers" ADD CONSTRAINT "delivery_handovers_handed_over_by_user_id_fkey" FOREIGN KEY ("handed_over_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
