// Kleine Helfer für die individuellen Spielwelten (siehe world-kit.css). Alle Texte, die hier hineingehen, sind bereits maskiert (esc) oder fest.
'use strict';
window.WorldKit = (() => {
  const t = (de, en) => I18n.content(de, en);
  const chip = (icon, text, kind = '') => `<span class="wk-chip ${kind}" data-i="${icon}">${text}</span>`;
  const head = ({ eyebrow = '', title = '', sub = '', chips = [] }) => `<header class="wk-head"><div><span class="wk-eyebrow">${eyebrow}</span><h2 class="wk-title">${title}</h2>${sub ? `<p class="wk-sub">${sub}</p>` : ''}</div>${chips.length ? `<div class="wk-chips">${chips.join('')}</div>` : ''}</header>`;
  return { t, chip, head };
})();
