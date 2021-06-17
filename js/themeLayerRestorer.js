/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import axios from 'axios';
import isEmpty from 'lodash.isempty';
import ConfigUtils from 'qwc2/utils/ConfigUtils';
import LayerUtils from 'qwc2/utils/LayerUtils';

export function themeLayerRestorer(missingLayers, theme, callback) {
    // Invoked for layers specified in the l url parameter which are missing in the specified theme
    const dataproductService = ConfigUtils.getConfigProp("dataproductServiceUrl");
    let url = dataproductService.replace(/\/$/g, "") + "/weblayers";
    let params = {filter: missingLayers.join(",")};
    axios.get(url, {params: params}).then(response => {
        let layerNames = Object.entries(response.data).reduce((res, [key, value]) => {
            return {...res, [key]: LayerUtils.getSublayerNames({sublayers: value})};
        }, {});
        callback([].concat(...Object.values(response.data)).filter(entry => !isEmpty(entry)), layerNames);
    }).catch(e => {
        callback([], null);
    });
}
