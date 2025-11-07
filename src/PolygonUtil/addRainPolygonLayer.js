import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Fill, Style } from 'ol/style';

/**
 * 从GeoJSON数据添加雨量多边形图层到地图
 * （根据要素的highValue和lowValue匹配颜色配置，设置多边形填充色）
 *
 * @param {import("ol/Map").default} olmap - 目标地图实例
 * @param {Object} rainPolygonGeoJSON - GeoJSON格式的雨量多边形要素数据
 * @param {Object} rainPolygonOptions - 图层配置选项
 * @param {string} [rainPolygonOptions.layerName] - 图层名称（用于标识图层）
 * @param {number} [rainPolygonOptions.zIndex=3] - 图层层级（默认3）
 * @param {boolean} [rainPolygonOptions.visible=true] - 图层初始可见性（默认可见）
 * @param {Array<Object>} rainPolygonOptions.renderColor - 雨量颜色配置数组
 * @param {number} rainPolygonOptions.renderColor[].minvalue - 该颜色对应的最小值
 * @param {number} rainPolygonOptions.renderColor[].maxvalue - 该颜色对应的最大值
 * @param {string} rainPolygonOptions.renderColor[].color - 该区间对应的填充色（rgba或hex）
 */
function addRainPolygonLayer(olmap, rainPolygonGeoJSON, rainPolygonOptions) {
  // 地图实例不存在时终止执行
  if (!olmap) return;

  /**
   * 获取雨量多边形要素的样式（根据highValue和lowValue匹配颜色配置）
   * @param {import("ol/Feature").default} feature - 雨量多边形要素
   * @returns {Style} 要素样式（包含填充色）
   */
  const getFeatureStyles = (feature) => {
    // 获取要素的高低值属性（用于匹配颜色区间）
    const highValue = feature.get('highValue');
    const lowValue = feature.get('lowValue');
    // 默认填充色为透明
    let fillColor = 'rgba(0, 0, 0, 0)';
    // 获取颜色配置数组
    const renderColor = rainPolygonOptions.renderColor || [];

    // 遍历颜色配置，匹配高低值所在区间
    for (const colorItem of renderColor) {
      const { minvalue, maxvalue, color } = colorItem;
      // 当要素高低值完全落在当前区间内时，应用对应颜色
      if (lowValue >= minvalue && highValue <= maxvalue) {
        fillColor = color;
        break; // 匹配到后终止循环
      }
    }

    // 创建并返回样式（仅包含填充配置）
    return new Style({
      fill: new Fill({ color: fillColor }),
    });
  };

  // 创建雨量多边形矢量图层
  const vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(rainPolygonGeoJSON), // 解析GeoJSON数据
    }),
    zIndex: rainPolygonOptions.zIndex ?? 3, // 层级默认3
    visible: rainPolygonOptions.visible ?? true, // 默认可见
    style: getFeatureStyles, // 绑定样式函数
  });

  // 设置图层标识属性（用于后续查找/操作图层）
  const layerName = rainPolygonOptions.layerName ?? '';
  vectorLayer.set('layerName', layerName);

  // 添加图层到地图
  olmap.addLayer(vectorLayer);
}

export default addRainPolygonLayer;
