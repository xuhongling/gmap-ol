import OlLayerGroup from 'ol/layer/Group';
import OlLayerLayer from 'ol/layer/Layer';
import OlSourceImageWMS from 'ol/source/ImageWMS';
import OlSourceTileWMS from 'ol/source/TileWMS';
import OlSourceWMTS from 'ol/source/WMTS';

/**
 * 通过layerName获取地图对应的图层
 *
 * @param {import("ol/Map").default} map The map to use for lookup.
 * @param {string} name The name to get the layer by.
 */
export function getLayerByName(map, name) {
  const layers = getAllLayers(map);
  return layers.filter((layer) => {
    return layer.get('layerName') === name;
  })[0];
}

/**
 * 按指定的名称在地图查找对应的图层
 * (parameter LAYERS).
 *
 * @param {import("ol/Map").default} map The map to use for lookup.
 * @param {string} name The name to get the layer by.
 * @return {import("../types").WMSLayer|undefined} The result layer or undefined if the layer could not
 *                    be found.
 */
export function getLayerByNameParam(map, name) {
  let layers = getAllLayers(map);
  let layerCandidate;

  for (let layer of layers) {
    if (layer instanceof OlLayerLayer) {
      const source = layer.getSource();
      if (source instanceof OlSourceImageWMS || source instanceof OlSourceTileWMS) {
        if (layer.getSource().getParams()['LAYERS'] === name) {
          layerCandidate = layer;
          break;
        }
      }
    }
  }
  return layerCandidate;
}

/**
 * 获取所有图层的集合，包括隐藏的。
 *
 * @param {import("ol/Map").default|import("ol/layer/Group").default} collection The collection to get the layers
 *                                           from. This can be an ol.layer.Group
 *                                           or an ol.Map.
 * @param {(layer: import("ol/layer/Base").default) => boolean} [filter] A filter function that receives the layer.
 *                            If it returns true it will be included in the
 *                            returned layers.
 * @return {import("ol/layer/Base").default[]} An array of all Layers.
 */
export function getAllLayers(collection, filter = () => true) {
  let layers = collection.getLayers().getArray();
  return layers.flatMap(function (layer) {
    /** @type {import("ol/layer/Base").default[]} */
    let layers = [];
    if (layer instanceof OlLayerGroup) {
      layers = getAllLayers(layer, filter);
    }
    if (filter(layer)) {
      layers.push(layer);
    }
    return layers;
  });
}

/**
 * Returns the configured URL of the given layer.
 *
 * @param {import("../types").WMSOrWMTSLayer} layer The layer to get the URL from.
 * @returns {string} The layer URL.
 */
export function getLayerUrl(layer) {
  const layerSource = layer.getSource();
  let layerUrl = '';

  if (layerSource instanceof OlSourceTileWMS) {
    layerUrl = layerSource.getUrls()?.[0] ?? '';
  } else if (layerSource instanceof OlSourceImageWMS) {
    layerUrl = layerSource.getUrl() ?? '';
  } else if (layerSource instanceof OlSourceWMTS) {
    layerUrl = layerSource.getUrls()?.[0] ?? '';
  }
  return layerUrl;
}

/**
 * 通过layerName，清除地图指定图层要素
 *
 * @param {import("ol/Map").default} map The map to use for lookup.
 * @param {string} name The name to get the layer by.
 */
export function removeLayer(map, name) {
  const layers = getAllLayers(map);
  const localTargetLayer = [];
  layers.forEach((layer) => {
    if (layer.getProperties().layerName !== undefined) {
      const isVectorLayer = layer.getProperties().layerName.includes(name);
      if (isVectorLayer) {
        layer.getSource().clear();
        localTargetLayer.push(layer);
      }
    }
  });
  localTargetLayer.forEach((layer) => {
    map.removeLayer(layer);
  });
}

/**
 * 通过layerName、状态，设置图层显示隐藏
 *
 * @param {import("ol/Map").default} map The map to use for lookup.
 * @param {string} name The name to get the layer by.
 */
export function setLayerVisible(map, name, status) {
  const layers = getAllLayers(map);
  layers.forEach((layer) => {
    if (layer.getProperties().layerName !== undefined) {
      const isVectorLayer = layer.getProperties().layerName.includes(name);
      if (isVectorLayer) {
        layer.setVisible(status);
      }
    }
  });
}
