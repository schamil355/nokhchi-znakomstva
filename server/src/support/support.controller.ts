import { Controller, Get, Header } from "@nestjs/common";

@Controller()
export class SupportController {
  @Get("support")
  @Header("Content-Type", "text/html; charset=utf-8")
  getSupportPage() {
    return `<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Support – Нохчи знакомста</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8f9fb; margin: 0; padding: 0; }
    .wrap { max-width: 880px; margin: 0 auto; padding: 28px 20px 48px; }
    h1 { font-size: 28px; margin: 0 0 12px; color: #122022; }
    h2 { font-size: 20px; margin: 24px 0 10px; color: #122022; }
    p { margin: 8px 0; color: #2f3a3d; line-height: 1.5; }
    ul { padding-left: 20px; color: #2f3a3d; }
    a { color: #0d6e4f; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .card { background: #fff; border-radius: 12px; padding: 22px; box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
    .muted { color: #5c6c66; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Support für Нохчи знакомста</h1>
      <p>Wenn Sie Fragen haben oder Probleme melden möchten, erreichen Sie uns hier:</p>

      <h2>Kontaktmöglichkeiten</h2>
      <p>E-Mail-Support: <a href="mailto:nokhchiznakomstva@proton.me">nokhchiznakomstva@proton.me</a></p>
      <p class="muted">Bitte schicken Sie, falls möglich, App-Version (Einstellungen &gt; Über), Gerät/OS-Version, kurze Problembeschreibung und Screenshots mit.</p>

      <h2>Antwortzeiten</h2>
      <p>Wir antworten in der Regel innerhalb von 24–48 Stunden an Werktagen.</p>

      <h2>Wobei wir helfen</h2>
      <ul>
        <li>Registrierung, Anmeldung, Profil- und App-Funktionen</li>
        <li>Technische Fehler oder unerwartete Meldungen</li>
        <li>Fragen zu Datenschutz und Sicherheit</li>
        <li>Meldung von unangebrachten Inhalten oder Nutzern</li>
        <li>Vorschläge, Feedback, Verbesserungen</li>
      </ul>

      <h2>Unterstützungssprachen</h2>
      <p>DE, EN, RU (weitere Sprachen nach Verfügbarkeit).</p>

      <h2>Rechtliches</h2>
      <p><a href="https://tschetschenische.app/privacy">Datenschutzerklärung</a> &nbsp;|&nbsp; <a href="https://tschetschenische.app/terms">Nutzungsbedingungen</a></p>
    </div>
  </div>
</body>
</html>`;
  }
}
