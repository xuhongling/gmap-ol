import type Map from 'ol/Map';
import Overlay from 'ol/Overlay';
import type { Positioning } from 'ol/Overlay';
import type { FeatureProperties, PickPopoverOptions, TextFieldName } from '../types';
import { isPlainObject } from '../utils/clone';

/**
 * 判断值是否为有效显示文本(排除 null、undefined、空字符串、纯空白)
 * @param value - 待判断的值
 * @returns 是否有效
 */
function isValidDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/**
 * 从要素中提取显示文本
 * @param feature - 要素数据
 * @param textFieldName - 显示字段配置
 * @returns 提取到的显示文本,无效时返回 null
 */
function extractDisplayText(feature: FeatureProperties, textFieldName: TextFieldName): string | null {
  // 1. 如果是函数,直接调用
  if (typeof textFieldName === 'function') {
    const result = textFieldName(feature);
    return isValidDisplayValue(result) ? String(result) : null;
  }

  // 2. 解析字段列表(支持逗号分隔字符串或字符串数组)
  let fields: string[] = [];
  if (typeof textFieldName === 'string') {
    fields = textFieldName
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);
  } else if (Array.isArray(textFieldName)) {
    fields = textFieldName;
  }

  // 3. 按优先级匹配第一个有效字段
  for (const field of fields) {
    if (isValidDisplayValue(feature[field])) {
      return String(feature[field]);
    }
  }

  return null;
}

/**
 * 从要素数据中提取坐标
 * 提取优先级:LGTD/LTTD > lgtd/lttd > geometry.getCoordinates() > geometry 为坐标数组
 * @param feature - 要素数据
 * @returns 坐标对,无法提取时返回 null
 */
function getFeatureCoordinates(feature: FeatureProperties): [unknown, unknown] | null {
  if (!feature) return null;

  if (feature.LGTD && feature.LTTD) {
    return [feature.LGTD, feature.LTTD];
  }
  if (feature.lgtd && feature.lttd) {
    return [feature.lgtd, feature.lttd];
  }
  if (typeof feature.geometry?.getCoordinates === 'function') {
    return feature.geometry.getCoordinates();
  }
  if (Array.isArray(feature.geometry)) {
    return feature.geometry as [unknown, unknown];
  }

  return null;
}

/**
 * 设置弹出层内容
 *
 * 安全修复(相对旧版):旧版把要素数据 JSON.stringify 后塞进 `<p hidden>` 再 innerText 解析,
 * 特殊字符会破坏 JSON 且存在 XSS 注入面;新版列表项仅通过 data-index 记录索引,
 * 要素数据保存在闭包数组中,点选时按索引取回(DOM 类名结构不变)。
 */
function setPopupContent(
  overlay: Overlay,
  contentList: HTMLUListElement,
  features: FeatureProperties[],
  textFieldName: TextFieldName,
  fallbackText: PickPopoverOptions['fallbackText'],
  callback: ((selectedFeature: FeatureProperties) => void) | undefined,
  olMap: Map
): void {
  if (!features || features.length === 0) return;

  // 清空现有内容
  contentList.innerHTML = '';

  // 清理属性(移除geometry)后按索引缓存,供点选回调使用
  const featurePropsList: FeatureProperties[] = [];

  features.forEach((feature, index) => {
    // 提取显示文本
    let displayText = extractDisplayText(feature, textFieldName);

    // 无有效字段时,使用回退文本
    if (!displayText) {
      if (typeof fallbackText === 'function') {
        displayText = fallbackText(feature, index);
      } else if (typeof fallbackText === 'string' && fallbackText.trim()) {
        displayText = fallbackText.replace(/\{index\}/g, String(index + 1));
      }
    }

    const featureProps: FeatureProperties = { ...feature };
    if (featureProps.geometry) {
      Reflect.deleteProperty(featureProps, 'geometry');
    }
    featurePropsList.push(featureProps);

    const listItem = document.createElement('li');
    listItem.dataset.index = String(index);
    const textElement = document.createElement('span');
    textElement.textContent = displayText || `项目 ${index + 1}`;
    listItem.appendChild(textElement);
    contentList.appendChild(listItem);
  });

  // 设置位置(基于第一个要素坐标)
  const coordinates = getFeatureCoordinates(features[0]);
  if (coordinates) {
    overlay.setPosition([Number(coordinates[0]), Number(coordinates[1])]);
  }

  // 事件委托
  contentList.addEventListener(
    'click',
    (event) => {
      event.stopPropagation();
      const target = event.target;
      const listItem = target instanceof Element ? target.closest('li') : null;
      if (!listItem) return;
      const selectedData = featurePropsList[Number(listItem.dataset.index)];
      if (!selectedData) return;
      overlay.setPosition(undefined);
      olMap.removeOverlay(overlay);
      callback?.(selectedData);
    },
    false
  );
}

/**
 * 创建要素选择弹出层(Overlay),展示拾取到的要素列表供用户选择
 *
 * @param olMap - 地图实例
 * @param pickOptions - 弹出层配置项
 * @param overlayCallbackFn - 选择要素后的回调函数(参数为去掉 geometry 属性的要素数据;仅 1 条数据时不弹层直接回调原始数据)
 */
export function pickFeaturesPopover(
  olMap: Map,
  pickOptions: PickPopoverOptions,
  overlayCallbackFn?: (selectedFeature: FeatureProperties) => void
): void {
  if (!olMap) return;

  const {
    data: pickFeaturesData,
    textFieldName = '',
    fallbackText = '',
    title = '请选择',
    overlayId = 'PickStationOverlay',
    positioning = 'bottom-center',
    autoPan = true,
  } = pickOptions ?? ({} as PickPopoverOptions);

  const isSingleObject = isPlainObject(pickFeaturesData);

  // 标准化数据为数组
  const features: FeatureProperties[] = Array.isArray(pickFeaturesData) ? pickFeaturesData : isSingleObject ? [pickFeaturesData] : [];

  if (features.length === 0) return;

  // 单条数据直接回调
  if (features.length === 1) {
    overlayCallbackFn?.(features[0]);
    return;
  }

  // 移除已存在的同ID弹出层
  const existingOverlay = olMap.getOverlayById(overlayId);
  if (existingOverlay) {
    olMap.removeOverlay(existingOverlay);
  }

  // 创建DOM
  const overlayContainer = document.createElement('div');
  const closeButton = document.createElement('div');
  const titleElement = document.createElement('h3');
  const contentList = document.createElement('ul');

  overlayContainer.className = 'gmap-popover gmap-pick-list';
  titleElement.className = 'gmap-title-header';
  closeButton.className = 'ol-popup-closer';
  contentList.className = 'gmap-popover-content';
  titleElement.innerText = title;

  overlayContainer.appendChild(closeButton);
  overlayContainer.appendChild(titleElement);
  overlayContainer.appendChild(contentList);

  // 创建弹出层(ol 9 已无 autoPanAnimation 选项,动画时长通过 autoPan.animation 配置)
  const overlay = new Overlay({
    id: overlayId,
    element: overlayContainer,
    positioning: positioning as Positioning,
    stopEvent: true,
    autoPan: autoPan ? { animation: { duration: 250 } } : false,
  });

  // 关闭按钮
  closeButton.addEventListener(
    'click',
    (event) => {
      event.stopPropagation();
      overlay.setPosition(undefined);
      olMap.removeOverlay(overlay);
    },
    false
  );

  olMap.addOverlay(overlay);

  // 设置内容
  setPopupContent(overlay, contentList, features, textFieldName, fallbackText, overlayCallbackFn, olMap);
}
