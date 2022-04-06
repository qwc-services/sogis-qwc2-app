/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const Proj4js = require('proj4').default;
const assign = require('object-assign');
const {SearchProviders, searchProviderFactory} = require('./SearchProviders');
const EditingInterface = require('./EditingInterface');
const CoordinatesUtils = require('qwc2/utils/CoordinatesUtils');
const LayerUtils = require('qwc2/utils/LayerUtils');
const renderHelp = require('./Help');

Proj4js.defs("EPSG:21781", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.4,15.1,405.3,0,0,0,0 +units=m +no_defs");
Proj4js.defs("EPSG:2056", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");
Proj4js.defs('urn:ogc:def:crs:EPSG::2056', Proj4js.defs('EPSG:2056'));
Proj4js.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

CoordinatesUtils.setCrsLabels({
    "EPSG:21781": "CH1903 / LV03",
    "EPSG:2056": "CH1903+ / LV95",
    "EPSG:25832": "ETRS89 / UTM 32N"
});

module.exports = {
    initialState: {
        defaultState: {
            mousePosition: {
                enabled: true
            }
        },
        mobile: {}
    },
    pluginsDef: {
        plugins: {
            MapPlugin: require('qwc2/plugins/Map')({
                EditingSupport: require('qwc2/plugins/map/EditingSupport'),
                MeasurementSupport: require('qwc2/plugins/map/MeasurementSupport'),
                LocateSupport: require('qwc2/plugins/map/LocateSupport'),
                RedliningSupport: require('qwc2/plugins/map/RedliningSupport'),
                ScaleBarSupport: require('qwc2/plugins/map/ScaleBarSupport'),
                SelectionSupport: require('qwc2/plugins/map/SelectionSupport'),
                CCCEditSupport: require('./plugins/CCCEditSupport')
            }),
            HomeButtonPlugin: require('qwc2/plugins/HomeButton'),
            LocateButtonPlugin: require('qwc2/plugins/LocateButton'),
            ZoomInPlugin: require('qwc2/plugins/ZoomButtons'),
            ZoomOutPlugin: require('qwc2/plugins/ZoomButtons'),
            BackgroundSwitcherPlugin: require('qwc2/plugins/BackgroundSwitcher'),
            TopBarPlugin: require('qwc2/plugins/TopBar')({
                 AppMenu: require("qwc2/components/AppMenu"),
                 Search: require("qwc2/components/SearchBox")(SearchProviders, searchProviderFactory),
                 Toolbar: require("qwc2/components/Toolbar"),
                 FullscreenSwitcher: require("qwc2/components/FullscreenSwitcher")
            }),
            BottomBarPlugin: require('qwc2/plugins/BottomBar'),
            MeasurePlugin: require('qwc2/plugins/Measure'),
            ThemeSwitcherPlugin: require('qwc2/plugins/ThemeSwitcher'),
            LayerTreePlugin: require('qwc2/plugins/LayerTree'),
            IdentifyPlugin: require('qwc2/plugins/Identify'),
            MapTipPlugin: require('qwc2/plugins/MapTip'),
            SharePlugin: require('qwc2/plugins/Share'),
            MapCopyrightPlugin: require('qwc2/plugins/MapCopyright'),
            PrintPlugin: require('qwc2/plugins/Print'),
            HelpPlugin: require('qwc2/plugins/Help')(renderHelp),
            RasterExportPlugin: require('qwc2/plugins/RasterExport'),
            RedliningPlugin: require('qwc2/plugins/Redlining')({}),
            EditingPlugin: require('qwc2/plugins/Editing')(EditingInterface),
            MapComparePlugin: require('qwc2/plugins/MapCompare'),
            HeightProfilePlugin: require('qwc2/plugins/HeightProfile'),
            MapInfoTooltipPlugin: require('qwc2/plugins/MapInfoTooltip'),
            AuthenticationPlugin: require('qwc2/plugins/Authentication'),
            LandRegisterExtractPlugin: require('./plugins/LandRegisterExtract'),
            CCCInterfacePlugin: require('./plugins/CCCInterface'),
            PlotInfoToolPlugin: require('qwc2-extra/plugins/PlotInfoTool'),
            AutologinPlugin: require('./Autologin'),
            LoginUser: require('qwc2/plugins/LoginUser')
        },
        cfg: {
            IdentifyPlugin: {
                attributeCalculator: require('./plugins/CCCInterface').CCCAttributeCalculator
            },
            PlotInfoToolPlugin: {
                themeLayerRestorer: require('./themeLayerRestorer'),
                customInfoComponents: {
                    oereb: require('qwc2-extra/components/OerebDocument'),
                    oereb2: require('qwc2-extra/components/Oereb2Document'),
                    plotowner: require('./plugins/PlotOwnerInfo')
                }
            }
        }
    },
    actionLogger: (action, state, oldState) => {
        let blacklist = [
            'ADD_LAYER_FEATURES',
            'CHANGE_BROWSER_PROPERTIES',
            'CHANGE_LOCALE',
            'CHANGE_MAP_VIEW',
            'CHANGE_MEASUREMENT_STATE',
            'CHANGE_MOUSE_POSITION_STATE',
            'CLICK_ON_MAP',
            'IDENTIFY_EMPTY',
            'IDENTIFY_RESPONSE',
            'LOCAL_CONFIG_LOADED',
            'PURGE_IDENTIFY_RESULTS',
            'REMOVE_ALL_LAYERS',
            'REMOVE_LAYER_FEATURES',
            'REPLACE_PLACEHOLDER_LAYER',
            'SET_LAYER_LOADING',
            'SET_CURRENT_TASK_BLOCKED',
            'SET_CURRENT_THEME',
            'SET_IDENTIFY_ENABLED',
            'THEMES_LOADED',
            'TOGGLE_FULLSCREEN'
        ];

        let pushAction = (actionType, data) => {
            // console.log(actionType);
            // console.log(data);
            _paq.push(['trackEvent', 'Action', actionType, JSON.stringify(data)]);
        }

        if(!blacklist.includes(action.type)) {
            let data = assign({}, action);
            delete data['type'];
            let actionType = action.type;
            if(action.type === "LOG_ACTION") {
                delete data['actionType'];
                actionType = action.actionType;
                data = data.data;
            }

            if(actionType === "ADD_THEME_SUBLAYER" || actionType == "ADD_LAYER")
            {
                let layernames = LayerUtils.getSublayerNames(data.layer).filter(x => x);
                for(let layername of layernames) {
                    pushAction("ADD_LAYER", {layername: layername});
                    let sublayer = LayerUtils.searchSubLayer(data.layer, 'name', layername);
                    if(sublayer) {
                        pushAction("CHANGE_LAYER_PROPERTY", {layername: sublayer.name, 'visibility': sublayer.visibility});
                        pushAction("CHANGE_LAYER_PROPERTY", {layername: sublayer.name, 'opacity': sublayer.opacity || 255});
                    }
                }
            }
            else if(actionType === "CHANGE_LAYER_PROPERTY")
            {
                let layer = state.layers.flat.find(layer => layer.uuid === data.layerUuid);
                (data.sublayerpath || []).forEach(idx => { layer = layer.sublayers[idx]; });
                let payload = {layername: layer.name, [data.property]: data.newvalue};
                pushAction("CHANGE_LAYER_PROPERTY", payload);
            }
            else if(actionType === "SET_ACTIVE_LAYERINFO")
            {
                let payload = data.sublayer ? {layername: data.sublayer.name} : null;
                pushAction("SET_ACTIVE_LAYERINFO", payload);
            }
            else if(actionType === "REMOVE_LAYER")
            {
                let layer = oldState.layers.flat.find(layer => layer.id === data.layerId);
                if(layer) {
                    (data.sublayerpath || []).forEach(idx => { layer = layer.sublayers[idx]; });
                    pushAction("REMOVE_LAYER", {"layername": layer.name});
                }
            }
            else
            {
                pushAction(actionType, data);
            }
        }
    },
    themeLayerRestorer: require('./themeLayerRestorer'),
    supportedLocales: {
         "en": {
            code: "en-US",
            description: "English",
            localeData: require('react-intl/locale-data/en')
         },
        "de": {
            code: "de-CH",
            description: "Deutsch",
            localeData: require('react-intl/locale-data/de')
        }
   }
};
