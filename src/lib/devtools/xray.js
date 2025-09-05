// Minimal XRay overlay — dev-only DOM inspector
// Hotkeys: Ctrl+Shift+X toggle • L lock/unlock • C copy selector
export function init(opts = {}) {
  const hotkey = (opts.hotkey || 'Control+Shift+X').toUpperCase();
  let enabled = false, lockedEl = null, lastX = 0, lastY = 0;
  let showStack = false;
  let showBox = false; 
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;border:2px solid #00A2FF;background:rgba(0,162,255,.12);box-sizing:border-box;pointer-events:none;';
  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed;min-width:260px;max-width:48vw',
    'font:12px ui-monospace,Menlo,Consolas,monospace;line-height:1.35',
    'color:#fff;background:rgba(0,0,0,.85);border:1px solid rgba(255,255,255,.14)',
    'border-radius:10px;padding:10px 12px;pointer-events:none;box-shadow:0 12px 40px rgba(0,0,0,.5)'
  ].join(';');
  // --- Box-model overlay layers ---
  function createRect(bg, z = 1) {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;pointer-events:none;display:none;background:${bg};
      border:1px solid rgba(255,255,255,.18);box-sizing:border-box;z-index:${z}`;
    return d;
  }
  const marginRects  = ['mt','mr','mb','ml'].map(() => createRect('rgba(255,165,0,.20)', 1)); // orange-ish
  const paddingRects = ['pt','pr','pb','pl'].map(() => createRect('rgba(16,185,129,.20)', 1)); // teal-ish
  // keep your main outline + panel above these
  box.style.zIndex   = '2';
  panel.style.zIndex = '3';
  overlay.append(...marginRects, ...paddingRects, box, panel);

  function matchHotkey(e, hotkeyStr) {
    const combo = `${e.ctrlKey?'Control+':''}${e.shiftKey?'Shift+':''}${e.altKey?'Alt+':''}${e.key.length===1?e.key.toUpperCase():e.key}`;
    return combo.toUpperCase() === hotkeyStr;
  }

  function cssPath(el) {
    if (!(el instanceof Element)) return '';
    if (el.id) return `#${el.id}`;
    const parts = [];
    for (let cur = el; cur && cur !== document.body; cur = cur.parentElement) {
      if (cur.id) { parts.unshift(`#${cur.id}`); break; }
      const name = cur.nodeName.toLowerCase();
      const cls = (cur.className && typeof cur.className === 'string')
        ? '.' + cur.className.trim().split(/\s+/).slice(0,2).join('.') : '';
      let nth = '';
      const p = cur.parentElement;
      if (p) {
        const sibs = Array.from(p.children).filter(c => c.nodeName === cur.nodeName);
        if (sibs.length > 1) nth = `:nth-of-type(${sibs.indexOf(cur)+1})`;
      }
      parts.unshift(name + cls + nth);
    }
    return parts.join(' > ');
  }



  function stackPeek(x, y) {
    const list = document.elementsFromPoint(x, y).slice(0, 6);
    return list.map(el => {
      const cs = getComputedStyle(el);
      const z = (cs.position !== 'static' && cs.zIndex !== 'auto') ? cs.zIndex : 'auto';
      return `${nicename(el)} [${z}]`;
    }).join('<br>');
  }

  function stackingContextReasons(el, cs) {
    const reasons = [];
    if (el === document.documentElement) reasons.push('root');
    if (cs.position === 'fixed') reasons.push('fixed');
    if (cs.position !== 'static' && cs.zIndex !== 'auto') reasons.push('pos+z');
    if (parseFloat(cs.opacity) < 1) reasons.push('opacity');
    if (cs.transform !== 'none') reasons.push('transform');
    if (cs.filter !== 'none') reasons.push('filter');
    if (cs.perspective !== 'none') reasons.push('perspective');
    if (cs.mixBlendMode !== 'normal') reasons.push('mix-blend');
    if (cs.isolation === 'isolate') reasons.push('isolation');
    if (cs.backdropFilter && cs.backdropFilter !== 'none') reasons.push('backdrop-filter');
    if (cs.clipPath && cs.clipPath !== 'none') reasons.push('clip-path');
    if (cs.contain && /paint|layout|strict|content/.test(cs.contain)) reasons.push('contain');
    if (cs.willChange && /transform|opacity|filter|perspective/.test(cs.willChange)) reasons.push('will-change');
    return reasons.length ? reasons.join(', ') : 'no';
  }

  function nicename(el) {
    try {
      if (!el || !el.tagName) return 'document';
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = el.classList?.length ? '.' + [...el.classList].slice(0,2).join('.') : '';
      return tag + id + cls;
    } catch {
      return '(unknown)';
    }
  }

  function createsStackingContext(el, cs) {
    return (
      el === document.documentElement ||
      cs.position === 'fixed' ||
      (cs.position !== 'static' && cs.zIndex !== 'auto') ||
      parseFloat(cs.opacity) < 1 ||
      cs.transform !== 'none' ||
      cs.filter !== 'none' ||
      cs.perspective !== 'none' ||
      cs.isolation === 'isolate' ||
      (cs.willChange && /transform|opacity|filter|perspective/.test(cs.willChange)) ||
      cs.mixBlendMode !== 'normal' ||
      (cs.contain && /paint|layout|strict|content/.test(cs.contain)) ||
      cs.backdropFilter !== 'none' ||
      cs.clipPath !== 'none'
    );
  }

  function nearestStackingContext(el) {
    for (let cur = el; cur; cur = cur.parentElement) {
      const cs = getComputedStyle(cur);
      if (createsStackingContext(cur, cs)) return { el: cur, cs };
    }
    return { el: document.documentElement, cs: getComputedStyle(document.documentElement) };
  }

  function nearestPositioned(el) {
    for (let cur = el; cur; cur = cur.parentElement) {
      const cs = getComputedStyle(cur);
      if (cs.position !== 'static') return { el: cur, cs };
    }
    // fallback to root if literally nothing is positioned
    return { el: document.documentElement, cs: getComputedStyle(document.documentElement) };
  }

  function swatchStyle(color) {
    // draws color over a checkerboard so rgba/alpha is visible
    return [
      'display:inline-block',
      'width:12px',
      'height:12px',
      'vertical-align:-2px',
      'margin-right:6px',
      'border-radius:3px',
      'border:1px solid rgba(255,255,255,.4)',
      // two backgrounds: the color (top) over a checkerboard (bottom)
      `background: linear-gradient(${color}, ${color}),`
        + 'conic-gradient(#bbb 25%, #eee 0 50%, #bbb 0 75%, #eee 0) 0 0/8px 8px'
    ].join(';');
  }
  function swatchHTML(color) {
    return `<span style="${swatchStyle(color)}"></span>`;
  }

  function parseCSSColor(input) {
    if (!input) return null;
    let s = String(input).trim().toLowerCase();
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

    // #rgb, #rgba, #rrggbb, #rrggbbaa
    if (s.startsWith('#')) {
      const hex = s.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
        return { r, g, b, a };
      }
      if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.slice(0,2), 16);
        const g = parseInt(hex.slice(2,4), 16);
        const b = parseInt(hex.slice(4,6), 16);
        const a = hex.length === 8 ? parseInt(hex.slice(6,8), 16) / 255 : 1;
        return { r, g, b, a };
      }
    }

    // rgb()/rgba() — supports commas or space + optional " / alpha"
    let m = s.match(/rgba?\((.+)\)/);
    if (m) {
      let body = m[1].replace(/\//g, ' ').trim();
      const parts = body.includes(',') ? body.split(/\s*,\s*/) : body.split(/\s+/);
      let [R, G, B, A = '1'] = parts;
      const ch = v => (/%$/.test(v) ? Math.round(parseFloat(v) * 2.55) : Math.round(parseFloat(v)));
      const al = v => (/%$/.test(v) ? parseFloat(v)/100 : parseFloat(v));
      const r = Math.max(0, Math.min(255, ch(R)));
      const g = Math.max(0, Math.min(255, ch(G)));
      const b = Math.max(0, Math.min(255, ch(B)));
      const a = Math.max(0, Math.min(1, isNaN(al(A)) ? 1 : al(A)));
      return { r, g, b, a };
    }

    // hsl()/hsla() just in case (rare from getComputedStyle, but cheap to support)
    m = s.match(/hsla?\((.+)\)/);
    if (m) {
      let body = m[1].replace(/\//g, ' ').trim();
      const parts = body.includes(',') ? body.split(/\s*,\s*/) : body.split(/\s+/);
      let [H, S, L, A = '1'] = parts;
      let h = ((parseFloat(H) % 360) + 360) % 360;
      let sPerc = /%$/.test(S) ? parseFloat(S)/100 : parseFloat(S);
      let lPerc = /%$/.test(L) ? parseFloat(L)/100 : parseFloat(L);
      const a = /%$/.test(A) ? parseFloat(A)/100 : parseFloat(A);
      const c = (1 - Math.abs(2*lPerc - 1)) * sPerc;
      const x = c * (1 - Math.abs(((h/60) % 2) - 1));
      const m0 = lPerc - c/2;
      let [r1,g1,b1] = [0,0,0];
      if (h < 60) [r1,g1,b1] = [c,x,0];
      else if (h < 120) [r1,g1,b1] = [x,c,0];
      else if (h < 180) [r1,g1,b1] = [0,c,x];
      else if (h < 240) [r1,g1,b1] = [0,x,c];
      else if (h < 300) [r1,g1,b1] = [x,0,c];
      else [r1,g1,b1] = [c,0,x];
      const r = Math.round((r1 + m0) * 255);
      const g = Math.round((g1 + m0) * 255);
      const b = Math.round((b1 + m0) * 255);
      return { r, g, b, a: isNaN(a) ? 1 : Math.max(0, Math.min(1, a)) };
    }

    return null; // unknown format
  }

  function rgbaToHex({ r, g, b, a }, includeAlphaIfNot1 = true) {
    const hx = n => n.toString(16).padStart(2, '0');
    let out = `#${hx(r)}${hx(g)}${hx(b)}`;
    if (includeAlphaIfNot1 && a < 1) out += hx(Math.round(a * 255));
    return out.toUpperCase();
  }

  function placeRect(el, left, top, width, height) {
    if (width <= 0 || height <= 0) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.width = width + 'px';
    el.style.height = height + 'px';
  }


  function render(el, x, y) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0,3).join('.') : '';
    const dims = `${Math.round(r.width)}w × ${Math.round(r.height)}h @ ${Math.round(r.left)}x,${Math.round(r.top)}y`;

    const display = cs.display;
    const layout = display.includes('grid')
      ? `grid: ${cs.gridTemplateColumns || 'auto'} × ${cs.gridTemplateRows || 'auto'} gap ${cs.gap || '0'}`
      : display.includes('flex')
        ? `flex: dir ${cs.flexDirection} wrap ${cs.flexWrap} gap ${cs.gap} jc ${cs.justifyContent} ai ${cs.alignItems}`
        : display;

    // Effective z-index info + positioned ancestor
    const isPositioned = cs.position !== 'static';
    const hasNumericZ = isPositioned && cs.zIndex !== 'auto';
    const sc = nearestStackingContext(el);
    const zInfo = hasNumericZ
      ? cs.zIndex
      : `auto (in SC: ${sc.el === el ? 'self' : nicename(sc.el)} via ${stackingContextReasons(sc.el, sc.cs)})`;

    const posAnc = nearestPositioned(el);
    const posAncLabel = posAnc.el === el ? 'self' : nicename(posAnc.el);
    const posAncInfo = `${posAncLabel} (${posAnc.cs.position}${posAnc.cs.zIndex !== 'auto' ? `, z ${posAnc.cs.zIndex}` : ''})`;

    // Font ratio
    let ratio = '';
    const fsPx = parseFloat(cs.fontSize);
    const lhPx = parseFloat(cs.lineHeight);
    if (!Number.isNaN(fsPx) && !Number.isNaN(lhPx) && fsPx > 0) {
      ratio = ` (${(lhPx / fsPx).toFixed(2)}x)`;
    }

    const selfSC = createsStackingContext(el, cs) ? stackingContextReasons(el, cs) : 'no';
    const nearestSCLabel = sc.el === el ? 'self' : nicename(sc.el);
    const nearestSCWhy = stackingContextReasons(sc.el, sc.cs);

    // --- Box model numbers ---
    const num = v => (v === 'auto' ? 0 : parseFloat(v) || 0);
    const marT = num(cs.marginTop),   marR = num(cs.marginRight),  marB = num(cs.marginBottom), marL = num(cs.marginLeft);
    const padT = num(cs.paddingTop),  padR = num(cs.paddingRight), padB = num(cs.paddingBottom), padL = num(cs.paddingLeft);
    const borT = num(cs.borderTopWidth), borR = num(cs.borderRightWidth), borB = num(cs.borderBottomWidth), borL = num(cs.borderLeftWidth);

    // Optional: box-sizing can explain “why width looks wrong”
    const boxSizing = cs.boxSizing;

        
    const transform = cs.transform !== 'none'
      ? (cs.transform.length > 64 ? cs.transform.slice(0,64) + '…' : cs.transform)
      : 'none';
    const peek = showStack ? `<div style="margin-top:6px;opacity:.8"><b>stack</b><br>${stackPeek(x,y)}</div>` : '';
    const colParsed = parseCSSColor(cs.color);
    const bgParsed  = parseCSSColor(cs.backgroundColor);
    const colHex = colParsed ? rgbaToHex(colParsed) : '';
    const bgHex  = bgParsed  ? rgbaToHex(bgParsed)  : '';

    panel.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px">ID/Class: ${tag}${id}${classes}
        <br />dims: <span style="opacity:.7">(${dims})</span></div>
      <div><b>layout</b> ${layout}</div>
      <div>
        <b>pos</b> ${cs.position}; <b>z</b> ${zInfo}; <b>opacity</b> ${cs.opacity};<br />
        <b>pntr-evts</b> ${cs.pointerEvents};<br />
        <b>overflow</b> ${cs.overflowX}/${cs.overflowY}
        <div><b>ancstr</b> ${posAncInfo}</div>
      </div>
      <div><b>margin</b> ${Math.round(marT)} ${Math.round(marR)} ${Math.round(marB)} ${Math.round(marL)}</div>
      <div><b>border</b> ${Math.round(borT)} ${Math.round(borR)} ${Math.round(borB)} ${Math.round(borL)}</div>
      <div><b>padding</b> ${Math.round(padT)} ${Math.round(padR)} ${Math.round(padB)} ${Math.round(padL)}</div>
      <div><b>transform</b> ${transform}</div>
      <div><b>font</b> ${cs.fontSize} (sz)/${cs.lineHeight}(lh)l ${ratio} ${cs.fontFamily.split(',')[0]}</div>
      <div>
        <b>color</b> ${swatchHTML(cs.color)} ${cs.color}
        <span style="opacity:.75">(${colHex})</span>
        <b>bg</b> ${swatchHTML(cs.backgroundColor)} ${cs.backgroundColor}
        <span style="opacity:.75">(${bgHex})</span>
      </div>
      <div><b>stack ctx</b> ${selfSC} <span style="opacity:.7">• nearest:</span> ${nearestSCLabel} <span style="opacity:.7">via</span> ${nearestSCWhy}</div>
      <div style="opacity:.7;white-space:normal;overflow-wrap:anywhere">
        <b>selector</b> ${cssPath(el)}
      </div>
      ${peek}
      <div style="opacity:.6;margin-top:6px">
        [XRay] ${hotkey} toggle • L lock • C copy selector • H hex • Shift+H bg-hex • Z stack • B box-model
      </div>
    `;

  
    // highlight box
    box.style.left = r.left + 'px';
    box.style.top = r.top + 'px';
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';

    // --- Box-model overlay drawing ---
    if (showBox) {
      // Margin (outside border-box). Only draw when positive; negative margins are shown numerically but skipped visually.
      if (marT > 0) placeRect(marginRects[0], r.left - marL, r.top - marT, r.width + marL + marR, marT);
      else marginRects[0].style.display = 'none';
      if (marR > 0) placeRect(marginRects[1], r.right, r.top - Math.max(marT,0), marR, r.height + Math.max(marT,0) + Math.max(marB,0));
      else marginRects[1].style.display = 'none';
      if (marB > 0) placeRect(marginRects[2], r.left - marL, r.bottom, r.width + marL + marR, marB);
      else marginRects[2].style.display = 'none';
      if (marL > 0) placeRect(marginRects[3], r.left - marL, r.top - Math.max(marT,0), marL, r.height + Math.max(marT,0) + Math.max(marB,0));
      else marginRects[3].style.display = 'none';

      // Padding (inside border-box)
      const innerLeft  = r.left + borL;
      const innerTop   = r.top + borT;
      const innerRight = r.right - borR;
      const innerBot   = r.bottom - borB;
      const innerW = Math.max(0, innerRight - innerLeft);
      const innerH = Math.max(0, innerBot - innerTop);

      if (padT > 0) placeRect(paddingRects[0], innerLeft, innerTop, innerW, padT);
      else paddingRects[0].style.display = 'none';
      if (padR > 0) placeRect(paddingRects[1], innerRight - padR, innerTop + padT, padR, Math.max(0, innerH - padT - padB));
      else paddingRects[1].style.display = 'none';
      if (padB > 0) placeRect(paddingRects[2], innerLeft, innerBot - padB, innerW, padB);
      else paddingRects[2].style.display = 'none';
      if (padL > 0) placeRect(paddingRects[3], innerLeft, innerTop + padT, padL, Math.max(0, innerH - padT - padB));
      else paddingRects[3].style.display = 'none';
    } else {
      for (const d of [...marginRects, ...paddingRects]) d.style.display = 'none';
    }

    // place panel near cursor with viewport clamping
    const pad = 12;
    const w = Math.min(480, window.innerWidth * 0.48);
    panel.style.maxWidth = w + 'px';
    const panelRect = panel.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + panelRect.width + pad > window.innerWidth) left = x - panelRect.width - 14;
    if (top + panelRect.height + pad > window.innerHeight) top = y - panelRect.height - 14;
    panel.style.left = Math.max(pad, left) + 'px';
    panel.style.top = Math.max(pad, top) + 'px';
  }

  function move(e) {
    lastX = e.clientX; lastY = e.clientY;
    if (!enabled) return;
    const el = lockedEl ?? document.elementFromPoint(lastX, lastY);
    if (!el || overlay.contains(el)) return;
    render(el, lastX, lastY);
  }

  function toggle(on) {
    enabled = typeof on === 'boolean' ? on : !enabled;
    if (enabled) {
      document.body.appendChild(overlay);
      window.addEventListener('mousemove', move, true);
      // render immediately so you see it without moving the mouse
      lastX = lastX || Math.round(window.innerWidth / 2);
      lastY = lastY || Math.round(window.innerHeight / 2);
      const el = document.elementFromPoint(lastX, lastY) || document.body;
      render(el, lastX, lastY);
    } else {
      overlay.remove();
      window.removeEventListener('mousemove', move, true);
      lockedEl = null;
    }
  }

function keydown(e) {
  if (matchHotkey(e, hotkey) && !e.repeat) { // ignore auto-repeat
    toggle();
    e.preventDefault();
    return;
  }
  if (!enabled) return;

  if (e.key === 'l' || e.key === 'L') {
    lockedEl = lockedEl ? null : document.elementFromPoint(lastX, lastY);
    e.preventDefault();
    return;
  }

  if (e.key === 'c' || e.key === 'C') {
    const el = lockedEl ?? document.elementFromPoint(lastX, lastY) ?? document.body;
    const sel = el ? cssPath(el) : '';
    navigator.clipboard?.writeText(sel).catch(()=>{});
    e.preventDefault();
    return;
  }

  // H = copy text color hex, Shift+H = copy background hex
  if (e.key === 'h' || e.key === 'H') {
    const el = lockedEl ?? document.elementFromPoint(lastX, lastY) ?? document.body;
    const cs = getComputedStyle(el);
    const picked = e.shiftKey ? cs.backgroundColor : cs.color;
    const parsed = parseCSSColor(picked);
    const hex = parsed ? rgbaToHex(parsed) : '';
    if (hex) {
      navigator.clipboard?.writeText(hex).catch(()=>{});
      try {
        panel.animate(
          [
            { outline: '2px solid rgba(255,255,255,0)' },
            { outline: '2px solid rgba(255,255,255,.8)' },
            { outline: '2px solid rgba(255,255,255,0)' }
          ],
          { duration: 300, easing: 'ease-in-out' }
        );
      } catch {}
      console.log(`[XRay] Copied ${e.shiftKey ? 'bg' : 'text'} hex:`, hex);
    }
    e.preventDefault();
    return;
  }

  // B = toggle box-model overlay
  if (e.key === 'b' || e.key === 'B') {
    showBox = !showBox;
    const el = lockedEl ?? document.elementFromPoint(lastX, lastY) ?? document.body;
    render(el, lastX, lastY);
    e.preventDefault();
    return;
  }
}

  window.addEventListener('keydown', (e) => {
    if (!enabled) return;
    if (e.key === 'z' || e.key === 'Z') showStack = !showStack;
  });
  window.addEventListener('keydown', keydown, true);
  window.addEventListener('mousemove', move, true);
  return { toggle };
}
export default init;