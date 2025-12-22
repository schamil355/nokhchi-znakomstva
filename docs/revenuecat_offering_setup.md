## RevenueCat: Offering / Produkt-Mapping

1) In App Store Connect ein Abo (Auto-renewable) anlegen:
   - Produkt-ID: `premium_monthly` (Beispiel)
   - Lokalisierung, Preis, Screenshot hinterlegen
   - Status: Bereit/Aktiv

2) In RevenueCat Dashboard:
   - Product catalog → Entitlement: `nokhchi_znakomstva_pro` (bereits angelegt)
   - Product catalog → Products: Stelle sicher, dass das App-Store-Produkt `premium_monthly` als Product angelegt/gesynct ist.
   - Product catalog → Offerings → "New Offering": Identifier `default` (oder den Wert, den der Code verwendet)
   - Im Offering `default` ein Package hinzufügen:
       - Package type: Monthly
       - Produkt-ID: `premium_monthly` (das Abo aus App Store Connect)
   - Speichern

3) Code (bereits vorhanden): `presentPaywall({ offeringIdentifier: "default" })` nutzt das Offering `default` und zeigt das Package `monthly` an.

4) Testen: Mit Sandbox-Tester in TestFlight kaufen, Entitlement `nokhchi_znakomstva_pro` sollte aktiv werden.

