/**
 * Copyright 2019, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const PropTypes = require('prop-types');

require('./style/PlotOwnerInfo.css');

class PlotOwnerInfo extends React.Component {
    static propTypes = {
        data: PropTypes.object // PropType according to format of data returned by the specified query URL
    }
    state = {
        expandedPlot: null
    }
    render() {
        if (this.props.data.eigentum) {
            // show owner info
            const data = this.props.data.eigentum;
            let collapsible = (data.eigentumsform || '').includes("Stockwerk");
            return (
                <div className="owner-info">
                    <table>
                        <tbody>
                            <tr>
                                <td className="owner-info-first-column">Eigentumsform</td>
                                <td className="owner-info-second-column">{data.eigentumsform}</td>
                            </tr>
                            <tr>
                                <td className="owner-info-first-column">Eigentümer</td>
                                <td className="owner-info-second-column">
                                    <div className="owner-info-owners">
                                        {data.eigentuemer.map(eigentuemer => this.renderOwner(eigentuemer, collapsible))}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );
        }
        else {
            // show error message
            return (
                <div className="owner-info">
                    <div className="owner-info-error">
                        Die Eigentümerinformationen können nicht abgefragt werden. Bitte wenden Sie sich an das zuständige Grundbuchamt.
                    </div>
                </div>
            );
        }
    }

    renderOwner = (eigentuemer, collapsible=false) => {
        if (eigentuemer.grundstueck) {
            // owner is a plot
            if (collapsible) {
                // collapsible owner info
                let className = 'owner-info-plot-title';
                let collapsed = this.state.expandedPlot != eigentuemer.grundstueck;
                if (collapsible) {
                    className += " owner-info-collapsible";
                }
                if (collapsed) {
                    className += " owner-info-collapsed";
                }
                return (
                    <div>
                        <div className={className} onClick={ev => this.togglePlot(eigentuemer.grundstueck)}>
                            {eigentuemer.grundstueck}
                        </div>
                        {this.renderOwnerDetails(eigentuemer, collapsed)}
                    </div>
                );
            }
            else {
                // expanded owner info
                return (
                    <div>
                        <div className="owner-info-plot-title">{eigentuemer.grundstueck}</div>
                        {this.renderOwnerDetails(eigentuemer)}
                    </div>
                );
            }
        }
        else {
            // owner is a person
            return this.renderOwnerDetails(eigentuemer);
        }
    }
    renderOwnerDetails = (eigentuemer, collapsed=false) => {
        let className = 'owner-info-owner-details';
        if (collapsed) {
            // NOTE: hide collapsed details by hiding them with CSS instead of removing them, to keep a consistent column width
            className += " owner-info-collapsed";
        }
        return (
            <div className={className}>
                {eigentuemer.berechtigte.map(berechtigte => {
                    if (berechtigte != "ERROR") {
                        return (
                            <div className="owner-info-owner-name">
                                {berechtigte}
                            </div>
                        );
                    }
                    else {
                        return (
                            <div className="owner-info-owner-name">
                                <div className="owner-info-owner-error">
                                    Fehler: Berechtigte nicht gefunden
                                </div>
                            </div>
                        );
                    }
                })}
                {eigentuemer.beschreibung ? <div className="owner-info-plot-owner-desc">{eigentuemer.beschreibung}</div> : null}
            </div>
        );
    }
    togglePlot = (name) => {
        this.setState({
            expandedPlot: this.state.expandedPlot === name ? null : name
        });
    }
};

module.exports = PlotOwnerInfo;
