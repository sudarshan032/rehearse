// Telugu script → the IPA phonemes espeak-ng writes for it (voice "te"), which is what the Piper Telugu voices
// were trained on. Telugu spelling is phonetic, so a letter table plus a few rules covers it, with no 20 MB
// espeak build in the page. Checked against espeak-ng 1.52 on 3,000 words: 99.5% the same.
// ponytail: English words in Latin letters are read letter by letter as rough IPA; good enough for brand names.

const V: Record<string, string> = { "అ": "a", "ఆ": "aː", "ఇ": "i", "ఈ": "iː", "ఉ": "u", "ఊ": "uː", "ఎ": "e", "ఏ": "eː", "ఐ": "aɪ", "ఒ": "o", "ఓ": "oː", "ఔ": "aʊ" };
const SIGN: Record<string, string> = { "ా": "aː", "ి": "i", "ీ": "iː", "ు": "u", "ూ": "uː", "ె": "e", "ే": "eː", "ై": "aɪ", "ొ": "o", "ో": "oː", "ౌ": "aʊ" };
const C: Record<string, string> = {
  "క": "k", "ఖ": "kʰ", "గ": "ɡ", "ఘ": "ɡʰ", "ఙ": "ŋ", "చ": "c", "ఛ": "cʰ", "జ": "ɟ", "ఝ": "ɟʰ", "ఞ": "ɲ",
  "ట": "ʈ", "ఠ": "ʈʰ", "డ": "ɖ", "ఢ": "ɖʰ", "ణ": "ɳ", "త": "t", "థ": "tʰ", "ద": "d", "ధ": "dʰ", "న": "n",
  "ప": "p", "ఫ": "pʰ", "బ": "b", "భ": "bʰ", "మ": "m", "య": "j", "ర": "r", "ఱ": "r", "ల": "l", "ళ": "ɭ",
  "వ": "ʋ", "శ": "ɕ", "ష": "ʂ", "స": "s", "హ": "h",
};
const VIRAMA = "్";
const LATIN: Record<string, string> = { a: "a", b: "b", c: "k", d: "d", e: "e", f: "f", g: "ɡ", h: "h", i: "i", j: "dʒ", k: "k", l: "l", m: "m", n: "n", o: "o", p: "p", q: "k", r: "r", s: "s", t: "t", u: "u", v: "ʋ", w: "ʋ", x: "ks", y: "j", z: "z" };

type Syl = { onset: string; nucleus: string; coda: string };

function word(w: string): string {
  if (/^[a-z]+$/i.test(w)) return w.toLowerCase().split("").map((ch) => LATIN[ch] ?? "").join("");
  // Letters into syllables: each vowel is one syllable, consonants before it are its onset.
  const syl: Syl[] = [];
  let pending = ""; // consonants waiting for a vowel
  // The r of ఋ/ృ belongs to the onset ("kˈru"... espeak writes "krˈu"); జ్ఞ is said "gn".
  const chars = [...w.replace(/జ్ఞ/g, "గ్న").replace(/ఋ/g, "ర\u0C41").replace(/ౠ/g, "ర\u0C42").replace(/ృ/g, "\u0C4Dర\u0C41").replace(/ౄ/g, "\u0C4Dర\u0C42")];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i], next = chars[i + 1];
    if (V[ch]) {
      syl.push({ onset: pending, nucleus: V[ch], coda: "" });
      pending = "";
    } else if (C[ch]) {
      if (next === VIRAMA) (pending += C[ch]), i++;
      else if (next && SIGN[next]) syl.push({ onset: pending + C[ch], nucleus: SIGN[next], coda: "" }), (pending = ""), i++;
      else syl.push({ onset: pending + C[ch], nucleus: "a", coda: "" }), (pending = "");
    } else if (ch === "ం" || ch === "ఁ") {
      // espeak reads the anusvara as "n" before anything, and "m" for the half-anusvara.
      if (syl.length) syl[syl.length - 1].coda += ch === "ం" ? "n" : "m";
      else pending += ch === "ం" ? "n" : "m";
    } else if (ch === "ః") {
      if (syl.length) syl[syl.length - 1].coda += "h";
    }
  }
  if (!syl.length) return pending;
  if (pending) syl[syl.length - 1].coda += pending; // a final consonant with virama ("ప్లాన్")
  // Stress like espeak: main stress on the first syllable, a lighter one on every second syllable after it,
  // never on the last. The mark goes right before the vowel.
  const first = syl[0];
  return syl
    .map((s, k) => {
      const mark = k === 0 ? "ˈ" : k % 2 === 0 && k < syl.length - 1 ? "ˌ" : "";
      const pre = k === 0 && !s.onset && first.nucleus === "e" ? "ʲ" : ""; // espeak glides into a first "e"
      return `${s.onset}${pre}${mark}${s.nucleus}${s.coda}`;
    })
    .join("");
}

// Numbers are said in Telugu ("14 రోజులు" → "పద్నాలుగు రోజులు"). ponytail: up to 999 in words, longer numbers digit by digit.
const ONES = ["సున్నా", "ఒకటి", "రెండు", "మూడు", "నాలుగు", "ఐదు", "ఆరు", "ఏడు", "ఎనిమిది", "తొమ్మిది", "పది", "పదకొండు", "పన్నెండు", "పదమూడు", "పద్నాలుగు", "పదిహేను", "పదహారు", "పదిహేడు", "పద్దెనిమిది", "పంతొమ్మిది"];
const TENS = ["", "", "ఇరవై", "ముప్పై", "నలభై", "యాభై", "అరవై", "డెబ్బై", "ఎనభై", "తొంభై"];
function num(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : "");
  const h = Math.floor(n / 100), r = n % 100;
  return (h === 1 ? "వంద" : `${ONES[h]} వందల`) + (r ? ` ${num(r)}` : "");
}
const spellNumbers = (t: string) => t.replace(/\d+/g, (d) => (d.length <= 3 ? num(Number(d)) : [...d].map((x) => ONES[Number(x)]).join(" ")));

/** One line of Telugu (with any punctuation) → IPA, words split by spaces, punctuation kept. */
export function teluguIPA(text: string): string {
  return spellNumbers(text)
    .normalize("NFC")
    .replace(/[‌‍]/g, "")
    .split(/([\s,.!?;:।]+)/)
    .map((part) => (/^[\s,.!?;:।]+$/.test(part) ? part.replace(/।/g, ".").replace(/\s+/g, " ") : part.replace(/[^ఀ-౿a-z]/gi, "") ? word(part.replace(/[^ఀ-౿a-z]/gi, "")) : ""))
    .join("")
    .trim();
}
