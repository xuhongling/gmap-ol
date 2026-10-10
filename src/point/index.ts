import type Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import type Map from 'ol/Map';
import GeoJSON from 'ol/format/GeoJSON';
import type { Geometry } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import Cluster from 'ol/source/Cluster';
import VectorSource from 'ol/source/Vector';
import type { Style } from 'ol/style';
import {
  FEATURE_PROP_NAME,
  LAYER_PROP_HOVER,
  LAYER_PROP_NAME,
  LAYER_PROP_PICK,
  LAYER_PROP_TIPS,
  buildHoverLayerName,
  buildPickLayerName,
  buildTipsLayerName,
} from '../constants';
import type { FillConfig, GeoJSONData, ImageConfig, PointDataItem, PointDataOptions, PointOptions, TextConfig } from '../types';
import { getOptionsStyle } from '../utils/style';

/** 点数据按缩放级别分层后的图层数据 */
interface PointLayerData {
  type: 'Point';
  zoom: string;
  data: {
    type: 'FeatureCollection';
    features: PointGeoJSONFeature[];
  };
}

/** 点数据格式化后的 GeoJSON 要素 */
interface PointGeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: PointDataItem;
}

/**
 * 从GeoJSON数据添加点矢量图层到地图
 *
 * @param olMap - 目标地图实例
 * @param pointGeoJSON - GeoJSON格式的点要素数据
 * @param pointOptions - 图层配置选项(zIndex默认5,visible默认true,hoverStyle默认true)
 */
export function addPointLayer(olMap: Map, pointGeoJSON: GeoJSONData, pointOptions: PointOptions): void {
  if (!olMap) return;

  const getFeatureStyles = (feature: FeatureLike): Style => {
    const olFeature = feature as Feature<Geometry>;
    const properties = olFeature.getProperties();
    const textValue = pointOptions.textFieldName ? properties[pointOptions.textFieldName] : '';

    let imageConfig: ImageConfig = {
      src: '',
      anchor: [0.5, 0.5],
      scale: 1,
      ...pointOptions.styles?.image,
    };
    const textConfig: TextConfig = {
      font: '11px Microsoft YaHei',
      textAlign: 'center',
      textBaseline: 'middle',
      fill: { color: 'rgba(0, 0, 0, 0.85)' },
      stroke: { color: 'rgba(255, 255, 255, 0.75)', width: 2 },
      offsetY: 16,
      text: '',
      ...pointOptions.styles?.text,
    };

    if (pointOptions.styles?.circle) {
      imageConfig = { circle: pointOptions.styles.circle };
    }
    if (pointOptions.icon) {
      imageConfig.src = pointOptions.icon;
    }
    if (pointOptions.textColor) {
      (textConfig.fill as FillConfig).color = pointOptions.textColor;
    }
    if (textValue) {
      textConfig.text = textValue;
      olFeature.set(FEATURE_PROP_NAME, textValue);
    }

    return getOptionsStyle({ image: imageConfig, text: textConfig });
  };

  const vectorLayer = new VectorLayer({
    className: pointOptions.className ?? '',
    source: new VectorSource({
      features: new GeoJSON().readFeatures(pointGeoJSON),
    }),
    style: getFeatureStyles,
    zIndex: pointOptions.zIndex ?? 5,
    visible: pointOptions.visible ?? true,
  });

  const layerName = pointOptions.layerName ?? '';
  vectorLayer.set(LAYER_PROP_NAME, layerName);
  vectorLayer.set(LAYER_PROP_PICK, buildPickLayerName('Point', layerName));

  if (pointOptions.hoverStyle ?? true) {
    vectorLayer.set(LAYER_PROP_TIPS, buildTipsLayerName(layerName, 'Point'));
    vectorLayer.set(LAYER_PROP_HOVER, buildHoverLayerName(layerName, 'Point'));
  }

  olMap.addLayer(vectorLayer);
}

/**
 * 从点数据添加支持缩放级别和聚合的点矢量图层到地图
 *
 * @param olMap - 目标地图实例
 * @param pointData - 点数据数组(包含LGTD/LTTD坐标信息)
 * @param pointOptions - 图层配置选项(zoomNumber默认5.5,distance默认30)
 * @returns 入参无效时返回空对象字面量(保留旧行为),正常执行无返回
 */
export function addPointDataLayer(olMap: Map, pointData: PointDataItem[], pointOptions: PointDataOptions): Record<string, never> | undefined {
  if (!olMap || !pointData || pointData.length === 0) return {};

  const zoomLevels = [1, 2, 3, 4, 5, 6, 7, 8];
  const pointsByZoomLevel: Record<number, PointDataItem[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };

  pointData.forEach((point) => {
    const pointZoomLevel = pointOptions.zoomFieldName ? point[pointOptions.zoomFieldName] : 2;
    if (zoomLevels.includes(pointZoomLevel)) {
      pointsByZoomLevel[pointZoomLevel].push(point);
    }
  });

  const formatFeature = (data: PointDataItem): PointGeoJSONFeature => {
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

  const formatDataToLayer = (points: PointDataItem[], zoomKey: string): PointLayerData[] => {
    const featureCollection: PointLayerData['data'] = {
      type: 'FeatureCollection',
      features: points.map(formatFeature),
    };
    return [
      {
        type: 'Point',
        zoom: zoomKey,
        data: featureCollection,
      },
    ];
  };

  const layers: PointLayerData[] = [];
  Object.entries(pointsByZoomLevel).forEach(([zoomKey, points]) => {
    if (points.length > 0) {
      layers.push(...formatDataToLayer(points, zoomKey));
    }
  });

  layers.forEach((layer) => {
    const getFeatureStyles = (feature: FeatureLike): Style => {
      const olFeature = feature as Feature<Geometry>;
      const properties = olFeature.getProperties();
      const textValue = pointOptions.textFieldName ? properties[pointOptions.textFieldName] : '';

      const imageConfig: ImageConfig = {
        src: '',
        anchor: [0.5, 0.5],
        scale: 1,
        ...pointOptions.styles?.image,
      };
      const textConfig: TextConfig = {
        font: '11px Microsoft YaHei',
        textAlign: 'center',
        textBaseline: 'middle',
        fill: { color: 'rgba(0, 0, 0, 0.85)' },
        stroke: { color: 'rgba(255, 255, 255, 0.75)', width: 2 },
        offsetY: 16,
        text: '',
        ...pointOptions.styles?.text,
      };

      if (pointOptions.icon) {
        imageConfig.src = pointOptions.icon;
      }
      if (pointOptions.textColor) {
        (textConfig.fill as FillConfig).color = pointOptions.textColor;
      }
      if (textValue) {
        textConfig.text = textValue;
        olFeature.set(FEATURE_PROP_NAME, textValue);
      }

      return getOptionsStyle({ image: imageConfig, text: textConfig });
    };

    let vectorSource: VectorSource<Feature<Geometry>> = new VectorSource({
      features: new GeoJSON().readFeatures(layer.data),
    });

    if (pointOptions.cluster) {
      vectorSource = new Cluster({
        distance: pointOptions.distance ?? 30,
        source: vectorSource,
      });
    }

    const minZoom = parseInt(layer.zoom) + (pointOptions.zoomNumber ?? 5.5);

    const vectorLayer = new VectorLayer({
      className: pointOptions.className ?? '',
      source: vectorSource,
      style: getFeatureStyles,
      zIndex: pointOptions.zIndex ?? 5,
      minZoom,
      visible: pointOptions.visible ?? true,
    });

    const layerName = pointOptions.layerName ?? '';
    vectorLayer.set(LAYER_PROP_NAME, layerName);
    vectorLayer.set(LAYER_PROP_PICK, buildPickLayerName('Point', layerName));

    if (pointOptions.hoverStyle ?? true) {
      vectorLayer.set(LAYER_PROP_TIPS, buildTipsLayerName(layerName, 'Point'));
      vectorLayer.set(LAYER_PROP_HOVER, buildHoverLayerName(layerName, 'Point'));
    }

    olMap.addLayer(vectorLayer);
  });
}
