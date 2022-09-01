/*
 * @Author: xuhongling
 * @Date:   2022-08-18 21:05:19
 * @Last Modified by:   xuhongling
 * @Last Modified time: 2022-08-23 10:07:22
 */
import { METERS_PER_UNIT } from 'ol/proj/Units';

// 点击展示范围内重叠站点
function pickFeaturesByName(event, pickLayerType = 'Point') {
  const olMap = event.map;
  // 获取点击的地图坐标范围
  const getExtentByBuffer = (coordinate) => {
    const mapZoom = olMap.getView().getZoom();
    const zoom = Math.ceil(mapZoom);
    let buffer;
    if (zoom < 6) {
      buffer = 50000 - zoom * 2000;
    } else if (zoom < 11) {
      buffer = 12000 - zoom * 200;
    } else if (zoom < 13) {
      buffer = 2000 - (zoom - 10) * 100;
    } else {
      buffer = 100;
    }
    buffer = buffer / METERS_PER_UNIT[olMap.getView().getProjection().getUnits()];
    const extent = [coordinate[0] - buffer, coordinate[1] - buffer, coordinate[0] + buffer, coordinate[1] + buffer];
    return extent;
  };

  // 获取点击的地图坐标范围
  const coordinate = olMap.getCoordinateFromPixel(event.pixel);
  const extent = getExtentByBuffer(coordinate);

  // 获取图层
  const loadLayers = () => {
    const layers = olMap.getLayers();
    const localTargetLayer = [];
    layers.forEach((layer) => {
      if (layer.getProperties().pickLayerName !== undefined) {
        const isPointVectorLayer = layer.getProperties().pickLayerName.includes(pickLayerType);
        if (isPointVectorLayer && judgeLayerVisible(layer)) {
          localTargetLayer.push(layer);
        }
      }
    });
    return localTargetLayer;
  };

  // 判断图层信息
  const judgeLayerVisible = (layer) => {
    const min = layer.getMinZoom();
    const max = layer.getMaxZoom();
    const visible = layer.getVisible();
    const mapZoom = olMap.getView().getZoom();
    return visible && mapZoom > min && mapZoom <= max;
  };

  // 解析Features
  const resultList = [];
  const layers = loadLayers();
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (judgeLayerVisible(layer)) {
      const features = layer.getSource().getFeaturesInExtent(extent);
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const properties = feature.getProperties();
        resultList.push(properties);
      }
    }
  }
  return resultList;
}

export default pickFeaturesByName;
