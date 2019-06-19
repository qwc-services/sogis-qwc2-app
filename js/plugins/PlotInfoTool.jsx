/**
 * Copyright 2019, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const PropTypes = require('prop-types');
const {connect} = require('react-redux');
const isEmpty = require('lodash.isempty');
const axios = require('axios');
const FileSaver = require('file-saver');
const xml2js = require('xml2js');
const ConfigUtils = require('../../qwc2/MapStore2Components/utils/ConfigUtils');
const {changeSelectionState} = require('../../qwc2/MapStore2Components/actions/selection');
const {setCurrentTask} = require('../../qwc2/QWC2Components/actions/task');
const {LayerRole, addThemeSublayer, addLayerFeatures, removeLayer} = require('../../qwc2/QWC2Components/actions/layers');
const Message = require("../../qwc2/MapStore2Components/components/I18N/Message");
const ResizeableWindow = require('../../qwc2/QWC2Components/components/ResizeableWindow');
const Spinner = require('../../qwc2/QWC2Components/components/Spinner');
const Icon = require('../../qwc2/QWC2Components/components/Icon');
const VectorLayerUtils = require('../../qwc2/QWC2Components/utils/VectorLayerUtils');
const themeLayerRestorer = require('../themeLayerRestorer');
const OerebDocument = require('./OerebDocument');
require('./style/PlotInfoTool.css');


class PlotInfoTool extends React.Component {
    static propTypes = {
        toolLayers: PropTypes.array,
        selection: PropTypes.object,
        mapCrs: PropTypes.string,
        windowSize: PropTypes.object,
        currentTask: PropTypes.string,
        changeSelectionState: PropTypes.func,
        setCurrentTask: PropTypes.func,
        addThemeSublayer: PropTypes.func,
        addLayerFeatures: PropTypes.func,
        removeLayer: PropTypes.func
    }
    static defaultProps = {
        toolLayers: ["ch.gl.cadastre.av_grundbuchplan-bw"],
        infoQueries: [],
        windowSize: {width: 500, height: 800}
    }
    state = {
        plotInfo: null,
        currentPlot: null,
        expandedInfo: null,
        expandedInfoData: null,
        pendingPdfs: []
    }
    componentWillReceiveProps(newProps) {
        if(newProps.currentTask === 'PlotInfoTool' && this.props.currentTask !== 'PlotInfoTool') {
            this.activated();
        } else if(newProps.currentTask !== 'PlotInfoTool' && this.props.currentTask === 'PlotInfoTool') {
            this.deactivated();
        } else if(newProps.currentTask === 'PlotInfoTool' && newProps.selection.point &&
           newProps.selection !== this.props.selection)
        {
            this.queryPointInfo(newProps.selection.point);
        }
    }
    componentDidUpdate(prevState) {
        if(this.state.plotInfo) {
            if(this.state.currentPlot !== prevState.currentPlot) {
                let layer = {
                    id: "plotselection",
                    role: LayerRole.SELECTION
                };
                let wkt = this.state.plotInfo[this.state.currentPlot].geom;
                let feature = VectorLayerUtils.wktToGeoJSON(wkt, "EPSG:2056", this.props.mapCrs);
                this.props.addLayerFeatures(layer, [feature], true);
            }
        } else {
            this.props.removeLayer("plotselection");
        }
    }
    render() {
        if(!this.state.plotInfo || this.state.plotInfo.length === 0) {
            return null;
        }
        return (
            <ResizeableWindow title="appmenu.items.PlotInfoTool" icon="plot_info"
                onClose={() => this.props.setCurrentTask(null)} scrollable={true}
                initialX={0} initialY={0}
                initialWidth={this.props.windowSize.width} initialHeight={this.props.windowSize.height}
            >
                {this.renderBody()}
            </ResizeableWindow>
        );
    }
    renderBody = () => {
        let plotServiceUrl = ConfigUtils.getConfigProp("plotInfoService").replace(/\/$/, '');
        let plot = this.state.plotInfo[this.state.currentPlot];
        let infoQueries = [...this.props.infoQueries, {
            key: "oereb",
            title: "ÖREB-Informationen",
            query: "/oereb/xml/$egrid$",
            responseTransform: this.oerebXmlToJson,
            pdfQuery: "/oereb/pdf/$egrid$"
        }];
        return (
            <div role="body" className="plot-info-dialog-body">
                <div className="plot-info-dialog-header">
                    {this.state.plotInfo.length > 1 ? (
                        <select value={this.state.currentPlot} onChange={ev => this.setState({currentPlot: ev.target.value})}>
                            {this.state.plotInfo.map((entry, idx) => (
                                <option key={"plot" + idx} value={idx}>{entry.label}</option>
                            ))}
                        </select>
                    ) : null}
                    <table><tbody>
                        {plot.fields.map(entry => (
                            <tr key={entry.key}>
                                <td>{entry.key}</td><td>{entry.value}</td>
                            </tr>
                        ))}
                    </tbody></table>
                </div>
                <div className="plot-info-dialog-queries">
                    {infoQueries.map((entry,idx) => {
                        let query = plotServiceUrl + entry.query.replace('$egrid$', plot.egrid);
                        let pdfQuery = entry.pdfQuery ? plotServiceUrl + entry.pdfQuery.replace('$egrid$', plot.egrid) : null;
                        return (
                            <div key={entry.key} className="plot-info-dialog-query">
                                <div className="plot-info-dialog-query-title" onClick={() => this.toggleEgridInfo(entry, query)}>
                                    <Icon icon={this.state.expandedInfo === entry.key ? "collapse" : "expand"} />
                                    <span>{entry.title}</span>
                                    {entry.pdfQuery ?
                                        this.state.pendingPdfs.includes(pdfQuery) ? (<Spinner />) :
                                        (<Icon icon="pdf" onClick={ev => this.queryPdf(ev, entry, pdfQuery)} />)
                                     : null}
                                </div>
                                {this.state.expandedInfo === entry.key ? (
                                    <div>
                                        {!this.state.expandedInfoData ? this.renderWait() : this.renderInfoData()}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
        )
    }
    renderWait = () => {
        return (
            <div className="plot-info-dialog-query-loading">
                <Spinner />
                <Message msgId="plotinfotool.loading" />
            </div>
        );
    }
    renderInfoData = () => {
        if(this.state.expandedInfo === 'oereb') {
            return (<OerebDocument oerebDoc={this.state.expandedInfoData} />);
        } else {
            let assetsPath = ConfigUtils.getConfigProp("assetsPath");
            let src = assetsPath + "/templates/blank.html";
            return (
                <iframe className="plot-info-dialog-query-result" src={src} onLoad={ev => this.setIframeContent(ev.target, this.state.expandedInfoData)}></iframe>
            );
        }
        return null;
    }
    setIframeContent = (iframe, html) => {
        if(!iframe.getAttribute("identify-content-set")) {
            iframe.setAttribute("identify-content-set", true);
            var doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(html);
            doc.close();
            iframe.height = doc.body.scrollHeight + "px";
        }
    }
    activated = () => {
        let assetsPath = ConfigUtils.getConfigProp("assetsPath");
        this.props.changeSelectionState({geomType: 'Point', style: 'marker', styleOptions: {
            iconSrc: assetsPath + '/img/plot-info-marker.png',
            iconAnchor: [0.5, 0.5]
        }});
        themeLayerRestorer(this.props.toolLayers, null, layers => {
            this.props.addThemeSublayer({sublayers: layers});
        });
    }
    deactivated = () => {
        this.setState({plotInfo: null, currentPlot: null, expandedInfo: null, expandedInfoData: null, pendingPdfs: []});
        this.props.changeSelectionState({geomType: null});
    }
    queryPointInfo = (point) => {
        let serviceUrl = ConfigUtils.getConfigProp("plotInfoService").replace(/\/$/, '') + '/';
        let params = {
            x: point[0],
            y: point[1]
        };
        axios.get(serviceUrl, {params}).then(response => {
            this.setState({plotInfo: response.data.plots, currentPlot: 0, expandedInfo: null, expandedInfoData: null});
        }).catch(e => {});
    }
    queryPdf = (ev, infoEntry, queryUrl) => {
        ev.stopPropagation();
        this.setState({pendingPdfs: [...this.state.pendingPdfs, queryUrl]});
        axios.get(queryUrl).then(response => {
            let contentType = response.headers["content-type"];
            FileSaver.saveAs(new Blob([response.data], {type: contentType}), infoEntry.title + '.pdf');
            this.setState({pendingPdfs: this.state.pendingPdfs.filter(entry => entry !== queryUrl)});
        }).catch(e => {
            this.setState({pendingPdfs: this.state.pendingPdfs.filter(entry => entry !== queryUrl)});
            alert("Print failed");
        });
    }
    toggleEgridInfo = (infoEntry, queryUrl) => {
        if(this.state.expandedInfo === infoEntry.key) {
            this.setState({expandedInfo: null, expandedInfoData: null});
        } else {
            this.setState({expandedInfo: infoEntry.key, expandedInfoData: null});
            axios.get(queryUrl).then(response => {
                let data = infoEntry.responseTransform ? infoEntry.responseTransform(response.data) : response.data;
                this.setState({expandedInfoData: data});
            }).catch(e => {});
        }
    }
    oerebXmlToJson = (xml) => {
        let json;
        let options = {
            tagNameProcessors: [xml2js.processors.stripPrefix],
            valueProcessors: [(text) => decodeURIComponent(text)],
            explicitArray: false
        };
        xml2js.parseString(xml, options, (err, result) => {
            json = result;
        });
        // Case sensitivity difference between XML and JSON
        json.GetExtractByIdResponse.extract = json.GetExtractByIdResponse.Extract;
        return json;
    }
};

const selector = state => ({
    selection: state.selection,
    mapCrs: state.map.projection,
    currentTask: state.task.id
});

module.exports = {
    PlotInfoToolPlugin: connect(
        selector,
        {
            changeSelectionState: changeSelectionState,
            setCurrentTask: setCurrentTask,
            addThemeSublayer: addThemeSublayer,
            addLayerFeatures: addLayerFeatures,
            removeLayer: removeLayer
        }
    )(PlotInfoTool),
    reducers: {
        selection: require('../../qwc2/MapStore2Components/reducers/selection')
    }
};
