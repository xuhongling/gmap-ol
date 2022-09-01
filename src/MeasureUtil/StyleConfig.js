import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style';

const style = new Style({
  fill: new Fill({
    color: 'rgba(255, 255, 255, 0.5)',
  }),
  stroke: new Stroke({
    color: 'rgba(0, 153, 255, 1)',
    // lineDash: [10, 10],
    width: 2,
  }),
  image: new CircleStyle({
    radius: 6,
    stroke: new Stroke({
      color: 'rgba(255, 255, 255, 1)',
    }),
    fill: new Fill({
      color: 'rgba(0, 153, 255, 1)',
    }),
  }),
});

const labelStyle = new Style({
  text: new Text({
    font: '14px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
    padding: [3, 3, 3, 3],
    textBaseline: 'bottom',
    offsetY: -15,
  }),
  image: new RegularShape({
    radius: 8,
    points: 3,
    angle: Math.PI,
    displacement: [0, 10],
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
  }),
});

const tipStyle = new Style({
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
    padding: [6, 2, 2, 2],
    textAlign: 'left',
    offsetX: 15,
  }),
});

const modifyStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    stroke: new Stroke({
      color: 'rgba(0, 0, 0, 0.5)',
    }),
    fill: new Fill({
      color: 'rgba(0, 153, 255, 0.9)',
    }),
  }),
  text: new Text({
    text: '拖动以修改',
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
    padding: [4, 2, 2, 4],
    textAlign: 'left',
    offsetX: 15,
  }),
});

const segmentStyle = new Style({
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
    padding: [2, 2, 2, 2],
    textBaseline: 'bottom',
    offsetY: -12,
  }),
  image: new RegularShape({
    radius: 6,
    points: 3,
    angle: Math.PI,
    displacement: [0, 8],
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
  }),
});

export { style, labelStyle, tipStyle, modifyStyle, segmentStyle };
