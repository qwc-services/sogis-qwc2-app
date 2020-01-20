QWC2 Solothurn
==============

QWC2 customization and extensions based on QGIS Web Client 2 Demo Application.

## QWC2 documentation

* [Quick start](https://github.com/qgis/qwc2-demo-app/blob/master/doc/QWC2_Documentation.md#quick-start)
* [Documentation](https://github.com/qgis/qwc2-demo-app/blob/master/doc/QWC2_Documentation.md)
* [Change log](https://github.com/qgis/qwc2-demo-app/blob/master/ChangeLog.md)

## Releasing

- QWC2 Tag erstellen
  - `git tag -m v2.0.11 v2.0.11`
  - `git push`
- CI Build (https://git.sourcepole.ch/ktso/qwc2-solothurn/-/jobs) abwarten
- somap-Repo Release Branch
  - `git checkout release_2.0`
- Relevante Commits aus Master mergen (evtl. Cherry-Pick)
  - `git merge master`
- `git push`
- In `docker-compose.yml` neue `QWC2_VERSION` setzen
- In `docker-compose.yml` `GIT_VERSION` auf aktuellen commit Hash setzen
- `docker-compose build`
- `docker-compose up -d`
- Smoke-Test Karte, Feature-Info, Suche, Grundstückbeschrieb (http://127.0.0.1:8088/)
- In `docker-compose.yml` `GIT_VERSION` auf neuen Tag setezn
- `git commit -a -m v2.0.8`
- `git tag -m v2.0.8 v2.0.8`
- Letzte Commits und Tag prüfen
- `git push`
- Allenfalls noch offene Tickets auf 2.0.x Milestone verschieben
- Release Note an Michael.Pfeiffer@bd.so.ch
