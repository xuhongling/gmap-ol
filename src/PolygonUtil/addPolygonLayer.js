import GeoJSON from 'ol/format/GeoJSON';
import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import { getOptionsStyle } from '../MapUtil/MapUtil';

/**
 * 从GeoJSON数据添加多边形矢量图层到地图
 *
 * @param {import("ol/Map").default} olmap - 目标地图实例
 * @param {Object} polygonGeoJSON - GeoJSON格式的多边形要素数据
 * @param {Object} polygonOptions - 图层配置选项
 * @param {string} [polygonOptions.layerName] - 图层名称（用于标识图层）
 * @param {number} [polygonOptions.zIndex=3] - 图层层级（默认3）
 * @param {boolean} [polygonOptions.visible=true] - 图层初始可见性（默认可见）
 * @param {string} [polygonOptions.textFieldName] - 用于显示文本的要素属性字段名
 * @param {Object} [polygonOptions.styles] - 自定义样式配置（覆盖默认样式）
 * @param {Object} [polygonOptions.styles.fill] - 填充样式配置
 * @param {Object} [polygonOptions.styles.stroke] - 描边样式配置
 * @param {Object} [polygonOptions.styles.text] - 文本样式配置
 * @param {boolean} [polygonOptions.hoverStyle=true] - 是否启用悬停样式和提示（默认启用）
 * @param {boolean} [polygonOptions.featureColor=true] - 是否使用要素自身的颜色属性（默认使用）
 */
function addPolygonLayer(olmap, polygonGeoJSON, polygonOptions) {
  // 地图实例不存在时终止执行
  if (!olmap) return;

  // 基础样式配置（默认多边形样式）
  const baseStyle = {
    fill: {
      color: 'rgba(255, 255, 255, 0.2)', // 默认半透明白色填充
    },
    stroke: {
      width: 1,
      color: 'rgba(255, 0, 0, 0.5)', // 默认半透明红色描边
    },
    text: {
      font: '12px Microsoft YaHei',
      fill: { color: 'rgba(0, 0, 0, 1)' }, // 文本默认黑色
      text: '', // 文本内容默认空
    },
    ...polygonOptions.styles, // 合并自定义样式（覆盖默认）
  };

  /**
   * 获取多边形要素的样式（支持动态颜色和文本）
   * @param {import("ol/Feature").default} feature - 多边形要素
   * @returns {import("ol/style/Style").default} 要素样式
   */
  const getFeatureStyles = (feature) => {
    // 若启用要素自身颜色，优先使用要素的color/COLOR属性
    if (polygonOptions.featureColor !== false) {
      const fillColor = feature.get('color') || feature.get('COLOR');
      if (fillColor) {
        baseStyle.fill.color = fillColor;
      }
    }

    // 存储填充颜色到要素属性（便于后续使用）
    feature.set('COLOR', baseStyle.fill.color);

    // 设置文本内容（从指定字段获取）
    const textValue = polygonOptions.textFieldName
      ? feature.get(polygonOptions.textFieldName)
      : '';
    if (textValue) {
      baseStyle.text.text = textValue;
    }

    // 存储名称到要素属性
    feature.set('NAME', textValue);

    return getOptionsStyle(baseStyle);
  };

  // 创建多边形矢量图层
  const vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(polygonGeoJSON), // 解析GeoJSON数据
    }),
    zIndex: polygonOptions.zIndex ?? 3, // 层级默认3
    visible: polygonOptions.visible ?? true, // 默认可见
    style: getFeatureStyles, // 绑定要素样式函数
  });

  // 设置图层标识属性（用于后续查找/操作图层）
  const layerName = polygonOptions.layerName ?? '';
  vectorLayer.set('layerName', layerName);
  vectorLayer.set('pickLayerName', `Polygon${layerName}`);

  // 启用悬停效果时，设置相关标识属性
  const enableHover = polygonOptions.hoverStyle ?? true;
  if (enableHover) {
    vectorLayer.set('tipsLayerName', `tipsLayerName${layerName}_Polygon`);
    vectorLayer.set('hoverLayerName', `hoverLayerName${layerName}_Polygon`);
  }

  // 添加图层到地图
  olmap.addLayer(vectorLayer);
}

export default addPolygonLayer;
