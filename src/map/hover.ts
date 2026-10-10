import Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import Point from 'ol/geom/Point';
import { Vector as VectorLayer } from 'ol/layer';
import type BaseLayer from 'ol/layer/Base';
import type Layer from 'ol/layer/Layer';
import type Map from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorSource from 'ol/source/Vector';
import type { Style } from 'ol/style';
import type { StyleLike } from 'ol/style/Style';
import { LAYER_PROP_HOVER, LAYER_PROP_TIPS } from '../constants';
import type { FeatureProperties, FillConfig, HoverOptions, ImageConfig, StyleOptions, TextConfig } from '../types';
import { getOptionsStyle } from '../utils/style';
import { judgeLayerVisible } from './judge-visible';

/** hoverChangeStyle 单次调用的清理记录 */
interface ChangeStyleConfig {
  handler: (event: MapBrowserEvent<UIEvent>) => void;
  features: Feature<Geometry>[];
}

/** hoverShowTips 单次调用的清理记录 */
interface TipsConfig {
  handler: (event: MapBrowserEvent<UIEvent>) => void;
  drawLayer: VectorLayer<Feature<Geometry>>;
}

/** 单个地图实例的 hover 状态 */
interface HoverState {
  changeStyleConfigs: ChangeStyleConfig[];
  tipsConfigs: TipsConfig[];
}

// 使用 WeakMap 管理每个地图实例的 hover 配置(仅用于清理)
const hoverStateMap = new WeakMap<Map, HoverState>();

function getHoverState(map: Map): HoverState {
  let state = hoverStateMap.get(map);
  if (!state) {
    state = { changeStyleConfigs: [], tipsConfigs: [] };
    hoverStateMap.set(map, state);
  }
  return state;
}

/**
 * 为地图添加 hover 样式变化效果
 * 当鼠标悬停在指定图层要素上时,改变要素样式
 *
 * @param olMap - 地图实例
 * @param hoverOptions - hover 配置项
 */
export function hoverChangeStyle(olMap: Map, hoverOptions: HoverOptions): void {
  if (!olMap) {
    return;
  }

  const state = getHoverState(olMap);

  // 本次调用的独立状态(闭包),避免多次调用互相覆盖
  const changeStyleLayers: BaseLayer[] = [];
  const changeStyleFeatures: Feature<Geometry>[] = [];

  const getFeatureStyles = (feature: Feature<Geometry>, layer: BaseLayer): Style => {
    const hoverLayerName = layer.get(LAYER_PROP_HOVER) as string | undefined;
    const isPointLayer = hoverLayerName?.includes('_Point');
    const properties = feature.getProperties();
    const textValue = hoverOptions.textFieldName ? properties[hoverOptions.textFieldName] : '';

    // 基础样式配置(使用新对象避免污染)
    const imageConfig: ImageConfig = {
      src: '',
      anchor: [0.5, 0.5],
      scale: 1.3,
      ...hoverOptions.styles?.image,
    };
    const textConfig: TextConfig = {
      font: '13px sans-serif',
      textAlign: 'center',
      textBaseline: 'middle',
      fill: { color: 'rgba(0, 0, 0, 0.85)' },
      stroke: {
        color: 'rgba(255, 255, 255, 0.75)',
        width: 2,
      },
      offsetY: isPointLayer ? 18 : 0,
      text: '',
      ...hoverOptions.styles?.text,
    };

    if (hoverOptions.icon) {
      imageConfig.src = hoverOptions.icon;
    }

    if (hoverOptions.textColor) {
      (textConfig.fill as FillConfig).color = hoverOptions.textColor;
    }

    if (textValue !== '') {
      textConfig.text = textValue;
    }

    return getOptionsStyle({ ...hoverOptions.styles, image: imageConfig, text: textConfig });
  };

  // 筛选符合条件的 hover 图层
  const allLayers = olMap.getLayers().getArray();
  allLayers.forEach((layer) => {
    const zIndex = layer.getZIndex();
    const hoverLayerName = layer.get(LAYER_PROP_HOVER);
    if (
      zIndex !== undefined &&
      zIndex >= 3 &&
      zIndex < 1000 &&
      typeof hoverLayerName === 'string' &&
      hoverLayerName.includes(`${LAYER_PROP_HOVER}${hoverOptions.layerName}`)
    ) {
      changeStyleLayers.push(layer);
    }
  });

  const pointerMoveHandler = (event: MapBrowserEvent<UIEvent>): void => {
    // 恢复之前悬停要素的样式
    if (changeStyleFeatures.length > 0) {
      while (changeStyleFeatures.length > 0) {
        changeStyleFeatures.pop()?.setStyle(null as unknown as StyleLike);
      }
      const targetElement = olMap.getTargetElement();
      if (targetElement) {
        targetElement.style.cursor = 'default';
      }
    }

    const pixel = olMap.getEventPixel(event.originalEvent);

    // 检查每个 hover 图层的要素
    changeStyleLayers.forEach((layer) => {
      if (judgeLayerVisible(layer, olMap)) {
        (layer as Layer).getFeatures(pixel).then((features) => {
          (features as Feature<Geometry>[]).forEach((feature) => {
            const hoverStyle = getFeatureStyles(feature, layer);
            feature.setStyle(hoverStyle);
            changeStyleFeatures.push(feature);
            const targetElement = olMap.getTargetElement();
            if (targetElement) {
              targetElement.style.cursor = 'pointer';
            }
          });
        });
      }
    });
  };

  olMap.on('pointermove', pointerMoveHandler);

  // 记录本次配置,供 clearHoverChangeStyle 清理
  state.changeStyleConfigs.push({
    handler: pointerMoveHandler,
    features: changeStyleFeatures,
  });
}

/**
 * 清理 hoverChangeStyle 添加的事件监听
 * @param olMap - 地图实例
 */
export function clearHoverChangeStyle(olMap: Map): void {
  if (!olMap) return;

  const state = hoverStateMap.get(olMap);
  if (state && state.changeStyleConfigs.length > 0) {
    state.changeStyleConfigs.forEach((config) => {
      // 恢复本次配置中所有悬停要素的样式
      if (config.features.length > 0) {
        config.features.forEach((feature) => feature.setStyle(null as unknown as StyleLike));
        config.features.length = 0;
      }
      olMap.un('pointermove', config.handler);
    });
    state.changeStyleConfigs = [];
  }
}

/**
 * 为地图添加 hover 提示效果
 * 当鼠标悬停在指定图层要素上时,显示提示信息
 *
 * @param olMap - 地图实例
 * @param hoverOptions - hover 配置项
 */
export function hoverShowTips(olMap: Map, hoverOptions: HoverOptions): void {
  if (!olMap) {
    return;
  }

  const state = getHoverState(olMap);

  // 本次调用的独立状态(闭包),避免多次调用互相覆盖
  const tipsLayers: BaseLayer[] = [];

  // 筛选符合条件的提示图层
  const allLayers = olMap.getLayers().getArray();
  allLayers.forEach((layer) => {
    const zIndex = layer.getZIndex();
    const tipsLayerName = layer.get(LAYER_PROP_TIPS);
    if (
      zIndex !== undefined &&
      zIndex >= 1 &&
      zIndex < 1000 &&
      typeof tipsLayerName === 'string' &&
      tipsLayerName.includes(`${LAYER_PROP_TIPS}${hoverOptions.layerName}`)
    ) {
      tipsLayers.push(layer);
    }
  });

  // 创建提示图层(用于显示提示信息)
  const tipsSource = new VectorSource<Feature<Geometry>>();
  const tipsDrawLayer = new VectorLayer<Feature<Geometry>>({
    source: tipsSource,
    zIndex: 1000,
  });
  olMap.addLayer(tipsDrawLayer);

  // 使用递增的请求 ID 丢弃过期的异步结果
  let currentRequestId = 0;

  const tipsPointerMoveHandler = async (event: MapBrowserEvent<UIEvent>): Promise<void> => {
    // 清除之前的提示
    tipsSource.clear(true);

    const pixel = olMap.getEventPixel(event.originalEvent);
    const thisRequestId = ++currentRequestId;

    // 检查每个提示图层的要素
    for (const layer of tipsLayers) {
      if (!judgeLayerVisible(layer, olMap)) continue;

      try {
        const features = await (layer as Layer).getFeatures(pixel);

        // 如果请求已过期,忽略结果
        if (thisRequestId !== currentRequestId) return;

        features.forEach((feature) => {
          // 复制要素属性(排除 geometry)
          const properties = feature.getProperties();
          const featureProps: FeatureProperties = {};
          Object.keys(properties).forEach((key) => {
            if (key !== 'geometry') {
              featureProps[key] = properties[key];
            }
          });

          // 创建提示样式(每次创建新对象避免污染)
          const tipStyle: StyleOptions = {
            text: {
              text: featureProps[hoverOptions.textFieldName as string] || '',
              maxAngle: Math.PI / 2,
              font: '14px Microsoft YaHei',
              offsetX: 46,
              offsetY: 24,
              fill: { color: '#333' },
              backgroundFill: { color: [246, 246, 246, 0.7] },
              backgroundStroke: {
                color: 'rgba(0, 0, 0, 0.1)',
                width: 1,
              },
              padding: [6, 6, 4, 6],
            },
          };

          // 创建提示要素
          const tipFeature = new Feature({
            geometry: new Point(olMap.getCoordinateFromPixel(pixel)),
            ...featureProps,
          });

          tipFeature.setStyle(getOptionsStyle(tipStyle));
          tipsSource.addFeature(tipFeature);
        });
      } catch (error) {
        console.error('获取要素失败:', error);
      }
    }
  };

  olMap.on('pointermove', tipsPointerMoveHandler);

  // 记录本次配置,供 clearHoverShowTips 清理
  state.tipsConfigs.push({
    handler: tipsPointerMoveHandler,
    drawLayer: tipsDrawLayer,
  });
}

/**
 * 清理 hoverShowTips 添加的事件和图层
 * @param olMap - 地图实例
 */
export function clearHoverShowTips(olMap: Map): void {
  if (!olMap) return;

  const state = hoverStateMap.get(olMap);
  if (state && state.tipsConfigs.length > 0) {
    state.tipsConfigs.forEach((config) => {
      olMap.un('pointermove', config.handler);
      if (config.drawLayer) {
        olMap.removeLayer(config.drawLayer);
      }
    });
    state.tipsConfigs = [];
  }
}
