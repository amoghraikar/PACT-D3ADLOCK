import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { getCycleWindowIST, ROLES } from "@pact/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface RawVariant {
  sku: string;
  title: string;
  unit: string;
  mrp: number;
  price: number;
  stock: number;
}

interface RawProduct {
  category_slug: string;
  title: string;
  brand?: string;
  description?: string;
  image_url?: string;
  variants: RawVariant[];
}

interface RawCategory {
  name: string;
  slug: string;
  icon: string;
  display_order: number;
}

interface SeedDataset {
  categories: RawCategory[];
  products: RawProduct[];
}

const prisma = new PrismaClient();

export async function runSeed(client: PrismaClient = prisma) {
  const dataPath = resolve(__dirname, "../src/data/seed-data.json");
  const dataset = JSON.parse(readFileSync(dataPath, "utf8")) as SeedDataset;

  // 1. Seed canonical roles
  const rolesSpec = [
    { name: ROLES.CUSTOMER, description: "Apartment resident consumer" },
    { name: ROLES.RETAILER, description: "Partner merchant / kirana supplier" },
    { name: ROLES.COMMUNITY_ADMIN, description: "Apartment building administrator" },
    { name: ROLES.PLATFORM_ADMIN, description: "Platform super administrator" },
  ];

  const roleMap = new Map<string, string>();
  for (const r of rolesSpec) {
    const role = await client.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roleMap.set(r.name, role.id);
  }

  // 2. Seed platform defaults
  const defaultConfigs = [
    { key: "cutoff_day", value: "22" },
    { key: "cutoff_hour", value: "17" },
    { key: "cutoff_minute", value: "27" },
    { key: "reminder_rate_limit_minutes", value: "60" },
  ];
  for (const cfg of defaultConfigs) {
    await client.platformConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
  }

  // 3. Seed communities
  const greenMeadows = await client.community.upsert({
    where: { code: "GREEN_MEADOWS" },
    update: {},
    create: {
      name: "Green Meadows Apartment",
      code: "GREEN_MEADOWS",
      address: "Survey 42/1, Sarjapur Road, Bellandur",
      city: "Bengaluru",
      postalCode: "560102",
      isActive: true,
    },
  });

  await client.community.upsert({
    where: { code: "LAKEVIEW" },
    update: {},
    create: {
      name: "Lakeview Residency",
      code: "LAKEVIEW",
      address: "45 Wind Tunnel Road, Murugeshpalya",
      city: "Bengaluru",
      postalCode: "560017",
      isActive: true,
    },
  });

  // 4. Buildings & Apartments in Green Meadows
  const towerA = await client.building.upsert({
    where: { communityId_name: { communityId: greenMeadows.id, name: "Tower A" } },
    update: {},
    create: { communityId: greenMeadows.id, name: "Tower A", totalFloors: 14 },
  });

  const aptUnits = ["A-101", "A-102", "A-201", "A-202", "A-301", "A-402"];
  const aptMap = new Map<string, string>();
  for (const unit of aptUnits) {
    const floor = Number.parseInt(unit.split("-")[1]?.[0] ?? "1", 10) || 1;
    const apt = await client.apartment.upsert({
      where: { communityId_unitNumber: { communityId: greenMeadows.id, unitNumber: unit } },
      update: {},
      create: {
        communityId: greenMeadows.id,
        buildingId: towerA.id,
        unitNumber: unit,
        floorNumber: floor,
      },
    });
    aptMap.set(unit, apt.id);
  }

  // 5. Seed core users across roles
  const usersSpec = [
    { phone: "+919999900001", fullName: "Asha Sharma", role: ROLES.CUSTOMER, unit: "A-101" },
    { phone: "+919999900002", fullName: "Bharat Patel", role: ROLES.CUSTOMER, unit: "A-102" },
    { phone: "+919999900003", fullName: "Dev Nair", role: ROLES.CUSTOMER, unit: "A-201" },
    { phone: "+919999900031", fullName: "Meera Iyer", role: ROLES.COMMUNITY_ADMIN, unit: "A-202" },
    { phone: "+919999900021", fullName: "Ravi Mohan", role: ROLES.RETAILER, unit: null },
    { phone: "+919999900099", fullName: "PACT Operations Admin", role: ROLES.PLATFORM_ADMIN, unit: null },
  ];

  const userMap = new Map<string, string>();
  for (const u of usersSpec) {
    const roleId = roleMap.get(u.role)!;
    const user = await client.user.upsert({
      where: { phone: u.phone },
      update: {},
      create: {
        phone: u.phone,
        fullName: u.fullName,
        roleId,
        language: "en",
        isActive: true,
      },
    });
    userMap.set(u.phone, user.id);

    if (u.unit) {
      const apartmentId = aptMap.get(u.unit) ?? null;
      await client.communityMembership.upsert({
        where: {
          communityId_userId: { communityId: greenMeadows.id, userId: user.id },
        },
        update: {},
        create: {
          communityId: greenMeadows.id,
          userId: user.id,
          apartmentId,
          role: u.role === ROLES.COMMUNITY_ADMIN ? "admin" : "resident",
          isActive: true,
        },
      });
    }
  }

  // 6. Seed Retailer profile & community mapping
  const raviUserId = userMap.get("+919999900021")!;
  const retailer = await client.retailer.upsert({
    where: { userId: raviUserId },
    update: {},
    create: {
      userId: raviUserId,
      storeName: "Mohan Kirana & Daily Needs",
      businessAddress: "Shop 4, Green Glen Layout, Bellandur, Bengaluru",
      gstin: "29ABCDE1234F1Z5",
      phone: "+919999900021",
      status: "active",
    },
  });

  await client.retailerCommunity.upsert({
    where: {
      retailerId_communityId: { retailerId: retailer.id, communityId: greenMeadows.id },
    },
    update: {},
    create: {
      retailerId: retailer.id,
      communityId: greenMeadows.id,
      isPrimary: true,
      isActive: true,
      deliveryFeePaise: 15000,
    },
  });

  // 7. Seed 12 Categories & 72 Indian Grocery Products + Variants + Inventory
  const catMap = new Map<string, string>();
  for (const c of dataset.categories) {
    const category = await client.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, displayOrder: c.display_order, icon: c.icon },
      create: {
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        displayOrder: c.display_order,
        isActive: true,
      },
    });
    catMap.set(c.slug, category.id);
  }

  for (const p of dataset.products) {
    const categoryId = catMap.get(p.category_slug)!;
    let product = await client.product.findFirst({ where: { title: p.title } });
    if (!product) {
      product = await client.product.create({
        data: {
          categoryId,
          title: p.title,
          brand: p.brand ?? null,
          description: p.description ?? null,
          isActive: true,
          images: p.image_url
            ? {
                create: {
                  imageUrl: p.image_url,
                  altText: p.title,
                  displayOrder: 0,
                  isPrimary: true,
                },
              }
            : undefined,
        },
      });
    }

    for (const v of p.variants) {
      const variant = await client.productVariant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          productId: product.id,
          sku: v.sku,
          title: v.title,
          unit: v.unit,
          packQuantity: 1,
          mrpPaise: v.mrp,
          defaultPricePaise: v.price,
          isActive: true,
        },
      });

      const existingInv = await client.inventoryItem.findUnique({
        where: {
          retailerId_variantId: { retailerId: retailer.id, variantId: variant.id },
        },
      });
      if (!existingInv) {
        const stock = v.stock ?? 50;
        await client.inventoryItem.create({
          data: {
            retailerId: retailer.id,
            variantId: variant.id,
            currentStockQty: stock,
            reservedStockQty: 0,
            reorderLevelQty: 15,
            isActive: true,
          },
        });
        await client.stockBatch.create({
          data: {
            retailerId: retailer.id,
            variantId: variant.id,
            batchNumber: `BATCH-${variant.sku.slice(0, 8)}-01`,
            quantity: stock,
            costPricePaise: Math.floor(v.price * 0.85),
            supplierName: "Metro Cash & Carry Wholesale",
          },
        });
        await client.inventoryMovement.create({
          data: {
            retailerId: retailer.id,
            variantId: variant.id,
            movementType: "inward",
            quantityDelta: stock,
            referenceId: `INIT-${variant.sku}`,
            notes: "Initial stock batch inward",
          },
        });
      }
    }
  }

  // 8. Seed active OPEN cycle based on Asia/Kolkata current clock
  const { cycleMonth, cutoffAt } = getCycleWindowIST(new Date(), 22, 17, 27);
  await client.shoppingCycle.upsert({
    where: {
      communityId_cycleMonth: { communityId: greenMeadows.id, cycleMonth },
    },
    update: {},
    create: {
      communityId: greenMeadows.id,
      cycleMonth,
      cutoffAt,
      status: "OPEN",
    },
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed()
    .then(() => {
      console.log("[PACT Seed] Seeded roles, communities, 12 categories, 72 products, and active cycle.");
      return prisma.$disconnect();
    })
    .catch((err) => {
      console.error("[PACT Seed] Failed:", err);
      process.exit(1);
    });
}
