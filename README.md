# Hexstitch (Website 5: Car Seat Covers & Interior Customization)

Static front end (HTML, CSS, vanilla JS). Dashboard: **No** (no login, sign-up or dashboard pages). Open `index.html` directly; no server needed.

## Pages
Home 1 (`index.html`), Home 2 (`home-2.html`), About, Products (`products.html?car=hyundai-creta-2024`) + 11 product pages (`product-<slug>.html`),
Gallery + 8 project pages (`gallery-<slug>.html`), Get a free quote (`quote.html`, the quotation request wizard), Warranty, Contact, Blog + 7 articles,
Privacy, Terms, 404. Global: car selector, callback modal, swatch request, cookie banner, WhatsApp widget.

## Structure
- `src/pages/*.html` page sources (front matter + body), `src/partials/` (head, header, header-quote, footer, logo, globals, swatch-modal), `src/templates/` (product, project)
- `data/cars.json`, `data/products.json`, `data/projects.json` -> generated `data/site-data.js` (`window.HX_DATA`)
- `css/site.css` design system, `css/pages/*.css`; `js/site.js` shared behaviour + `window.HX` API, `js/validation.js`, `js/pages/*.js`
- `images/` WebP photos; `images/ASSIGNMENT.md` lists the page that owns each photo
- `COMPONENTS.md`: classes, macros, front matter, data and JS APIs

## Build
```bash
python3 scripts/build.py      # regenerates every root *.html (incl. product-*.html and gallery-*.html) from src/ + data/
```
Never edit generated root `*.html` files by hand.

## Tests
```bash
bash tests/run-tests.sh            # build + validator unit tests + full-site QA (Playwright)
bash tests/run-tests.sh --quick
node tests/qa.cjs . --pages index.html
```
`tests/validation.test.js` covers name / email / 10-digit mobile / PIN / date rules. `tests/qa.cjs` checks the client checklist on every page:
one h1, logo -> home, nav order (Home, About, Products, Gallery, Blog, Contact), CTA -> quote.html, no login/dashboard, theme/RTL/CTA once and equal size,
footer icons/socials/Privacy/Terms, only the navbar sticky, hero overlay and max 2 CTAs, equal inner-hero heights, level card rows, no image reuse,
blog covers/authors unique, form validation, contact map + FAQ, RTL plaintext, contrast in light and dark, no horizontal scroll 360-1440px.
