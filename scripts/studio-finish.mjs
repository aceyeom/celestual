// studio-finish.mjs: the reel's frames finished as a print of a film would
// look, in one ffmpeg filter graph. Each step is something a real lens and a
// real stock do, kept small, so the frame reads as photographed rather than
// drawn:
//
//   veil       the lens's own glare: the frame a quarter size, blurred wide,
//              laid back over it faintly
//   halation   the brightest light goes through the emulsion, off the film's
//              base and back, so a red orange rim comes up around it
//   grade      a print's black is never quite black: the toe lifted and a
//              little cool, the shoulder rolled off a little warm
//   grain      new every frame, strongest in the mid tones, softer in the
//              shadows and the lights, as a stock's is
//
// finish({ w, h, fps, s, pre, amp, soft }) gives the graph from [0:v] to
// [v]; `pre` runs on the frames first (the thirty's frame mixing), `s` is the
// length in seconds, which the grain's plate needs to end with the film, and
// `amp` and `soft` are the grain's strength and softness.
export function finish({ w = 1080, h = 1920, fps = 60, s, pre = '', amp = 16, soft = 0.8 }) {
  const lum = 'colorchannelmixer=rr=0.30:rg=0.59:rb=0.11:gr=0.30:gg=0.59:gb=0.11:br=0.30:bg=0.59:bb=0.11'
  // the grain's weight by the light under it: about half in the shadows and
  // the lights, whole in the mid tones
  const grain = `clip(x+(y-128)*(0.45+0.55*sin(PI*pow(x/255\\,0.8)))\\,0\\,255)`
  // the grain itself: a plate of mid grey at half size, new noise each frame
  // in each of the three layers, softened, mostly shared between the layers
  // (as the dye clouds of a stock mostly coincide) and drawn up to full size,
  // so a clump is two or three pixels. Grain a pixel fine costs an encoder
  // far more bits and is the first thing a feed's own encoder smears; at
  // this size and strength (a standard deviation of about two and a half
  // levels in the mid tones) it costs a quarter again and stays grain
  const share = 'colorchannelmixer=rr=0.5:rg=0.25:rb=0.25:gr=0.25:gg=0.5:gb=0.25:br=0.25:bg=0.25:bb=0.5'
  return [
    `[0:v]${pre}format=gbrp,split=3[base][hal][veil]`,
    `[veil]scale=iw/4:ih/4:flags=bilinear,gblur=sigma=10,scale=${w}:${h}:flags=bicubic[v1]`,
    `[hal]scale=iw/2:ih/2:flags=bilinear,${lum},curves=all='0/0 0.6/0 1/1',colorchannelmixer=rr=1:gg=0.36:bb=0.12,gblur=sigma=5,scale=${w}:${h}:flags=bicubic[h1]`,
    `[base][v1]blend=all_mode=screen:all_opacity=0.12[f1]`,
    `[f1][h1]blend=all_mode=screen:all_opacity=0.5[f2]`,
    `[f2]curves=r='0/0.028 0.5/0.505 1/0.975':g='0/0.031 0.5/0.5 1/0.97':b='0/0.042 0.5/0.49 1/0.95'[f3]`,
    `color=c=0x808080:s=${w / 2}x${h / 2}:r=${fps}${s ? `:d=${s}` : ''},format=gbrp,noise=alls=${amp}:allf=t,gblur=sigma=${soft},${share},scale=${w}:${h}:flags=bicubic[g]`,
    `[f3][g]lut2=c0='${grain}':c1='${grain}':c2='${grain}':shortest=1,format=yuv420p[v]`,
  ].join(';')
}
