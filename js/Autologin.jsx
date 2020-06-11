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
const ConfigUtils = require('qwc2/utils/ConfigUtils');

class Autologin extends React.Component {
    static propTypes = {
        autologinUrl: PropTypes.string
    }
    componentDidMount() {
        let authServiceUrl = ConfigUtils.getConfigProp('authServiceUrl');
        axios.get(authServiceUrl + '/info').then(res => {
            if(!res.data.username) {
                axios.post(this.props.autologinUrl).then(res => {
                    window.location.href = authServiceUrl + '/login';
                }).catch(e => {});
            }
        }).catch(e => {});
    }
    render() {
        return null;
    }
};

module.exports = {
    AutologinPlugin: Autologin,
    reducers: {
    }
};
