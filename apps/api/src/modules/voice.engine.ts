import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  VoiceClarificationOptionDTO,
  VoiceInterpretResponseDTO,
  VoiceInterpretedItemDTO,
} from "@pact/shared";
import { prisma } from "../db/prisma.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface VoiceTablesData {
  FILLERS_TO_DROP: string[];
  FRACTIONS_TABLE: Record<string, number>;
  JOINERS: string[];
  NUMBERS_TABLE: Record<string, number>;
  PRODUCT_NORMALIZATIONS: Record<string, string>;
  UNITS_TABLE: Record<string, [string, number, string]>;
}

let cachedTables: VoiceTablesData | null = null;
export function getVoiceTables(): VoiceTablesData {
  if (!cachedTables) {
    const p = resolve(__dirname, "../data/voice-tables.json");
    cachedTables = JSON.parse(readFileSync(p, "utf8")) as VoiceTablesData;
  }
  return cachedTables;
}

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigramsA.set(bg, (bigramsA.get(bg) ?? 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const count = bigramsA.get(bg) ?? 0;
    if (count > 0) {
      bigramsA.set(bg, count - 1);
      hits++;
    }
  }
  return (2 * hits) / (a.length - 1 + (b.length - 1));
}

export function normaliseTranscript(text: string): string {
  if (!text) return "";
  const tables = getVoiceTables();
  let res = text.toLowerCase().trim();

  for (const filler of [...tables.FILLERS_TO_DROP].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(?:^|\\s)${escapeRegex(filler)}(?:\\s|$)`, "gi");
    res = res.replace(re, " ");
  }

  for (const [dev, digit] of Object.entries(DEVANAGARI_DIGITS)) {
    res = res.replaceAll(dev, digit);
  }

  for (const [phrase, val] of Object.entries(tables.FRACTIONS_TABLE).sort(
    (a, b) => b[0].length - a[0].length
  )) {
    const re = new RegExp(`(?:^|(?<=\\s))${escapeRegex(phrase)}(?=\\s|$)`, "gi");
    res = res.replace(re, String(val));
  }

  for (const [word, val] of Object.entries(tables.NUMBERS_TABLE).sort(
    (a, b) => b[0].length - a[0].length
  )) {
    const re = new RegExp(`(?:^|(?<=\\s))${escapeRegex(word)}(?=\\s|$)`, "gi");
    res = res.replace(re, String(val));
  }

  return res.replace(/\s+/g, " ").trim();
}

export interface ParsedVoiceSegment {
  heard: string;
  quantity: number | null;
  unit: string | null;
  productPhrase: string;
}

export function parseVoiceSegments(text: string): ParsedVoiceSegment[] {
  const tables = getVoiceTables();
  const normalised = normaliseTranscript(text);
  if (!normalised) return [];

  const splitRe = new RegExp(tables.JOINERS.map(escapeRegex).join("|"), "gi");
  const pieces = normalised.split(splitRe);

  const sortedUnits = Object.keys(tables.UNITS_TABLE).sort((a, b) => b.length - a.length);
  const unitRegex = sortedUnits.map(escapeRegex).join("|");

  const qtyUnitProd = new RegExp(
    `^\\s*(\\d+(?:\\.\\d+)?)\\s*(${unitRegex})\\s+(?:of\\s+)?(.+)$`,
    "i"
  );
  const prodQtyUnit = new RegExp(`^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s*(${unitRegex})\\s*$`, "i");
  const qtyProd =
    /^\s*(\d+(?:\.\d+)?)\s+(?:(?:packets?|packs?|pieces?|bottles?|boxes?)\s+of\s+|of\s+)?(.+)$/i;
  const prodQty = /^(.+?)\s+(\d+(?:\.\d+)?)\s*$/i;

  const segments: ParsedVoiceSegment[] = [];
  for (const raw of pieces) {
    let clean = raw
      .trim()
      .replace(/^(?:and|aur|और|plus|also|va|व|tatha|तथा|,|\s)+\b/i, "")
      .trim();
    if (!clean) continue;

    const m1 = qtyUnitProd.exec(clean);
    if (m1) {
      const unitEntry = tables.UNITS_TABLE[m1[2]!.toLowerCase()];
      segments.push({
        heard: clean,
        quantity: Number(m1[1]),
        unit: unitEntry ? unitEntry[0] : m1[2]!.toLowerCase(),
        productPhrase: m1[3]!.replace(/^of\s+/i, "").trim(),
      });
      continue;
    }

    const m2 = prodQtyUnit.exec(clean);
    if (m2) {
      const unitEntry = tables.UNITS_TABLE[m2[3]!.toLowerCase()];
      segments.push({
        heard: clean,
        quantity: Number(m2[2]),
        unit: unitEntry ? unitEntry[0] : m2[3]!.toLowerCase(),
        productPhrase: m2[1]!.trim(),
      });
      continue;
    }

    const m3 = qtyProd.exec(clean);
    if (m3) {
      segments.push({
        heard: clean,
        quantity: Number(m3[1]),
        unit: null,
        productPhrase: m3[2]!.replace(/^of\s+/i, "").trim(),
      });
      continue;
    }

    const m4 = prodQty.exec(clean);
    if (m4) {
      segments.push({
        heard: clean,
        quantity: Number(m4[2]),
        unit: null,
        productPhrase: m4[1]!.trim(),
      });
      continue;
    }

    clean = clean.replace(/^(?:some|thoda|thodi|kuch|ek do|a bit of|थोड़ा|थोड़ी|कुछ)\s+/i, "").trim();
    segments.push({ heard: clean, quantity: 1, unit: null, productPhrase: clean });
  }
  return segments;
}

function parseVariantDimension(unitStr: string): [string, number] {
  const m = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/.exec(unitStr.toLowerCase().trim());
  if (!m) return ["count", 1];
  const val = Number(m[1]);
  const u = m[2]!.toLowerCase();
  if (["kg", "kilo", "kilogram", "kgs"].includes(u)) return ["weight", val * 1000];
  if (["g", "gm", "gms", "gram", "grams"].includes(u)) return ["weight", val];
  if (["l", "lt", "ltr", "litre", "liter", "litres"].includes(u)) return ["volume", val * 1000];
  if (["ml", "milliliter", "millilitre"].includes(u)) return ["volume", val];
  return ["count", val];
}

function normalizeQueryPhrase(phrase: string): string {
  const normDict = getVoiceTables().PRODUCT_NORMALIZATIONS;
  const clean = phrase.toLowerCase().trim();
  if (normDict[clean]) return normDict[clean]!;

  const tokens = clean.split(/\s+/);
  for (let len = tokens.length; len >= 1; len--) {
    for (let i = 0; i <= tokens.length - len; i++) {
      const sub = tokens.slice(i, i + len).join(" ");
      if (normDict[sub]) {
        return clean.replace(sub, normDict[sub]!);
      }
    }
  }
  return clean;
}

const GENERIC_AMBIGUOUS_WORDS = new Set([
  "rice",
  "chawal",
  "oil",
  "tel",
  "dal",
  "sugar",
  "atta",
  "flour",
  "soap",
  "biscuit",
  "tea",
]);

export async function interpretVoiceOrder(
  text: string,
  language = "en-IN"
): Promise<VoiceInterpretResponseDTO> {
  const segments = parseVoiceSegments(text);
  const catalogue = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      variants: { where: { isActive: true }, orderBy: { defaultPricePaise: "asc" } },
    },
  });
  const activeCatalogue = catalogue.filter((p) => p.variants.length > 0);
  const tables = getVoiceTables();

  const items: VoiceInterpretedItemDTO[] = [];
  let matchedCount = 0;
  let clarificationCount = 0;
  let unmatchedCount = 0;
  let estimatedTotalPaise = 0;

  for (const seg of segments) {
    const queryPhrase = seg.productPhrase.toLowerCase().trim();
    const normalizedQuery = normalizeQueryPhrase(queryPhrase);
    const queryTokens = new Set(normalizedQuery.split(/\s+/).filter(Boolean));
    const origTokens = new Set(queryPhrase.split(/\s+/).filter(Boolean));
    const allTokens = new Set([...queryTokens, ...origTokens]);

    const scored: { prod: (typeof activeCatalogue)[number]; score: number }[] = [];

    for (const prod of activeCatalogue) {
      const titleLower = prod.title.toLowerCase();
      const brandLower = (prod.brand ?? "").toLowerCase();
      const catLower = prod.category.name.toLowerCase();

      const titleTokens = new Set(titleLower.match(/\w+/g) ?? []);
      const brandTokens = new Set(brandLower.match(/\w+/g) ?? []);
      const catTokens = new Set(catLower.match(/\w+/g) ?? []);

      let score = 0;
      const titleAndBrand = new Set([...titleTokens, ...brandTokens]);
      const allSubset = [...allTokens].every((t) => titleAndBrand.has(t));
      const normSubset = [...queryTokens].every((t) => titleAndBrand.has(t));

      if (normalizedQuery === titleLower) score = 1.0;
      else if (titleLower.includes(normalizedQuery)) score = 0.95;
      else if (allSubset && allTokens.size > 0) score = 0.92;
      else if (normSubset && queryTokens.size > 0) score = 0.9;
      else if ([...brandTokens].some((t) => allTokens.has(t))) {
        const restMatched = [...allTokens].some(
          (t) => !brandTokens.has(t) && (titleTokens.has(t) || catTokens.has(t))
        );
        score = restMatched ? 0.88 : 0.7;
      } else {
        const hits = [...allTokens].filter((t) => titleAndBrand.has(t)).length;
        if (hits > 0) score = Math.max(score, (hits / Math.max(1, allTokens.size)) * 0.85);
        let fuzzy = similarity(normalizedQuery, titleLower);
        for (const t of titleTokens) {
          if (t.length >= 4 && normalizedQuery.length >= 4) {
            fuzzy = Math.max(fuzzy, similarity(normalizedQuery, t) * 0.85);
          }
        }
        if (fuzzy > 0.65) score = Math.max(score, fuzzy * 0.88);
      }

      if (score >= 0.45) scored.push({ prod, score });
    }

    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      unmatchedCount++;
      items.push({
        heard: seg.heard,
        status: "unmatched",
        confidence: 0,
        product_id: null,
        product_title: null,
        variant_id: null,
        variant_title: null,
        requested_quantity: seg.quantity,
        requested_unit: seg.unit,
        pack_multiplier: 1,
        unit_price_paise: null,
        estimated_total_paise: null,
        needs_clarification: false,
        clarification_question: `Could not find "${seg.productPhrase}" in the grocery catalogue.`,
        clarification_options: [],
      });
      continue;
    }

    const best = scored[0]!;
    const second = scored[1];
    const isAmbiguous =
      Boolean(second) &&
      (GENERIC_AMBIGUOUS_WORDS.has(normalizedQuery) ||
        (best.score < 0.9 && Math.abs(best.score - second!.score) < 0.1));

    if (isAmbiguous) {
      clarificationCount++;
      const options: VoiceClarificationOptionDTO[] = [];
      for (const entry of scored.slice(0, 3)) {
        for (const v of entry.prod.variants.slice(0, 2)) {
          options.push({
            product_id: entry.prod.id,
            variant_id: v.id,
            product_title: entry.prod.title,
            variant_title: v.title,
            unit: v.unit,
            price_paise: v.defaultPricePaise,
            quantity: seg.quantity ?? 1,
          });
        }
      }
      items.push({
        heard: seg.heard,
        status: "ambiguous",
        confidence: Number(best.score.toFixed(2)),
        product_id: null,
        product_title: null,
        variant_id: null,
        variant_title: null,
        requested_quantity: seg.quantity,
        requested_unit: seg.unit,
        pack_multiplier: 1,
        unit_price_paise: null,
        estimated_total_paise: null,
        needs_clarification: true,
        clarification_question: `Which ${seg.productPhrase} would you like?`,
        clarification_options: options,
      });
      continue;
    }

    const bestProd = best.prod;
    const variants = bestProd.variants;
    let matchedVariant: (typeof variants)[number] | null = null;
    let packMultiplier = 1;

    let reqDim: string | null = null;
    let reqBaseUnits: number | null = null;
    if (seg.unit && tables.UNITS_TABLE[seg.unit]) {
      const [, mult, dim] = tables.UNITS_TABLE[seg.unit]!;
      reqDim = dim;
      if (seg.quantity !== null) reqBaseUnits = seg.quantity * mult;
    }

    if (reqBaseUnits && reqDim) {
      for (const v of variants) {
        const [vDim, vBase] = parseVariantDimension(v.unit);
        if (vDim === reqDim && Math.abs(vBase - reqBaseUnits) < 0.001) {
          matchedVariant = v;
          packMultiplier = 1;
          break;
        }
      }
      if (!matchedVariant) {
        const sortedBySize = [...variants].sort(
          (a, b) => parseVariantDimension(a.unit)[1] - parseVariantDimension(b.unit)[1]
        );
        for (const v of sortedBySize) {
          const [vDim, vBase] = parseVariantDimension(v.unit);
          if (vDim === reqDim && vBase > 0) {
            const mult = reqBaseUnits / vBase;
            if (Math.abs(mult - Math.round(mult)) < 0.001 && Math.round(mult) >= 1) {
              matchedVariant = v;
              packMultiplier = Math.round(mult);
              break;
            }
          }
        }
      }
    }

    if (!matchedVariant && seg.quantity !== null && !seg.unit && variants.length === 1) {
      matchedVariant = variants[0]!;
      packMultiplier = Number.isInteger(seg.quantity) ? seg.quantity : 1;
    }

    if (!matchedVariant) {
      for (const v of variants) {
        const uLower = v.unit.toLowerCase();
        if (queryPhrase.includes(uLower) || seg.heard.toLowerCase().includes(uLower)) {
          matchedVariant = v;
          packMultiplier = seg.quantity && Number.isInteger(seg.quantity) ? seg.quantity : 1;
          break;
        }
      }
    }

    if (!matchedVariant && variants.length > 1) {
      clarificationCount++;
      items.push({
        heard: seg.heard,
        status: "needs_clarification",
        confidence: Number(best.score.toFixed(2)),
        product_id: bestProd.id,
        product_title: bestProd.title,
        variant_id: null,
        variant_title: null,
        requested_quantity: seg.quantity,
        requested_unit: seg.unit,
        pack_multiplier: 1,
        unit_price_paise: null,
        estimated_total_paise: null,
        needs_clarification: true,
        clarification_question: `Which pack size of ${bestProd.title} would you like?`,
        clarification_options: variants.map((v) => ({
          product_id: bestProd.id,
          variant_id: v.id,
          product_title: bestProd.title,
          variant_title: v.title,
          unit: v.unit,
          price_paise: v.defaultPricePaise,
          quantity: 1,
        })),
      });
      continue;
    }

    const finalVar = matchedVariant ?? variants[0]!;
    const estTotal = finalVar.defaultPricePaise * packMultiplier;
    matchedCount++;
    estimatedTotalPaise += estTotal;

    items.push({
      heard: seg.heard,
      status: "matched",
      confidence: Number(best.score.toFixed(2)),
      product_id: bestProd.id,
      product_title: bestProd.title,
      variant_id: finalVar.id,
      variant_title: finalVar.title,
      requested_quantity: seg.quantity,
      requested_unit: seg.unit,
      pack_multiplier: packMultiplier,
      unit_price_paise: finalVar.defaultPricePaise,
      estimated_total_paise: estTotal,
      needs_clarification: false,
      clarification_question: null,
      clarification_options: [],
    });
  }

  return {
    transcript: text,
    language,
    items,
    summary: {
      total_items: items.length,
      matched_count: matchedCount,
      clarification_needed_count: clarificationCount,
      unmatched_count: unmatchedCount,
      estimated_total_paise: estimatedTotalPaise,
    },
  };
}
