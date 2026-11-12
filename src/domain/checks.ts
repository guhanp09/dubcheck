import type { GlossaryEntry, Language, Risk } from "./types";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const boundary = "[\\p{L}\\p{N}\\p{M}]";
export const normalize = (s: string) =>
  s.normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
export function containsPhrase(text: string, phrase: string): boolean {
  return new RegExp(
    `(?<!${boundary})${escape(normalize(phrase))}(?!${boundary})`,
    "u",
  ).test(normalize(text));
}
const digits = (s: string) =>
  s
    .replace(/[०-९௦-௯]/g, (c) =>
      String(c.charCodeAt(0) - (c >= "௦" ? 0x0be6 : 0x0966)),
    )
    .replaceAll("−", "-");

interface Unit {
  dimension: string;
  factor: number;
  aliases: string[];
}
const UNITS: Unit[] = [
  {
    dimension: "time",
    factor: 0.001,
    aliases: ["milliseconds", "millisecond", "ms", "मिलीसेकंड", "மில்லிவினாடி"],
  },
  {
    dimension: "time",
    factor: 1,
    aliases: [
      "seconds",
      "second",
      "sec",
      "s",
      "सेकंड",
      "सेकण्ड",
      "வினாடிகள்",
      "வினாடி",
      "நொடிகள்",
      "நொடி",
    ],
  },
  {
    dimension: "time",
    factor: 60,
    aliases: ["minutes", "minute", "min", "मिनट", "நிமிடங்கள்", "நிமிடம்"],
  },
  {
    dimension: "time",
    factor: 3600,
    aliases: ["hours", "hour", "hr", "h", "घंटे", "घंटा", "மணி", "மணிநேரம்"],
  },
  {
    dimension: "mass",
    factor: 0.001,
    aliases: ["milligrams", "milligram", "mg", "मिलीग्राम", "மில்லிகிராம்"],
  },
  {
    dimension: "mass",
    factor: 1,
    aliases: ["grams", "gram", "g", "ग्राम", "கிராம்"],
  },
  {
    dimension: "mass",
    factor: 1000,
    aliases: ["kilograms", "kilogram", "kg", "किलोग्राम", "கிலோகிராம்"],
  },
  {
    dimension: "length",
    factor: 0.01,
    aliases: ["centimeters", "centimetres", "cm", "सेंटीमीटर", "சென்டிமீட்டர்"],
  },
  {
    dimension: "length",
    factor: 1,
    aliases: ["meters", "metres", "meter", "metre", "m", "मीटर", "மீட்டர்"],
  },
  {
    dimension: "length",
    factor: 1000,
    aliases: ["kilometers", "kilometres", "km", "किलोमीटर", "கிலோமீட்டர்"],
  },
  {
    dimension: "volume",
    factor: 0.001,
    aliases: ["milliliters", "millilitres", "ml", "मिलीलीटर", "மில்லிலிட்டர்"],
  },
  {
    dimension: "volume",
    factor: 1,
    aliases: ["liters", "litres", "liter", "litre", "l", "लीटर", "லிட்டர்"],
  },
  {
    dimension: "percent",
    factor: 1,
    aliases: ["%", "percent", "per cent", "प्रतिशत", "சதவீதம்"],
  },
  {
    dimension: "INR",
    factor: 1,
    aliases: ["rupees", "rupee", "INR", "रुपये", "रुपया", "ரூபாய்"],
  },
  {
    dimension: "USD",
    factor: 1,
    aliases: ["dollars", "dollar", "USD", "डॉलर", "டாலர்"],
  },
];
const unitPatterns = UNITS.flatMap((u) =>
  u.aliases.map((a) => ({ ...u, alias: a })),
).sort((a, b) => b.alias.length - a.alias.length);
const EN_SMALL = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const EN_TENS = [
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];
const HI_SMALL = [
  "शून्य",
  "एक",
  "दो",
  "तीन",
  "चार",
  "पाँच",
  "छह",
  "सात",
  "आठ",
  "नौ",
  "दस",
  "ग्यारह",
  "बारह",
  "तेरह",
  "चौदह",
  "पंद्रह",
  "सोलह",
  "सत्रह",
  "अठारह",
  "उन्नीस",
  "बीस",
];
const TA_SMALL = [
  "பூஜ்ஜியம்",
  "ஒன்று",
  "இரண்டு",
  "மூன்று",
  "நான்கு",
  "ஐந்து",
  "ஆறு",
  "ஏழு",
  "எட்டு",
  "ஒன்பது",
  "பத்து",
];
const WORDS: Record<Language, Record<string, number>> = {
  en: Object.fromEntries(EN_SMALL.map((w, i) => [w, i])),
  hi: Object.fromEntries(HI_SMALL.map((w, i) => [w, i])),
  ta: Object.fromEntries(TA_SMALL.map((w, i) => [w, i])),
};
EN_TENS.forEach((w, i) => {
  WORDS.en[w] = (i + 2) * 10;
  for (let j = 1; j <= 9; j++) {
    WORDS.en[`${w} ${EN_SMALL[j]}`] = (i + 2) * 10 + j;
    WORDS.en[`${w}-${EN_SMALL[j]}`] = (i + 2) * 10 + j;
  }
});
WORDS.hi["पांच"] = 5;
WORDS.hi["छः"] = 6;
WORDS.ta["ஒரு"] = 1;
WORDS.ta["இரு"] = 2;
const wordPatterns = Object.fromEntries(
  Object.entries(WORDS).map(([lang, dict]) => [
    lang,
    new RegExp(
      `(?<!${boundary})(?:${Object.keys(dict)
        .sort((a, b) => b.length - a.length)
        .map(escape)
        .join("|")})(?!${boundary})`,
      "giu",
    ),
  ]),
) as Record<Language, RegExp>;

export interface Quantity {
  raw: string;
  value: number;
  dimension: string;
  start: number;
  end: number;
}
export function quantities(
  text: string,
  language: Language,
): { values: Quantity[]; ambiguous: string[] } {
  const values: Quantity[] = [],
    ambiguous: string[] = [];
  const digitText = digits(text);
  const numeric =
    /(?<![\p{L}\p{N}\p{M}])[+-]?\d+(?:[.,]\d+)*(?:e[+-]?\d+)?(?![\p{N}])/giu;
  const matches: { raw: string; start: number; value: number }[] = [];
  for (const match of digitText.matchAll(numeric)) {
    let raw = match[0];
    if (raw.includes(",")) {
      // Both international and Indian grouping; decimal-comma is intentionally not guessed.
      if (
        !/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d+)?$/u.test(
          raw,
        )
      ) {
        ambiguous.push(text.slice(match.index, match.index + raw.length));
        continue;
      }
      raw = raw.replaceAll(",", "");
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      ambiguous.push(match[0]);
      continue;
    }
    matches.push({
      raw: text.slice(match.index, match.index + match[0].length),
      start: match.index,
      value,
    });
  }
  for (const match of text.matchAll(wordPatterns[language]))
    matches.push({
      raw: match[0],
      start: match.index,
      value: WORDS[language][match[0].toLocaleLowerCase("en")],
    });
  for (const match of matches.sort((a, b) => a.start - b.start)) {
    const end = match.start + match.raw.length,
      suffix = text.slice(end).toLocaleLowerCase("en");
    let dimension = "count",
      factor = 1,
      unitEnd = end,
      start = match.start;
    for (const unit of unitPatterns) {
      const m = suffix.match(
        new RegExp(
          `^\\s*${escape(unit.alias.toLowerCase())}(?!${boundary})`,
          "u",
        ),
      );
      if (m) {
        dimension = unit.dimension;
        factor = unit.factor;
        unitEnd = end + m[0].length;
        break;
      }
    }
    if (dimension === "count") {
      const currency = text.slice(0, match.start).match(/([₹$])\s*$/u);
      if (currency) {
        dimension = currency[1] === "₹" ? "INR" : "USD";
        start -= currency[0].length;
      }
    }
    if (dimension === "count" && /^[\p{L}\p{M}]/u.test(suffix)) continue;
    values.push({
      raw: text.slice(start, unitEnd),
      value: match.value * factor,
      dimension,
      start,
      end: unitEnd,
    });
  }
  return { values, ambiguous };
}

export function equivalentQuantities(a: Quantity[], b: Quantity[]): boolean {
  if (a.length !== b.length) return false;
  const remaining = [...b];
  for (const q of a) {
    const i = remaining.findIndex(
      (r) =>
        r.dimension === q.dimension &&
        Math.abs(r.value - q.value) <= Math.max(1, Math.abs(q.value)) * 1e-9,
    );
    if (i < 0) return false;
    remaining.splice(i, 1);
  }
  return true;
}
const NEGATION: Record<Language, string[]> = {
  en: [
    "no",
    "not",
    "never",
    "without",
    "cannot",
    "can't",
    "don't",
    "doesn't",
    "isn't",
    "aren't",
    "won't",
    "wasn't",
    "weren't",
    "shouldn't",
    "mustn't",
    "didn't",
  ],
  hi: ["नहीं", "मत", "बिना"],
  ta: ["இல்லை", "அல்ல", "வேண்டாம்", "முடியாது", "கூடாது", "நிரூபிக்காது"],
};
export function negations(text: string, language: Language): string[] {
  let input = normalize(text).replaceAll("’", "'");
  if (language === "en") input = input.replace(/\bnot only\b/g, "");
  const found = NEGATION[language].filter((w) => containsPhrase(input, w));
  if (language === "ta")
    for (const token of input.split(/[\s.,!?;:]+/))
      if (token.endsWith("வில்லை")) found.push(token);
  return [...new Set(found)];
}

export function checkMeaning(
  source: string,
  target: string,
  sourceLang: Language,
  targetLang: Language,
  glossary: GlossaryEntry[],
): Risk[] {
  const risks: Risk[] = [];
  const s = quantities(source, sourceLang),
    t = quantities(target, targetLang);
  if (s.ambiguous.length || t.ambiguous.length)
    risks.push({
      kind: "number-format",
      severity: "medium",
      title: "Number format needs review",
      detail:
        "An ambiguous or oversized number was not interpreted. Check its locale and intended value.",
      sourceEvidence: s.ambiguous,
      targetEvidence: t.ambiguous,
    });
  if (!equivalentQuantities(s.values, t.values))
    risks.push({
      kind: "quantity",
      severity: "high",
      title: "Quantity may have changed",
      detail:
        "Detected values or units differ after supported conversions. Check the quantity and what it describes; a flag is not a translation verdict.",
      sourceEvidence: s.values.map((q) => q.raw),
      targetEvidence: t.values.map((q) => q.raw),
    });
  const sn = negations(source, sourceLang),
    tn = negations(target, targetLang);
  if (Boolean(sn.length) !== Boolean(tn.length))
    risks.push({
      kind: "negation",
      severity: "high",
      title: "Possible reversal of meaning",
      detail:
        "A negation cue appears on only one side. Equivalent phrasing can trigger this check; a bilingual reviewer must decide.",
      sourceEvidence: sn,
      targetEvidence: tn,
    });
  for (const term of glossary)
    if (
      containsPhrase(source, term.source) &&
      !term.translations.some((alias) => containsPhrase(target, alias))
    ) {
      risks.push({
        kind: "glossary",
        severity: "medium",
        title: "Preferred term not found",
        detail: `“${term.source}” is in your glossary. Expected one of: ${term.translations.join(" / ")}. Inflections and other valid translations may need a human exception.`,
        sourceEvidence: [term.source],
        targetEvidence: [],
      });
    }
  return risks;
}
