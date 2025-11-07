import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text, Icon } from 'ol/style';

const defaultStyle = new Style({
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

const clearIcon = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAXhJREFUOE+llLFOwzAURe8tn0AjJCQm7IwsqAOwwFJGViT4AhgpE0gUiQ0Y2z+oYIQRFroAQ8XCWIcFBBJN+QT6kEsSOcWtqJol1rPfsZ/tY8LzfSpVLpALABYBrCRD7gE89USeZ6LodjCNg4FuGNZEZMc3QRojWS+227vumBwo1joCMD8K4vS9BMaoDJ42ulo/CLD0T0h/GIHHojHLSRuIw3APImcJpJn8V31QIet0SycrQbt9zi+lyj3yxklqBsasxUodgazmYCLVIIqOO2FYc2EFkXV2tD4gcOJLyMESiG8CAQ4ZK3UFcuNPGW4iALsS7yptosg1Y63fAcx6NzmB2b6hkN/EDwt6BTA3IejNgi4AbE5UGnBpQRUAp5NsNoB9Jl65x98IjNkedfyx1ncAsnvWs8dvV+LxqwFga8gtz13Y1LvMtTE9S+fIfMtJO45vrmeZa24JA975q0v8GvqMpB3Wv2+yRJESyFI/LtISsjUl0pr2PGw/egfNTXarqeEAAAAASUVORK5CYII=`
const clearStyle = new Style({
  image: new Icon({
    src: clearIcon,
    crossOrigin: 'anonymous',
    imgSize: [18, 18],
    offsetOrigin: 'bottom-right',
    size: [40, 40],
  }),
});

export { defaultStyle, labelStyle, tipStyle, modifyStyle, segmentStyle, clearStyle };
