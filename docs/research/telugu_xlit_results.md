# Telugu typing (English letters → Telugu) bake-off, 24 Oct 2026

Test set: `telugu_xlit_testset.tsv`, 256 words typed the loose way people type: 161 common, 20 names/places, 75 complex (grandhika/Sanskrit-heavy). Answer key written by hand; 3 entries corrected after review (chesavu, ivala, dahamu). Scores ignore invisible joiner characters.

| System | Common | Names | Complex | All (top-1 / top-3) | Speed | Notes |
|---|---|---|---|---|---|---|
| Google Input Tools (reference only, unofficial) | 91% / 100% | 90% / 95% | 93% / 99% | **92% / 99%** | network | no public API |
| IndicXlit (AI4Bharat, open source) | 76% / 92% | 50% / 95% | 96% / 100% | 80% / 95% | 20 ms/word | |
| **IndicXlit + word-list re-rank** | 84% / 93% | 55% / 95% | 96% / 99% | **85% / 95%** | ~20 ms/word | re-rank top-5 by a free Telugu word-frequency list |
| Sanscript plain | 27% | 0% | 11% | 20% / 20% | <1 ms | needs exact ITRANS spelling |
| Sanscript + fix (spelling variants + word list) | 54% / 56% | 20% / 30% | 60% / 60% | 53% / 55% | 1 ms | limited by the small word list (12.9k words, OpenSubtitles) |

IndicXlit footprint (measured): Python env 873 MB on disk (torch 351 MB, IndicXlit models 132 MB), peak RAM about 490 MB, model load under 1 s. Fits a free Hugging Face Space (CPU); too big for 512 MB free hosts.
Typical IndicXlit misses: long vowels the user didn't type ("vachavu" → వచ్చవు), names (Secunderabad, Kukatpally), English loanwords (tea, sorry, bus). With top-3 choices shown, 95% of words are one click away.

## Round 2 (24 Oct): bigger test and more tuning

Word lists: Leipzig Telugu Wikipedia 2021 (363k Telugu words) + OpenSubtitles list (11k). Big test: 1,000 words from the conversational list (400 very common, 350 mid, 250 rarer), turned into loose English typing; 136 inputs with odd characters from the conversion removed, so 864 scored. Test words were removed from the conversational list before re-ranking (no peeking).

| System | Hand set 256 (top-1 / top-3) | Big set 864 (top-1 / top-3) | Speed |
|---|---|---|---|
| Google Input Tools (reference, unofficial) | 91.8% / 99.2% | 86.6% / 95.4% | network |
| IndicXlit plain | 80.5% / 95.7% | — (70.9% / 82.7% on all 1,000) | 26 ms |
| **IndicXlit with its built-in rescore** | **93.8% / 97.7%** | **92.5% / 97.9%** | 25 ms |
| IndicXlit + our word-list balanced score | 90.6% / 96.9% | 88.2% / 97.2% (plain base) | ~26 ms |
| IndicXlit rescore + Sanscript variants + balanced | 91.4% / 97.7% | 83.9% / 97.8% | ~27 ms |

**Result: IndicXlit's own rescore mode beats Google's first guess on both sets** (93.8% vs 91.8% on the hand set, 92.5% vs 86.6% on the big set). Our extra re-ranking does not beat it. Where both fail (37 of 864), the words are mostly English names from film subtitles (Hank, David, Darcy) or ambiguous short words. Sarvam is not needed.
