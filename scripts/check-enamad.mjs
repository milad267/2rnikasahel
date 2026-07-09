import "dotenv/config";
import { Pool } from "pg";
const p = new Pool({ connectionString: process.env.DATABASE_URL });
const r = await p.query(`select key, "group", pg_typeof(value) as type, value from site_settings where key = 'footer.enamad_code'`);
console.log("rows:", JSON.stringify(r.rows, null, 2));
await p.end();
