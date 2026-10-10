import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import type Map from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type BaseLayer from 'ol/layer/Base';
import type { Pixel } from 'ol/pixel';
import { getLayerByName } from '../layer';
import { LAYER_PROP_NAME } from '../constants';
import type { GeoJSONFeature, GetWmsFeatureOptions, UpdateWfsFilterOptions, WfsLayerOptions, WmsFeatureCallback, WmsLayerOptions } from '../types';

/** 本模块使用的地图浏览器事件类型 */
type WfsMapBrowserEvent = MapBrowserEvent<UIEvent>;

/** 本模块注册的地图事件类型(click 取数 / hover 光标) */
type WfsMapEventType = 'singleclick' | 'pointermove';

/** 已注册的地图事件处理器记录 */
interface WfsEventHandlerRecord {
  /** 事件类型('singleclick'、'pointermove') */
  eventType: WfsMapEventType;
  /** 事件处理器 */
  handler: (event: WfsMapBrowserEvent) => void;
}

/** 单个地图实例的 WFS 事件状态 */
interface WfsState {
  /** 已注册的事件处理器列表 */
  handlers: WfsEventHandlerRecord[];
  /** 进行中的请求中止控制器列表 */
  abortControllers: AbortController[];
}

/** 使用 WeakMap 存储每个地图实例的 WFS 事件处理器 */
const wfsEventMap = new WeakMap<Map, WfsState>();

/**
 * 获取或创建地图实例的 WFS 事件状态
 *
 * @param map - 地图实例
 * @returns 事件状态对象
 */
function getWfsState(map: Map): WfsState {
  if (!wfsEventMap.has(map)) {
    wfsEventMap.set(map, {
      handlers: [],
      abortControllers: [],
    });
  }
  return wfsEventMap.get(map) as WfsState;
}

/**
 * 注册事件处理器并保存引用
 *
 * @param map - 地图实例
 * @param eventType - 事件类型
 * @param handler - 事件处理器
 */
function registerHandler(map: Map, eventType: WfsMapEventType, handler: (event: WfsMapBrowserEvent) => void): void {
  const state = getWfsState(map);
  map.on(eventType, handler);
  state.handlers.push({ eventType, handler });
}

/**
 * 向地图添加WMS瓦片图层
 *
 * @param olMap - 目标地图实例
 * @param wmsOptions - WMS图层配置项
 */
export function addWmsLayer(olMap: Map, wmsOptions: WmsLayerOptions): void {
  if (!olMap) return;

  const { layerName = '', url = '', layers, filter = [], visible = true, zIndex = 5, params = {} } = wmsOptions;

  const cqlFilter = filter.length > 0 ? filter.join(' and ') : '';

  const wmsLayer = new TileLayer({
    source: new TileWMS({
      url: `${url}/wms`,
      params: {
        layers,
        ...(cqlFilter ? { CQL_FILTER: cqlFilter } : {}),
        ...params,
      },
      serverType: 'geoserver',
      crossOrigin: 'anonymous',
    }),
    visible,
    zIndex,
  });

  wmsLayer.set(LAYER_PROP_NAME, layerName);
  olMap.addLayer(wmsLayer);
}

/**
 * 向地图添加WFS矢量图层(动态加载要素)
 *
 * @param olMap - 目标地图实例
 * @param wfsOptions - WFS图层配置项
 */
export function addWfsLayer(olMap: Map, wfsOptions: WfsLayerOptions): void {
  if (!olMap) return;

  const { layerName = '', url = '', layers, style, filter = [], visible = true, zIndex = 5 } = wfsOptions;

  const view = olMap.getView();
  const projection = view.getProjection().getCode();

  const cqlFilter = filter.length > 0 ? `&cql_filter=${filter.join(' and ')}` : '';

  // projection 选项在 ol 9 的 VectorSource Options 中已移除(运行时会被忽略),
  // 但旧版构造参数中包含它,这里通过变量传参保留原有形态;实际投影由 srsname 与 GeoJSON 解析决定
  const sourceOptions = {
    projection,
    format: new GeoJSON(),
    url: () => {
      return (
        `${url}/wfs?` +
        `service=WFS&version=1.1.0&request=GetFeature&` +
        `typename=${layers}&outputFormat=application/json&` +
        `srsname=${projection}${cqlFilter}`
      );
    },
  };

  const wfsLayer = new VectorLayer({
    source: new VectorSource(sourceOptions),
    style,
    visible,
    zIndex,
  });

  wfsLayer.set(LAYER_PROP_NAME, layerName);
  olMap.addLayer(wfsLayer);
}

/**
 * 为WMS瓦片图层绑定点击事件,获取要素信息并触发回调
 * 同时处理鼠标悬停时的光标样式变化
 *
 * @param olMap - 目标地图实例
 * @param wfsOptions - 配置项(与图层标识相关)
 * @param getFeatureCallbackFn - 获取要素后的回调函数(参数为GeoJSON Feature数组)
 * @returns 清理函数,调用可移除事件监听
 */
export function getWmsFeature(olMap: Map, wfsOptions: GetWmsFeatureOptions, getFeatureCallbackFn?: WmsFeatureCallback): () => void {
  const { layerName = '', layers = '', params = {} } = wfsOptions;
  const foundLayer = getLayerByName(olMap, layerName);

  // 仅处理TileWMS源的瓦片图层,未找到或类型不匹配时按未找到处理
  const wmsLayer = foundLayer instanceof TileLayer ? foundLayer : undefined;
  const wmsSource = wmsLayer?.getSource();
  if (!wmsLayer || !(wmsSource instanceof TileWMS)) {
    console.warn(`未找到名为 ${layerName} 的图层`);
    return () => {};
  }

  const state = getWfsState(olMap);
  const abortController = new AbortController();
  state.abortControllers.push(abortController);

  // 点击事件处理器
  const clickHandler = async (event: WfsMapBrowserEvent) => {
    const view = event.map.getView();
    const resolution = view.getResolution();

    if (!wmsLayer.getVisible()) return;
    if (resolution === undefined) return;

    const url = wmsSource.getFeatureInfoUrl(event.coordinate, resolution, view.getProjection(), {
      INFO_FORMAT: 'application/json',
      FEATURE_COUNT: 5,
      query_layers: layers,
      ...params,
    });

    if (url) {
      try {
        const response = await fetch(url, {
          signal: abortController.signal,
        });
        const data = await response.json();
        if (data.features?.length > 0 && getFeatureCallbackFn) {
          getFeatureCallbackFn(data.features as GeoJSONFeature[]);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('WMS要素查询失败:', error);
        }
      }
    }
  };

  // 鼠标移动事件处理器(兼容 OpenLayers 6-10)
  const pointerMoveHandler = (evt: WfsMapBrowserEvent) => {
    if (evt.dragging) return;

    let isHovering = false;

    // getData 方法在 OL 6.15.0+ 才支持,需要兼容旧版本
    const layerWithData = wmsLayer as unknown as { getData?: (pixel: Pixel) => Uint8ClampedArray | null };
    if (typeof layerWithData.getData === 'function') {
      const pixelData = layerWithData.getData(evt.pixel);
      isHovering = !!pixelData && pixelData[3] > 0;
    } else {
      // 旧版本:使用 forEachLayerAtPixel 作为近似方案(该方法在 ol 9 已移除,仅旧版本运行时会走到这里)
      const mapWithForEach = evt.map as unknown as {
        forEachLayerAtPixel?: (pixel: Pixel, callback: (layer: BaseLayer) => boolean | undefined) => void;
      };
      try {
        mapWithForEach.forEachLayerAtPixel?.(evt.pixel, (layer) => {
          if (layer === wmsLayer) {
            isHovering = true;
            return true; // 停止遍历
          }
          return undefined;
        });
      } catch {
        // 某些浏览器可能不支持 forEachLayerAtPixel(跨域限制)
        isHovering = false;
      }
    }

    const targetElement = evt.map.getTargetElement();
    if (targetElement) {
      targetElement.style.cursor = isHovering ? 'pointer' : '';
    }
  };

  // 注册事件
  registerHandler(olMap, 'singleclick', clickHandler);
  registerHandler(olMap, 'pointermove', pointerMoveHandler);

  // 返回清理函数
  return function cleanup(): void {
    abortController.abort();
    olMap.un('singleclick', clickHandler);
    olMap.un('pointermove', pointerMoveHandler);

    // 从状态中移除
    const idx = state.abortControllers.indexOf(abortController);
    if (idx > -1) {
      state.abortControllers.splice(idx, 1);
    }
    state.handlers = state.handlers.filter((h) => h.handler !== clickHandler && h.handler !== pointerMoveHandler);
  };
}

/**
 * 更新WFS图层的过滤条件(CQL_FILTER)并刷新数据
 *
 * @param olMap - 目标地图实例
 * @param wfsOptions - 配置项
 */
export function updateWfsFilter(olMap: Map, wfsOptions: UpdateWfsFilterOptions): void {
  const { layerName = '', filter = [] } = wfsOptions;
  const foundLayer = getLayerByName(olMap, layerName);

  // 仅处理Vector源的矢量图层,未找到或类型不匹配时按未找到处理
  const source = foundLayer instanceof VectorLayer ? foundLayer.getSource() : null;
  if (!source) {
    console.warn(`未找到名为 ${layerName} 的图层`);
    return;
  }

  // getUrl 可能返回字符串或 URL 构造函数,兼容两种形态
  const rawUrl = source.getUrl();
  const currentUrl = typeof rawUrl === 'function' ? (rawUrl as () => string)() : rawUrl;

  if (!currentUrl) return;

  try {
    const urlObj = new URL(currentUrl);
    const params = new URLSearchParams(urlObj.search);

    if (filter.length > 0) {
      params.set('cql_filter', filter.join(' and '));
    } else {
      params.delete('cql_filter');
    }

    urlObj.search = params.toString();
    source.setUrl(urlObj.toString());
    source.refresh();
  } catch (error) {
    console.error('更新WFS过滤器失败:', error);
  }
}

/**
 * 清理指定地图的所有WFS相关事件和请求
 *
 * @param olMap - 地图实例
 */
export function clearWfsEvents(olMap: Map): void {
  if (!olMap) return;

  const state = wfsEventMap.get(olMap);
  if (!state) return;

  // 取消所有进行中的请求
  state.abortControllers.forEach((controller) => controller.abort());
  state.abortControllers = [];

  // 移除所有事件监听
  state.handlers.forEach(({ eventType, handler }) => {
    olMap.un(eventType, handler);
  });
  state.handlers = [];
}
