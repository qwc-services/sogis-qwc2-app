/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const PropTypes = require('prop-types');
const {connect} = require('react-redux');
const assign = require('object-assign');
const axios = require('axios');
const uuid = require('uuid');
const ol = require('openlayers');
const Message = require('../../qwc2/MapStore2Components/components/I18N/Message');
const ConfigUtils = require("../../qwc2/MapStore2Components/utils/ConfigUtils");
const CoordinatesUtils = require('../../qwc2/MapStore2Components/utils/CoordinatesUtils');
const MapUtils = require('../../qwc2/MapStore2Components/utils/MapUtils');
const {LayerRole, addThemeSublayer, addLayerFeatures, refreshLayer, removeLayer} = require('../../qwc2/QWC2Components/actions/layers');
const {zoomToPoint, zoomToExtent} = require('../../qwc2/QWC2Components/actions/map');
const {setCurrentTask} = require('../../qwc2/QWC2Components/actions/task');
const {TaskBar} = require('../../qwc2/QWC2Components/components/TaskBar');
const ButtonBar = require('../../qwc2/QWC2Components/components/widgets/ButtonBar');
const {UrlParams} = require("../../qwc2/QWC2Components/utils/PermaLinkUtils");
const {changeCCCState} = require('./actions/ccc');

let CccAppConfig = null;
let CccConnection = null;

class CCCInterface extends React.Component {
    static propTypes = {
        map: PropTypes.object,
        ccc: PropTypes.object,
        zoomToPoint: PropTypes.func,
        zoomToExtent: PropTypes.func,
        changeCCCState: PropTypes.func,
        setCurrentTask: PropTypes.func,
        refreshLayer: PropTypes.func,
        addLayerFeatures: PropTypes.func,
        addThemeSublayer: PropTypes.func,
        removeLayer: PropTypes.func,
    }
    constructor(props) {
        super(props);
        this.reset();
    }
    reset() {
        CccConnection = null;
        CccAppConfig = null;
        this.ready = false;
        this.session = null;
        this.currentContext = null;
    }
    componentDidMount() {
        // If "session" and "appintegration" URL params are set, query configuration
        this.session = UrlParams.getParam('session');
        let appintegration = UrlParams.getParam('appintegration');
        if(this.session && appintegration) {
            this.session = '{' + this.session + '}';
            const cccConfigService = ConfigUtils.getConfigProp("cccConfigService");
            axios.get(cccConfigService + "?app=" + encodeURIComponent(appintegration))
            .then(response => {
                CccAppConfig = response.data;
                document.title = CccAppConfig.title;

                // Load initial layers
                this.loadInitialLayers();

                // Start websocket session
                this.createWebSocket();
            })
            .catch(error => {
                console.log("Failed to query app configuration");
                this.reset();
            });
        }
    }
    loadInitialLayers = () => {
        const searchService = ConfigUtils.getConfigProp("searchServiceUrl");
        let url = searchService.replace(/\/$/g, "") + "/getlayers";
        let params = {layers: CccAppConfig.initialLayers.join(",")};
        axios.get(url, {params: params}).then(response => {
            let layers = response.data;
            if(Array.isArray(layers)) {
                this.props.addThemeSublayer({
                    "sublayers": layers
                });
            }
        }).catch(error => {
            console.log("Failed to load initial layers");
        });
    }
    createWebSocket = () => {
        CccConnection = new WebSocket(CccAppConfig.cccServer);
        CccConnection.onopen = () => {
            if(this.session) {
                let msg = {
                    "apiVersion": "1.0",
                    "method": "connectGis",
                    "session": this.session,
                    "clientName": "Web GIS Client"
                };
                CccConnection.send(JSON.stringify(msg));
            }
        }
        CccConnection.onclose = () => {
            console.log("Connection closed");
            this.reset();
        }
        CccConnection.onerror = (err) => {
            console.log("Connection error: " + err);
            this.reset();
        }
        CccConnection.onmessage = this.processWebSocketMessage;
    }
    processWebSocketMessage = (ev) => {
        let message = {};
        try {
            message = JSON.parse(ev.data);
        } catch(e) {
            console.log("Invalid message: " + ev.data);
        }
        if(/*message.apiVersion !== "1.0" || */!message.method) {
            console.log("Invalid message: " + ev.data);
        }

        if(message.context) {
            this.currentContext = message.context;
        }

        if(message.method == "notifySessionReady") {
            this.ready = true;
        }
        else if(message.method == "notifyError") {
            alert(message.message);
        }
        else if(message.method == "createGeoObject") {
            this.stopEdit();
            if(message.zoomTo !== undefined) {
                this.processZoomTo(message.zoomTo);
            }
            this.props.changeCCCState({action: 'Draw', geomType: CccAppConfig.editGeomType});
            this.props.setCurrentTask('CccEdit');
        }
        else if(message.method == "editGeoObject") {
            this.stopEdit();
            let feature = {
                "type": "Feature",
                "id": uuid.v4(),
                "geometry": message.data
            };
            let extent = new ol.format.GeoJSON().readFeature(feature).getGeometry().getExtent();
            if(extent[0] == extent[2] || extent[1] == extent[3]) {
                let x = 0.5 * (extent[0] + extent[2]);
                let y = 0.5 * (extent[1] + extent[3]);
                let maxZoom = this.getMaxZoomForMinScale(CccAppConfig.minEditScale);
                this.props.zoomToPoint([x, y], maxZoom, "EPSG:2056");
            } else {
                this.props.zoomToExtent(extent, "EPSG:2056");
            }
            this.props.changeCCCState({action: 'Edit', geomType: message.data.type, feature: feature});
            this.props.setCurrentTask('CccEdit');
        }
        else if(message.method === "cancelEditGeoObject") {
            this.stopEdit();
        }
        else if(message.method === "notifyObjectUpdated") {
            this.props.refreshLayer(layer => layer.isThemeLayer);
        }
        else if(message.method === "showGeoObject") {
            let feature = {
                "type": "Feature",
                "id": uuid.v4(),
                "geometry": message.data
            };
            let layer = {
                id: "cccselection",
                role: LayerRole.SELECTION
            };
            this.props.addLayerFeatures(layer, [feature], true);
        }
    }
    processZoomTo = (zoomTo) => {
        const cccConfigService = ConfigUtils.getConfigProp("cccConfigService");
        axios.post(cccConfigService.replace(/\/$/g, "") + '/zoomTo', zoomTo).then(response => {
            if(response.data && response.data.result) {
                let result = response.data.result;
                let maxZoom = this.getMaxZoomForMinScale(result.minScale);

                const newZoom = MapUtils.getZoomForExtent(CoordinatesUtils.reprojectBbox(result.bbox, result.crs, this.props.map.projection), this.props.map.resolutions, this.props.map.size, 0, maxZoom) - 1;
                let center = [0.5 * (result.bbox[0] + result.bbox[2]), 0.5 * (result.bbox[1] + result.bbox[3])]
                this.props.zoomToPoint(center, Math.min(maxZoom, newZoom), result.crs);
                if(result.features) {
                    let layer = {
                        id: "cccselection",
                        role: LayerRole.SELECTION
                    };
                    this.props.addLayerFeatures(layer, result.features, true);
                }
            }
        });
    }
    getMaxZoomForMinScale(minScale) {
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
    render() {
        if(this.props.ccc.action) {
            let buttons = [
                {key: 'Commit', icon: 'ok', label: "editing.commit", extraClasses: "edit-commit"},
                {key: 'Delete', icon: 'trash', label: "editing.delete", extraClasses: "edit-discard"}
            ];
            let msgId = this.props.ccc.action === "Draw" ? "ccc.createObject" : "ccc.editObject";
            return (
                <TaskBar task="CccEdit" onHide={this.stopEdit}>
                    <span role="body">
                        <div><b><Message msgId={msgId} /></b></div>
                        <ButtonBar disabled={!this.props.ccc.changed} buttons={buttons} onClick={action => this.commitEdit(action === 'Delete')}/>
                    </span>
                </TaskBar>
            );
        }
        return null;
    }
    commitEdit = (deleteFeature = false) => {
        CccConnection.send(JSON.stringify({
            "apiVersion": "1.0",
            "method": "notifyEditGeoObjectDone",
            "context": this.currentContext,
            "data": deleteFeature ? null : this.props.ccc.feature.geometry
        }));
        this.stopEdit();
    }
    stopEdit = () => {
        this.props.changeCCCState({action: null, geomType: null});
        this.props.removeLayer('cccselection');
    }
};

const selector = (state) => ({
    map: state.map,
    ccc: state.ccc
});

function CCCAttributeCalculator(layer, feature) {
    if(!CccConnection || !CccAppConfig || !CccAppConfig.notifyLayers || !CccAppConfig.notifyLayers.includes(layer)) {
        return [];
    }
    let clickHandler = (ev) => {
        if(!CccConnection) {
            return;
        }
        CccConnection.send(JSON.stringify({
            "apiVersion": "1.0",
            "method": "notifyGeoObjectSelected",
            "context_list": [feature.properties]
        }));
    }
    return [(
        <tr key="ccc-link">
            <td colSpan="2">
                <a href="#" onClick={clickHandler}>{CccAppConfig.notifyLinkTitle}</a>
            </td>
        </tr>
    )];
}

module.exports = {
    CCCInterfacePlugin: connect(selector, {
        zoomToPoint: zoomToPoint,
        zoomToExtent: zoomToExtent,
        changeCCCState: changeCCCState,
        setCurrentTask: setCurrentTask,
        refreshLayer: refreshLayer,
        addLayerFeatures: addLayerFeatures,
        addThemeSublayer: addThemeSublayer,
        removeLayer: removeLayer,
    })(CCCInterface),
    reducers: {
        ccc: require('./reducers/ccc')
    },
    CCCAttributeCalculator: CCCAttributeCalculator
}
