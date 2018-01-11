/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
  onSearch: function(text, requestId, searchOptions, dispatch) {
      let results = [ ... ]; // See below
      return addSearchResults({data: results, provider: providerId, reqId: requestId}, true);
      // or
      return dispatch( (..) => {
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
}

  results = [
    {
        id: categoryid,
        title: display_title,
        items: [
            {
                id: itemid,
                text: display_text,
                label: map_label_text, // optional, show display_text by default
                x: x,
                y: y,
                crs: crs,
                bbox: [xmin, ymin, xmax, ymax],
                provider: providerid
            },
            {
                id: itemid,
                more: true,
                provider: providerid
            },
            {
                ...
            }
        ]
    },
    {
        ...
    }
  ]
*/

const axios = require('axios');
const {addSearchResults} = require("../qwc2/QWC2Components/actions/search");
const CoordinatesUtils = require('../qwc2/MapStore2Components/utils/CoordinatesUtils');
const ProxyUtils = require('../qwc2/MapStore2Components/utils/ProxyUtils');

function coordinatesSearch(text, requestId, searchOptions, dispatch) {
    let displaycrs = searchOptions.displaycrs || "EPSG:4326";
    let matches = text.match(/^\s*([+-]?\d+\.?\d*)[,\s]\s*([+-]?\d+\.?\d*)\s*$/);
    let items = [];
    if(matches && matches.length >= 3) {
        let x = parseFloat(matches[1]);
        let y = parseFloat(matches[2]);
        if(displaycrs !== "EPSG:4326") {
            let coord = CoordinatesUtils.reproject([x, y], displaycrs, "EPSG:4326");
            items.push({
                id: "coord0",
                text: x + ", " + y + " (" + displaycrs + ")",
                x: coord.x,
                y: coord.y,
                crs: "EPSG:4326",
                bbox: [x, y, x, y]
            });
        }
        if(x >= -180 && x <= 180 && y >= -90 && y <= 90) {
            let title = Math.abs(x) + (x >= 0 ? "°E" : "°W") + ", "
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
        if(x >= -90 && x <= 90 && y >= -180 && y <= 180 && x != y) {
            let title = Math.abs(y) + (y >= 0 ? "°E" : "°W") + ", "
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
    let results = [];
    if(items.length > 0) {
        results.push(
            {
                id: "coords",
                titlemsgid: "search.coordinates",
                items: items
            }
        );
    }
    dispatch(addSearchResults({data: results, provider: "coordinates", reqId: requestId}, true));
}

////////////////////////////////////////////////////////////////////////////////

function solothurnSearch(key, text, requestId, searchOptions, dispatch)
{
    axios.get(ProxyUtils.addProxyIfNeeded("http://localhost:9091/?datasets=" + key + "&searchtext=" + encodeURIComponent(text)))
    .then(response => dispatch(solothurnResults(key, response.data, requestId)))
    .catch(error => dispatch(solothurnResults(key, {}, requestId)));
}

function solothurnResults(key, obj, requestId)
{
    let results = [];
    let idcounter = 0;
    (obj.results || []).map(group => {
        let groupResult = {
            id: group.dataset,
            title: group.title,
            items: group.items.map(item => { return {
                id: item.id,
                text: item.label,
                bbox: [item.x, item.y, item.x, item.y],
                x: item.x,
                y: item.y,
                crs: "EPSG:2056",
                provider: key,
                category: group.category
            }})
        };
        results.push(groupResult);
    });
    return addSearchResults({data: results, provider: key, reqId: requestId}, true);
}

////////////////////////////////////////////////////////////////////////////////

module.exports = {
    SearchProviders: {
        "coordinates": {
            label: "Koordinaten",
            onSearch: coordinatesSearch
        }
    },
    searchProviderFactory: (cfg) => {
        return {
            label: cfg.label,
            onSearch: (text, requestId, searchOptions, dispatch) => solothurnSearch(cfg.key, text, requestId, searchOptions, dispatch)
        };
    }
};
