import { Draw, Modify, Snap } from 'ol/interaction';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { getOptionsStyle } from '../MapUtil/MapUtil';
import { modifyStyle } from './StyleConfig.js';
import { removeLayer } from '../LayerUtil/LayerUtil';

// 全局状态变量（跟踪当前绘制相关实例）
let currentMap = null; // 当前地图实例
let drawSource = null; // 绘制数据源
let modifyInteraction = null; // 修改交互实例
let drawInteraction = null; // 绘制交互实例
let snapInteraction = null; // 吸附交互实例
let drawLayer = null; // 绘制图层


/**
 * 在地图上创建绘制交互（支持绘制、修改图形，并触发回调返回绘制数据）
 * @param {import("ol/Map").default} map - 地图实例
 * @param {Object} drawOptions - 绘制配置项
 * @param {string} drawOptions.type - 绘制类型（如'Point'|'LineString'|'Polygon'）
 * @param {boolean} [drawOptions.clearPrevious=false] - 开始绘制前是否清除已有绘制
 * @param {Object} [drawOptions.styles={}] - 自定义绘制样式（覆盖默认样式）
 * @param {(source: VectorSource) => void} drawCallbackFn - 绘制/修改结束后的回调函数（参数为包含绘制要素的数据源）
 */
const drawFeatures = (map, drawOptions, drawCallbackFn) => {
  if (!map) return; // 地图实例不存在时终止

  // 初始化全局状态
  currentMap = map;
  drawSource = new VectorSource(); // 创建绘制数据源
  modifyInteraction = new Modify({
    source: drawSource,
    style: modifyStyle // 修改时的样式
  });

  // 移除已存在的绘制和吸附交互（避免重复）
  if (drawInteraction) {
    currentMap.removeInteraction(drawInteraction);
    currentMap.removeInteraction(snapInteraction);
  }

  // 解析配置项（设置默认值）
  const { type: drawType, clearPrevious = false, styles = {} } = drawOptions;

  // 创建绘制图层（用于展示绘制的要素）
  drawLayer = new VectorLayer({
    source: drawSource,
    zIndex: 1000, // 确保图层在顶层显示
    style: (feature) => styleFunction(feature, styles) // 动态生成样式
  });
  // 为图层设置唯一名称（含随机数避免冲突）
  drawLayer.set('layerName', `DrawFeatureVectorLayer_${Math.floor(Math.random() * 100 + 1)}`);

  // 添加图层和修改交互到地图
  currentMap.addLayer(drawLayer);
  currentMap.addInteraction(modifyInteraction);

  /**
   * 添加绘制和吸附交互
   */
  const addDrawInteractions = () => {
    // 创建绘制交互
    drawInteraction = new Draw({
      source: drawSource,
      type: drawType
    });
    currentMap.addInteraction(drawInteraction);

    // 创建吸附交互（提升绘制体验）
    snapInteraction = new Snap({ source: drawSource });
    currentMap.addInteraction(snapInteraction);
  };

  // 初始化绘制交互
  addDrawInteractions();

  // 绘制开始事件
  drawInteraction.on('drawstart', () => {
    // 清除历史绘制（若配置需要）
    if (clearPrevious) {
      clearDraw();
    }
    // 绘制时临时禁用修改交互
    modifyInteraction.setActive(false);
  });

  // 绘制结束事件（触发回调返回最新数据）
  drawInteraction.on('drawend', () => {
    setTimeout(() => {
      drawCallbackFn?.(drawSource);
      // 重新激活修改交互
      modifyInteraction.setActive(true);
    }, 100);
  });

  // 修改结束事件（触发回调返回最新数据）
  modifyInteraction.on('modifyend', () => {
    setTimeout(() => {
      drawCallbackFn?.(drawSource);
    }, 100);
  });

  /**
   * 生成绘制要素的样式（合并默认样式与自定义样式）
   * @param {import("ol/Feature").default} feature - 绘制的要素
   * @param {Object} customStyles - 用户自定义样式
   * @returns {import("ol/style/Style").default|import("ol/style/Style").default[]} 要素样式
   */
  const styleFunction = (feature, customStyles) => {
    // 默认样式配置
    const defaultStyle = {
      fill: {
        color: 'rgba(255, 255, 255, 0.5)', // 半透明白色填充
      },
      stroke: {
        width: 2,
        color: 'rgba(0, 153, 255, 1)', // 亮蓝色描边
        // lineDash: [10, 10], // 可选：虚线样式（默认未启用）
      },
      image: {
        radius: 6, // 点要素半径
        stroke: {
          color: 'rgba(255, 255, 255, 1)', // 点描边颜色
        },
        fill: {
          color: 'rgba(0, 153, 255, 1)', // 点填充颜色
        },
      },
    };

    // 合并默认样式与用户自定义样式（自定义样式优先级更高）
    const mergedStyle = { ...defaultStyle, ...customStyles };
    return getOptionsStyle(mergedStyle);
  };
};


/**
 * 清除当前所有绘制的要素（保留图层和交互）
 */
const clearDraw = () => {
  if (drawSource) drawSource.clear();
  if (drawLayer?.getSource()) drawLayer.getSource().clear();
};


/**
 * 完全移除绘制功能（移除交互、图层和数据）
 */
const removeDraw = () => {
  if (!currentMap) return;

  // 移除绘制和吸附交互
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

  // 清除数据
  clearDraw();

  // 移除绘制图层
  if (drawLayer) {
    removeLayer(currentMap, 'DrawFeatureVectorLayer');
    drawLayer = null;
  }

  // 重置数据源
  drawSource = null;
};


export { drawFeatures, removeDraw };
