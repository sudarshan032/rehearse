---
title: FlowFit Telugu Typing
emoji: ✍️
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Type Telugu in English letters, get Telugu script (IndicXlit)
---

# FlowFit Telugu Typing

Type a Telugu word in English letters ("vachaavu") and get Telugu script (వచ్చావు), with 3 suggestions.
Runs [AI4Bharat IndicXlit](https://github.com/AI4Bharat/IndicXlit) (MIT) with its built-in rescoring, on CPU.

API: `GET /api/xlit?text=ela unnavu&k=3` returns suggestions for each word.

Part of FlowFit (No Hands: The Wispr Challenge). On our 256-word and 864-word tests it matched or beat Google Input Tools on the first suggestion (93.8% and 92.5%).
