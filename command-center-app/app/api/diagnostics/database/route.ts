import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function maskHost(value: string | undefined) {
  const host = value?.trim() ?? "";
  if (!host) return null;
  if (host === "localhost" || host === "127.0.0.1") return host;

  const parts = host.split(".");
  if (parts.length <= 2) return host;
  return `${parts[0]}.${parts.slice(1).map(() => "***").join(".")}`;
}

function parseDatabaseUrl(value: string | undefined) {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return {
      configured: false,
      host: null,
      port: null,
      database: null,
      pointsToLoopback: false
    };
  }

  try {
    const url = new URL(raw);
    const host = url.hostname;
    return {
      configured: true,
      host: maskHost(host),
      port: url.port || "3306",
      database: url.pathname.replace(/^\//, "") || null,
      pointsToLoopback: host === "localhost" || host === "127.0.0.1"
    };
  } catch {
    return {
      configured: true,
      host: null,
      port: null,
      database: null,
      pointsToLoopback: null
    };
  }
}

export async function GET() {
  const dbHost = process.env.DB_HOST?.trim();
  const dbPort = process.env.DB_PORT?.trim();
  const dbName = process.env.DB_NAME?.trim();
  const dbUser = process.env.DB_USER?.trim();

  return NextResponse.json(
    {
      ok: true,
      diagnostics: {
        dbHost: maskHost(dbHost),
        dbPort: dbPort || null,
        dbName: dbName || null,
        dbUserConfigured: Boolean(dbUser),
        dbPasswordConfigured: Boolean(process.env.DB_PASSWORD),
        databaseUrl: parseDatabaseUrl(process.env.DATABASE_URL)
      }
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
