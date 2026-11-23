import { apiClient } from "./api-client";

export interface ClarificationOption {
  variant_id: string;
  product_id: string;
  product_title: string;
  variant_title: string;
  unit: string;
  price_paise: number;
  quantity: number;
}

export interface InterpretedItem {
  heard: string;
  status: "matched" | "needs_clarification" | "ambiguous" | "unmatched";
  confidence: number;
  product_id?: string;
  product_title?: string;
  variant_id?: string;
  variant_title?: string;
  requested_quantity?: number;
  requested_unit?: string;
  pack_multiplier: number;
  unit_price_paise?: number;
  estimated_total_paise?: number;
  needs_clarification: boolean;
  clarification_question?: string;
  clarification_options: ClarificationOption[];
}

export interface VoiceInterpretationSummary {
  total_items: number;
  matched_count: number;
  clarification_needed_count: number;
  unmatched_count: number;
  estimated_total_paise: number;
}

export interface VoiceInterpretResponse {
  transcript: string;
  language: string;
  items: InterpretedItem[];
  summary: VoiceInterpretationSummary;
}

export interface ConfirmVoiceCartResponse {
  added_items: { variant_id: string; quantity: number }[];
  cart_total_paise: number;
  cart_items_count: number;
  cycle_id: string;
}

export interface VoiceVocabResponse {
  languages: string[];
  units: string[];
  sample_phrases: Record<string, string[]>;
  product_categories: string[];
}

export const voiceService = {
  async interpret(
    text: string,
    language: string = "en-IN",
    communityId?: string
  ): Promise<VoiceInterpretResponse> {
    return apiClient.post<VoiceInterpretResponse>("/api/v1/voice/interpret", {
      text,
      language,
      community_id: communityId || undefined,
    });
  },

  async confirmCart(
    items: { variant_id: string; quantity: number }[]
  ): Promise<ConfirmVoiceCartResponse> {
    return apiClient.post<ConfirmVoiceCartResponse>("/api/v1/voice/cart/confirm", {
      items,
    });
  },

  async getVocab(): Promise<VoiceVocabResponse> {
    return apiClient.get<VoiceVocabResponse>("/api/v1/voice/vocab");
  },
};

// Backward-compatible alias
export const VoiceService = voiceService;
