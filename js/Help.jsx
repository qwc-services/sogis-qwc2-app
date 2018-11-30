/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');

function renderHelp() {
    return (<div role="body">
                <div style={{margin: "0.5em"}}>
                    <p>
                        <img src="assets/img/logo-transparent.png" width="200"/>
                    </p>
                    <p>
                        <a href="https://geohelp.so.ch" target="_blank">Benutzerhilfe</a>
                        <br/>
                        <a href="https://www.so.ch/fileadmin/internet/bjd/bjd-agi/xls/Amtliche_Vermessung/Web_GIS_Client/Uebersicht_Karte.xlsx" target="_blank">Layerliste</a>
                        <br/>
                    </p>
                    <p>
                        Daten: Kanton Solothurn / Gemeinden
                        <br/>
                        Hintergrundkarten &copy; swisstopo / Kanton Solothurn
                    </p>
                    <p>
                        <a href="https://geo.so.ch" target="_blank">Geoportal Kanton Solothurn</a>
                        <br/>Kontakt: <a href="mailto:agi@bd.so.ch">agi@bd.so.ch</a>
                    </p>
                 </div>
             </div>);
}

module.exports = renderHelp;
