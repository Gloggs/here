import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Used only by `npm run db:studio` and `db:push` on your own machine.
// Production changes are applied with the SQL files in drizzle/.
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./utils/schema.jsx",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL?.trim() },
});
