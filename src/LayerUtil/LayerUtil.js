import OlLayerGroup from 'ol/layer/Group';
import OlLayerLayer from 'ol/layer/Layer';
import OlSourceImageWMS from 'ol/source/ImageWMS';
import OlSourceTileWMS from 'ol/source/TileWMS';
import OlSourceWMTS from 'ol/source/WMTS';

/**
 * 通过图层名称（layerName属性）获取地图中对应的图层
 *
 * @param {import("ol/Map").default} map - 地图实例
 * @param {string} name - 要查找的图层名称（对应图层的layerName属性值）
 * @returns {import("ol/layer/Base").default|undefined} 匹配的图层实例，未找到则返回undefined
 */
export function getLayerByName(map, name) {
  const layers = getAllLayers(map);
  // 筛选出layerName属性与目标名称完全匹配的第一个图层
  return layers.find(layer => layer.get('layerName') === name);
}

/**
 * 通过WMS图层的参数名（LAYERS参数）查找对应的图层
 *
 * @param {import("ol/Map").default} map - 地图实例
 * @param {string} name - 要匹配的LAYERS参数值
 * @returns {import("../types").WMSLayer|undefined} 匹配的WMS图层，未找到则返回undefined
 */
export function getLayerByNameParam(map, name) {
  const layers = getAllLayers(map);
  // 遍历图层，查找WMS源中LAYERS参数匹配的图层
  return layers.find(layer => {
    if (!(layer instanceof OlLayerLayer)) return false;

    const source = layer.getSource();
    // 仅处理ImageWMS和TileWMS类型的图层源
    return (source instanceof OlSourceImageWMS || source instanceof OlSourceTileWMS)
      && source.getParams().LAYERS === name;
  });
}

/**
 * 获取所有图层（包括嵌套在LayerGroup中的图层），支持通过过滤器筛选
 *
 * @param {import("ol/Map").default|import("ol/layer/Group").default} collection - 图层集合（地图实例或图层组）
 * @param {(layer: import("ol/layer/Base").default) => boolean} [filter] - 图层过滤器函数，返回true则保留该图层
 * @returns {import("ol/layer/Base").default[]} 所有符合条件的图层数组
 */
export function getAllLayers(collection, filter = () => true) {
  const layers = collection.getLayers().getArray();
  // 递归扁平化图层结构（处理嵌套的LayerGroup）
  return layers.flatMap(layer => {
    const result = [];
    // 若为图层组，递归获取其子图层
    if (layer instanceof OlLayerGroup) {
      result.push(...getAllLayers(layer, filter));
    }
    // 应用过滤器，符合条件则添加到结果
    if (filter(layer)) {
      result.push(layer);
    }
    return result;
  });
}

/**
 * 获取指定图层的URL（支持WMS和WMTS类型图层）
 *
 * @param {import("../types").WMSOrWMTSLayer} layer - 目标图层（WMS或WMTS类型）
 * @returns {string} 图层的URL，获取失败则返回空字符串
 */
export function getLayerUrl(layer) {
  const source = layer.getSource();

  // 根据图层源类型获取URL
  if (source instanceof OlSourceTileWMS) {
    return source.getUrls()?.[0] ?? '';
  } else if (source instanceof OlSourceImageWMS) {
    return source.getUrl() ?? '';
  } else if (source instanceof OlSourceWMTS) {
    return source.getUrls()?.[0] ?? '';
  }

  return '';
}

/**
 * 通过图层名称（layerName）清除并移除地图中匹配的图层
 *
 * @param {import("ol/Map").default} map - 地图实例
 * @param {string} name - 要移除的图层名称（layerName属性包含该值）
 */
export function removeLayer(map, name) {
  const layers = getAllLayers(map);
  const targetLayers = layers.filter(layer => {
    const layerName = layer.get('layerName');
    // 筛选出layerName包含目标名称的图层
    return layerName && layerName.includes(name);
  });

  // 清除图层要素并从地图中移除
  targetLayers.forEach(layer => {
    layer.getSource()?.clear(); // 兼容无source的图层（避免报错）
    map.removeLayer(layer);
  });
}

/**
 * 通过图层名称（layerName）设置匹配图层的显示/隐藏状态
 *
 * @param {import("ol/Map").default} map - 地图实例
 * @param {string} name - 目标图层名称（layerName属性包含该值）
 * @param {boolean} status - 显示状态（true为显示，false为隐藏）
 */
export function setLayerVisible(map, name, status) {
  const layers = getAllLayers(map);

  layers.forEach(layer => {
    const layerName = layer.get('layerName');
    // 对layerName包含目标名称的图层设置可见性
    if (layerName && layerName.includes(name)) {
      layer.setVisible(status);
    }
  });
}
