/**
 * 坐标转换工具类（支持多种坐标系互转：WGS84/GCJ02/BD09/Web墨卡托）
 * 坐标系说明：
 * - WGS84：GPS原始坐标（国际通用）
 * - GCJ02：火星坐标系（中国国内加密坐标，高德/谷歌中国等使用）
 * - BD09：百度坐标系（在GCJ02基础上进一步加密，百度地图使用）
 * - Web墨卡托：Web地图常用投影坐标（如OpenLayers/Google Maps等）
 */

// 常量定义（地球椭球参数及转换系数）
const X_PI = (3.14159265358979324 * 3000.0) / 180.0; // 用于百度坐标转换的系数
const PI = 3.1415926535897932384626; // 圆周率
const A = 6378245.0; // 克拉索夫斯基椭球长半轴（米）
const EE = 0.00669342162296594323; // 克拉索夫斯基椭球偏心率平方


/**
 * Web墨卡托坐标转WGS84经纬度
 * @param {number} mercatorLon - Web墨卡托X坐标（经度方向）
 * @param {number} mercatorLat - Web墨卡托Y坐标（纬度方向）
 * @returns {number[]} WGS84坐标 [经度, 纬度]
 */
export function mercatorTowgs84(mercatorLon, mercatorLat) {
  // 墨卡托坐标转经度（直接线性转换）
  const lon = (mercatorLon / 20037508.34) * 180;

  // 墨卡托坐标转纬度（需经反三角函数转换）
  let lat = (mercatorLat / 20037508.34) * 180;
  lat = (180 / PI) * (2 * Math.atan(Math.exp((lat * PI) / 180)) - PI / 2);

  return [lon, lat];
}


/**
 * WGS84经纬度转Web墨卡托坐标
 * @param {number} lon - WGS84经度
 * @param {number} lat - WGS84纬度
 * @returns {number[]} Web墨卡托坐标 [X, Y]
 */
export function wgs84ToMercator(lon, lat) {
  // 经度转墨卡托X坐标
  const mercatorLon = (lon * 20037508.34) / 180;

  // 纬度转墨卡托Y坐标（需经正切和自然指数转换）
  let mercatorLat = Math.log(Math.tan(((90 + lat) * PI) / 360)) / (PI / 180);
  mercatorLat = (mercatorLat * 20037508.34) / 180;

  return [mercatorLon, mercatorLat];
}


/**
 * 百度坐标系（BD09）转火星坐标系（GCJ02）
 * @param {number} bdLon - BD09经度
 * @param {number} bdLat - BD09纬度
 * @returns {number[]} GCJ02坐标 [经度, 纬度]
 */
export function bd09Togcj02(bdLon, bdLat) {
  // 转换为数字类型（兼容字符串输入）
  const lon = +bdLon;
  const lat = +bdLat;

  // 百度坐标解密核心公式
  const x = lon - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);

  const gcjLon = z * Math.cos(theta);
  const gcjLat = z * Math.sin(theta);

  return [gcjLon, gcjLat];
}


/**
 * 火星坐标系（GCJ02）转百度坐标系（BD09）
 * @param {number} gcjLon - GCJ02经度
 * @param {number} gcjLat - GCJ02纬度
 * @returns {number[]} BD09坐标 [经度, 纬度]
 */
export function gcj02Tobd09(gcjLon, gcjLat) {
  // 转换为数字类型（兼容字符串输入）
  const lon = +gcjLon;
  const lat = +gcjLat;

  // 百度坐标加密核心公式
  const z = Math.sqrt(lon * lon + lat * lat) + 0.00002 * Math.sin(lat * X_PI);
  const theta = Math.atan2(lat, lon) + 0.000003 * Math.cos(lon * X_PI);

  const bdLon = z * Math.cos(theta) + 0.0065;
  const bdLat = z * Math.sin(theta) + 0.006;

  return [bdLon, bdLat];
}


/**
 * WGS84经纬度转火星坐标系（GCJ02）
 * @param {number} lon - WGS84经度
 * @param {number} lat - WGS84纬度
 * @returns {number[]} GCJ02坐标 [经度, 纬度]（国内坐标加密，国外坐标不变）
 */
export function wgs84Togcj02(lon, lat) {
  // 转换为数字类型（兼容字符串输入）
  const wgsLon = +lon;
  const wgsLat = +lat;

  // 国外坐标不加密（直接返回原坐标）
  if (isOutOfChina(wgsLon, wgsLat)) {
    return [wgsLon, wgsLat];
  }

  // 国内坐标加密计算
  const dLat = transformLat(wgsLon - 105.0, wgsLat - 35.0); // 纬度偏移量
  const dLon = transformLng(wgsLon - 105.0, wgsLat - 35.0); // 经度偏移量
  const radLat = (wgsLat / 180.0) * PI;
  const magic = Math.sin(radLat);

  // 地球椭球参数校正
  const sqrtMagic = Math.sqrt(1 - EE * magic * magic);
  const latCorrection = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  const lonCorrection = (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);

  // 计算GCJ02坐标
  const gcjLon = wgsLon + lonCorrection;
  const gcjLat = wgsLat + latCorrection;

  return [gcjLon, gcjLat];
}


/**
 * 火星坐标系（GCJ02）转WGS84经纬度
 * @param {number} gcjLon - GCJ02经度
 * @param {number} gcjLat - GCJ02纬度
 * @returns {number[]} WGS84坐标 [经度, 纬度]（国内坐标解密，国外坐标不变）
 */
export function gcj02Towgs84(gcjLon, gcjLat) {
  // 转换为数字类型（兼容字符串输入）
  const lon = +gcjLon;
  const lat = +gcjLat;

  // 国外坐标不解密（直接返回原坐标）
  if (isOutOfChina(lon, lat)) {
    return [lon, lat];
  }

  // 国内坐标解密计算（基于加密公式反推）
  const dLat = transformLat(lon - 105.0, lat - 35.0); // 纬度偏移量
  const dLon = transformLng(lon - 105.0, lat - 35.0); // 经度偏移量
  const radLat = (lat / 180.0) * PI;
  const magic = Math.sin(radLat);

  // 地球椭球参数校正
  const sqrtMagic = Math.sqrt(1 - EE * magic * magic);
  const latCorrection = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  const lonCorrection = (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);

  // 计算WGS84坐标（反推公式：原坐标 = 2*加密坐标 - 加密后坐标）
  const mglat = lat + latCorrection;
  const mglng = lon + lonCorrection;
  const wgsLon = lon * 2 - mglng;
  const wgsLat = lat * 2 - mglat;

  return [wgsLon, wgsLat];
}


/**
 * 计算纬度偏移量（用于WGS84与GCJ02转换）
 * @param {number} lng - 经度（已减去105基准值）
 * @param {number} lat - 纬度（已减去35基准值）
 * @returns {number} 纬度偏移量
 */
export function transformLat(lng, lat) {
  let latOffset = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  latOffset += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
  latOffset += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0;
  latOffset += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0;
  return latOffset;
}


/**
 * 计算经度偏移量（用于WGS84与GCJ02转换）
 * @param {number} lng - 经度（已减去105基准值）
 * @param {number} lat - 纬度（已减去35基准值）
 * @returns {number} 经度偏移量
 */
export function transformLng(lng, lat) {
  let lonOffset = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  lonOffset += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
  lonOffset += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0;
  lonOffset += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0;
  return lonOffset;
}


/**
 * 判断坐标是否在中国大陆范围内（不在国内则不进行GCJ02加密）
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @returns {boolean} 是否在国外（true：国外，false：国内）
 */
export function isOutOfChina(lng, lat) {
  const longitude = +lng;
  const latitude = +lat;
  // 中国大陆范围大致：经度73.66~135.05，纬度3.86~53.55
  return !(longitude > 73.66 && longitude < 135.05 && latitude > 3.86 && latitude < 53.55);
}
