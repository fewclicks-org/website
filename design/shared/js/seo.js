// Sets page title, meta description, Open Graph/Twitter tags and JSON-LD for a game page.
// Note: social networks don't run JavaScript, so for the final site these tags should also be
// generated statically (see README "Later"). Search engines like Google do pick them up.

import { asset } from './data.js';

function meta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function setMeta({ title, description, image, type = 'website', keywords = [] }) {
  if (title) document.title = title;
  meta('name', 'description', description);
  if (keywords.length) meta('name', 'keywords', keywords.join(', '));
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:type', type);
  meta('property', 'og:url', location.href);
  meta('property', 'og:image', image ? asset(image) : '');
  meta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  meta('name', 'twitter:title', title);
  meta('name', 'twitter:description', description);
}

export function setGameSeo(game, studio = { name: 'FewClicks' }) {
  setMeta({
    title: `${game.seo.title || game.title} | ${studio.name}`,
    description: game.seo.description || game.description.short,
    image: game.seo.ogImage || game.media.cover,
    keywords: game.seo.keywords || [],
    type: 'website',
  });
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: game.seo.description || game.description.short,
    image: asset(game.seo.ogImage) || game.media.cover,
    url: location.href,
    genre: game.categoryList.map((c) => c.name),
    gamePlatform: game.platformList.map((p) => p.label),
    datePublished: game.releaseDate || undefined,
    inLanguage: game.languages,
    publisher: { '@type': 'Organization', name: studio.name, email: studio.email || undefined },
  };
  if (game.rating.count > 0) {
    ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: game.rating.average, ratingCount: game.rating.count, bestRating: 5 };
  }
  let s = document.getElementById('game-jsonld');
  if (!s) {
    s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'game-jsonld';
    document.head.appendChild(s);
  }
  s.textContent = JSON.stringify(ld);
}
