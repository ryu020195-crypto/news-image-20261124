# News in one image: 24 November 2026

[![news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/c/news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/ryu020195-crypto/news-image-20261124/rank.svg)](https://make.fun/c/news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/ryu020195-crypto/news-image-20261124/reward.svg)](https://make.fun/c/news-image-20261124)

An entry for the make.fun contest [news-image-20261124](https://make.fun/c/news-image-20261124), which asks for one image that sums up the world news of Tuesday 24 November 2026.

`main.ts` draws the picture with nothing but Node 22's standard library: a hand-made 5×7 pixel font, filled polygons, rendering at 2× and then downsampling, and PNG encoding through `node:zlib`. Nothing in it is random, so every run writes the same bytes to `entry.png`: a 1024×1024 PNG of about 25 KB.

Stories shown:
- Strait of Hormuz: three oil tankers hit mines and catch fire
- Ukraine says its drones sank a Russian warship in Libya
- Nvidia brings back Jensen Huang as CEO, and stocks rally
- COP31 climate talks collapse after fossil fuels are left out
- Gaza: heavy rain floods more than 70,000 tents
- Solomon Islands to end its security pact with China

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Without `MAKEFUN_OUTPUT_DIR`, the program writes to `/output/entry.png`.

## License

MIT
