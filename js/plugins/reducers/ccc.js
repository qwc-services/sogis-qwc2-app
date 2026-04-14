/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CHANGE_CCC_STATE} from '../actions/ccc';

const DEFAULT_STYLE = {
    strokeColor: [255, 0, 0, 1],
    strokeWidth: 2,
    strokeDash: [],
    fillColor: [255, 0, 9, 0.5],
    circleRadius: 8,
    vertexStrokeColor: [255, 0, 0, 1],
    vertexFillColor: [255, 255, 255, 1]
};

export default function ccc(state = {
    action: null,
    geomType: null,
    feature: null,
    style: DEFAULT_STYLE
}, action) {
    switch (action.type) {
    case CHANGE_CCC_STATE: {
        const changed = (action.data.feature && action.data.changed);
        return {...state, ...action.data, style: {...DEFAULT_STYLE, ...action.data.style}, changed: changed};
    }
    default:
        return state;
    }
}
