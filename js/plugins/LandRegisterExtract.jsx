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
const isEmpty = require('lodash.isempty');
const Message = require('../../qwc2/MapStore2Components/components/I18N/Message');
const MapUtils = require('../../qwc2/MapStore2Components/utils/MapUtils');
const CoordinatesUtils = require('../../qwc2/MapStore2Components/utils/CoordinatesUtils');
const ConfigUtils = require("../../qwc2/MapStore2Components/utils/ConfigUtils");
const {changeRotation} = require('../../qwc2/QWC2Components/actions/map');
const {SideBar} = require('../../qwc2/QWC2Components/components/SideBar');
const PrintFrame = require('../../qwc2/QWC2Components/components/PrintFrame');
const ToggleSwitch = require('../../qwc2/QWC2Components/components/widgets/ToggleSwitch');

require('./style/LandRegisterExtract.css');

class LandRegisterExtract extends React.Component {
    static propTypes = {
        visible: PropTypes.bool,
        theme: PropTypes.object,
        map: PropTypes.object,
        changeRotation: PropTypes.func,
        layouts: PropTypes.array
    }
    static defaultProps = {
        visible: false,
        layouts: [
            {
                name: "A3-Hoch",
                width: 297,
                height: 420
            },{
                name: "A3-Quer",
                width: 420,
                height: 297
            },{
                name: "A4-Hoch",
                width: 210,
                height: 297,
                default: true
            },{
                name: "A4-Quer",
                width: 297,
                height: 210
            }
        ]
    }
    state = {
        layout: null, scale: null, dpi: 300, initialRotation: 0, grid: false
    }
    componentWillMount() {
        this.setState({layout: this.props.layouts.find(layout => layout.default) || this.props.layouts[0]});
    }
    componentWillReceiveProps(newProps) {
        let newState = assign({}, this.state);
        if(newProps.visible && newProps.visible !== this.props.visible) {
            let scale = Math.round(newProps.map.scales[newProps.map.zoom] / 2);
            if(newProps.theme.printScales && newProps.theme.printScales.length > 0) {
                let closestVal = Math.abs(scale - newProps.theme.printScales[0]);
                let closestIdx = 0;
                for(let i = 1; i < newProps.theme.printScales.length; ++i) {
                    let currVal = Math.abs(scale - newProps.theme.printScales[i]);
                    if(currVal < closestVal) {
                        closestVal = currVal;
                        closestIdx = i;
                    }
                }
                scale = newProps.theme.printScales[closestIdx];
            }
            newState["scale"] = scale;
            newState["initialRotation"] = newProps.map.bbox.rotation;
        }
        this.setState(newState);
    }
    shouldComponentUpdate(newProps, nextState) {
        return newProps.visible || this.props.visible;
    }
    onHide = () => {
        this.props.changeRotation(this.state.initialRotation);
    }
    renderBody = () => {
        if(!this.props.visible || !this.props.theme) {
            return null;
        }
        let currentLayoutname = this.state.layout ? this.state.layout.name : "";

        let formvisibility = 'hidden';
        let action = ConfigUtils.getConfigProp("landRegisterService").replace(/\/$/g, "") + '/print';
        let printDpi = parseInt(this.state.dpi);
        let mapCrs = this.props.map.projection;
        let extent = this.computeCurrentExtent();
        extent = (CoordinatesUtils.getAxisOrder(mapCrs).substr(0, 2) == 'ne') ?
            extent[1] + "," + extent[0] + "," + extent[3] + "," + extent[2] :
            extent.join(',');
        let rotation = this.props.map.bbox ? this.props.map.bbox.rotation : 0;
        let scaleChooser = (<input name="scale" type="number" value={this.state.scale || ""} onChange={this.changeScale} min="1"/>);

        if(this.props.theme.printScales && this.props.theme.printScales.length > 0) {
            scaleChooser = (
                <select name="scale" value={this.state.scale || ""} onChange={this.changeScale}>
                    {this.props.theme.printScales.map(scale => (<option key={scale} value={scale}>{scale}</option>))}
                </select>);
        }
        let resolutionChooser = null;
        let resolutionInput = null;
        if(!isEmpty(this.props.theme.printResolutions)) {
            if(this.props.theme.printResolutions.length > 1) {
                resolutionChooser = (
                    <select name={"DPI"} value={this.state.dpi || ""} onChange={this.changeResolution}>
                        {this.props.theme.printResolutions.map(res => (<option key={res} value={res}>{res}</option>))}
                    </select>);
            } else {
                resolutionInput = (<input name="DPI" readOnly="true" type={formvisibility} value={this.props.theme.printResolutions[0]}/>);
            }
        } else {
            resolutionChooser = (<input name="DPI" type="number" value={this.state.dpi || ""} onChange={this.changeResolution} min="50" max="1200"/>)
        }

        let gridIntervalX = null;
        let gridIntervalY = null;
        let printGrid = this.props.theme.printGrid;
        if(printGrid && printGrid.length > 0 && this.state.scale && this.state.grid) {
            let cur = 0;
            for(; cur < printGrid.length-1 && this.state.scale < printGrid[cur].s; ++cur);
            gridIntervalX = (<input readOnly="true" name={"GRID_INTERVAL_X"} type={formvisibility} value={printGrid[cur].x} />);
            gridIntervalY = (<input readOnly="true" name={"GRID_INTERVAL_Y"} type={formvisibility} value={printGrid[cur].y} />);
        }

        return (
            <div role="body" className="print-body">
                <form action={action} method="POST" target="_blank">
                    <table className="options-table"><tbody>
                        <tr>
                            <td><Message msgId="print.layout" /></td>
                            <td>
                                <select name="TEMPLATE" onChange={this.changeLayout} value={currentLayoutname}>
                                    {this.props.layouts.map(item => {
                                        return (
                                            <option key={item.name} value={item.name}>{item.name}</option>
                                        )
                                    })}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td><Message msgId="print.scale" /></td>
                            <td>
                                <span className="input-frame">
                                    <span>1&nbsp;:&nbsp;</span>
                                    {scaleChooser}
                                </span>
                            </td>
                        </tr>
                        {resolutionChooser ? (
                            <tr>
                                <td><Message msgId="print.resolution" /></td>
                                <td>
                                    <span className="input-frame">
                                        {resolutionChooser}
                                        <span>&nbsp;dpi</span>
                                    </span>
                                </td>
                            </tr>
                        ) : null}
                        <tr>
                            <td><Message msgId="print.rotation" /></td>
                            <td>
                                <span className="input-frame">
                                    <input name="rotation" type="number" value={Math.round(rotation / Math.PI * 180.)} onChange={this.changeRotation}/>
                                </span>
                            </td>
                        </tr>
                        {printGrid ? (
                            <tr>
                                <td><Message msgId="print.grid" /></td>
                                <td>
                                    <ToggleSwitch onChange={(newstate) => this.setState({grid: newstate})} active={this.state.grid} />
                                </td>
                            </tr>
                        ) : null}
                    </tbody></table>
                    <div>
                        <input readOnly="true" name="extent" type={formvisibility} value={extent || ""} />
                        <input readOnly="true" name="SRS" type={formvisibility} value={mapCrs} />
                        {gridIntervalX}
                        {gridIntervalY}
                        {resolutionInput}
                    </div>
                    <div className="button-bar">
                        <button type="submit"><Message msgId="print.submit" /></button>
                    </div>
                </form>
            </div>
        );
    }
    render() {
        let printFrame = null;
        if(this.props.visible && this.state.layout) {
            let frame = {
                width: this.state.scale * this.state.layout.width / 1000.,
                height: this.state.scale * this.state.layout.height / 1000.,
            };
            printFrame = (<PrintFrame map={this.props.map} fixedFrame={frame} />);
        }
        let assetsPath = ConfigUtils.getConfigProp("assetsPath");
        return (
            <div>
                <SideBar id="LandRegisterExtract" onHide={this.onHide} width="20em"
                    title="appmenu.items.LandRegisterExtract"
                    icon={assetsPath + "/img/print_white.svg"}>
                    {this.renderBody()}
                </SideBar>
                {printFrame}
            </div>
        );
    }
    changeLayout = (ev) => {
        let layout = this.props.layouts.find(item => item.name == ev.target.value);
        this.setState({layout: layout});
    }
    changeScale = (ev) => {
        this.setState({scale: ev.target.value});
    }
    changeResolution = (ev) => {
        this.setState({dpi: ev.target.value});
    }
    changeRotation = (ev) => {
        let angle = parseFloat(ev.target.value) || 0;
        while(angle < 0) {
            angle += 360;
        }
        while(angle >= 360) {
            angle -= 360;
        }
        this.props.changeRotation(angle / 180. * Math.PI);
    }
    computeCurrentExtent = () => {
        if(!this.props.map || !this.state.layout || !this.state.scale) {
            return [0, 0, 0, 0];
        }
        let center = this.props.map.center;
        let widthm = this.state.scale * this.state.layout.width / 1000.;
        let heightm = this.state.scale * this.state.layout.height / 1000.;
        let {width, height} = MapUtils.transformExtent(this.props.map.projection, center, widthm, heightm);
        let x1 = center[0]- 0.5 * width;
        let x2 = center[0] + 0.5 * width;
        let y1 = center[1] - 0.5 * height;
        let y2 = center[1] + 0.5 * height;
        return [x1, y1, x2, y2];
    }
};

const selector = (state) => ({
    visible: state.task ? state.task.id === 'LandRegisterExtract': false,
    theme: state.theme ? state.theme.current : null,
    map: state.map ? state.map : null,
    search: state.search
});

module.exports = {
    LandRegisterExtractPlugin: connect(selector, {
        changeRotation: changeRotation
    })(LandRegisterExtract),
    reducers: {
        task: require('../../qwc2/QWC2Components/reducers/task')
    }
}
