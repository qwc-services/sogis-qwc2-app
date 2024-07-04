/**
 * Copyright 2024 Sourcepole AG
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';

import BottomBar from 'qwc2/plugins/BottomBar';
import ConfigUtils from 'qwc2/utils/ConfigUtils';
import LocaleUtils from 'qwc2/utils/LocaleUtils';

import './style/SoBottomBar.css';


export default class SoBottomBar extends React.Component {
    static propTypes = {
        ...BottomBar.propTypes,
        /** The contact URL. */
        contactUrl: PropTypes.string,
        /** The URL to return to the my.so.ch portal. */
        leaveUrl: PropTypes.string,
        /** The my.so.ch help URL. */
        helpUrl: PropTypes.string
    };
    static defaultProps = BottomBar.defaultProps;
    componentDidMount() {
        const userInfos = ConfigUtils.getConfigProp("user_infos");
        if (userInfos?.mysoch) {
            document.querySelector('div.ol-scale-line').classList.add("mysoch-scaleline");
        }
    }
    
    render() {
        const assetsPath = ConfigUtils.getAssetsPath();
        const userInfos = ConfigUtils.getConfigProp("user_infos");
        if (userInfos?.mysoch) {
            const additionalBottomBarLinks = [{
                label: LocaleUtils.tr("sobottombar.help"),
                url: this.props.helpUrl
            }, {
                label: LocaleUtils.tr("sobottombar.contact"),
                url: this.props.contactUrl
            }];
            return (
                <div id="SoBottomBar">
                    <a href={this.props.leaveUrl ?? '#'}><img className="sobottombar-logo" src={assetsPath + "/img/mysoch_bottom.png"} /></a>
                    <BottomBar additionalBottomBarLinks={additionalBottomBarLinks} {...this.props} />;
                </div>
            )
        } else {
            return (<BottomBar {...this.props} />);
        }
    }
};
