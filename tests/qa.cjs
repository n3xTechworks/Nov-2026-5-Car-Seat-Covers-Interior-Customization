/**
 * Site QA for Website 5 (Hexstitch: car seat covers & cabin interiors; no dashboard, no auth).
 * Usage: node tests/qa.cjs <siteDir> [--quick] [--pages a.html,b.html] [--no-clicks]
 * Turns the client checklist and the round-1 feedback list into checks. Exit code 1 if anything fails.
 *
 * Conventions:
 *   header: #siteHeader; theme [data-theme-toggle]; RTL [data-dir-toggle]; navbar CTA [data-nav-cta] -> quote.html.
 *     Below 640px the CTA lives in the mobile menu ([data-mobile-menu] [data-nav-cta]); theme/RTL stay in the bar.
 *   quote.html is a 'flow' page: stripped header (logo, theme, RTL, call me back, save & exit), no nav, no footer.
 *   testimonials: .quote-slide (carousel) or .testimonial, each with a photo. Product reviews (.review) use initials.
 *   logo link: a.brand (href index.html)   forms: form[data-validate] novalidate with inputs named name/email/phone
 *   blog cards: .blog-card with .author-name, img.author-photo, img.blog-cover; articles: .author-name + img.author-photo + cover img
 *   fixed widgets allowed: .cookie-banner, .wa-widget, .toast-region, .modal, .lightbox, .estimate-bar (quote wizard, mobile)
 *   photos: one page each, except blog-N/author-N (blog.html + blog-post-N.html), product-<key>-N (products.html, any product-*.html, quote.html)
 *   and project-N-x (gallery.html + any gallery-*.html).
 */
const path = require('path');
const fs = require('fs');
// Playwright: set PLAYWRIGHT_PATH to a local install, otherwise the normal 'playwright' package is used
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const args = process.argv.slice(2);
const SITE = path.resolve(args.find(a => !a.startsWith('--')) || '.');
const QUICK = args.includes('--quick');
const NOCLICK = args.includes('--no-clicks');
const pi = args.indexOf('--pages');
const ONLY = pi > -1 ? args.slice(pi + 1).join(',').split(/[,\s]+/).filter(x => x && !x.startsWith('--')) : null;

const PRODUCT_PAGES = JSON.parse(fs.readFileSync(path.join(SITE, 'data/products.json'), 'utf8')).products.map(p => p.page);
const PROJECT_PAGES = JSON.parse(fs.readFileSync(path.join(SITE, 'data/projects.json'), 'utf8')).projects.map(p => p.page);
const PUBLIC = ['index.html', 'home-2.html', 'about.html', 'products.html', ...PRODUCT_PAGES, 'gallery.html', ...PROJECT_PAGES, 'warranty.html', 'blog.html',
  ...[1, 2, 3, 4, 5, 6, 7].map(i => `blog-post-${i}.html`), 'contact.html', 'privacy.html', 'terms.html', '404.html'];
const FLOW = ['quote.html'];
const AUTH = [];
const APP = [];
const FORBIDDEN = ['login.html', 'signup.html', 'dashboard.html'];
const ALL = [...PUBLIC, ...FLOW];
const PAGES = ONLY ? ALL.filter(p => ONLY.includes(p)) : ALL;
const HERO_PAGES = ['about.html', 'products.html', 'gallery.html', 'warranty.html', 'blog.html', 'contact.html'];
const NAV = ['Home', 'About', 'Products', 'Gallery', 'Blog', 'Contact'];
const WIDTHS = QUICK ? [360, 768, 1024, 1440] : [360, 390, 768, 900, 1024, 1180, 1280, 1440];
// every photo lives on ONE page. Exceptions: blog-N + author-N (blog.html + blog-post-N.html);
// product photos (products.html, product detail/cross-sell pages, quote summary); project photos (gallery.html + gallery-*.html)
const IMG_EXEMPT = [];
const IMG_PAIR = k => {
  let m = k.match(/^(blog|author)-(\d)$/); if (m) return ['blog.html', `blog-post-${m[2]}.html`];
  if (/^product-[\w-]+-\d$/.test(k)) return ['products.html', 'quote.html', ...PRODUCT_PAGES];
  if (/^project-\d-[abc]$/.test(k)) return ['gallery.html', ...PROJECT_PAGES];
  return null;
};
const fails = [];
const warn = [];
const fail = (page, msg) => fails.push(`${page}: ${msg}`);
const kind = p => AUTH.includes(p) ? 'auth' : APP.includes(p) ? 'app' : FLOW.includes(p) ? 'flow' : 'public';

(async () => {
  for (const p of PAGES) if (!fs.existsSync(path.join(SITE, p))) fail(p, 'page missing');
  if (!fs.existsSync(path.join(SITE, 'favicon.svg'))) fail('site', 'favicon.svg missing');
  for (const f of FORBIDDEN) if (fs.existsSync(path.join(SITE, f))) fail('site', `${f} exists but this site has no dashboard/login (Dashboard: No)`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const imageUse = new Map();
  const blogCards = [];
  const articles = [];
  const heroH = {}; // width -> {page: height}
  const heroSrc = {};

  for (const page of PAGES) {
    if (!fs.existsSync(path.join(SITE, page))) continue;
    const K = kind(page);
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET|ERR_NAME|fonts\.g/.test(m.text())) errors.push(m.text()); });
    p.on('requestfailed', r => { if (r.url().startsWith('file:')) errors.push('missing file ' + r.url()); });
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.goto('file://' + path.join(SITE, page), { waitUntil: 'load' });
    await p.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important} html{scroll-behavior:auto!important}' });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 20)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(400);

    // ---------- static structure ----------
    const s = await p.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const h1 = document.querySelectorAll('h1').length;
      const brand = [...document.querySelectorAll('a.brand')].map(a => a.getAttribute('href'));
      const navLinks = [...document.querySelectorAll('#siteHeader nav a, #siteHeader nav button')].filter(vis).map(a => a.textContent.trim().replace(/\s+/g, ' '));
      const cta = [...document.querySelectorAll('[data-nav-cta]')].map(a => a.getAttribute('href'));
      const login = [...document.querySelectorAll('[data-nav-login]')].map(a => a.getAttribute('href'));
      const imgs = [...document.images].map(i => ({ src: i.getAttribute('src'), alt: i.getAttribute('alt'), ok: i.complete && i.naturalWidth > 0, wh: i.hasAttribute('width') && i.hasAttribute('height'), lazy: i.loading }));
      const links = [...document.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 30) }));
      const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
      const cards = [...document.querySelectorAll('.blog-card')].map(c => ({ name: (c.querySelector('.author-name') || {}).textContent?.trim(), photo: c.querySelector('img.author-photo')?.getAttribute('src'), cover: c.querySelector('img.blog-cover')?.getAttribute('src'), href: c.querySelector('a[href^="blog-post-"]')?.getAttribute('href') }));
      const article = { name: (document.querySelector('.author-name') || {}).textContent?.trim(), photo: document.querySelector('img.author-photo')?.getAttribute('src'), cover: document.querySelector('main img:not(.author-photo):not(.t-photo)')?.getAttribute('src'), words: (document.querySelector('main')?.innerText || '').split(/\s+/).length };
      const testimonials = [...document.querySelectorAll('.testimonial, .quote-slide')].map(t => !!t.querySelector('img'));
      const authLinks = [...document.querySelectorAll('a[href]')].filter(a => /login|signup|sign-up|dashboard/i.test(a.getAttribute('href')) || /^(log ?in|sign ?up|dashboard)$/i.test(a.textContent.trim())).length;
      const forms = [...document.querySelectorAll('form')].map(f => ({ validate: f.hasAttribute('data-validate'), novalidate: f.noValidate, fields: [...f.elements].map(e => e.name).filter(Boolean) }));
      const headings = [...document.querySelectorAll('h1, h2')].filter(vis).map(h => { const rg = document.createRange(); rg.selectNodeContents(h); const rects = [...rg.getClientRects()].filter(r => r.width > 1); const lines = {}; rects.forEach(r => { const k = Math.round(r.top); lines[k] = (lines[k] || 0) + r.width; }); const ws = Object.values(lines); return { text: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 60), lines: ws.length, last: ws[ws.length - 1], max: Math.max(...ws), words: h.textContent.trim().split(/\s+/).length }; });
      const footer = { has: !!document.querySelector('footer.site-footer'), icons: document.querySelectorAll('.f-contact svg').length, social: document.querySelectorAll('.social a').length, privacy: !!document.querySelector('footer a[href="privacy.html"]'), terms: !!document.querySelector('footer a[href="terms.html"]') };
      const hero = document.querySelector('.page-hero, .hero');
      const heroInfo = hero ? { cls: hero.className, img: hero.querySelector('img')?.getAttribute('src'), ctas: hero.querySelectorAll('.btn').length, shade: !!hero.querySelector('.hero-shade') } : null;
      const sticky = [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); return (cs.position === 'sticky' || cs.position === 'fixed') && vis(e) && !e.closest('#siteHeader, .modal, .toast-region, .lightbox, .cookie-banner, .wa-widget, .estimate-bar'); }).map(e => e.tagName + '.' + e.className);
      return { h1, brand, navLinks, cta, login, imgs, links, ids, cards, article, testimonials, forms, headings, footer, heroInfo, sticky, authLinks, fitBar: !!document.querySelector('form[data-fit-bar]'), mosaic: document.querySelectorAll('.mosaic-card').length, compareRows: document.querySelectorAll('.compare-table tbody tr').length, productCards: document.querySelectorAll('.product-card').length, projectCards: document.querySelectorAll('.project-card').length, pdThumbs: document.querySelectorAll('.pd-thumb').length, pdBuy: !!document.querySelector('.pd-buy [data-pd-quote]'), pjPhotos: document.querySelectorAll('.pj-photos[data-lightbox] img').length, globals: ['carModal', 'callbackModal'].every(id => document.getElementById(id)) && !!document.querySelector('.wa-widget') && !!document.querySelector('[data-cookie]'), carousel: document.querySelectorAll('[data-carousel]').length, lightboxImgs: document.querySelectorAll('[data-lightbox] img').length, firstBlock: (document.querySelector('main') && document.querySelector('main').firstElementChild || {}).className || '', hasHeader: !!document.getElementById('siteHeader'), hasAppHeader: !!document.getElementById('appHeader'), map: !!document.querySelector('iframe[src*="map"]'), timeline: document.querySelectorAll('.timeline > li').length, faq: !!document.querySelector('#faq, [data-faq], .faq'), pagination: !!document.querySelector('.pagination'), treatments: document.querySelectorAll('.treat-tile, .service-card:not(.service-card--support)').length, services: document.querySelectorAll('.service-card').length, team: document.querySelectorAll('.team-card').length, teamChips: document.querySelectorAll('[data-filter-group] [data-filter]').length, facilities: [...document.images].filter(i => /facility-\d/.test(i.getAttribute('src') || '')).length, sidebar: document.querySelectorAll('.app-sidebar .side-link').length, sideToggle: !!document.querySelector('[data-sidebar-toggle]') };
    });
    if (s.h1 !== 1) fail(page, `expected 1 h1, found ${s.h1}`);
    if (!s.brand.length || s.brand.some(h => h !== 'index.html')) fail(page, `logo/brand must link to index.html (found ${JSON.stringify(s.brand)})`);
    if (K === 'public') {
      if (!s.hasHeader) fail(page, 'missing #siteHeader');
      if (!s.cta.length || s.cta.some(h => h !== 'quote.html')) fail(page, `navbar CTA must go to quote.html (found ${JSON.stringify(s.cta)})`);
      if (s.login.length || s.authLinks) fail(page, 'no Log in / Sign up / Dashboard links allowed (Dashboard: No)');
      if (!/\b(hero|page-hero|title-band|hero-inset-wrap)\b/.test(s.firstBlock)) fail(page, `first block in <main> must be .hero, .page-hero, .hero-inset-wrap or .title-band (the floating header overlaps it), found "${s.firstBlock}"`);
      if (!s.globals) fail(page, 'global components missing (carModal, callbackModal, .wa-widget, cookie banner)');
      const navTop = s.navLinks.map(t => t.replace(/[▾⌄]/g, '').trim()).filter(t => NAV.includes(t));
      if (navTop.join('|') !== NAV.join('|')) fail(page, `nav order should be ${NAV.join(' · ')}, found ${navTop.join(' · ')}`);
      if (!s.footer.has) fail(page, 'missing footer'); else {
        if (s.footer.icons < 3) fail(page, 'footer address/phone/email need an icon each');
        if (s.footer.social < 3) fail(page, 'footer needs social icons');
        if (!s.footer.privacy || !s.footer.terms) fail(page, 'footer needs Privacy Policy and Terms links');
      }
      if (s.sticky.length) fail(page, `only the navbar may be sticky/fixed (found ${s.sticky.slice(0, 3).join(', ')})`);
    }
    if (K === 'flow') { if (!s.hasHeader) fail(page, 'missing #siteHeader'); if (s.login.length || s.authLinks) fail(page, 'no Log in / Sign up / Dashboard links allowed'); }
    if (K === 'app') { if (!s.hasAppHeader) fail(page, 'missing #appHeader'); if (s.hasHeader) fail(page, 'dashboard pages must use the app header, not the marketing navbar'); if (s.sidebar < 8) fail(page, 'app sidebar needs Overview, Schedule, Session history, Treatment records, Billing, Profile, Back to website, Log out'); if (!s.sideToggle) fail(page, 'app header needs the sidebar drawer toggle for mobile'); }
    if (K === 'auth') { if (s.hasHeader || s.footer.has || s.hasAppHeader) fail(page, 'auth pages must have NO header/footer'); }
    s.imgs.forEach(i => {
      if (!i.ok) fail(page, `image did not load: ${i.src}`);
      if (i.alt === null) fail(page, `image without alt: ${i.src}`);
      if (!i.wh && !/\.svg$/.test(i.src || '')) fail(page, `image without width/height: ${i.src}`);
      if (!/\.svg$/.test(i.src || '')) { const k = i.src.replace(/^.*images\//, '').replace(/-(160|800|1600|2000)\.webp$/, ''); if (!IMG_EXEMPT.some(r => r.test(k))) { const pair = IMG_PAIR(k); if (pair) { if (!pair.includes(page)) fail(page, `${k} belongs only on ${pair.join(' / ')}`); } else (imageUse.get(k) || imageUse.set(k, []).get(k)).push(page); } }
    });
    s.testimonials.forEach((ok, i) => { if (!ok) fail(page, `testimonial #${i + 1} has no photo`); });
    s.forms.forEach((f, i) => { if (!f.validate || !f.novalidate) fail(page, `form #${i + 1} must have data-validate and novalidate`); });
    s.headings.forEach(h => { if (h.lines > 1 && h.words > 3 && h.last < h.max * 0.25) fail(page, `heading has an orphan last line at 1440: "${h.text}"`); });
    if (s.heroInfo && s.heroInfo.ctas > 2) fail(page, 'hero has more than 2 CTAs');
    if (s.heroInfo && !s.heroInfo.shade) fail(page, 'hero needs .hero-shade (light overlay)');
    if (s.heroInfo) heroSrc[page] = s.heroInfo.img;
    if (HERO_PAGES.includes(page) && !(s.heroInfo && /page-hero/.test(s.heroInfo.cls))) fail(page, 'inner page needs the standard .page-hero');
    if (page === 'index.html' && !(s.heroInfo && /\bhero\b/.test(s.heroInfo.cls) && !/page-hero/.test(s.heroInfo.cls))) fail(page, 'Home 1 needs the .hero home variant');
    if (page === 'index.html') { if (!s.fitBar) fail(page, 'Home 1 needs the "Find your exact fit" bar'); if (s.mosaic < 4) fail(page, 'Home 1 needs the 4-card category mosaic'); if (s.compareRows < 4) fail(page, 'Home 1 needs the 4-row finish table'); if (s.testimonials.length < 3) fail(page, 'Home 1 needs 3 testimonials (testi-1..3)'); if (s.carousel !== 1) fail(page, 'Home 1 needs exactly one testimonial carousel'); }
    if (page === 'home-2.html' && s.testimonials.length < 3) fail(page, 'Home 2 needs 3 testimonials with photos (testi-4..6)');
    if (page === 'products.html' && s.productCards < 11) fail(page, `products page needs all 11 product cards (found ${s.productCards})`);
    if (page === 'gallery.html' && s.projectCards < 8) fail(page, `gallery needs all 8 projects (found ${s.projectCards})`);
    if (PRODUCT_PAGES.includes(page) && (s.pdThumbs !== 3 || !s.pdBuy)) fail(page, 'product page needs 3 gallery thumbs and the buy box');
    if (PROJECT_PAGES.includes(page) && s.pjPhotos < 3) fail(page, 'project page needs its 3 photos in the lightbox grid');
    if (page === 'about.html' && s.timeline < 4) fail(page, 'about needs the centred vertical timeline (4+ milestones)');
    if (page === 'blog.html') {
      blogCards.push(...s.cards);
      if (s.cards.length < 6) fail(page, `expected at least 6 blog cards, found ${s.cards.length}`);
      if (s.cards.some(a => !a.name || !a.photo || !a.cover)) fail(page, 'every .blog-card needs .author-name, img.author-photo and img.blog-cover');
      if (s.cards.some(a => !a.href)) fail(page, 'every blog card must link to its own blog-post-N.html');
      const hs = s.cards.map(a => a.href).filter(Boolean); if (new Set(hs).size !== hs.length) fail(page, 'two blog cards link to the same article');
      if (s.pagination) fail(page, 'pagination shown with only 7 posts (remove it)');
    }
    if (/^blog-post-\d\.html$/.test(page)) {
      articles.push({ page, ...s.article });
      if (!s.article.name || !s.article.photo) fail(page, 'article needs an author name (.author-name) and photo (img.author-photo)');
      if (!s.article.cover) fail(page, 'article needs a cover image');
      if (s.article.words < 350) warn.push(`${page}: article body looks thin (${s.article.words} words)`);
    }
    if (page === 'contact.html') {
      if (!s.map) fail(page, 'embedded map iframe missing');
      if (!s.faq) fail(page, 'FAQ section missing (.faq)');
      if (!s.forms.length) fail(page, 'contact form missing');
      if (!s.ids.includes('message')) fail(page, 'contact needs id="message" on the Send a message section (linked from the car selector)');
    }
    if (page === 'dashboard.html' || page === 'login.html' || page === 'signup.html' || page === 'forgot-password.html') { /* structural checks done via links/forms */ }
    // internal links
    for (const { href, text } of s.links) {
      if (!href) { fail(page, `empty link "${text}"`); continue; }
      if (href === '#') { fail(page, `dead link "#" ("${text}")`); continue; }
      if (/^(https?:|mailto:|tel:|javascript:)/.test(href)) continue;
      const [file0, hash] = href.split('#');
      const file = file0.split('?')[0];
      const target = file || page;
      if (!fs.existsSync(path.join(SITE, target))) { fail(page, `broken link ${href}`); continue; }
      if (hash) {
        const html = fs.readFileSync(path.join(SITE, target), 'utf8');
        if (!new RegExp(`id=["']${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(html)) fail(page, `link ${href}: id "${hash}" not found in ${target}`);
      }
    }

    // ---------- per width / theme / direction ----------
    const combos = [];
    for (const w of WIDTHS) combos.push([w, 'light', 'ltr']);
    for (const w of [360, 1024, 1440]) { combos.push([w, 'dark', 'ltr']); combos.push([w, 'light', 'rtl']); }
    for (const [w, theme, dir] of combos) {
      await p.setViewportSize({ width: w, height: 900 });
      await p.evaluate(([t, d]) => { document.documentElement.setAttribute('data-theme', t); document.documentElement.setAttribute('dir', d); window.dispatchEvent(new Event('resize')); }, [theme, dir]);
      await p.waitForTimeout(120);
      const tag = `${w}px ${theme} ${dir}`;
      const r = await p.evaluate((kind) => {
        const vis = el => { const rc = el.getBoundingClientRect(); const cs = getComputedStyle(el); return rc.width > 0 && rc.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
        const out = {};
        out.hscroll = document.documentElement.scrollWidth - window.innerWidth;
        const sels = kind === 'public' ? ['[data-theme-toggle]', '[data-dir-toggle]', '[data-nav-cta]'] : (kind === 'app' || kind === 'flow') ? ['[data-theme-toggle]', '[data-dir-toggle]'] : [];
        out.controls = sels.map(sel => [...document.querySelectorAll(sel)].filter(vis).length);
        out.menuCta = !!document.querySelector('[data-mobile-menu] [data-nav-cta]');
        const ctl = ['[data-theme-toggle]', '[data-dir-toggle]', '[data-nav-cta]'].map(sel => [...document.querySelectorAll(sel)].find(e => vis(e) && e.closest('#siteHeader') && !e.closest('[data-mobile-menu]')));
        out.ctlDims = ctl.filter(Boolean).map(e => { const rc = e.getBoundingClientRect(); return [Math.round(rc.height), getComputedStyle(e).borderTopLeftRadius]; });
        const hero = document.querySelector('.page-hero');
        out.heroH = hero ? Math.round(hero.getBoundingClientRect().height) : null;
        // header fits on one row at desktop (no wrapped nav)
        const hi = document.querySelector('.header-inner');
        out.headerH = hi ? Math.round(hi.getBoundingClientRect().height) : null;
        // RTL: plaintext bidi on text blocks
        out.bidi = [...document.querySelectorAll('main p')].filter(vis).slice(0, 5).some(e => getComputedStyle(e).unicodeBidi !== 'plaintext');
        const bad = [];
        const leafSel = 'h2,h3,h4,p,ul,ol,dl,blockquote,.badge,.meta,.btn,a.link,time,figcaption,.price';
        const sig = el => [...el.children].map(c => c.tagName + '.' + (c.className || '').toString().split(/\s+/)[0]).join(',');
        document.querySelectorAll('main *').forEach(g => {
          if (g.hasAttribute('data-align-free')) return; // bento/masonry layouts: cards differ in height by design
          const cs = getComputedStyle(g);
          if (!(cs.display === 'grid' || (cs.display === 'flex' && cs.flexDirection === 'row' && cs.flexWrap !== 'nowrap'))) return;
          const items = [...g.children].filter(c => vis(c) && c.getBoundingClientRect().width > 140);
          if (items.length < 2 || items.length > 12) return;
          const s0 = sig(items[0]); if (!s0 || !items.every(i => sig(i) === s0)) return;
          const rows = {}; items.forEach(i => { const t = Math.round(i.getBoundingClientRect().top); (rows[t] ||= []).push(i); });
          for (const row of Object.values(rows)) {
            if (row.length < 2) continue;
            const L = row.map(i => [...i.querySelectorAll(leafSel)].filter(vis).filter(l => !l.parentElement.closest(leafSel) || l.parentElement === i).map(l => Math.round(l.getBoundingClientRect().top - i.getBoundingClientRect().top)));
            if (!L.every(x => x.length === L[0].length)) continue;
            for (let k = 0; k < L[0].length; k++) { const v = L.map(x => x[k]); if (Math.max(...v) - Math.min(...v) > 2) { const first = row[0].querySelector('h2,h3,h4'); bad.push(`row starting "${(first ? first.textContent : '').trim().slice(0, 30)}": element ${k + 1} tops ${v.join('/')}`); break; } }
          }
        });
        out.align = bad;
        // images must not be squashed: rendered aspect vs natural aspect only matters with object-fit: fill
        out.fit = [...document.images].filter(vis).filter(i => getComputedStyle(i).objectFit === 'fill' && i.naturalWidth && Math.abs((i.width / i.height) / (i.naturalWidth / i.naturalHeight) - 1) > 0.05).map(i => i.getAttribute('src')).slice(0, 3);
        const low = [];
        const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(',').map(Number); return a.length === 4 ? a : [...a, 1]; };
        const bgOf = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (c && c[3] > 0.95) return c.slice(0, 3); } const root = parse(getComputedStyle(document.body).backgroundColor); return root ? root.slice(0, 3) : [255, 255, 255]; };
        document.querySelectorAll('main p, main h1, main h2, main h3, main li, main a, main span, main label, main button, main td, main th, main dt, main dd, footer p, footer a, footer li, header a, aside a').forEach(el => {
          if (!vis(el) || !el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          if (el.closest('[aria-hidden="true"], .sr-only, .visually-hidden, [disabled], .slot.is-taken')) return;
          const bg = bgOf(el); if (!bg) return;
          const cs = getComputedStyle(el); const fg = parse(cs.color); if (!fg) return;
          const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
          const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
          const lum = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
          const fgc = fg[3] < 1 ? fg.slice(0, 3).map((x, i) => x * fg[3] + bg[i] * (1 - fg[3])) : fg.slice(0, 3);
          const [a, b] = [lum(fgc), lum(bg)].sort((x, y) => y - x); const cr = (a + 0.05) / (b + 0.05);
          if (cr < need) low.push(`"${el.textContent.trim().slice(0, 30)}" ${cr.toFixed(2)} < ${need}`);
        });
        out.contrast = [...new Set(low)].slice(0, 8);
        return out;
      }, K);
      if (r.hscroll > 1) fail(page, `${tag}: horizontal scroll ${r.hscroll}px`);
      const names = ['theme toggle', 'RTL toggle', 'navbar CTA'];
      r.controls.forEach((n, i) => { if (i === 2 && n === 0 && w < 640 && r.menuCta) return; if (n !== 1) fail(page, `${tag}: ${names[i]} visible ${n} times (must be exactly 1)`); });
      if (K === 'public' && w >= 640 && r.ctlDims.length === 3) { const hs = new Set(r.ctlDims.map(d => d[0])), rs = new Set(r.ctlDims.map(d => d[1])); if (hs.size > 1 || rs.size > 1) fail(page, `${tag}: theme/RTL/CTA heights or radii differ ${JSON.stringify(r.ctlDims)}`); }
      if (K === 'public' && w >= 1200 && r.headerH > 90) fail(page, `${tag}: header wraps (${r.headerH}px high)`);
      if (r.heroH != null && theme === 'light' && dir === 'ltr') { (heroH[w] ||= {})[page] = r.heroH; }
      if (dir === 'rtl' && r.bidi) fail(page, `${tag}: text blocks need unicode-bidi: plaintext`);
      r.align.forEach(a => fail(page, `${tag}: card text not level: ${a}`));
      r.fit.forEach(a => fail(page, `${tag}: image distorted (object-fit fill): ${a}`));
      r.contrast.forEach(c => fail(page, `${tag}: low contrast ${c}`));
    }
    errors.forEach(e => fail(page, `console/page error: ${e}`));

    // ---------- dashboard: every visible button must give feedback ----------
    if (K === 'app' && !NOCLICK) {
      await p.setViewportSize({ width: 1440, height: 900 });
      await p.goto('file://' + path.join(SITE, page), { waitUntil: 'load' });
      const n = await p.evaluate(() => [...document.querySelectorAll('main button, main a[href="#"], main [data-toast]')].length);
      for (let i = 0; i < n; i++) {
        await p.goto('file://' + path.join(SITE, page), { waitUntil: 'load' });
        const info = await p.evaluate((idx) => {
          const el = [...document.querySelectorAll('main button, main a[href="#"], main [data-toast]')][idx];
          const r = el.getBoundingClientRect();
          const hiddenParent = el.closest('[hidden], .modal[hidden]');
          const skip = hiddenParent || r.width === 0 || el.disabled || el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-pressed') === 'true' || /^(INPUT)$/.test(el.tagName);
          window.__chg = 0; window.__href = location.href;
          new MutationObserver(m => { window.__chg += m.length; }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
          return { skip: !!skip, label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) };
        }, i);
        if (info.skip) continue;
        const loc = p.locator('main button, main a[href="#"], main [data-toast]').nth(i);
        try { await loc.scrollIntoViewIfNeeded({ timeout: 1500 }); await loc.click({ timeout: 1500 }); } catch (e) { continue; }
        await p.waitForTimeout(350);
        let changed = false;
        try { changed = await p.evaluate(() => window.__chg > 0 || location.href !== window.__href); } catch (e) { changed = true; /* navigated away */ }
        if (!changed) fail(page, `button "${info.label}" gives no visible feedback when clicked (use a toast, modal or state change)`);
      }
    }
    await p.close();
  }

  // ---------- site-wide ----------
  for (const [img, uses] of imageUse) if (uses.length > 1) fail('site', `image used ${uses.length} times: ${img} (${uses.join(', ')})`);
  for (const w of Object.keys(heroH)) { const v = Object.values(heroH[w]); if (v.length > 1 && Math.max(...v) - Math.min(...v) > 2) fail('site', `inner-page hero height differs at ${w}px: ${JSON.stringify(heroH[w])}`); }
  if (heroSrc['index.html'] && heroSrc['home-2.html'] && heroSrc['index.html'].replace(/-\d+\.webp/, '') === heroSrc['home-2.html'].replace(/-\d+\.webp/, '')) fail('site', 'Home 1 and Home 2 heroes use the same photo');
  const names = blogCards.map(a => a.name), photos = blogCards.map(a => a.photo), covers = blogCards.map(a => a.cover);
  [['author name', names], ['author photo', photos], ['blog cover', covers]].forEach(([k, arr]) => { const d = arr.filter((x, i) => x && arr.indexOf(x) !== i); if (d.length) fail('blog.html', `duplicate ${k}: ${[...new Set(d)].join(', ')}`); });
  if (articles.length > 1) {
    [['author name', articles.map(a => a.name)], ['author photo', articles.map(a => a.photo)], ['cover', articles.map(a => a.cover)]].forEach(([k, arr]) => { const d = arr.filter((x, i) => x && arr.indexOf(x) !== i); if (d.length) fail('blog posts', `duplicate ${k} across articles: ${[...new Set(d)].join(', ')}`); });
  }

  // ---------- forms behaviour: every visible form that has name + email (+ phone) ----------
  const formPages = PAGES.filter(f => ['contact.html', 'index.html', 'home-2.html', 'products.html', 'warranty.html', 'about.html', 'blog.html', PRODUCT_PAGES[0]].includes(f));
  for (const fp of formPages) {
    if (!fs.existsSync(path.join(SITE, fp))) continue;
    const p = await ctx.newPage();
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.goto('file://' + path.join(SITE, fp), { waitUntil: 'load' });
    const count = await p.locator('form[data-validate]').count();
    for (let fi = 0; fi < count; fi++) {
      const form = p.locator('form[data-validate]').nth(fi);
      const hasName = await form.locator('[name="name"]').count();
      if (!hasName) continue;
      // open a modal if the form lives in one
      const inModal = await form.evaluate(f => { const m = f.closest('.modal'); return m ? m.id : ''; });
      if (inModal) { await p.evaluate(() => { const o = document.querySelector('.modal:not([hidden])'); if (o && window.HX) window.HX.closeModal(o); }); await p.evaluate(id => window.HX && window.HX.openModal(id), inModal); }
      const visibleNow = await form.locator('[name="name"]').first().isVisible();
      if (!visibleNow) continue;
      const cases = [['name', 'A', false], ['name', 'John3', false], ['name', 'Mary Evans', true], ['email', 'mary.example.com', false], ['email', 'mary@', false], ['email', 'mary@example.com', true], ['phone', '98765abc', false], ['phone', '12345', false], ['phone', '98765 4321x', false], ['phone', '9876543210', true]];
      for (const [field, value, valid] of cases) {
        const input = form.locator(`[name="${field}"]`).first();
        if (!(await input.count()) || !(await input.isVisible())) continue;
        await input.fill(value); await input.blur();
        await form.locator('[type="submit"]').first().click({ force: true });
        await p.waitForTimeout(60);
        const invalid = await input.evaluate(el => el.getAttribute('aria-invalid') === 'true');
        if (invalid === valid) fail(fp, `form #${fi + 1}: ${field} "${value}" should be ${valid ? 'accepted' : 'rejected'} (aria-invalid=${invalid})`);
      }
      const em = form.locator('[name="email"]').first();
      if (await em.count() && await em.isVisible()) { await em.fill('Mary.Evans@EXAMPLE.com'); await em.blur(); const v = await em.inputValue(); if (v !== 'mary.evans@example.com') fail(fp, `form #${fi + 1}: email not lower-cased on blur (got ${v})`); }
      const ph = form.locator('[name="phone"]').first();
      if (await ph.count() && await ph.isVisible()) { const ok = await ph.evaluate(el => !!el.getAttribute('placeholder')); if (!ok) warn.push(`${fp}: phone field has no placeholder`); }
    }
    await p.close();
  }

  await browser.close();
  console.log(fails.length ? `FAIL: ${fails.length} problem(s)` : 'PASS: all checks');
  fails.forEach(f => console.log(' - ' + f));
  warn.forEach(f => console.log(' ~ ' + f));
  process.exit(fails.length ? 1 : 0);
})();
