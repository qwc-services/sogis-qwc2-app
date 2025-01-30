/**
 * Copyright 2025 Sourcepole AG
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import {connect} from 'react-redux';

import PropTypes from 'prop-types';
import {setCurrentTask} from 'qwc2/actions/task';
import ResizeableWindow from 'qwc2/components/ResizeableWindow';
import LayerUtils from 'qwc2/utils/LayerUtils';
import LocaleUtils from 'qwc2/utils/LocaleUtils';
import MapUtils from 'qwc2/utils/MapUtils';
import MiscUtils from 'qwc2/utils/MiscUtils';


class LegendPrint extends React.Component {
    static propTypes = {
        /** Whether to display a BBOX dependent legend. Can be `true|false|"theme"`, latter means only for theme layers. */
        bboxDependentLegend: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
        enabled: PropTypes.bool,
        /** Additional parameters to pass to the GetLegendGraphics request. */
        extraLegendParameters: PropTypes.string,
        layers: PropTypes.array,
        map: PropTypes.object,
        mapScale: PropTypes.number,
        /** Whether to display a scale dependent legend. Can be `true|false|"theme"`, latter means only for theme layers. */
        scaleDependentLegend: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
        setCurrentTask: PropTypes.func,
        /** Template location for the legend print functionality */
        templatePath: PropTypes.string
    };
    static defaultProps = {
        templatePath: ":/templates/legendprint.html"
    };
    render() {
        if (!this.props.enabled) {
            return null;
        }
        const setLegendPrintContents = (el) => {
            if (!el) {
                return;
            }
            el.addEventListener('load', () => {
                const container = el.contentWindow.document.getElementById("legendcontainer");
                if (container) {
                    let body = '<p id="legendcontainerbody">';
                    body += this.props.layers.map(layer => {
                        if (!layer.visibility) {
                            return "";
                        } else if (layer.legendUrl) {
                            return this.printLayerLegend(layer, layer);
                        } else if (layer.color) {
                            return '<div class="legend-entry"><span style="display: inline-block; width: 1em; height: 1em; box-shadow: inset 0 0 0 1000px ' + layer.color + '; margin: 0.25em; border: 1px solid black;">&nbsp;</span>' + (layer.title || layer.name) + '</div>';
                        } else {
                            return "";
                        }
                    }).join("");
                    body += "</p>";
                    container.innerHTML = body;
                } else {
                    this.legendPrintWindow.document.body.innerHTML = "Broken template. An element with id=legendcontainer must exist.";
                }
            });
        };
        const printLegend = (ev) => {
            ev.target.parentElement.parentElement.getElementsByTagName('iframe')[0].contentWindow.print();
        };

        return (
            <ResizeableWindow icon="print" initialHeight={0.75 * window.innerHeight}
                initialWidth={0.5 * window.innerWidth}
                onClose={() => this.props.setCurrentTask(null)}
                title={LocaleUtils.tr("layertree.printlegend")}
            >
                <div className="layertree-legend-print-body" role="body">
                    <iframe ref={setLegendPrintContents} src={MiscUtils.resolveAssetsPath(this.props.templatePath)} />
                    <div className="layertree-legend-print-body-buttonbar">
                        <button onClick={printLegend}>{LocaleUtils.tr("layertree.printlegend")}</button>
                    </div>
                </div>
            </ResizeableWindow>
        );
    }
    printLayerLegend = (layer, sublayer) => {
        let body = "";
        if (sublayer.sublayers) {
            if (sublayer.visibility) {
                body = '<div class="legend-group">' +
                       '<h3 class="legend-group-title">' + (sublayer.title || sublayer.name) + '</h3>' +
                       '<div class="legend-group-body">' +
                       sublayer.sublayers.map(subsublayer => this.printLayerLegend(layer, subsublayer)).join("\n") +
                       '</div>' +
                       '</div>';
            }
        } else {
            if (sublayer.visibility && LayerUtils.layerScaleInRange(sublayer, this.props.mapScale)) {
                const request = LayerUtils.getLegendUrl(layer, {name: sublayer.name}, this.props.mapScale, this.props.map, this.props.bboxDependentLegend, this.props.scaleDependentLegend, this.props.extraLegendParameters);
                body = request ? '<div class="legend-entry"><img src="' + request + '" /></div>' : "";
            }
        }
        return body;
    };
}

export default connect(state => ({
    enabled: state.task.id === "LegendPrint",
    layers: state.layers.flat,
    map: state.map,
    mapScale: MapUtils.computeForZoom(state.map.scales, state.map.zoom)
}), {
    setCurrentTask: setCurrentTask
})(LegendPrint);
