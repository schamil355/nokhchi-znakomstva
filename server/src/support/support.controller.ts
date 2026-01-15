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
  <title>Support – Нохчи Знакомства</title>
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
      <h1>Support für Нохчи Знакомства</h1>
      <p>Wenn Sie Fragen haben oder Probleme melden möchten, erreichen Sie uns hier:</p>

      <h2>Kontaktmöglichkeiten</h2>
      <p>E-Mail-Support: <a href="mailto:support@nokhchi-znakomstva.com">support@nokhchi-znakomstva.com</a></p>
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

      <h2>Account löschen</h2>
      <p>In der App: Profil-Tab &gt; <strong>Account löschen</strong> &gt; bestätigen. Falls das nicht möglich ist, schreibe an <a href="mailto:support@nokhchi-znakomstva.com">support@nokhchi-znakomstva.com</a> mit deiner im Konto verwendeten E-Mail oder Telefonnummer.</p>
      <p class="muted">Dabei werden Profil, Fotos, Matches, Chats und dein Konto entfernt; gesetzliche Aufbewahrungspflichten (z. B. Zahlungs- oder Protokolldaten) bleiben unberührt.</p>

      <h2>Unterstützungssprachen</h2>
      <p>DE, EN, RU (weitere Sprachen nach Verfügbarkeit).</p>

      <h2>Rechtliches</h2>
      <p><a href="/privacy">Datenschutzerklärung</a> &nbsp;|&nbsp; <a href="/terms">Nutzungsbedingungen</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  @Get("privacy")
  @Header("Content-Type", "text/html; charset=utf-8")
  getPrivacyPage() {
    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Datenschutzerklärung – нохчи знакомства</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width:900px; margin:0 auto; padding:24px; line-height:1.6; color:#1f2933; background:#f8f9fb;">
  <main style="background:#fff; padding:22px; border-radius:12px; box-shadow:0 6px 16px rgba(0,0,0,0.06);">
    <h1 style="margin-top:0;">Datenschutzerklärung für die App „нохчи знакомства“</h1>

    <p>
      <strong>Verantwortlicher:</strong> Soul, Mirabellplatz 4, 5020 Salzburg, Österreich,<br>
      E-Mail: <a href="mailto:support@nokhchi-znakomstva.com">support@nokhchi-znakomstva.com</a>
    </p>

    <h2>1. Geltung</h2>
    <p>Diese Erklärung gilt für die mobile App „нохчи знакомства“.</p>

    <h2>2. Verarbeitete Daten</h2>
    <ul>
      <li><strong>Konto/Profil:</strong> E-Mail/Telefon, Anzeigename, Geschlecht, Geburtsdatum/Alter, Intention, Interessen, Bio.</li>
      <li><strong>Medien:</strong> Profilfotos und Selfies für Verifizierung (Speicherung in Supabase Storage).</li>
      <li><strong>Standort:</strong> Gerätestandort/Region für Vorschläge.</li>
      <li><strong>Geräte-/Nutzungsdaten:</strong> Push-Token, technische Logs, In-App-Ereignisse (z. B. app_open, view_profile, like, match, message_send) für Stabilität und Produktverbesserung.</li>
      <li><strong>Kommunikation:</strong> Chats/Nachrichten.</li>
      <li><strong>Verifizierung:</strong> Selfie-Abgleich mit Profilfoto (Serverless-Funktion face-verify).</li>
    </ul>

    <h2>3. Zwecke</h2>
    <p>Matchmaking, Profil- und Fotoverwaltung, standortbasierte Vorschläge, Push-Benachrichtigungen, Betrugs- und Missbrauchsvermeidung (inkl. Gesichtsabgleich), Fehleranalyse, Produktverbesserung, gesetzliche Pflichten.</p>

    <h2>4. Rechtsgrundlagen (DSGVO)</h2>
    <p>Art. 6 Abs. 1 lit. b (Nutzungsvertrag), lit. a (Einwilligungen: Push, Standort, Kamera/Fotos), lit. f (berechtigtes Interesse: Sicherheit, Stabilität), ggf. lit. c (rechtliche Pflichten).</p>

    <h2>5. Empfänger/Drittanbieter</h2>
    <ul>
      <li>Supabase (Auth, Datenbank, Storage, Realtime, Functions/face-verify)</li>
      <li>Expo/Apple/Google Push Notification Services</li>
      <li>Sentry (Crash-Reports)</li>
      <li>Apple/Google App Stores für Zahlungen/Abos</li>
    </ul>

    <h2>6. Übermittlungen</h2>
    <p>Supabase-Services können außerhalb der EU gehostet werden; Schutz über Standardvertragsklauseln und technische Maßnahmen, soweit nötig.</p>

    <h2>7. Speicherdauer</h2>
    <p>Profildaten bis Konto-Löschung; Logs/Analytics nur solange erforderlich; Fotos bis Entfernung oder Konto-Löschung; gesetzliche Aufbewahrung bleibt unberührt.</p>

    <h2>8. Rechte</h2>
    <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch gegen berechtigte Interessen, Widerruf von Einwilligungen, Beschwerde bei der Datenschutzbehörde (Österreich).</p>

    <h2>9. Erforderlichkeit/Automatisierte Entscheidungen</h2>
    <p>Bestimmte Daten sind für die Nutzung nötig (Account, Profilfoto, Standort für Umkreis). Es finden keine vollautomatisierten Einzelentscheidungen nach Art. 22 DSGVO statt; Matching/Ranking basiert auf Profil- und Standortdaten.</p>

    <h2>10. Sicherheit</h2>
    <p>TLS-Transport, Zugriffsbeschränkungen, serverseitige Prüfungen; 100% Sicherheit kann nicht garantiert werden.</p>

    <h2>11. Minderjährige</h2>
    <p>Nutzung ab 18 Jahren; Konten Minderjähriger werden gelöscht.</p>

    <h2>12. Kontakt</h2>
    <p>Datenschutzanfragen an: <a href="mailto:support@nokhchi-znakomstva.com">support@nokhchi-znakomstva.com</a></p>
  </main>
</body>
</html>`;
  }

  @Get("terms")
  @Header("Content-Type", "text/html; charset=utf-8")
  getTermsPage() {
    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Allgemeine Geschäftsbedingungen (AGB) – App „нохчи знакомства“</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width:900px; margin:0 auto; padding:24px; line-height:1.6; color:#1f2933; background:#f8f9fb;">
  <main style="background:#fff; padding:22px; border-radius:12px; box-shadow:0 6px 16px rgba(0,0,0,0.06);">
    <h1>Allgemeine Geschäftsbedingungen (AGB) – App "нохчи знакомства"</h1>

    <h2>1. Anbieter</h2>
    <p>
      Soul, Mirabellplatz 4, 5020 Salzburg, Österreich.
    </p>

    <h2>2. Vertragsgegenstand</h2>
    <p>
      Dating-/Matchmaking-App mit Profilen, Fotos, standortbasierten Vorschlägen, Chat und
      Verifizierungsfunktionen.
    </p>

    <h2>3. Voraussetzungen</h2>
    <p>
      Mindestalter 18 Jahre; wahrheitsgemäße Angaben; funktionsfähiges Gerät und Internetzugang;
      notwendige Berechtigungen (Kamera/Fotos, Standort, Push optional).
    </p>

    <h2>4. Pflichten der Nutzer</h2>
    <ul>
      <li>Keine Fake-Profile.</li>
      <li>Keine Belästigung, keine rechtswidrigen oder diskriminierenden Inhalte.</li>
      <li>Verwendung ausschließlich eigener Fotos/Selfies.</li>
      <li>Keine Urheberrechtsverletzungen.</li>
      <li>Keine Weitergabe von Inhalten Dritter ohne Zustimmung.</li>
      <li>Missbrauch und Verstöße sollen gemeldet werden.</li>
    </ul>

    <h2>5. Verifizierung/Fotos</h2>
    <p>
      Ein Selfie-Abgleich mit dem Profilfoto kann verpflichtend sein. Bei Nichtbestehen der
      Verifizierung oder bei Missbrauch kann der Zugang zur App eingeschränkt oder beendet werden.
    </p>

    <h2>6. Abonnements/In-App-Käufe</h2>
    <p>
      Es wird ein monatliches, automatisch verlängerndes Abonnement angeboten. Preis und Laufzeit
      werden vor dem Kauf angezeigt. Die Abrechnung erfolgt über den Apple App Store bzw. Google Play;
      deren Bedingungen gelten ergänzend. Die Kündigung erfolgt über die jeweiligen Store-Konto-Einstellungen.
      Begonnene Abrechnungszeiträume werden in der Regel nicht anteilig erstattet, soweit nicht zwingendes
      Recht etwas anderes vorsieht. Ein Widerruf richtet sich nach den Regeln der jeweiligen Stores.
    </p>

    <h2>7. Verfügbarkeit</h2>
    <p>
      Es werden angemessene Bemühungen für einen störungsfreien Betrieb unternommen. Wartungen und
      Ausfälle sind jedoch möglich. Ein Anspruch auf permanente Verfügbarkeit besteht nicht.
    </p>

    <h2>8. Inhalte/Moderation</h2>
    <p>
      Der Anbieter ist berechtigt, Inhalte zu prüfen, zu sperren oder zu entfernen sowie Konten zu
      kündigen oder zu beschränken, wenn gegen diese AGB, gegen Gesetze oder gegen Schutzinteressen
      verstoßen wird.
    </p>

    <h2>9. Haftung</h2>
    <p>
      Bei Vorsatz und grober Fahrlässigkeit haftet der Anbieter unbeschränkt. Bei leichter
      Fahrlässigkeit besteht eine Haftung nur für die Verletzung wesentlicher Vertragspflichten
      (Kardinalpflichten) und ist auf den vorhersehbaren, typischen Schaden begrenzt.
      Der Anbieter haftet nicht für Nutzerinhalte oder für Kontakte/Verbindungen, die außerhalb
      der App entstehen. Zwingende Haftung, insbesondere nach dem Produkthaftungsgesetz sowie
      für Schäden an Leben, Körper oder Gesundheit, bleibt unberührt.
    </p>

    <h2>10. Laufzeit/Kündigung</h2>
    <p>
      Der Nutzungsvertrag wird auf unbestimmte Zeit geschlossen. Nutzer können ihr Konto jederzeit
      löschen. Der Anbieter kann den Vertrag ordentlich mit Frist oder außerordentlich bei Verstößen
      gegen diese AGB kündigen oder Konten sperren. Laufende Abonnements sind über den jeweiligen Store
      zu kündigen.
    </p>

    <h2>11. Änderungen</h2>
    <p>
      Diese AGB können angepasst werden. Wesentliche Änderungen werden in der App angezeigt.
      Die fortgesetzte Nutzung nach Inkrafttreten der Änderungen gilt als Zustimmung, sofern kein
      Widerspruch erfolgt. Bei Widerspruch kann das Konto beendet werden.
    </p>

    <h2>12. Recht/Gerichtsstand</h2>
    <p>
      Es gilt österreichisches Recht; zwingendes Verbraucherschutzrecht bleibt unberührt.
      Der Gerichtsstand richtet sich nach den gesetzlichen Regeln.
    </p>

  <h2>13. Kontakt</h2>
  <p>
    E-Mail: <a href="mailto:support@nokhchi-znakomstva.com">support@nokhchi-znakomstva.com</a>
  </p>
</main>
</body>
</html>`;
  }

  @Get("delete-account")
  @Header("Content-Type", "text/html; charset=utf-8")
  getDeleteAccountPage() {
    return `<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Account löschen – Нохчи Знакомства</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8f9fb; margin: 0; padding: 0; }
    .wrap { max-width: 880px; margin: 0 auto; padding: 28px 20px 48px; }
    .card { background: #fff; border-radius: 12px; padding: 22px; box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
    h1 { font-size: 28px; margin: 0 0 14px; color: #122022; }
    h2 { font-size: 20px; margin: 22px 0 10px; color: #122022; }
    p, li { margin: 8px 0; color: #2f3a3d; line-height: 1.5; }
    ul { padding-left: 20px; }
    a { color: #0d6e4f; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .muted { color: #5c6c66; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Account löschen – Нохчи Знакомства</h1>
      <p>So kannst du deinen Account und alle zugehörigen Daten löschen:</p>
      <ul>
        <li>App öffnen und im Profil-Tab auf <strong>Account löschen</strong> tippen.</li>
        <li>Hinweis lesen und Löschung bestätigen. Dadurch werden Profil, Fotos, Matches, Chats und dein Konto entfernt.</li>
        <li>Falls die Löschung im Gerät nicht möglich ist, schreibe an <a href="mailto:support@nokhchi-znakomstva.com">support@nokhchi-znakomstva.com</a> mit der im Konto verwendeten E-Mail oder Telefonnummer.</li>
      </ul>
      <h2>Welche Daten werden gelöscht?</h2>
      <ul>
        <li>Profil- und Kontodaten, Matches, Nachrichten, Profilfotos/Selfies.</li>
        <li>Technische Protokolle und Zahlungsnachweise werden nur insoweit aufbewahrt, wie es gesetzliche Pflichten erfordern.</li>
      </ul>
      <p class="muted">Bei Fragen zur Löschung oder zu verbleibenden Daten wende dich bitte an <a href="mailto:support@nokhchi-znakomstva.com">support@nokhchi-znakomstva.com</a>.</p>
    </div>
  </div>
</body>
</html>`;
  }
}
