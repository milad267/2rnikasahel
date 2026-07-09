const res = await fetch("http://localhost:4009/");
const html = await res.text();
const hasEnamad = html.includes("enamad.ir");
const idx = html.indexOf("trustseal");
console.log("status:", res.status);
console.log("contains enamad.ir:", hasEnamad);
console.log("snippet:", idx >= 0 ? html.slice(idx - 80, idx + 160) : "NOT FOUND in HTML");
