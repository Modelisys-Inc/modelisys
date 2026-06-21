import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const detailPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../components/cash-flow-detail.tsx")
const t = fs.readFileSync(detailPath, "utf8")

console.log("BOM:", t.charCodeAt(0) === 0xfeff ? "yes" : "no")
console.log("Note block:", JSON.stringify(t.match(/Note: Les[^<]+/)?.[0] ?? "missing"))

const fn = t.indexOf("const getComparisonLabel")
console.log("\n--- getComparisonLabel region ---")
console.log(t.slice(fn, fn + 1200))

const suspicious = t.split("\n").filter((line) =>
  line.includes("Pass?") ||
  line.includes("Ann?e") ||
  line.includes("libell?s") ||
  line.includes("d?tail") ||
  line.includes("d?finit") ||
  line.includes("Param?tres") ||
  line.includes("??dition") ||
  line.includes("budget?") ||
  line.includes("pass?")
)
console.log("\nSuspicious lines:", suspicious.length)
suspicious.forEach((l) => console.log(l.trim()))
