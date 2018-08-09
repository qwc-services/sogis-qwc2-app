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
const isEmpty = require('lodash.isempty');
const assign = require('object-assign');
const {addSearchResults, SearchResultType} = require("../qwc2/QWC2Components/actions/search");
const CoordinatesUtils = require('../qwc2/MapStore2Components/utils/CoordinatesUtils');
const ConfigUtils = require('../qwc2/MapStore2Components/utils/ConfigUtils');
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
                x: coord[0],
                y: coord[1],
                crs: "EPSG:4326",
                bbox: [coord[0], coord[1], coord[0], coord[1]]
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
                priority: 2,
                items: items
            }
        );
    }
    dispatch(addSearchResults({data: results, provider: "coordinates", reqId: requestId}, true));
}

////////////////////////////////////////////////////////////////////////////////

function solothurnSearch(key, text, requestId, searchOptions, dispatch)
{
    const SEARCH_URL = ConfigUtils.getConfigProp("searchServiceUrl");
    axios.get(ProxyUtils.addProxyIfNeeded(SEARCH_URL + "?datasets=" + key + "&searchtext=" + encodeURIComponent(text)))
    .then(response => dispatch(solothurnSearchResults(key, response.data, requestId)))
    .catch(error => dispatch(solothurnSearchResults(key, {}, requestId)));
}

function solothurnSearchResults(key, obj, requestId)
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
                bbox: item.bbox,
                x: item.x,
                y: item.y,
                crs: "EPSG:2056",
                provider: key,
                category: group.category
            }}),
            priority: group.priority || 1
        };
        results.push(groupResult);
    });
    return addSearchResults({data: results, provider: key, reqId: requestId}, true);
}

function solothurnSearchResultGeometry(resultItem, callback)
{
    const SEARCH_URL = ConfigUtils.getConfigProp("searchServiceUrl");
    axios.get(ProxyUtils.addProxyIfNeeded(SEARCH_URL + resultItem.provider + "/" + resultItem.id + "/geometry"))
    .then(response => callback(resultItem, response.data.geometry, "EPSG:2056"));
}

////////////////////////////////////////////////////////////////////////////////

function layerSearch(text, requestId, searchOptions, dispatch) {
    const SEARCH_URL = ConfigUtils.getConfigProp("searchServiceUrl");
    axios.get(ProxyUtils.addProxyIfNeeded(SEARCH_URL + "layersearch?searchtext=" + encodeURIComponent(text)))
    .then(response => dispatch(layerResults(response.data, requestId)))
    .catch(error => dispatch(layerResults({}, requestId)));
}

function layerResults(obj, requestId) {
    let results = [];
    if(!isEmpty(obj.results)) {
        results.push({
            id: "layers",
            title: "Karten",
            items: obj.results.map(result => ({
                type: SearchResultType.THEMELAYER,
                id: result.id,
                text: result.title,
                layer: result.layer
            }))
        });
    }
    return addSearchResults({data: results, provider: "layers", reqId: requestId}, true);
}

////////////////////////////////////////////////////////////////////////////////

module.exports = {
    SearchProviders: {
        "coordinates": {
            label: "Koordinaten",
            onSearch: coordinatesSearch
        },
        "layers": {
            label: "Karten",
            onSearch: layerSearch
        }
    },
    searchProviderFactory: (cfg) => {
        if(!cfg.key) {
            return null;
        }
        return {
            label: cfg.label,
            onSearch: (text, requestId, searchOptions, dispatch) => solothurnSearch(cfg.key, text, requestId, searchOptions, dispatch),
            getResultGeometry: cfg.geometry ? solothurnSearchResultGeometry : null,
            requiresLayer: cfg.layerName
        };
    }
};
