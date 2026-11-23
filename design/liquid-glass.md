# Liquid Glass — controls recipe

Real liquid glass, not just blur. The backdrop is refracted (skewed) with an SVG
displacement filter, then given a glass bevel and a specular sheen.

## 1. One SVG filter per page (place once in the DOM)

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="liquid" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="7" result="n"/>
    <feGaussianBlur in="n" stdDeviation="0.4" result="nb"/>
    <feDisplacementMap in="SourceGraphic" in2="nb" scale="42" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
```

Tune `scale` (higher = more distortion) and `baseFrequency` (lower = larger,
smoother waves).

## 2. The glass button

```css
.btn{
  position:relative; isolation:isolate; overflow:hidden;
  color:#fff; border:1px solid rgba(255,255,255,.18);
  background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.05));
  /* refraction FIRST, then a touch of blur */
  -webkit-backdrop-filter:blur(4px) saturate(1.7);
  backdrop-filter:url(#liquid) saturate(1.7) blur(0.6px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),
             inset 0 -10px 18px rgba(255,255,255,.05),
             0 10px 26px -12px rgba(0,0,0,.6);
}
.btn::after{ /* specular sheen */
  content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  mix-blend-mode:screen; opacity:.6;
  background:linear-gradient(135deg,rgba(255,255,255,.6),rgba(255,255,255,0) 34%,
            rgba(255,255,255,0) 64%,rgba(255,255,255,.25));
}
/* Red/danger variant keeps the glass, adds the tint */
.btn-primary{
  background:linear-gradient(180deg,rgba(239,66,54,.6),rgba(185,42,33,.52));
  border-color:rgba(255,170,160,.35);
}
```

## Notes

- The refraction needs a translucent fill to be visible, so keep alpha below ~0.65.
- Support: the `url()` backdrop refraction works in Chromium. Safari and Firefox
  fall back to frosted glass (blur + sheen), which still looks correct.
- Put button content in a child with `position:relative;z-index:1` if the sheen
  washes it.
