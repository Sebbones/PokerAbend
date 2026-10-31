// Local UI text only. Never translate player input, protocol values or room state wholesale.
'use strict';
window.I18n = (() => {
  const key = 'poker:language';
  let language = 'de';
  try { language = JSON.parse(localStorage.getItem(key)) === 'en' ? 'en' : 'de'; } catch { /* German remains the default. */ }
  const normal = (s) => String(s).replace(/\s+/g, ' ').trim();
  const t = (source) => {
    if (language !== 'en' || !Object.hasOwn(window.EN || {}, normal(source))) return source;
    const text = String(source);
    return text.match(/^\s*/)[0] + window.EN[normal(source)] + text.match(/\s*$/)[0];
  };
  function configureGames(games) {
    for (const game of games) {
      const english = window.EN_GAMES?.[game.id];
      if (english) for (const field of ['name', 'description']) window.EN[normal(game[field])] = english[field];
      if (game.workPackage?.startsWith('SOLO-') && game.english) {
        for (const field of ['description','mechanics','design']) if (typeof game.english[field] === 'string') window.EN[normal(game[field])] = game.english[field];
        for (const field of ['features','dependencies','acceptance']) (game[field] || []).forEach((text, i) => { if (typeof game.english[field]?.[i] === 'string') window.EN[normal(text)] = game.english[field][i]; });
      }
    }
  }
  // Translate the authored template before inserting values. Names, chat, custom prompts,
  // HTML-escaped user input and data attributes are never dictionary lookup candidates.
  const html = (parts, ...values) => {
    if (typeof parts === 'string') return fragment(parts);
    const source = parts.reduce((s, part, i) => s + part + (i < values.length ? `\uE000${i}\uE001` : ''), '');
    return fragment(source).replace(/\uE000(\d+)\uE001/g, (_, i) => String(values[Number(i)] ?? ''));
  };
  function phrase(source) {
    const slots = [];
    const canonical = source.replace(/\uE000\d+\uE001/g, (slot) => `{${slots.push(slot) - 1}}`);
    const result = t(canonical);
    return result === canonical ? source : String(result).replace(/\{(\d+)\}/g, (_, i) => slots[Number(i)] ?? '');
  }
  const attrEscape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  function fragment(source) {
    source = source.replace(/<([a-z][\w-]*)(\s[^<>]*?)?>([^<>\uE000]+)<\/\1>/gi, (all, tag, attrs = '', text) =>
      Object.hasOwn(window.EN || {}, normal(text)) && !/\bdata-i18n/.test(attrs)
        ? `<${tag}${attrs} data-i18n-source="${attrEscape(text)}">${text}</${tag}>` : all);
    return source.split(/(<[^>]*>)/g).map((part) => part.startsWith('<')
      ? part.replace(/(?<![\w-])(aria-label|title|placeholder)="([^"]*)"/g, (_, attr, value) => `${attr}="${phrase(value)}"${!value.includes('\uE000') && Object.hasOwn(window.EN || {}, normal(value)) ? ` data-i18n-${attr}="${attrEscape(value)}"` : ''}`)
      : phrase(part)).join('');
  }
  const originals = new WeakMap(), originalAttributes = new WeakMap();
  function staticText(root) {
    const elements = (selector) => [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    for (const el of elements('[data-i18n-source]')) { const text = t(el.dataset.i18nSource); if (el.textContent !== text) el.textContent = text; }
    for (const attr of ['aria-label', 'title', 'placeholder']) for (const el of elements(`[data-i18n-${attr}]`)) el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)));
    for (const el of elements('[data-i18n]')) {
      if (!originals.has(el)) originals.set(el, el.textContent);
      const text = t(originals.get(el)); if (el.textContent !== text) el.textContent = text;
    }
    for (const el of elements('[data-i18n-attrs]')) {
      let saved = originalAttributes.get(el);
      if (!saved) { saved = Object.fromEntries(el.dataset.i18nAttrs.split(' ').map((a) => [a, el.getAttribute(a)])); originalAttributes.set(el, saved); }
      for (const [attr, value] of Object.entries(saved)) el.setAttribute(attr, t(value));
    }
  }
  function select(value, persist = true) {
    if (!['de', 'en'].includes(value)) return;
    language = value;
    if (persist) try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* usable without storage */ }
    document.documentElement.lang = value;
    staticText(document);
    document.querySelectorAll('[data-language]').forEach((el) => { el.value = value; });
    window.dispatchEvent(new CustomEvent('languagechange', { detail: value }));
  }
  document.addEventListener('change', (event) => { if (event.target.matches('[data-language]')) select(event.target.value); });
  window.addEventListener('storage', (event) => { if (event.key === key) { let value; try { value = JSON.parse(event.newValue); } catch { return; } select(value === 'en' ? 'en' : 'de', false); } });
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = language; staticText(document);
    document.querySelectorAll('[data-language]').forEach((el) => { el.value = language; });
    // Only explicitly marked, authored copy is refreshed. Never inspect arbitrary text.
    const observer = new MutationObserver((changes) => {
      for (const change of changes) for (const node of change.addedNodes) if (node.nodeType === 1) staticText(node);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  const selector = () => `<label class="language-choice"><span>${language === 'en' ? 'Language' : 'Sprache'}</span><select data-language aria-label="${language === 'en' ? 'Language' : 'Sprache'}"><option value="de"${language === 'de' ? ' selected' : ''}>Deutsch</option><option value="en"${language === 'en' ? ' selected' : ''}>English (Beta)</option></select></label>`;
  function number(value, lang = language) {
    if (lang !== 'en') return value;
    const text = String(value).trim().replace(/\u2212/g, '-');
    if (!/^[+-]?(?:\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(text)) return null;
    const result = Number(text.replaceAll(',', ''));
    return Number.isFinite(result) ? result : null;
  }
  function numberDraft(value, from, to) {
    if (from === to || !value.trim() || /[.,]$/.test(value.trim())) return value;
    let result;
    if (from === 'en') result = number(value, 'en');
    else {
      // Match the German estimate parser, including grouped thousands and signs.
      let text = value.replace(/[\s\u00a0'’]/g, '').replace(/^\+/, '').replace(/^−/, '-');
      if (!/^-?[\d.,]+$/.test(text) || text.length > 30 || !/\d/.test(text)) return value;
      text = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(text) ? text.replaceAll('.', '').replace(',', '.') : text.replace(',', '.');
      result = Number(text);
    }
    if (result === null || !Number.isFinite(result) || Math.abs(result) > 1e15) return value;
    // String() emits exponent notation for small values, which estimate inputs reject.
    const text = result.toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 21 });
    return to === 'de' ? text.replace('.', ',') : text;
  }
  const content = (source, english) => language === 'en' && typeof english === 'string' ? english : source;
  return { t, html, select, selector, staticText, configureGames, content, number, numberDraft, get language() { return language; }, get locale() { return language === 'en' ? 'en-GB' : 'de-DE'; } };
})();
