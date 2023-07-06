/**
 * Copyright 2020, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import axios from 'axios';
import isEmpty from 'lodash.isempty';
import url from 'url';
import ConfigUtils from 'qwc2/utils/ConfigUtils';
import {UrlParams} from 'qwc2/utils/PermaLinkUtils';

class Autologin extends React.Component {
    static propTypes = {
        autologinUrl: PropTypes.string,
        startupParams: PropTypes.object
    }
    constructor(props) {
        super(props);
        this.initialized = false;
    }
    componentDidMount() {
        this.initialize();
    }
    componentDidUpdate() {
        this.initialize();
    }
    initialize = () => {
        if (this.initialized) {
            return;
        }
        if (isEmpty(this.props.startupParams)) {
            return;
        }
        this.initialized = true;
        // No action, if redirected from auth service
        if (UrlParams.getParam('config:autologin') !== undefined) {
            UrlParams.updateParams({"config:autologin": undefined});
            return;
        }

        const authServiceUrl = ConfigUtils.getConfigProp('authServiceUrl');

        axios.get(authServiceUrl + '/info').then(res => {
            if (!res.data.username) {
                axios.head(this.props.autologinUrl, {
                    // we don't need a real fetch
                    // just checking whether Intranet URL resolves
                    mode: 'no-cors'
                }).then(() => {
                    // automatic login
                    const urlObj = url.parse(window.location.href);
                    urlObj.query = {...this.props.startupParams};
                    urlObj.query["config:autologin"] = 1;
                    urlObj.search = undefined;
                    window.location.href = authServiceUrl + "login?url=" + encodeURIComponent(url.format(urlObj));
                }).catch(() => {});
            }
        }).catch(() => {});
    }
    render() {
        return null;
    }
}

export default connect((state) => ({
    startupParams: state.localConfig.startupParams
}), {})(Autologin);
