import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

// Serves the static /public/landpage.html file at /landpage (no .html extension).
// The file is a fully self-contained HTML/CSS/JS page (bilingual EN/HE lead-capture
// landing page for the photo booth rental business) with no server-side dependencies.

let cachedHtml: string | null = null;

export async function GET() {
  if (!cachedHtml) {
    const filePath = path.join(process.cwd(), "public", "landpage.html");
    cachedHtml = fs.readFileSync(filePath, "utf-8");
  }
  return new NextResponse(cachedHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
