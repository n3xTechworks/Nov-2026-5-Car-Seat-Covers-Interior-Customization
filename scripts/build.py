#!/usr/bin/env python3
"""Hexstitch static build. Run from anywhere:  python3 scripts/build.py   (stdlib only, safe to re-run)

src/pages/<name>.html  ->  <name>.html (site root)
    Optional front matter between two '---' lines (key: value), then the page body.
    Layout: head + header + <main id="main"> + [inner .page-hero from front matter] + body + footer + global components.
Generated pages (no src file needed):
    product-<slug>.html  for every product in data/products.json  (template src/templates/product.html)
    gallery-<slug>.html  for every project in data/projects.json  (template src/templates/project.html)
Also writes data/site-data.js (window.HX_DATA = {cars, products, projects}) so pages work from file://,
and lists any referenced images/*.webp that do not exist yet.  See COMPONENTS.md for every key and macro.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DATA = ROOT / "data"
CARS = json.loads((DATA / "cars.json").read_text(encoding="utf-8"))
PROD = json.loads((DATA / "products.json").read_text(encoding="utf-8"))
PROJ = json.loads((DATA / "projects.json").read_text(encoding="utf-8"))
PRODUCTS = PROD["products"]
PRODUCT = {x["slug"]: x for x in PRODUCTS}
PROJECTS = PROJ["projects"]
PROJECT = {x["slug"]: x for x in PROJECTS}
esc = html.escape
LAZY = ' loading="lazy" decoding="async"'
BRAND = "Hexstitch"


def inr(n):
    s = str(int(n))
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts + [tail])


def price(n):
    return "₹" + inr(n)


# ---------------------------------------------------------------- icons ({{icon name}})
_P = {
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "chev": '<path d="m6 9 6 6 6-6"/>',
    "close": '<path d="M6 6l12 12M18 6 6 18"/>',
    "check": '<path d="m5 12.5 4.5 4.5L19 7"/>',
    "phone": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    "pin": '<path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "search": '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    "star": '<path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/>',
    "shield": '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
    "calendar": '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    "car": '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3zM7 19v2M17 19v2"/><circle cx="7.5" cy="13" r="1"/><circle cx="16.5" cy="13" r="1"/>',
    "zoom": '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2M11 8v6M8 11h6"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "minus": '<path d="M5 12h14"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    "moon": '<path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7z"/>',
    "rtl": '<path d="M16 4H9.5a3.5 3.5 0 0 0 0 7h.5M14 15V4M10 15V4M5 19h14M7 21l-2-2 2-2"/>',
    "menu": '<path d="M4 7h16M4 12h16M4 17h16"/>',
    "whatsapp": '<path d="M4 20l1.2-4.1A8 8 0 1 1 8.3 19z"/><path d="M9 8.6c.2-.5.6-.6.9-.6h.4c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .5-.1.6l-.5.6c.4.9 1.3 1.8 2.3 2.3l.6-.5c.2-.2.4-.2.6-.1l1.5.7c.2.1.3.3.3.5v.4c0 .4-.2.8-.6.9-1.8.6-6.2-2.4-6.5-5.1 0-.6.2-1.1.5-1.6"/>',
    "instagram": '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
    "facebook": '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v7h4v-7h3l1-4h-4V8z"/>',
    "youtube": '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
    "linkedin": '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
    "swatch": '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    "thread": '<path d="M7 4h10M7 20h10M8 4v16M16 4v16M8 8h8M8 12h8M8 16h8"/>',
    "tool": '<path d="M14.5 6.5a4 4 0 0 0-5.4 5.4L4 17l3 3 5.1-5.1a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    "drop": '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    "spark": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
}


def icon(name, size=20, cls=""):
    if name not in _P:
        sys.exit("unknown icon: " + name)
    c = ' class="%s"' % cls if cls else ""
    flip = " flip" if name in ("arrow", "arrow-left") else ""
    if flip:
        c = ' class="%s"' % (cls + flip).strip()
    return '<svg%s viewBox="0 0 24 24" width="%d" height="%d" aria-hidden="true" focusable="false">%s</svg>' % (c, size, size, _P[name])


ARROW = icon("arrow", 16)


def stars(r, cls="stars"):
    full = int(round(float(r)))
    return '<span class="%s" role="img" aria-label="%s out of 5 stars">%s</span>' % (cls, r, "".join('<span class="%s" aria-hidden="true">★</span>' % ("on" if i < full else "off") for i in range(5)))


def img_tag(slot, w, h, alt, size, lazy=True, cls=""):
    c = ' class="%s"' % cls if cls else ""
    return '<img%s src="images/%s-%s.webp" width="%d" height="%d" alt="%s"%s>' % (c, slot, size, w, h, esc(alt), LAZY if lazy else "")


def srcset(slot):
    s = "images/{s}-800.webp 800w, images/{s}-1600.webp 1600w".format(s=slot)
    if slot.startswith("hero-"):
        s += ", images/{s}-2000.webp 2000w".format(s=slot)
    return s


# ---------------------------------------------------------------- product / project cards
def pick(arg, items, index, kind):
    arg = (arg or "all").strip()
    if arg == "all":
        return items
    out = []
    for s in [a.strip() for a in arg.split(",") if a.strip()]:
        if s not in index:
            sys.exit("unknown %s: %s" % (kind, s))
        out.append(index[s])
    return out


def colour_dots(p, limit=4):
    return '<ul class="dots" aria-label="Colours: %s">%s</ul>' % (esc(", ".join(c["name"] for c in p["colours"])), "".join(
        '<li style="--c:%s" title="%s"></li>' % (c["hex"], esc(c["name"])) for c in p["colours"][:limit]))


def product_card(p):
    badge = '<span class="badge badge--amber pc-badge">%s</span>' % esc(p["badge"]) if p.get("badge") else ""
    return ('<article class="product-card" data-product="{slug}" data-category="{cat}" data-materials="{mats}" data-pattern="{pat}" data-price="{price}" data-rating="{rating}" data-reviews="{reviews}">\n'
            '  <div class="pc-media">{img}{badge}<button class="pc-quick" type="button" data-quickview="{slug}">Quick view</button></div>\n'
            '  <p class="pc-meta">{catl} · {matl}</p>\n'
            '  <h3 class="pc-title"><a href="{page}">{name}</a></h3>\n'
            '  <p class="pc-row"><span class="pc-price">from <strong>{pricef}</strong></span><span class="pc-rating">★ {rating} <span>({reviews})</span></span></p>\n'
            '  {dots}\n'
            '</article>').format(slug=p["slug"], cat=p["category"], mats=" ".join(p["materials"]), pat=p["pattern"], price=p["price"], rating=p["rating"], reviews=p["reviews"],
                                 img=img_tag(p["images"][0], 800, 533, p["alts"][0], 800), badge=badge, catl=esc(p["categoryLabel"]), matl=esc(p["materialLabel"]),
                                 page=p["page"], name=esc(p["name"]), pricef=price(p["price"]), dots=colour_dots(p))


def macro_product_cards(arg, ctx):
    return '<div class="product-grid" data-product-grid>\n%s\n</div>' % "\n".join(product_card(p) for p in pick(arg, PRODUCTS, PRODUCT, "product"))


def mini_product(p, action="link"):
    """compact row card: thumb + name + from price + link (cross-sell, no-pattern list)."""
    return ('<article class="mini-card">\n  <div class="mini-media">{img}</div>\n  <div class="mini-body"><h3 class="mini-title"><a href="{page}">{name}</a></h3>'
            '<p class="mini-price">from {pricef}</p><a class="link link--amber" href="quote.html?product={slug}">+ Add to quote</a></div>\n</article>').format(
        img=img_tag(p["images"][0], 160, 107, p["alts"][0], 800), page=p["page"], name=esc(p["short"][0].upper() + p["short"][1:]), pricef=price(p["price"]), slug=p["slug"])


def macro_mini_products(arg, ctx):
    return '<div class="mini-grid">\n%s\n</div>' % "\n".join(mini_product(p) for p in pick(arg, PRODUCTS, PRODUCT, "product"))


def project_card(x, size="std"):
    return ('<article class="project-card project-card--{size}" data-project="{slug}" data-body="{body}" data-material="{mat}">\n'
            '  <a class="pj-media" href="{page}" tabindex="-1" aria-hidden="true">{img}<span class="badge badge--light pj-tag">{bodyl} · {ts}</span></a>\n'
            '  <div class="pj-head"><h3 class="pj-title"><a href="{page}">{title}</a></h3><span class="pj-loc">{loc}</span></div>\n'
            '  <p class="pj-scope">{scope}</p>\n'
            '</article>').format(size=size, slug=x["slug"], body=x["body"], mat=x["material"], page=x["page"], img=img_tag(x["images"][0], 800, 533, x["alts"][0], 800),
                                 bodyl=esc(x["bodyLabel"]), ts=esc(x["timeShort"]), title=esc(x["title"]), loc=esc(x["location"]), scope=esc(x["scope"]))


def macro_project_cards(arg, ctx):
    return '<div class="project-grid" data-project-grid>\n%s\n</div>' % "\n".join(project_card(x) for x in pick(arg, PROJECTS, PROJECT, "project"))


# ---------------------------------------------------------------- product detail macros (template product.html)
def need(ctx, key):
    x = ctx.get(key)
    if not x:
        sys.exit("%s: macro needs '%s' context" % (ctx["_name"], key))
    return x


def macro_pd_gallery(arg, ctx):
    p = need(ctx, "_product")
    thumbs = "".join('<button class="pd-thumb" type="button" data-pd-thumb="%d" aria-label="Show photo %d of 3"%s>%s</button>' % (
        i, i + 1, ' aria-current="true"' if i == 0 else "", img_tag(s, 160, 107, "", 800)) for i, s in enumerate(p["images"]))
    links = "".join('<a href="images/%s-1600.webp" data-caption="%s"%s><img class="pd-main-img" src="images/%s-1600.webp" srcset="images/%s-800.webp 800w, images/%s-1600.webp 1600w" sizes="(max-width: 1024px) 100vw, 680px" width="1600" height="1067" alt="%s" decoding="async"%s></a>' % (
        s, esc(p["alts"][i]), "" if i == 0 else " hidden", s, s, s, esc(p["alts"][i]), ' fetchpriority="high"' if i == 0 else "") for i, s in enumerate(p["images"]))
    return ('<div class="pd-gallery">\n  <div class="pd-thumbs">%s</div>\n  <div class="pd-main" data-lightbox data-pd-main>%s'
            '<span class="pd-zoom" aria-hidden="true"><span data-pd-count>1 / 3</span> · Click to zoom</span></div>\n</div>') % (thumbs, links)


def macro_pd_buy(arg, ctx):
    p = need(ctx, "_product")
    cov = "".join('<label class="opt-card"><input type="radio" name="coverage" value="%d" data-price="%d"%s><span class="opt-dot" aria-hidden="true"></span><span class="opt-body"><strong>%s</strong><small>%s</small></span><span class="opt-price">%s</span></label>' % (
        i, c["price"], " checked" if i == 0 else "", esc(c["label"]), esc(c["sub"]), price(c["price"])) for i, c in enumerate(p["coverage"]))
    sw = "".join('<label class="swatch" style="--c:%s" title="%s"><input type="radio" name="colour" value="%s"%s><span class="sr-only">%s</span></label>' % (
        c["hex"], esc(c["name"]), esc(c["name"]), " checked" if i == 0 else "", esc(c["name"])) for i, c in enumerate(p["colours"]))
    th = ""
    if p["threads"]:
        th = ('<fieldset class="pd-field"><legend>Thread · <span data-pd-thread>%s</span></legend><div class="chip-row">%s</div></fieldset>' % (
            esc(p["threads"][0]), "".join('<label class="chip chip--radio"><input type="radio" name="thread" value="%s"%s><span>%s</span></label>' % (esc(t), " checked" if i == 0 else "", esc(t)) for i, t in enumerate(p["threads"]))))
    fit = ('<p class="fit-note" data-fit-note data-fits-any="%s">%s <span data-fit-text>Fits most Indian cars. Pick yours to check.</span> · <button class="linklike" type="button" data-car-open data-car-stay>change</button></p>' % (
        "true" if p["fitsAny"] else "false", icon("check", 16)))
    return ('<div class="pd-buy card">\n'
            '  <p class="pd-meta"><span>{catl} · {matl}</span><a href="#reviews" class="pd-rating">★ {rating} <span>{reviews} reviews</span></a></p>\n'
            '  <h1 class="pd-title">{name}</h1>\n  {fit}\n'
            '  <form class="pd-form" data-pd-form action="quote.html" data-validate data-no-reset novalidate>\n'
            '    <fieldset class="pd-field"><legend>Coverage</legend><div class="opt-list">{cov}</div></fieldset>\n'
            '    <fieldset class="pd-field"><legend>Colour · <span data-pd-colour>{c0}</span></legend><div class="swatch-row">{sw}</div></fieldset>\n'
            '    {th}\n'
            '    <div class="pd-info"><p><strong>{ready}</strong><span>{readysub}</span></p><p><strong>{pay}</strong><span>{paysub}</span></p></div>\n'
            '    <a class="btn btn-primary btn-block btn-lg" href="quote.html?product={slug}" data-pd-quote>Get a quote · <span data-pd-price>{p0}</span></a>\n'
            '    <div class="pd-actions"><button class="btn btn-secondary" type="button" data-modal-open="swatchModal">Request free swatches</button>'
            '<a class="btn btn-secondary" href="https://wa.me/919876543210?text={wa}" target="_blank" rel="noopener">Ask on WhatsApp</a></div>\n'
            '  </form>\n</div>').format(catl=esc(p["categoryLabel"]), matl=esc(p["materialLabel"]), rating=p["rating"], reviews=p["reviews"], name=esc(p["name"]), fit=fit, cov=cov,
                                      c0=esc(p["colours"][0]["name"]), sw=sw, th=th, ready=esc(p["ready"]), readysub=esc(p["readySub"]),
                                      pay="Pay after fitting" if p["category"] == "seat-covers" else "Pay at the studio",
                                      paysub="No advance for seat covers" if p["category"] == "seat-covers" else "UPI, card or cash", slug=p["slug"], p0=price(p["coverage"][0]["price"]),
                                      wa=esc("Hi Hexstitch, I have a question about the " + p["name"]))


def macro_pd_features(arg, ctx):
    p = need(ctx, "_product")
    return '<ul class="feature-mini">%s</ul>' % "".join('<li><strong>%s</strong><span>%s</span></li>' % (esc(a), esc(b)) for a, b in p["features"])


def spec_table(rows):
    return '<div class="spec-table"><table><tbody>%s</tbody></table></div>' % "".join('<tr><th scope="row">%s</th><td>%s</td></tr>' % (esc(a), esc(b)) for a, b in rows)


def macro_pd_specs(arg, ctx):
    return spec_table(need(ctx, "_product")["specs"])


def macro_pd_list(arg, ctx):
    p = need(ctx, "_product")
    key = (arg or "includes").strip()
    return '<ul class="checklist">%s</ul>' % "".join("<li>%s%s</li>" % (icon("check", 18), esc(i)) for i in p[key])


def macro_pd_reviews(arg, ctx):
    p = need(ctx, "_product")
    total = sum(p["histogram"])
    bars = "".join('<li><span>%d★</span><span class="bar"><span style="width:%.1f%%"></span></span><span>%d</span></li>' % (5 - i, 100.0 * n / total, n) for i, n in enumerate(p["histogram"]))
    cards = "".join(('<article class="review card"><span class="avatar" aria-hidden="true">{ini}</span><div class="review-body"><p class="review-head"><strong>{name}</strong> · {car}{st}</p>'
                     '<p>{text}</p><p class="review-meta">Verified fitting · {date}</p></div></article>').format(ini=esc(r["initials"]), name=esc(r["name"]), car=esc(r["car"]),
                                                                                                         st=stars(r["stars"]), text=esc(r["text"]), date=esc(r["date"])) for r in p["reviewList"])
    return ('<div class="reviews-wrap"><div class="rating-summary"><h2 class="h3">Reviews</h2><p class="rating-big"><strong>{r}</strong> from {n} owners</p><ul class="histogram">{bars}</ul></div>'
            '<div class="review-list">{cards}</div></div>').format(r=p["rating"], n=p["reviews"], bars=bars, cards=cards)


def macro_pd_cross(arg, ctx):
    p = need(ctx, "_product")
    return macro_mini_products(",".join(p["cross"]), ctx)


# ---------------------------------------------------------------- project detail macros (template project.html)
def macro_pj_photos(arg, ctx):
    x = need(ctx, "_project")
    a, b, c = x["images"]
    return ('<div class="pj-photos" data-lightbox>'
            '<a class="pj-ph pj-ph--main" href="images/{a}-1600.webp" data-caption="{aa}">{ia}</a>'
            '<a class="pj-ph" href="images/{b}-1600.webp" data-caption="{ab}">{ib}</a>'
            '<a class="pj-ph pj-ph--more" href="images/{c}-1600.webp" data-caption="{ac}">{ic}<span class="pj-more">View all 3 photos</span></a>'
            '</div>').format(a=a, b=b, c=c, aa=esc(x["alts"][0]), ab=esc(x["alts"][1]), ac=esc(x["alts"][2]),
                             ia=img_tag(a, 1600, 1067, x["alts"][0], 1600, lazy=False), ib=img_tag(b, 800, 533, x["alts"][1], 800), ic=img_tag(c, 800, 533, x["alts"][2], 800))


def macro_pj_specs(arg, ctx):
    return spec_table(need(ctx, "_project")["specs"])


def macro_pj_tags(arg, ctx):
    x = need(ctx, "_project")
    return '<ul class="tag-list">%s</ul>' % "".join('<li class="badge badge--light">%s</li>' % esc(t) for t in (x["bodyLabel"], x["package"], x["timeShort"], x["location"]))


def macro_pj_more(arg, ctx):
    x = need(ctx, "_project")
    others = [o for o in PROJECTS if o["slug"] != x["slug"]]
    i = PROJECTS.index(x)
    pickd = [others[(i + k) % len(others)] for k in range(3)]
    return '<div class="more-grid">%s</div>' % "".join(
        '<article class="more-card"><a class="more-media" href="{p}" tabindex="-1" aria-hidden="true">{img}</a><h3 class="more-title"><a href="{p}">{t}</a></h3></article>'.format(
            p=o["page"], img=img_tag(o["images"][0], 800, 533, o["alts"][0], 800), t=esc(o["title"])) for o in pickd)


# ---------------------------------------------------------------- generic macros
def macro_icon(arg, ctx):
    parts = (arg or "").split()
    return icon(parts[0], int(parts[1]) if len(parts) > 1 else 20)


def macro_stars(arg, ctx):
    return stars(arg.strip())


def macro_img(arg, ctx):
    """{{img slot | alt text | 800 | lazy}}: <img> with width/height for 3:2 photos (size 800 or 1600; portraits size 160/800 square)."""
    parts = [a.strip() for a in arg.split("|")]
    slot, alt = parts[0], parts[1] if len(parts) > 1 else ""
    size = parts[2] if len(parts) > 2 and parts[2] else "800"
    lazy = not (len(parts) > 3 and parts[3] == "eager")
    square = slot.startswith(("team-", "testi-", "author-"))
    w = int(size)
    h = w if square else round(w * 2 / 3)
    return img_tag(slot, w, h, alt, size, lazy)


def macro_pic(arg, ctx):
    """{{pic slot | alt | sizes}}: responsive <img> with srcset 800/1600 (+2000 for hero-*)."""
    parts = [a.strip() for a in arg.split("|")]
    slot, alt = parts[0], parts[1] if len(parts) > 1 else ""
    sizes = parts[2] if len(parts) > 2 else "(max-width: 900px) 100vw, 50vw"
    return '<img src="images/%s-1600.webp" srcset="%s" sizes="%s" width="1600" height="1067" alt="%s"%s>' % (slot, srcset(slot), sizes, esc(alt), LAZY)


def macro_quilt(arg, ctx):
    return '<span class="quilt" aria-hidden="true"></span>'


MACROS = {
    "icon": macro_icon, "stars": macro_stars, "img": macro_img, "pic": macro_pic, "quilt": macro_quilt,
    "product_cards": macro_product_cards, "mini_products": macro_mini_products, "project_cards": macro_project_cards,
    "pd_gallery": macro_pd_gallery, "pd_buy": macro_pd_buy, "pd_features": macro_pd_features, "pd_specs": macro_pd_specs,
    "pd_list": macro_pd_list, "pd_reviews": macro_pd_reviews, "pd_cross": macro_pd_cross,
    "pj_photos": macro_pj_photos, "pj_specs": macro_pj_specs, "pj_tags": macro_pj_tags, "pj_more": macro_pj_more,
}


# ---------------------------------------------------------------- inner hero
def crumbs_html(spec):
    crumbs = [c.strip() for c in (spec or "").split("|") if c.strip()]
    if not crumbs:
        return ""
    parts = ['<a href="index.html">Home</a>']
    for i, c in enumerate(crumbs):
        if "=" in c and i < len(crumbs) - 1:
            label, href = c.split("=", 1)
            parts.append('<a href="%s">%s</a>' % (href, esc(label)))
        else:
            parts.append('<span aria-current="page">%s</span>' % esc(c.split("=")[0]))
    return '<nav class="crumbs" aria-label="Breadcrumb">' + '<span aria-hidden="true">/</span>'.join(parts) + "</nav>"


def page_hero(fm):
    slot = fm.get("hero")
    if not slot:
        return ""
    nav = crumbs_html(fm.get("crumbs", ""))
    eyebrow = '<p class="eyebrow">%s</p>\n      ' % esc(fm["eyebrow"]) if fm.get("eyebrow") else ""
    lead = '\n      <p class="lead">%s</p>' % fm["lead"] if fm.get("lead") else ""
    return ('<section class="page-hero" aria-labelledby="hero-title">\n'
            '    <img class="hero-bg" src="images/{s}-1600.webp" srcset="{ss}" sizes="100vw" width="1600" height="1067" alt="{alt}" fetchpriority="high">\n'
            '    <div class="hero-shade" aria-hidden="true"></div>\n'
            '    <div class="container page-hero-content">\n'
            '      {nav}{eyebrow}<h1 id="hero-title">{h1}</h1>{lead}\n'
            '    </div>\n  </section>\n').format(s=slot, ss=srcset(slot), alt=esc(fm.get("hero_alt", "")), nav=nav + "\n      " if nav else "", eyebrow=eyebrow, h1=fm.get("h1", ""), lead=lead)


# ---------------------------------------------------------------- front matter
def parse(text):
    fm = {}
    body = text
    if text.startswith("---"):
        parts = text.split("\n---", 1)
        head = parts[0][3:]
        body = parts[1].lstrip("\n") if len(parts) > 1 else ""
        for line in head.splitlines():
            if ":" in line and not line.strip().startswith("#"):
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip()
    return fm, body


NAV_HOME = {"home1", "home2"}
MISSING = set()


def apply_nav(text, nav):
    return re.sub(r'data-nav="(\w[\w\-]*)"', lambda m: 'aria-current="page"' if m.group(1) == nav else "", text)


def render_vars(text, ctx):
    def macro(m):
        name, arg = m.group(1), (m.group(2) or "").strip()
        if name in MACROS:
            return MACROS[name](arg, ctx)
        return m.group(0)
    text = re.sub(r"\{\{(\w+)(?:\s+([^}]*))?\}\}", macro, text)

    def var(m):
        key = m.group(1)
        if key.startswith(("p.", "x.")):
            obj = ctx.get("_product" if key[0] == "p" else "_project") or {}
            f = key[2:]
            val = obj.get(f)
            if f in ("price", "packagePrice") and val is not None:
                return price(val)
            return "" if val is None else esc(str(val))
        if key in ctx:
            return str(ctx[key])
        print("  warning: %s: unknown placeholder {{%s}}" % (ctx["_name"], key))
        return ""
    return re.sub(r"\{\{([\w\.\-]+)\}\}", var, text)


def build(name, fm, body):
    if "template" in fm:
        t = SRC / "templates" / (fm["template"] + ".html")
        tfm, tbody = parse(t.read_text(encoding="utf-8"))
        fm = {**tfm, **fm}
        body = tbody
    nav = fm.get("nav", "")
    ctx = {"_name": name, "title": fm.get("title", "%s | %s" % (name, BRAND)),
           "description": fm.get("description", "Hexstitch: made-to-measure car seat covers and cabin interiors, cut on your car's own pattern and fitted at our Coimbatore studio."),
           "css": fm.get("css", name), "js": fm.get("js", name), "body_class": fm.get("body_class", ""),
           "home_current": " is-current" if nav in NAV_HOME else "", "year": "2026"}
    for k, v in fm.items():
        if k not in ctx:
            ctx[k] = v
    if fm.get("product"):
        ctx["_product"] = PRODUCT[fm["product"]]
    if fm.get("project"):
        pj = PROJECT[fm["project"]]
        pj.setdefault("initials", "".join(w[0] for w in pj["owner"].replace(".", "").split()[:2]).upper())
        ctx["_project"] = pj
    ctx["crumbs_html"] = crumbs_html(fm.get("crumbs", ""))
    for k in ("title", "description", "crumbs_html"):
        ctx[k] = render_vars(ctx[k], ctx) if "{{" in ctx[k] else ctx[k]
    pre = fm.get("preload") or fm.get("hero")
    ctx["preload_tag"] = ('  <link rel="preload" as="image" href="images/{p}-1600.webp" imagesrcset="{ss}" imagesizes="100vw" fetchpriority="high">\n'.format(p=pre, ss=srcset(pre)) if pre else "")
    body = body.rstrip() + "\n"
    header = partial("header-quote") if fm.get("header") == "quote" else partial("header")
    out = partial("head") + header + '  <main id="main">\n  ' + page_hero(fm) + body + "  </main>\n" + (partial("footer") if fm.get("footer") != "none" else "") + partial("globals")
    out = include_partials(out)
    out = render_vars(out, ctx)
    out = apply_nav(out, nav)
    for img in set(re.findall(r'images/([\w\-]+\.webp)', out)):
        if not (ROOT / "images" / img).exists():
            MISSING.add((img, name))
    (ROOT / (name + ".html")).write_text(out, encoding="utf-8")
    return name


def partial(name):
    p = SRC / "partials" / (name + ".html")
    if not p.exists():
        sys.exit("missing partial: " + name)
    return p.read_text(encoding="utf-8")


def include_partials(text, depth=0):
    def rep(m):
        return include_partials(partial(m.group(1).strip()), depth + 1) if depth < 5 else ""
    return re.sub(r"\{\{>\s*([\w\-]+)\s*\}\}", rep, text)


def main():
    data = {"cars": CARS["brands"], "products": PRODUCTS, "categories": PROD["categories"], "materials": PROD["materials"], "patterns": PROD["patterns"],
            "projects": PROJECTS, "bodies": PROJ["bodies"]}
    js = "/* generated by scripts/build.py from data/*.json: do not edit */\nwindow.HX_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (DATA / "site-data.js").write_text(js, encoding="utf-8")
    names = []
    for p in sorted((SRC / "pages").glob("*.html")):
        fm, body = parse(p.read_text(encoding="utf-8"))
        names.append(build(p.stem, fm, body))
    for x in PRODUCTS:
        names.append(build(x["page"][:-5], {"template": "product", "product": x["slug"], "title": "%s | %s" % (x["name"], BRAND), "description": x["summary"],
                                             "crumbs": "Products=products.html|%s=products.html?category=%s|%s" % (x["categoryLabel"], x["category"], x["name"])}, ""))
    for x in PROJECTS:
        names.append(build(x["page"][:-5], {"template": "project", "project": x["slug"], "title": "%s | Gallery | %s" % (x["title"], BRAND), "description": x["summary"],
                                             "crumbs": "Gallery=gallery.html|%s" % x["title"].split(",")[0]}, ""))
    print("built %d pages: %s" % (len(names), ", ".join(names)))
    if MISSING:
        by = {}
        for img, page in sorted(MISSING):
            by.setdefault(img.rsplit("-", 1)[0], set()).add(page)
        print("  note: %d image slot(s) not in images/ yet: %s" % (len(by), ", ".join(sorted(by))))


if __name__ == "__main__":
    main()
