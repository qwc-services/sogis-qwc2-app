/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import {connect} from 'react-redux';

import axios from 'axios';
import isEmpty from 'lodash.isempty';
import PropTypes from 'prop-types';
import Icon from 'qwc2/components/Icon';
import PrintSelection from 'qwc2/components/PrintSelection';
import SideBar from 'qwc2/components/SideBar';
import EditableSelect from 'qwc2/components/widgets/EditableSelect';
import InputContainer from 'qwc2/components/widgets/InputContainer';
import NumberInput from 'qwc2/components/widgets/NumberInput';
import ToggleSwitch from 'qwc2/components/widgets/ToggleSwitch';
import ConfigUtils from 'qwc2/utils/ConfigUtils';
import CoordinatesUtils from 'qwc2/utils/CoordinatesUtils';
import LocaleUtils from 'qwc2/utils/LocaleUtils';
import MapUtils from 'qwc2/utils/MapUtils';

import './style/LandRegisterExtract.css';

class LandRegisterExtract extends React.Component {
    static propTypes = {
        layouts: PropTypes.array,
        map: PropTypes.object,
        theme: PropTypes.object
    };
    state = {
        layouts: [],
        currentLayout: null,
        dpi: 300,
        grid: true,
        center: null,
        extents: [],
        layout: null,
        rotation: 0,
        scale: 0
    };
    componentDidMount() {
        // Get available templates
        const query = ConfigUtils.getConfigProp("landRegisterService").replace(/\/$/g, "") + '/templates';
        axios.get(query).then(response => {
            const layouts = response.data || [];
            const currentLayout = layouts.find(layout => layout.default) || (!isEmpty(layouts) ? layouts[0] : null);
            this.setState({layouts, currentLayout});
        }).catch(e => {
            /* eslint-disable-next-line */
            console.log(e);
        });
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
        this.setState({scale: scale, center: null, rotation: 0});
    };
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
        const extent = this.formatExtent(this.state.extents.at(0) ?? [0, 0, 0, 0]);
        let scaleChooser = (<NumberInput min={1} mobile name="scale" onChange={this.changeScale} prefix="1 : " value={this.state.scale || null}/>);

        if (this.props.theme.printScales && this.props.theme.printScales.length > 0) {
            scaleChooser = (
                <InputContainer>
                    <span role="prefix">1&nbsp;:&nbsp;</span>
                    <EditableSelect
                        name={"scale"} onChange={this.changeScale}
                        options={this.props.theme.printScales} role="input" value={this.state.scale || ""}
                    />
                </InputContainer>
            );
        }
        let resolutionChooser = null;
        let resolutionInput = null;
        if (!isEmpty(this.props.theme.printResolutions)) {
            if (this.props.theme.printResolutions.length > 1) {
                resolutionChooser = (
                    <select name={"DPI"} onChange={this.changeResolution} value={this.state.dpi || ""}>
                        {this.props.theme.printResolutions.map(res => (<option key={res} value={res}>{res} dpi</option>))}
                    </select>
                );
            } else {
                resolutionInput = (<input name="DPI" readOnly type={formvisibility} value={this.props.theme.printResolutions[0]} />);
            }
        } else {
            resolutionChooser = (<NumberInput max={1200} min={50} mobile name="DPI" onChange={this.changeResolution} suffix=" dpi" value={this.state.dpi || ""} />);
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
                                {scaleChooser}
                            </td>
                        </tr>
                        {resolutionChooser ? (
                            <tr>
                                <td>{LocaleUtils.tr("print.resolution")}</td>
                                <td>
                                    {resolutionChooser}
                                </td>
                            </tr>
                        ) : null}
                        <tr>
                            <td>{LocaleUtils.tr("print.rotation")}</td>
                            <td>
                                <InputContainer>
                                    <NumberInput decimals={1} mobile name="rotation" onChange={this.changeRotation} role="input" value={this.state.rotation} />
                                    <span role="suffix" style={{transform: "rotate(-" + this.state.rotation + "deg)"}}>
                                        <Icon icon="arrow-up" onClick={() => this.setState({rotation: 0})} title={LocaleUtils.tr("map.resetrotation")} />
                                    </span>
                                </InputContainer>
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
    };
    renderPrintFrame = () => {
        let printFrame = null;
        if (this.state.currentLayout) {
            const frame = {
                width: this.state.currentLayout.map.width,
                height: this.state.currentLayout.map.height
            };
            printFrame = (
                <PrintSelection center={this.state.center || this.props.map.center}
                    fixedFrame={frame} geometryChanged={this.geometryChanged}
                    rotation={this.state.rotation} scale={this.state.scale}
                />
            );
        }
        return printFrame;
    };
    render() {
        return (
            <SideBar icon="print" id="LandRegisterExtract" onShow={this.onShow}
                title={LocaleUtils.tr("appmenu.items.LandRegisterExtract")} width="20em">
                {() => ({
                    body: this.renderBody(),
                    extra: this.renderPrintFrame()
                })}
            </SideBar>
        );
    }
    changeLayout = (ev) => {
        this.setState(state => ({
            currentLayout: state.layouts.find(item => item.name === ev.target.value)
        }));
    };
    changeScale = (value) => {
        this.setState({scale: value});
    };
    changeResolution = (value) => {
        this.setState({dpi: value});
    };
    changeRotation = (value) => {
        const angle = value || 0;
        this.setState({rotation: (angle % 360 + 360) % 360});
    };
    formatExtent = (extent) => {
        const mapCrs = this.props.map.projection;
        const version = this.props.theme.version;

        if (CoordinatesUtils.getAxisOrder(mapCrs).substring(0, 2) === 'ne' && version === '1.3.0') {
            return extent[1] + "," + extent[0] + "," + extent[3] + "," + extent[2];
        }

        return extent.join(',');
    };
    geometryChanged = (center, extents, rotation, scale) => {
        this.setState({
            center: center,
            extents: extents,
            rotation: rotation,
            scale: scale
        });
    };
}

export default connect((state) => ({
    theme: state.theme ? state.theme.current : null,
    map: state.map ? state.map : null,
    search: state.search
}), {

})(LandRegisterExtract);
