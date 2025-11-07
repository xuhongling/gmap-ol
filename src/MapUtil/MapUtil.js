import { Style, Fill, Stroke, Text, Icon, Circle as CircleStyle, RegularShape } from 'ol/style';
import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';

/**
 * 获取绘图样式
 * 根据配置项生成OpenLayers的Style对象，支持填充、描边、图片、文本等样式
 *
 * @param {Object} options - 样式配置项
 * @param {Object} [options.fill] - 填充样式配置（符合Fill参数格式）
 * @param {Object} [options.stroke] - 描边样式配置（符合Stroke参数格式）
 * @param {Object} [options.image] - 图像样式配置，支持图标、圆形、星形
 * @param {Object} [options.text] - 文本样式配置（符合Text参数格式）
 * @return {Style} OpenLayers的Style实例
 */
export function getOptionsStyle(options) {
  const style = new Style();

  // 处理填充样式
  if (options.fill) {
    style.setFill(new Fill(options.fill));
  }

  // 处理描边样式
  if (options.stroke) {
    style.setStroke(new Stroke(options.stroke));
  }

  // 处理图像样式
  if (options.image) {
    let image;
    // 图标样式（直接配置src）
    if (options.image.src) {
      image = new Icon(options.image);
    }
    // 图标样式（嵌套配置）
    else if (options.image.icon) {
      image = new Icon(options.image.icon);
    }
    // 圆形样式
    else if (options.image.circle || options.image.radius) {
      const circleOpts = { ...options.image };
      // 转换填充配置为Fill实例
      if (circleOpts.fill && !(circleOpts.fill instanceof Fill)) {
        circleOpts.fill = new Fill(circleOpts.fill);
      }
      // 转换描边配置为Stroke实例
      if (circleOpts.stroke && !(circleOpts.stroke instanceof Stroke)) {
        circleOpts.stroke = new Stroke(circleOpts.stroke);
      }
      // 默认半径
      if (!circleOpts.radius) {
        circleOpts.radius = 10;
      }
      image = new CircleStyle(circleOpts);
    }
    // 星形样式
    else if (options.image.star) {
      const starOpts = { ...options.image };
      // 转换填充配置为Fill实例
      if (starOpts.fill && !(starOpts.fill instanceof Fill)) {
        starOpts.fill = new Fill(starOpts.fill);
      }
      // 转换描边配置为Stroke实例
      if (starOpts.stroke && !(starOpts.stroke instanceof Stroke)) {
        starOpts.stroke = new Stroke(starOpts.stroke);
      }
      // 星形默认参数
      starOpts.points = 5;
      starOpts.radius = 10;
      starOpts.radius2 = 4;
      starOpts.angle = 0;
      image = new RegularShape(starOpts);
    }

    if (image) {
      style.setImage(image);
    }
  }

  // 处理文本样式
  if (options.text) {
    const textOpts = { ...options.text };
    try {
      // 转换填充配置为Fill实例
      if (textOpts.fill && !(textOpts.fill instanceof Fill)) {
        textOpts.fill = new Fill(textOpts.fill);
      }
      // 转换描边配置为Stroke实例
      if (textOpts.stroke && !(textOpts.stroke instanceof Stroke)) {
        textOpts.stroke = new Stroke(textOpts.stroke);
      }
      // 转换背景填充配置为Fill实例
      if (textOpts.backgroundFill && !(textOpts.backgroundFill instanceof Fill)) {
        textOpts.backgroundFill = new Fill(textOpts.backgroundFill);
      }
      // 转换背景描边配置为Stroke实例
      if (textOpts.backgroundStroke && !(textOpts.backgroundStroke instanceof Stroke)) {
        textOpts.backgroundStroke = new Stroke(textOpts.backgroundStroke);
      }
    } catch (e) {
      console.error('文本样式参数错误:', e);
    }
    style.setText(new Text(textOpts));
  }

  return style;
}

/**
 * 判断图层在当前地图缩放级别下是否可见
 *
 * @param {ol.layer.Layer} layer - 待判断的图层
 * @param {ol.Map} map - 地图实例
 * @return {boolean} 图层是否可见
 */
export function judgeLayerVisible(layer, map) {
  const minZoom = layer.getMinZoom();
  const maxZoom = layer.getMaxZoom();
  const isLayerVisible = layer.getVisible();
  const currentZoom = map.getView().getZoom();

  return isLayerVisible && currentZoom > minZoom && currentZoom <= maxZoom;
}

/**
 * 为地图添加hover样式变化效果
 * 当鼠标悬停在指定图层要素上时，改变要素样式
 *
 * @param {ol.Map} olMap - 地图实例
 * @param {Object} hoverOptions -  hover配置项
 * @param {string} [hoverOptions.layerName] - 目标图层名称标识
 * @param {string} [hoverOptions.textFieldName] - 文本字段名称
 * @param {string} [hoverOptions.icon] - 悬停时的图标地址
 * @param {string} [hoverOptions.textColor] - 文本颜色
 * @param {Object} [hoverOptions.styles] - 自定义样式配置
 */
export function hoverChangeStyle(olMap, hoverOptions) {
  if (!olMap) {
    return;
  }

  // 存储需要应用hover效果的图层
  const hoverLayers = [];
  // 存储当前应用了hover样式的要素，用于恢复
  const currentFeatures = [];

  /**
   * 获取要素的悬停样式
   * @param {ol.Feature} feature - 要素实例
   * @param {ol.layer.Layer} layer - 要素所属图层
   * @return {Style} 悬停样式
   */
  const getFeatureStyles = (feature, layer) => {
    const isPointLayer = layer.get('hoverLayerName')?.includes('_Point');
    const properties = feature.getProperties();
    // 获取文本字段值
    const textValue = hoverOptions.textFieldName
      ? properties[hoverOptions.textFieldName]
      : '';

    // 基础样式配置
    const styles = {
      ...hoverOptions.styles,
      image: {
        src: '',
        anchor: [0.5, 0.5],
        scale: 1.3,
        ...hoverOptions.styles?.image,
      },
      text: {
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
      },
    };

    // 应用图标配置
    if (hoverOptions.icon) {
      styles.image.src = hoverOptions.icon;
    }

    // 应用文本颜色配置
    if (hoverOptions.textColor) {
      styles.text.fill.color = hoverOptions.textColor;
    }

    // 应用文本内容
    if (textValue !== '') {
      styles.text.text = textValue;
    }

    return getOptionsStyle(styles);
  };

  // 筛选符合条件的hover图层
  const allLayers = olMap.getLayers().getArray();
  allLayers.forEach((layer) => {
    const zIndex = layer.getZIndex();
    // 筛选zIndex在[3, 1000)区间且名称匹配的图层
    if (zIndex >= 3 && zIndex < 1000) {
      if (layer.get('hoverLayerName')?.includes(`hoverLayerName${hoverOptions.layerName}`)) {
        hoverLayers.push(layer);
      }
    }
  });

  // 绑定鼠标移动事件
  olMap.on('pointermove', (event) => {
    // 恢复之前悬停要素的样式
    if (currentFeatures.length > 0) {
      while (currentFeatures.length > 0) {
        currentFeatures.pop().setStyle(null);
      }
      olMap.getTargetElement().style.cursor = 'default';
    }

    // 获取当前鼠标像素位置
    const pixel = olMap.getEventPixel(event.originalEvent);

    // 检查每个hover图层的要素
    hoverLayers.forEach((layer) => {
      if (judgeLayerVisible(layer, olMap)) {
        // 获取像素位置的要素
        layer.getFeatures(pixel).then((features) => {
          features.forEach((feature) => {
            const hoverStyle = getFeatureStyles(feature, layer);
            feature.setStyle(hoverStyle);
            currentFeatures.push(feature);
            olMap.getTargetElement().style.cursor = 'pointer';
          });
        });
      }
    });
  });
}

/**
 * 为地图添加hover提示效果
 * 当鼠标悬停在指定图层要素上时，显示提示信息
 *
 * @param {ol.Map} olMap - 地图实例
 * @param {Object} hoverOptions - hover配置项
 * @param {string} [hoverOptions.layerName] - 目标图层名称标识
 * @param {string} [hoverOptions.textFieldName] - 提示文本字段名称
 */
export function hoverShowTips(olMap, hoverOptions) {
  if (!olMap) {
    return;
  }

  // 筛选符合条件的提示图层
  const allLayers = olMap.getLayers().getArray();
  const tipsLayers = [];
  allLayers.forEach((layer) => {
    const zIndex = layer.getZIndex();
    // 筛选zIndex在[1, 1000)区间且名称匹配的图层
    if (zIndex >= 1 && zIndex < 1000) {
      if (layer.get('tipsLayerName')?.includes(`tipsLayerName${hoverOptions.layerName}`)) {
        tipsLayers.push(layer);
      }
    }
  });

  // 创建提示图层（用于显示提示信息）
  const drawLayer = new VectorLayer({
    source: new VectorSource(),
    zIndex: 1000, // 确保在其他图层上方
  });
  olMap.addLayer(drawLayer);

  // 绑定鼠标移动事件
  olMap.on('pointermove', (event) => {
    // 清除之前的提示
    drawLayer.getSource().clear(true);

    // 提示样式配置
    const tipStyle = {
      text: {
        text: '',
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

    // 获取当前鼠标像素位置
    const pixel = olMap.getEventPixel(event.originalEvent);

    // 检查每个提示图层的要素
    tipsLayers.forEach((layer) => {
      if (judgeLayerVisible(layer, olMap)) {
        // 获取像素位置的要素
        layer.getFeatures(pixel).then((features) => {
          features.forEach((feature) => {
            // 复制要素属性（排除geometry）
            const properties = feature.getProperties();
            const featureProps = {};
            Object.keys(properties).forEach((key) => {
              if (key !== 'geometry') {
                featureProps[key] = properties[key];
              }
            });

            // 创建提示要素（点要素，位置为鼠标当前坐标）
            const tipFeature = new Feature({
              geometry: new Point(olMap.getCoordinateFromPixel(pixel)),
              ...featureProps,
            });

            // 设置提示文本
            const tipsFieldName = hoverOptions.textFieldName || '';
            tipStyle.text.text = tipFeature.get(tipsFieldName) || '';

            // 应用样式并添加到提示图层
            tipFeature.setStyle(getOptionsStyle(tipStyle));
            drawLayer.getSource().addFeature(tipFeature);
          });
        });
      }
    });
  });
}
