import { useCallback } from "react";
import { useIntl } from "react-intl";
import type { PrimitiveType } from "react-intl";

import en from "../translations/en.json";
import { getTranslation } from "./getTranslation";

// Only keys that exist in en.json compile, so a typo in a t('…') call is a type error
// instead of a silent English fallback.
export type TranslationKey = keyof typeof en;

export type TFunction = (key: TranslationKey, values?: Record<string, PrimitiveType>) => string;

const messages: Record<string, string> = en;

// English (en.json) is the source of truth: it's the defaultMessage for every key, so a
// locale that hasn't translated a string yet falls back to English instead of showing the id.
export const useT = (): TFunction => {
  const { formatMessage } = useIntl();

  return useCallback(
    (key, values) =>
      formatMessage({ id: getTranslation(key), defaultMessage: messages[key] ?? key }, values),
    [formatMessage]
  );
};
