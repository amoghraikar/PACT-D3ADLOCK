export interface Variant {
  id: string;
  label: string;
  pack_size: number;
  pack_unit: string;
  selling_price_paise: number;
  mrp_paise: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category_id: string;
  category_name: string;
  image_url: string;
  est_unit_price_paise: number;
  mrp_paise: number;
  variants: Variant[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

export const FALLBACK_CATEGORIES: Category[] = [
  { id: "cat-1", slug: "rice-grains", name: "Rice & Grains", sort_order: 1 },
  { id: "cat-2", slug: "flours-atta", name: "Flours & Atta", sort_order: 2 },
  { id: "cat-3", slug: "dal-pulses", name: "Dal (Lentils) & Pulses", sort_order: 3 },
  { id: "cat-4", slug: "spices", name: "Spices", sort_order: 4 },
  { id: "cat-5", slug: "sugar-jaggery", name: "Sugar & Jaggery", sort_order: 5 },
  { id: "cat-6", slug: "oils-ghee", name: "Cooking Oils & Ghee", sort_order: 6 },
  { id: "cat-7", slug: "sauces-pickles", name: "Sauces, Pickles & Spreads", sort_order: 7 },
  { id: "cat-8", slug: "dry-fruits", name: "Dry Fruits", sort_order: 8 },
  { id: "cat-9", slug: "fruits-nuts", name: "Fruits & Nuts", sort_order: 9 },
  { id: "cat-10", slug: "beverages", name: "Beverages", sort_order: 10 },
  { id: "cat-11", slug: "snacks", name: "Snacks", sort_order: 11 },
  { id: "cat-12", slug: "breakfast-cereals", name: "Breakfast & Cereals", sort_order: 12 },
];

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "prod-rice-sona",
    name: "Sona Masoori Rice",
    brand: "Royal Harvest",
    category_id: "cat-1",
    category_name: "Rice & Grains",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 25000,
    mrp_paise: 28000,
    variants: [
      {
        id: "var-rice-sona-5kg",
        label: "5 kg",
        pack_size: 5,
        pack_unit: "kg",
        selling_price_paise: 25000,
        mrp_paise: 28000,
      },
      {
        id: "var-rice-sona-1kg",
        label: "1 kg",
        pack_size: 1,
        pack_unit: "kg",
        selling_price_paise: 5500,
        mrp_paise: 6500,
      },
    ],
  },
  {
    id: "prod-rice-basmati",
    name: "Classic Basmati Rice",
    brand: "Heritage Gold",
    category_id: "cat-1",
    category_name: "Rice & Grains",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 42000,
    mrp_paise: 48000,
    variants: [
      {
        id: "var-rice-basmati-5kg",
        label: "5 kg",
        pack_size: 5,
        pack_unit: "kg",
        selling_price_paise: 42000,
        mrp_paise: 48000,
      },
      {
        id: "var-rice-basmati-1kg",
        label: "1 kg",
        pack_size: 1,
        pack_unit: "kg",
        selling_price_paise: 9000,
        mrp_paise: 11000,
      },
    ],
  },
  {
    id: "prod-flour-atta",
    name: "Whole Wheat Chakki Atta",
    brand: "Aashirvaad",
    category_id: "cat-2",
    category_name: "Flours & Atta",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 22000,
    mrp_paise: 25000,
    variants: [
      {
        id: "var-atta-5kg",
        label: "5 kg",
        pack_size: 5,
        pack_unit: "kg",
        selling_price_paise: 22000,
        mrp_paise: 25000,
      },
      {
        id: "var-atta-10kg",
        label: "10 kg",
        pack_size: 10,
        pack_unit: "kg",
        selling_price_paise: 41000,
        mrp_paise: 48000,
      },
    ],
  },
  {
    id: "prod-dal-toor",
    name: "Premium Toor Dal (Arhar)",
    brand: "Tata Sampann",
    category_id: "cat-3",
    category_name: "Dal (Lentils) & Pulses",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 14000,
    mrp_paise: 16000,
    variants: [
      {
        id: "var-toor-dal-1kg",
        label: "1 kg",
        pack_size: 1,
        pack_unit: "kg",
        selling_price_paise: 14000,
        mrp_paise: 16000,
      },
      {
        id: "var-toor-dal-2kg",
        label: "2 kg",
        pack_size: 2,
        pack_unit: "kg",
        selling_price_paise: 27000,
        mrp_paise: 31000,
      },
    ],
  },
  {
    id: "prod-dal-moong",
    name: "Yellow Moong Dal (Split)",
    brand: "Organic Tattva",
    category_id: "cat-3",
    category_name: "Dal (Lentils) & Pulses",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 13500,
    mrp_paise: 15500,
    variants: [
      {
        id: "var-moong-dal-1kg",
        label: "1 kg",
        pack_size: 1,
        pack_unit: "kg",
        selling_price_paise: 13500,
        mrp_paise: 15500,
      },
    ],
  },
  {
    id: "prod-oil-sunflower",
    name: "Refined Sunflower Oil",
    brand: "Sunpure",
    category_id: "cat-6",
    category_name: "Cooking Oils & Ghee",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 16000,
    mrp_paise: 18000,
    variants: [
      {
        id: "var-sunflower-oil-1l",
        label: "1 L",
        pack_size: 1,
        pack_unit: "L",
        selling_price_paise: 16000,
        mrp_paise: 18000,
      },
      {
        id: "var-sunflower-oil-5l",
        label: "5 L Can",
        pack_size: 5,
        pack_unit: "L",
        selling_price_paise: 76000,
        mrp_paise: 87000,
      },
    ],
  },
  {
    id: "prod-oil-mustard",
    name: "Cold-Pressed Kachi Ghani Mustard Oil",
    brand: "Fortune",
    category_id: "cat-6",
    category_name: "Cooking Oils & Ghee",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 17500,
    mrp_paise: 19500,
    variants: [
      {
        id: "var-mustard-oil-1l",
        label: "1 L",
        pack_size: 1,
        pack_unit: "L",
        selling_price_paise: 17500,
        mrp_paise: 19500,
      },
    ],
  },
  {
    id: "prod-sugar-crystal",
    name: "Refined Crystal Sugar (Sulfur-Free)",
    brand: "Madhur",
    category_id: "cat-5",
    category_name: "Sugar & Jaggery",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 4500,
    mrp_paise: 5000,
    variants: [
      {
        id: "var-sugar-1kg",
        label: "1 kg",
        pack_size: 1,
        pack_unit: "kg",
        selling_price_paise: 4500,
        mrp_paise: 5000,
      },
      {
        id: "var-sugar-5kg",
        label: "5 kg",
        pack_size: 5,
        pack_unit: "kg",
        selling_price_paise: 21500,
        mrp_paise: 24500,
      },
    ],
  },
  {
    id: "prod-spices-salt",
    name: "Iodised Crystal Salt",
    brand: "Tata Salt",
    category_id: "cat-4",
    category_name: "Spices",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 2500,
    mrp_paise: 2800,
    variants: [
      {
        id: "var-salt-1kg",
        label: "1 kg",
        pack_size: 1,
        pack_unit: "kg",
        selling_price_paise: 2500,
        mrp_paise: 2800,
      },
    ],
  },
  {
    id: "prod-spices-turmeric",
    name: "Pure Salem Turmeric Powder (Haldi)",
    brand: "Everest",
    category_id: "cat-4",
    category_name: "Spices",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 6500,
    mrp_paise: 7500,
    variants: [
      {
        id: "var-turmeric-500g",
        label: "500 g",
        pack_size: 500,
        pack_unit: "g",
        selling_price_paise: 6500,
        mrp_paise: 7500,
      },
    ],
  },
  {
    id: "prod-beverages-tea",
    name: "Red Label Strong CTC Tea",
    brand: "Brooke Bond",
    category_id: "cat-10",
    category_name: "Beverages",
    image_url: "/brand/pact-mark.png",
    est_unit_price_paise: 13000,
    mrp_paise: 15000,
    variants: [
      {
        id: "var-tea-500g",
        label: "500 g",
        pack_size: 500,
        pack_unit: "g",
        selling_price_paise: 13000,
        mrp_paise: 15000,
      },
      {
        id: "var-tea-1kg",
        label: "1 kg",
        pack_size: 1,
        pack_unit: "kg",
        selling_price_paise: 25000,
        mrp_paise: 29000,
      },
    ],
  },
];
