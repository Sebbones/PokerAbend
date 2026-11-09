// Sprachwahl der Datenschutzseite (Deutsch/Englisch). Ohne Skript bleibt der deutsche Text sichtbar. Die Sprache folgt der Wahl der App (poker:language).
'use strict';
(() => {
  let lang = 'de';
  try { lang = JSON.parse(localStorage.getItem('poker:language')) === 'en' ? 'en' : 'de'; } catch { /* Deutsch bleibt */ }
  const apply = (value) => {
    document.documentElement.lang = value;
    document.querySelectorAll('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== value; });
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === value)));
    document.title = value === 'en' ? 'Privacy · Games Night' : 'Datenschutz · Spieleabend';
  };
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    apply(b.dataset.lang);
    try { localStorage.setItem('poker:language', JSON.stringify(b.dataset.lang)); } catch { /* ohne Speicher */ }
  }));
  apply(lang);
})();
