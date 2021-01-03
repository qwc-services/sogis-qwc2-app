/**
 * Copyright 2017, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import uuid from 'uuid';
import ol from 'openlayers';

import {changeCCCState} from './actions/ccc';

class CCCEditSupport extends React.Component {
    static propTypes = {
        ccc: PropTypes.object,
        changeCCCState: PropTypes.func,
        map: PropTypes.object
    }
    static defaultProps = {
        editing: {}
    }
    constructor(props) {
        super(props);

        this.interaction = null;
        this.layer = null;
        this.currentFeature = null;
        this.baseStyle = new ol.style.Style({
            fill: new ol.style.Fill({ color: [255, 0, 0, 0.5] }),
            stroke: new ol.style.Stroke({ color: 'red', width: 2}),
            image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({ color: [255, 0, 0, 0.5] }),
                stroke: new ol.style.Stroke({ color: 'red', width: 2})
            })
        });
        this.interactionStyle = [
            new ol.style.Style({
                fill: new ol.style.Fill({ color: [255, 0, 0, 0.5] }),
                stroke: new ol.style.Stroke({ color: 'red', width: 2})
            }),
            new ol.style.Style({
                image: new ol.style.RegularShape({
                    fill: new ol.style.Fill({color: 'white'}),
                    stroke: new ol.style.Stroke({color: 'red', width: 2}),
                    points: 4,
                    radius: 5,
                    angle: Math.PI / 4
                }),
                geometry: (feature) => {
                    if (feature.getGeometry().getType() === "Point") {
                        return new ol.geom.MultiPoint([feature.getGeometry().getCoordinates()]);
                    } else if (feature.getGeometry().getType() === "LineString") {
                        return new ol.geom.MultiPoint(feature.getGeometry().getCoordinates());
                    } else {
                        return new ol.geom.MultiPoint(feature.getGeometry().getCoordinates()[0]);
                    }
                }
            })
        ];
    }
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
            style: this.baseStyle
        });
        this.props.map.addLayer(this.layer);
    }
    addDrawInteraction = (newProps) => {
        this.reset();
        this.createLayer();
        const drawInteraction = new ol.interaction.Draw({
            type: newProps.ccc.geomType,
            source: this.layer.getSource(),
            condition: (event) => {  return event.originalEvent.buttons === 1; },
            style: this.interactionStyle
        });
        drawInteraction.on('drawstart', (evt) => {
            this.currentFeature = evt.feature;
            this.currentFeature.setId(uuid.v4());
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
                    style: this.interactionStyle
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
    }
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
            style: this.interactionStyle
        });
        modifyInteraction.on('modifyend', () => {
            this.commitCurrentFeature();
        }, this);
        this.props.map.addInteraction(modifyInteraction);
        this.interaction = modifyInteraction;
    }
    commitCurrentFeature = () => {
        if (!this.currentFeature) {
            return;
        }
        const format = new ol.format.GeoJSON();
        const feature = format.writeFeatureObject(this.currentFeature);
        this.props.changeCCCState({feature: feature, changed: true});
    }
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
    }
}

export default connect((state) => ({
    ccc: state.ccc || {}
}), {
    changeCCCState: changeCCCState
})(CCCEditSupport);
