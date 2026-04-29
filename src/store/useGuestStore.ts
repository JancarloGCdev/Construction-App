"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultPrices } from "@/core/pricing/defaultPrices";
import type {
  AiAssistantChatMessage,
  LastCalculator,
  CalculationResult,
  PriceCatalog,
  QuoteBasketItem,
} from "@/core/types";
import { parsePriceCatalogJson } from "@/lib/schemas/priceCatalog";

export type { LastCalculator } from "@/core/types";

const STORAGE_KEY = "guest_profile";

type GuestState = {
  profile: PriceCatalog;
  lastQuote: CalculationResult | null;
  lastCalculator: LastCalculator;
  quoteBasket: QuoteBasketItem[];
  aiAssistantChat: AiAssistantChatMessage[];
  setProfile: (p: PriceCatalog) => void;
  resetProfile: () => void;
  importProfile: (data: unknown) => void;
  setLastQuote: (q: CalculationResult | null) => void;
  setLastCalculator: (c: LastCalculator) => void;
  getEffectiveWaste: (override: number | null | undefined) => number;
  addToQuoteBasket: (item: Omit<QuoteBasketItem, "id"> & { id?: string }) => void;
  removeFromQuoteBasket: (id: string) => void;
  clearQuoteBasket: () => void;
  setAiAssistantChat: (msgs: AiAssistantChatMessage[]) => void;
  clearAiAssistantChat: () => void;
};

function newId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set, get) => ({
      profile: { ...defaultPrices },
      lastQuote: null,
      lastCalculator: null,
      quoteBasket: [] as QuoteBasketItem[],
      aiAssistantChat: [] as AiAssistantChatMessage[],
      setProfile: (p) => set({ profile: { ...p } }),
      resetProfile: () => set({ profile: { ...defaultPrices } }),
      importProfile: (data) => {
        const parsed = parsePriceCatalogJson(data);
        set({ profile: parsed });
      },
      setLastQuote: (q) => set({ lastQuote: q }),
      setLastCalculator: (c) => set({ lastCalculator: c }),
      getEffectiveWaste: (override) => {
        if (override !== undefined && override !== null && !Number.isNaN(Number(override))) {
          return Number(override);
        }
        return get().profile.wastePercent;
      },
      addToQuoteBasket: (item) => {
        const id = item.id ?? newId();
        const addedAt =
          typeof item.addedAt === "number" && Number.isFinite(item.addedAt)
            ? item.addedAt
            : Date.now();
        set((s) => ({
          quoteBasket: [
            ...(s.quoteBasket ?? []),
            { ...item, id, addedAt } as QuoteBasketItem,
          ],
        }));
      },
      removeFromQuoteBasket: (id) => {
        set((s) => ({
          quoteBasket: (s.quoteBasket ?? []).filter((x) => x.id !== id),
        }));
      },
      clearQuoteBasket: () => set({ quoteBasket: [] }),
      setAiAssistantChat: (msgs) => set({ aiAssistantChat: msgs }),
      clearAiAssistantChat: () => set({ aiAssistantChat: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        profile: s.profile,
        lastQuote: s.lastQuote,
        lastCalculator: s.lastCalculator,
        quoteBasket: s.quoteBasket,
        aiAssistantChat: s.aiAssistantChat,
      }),
      version: 9,
      migrate: (persisted, fromVersion) => {
        const p = persisted as Record<string, unknown> | undefined;
        if (!p) {
          return persisted as GuestState;
        }
        const next: Record<string, unknown> = { ...p };
        if (fromVersion < 2) {
          next.quoteBasket = Array.isArray(p.quoteBasket) ? p.quoteBasket : [];
        }
        if (fromVersion < 4) {
          const raw = p.profile;
          const partial =
            raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
          next.profile = parsePriceCatalogJson(partial);
        }
        if (fromVersion < 6) {
          const raw = p.profile;
          const partial =
            raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
          next.profile = parsePriceCatalogJson(partial);
        }
        if (fromVersion < 7) {
          next.aiAssistantChat = Array.isArray((p as { aiAssistantChat?: unknown }).aiAssistantChat)
            ? ((p as { aiAssistantChat: AiAssistantChatMessage[] }).aiAssistantChat)
            : [];
        }
        if (fromVersion < 8) {
          const raw = p.profile;
          const partial =
            raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
          next.profile = parsePriceCatalogJson(partial);
        }
        if (fromVersion < 9) {
          const qb = Array.isArray(p.quoteBasket) ? (p.quoteBasket as unknown[]) : [];
          next.quoteBasket = qb.map((row) => {
            if (!row || typeof row !== "object" || Array.isArray(row)) return row;
            const o = row as Record<string, unknown>;
            const hasAt = typeof o.addedAt === "number";
            return hasAt ? o : { ...o, addedAt: 0 };
          }) as QuoteBasketItem[];
        }
        return next as unknown as GuestState;
      },
    }
  )
);
