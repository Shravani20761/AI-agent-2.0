import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations must run over the direct (session-mode) connection, not the
    // transaction-mode pgbouncer pooler which doesn't support advisory locks / DDL.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
