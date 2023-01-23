/**
 * Copyright 2016-2021 Sourcepole AG
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */


import yaml from 'js-yaml';

function coordinatesSearch(text, searchParams, callback) {
    const displaycrs = searchParams.displaycrs || "EPSG:4326";
    const matches = text.replaceAll(',', '').match(/^\s*([+-]?\d+\.?\d*)[,\s]\s*([+-]?\d+\.?\d*)\s*$/);
    const items = [];
    if (matches && matches.length >= 3) {
        const x = parseFloat(matches[1]);
        const y = parseFloat(matches[2]);
        if (displaycrs !== "EPSG:4326") {
            items.push({
                id: "coord0",
                text: x + ", " + y + " (" + displaycrs + ")",
                x: x,
                y: y,
                crs: displaycrs,
                bbox: [x, y, x, y]
            });
        }
        if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
            const title = Math.abs(x) + (x >= 0 ? "°E" : "°W") + ", "
                      + Math.abs(y) + (y >= 0 ? "°N" : "°S");
            items.push({
                id: "coord" + items.length,
                text: title,
                x: x,
                y: y,
                crs: "EPSG:4326",
                bbox: [x, y, x, y]
            });
        }
        if (x >= -90 && x <= 90 && y >= -180 && y <= 180 && x !== y) {
            const title = Math.abs(y) + (y >= 0 ? "°E" : "°W") + ", "
                      + Math.abs(x) + (x >= 0 ? "°N" : "°S");
            items.push({
                id: "coord" + items.length,
                text: title,
                x: y,
                y: x,
                crs: "EPSG:4326",
                bbox: [y, x, y, x]
            });
        }
    }
    const results = [];
    if (items.length > 0) {
        results.push(
            {
                id: "coords",
                titlemsgid: "search.coordinates",
                items: items
            }
        );
    }
    callback({results: results});
}

/** ************************************************************************ **/

export const SearchProviders = {
    coordinates: {
        labelmsgid: "search.coordinates",
        onSearch: coordinatesSearch
    }
};
