import type Map from 'ol/Map';
import type { ExportImageOptions, ExportImageTitleOption } from '../types';

/**
 * 空白图例的base64编码(默认图例,当无自定义图例时使用)
 * 透明1x1像素图片,避免图例加载失败导致的异常
 */
const DEFAULT_LEGEND_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWP4//+/FAAJFgMYX7M3+gAAAABJRU5ErkJggg==';

/** drawTextOnMap 文本配置项 */
interface DrawTextOptions {
  title?: ExportImageTitleOption;
  subtitle?: ExportImageTitleOption;
  /** 画布裁剪尺寸 [width, height](影响文本绘制位置) */
  size?: number[];
}

/**
 * 在地图画布上绘制标题和副标题文本
 * @param canvas - 目标画布元素
 * @param context - 画布上下文
 * @param options - 文本配置项
 */
function drawTextOnMap(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, options: DrawTextOptions): void {
  const canvasWidth = canvas.width;
  // 计算裁剪高度(默认使用画布高度,不超过画布实际高度)
  let clipHeight = canvas.height;
  if (options.size) {
    clipHeight = options.size[1] ?? canvas.height;
    clipHeight = Math.min(clipHeight, canvas.height);
  }
  // 文本绘制的起始Y轴偏移(居中对齐裁剪区域)
  const startY = (canvas.height - clipHeight) / 2;

  // 文本样式基础配置(阴影效果增强可读性)
  context.textAlign = 'center';
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 2;
  context.shadowColor = 'rgba(240, 242, 245, 0.9)';
  context.shadowBlur = 4;

  // 绘制主标题
  if (options.title) {
    const titleText = options.title.name ?? '';
    context.fillStyle = options.title.color ?? '#416cf2';
    context.font = `bold ${options.title.fontSize ?? '26px'} sans-serif`;
    context.fillText(titleText, canvasWidth / 2, 50 + startY);
  }

  // 绘制副标题
  if (options.subtitle) {
    const subTitleText = options.subtitle.name ?? '';
    context.fillStyle = options.subtitle.color ?? '#416cf2';
    context.font = `bold ${options.subtitle.fontSize ?? '16px'} sans-serif`;
    context.fillText(subTitleText, canvasWidth / 2, 90 + startY);
  }
}

/** compositeImages 合成配置项 */
interface CompositeOptions {
  /** 图例图片URL,默认 1x1 透明 PNG */
  legend?: string;
  /** 裁剪尺寸 [width, height] */
  imgSize?: number[];
  /** 导出图片格式,默认 'image/png' */
  type?: string;
  /** 导出图片质量(0-1),默认 0.8 */
  quality?: number;
  /** 是否自动下载图片,默认 true */
  down?: boolean;
}

/**
 * 将地图画布与图例合成,并转换为base64图片
 * @param canvas - 地图主画布
 * @param context - 画布上下文
 * @param options - 合成配置项
 * @returns 合成后的base64图片字符串
 */
async function compositeImages(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, options: CompositeOptions): Promise<string> {
  const { legend = DEFAULT_LEGEND_IMAGE, imgSize, type = 'image/png', quality = 0.8, down = true } = options;

  // 计算裁剪区域(不超过画布实际尺寸)
  let clipWidth = canvas.width;
  let clipHeight = canvas.height;
  if (imgSize) {
    clipWidth = Math.min(imgSize[0] ?? canvas.width, canvas.width);
    clipHeight = Math.min(imgSize[1] ?? canvas.height, canvas.height);
  }
  const startX = (canvas.width - clipWidth) / 2;
  const startY = (canvas.height - clipHeight) / 2;

  // 加载图例图片(处理跨域)
  const legendImg = new Image();
  legendImg.crossOrigin = 'anonymous';
  legendImg.src = legend;

  // 等待图例加载完成
  await new Promise<void>((resolve, reject) => {
    legendImg.onload = () => resolve();
    legendImg.onerror = () => reject(new Error('图例图片加载失败'));
  });

  // 绘制图例到画布右下角(带边距)
  const legendWidth = legendImg.width;
  const legendHeight = legendImg.height;
  const legendX = startX + clipWidth - legendWidth - 10; // 右间距10px
  const legendY = startY + clipHeight - legendHeight - 10; // 下间距10px
  context.drawImage(legendImg, legendX, legendY, legendWidth, legendHeight);

  // 将画布转换为base64
  const base64Image = canvas.toDataURL(type, quality);

  // 自动下载(若配置需要)
  if (down) {
    downloadByBlob(base64Image);
  }

  return base64Image;
}

/**
 * 将base64图片转换为Blob并触发下载
 * @param base64Image - base64编码的图片字符串
 */
function downloadByBlob(base64Image: string): void {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = base64Image;

  image.onload = () => {
    const blob = dataURItoBlob(base64Image);
    const blobUrl = URL.createObjectURL(blob);
    const fileName = `Map-Image-${Date.now()}`; // 文件名含时间戳避免重复
    downloadImage(blobUrl, fileName);
    URL.revokeObjectURL(blobUrl); // 释放URL对象,避免内存泄漏
  };
}

/**
 * 触发图片下载
 * @param url - 图片URL(blob或http)
 * @param fileName - 下载文件名
 */
function downloadImage(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  link.click(); // 模拟点击下载
  link.remove(); // 清理DOM元素
}

/**
 * 将base64字符串转换为Blob对象
 * @param dataURI - base64编码的图片字符串(格式:data:[<mime>];base64,<data>)
 * @returns 转换后的Blob对象
 */
function dataURItoBlob(dataURI: string): Blob {
  // 分割base64头部和数据部分
  const [header, data] = dataURI.split(',');
  // 解析MIME类型
  const mimeType = header.split(':')[1].split(';')[0];

  // 解码base64数据
  const byteString = header.includes('base64') ? atob(data) : unescape(data);

  // 转换为Uint8Array
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }

  return new Blob([byteArray], { type: mimeType });
}

/**
 * 将OpenLayers地图导出为图片(支持添加标题、图例和自动下载)
 *
 * @param olMap - OpenLayers地图实例
 * @param options - 导出配置项
 * @returns 导出图片的base64字符串;地图实例、绘图上下文或地图尺寸不存在时返回 undefined
 */
export async function exportMapToImage(olMap: Map, options: ExportImageOptions = {}): Promise<string | undefined> {
  if (!olMap) return undefined; // 地图实例不存在时终止

  // 创建临时画布(尺寸与地图一致)
  const mapCanvas = document.createElement('canvas');
  const mapContext = mapCanvas.getContext('2d');
  const mapSize = olMap.getSize();
  if (!mapContext || !mapSize) return undefined; // 绘图上下文或地图尺寸不存在时终止
  mapCanvas.width = mapSize[0];
  mapCanvas.height = mapSize[1];

  // 合并所有地图图层的canvas到临时画布
  const layerCanvases = document.querySelectorAll<HTMLCanvasElement>('.ol-layer canvas');
  layerCanvases.forEach((canvas) => {
    if (canvas.width <= 0) return; // 跳过无效画布

    // 应用图层透明度
    const opacity = canvas.parentElement?.style.opacity;
    mapContext.globalAlpha = opacity ? Number(opacity) : 1;

    // 应用图层变换矩阵(确保位置正确)
    const transform = canvas.style.transform;
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (transform.startsWith('matrix(') && matrixMatch) {
      const matrix = matrixMatch[1].split(',').map(Number);
      mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
    } else {
      // 修复:无矩阵变换时显式重置为单位矩阵,避免上一图层的变换残留
      mapContext.setTransform(1, 0, 0, 1, 0, 0);
    }

    // 绘制图层到临时画布(支持裁剪)
    let clipWidth = mapCanvas.width;
    let clipHeight = mapCanvas.height;
    if (options.size) {
      clipWidth = Math.min(options.size[0] ?? mapCanvas.width, mapCanvas.width);
      clipHeight = Math.min(options.size[1] ?? mapCanvas.height, mapCanvas.height);
    }
    const startX = (canvas.width - clipWidth) / 2;
    const startY = (canvas.height - clipHeight) / 2;

    mapContext.rect(startX, startY, clipWidth, clipHeight);
    mapContext.clip();
    mapContext.drawImage(canvas, 0, 0);
  });

  // 在画布上绘制标题和副标题
  drawTextOnMap(mapCanvas, mapContext, options);

  // 合成图例并导出为base64
  return compositeImages(mapCanvas, mapContext, options);
}
