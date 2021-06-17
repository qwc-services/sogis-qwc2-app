/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
Search provider interface:
--------------------------

  onSearch: function(text, requestId, searchOptions, dispatch) {
      let results = [ ... ]; // See below
      return addSearchResults({data: results, provider: providerId, reqId: requestId}, true);
      // or
      return dispatch( (...) => {
        return addSearchResults({data: results, provider: providerId, reqId: requestId}, true);
    });
  }

  getResultGeometry: function(resultItem, callback) {
    // ...
    callback(resultItem, geometryWktString);
  }

  getMoreResults: function(moreItem, text, requestId, dispatch) {
    // Same return object as onSearch
  }


Format of search results:
-------------------------

  results = [
    {
        id: categoryid,                     // Unique category ID
        title: display_title,               // Text to display as group title in the search results
        priority: priority_nr,              // Optional search result group priority. Groups with higher priority are displayed first in the list.
        items: [
            {                                 // Location search result:
                type: SearchResultType.PLACE,   // Specifies that this is a location search result
                id: itemid,                     // Unique item ID
                text: display_text,             // Text to display as search result
                label: map_label_text,          // Optional, text to show next to the position marker on the map instead of <text>
                x: x,                           // X coordinate of result
                y: y,                           // Y coordinate of result
                crs: crs,                       // CRS of result coordinates and bbox
                bbox: [xmin, ymin, xmax, ymax], // Bounding box of result (if non-empty, map will zoom to this extent when selecting result)
                provider: providerid            // The ID of the provider which generated this result. Required if `getResultGeometry` is to be called.
            },
            {                                   // Theme layer search result (advanced):
                type: SearchResultType.THEMELAYER, // Specifies that this is a theme layer search result
                id: itemid,                        // Unique item ID
                text: display_text,                // Text to display as search result
                layer: {<Layer definition>}        // Layer definition, in the same format as a "sublayers" entry in themes.json.
            },
            {                        // Optional entry to request more results:
                id: itemid,            // Unique item ID
                more: true,            // Specifies that this entry is a "More..." entry
                provider: providerid   // The ID of the provider which generated this result.
            }
        ]
    },
    {
        ...
    }
  ]

*/

import {addSearchResults} from "qwc2/actions/search";

function coordinatesSearch(text, requestId, searchOptions, dispatch) {
    if((text.match(/,/g) || []).length >= 2) {
        // Comma used as thousands separator
        text = text.replace(/(\d),(\d)/g, "$1$2");
    }
    let displaycrs = searchOptions.displaycrs || "EPSG:4326";
    let matches = text.match(/^\s*([+-]?\d+\.?\d*)[,\s]\s*([+-]?\d+\.?\d*)\s*$/);
    let items = [];
    if(matches && matches.length >= 3) {
        let x = parseFloat(matches[1]);
        let y = parseFloat(matches[2]);
        if(displaycrs !== "EPSG:4326") {
            items.push({
                id: "coord0",
                text: x + ", " + y + " (" + displaycrs + ")",
                label: "",
                x: x,
                y: y,
                crs: displaycrs,
                bbox: [x, y, x, y]
            });
        }
        if(x >= -180 && x <= 180 && y >= -90 && y <= 90) {
            let title = Math.abs(x) + (x >= 0 ? "°E" : "°W") + ", "
                      + Math.abs(y) + (y >= 0 ? "°N" : "°S");
            items.push({
                id: "coord" + items.length,
                text: title,
                label: "",
                x: x,
                y: y,
                crs: "EPSG:4326",
                bbox: [x, y, x, y]
            });
        }
        if(x >= -90 && x <= 90 && y >= -180 && y <= 180 && x != y) {
            let title = Math.abs(y) + (y >= 0 ? "°E" : "°W") + ", "
                      + Math.abs(x) + (x >= 0 ? "°N" : "°S");
            items.push({
                id: "coord" + items.length,
                text: title,
                label: "",
                x: y,
                y: x,
                crs: "EPSG:4326",
                bbox: [y, x, y, x]
            });
        }
    }
    let results = [];
    if(items.length > 0) {
        results.push(
            {
                id: "coords",
                titlemsgid: "searchbox.coordinates",
                items: items
            }
        );
    }
    dispatch(addSearchResults({data: results, provider: "coordinates", reqId: requestId}, true));
}

////////////////////////////////////////////////////////////////////////////////

export const SearchProviders = {
    "coordinates": {
        label: "Coordinates",
        onSearch: coordinatesSearch
    }
};

export function searchProviderFactory(cfg) {
    return null;
};
