# Bum Bum Tschak

Homepage: https://uglyagi.github.io/bumbumtschak/

Verwaltung: https://uglyagi.github.io/bumbumtschak/verwaltung/

## Alles gemeinsam auf GitHub

Die Spielwelt, die Verwaltungsoberfläche, die Inhaltsdatei data/content.json und hochgeladene Dateien im Ordner uploads liegen in diesem Repository. Die Homepage benötigt keinen weiteren Server. Die bisherige Verwaltung wird nicht mehr verwendet.

Die Inhalte der Spielwelt werden beim Öffnen aus data/content.json geladen. Die Häuser Musikhaus, Konzertgebäude und Haus „Home sweet Home“ werden beim Hineinlaufen durch den Eingang automatisch betreten und durch den Ausgang wieder verlassen. Im kleinen Haus „Home sweet Home“ in der Mitte geht die Figur zu Katze, Hund, Pferd oder Affe; Enter oder Leertaste wechselt das Tier und merkt sich die Auswahl. Das Hinweisschild steht rechts neben dem Haus. Beim Büro für Eltern und Veranstalter und dem Hinweisschild erscheint in der Nähe eine Aktion. Erst mit Enter oder Leertaste öffnet sich die vergrößerte Ansicht über der Spielwelt. Der Kontaktbereich bleibt draußen: Auf einem Symbol stehen und Enter oder Leertaste drücken öffnet den Link; beim Briefsymbol erscheint ein Brief mit der E-Mail-Adresse. Büroinfos, Brief und Hinweisschild schließen mit Enter, Leertaste, Escape oder der sichtbaren Zurück-Schaltfläche. Auf freien Flächen bewirkt Bestätigen nichts. Die bisherigen Texte oben links und die feste Steuerungserklärung unten links sind entfernt.

Im Haus stehen Farbkanister. Mit Enter oder Leertaste wird ein Kanister aufgenommen. Draußen zeigt die angezeigte Fläche zunächst die Kanisterfarbe als Vorschau. Erst Enter oder Leertaste übernimmt die Farbe. Weitergehen oder Abstellen verwirft die Vorschau und zeigt die zuletzt bestätigte Farbe. Färbbar sind Weg, Wiese, Wasser, Sonne, Blüten, Wolken, Baumkronen sowie Wände und Dächer der Gebäude. Schwarze Konturen bleiben erhalten. Mit Tab sind einzelne Farbflächen direkt auswählbar; entfernte Flächen werden zuerst angelaufen und dann bestätigt. Mit einem Farbkanister bewegen Mausklicks ausschließlich die Figur zum angeklickten Punkt. Nur Enter oder Leertaste übernimmt eine Farbe; die kontextbezogene Farbaktions-Schaltfläche ist ausgeblendet. Escape oder „Abstellen“ stellt den Kanister zurück. Die Schaltfläche „Originalfarben“ im Haus setzt alle Farben zurück. Zeichnungen werden ausschließlich im lokalen Browser gespeichert, nicht im Repository.

Unter Verwaltung → Infos gibt es eigene Editoren für alle vier Spielfiguren (Name, Kurzbeschreibung, Akzentfarbe und Grafik einschließlich Originalgrafik) sowie „Farben & Malen“. Dort können bis zu 30 Kanisterfarben benannt, geändert, hinzugefügt oder entfernt werden. Je sechs Farben stehen auf einer Seite im Haus. Eigene Figurengrafiken werden ohne Verzerrung verwendet und mit dem Inhalt gemeinsam veröffentlicht; der lokale Entwurf kann die Bilder bereits vor dem Veröffentlichen zeigen.

Oberhalb der Wiese liegt ein hellblauer Himmel mit Sonne und Wolken. Zu Fuß bleibt die Figur auf dem Boden. Oben links am Wiesenrand, links oberhalb der Bühne, steht eine kleine Rakete: Enter oder Leertaste setzt das Tier hinein, der mitgenommene Farbkanister bleibt sichtbar dabei. Pfeil nach oben startet; die Richtungstasten steuern die Rakete über die Wiese in den Himmel. Dort lassen sich Himmel, Wolken und Sonne zunächst als Vorschau und anschließend mit Enter oder Leertaste färben. Nach unten geht es zurück. Berührt die Rakete einen freien Platz auf der Wiese, landet sie; erst dann steigt das Tier mit Enter oder Leertaste aus. Die Rakete bleibt am Landeplatz stehen und kann wieder bestiegen werden. „Zur Wiese“ unterstützt den Rückflug. Während des Flugs führen Haus- und Menüverknüpfungen nicht zum sofortigen Aussteigen. Die Flughinweise und Zieltexte sind unter Verwaltung → Infos → Texte → Rakete & Himmel änderbar. Weiß gehört zur Standardpalette.

## Verwaltung öffnen

Die Verwaltung verwendet einen Fine-grained personal access token von GitHub. Auf der Anmeldeseite steht unter „Zum ersten Mal hier? Zugang einrichten“ eine Schritt-für-Schritt-Anleitung samt Link zur Einrichtung. Nur das Repository bumbumtschak auswählen und die Repository-Berechtigung Contents auf Read and write setzen. Weitere Schreibrechte sind nicht nötig.

Den Schlüssel in einem Passwortmanager aufbewahren und nur direkt auf der eigenen Verwaltungsseite eingeben. Der Schlüssel wird nur im Arbeitsspeicher der geöffneten Verwaltung gehalten und beim Abmelden entfernt. Er wird weder im Repository noch in localStorage, sessionStorage oder IndexedDB gespeichert. Beim erneuten Öffnen der Verwaltung ist er erneut einzugeben. Besucher der Spielwelt brauchen keinen Schlüssel.

## Ändern und veröffentlichen

1. In der Verwaltung Konzerte, Musik oder Infos auswählen.
2. Texte und Termine bearbeiten oder Dateien auswählen. Bilder: JPG/PNG/WebP bis 12 MiB; Audio: MP3/WAV/M4A/OGG bis 50 MiB pro Datei. MP3 braucht weniger Speicher und lädt schneller.
3. „Entwurf lokal speichern“ sichert den Entwurf einschließlich ausgewählter Dateien nur im aktuellen Browser. Der Entwurf ist auf anderen Geräten nicht verfügbar; beim Löschen der Browserdaten geht er verloren.
4. „Vorschau“ zeigt den lokalen Entwurf als Spielwelt. Sie lädt ausgewählte Dateien direkt aus dem Browserspeicher.
5. „Veröffentlichen“ speichert Dateien und Inhaltsdatei in einem gemeinsamen Git-Commit. Erst dann werden sie öffentlich. GitHub Pages aktualisiert die Homepage automatisch; das kann einige Minuten dauern. Bereits geöffnete Spielwelten bitte neu laden.

Bei gleichzeitig geänderten Inhalten stoppt die Verwaltung und erhält den lokalen Entwurf. Es gibt keine erzwungenen Branch-Updates. Andere Dateien und Codeänderungen werden beim Veröffentlichen erhalten.

GitHub Pages ist auf insgesamt 1 GB pro veröffentlichter Website begrenzt. Für die geplanten zehn Kassetten sind kompakte MP3-Dateien sinnvoll. Entfernte oder ersetzte Mediendateien werden zunächst im Repository erhalten, damit vorhandene Versionen nicht beschädigt werden.

## Technischer Aufbau

Statisches HTML, CSS und JavaScript ohne Build-Schritt. GitHub Pages veröffentlicht main, /(root). Die leere Datei .nojekyll deaktiviert die Jekyll-Verarbeitung. Verwaltung und Spielwelt funktionieren auch unter dem Projektpfad /bumbumtschak/.

Die Verwaltung sendet GitHub-Aufrufe ausschließlich an api.github.com/repos/uglyagi/bumbumtschak mit einem nur für die Sitzung verwendeten Zugangsschlüssel. Im Browser werden keine zusätzlichen Skripte anderer Anbieter geladen. Die Anmeldung bei GitHub selbst und die Erstellung eines Schlüssels erfolgen direkt auf github.com.

Nach erfolgreicher Prüfung veröffentlicht die Verwaltung über GitHub Blobs → Tree → Commit → Branch-Ref. Der Inhalt ist über eine SHA gegen konkurrierende Änderungen geschützt. Dateien werden anhand von Typ, Größe und Signatur geprüft; die Formulare prüfen alle Inhaltsfelder. Eingaben werden in der Spielwelt als Text ausgegeben.

## Prüfen

node --test tests/*.test.mjs

Die Tests prüfen GitHub-Aufrufe, gemeinsames Veröffentlichen, konkurrierende Änderungen, Dateibytes, Entwürfe und Vorschau, Inhaltsprüfung und die tatsächlichen Formular- und Spielhandler. Ein vollständiger Browser-Test mit echtem Zugangsschlüssel war in der Entwicklungsumgebung nicht verfügbar.

Im oberen Menü heißt der Informationsbereich weiterhin „für Eltern und Veranstalter“. In der Welt steht dafür ein kleines Gebäude mit der Aufschrift „Büro“. In der Nähe öffnet Enter oder Leertaste die vorhandenen Informationen. Der silberne Briefkasten mit separatem Kontaktschild steht neben dem Weg. Die rechten Bäume sind nach oben verschoben, sodass dort freie Durchgänge bleiben.
