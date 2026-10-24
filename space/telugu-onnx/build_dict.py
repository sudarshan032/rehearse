# Builds web/model/te_dict.bin from IndicXlit's te_word_prob_dict.json (7.7M words, 760 MB).
# Keeps words seen at least MIN_COUNT times; stores 32-bit FNV-1a hashes (over UTF-16 code units, same
# as JS charCodeAt) grouped by log-probability bucket (1/16 decade), delta + varint encoded.
# Format: u8 nBuckets, then per bucket: u8 q, u32le n, then n varint deltas of the sorted hashes.
# prob = 10 ** (-q / 16).
import json, math, struct, sys, os
import ujson

src, out, min_count = sys.argv[1], sys.argv[2], int(sys.argv[3])
d = ujson.load(open(src))
pmin = min(d.values())
buckets = {}
best = {}  # hash -> q (keep the most probable word on hash collisions)
for w, p in d.items():
    if p / pmin < min_count - 0.5:
        continue
    h = 0x811C9DC5
    for cu in struct.unpack(f'<{len(w.encode("utf-16-le")) // 2}H', w.encode('utf-16-le')):
        h = ((h ^ cu) * 0x01000193) & 0xFFFFFFFF
    q = min(255, round(-math.log10(p) * 16))
    if h not in best or q < best[h]:
        best[h] = q
for h, q in best.items():
    buckets.setdefault(q, []).append(h)
buf = bytearray([len(buckets)])
for q in sorted(buckets):
    hs = sorted(buckets[q])
    buf += struct.pack('<BI', q, len(hs))
    prev = 0
    for h in hs:
        g = h - prev; prev = h
        while g >= 0x80:
            buf.append((g & 0x7F) | 0x80); g >>= 7
        buf.append(g)
open(out, 'wb').write(buf)
print(f'words kept {len(best)} of {len(d)}, buckets {len(buckets)}, bytes {len(buf)}')
