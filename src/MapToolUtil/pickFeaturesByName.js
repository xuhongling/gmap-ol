/*
 * @Author: xuhongling
 * @Date:   2022-08-18 21:05:19
 * @Last Modified by:   xuhongling
 * @Last Modified time: 2025-11-07 10:22:53
 */
import { METERS_PER_UNIT } from 'ol/proj/Units';

/**
 * 点击地图时，在指定范围内获取符合类型的可见图层中的要素属性
 * @param {import("ol/MapBrowserEvent").default} event - 地图点击事件对象
 * @param {string} [pickLayerType='Point'] - 要拾取的图层类型（如'Point'、'Polygon'等，需与图层的pickLayerName属性匹配）
 * @returns {Object[]} 符合条件的要素属性数组（每个元素为要素的properties对象）
 */
function pickFeaturesByName(event, pickLayerType = 'Point') {
  const olMap = event.map;
  if (!olMap) return []; // 地图实例不存在时返回空数组

  /**
   * 根据点击坐标和当前缩放级别计算缓冲范围（用于要素拾取）
   * @param {number[]} coordinate - 地图坐标 [x, y]
   * @returns {number[]} 范围数组 [minX, minY, maxX, maxY]
   */
  const getBufferExtent = (coordinate) => {
    const zoom = Math.ceil(olMap.getView().getZoom());
    let bufferMeters; // 缓冲范围（米）

    // 根据缩放级别计算缓冲范围（缩放级别越高，缓冲越小，精度越高）
    if (zoom < 6) {
      bufferMeters = 50000 - zoom * 2000;
    } else if (zoom < 11) {
      bufferMeters = 12000 - zoom * 200;
    } else if (zoom < 13) {
      bufferMeters = 2000 - (zoom - 10) * 100;
    } else if (zoom < 15) {
      bufferMeters = 800 - (zoom - 10) * 100;
    } else if (zoom > 17) {
      bufferMeters = 10;
    } else {
      bufferMeters = 100;
    }

    // 将缓冲范围从米转换为当前投影的单位
    const projectionUnits = olMap.getView().getProjection().getUnits();
    const buffer = bufferMeters / METERS_PER_UNIT[projectionUnits];

    // 计算缓冲范围（以点击坐标为中心）
    return [
      coordinate[0] - buffer,
      coordinate[1] - buffer,
      coordinate[0] + buffer,
      coordinate[1] + buffer
    ];
  };

  /**
   * 判断图层在当前缩放级别下是否可见
   * @param {import("ol/layer/Layer").default} layer - 目标图层
   * @returns {boolean} 图层是否可见（true为可见）
   */
  const isLayerVisible = (layer) => {
    const currentZoom = olMap.getView().getZoom();
    const minZoom = layer.getMinZoom() ?? 0; // 图层最小可见缩放级别（默认0）
    const maxZoom = layer.getMaxZoom() ?? Infinity; // 图层最大可见缩放级别（默认无限大）
    return layer.getVisible() && currentZoom > minZoom && currentZoom <= maxZoom;
  };

  /**
   * 获取符合条件的目标图层（包含指定类型标识且当前可见）
   * @returns {import("ol/layer/Layer").default[]} 目标图层数组
   */
  const getTargetLayers = () => {
    const targetLayers = [];
    olMap.getLayers().forEach(layer => {
      const layerPickName = layer.get('pickLayerName');
      // 筛选包含目标类型标识且可见的图层
      if (layerPickName && layerPickName.includes(pickLayerType) && isLayerVisible(layer)) {
        targetLayers.push(layer);
      }
    });
    return targetLayers;
  };

  // 1. 获取点击坐标并计算缓冲范围
  const clickCoordinate = olMap.getCoordinateFromPixel(event.pixel);
  const bufferExtent = getBufferExtent(clickCoordinate);

  // 2. 获取符合条件的目标图层
  const targetLayers = getTargetLayers();

  // 3. 从目标图层中提取范围内的要素属性
  const featurePropertiesList = [];
  targetLayers.forEach(layer => {
    const source = layer.getSource();
    if (!source || !source.getFeaturesInExtent) return; // 非矢量数据源跳过

    // 获取范围内的要素并提取属性
    const featuresInExtent = source.getFeaturesInExtent(bufferExtent);
    featuresInExtent.forEach(feature => {
      featurePropertiesList.push(feature.getProperties());
    });
  });

  return featurePropertiesList;
}

export default pickFeaturesByName;
