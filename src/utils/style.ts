/**
 * 样式引擎:把 plain object 配置转换为 ol Style 实例
 */
import { Circle as CircleStyle, Fill, Icon, RegularShape, Stroke, Style, Text } from 'ol/style';
import type { Options as CircleOptions } from 'ol/style/Circle';
import type { Options as IconOptions } from 'ol/style/Icon';
import type { Options as RegularShapeOptions } from 'ol/style/RegularShape';
import type { Options as TextOptions } from 'ol/style/Text';
import type { StyleOptions } from '../types';
import { deepClone, isPlainObject } from './clone';

/**
 * 获取绘图样式
 * 根据配置项生成 OpenLayers 的 Style 对象,支持填充、描边、图片、文本等样式
 *
 * @param options - 样式配置项
 * @returns OpenLayers 的 Style 实例
 */
export function getOptionsStyle(options: StyleOptions): Style {
  const style = new Style();

  // 处理填充样式
  if (options.fill) {
    style.setFill(options.fill instanceof Fill ? options.fill : new Fill(options.fill));
  }

  // 处理描边样式
  if (options.stroke) {
    style.setStroke(options.stroke instanceof Stroke ? options.stroke : new Stroke(options.stroke));
  }

  // 处理图像样式
  if (options.image) {
    const imageConfig = options.image;
    let image: Icon | CircleStyle | RegularShape | undefined;

    // 图标样式(直接配置 src)
    if (imageConfig.src) {
      image = new Icon(imageConfig as IconOptions);
    }
    // 图标样式(嵌套配置)
    else if (imageConfig.icon) {
      image = new Icon(imageConfig.icon as IconOptions);
    }
    // 圆形样式
    else if (imageConfig.circle || imageConfig.radius) {
      const circleOpts = deepClone(imageConfig) as Record<string, any>;
      // circle 为配置对象时展开合并,使用户的 fill/stroke/radius 等参数生效
      if (isPlainObject(imageConfig.circle)) {
        Object.assign(circleOpts, deepClone(imageConfig.circle));
        delete circleOpts.circle;
      }
      // 转换填充配置为 Fill 实例
      if (circleOpts.fill && !(circleOpts.fill instanceof Fill)) {
        circleOpts.fill = new Fill(circleOpts.fill);
      }
      // 转换描边配置为 Stroke 实例
      if (circleOpts.stroke && !(circleOpts.stroke instanceof Stroke)) {
        circleOpts.stroke = new Stroke(circleOpts.stroke);
      }
      // 默认半径
      if (!circleOpts.radius) {
        circleOpts.radius = 10;
      }
      image = new CircleStyle(circleOpts as CircleOptions);
    }
    // 星形样式
    else if (imageConfig.star) {
      const starOpts = deepClone(imageConfig) as Record<string, any>;
      if (isPlainObject(imageConfig.star)) {
        Object.assign(starOpts, deepClone(imageConfig.star));
        delete starOpts.star;
      }
      // 转换填充配置为 Fill 实例
      if (starOpts.fill && !(starOpts.fill instanceof Fill)) {
        starOpts.fill = new Fill(starOpts.fill);
      }
      // 转换描边配置为 Stroke 实例
      if (starOpts.stroke && !(starOpts.stroke instanceof Stroke)) {
        starOpts.stroke = new Stroke(starOpts.stroke);
      }
      // 星形默认参数(与旧版行为一致:强制覆盖)
      starOpts.points = 5;
      starOpts.radius = 10;
      starOpts.radius2 = 4;
      starOpts.angle = 0;
      image = new RegularShape(starOpts as RegularShapeOptions);
    }

    if (image) {
      style.setImage(image);
    }
  }

  // 处理文本样式
  if (options.text) {
    const textOpts = deepClone(options.text) as Record<string, any>;
    try {
      // 转换填充配置为 Fill 实例
      if (textOpts.fill && !(textOpts.fill instanceof Fill)) {
        textOpts.fill = new Fill(textOpts.fill);
      }
      // 转换描边配置为 Stroke 实例
      if (textOpts.stroke && !(textOpts.stroke instanceof Stroke)) {
        textOpts.stroke = new Stroke(textOpts.stroke);
      }
      // 转换背景填充配置为 Fill 实例
      if (textOpts.backgroundFill && !(textOpts.backgroundFill instanceof Fill)) {
        textOpts.backgroundFill = new Fill(textOpts.backgroundFill);
      }
      // 转换背景描边配置为 Stroke 实例
      if (textOpts.backgroundStroke && !(textOpts.backgroundStroke instanceof Stroke)) {
        textOpts.backgroundStroke = new Stroke(textOpts.backgroundStroke);
      }
    } catch (e) {
      console.error('文本样式参数错误:', e);
    }
    style.setText(new Text(textOpts as TextOptions));
  }

  return style;
}
