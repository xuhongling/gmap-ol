import type Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import type Map from 'ol/Map';
import GeoJSON from 'ol/format/GeoJSON';
import type { Geometry } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, Style } from 'ol/style';
import {
  FEATURE_PROP_COLOR,
  FEATURE_PROP_NAME,
  LAYER_PROP_HOVER,
  LAYER_PROP_NAME,
  LAYER_PROP_PICK,
  LAYER_PROP_TIPS,
  buildHoverLayerName,
  buildPickLayerName,
  buildTipsLayerName,
} from '../constants';
import type { GeoJSONData, PolygonOptions, RainPolygonOptions } from '../types';
import { deepClone, deepMerge } from '../utils/clone';
import { getOptionsStyle } from '../utils/style';

/** 默认多边形样式配置(对象字面量类型,带隐式索引签名以满足 deepMerge 约束) */
type PolygonBaseStyle = {
  fill: { color: string };
  stroke: { width: number; color: string };
  text: { font: string; fill: { color: string }; text: string };
};

/** 默认多边形样式:函数返回新对象,避免样式对象被意外修改 */
const getDefaultBaseStyle = (): PolygonBaseStyle => ({
  fill: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  stroke: {
    width: 1,
    color: 'rgba(255, 0, 0, 0.5)',
  },
  text: {
    font: '12px Microsoft YaHei',
    fill: { color: 'rgba(0, 0, 0, 1)' },
    text: '',
  },
});

/**
 * 从GeoJSON数据添加多边形矢量图层到地图
 *
 * @param olMap - 目标地图实例
 * @param polygonGeoJSON - GeoJSON格式的多边形要素数据
 * @param polygonOptions - 图层配置选项(zIndex默认3,visible默认true,hoverStyle/featureColor默认true,styles与默认样式深合并)
 */
export function addPolygonLayer(olMap: Map, polygonGeoJSON: GeoJSONData, polygonOptions: PolygonOptions = {}): void {
  if (!olMap) return;

  const features = new GeoJSON().readFeatures(polygonGeoJSON);

  const baseStyle = deepMerge(deepClone(getDefaultBaseStyle()), (polygonOptions.styles || {}) as Record<string, unknown>);

  const getFeatureStyles = (feature: FeatureLike): Style => {
    const olFeature = feature as Feature<Geometry>;
    // 每次创建新的样式配置对象,避免多个要素共享同一配置
    const currentStyle = deepClone(baseStyle);

    if (polygonOptions.featureColor !== false) {
      const fillColor = olFeature.get('color') || olFeature.get('COLOR');
      if (fillColor) {
        currentStyle.fill.color = fillColor;
      }
    }

    olFeature.set(FEATURE_PROP_COLOR, currentStyle.fill.color);

    const textValue = polygonOptions.textFieldName ? olFeature.get(polygonOptions.textFieldName) : '';
    if (textValue) {
      currentStyle.text.text = String(textValue);
    }
    olFeature.set(FEATURE_PROP_NAME, textValue);

    return getOptionsStyle(currentStyle);
  };

  const vectorLayer = new VectorLayer({
    source: new VectorSource({
      features,
    }),
    zIndex: polygonOptions.zIndex ?? 3,
    visible: polygonOptions.visible ?? true,
    style: getFeatureStyles,
  });

  const layerName = polygonOptions.layerName ?? '';
  vectorLayer.set(LAYER_PROP_NAME, layerName);
  vectorLayer.set(LAYER_PROP_PICK, buildPickLayerName('Polygon', layerName));

  if (polygonOptions.hoverStyle ?? true) {
    vectorLayer.set(LAYER_PROP_TIPS, buildTipsLayerName(layerName, 'Polygon'));
    vectorLayer.set(LAYER_PROP_HOVER, buildHoverLayerName(layerName, 'Polygon'));
  }

  olMap.addLayer(vectorLayer);
}

/**
 * 从GeoJSON数据添加雨量多边形图层到地图
 * (根据要素的highValue和lowValue匹配颜色配置,设置多边形填充色)
 *
 * @param olMap - 目标地图实例
 * @param rainPolygonGeoJSON - GeoJSON格式的雨量多边形要素数据
 * @param rainPolygonOptions - 图层配置选项(renderColor为必填的颜色区间配置,zIndex默认3,visible默认true)
 */
export function addRainPolygonLayer(olMap: Map, rainPolygonGeoJSON: GeoJSONData, rainPolygonOptions: RainPolygonOptions): void {
  if (!olMap) return;

  const getFeatureStyles = (feature: FeatureLike): Style => {
    const olFeature = feature as Feature<Geometry>;
    const highValue = olFeature.get('highValue');
    const lowValue = olFeature.get('lowValue');
    let fillColor = 'rgba(0, 0, 0, 0)';
    const renderColor = rainPolygonOptions.renderColor || [];

    for (const colorItem of renderColor) {
      const { minvalue, maxvalue, color } = colorItem;
      if (lowValue >= minvalue && highValue <= maxvalue) {
        fillColor = color;
        break;
      }
    }

    return new Style({
      fill: new Fill({ color: fillColor }),
    });
  };

  const vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(rainPolygonGeoJSON),
    }),
    zIndex: rainPolygonOptions.zIndex ?? 3,
    visible: rainPolygonOptions.visible ?? true,
    style: getFeatureStyles,
  });

  const layerName = rainPolygonOptions.layerName ?? '';
  vectorLayer.set(LAYER_PROP_NAME, layerName);

  olMap.addLayer(vectorLayer);
}
