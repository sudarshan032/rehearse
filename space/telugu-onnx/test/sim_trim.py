# Simulates rescoring with a trimmed / quantised dictionary, using the Python beams in ref_out.json.
import re, ujson, json, math, sys
DICT = sys.argv[1]
d = ujson.load(open(DICT))
ref = json.load(open(sys.argv[2]))
strip = lambda s: s.replace('‌', '').replace('‍', '')
exp256 = {l.split('\t')[0]: l.split('\t')[1] for l in open(sys.argv[3], encoding='utf-8').read().splitlines() if l.strip()}
expbig = {w: t for w, t in json.load(open(sys.argv[4]))['test']}
K = 10
def rescore(beam, wp):
    c = beam[:K]
    ps = [2 ** s for _, s in c]; tot = sum(ps)
    probs = [wp(h) for h, _ in c]; tp = sum(p for p in probs if p)
    sc = [(0.9 * p / tot + 0.1 * q / tp) if q else 0 for p, q in zip(ps, probs)]
    order = sorted(range(len(c)), key=lambda i: -sc[i])
    return [c[i][0] for i in order]
def acc(wp, exp):
    t1 = t3 = n = 0
    for w, e in exp.items():
        r = [strip(x) for x in rescore(ref[w]['beam'], wp)]; n += 1; t1 += r[0] == e; t3 += e in r[:3]
    return (round(100 * t1 / n, 1), round(100 * t3 / n, 1))
# check exactness of re-implementation
X = json.load(open(sys.argv[5]))['rescore']
bad = [w for w in X if re.fullmatch('[a-z]+', w) and w in ref if [strip(x) for x in rescore(ref[w]['beam'], d.get)][:10] != [strip(x) for x in X[w]]]
print('reimpl mismatches', len(bad), bad[:5])
print('full', acc(d.get, exp256), acc(d.get, expbig))
print('no dict (plain)', acc(lambda h: None, exp256), acc(lambda h: None, expbig))
order = sorted(d, key=d.get, reverse=True)
for n in [50000, 100000, 300000, 1000000, 2000000, 3500000]:
    keep = set(order[:n])
    print('top', n, acc(lambda h: d.get(h) if h in keep else None, exp256), acc(lambda h: d.get(h) if h in keep else None, expbig), 'min p', d[order[n-1]])
# quantised probs: everything kept, prob rounded to 1/4-decade bucket
q = lambda h: (10 ** (round(math.log10(d[h]) * 4) / 4)) if h in d else None
print('quantised 0.25 decade', acc(q, exp256), acc(q, expbig))
