import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
console.log(connectionString)
export const pool = new Pool({
  connectionTimeoutMillis: 1000,
  ...(connectionString && { connectionString }),
});
