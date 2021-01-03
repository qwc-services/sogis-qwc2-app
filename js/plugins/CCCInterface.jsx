/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import assign from 'object-assign';
import axios from 'axios';
import uuid from 'uuid';
import ol from 'openlayers';
import ConfigUtils from 'qwc2/utils/ConfigUtils';
import CoordinatesUtils from 'qwc2/utils/CoordinatesUtils';
import MapUtils from 'qwc2/utils/MapUtils';
import {LayerRole, addLayerFeatures, refreshLayer, removeLayer} from 'qwc2/actions/layers';
import {zoomToPoint, zoomToExtent} from 'qwc2/actions/map';
import {setCurrentTheme} from 'qwc2/actions/theme';
import {setCurrentTask, setCurrentTaskBlocked} from 'qwc2/actions/task';
import TaskBar from 'qwc2/components/TaskBar';
import ButtonBar from 'qwc2/components/widgets/ButtonBar';
import LocaleUtils from 'qwc2/utils/LocaleUtils';
import {UrlParams} from 'qwc2/utils/PermaLinkUtils';
import {changeCCCState} from './actions/ccc';
import './style/CCCInterface.css';

let CccAppConfig = null;
let CccConnection = null;

const CCCStatus = {
    NORMAL: {msgId: ""},
    CONFIG_ERROR: {msgId: LocaleUtils.trmsg("ccc.configError")},
    CONNECTION_ERROR: {msgId: LocaleUtils.trmsg("ccc.connError")}
};

class CCCInterface extends React.Component {
    static propTypes = {
        addLayerFeatures: PropTypes.func,
        ccc: PropTypes.object,
        cccselection: PropTypes.bool,
        changeCCCState: PropTypes.func,
        map: PropTypes.object,
        refreshLayer: PropTypes.func,
        removeLayer: PropTypes.func,
        setCurrentTask: PropTypes.func,
        setCurrentTaskBlocked: PropTypes.func,
        setCurrentTheme: PropTypes.func,
        themes: PropTypes.object,
        zoomToExtent: PropTypes.func,
        zoomToPoint: PropTypes.func
    }
    constructor(props) {
        super(props);
        this.reset();
    }
    state = {
        status: CCCStatus.NORMAL
    }
    reset() {
        CccConnection = null;
        CccAppConfig = null;
        this.ready = false;
        this.session = null;
        this.currentContext = null;
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
                this.loadTheme(props);

                // Start websocket session
                this.createWebSocket();
            }).catch(() => {
                console.warn("Failed to query app configuration");
                this.setState({status: CCCStatus.CONFIG_ERROR});
                this.reset();
            });
        }
    }
    loadTheme = (props) => {
        const theme = props.themes.items.find(t => t.name === CccAppConfig.map);
        if (theme) {
            props.setCurrentTheme(theme, props.themes, false);
        } else {
            console.warn("Could not find theme " + CccAppConfig.map);
        }
    }
    createWebSocket = () => {
        CccConnection = new WebSocket(CccAppConfig.cccServer);
        CccConnection.onopen = () => {
            if (this.session) {
                const msg = {
                    apiVersion: "1.0",
                    method: "connectGis",
                    session: this.session,
                    clientName: "Web GIS Client"
                };
                CccConnection.send(JSON.stringify(msg));
            }
        };
        CccConnection.onclose = () => {
            console.log("Connection closed");
            this.setState({status: CCCStatus.CONNECTION_ERROR});
            this.reset();
        };
        CccConnection.onerror = (err) => {
            console.log("Connection error: " + err);
            this.setState({status: CCCStatus.CONNECTION_ERROR});
            this.reset();
        };
        CccConnection.onmessage = this.processWebSocketMessage;
    }
    processWebSocketMessage = (ev) => {
        let message = {};
        try {
            message = JSON.parse(ev.data);
        } catch (e) {
            console.log("Invalid message: " + ev.data);
        }
        if (/* message.apiVersion !== "1.0" || */!message.method) {
            console.log("Invalid message: " + ev.data);
        }

        if (message.context) {
            this.currentContext = message.context;
        }

        if (message.method === "notifySessionReady") {
            this.ready = true;
        } else if (message.method === "notifyError") {
            alert(message.message);
        } else if (message.method === "createGeoObject") {
            this.stopEdit();
            if (message.zoomTo !== null) {
                this.processZoomTo(message.zoomTo);
            }
            this.props.changeCCCState({action: 'Draw', geomType: CccAppConfig.editGeomType});
            this.props.setCurrentTask('CccEdit');
            this.props.setCurrentTaskBlocked(true);
        } else if (message.method === "editGeoObject") {
            this.stopEdit();
            const feature = {
                type: "Feature",
                id: uuid.v4(),
                geometry: message.data
            };
            this.zoomToFeature(feature);
            this.props.changeCCCState({action: 'Edit', geomType: message.data.type, feature: feature});
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
                id: uuid.v4(),
                geometry: message.data
            };
            this.zoomToFeature(feature);
            const layer = {
                id: "cccselection",
                role: LayerRole.SELECTION
            };
            this.props.addLayerFeatures(layer, [feature], true);
            this.props.changeCCCState({action: 'Show'});
            this.props.setCurrentTask('CccEdit', null, 'identify');
        }
    }
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
    }
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
    }
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
    }
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
            buttons.push({key: 'Commit', icon: 'ok', label: LocaleUtils.trmsg("ccc.commit"), extraClasses: "edit-commit", disabled: !this.props.ccc.changed});
            buttons.push({key: 'Cancel', icon: 'remove', label: LocaleUtils.trmsg("ccc.cancel"), extraClasses: "edit-discard"});
        }
        if (this.props.ccc.action !== "Edit") {
            buttons.push({key: 'Deselect', label: LocaleUtils.trmsg("ccc.deselect"), disabled: !this.props.cccselection});
        }
        return (
            <span>
                <div><b>{label}</b></div>
                <ButtonBar buttons={buttons} onClick={this.buttonClicked} />
            </span>
        );
    }
    render() {
        if (this.state.status && this.state.status !== CCCStatus.NORMAL) {
            return (
                <div className="ccc-error-overlay">
                    {LocaleUtils.tr(this.state.status.msgId)}
                </div>
            );
        }
        if (this.props.ccc.action) {
            return (
                <TaskBar onHide={this.stopEdit} task="CccEdit" unblockOnClose>
                    {() => ({
                        body: this.renderBody()
                    })}
                </TaskBar>
            );
        }
        return null;
    }
    buttonClicked = (action) => {
        if (action === 'Commit') {
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
    }
    stopEdit = () => {
        this.props.changeCCCState({action: null, geomType: null});
        this.props.removeLayer('cccselection');
        this.props.setCurrentTaskBlocked(false);
        this.props.setCurrentTask(null);
    }
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
    cccselection: !!(state.layers.flat || []).find(layer => layer.id === 'cccselection')
});

export const CCCInterfacePlugin = connect(selector, {
    zoomToPoint: zoomToPoint,
    zoomToExtent: zoomToExtent,
    changeCCCState: changeCCCState,
    setCurrentTask: setCurrentTask,
    setCurrentTaskBlocked: setCurrentTaskBlocked,
    refreshLayer: refreshLayer,
    addLayerFeatures: addLayerFeatures,
    setCurrentTheme: setCurrentTheme,
    removeLayer: removeLayer
})(CCCInterface);
