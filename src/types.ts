/**
 * 公共类型定义:所有导出函数的 options 接口与回调类型
 */
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import type Layer from 'ol/layer/Layer';
import type ImageWMS from 'ol/source/ImageWMS';
import type TileWMS from 'ol/source/TileWMS';
import type WMTS from 'ol/source/WMTS';
import type VectorSource from 'ol/source/Vector';
import type Fill from 'ol/style/Fill';
import type Stroke from 'ol/style/Stroke';
import type { StyleLike } from 'ol/style/Style';

/** 经纬度坐标对 */
export type LonLat = [number, number];

/** GeoJSON 数据:readFeatures 可消费的对象或 JSON 字符串 */
export type GeoJSONData = object | string;

/** 要素属性包(对应 feature.getProperties() 的结果) */
export type FeatureProperties = Record<string, any>;

/** GeoJSON Feature 对象(WFS/GetFeatureInfo 返回的原始 JSON 要素,非 ol/Feature) */
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: unknown;
  properties: FeatureProperties;
  [key: string]: any;
}

/** WMS 图层(TileWMS / ImageWMS 源) */
export type WMSLayer = Layer<ImageWMS | TileWMS>;
/** WMS 或 WMTS 图层 */
export type WMSOrWMTSLayer = Layer<ImageWMS | TileWMS | WMTS>;

/* ------------------------------------------------------------------ */
/* 样式配置(getOptionsStyle)                                           */
/* ------------------------------------------------------------------ */

/** 颜色:CSS 颜色字符串或 [r, g, b, a] 数组 */
export type StyleColor = string | number[];

export interface FillConfig {
  color?: StyleColor;
}
/** 填充配置:普通对象或 Fill 实例 */
export type FillLike = FillConfig | Fill;

export interface StrokeConfig {
  color?: StyleColor;
  width?: number;
  lineDash?: number[];
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  miterLimit?: number;
}
/** 描边配置:普通对象或 Stroke 实例 */
export type StrokeLike = StrokeConfig | Stroke;

export interface TextConfig {
  text?: string;
  font?: string;
  maxAngle?: number;
  offsetX?: number;
  offsetY?: number;
  overflow?: boolean;
  placement?: 'point' | 'line';
  scale?: number | [number, number];
  rotateWithView?: boolean;
  rotation?: number;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
  padding?: number[];
  fill?: FillLike;
  stroke?: StrokeLike;
  backgroundFill?: FillLike;
  backgroundStroke?: StrokeLike;
}

export interface CircleConfig {
  radius?: number;
  fill?: FillLike;
  stroke?: StrokeLike;
  scale?: number | [number, number];
  displacement?: number[];
  rotation?: number;
  rotateWithView?: boolean;
}

export interface IconConfig {
  src?: string;
  anchor?: number[];
  scale?: number | [number, number];
  color?: StyleColor;
  crossOrigin?: string | null;
  size?: [number, number];
  imgSize?: [number, number];
  offset?: number[];
  opacity?: number;
  rotation?: number;
  rotateWithView?: boolean;
}

export interface RegularShapeConfig {
  points?: number;
  radius?: number;
  radius1?: number;
  radius2?: number;
  angle?: number;
  fill?: FillLike;
  stroke?: StrokeLike;
  scale?: number | [number, number];
  displacement?: number[];
  rotation?: number;
  rotateWithView?: boolean;
}

/**
 * 图像样式配置,四种互斥形态(按优先级):
 * 1. `src` 直传 → Icon
 * 2. `icon` 嵌套对象 → Icon
 * 3. `circle`(可为配置对象)或 `radius` → CircleStyle
 * 4. `star` → RegularShape
 * 其余字段(radius/fill/stroke/points/angle 等)作为 Circle/RegularShape 的构造参数。
 */
export interface ImageConfig extends RegularShapeConfig {
  src?: string;
  anchor?: number[];
  icon?: IconConfig;
  circle?: CircleConfig | boolean;
  star?: RegularShapeConfig | boolean;
}

/** getOptionsStyle 的配置对象(plain object,非 ol Style 实例) */
export interface StyleOptions {
  fill?: FillLike;
  stroke?: StrokeLike;
  image?: ImageConfig;
  text?: TextConfig;
}

/* ------------------------------------------------------------------ */
/* map 模块(hover / tips)                                              */
/* ------------------------------------------------------------------ */

export interface HoverOptions {
  /** 目标图层名称标识 */
  layerName?: string;
  /** 文本(提示)字段名称 */
  textFieldName?: string;
  /** 悬停时的图标地址 */
  icon?: string;
  /** 文本颜色 */
  textColor?: string;
  /** 自定义样式配置 */
  styles?: StyleOptions;
}

/* ------------------------------------------------------------------ */
/* point / line-string / polygon 模块                                   */
/* ------------------------------------------------------------------ */

export interface PointOptions {
  layerName?: string;
  className?: string;
  /** 默认 5 */
  zIndex?: number;
  /** 默认 true */
  visible?: boolean;
  textFieldName?: string;
  /** 图标地址(等价 styles.image.src) */
  icon?: string;
  textColor?: string;
  styles?: {
    image?: ImageConfig;
    text?: TextConfig;
    /** 存在时使用圆形样式(优先级高于 image) */
    circle?: CircleConfig;
  };
  /** 是否设置悬停/提示图层标识属性,默认 true */
  hoverStyle?: boolean;
}

export interface PointDataItem {
  LGTD?: number | string;
  LTTD?: number | string;
  lgtd?: number | string;
  lttd?: number | string;
  [key: string]: any;
}

export interface PointDataOptions {
  layerName?: string;
  className?: string;
  /** 默认 5 */
  zIndex?: number;
  /** 默认 true */
  visible?: boolean;
  textFieldName?: string;
  icon?: string;
  textColor?: string;
  styles?: {
    image?: ImageConfig;
    text?: TextConfig;
  };
  /** 默认 true */
  hoverStyle?: boolean;
  /** 缩放级别字段名(字段值须为数字 1-8,不匹配的点会被丢弃) */
  zoomFieldName?: string;
  /** minZoom 偏移量,默认 5.5 */
  zoomNumber?: number;
  /** 是否聚合,默认 false */
  cluster?: boolean;
  /** 聚合距离(像素),默认 30 */
  distance?: number;
}

export interface LineStringOptions {
  layerName?: string;
  /** 默认 4 */
  zIndex?: number;
  /** 默认 true */
  visible?: boolean;
  textFieldName?: string;
  styles?: StyleOptions;
  /** 默认 true */
  hoverStyle?: boolean;
  /** 是否使用要素自身 color/COLOR 属性着色,默认 true */
  featureColor?: boolean;
}

export interface PolygonOptions {
  layerName?: string;
  /** 默认 3 */
  zIndex?: number;
  /** 默认 true */
  visible?: boolean;
  textFieldName?: string;
  styles?: StyleOptions;
  /** 默认 true */
  hoverStyle?: boolean;
  /** 默认 true */
  featureColor?: boolean;
}

export interface RainColorRange {
  minvalue: number;
  maxvalue: number;
  color: string;
}

export interface RainPolygonOptions {
  layerName?: string;
  /** 默认 3 */
  zIndex?: number;
  /** 默认 true */
  visible?: boolean;
  /** 颜色区间配置(必填):lowValue/highValue 完全落在 [minvalue, maxvalue] 内时取 color */
  renderColor: RainColorRange[];
}

/* ------------------------------------------------------------------ */
/* drawing / measure 模块                                               */
/* ------------------------------------------------------------------ */

export interface DrawOptions {
  /** 绘制类型('Point' | 'LineString' | 'Polygon' | 'Circle' 等) */
  type: string;
  /** 开始新绘制前是否清除已绘制要素,默认 false */
  clearPrevious?: boolean;
  /** 自定义样式配置 */
  styles?: StyleOptions;
}

/** 绘制回调:参数为承载绘制结果的 VectorSource */
export type DrawCallback = (source: VectorSource<Feature<Geometry>>) => void;

export interface MeasureOption {
  /** 是否显示分段标注,默认 true */
  showSegments?: boolean;
  /** 开始新测量前是否清除上一次结果,默认 true */
  clearPrevious?: boolean;
}

/* ------------------------------------------------------------------ */
/* map-tool 模块                                                        */
/* ------------------------------------------------------------------ */

export interface PickBufferRange {
  minZoom: number;
  maxZoom: number;
  bufferMeters: number;
}

export interface PickOptions {
  /** 完全自定义缓冲米数(优先级最高) */
  getBufferMeters?: (zoom: number) => number;
  /** 按缩放区间配置缓冲米数(未匹配区间回退 100 米) */
  bufferConfig?: PickBufferRange[];
}

/** 显示字段:字段名(支持逗号分隔按优先级)/ 字段名数组 / 自定义取文本函数 */
export type TextFieldName = string | string[] | ((feature: FeatureProperties) => string);

export interface PickPopoverOptions {
  /** 要素数据(数组或单个对象) */
  data: FeatureProperties[] | FeatureProperties;
  textFieldName?: TextFieldName;
  /** 无有效字段时的回退文本,字符串支持 {index} 占位符 */
  fallbackText?: string | ((feature: FeatureProperties, index: number) => string);
  /** 默认 '请选择' */
  title?: string;
  /** 默认 'PickStationOverlay' */
  overlayId?: string;
  /** 默认 'bottom-center' */
  positioning?: string;
  /** 默认 true */
  autoPan?: boolean;
}

export interface ZoomToFitOptions {
  /** 目标图层名(必填,缺了直接 return) */
  layerName: string;
  /** 精准适配 NAME 属性等于该值的要素,缺省取第一个要素 */
  name?: string;
  /** [上, 右, 下, 左],默认 [50, 50, 50, 50] */
  padding?: number[];
  /** 默认 18 */
  maxZoom?: number;
  /** 默认 800 */
  duration?: number;
}

export interface ExportImageTitleOption {
  name?: string;
  color?: string;
  fontSize?: string;
}

export interface ExportImageOptions {
  /** 导出裁剪尺寸 [宽, 高],居中裁剪 */
  size?: number[];
  title?: ExportImageTitleOption;
  subtitle?: ExportImageTitleOption;
  /** 图例图片 URL,默认 1x1 透明 PNG */
  legend?: string;
  /** 默认 'image/png' */
  type?: string;
  /** 默认 0.8 */
  quality?: number;
  /** 是否自动触发浏览器下载,默认 true */
  down?: boolean;
}

export interface BoxSelectionOptions {
  /** 目标图层名 */
  layerName: string;
  /** 回调中提取名称的字段,默认 'name' */
  textFieldName?: string;
  /** 覆盖选中样式 */
  styles?: StyleOptions;
}

/* ------------------------------------------------------------------ */
/* wfs 模块                                                             */
/* ------------------------------------------------------------------ */

export interface WmsLayerOptions {
  /** 默认 '' */
  layerName?: string;
  /** WMS 服务根地址(内部拼接 `${url}/wms`),默认 '' */
  url?: string;
  /** WMS 服务端图层标识(必填) */
  layers: string;
  /** CQL 条件数组(' and ' 拼接),默认 [] */
  filter?: string[];
  /** 默认 true */
  visible?: boolean;
  /** 默认 5 */
  zIndex?: number;
  /** 额外 WMS 请求参数(可覆盖前面的参数) */
  params?: Record<string, unknown>;
}

export interface WfsLayerOptions {
  /** 默认 '' */
  layerName?: string;
  /** WFS 服务根地址(内部拼接 `${url}/wfs?...`),默认 '' */
  url?: string;
  /** WFS typename(必填) */
  layers: string;
  /** 图层样式 */
  style: StyleLike;
  /** CQL 条件数组,默认 [] */
  filter?: string[];
  /** 默认 true */
  visible?: boolean;
  /** 默认 5 */
  zIndex?: number;
}

export interface GetWmsFeatureOptions {
  layerName?: string;
  layers?: string;
  /** 额外 GetFeatureInfo 请求参数 */
  params?: Record<string, unknown>;
}

export interface UpdateWfsFilterOptions {
  layerName?: string;
  filter?: string[];
}

/** WMS 点击查询回调:参数为 GeoJSON Feature 数组(非 ol/Feature) */
export type WmsFeatureCallback = (features: GeoJSONFeature[]) => void;
