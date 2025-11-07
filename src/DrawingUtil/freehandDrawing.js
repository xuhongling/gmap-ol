import { Draw, Modify, Snap } from 'ol/interaction';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { getOptionsStyle } from '../MapUtil/MapUtil';
import { modifyStyle } from './StyleConfig.js';
import { removeLayer } from '../LayerUtil/LayerUtil';

// 全局状态变量（跟踪自由手绘相关实例）
let currentMap = null; // 当前地图实例
let freehandSource = null; // 自由手绘数据源
let modifyInteraction = null; // 修改交互实例
let drawInteraction = null; // 手绘交互实例
let snapInteraction = null; // 吸附交互实例
let freehandLayer = null; // 手绘图层


/**
 * 在地图上创建自由手绘交互（支持自由绘制、修改图形，触发回调返回绘制数据）
 * @param {import("ol/Map").default} map - 地图实例
 * @param {Object} drawOptions - 手绘配置项
 * @param {string} drawOptions.type - 绘制类型（如'LineString'|'Polygon'，自由手绘常用线/面）
 * @param {boolean} [drawOptions.clearPrevious=false] - 开始绘制前是否清除已有手绘内容
 * @param {Object} [drawOptions.styles={}] - 自定义手绘样式（覆盖默认样式）
 * @param {(source: VectorSource) => void} freehandDrawCallbackFn - 绘制/修改结束后的回调函数（参数为包含手绘要素的数据源）
 */
const freehandDrawing = (map, drawOptions, freehandDrawCallbackFn) => {
  if (!map) return; // 地图实例不存在时终止

  // 初始化全局状态
  currentMap = map;
  freehandSource = new VectorSource({ wrapX: false }); // 关闭X轴环绕（避免跨半球绘制异常）
  modifyInteraction = new Modify({
    source: freehandSource,
    style: modifyStyle // 修改时的样式
  });

  // 移除已存在的手绘和吸附交互（避免重复添加）
  if (drawInteraction) {
    currentMap.removeInteraction(drawInteraction);
    currentMap.removeInteraction(snapInteraction);
  }

  // 解析配置项（设置默认值）
  const { type: drawType, clearPrevious = false, styles = {} } = drawOptions;

  // 创建手绘图层（用于展示手绘要素）
  freehandLayer = new VectorLayer({
    source: freehandSource,
    zIndex: 1000, // 确保图层在顶层显示
    style: (feature) => styleFunction(feature, styles) // 动态生成样式
  });
  // 为图层设置唯一名称（含随机数避免多实例冲突）
  freehandLayer.set('layerName', `FreehandDrawFeatureVectorLayer_${Math.floor(Math.random() * 100 + 1)}`);

  // 添加图层和修改交互到地图
  currentMap.addLayer(freehandLayer);
  currentMap.addInteraction(modifyInteraction);

  /**
   * 添加自由手绘和吸附交互
   * 核心：设置freehand: true启用自由绘制模式
   */
  const addFreehandInteractions = () => {
    drawInteraction = new Draw({
      source: freehandSource,
      type: drawType,
      freehand: true // 启用自由手绘模式（区别于普通点选绘制）
    });
    currentMap.addInteraction(drawInteraction);

    // 创建吸附交互（提升手绘精度，吸附到已有要素）
    snapInteraction = new Snap({ source: freehandSource });
    currentMap.addInteraction(snapInteraction);
  };

  // 初始化手绘交互
  addFreehandInteractions();

  // 手绘开始事件
  drawInteraction.on('drawstart', () => {
    // 清除历史手绘内容（若配置需要）
    if (clearPrevious) {
      clearFreehandDraw();
    }
    // 绘制时临时禁用修改交互（避免冲突）
    modifyInteraction.setActive(false);
  });

  // 手绘结束事件（触发回调返回最新数据）
  drawInteraction.on('drawend', () => {
    setTimeout(() => {
      freehandDrawCallbackFn?.(freehandSource);
      // 重新激活修改交互
      modifyInteraction.setActive(true);
    }, 100);
  });

  // 修改结束事件（触发回调返回最新数据）
  modifyInteraction.on('modifyend', () => {
    setTimeout(() => {
      freehandDrawCallbackFn?.(freehandSource);
    }, 100);
  });

  /**
   * 生成手绘要素的样式（合并默认样式与自定义样式）
   * @param {import("ol/Feature").default} feature - 手绘的要素
   * @param {Object} customStyles - 用户自定义样式
   * @returns {import("ol/style/Style").default|import("ol/style/Style").default[]} 要素样式
   */
  const styleFunction = (feature, customStyles) => {
    // 默认手绘样式（自由绘制通常需要清晰的线条和填充）
    const defaultStyle = {
      fill: {
        color: 'rgba(255, 255, 255, 0.5)', // 半透明白色填充（面要素）
      },
      stroke: {
        width: 2,
        color: 'rgba(0, 153, 255, 1)', // 亮蓝色描边（线/面边界）
      },
      image: {
        radius: 6, // 点要素半径（自由手绘较少用点，预留配置）
        stroke: { color: 'rgba(255, 255, 255, 1)' },
        fill: { color: 'rgba(0, 153, 255, 1)' },
      },
    };

    // 合并默认样式与用户自定义样式（自定义样式优先级更高）
    const mergedStyle = { ...defaultStyle, ...customStyles };
    return getOptionsStyle(mergedStyle);
  };
};


/**
 * 清除当前所有自由手绘的要素（保留图层和交互）
 */
const clearFreehandDraw = () => {
  if (freehandSource) freehandSource.clear();
  if (freehandLayer?.getSource()) freehandLayer.getSource().clear();
};


/**
 * 完全移除自由手绘功能（移除交互、图层和数据）
 */
const removeFreehandDraw = () => {
  if (!currentMap) return;

  // 移除手绘和吸附交互
  if (drawInteraction) {
    currentMap.removeInteraction(drawInteraction);
    drawInteraction = null;
  }
  if (snapInteraction) {
    currentMap.removeInteraction(snapInteraction);
    snapInteraction = null;
  }

  // 移除修改交互
  if (modifyInteraction) {
    currentMap.removeInteraction(modifyInteraction);
    modifyInteraction = null;
  }

  // 清除手绘数据
  clearFreehandDraw();

  // 移除手绘图层
  if (freehandLayer) {
    removeLayer(currentMap, 'FreehandDrawFeatureVectorLayer');
    freehandLayer = null;
  }

  // 重置数据源
  freehandSource = null;
};


export { freehandDrawing, removeFreehandDraw };
