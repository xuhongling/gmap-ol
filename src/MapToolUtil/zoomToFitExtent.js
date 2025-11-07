/*
 * @Author: xuhongling
 * @Date:   2022-09-06 14:48:35
 * @Last Modified by:   xuhongling
 * @Last Modified time: 2025-11-07 10:27:25
 */
import { getLayerByName } from '../LayerUtil/LayerUtil';

/**
 * 将地图视图适配到指定图层的要素范围（支持按要素名称精准适配）
 * @param {import("ol/Map").default} olMap - 地图实例
 * @param {Object} options - 适配配置项
 * @param {string} options.layerName - 目标图层名称（用于查找图层）
 * @param {string} [options.name=''] - 目标要素的NAME属性值（可选，精准适配该要素）
 * @param {number[]} [options.padding=[50, 50, 50, 50]] - 视图适配时的内边距 [上, 右, 下, 左]
 * @param {number} [options.maxZoom=18] - 最大缩放级别（避免过度放大）
 * @param {number} [options.duration=800] - 适配动画时长（毫秒）
 */
function zoomToFitExtent(olMap, options) {
  if (!olMap || !options?.layerName) return; // 地图实例或图层名称不存在时终止

  // 获取地图视图和目标图层
  const view = olMap.getView();
  const targetLayer = getLayerByName(olMap, options.layerName);
  if (!targetLayer) return; // 图层不存在时终止

  // 获取图层要素（容错：非矢量图层可能无getSource方法）
  const source = targetLayer.getSource();
  if (!source || !source.getFeatures) return;
  const features = source.getFeatures();
  if (features.length === 0) return; // 无要素时终止

  // 解析配置项（带默认值）
  const {
    name = '',
    padding = [50, 50, 50, 50],
    maxZoom = 18,
    duration = 800
  } = options;

  // 查找目标要素（优先匹配name，否则取第一个要素）
  let targetFeature = features[0]; // 默认第一个要素
  if (name) {
    // 查找NAME属性匹配的要素
    const matchedFeature = features.find(feature => feature.get('NAME') === name);
    if (matchedFeature) {
      targetFeature = matchedFeature;
    }
  }

  // 获取目标要素的几何范围并适配视图
  const targetGeometry = targetFeature.getGeometry();
  if (targetGeometry) {
    view.fit(targetGeometry, {
      padding,
      maxZoom,
      duration
    });
  }
}

export default zoomToFitExtent;
