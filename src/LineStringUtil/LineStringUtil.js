import GeoJSON from 'ol/format/GeoJSON';
import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import { getOptionsStyle } from '../MapUtil/MapUtil';

/**
 * 从GeoJSON数据添加线矢量图层到地图
 *
 * @param {import("ol/Map").default} olmap - 目标地图实例
 * @param {Object} lineStringGeoJSON - GeoJSON格式的线要素数据
 * @param {Object} lineOptions - 图层配置选项
 * @param {string} [lineOptions.layerName] - 图层名称（用于标识图层）
 * @param {number} [lineOptions.zIndex=4] - 图层层级（默认4）
 * @param {boolean} [lineOptions.visible=true] - 图层初始可见性（默认可见）
 * @param {string} [lineOptions.textFieldName] - 用于显示文本的要素属性字段名
 * @param {Object} [lineOptions.styles] - 自定义样式配置（覆盖默认样式）
 * @param {boolean} [lineOptions.hoverStyle=true] - 是否启用悬停样式和提示（默认启用）
 * @param {boolean} [lineOptions.featureColor=true] - 是否使用要素自身的颜色属性（默认使用）
 */
export function addLineStringLayer(olmap, lineStringGeoJSON, lineOptions) {
  // 地图实例不存在时终止执行
  if (!olmap) return;

  // 基础样式配置（默认线样式）
  const baseStyle = {
    stroke: {
      width: 1,
      color: 'rgba(255, 0, 0, 1)', // 默认红色线
    },
    text: {
      font: '12px Microsoft YaHei',
      fill: { color: 'rgba(0, 0, 0, 1)' }, // 文本默认黑色
      text: '', // 文本内容默认空
    },
    ...lineOptions.styles, // 合并自定义样式（覆盖默认）
  };

  /**
   * 获取要素的样式（支持动态颜色和文本）
   * @param {import("ol/Feature").default} feature - 线要素
   * @returns {import("ol/style/Style").default} 要素样式
   */
  const getFeatureStyles = (feature) => {
    // 若启用要素自身颜色，优先使用要素的color/COLOR属性
    if (lineOptions.featureColor !== false) {
      const strokeColor = feature.get('color') || feature.get('COLOR');
      if (strokeColor) {
        baseStyle.stroke.color = strokeColor;
      }
    }

    // 存储线颜色到要素属性（便于后续使用）
    feature.set('LINE_COLOR', baseStyle.stroke.color);

    // 设置文本内容（从指定字段获取）
    const textValue = lineOptions.textFieldName
      ? feature.get(lineOptions.textFieldName)
      : '';
    if (textValue) {
      baseStyle.text.text = textValue;
    }

    // 存储名称到要素属性
    feature.set('NAME', textValue);

    return getOptionsStyle(baseStyle);
  };

  // 创建线矢量图层
  const vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(lineStringGeoJSON), // 解析GeoJSON数据
    }),
    zIndex: lineOptions.zIndex ?? 4, // 层级默认4
    visible: lineOptions.visible ?? true, // 默认可见
    style: getFeatureStyles, // 绑定要素样式函数
  });

  // 设置图层标识属性（用于后续查找/操作图层）
  const layerName = lineOptions.layerName ?? '';
  vectorLayer.set('layerName', layerName);
  vectorLayer.set('pickLayerName', `LineString${layerName}`);

  // 启用悬停效果时，设置相关标识属性
  const enableHover = lineOptions.hoverStyle ?? true;
  if (enableHover) {
    vectorLayer.set('tipsLayerName', `tipsLayerName${layerName}_LineString`);
    vectorLayer.set('hoverLayerName', `hoverLayerName${layerName}_LineString`);
  }

  // 添加图层到地图
  olmap.addLayer(vectorLayer);
}
