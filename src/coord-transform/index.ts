/**
 * 坐标转换工具(支持多种坐标系互转:WGS84/GCJ02/BD09/Web墨卡托)
 * 坐标系说明:
 * - WGS84:GPS原始坐标(国际通用)
 * - GCJ02:火星坐标系(中国国内加密坐标,高德/谷歌中国等使用)
 * - BD09:百度坐标系(在GCJ02基础上进一步加密,百度地图使用)
 * - Web墨卡托:Web地图常用投影坐标(如OpenLayers/Google Maps等)
 */
import type { LonLat } from '../types';

// 常量定义(地球椭球参数及转换系数)
const X_PI = (3.141592653589793 * 3000.0) / 180.0; // 用于百度坐标转换的系数(与 Math.PI 同值,数值与旧版一致)
const PI = 3.141592653589793; // 圆周率
const A = 6378245.0; // 克拉索夫斯基椭球长半轴(米)
const EE = 0.006693421622965943; // 克拉索夫斯基椭球偏心率平方(最短精确表示,数值与旧版一致)

/**
 * Web墨卡托坐标转WGS84经纬度
 * @param mercatorLon - Web墨卡托X坐标(经度方向)
 * @param mercatorLat - Web墨卡托Y坐标(纬度方向)
 * @returns WGS84坐标 [经度, 纬度]
 */
export function mercatorTowgs84(mercatorLon: number, mercatorLat: number): LonLat {
  const lon = (mercatorLon / 20037508.34) * 180;

  let lat = (mercatorLat / 20037508.34) * 180;
  lat = (180 / PI) * (2 * Math.atan(Math.exp((lat * PI) / 180)) - PI / 2);

  return [lon, lat];
}

/**
 * WGS84经纬度转Web墨卡托坐标
 * @param lon - WGS84经度
 * @param lat - WGS84纬度
 * @returns Web墨卡托坐标 [X, Y]
 */
export function wgs84ToMercator(lon: number, lat: number): LonLat {
  const mercatorLon = (lon * 20037508.34) / 180;

  let mercatorLat = Math.log(Math.tan(((90 + lat) * PI) / 360)) / (PI / 180);
  mercatorLat = (mercatorLat * 20037508.34) / 180;

  return [mercatorLon, mercatorLat];
}

/**
 * 百度坐标系(BD09)转火星坐标系(GCJ02)
 * @param bdLon - BD09经度
 * @param bdLat - BD09纬度
 * @returns GCJ02坐标 [经度, 纬度]
 */
export function bd09Togcj02(bdLon: number, bdLat: number): LonLat {
  const x = bdLon - 0.0065;
  const y = bdLat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);

  const gcjLon = z * Math.cos(theta);
  const gcjLat = z * Math.sin(theta);

  return [gcjLon, gcjLat];
}

/**
 * 火星坐标系(GCJ02)转百度坐标系(BD09)
 * @param gcjLon - GCJ02经度
 * @param gcjLat - GCJ02纬度
 * @returns BD09坐标 [经度, 纬度]
 */
export function gcj02Tobd09(gcjLon: number, gcjLat: number): LonLat {
  const z = Math.sqrt(gcjLon * gcjLon + gcjLat * gcjLat) + 0.00002 * Math.sin(gcjLat * X_PI);
  const theta = Math.atan2(gcjLat, gcjLon) + 0.000003 * Math.cos(gcjLon * X_PI);

  const bdLon = z * Math.cos(theta) + 0.0065;
  const bdLat = z * Math.sin(theta) + 0.006;

  return [bdLon, bdLat];
}

/**
 * WGS84经纬度转火星坐标系(GCJ02)
 * @param lon - WGS84经度
 * @param lat - WGS84纬度
 * @returns GCJ02坐标 [经度, 纬度](国内坐标加密,国外坐标不变)
 */
export function wgs84Togcj02(lon: number, lat: number): LonLat {
  if (isOutOfChina(lon, lat)) {
    return [lon, lat];
  }

  const dLat = transformLat(lon - 105.0, lat - 35.0);
  const dLon = transformLng(lon - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  const magic = Math.sin(radLat);

  const sqrtMagic = Math.sqrt(1 - EE * magic * magic);
  const latCorrection = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  const lonCorrection = (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);

  const gcjLon = lon + lonCorrection;
  const gcjLat = lat + latCorrection;

  return [gcjLon, gcjLat];
}

/**
 * 火星坐标系(GCJ02)转WGS84经纬度(近似反推算法,非精确解,存在米级误差)
 * @param gcjLon - GCJ02经度
 * @param gcjLat - GCJ02纬度
 * @returns WGS84坐标 [经度, 纬度](国内坐标解密,国外坐标不变)
 */
export function gcj02Towgs84(gcjLon: number, gcjLat: number): LonLat {
  if (isOutOfChina(gcjLon, gcjLat)) {
    return [gcjLon, gcjLat];
  }

  const dLat = transformLat(gcjLon - 105.0, gcjLat - 35.0);
  const dLon = transformLng(gcjLon - 105.0, gcjLat - 35.0);
  const radLat = (gcjLat / 180.0) * PI;
  const magic = Math.sin(radLat);

  const sqrtMagic = Math.sqrt(1 - EE * magic * magic);
  const latCorrection = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  const lonCorrection = (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);

  // 反推公式:原坐标 = 2*加密坐标 - 加密后坐标
  const mglat = gcjLat + latCorrection;
  const mglng = gcjLon + lonCorrection;
  const wgsLon = gcjLon * 2 - mglng;
  const wgsLat = gcjLat * 2 - mglat;

  return [wgsLon, wgsLat];
}

/**
 * 计算纬度偏移量(用于WGS84与GCJ02转换)
 * @param lng - 经度(已减去105基准值)
 * @param lat - 纬度(已减去35基准值)
 * @returns 纬度偏移量
 */
export function transformLat(lng: number, lat: number): number {
  let latOffset = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  latOffset += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
  latOffset += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0;
  latOffset += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0;
  return latOffset;
}

/**
 * 计算经度偏移量(用于WGS84与GCJ02转换)
 * @param lng - 经度(已减去105基准值)
 * @param lat - 纬度(已减去35基准值)
 * @returns 经度偏移量
 */
export function transformLng(lng: number, lat: number): number {
  let lonOffset = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  lonOffset += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
  lonOffset += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0;
  lonOffset += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0;
  return lonOffset;
}

/**
 * 判断坐标是否在中国大陆范围内(不在国内则不进行GCJ02加密)
 * @param lng - 经度
 * @param lat - 纬度
 * @returns 是否在国外(true:国外,false:国内)
 */
export function isOutOfChina(lng: number, lat: number): boolean {
  // 中国大陆范围大致:经度73.66~135.05,纬度3.86~53.55
  return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
}
