// IndicXlit en -> Telugu, in the browser (or Node) with onnxruntime-web.
// Port of ai4bharat-transliteration 1.1.3: fairseq beam search (beam 10) + word-probability rescoring.
//
//   const xlit = await createXlit({ ort, base: 'model/' });
//   xlit.translit('vachavu')  // -> Promise<['వచ్చావు', ...]>  (3 suggestions)
//
// Options: ort (onnxruntime module), base (URL prefix), quant ('int8' | 'fp32'),
//          load(name) -> Promise<ArrayBuffer> (defaults to fetch(base + name)),
//          beam (10), rescoreN (how many beam hypotheses get rescored, 10), alpha (0.9).

const L = 6, H = 4, HD = 64, EOS = 2, PAD = 1, UNK = 3;

export async function createXlit(opts) {
  const { ort, base = 'model/', quant = 'int8', beam = 10, rescoreN = 10, alpha = 0.9 } = opts;
  const load = opts.load || (n => fetch(base + n).then(r => { if (!r.ok) throw new Error(n + ' ' + r.status); return r.arrayBuffer(); }));
  const sfx = quant === 'fp32' ? '' : '.' + quant;
  const so = opts.sessionOptions || { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
  const [encBuf, decBuf, vocabBuf, dictBuf] = await Promise.all(
    [`encoder${sfx}.onnx`, `decoder${sfx}.onnx`, 'vocab.json', 'te_dict.bin'].map(load));
  const enc = await ort.InferenceSession.create(new Uint8Array(encBuf), so);
  const dec = await ort.InferenceSession.create(new Uint8Array(decBuf), so);
  const vocab = JSON.parse(new TextDecoder().decode(vocabBuf));
  const srcIdx = new Map(vocab.src.map((s, i) => [s, i]));
  const tgt = vocab.tgt, V = tgt.length;
  const dict = parseDict(new Uint8Array(dictBuf));
  const T = (type, data, dims) => new ort.Tensor(type, data, dims);

  // ---- fairseq SequenceGenerator._generate for one sentence (bsz 1), lenpen 1, min_len 1
  async function beamSearch(word) {
    const src = [srcIdx.get('__te__'), ...[...word].map(c => srcIdx.get(c) ?? UNK), EOS];
    const S = src.length;
    const { cross_k, cross_v } = await enc.run({ src: T('int64', BigInt64Array.from(src, BigInt), [1, S]) });
    const maxLen = Math.min(200, 120);
    let toks = [[EOS]], scores = [0];             // active hypotheses (1 at step 0, then `beam`)
    let pk = new Float32Array(0), pv = pk;         // [L, B, H, t, HD]
    const finalized = [];
    for (let step = 0; step <= maxLen; step++) {
      const B = toks.length;
      const out = await dec.run({
        tok: T('int64', BigInt64Array.from(toks, t => BigInt(t[t.length - 1])), [B]),
        step: T('int64', BigInt64Array.of(BigInt(step)), []),
        past_k: T('float32', pk, [L, B, H, step, HD]), past_v: T('float32', pv, [L, B, H, step, HD]),
        cross_k, cross_v,
      });
      const lp = out.logprobs.data;
      // candidates: top 2*beam over (beam x vocab) of cumulative scores
      const K = 2 * beam, cs = [], ci = [];
      for (let b = 0; b < B; b++) {
        for (let v = 0; v < V; v++) {
          let x = lp[b * V + v];
          if (v === PAD || x !== x) x = -Infinity;
          if (step >= maxLen && v !== EOS) x = -Infinity;
          if (step < 1 && v === EOS) x = -Infinity;
          x += scores[b];
          if (cs.length < K || x > cs[K - 1]) {        // insertion into sorted top-K
            let j = Math.min(cs.length, K - 1);
            while (j > 0 && cs[j - 1] < x) { cs[j] = cs[j - 1]; ci[j] = ci[j - 1]; j--; }
            cs[j] = x; ci[j] = b * V + v;
          }
        }
      }
      // EOS among the first `beam` candidates -> finished hypotheses (score normalised by length)
      const next = [];
      for (let j = 0; j < cs.length; j++) {
        const b = Math.floor(ci[j] / V), v = ci[j] % V;
        if (v === EOS && cs[j] !== -Infinity) {
          if (j < beam && finalized.length < beam) finalized.push({ toks: toks[b].slice(1), score: cs[j] / (step + 1) });
        } else if (next.length < beam) next.push([b, v, cs[j]]);
      }
      if (finalized.length >= beam || step >= maxLen) break;
      // reorder KV cache to the surviving beams
      const nB = next.length, t1 = step + 1, blk = H * t1 * HD;
      const nk = new Float32Array(L * nB * blk), nv = new Float32Array(L * nB * blk);
      const ok = out.new_k.data, ov = out.new_v.data;
      for (let l = 0; l < L; l++) for (let i = 0; i < nB; i++) {
        const from = (l * B + next[i][0]) * blk, to = (l * nB + i) * blk;
        nk.set(ok.subarray(from, from + blk), to); nv.set(ov.subarray(from, from + blk), to);
      }
      pk = nk; pv = nv;
      toks = next.map(([b, v]) => [...toks[b], v]);
      scores = next.map(n => n[2]);
    }
    finalized.sort((a, b) => b.score - a.score);
    return finalized.map(f => ({ word: f.toks.map(t => tgt[t]).join(''), score: f.score }));
  }

  // ---- base_engine.rescore: alpha * model-prob share + (1 - alpha) * dictionary-prob share
  function rescore(hyps) {
    const ps = hyps.map(h => Math.exp(h.score)), tot = ps.reduce((a, b) => a + b, 0);
    const wp = hyps.map(h => dict.get(h.word)), tp = wp.reduce((a, b) => a + (b || 0), 0);
    return hyps.map((h, i) => ({ word: h.word, s: wp[i] ? alpha * ps[i] / tot + (1 - alpha) * wp[i] / tp : 0 }))
      .map((x, i) => [x, i]).sort((a, b) => b[0].s - a[0].s || a[1] - b[1]).map(([x]) => x.word);
  }

  async function translit(text, topk = 3) {
    text = (text || '').toLowerCase().trim();
    if (!text) return [text];
    if (/(^|.*[^.])\.$/s.test(text)) text = text.slice(0, -1) + '।';   // nativize_latin_fullstop (te)
    const m = text.match(/[A-Za-z]+/g);
    if (!m) return [text];
    const w = m[m.length - 1].slice(0, 100);
    const hyps = (await beamSearch(w)).slice(0, rescoreN);
    const words = (rescoreN > 0 && alpha < 1 ? rescore(hyps) : hyps.map(h => h.word))
      .slice(0, topk).map(s => s.replace(/్$/, '్‌'));   // hardfix_wordfinal_virama
    const at = text.lastIndexOf(w);
    return w === text ? words : words.map(s => text.slice(0, at) + s + text.slice(at + w.length));
  }

  return { translit, beamSearch, dict };
}

// te_dict.bin: u8 nBuckets; per bucket u8 q, u32le n, n varint deltas of sorted FNV-1a hashes. prob = 10^(-q/16)
function parseDict(u8) {
  const buckets = [];
  let p = 1;
  for (let k = u8[0]; k > 0; k--) {
    const q = u8[p], n = u8[p + 1] | u8[p + 2] << 8 | u8[p + 3] << 16 | u8[p + 4] << 24;
    p += 5;
    const hs = new Uint32Array(n);
    let h = 0;
    for (let i = 0; i < n; i++) {
      let g = 0, sh = 0, b;
      do { b = u8[p++]; g += (b & 0x7f) * 2 ** sh; sh += 7; } while (b & 0x80);
      h += g; hs[i] = h;
    }
    buckets.push({ prob: 10 ** (-q / 16), hs });
  }
  return {
    size: buckets.reduce((a, b) => a + b.hs.length, 0),
    get(word) {
      let h = 0x811c9dc5;
      for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 0x01000193) >>> 0;
      for (const { prob, hs } of buckets) {
        let lo = 0, hi = hs.length - 1;
        while (lo <= hi) { const mid = (lo + hi) >> 1; if (hs[mid] < h) lo = mid + 1; else if (hs[mid] > h) hi = mid - 1; else return prob; }
      }
      return undefined;
    },
  };
}
