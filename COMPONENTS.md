# Hexstitch: component and build guide (for page builders)

Class names in `css/site.css` are FROZEN: add new classes in `css/pages/<page>.css`, never rename shared ones.
Edit only `src/pages/<page>.html`, `css/pages/<page>.css`, `js/pages/<page>.js` (and data/*.json if your page owns that data).
Then run `python3 scripts/build.py` (regenerates every root `*.html`; never hand-edit them) and
`node tests/qa.cjs . --pages <page>.html` until it prints `PASS`.

## 1. Build system
`src/pages/<name>.html` = front matter + body. Layout: head, header, `<main id="main">`, optional `.page-hero`, body, footer, global components.

| key | meaning |
|---|---|
| `nav` | active nav item: `home1`, `home2`, `about`, `products`, `gallery`, `blog`, `contact` (empty = none) |
| `title`, `description` | `<title>` and meta description |
| `hero`, `hero_alt`, `h1`, `lead`, `eyebrow`, `crumbs` | inner photo hero (`.page-hero`, fixed height, same on every page). `crumbs: Blog=blog.html|Article title` (last item = current) |
| `preload` | preload a hero image slot when the page draws its own hero (index, home-2) |
| `css`, `js` | page asset names (default = page name). blog posts share `blog-post` |
| `header: quote` / `footer: none` | stripped wizard header (quote.html only) / no footer |
| `body_class` | class on `<body>` |

Placeholders: `{{icon NAME SIZE}}`, `{{stars 4.8}}`, `{{img SLOT | alt | 800|1600|160 | eager}}` (width/height + lazy; portraits team-/testi-/author- are square),
`{{pic SLOT | alt | sizes}}` (srcset 800/1600 [+2000 for hero-*]), `{{product_cards all|slug,slug}}`, `{{mini_products slug,slug}}`,
`{{project_cards all|slug,...}}`, `{{> partial}}` (e.g. `{{> swatch-modal}}`).
Icons: arrow, arrow-left, chev, close, check, phone, mail, pin, clock, search, star, shield, calendar, car, zoom, plus, minus, sun, moon, rtl, menu,
whatsapp, instagram, facebook, youtube, linkedin, swatch, thread, tool, drop, spark, info. `arrow`/`arrow-left` get `.flip` (mirror in RTL).

Generated pages (no src file): `product-<slug>.html` x11 from `data/products.json` + `src/templates/product.html`;
`gallery-<slug>.html` x8 from `data/projects.json` + `src/templates/project.html`. Template-only macros: `pd_gallery, pd_buy, pd_features, pd_specs,
pd_list includes|care, pd_reviews, pd_cross` and `pj_photos, pj_specs, pj_tags, pj_more`; fields `{{p.name}}`, `{{p.price}}` (formatted ₹), `{{x.title}}`, `{{x.packagePrice}}`.

## 2. Data (window.HX_DATA, built into data/site-data.js)
- `data/cars.json` -> `HX.data.cars` = brands `[{slug,name,modelCount,models:[{slug,name,body,seats,pattern,years[],note}]}]`. Car slug = `brand-model-year`
  (`hyundai-creta-2024`, `maruti-swift-2022`). `pattern:false` = no template on file (e.g. `jeep-meridian-2025`, `tata-curvv-2025`).
- `data/products.json` -> `HX.data.products` (11): `slug, page, name, short, category (seat-covers|steering|floor-mats|accessories), categoryLabel, materials[] (nappa|perforated|microsuede|fabric), materialLabel,
  pattern (diamond|honeycomb|channel|plain), price, rating, reviews, badge, colours[{key,name,hex}], threads[], coverage[{label,sub,price}], ready, readySub, summary, details, features, specs, includes, care, histogram, reviewList, cross[], images[3], alts[3], fitsAny`.
  `HX.data.categories / materials / patterns` = label maps (filter sidebar counts: compute from products).
- `data/projects.json` -> `HX.data.projects` (8): `n, slug, page, title, car, carShort, body (hatchback|sedan|suv|mpv), bodyLabel, material, materialLabel, package, packagePrice, time, timeShort, location, scope, summary, brief, did, specs, quote, owner, ownerCar, product, images[3], alts[3]`. Project 1 = "Project of the month". `HX.data.bodies` = labels.

## 3. Global JS API (`window.HX`, js/site.js)
- `HX.toast(msg, 'ok'|'error'|'info')`; `HX.openModal(idOrEl, opener)`, `HX.closeModal(idOrEl)`; events `modal:open` / `modal:close` on the `.modal`.
- `HX.fmtPrice(8900)` -> `₹8,900`; `HX.esc(str)`; `HX.store(k,v)` / `HX.read(k)` (localStorage, safe).
- Car: `HX.getCar()` -> `{slug, brand, brandSlug, model, modelSlug, year, body, seats, pattern, label:'Hyundai Creta 2024', short:'Creta 2024'}` or null;
  `HX.setCar(car)`; `HX.findCar(slug)`; `HX.carLabel()`; `HX.productCountFor(car)`; `HX.openCarSelector({redirect:false, onSelect(car){}})`.
  Event `car:change` on document (detail = car). Any `[data-car-label]` element shows the saved car (`data-car-label="short"` for "Creta 2024"); its original text is the fallback.
- Triggers: `[data-car-open]` opens the selector (redirects to `products.html?car=slug`); add `data-car-stay` to stay on the page.
  `[data-callback]` or `data-modal-open="callbackModal"` opens the callback modal (form -> done state + toast). `data-modal-open="swatchModal"` (include `{{> swatch-modal}}` once on the page).
  `[data-modal-open="id"]`, `[data-modal-close]` generic; `[data-toast="text"]` shows a toast on click. `HX.showCookieBanner()` reopens cookie settings.
- Fit bar: `<form data-fit-bar data-validate data-no-reset novalidate>` with `select[data-fit-brand]`, `[data-fit-model]`, `[data-fit-year]` (see index).
- WhatsApp widget is global; on a page add `<div hidden data-wa-context="Diamond Quilt Seat Covers"></div>` to personalise its greeting.
- Validation (js/validation.js): every `form[data-validate][novalidate]` is wired. Rules by name/type: `name` (2+ letters, no digits), `email` (lower-cased on blur),
  `phone`/`mobile`/type=tel (digits only, exactly 10, starts 6-9), `pin` (6 digits), type=date (today or later), `required`. `data-rule="name"` forces a rule.
  Inline errors appear in `.field` (`.field-error`). On success it fires `form:success` and resets unless `data-no-reset`. Use `<div class="error-summary">` yourself for the quote summary banner (PDF 26).
- Tabs: `[data-tabs]` > `.tablist[role=tablist]` > `button.tab[role=tab][aria-controls]` + `.tab-panel[role=tabpanel]`.
- Filter chips: `<div class="chips" data-filter-group="#grid" data-filter-count="#count">` with `button.chip[data-filter="all|key"][aria-pressed]`; items carry `data-group="key key2"`.
  (Products/gallery with several filters: write your own filtering in js/pages; cards already carry `data-category data-materials data-pattern data-price data-rating` / `data-body data-material`.)
- Carousel: `[data-carousel]` > `.quote-track` > `.quote-slide` (+ `[data-carousel-prev|next]`, `[data-carousel-count]`, `[data-carousel-live]`).
- Lightbox: `<div data-lightbox>` with `<a href="images/x-1600.webp" data-caption="..."><img></a>`; shows "2 of 3", arrows, Esc.
- Accordion: `<details class="faq-item"><summary>Q</summary><div class="faq-answer"><p>A</p></div></details>` inside `.faq > .faq-list` (centred, 820px).
- Motion: automatic (reveal + stagger on cards/sections, hero fade-up, count-up on `.stat strong` / `[data-count]`); off for reduced motion and webdriver. `[data-no-reveal]` opts out.

## 4. Layout and components (css/site.css)
- `.container` (1240px), `.container-narrow` (860px); `.section`, `.section--tight`, `.section--flush-top`, `.section--white`, `.section--dark` (navy + quilt lines; headings white, eyebrow amber).
- Headings: `.section-head` (h2 left + `.link` right), `.intro` / `.intro--center`, `.eyebrow`, `.lead`, `.h2-sm`, `.h3`, `.h-narrow` (13ch).
- Buttons: `.btn` + `.btn-primary` (amber, the CTA), `.btn-dark`, `.btn-secondary` (white outline), `.btn-ghost-light` (outline on dark/photo), `.btn-wa`; sizes `.btn-lg`, `.btn-sm`, `.btn-block`. Text links `.link` (+ `{{icon arrow 16}}`), `.linklike`, `.link-amber`.
- Heroes: Home 1 `.hero.hero--home` (fit bar overlaps with `.fit-bar-wrap`); Home 2 `.hero-inset-wrap > .hero.hero--inset` (rounded inset card);
  inner pages use front matter (`.page-hero`, 500/440/400px); app-like pages start with `<section class="title-band">` (crumbs + h1 on light bg: products, quote, legal, blog posts, details);
  404 `.hero.hero--404` + `.nf-code`. Every hero: `img.hero-bg` + `.hero-shade` (light navy veil + quilt), `.hero-content`, `.hero-pill`, `.hero-ctas` (max 2).
- Grids: `.grid-2/3/4` (4 -> 2 at 1024 -> 1 at 767), `.split` + `.split-media`, `.level` on a grid = subgrid rows (set `--rows` = children per card).
- Cards: `.card` (+`.card--hover`), `.card-media`, `.icon-tile`, `.dark-card`, `.stat` in `.stat-grid`, `.photo-card`, `.mosaic` + `.mosaic-card(--lg|--wide)` + `.mosaic-body` + `.round-arrow`.
- `.steps-line` (amber numbered steps, dashed connector; `.step-num`, `.tag-dark`), `.table-wrap > table.compare-table` (`.finish-cell`, `.breath`, `.price-cell`).
- Testimonials: `.testi-split`, `.testi-photo`, `.rating-pill`, `.quotes` carousel, `.person` (img 52px), `.testimonial` card (grid; put an `<img class="t-photo">` in each). Product reviews: `.review.card` + `.avatar` initials.
- `.cta-band` (dark rounded CTA; `.cta-band--center`). Badges `.badge` + `--amber|--dark|--light|--green|--outline`; `.tag-list`; `.stars`; `.checklist` (li with `{{icon check 18}}`).
- Chips: `.chips` / `.chip-row`, `button.chip[aria-pressed]`, radio chips `label.chip.chip--radio > input + span`. Tabs `.tablist .tab`. `.faq`. `.spec-table`. `.timeline > li > .tl-year + .tl-body` (centred vertical, alternating).
- Products: `.product-grid` (3 -> 2 -> 1, subgrid rows: media, meta, title, price row, dots) of `.product-card` (`.pc-media`, `.pc-badge`, `.pc-quick[data-quickview=slug]`, `.pc-meta`, `.pc-title`, `.pc-row`, `.dots`); `.custom-card` (dashed "Want something custom?");
  `.mini-grid > .mini-card` (cross-sell / "These still fit"). Detail: `.pd-layout`, `.pd-gallery`, `.pd-buy`, `.opt-list > label.opt-card` (radio cards with `.opt-dot`, `.opt-body`, `.opt-price`), `.swatch-row > label.swatch[style="--c:#hex"]`, `.pd-info`, `.fit-note(.is-warn)`, `.feature-mini`, `.reviews-wrap`, `.histogram`.
- Gallery: `.project-grid > .project-card` (`.pj-media`, `.pj-tag`, `.pj-head`, `.pj-title`, `.pj-loc`, `.pj-scope`; `.project-card--tall` for a taller photo), `.feature-project` (+`.fp-body`, `.fp-facts`), `.pj-photos`, `.more-grid`, `.owner-quote`, `.look-card`.
- Forms: `.form-stack`, `.form-grid` (+`.span-2`), `.field` (label + input + `.hint`), `.input-prefix` (+91), `.check-field`, `.switch` (checkbox toggle), `.search-field`, `.select-box` (label inside a box, Home fit bar), `.form-note`, `.form-success`, `.error-summary`.
- Modals: `<div class="modal" id="x" hidden><div class="modal-backdrop" data-modal-close></div><div class="modal-dialog [modal-dialog--sm|--md|--lg]" role="dialog" aria-modal="true" aria-labelledby="..." tabindex="-1">`
  `.modal-head` (eyebrow + `.modal-title` + `.modal-x`), `.modal-body`, `.modal-foot`, `.step-bars`, `.done-state` + `.done-icon`. Bottom sheet on mobile: add `.modal--car` style or your own in page css.
- Legal: `.legal-layout` (`.toc` NOT sticky + `.prose`). Articles: `.prose` (h2, ul, blockquote).
- Blog: `.blog-grid` (3 -> 2 -> 1) of `article.blog-card`: `img.blog-cover`, `.blog-card-body` (chip/badge + h3 > a[href=blog-post-N.html]), `p.excerpt`, `.byline` (`img.author-photo` + `.author-name` + small).

## 5. Rules the QA checks (tests/qa.cjs)
One h1; logo links index.html; nav Home/About/Products/Gallery/Blog/Contact; CTA `quote.html`; no login/dashboard; theme/RTL/CTA shown once (CTA inside the menu below 640px);
only the navbar sticky (cookie banner, WhatsApp widget, toasts, modals, `.estimate-bar` excepted); first block in main = hero / page-hero / hero-inset-wrap / title-band;
hero `.hero-shade` and <= 2 `.btn`; inner `.page-hero` heights equal; card rows level (put `data-align-free` on bento/masonry grids only); no image reuse
(product photos: products.html, product pages, quote.html; project photos: gallery.html + gallery-*.html; blog-N/author-N: blog.html + blog-post-N.html);
testimonials need photos; forms `data-validate novalidate`, name/email/phone behaviour; contact needs a map iframe, `.faq`, `id="message"` and `id="faq"`;
blog: 6+ cards each to its own post, unique covers/authors, no pagination; RTL plaintext; contrast light + dark; no horizontal scroll 360-1440.
Decorative glyphs (dots, stars) that are not text: `aria-hidden="true"` on the inner spans and a `role="img" aria-label` on the wrapper.

## 6. Photo slots
See `images/ASSIGNMENT.md` (which page owns each photo). Never reuse a photo on another page.
