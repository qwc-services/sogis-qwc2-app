/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import AppMenu from 'qwc2/components/AppMenu';
import FullscreenSwitcher from 'qwc2/components/FullscreenSwitcher';
import SearchBox from 'qwc2/components/SearchBox';
import Toolbar from 'qwc2/components/Toolbar';
import APIPlugin from 'qwc2/plugins/API';
import AttributeTablePlugin from 'qwc2/plugins/AttributeTable';
import AuthenticationPlugin from 'qwc2/plugins/Authentication';
import BackgroundSwitcherPlugin from 'qwc2/plugins/BackgroundSwitcher';
import BookmarkPlugin from 'qwc2/plugins/Bookmark';
import EditingPlugin from 'qwc2/plugins/Editing';
import HeightProfilePlugin from 'qwc2/plugins/HeightProfile';
import HelpPlugin from 'qwc2/plugins/Help';
import HomeButtonPlugin from 'qwc2/plugins/HomeButton';
import IdentifyPlugin from 'qwc2/plugins/Identify';
import LayerTreePlugin from 'qwc2/plugins/LayerTree';
import LocateButtonPlugin from 'qwc2/plugins/LocateButton';
import LoginUserPlugin from 'qwc2/plugins/LoginUser';
import MapPlugin from 'qwc2/plugins/Map';
import MapComparePlugin from 'qwc2/plugins/MapCompare';
import MapCopyrightPlugin from 'qwc2/plugins/MapCopyright';
import MapExportPlugin from 'qwc2/plugins/MapExport';
import MapFilterPlugin from 'qwc2/plugins/MapFilter';
import MapInfoTooltipPlugin from 'qwc2/plugins/MapInfoTooltip';
import MapLegendPlugin from 'qwc2/plugins/MapLegend';
import MapTipPlugin from 'qwc2/plugins/MapTip';
import MeasurePlugin from 'qwc2/plugins/Measure';
import NewsPopupPlugin from 'qwc2/plugins/NewsPopup';
import PrintPlugin from 'qwc2/plugins/Print';
import RedliningPlugin from 'qwc2/plugins/Redlining';
import SharePlugin from 'qwc2/plugins/Share';
import StartupMarkerPlugin from 'qwc2/plugins/StartupMarker';
import ThemeSwitcherPlugin from 'qwc2/plugins/ThemeSwitcher';
import TimeManagerPlugin from 'qwc2/plugins/TimeManager';
import {ZoomInPlugin, ZoomOutPlugin} from 'qwc2/plugins/ZoomButtons';
import EditingSupport from 'qwc2/plugins/map/EditingSupport';
import LocateSupport from 'qwc2/plugins/map/LocateSupport';
import MeasurementSupport from 'qwc2/plugins/map/MeasurementSupport';
import RedliningSupport from 'qwc2/plugins/map/RedliningSupport';
import ScaleBarSupport from 'qwc2/plugins/map/ScaleBarSupport';
import SnappingSupport from 'qwc2/plugins/map/SnappingSupport';
import LayerUtils from 'qwc2/utils/LayerUtils';
import Oereb2Document from 'qwc2-extra/components/Oereb2Document';
import PlotInfoToolPlugin from 'qwc2-extra/plugins/PlotInfoTool';

import defaultLocaleData from '../static/translations/de-CH.json';
import {renderHelp} from './Help';
import CCCEditSupport from './plugins/CCCEditSupport';
import {CCCInterfacePlugin, CCCAttributeCalculator} from './plugins/CCCInterface';
import LandRegisterExtractPlugin from './plugins/LandRegisterExtract';
import LegendPrintPlugin from './plugins/LegendPrint';
import PlotOwnerInfo from './plugins/PlotOwnerInfo';
import SoBottomBarPlugin from './plugins/SoBottomBar';
import SoTopBarPlugin from './plugins/SoTopBar';
import {themeLayerRestorer} from './themeLayerRestorer';

export default {
    defaultLocaleData: defaultLocaleData,
    initialState: {
        defaultState: {},
        mobile: {}
    },
    pluginsDef: {
        plugins: {
            APIPlugin: APIPlugin,
            MapPlugin: MapPlugin({
                EditingSupport: EditingSupport,
                MeasurementSupport: MeasurementSupport,
                LocateSupport: LocateSupport,
                RedliningSupport: RedliningSupport,
                ScaleBarSupport: ScaleBarSupport,
                CCCEditSupport: CCCEditSupport,
                SnappingSupport: SnappingSupport
            }),
            HomeButtonPlugin: HomeButtonPlugin,
            LocateButtonPlugin: LocateButtonPlugin,
            ZoomInPlugin: ZoomInPlugin,
            ZoomOutPlugin: ZoomOutPlugin,
            BackgroundSwitcherPlugin: BackgroundSwitcherPlugin,
            BookmarkPlugin: BookmarkPlugin,
            AttributeTablePlugin: AttributeTablePlugin(/* CustomEditingInterface */),
            TopBarPlugin: SoTopBarPlugin({
                AppMenu: AppMenu,
                Search: SearchBox,
                Toolbar: Toolbar,
                FullscreenSwitcher: FullscreenSwitcher
            }),
            BottomBarPlugin: SoBottomBarPlugin,
            MeasurePlugin: MeasurePlugin,
            NewsPopupPlugin: NewsPopupPlugin,
            ThemeSwitcherPlugin: ThemeSwitcherPlugin,
            LayerTreePlugin: LayerTreePlugin,
            IdentifyPlugin: IdentifyPlugin,
            MapTipPlugin: MapTipPlugin,
            SharePlugin: SharePlugin,
            StartupMarkerPlugin: StartupMarkerPlugin,
            MapCopyrightPlugin: MapCopyrightPlugin,
            PrintPlugin: PrintPlugin,
            HelpPlugin: HelpPlugin(renderHelp),
            MapExportPlugin: MapExportPlugin,
            RedliningPlugin: RedliningPlugin({}),
            EditingPlugin: EditingPlugin(),
            MapComparePlugin: MapComparePlugin,
            HeightProfilePlugin: HeightProfilePlugin,
            MapInfoTooltipPlugin: MapInfoTooltipPlugin(),
            MapLegendPlugin: MapLegendPlugin,
            AuthenticationPlugin: AuthenticationPlugin,
            PlotInfoToolPlugin: PlotInfoToolPlugin,
            LandRegisterExtractPlugin: LandRegisterExtractPlugin,
            CCCInterfacePlugin: CCCInterfacePlugin,
            LoginUserPlugin: LoginUserPlugin,
            LegendPrintPlugin: LegendPrintPlugin
        },
        cfg: {
            IdentifyPlugin: {
                attributeCalculator: CCCAttributeCalculator
            },
            PlotInfoToolPlugin: {
                themeLayerRestorer: themeLayerRestorer,
                customInfoComponents: {
                    oereb2: Oereb2Document,
                    plotowner: PlotOwnerInfo
                }
            }
        }
    },
    actionLogger: (action, state, oldState) => {
        if (typeof _paq === 'undefined') {
            return;
        }
        const blacklist = [
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

        const pushAction = (actionType, data) => {
            // console.log(actionType);
            // console.log(data);
            _paq.push(['trackEvent', 'Action', actionType, JSON.stringify(data)]);
        };

        if (!blacklist.includes(action.type)) {
            let data = {...action};
            delete data.type;
            let actionType = action.type;
            if (action.type === "LOG_ACTION") {
                delete data.actionType;
                actionType = action.actionType;
                data = data.data;
            }

            if (actionType === "ADD_THEME_SUBLAYER" || actionType === "ADD_LAYER") {
                const layernames = LayerUtils.getSublayerNames(data.layer).filter(x => x);
                for (const layername of layernames) {
                    pushAction("ADD_LAYER", {layername: layername});
                    const sublayer = LayerUtils.searchSubLayer(data.layer, 'name', layername);
                    if (sublayer) {
                        pushAction("CHANGE_LAYER_PROPERTY", {layername: sublayer.name, visibility: sublayer.visibility});
                        pushAction("CHANGE_LAYER_PROPERTY", {layername: sublayer.name, opacity: sublayer.opacity || 255});
                    }
                }
            } else if (actionType === "CHANGE_LAYER_PROPERTY") {
                let layer = state.layers.flat.find(l => l.uuid === data.layerUuid);
                (data.sublayerpath || []).forEach(idx => { layer = layer.sublayers[idx]; });
                const payload = {layername: layer.name, [data.property]: data.newvalue};
                pushAction("CHANGE_LAYER_PROPERTY", payload);
            } else if (actionType === "SET_ACTIVE_LAYERINFO") {
                const payload = data.sublayer ? {layername: data.sublayer.name} : null;
                pushAction("SET_ACTIVE_LAYERINFO", payload);
            } else if (actionType === "REMOVE_LAYER") {
                let layer = oldState.layers.flat.find(l => l.id === data.layerId);
                if (layer) {
                    (data.sublayerpath || []).forEach(idx => { layer = layer.sublayers[idx]; });
                    pushAction("REMOVE_LAYER", {layername: layer.name});
                }
            } else {
                pushAction(actionType, data);
            }
        }
    },
    themeLayerRestorer: themeLayerRestorer
};
