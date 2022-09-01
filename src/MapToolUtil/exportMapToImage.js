/*
 * @Author: xuhongling
 * @Date:   2022-08-16 17:37:59
 * @Last Modified by:   xuhongling
 * @Last Modified time: 2022-08-19 15:49:04
 */

// 空白 base64 照片数据
const defaultLegendImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWP4//+/FAAJFgMYX7M3+gAAAABJRU5ErkJggg==';

// 绘制文字到地图上面
function drawTextToMap(mapCanvas, mapContext, options) {
  const cW = mapCanvas.width;
  let clipHeight = mapCanvas.height;
  if (options.size) {
    clipHeight = options.size[1] ? options.size[1] : mapCanvas.height;
    clipHeight = clipHeight > mapCanvas.height ? mapCanvas.height : clipHeight;
  }
  const startY = (mapCanvas.height - clipHeight) / 2;

  mapContext.textAlign = 'center';
  mapContext.shadowOffsetX = 0;
  mapContext.shadowOffsetY = 2;
  mapContext.shadowColor = 'rgba(240, 242, 245, 0.9)';
  mapContext.shadowBlur = 4;

  if (options.title) {
    const titleName = options.title.name ? options.title.name : '';
    mapContext.fillStyle = options.title.color ? options.title.color : '#416cf2';
    mapContext.font = `bold ${options.title.fontSize ? options.title.fontSize : '26px'} sans-serif`;
    mapContext.fillText(titleName, cW / 2, 50 + startY);
  }

  if (options.subtitle) {
    const subTitleName = options.subtitle.name ? options.subtitle.name : '';
    mapContext.fillStyle = options.subtitle.color ? options.subtitle.color : '#416cf2';
    mapContext.font = `bold ${options.subtitle.fontSize ? options.subtitle.fontSize : '16px'} sans-serif`;
    mapContext.fillText(subTitleName, cW / 2, 90 + startY);
  }
}

// 把地图跟图例等合成图片
async function compositePictures(mapCanvas, mapContext, options) {
  // 加载图片，缓存到本地的canvas中（避免图片地址导致的下载跨域）
  /*img 规定要使用的图像、画布。
    startX     可选。开始剪切的 x 坐标位置。
    startY     可选。开始剪切的 y 坐标位置。
    clipWidth  可选。被剪切图像的宽度。
    clipHeight 可选。被剪切图像的高度。
    x 在画布上放置图像的 x 坐标位置。
    y 在画布上放置图像的 y 坐标位置。
    width 可选。要使用的图像的宽度。（伸展或缩小图像）
    height  可选。要使用的图像的高度。（伸展或缩小图像）
  */
  //用9参数的drawImage方法对图片进行裁减
  let clipWidth = mapCanvas.width;
  let clipHeight = mapCanvas.height;
  if (options.imgSize) {
    clipWidth = options.imgSize[0] ? options.imgSize[0] : mapCanvas.width;
    clipHeight = options.imgSize[1] ? options.imgSize[1] : mapCanvas.height;
    clipWidth = clipWidth > mapCanvas.width ? mapCanvas.width : clipWidth;
    clipHeight = clipHeight > mapCanvas.height ? mapCanvas.height : clipHeight;
  }
  const startX = (mapCanvas.width - clipWidth) / 2;
  const startY = (mapCanvas.height - clipHeight) / 2;

  // 创建图例图片对象
  let legendImg = new Image();
  legendImg.setAttribute('crossOrigin', 'anonymous'); // 设置属性
  legendImg.src = options.legend ? options.legend : defaultLegendImage;

  // 图例加载完成，为后面回去图例宽高用
  await legendImageLoadingComplete(options);

  const imgWidth = legendImg ? legendImg.width : 0;
  const imgHeight = legendImg ? legendImg.height : 0;
  const imgX = startX + clipWidth - imgWidth - 10;
  const imgY = startY + clipHeight - imgHeight - 10;
  mapContext.drawImage(legendImg, imgX, imgY, imgWidth, imgHeight);

  // 如果导出报错说被污染，需要去地图的Layer下面的source加上 crossOrigin: 'anonymous',
  const type = options.type ? options.type : 'image/png';
  const quality = options.quality ? options.quality : 0.8;
  const base64Image = await mapCanvas.toDataURL(type, quality);
  if (options?.down !== undefined && !options?.down ? false : true) {
    downloadByBlob(base64Image);
  }
  return base64Image;
}

async function legendImgLoad(options) {
  return new Promise((resolve) => {
    let legendImg = new Image();
    legendImg.src = options.legend ? options.legend : defaultLegendImage;
    legendImg.onload = () => {
      resolve();
    };
  });
}

async function legendImageLoadingComplete(options) {
  await legendImgLoad(options);
}

// 把地图下载成图片
function downloadByBlob(base64Image) {
  const image = new Image(); // 创建一个image标签
  image.setAttribute('crossOrigin', 'anonymous'); // 设置属性
  image.src = base64Image; // 设置src
  // 加载图片，缓存到本地的canvas中（避免图片地址导致的下载跨域）
  image.onload = () => {
    const blob = dataURItoBlob(base64Image);
    const url = URL.createObjectURL(blob);
    const name = `Map-Image-${Date.now()}`;
    downloadImage(url, name);
    URL.revokeObjectURL(url); // 用完释放URL对象
  };
}

// 下载图片到本地
function downloadImage(url, name) {
  const eleLink = document.createElement('a'); // 创建一个a标签
  eleLink.download = name; // 下载命名
  eleLink.href = url; // 下载地址
  eleLink.click(); // 模拟点击
  eleLink.remove(); // 模拟点击移除
}

// base64 转 blob
function dataURItoBlob(dataURI) {
  let byteString;
  if (dataURI.split(',')[0].indexOf('base64') >= 0) {
    byteString = atob(dataURI.split(',')[1]);
  } else {
    byteString = unescape(dataURI.split(',')[1]);
  }
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ia], { type: mimeString });
}

/**
 *导出地图成图片下载到本地
 */
function exportMapToImage(olMap, options) {
  // 创建画布
  const mapCanvas = document.createElement('canvas');
  const mapContext = mapCanvas.getContext('2d');
  const size = olMap.getSize();
  mapCanvas.width = size[0];
  mapCanvas.height = size[1];
  // 获取地图图层信息
  const canvasEl = document.querySelectorAll('.ol-layer canvas');
  const canvasElValues = Object.values(canvasEl);
  for (let i = 0; i < canvasElValues.length; i++) {
    const canvas = canvasElValues[i];
    if (canvas.width > 0) {
      const opacity = canvas.parentNode.style.opacity;
      mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
      const transform = canvas.style.transform;
      const matrix = transform
        .match(/^matrix\(([^(]*)\)$/)[1]
        .split(',')
        .map(Number);
      CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);

      let clipWidth = mapCanvas.width;
      let clipHeight = mapCanvas.height;
      if (options.size) {
        clipWidth = options.size[0] ? options.size[0] : mapCanvas.width;
        clipHeight = options.size[1] ? options.size[1] : mapCanvas.height;
        clipWidth = clipWidth > mapCanvas.width ? mapCanvas.width : clipWidth;
        clipHeight = clipHeight > mapCanvas.height ? mapCanvas.height : clipHeight;
      }
      const startX = (canvas.width - clipWidth) / 2;
      const startY = (canvas.height - clipHeight) / 2;
      mapContext.rect(startX, startY, clipWidth, clipHeight);
      mapContext.clip();
      mapContext.drawImage(canvas, 0, 0);
    }
  }
  // 绘制标题文字到地图上面
  drawTextToMap(mapCanvas, mapContext, options);

  // 把地图图例合成图片
  let base64ImageData = compositePictures(mapCanvas, mapContext, options);
  return base64ImageData;
}

export default exportMapToImage;
