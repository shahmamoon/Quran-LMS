import { marked } from 'marked';
import type { Post } from '@prisma/client';
import { env } from '../config/env.js';

// ─── Blog server-side rendering ───────────────────────────────
// These functions emit COMPLETE, self-contained HTML pages (no React, no Vite)
// for /blog and /blog/:slug. The whole point is that search crawlers and AI
// models receive real content + meta tags + JSON-LD in the initial response —
// which the client-rendered SPA cannot provide. See server/routes/blog.routes.ts.

marked.setOptions({ gfm: true, breaks: false });

/** Canonical site origin (no trailing slash). In prod CLIENT_URL = https://qurankidslearning.com. */
export function siteOrigin(): string {
  return (env.CLIENT_URL || 'https://qurankidslearning.com').replace(/\/+$/, '');
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Markdown body → HTML string (marked is configured sync above). */
const mdToHtml = (md: string): string => marked.parse(md) as string;

type Faq = { q: string; a: string };
const getFaqs = (post: Post): Faq[] => {
  const raw = post.faqs as unknown;
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is Faq =>
    !!f && typeof (f as Faq).q === 'string' && typeof (f as Faq).a === 'string');
};

const metaTitleOf = (post: Post) => post.metaTitle?.trim() || post.title;
const metaDescOf = (post: Post) =>
  (post.metaDescription?.trim() || post.excerpt?.trim() || '').slice(0, 300);

const fmtDate = (d: Date | null): string =>
  d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

const readingMinutes = (content: string): number =>
  Math.max(1, Math.round(content.split(/\s+/).filter(Boolean).length / 200));

const authorDisplay = (post: Post & { author?: { firstName: string; lastName: string } | null }): string =>
  post.author ? `${post.author.firstName} ${post.author.lastName}` : (post.authorName || 'Online Quran Academy');

// ─── Shared page shell ────────────────────────────────────────
function layout(opts: {
  title: string;
  description: string;
  canonical: string;
  headExtra?: string;
  body: string;
}): string {
  const org = siteOrigin();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${escapeHtml(opts.description)}" />
<link rel="canonical" href="${escapeHtml(opts.canonical)}" />
<link rel="icon" href="/logo.jpg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet" />
${opts.headExtra || ''}
<style>
  :root{--brand:#0e91e9;--brand-d:#0274c7;--ink:#0f172a;--muted:#475569;--line:#e2e8f0;--bg:#f8fafc}
  *{box-sizing:border-box}
  body{margin:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:#fff;line-height:1.65}
  h1,h2,h3,h4{font-family:'Outfit','Inter',sans-serif;letter-spacing:-.01em}
  a{color:var(--brand-d);text-decoration:none}a:hover{text-decoration:underline}
  .wrap{max-width:1280px;margin:0 auto;padding:0 32px}
  header.site{position:sticky;top:0;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:10}
  header.site .bar{max-width:1280px;margin:0 auto;padding:12px 32px;display:flex;align-items:center;justify-content:space-between}
  header.site img{height:36px}
  header.site nav{display:flex;align-items:center}
  header.site nav a{color:var(--muted);font-weight:500;margin-left:28px;transition:color .2s}
  header.site nav a:hover{color:var(--brand);text-decoration:none}
  header.site nav a.active{color:var(--brand)}
  .cta{display:inline-flex;align-items:center;background:linear-gradient(to right,#0e91e9,#0274c7);color:#fff!important;padding:10px 20px;border-radius:999px;font-weight:600;box-shadow:0 4px 6px -1px rgba(14,145,233,.25);transition:box-shadow .2s,transform .2s}
  .cta:hover{box-shadow:0 10px 15px -3px rgba(14,145,233,.4);transform:translateY(-2px);text-decoration:none}
  h1{font-size:2.1rem;line-height:1.2;margin:.2em 0 .3em}
  h2{font-size:1.5rem;margin:1.8em 0 .5em}h3{font-size:1.2rem;margin:1.5em 0 .4em}
  .meta{color:var(--muted);font-size:.95rem;margin-bottom:1.5em}
  .cover{width:100%;border-radius:14px;margin:1em 0 1.5em;display:block}
  article p{margin:1em 0}article img{max-width:100%;border-radius:10px}
  article pre{background:var(--bg);padding:16px;border-radius:10px;overflow:auto;border:1px solid var(--line)}
  article code{background:var(--bg);padding:2px 6px;border-radius:6px;font-size:.9em}
  article pre code{background:none;padding:0}
  blockquote{border-left:4px solid var(--brand);margin:1.2em 0;padding:.2em 1em;color:var(--muted)}
  .tags{margin:1.5em 0}.tag{display:inline-block;background:var(--bg);border:1px solid var(--line);color:var(--muted);padding:4px 12px;border-radius:999px;font-size:.85rem;margin:0 6px 6px 0}
  .faq{margin-top:2.5em;border-top:1px solid var(--line);padding-top:1.5em}
  .faq h2{margin-top:0}.faq-q{font-weight:600;margin:1.2em 0 .3em}.faq-a{color:var(--muted)}
  .endcta{margin:3em 0;padding:28px;background:linear-gradient(135deg,#f0f7ff,#e0effe);border-radius:16px;text-align:center}
  .endcta h3{margin:0 0 .4em}
  .post-list{list-style:none;padding:0;margin:2em 0}
  .post-list li{border-bottom:1px solid var(--line);padding:22px 0}
  .post-list h2{font-size:1.35rem;margin:0 0 .25em}
  .post-list p{color:var(--muted);margin:.3em 0}
  footer.site{background:#0f172a;color:#94a3b8;margin-top:4em;padding:32px 20px;text-align:center;font-size:.9rem}
  footer.site a{color:#cbd5e1}
  .lead{font-size:1.15rem;color:var(--muted)}
</style>
</head>
<body>
<header class="site"><div class="bar">
  <a href="/" aria-label="Online Quran Academy home"><img src="/logo.jpg" alt="Online Quran Academy" /></a>
  <nav>
    <a href="/">Home</a>
    <a href="/programs">Programs</a>
    <a href="/about">About</a>
    <a class="active" href="/blog">Blog</a>
    <a class="cta" href="/lms/login">Login</a>
  </nav>
</div></header>
<main class="wrap">
${opts.body}
</main>
<footer class="site">
  <p>© ${new Date().getFullYear()} Online Quran Academy — 1:1 Quran recitation classes for children &amp; adults.</p>
  <p><a href="/">Home</a> · <a href="/programs">Programs</a> · <a href="/about">About</a> · <a href="/book">Book a Free Trial Class</a></p>
</footer>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Online Quran Academy',
  url: org,
  logo: `${org}/logo.jpg`,
})}</script>
</body>
</html>`;
}

const endCta = `<div class="endcta">
  <h3>Ready to start your child's Quran journey?</h3>
  <p>Book a free, no-pressure trial class. We'll assess their level and create a personalised recitation plan.</p>
  <p><a class="cta" href="/book">Book a Free Trial Class</a></p>
</div>`;

// ─── /blog/:slug ──────────────────────────────────────────────
export function renderPostPage(
  post: Post & { author?: { firstName: string; lastName: string } | null },
): string {
  const org = siteOrigin();
  const url = `${org}/blog/${post.slug}`;
  const title = metaTitleOf(post);
  const desc = metaDescOf(post);
  const cover = post.coverImage
    ? (post.coverImage.startsWith('http') ? post.coverImage : `${org}${post.coverImage}`)
    : `${org}/og-image.jpg`; // proper 1200x630 social card when a post has no cover
  const faqs = getFaqs(post);
  const published = post.publishedAt ?? post.createdAt;

  // Open Graph + Twitter
  const og = `
<meta property="og:type" content="article" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(desc)}" />
<meta property="og:image" content="${escapeHtml(cover)}" />
<meta property="article:published_time" content="${published.toISOString()}" />
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:title" content="${escapeHtml(title)}" />
<meta property="twitter:description" content="${escapeHtml(desc)}" />
<meta property="twitter:image" content="${escapeHtml(cover)}" />
${post.keywords ? `<meta name="keywords" content="${escapeHtml(post.keywords)}" />` : ''}`;

  // JSON-LD: BlogPosting + BreadcrumbList + optional FAQPage
  const graph: object[] = [
    {
      '@type': 'BlogPosting',
      headline: post.title,
      description: desc,
      image: cover,
      datePublished: published.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      author: { '@type': 'Person', name: authorDisplay(post) },
      publisher: {
        '@type': 'Organization',
        name: 'Online Quran Academy',
        logo: { '@type': 'ImageObject', url: `${org}/logo.jpg` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      ...(post.keywords ? { keywords: post.keywords } : {}),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: org },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${org}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];
  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  })}</script>`;

  const faqHtml = faqs.length
    ? `<section class="faq"><h2>Frequently asked questions</h2>${faqs
        .map((f) => `<div class="faq-q">${escapeHtml(f.q)}</div><div class="faq-a">${mdToHtml(f.a)}</div>`)
        .join('')}</section>`
    : '';

  const tagsHtml = post.tags.length
    ? `<div class="tags">${post.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  const body = `
<article>
  <a href="/blog" style="color:var(--muted);font-size:.9rem">← All articles</a>
  <h1>${escapeHtml(post.title)}</h1>
  <div class="meta">By ${escapeHtml(authorDisplay(post))} · ${fmtDate(published)} · ${readingMinutes(post.content)} min read</div>
  ${post.coverImage ? `<img class="cover" src="${escapeHtml(cover)}" alt="${escapeHtml(post.title)}" />` : ''}
  ${post.excerpt ? `<p class="lead">${escapeHtml(post.excerpt)}</p>` : ''}
  ${mdToHtml(post.content)}
  ${tagsHtml}
  ${faqHtml}
  ${endCta}
</article>`;

  return layout({ title, description: desc, canonical: url, headExtra: og + jsonld, body });
}

// ─── /blog (index) ────────────────────────────────────────────
export function renderListPage(posts: Post[]): string {
  const org = siteOrigin();
  const url = `${org}/blog`;
  const title = 'Blog — Quran Recitation & Tajweed | Online Quran Academy';
  const desc = 'Guides and resources on Quran recitation, Tajweed rules, and helping children learn to read the Quran correctly.';

  const og = `
<meta property="og:type" content="website" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(desc)}" />
<meta property="og:image" content="${escapeHtml(`${org}/og-image.jpg`)}" />`;

  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Online Quran Academy Blog',
    url,
    description: desc,
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${org}/blog/${p.slug}`,
      datePublished: (p.publishedAt ?? p.createdAt).toISOString(),
    })),
  })}</script>`;

  const items = posts.length
    ? posts.map((p) => `<li>
        <h2><a href="/blog/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a></h2>
        <p>${escapeHtml(p.excerpt || metaDescOf(p))}</p>
        <p style="font-size:.85rem">${fmtDate(p.publishedAt ?? p.createdAt)} · ${readingMinutes(p.content)} min read</p>
      </li>`).join('')
    : '<li><p>New articles are coming soon.</p></li>';

  const body = `
<h1>The Online Quran Academy Blog</h1>
<p class="lead">Practical, parent-friendly guides on raising kids who build with AI — safely and confidently.</p>
<ul class="post-list">${items}</ul>
${endCta}`;

  return layout({ title, description: desc, canonical: url, headExtra: og + jsonld, body });
}

// ─── /sitemap.xml ─────────────────────────────────────────────
export function renderSitemap(posts: Post[]): string {
  const org = siteOrigin();
  // /book is intentionally noindex (conversion/form page), so it is NOT listed
  // here — advertising a noindex URL in the sitemap is a contradictory signal.
  const staticPaths = ['', '/programs', '/about', '/faq', '/blog'];
  const urls = [
    ...staticPaths.map((p) => ({ loc: `${org}${p}`, lastmod: null as string | null })),
    ...posts.map((p) => ({
      loc: `${org}/blog/${p.slug}`,
      lastmod: (p.updatedAt ?? p.publishedAt ?? p.createdAt).toISOString(),
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
}

// ─── /blog/rss.xml ────────────────────────────────────────────
export function renderRss(posts: Post[]): string {
  const org = siteOrigin();
  const items = posts.map((p) => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${org}/blog/${p.slug}</link>
      <guid>${org}/blog/${p.slug}</guid>
      <pubDate>${(p.publishedAt ?? p.createdAt).toUTCString()}</pubDate>
      <description>${escapeHtml(p.excerpt || metaDescOf(p))}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
    <title>Online Quran Academy Blog</title>
    <link>${org}/blog</link>
    <description>AI for kids and teens — guides for parents.</description>
${items}
</channel></rss>`;
}
