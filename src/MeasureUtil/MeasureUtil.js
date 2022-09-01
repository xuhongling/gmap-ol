import { Draw, Modify } from 'ol/interaction';
import { LineString, Point } from 'ol/geom';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { getArea, getLength } from 'ol/sphere';
import { style, labelStyle, tipStyle, modifyStyle, segmentStyle } from './StyleConfig.js';

let globalMap = null;
let draw; // global so we can remove it later

let drawType = 'LineString'; // 测量类型: LineString, Polygon
let showSegments = true; // 显示段长度
let clearPrevious = true; // 清除先前的测量数据

const segmentStyles = [segmentStyle];
const source = new VectorSource();
let modify = new Modify({ source: source, style: modifyStyle });
let tipPoint;

// 初始调用一次，加载图层。
let isFirst = true;
function onceFunction() {
  if (isFirst) {
    globalMap.addLayer(drawLayer);
    globalMap.addInteraction(modify);
    isFirst = false;
  }
}

/**
 * 测量距离
 *
 * @param {import("ol/Map").default} map An OlMap.
 *
 * @return {number} The length of line in meters.
 */
export function measureLength(olmap, measureOption) {
  globalMap = olmap;
  drawType = 'LineString';
  onceFunction();
  if (draw) {
    olmap.removeInteraction(draw);
  }
  addInteraction();
  if (measureOption) {
    showSegments = measureOption?.showSegments;
    clearPrevious = measureOption?.clearPrevious;
  }
}

/**
 * 测量面积
 *
 * @param {import("ol/Map").default} map An OlMap.
 *
 * @return {number} The area of the polygon in square meter.
 */
export function measureArea(olmap, measureOption) {
  globalMap = olmap;
  drawType = 'Polygon';
  onceFunction();
  if (draw) {
    olmap.removeInteraction(draw);
  }
  addInteraction();
  if (measureOption) {
    showSegments = measureOption?.showSegments;
    clearPrevious = measureOption?.clearPrevious;
  }
}

/**
 * 清除测量
 *
 * @param {import("ol/Map").default} map An OlMap.
 *
 * @return {number} The area of the polygon in square meter.
 */
export function clearMeasure() {
  source.clear();
  drawLayer.getSource().clear();
}

const drawLayer = new VectorLayer({
  source: new VectorSource(),
  style: function (feature) {
    return styleFunction(feature, showSegments);
  },
  zIndex: 1000,
});

const addInteraction = () => {
  const activeTip = '单击以继续绘制' + (drawType === 'Polygon' ? '多边形' : '线');
  const idleTip = '点击开始测量';
  let tip = idleTip;
  draw = new Draw({
    source: source,
    type: drawType,
    style: function (feature) {
      return styleFunction(feature, showSegments, drawType, tip);
    },
  });
  draw.on('drawstart', function () {
    if (clearPrevious) {
      source.clear();
      drawLayer.getSource().clear();
    }
    modify.setActive(false);
    tip = activeTip;
  });
  draw.on('drawend', function (event) {
    drawLayer.getSource().addFeature(event.feature);
    modifyStyle.setGeometry(tipPoint);
    modify.setActive(true);
    globalMap.once('pointermove', function () {
      modifyStyle.setGeometry();
    });
    tip = idleTip;
  });
  modify.setActive(true);
  globalMap.addInteraction(draw);
};

// 计算距离
const formatLength = function (line) {
  let sourceProj = globalMap.getView().getProjection(); //获取投影坐标系
  const length = getLength(line, { projection: sourceProj });
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' km';
  } else {
    output = Math.round(length * 100) / 100 + ' m';
  }
  return output;
};

// 计算面积
const formatArea = function (polygon) {
  let sourceProj = globalMap.getView().getProjection(); //获取投影坐标系
  const area = getArea(polygon, { projection: sourceProj });
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' km\xB2';
  } else {
    output = Math.round(area * 100) / 100 + ' m\xB2';
  }
  return output;
};

const styleFunction = (feature, segments, drawType, tip) => {
  const styles = [style];
  const geometry = feature.getGeometry();
  const type = geometry.getType();
  let point, label, line;
  if (!drawType || drawType === type) {
    if (type === 'Polygon') {
      point = geometry.getInteriorPoint();
      label = formatArea(geometry);
      line = new LineString(geometry.getCoordinates()[0]);
    } else if (type === 'LineString') {
      point = new Point(geometry.getLastCoordinate());
      label = formatLength(geometry);
      line = geometry;
    }
  }
  if (segments && line) {
    let count = 0;
    line.forEachSegment(function (a, b) {
      const segment = new LineString([a, b]);
      const label = formatLength(segment);
      if (segmentStyles.length - 1 < count) {
        segmentStyles.push(segmentStyle.clone());
      }
      const segmentPoint = new Point(segment.getCoordinateAt(0.5));
      segmentStyles[count].setGeometry(segmentPoint);
      segmentStyles[count].getText().setText(label);
      styles.push(segmentStyles[count]);
      count++;
    });
  }
  if (label) {
    labelStyle.setGeometry(point);
    labelStyle.getText().setText(label);
    styles.push(labelStyle);
  }
  if (tip && type === 'Point' && !modify.getOverlay().getSource().getFeatures().length) {
    tipPoint = geometry;
    tipStyle.getText().setText(tip);
    styles.push(tipStyle);
  }
  return styles;
};
