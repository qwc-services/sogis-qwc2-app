/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
    CHANGE_CCC_STATE
} = require('../actions/ccc');

const assign = require('object-assign');

function ccc(state = {
    action: null,
    geomType: null,
    feature: null
}, action) {
    switch (action.type) {
        case CHANGE_CCC_STATE:
            let changed = action.data.feature ? action.data.changed !== false ? true : false : false;
            return assign({}, state, action.data, {changed: changed});
        default:
            return state;
    }
}

module.exports = ccc;
