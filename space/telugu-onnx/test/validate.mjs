// Validates web/xlit.js in Node against the Python reference.
// usage: node validate.mjs <node_modules dir> <web|node> <int8|fp32> [dict file] [extra ref json (xlit_big.json)] [bigtest.json]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createXlit } from '../web/xlit.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const [nm, backend = 'web', quant = 'int8', dictFile, pyRefFile, bigFile] = process.argv.slice(2);
const require = createRequire(path.join(nm, 'x.js'));
const ort = require(backend === 'node' ? 'onnxruntime-node' : 'onnxruntime-web');
if (backend === 'web') ort.env.wasm.numThreads = 1;
const modelDir = path.join(here, '../web/model');
const load = async n => {
  const f = n === 'te_dict.bin' && dictFile ? dictFile : path.join(modelDir, n);
  const b = fs.readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const so = backend === 'node' ? { executionProviders: ['cpu'], intraOpNumThreads: 1 } : undefined;
const t0 = performance.now();
const xlit = await createXlit({ ort, load, quant, sessionOptions: so });
console.log(`backend=${backend} quant=${quant} load ${(performance.now() - t0).toFixed(0)} ms, dict words ${xlit.dict.size}`);

const clean = s => s.replace(/[‌‍]/g, '').normalize('NFC');
const hand = fs.readFileSync(path.join(here, '../../../docs/research/telugu_xlit_testset.tsv'), 'utf8')
  .split('\n').filter(l => l.trim()).map(l => l.split('\t')).map(([w, g]) => [w, clean(g)]);
const sets = [['hand-256', hand]];
if (bigFile) sets.push(['big-1000', JSON.parse(fs.readFileSync(bigFile, 'utf8')).test.map(([w, g]) => [w, clean(g)])]);
const py = pyRefFile ? JSON.parse(fs.readFileSync(pyRefFile, 'utf8')).rescore : null;   // python rescore, topk=10
const pyBeam = JSON.parse(fs.readFileSync(path.join(here, 'ref_out.json'), 'utf8'));  // python raw beams

await xlit.translit('warmup');
const times = [];
for (const [name, rows] of sets) {
  let j1 = 0, j3 = 0, p1 = 0, p3 = 0, same3 = 0, same1 = 0, beamSame = 0;
  const mism = [];
  for (const [w, g] of rows) {
    const t = performance.now();
    const out = (await xlit.translit(w, 3)).map(clean);
    times.push(performance.now() - t);
    j1 += out[0] === g; j3 += out.includes(g);
    if (py) {
      const p = py[w].slice(0, 3).map(clean);
      p1 += p[0] === g; p3 += p.includes(g);
      same1 += p[0] === out[0];
      if (p.join() === out.join()) same3++; else mism.push(`${w}\tjs: ${out.join(' ')}\tpy: ${p.join(' ')}\texp: ${g}`);
    }
    if (pyBeam[w] && /^[A-Za-z]+$/.test(w)) {
      const jb = (await xlit.beamSearch(w.toLowerCase())).map(h => h.word).join();
      beamSame += jb === pyBeam[w].beam.map(h => h[0]).join();
    }
  }
  const pc = x => (100 * x / rows.length).toFixed(1) + '%';
  console.log(`${name}: JS top1 ${pc(j1)} top3 ${pc(j3)} | Python top1 ${pc(p1)} top3 ${pc(p3)} | identical top-3 lists ${same3}/${rows.length}, same top-1 ${same1}/${rows.length}, identical 10-beam ${beamSame}`);
  if (mism.length) console.log('  mismatches vs python:\n  ' + mism.join('\n  '));
}
times.sort((a, b) => a - b);
const q = f => times[Math.floor(f * (times.length - 1))].toFixed(1);
console.log(`latency per word (ms): median ${q(0.5)}  p90 ${q(0.9)}  max ${q(1)}  mean ${(times.reduce((a, b) => a + b) / times.length).toFixed(1)}`);
