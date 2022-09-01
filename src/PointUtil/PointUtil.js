import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { getDrawStyle } from '../MapUtil/MapUtil';

/**
 * Adds a new vector layer from a geojson file.
 * @param {import("ol/Map").default} map the map to add the layer to
 * @param {File} file the file to read the geojson from
 */
export function addPointLayer(olmap, pointGeoJSON, pointOptions) {
  // 设置站点样式
  const getFeatureStyles = (feature) => {
    const properties = feature.getProperties();
    const textFieldName = pointOptions.textFieldName ? properties[pointOptions.textFieldName] : '';
    const styles = {
      image: {
        src: '',
        anchor: [0.5, 0.5],
        scale: 1,
      },
      text: {
        font: '11px Microsoft YaHei',
        textAlign: 'center',
        textBaseline: 'middle',
        fill: { color: 'rgba(0, 0, 0, 0.85)' },
        stroke: {
          color: 'rgba(255, 255, 255, 0.75)',
          width: 2,
        },
        offsetY: 16,
        text: '',
      },
      ...pointOptions.styles,
    };
    if (pointOptions.icon) {
      styles.image.src = pointOptions.icon;
    }
    if (pointOptions.textColor) {
      styles.text.fill.color = pointOptions.textColor;
    }
    if (textFieldName !== '') {
      styles.text.text = textFieldName;
    }
    return getDrawStyle(styles);
  };

  const vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(pointGeoJSON),
    }),
    zIndex: pointOptions.zIndex ? pointOptions.zIndex : 5,
    style: getFeatureStyles,
  });
  vectorLayer.set('layerName', `${pointOptions.layerName ? pointOptions.layerName : ''}`);
  vectorLayer.set('pickLayerName', `Point${pointOptions.layerName ? pointOptions.layerName : ''}`);
  if (pointOptions.hoverStyle) {
    vectorLayer.set('tipsLayerName', `tipsLayerName${pointOptions.layerName ? pointOptions.layerName : ''}`);
    vectorLayer.set('hoverLayerName', `hoverLayerName${pointOptions.layerName ? pointOptions.layerName : ''}`);
  }
  olmap.addLayer(vectorLayer);
}

/**
 * Adds a new vector layer from a geojson file.
 * @param {import("ol/Map").default} map the map to add the layer to
 * @param {File} file the file to read the geojson from
 */
export function addPointDataLayer(olmap, pointData, pointOptions) {
  // 地图站点级别
  const level = [2, 4, 6, 8];
  const pointLevelData = { 2: [], 4: [], 6: [], 8: [] };

  if (pointData && pointData.length === 0) return {};
  for (let i = 0; i < pointData.length; i++) {
    for (let j = 0; j < level.length; j++) {
      let levelNum = 2;
      if (pointOptions.zoomFieldName) {
        levelNum = pointData[i][pointOptions.zoomFieldName];
      }
      if (levelNum === level[j]) {
        pointLevelData[`${level[j]}`].push(pointData[i]);
      }
    }
  }
  const formatDataToLayerByStationType = (pointData, levelKey) => {
    const temp = {};
    function formatFeature(data) {
      const LGTD = data.LGTD ? data.LGTD : data.lgtd;
      const LTTD = data.LTTD ? data.LTTD : data.lttd;
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [LGTD, LTTD],
        },
        properties: data,
      };
    }
    // 将数据按站点类型分类，并转为GeoJSON<FeatureCollection>格式
    pointData.forEach((item) => {
      const stationType = 'Point';
      if (Object.prototype.hasOwnProperty.call(temp, stationType)) {
        temp[stationType].features.push(formatFeature(item));
      } else {
        temp[stationType] = {
          type: 'FeatureCollection',
          features: [formatFeature(item)],
        };
      }
    });

    // 将分类数据转为地图控件所需图层数据
    const layers = [];
    Object.keys(temp).forEach((key) => {
      layers.push({
        type: key,
        zoom: levelKey,
        data: temp[key],
      });
    });
    return layers;
  };

  // 获取按站点类型分类的图层
  const layers = [];
  for (const key in pointLevelData) {
    const pointData = pointLevelData[key];
    if (pointData.length > 0) {
      const layer = formatDataToLayerByStationType(pointData, key);
      layers.push(...layer);
    }
  }

  // 地图添加图层数据
  layers.forEach((layer) => {
    // 设置站点样式
    const getFeatureStyles = (feature) => {
      const properties = feature.getProperties();
      const textFieldName = pointOptions.textFieldName ? properties[pointOptions.textFieldName] : '';
      const styles = {
        image: {
          src: '',
          anchor: [0.5, 0.5],
          scale: 1,
        },
        text: {
          font: '11px Microsoft YaHei',
          textAlign: 'center',
          textBaseline: 'middle',
          fill: { color: 'rgba(0, 0, 0, 0.85)' },
          stroke: {
            color: 'rgba(255, 255, 255, 0.75)',
            width: 2,
          },
          offsetY: 16,
          text: '',
        },
        ...pointOptions.styles,
      };
      if (pointOptions.icon) {
        styles.image.src = pointOptions.icon;
      }
      if (pointOptions.textColor) {
        styles.text.fill.color = pointOptions.textColor;
      }
      if (textFieldName !== '') {
        styles.text.text = textFieldName;
      }
      return getDrawStyle(styles);
    };

    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: new GeoJSON().readFeatures(layer.data),
      }),
      zIndex: pointOptions.zIndex ? pointOptions.zIndex : 5,
      minZoom: parseInt(layer.zoom) + 5.5,
      visible: pointOptions?.visible !== undefined && !pointOptions?.visible ? false : true,
      style: getFeatureStyles,
    });
    vectorLayer.set('layerName', `${pointOptions.layerName ? pointOptions.layerName : ''}`);
    vectorLayer.set('pickLayerName', `Point${pointOptions.layerName ? pointOptions.layerName : ''}`);
    const hoverStyle = pointOptions?.hoverStyle !== undefined && !pointOptions?.hoverStyle ? false : true;
    if (hoverStyle) {
      vectorLayer.set('tipsLayerName', `tipsLayerName${pointOptions.layerName ? pointOptions.layerName : ''}`);
      vectorLayer.set('hoverLayerName', `hoverLayerName${pointOptions.layerName ? pointOptions.layerName : ''}`);
    }
    olmap.addLayer(vectorLayer);
  });
}
