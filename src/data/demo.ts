import type { Language, Project } from "../domain/types";

const SOURCE = [
  "In this study, 24 people take part.",
  "Each group has 12 participants.",
  "Correlation does not prove causation.",
  "Use random assignment to create the groups.",
  "Wait 60 seconds before recording the result.",
  "The study budget is ₹1,000.",
  "A larger sample can still be biased.",
  "Record the uncertainty, not just the average.",
  "Ask what changed before you claim why.",
  "Review the evidence before sharing.",
];
const HINDI = [
  "इस अध्ययन में 48 लोग भाग लेते हैं।",
  "हर समूह में 12 प्रतिभागी हैं।",
  "सहसंबंध कारण और प्रभाव को साबित करता है।",
  "समूह बनाने के लिए यादृच्छिक नमूना चुनें।",
  "नतीजा लिखने से पहले एक मिनट रुकें।",
  "अध्ययन का बजट ₹100 है।",
  "बड़ा नमूना भी पक्षपाती हो सकता है।",
  "अनिश्चितता भी लिखें, सिर्फ औसत नहीं।",
  "कारण बताने से पहले पूछें कि क्या बदला।",
  "साझा करने से पहले",
  "सबूत की समीक्षा करें।",
];
const TAMIL = [
  "இந்த ஆய்வில் 48 பேர் பங்கேற்கிறார்கள்.",
  "ஒவ்வொரு குழுவிலும் 12 பங்கேற்பாளர்கள் உள்ளனர்.",
  "தொடர்பு காரணத்தை நிரூபிக்கிறது.",
  "குழுக்களை உருவாக்க சீரற்ற மாதிரியைப் பயன்படுத்தவும்.",
  "முடிவைப் பதிவு செய்வதற்கு முன் ஒரு நிமிடம் காத்திருக்கவும்.",
  "ஆய்வின் செலவுத்திட்டம் ₹100.",
  "பெரிய மாதிரியிலும் சார்பு இருக்கலாம்.",
  "சராசரியை மட்டும் பதிவு செய்ய வேண்டாம்; நிச்சயமின்மையையும் பதிவு செய்யவும்.",
  "காரணத்தைக் கூறுவதற்கு முன் என்ன மாறியது என்று கேளுங்கள்.",
  "பகிர்வதற்கு முன்",
  "ஆதாரங்களை மதிப்பாய்வு செய்யவும்.",
];
const STARTS = [0, 7, 14, 21, 28, 36, 44, 52, 59, 66, 70, 73];
export function createDemo(language: Exclude<Language, "en"> = "hi"): Project {
  return {
    schemaVersion: 1,
    id: `demo-${language}`,
    title: "A little more evidence",
    source: {
      name: "evidence.en.srt",
      language: "en",
      cues: SOURCE.map((text, i) => ({
        id: `c${i + 1}`,
        startMs: STARTS[i] * 1000,
        endMs: (i === 9 ? 73 : STARTS[i + 1]) * 1000,
        text,
      })),
    },
    target: {
      name: `evidence.${language}.srt`,
      language,
      cues: (language === "hi" ? HINDI : TAMIL).map((text, i) => ({
        id: `c${i + 1}`,
        startMs: STARTS[i] * 1000,
        endMs: STARTS[i + 1] * 1000,
        text,
      })),
    },
    offsetMs: 0,
    glossary: [
      {
        id: "term-random",
        source: "random assignment",
        translations:
          language === "hi"
            ? ["यादृच्छिक आवंटन", "रैंडम असाइनमेंट"]
            : ["சீரற்ற ஒதுக்கீடு"],
      },
    ],
    manualGroups: [],
    decisions: [],
    updatedAt: new Date().toISOString(),
    sample: true,
  };
}
