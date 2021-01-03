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
import isEmpty from 'lodash.isempty';
import axios from 'axios';
import MapUtils from 'qwc2/utils/MapUtils';
import {changeRotation} from 'qwc2/actions/map';
import SideBar from 'qwc2/components/SideBar';
import PrintFrame from 'qwc2/components/PrintFrame';
import ToggleSwitch from 'qwc2/components/widgets/ToggleSwitch';
import ConfigUtils from 'qwc2/utils/ConfigUtils';
import CoordinatesUtils from 'qwc2/utils/CoordinatesUtils';
import LocaleUtils from 'qwc2/utils/LocaleUtils';

import './style/LandRegisterExtract.css';

class LandRegisterExtract extends React.Component {
    static propTypes = {
        changeRotation: PropTypes.func,
        layouts: PropTypes.array,
        map: PropTypes.object,
        theme: PropTypes.object
    }
    state = {
        layouts: [],
        currentLayout: null,
        scale: null,
        dpi: 300,
        initialRotation: 0,
        grid: true
    }
    componentDidMount() {
        // Get available templates
        const query = ConfigUtils.getConfigProp("landRegisterService").replace(/\/$/g, "") + '/templates';
        axios.get(query).then(response => {
            const layouts = response.data || [];
            const currentLayout = layouts.find(layout => layout.default) || (!isEmpty(layouts) ? layouts[0] : null);
            this.setState({layouts, currentLayout});
        }).catch(e => { console.log(e); });
    }
    onShow = () => {
        let scale = Math.round(MapUtils.computeForZoom(this.props.map.scales, this.props.map.zoom) / 2);
        if (this.props.theme.printScales && this.props.theme.printScales.length > 0) {
            let closestVal = Math.abs(scale - this.props.theme.printScales[0]);
            let closestIdx = 0;
            for (let i = 1; i < this.props.theme.printScales.length; ++i) {
                const currVal = Math.abs(scale - this.props.theme.printScales[i]);
                if (currVal < closestVal) {
                    closestVal = currVal;
                    closestIdx = i;
                }
            }
            scale = this.props.theme.printScales[closestIdx];
        }
        this.setState({scale: scale, initialRotation: this.props.map.bbox.rotation});
    }
    onHide = () => {
        this.props.changeRotation(this.state.initialRotation);
    }
    renderBody = () => {
        if (!this.props.theme) {
            return null;
        }
        if (!this.state.currentLayout) {
            return (<div className="print-body" role="body">{LocaleUtils.tr("print.nolayouts")}</div>);
        }
        const currentLayoutname = this.state.currentLayout ? this.state.currentLayout.name : "";

        const formvisibility = 'hidden';
        const action = ConfigUtils.getConfigProp("landRegisterService").replace(/\/$/g, "") + '/print';
        const mapCrs = this.props.map.projection;
        let extent = this.computeCurrentExtent();
        extent = (CoordinatesUtils.getAxisOrder(mapCrs).substr(0, 2) === 'ne') ?
            extent[1] + "," + extent[0] + "," + extent[3] + "," + extent[2] :
            extent.join(',');
        const rotation = this.props.map.bbox ? this.props.map.bbox.rotation : 0;
        let scaleChooser = (<input min="1" name="scale" onChange={this.changeScale} type="number" value={this.state.scale || ""}/>);

        if (this.props.theme.printScales && this.props.theme.printScales.length > 0) {
            scaleChooser = (
                <select name="scale" onChange={this.changeScale} value={this.state.scale || ""}>
                    {this.props.theme.printScales.map(scale => (<option key={scale} value={scale}>{scale}</option>))}
                </select>);
        }
        let resolutionChooser = null;
        let resolutionInput = null;
        if (!isEmpty(this.props.theme.printResolutions)) {
            if (this.props.theme.printResolutions.length > 1) {
                resolutionChooser = (
                    <select name={"DPI"} onChange={this.changeResolution} value={this.state.dpi || ""}>
                        {this.props.theme.printResolutions.map(res => (<option key={res} value={res}>{res}</option>))}
                    </select>);
            } else {
                resolutionInput = (<input name="DPI" readOnly type={formvisibility} value={this.props.theme.printResolutions[0]}/>);
            }
        } else {
            resolutionChooser = (<input max="1200" min="50" name="DPI" onChange={this.changeResolution} type="number" value={this.state.dpi || ""} />);
        }

        let gridIntervalX = null;
        let gridIntervalY = null;
        const printGrid = this.props.theme.printGrid;
        if (printGrid && printGrid.length > 0 && this.state.scale && this.state.grid) {
            let cur = 0;
            for (; cur < printGrid.length - 1 && this.state.scale < printGrid[cur].s; ++cur);
            gridIntervalX = (<input name={"GRID_INTERVAL_X"} readOnly type={formvisibility} value={printGrid[cur].x} />);
            gridIntervalY = (<input name={"GRID_INTERVAL_Y"} readOnly type={formvisibility} value={printGrid[cur].y} />);
        }

        return (
            <div className="print-body" role="body">
                <form action={action} method="POST" target="_blank">
                    <table className="options-table"><tbody>
                        <tr>
                            <td>{LocaleUtils.tr("print.layout")}</td>
                            <td>
                                <select name="TEMPLATE" onChange={this.changeLayout} value={currentLayoutname}>
                                    {this.state.layouts.map(item => {
                                        return (
                                            <option key={item.name} value={item.name}>{item.name}</option>
                                        );
                                    })}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>{LocaleUtils.tr("print.scale")}</td>
                            <td>
                                <span className="input-frame">
                                    <span>1&nbsp;:&nbsp;</span>
                                    {scaleChooser}
                                </span>
                            </td>
                        </tr>
                        {resolutionChooser ? (
                            <tr>
                                <td>{LocaleUtils.tr("print.resolution")}</td>
                                <td>
                                    <span className="input-frame">
                                        {resolutionChooser}
                                        <span>&nbsp;dpi</span>
                                    </span>
                                </td>
                            </tr>
                        ) : null}
                        <tr>
                            <td>{LocaleUtils.tr("print.rotation")}</td>
                            <td>
                                <span className="input-frame">
                                    <input name="rotation" onChange={this.changeRotation} type="number" value={Math.round(rotation / Math.PI * 180)}/>
                                </span>
                            </td>
                        </tr>
                        {printGrid ? (
                            <tr>
                                <td>{LocaleUtils.tr("print.grid")}</td>
                                <td>
                                    <ToggleSwitch active={this.state.grid} onChange={(newstate) => this.setState({grid: newstate})} />
                                </td>
                            </tr>
                        ) : null}
                    </tbody></table>
                    <div>
                        <input name="extent" readOnly type={formvisibility} value={extent || ""} />
                        <input name="SRS" readOnly type={formvisibility} value={mapCrs} />
                        {gridIntervalX}
                        {gridIntervalY}
                        {resolutionInput}
                    </div>
                    <div className="button-bar">
                        <button className="button" type="submit">{LocaleUtils.tr("print.submit")}</button>
                    </div>
                </form>
            </div>
        );
    }
    renderPrintFrame = () => {
        let printFrame = null;
        if (this.state.currentLayout) {
            const frame = {
                width: this.state.scale * this.state.currentLayout.map.width / 1000,
                height: this.state.scale * this.state.currentLayout.map.height / 1000
            };
            printFrame = (<PrintFrame fixedFrame={frame} map={this.props.map} />);
        }
        return printFrame;
    }
    render() {
        return (
            <SideBar icon="print" id="LandRegisterExtract" onHide={this.onHide}
                onShow={this.onShow} title="appmenu.items.LandRegisterExtract" width="20em">
                {() => ({
                    body: this.renderBody(),
                    extra: this.renderPrintFrame()
                })}
            </SideBar>
        );
    }
    changeLayout = (ev) => {
        const currentLayout = this.state.layouts.find(item => item.name === ev.target.value);
        this.setState({currentLayout: currentLayout});
    }
    changeScale = (ev) => {
        this.setState({scale: ev.target.value});
    }
    changeResolution = (ev) => {
        this.setState({dpi: ev.target.value});
    }
    changeRotation = (ev) => {
        let angle = parseFloat(ev.target.value) || 0;
        while (angle < 0) {
            angle += 360;
        }
        while (angle >= 360) {
            angle -= 360;
        }
        this.props.changeRotation(angle / 180 * Math.PI);
    }
    computeCurrentExtent = () => {
        if (!this.props.map || !this.state.currentLayout || !this.state.scale) {
            return [0, 0, 0, 0];
        }
        const center = this.props.map.center;
        const widthm = this.state.scale * this.state.currentLayout.map.width / 1000;
        const heightm = this.state.scale * this.state.currentLayout.map.height / 1000;
        const {width, height} = MapUtils.transformExtent(this.props.map.projection, center, widthm, heightm);
        const x1 = center[0] - 0.5 * width;
        const x2 = center[0] + 0.5 * width;
        const y1 = center[1] - 0.5 * height;
        const y2 = center[1] + 0.5 * height;
        return [x1, y1, x2, y2];
    }
}

const selector = (state) => ({
    theme: state.theme ? state.theme.current : null,
    map: state.map ? state.map : null,
    search: state.search
});

export default connect(selector, {
    changeRotation: changeRotation
})(LandRegisterExtract);
