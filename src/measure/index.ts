/**
 * 测量模块:距离测量、面积测量与测量结果清除
 *
 * 每个地图实例持有独立状态(含样式实例与分段样式池),避免跨地图串扰。
 */
import Feature from 'ol/Feature';
import type Map from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { LineString, Point } from 'ol/geom';
import type { Geometry } from 'ol/geom';
import type Polygon from 'ol/geom/Polygon';
import { Draw, Modify } from 'ol/interaction';
import type { DrawEvent } from 'ol/interaction/Draw';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { getArea, getLength } from 'ol/sphere';
import type { Style } from 'ol/style';
import type { MeasureOption } from '../types';
import { createClearStyle, createDefaultStyle, createLabelStyle, createModifyStyle, createSegmentStyle, createTipStyle } from './style-config';

/** 测量类型(距离测量为线,面积测量为面) */
type MeasureType = 'LineString' | 'Polygon';

/** 单个地图实例的测量状态 */
interface MeasureState {
  /** 测量绘制交互的数据源 */
  drawSource: VectorSource<Feature<Geometry>>;
  /** 测量结果展示图层的数据源 */
  drawLayerSource: VectorSource<Feature<Geometry>>;
  /** 清除按钮图层的数据源 */
  clearSource: VectorSource<Feature<Geometry>>;
  drawLayer: VectorLayer<Feature<Geometry>>;
  clearLayer: VectorLayer<Feature<Geometry>>;
  modifyInteraction: Modify;
  drawInteraction: Draw | null;
  measureType: MeasureType;
  showSegments: boolean;
  clearPrevious: boolean;
  isInitialized: boolean;
  /* ---- 以下样式均为每地图独立实例 ---- */
  defaultStyle: Style;
  labelStyle: Style;
  tipStyle: Style;
  modifyStyle: Style;
  /** 分段样式池(按分段数动态 clone 扩充) */
  segmentStyles: Style[];
  clearStyle: Style;
  /** 清除按钮点击处理(持久绑定) */
  singleClickHandler: (event: MapBrowserEvent<UIEvent>) => void;
  /** 悬停清除按钮的光标处理(持久绑定) */
  pointerMoveHandler: (event: MapBrowserEvent<UIEvent>) => void;
}

// 使用 WeakMap 存储每个地图实例的独立状态,避免全局污染,支持自动垃圾回收
const measureStateMap = new WeakMap<Map, MeasureState>();

/**
 * 获取或创建地图实例的测量状态
 * @param map - 地图实例
 * @returns 测量状态对象
 */
function getMeasureState(map: Map): MeasureState {
  const existingState = measureStateMap.get(map);
  if (existingState) {
    return existingState;
  }

  const drawSource = new VectorSource<Feature<Geometry>>();
  const drawLayerSource = new VectorSource<Feature<Geometry>>();
  const clearSource = new VectorSource<Feature<Geometry>>();
  const modifyStyle = createModifyStyle();

  const drawLayer = new VectorLayer<Feature<Geometry>>({
    source: drawLayerSource,
    style: (feature) => styleFunction(feature as Feature<Geometry>, map, state, state.showSegments),
    zIndex: 1000,
  });
  const clearLayer = new VectorLayer<Feature<Geometry>>({
    source: clearSource,
    zIndex: 1100,
  });
  const modifyInteraction = new Modify({
    source: drawSource,
    style: modifyStyle,
  });

  // 清除按钮点击处理(持久 handler,命中 ClearPoint 要素才清除测量结果)
  const singleClickHandler = (event: MapBrowserEvent<UIEvent>): void => {
    const pixel = map.getEventPixel(event.originalEvent);
    const feature = map.forEachFeatureAtPixel(pixel, (feat) => feat);
    if (feature?.get('name') === 'ClearPoint') {
      clearMeasure(map);
    }
  };
  // 悬停清除按钮时切换光标样式(持久 handler)
  const pointerMoveHandler = (event: MapBrowserEvent<UIEvent>): void => {
    const pixel = map.getEventPixel(event.originalEvent);
    const feature = map.forEachFeatureAtPixel(pixel, (feat) => feat);
    const targetElement = map.getTargetElement();
    if (targetElement) {
      targetElement.style.cursor = feature?.get('name') === 'ClearPoint' ? 'pointer' : 'auto';
    }
  };

  // 样式闭包仅在图层渲染时执行,届时 state 已完成初始化
  const state: MeasureState = {
    drawSource,
    drawLayerSource,
    clearSource,
    drawLayer,
    clearLayer,
    modifyInteraction,
    drawInteraction: null,
    measureType: 'LineString',
    showSegments: true,
    clearPrevious: true,
    isInitialized: false,
    defaultStyle: createDefaultStyle(),
    labelStyle: createLabelStyle(),
    tipStyle: createTipStyle(),
    modifyStyle,
    segmentStyles: [createSegmentStyle()],
    clearStyle: createClearStyle(),
    singleClickHandler,
    pointerMoveHandler,
  };
  measureStateMap.set(map, state);
  return state;
}

/**
 * 初始化测量所需的图层、修改交互与持久事件监听(仅首次调用时执行)
 * @param map - 地图实例
 */
function initMeasureLayers(map: Map): void {
  const state = getMeasureState(map);
  if (!state.isInitialized) {
    map.addLayer(state.drawLayer);
    map.addLayer(state.clearLayer);
    map.addInteraction(state.modifyInteraction);
    map.on('singleclick', state.singleClickHandler);
    map.on('pointermove', state.pointerMoveHandler);
    state.isInitialized = true;
  }
}

/**
 * 测量距离(线要素)
 * @param olMap - 地图实例
 * @param measureOption - 测量配置项
 * @param measureCallbackFn - 测量完成后的回调函数(参数为格式化的距离)
 */
export function measureLength(olMap: Map, measureOption?: MeasureOption, measureCallbackFn?: (length: string) => void): void {
  if (!olMap) return;

  const state = getMeasureState(olMap);
  state.measureType = 'LineString';
  initMeasureLayers(olMap);

  // 移除已存在的绘制交互
  removeExistingDrawInteraction(olMap);

  // 应用配置项
  if (measureOption) {
    state.showSegments = measureOption.showSegments ?? true;
    state.clearPrevious = measureOption.clearPrevious ?? true;
  }

  // 添加新的绘制交互
  addDrawInteraction(olMap, measureCallbackFn);
}

/**
 * 测量面积(面要素)
 * @param olMap - 地图实例
 * @param measureOption - 测量配置项
 * @param measureCallbackFn - 测量完成后的回调函数(参数为格式化的面积)
 */
export function measureArea(olMap: Map, measureOption?: MeasureOption, measureCallbackFn?: (area: string) => void): void {
  if (!olMap) return;

  const state = getMeasureState(olMap);
  state.measureType = 'Polygon';
  initMeasureLayers(olMap);

  // 移除已存在的绘制交互
  removeExistingDrawInteraction(olMap);

  // 应用配置项
  if (measureOption) {
    state.showSegments = measureOption.showSegments ?? true;
    state.clearPrevious = measureOption.clearPrevious ?? true;
  }

  // 添加新的绘制交互
  addDrawInteraction(olMap, measureCallbackFn);
}

/**
 * 清除指定地图的所有测量结果(要素、样式及交互状态)
 * @param olMap - 地图实例,不传则打印警告后直接返回(WeakMap 无法遍历全部地图)
 */
export function clearMeasure(olMap?: Map): void {
  if (!olMap) {
    console.warn('clearMeasure: 建议传入地图实例参数以确保正确清理');
    return;
  }
  const state = measureStateMap.get(olMap);
  if (state) {
    state.drawSource.clear();
    state.drawLayerSource.clear();
    state.clearSource.clear();
  }
}

/**
 * 移除地图中已存在的绘制交互
 * @param map - 地图实例
 */
function removeExistingDrawInteraction(map: Map): void {
  const state = measureStateMap.get(map);
  if (state?.drawInteraction) {
    map.removeInteraction(state.drawInteraction);
    state.drawInteraction = null;
  }
}

/**
 * 添加测量绘制交互并绑定相关事件
 * @param map - 地图实例
 * @param callback - 绘制完成后的回调函数(参数为格式化的测量结果)
 */
function addDrawInteraction(map: Map, callback?: (result: string) => void): void {
  const state = getMeasureState(map);

  // 操作提示文本
  const activeTip = state.measureType === 'Polygon' ? '单击以继续绘制多边形' : '单击以继续绘制线';
  const idleTip = '点击开始测量';
  let currentTip = idleTip;

  // 创建绘制交互
  state.drawInteraction = new Draw({
    source: state.drawSource,
    type: state.measureType,
    style: (feature) => styleFunction(feature as Feature<Geometry>, map, state, state.showSegments, state.measureType, currentTip),
  });
  const drawInteraction = state.drawInteraction;

  // 绘制开始事件
  drawInteraction.on('drawstart', () => {
    // 清除历史数据(若配置需要)
    if (state.clearPrevious) {
      clearMeasure(map);
    }
    // 临时禁用修改交互
    state.modifyInteraction.setActive(false);
    currentTip = activeTip;
  });

  // 绘制结束事件
  drawInteraction.on('drawend', (event: DrawEvent) => {
    // 将绘制完成的要素添加到显示图层
    state.drawLayerSource.addFeature(event.feature);

    // 恢复修改交互
    state.modifyInteraction.setActive(true);
    map.once('pointermove', () => {
      // 重置 modifyStyle 的几何覆盖(ol 运行时将 undefined 视为重置,d.ts 未显式声明)
      state.modifyStyle.setGeometry(undefined as unknown as Geometry);
    });
    currentTip = idleTip;

    // 双击结束绘制时移除交互
    map.once('dblclick', () => {
      removeExistingDrawInteraction(map);
    });

    // 计算测量结果并触发回调
    setTimeout(() => {
      const features = state.drawLayerSource.getFeatures();
      const lastFeature = features[features.length - 1];
      const geometry = lastFeature?.getGeometry();
      if (!geometry) return;

      const result = state.measureType === 'LineString' ? formatLength(geometry, map) : formatArea(geometry, map);
      callback?.(result);
    }, 100);
  });

  // 激活修改交互并添加绘制交互到地图
  state.modifyInteraction.setActive(true);
  map.addInteraction(drawInteraction);
}

/**
 * 格式化线要素长度(米 -> 千米,保留两位小数)
 * @param line - 线要素几何对象
 * @param map - 地图实例
 * @returns 格式化的长度字符串(如 "1.23 km" 或 "456.78 m")
 */
function formatLength(line: Geometry, map: Map): string {
  const projection = map.getView().getProjection();
  const length = getLength(line, { projection });

  return length > 100 ? `${Math.round((length / 1000) * 100) / 100} km` : `${Math.round(length * 100) / 100} m`;
}

/**
 * 格式化面要素面积(平方米 -> 平方千米,保留两位小数)
 * @param polygon - 面要素几何对象
 * @param map - 地图实例
 * @returns 格式化的面积字符串(如 "1.23 km²" 或 "456.78 m²")
 */
function formatArea(polygon: Geometry, map: Map): string {
  const projection = map.getView().getProjection();
  const area = getArea(polygon, { projection });

  return area > 10000 ? `${Math.round((area / 1000000) * 100) / 100} km²` : `${Math.round(area * 100) / 100} m²`;
}

/**
 * 测量要素的样式函数(动态生成要素、标签、分段的样式)
 * @param feature - 要设置样式的要素
 * @param map - 地图实例
 * @param state - 当前地图的测量状态
 * @param showSegments - 是否显示分段
 * @param drawType - 绘制类型('LineString' 或 'Polygon',缺省表示绘制完成后的静态展示)
 * @param tip - 操作提示文本
 * @returns 样式数组
 */
function styleFunction(
  feature: Feature<Geometry>,
  map: Map,
  state: MeasureState,
  showSegments: boolean,
  drawType?: MeasureType,
  tip?: string
): Style[] {
  const styles: Style[] = [state.defaultStyle];
  const geometry = feature.getGeometry();
  if (!geometry) {
    return styles;
  }
  const geometryType = geometry.getType();

  let labelPoint: Point | undefined;
  let labelText: string | undefined;
  let lineGeometry: LineString | undefined;

  // 根据几何类型计算标签点、文本和线几何
  if (!drawType || drawType === geometryType) {
    if (geometryType === 'Polygon') {
      const polygon = geometry as Polygon;
      labelPoint = polygon.getInteriorPoint(); // 面的内部点(用于显示面积标签)
      labelText = formatArea(polygon, map);
      lineGeometry = new LineString(polygon.getCoordinates()[0]); // 面的外环
    } else if (geometryType === 'LineString') {
      const line = geometry as LineString;
      labelPoint = new Point(line.getLastCoordinate()); // 线的终点(用于显示总长度标签)
      labelText = formatLength(line, map);
      lineGeometry = line;
    }
  }

  // 显示分段长度(仅对线要素有效)
  if (showSegments && lineGeometry) {
    let segmentIndex = 0;
    lineGeometry.forEachSegment((start, end) => {
      const segment = new LineString([start, end]);
      const segmentLabel = formatLength(segment, map);
      const segmentMidPoint = new Point(segment.getCoordinateAt(0.5)); // 分段中点

      // 动态扩充分段样式池(样式为本状态私有,可安全复用/克隆)
      if (state.segmentStyles.length - 1 < segmentIndex) {
        state.segmentStyles.push(state.segmentStyles[0].clone());
      }
      const segmentStyle = state.segmentStyles[segmentIndex];
      segmentStyle.setGeometry(segmentMidPoint);
      segmentStyle.getText()!.setText(segmentLabel);
      styles.push(segmentStyle);

      segmentIndex++;
    });
  }

  // 添加总长度/面积标签
  if (labelText && labelPoint) {
    state.labelStyle.setGeometry(labelPoint);
    state.labelStyle.getText()!.setText(labelText);
    styles.push(state.labelStyle);
  }

  // 添加操作提示(仅对点要素且无修改操作时)
  if (tip && geometryType === 'Point' && !state.modifyInteraction.getOverlay().getSource()?.getFeatures().length) {
    state.tipStyle.getText()!.setText(tip);
    styles.push(state.tipStyle);
  }

  // 添加清除按钮(绘制完成后)
  if (!drawType && labelPoint) {
    state.clearSource.clear();
    const clearFeature = new Feature({
      geometry: new Point(labelPoint.getFlatCoordinates()),
      name: 'ClearPoint',
    });
    clearFeature.setStyle(state.clearStyle);
    state.clearSource.addFeature(clearFeature);
  }

  return styles;
}
