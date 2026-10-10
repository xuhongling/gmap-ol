import type BaseLayer from 'ol/layer/Base';
import type Map from 'ol/Map';

/**
 * 判断图层在当前地图缩放级别下是否可见
 *
 * @param layer - 待判断的图层
 * @param map - 地图实例
 * @returns 图层是否可见
 */
export function judgeLayerVisible(layer: BaseLayer, map: Map): boolean {
  const minZoom = layer.getMinZoom();
  const maxZoom = layer.getMaxZoom();
  const isLayerVisible = layer.getVisible();
  const currentZoom = map.getView().getZoom();

  if (currentZoom === undefined) {
    return false;
  }

  return isLayerVisible && currentZoom > minZoom && currentZoom <= maxZoom;
}
