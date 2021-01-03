/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CHANGE_CCC_STATE} from '../actions/ccc';

export default function ccc(state = {
    action: null,
    geomType: null,
    feature: null
}, action) {
    switch (action.type) {
    case CHANGE_CCC_STATE: {
        const changed = (action.data.feature && action.data.changed);
        return {...state, ...action.data, changed: changed};
    }
    default:
        return state;
    }
}
