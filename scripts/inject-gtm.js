// scripts/inject-gtm.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GTM_ID = "GTM-P98Q99WC";

const SRC_ROOT = path.join(__dirname, "..");
const OUT_DIR  = path.join(SRC_ROOT, "public");

const EXCLUDE_DIRS = new Set([".git", "node_modules", "public", "scripts", "api"]);

const gtmScript = `
<!-- Google Tag Manager -->
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0], j=d.createElement(s), dl=l!='dataLayer'?'&l='+l:'';
  j.async=true; j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl; f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${GTM_ID}');
</script>
<!-- End Google Tag Manager -->
`;

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function injectIfHtml(content) {
  if (!content.includes("<head>")) return content;
  if (content.includes("googletagmanager.com/gtm.js")) return content;
  return content.replace("<head>", `<head>\n${gtmScript}`);
}

function copyTree(srcDir, outDir) {
  ensureDir(outDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const e of entries) {
    if (EXCLUDE_DIRS.has(e.name)) continue;
    const src = path.join(srcDir, e.name);
    const dst = path.join(outDir, e.name);

    if (e.isDirectory()) {
      copyTree(src, dst);
    } else if (e.isFile()) {
      const isHtml = e.name.toLowerCase().endsWith(".html");
      if (isHtml) {
        const content = fs.readFileSync(src, "utf8");
        const updated = injectIfHtml(content);
        ensureDir(path.dirname(dst));
        fs.writeFileSync(dst, updated, "utf8");
        console.log(`Inserted GTM into: ${path.relative(SRC_ROOT, src)}`);
      } else {
        ensureDir(path.dirname(dst));
        fs.copyFileSync(src, dst);
      }
    }
  }
}

console.log("Building static site to /public ...");
copyTree(SRC_ROOT, OUT_DIR);
console.log("Done. Output:", OUT_DIR);
