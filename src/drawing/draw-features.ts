/**
 * 绘制模块:点选式绘制(Draw + Modify + Snap)与移除
 *
 * 使用 WeakMap 按地图实例隔离状态;重复调用时会先完整清理旧状态再装配新状态。
 */
import type Feature from 'ol/Feature';
import type Map from 'ol/Map';
import type { Geometry } from 'ol/geom';
import type { Type as GeometryType } from 'ol/geom/Geometry';
import { Draw, Modify, Snap } from 'ol/interaction';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import type { Style } from 'ol/style';
import { LAYER_PROP_NAME } from '../constants';
import { removeLayer } from '../layer';
import type { DrawCallback, DrawOptions, StyleOptions } from '../types';
import { deepMerge } from '../utils/clone';
import { getOptionsStyle } from '../utils/style';
import { modifyStyle } from './style-config';

/** 单个地图实例的绘制状态 */
interface DrawState {
  drawSource: VectorSource<Feature<Geometry>> | null;
  modifyInteraction: Modify | null;
  drawInteraction: Draw | null;
  snapInteraction: Snap | null;
  drawLayer: VectorLayer<Feature<Geometry>> | null;
}

// 使用 WeakMap 存储每个地图实例的绘制状态,支持多地图实例和自动垃圾回收
const drawStateMap = new WeakMap<Map, DrawState>();

/**
 * 获取或创建地图实例的绘制状态
 * @param map - 地图实例
 * @returns 绘制状态对象
 */
function getDrawState(map: Map): DrawState {
  let state = drawStateMap.get(map);
  if (!state) {
    state = {
      drawSource: null,
      modifyInteraction: null,
      drawInteraction: null,
      snapInteraction: null,
      drawLayer: null,
    };
    drawStateMap.set(map, state);
  }
  return state;
}

/**
 * 生成绘制要素的样式(深合并默认样式与自定义样式)
 * @param customStyles - 用户自定义样式
 * @returns 要素样式
 */
function buildDrawStyle(customStyles: StyleOptions): Style {
  // 默认样式配置
  const defaultStyle = {
    fill: {
      color: 'rgba(255, 255, 255, 0.5)',
    },
    stroke: {
      width: 2,
      color: 'rgba(0, 153, 255, 1)',
    },
    image: {
      radius: 6,
      stroke: {
        color: 'rgba(255, 255, 255, 1)',
      },
      fill: {
        color: 'rgba(0, 153, 255, 1)',
      },
    },
  };

  // 深拷贝合并,避免污染默认样式
  const mergedStyle = deepMerge({}, defaultStyle, customStyles as Record<string, unknown>);
  return getOptionsStyle(mergedStyle);
}

/**
 * 完整清理指定地图的绘制状态(移除全部交互与图层、清空数据源)
 * @param map - 地图实例
 * @param state - 绘制状态对象
 */
function cleanupDrawState(map: Map, state: DrawState): void {
  // 移除绘制和吸附交互
  if (state.drawInteraction) {
    map.removeInteraction(state.drawInteraction);
    state.drawInteraction = null;
  }
  if (state.snapInteraction) {
    map.removeInteraction(state.snapInteraction);
    state.snapInteraction = null;
  }

  // 移除修改交互
  if (state.modifyInteraction) {
    map.removeInteraction(state.modifyInteraction);
    state.modifyInteraction = null;
  }

  // 清除数据
  if (state.drawSource) {
    state.drawSource.clear();
  }

  // 移除绘制图层
  if (state.drawLayer) {
    const layerName = state.drawLayer.get(LAYER_PROP_NAME) as string | undefined;
    if (layerName) {
      removeLayer(map, layerName);
    } else {
      map.removeLayer(state.drawLayer);
    }
    state.drawLayer = null;
  }

  // 重置数据源
  state.drawSource = null;
}

/**
 * 在地图上创建绘制交互(支持绘制、修改图形,并触发回调返回绘制数据)
 * @param map - 地图实例
 * @param drawOptions - 绘制配置项
 * @param drawCallbackFn - 绘制/修改结束后的回调函数(参数为包含绘制要素的数据源)
 */
export function drawFeatures(map: Map, drawOptions: DrawOptions, drawCallbackFn?: DrawCallback): void {
  if (!map) return; // 地图实例不存在时终止

  // 获取当前地图的状态
  const state = getDrawState(map);

  // 重复调用时先完整清理旧状态(旧版只移除 Draw/Snap,会泄漏旧 Modify 交互与旧图层)
  cleanupDrawState(map, state);

  // 解析配置项(设置默认值)
  const { type: drawType, clearPrevious = false, styles = {} } = drawOptions;

  // 初始化状态
  const drawSource = new VectorSource<Feature<Geometry>>();
  const modifyInteraction = new Modify({
    source: drawSource,
    style: modifyStyle,
  });

  // 创建绘制图层(用于展示绘制的要素)
  const drawLayer = new VectorLayer<Feature<Geometry>>({
    source: drawSource,
    zIndex: 1000,
    style: () => buildDrawStyle(styles),
  });
  // 为图层设置唯一名称(使用时间戳避免冲突)
  drawLayer.set(LAYER_PROP_NAME, `DrawFeatureVectorLayer_${Date.now()}`);

  state.drawSource = drawSource;
  state.modifyInteraction = modifyInteraction;
  state.drawLayer = drawLayer;

  // 添加图层和修改交互到地图
  map.addLayer(drawLayer);
  map.addInteraction(modifyInteraction);

  // 创建绘制和吸附交互
  const drawInteraction = new Draw({
    source: drawSource,
    type: drawType as GeometryType,
  });
  map.addInteraction(drawInteraction);
  const snapInteraction = new Snap({ source: drawSource });
  map.addInteraction(snapInteraction);
  state.drawInteraction = drawInteraction;
  state.snapInteraction = snapInteraction;

  // 绘制开始事件
  drawInteraction.on('drawstart', () => {
    if (clearPrevious) {
      drawSource.clear();
    }
    modifyInteraction.setActive(false);
  });

  // 绘制结束事件(触发回调返回最新数据)
  drawInteraction.on('drawend', () => {
    setTimeout(() => {
      drawCallbackFn?.(drawSource);
      modifyInteraction.setActive(true);
    }, 100);
  });

  // 修改结束事件(触发回调返回最新数据)
  modifyInteraction.on('modifyend', () => {
    setTimeout(() => {
      drawCallbackFn?.(drawSource);
    }, 100);
  });
}

/**
 * 完全移除指定地图的绘制功能(移除交互、图层和数据)
 * @param map - 地图实例
 */
export function removeDraw(map: Map): void {
  if (!map) return;

  const state = drawStateMap.get(map);
  if (!state) return;

  cleanupDrawState(map, state);

  // 从 WeakMap 中移除该地图的状态(可选,因为 WeakMap 会自动清理)
  drawStateMap.delete(map);
}
