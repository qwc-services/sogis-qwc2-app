/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ReducerIndex from 'qwc2/reducers/index';
import cccReducer from '../reducers/ccc';
ReducerIndex.register("ccc", cccReducer);

export const CHANGE_CCC_STATE = 'CHANGE_CCC_STATE';

export function changeCCCState(cccState) {
    return {
        type: CHANGE_CCC_STATE,
        data: cccState
    };
}
