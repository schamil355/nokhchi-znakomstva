import { useCallback, useMemo, useRef } from "react";
import { z } from "zod";
import { getSupabase } from "../../lib/supabase";
import { t, useTranslation } from "../../lib/i18n";

export const REPORT_REASONS = ["spam", "fake", "abuse", "other"] as const;

const reportSchema = z.object({
  reporterId: z.string().min(1),
  reportedUserId: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(500).optional(),
});

export type ReportPayload = z.infer<typeof reportSchema>;

export const submitReport = async (payload: ReportPayload) => {
  const parsed = reportSchema.parse(payload);
  const supabase = getSupabase();
  const { error } = await supabase.from("reports").insert({
    reporter: parsed.reporterId,
    reported: parsed.reportedUserId,
    reason: parsed.reason,
    details: parsed.details ?? null,
  });
  if (error) {
    throw error;
  }
};

const createBlockSchema = (message: string) =>
  z
    .object({
      blockerId: z.string().min(1),
      blockedUserId: z.string().min(1),
    })
    .refine((data) => data.blockerId !== data.blockedUserId, {
      message,
      path: ["blockedUserId"],
    });

export const blockUser = async (input: { blockerId: string; blockedUserId: string }) => {
  const parsed = createBlockSchema(t("moderation.errors.selfBlock")).parse(input);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("blocks")
    .insert({
      blocker: parsed.blockerId,
      blocked: parsed.blockedUserId,
    })
    .select("blocker")
    .maybeSingle();
  if (error && error.code !== "23505") {
    throw error;
  }
};

const PROFANITY_LIST = ["arsch", "fuck", "shit", "idiot", "bitch"];

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_REGEX = /(\+?\d[\d\s\-()]{7,})/;

type TokenBucket = {
  capacity: number;
  refillMs: number;
};

const DEFAULT_BUCKETS: Record<string, TokenBucket> = {
  generic: { capacity: 60, refillMs: 60_000 },
  like: { capacity: 40, refillMs: 60_000 },
  message: { capacity: 45, refillMs: 60_000 },
};

type BucketState = {
  tokens: number;
  lastRefill: number;
};

export const useSafety = (limit = 60, windowMs = 60_000) => {
  const bucketsRef = useRef<Map<string, BucketState>>(new Map());
  const { t: translate } = useTranslation();

  const bucketConfig = useMemo<Record<string, TokenBucket>>(
    () => ({
      ...DEFAULT_BUCKETS,
      generic: { capacity: limit, refillMs: windowMs },
    }),
    [limit, windowMs],
  );

  const consumeToken = useCallback(
    (bucketKey: string) => {
      const config = bucketConfig[bucketKey] ?? bucketConfig.generic;
      const now = Date.now();
      const current = bucketsRef.current.get(bucketKey) ?? {
        tokens: config.capacity,
        lastRefill: now,
      };

      const elapsed = now - current.lastRefill;
      if (elapsed > 0) {
        const tokensToAdd = (elapsed / config.refillMs) * config.capacity;
        current.tokens = Math.min(config.capacity, current.tokens + tokensToAdd);
        current.lastRefill = now;
      }

      if (current.tokens < 1) {
        throw new Error(translate("moderation.errors.rateLimited"));
      }
      current.tokens -= 1;
      bucketsRef.current.set(bucketKey, current);
    },
    [bucketConfig, translate],
  );

  const containsProfanity = useCallback((text: string) => {
    const lower = text.toLowerCase();
    return PROFANITY_LIST.some((word) => lower.includes(word));
  }, []);

  const containsContactInfo = useCallback(
    (text: string) => EMAIL_REGEX.test(text) || PHONE_REGEX.test(text),
    [],
  );

  const guardAction = useCallback(
    (bucket: "generic" | "like" | "message" = "generic") => {
      consumeToken(bucket);
    },
    [consumeToken],
  );

  const validateMessage = useCallback(
    (text: string) => {
      guardAction("message");
      if (containsProfanity(text)) {
        throw new Error(translate("moderation.errors.messageProfanity"));
      }
      if (containsContactInfo(text)) {
        throw new Error(translate("moderation.errors.messageContact"));
      }
      return text;
    },
    [containsContactInfo, containsProfanity, guardAction, translate],
  );

  return {
    guardAction,
    validateMessage,
    containsProfanity,
    containsContactInfo,
  };
};
