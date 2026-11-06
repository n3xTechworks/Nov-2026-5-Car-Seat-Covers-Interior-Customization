# Photo assignment (Hexstitch)

Every photo belongs to ONE page. Files: scenes `<slot>-800.webp` / `-1600.webp` (heroes also `-2000.webp`), portraits `<slot>-160.webp` / `-800.webp`.
Exceptions (checked by tests/qa.cjs): product photos may also appear in cross-sell cards on other product pages and in the quote summary;
project photos may appear on gallery.html and in "More projects" on other gallery-*.html pages; blog-N / author-N on blog.html and blog-post-N.html.

| Slot | Page | Use |
|---|---|---|
| hero-home1 | index.html | Home 1 hero |
| home-cat-seat-covers, home-cat-steering, home-cat-7seater, home-cat-cabin | index.html | "What do you want to change?" mosaic |
| home-fit-1, home-fit-2 | index.html | "Why it fits" photo cards 01 / 02 |
| finish-nappa, finish-perforated, finish-microsuede, finish-jacquard | index.html | "Compare the finishes" thumbnails |
| home-review | index.html | testimonial photo beside the carousel |
| testi-1, testi-2, testi-3 | index.html | carousel authors |
| hero-home2 | home-2.html | inset hero |
| home2-touchpoints | home-2.html | "Six touchpoints, matched" hotspot image |
| home2-designer | home-2.html | "Design your seat in three choices" configurator preview |
| home2-timeline | home-2.html | "A Signature makeover, hour by hour" photo |
| testi-4, testi-5, testi-6 | home-2.html | "Owners after a makeover" testimonials |
| product-<slug>-1 | products.html (+ quick view, no-pattern list), product-<slug>.html, cross-sell on other product pages, quote.html summary | main product photo |
| product-<slug>-2, -3 | product-<slug>.html | detail gallery thumbs / lightbox |
| (slugs) | | diamond-quilt, honeycomb-perforated, channel-pleat-suede, sport-perforated, jacquard-fabric, steering-wrap, steering-sport, mats-7d, mats-3d, ambient, cushion |
| hero-gallery | gallery.html | inner hero |
| project-N-a | gallery.html (cards, featured = project 1), gallery-<slug>.html, "More projects" on other project pages | lead photo |
| project-N-b, project-N-c | gallery-<slug>.html | photo grid + lightbox |
| (projects) | | 1 toyota-fortuner-ivory, 2 kia-seltos-graphite, 3 innova-hycross-mocha, 4 mahindra-thar-tan, 5 honda-amaze-navy, 6 mg-hector-oxblood, 7 maruti-swift-red, 8 tata-altroz-grey |
| hero-about | about.html | inner hero |
| about-studio, about-materials | about.html | studio photos |
| team-1, team-2, team-3, team-4 | about.html | team: founder, head tailor, fitting lead, customer care |
| hero-warranty | warranty.html | inner hero |
| hero-contact | contact.html | inner hero |
| hero-blog | blog.html | inner hero |
| blog-1 ... blog-7 | blog.html + blog-post-N.html | covers (1 materials, 2 airbag-safe, 3 leather care, 4 floor mats, 5 ambient lighting, 6 7-seater cabins, 7 monsoon care) |
| author-1 ... author-7 | blog.html + blog-post-N.html | authors (1-4 men, 5-7 women by slot brief; check the photo) |

Pages without photos: quote.html (product thumb only), privacy.html, terms.html, 404.html (dark quilt hero).
