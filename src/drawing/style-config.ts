/**
 * 绘制模块样式配置(模块私有,不从 drawing/index 导出)
 *
 * 旧版直接从 MeasureUtil/StyleConfig.js 转出口 5 个共享单例样式;
 * 新版改为通过 measure 模块的样式工厂函数生成本模块私有实例,避免跨模块/跨地图样式串扰。
 */
import { createDefaultStyle, createLabelStyle, createModifyStyle, createSegmentStyle, createTipStyle } from '../measure/style-config';

/** 基础样式(绘制模块私有实例) */
export const defaultStyle = createDefaultStyle();
/** 标签样式(绘制模块私有实例) */
export const labelStyle = createLabelStyle();
/** 操作提示样式(绘制模块私有实例) */
export const tipStyle = createTipStyle();
/** 修改交互样式(绘制模块私有实例) */
export const modifyStyle = createModifyStyle();
/** 分段标签样式(绘制模块私有实例) */
export const segmentStyle = createSegmentStyle();
