import { Controller, Get, Header, Query, Req } from "@nestjs/common";
import type { Request } from "express";

// Liefert eine minimale HTML-Seite, die auf das App-Schema umleitet.
@Controller("auth")
export class AuthRedirectController {
  @Get("callback")
  @Header("Content-Type", "text/html; charset=utf-8")
  handleCallback(@Req() req: Request, @Query() query: Record<string, string | string[] | undefined>) {
    const originalQuery = req.url.includes("?") ? req.url.slice(req.url.indexOf("?") + 1) : "";
    const deeplink = `meetmate://auth/callback${originalQuery ? `?${originalQuery}` : ""}`;
    const fallback = "https://tschetschenische.app"; // Anpassbar bei Bedarf
    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0;url=${deeplink}" />
    <title>Opening app...</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; }
      a { color: #0d6e4f; }
    </style>
  </head>
  <body>
    <p>Öffne die App...</p>
    <p><a href="${deeplink}">Falls nichts passiert, hier tippen.</a></p>
    <p><a href="${fallback}">Oder zurück zur Website.</a></p>
    <script>
      setTimeout(function(){ window.location.href = "${deeplink}"; }, 50);
    </script>
  </body>
</html>
    `;
  }
}
