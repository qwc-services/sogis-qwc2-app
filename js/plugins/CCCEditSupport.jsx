/**
 * Copyright 2017, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import {connect} from 'react-redux';

import ol from 'openlayers';
import PropTypes from 'prop-types';
import FeatureStyles from 'qwc2/utils/FeatureStyles';
import {v4 as uuidv4} from 'uuid';

import {changeCCCState} from './actions/ccc';

class CCCEditSupport extends React.Component {
    static propTypes = {
        ccc: PropTypes.object,
        changeCCCState: PropTypes.func,
        map: PropTypes.object
    };
    static defaultProps = {
        editing: {}
    };
    constructor(props) {
        super(props);

        this.interaction = null;
        this.layer = null;
        this.currentFeature = null;
    }
    editStyle = (feature) => {
        const geometryFunction = (f) => {
            if (f.getGeometry().getType() === "Point") {
                return new ol.geom.MultiPoint([f.getGeometry().getCoordinates()]);
            } else if (f.getGeometry().getType() === "LineString") {
                return new ol.geom.MultiPoint(f.getGeometry().getCoordinates());
            } else if (f.getGeometry().getType() === "Polygon") {
                return new ol.geom.MultiPoint(f.getGeometry().getCoordinates()[0]);
            } else if (f.getGeometry().getType() === "MultiPoint") {
                return f.getGeometry();
            } else if (f.getGeometry().getType() === "MultiLineString") {
                return new ol.geom.MultiPoint(f.getGeometry().getCoordinates()[0]);
            } else if (f.getGeometry().getType() === "MultiPolygon") {
                return new ol.geom.MultiPoint(f.getGeometry().getCoordinates()[0][0]);
            }
            return f.getGeometry();
        };
        return [
            FeatureStyles.interaction(feature, this.props.ccc.style),
            FeatureStyles.interactionVertex({geometryFunction, ...this.props.ccc.style})
        ].flat();
    };
    componentDidUpdate(prevProps) {
        if (prevProps.ccc === this.props.ccc) {
            // pass
        } else if (this.props.ccc.action === 'Edit' && this.props.ccc.feature) {
            this.addEditInteraction(this.props);
        } else if (this.props.ccc.action === 'Draw' && this.props.ccc.geomType) {
            if (!this.props.ccc.feature || prevProps.ccc.geomType !== this.props.ccc.geomType) {
                this.addDrawInteraction(this.props);
            }
        } else {
            this.reset();
        }
    }
    render() {
        return null;
    }
    createLayer = () => {
        const source = new ol.source.Vector();
        this.layer = new ol.layer.Vector({
            source: source,
            zIndex: 1000000,
            style: this.editStyle
        });
        this.props.map.addLayer(this.layer);
    };
    addDrawInteraction = (newProps) => {
        this.reset();
        this.createLayer();
        const drawInteraction = new ol.interaction.Draw({
            type: newProps.ccc.geomType,
            source: this.layer.getSource(),
            condition: (event) => {  return event.originalEvent.buttons === 1; },
            style: this.editStyle
        });
        drawInteraction.on('drawstart', (evt) => {
            this.currentFeature = evt.feature;
            this.currentFeature.setId(uuidv4());
        }, this);
        drawInteraction.on('drawend', () => {
            const feature = this.currentFeature;
            this.commitCurrentFeature();

            setTimeout(() => {
                this.currentFeature = feature;
                const modifyInteraction = new ol.interaction.Modify({
                    features: new ol.Collection([this.currentFeature]),
                    condition: (event) => {  return event.originalEvent.buttons === 1; },
                    deleteCondition: (event) => {
                        // delete vertices on SHIFT + click
                        return ol.events.condition.shiftKeyOnly(event) && ol.events.condition.singleClick(event);
                    },
                    style: FeatureStyles.sketchInteraction()
                });
                this.props.map.addInteraction(modifyInteraction);
                this.interaction = modifyInteraction;
                modifyInteraction.on('modifyend', () => {
                    this.commitCurrentFeature();
                }, this);

                this.props.map.removeInteraction(drawInteraction);
            }, 100);
        }, this);
        this.props.map.addInteraction(drawInteraction);
        this.interaction = drawInteraction;
    };
    addEditInteraction = (newProps) => {
        this.reset();
        this.createLayer();
        const format = new ol.format.GeoJSON();
        this.currentFeature = format.readFeature(newProps.ccc.feature);
        this.layer.getSource().addFeature(this.currentFeature);

        const modifyInteraction = new ol.interaction.Modify({
            features: new ol.Collection([this.currentFeature]),
            condition: (event) => {  return event.originalEvent.buttons === 1; },
            deleteCondition: (event) => {
                // delete vertices on SHIFT + click
                return ol.events.condition.shiftKeyOnly(event) && ol.events.condition.singleClick(event);
            },
            style: FeatureStyles.sketchInteraction()
        });
        modifyInteraction.on('modifyend', () => {
            this.commitCurrentFeature();
        }, this);
        this.props.map.addInteraction(modifyInteraction);
        this.interaction = modifyInteraction;
    };
    commitCurrentFeature = () => {
        if (!this.currentFeature) {
            return;
        }
        const format = new ol.format.GeoJSON();
        const feature = format.writeFeatureObject(this.currentFeature);
        this.props.changeCCCState({feature: feature, style: this.props.ccc.style, changed: true});
    };
    reset = () => {
        if (this.interaction) {
            this.props.map.removeInteraction(this.interaction);
        }
        this.interaction = null;
        this.currentFeature = null;
        if (this.layer) {
            this.props.map.removeLayer(this.layer);
        }
        this.layer = null;
    };
}

export default connect((state) => ({
    ccc: state.ccc || {}
}), {
    changeCCCState: changeCCCState
})(CCCEditSupport);
