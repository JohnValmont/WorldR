"""WORLDr trailer score: synthesized (no samples, no licences). 120 BPM, D minor.
usage: python3 score.py main|short out.wav
"""
import sys, json, numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
SR = 44100
rng = np.random.default_rng(7)
def t_arr(d): return np.arange(int(d * SR)) / SR
def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a*sr), int(d*sr), int(r*sr); s_len = max(0, n - a - d - r)
    e = np.concatenate([np.linspace(0, 1, max(a,1)), np.linspace(1, s, max(d,1)), np.full(s_len, s), np.linspace(s, 0, max(r,1))])
    return e[:n] if len(e) >= n else np.pad(e, (0, n-len(e)))
def lp(x, f, order=2): return sosfilt(butter(order, min(f, SR/2-100)/(SR/2), 'low', output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f/(SR/2), 'high', output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo/(SR/2), min(hi, SR/2-100)/(SR/2)], 'band', output='sos'), x)
def saw(f, t, ph=0.0): return 2*((f*t + ph) % 1.0) - 1
def note(n): return 440.0 * 2 ** ((n - 69) / 12)   # MIDI -> Hz
D2, F2, A2, Bb1, C2, D3 = 38, 41, 45, 34, 36, 50

class Mix:
    def __init__(s, dur): s.L = np.zeros(int(dur*SR)+SR); s.R = np.zeros_like(s.L)
    def add(s, x, at, gain=1.0, pan=0.0):
        i = int(at*SR); x = x[:max(0, len(s.L)-i)]
        s.L[i:i+len(x)] += x*gain*np.sqrt(0.5*(1-pan)); s.R[i:i+len(x)] += x*gain*np.sqrt(0.5*(1+pan))
    def addst(s, l, r, at, gain=1.0):
        i = int(at*SR); n = min(len(l), len(s.L)-i); s.L[i:i+n] += l[:n]*gain; s.R[i:i+n] += r[:n]*gain

def tick(high=True):
    t = t_arr(0.06); n = rng.standard_normal(len(t))
    x = bp(n, 2500 if high else 1800, 6000 if high else 4200) * np.exp(-t*90)
    x += 0.4*np.sin(2*np.pi*(3200 if high else 2400)*t)*np.exp(-t*120)
    return x * 0.9
def taiko(pitch=1.0, dur=1.6):
    t = t_arr(dur); f = 55*pitch + 90*pitch*np.exp(-t*18)
    body = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*3.2)
    skin = lp(rng.standard_normal(len(t)), 900) * np.exp(-t*30) * 0.6
    return np.tanh(1.6*(body + skin))
def kick():
    t = t_arr(0.5); f = 48 + 110*np.exp(-t*30)
    return np.tanh(2*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*7))
def braam(dur=5.0, root=D2):
    t = t_arr(dur); x = np.zeros_like(t)
    for n, g in [(root-12, 1.0), (root, 0.9), (root+7, 0.6), (root+12, 0.5), (root+19, 0.25)]:
        for det in (-0.12, 0.0, 0.11):
            x += g*saw(note(n)*2**(det/12), t, rng.random())
    cutoff_env = 180 + 2400*np.exp(-t*1.4)*(1-np.exp(-t*25))
    # time-varying lowpass approximated in blocks
    out = np.zeros_like(x); blk = 2048
    for i in range(0, len(x), blk):
        out[i:i+blk] = lp(x[i:i+blk], cutoff_env[i])
    out = np.tanh(1.8*out/8) * env_adsr(len(t), 0.02, 0.4, 0.55, dur*0.6)
    sub = np.sin(2*np.pi*note(root-12)*t)*np.exp(-t*0.8)*0.7
    return out + sub
def pad_chord(notes, dur, bright=900, att=1.2, rel=1.5):
    t = t_arr(dur); L = np.zeros_like(t); R = np.zeros_like(t)
    for n in notes:
        for k, det in enumerate((-0.09, 0.0, 0.08)):
            v = saw(note(n)*2**(det/12), t, rng.random())
            (L if k != 2 else R)[:] += v; (R if k != 0 else L)[:] += v*0.7
    e = env_adsr(len(t), att, 0.5, 0.85, rel)
    return lp(L, bright)*e/len(notes)/3, lp(R, bright)*e/len(notes)/3
def pluck(n, dur=0.22, bright=2200):
    t = t_arr(dur); x = saw(note(n), t) + 0.5*saw(note(n)*1.005, t)
    return lp(x, bright) * np.exp(-t*14) * 0.5
def riser(dur):
    t = t_arr(dur); x = rng.standard_normal(len(t)); out = np.zeros_like(x); blk = 2048
    for i in range(0, len(x), blk):
        f = 300 + 7000*(i/len(x))**2; out[i:i+blk] = bp(x[i:i+blk], f*0.7, f*1.3)
    return out * np.linspace(0, 1, len(t))**2 * 0.5
def whoosh(dur=0.7):
    t = t_arr(dur); x = rng.standard_normal(len(t)); out = np.zeros_like(x); blk = 1024
    for i in range(0, len(x), blk):
        p = i/len(x); f = 400 + 5000*np.sin(np.pi*p); out[i:i+blk] = bp(x[i:i+blk], f*0.6, f*1.4)
    return out * np.sin(np.pi*t/dur)**2 * 0.6
def reverse_swell(dur=1.5):
    t = t_arr(dur); x = hp(rng.standard_normal(len(t)), 3000)*np.exp(-t[::-1]*0.0)*(t/dur)**3
    return x*0.5
def reverb(L, R, secs=3.2, wet=0.28):
    t = t_arr(secs); ir_l = rng.standard_normal(len(t))*np.exp(-t*2.2); ir_r = rng.standard_normal(len(t))*np.exp(-t*2.2)
    ir_l, ir_r = lp(ir_l, 6000)/np.sqrt(len(t)), lp(ir_r, 6000)/np.sqrt(len(t))
    wl = fftconvolve(L, ir_l)[:len(L)]; wr = fftconvolve(R, ir_r)[:len(R)]
    return L*(1-wet) + wl*wet*8, R*(1-wet) + wr*wet*8

PROG = [[D2, F2+12, A2+12, D3], [Bb1+12, D3, F2+24, Bb1+24], [F2, A2+12, C2+24, F2+24], [C2+12, E := 40+12, 43+12, C2+24]]

def build(spec):
    dur = spec['dur']; m = Mix(dur)
    # clock ticks
    for (a, b, step) in spec['ticks']:
        k = 0; tt = a
        while tt < b: m.add(tick(k % 2 == 0), tt, 0.32, pan=-0.2 if k % 2 else 0.2); tt += step; k += 1
    # drone under everything except the end ring-out
    t = t_arr(dur); drone = 0.5*np.sin(2*np.pi*note(D2-12)*t) + 0.25*lp(saw(note(D2), t), 220)
    drone *= np.clip(np.minimum(t/4, (dur-t)/3), 0, 1) * 0.35
    m.add(drone, 0, 1.0)
    # pads per chord section
    for (a, b, bright) in spec['pads']:
        s = a; i = 0
        while s < b - 0.01:
            d = min(4.0, b - s); L, R = pad_chord(PROG[i % 4], d + 1.0, bright=bright, att=0.6 if i else 1.5, rel=1.0)
            m.addst(L, R, s, 0.55); s += 4.0; i += 1
    # driving ostinato (16th plucks)
    for (a, b, dens) in spec['ostinato']:
        s = a; k = 0
        pattern = [D2+12, D2+12, A2, D2+12, F2+12, D2+12, A2, C2+12]
        while s < b:
            chord = PROG[int((s - a) // 4) % 4]; root = chord[0] if chord[0] > 40 else chord[0] + 12
            n = pattern[k % 8] - (D2+12) + root
            m.add(pluck(n), s, 0.32*dens, pan=0.35 if k % 2 else -0.35); s += 0.125; k += 1
    # drums
    for (a, b) in spec['drums']:
        s = a; k = 0
        while s < b:
            if k % 4 == 0: m.add(kick(), s, 0.75)
            if k % 8 == 6: m.add(taiko(1.25, 1.0), s, 0.45, pan=0.3)
            if k % 2 == 1: m.add(tick(True), s, 0.11, pan=0.4)
            s += 0.25; k += 1
    for at in spec['taiko']: m.add(taiko(1.0), at, 0.9)
    for at, root in spec['braams']: m.add(braam(5.0, root), at, 1.5)
    for at, d in spec['risers']: m.add(riser(d), at - d, 0.8)
    for at in spec['whoosh']: m.add(whoosh(), at - 0.35, 0.35)
    for at in spec.get('swells', []): m.add(reverse_swell(1.5), at - 1.5, 0.6)
    L, R = reverb(m.L, m.R)
    L, R = hp(L, 28), hp(R, 28)
    peak = max(np.abs(L).max(), np.abs(R).max()); L, R = np.tanh(1.3*L/peak)/np.tanh(1.3), np.tanh(1.3*R/peak)/np.tanh(1.3)
    n = int(dur*SR); fade = np.ones(n); fade[-int(1.5*SR):] = np.linspace(1, 0, int(1.5*SR))
    return (np.stack([L[:n], R[:n]], 1) * fade[:, None] * 0.89)

SPECS = {
  'main': dict(dur=75.0,
    ticks=[(0.0, 12.0, 1.0), (58.0, 67.0, 0.5), (70.5, 74.0, 1.0)],
    pads=[(4.0, 12.0, 500), (12.0, 38.0, 900), (38.0, 58.0, 1400), (58.0, 67.0, 700), (67.0, 75.0, 1600)],
    ostinato=[(12.0, 33.0, 0.8), (33.0, 37.9, 1.2), (38.0, 57.9, 1.0)],
    drums=[(14.0, 37.9), (38.0, 57.9)],
    taiko=[5.0, 6.333, 7.667, 21.0, 46.0, 50.0],
    braams=[(9.0, D2), (38.0, D2), (67.0, Bb1+12), (70.0, D2)],
    risers=[(9.0, 2.5), (38.0, 4.5), (58.0, 3.5), (70.0, 2.5)],
    whoosh=[12, 15, 18, 21, 24, 27, 30, 42, 46, 50, 54, 58, 60.5, 63, 65],
    swells=[9.0, 38.0, 70.0]),
  'short': dict(dur=30.0,
    ticks=[(0.0, 3.0, 0.5), (21.0, 24.0, 0.5), (25.5, 29.0, 1.0)],
    pads=[(0.0, 3.0, 600), (3.0, 21.0, 1200), (21.0, 24.0, 700), (24.0, 30.0, 1600)],
    ostinato=[(3.0, 20.9, 1.1)],
    drums=[(3.0, 20.9)],
    taiko=[0.5, 1.5],
    braams=[(3.0, D2), (24.0, D2)],
    risers=[(3.0, 2.0), (24.0, 3.0)],
    whoosh=[5, 7, 9, 11, 13, 15, 17, 19, 21],
    swells=[3.0, 24.0]),
}
if __name__ == '__main__':
    from scipy.io import wavfile
    a = build(SPECS[sys.argv[1]])
    wavfile.write(sys.argv[2], SR, (a * 32767).astype(np.int16))
    print('wrote', sys.argv[2], a.shape[0] / SR, 's')
