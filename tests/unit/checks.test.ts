import { describe, expect, it } from "vitest";
import {
  checkMeaning,
  containsPhrase,
  equivalentQuantities,
  negations,
  quantities,
} from "../../src/domain/checks";

describe("quantity evidence", () => {
  it.each([
    ["Wait 60 seconds.", "एक मिनट रुकें।", "hi"],
    ["Use 1 kg.", "1000 ग्राम लें।", "hi"],
    ["Wait 60 seconds.", "ஒரு நிமிடம் காத்திருக்கவும்.", "ta"],
    ["24 people", "२४ लोग", "hi"],
    ["80 people", "௮௦ பேர்", "ta"],
    ["Budget ₹1,00,000", "बजट ₹100,000", "hi"],
    ["Use 0.5 liters", "500 मिलीलीटर लें", "hi"],
    ["Use 500mg", "0.5 ग्राम लें", "hi"],
    ["The change is −5%", "बदलाव -5 प्रतिशत", "hi"],
  ] as const)(
    "recognizes equivalent quantities: %s / %s",
    (source, target, language) =>
      expect(
        equivalentQuantities(
          quantities(source, "en").values,
          quantities(target, language).values,
        ),
      ).toBe(true),
  );
  it.each([
    ["24 people", "48 लोग"],
    ["Budget ₹1,000", "बजट ₹100"],
    ["5 grams", "5 किलोग्राम"],
    ["5, 5, and 10", "5 और 10"],
    ["Budget $100", "बजट ₹100"],
    ["Change -5%", "बदलाव 5 प्रतिशत"],
  ])("flags changed values, units or multiplicity: %s / %s", (source, target) =>
    expect(
      checkMeaning(source, target, "en", "hi", []).some(
        (r) => r.kind === "quantity",
      ),
    ).toBe(true),
  );
  it("normalizes common spelled numbers and keeps evidence", () => {
    expect(
      quantities("twenty-four people and two minutes", "en").values.map((q) => [
        q.raw,
        q.value,
      ]),
    ).toEqual([
      ["twenty-four", 24],
      ["two minutes", 120],
    ]);
  });
  it("abstains on ambiguous decimal comma and unsafe integers", () => {
    expect(
      quantities("1,5 liters and 9007199254740992 people", "en").ambiguous,
    ).toHaveLength(2);
    expect(
      checkMeaning("1,5 liters", "1.5 लीटर", "en", "hi", []).some(
        (r) => r.kind === "number-format",
      ),
    ).toBe(true);
  });
  it("does not treat an identifier suffix as a standalone number", () =>
    expect(quantities("abc24", "en").values).toHaveLength(0));
});
describe("bounded language heuristics", () => {
  it("flags omitted English/Hindi negation", () =>
    expect(
      checkMeaning(
        "Correlation does not prove causation.",
        "सहसंबंध कारण साबित करता है।",
        "en",
        "hi",
        [],
      ).map((r) => r.kind),
    ).toContain("negation"));
  it("preserves Hindi negation and Tamil negative suffixes", () => {
    expect(
      checkMeaning("It does not work.", "यह काम नहीं करता है।", "en", "hi", []),
    ).toEqual([]);
    expect(negations("இது வேலை செய்யவில்லை.", "ta")).toContain("செய்யவில்லை");
  });
  it("excludes English not-only construction", () =>
    expect(negations("Not only accurate but also clear.", "en")).toEqual([]));
  it("handles curly apostrophes and whole words", () => {
    expect(negations("Don’t share it.", "en")).toContain("don't");
    expect(negations("notable innovation", "en")).toEqual([]);
  });
  it("checks creator terminology with variants and Unicode boundaries", () => {
    const glossary = [
      {
        id: "term",
        source: "random assignment",
        translations: ["यादृच्छिक आवंटन", "रैंडम असाइनमेंट"],
      },
    ];
    expect(
      checkMeaning(
        "Use random assignment.",
        "रैंडम असाइनमेंट करें।",
        "en",
        "hi",
        glossary,
      ),
    ).toEqual([]);
    expect(
      checkMeaning(
        "Use random assignment.",
        "नमूना चुनें।",
        "en",
        "hi",
        glossary,
      ).map((r) => r.kind),
    ).toEqual(["glossary"]);
    expect(containsPhrase("Not randomness", "random")).toBe(false);
    expect(containsPhrase("கிராமத்தில்", "கிராம்")).toBe(false);
  });
  it("does not claim to detect semantic role reversal", () =>
    expect(
      checkMeaning(
        "The teacher helped the student.",
        "छात्र ने शिक्षक की मदद की।",
        "en",
        "hi",
        [],
      ),
    ).toEqual([]));
});
