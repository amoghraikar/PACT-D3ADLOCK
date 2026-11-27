import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { CategorySummaryDTO, PaginatedResponseDTO, ProductSummaryDTO } from "@pact/shared";
import { prisma } from "../db/prisma.js";
import { NotFoundError } from "../lib/errors.js";

const productsQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  category_slug: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  retailer_id: z.string().uuid().optional(),
});

function formatProduct(
  p: {
    id: string;
    title: string;
    brand: string | null;
    description: string | null;
    categoryId: string;
    category: { name: string; slug: string };
    images: { imageUrl: string; isPrimary: boolean; displayOrder: number }[];
    variants: {
      id: string;
      sku: string;
      title: string;
      unit: string;
      packQuantity: number;
      mrpPaise: number;
      defaultPricePaise: number;
      isActive: boolean;
      inventoryItems: { currentStockQty: number; reservedStockQty: number; isActive: boolean }[];
    }[];
  }
): ProductSummaryDTO {
  const activeVariants = p.variants.filter((v) => v.isActive);
  const prices = activeVariants.map((v) => v.defaultPricePaise);
  const primaryImage =
    p.images.find((img) => img.isPrimary)?.imageUrl ?? p.images[0]?.imageUrl ?? null;

  const variantDtos = activeVariants.map((v) => {
    const inv = v.inventoryItems[0];
    const availableQty = inv ? Math.max(0, inv.currentStockQty - inv.reservedStockQty) : null;
    const isVariantAvailable = inv ? inv.isActive && availableQty !== null && availableQty > 0 : v.isActive;
    return {
      id: v.id,
      sku: v.sku,
      title: v.title,
      unit: v.unit,
      pack_quantity: v.packQuantity,
      mrp_paise: v.mrpPaise,
      default_price_paise: v.defaultPricePaise,
      is_available: isVariantAvailable,
      current_stock_qty: availableQty,
    };
  });

  return {
    id: p.id,
    title: p.title,
    brand: p.brand,
    description: p.description,
    category_id: p.categoryId,
    category_name: p.category.name,
    category_slug: p.category.slug,
    primary_image_url: primaryImage,
    min_price_paise: prices.length > 0 ? Math.min(...prices) : 0,
    max_price_paise: prices.length > 0 ? Math.max(...prices) : 0,
    variants_count: variantDtos.length,
    is_available: variantDtos.some((v) => v.is_available),
    variants: variantDtos,
  };
}

export async function catalogueRoutes(app: FastifyInstance) {
  app.get<{ Reply: CategorySummaryDTO[] }>("/categories", async () => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      display_order: c.displayOrder,
      product_count: c._count.products,
    }));
  });

  app.get<{ Querystring: z.infer<typeof productsQuerySchema>; Reply: PaginatedResponseDTO<ProductSummaryDTO> }>(
    "/products",
    async (req) => {
      const q = productsQuerySchema.parse(req.query);
      const where: Record<string, unknown> = { isActive: true };

      if (q.category_id) {
        where.categoryId = q.category_id;
      } else if (q.category_slug && q.category_slug !== "all") {
        where.category = { slug: q.category_slug };
      }

      if (q.search?.trim()) {
        const term = q.search.trim();
        where.OR = [
          { title: { contains: term, mode: "insensitive" } },
          { brand: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ];
      }

      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: [{ title: "asc" }],
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: {
            category: true,
            images: { orderBy: { displayOrder: "asc" } },
            variants: {
              where: { isActive: true },
              orderBy: { defaultPricePaise: "asc" },
              include: {
                inventoryItems: q.retailer_id
                  ? { where: { retailerId: q.retailer_id } }
                  : { take: 1 },
              },
            },
          },
        }),
      ]);

      return {
        data: products.map(formatProduct),
        meta: {
          total,
          page: q.page,
          limit: q.limit,
          pages: Math.max(1, Math.ceil(total / q.limit)),
        },
      };
    }
  );

  app.get<{ Params: { id: string }; Reply: ProductSummaryDTO }>("/products/:id", async (req) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        images: { orderBy: { displayOrder: "asc" } },
        variants: {
          where: { isActive: true },
          orderBy: { defaultPricePaise: "asc" },
          include: { inventoryItems: { take: 1 } },
        },
      },
    });
    if (!product || !product.isActive) {
      throw new NotFoundError("Product not found.");
    }
    return formatProduct(product);
  });
}
