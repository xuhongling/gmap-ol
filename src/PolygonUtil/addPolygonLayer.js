import GeoJSON from 'ol/format/GeoJSON';
import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import { getDrawStyle } from '../MapUtil/MapUtil';

/**
 * Adds a new vector layer from a geojson file.
 *
 * @param {import("ol/Map").default} map the map to add the layer to.
 * @param {File} file the file to read the geojson from.
 * @param polygonOptions {
 *  - layerName?: string;
 *  - zIndex?: number;
 *  - visible?: boolean;
 *  - textFieldName?: string;
 *  - styles?: object;
 *  - hoverStyle?: boolean;
 * }
 */
function addPolygonLayer(olmap, polygonGeoJSON, polygonOptions) {
  const getFeatureStyles = (feature) => {
    const properties = feature.getProperties();
    const textFieldName = polygonOptions.textFieldName ? properties[polygonOptions.textFieldName] : '';
    const styles = {
      fill: {
        color: 'rgba(255, 0, 0, 0.2)',
      },
      stroke: {
        width: 1,
        color: 'rgba(255, 0, 0, 0.5)',
      },
      text: {
        font: '12px Microsoft YaHei',
        fill: { color: 'rgba(0, 0, 0, 1)' },
        text: '',
      },
      ...polygonOptions.styles,
    };
    if (textFieldName !== '') {
      styles.text.text = textFieldName;
    }
    return getDrawStyle(styles);
  };

  const vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(polygonGeoJSON),
    }),
    zIndex: polygonOptions.zIndex ? polygonOptions.zIndex : 3,
    visible: polygonOptions?.visible !== undefined && !polygonOptions?.visible ? false : true,
    style: getFeatureStyles,
  });
  vectorLayer.set('layerName', `${polygonOptions.layerName ? polygonOptions.layerName : ''}`);
  vectorLayer.set('pickLayerName', `Polygon${polygonOptions.layerName ? polygonOptions.layerName : ''}`);
  const hoverStyle = polygonOptions?.hoverStyle !== undefined && !polygonOptions?.hoverStyle ? false : true;
  if (hoverStyle) {
    vectorLayer.set('tipsLayerName', `tipsLayerName${polygonOptions.layerName ? polygonOptions.layerName : ''}`);
    vectorLayer.set('hoverLayerName', `hoverLayerName${polygonOptions.layerName ? polygonOptions.layerName : ''}`);
  }
  olmap.addLayer(vectorLayer);
}

export default addPolygonLayer;
