/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {connect} from 'react-redux';

import axios from 'axios';
import assign from 'object-assign';
import ol from 'openlayers';
import PropTypes from 'prop-types';
import {LayerRole, addLayerFeatures, addThemeSublayer, refreshLayer, removeLayer, changeLayerProperty} from 'qwc2/actions/layers';
import {zoomToPoint, zoomToExtent} from 'qwc2/actions/map';
import {setCurrentTask, setCurrentTaskBlocked} from 'qwc2/actions/task';
import {setCurrentTheme} from 'qwc2/actions/theme';
import Icon from 'qwc2/components/Icon';
import {AppInfosPortalContext} from 'qwc2/components/PluginsContainer';
import TaskBar from 'qwc2/components/TaskBar';
import ButtonBar from 'qwc2/components/widgets/ButtonBar';
import Spinner from 'qwc2/components/widgets/Spinner';
import ConfigUtils from 'qwc2/utils/ConfigUtils';
import CoordinatesUtils from 'qwc2/utils/CoordinatesUtils';
import LayerUtils from 'qwc2/utils/LayerUtils';
import LocaleUtils from 'qwc2/utils/LocaleUtils';
import MapUtils from 'qwc2/utils/MapUtils';
import {UrlParams} from 'qwc2/utils/PermaLinkUtils';
import {v4 as uuidv4} from 'uuid';

import {themeLayerRestorer} from '../themeLayerRestorer';
import {changeCCCState} from './actions/ccc';

import './style/CCCInterface.css';

let CccAppConfig = null;
let CccConnection = null;

const CCCStatus = {
    NORMAL: {msgId: ""},
    CONFIG_ERROR: {msgId: LocaleUtils.trmsg("ccc.configError")},
    CONNECTING: {msgId: LocaleUtils.trmsg("ccc.reconnecting")},
    CONNECTION_ERROR: {msgId: LocaleUtils.trmsg("ccc.connError")}
};

class CCCInterface extends React.Component {
    static contextType = AppInfosPortalContext;
    static propTypes = {
        addLayerFeatures: PropTypes.func,
        addThemeSublayer: PropTypes.func,
        ccc: PropTypes.object,
        cccselection: PropTypes.bool,
        changeCCCState: PropTypes.func,
        changeLayerProperty: PropTypes.func,
        /** Whether to log CCC connection debug messages to the browser console. */
        debug: PropTypes.bool,
        /** Expected websocket close codes */
        expectedCloseCodes: PropTypes.array,
        layers: PropTypes.array,
        map: PropTypes.object,
        refreshLayer: PropTypes.func,
        removeLayer: PropTypes.func,
        setCurrentTask: PropTypes.func,
        setCurrentTaskBlocked: PropTypes.func,
        setCurrentTheme: PropTypes.func,
        themes: PropTypes.object,
        zoomToExtent: PropTypes.func,
        zoomToPoint: PropTypes.func
    };
    static defaultProps = {
        expectedCloseCodes: [1000, 1001, 1008, 1012]
    };
    constructor(props) {
        super(props);
        this.reset();
        this.reconnectInterval = 1;
        this.maxAttempts = 60;
    }
    state = {
        status: CCCStatus.CONNECTING
    };
    debug = (msg) => {
        if (this.props.debug) {
            /* eslint-disable-next-line no-console*/
            console.log("CCC: " + msg);
        }
    };
    reset() {
        this.debug("Reset");
        CccConnection = null;
        CccAppConfig = null;
        this.connectionKey = null;
        this.sessionNr = null;
        this.currentContext = null;
        this.reconnectAttempts = 0;
    }
    componentDidMount() {
        if (this.props.themes) {
            this.initialize(this.props);
        }
    }
    componentDidUpdate(prevProps) {
        if (!prevProps.themes && this.props.themes) {
            this.initialize(this.props);
        }
    }
    initialize = (props) => {
        // If "session" and "appintegration" URL params are set, query configuration
        this.session = UrlParams.getParam('session');
        const appintegration = UrlParams.getParam('appintegration');
        if (this.session && appintegration) {
            this.session = '{' + this.session + '}';
            const cccConfigService = ConfigUtils.getConfigProp("cccConfigService");
            axios.get(cccConfigService + "?app=" + encodeURIComponent(appintegration)).then(response => {
                CccAppConfig = response.data;
                document.title = CccAppConfig.title;

                // Load ccc theme
                this.loadThemeOrLayers(props);

                // Start websocket session
                this.connect();
            }).catch(() => {
                /* eslint-disable-next-line */
                console.warn("Failed to query app configuration");
                this.setState({status: CCCStatus.CONFIG_ERROR});
                this.reset();
            });
        }
    };
    loadThemeOrLayers = (props) => {
        if (CccAppConfig.map) {
            const theme = props.themes.items.find(t => t.name === CccAppConfig.map);
            if (theme) {
                props.setCurrentTheme(theme, props.themes, false);
            } else {
                /* eslint-disable-next-line */
                console.warn("Could not find theme " + CccAppConfig.map);
            }
        } else if (CccAppConfig.layers) {
            themeLayerRestorer(CccAppConfig.layers, null, (layers) => {
                this.props.addThemeSublayer({sublayers: layers});
            });
        }
    };
    createWebSocket = () => {
        if (CccConnection) {
            CccConnection.onopen = undefined;
            CccConnection.onclose = undefined;
            CccConnection.onerror = undefined;
            CccConnection.close();
        }
        CccConnection = new WebSocket(CccAppConfig.cccServer);
        this.setState({status: CCCStatus.CONNECTING});
        CccConnection = new WebSocket(CccAppConfig.cccServer);
        CccConnection.onclose = (ev) => {
            this.debug(`Connection closed with code ${ev.code} (${ev.reason})`);
            if ((this.props.expectedCloseCodes || []).includes(ev.code)) {
                this.setState({status: CCCStatus.CONNECTION_ERROR});
                this.reset();
            } else {
                // Try to reconnect if code is not one of the expected ones
                setTimeout(this.reconnect, this.reconnectInterval * 1000);
            }
        };
        CccConnection.onerror = (err) => {
            this.debug("Connection error");
            // Try to reconnect
            setTimeout(this.reconnect, this.reconnectInterval * 1000);
        };
        CccConnection.onmessage = this.processWebSocketMessage;
        window.qwc2.reconnectCCC = () => {
            this.reconnect();
        };
    };
    connect = () => {
        this.debug("Connect");
        this.createWebSocket();
        CccConnection.onopen = () => {
            this.debug("Connection open");
            const msg = {
                apiVersion: "1.2",
                method: "connectGis",
                session: this.session,
                clientName: "Web GIS Client"
            };
            this.debug("Send connectGis");
            CccConnection.send(JSON.stringify(msg));
        };
    };
    reconnect = () => {
        ++this.reconnectAttempts;
        if (this.reconnectAttempts > this.maxAttempts) {
            this.debug("Giving up reconnect");
            this.setState({status: CCCStatus.CONNECTION_ERROR});
            this.reset();
        } else {
            this.debug(`Reconnect (attempt ${this.reconnectAttempts} / ${this.maxAttempts})`);
            this.createWebSocket();
            CccConnection.onopen = () => {
                this.debug("Connection open");
                const msg = {
                    apiVersion: "1.2",
                    method: "reconnectGis",
                    oldConnectionKey: this.connectionKey,
                    oldSessionNumber: this.sessionNr
                };
                this.debug("Send reconnectGis");
                CccConnection.send(JSON.stringify(msg));
            };
        }
    };
    processWebSocketMessage = (ev) => {
        let message = {};
        try {
            message = JSON.parse(ev.data);
        } catch {
            /* eslint-disable-next-line */
            console.log("Invalid message: " + ev.data);
        }
        if (!message.method) {
            /* eslint-disable-next-line */
            console.log("Invalid message: " + ev.data);
        }

        if (message.context) {
            this.currentContext = message.context;
        }
        this.debug("Got message " + message.method);

        if (message.method === "notifySessionReady") {
            this.setState({status: CCCStatus.NORMAL});
            this.connectionKey = message.connectionKey;
            this.sessionNr = message.sessionNr;
        } else if (message.method === "notifyError") {
            /* eslint-disable-next-line */
            console.warn(message.message);
        } else if (message.method === "keyChange") {
            this.connectionKey = message.newConnectionKey;
            this.setState({status: CCCStatus.NORMAL});
            this.reconnectAttempts = 0;
        } else if (message.method === "createGeoObject") {
            this.stopEdit();
            if (message.zoomTo !== null) {
                this.processZoomTo(message.zoomTo);
            }
            this.props.changeCCCState({action: 'Draw', geomType: message.geomType ?? CccAppConfig.editGeomType, style: message.style});
            this.props.setCurrentTask('CccEdit');
            this.props.setCurrentTaskBlocked(true);
        } else if (message.method === "editGeoObject") {
            this.stopEdit();
            const feature = {
                type: "Feature",
                id: uuidv4(),
                geometry: message.data
            };
            this.zoomToFeature(feature);
            this.props.changeCCCState({action: 'Edit', geomType: message.data.type, feature: feature, style: message.style});
            this.props.setCurrentTask('CccEdit');
            this.props.setCurrentTaskBlocked(true);
        } else if (message.method === "cancelEditGeoObject") {
            this.stopEdit();
        } else if (message.method === "notifyObjectUpdated") {
            this.props.refreshLayer(layer => layer.role === LayerRole.THEME);
        } else if (message.method === "showGeoObject") {
            this.stopEdit();
            const feature = {
                type: "Feature",
                id: uuidv4(),
                geometry: message.data,
                styleName: "default",
                styleOptions: message.style ?? {}
            };
            this.zoomToFeature(feature);
            const layer = {
                id: "cccselection",
                role: LayerRole.SELECTION
            };
            this.props.addLayerFeatures(layer, [feature], true);
            this.props.changeCCCState({action: 'Show'});
            this.props.setCurrentTask('CccEdit', null, 'identify');
        } else if (message.method === "changeLayerVisibility") {
            const layerId = message.data?.layer_identifier;
            const match = LayerUtils.searchLayer(this.props.layers, "role", LayerRole.THEME, "name", layerId);
            if (match) {
                this.props.changeLayerProperty(match.layer.id, "visibility", message.data?.visible ?? false, match.path);
            } else {
                themeLayerRestorer([layerId], null, (layers) => {
                    if (layers.length === 0) {
                        this.debug("Send notifyError");
                        CccConnection.send(JSON.stringify({
                            method: "notifyError",
                            code: 404,
                            message: `Can not set the layer visibility. Layer ${layerId} is unknown`,
                            userData: null,
                            nativeCode: "0",
                            technicalDetails: "Layer not found"
                        }));
                    } else {
                        layers[0].visibility = message.data?.visible ?? false;
                        this.props.addThemeSublayer({sublayers: layers});
                    }
                });
            }
        }
    };
    processZoomTo = (zoomTo) => {
        const cccConfigService = ConfigUtils.getConfigProp("cccConfigService");
        axios.post(cccConfigService.replace(/\/$/g, "") + '/zoomTo', zoomTo).then(response => {
            if (response.data && response.data.result) {
                const result = response.data.result;
                const maxZoom = this.getMaxZoomForMinScale(result.minScale);

                const newZoom = MapUtils.getZoomForExtent(CoordinatesUtils.reprojectBbox(result.bbox, result.crs, this.props.map.projection), this.props.map.resolutions, this.props.map.size, 0, maxZoom) - 1;
                const center = [0.5 * (result.bbox[0] + result.bbox[2]), 0.5 * (result.bbox[1] + result.bbox[3])];
                this.props.zoomToPoint(center, Math.min(maxZoom, newZoom), result.crs);
                if (result.features) {
                    const layer = {
                        id: "cccselection",
                        role: LayerRole.SELECTION
                    };
                    this.props.addLayerFeatures(layer, result.features, true);
                }
            }
        });
    };
    zoomToFeature = (feature) => {
        const extent = new ol.format.GeoJSON().readFeature(feature).getGeometry().getExtent();
        if (extent[0] === extent[2] || extent[1] === extent[3]) {
            const x = 0.5 * (extent[0] + extent[2]);
            const y = 0.5 * (extent[1] + extent[3]);
            const maxZoom = this.getMaxZoomForMinScale(CccAppConfig.minEditScale);
            this.props.zoomToPoint([x, y], maxZoom, "EPSG:2056");
        } else {
            this.props.zoomToExtent(extent, "EPSG:2056");
        }
    };
    getMaxZoomForMinScale = (minScale) => {
        // find max zoom level greater than min scale
        let maxZoom = 0;
        const scales = this.props.map.scales;
        for (let i = 0; i < scales.length; ++i) {
            if (scales[i] < minScale) {
                break;
            } else {
                maxZoom = i;
            }
        }
        return maxZoom;
    };
    renderBody = () => {
        let label = "";
        if (this.props.ccc.action === "Draw") {
            label = LocaleUtils.tr("ccc.createObject");
        } else if (this.props.ccc.action === "Edit") {
            label = LocaleUtils.tr("ccc.editObject");
        } else {
            label = LocaleUtils.tr("ccc.showObject");
        }
        const buttons = [];
        if (this.props.ccc.action === "Draw" || this.props.ccc.action === "Edit") {
            buttons.push({key: 'Commit', icon: 'ok', label: LocaleUtils.tr("ccc.commit"), extraClasses: "edit-commit", disabled: !this.props.ccc.changed});
            buttons.push({key: 'Cancel', icon: 'remove', label: LocaleUtils.tr("ccc.cancel"), extraClasses: "edit-discard"});
        }
        if (this.props.ccc.action !== "Edit") {
            buttons.push({key: 'Deselect', label: LocaleUtils.tr("ccc.deselect"), disabled: !this.props.cccselection});
        }
        return (
            <span>
                <div><b>{label}</b></div>
                <ButtonBar buttons={buttons} onClick={this.buttonClicked} />
            </span>
        );
    };
    render() {
        if (!this.session) {
            return null;
        }
        const widgets = [];
        if (this.state.status === CCCStatus.CONNECTION_ERROR) {
            widgets.push(
                <div className="ccc-error-overlay" key="CCCStatusOverlay">
                    {LocaleUtils.tr(this.state.status.msgId)}
                </div>
            );
        } else {
            if (this.props.ccc.action) {
                widgets.push(
                    <TaskBar key="CCCTaskBar" onHide={this.stopEdit} task="CCCEdit" unblockOnClose>
                        {() => ({
                            body: this.renderBody()
                        })}
                    </TaskBar>
                );
            }
            if (this.state.status === CCCStatus.NORMAL) {
                widgets.push(ReactDOM.createPortal((
                    <div className="app-info ccc-info" key="CCCInfo" title={LocaleUtils.tr("ccc.sessionnr", this.sessionNr)}>
                        <Icon icon="connected" />
                    </div>
                ), this.context));
            } else if (this.state.status === CCCStatus.CONNECTING) {
                widgets.push(ReactDOM.createPortal((
                    <div className="app-info ccc-info" key="CCCInfo" title={LocaleUtils.tr("ccc.sessionnr", this.sessionNr)}>
                        <Spinner /> {LocaleUtils.tr("ccc.connecting")}
                    </div>
                ), this.context));
            }
        }
        return widgets;
    }
    buttonClicked = (action) => {
        if (action === 'Commit') {
            this.debug("Send notifyEditGeoObjectDone");
            CccConnection.send(JSON.stringify({
                apiVersion: "1.0",
                method: "notifyEditGeoObjectDone",
                context: this.currentContext,
                data: this.props.ccc.feature.geometry
            }));
            this.stopEdit();
        } else if (action === 'Cancel' || (action === 'Deselect' && this.props.ccc.action === 'Show')) {
            this.stopEdit();
        } else if (action === 'Deselect') {
            this.props.removeLayer('cccselection');
        }
    };
    stopEdit = () => {
        this.props.changeCCCState({action: null, geomType: null});
        this.props.removeLayer('cccselection');
        this.props.setCurrentTaskBlocked(false);
        this.props.setCurrentTask(null);
    };
}

export function CCCAttributeCalculator(layer, feature) {
    if (!CccConnection || !CccAppConfig || !CccAppConfig.notifyLayers) {
        return [];
    }
    const layername = feature.layername || layer;
    const notifyEntry = CccAppConfig.notifyLayers.find(entry => entry.layer === layername);
    if (!notifyEntry) {
        return [];
    }
    const clickHandler = () => {
        if (!CccConnection) {
            return;
        }
        let mappedProps = {};
        if (feature.attribnames) {
            mappedProps = Object.entries(feature.attribnames).reduce((res, [attrtitle, attrname]) => {
                return assign(res, {[attrname]: feature.properties[attrtitle]});
            }, {});
        } else {
            mappedProps = feature.properties;
        }
        CccConnection.send(JSON.stringify({
            apiVersion: "1.0",
            method: "notifyGeoObjectSelected",
            context_list: [
                notifyEntry.mapping.reduce((res, entry) => {
                    return assign(res, {[entry.ccc_attr_name]: mappedProps[entry.agdi_attr_name] || null});
                }, {})
            ]
        }));
    };
    return [(
        <tr key="ccc-link">
            <td colSpan="2">
                <a href="#" onClick={clickHandler}>{CccAppConfig.notifyLinkTitle}</a>
            </td>
        </tr>
    )];
}


const selector = (state) => ({
    map: state.map,
    themes: state.theme.themes,
    ccc: state.ccc,
    cccselection: !!(state.layers.flat || []).find(layer => layer.id === 'cccselection'),
    layers: state.layers.flat
});

export const CCCInterfacePlugin = connect(selector, {
    zoomToPoint: zoomToPoint,
    zoomToExtent: zoomToExtent,
    changeCCCState: changeCCCState,
    setCurrentTask: setCurrentTask,
    setCurrentTaskBlocked: setCurrentTaskBlocked,
    refreshLayer: refreshLayer,
    addLayerFeatures: addLayerFeatures,
    addThemeSublayer: addThemeSublayer,
    setCurrentTheme: setCurrentTheme,
    removeLayer: removeLayer,
    changeLayerProperty: changeLayerProperty
})(CCCInterface);
