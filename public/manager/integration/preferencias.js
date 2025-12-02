// preferencias.js - conservador, sem tamanho de fonte nem alto contraste
// Apenas Dark Mode + Daltonismo + Reset
// Persiste em localStorage keys:
//   pref_theme ("dark"|"light")
//   pref_filter ("protanopia"|"deuteranopia"|"tritanopia"|"none")

(function () {
  const LS_THEME = 'pref_theme';
  const LS_FILTER = 'pref_filter';

  // Helpers para detectar cores (usados para ajustes conservadores)
  function rgbToLuminance(r,g,b){
    const toLin = v => {
      v = v / 255;
      return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    };
    return 0.2126*toLin(r) + 0.7152*toLin(g) + 0.0722*toLin(b);
  }
  function parseRGB(str){
    const m = str && str.match && str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return null;
    return [parseInt(m[1],10), parseInt(m[2],10), parseInt(m[3],10)];
  }

  // store modified elements to restore later (only for color/background changes)
  const modifiedElements = new WeakMap();

  // conservative test: element background is "light" (near white)
  function isBgLight(cs){
    if(!cs || !cs.backgroundColor) return false;
    const rgb = parseRGB(cs.backgroundColor);
    if(!rgb) return false;
    const lum = rgbToLuminance(rgb[0], rgb[1], rgb[2]);
    return lum > 0.9; // very light -> treat as white-ish
  }

  // conservative test: text is very dark (near black)
  function isTextDark(cs){
    if(!cs || !cs.color) return false;
    const rgb = parseRGB(cs.color);
    if(!rgb) return false;
    const lum = rgbToLuminance(rgb[0], rgb[1], rgb[2]);
    return lum < 0.15; // dark
  }

  // Apply inline style change and remember original inline value
  function setInline(el, prop, value){
    if(!modifiedElements.has(el)){
      modifiedElements.set(el, {});
    }
    const map = modifiedElements.get(el);
    if (!(prop in map)) {
      map[prop] = el.style.getPropertyValue(prop) || null;
    }
    el.style.setProperty(prop, value, 'important');
  }

  // Restore inline styles previously changed
  function restoreInline(el){
    if(!modifiedElements.has(el)) return;
    const map = modifiedElements.get(el);
    for(const prop in map){
      const orig = map[prop];
      if(orig === null) el.style.removeProperty(prop);
      else el.style.setProperty(prop, orig);
    }
    modifiedElements.delete(el);
  }

  // Walk DOM (and optionally shadowRoots) and apply conservative overrides for dark mode
  function adjustDocumentForTheme({ themeDark }) {
    // Compute root values from CSS variables (reads computed)
    const root = document.documentElement;
    const csRoot = getComputedStyle(root);
    const bgCard = (csRoot.getPropertyValue('--pref-bg-card') || '').trim() || (themeDark ? '#141414' : '#ffffff');
    const textColor = (csRoot.getPropertyValue('--pref-text') || '').trim() || (themeDark ? '#e6eef0' : '#111827');

    const processEl = (el) => {
      // ignore script/style/link
      if (!el || !el.tagName) return;
      const tag = el.tagName.toUpperCase();
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK') return;

      // don't touch media elements
      if (tag === 'IMG' || tag === 'CANVAS' || tag === 'SVG' || tag === 'PATH') return;

      let cs;
      try {
        cs = getComputedStyle(el);
      } catch (e) {
        return;
      }

      if (themeDark) {
        // Background: if element has very light background, replace with bgCard in dark mode
        if (isBgLight(cs) || (cs.backgroundColor === 'transparent' && (el.classList.contains('card') || el.classList.contains('card-perfil') || el.classList.contains('card-preferencias') || el.classList.contains('sidebar')))) {
          setInline(el, 'background-color', bgCard);
        }
        // Text color: if very dark text set to pref text
        if (isTextDark(cs)) {
          setInline(el, 'color', textColor);
        }
      } else {
        // restore any inline changes when theme off
        restoreInline(el);
      }
    };

    // iterate over document elements (body *)
    const all = document.querySelectorAll('body *');
    all.forEach(el => processEl(el));

    // handle shadow roots: apply minimal inline overrides inside shadow DOM
    const hosts = Array.from(document.querySelectorAll('*')).filter(el => el.shadowRoot);
    hosts.forEach(host => {
      try {
        const sr = host.shadowRoot;
        // apply style on host to help internals inherit dark-friendly colors when appropriate
        if (themeDark) {
          host.style.setProperty('background-color', bgCard, 'important');
          host.style.setProperty('color', textColor, 'important');
        } else {
          host.style.removeProperty('background-color');
          host.style.removeProperty('color');
        }

        const inner = sr.querySelectorAll('*');
        inner.forEach(e => {
          try {
            const cs = getComputedStyle(e);
            if (themeDark) {
              if (isBgLight(cs) || (cs.backgroundColor === 'transparent' && (e.classList.contains('card') || e.classList.contains('sidebar') || e.classList.contains('help-card')))) {
                setInline(e, 'background-color', bgCard);
              }
              if (isTextDark(cs)) {
                setInline(e, 'color', textColor);
              }
            } else {
              restoreInline(e);
            }
          } catch (err){}
        });
      } catch(err){}
    });
  }

  // Revert all modifications: restore inline styles we changed
  function restoreAllModifications(){
    document.querySelectorAll('body *').forEach(el => restoreInline(el));
    // restore inner modifications inside shadow roots
    Array.from(document.querySelectorAll('*')).filter(el => el.shadowRoot).forEach(host => {
      host.style.removeProperty('background-color');
      host.style.removeProperty('color');
      try {
        host.shadowRoot.querySelectorAll('*').forEach(e => { restoreInline(e); });
      } catch(e){}
    });
  }

  // Apply or remove theme according to current stored preferences
  function applyPreferencesFromStorage(){
    const theme = localStorage.getItem(LS_THEME) || 'light';
    const filter = localStorage.getItem(LS_FILTER) || 'none';

    // set data attribute on html for CSS variables usage
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-pref-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-pref-theme');
    }

    // classes for filters
    document.documentElement.classList.remove('filtro-protanopia','filtro-deuteranopia','filtro-tritanopia');
    if (filter !== 'none') document.documentElement.classList.add(`filtro-${filter}`);

    // Update UI controls if present
    const toggleDark = document.getElementById('toggle-dark');
    if(toggleDark) toggleDark.checked = (theme === 'dark');
    const selectDal = document.getElementById('select-daltonismo');
    if(selectDal) selectDal.value = filter;

    // perform conservative adjustments for stubborn elements (sidebar, cards, spans)
    if (theme === 'dark') {
      adjustDocumentForTheme({ themeDark: true });
    } else {
      restoreAllModifications();
    }
  }

  // Hook the UI controls (your HTML IDs)
  function hookUI(){
    // dark toggle
    const td = document.getElementById('toggle-dark');
    if(td && !td._prefHook){
      td.addEventListener('change', (e)=>{
        localStorage.setItem(LS_THEME, e.target.checked ? 'dark' : 'light');
        applyPreferencesFromStorage();
      });
      td._prefHook = true;
    }

    // daltonismo select
    const sel = document.getElementById('select-daltonismo');
    if(sel && !sel._prefHook){
      sel.addEventListener('change', (e)=>{
        localStorage.setItem(LS_FILTER, e.target.value);
        applyPreferencesFromStorage();
      });
      sel._prefHook = true;
    }

    // reset button
    const resetBtn = document.getElementById('reset-accessibility');
    if(resetBtn && !resetBtn._prefHook){
      resetBtn.addEventListener('click', ()=>{
        localStorage.removeItem(LS_THEME);
        localStorage.removeItem(LS_FILTER);
        restoreAllModifications();
        applyPreferencesFromStorage();
      });
      resetBtn._prefHook = true;
    }
  }

  // Watch for DOM changes and re-hook (SPA support)
  function setupObserver(){
    if(window.__prefsObserver) return;
    const obs = new MutationObserver(() => {
      if(window.__prefsDeb) clearTimeout(window.__prefsDeb);
      window.__prefsDeb = setTimeout(()=>{
        hookUI();
        applyPreferencesFromStorage();
      }, 100);
    });
    obs.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: false });
    window.__prefsObserver = obs;
  }

  // Public init
  function init(){
    hookUI();
    applyPreferencesFromStorage();
    setupObserver();
  }

  // Expose for debugging
  window.preferencias = {
    init,
    applyPreferencesFromStorage,
    restoreAllModifications
  };

  // Auto init
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
