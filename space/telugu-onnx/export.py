# Re-implements the IndicXlit (fairseq transformer, pre-norm) forward pass in plain PyTorch with an
# explicit KV cache, checks it against fairseq, and exports encoder.onnx + decoder.onnx (+ int8 copies).
# Run with the scratchpad venvonnx python (torch/fairseq from venv39 + onnx/onnxruntime).
import argparse, json, math, os, sys
import torch, torch.nn as nn, torch.nn.functional as F
torch.serialization.add_safe_globals([argparse.Namespace])

HERE = os.path.dirname(os.path.abspath(__file__))
VENV = sys.argv[1]  # path to .../ai4bharat/transliteration/transformer/models/en2indic/v1.0
OUT = os.path.join(HERE, 'web', 'model')
os.makedirs(OUT, exist_ok=True)
ck = torch.load(os.path.join(VENV, 'transformer/indicxlit.pt'), map_location='cpu', weights_only=False)
sd = {k: v.float() for k, v in ck['model'].items() if v.dtype.is_floating_point}
C, H, L, HD, MAXPOS = 256, 4, 6, 64, 128
SCALE = HD ** -0.5


def sinusoid(n, dim=C, pad=1):  # fairseq SinusoidalPositionalEmbedding.get_embedding
    half = dim // 2
    e = torch.exp(torch.arange(half, dtype=torch.float) * -(math.log(10000) / (half - 1)))
    e = torch.arange(n, dtype=torch.float)[:, None] * e[None]
    e = torch.cat([torch.sin(e), torch.cos(e)], 1)
    e[pad] = 0
    return e


class Lin(nn.Module):
    def __init__(self, p, bias=True):
        super().__init__()
        self.wt = nn.Parameter(sd[p + '.weight'].t().contiguous())  # [in, out] -> plain MatMul in ONNX
        self.b = nn.Parameter(sd[p + '.bias']) if bias else None

    def forward(self, x):
        y = torch.matmul(x, self.wt)
        return y + self.b if self.b is not None else y


class LN(nn.Module):
    def __init__(self, p):
        super().__init__()
        self.w, self.b = nn.Parameter(sd[p + '.weight']), nn.Parameter(sd[p + '.bias'])

    def forward(self, x):
        return F.layer_norm(x, (C,), self.w, self.b, 1e-5)


def heads(x):  # [B,T,C] -> [B,H,T,HD]
    return x.reshape(x.shape[0], x.shape[1], H, HD).transpose(1, 2)


def attend(q, k, v, out):  # q [B,H,Tq,HD], k/v [B|1,H,Tk,HD]
    a = torch.softmax(torch.matmul(q, k.transpose(2, 3)), -1)
    o = torch.matmul(a, v).transpose(1, 2)
    return out(o.reshape(o.shape[0], o.shape[1], C))


class EncLayer(nn.Module):
    def __init__(self, p):
        super().__init__()
        self.q, self.k, self.v, self.o = [Lin(f'{p}.self_attn.{n}_proj') for n in 'qkvo'[:3]] + [Lin(f'{p}.self_attn.out_proj')]
        self.ln1, self.ln2 = LN(f'{p}.self_attn_layer_norm'), LN(f'{p}.final_layer_norm')
        self.fc1, self.fc2 = Lin(f'{p}.fc1'), Lin(f'{p}.fc2')

    def forward(self, x):
        h = self.ln1(x)
        x = x + attend(heads(self.q(h) * SCALE), heads(self.k(h)), heads(self.v(h)), self.o)
        return x + self.fc2(F.gelu(self.fc1(self.ln2(x))))


class Encoder(nn.Module):
    """src [1,S] int64 -> cross-attention keys/values for every decoder layer: [L,1,H,S,HD] each."""
    def __init__(self):
        super().__init__()
        self.emb = nn.Parameter(sd['encoder.embed_tokens.weight'])
        self.pos = nn.Parameter(sinusoid(MAXPOS))
        self.lne = LN('encoder.layernorm_embedding')
        self.layers = nn.ModuleList([EncLayer(f'encoder.layers.{i}') for i in range(L)])
        self.ln = LN('encoder.layer_norm')
        self.ck = nn.ModuleList([Lin(f'decoder.layers.{i}.encoder_attn.k_proj') for i in range(L)])
        self.cv = nn.ModuleList([Lin(f'decoder.layers.{i}.encoder_attn.v_proj') for i in range(L)])

    def forward(self, src):
        S = src.shape[1]
        x = self.emb[src] * math.sqrt(C) + self.pos[2:2 + S].unsqueeze(0)
        x = self.lne(x)
        for l in self.layers:
            x = l(x)
        x = self.ln(x)
        return torch.stack([heads(k(x)) for k in self.ck]), torch.stack([heads(v(x)) for v in self.cv])


class DecLayer(nn.Module):
    def __init__(self, p):
        super().__init__()
        self.q, self.k, self.v, self.o = [Lin(f'{p}.self_attn.{n}_proj') for n in 'qkv'] + [Lin(f'{p}.self_attn.out_proj')]
        self.cq, self.co = Lin(f'{p}.encoder_attn.q_proj'), Lin(f'{p}.encoder_attn.out_proj')
        self.ln1, self.ln2, self.ln3 = LN(f'{p}.self_attn_layer_norm'), LN(f'{p}.encoder_attn_layer_norm'), LN(f'{p}.final_layer_norm')
        self.fc1, self.fc2 = Lin(f'{p}.fc1'), Lin(f'{p}.fc2')

    def forward(self, x, pk, pv, ck, cv):  # x [B,1,C]; pk/pv [B,H,T,HD]; ck/cv [1,H,S,HD]
        h = self.ln1(x)
        k = torch.cat([pk, heads(self.k(h))], 2)
        v = torch.cat([pv, heads(self.v(h))], 2)
        x = x + attend(heads(self.q(h) * SCALE), k, v, self.o)
        x = x + attend(heads(self.cq(self.ln2(x)) * SCALE), ck, cv, self.co)
        return x + self.fc2(F.gelu(self.fc1(self.ln3(x)))), k, v


class Decoder(nn.Module):
    """One incremental step. tok [B] int64, step [] int64 (0-based), past_k/v [L,B,H,T,HD], cross_k/v [L,1,H,S,HD]
    -> logprobs [B,V], new_k/v [L,B,H,T+1,HD]."""
    def __init__(self):
        super().__init__()
        self.emb = nn.Parameter(sd['decoder.embed_tokens.weight'])
        self.pos = nn.Parameter(sinusoid(MAXPOS))
        self.lne = LN('decoder.layernorm_embedding')
        self.layers = nn.ModuleList([DecLayer(f'decoder.layers.{i}') for i in range(L)])
        self.ln = LN('decoder.layer_norm')
        self.out = Lin('decoder.output_projection', bias=False)

    def forward(self, tok, step, past_k, past_v, cross_k, cross_v):
        x = (self.emb[tok] * math.sqrt(C) + self.pos[step + 2]).unsqueeze(1)
        x = self.lne(x)
        ks, vs = [], []
        for i, l in enumerate(self.layers):
            x, k, v = l(x, past_k[i], past_v[i], cross_k[i], cross_v[i])
            ks.append(k); vs.append(v)
        return torch.log_softmax(self.out(self.ln(x))[:, 0], -1), torch.stack(ks), torch.stack(vs)


def vocab(path):
    sym = ['<s>', '<pad>', '</s>', '<unk>'] + [l.rsplit(' ', 1)[0] for l in open(path, encoding='utf-8').read().splitlines()]
    return sym


if __name__ == '__main__':
    enc, dec = Encoder().eval(), Decoder().eval()
    # vocab: fairseq adds langtoks (__xx__) after the dict file entries, in lang_list order
    langs = open(os.path.join(VENV, '../lang_list.txt')).read().split()
    src_sym = vocab(os.path.join(VENV, 'corpus-bin/dict.en.txt')) + [f'__{l}__' for l in langs]
    tgt_sym = vocab(os.path.join(VENV, 'corpus-bin/dict.te.txt')) + [f'__{l}__' for l in langs]
    print('vocab', len(src_sym), len(tgt_sym))
    json.dump({'src': src_sym, 'tgt': tgt_sym}, open(os.path.join(OUT, 'vocab.json'), 'w'), ensure_ascii=False)

    # --- check against fairseq on one word, teacher-forced
    from ai4bharat.transliteration import XlitEngine
    e = XlitEngine('te', beam_width=10, rescore=False)
    tr = e.transliterator
    assert tr.src_dict.symbols == src_sym and tr.tgt_dict.symbols == tgt_sym, 'vocab mismatch'
    m = tr.models[0]
    src = torch.tensor([[src_sym.index('__te__')] + [src_sym.index(c) for c in 'vachavu'] + [2]])
    tgt = [2] + [tgt_sym.index(c) for c in 'వచ్చావు']
    with torch.no_grad():
        ref = m(src, torch.tensor([src.shape[1]]), torch.tensor([tgt]))[0]
        ref = torch.log_softmax(ref.float(), -1)[0]
        ck_, cv_ = enc(src)
        pk = torch.zeros(L, 1, H, 0, HD); pv = pk.clone()
        mine = []
        for t, tok in enumerate(tgt):
            lp, pk, pv = dec(torch.tensor([tok]), torch.tensor(t), pk, pv, ck_, cv_)
            mine.append(lp[0])
        mine = torch.stack(mine)
    print('max |diff| vs fairseq logprobs:', (mine - ref).abs().max().item())

    # --- export
    S, B, T = src.shape[1], 3, 2
    torch.onnx.export(enc, (src,), os.path.join(OUT, 'encoder.onnx'), input_names=['src'],
                      output_names=['cross_k', 'cross_v'], dynamic_axes={'src': {1: 'S'}, 'cross_k': {3: 'S'}, 'cross_v': {3: 'S'}},
                      opset_version=17, dynamo=False)
    args = (torch.tensor([5, 6, 7]), torch.tensor(T), torch.zeros(L, B, H, T, HD), torch.zeros(L, B, H, T, HD), ck_, cv_)
    torch.onnx.export(dec, args, os.path.join(OUT, 'decoder.onnx'),
                      input_names=['tok', 'step', 'past_k', 'past_v', 'cross_k', 'cross_v'],
                      output_names=['logprobs', 'new_k', 'new_v'],
                      dynamic_axes={'tok': {0: 'B'}, 'past_k': {1: 'B', 3: 'T'}, 'past_v': {1: 'B', 3: 'T'},
                                    'cross_k': {3: 'S'}, 'cross_v': {3: 'S'}, 'logprobs': {0: 'B'},
                                    'new_k': {1: 'B', 3: 'T1'}, 'new_v': {1: 'B', 3: 'T1'}},
                      opset_version=17, dynamo=False)

    # --- int8 dynamic quantisation of MatMul weights
    from onnxruntime.quantization import quantize_dynamic, QuantType
    for n in ['encoder', 'decoder']:
        quantize_dynamic(os.path.join(OUT, f'{n}.onnx'), os.path.join(OUT, f'{n}.int8.onnx'),
                         weight_type=QuantType.QUInt8, op_types_to_quantize=['MatMul'])

    # --- quick ORT check of the exported fp32 models
    import onnxruntime as ort, numpy as np
    for suf in ['', '.int8']:
        se = ort.InferenceSession(os.path.join(OUT, f'encoder{suf}.onnx'))
        sdc = ort.InferenceSession(os.path.join(OUT, f'decoder{suf}.onnx'))
        k, v = se.run(None, {'src': src.numpy()})
        pk = np.zeros((L, 1, H, 0, HD), np.float32); pv = pk.copy(); out = []
        for t, tok in enumerate(tgt):
            lp, pk, pv = sdc.run(None, {'tok': np.array([tok]), 'step': np.array(t), 'past_k': pk, 'past_v': pv, 'cross_k': k, 'cross_v': v})
            out.append(lp[0])
        print(f'ORT{suf} max |diff| vs fairseq:', np.abs(np.stack(out) - ref.numpy()).max())
    for f in sorted(os.listdir(OUT)):
        print(f, os.path.getsize(os.path.join(OUT, f)))
