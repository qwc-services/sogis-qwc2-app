FROM sourcepole/qwc-map-viewer-base:v2024.07.04

COPY prod/ /qwc2
COPY server.py /srv/qwc_service/server.py
