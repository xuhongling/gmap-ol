import type Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import type Map from 'ol/Map';
import GeoJSON from 'ol/format/GeoJSON';
import type { Geometry } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import type { Style } from 'ol/style';
import {
  FEATURE_PROP_LINE_COLOR,
  FEATURE_PROP_NAME,
  LAYER_PROP_HOVER,
  LAYER_PROP_NAME,
  LAYER_PROP_PICK,
  LAYER_PROP_TIPS,
  buildHoverLayerName,
  buildPickLayerName,
  buildTipsLayerName,
} from '../constants';
import type { GeoJSONData, LineStringOptions, StrokeConfig, StyleOptions, TextConfig } from '../types';
import { getOptionsStyle } from '../utils/style';

/**
 * 从GeoJSON数据添加线矢量图层到地图
 *
 * @param olMap - 目标地图实例
 * @param lineStringGeoJSON - GeoJSON格式的线要素数据
 * @param lineOptions - 图层配置选项(zIndex默认4,visible默认true,hoverStyle/featureColor默认true)
 */
export function addLineStringLayer(olMap: Map, lineStringGeoJSON: GeoJSONData, lineOptions: LineStringOptions = {}): void {
  if (!olMap) return;

  const getFeatureStyles = (feature: FeatureLike): Style => {
    const olFeature = feature as Feature<Geometry>;
    // 每次基于默认样式与自定义样式的浅合并生成新配置对象,避免逐要素改写共享对象造成颜色/文本污染
    const styleConfig: StyleOptions = {
      stroke: {
        width: 1,
        color: 'rgba(255, 0, 0, 1)',
      },
      text: {
        font: '12px Microsoft YaHei',
        fill: { color: 'rgba(0, 0, 0, 1)' },
        text: '',
      },
      ...lineOptions.styles,
    };

    if (lineOptions.featureColor !== false) {
      const strokeColor = olFeature.get('color') || olFeature.get('COLOR');
      if (strokeColor) {
        (styleConfig.stroke as StrokeConfig).color = strokeColor;
      }
    }

    olFeature.set(FEATURE_PROP_LINE_COLOR, (styleConfig.stroke as StrokeConfig).color);

    const textValue = lineOptions.textFieldName ? olFeature.get(lineOptions.textFieldName) : '';
    if (textValue) {
      (styleConfig.text as TextConfig).text = textValue;
    }
    olFeature.set(FEATURE_PROP_NAME, textValue);

    return getOptionsStyle(styleConfig);
  };

  const vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(lineStringGeoJSON),
    }),
    zIndex: lineOptions.zIndex ?? 4,
    visible: lineOptions.visible ?? true,
    style: getFeatureStyles,
  });

  const layerName = lineOptions.layerName ?? '';
  vectorLayer.set(LAYER_PROP_NAME, layerName);
  vectorLayer.set(LAYER_PROP_PICK, buildPickLayerName('LineString', layerName));

  if (lineOptions.hoverStyle ?? true) {
    vectorLayer.set(LAYER_PROP_TIPS, buildTipsLayerName(layerName, 'LineString'));
    vectorLayer.set(LAYER_PROP_HOVER, buildHoverLayerName(layerName, 'LineString'));
  }

  olMap.addLayer(vectorLayer);
}
