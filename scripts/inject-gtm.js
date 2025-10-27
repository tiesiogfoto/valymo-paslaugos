// scripts/inject-gtm.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NAUJA – tavo unikalus GTM ID:
const GTM_ID = "GTM-P98Q99WC";

const dirPath = path.join(__dirname, "..");
const gtmScript = `
<!-- Google Tag Manager -->
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id=' + i + dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${GTM_ID}');
</script>
<!-- End Google Tag Manager -->
`;

function injectGTM(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("googletagmanager")) {
    const updated = content.replace("<head>", `<head>\n${gtmScript}`);
    fs.writeFileSync(filePath, updated, "utf8");
    console.log(`✅ GTM inserted into ${filePath}`);
  } else {
    console.log(`ℹ️ GTM already exists in ${filePath}`);
  }
}

function walk(dir) {
  fs.readdirSync(di
