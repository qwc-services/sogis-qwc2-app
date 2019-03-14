/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const axios = require('axios');
const ConfigUtils = require('../qwc2/MapStore2Components/utils/ConfigUtils');
const LayerUtils = require('../qwc2/QWC2Components/utils/LayerUtils');

function themeLayerRestorer(missingLayers, theme, callback) {
    // Invoked for layers specified in the l url parameter which are missing in the specified theme
    const searchService = ConfigUtils.getConfigProp("searchServiceUrl");
    let url = searchService.replace(/\/$/g, "") + "/getlayers";
    let params = {layers: missingLayers.join(",")};
    axios.get(url, {params: params}).then(response => {
        let visibleLayers = Object.entries(response.data).reduce((res, [key, value]) => {
            return {...res, [key]: LayerUtils.getSublayerNames({sublayers: value})};
        }, {});
        callback([].concat(...Object.values(response.data)), visibleLayers);
    }).catch(e => {
        callback([], null);
    });
}

module.exports = themeLayerRestorer;
