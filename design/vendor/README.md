# Vendored libraries

These are copied into the repo instead of being loaded from a CDN, so the prototypes work offline and don't depend on outside services.

| File | Library | Version | License |
|------|---------|---------|---------|
| `three.module.min.js` | [three.js](https://threejs.org), plus `RoomEnvironment` and `RoundedBoxGeometry` from the addons, bundled with esbuild | 0.186.1 | MIT |
| `gsap.min.js`, `ScrollTrigger.min.js`, `Flip.min.js` | [GSAP](https://gsap.com) | 3.15.0 | GSAP Standard "no charge" license |
| `matter.min.js` | [Matter.js](https://brm.io/matter-js/) | 0.20.0 | MIT |

To rebuild three.js:

```sh
npm i three esbuild
printf "export * from 'three';\nexport { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';\nexport { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';\n" > entry.js
npx esbuild entry.js --bundle --format=esm --minify --legal-comments=eof --outfile=three.module.min.js
```
