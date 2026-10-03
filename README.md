# fewclicks.org

Website for **FewClicks**, a game studio making games you can love in a few clicks. Contact: admin@fewclicks.org

We have shortlisted **5 prototype designs** (1 Bubble Pop Planet, 2 Physics Playground, 6 Studio Portfolio · Lens, 8 Chapter · Cinematic, 11 Whiteboard · Physics & Light). Prototype 11 is an infinite-canvas, local-only app (drag items from the left toolbar onto the board, right-click or long-press for menus, double-click to edit anything; terrain, water, plants, fire, wind and weather simulation; pen/tablet writing): boards are saved in the visitor's `localStorage`, nothing is sent to any server, and a strict Content-Security-Policy only allows the site's own files. The site root (`index.html`) is a gallery linking to each one. Once we pick a winner, it becomes the real site.

## Structure

```
index.html              Prototype gallery (temporary home page)
CNAME                   Custom domain for GitHub Pages (fewclicks.org)
data/                   ← All site content as JSON. Edit these to change the site (see data/README.md)
assets/games/<id>/      Game icons, covers, screenshots, trailers
assets/team/            Team avatars
design/shared/js/       Shared code used by every prototype (data loading, sound, SEO, helpers)
design/vendor/          Vendored libraries (three.js, GSAP, Matter.js)
design/prototypeN/      Prototypes 1 & 2: index.html, games.html, game.html?id=…  ·  6 & 8: single page (game view at index.html#game/<id>)
```

Plain HTML/CSS/JS with no build step. GitHub Pages serves the files as they are.

## Preview locally

The pages load JSON with `fetch`, which browsers block for `file://` pages, so use a tiny local server:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Hosting on GitHub Pages + fewclicks.org

1. **Repo → Settings → Pages**
   - *Source*: **Deploy from a branch**
   - *Branch*: the branch with the site (currently `claude/ecstatic-pascal-p67hic`, later `main`), folder **/ (root)**
   - *Custom domain*: `fewclicks.org`, then **Save**
2. **DNS at your domain registrar** for `fewclicks.org`:

   | Type | Name | Value |
   |------|------|-------|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | AAAA | @ | 2606:50c0:8000::153 |
   | AAAA | @ | 2606:50c0:8001::153 |
   | AAAA | @ | 2606:50c0:8002::153 |
   | AAAA | @ | 2606:50c0:8003::153 |
   | CNAME | www | fewclicks-org.github.io |

   Remove any other A/AAAA/CNAME records for `@` and `www` (for example, the registrar's parking page).
3. Wait for DNS to update. This is usually minutes, but can take up to 24 hours. Then tick **Enforce HTTPS** in Settings → Pages.
4. Recommended: verify the domain in your **account Settings → Pages → Add a domain** (fewclicks-org is a personal account). This adds a TXT record and stops anyone else from claiming `fewclicks.org` on GitHub Pages.

The prototypes are marked `noindex`, so search engines won't list them while we decide.
