/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import StandardApp from 'qwc2/components/StandardApp';
import {UrlParams} from 'qwc2/utils/PermaLinkUtils';
import appConfig from './appConfig';
import '../icons/build/qwc2-icons.css';


// Autologin flow:
// GET /map/
// Autologin.jsx:
//   if param config:autologin is undefined:
//     if GET /auth/info has no identity:
//       if in_net is True (intranet network match):
//         Redirect to /auth/login?url=/map/?config:autologin=1
// /auth/acs:
//   Write username + autologin into JWT cookie
//   Redirect to /map/?config:autologin=1
// StandardApp.jsx:
//   if param config:xxx passed:
//      load config.json with param xxx
//      remove config:xxx param from URL
// qwc2_viewer.qwc2_config:
//   if param config:autologin passed or autologin in identity:
//      remove login/logout menu entries
//
// Manual login flow:
// ...
//         Redirect to /auth/login?url=/map/
// /auth/acs:
//   Write username (without autologin) into JWT cookie
//   Redirect to /map/

// No action, if redirected from auth service
if (UrlParams.getParam('config:autologin') !== undefined) {
    UrlParams.updateParams({"config:autologin": undefined});
    renderApp();
} else {
    axios.get('/auth/info').then(res => {
        if(!res.data.username && res.data.in_net) {
            // automatic login
            let urlObj = url.parse(window.location.href);
            urlObj.query = {...UrlParams.getParams()};
            urlObj.query["config:autologin"] = 1;
            urlObj.search = undefined;
            window.location.href = authServiceUrl + "login?url=" + encodeURIComponent(url.format(urlObj));
        } else {
            renderApp();
        }
    }).catch(e => {
        renderApp();
    });
}

function renderApp() {
    ReactDOM.render(
        <StandardApp appConfig={appConfig}/>,
        document.getElementById('container')
    );
}
