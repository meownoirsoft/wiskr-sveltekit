// Minimal XRay overlay — dev-only DOM inspector
// Hotkeys: Ctrl+Shift+X toggle • L lock/unlock • C copy selector
export function init(opts = {}) {
  const hotkey = (opts.hotkey || 'Control+Shift+X').toUpperCase();
  let enabled = false, lockedEl = null, lastX = 0, lastY = 0;
  let showStack = false;
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
  overlay.append(box, panel);

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

    // Effective z-index info + stacking context info
    const isPositioned = cs.position !== 'static';
    const hasNumericZ = isPositioned && cs.zIndex !== 'auto';
    const sc = nearestStackingContext(el);
    const zInfo = hasNumericZ
      ? cs.zIndex
      : `auto (in SC: ${sc.el === el ? 'self' : nicename(sc.el)} via ${stackingContextReasons(sc.el, sc.cs)})`;

    const selfSC = createsStackingContext(el, cs) ? stackingContextReasons(el, cs) : 'no';
    const nearestSCLabel = sc.el === el ? 'self' : nicename(sc.el);
    const nearestSCWhy = stackingContextReasons(sc.el, sc.cs);
        
    const transform = cs.transform !== 'none'
      ? (cs.transform.length > 64 ? cs.transform.slice(0,64) + '…' : cs.transform)
      : 'none';
    const peek = showStack ? `<div style="margin-top:6px;opacity:.8"><b>stack</b><br>${stackPeek(x,y)}</div>` : '';

    panel.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px">whodis: ${tag}${id}${classes}
        <span style="opacity:.7">(${dims})</span></div>
      <div><b>layout</b> ${layout}</div>
      <div><b>pos</b> ${cs.position}; <b>z</b> ${zInfo}; <b>opacity</b> ${cs.opacity};
           <b>pe</b> ${cs.pointerEvents}; <b>overflow</b> ${cs.overflowX}/${cs.overflowY}</div>
      <div><b>transform</b> ${transform}</div>
      <div><b>font</b> ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily.split(',')[0]}</div>
      <div><b>color</b> ${cs.color} <b>bg</b> ${cs.backgroundColor}</div>
      <div><b>stack ctx</b> ${selfSC} <span style="opacity:.7">• nearest:</span> ${nearestSCLabel} <span style="opacity:.7">via</span> ${nearestSCWhy}</div>
      <div style="opacity:.7;white-space:normal;overflow-wrap:anywhere">
        <b>selector</b> ${cssPath(el)}
      </div>
      ${peek}
      <div style="opacity:.6;margin-top:6px">[XRay] ${hotkey} toggle • L lock • C copy • Z stack</div>
    `;

    // highlight box
    box.style.left = r.left + 'px';
    box.style.top = r.top + 'px';
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';

    // place panel near cursor with viewport clamping
    const pad = 12;
    const w = Math.min(480, window.innerWidth * 0.48);
    panel.style.maxWidth = w + 'px';
    const pr = panel.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + pr.width + pad > window.innerWidth) left = x - pr.width - 14;
    if (top + pr.height + pad > window.innerHeight) top = y - pr.height - 14;
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
    if (matchHotkey(e, hotkey) && !e.repeat) { // <-- ignore auto-repeat
      toggle();
      e.preventDefault();
      return;
    }
    if (!enabled) return;
    if (e.key === 'l' || e.key === 'L') lockedEl = lockedEl ? null : document.elementFromPoint(lastX, lastY);
    if (e.key === 'c' || e.key === 'C') {
      const el = lockedEl ?? document.elementFromPoint(lastX, lastY) ?? document.body;
      const sel = el ? cssPath(el) : '';
      navigator.clipboard?.writeText(sel).catch(()=>{});
      
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