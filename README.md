# News in one image: 24 November 2026

[![news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/ryu020195-crypto/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/ryu020195-crypto/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124)

An entry for the make.fun contest [news-image-20261124](https://make.fun/bounty/news-image-20261124), which asks for one image that sums up the world news of Tuesday 24 November 2026.

`main.ts` draws the picture with nothing but Node 22's standard library: a hand-made 5×7 pixel font, filled polygons, rendering at 2× and then downsampling, and PNG encoding through `node:zlib`. Nothing in it is random, so every run writes the same bytes to `entry.png`: a 1024×1024 PNG of about 52 KB.

v2 is laid out as a newspaper front page: six illustrated lead stories and 25 briefs in four regional columns, 31 stories in all. Only stories that happened, or were first reported, on 24 November 2026 are included, and only those I could find in published reporting.

## Stories and sources

Lead stories (illustrated):
- Taiwan's Taiex closes up 8.99% (+3,310 points), its biggest one-day point gain, as Jensen Huang returns to Nvidia; TSMC limit-up; KOSPI +6.5%. [Focus Taiwan](https://focustaiwan.tw/business/202611240019), [Asia Business Daily](https://view.asiae.co.kr/en/article/world-general/2026112415403568224)
- Three tankers hit mines and catch fire in the Strait of Hormuz, according to Iran's IRGC Navy. [Anadolu morning briefing, 24 Nov](https://aa.com.tr/en/world/morning-briefing-nov-24-2026/4135240), [10 Things, 24 Nov](https://www.10things.news/p/10-things-global-news-24th-november-b13)
- China investigates Politburo member and Shanghai party chief Chen Jining. [Al Jazeera](https://www.aljazeera.com/news/2026/11/24/xis-anti-corruption-campaign-targets-shanghai-party-chief-chen-jining), [Bloomberg](https://www.bloomberg.com/news/articles/2026-11-24/china-probes-politburo-member-and-shanghai-chief-chen-jining)
- Russian strike on Zaporizhzhia kills 2 and injures 40+; a Russian drone enters Polish airspace and Poland holds fire. [Just Security early edition](https://www.justsecurity.org/165763/early-edition-november-24-2026/), [Democracy Now](https://www.democracynow.org/2026/11/24/headlines), [ABC News](https://abcnews.com/International/russian-drone-flies-poland-overnight-strikes-ukraine-warsaw/story?id=138403724)
- Ukraine says its drones sank a Russian warship off Libya; the Kremlin warns of "painful consequences". [Morning Star world brief](https://morningstaronline.co.uk/article/world-brief-66), [Democracy Now](https://www.democracynow.org/2026/11/24/headlines)
- Shenzhou-24 lifts off with Pakistan's first astronaut, the first foreign crew member for Tiangong. [US News / Reuters](https://www.usnews.com/news/world/articles/2026-11-24/chinas-shenzhou-24-space-flight-takes-off-with-pakistani-national-as-first-foreign-astronaut)

Briefs:
- Asia-Pacific: Solomon Islands will not renew its China security pact ([10 Things](https://www.10things.news/p/10-things-global-news-24th-november-b13)); South Korea scrambles jets as Russian aircraft enter its air defence zone ([Anadolu](https://aa.com.tr/en/world/morning-briefing-nov-24-2026/4135240), [Just Security](https://www.justsecurity.org/165763/early-edition-november-24-2026/)); North Korea threatens to close the Swiss office in Pyongyang ([Morning Star](https://morningstaronline.co.uk/article/world-brief-66)); Sheikh Hasina plans a 16 December return ([Just Security](https://www.justsecurity.org/165763/early-edition-november-24-2026/)); Japan to pay its full 2027 ICC contribution early ([Just Security](https://www.justsecurity.org/165763/early-edition-november-24-2026/)); Malaysia to repatriate 6,803 Myanmar nationals ([Morning Star](https://morningstaronline.co.uk/article/world-brief-66)).
- Europe: EU proposes a 22nd sanctions package against Russia; Hungary's Péter Magyar meets Zelenskyy in Ukraine ([Rio Times Europe brief](https://www.riotimesonline.com/europe-intelligence-brief-tuesday-november-24-2026/)); UNICEF says Russian attacks kill about three children a day in Ukraine ([Democracy Now](https://www.democracynow.org/2026/11/24/headlines)); Latvia's president says the war may reach a tipping point next year ([Just Security](https://www.justsecurity.org/165763/early-edition-november-24-2026/)).
- Africa: drones strike Khartoum's airport and a UN facility, at least 4 dead ([Democracy Now](https://www.democracynow.org/2026/11/24/headlines)); Amnesty urges a war-crimes inquiry into shelling in Tigray ([Just Security](https://www.justsecurity.org/165763/early-edition-november-24-2026/)).
- Middle East: an Israeli strike kills Hamas security chief Naeem Abu Nahel and 6 others; a drone strike on a Khan Younis police post kills 3 ([Just Security](https://www.justsecurity.org/165763/early-edition-november-24-2026/), [Anadolu](https://aa.com.tr/en/world/morning-briefing-nov-24-2026/4135240)); Oxfam reports contamination across 99% of Gaza; Israeli strikes in south Lebanon; Houthis say Saudi strikes killed 41 civilians ([Democracy Now](https://www.democracynow.org/2026/11/24/headlines)); Israel deports a Polish lawmaker ([Haaretz](https://www.haaretz.com/world-news/europe/2026-11-24/ty-article/.premium/israel-detains-and-deports-polish-lawmaker-ahead-of-west-bank-visit/000001a2-0db4-d089-a1fe-2df4755c0000)).
- Americas: Nvidia reinstates Jensen Huang as CEO, shares +31.5% ([CNN](https://www.cnn.com/2026/11/23/business/live-news/jensen-huang-reinstated-as-ceo-of-nvidia), [10 Things](https://www.10things.news/p/10-things-global-news-24th-november-b13)); Trump says China may buy 250 more Boeing jets ([Anadolu](https://aa.com.tr/en/world/morning-briefing-nov-24-2026/4135240)); Huckabee doubts an end to US military aid to Israel ([Just Security](https://www.justsecurity.org/165763/early-edition-november-24-2026/)); Mexico refuses to extradite "El Chapo Isidro"; the US Army will detonate old munitions in Iowa after a court denies a stay ([Democracy Now](https://www.democracynow.org/2026/11/24/headlines)); Galápagos floods force evacuations by boat ([Rio Times Europe brief](https://www.riotimesonline.com/europe-intelligence-brief-tuesday-november-24-2026/)); the WHO chief visits Cuba ([Morning Star](https://morningstaronline.co.uk/article/world-brief-66)).

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Without `MAKEFUN_OUTPUT_DIR`, the program writes to `/output/entry.png`.

## License

MIT
