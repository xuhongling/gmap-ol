import Layer from 'ol/layer/Layer';
import type BaseLayer from 'ol/layer/Base';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type { Coordinate } from 'ol/coordinate';
import type { Extent } from 'ol/extent';
import { METERS_PER_UNIT } from 'ol/proj/Units';
import type { Units } from 'ol/proj/Units';
import VectorSource from 'ol/source/Vector';
import { LAYER_PROP_PICK } from '../constants';
import type { FeatureProperties, PickBufferRange, PickOptions } from '../types';

/**
 * 点击地图时,在指定范围内获取符合类型的可见图层中的要素属性
 *
 * @param event - 地图点击事件对象
 * @param pickLayerType - 要拾取的图层类型(如'Point'、'Polygon'等,需与图层的pickLayerName属性匹配),默认 'Point'
 * @param options - 可选的配置项,用于自定义缓冲范围计算
 * @returns 符合条件的要素属性数组(每个元素为要素的properties对象,含geometry)
 *
 * @example
 * // 使用默认硬编码缓冲逻辑(兼容旧版)
 * const features = pickFeaturesByName(event);
 *
 * @example
 * // 使用自定义函数
 * const features = pickFeaturesByName(event, 'Point', {
 *   getBufferMeters: (zoom) => Math.max(10, 5000 / zoom)
 * });
 *
 * @example
 * // 使用区间配置
 * const features = pickFeaturesByName(event, 'Point', {
 *   bufferConfig: [
 *     { minZoom: 0, maxZoom: 5, bufferMeters: 50000 },
 *     { minZoom: 6, maxZoom: 10, bufferMeters: 12000 },
 *     { minZoom: 18, maxZoom: Infinity, bufferMeters: 10 }
 *   ]
 * });
 */
export function pickFeaturesByName(event: MapBrowserEvent<UIEvent>, pickLayerType: string = 'Point', options: PickOptions = {}): FeatureProperties[] {
  const olMap = event.map;
  if (!olMap) return []; // 地图实例不存在时返回空数组

  // ---------- 1. 解析缓冲配置,生成 getBufferMeters 函数 ----------
  let getBufferMeters: (zoom: number) => number;

  if (typeof options.getBufferMeters === 'function') {
    // 优先使用用户直接传入的函数
    getBufferMeters = options.getBufferMeters;
  } else if (Array.isArray(options.bufferConfig)) {
    // 使用区间配置转换为函数
    const config: PickBufferRange[] = options.bufferConfig;
    getBufferMeters = (zoom: number): number => {
      for (const item of config) {
        if (zoom >= item.minZoom && zoom <= item.maxZoom) {
          return item.bufferMeters;
        }
      }
      // 若未匹配任何区间,返回一个安全默认值
      return 100;
    };
  } else {
    // 默认硬编码缓冲逻辑(原实现)
    getBufferMeters = (zoom: number): number => {
      if (zoom < 6) return 50000 - zoom * 2000;
      if (zoom < 11) return 12000 - zoom * 200;
      if (zoom < 13) return 2000 - (zoom - 10) * 100;
      if (zoom < 15) return 800 - (zoom - 10) * 100;
      if (zoom > 17) return 10;
      return 100;
    };
  }

  // ---------- 2. 根据点击坐标和当前缩放级别计算缓冲范围 ----------
  const getBufferExtent = (coordinate: Coordinate): Extent => {
    const zoom = Math.ceil(olMap.getView().getZoom() ?? 0);
    const bufferMeters = getBufferMeters(zoom);
    const projectionUnits = olMap.getView().getProjection().getUnits();
    // METERS_PER_UNIT 未覆盖 'pixels'/'tile-pixels' 单位,此时缓冲为 NaN(与旧版一致,不会命中任何要素)
    const metersPerUnit = (METERS_PER_UNIT as Partial<Record<Units, number>>)[projectionUnits] ?? NaN;
    const buffer = bufferMeters / metersPerUnit;
    return [coordinate[0] - buffer, coordinate[1] - buffer, coordinate[0] + buffer, coordinate[1] + buffer];
  };

  // ---------- 3. 判断图层在当前缩放级别下是否可见 ----------
  const isLayerVisible = (layer: BaseLayer): boolean => {
    const currentZoom = olMap.getView().getZoom();
    if (currentZoom === undefined) return false;
    const minZoom = layer.getMinZoom() ?? 0;
    const maxZoom = layer.getMaxZoom() ?? Infinity;
    return layer.getVisible() && currentZoom > minZoom && currentZoom <= maxZoom;
  };

  // ---------- 4. 获取符合条件的目标图层(包含指定类型标识且当前可见) ----------
  const getTargetLayers = (): BaseLayer[] => {
    const targetLayers: BaseLayer[] = [];
    olMap.getLayers().forEach((layer) => {
      const layerPickName = layer.get(LAYER_PROP_PICK);
      if (typeof layerPickName === 'string' && layerPickName.includes(pickLayerType) && isLayerVisible(layer)) {
        targetLayers.push(layer);
      }
    });
    return targetLayers;
  };

  // ---------- 5. 主逻辑:获取坐标、计算范围、提取要素属性 ----------
  const clickCoordinate = olMap.getCoordinateFromPixel(event.pixel);
  const bufferExtent = getBufferExtent(clickCoordinate);
  const targetLayers = getTargetLayers();

  const featurePropertiesList: FeatureProperties[] = [];
  targetLayers.forEach((layer) => {
    if (!(layer instanceof Layer)) return; // 图层组等非单层对象跳过
    const source = layer.getSource();
    if (!(source instanceof VectorSource)) return; // 非矢量数据源跳过

    const featuresInExtent = source.getFeaturesInExtent(bufferExtent);
    featuresInExtent.forEach((feature) => {
      featurePropertiesList.push(feature.getProperties());
    });
  });

  return featurePropertiesList;
}
