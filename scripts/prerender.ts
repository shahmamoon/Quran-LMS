/**
 * prerender.ts — Static pre-rendering for marketing pages.
 *
 * Run after `vite build` and `vite build --ssr`:
 *   tsx scripts/prerender.ts
 *
 * React Helmet (via renderToString) outputs all managed tags at the very
 * beginning of the component output, before the first <div. We split on
 * that boundary, hoist those tags into <head>, and serve clean pre-rendered
 * HTML to crawlers.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DIST      = path.join(ROOT, 'dist');
const SSR_DIST  = path.join(ROOT, 'dist', 'server');

const ROUTES = [
  '/', '/about', '/programs', '/book', '/faq', '/privacy', '/terms',
  '/programs/beginner', '/programs/intermediate', '/programs/advanced',
];

function injectIntoTemplate(appHtml: string, template: string): string {
  // Everything before the first <div is Helmet-managed head tags.
  // Everything from the first <div onward is the actual page content.
  const firstDiv = appHtml.indexOf('<div');
  const headFragment = firstDiv > 0 ? appHtml.slice(0, firstDiv).trim() : '';
  const bodyHtml     = firstDiv > 0 ? appHtml.slice(firstDiv) : appHtml;

  let page = template;

  if (headFragment) {
    // Extract <title> from the fragment and replace the template's <title>
    const titleMatch = headFragment.match(/<title[^>]*>[\s\S]*?<\/title>/);
    if (titleMatch) {
      page = page.replace(/<title>[^<]*<\/title>/, titleMatch[0]);
    }

    // Remaining tags (meta, link, script) injected before </head>
    const otherTags = headFragment.replace(/<title[^>]*>[\s\S]*?<\/title>/, '').trim();
    if (otherTags) {
      // The template (index.html) carries homepage-default SEO/social tags
      // (description, canonical, og:*, twitter:*). When the page provides its
      // OWN copy of one of these, drop the template's default first so the
      // crawler sees a single, page-specific value — duplicate/conflicting
      // description + canonical + og tags are a real SEO problem.

      // property="…" meta tags (Open Graph + Twitter)
      const propTags = [
        'og:url', 'og:title', 'og:description', 'og:image',
        'twitter:url', 'twitter:title', 'twitter:description', 'twitter:image',
      ];
      for (const prop of propTags) {
        if (new RegExp(`property=["']${prop}["']`, 'i').test(otherTags)) {
          page = page.replace(new RegExp(`\\s*<meta[^>]*property=["']${prop}["'][^>]*>`, 'i'), '');
        }
      }

      // name="description" meta tag
      if (/<meta[^>]*name=["']description["'][^>]*>/i.test(otherTags)) {
        page = page.replace(/\s*<meta[^>]*name=["']description["'][^>]*>/i, '');
      }

      // canonical link
      if (/<link[^>]*rel=["']canonical["'][^>]*>/i.test(otherTags)) {
        page = page.replace(/\s*<link[^>]*rel=["']canonical["'][^>]*>/i, '');
      }

      page = page.replace('</head>', `    ${otherTags}\n  </head>`);
    }
  }

  // Inject rendered body
  page = page.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);

  return page;
}

async function main() {
  const { render } = await import(path.join(SSR_DIST, 'entry-server.js')) as {
    render: (url: string) => { html: string }
  };

  // Save the original template before we overwrite index.html for the home route
  const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');

  for (const route of ROUTES) {
    console.log(`  → pre-rendering ${route}`);

    const { html: appHtml } = render(route);
    const page = injectIntoTemplate(appHtml, template);

    const outFile = route === '/'
      ? path.join(DIST, 'index.html')
      : path.join(DIST, route.slice(1) + '.html');

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, page);
    console.log(`     ✓ wrote ${path.relative(ROOT, outFile)}`);
  }

  console.log('\n✅ Pre-rendering complete.\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
