/**
 * 图层/要素自定义属性键名常量
 *
 * 旧版库通过 layer.set('layerName', ...) / feature.set('NAME', ...) 等动态属性
 * 建立跨模块的隐式约定,这里集中声明,避免散落各处的字符串字面量。
 */

/** 图层标识名(精确匹配,见 layer 模块 getLayerByName) */
export const LAYER_PROP_NAME = 'layerName';
/** 可拾取图层标识(子串匹配,前缀为几何类型,如 'Point'、'LineString'、'Polygon') */
export const LAYER_PROP_PICK = 'pickLayerName';
/** 悬停样式图层标识(子串匹配) */
export const LAYER_PROP_HOVER = 'hoverLayerName';
/** 悬停提示图层标识(子串匹配) */
export const LAYER_PROP_TIPS = 'tipsLayerName';

/** 要素名称属性(按名拾取、精准适配等消费) */
export const FEATURE_PROP_NAME = 'NAME';
/** 要素颜色属性 */
export const FEATURE_PROP_COLOR = 'COLOR';
/** 线要素颜色属性 */
export const FEATURE_PROP_LINE_COLOR = 'LINE_COLOR';

/** pickLayerName 的几何类型前缀 */
export type LayerTypePrefix = 'Point' | 'LineString' | 'Polygon';

/** pickLayerName 拼接规则:`${type}${layerName}` */
export const buildPickLayerName = (type: LayerTypePrefix, layerName: string): string => `${type}${layerName}`;

/** hoverLayerName 拼接规则:`hoverLayerName${layerName}_${type}`(消费端为前缀 includes 匹配,与旧版两种写法均兼容) */
export const buildHoverLayerName = (layerName: string, type: LayerTypePrefix): string => `hoverLayerName${layerName}_${type}`;

/** tipsLayerName 拼接规则:`tipsLayerName${layerName}_${type}`(同上,与旧版兼容) */
export const buildTipsLayerName = (layerName: string, type: LayerTypePrefix): string => `tipsLayerName${layerName}_${type}`;
