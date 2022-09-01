import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Fill, Style } from 'ol/style';

function addRainPolygonLayer(olmap, rainPolygonGeoJSON, rainPolygonOptions) {
  const getFeatureStyles = (feature) => {
    let highValue = feature.get('highValue');
    let lowValue = feature.get('lowValue');
    let avgvalue = (highValue + lowValue) / 2;
    let fillColor = 'rgba(0,0,0,0)';
    let renderColor = rainPolygonOptions.renderColor;
    for (let i = 0; i < renderColor.length; i++) {
      let minvalue = renderColor[i].minvalue;
      let maxvalue = renderColor[i].maxvalue;
      if (avgvalue >= minvalue && avgvalue < maxvalue) {
        fillColor = renderColor[i].color;
      }
    }
    /*if (avgvalue < 0.1) {
      fillColor = 'rgba(255,255,255, 0)';
    } else if (avgvalue >= 0.1 && avgvalue < 10) {
      fillColor = 'rgba(150, 250, 150, 0.75)';
    } else if (avgvalue >= 10 && avgvalue < 25) {
      fillColor = 'rgba(50, 210, 50, 0.75)';
    } else if (avgvalue >= 25 && avgvalue < 50) {
      fillColor = 'rgba(100, 210, 250, 0.75)';
    } else if (avgvalue >= 50 && avgvalue < 100) {
      fillColor = 'rgba(0, 0, 250, 0.75)';
    } else if (avgvalue >= 100 && avgvalue < 250) {
      fillColor = 'rgba(250, 0, 250, 0.75)';
    } else if (avgvalue >= 250) {
      fillColor = 'rgba(160, 0, 50, 0.75)';
    }*/
    let style = new Style({
      fill: new Fill({
        color: fillColor,
      }),
    });
    return style;
  };
  const vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(rainPolygonGeoJSON),
    }),
    zIndex: rainPolygonOptions.zIndex ? rainPolygonOptions.zIndex : 3,
    visible: rainPolygonOptions?.visible !== undefined && !rainPolygonOptions?.visible ? false : true,
    style: getFeatureStyles,
  });
  vectorLayer.set('layerName', `${rainPolygonOptions.layerName ? rainPolygonOptions.layerName : ''}`);
  olmap.addLayer(vectorLayer);
}

export default addRainPolygonLayer;
