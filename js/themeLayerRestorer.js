/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const axios = require('axios');
const ConfigUtils = require('../qwc2/MapStore2Components/utils/ConfigUtils');

function themeLayerRestorer(missingLayers, theme, callback) {
    // Invoked for layers specified in the l url parameter which are missing in the specified theme
    const searchService = ConfigUtils.getConfigProp("searchServiceUrl");
    let url = searchService.replace(/\/$/g, "") + "/getlayers";
    let params = {layers: missingLayers.join(",")};
    axios.get(url, {params: params}).then(response => {
        let sublayers = response.data;
        callback(Array.isArray(sublayers) ? sublayers : []);
    }).catch(e => {
        callback([]);
    });
}

module.exports = themeLayerRestorer;
