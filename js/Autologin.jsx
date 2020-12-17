/**
 * Copyright 2020, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const PropTypes = require('prop-types');
const {connect} = require('react-redux');
const axios = require('axios');
const url = require('url');
const ConfigUtils = require('qwc2/utils/ConfigUtils');

class Autologin extends React.Component {
    static propTypes = {
        autologinUrl: PropTypes.string,
        startupParams: PropTypes.object
    }
    componentDidMount() {
        let authServiceUrl = ConfigUtils.getConfigProp('authServiceUrl');

        axios.get(authServiceUrl + '/info').then(res => {
            if(!res.data.username) {
                fetch(this.props.autologinUrl, {
                    // we don't need a real fetch
                    // just checking whether Intranet URL resolves
                    mode: 'no-cors',
                })
                .then(res => {
                    // automatic login
                    let urlObj = url.parse(window.location.href);
                    urlObj.query = this.props.startupParams;
                    urlObj.search = undefined;
                    window.location.href = authServiceUrl + "login?url=" + encodeURIComponent(url.format(urlObj));
                }).catch(e => {});
            }
        }).catch(e => {});
    }
    render() {
        return null;
    }
};

module.exports = {
    AutologinPlugin: connect((state) => ({
        startupParams: state.localConfig.startupParams
    }), {})(Autologin),
    reducers: {
    }
};
