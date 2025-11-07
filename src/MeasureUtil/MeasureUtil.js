import Feature from 'ol/Feature';
import { Draw, Modify } from 'ol/interaction';
import { LineString, Point } from 'ol/geom';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { getArea, getLength } from 'ol/sphere';
import { defaultStyle, labelStyle, tipStyle, modifyStyle, segmentStyle, clearStyle } from './StyleConfig.js';

// 全局地图实例引用
let currentMap = null;
// 绘制交互实例（全局以便后续移除）
let drawInteraction = null;
// 测量类型（默认线要素）：'LineString'（距离）、'Polygon'（面积）
let measureType = 'LineString';
// 是否显示分段长度（适用于线要素）
let showSegments = true;
// 是否清除先前的测量数据
let clearPrevious = true;

// 分段样式数组（用于线要素的分段标注）
const segmentStyles = [segmentStyle];
// 绘制数据源
const drawSource = new VectorSource();
// 修改交互实例（用于编辑已绘制的要素）
let modifyInteraction = new Modify({
  source: drawSource,
  style: modifyStyle
});
// 提示点几何对象（用于显示操作提示）
let tipPointGeometry = null;

// 绘制图层（用于展示测量要素）
const drawLayer = new VectorLayer({
  source: new VectorSource(),
  style: (feature) => styleFunction(feature, showSegments),
  zIndex: 1000,
});

// 清除按钮图层（用于显示清除测量的图标）
const clearLayer = new VectorLayer({
  source: new VectorSource(),
  zIndex: 1100,
});

// 首次调用标识（确保图层和交互只初始化一次）
let isFirstInit = true;

/**
 * 初始化测量所需的图层和交互（仅首次调用时执行）
 */
function initMeasureLayers() {
  if (isFirstInit && currentMap) {
    currentMap.addLayer(drawLayer);
    currentMap.addLayer(clearLayer);
    currentMap.addInteraction(modifyInteraction);
    isFirstInit = false;
  }
}

/**
 * 测量距离（线要素）
 * @param {import("ol/Map").default} olmap - 地图实例
 * @param {Object} [measureOption] - 测量配置项
 * @param {boolean} [measureOption.showSegments=true] - 是否显示分段长度
 * @param {boolean} [measureOption.clearPrevious=true] - 是否清除先前测量数据
 * @param {(length: string) => void} [measureCallbackFn] - 测量完成后的回调函数（参数为格式化的距离）
 */
export function measureLength(olmap, measureOption, measureCallbackFn) {
  if (!olmap) return;

  currentMap = olmap;
  measureType = 'LineString';
  initMeasureLayers();

  // 移除已存在的绘制交互
  removeExistingDrawInteraction();

  // 应用配置项
  if (measureOption) {
    showSegments = measureOption.showSegments ?? true;
    clearPrevious = measureOption.clearPrevious ?? true;
  }

  // 添加新的绘制交互
  addDrawInteraction(measureCallbackFn);
}

/**
 * 测量面积（面要素）
 * @param {import("ol/Map").default} olmap - 地图实例
 * @param {Object} [measureOption] - 测量配置项
 * @param {boolean} [measureOption.showSegments=true] - 是否显示边界分段长度
 * @param {boolean} [measureOption.clearPrevious=true] - 是否清除先前测量数据
 * @param {(area: string) => void} [measureCallbackFn] - 测量完成后的回调函数（参数为格式化的面积）
 */
export function measureArea(olmap, measureOption, measureCallbackFn) {
  if (!olmap) return;

  currentMap = olmap;
  measureType = 'Polygon';
  initMeasureLayers();

  // 移除已存在的绘制交互
  removeExistingDrawInteraction();

  // 应用配置项
  if (measureOption) {
    showSegments = measureOption.showSegments ?? true;
    clearPrevious = measureOption.clearPrevious ?? true;
  }

  // 添加新的绘制交互
  addDrawInteraction(measureCallbackFn);
}

/**
 * 清除所有测量结果（要素、样式及交互状态）
 */
export function clearMeasure() {
  drawSource.clear();
  drawLayer.getSource().clear();
  clearLayer.getSource().clear();
}

/**
 * 移除地图中已存在的绘制交互
 */
function removeExistingDrawInteraction() {
  if (currentMap) {
    currentMap.getInteractions().forEach(interaction => {
      if (interaction instanceof Draw) {
        currentMap.removeInteraction(interaction);
      }
    });
  }
  drawInteraction = null;
}

/**
 * 添加绘制交互并绑定相关事件
 * @param {(result: string) => void} [callback] - 绘制完成后的回调函数
 */
function addDrawInteraction(callback) {
  // 操作提示文本
  const activeTip = `单击以继续绘制${measureType === 'Polygon' ? '多边形' : '线'}`;
  const idleTip = '点击开始测量';
  let currentTip = idleTip;

  // 创建绘制交互
  drawInteraction = new Draw({
    source: drawSource,
    type: measureType,
    style: (feature) => styleFunction(feature, showSegments, measureType, currentTip)
  });

  // 绘制开始事件
  drawInteraction.on('drawstart', () => {
    // 清除历史数据（若配置需要）
    if (clearPrevious) {
      clearMeasure();
    }
    // 临时禁用修改交互
    modifyInteraction.setActive(false);
    currentTip = activeTip;
  });

  // 绘制结束事件
  drawInteraction.on('drawend', (event) => {
    // 将绘制完成的要素添加到显示图层
    drawLayer.getSource().addFeature(event.feature);

    // 恢复修改交互
    modifyInteraction.setActive(true);
    currentMap.once('pointermove', () => {
      modifyStyle.setGeometry(null);
    });
    currentTip = idleTip;

    // 双击结束绘制时移除交互
    currentMap.once('dblclick', () => {
      currentMap.removeInteraction(drawInteraction);
    });

    // 绑定清除按钮点击事件
    currentMap.on('singleclick', (event) => {
      const pixel = currentMap.getEventPixel(event.originalEvent);
      const feature = currentMap.forEachFeatureAtPixel(pixel, feat => feat);
      if (feature?.get('name') === 'ClearPoint') {
        clearMeasure();
      }
    });

    // 鼠标悬停清除按钮时改变光标样式
    currentMap.on('pointermove', (event) => {
      const pixel = currentMap.getEventPixel(event.originalEvent);
      const feature = currentMap.forEachFeatureAtPixel(pixel, feat => feat);
      currentMap.getTargetElement().style.cursor = feature?.get('name') === 'ClearPoint'
        ? 'pointer'
        : 'auto';
    });

    // 计算测量结果并触发回调
    setTimeout(() => {
      const features = drawLayer.getSource().getFeatures();
      const lastFeature = features[features.length - 1];
      if (!lastFeature) return;

      const geometry = lastFeature.getGeometry();
      const result = measureType === 'LineString'
        ? formatLength(geometry)
        : formatArea(geometry);

      if (callback) callback(result);
    }, 100);
  });

  // 激活修改交互并添加绘制交互到地图
  modifyInteraction.setActive(true);
  currentMap.addInteraction(drawInteraction);
}

/**
 * 格式化线要素长度（米 -> 千米，保留两位小数）
 * @param {LineString} line - 线要素几何对象
 * @returns {string} 格式化的长度字符串（如 "1.23 km" 或 "456.78 m"）
 */
function formatLength(line) {
  const projection = currentMap.getView().getProjection();
  const length = getLength(line, { projection });

  return length > 100
    ? `${Math.round((length / 1000) * 100) / 100} km`
    : `${Math.round(length * 100) / 100} m`;
}

/**
 * 格式化面要素面积（平方米 -> 平方千米，保留两位小数）
 * @param {Polygon} polygon - 面要素几何对象
 * @returns {string} 格式化的面积字符串（如 "1.23 km²" 或 "456.78 m²"）
 */
function formatArea(polygon) {
  const projection = currentMap.getView().getProjection();
  const area = getArea(polygon, { projection });

  return area > 10000
    ? `${Math.round((area / 1000000) * 100) / 100} km²`
    : `${Math.round(area * 100) / 100} m²`;
}

/**
 * 测量要素的样式函数（动态生成要素、标签、分段的样式）
 * @param {Feature} feature - 要设置样式的要素
 * @param {boolean} showSegments - 是否显示分段
 * @param {string} [drawType] - 绘制类型（'LineString' 或 'Polygon'）
 * @param {string} [tip] - 操作提示文本
 * @returns {defaultStyle[]} 样式数组
 */
function styleFunction(feature, showSegments, drawType, tip) {
  const styles = [defaultStyle]; // 基础样式
  const geometry = feature.getGeometry();
  const geometryType = geometry.getType();

  let labelPoint, labelText, lineGeometry;

  // 根据几何类型计算标签点、文本和线几何
  if (!drawType || drawType === geometryType) {
    if (geometryType === 'Polygon') {
      labelPoint = geometry.getInteriorPoint(); // 面的内部点（用于显示面积标签）
      labelText = formatArea(geometry);
      lineGeometry = new LineString(geometry.getCoordinates()[0]); // 面的外环
    } else if (geometryType === 'LineString') {
      labelPoint = new Point(geometry.getLastCoordinate()); // 线的终点（用于显示总长度标签）
      labelText = formatLength(geometry);
      lineGeometry = geometry;
    }
  }

  // 显示分段长度（仅对线要素有效）
  if (showSegments && lineGeometry) {
    let segmentIndex = 0;
    lineGeometry.forEachSegment((start, end) => {
      const segment = new LineString([start, end]);
      const segmentLabel = formatLength(segment);
      const segmentMidPoint = new Point(segment.getCoordinateAt(0.5)); // 分段中点

      // 动态创建分段样式（复用或新增）
      if (segmentStyles.length - 1 < segmentIndex) {
        segmentStyles.push(segmentStyle.clone());
      }
      segmentStyles[segmentIndex].setGeometry(segmentMidPoint);
      segmentStyles[segmentIndex].getText().setText(segmentLabel);
      styles.push(segmentStyles[segmentIndex]);

      segmentIndex++;
    });
  }

  // 添加总长度/面积标签
  if (labelText && labelPoint) {
    labelStyle.setGeometry(labelPoint);
    labelStyle.getText().setText(labelText);
    styles.push(labelStyle);
  }

  // 添加操作提示（仅对点要素且无修改操作时）
  if (tip && geometryType === 'Point' && !modifyInteraction.getOverlay().getSource().getFeatures().length) {
    tipPointGeometry = geometry;
    tipStyle.getText().setText(tip);
    styles.push(tipStyle);
  }

  // 添加清除按钮（绘制完成后）
  if (!drawType && labelPoint) {
    clearLayer.getSource().clear();
    const clearFeature = new Feature({
      geometry: new Point(labelPoint.getFlatCoordinates()),
      name: 'ClearPoint'
    });
    clearFeature.setStyle(clearStyle);
    clearLayer.getSource().addFeature(clearFeature);
  }

  return styles;
}
