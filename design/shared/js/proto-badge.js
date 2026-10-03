// Small floating "Prototype N" pill that links back to the prototype gallery at the site root.
import { ROOT } from './data.js';

export function mountPrototypeBadge(number, name) {
  const a = document.createElement('a');
  a.href = ROOT.href;
  a.className = 'fc-proto-badge';
  a.innerHTML = `<span aria-hidden="true">←</span> Prototype ${number}<span class="fc-proto-badge__name"> · ${name}</span>`;
  a.title = 'Back to all prototypes';
  const style = document.createElement('style');
  style.textContent = `.fc-proto-badge{position:fixed;left:12px;bottom:12px;z-index:9999;font:600 12px/1 system-ui,sans-serif;color:#fff;background:rgba(20,16,40,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:8px 12px;border-radius:999px;text-decoration:none;box-shadow:0 4px 16px rgba(0,0,0,.2);transition:transform .2s}
.fc-proto-badge:hover,.fc-proto-badge:focus-visible{transform:translateY(-2px)}
@media (max-width:600px){.fc-proto-badge__name{display:none}}`;
  document.head.appendChild(style);
  document.body.appendChild(a);
}
