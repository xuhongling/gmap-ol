import GeoJSON from 'ol/format/GeoJSON';
import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import { getDrawStyle } from '../MapUtil/MapUtil';

/**
 * Adds a new vector layer from a geojson file.
 * @param {import("ol/Map").default} map the map to add the layer to
 * @param {File} file the file to read the geojson from
 * @param lineOptions {
 *  - layerName?: string;
 *  - zIndex?: number;
 *  - visible?: boolean;
 *  - textFieldName?: string;
 *  - styles?: object;
 *  - hoverStyle?: boolean;
 * }
 */
export function addLineStringLayer(olmap, lineStringGeoJSON, lineOptions) {
  const getFeatureStyles = (feature) => {
    const properties = feature.getProperties();
    const textFieldName = lineOptions.textFieldName ? properties[lineOptions.textFieldName] : '';
    const styles = {
      stroke: {
        width: 1,
        color: 'rgba(255, 0, 0, 1)',
      },
      text: {
        font: '12px Microsoft YaHei',
        fill: { color: 'rgba(0, 0, 0, 1)' },
        text: '',
      },
      ...lineOptions.styles,
    };
    if (textFieldName !== '') {
      styles.text.text = textFieldName;
    }
    return getDrawStyle(styles);
  };

  const vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(lineStringGeoJSON),
    }),
    zIndex: lineOptions.zIndex ? lineOptions.zIndex : 4,
    visible: lineOptions?.visible !== undefined && !lineOptions?.visible ? false : true,
    style: getFeatureStyles,
  });
  vectorLayer.set('layerName', `${lineOptions.layerName ? lineOptions.layerName : ''}`);
  vectorLayer.set('pickLayerName', `LineString${lineOptions.layerName ? lineOptions.layerName : ''}`);
  const hoverStyle = lineOptions?.hoverStyle !== undefined && !lineOptions?.hoverStyle ? false : true;
  if (hoverStyle) {
    vectorLayer.set('tipsLayerName', `tipsLayerName${lineOptions.layerName ? lineOptions.layerName : ''}`);
    vectorLayer.set('hoverLayerName', `hoverLayerName${lineOptions.layerName ? lineOptions.layerName : ''}`);
  }
  olmap.addLayer(vectorLayer);
}
