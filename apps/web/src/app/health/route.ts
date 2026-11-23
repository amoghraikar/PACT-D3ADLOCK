import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "pact-web",
    framework: "next.js",
    timestamp: new Date().toISOString(),
  });
}
