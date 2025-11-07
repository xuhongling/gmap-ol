import { Vector as VectorLayer } from 'ol/layer';
import { Cluster, Vector as VectorSource } from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import { getOptionsStyle } from '../MapUtil/MapUtil';

/**
 * 从GeoJSON数据添加点矢量图层到地图
 *
 * @param {import("ol/Map").default} olmap - 目标地图实例
 * @param {Object} pointGeoJSON - GeoJSON格式的点要素数据
 * @param {Object} pointOptions - 图层配置选项
 * @param {string} [pointOptions.layerName] - 图层名称（用于标识图层）
 * @param {string} [pointOptions.className] - 图层CSS类名
 * @param {number} [pointOptions.zIndex=5] - 图层层级（默认5）
 * @param {boolean} [pointOptions.visible=true] - 图层初始可见性（默认可见）
 * @param {string} [pointOptions.textFieldName] - 用于显示文本的要素属性字段名
 * @param {string} [pointOptions.icon] - 点图标地址
 * @param {string} [pointOptions.textColor] - 文本颜色
 * @param {Object} [pointOptions.styles] - 自定义样式配置（覆盖默认样式）
 * @param {Object} [pointOptions.styles.image] - 点图像样式配置
 * @param {Object} [pointOptions.styles.text] - 点文本样式配置
 * @param {Object} [pointOptions.styles.circle] - 圆形样式配置（若存在则使用圆形样式）
 * @param {boolean} [pointOptions.hoverStyle=true] - 是否启用悬停样式和提示（默认启用）
 */
export function addPointLayer(olmap, pointGeoJSON, pointOptions) {
  // 地图实例不存在时终止执行
  if (!olmap) return;

  /**
   * 获取点要素的样式（支持动态文本和图标）
   * @param {import("ol/Feature").default} feature - 点要素
   * @returns {import("ol/style/Style").default} 要素样式
   */
  const getFeatureStyles = (feature) => {
    const properties = feature.getProperties();
    // 从配置字段获取文本内容
    const textValue = pointOptions.textFieldName
      ? properties[pointOptions.textFieldName]
      : '';

    // 基础样式配置
    const styles = {
      image: {
        src: '',
        anchor: [0.5, 0.5], // 中心点锚定
        scale: 1,
        ...pointOptions.styles?.image, // 合并自定义图像样式
      },
      text: {
        font: '11px Microsoft YaHei',
        textAlign: 'center',
        textBaseline: 'middle',
        fill: { color: 'rgba(0, 0, 0, 0.85)' },
        stroke: { color: 'rgba(255, 255, 255, 0.75)', width: 2 },
        offsetY: 16, // 文本在图标下方16px
        text: '',
        ...pointOptions.styles?.text, // 合并自定义文本样式
      },
    };

    // 若配置圆形样式，覆盖图像配置
    if (pointOptions.styles?.circle) {
      styles.image = { circle: pointOptions.styles.circle };
    }

    // 应用图标地址
    if (pointOptions.icon) {
      styles.image.src = pointOptions.icon;
    }

    // 应用文本颜色
    if (pointOptions.textColor) {
      styles.text.fill.color = pointOptions.textColor;
    }

    // 应用文本内容
    if (textValue) {
      styles.text.text = textValue;
    }

    return getOptionsStyle(styles);
  };

  // 创建点矢量图层
  const vectorLayer = new VectorLayer({
    className: pointOptions.className ?? '', // 类名默认空
    source: new VectorSource({
      features: new GeoJSON().readFeatures(pointGeoJSON), // 解析GeoJSON数据
    }),
    style: getFeatureStyles, // 绑定样式函数
    zIndex: pointOptions.zIndex ?? 5, // 层级默认5
    visible: pointOptions.visible ?? true, // 默认可见
  });

  // 设置图层标识属性（用于后续查找/操作）
  const layerName = pointOptions.layerName ?? '';
  vectorLayer.set('layerName', layerName);
  vectorLayer.set('pickLayerName', `Point${layerName}`);

  // 启用悬停效果时，设置相关标识
  const enableHover = pointOptions.hoverStyle ?? true;
  if (enableHover) {
    vectorLayer.set('tipsLayerName', `tipsLayerName${layerName}Point`);
    vectorLayer.set('hoverLayerName', `hoverLayerName${layerName}Point`);
  }

  // 添加图层到地图
  olmap.addLayer(vectorLayer);
}

/**
 * 从点数据添加支持缩放级别和聚合的点矢量图层到地图
 *
 * @param {import("ol/Map").default} olmap - 目标地图实例
 * @param {Object[]} pointData - 点数据数组（包含LGTD/LTTD坐标信息）
 * @param {Object} pointOptions - 图层配置选项
 * @param {string} [pointOptions.layerName] - 图层名称（用于标识图层）
 * @param {string} [pointOptions.className] - 图层CSS类名
 * @param {number} [pointOptions.zIndex=5] - 图层层级（默认5）
 * @param {boolean} [pointOptions.visible=true] - 图层初始可见性（默认可见）
 * @param {string} [pointOptions.textFieldName] - 用于显示文本的要素属性字段名
 * @param {string} [pointOptions.icon] - 点图标地址
 * @param {string} [pointOptions.textColor] - 文本颜色
 * @param {Object} [pointOptions.styles] - 自定义样式配置（覆盖默认样式）
 * @param {string} [pointOptions.zoomFieldName] - 用于区分缩放级别的字段名
 * @param {number} [pointOptions.zoomNumber=5.5] - 缩放级别偏移量（用于计算minZoom）
 * @param {boolean} [pointOptions.cluster=false] - 是否启用要素聚合（默认不启用）
 * @param {number} [pointOptions.distance=30] - 聚合距离（像素，启用聚合时有效）
 * @param {boolean} [pointOptions.hoverStyle=true] - 是否启用悬停样式和提示（默认启用）
 */
export function addPointDataLayer(olmap, pointData, pointOptions) {
  // 地图实例不存在或点数据为空时终止执行
  if (!olmap || !pointData || pointData.length === 0) return {};

  // 定义支持的缩放级别（用于分层显示）
  const zoomLevels = [2, 4, 6, 8];
  // 按缩放级别分组存储点数据
  const pointsByZoomLevel = { 2: [], 4: [], 6: [], 8: [] };

  // 将点数据按缩放级别分组
  pointData.forEach(point => {
    // 从配置字段获取当前点的缩放级别（默认2）
    const pointZoomLevel = pointOptions.zoomFieldName
      ? point[pointOptions.zoomFieldName]
      : 2;

    // 匹配到支持的缩放级别时，加入对应分组
    if (zoomLevels.includes(pointZoomLevel)) {
      pointsByZoomLevel[pointZoomLevel].push(point);
    }
  });

  /**
   * 将点数据格式化为GeoJSON要素
   * @param {Object} data - 单个点数据
   * @returns {Object} GeoJSON Feature对象
   */
  const formatFeature = (data) => {
    // 兼容大小写的经纬度字段（LGTD/lttd等）
    const longitude = data.LGTD ?? data.lgtd;
    const latitude = data.LTTD ?? data.lttd;
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      },
      properties: data,
    };
  };

  /**
   * 按缩放级别格式化数据为图层所需的GeoJSON集合
   * @param {Object[]} points - 某一缩放级别的点数据数组
   * @param {number} zoomKey - 缩放级别键值
   * @returns {Object[]} 图层数据数组（包含类型、缩放级别和GeoJSON数据）
   */
  const formatDataToLayer = (points, zoomKey) => {
    // 聚合为GeoJSON FeatureCollection
    const featureCollection = {
      type: 'FeatureCollection',
      features: points.map(formatFeature),
    };
    // 返回图层格式（固定类型为'Point'）
    return [{
      type: 'Point',
      zoom: zoomKey,
      data: featureCollection,
    }];
  };

  // 生成所有缩放级别的图层数据
  const layers = [];
  Object.entries(pointsByZoomLevel).forEach(([zoomKey, points]) => {
    if (points.length > 0) {
      // 格式化当前缩放级别的数据并添加到图层列表
      layers.push(...formatDataToLayer(points, zoomKey));
    }
  });

  // 为每个图层数据创建并添加到地图
  layers.forEach(layer => {
    /**
     * 获取点要素的样式（支持动态文本和图标）
     * @param {import("ol/Feature").default} feature - 点要素
     * @returns {import("ol/style/Style").default} 要素样式
     */
    const getFeatureStyles = (feature) => {
      const properties = feature.getProperties();
      // 从配置字段获取文本内容
      const textValue = pointOptions.textFieldName
        ? properties[pointOptions.textFieldName]
        : '';

      // 基础样式配置
      const styles = {
        image: {
          src: '',
          anchor: [0.5, 0.5], // 中心点锚定
          scale: 1,
          ...pointOptions.styles?.image, // 合并自定义图像样式
        },
        text: {
          font: '11px Microsoft YaHei',
          textAlign: 'center',
          textBaseline: 'middle',
          fill: { color: 'rgba(0, 0, 0, 0.85)' },
          stroke: { color: 'rgba(255, 255, 255, 0.75)', width: 2 },
          offsetY: 16, // 文本在图标下方16px
          text: '',
          ...pointOptions.styles?.text, // 合并自定义文本样式
        },
      };

      // 应用图标地址
      if (pointOptions.icon) {
        styles.image.src = pointOptions.icon;
      }

      // 应用文本颜色
      if (pointOptions.textColor) {
        styles.text.fill.color = pointOptions.textColor;
      }

      // 应用文本内容
      if (textValue) {
        styles.text.text = textValue;
        feature.set('NAME', textValue); // 存储名称到要素属性
      }

      return getOptionsStyle(styles);
    };

    // 创建矢量源（解析GeoJSON数据）
    let vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(layer.data),
    });

    // 启用聚合时，创建聚合源
    if (pointOptions.cluster) {
      vectorSource = new Cluster({
        distance: pointOptions.distance ?? 30, // 聚合距离默认30像素
        source: vectorSource,
      });
    }

    // 计算图层最小缩放级别（基于当前缩放键和偏移量）
    const minZoom = parseInt(layer.zoom) + (pointOptions.zoomNumber ?? 5.5);

    // 创建点矢量图层
    const vectorLayer = new VectorLayer({
      className: pointOptions.className ?? '', // 类名默认空
      source: vectorSource,
      style: getFeatureStyles, // 绑定样式函数
      zIndex: pointOptions.zIndex ?? 5, // 层级默认5
      minZoom, // 最小缩放级别（控制显示范围）
      visible: pointOptions.visible ?? true, // 默认可见
    });

    // 设置图层标识属性（用于后续查找/操作）
    const layerName = pointOptions.layerName ?? '';
    vectorLayer.set('layerName', layerName);
    vectorLayer.set('pickLayerName', `Point${layerName}`);

    // 启用悬停效果时，设置相关标识
    const enableHover = pointOptions.hoverStyle ?? true;
    if (enableHover) {
      vectorLayer.set('tipsLayerName', `tipsLayerName${layerName}_Point`);
      vectorLayer.set('hoverLayerName', `hoverLayerName${layerName}_Point`);
    }

    // 添加图层到地图
    olmap.addLayer(vectorLayer);
  });
}
