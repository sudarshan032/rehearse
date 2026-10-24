# Python reference: runs IndicXlit (beam 10) and dumps raw beams + rescore top-3 for test words.
import torch, argparse, json, sys, time
torch.serialization.add_safe_globals([argparse.Namespace])
from ai4bharat.transliteration import XlitEngine
words = [l.split('\t')[0] for l in open(sys.argv[1], encoding='utf-8').read().splitlines() if l.strip()]
if len(sys.argv) > 3:
    words += [w for w, _ in json.load(open(sys.argv[3]))['test']]
words = list(dict.fromkeys(words))
e = XlitEngine('te', beam_width=10, rescore=True)
wp = e.word_prob_dicts['te']
out = {}
t0 = time.time()
for w in words:
    pre = e.pre_process([w.lower().strip()], 'en', 'te')
    s = e.transliterator.translate(pre, nbest=10)
    hyps = [(l.split('\t')[2].replace(' ', ''), float(l.split('\t')[1])) for l in s.split('\n') if l.startswith('H-')]
    out[w] = {'beam': hyps, 'rescore': e.translit_word(w, topk=3)['te'],
              'plain_wp': {h: wp.get(h) for h, _ in hyps}}
print('sec/word', (time.time() - t0) / len(words) / 2, file=sys.stderr)
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
