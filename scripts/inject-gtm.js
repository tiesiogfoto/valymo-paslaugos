// scripts/inject-gtm.js
// Automatiškai įterpia GTM į visus .html failus (rekursyviai).
// Naudoja GTM-P98Q99WC, neįterpia, jei jau yra.

const fs = require("fs");
const path = require("path");

const GTM_ID = "GTM-P98Q99WC";

const HEAD_SNIPPET = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id=${GTM_ID}'+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
<!-- End Google Tag Manager -->`;

const BODY_SNIPPET = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

const EXCLUDE_DIRS = new Set([".git", "node_modules", ".vercel", ".next", "dist", "build"]);

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.has(name)) walk(p, files);
    } else if (name.toLowerCase().endsWith(".html")) {
      files.push(p);
    }
  }
  return files;
}

function inject(file) {
  const raw = fs.readFileSync(file, "utf8");
  if (raw.includes(GTM_ID)) {
    console.log(`SKIP (already has GTM): ${file}`);
    return;
  }

  const headMatch = raw.match(/<head(\s[^>]*)?>/i);
  const bodyMatch = raw.match(/<body(\s[^>]*)?>/i);

  if (!headMatch || !bodyMatch) {
    console.warn(`WARN: Missing <head> or <body> in ${file}, skipping.`);
    return;
  }

  const headIdx = headMatch.index + headMatch[0].length;
  const bodyIdx = raw.match(/<body(\s[^>]*)?>/i).index + bodyMatch[0].length;

  // Pirma įterpiame HEAD (po <head>), tada iš naujo surandame <body> indeksą, nes ilgis pasikeitė
  let out = raw.slice(0, headIdx) + "\n" + HEAD_SNIPPET + "\n" + raw.slice(headIdx);

  const bodyMatch2 = out.match(/<body(\s[^>]*)?>/i);
  const newBodyIdx = bodyMatch2.index + bodyMatch2[0].length;
  out = out.slice(0, newBodyIdx) + "\n" + BODY_SNIPPET + "\n" + out.slice(newBodyIdx);

  fs.writeFileSync(file, out, "utf8");
  console.log(`INJECTED: ${file}`);
}

const root = process.cwd();
const htmlFiles = walk(root);
if (htmlFiles.length === 0) {
  console.log("No .html files found.");
  process.exit(0);
}
console.log(`Found ${htmlFiles.length} HTML files. Injecting GTM ${GTM_ID}...`);
htmlFiles.forEach(inject);
console.log("Done.");
