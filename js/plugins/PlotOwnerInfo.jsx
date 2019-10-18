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
    render() {
        if (this.props.data.eigentum) {
            // show owner info
            const data = this.props.data.eigentum;
            return (
                <div className="owner-info">
                    <table>
                        <tbody>
                            <tr>
                                <td className="owner-info-first-column">Eigentumsform</td>
                                <td>{data.eigentumsform}</td>
                            </tr>
                            <tr>
                                <td className="owner-info-first-column">Eigentümer</td>
                                <td>
                                    <div className="owner-info-owners">
                                        {data.eigentuemer.map(eigentuemer => {
                                            return (
                                                <div>
                                                    <div className="owner-info-plot-title">{eigentuemer.grundstueck}</div>
                                                    {eigentuemer.berechtigte.map(berechtigte => {
                                                        return (
                                                            <div className="owner-info-owner-name">
                                                                {berechtigte}
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="owner-info-plot-owner-desc">{eigentuemer.beschreibung}</div>
                                                </div>
                                            );
                                        })}
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
};

module.exports = PlotOwnerInfo;
