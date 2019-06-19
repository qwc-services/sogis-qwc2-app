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
const uuid = require('uuid');
const url = require('url');
const {LayerRole, addLayer, removeLayer} = require('../../qwc2/QWC2Components/actions/layers');
const LayerUtils = require('../../qwc2/QWC2Components/utils/LayerUtils');
const Icon = require('../../qwc2/QWC2Components/components/Icon');
const Message = require("../../qwc2/MapStore2Components/components/I18N/Message");
require('./style/OerebDocument.css');

const DataNS = "http://schemas.geo.admin.ch/V_D/OeREB/1.0/ExtractData";
const Lang = "de";

class OerebDocument extends React.Component {
    static propTypes = {
        layers: PropTypes.array,
        oerebDoc: PropTypes.object,
        addLayer: PropTypes.func,
        removeLayer: PropTypes.func
    }
    state = {
        expandedSection: null,
        expandedTheme: null
    }
    componentWillUnmount() {
        this.removeHighlighLayer();
    }
    render() {
        let extract = this.props.oerebDoc.GetExtractByIdResponse.extract;
        return (
            <div className="oereb-document">
                {this.renderSection("concernedThemes", this.renderConcernedThemes, this.ensureArray(extract.ConcernedTheme))}
                {this.renderSection("notConcernedThemes", this.renderOtherThemes, this.ensureArray(extract.NotConcernedTheme))}
                {this.renderSection("themeWithoutData", this.renderOtherThemes, this.ensureArray(extract.ThemeWithoutData))}
                {this.renderSection("generalInformation", this.renderGeneralInformation, extract)}
            </div>
        );
    }
    renderSection = (name, renderer, data) => {
        if(isEmpty(data)) {
            return null;
        }
        let icon = this.state.expandedSection === name ? 'chevron-up' : 'chevron-down';
        return (
            <div className="oereb-document-section">
                <div className="oereb-document-section-title" onClick={ev => this.toggleSection(name)}>
                    <Message msgId={"oereb." + name} />
                    <span>{data.length}&nbsp;<Icon icon={icon} /></span>
                </div>
                {this.state.expandedSection === name ? renderer(data) : null}
            </div>
        );
    }
    renderConcernedThemes = (themes) => {
        return (
            <div className="oereb-document-section-concerned-themes">
                {themes.map(theme => {
                    let icon = this.state.expandedTheme === theme.Code ? 'chevron-up' : 'chevron-down';
                    return (
                        <div className="oereb-document-theme" key={theme.Code}>
                            <div className="oereb-document-theme-title" onClick={ev => this.toggleTheme(theme.Code)}>
                                <span>{this.localizedText(theme.Text)}</span><Icon icon={icon} />
                            </div>
                            {this.state.expandedTheme === theme.Code ? this.renderTheme(theme.Code) : null}
                        </div>
                    );
                })}
            </div>
        )
    }
    renderTheme = (name) => {
        let extract = this.props.oerebDoc.GetExtractByIdResponse.extract;
        let landOwnRestr = this.ensureArray(extract.RealEstate.RestrictionOnLandownership);
        let entries = landOwnRestr.filter(entry => entry.Theme.Code === name);
        let regulations = {};
        let legalbasis = {};
        let respoffices = {};
        for(let entry of entries) {
            for(let prov of this.ensureArray(entry.LegalProvisions)) {
                regulations[prov.OfficialNumber || uuid.v1()] = {
                    label: this.localizedText(prov.Title) + (prov.OfficialNumber ? ", " + prov.OfficialNumber : ""),
                    link: this.localizedText(prov.TextAtWeb)
                };
                for(let ref of this.ensureArray(prov.Reference)) {
                    legalbasis[ref.OfficialNumber || uuid.v1()] = {
                        label: this.localizedText(ref.Title) + " (" + this.localizedText(ref.Abbreviation) + ")" + (ref.OfficialNumber ? ", " + ref.OfficialNumber : ""),
                        link: this.localizedText(ref.TextAtWeb)
                    };
                }
            }
            respoffices[entry.ResponsibleOffice.OfficeAtWeb] = {
                label: this.localizedText(entry.ResponsibleOffice.Name),
                link: entry.ResponsibleOffice.OfficeAtWeb
            }
        }
        return (
            <div className="oereb-document-theme-contents">
                <table><tbody>
                    <tr>
                        <th><Message msgId="oereb.type" /></th>
                        <th></th>
                        <th><Message msgId="oereb.area" /></th>
                        <th><Message msgId="oereb.perc" /></th>
                    </tr>
                    {entries.map((entry,idx) => (
                        <tr key={"leg" + idx}>
                            <td>{this.localizedText(entry.Information)}</td>
                            <td><img src={entry.SymbolRef} /></td>
                            {entry.AreaShare ? (<td>{entry.AreaShare}&nbsp;m<sup>2</sup></td>) : (<td>-</td>)}
                            {entry.PartInPercent ? (<td>{entry.PartInPercent + "%"}</td>) : (<td>-</td>)}
                        </tr>
                    ))}
                </tbody></table>
                <h1><Message msgId="oereb.regulations" /></h1>
                <ul>
                    {Object.values(regulations).map((reg,idx) => (
                        <li key={"reg" + idx}>{reg.label}<br /><a href={reg.link}>{reg.link}</a></li>
                    ))}
                </ul>
                <h1><Message msgId="oereb.legalbasis" /></h1>
                <ul>
                    {Object.values(legalbasis).map((leg, idx) => (
                        <li key={"leg" + idx}>{leg.label}<br /><a href={leg.link}>{leg.link}</a></li>
                    ))}
                </ul>
                <h1><Message msgId="oereb.responsibleoffice" /></h1>
                <ul>
                    {Object.values(respoffices).map((rof, idx) => (
                        <li key={"rof" + idx}>{rof.label}<br /><a href={rof.link}>{rof.link}</a></li>
                    ))}
                </ul>
            </div>
        );
    }
    renderOtherThemes = (themes) => {
        return (
            <div className="oereb-document-section-other-themes">
                {themes.map(theme => (<div key={theme.Code}>{this.localizedText(theme.Text)}</div>))}
            </div>
        );
    }
    renderGeneralInformation = (extract) => {
        return (
            <div className="oereb-document-section-general-info">
                <h1><Message msgId="oereb.responsibleauthority" /></h1>
                <table><tbody>
                    <tr>
                        <td rowSpan="4" style={{verticalAlign: 'top'}}><img src={extract.CantonalLogoRef} /></td>
                        <td><b>{this.localizedText(extract.PLRCadastreAuthority.Name)}</b></td>
                    </tr>
                    <tr>
                        <td>{extract.PLRCadastreAuthority.Street} {extract.PLRCadastreAuthority.Number}</td>
                    </tr>
                    <tr>
                        <td>{extract.PLRCadastreAuthority.PostalCode} {extract.PLRCadastreAuthority.City}</td>
                    </tr>
                    <tr>
                        <td><a href={extract.PLRCadastreAuthority.OfficeAtWeb}>{extract.PLRCadastreAuthority.OfficeAtWeb}</a></td>
                    </tr>
                </tbody></table>
                <h1><Message msgId="oereb.fundations" /></h1>
                <p>{this.localizedText(extract.BaseData)}</p>
                <h1><Message msgId="oereb.generalinfo" /></h1>
                <p>{this.localizedText(extract.GeneralInformation)}</p>
                {this.ensureArray(extract.ExclusionOfLiability).map((entry, idx) => [
                    (<h1 key={"disclt" + idx}>{this.localizedText(entry.Title)}</h1>),
                    (<p key={"disclc" + idx}>{this.localizedText(entry.Content)}</p>)
                ])}
            </div>
        );
    }
    toggleSection = (name) => {
        this.setState({
            expandedSection: this.state.expandedSection === name ? null : name,
            expandedTheme: null
        });
    }
    removeHighlighLayer = () => {
        // Remove previous __oereb_highlight layer
        let layer = this.props.layers.find(layer => layer.__oereb_highlight === true);
        if(layer) {
            this.props.removeLayer(layer.id);
        }
    }
    toggleTheme = (name) => {
        let expandedTheme = this.state.expandedTheme === name ? null : name;
        this.setState({
            expandedTheme: expandedTheme
        });
        this.removeHighlighLayer();

        let extract = this.props.oerebDoc.GetExtractByIdResponse.extract;
        let landOwnRestr = extract.RealEstate.RestrictionOnLandownership;
        let entry = landOwnRestr.find(entry => entry.Theme.Code === name);
        if(expandedTheme && entry && entry.Map && entry.Map.ReferenceWMS) {
            let parts = url.parse(entry.Map.ReferenceWMS, true);
            let baseUrl = parts.protocol + '//' + parts.host + parts.pathname;
            let params = parts.query;
            let layer = {
                id: name + Date.now().toString(),
                role: LayerRole.USERLAYER,
                type: "wms",
                name: name,
                title: this.localizedText(entry.Theme.Text),
                legendUrl: baseUrl,
                url: baseUrl,
                version: params.VERSION,
                featureInfoUrl: baseUrl,
                queryable: false,
                boundingBox: params.BBOX,
                visibility: true,
                opacity: 255,
                format: params.FORMAT,
                params: {LAYERS: params.LAYERS},
                __oereb_highlight: true
            };
            this.props.addLayer(layer);
        }
    }
    localizedText = (el) => {
        if(isEmpty(el)) {
            return "";
        }
        if(el.LocalisedText) {
            el = el.LocalisedText;
        }
        if(Array.isArray(el)) {
            let entry = el.find(entry => entry.Language === Lang);
            return entry ? entry.Text : el[0].Text;
        } else {
            return el.Text;
        }
    }
    ensureArray = (el) => {
        return Array.isArray(el) ? el : [el];
    }
};

module.exports = connect(state => ({
    layers: state.layers.flat
}), {
    addLayer: addLayer,
    removeLayer: removeLayer
})(OerebDocument);
