import Layer from 'ol/layer/Layer';
import type Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { FEATURE_PROP_NAME } from '../constants';
import { getLayerByName } from '../layer';
import type { ZoomToFitOptions } from '../types';

/**
 * 将地图视图适配到指定图层的要素范围(支持按要素名称精准适配)
 *
 * @param olMap - 地图实例
 * @param options - 适配配置项(layerName 必填;name 缺省时适配第一个要素)
 */
export function zoomToFitExtent(olMap: Map, options: ZoomToFitOptions): void {
  if (!olMap || !options?.layerName) return; // 地图实例或图层名称不存在时终止

  // 获取地图视图和目标图层
  const view = olMap.getView();
  const targetLayer = getLayerByName(olMap, options.layerName);
  if (!targetLayer || !(targetLayer instanceof Layer)) return; // 图层不存在或为图层组时终止

  // 获取图层要素(容错:非矢量图层无矢量数据源)
  const source = targetLayer.getSource();
  if (!(source instanceof VectorSource)) return;
  const features = source.getFeatures();
  if (features.length === 0) return; // 无要素时终止

  // 解析配置项(带默认值)
  const { name = '', padding = [50, 50, 50, 50], maxZoom = 18, duration = 800 } = options;

  // 查找目标要素(优先匹配name,否则取第一个要素)
  let targetFeature = features[0];
  if (name) {
    const matchedFeature = features.find((feature) => feature.get(FEATURE_PROP_NAME) === name);
    if (matchedFeature) {
      targetFeature = matchedFeature;
    }
  }

  // 获取目标要素的几何范围并适配视图
  const targetGeometry = targetFeature.getGeometry();
  if (targetGeometry) {
    view.fit(targetGeometry.getExtent(), {
      padding,
      maxZoom,
      duration,
    });
  }
}
