// scripts/inject-gtm.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tavo GTM ID:
const GTM_ID = "GTM-P98Q99WC";

// Katalogas, kuriame ieškosime .html
const ROOT_DIR = path.join(__dirname, "..");

// Įterpiamas kodas
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

/** Įterpia GTM <head> pradžioje, jei jo dar nėra */
function injectGTM(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes("googletagmanager.com/gtm.js")) {
    console.log(`GTM already present: ${filePath}`);
    return;
  }
  if (!content.includes("<head>")) {
    console.log(`No <head> tag, skipping: ${filePath}`);
    return;
  }
  const updated = content.replace("<head>", `<head>\n${gtmScript}`);
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`Inserted GTM into: ${filePath}`);
}

/** Pereina per visus failus ir aplankus nuo ROOT_DIR */
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && full.toLowerCase().endsWith(".html")) {
      injectGTM(full);
    }
  }
}

walk(ROOT_DIR);
console.log("GTM injection complete.");

