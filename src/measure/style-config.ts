/**
 * 测量样式配置(工厂函数形式)
 *
 * 旧版导出 6 个模块级共享单例 Style 实例,多地图同时测量时会互相串扰;
 * 新版每个工厂函数返回全新实例,由 measure 模块按地图状态持有、drawing 模块按需生成。
 */
import { Circle as CircleStyle, Fill, Icon, RegularShape, Stroke, Style, Text } from 'ol/style';

/** 基础样式(白色半透明填充 + 蓝色描边 + 顶点圆点) */
export function createDefaultStyle(): Style {
  return new Style({
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.5)',
    }),
    stroke: new Stroke({
      color: 'rgba(0, 153, 255, 1)',
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
}

/** 总长度/面积标签样式(带黑色背景与倒三角指向标) */
export function createLabelStyle(): Style {
  return new Style({
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
}

/** 操作提示样式(跟随鼠标位置的文本提示) */
export function createTipStyle(): Style {
  return new Style({
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
}

/** 修改交互样式(顶点圆点 + '拖动以修改'提示) */
export function createModifyStyle(): Style {
  return new Style({
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
}

/** 分段长度标签样式(带倒三角指向标) */
export function createSegmentStyle(): Style {
  return new Style({
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
}

/** 清除按钮图标(18x18 PNG 的 base64 data URL) */
const CLEAR_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAXhJREFUOE+llLFOwzAURe8tn0AjJCQm7IwsqAOwwFJGViT4AhgpE0gUiQ0Y2z+oYIQRFroAQ8XCWIcFBBJN+QT6kEsSOcWtqJol1rPfsZ/tY8LzfSpVLpALABYBrCRD7gE89USeZ6LodjCNg4FuGNZEZMc3QRojWS+227vumBwo1joCMD8K4vS9BMaoDJ42ulo/CLD0T0h/GIHHojHLSRuIw3APImcJpJn8V31QIet0SycrQbt9zi+lyj3yxklqBsasxUodgazmYCLVIIqOO2FYc2EFkXV2tD4gcOJLyMESiG8CAQ4ZK3UFcuNPGW4iALsS7yptosg1Y63fAcx6NzmB2b6hkN/EDwt6BTA3IejNgi4AbE5UGnBpQRUAp5NsNoB9Jl65x98IjNkedfyx1ncAsnvWs8dvV+LxqwFga8gtz13Y1LvMtTE9S+fIfMtJO45vrmeZa24JA975q0v8GvqMpB3Wv2+yRJESyFI/LtISsjUl0pr2PGw/egfNTXarqeEAAAAASUVORK5CYII=';

/**
 * 清除按钮样式(固定图标,锚定标签点右下方)
 * ol 9 已废弃 Icon 的 imgSize 选项,此处省略(图标天然尺寸即 18x18,视觉上无差异)
 */
export function createClearStyle(): Style {
  return new Style({
    image: new Icon({
      src: CLEAR_ICON,
      crossOrigin: 'anonymous',
      offsetOrigin: 'bottom-right',
      size: [40, 40],
    }),
  });
}
