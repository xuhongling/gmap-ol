import LayerGroup from 'ol/layer/Group';
import Layer from 'ol/layer/Layer';
import VectorSource from 'ol/source/Vector';
import ImageWMS from 'ol/source/ImageWMS';
import TileWMS from 'ol/source/TileWMS';
import WMTS from 'ol/source/WMTS';
import type BaseLayer from 'ol/layer/Base';
import type Map from 'ol/Map';
import { LAYER_PROP_NAME } from '../constants';
import type { WMSLayer, WMSOrWMTSLayer } from '../types';

/** 图层及其直接父容器(parent 为 null 表示直接挂在地图图层组下) */
interface LayerWithParent {
  layer: BaseLayer;
  parent: LayerGroup | null;
}

/**
 * 递归收集所有图层(含嵌套组内图层)及其直接父容器,子图层在前、组本身在后
 */
function collectLayers(collection: Map | LayerGroup, parent: LayerGroup | null, result: LayerWithParent[]): LayerWithParent[] {
  collection.getLayers().forEach((layer) => {
    if (layer instanceof LayerGroup) {
      collectLayers(layer, layer, result);
    }
    result.push({ layer, parent });
  });
  return result;
}

/**
 * 通过图层名称(layerName属性)获取地图中对应的图层
 *
 * @param map - 地图实例
 * @param name - 要查找的图层名称(对应图层的layerName属性值)
 * @returns 匹配的图层实例,未找到则返回undefined
 */
export function getLayerByName(map: Map, name: string): BaseLayer | undefined {
  const layers = getAllLayers(map);
  return layers.find((layer) => layer.get(LAYER_PROP_NAME) === name);
}

/**
 * 通过WMS图层的参数名(LAYERS参数)查找对应的图层
 *
 * @param map - 地图实例
 * @param name - 要匹配的LAYERS参数值
 * @returns 匹配的WMS图层,未找到则返回undefined
 */
export function getLayerByNameParam(map: Map, name: string): WMSLayer | undefined {
  const layers = getAllLayers(map);
  return layers.find((layer): layer is WMSLayer => {
    if (!(layer instanceof Layer)) return false;

    const source = layer.getSource();
    // 仅处理ImageWMS和TileWMS类型的图层源
    return (source instanceof ImageWMS || source instanceof TileWMS) && source.getParams().LAYERS === name;
  });
}

/**
 * 获取所有图层(包括嵌套在LayerGroup中的图层),支持通过过滤器筛选
 *
 * @param collection - 图层集合(地图实例或图层组)
 * @param filter - 图层过滤器函数,返回true则保留该图层
 * @returns 所有符合条件的图层数组(子图层在前、组本身在后)
 */
export function getAllLayers(collection: Map | LayerGroup, filter: (layer: BaseLayer) => boolean = () => true): BaseLayer[] {
  return collectLayers(collection, null, [])
    .filter(({ layer }) => filter(layer))
    .map(({ layer }) => layer);
}

/**
 * 获取指定图层的URL(支持WMS和WMTS类型图层)
 *
 * @param layer - 目标图层(WMS或WMTS类型)
 * @returns 图层的URL,获取失败则返回空字符串
 */
export function getLayerUrl(layer: WMSOrWMTSLayer): string {
  const source = layer.getSource();

  if (source instanceof TileWMS) {
    return source.getUrls()?.[0] ?? '';
  } else if (source instanceof ImageWMS) {
    return source.getUrl() ?? '';
  } else if (source instanceof WMTS) {
    return source.getUrls()?.[0] ?? '';
  }

  return '';
}

/**
 * 通过图层名称(layerName)清除并移除地图中匹配的图层(含嵌套在LayerGroup中的图层)
 *
 * @param map - 地图实例
 * @param name - 要移除的图层名称(layerName属性包含该值)
 */
export function removeLayer(map: Map, name: string): void {
  const targetLayers = collectLayers(map, null, []).filter(({ layer }) => {
    const layerName = layer.get(LAYER_PROP_NAME);
    return layerName && layerName.includes(name);
  });

  // 清除图层要素并从其所在容器中移除
  targetLayers.forEach(({ layer, parent }) => {
    if (layer instanceof Layer) {
      // 仅Vector源有clear方法(WMS/WMTS源无此方法,LayerGroup无getSource)
      const source = layer.getSource();
      if (source instanceof VectorSource) {
        source.clear();
      }
    }
    if (parent) {
      parent.getLayers().remove(layer);
    } else {
      map.removeLayer(layer);
    }
  });
}

/**
 * 通过图层名称(layerName)设置匹配图层的显示/隐藏状态
 *
 * @param map - 地图实例
 * @param name - 目标图层名称(layerName属性包含该值)
 * @param status - 显示状态(true为显示,false为隐藏)
 */
export function setLayerVisible(map: Map, name: string, status: boolean): void {
  const layers = getAllLayers(map);

  layers.forEach((layer) => {
    const layerName = layer.get(LAYER_PROP_NAME);
    if (layerName && layerName.includes(name)) {
      layer.setVisible(status);
    }
  });
}
