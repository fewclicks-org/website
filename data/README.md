# Site data: edit these files to change the website

Every page reads its content from the JSON files in this folder. To change the site, you edit the JSON and push. You don't need to touch any code.

| File | What it controls |
|------|------------------|
| `games.json` | All games and game categories. Drives the home page "featured" section, the Games page and each game's detail page. |
| `news.json` | News / devlog posts, newest first. |
| `team.json` | Team members in the About section. |
| `studio.json` | Studio name, tagline, contact email, optional postal address, stats, values and social links. |

> Tip: open `games.json` in VS Code. It is linked to `games.schema.json`, so you get autocomplete and red squiggles when a field is wrong.

## Add a new game

1. Make a folder `assets/games/<your-game-id>/` and put the images in it: a square **icon**, a 16:9 **cover** (1200×675 works well) and any **screenshots**, which can be portrait or landscape. PNG, JPG, WebP and SVG all work.
2. Copy an existing game block in `games.json` and change the values.
3. Commit and push. The game appears on the Games page, and at `game.html?id=<your-game-id>`.

### Game fields

| Field | Example | Notes |
|-------|---------|-------|
| `id` | `"rocket-tap"` | Unique, lowercase, dashes only. Used in the page URL. |
| `title` / `tagline` | `"Rocket Tap"` / `"One tap. One rocket."` | |
| `status` | `"released"`, `"coming-soon"`, `"in-development"` | Shows a badge. |
| `featured` | `true` | Featured games appear on the home page. |
| `order` | `1` | Lower numbers come first. |
| `categories` | `["arcade", "casual"]` | Ids from the `categories` list at the top of the file. Add new categories there. |
| `platforms` | `["ios", "android", "steam", "switch", "playstation", "xbox", "web"]` | Also `itch`, `epic`, `mac`, `windows`. |
| `releaseDate` | `"2026-06-02"` | `YYYY-MM-DD`, `YYYY-MM` or `YYYY`. |
| `price`, `ageRating`, `players`, `playTime` | `"Free"`, `"Everyone"`, `"1–4"`, `"3 min"` | Free text, shown in the info table. |
| `languages` | `["English", "Japanese"]` | |
| `theme.primary` / `theme.secondary` | `"#ff8a3d"` | Colors used to tint the game's page and cards. |
| `media.icon` / `media.cover` / `media.hero` | `"assets/games/rocket-tap/cover.png"` | Paths are relative to the site root. Full `https://` URLs also work. `hero` is optional. |
| `media.screenshots` | `["assets/.../1.png", "..."]` | |
| `media.trailer` | `{ "type": "youtube", "id": "dQw4w9WgXcQ" }` or `{ "type": "video", "src": "assets/.../trailer.mp4", "poster": "..." }` | Leave `id`/`src` empty to show "Trailer coming soon". |
| `description.short` | `"One sentence."` | Used on cards. |
| `description.long` | `["Paragraph 1", "Paragraph 2"]` | Used on the game page. |
| `features` | `["40+ rockets", "Daily challenge"]` | Bullet list. |
| `stores` | `[{ "platform": "ios", "url": "https://apps.apple.com/..." }]` | Use `"#"` until the store page is live. Optional `label`, e.g. `"Wishlist on Steam"`. |
| `reviews` | `[{ "source": "Player review", "author": "@name", "quote": "...", "score": 5, "max": 5, "url": "" }]` | Press quotes or player reviews. |
| `rating` | `{ "average": 4.6, "count": 8421 }` | Store rating. `count: 0` hides it. |
| `seo` | `{ "title": "...", "description": "...", "keywords": [], "ogImage": "..." }` | Search engine and social sharing text. For `ogImage`, PNG/JPG at 1200×630 is best. |

## Placeholder content

All current games, reviews, team members and numbers are **placeholders** for the prototypes. Replace them with the real thing before launch.
