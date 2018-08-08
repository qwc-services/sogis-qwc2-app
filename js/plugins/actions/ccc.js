/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const CHANGE_CCC_STATE = 'CHANGE_CCC_STATE';

function changeCCCState(cccState) {
    return {
        type: CHANGE_CCC_STATE,
        data: cccState
    };
}

module.exports = {
    CHANGE_CCC_STATE,
    changeCCCState
};
