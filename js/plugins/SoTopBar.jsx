/**
 * Copyright 2024 Sourcepole AG
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import classnames from 'classnames';

import {toggleFullscreen} from 'qwc2/actions/display';
import {setTopbarHeight} from 'qwc2/actions/map';
import {openExternalUrl} from 'qwc2/actions/task';
import {showNotification, NotificationType} from 'qwc2/actions/windows';
import Icon from 'qwc2/components/Icon';
import TopBarPlugin from 'qwc2/plugins/TopBar';
import ConfigUtils from 'qwc2/utils/ConfigUtils';
import LocaleUtils from 'qwc2/utils/LocaleUtils';
import {UrlParams} from 'qwc2/utils/PermaLinkUtils';

import './style/SoTopBar.css';


class SoTopBar extends React.Component {
    static propTypes = {
        ...TopBarPlugin().propTypes,
        /** The URL to return to the my.so.ch portal. */
        leaveUrl: PropTypes.string,
        /** The URL to logout from my.so.ch. */
        logoutUrl: PropTypes.string,
        /** The my.so.ch help URL. */
        helpUrl: PropTypes.string,
        showNotification: PropTypes.func
    };
    static defaultProps = TopBarPlugin().defaultProps;
    state = {
        bannerExpanded: true,
        mobileSearchVisible: false
    }
    componentDidMount() {
        this.collapseBannerTimeout = setTimeout(() => {
            this.toggleBanner(true);
        }, 3000);
        if (UrlParams.getParam("mysoch:unknownidentity") === "1") {
            UrlParams.updateParams({"mysoch:unknownidentity": undefined});
            this.props.showNotification("unknownidentity", LocaleUtils.tr("sotopbar.unknownidentity"), NotificationType.WARN, true)
        }
    }
    componentWillUnmount() {
        clearTimeout(this.collapseBannerTimeout);
    }
    render() {
        const userInfos = ConfigUtils.getConfigProp("user_infos");
        if (userInfos?.mysoch) {
            return this.renderTopBar(userInfos);
        } else {
            const TopBar = TopBarPlugin(this.props.components);
            return (<TopBar {...this.props} />);
        }
    }
    renderTopBar(userInfos) {
        const assetsPath = ConfigUtils.getAssetsPath();
        const tooltip = LocaleUtils.tr("appmenu.menulabel");
        let buttonContents = null;
        if (this.props.mobile) {
            buttonContents = (
                <span className="appmenu-button">
                    <Icon className="mysoch-menu-icon" icon="mysoch-hamburger" title={tooltip}/>
                </span>
            );
        } else {
            buttonContents = (
                <span className="appmenu-button">
                    <span className="appmenu-label">{LocaleUtils.tr("appmenu.menulabel")}</span>
                    <Icon className="mysoch-menu-icon" icon="mysoch-hamburger" title={tooltip}/>
                </span>
            );
        }
        const taskbarClasses = classnames({
            "sotopbar-taskbar": true,
            "sotopbar-taskbar-mobile": this.props.mobile
        });
        let searchComponent = null;
        if (this.props.components.Search) {
            // Convert legacy minScale option to minScaleDenom
            const searchOptions = {...this.props.searchOptions};
            searchOptions.minScaleDenom = searchOptions.minScaleDenom || searchOptions.minScale;
            delete searchOptions.minScale;
            if (this.props.mobile) {
                const buttonClasses = classnames({
                    "sotopbar-search-button-active": this.state.mobileSearchVisible
                });
                searchComponent = [
                    (<button className={buttonClasses} key="SearchButton" onClick={() => this.toggleSearch()} type="button"><Icon icon="search" size="large" /></button>),
                    this.state.mobileSearchVisible ? (<div key="SearchField" className="sotopbar-mobile-searchfield">
                        <this.props.components.Search searchOptions={searchOptions}/>
                    </div>) : null
                ];
            } else {
                searchComponent = (<this.props.components.Search searchOptions={searchOptions}/>);
            }
        }
        const bannerClasses = classnames({
            "sotopbar-banner": true,
            "sotopbar-banner-expanded": this.state.bannerExpanded
        });

        return (
            <div id="SoTopBar" ref={this.storeHeight}>
                <div className={bannerClasses}>
                    {this.state.bannerExpanded ? (<div className="sotopbar-banner-image"><a href={this.props.leaveUrl ?? '#'}><img alt="" src={assetsPath + "/img/mysoch.png"} /></a></div>) : null}
                    <div className="sotopbar-banner-toggle" onClick={() => this.toggleBanner()}><Icon icon={this.state.bannerExpanded ? "chevron-up" : "chevron-down"} /></div>
                </div>
                <div className={taskbarClasses}>
                    {this.props.components.AppMenu ? (
                        <this.props.components.AppMenu
                            appMenuClearsTask={this.props.appMenuClearsTask}
                            appMenuShortcut={this.props.appMenuShortcut}
                            buttonContents={buttonContents}
                            menuItems={this.props.menuItems}
                            onMenuToggled={() => this.toggleSearch(true)}
                            openExternalUrl={this.openUrl}
                            showFilterField={this.props.appMenuFilterField}
                            showOnStartup={this.props.appMenuVisibleOnStartup} />
                    ) : null}
                    {searchComponent}
                    <span className="sotopbar-spacer" />
                    {!this.props.mobile ? (
                        <button className="sotopbar-button" onClick={this.leave} type="button">{LocaleUtils.tr("sotopbar.leave")}</button>
                    ) : null}
                    <button className="sotopbar-button" onClick={this.showHelp}><Icon icon="question-sign" size="large" /></button>
                    <span className="sotopbar-userinfo">
                        <Icon icon="identity" size="large" /> {userInfos?.displayname ?? ""}
                    </span>
                    <button className="sotopbar-button" onClick={this.logout}><Icon icon="poweroff" size="large" /></button>
                </div>
            </div>
        );
    }
    storeHeight = (el) => {
        if (el) {
            this.props.setTopbarHeight(el.clientHeight);
            new ResizeObserver(() => {
                this.props.setTopbarHeight(el.clientHeight);
            }).observe(el)
        }
    };
    openUrl = (url, target, title, icon) => {
        if (target === "iframe") {
            target = ":iframedialog:externallinkiframe";
        }
        this.props.openExternalUrl(url, target, {title, icon});
    };
    leave = () => {
        if (this.props.leaveUrl) {
            location.href = this.props.leaveUrl;
        }
    }
    logout = () => {
        if (this.props.logoutUrl) {
            location.href = this.props.logoutUrl;
        }
    }
    showHelp = () => {
        if (this.props.helpUrl) {
            window.open(this.props.helpUrl, "_blank");
        }
    }
    toggleBanner = (forceHide = false) => {
        this.setState(state => ({bannerExpanded: forceHide ? false : !state.bannerExpanded}));
    }
    toggleSearch = (forceHide = false) => {
        this.setState(state => ({mobileSearchVisible: forceHide ? false : !state.mobileSearchVisible}));
    }
}

export default (components) => {
    return connect((state) => ({
        mobile: state.browser.mobile,
        fullscreen: state.display.fullscreen,
        components: components
    }), {
        toggleFullscreen: toggleFullscreen,
        openExternalUrl: openExternalUrl,
        setTopbarHeight: setTopbarHeight,
        showNotification: showNotification
    })(SoTopBar);
};