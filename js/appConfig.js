/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {SearchProviders}  from './SearchProviders';
import LayerUtils from 'qwc2/utils/LayerUtils';

import MapPlugin from 'qwc2/plugins/Map';
import EditingSupport from 'qwc2/plugins/map/EditingSupport';
import MeasurementSupport from 'qwc2/plugins/map/MeasurementSupport';
import LocateSupport from 'qwc2/plugins/map/LocateSupport';
import RedliningSupport from 'qwc2/plugins/map/RedliningSupport';
import ScaleBarSupport from 'qwc2/plugins/map/ScaleBarSupport';
import SelectionSupport from 'qwc2/plugins/map/SelectionSupport';
import HomeButtonPlugin from 'qwc2/plugins/HomeButton';
import LocateButtonPlugin from 'qwc2/plugins/LocateButton';
import {ZoomInPlugin, ZoomOutPlugin} from 'qwc2/plugins/ZoomButtons';
import BackgroundSwitcherPlugin from 'qwc2/plugins/BackgroundSwitcher';
import TopBarPlugin from 'qwc2/plugins/TopBar';
import AppMenu from 'qwc2/components/AppMenu';
import SearchBox from 'qwc2/components/SearchBox';
import Toolbar from 'qwc2/components/Toolbar';
import FullscreenSwitcher from 'qwc2/components/FullscreenSwitcher';
import BottomBarPlugin from 'qwc2/plugins/BottomBar';
import MeasurePlugin from 'qwc2/plugins/Measure';
import ThemeSwitcherPlugin from 'qwc2/plugins/ThemeSwitcher';
import LayerTreePlugin from 'qwc2/plugins/LayerTree';
import IdentifyPlugin from 'qwc2/plugins/Identify';
import MapTipPlugin from 'qwc2/plugins/MapTip';
import SharePlugin from 'qwc2/plugins/Share';
import MapCopyrightPlugin from 'qwc2/plugins/MapCopyright';
import PrintPlugin from 'qwc2/plugins/Print';
import HelpPlugin from 'qwc2/plugins/Help';
import RasterExportPlugin from 'qwc2/plugins/RasterExport';
import RedliningPlugin from 'qwc2/plugins/Redlining';
import EditingPlugin from 'qwc2/plugins/Editing';
import MapComparePlugin from 'qwc2/plugins/MapCompare';
import HeightProfilePlugin from 'qwc2/plugins/HeightProfile';
import MapInfoTooltipPlugin from 'qwc2/plugins/MapInfoTooltip';
import AuthenticationPlugin from 'qwc2/plugins/Authentication';
import LoginUserPlugin from 'qwc2/plugins/LoginUser';
import BookmarkPlugin from 'qwc2/plugins/Bookmark';
import AttributeTablePlugin from 'qwc2/plugins/AttributeTable';

import PlotInfoToolPlugin from 'qwc2-extra/plugins/PlotInfoTool';
import Oereb2Document from 'qwc2-extra/components/Oereb2Document';

import AutologinPlugin from './plugins/Autologin';
import CCCEditSupport from './plugins/CCCEditSupport';
import {CCCInterfacePlugin, CCCAttributeCalculator} from './plugins/CCCInterface';
import LandRegisterExtractPlugin from './plugins/LandRegisterExtract';
import PlotOwnerInfo from './plugins/PlotOwnerInfo';

import {themeLayerRestorer} from './themeLayerRestorer';

import defaultLocaleData from '../static/translations/de-CH.json';

export default {
    defaultLocaleData: defaultLocaleData,
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
            MapPlugin: MapPlugin({
                EditingSupport: EditingSupport,
                MeasurementSupport: MeasurementSupport,
                LocateSupport: LocateSupport,
                RedliningSupport: RedliningSupport,
                ScaleBarSupport: ScaleBarSupport,
                SelectionSupport: SelectionSupport,
                CCCEditSupport: CCCEditSupport
            }),
            HomeButtonPlugin: HomeButtonPlugin,
            LocateButtonPlugin: LocateButtonPlugin,
            ZoomInPlugin: ZoomInPlugin,
            ZoomOutPlugin: ZoomOutPlugin,
            BackgroundSwitcherPlugin: BackgroundSwitcherPlugin,
	    BookmarkPlugin: BookmarkPlugin,
	    AttributeTablePlugin: AttributeTablePlugin(/* CustomEditingInterface */),
            TopBarPlugin: TopBarPlugin({
                AppMenu: AppMenu,
                Search: SearchBox(SearchProviders),
                Toolbar: Toolbar,
                FullscreenSwitcher: FullscreenSwitcher
            }),
            BottomBarPlugin: BottomBarPlugin,
            MeasurePlugin: MeasurePlugin,
            ThemeSwitcherPlugin: ThemeSwitcherPlugin,
            LayerTreePlugin: LayerTreePlugin,
            IdentifyPlugin: IdentifyPlugin,
            MapTipPlugin: MapTipPlugin,
            SharePlugin: SharePlugin,
            MapCopyrightPlugin: MapCopyrightPlugin,
            PrintPlugin: PrintPlugin,
            HelpPlugin: HelpPlugin(),
            RasterExportPlugin: RasterExportPlugin,
            RedliningPlugin: RedliningPlugin({}),
            EditingPlugin: EditingPlugin(),
            MapComparePlugin: MapComparePlugin,
            HeightProfilePlugin: HeightProfilePlugin,
            MapInfoTooltipPlugin: MapInfoTooltipPlugin,
            AuthenticationPlugin: AuthenticationPlugin,
            PlotInfoToolPlugin: PlotInfoToolPlugin,
            LandRegisterExtractPlugin: LandRegisterExtractPlugin,
            CCCInterfacePlugin: CCCInterfacePlugin,
            AutologinPlugin: AutologinPlugin,
            LoginUserPlugin: LoginUserPlugin
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
