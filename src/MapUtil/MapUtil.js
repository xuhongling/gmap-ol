import { Style, Fill, Stroke, Text, Icon, Circle as CircleStyle, RegularShape } from 'ol/style';
import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';

/**
 * 获取绘图样式
 *
 * @param    {[type]} Options
 * @return   {[type]} style
 */
export function getDrawStyle(options) {
  let p;
  const style = new Style();
  if (options.fill) {
    style.setFill(new Fill(options.fill));
  }
  if (options.stroke) {
    style.setStroke(new Stroke(options.stroke));
  }
  if (options.image) {
    if (options.image.src) {
      p = new Icon(options.image);
    }
    // Icon Circle RegularShape
    if (options.image.icon) {
      p = new Icon(options.image.icon);
    } else if (options.image.circle) {
      p = options.image.circle;
      if (p.fill && !(p.fill instanceof Fill)) {
        p.fill = new Fill(p.fill);
      }
      if (p.stroke && !(p.stroke instanceof Stroke)) {
        p.stroke = new Stroke(p.stroke);
      }
      p = new CircleStyle(p);
    } else if (options.image.star) {
      p = options.image.star;
      if (p.fill && !(p.fill instanceof Fill)) {
        p.fill = new Fill(p.fill);
      }
      if (p.stroke && !(p.stroke instanceof Stroke)) {
        p.stroke = new Stroke(p.stroke);
      }
      p.points = 5;
      p.radius = 10;
      p.radius2 = 4;
      p.angle = 0;
      p = new RegularShape(p);
    }
    style.setImage(p);
  }
  if (options.text) {
    p = options.text;
    try {
      if (p.fill && !(p.fill instanceof Fill)) {
        p.fill = new Fill(p.fill);
      }
      if (p.stroke && !(p.stroke instanceof Stroke)) {
        p.stroke = new Stroke(p.stroke);
      }
      if (p.backgroundFill && !(p.backgroundFill instanceof Fill)) {
        p.backgroundFill = new Fill(p.backgroundFill);
      }
      if (p.backgroundStroke && !(p.backgroundStroke instanceof Stroke)) {
        p.backgroundStroke = new Stroke(p.backgroundStroke);
      }
    } catch (e) {
      console.log('text symbol parameters error', e);
    }
    style.setText(new Text(p));
  }
  return style;
}

export function judgeLayerVisible(layer, map) {
  const min = layer.getMinZoom();
  const max = layer.getMaxZoom();
  const visible = layer.getVisible();
  const current = map.getView().getZoom();
  return visible && current > min && current <= max;
}

/**
 * hover改变颜色
 *
 * @param    {[type]} Options
 * @return   {[type]} style
 */
export function hoverChangeStyle(olMap, layerName, styles) {
  // hover改变颜色
  const hoverLayers = [];
  const currentFeatures = [];
  const changeStyle = getDrawStyle(styles);
  const layers = olMap.getLayers().getArray();
  layers.forEach((layer) => {
    if (layer.getZIndex() >= 3 && layer.getZIndex() < 1000) {
      if (layer.get('hoverLayerName') === `hoverLayerName${layerName}`) {
        hoverLayers.push(layer);
      }
    }
  });
  // 地图触摸事件
  olMap.on('pointermove', (event) => {
    if (currentFeatures.length > 0) {
      while (currentFeatures.length > 0) {
        currentFeatures.pop().setStyle(null);
        event.map.getTargetElement().style.cursor = 'default';
      }
    }
    const pixel = event.map.getEventPixel(event.originalEvent);
    hoverLayers.forEach((layer) => {
      if (judgeLayerVisible(layer, olMap)) {
        layer.getFeatures(pixel).then((features) => {
          for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            feature.setStyle(changeStyle);
            currentFeatures.push(feature);
            event.map.getTargetElement().style.cursor = 'pointer';
            return true;
          }
        });
      }
    });
  });
}

/**
 * hover显示tips提示
 *
 * @param    {[type]} Options
 * @return   {[type]} style
 */
export function hoverShowTips(olMap, layerName, tipsName) {
  const layers = olMap.getLayers().getArray();
  const tipsLayers = [];
  layers.forEach((layer) => {
    if (layer.getZIndex() >= 1 && layer.getZIndex() < 1000) {
      if (layer.get('tipsLayerName') === `tipsLayerName${layerName}`) {
        tipsLayers.push(layer);
      }
    }
  });
  const drawLayer = new VectorLayer({
    source: new VectorSource(),
    zIndex: 1000,
  });
  olMap.addLayer(drawLayer);
  // 地图触摸事件
  olMap.on('pointermove', (event) => {
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
    drawLayer.getSource().clear(true);
    const pixel = event.map.getEventPixel(event.originalEvent);
    tipsLayers.forEach((layer) => {
      if (judgeLayerVisible(layer, olMap)) {
        layer.getFeatures(pixel).then((features) => {
          features.forEach((feature) => {
            const properties = feature.getProperties();
            const newProperties = {};
            Object.keys(properties).forEach((key) => {
              if (key !== 'geometry') {
                newProperties[key] = properties[key];
              }
            });
            const newFeature = new Feature({
              geometry: new Point(event.map.getCoordinateFromPixel(pixel)),
              ...newProperties,
            });
            const tipsFieldName = tipsName ? tipsName.tipsFieldName : '';
            tipStyle.text.text = newFeature.get(tipsFieldName);
            const tipStyles = getDrawStyle(tipStyle);
            newFeature.setStyle(tipStyles);
            drawLayer.getSource().addFeature(newFeature);
          });
        });
      }
    });
  });
}
