/**
 * 自由手绘模块:自由绘制(freehand 模式的 Draw + Modify + Snap)与移除
 *
 * 旧版使用模块级全局单例状态,多地图互相覆盖且无法清理;
 * 新版改为 WeakMap 按地图隔离状态,另以模块级变量记录最近使用的地图,
 * 供无参的 removeFreehandDraw() 定位清理目标。
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
import { getOptionsStyle } from '../utils/style';
import { modifyStyle } from './style-config';

/** 单个地图实例的自由手绘状态 */
interface FreehandState {
  freehandSource: VectorSource<Feature<Geometry>> | null;
  modifyInteraction: Modify | null;
  drawInteraction: Draw | null;
  snapInteraction: Snap | null;
  freehandLayer: VectorLayer<Feature<Geometry>> | null;
}

// 使用 WeakMap 按地图隔离自由手绘状态(修复旧版全局单例导致的多地图互相覆盖问题)
const freehandStateMap = new WeakMap<Map, FreehandState>();

/** 最近一次调用 freehandDrawing 的地图(无参 removeFreehandDraw 的清理目标) */
let lastUsedMap: Map | null = null;

/**
 * 获取或创建地图实例的自由手绘状态
 * @param map - 地图实例
 * @returns 自由手绘状态对象
 */
function getFreehandState(map: Map): FreehandState {
  let state = freehandStateMap.get(map);
  if (!state) {
    state = {
      freehandSource: null,
      modifyInteraction: null,
      drawInteraction: null,
      snapInteraction: null,
      freehandLayer: null,
    };
    freehandStateMap.set(map, state);
  }
  return state;
}

/**
 * 生成手绘要素的样式(浅合并默认样式与自定义样式,自定义样式优先级更高)
 * @param customStyles - 用户自定义样式
 * @returns 要素样式
 */
function buildFreehandStyle(customStyles: StyleOptions): Style {
  // 默认手绘样式(自由绘制通常需要清晰的线条和填充)
  const defaultStyle = {
    fill: {
      color: 'rgba(255, 255, 255, 0.5)', // 半透明白色填充(面要素)
    },
    stroke: {
      width: 2,
      color: 'rgba(0, 153, 255, 1)', // 亮蓝色描边(线/面边界)
    },
    image: {
      radius: 6, // 点要素半径(自由手绘较少用点,预留配置)
      stroke: { color: 'rgba(255, 255, 255, 1)' },
      fill: { color: 'rgba(0, 153, 255, 1)' },
    },
  };

  return getOptionsStyle({ ...defaultStyle, ...customStyles });
}

/**
 * 完整清理指定地图的自由手绘状态(移除全部交互与图层、清空数据源)
 * @param map - 地图实例
 * @param state - 自由手绘状态对象
 */
function cleanupFreehandState(map: Map, state: FreehandState): void {
  // 移除手绘和吸附交互
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

  // 清除手绘数据
  if (state.freehandSource) {
    state.freehandSource.clear();
  }

  // 移除手绘图层(保持旧版行为:写死前缀,由 removeLayer 子串匹配移除)
  if (state.freehandLayer) {
    removeLayer(map, 'FreehandDrawFeatureVectorLayer');
    state.freehandLayer = null;
  }

  // 重置数据源
  state.freehandSource = null;
}

/**
 * 在地图上创建自由手绘交互(支持自由绘制、修改图形,触发回调返回绘制数据)
 * @param map - 地图实例
 * @param drawOptions - 手绘配置项
 * @param freehandDrawCallbackFn - 绘制/修改结束后的回调函数(参数为包含手绘要素的数据源)
 */
export function freehandDrawing(map: Map, drawOptions: DrawOptions, freehandDrawCallbackFn?: DrawCallback): void {
  if (!map) return; // 地图实例不存在时终止

  // 记录最近使用的地图(供无参 removeFreehandDraw 定位)
  lastUsedMap = map;

  // 获取当前地图的状态
  const state = getFreehandState(map);

  // 重复调用时先完整清理旧状态(旧版只移除 Draw/Snap,会泄漏旧 Modify 交互与旧图层)
  cleanupFreehandState(map, state);

  // 解析配置项(设置默认值)
  const { type: drawType, clearPrevious = false, styles = {} } = drawOptions;

  // 初始化状态(关闭X轴环绕,避免跨半球绘制异常)
  const freehandSource = new VectorSource<Feature<Geometry>>({ wrapX: false });
  const modifyInteraction = new Modify({
    source: freehandSource,
    style: modifyStyle,
  });

  // 创建手绘图层(用于展示手绘要素)
  const freehandLayer = new VectorLayer<Feature<Geometry>>({
    source: freehandSource,
    zIndex: 1000, // 确保图层在顶层显示
    style: () => buildFreehandStyle(styles),
  });
  // 为图层设置唯一名称(含随机数避免多实例冲突,保持旧版命名规则)
  freehandLayer.set(LAYER_PROP_NAME, `FreehandDrawFeatureVectorLayer_${Math.floor(Math.random() * 100 + 1)}`);

  state.freehandSource = freehandSource;
  state.modifyInteraction = modifyInteraction;
  state.freehandLayer = freehandLayer;

  // 添加图层和修改交互到地图
  map.addLayer(freehandLayer);
  map.addInteraction(modifyInteraction);

  // 创建自由手绘和吸附交互(核心:freehand: true 启用自由绘制模式)
  const drawInteraction = new Draw({
    source: freehandSource,
    type: drawType as GeometryType,
    freehand: true,
  });
  map.addInteraction(drawInteraction);
  const snapInteraction = new Snap({ source: freehandSource });
  map.addInteraction(snapInteraction);
  state.drawInteraction = drawInteraction;
  state.snapInteraction = snapInteraction;

  // 手绘开始事件
  drawInteraction.on('drawstart', () => {
    // 清除历史手绘内容(若配置需要)
    if (clearPrevious) {
      freehandSource.clear();
    }
    // 绘制时临时禁用修改交互(避免冲突)
    modifyInteraction.setActive(false);
  });

  // 手绘结束事件(触发回调返回最新数据)
  drawInteraction.on('drawend', () => {
    setTimeout(() => {
      freehandDrawCallbackFn?.(freehandSource);
      // 重新激活修改交互
      modifyInteraction.setActive(true);
    }, 100);
  });

  // 修改结束事件(触发回调返回最新数据)
  modifyInteraction.on('modifyend', () => {
    setTimeout(() => {
      freehandDrawCallbackFn?.(freehandSource);
    }, 100);
  });
}

/**
 * 完全移除自由手绘功能(移除交互、图层和数据)
 *
 * 残留限制:本函数保持旧版的无参签名,只能清理最近一次调用 freehandDrawing
 * 的地图;若有多张地图启用了自由手绘,其余地图的状态需待其成为"最近使用的地图"
 * 后再调用本函数清理(或随地图销毁由 WeakMap 自动回收)。
 */
export function removeFreehandDraw(): void {
  if (!lastUsedMap) return;

  const state = freehandStateMap.get(lastUsedMap);
  if (state) {
    cleanupFreehandState(lastUsedMap, state);
    freehandStateMap.delete(lastUsedMap);
  }
  lastUsedMap = null;
}
