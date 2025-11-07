/*
 * @Author: xuhongling
 * @Date:   2022-08-21 17:18:46
 * @Last Modified by:   xuhongling
 * @Last Modified time: 2025-11-07 10:25:31
 */
import Overlay from 'ol/Overlay';

/**
 * 创建要素选择弹出层（Overlay），展示拾取到的要素列表供用户选择
 * @param {import("ol/Map").default} olMap - 地图实例
 * @param {Object} pickOptions - 弹出层配置项
 * @param {Object[]|Object} pickOptions.data - 拾取到的要素数据（数组或单个对象）
 * @param {string} [pickOptions.textFieldName] - 用于显示的要素属性字段名（多个用逗号分隔）
 * @param {(selectedFeature: Object) => void} overlayCallbackFn - 选择要素后的回调函数
 */
function pickFeaturesPopover(olMap, pickOptions, overlayCallbackFn) {
  if (!olMap) return; // 地图实例不存在时终止

  // 1. 创建弹出层DOM元素
  const overlayContainer = document.createElement('div');
  const closeButton = document.createElement('div');
  const titleElement = document.createElement('h3');
  const contentList = document.createElement('ul');

  // 设置元素样式类名
  overlayContainer.className = 'gmap-popover gmap-pick-list';
  titleElement.className = 'gmap-title-header';
  closeButton.className = 'ol-popup-closer';
  contentList.className = 'gmap-popover-content';
  titleElement.innerText = '请选择';

  // 组装弹出层结构
  overlayContainer.appendChild(closeButton);
  overlayContainer.appendChild(titleElement);
  overlayContainer.appendChild(contentList);

  // 2. 提取配置数据
  const { data: pickFeaturesData, textFieldName } = pickOptions;
  const isSingleObject = isPlainObject(pickFeaturesData); // 判断是否为单个对象

  // 3. 移除已存在的同ID弹出层（避免重复）
  const existingOverlay = olMap.getOverlayById('PickStationOverlay');
  if (existingOverlay) {
    overlayContainer.blur();
    olMap.removeOverlay(existingOverlay);
  }

  // 4. 若数据只有一条，直接触发回调（不显示弹出层）
  if (pickFeaturesData?.length === 1 || isSingleObject) {
    const singleData = isSingleObject ? pickFeaturesData : pickFeaturesData[0];
    return overlayCallbackFn?.(singleData);
  }

  // 5. 创建新弹出层实例
  const overlay = new Overlay({
    id: 'PickStationOverlay',
    element: overlayContainer,
    autoPan: true, // 自动平移确保弹出层可见
    positioning: 'bottom-center', // 相对于坐标的定位方式
    stopEvent: true, // 阻止事件冒泡到地图
    autoPanAnimation: {
      duration: 250, // 自动平移动画时长（毫秒）
    },
  });

  // 6. 绑定关闭按钮事件
  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    overlay.setPosition(undefined); // 隐藏弹出层
    overlayContainer.blur();
    olMap.removeOverlay(overlay); // 从地图移除
  }, false);

  // 7. 添加弹出层到地图并设置内容
  olMap.addOverlay(overlay);
  setPopupContent(
    overlay,
    contentList,
    pickFeaturesData,
    textFieldName,
    overlayCallbackFn,
    olMap
  );
}

/**
 * 判断是否为纯对象（排除数组、null等）
 * @param {*} obj - 待判断的值
 * @returns {boolean} 是否为纯对象
 */
function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

/**
 * 设置弹出层内容并绑定选择事件
 * @param {Overlay} overlay - 弹出层实例
 * @param {HTMLUListElement} contentList - 内容列表容器
 * @param {Object[]} pickFeaturesData - 要素数据数组
 * @param {string} [textFieldName] - 显示字段名（逗号分隔）
 * @param {(selectedFeature: Object) => void} callback - 选择回调
 * @param {import("ol/Map").default} olMap - 地图实例
 */
function setPopupContent(overlay, contentList, pickFeaturesData, textFieldName, callback, olMap) {
  if (!pickFeaturesData || (Array.isArray(pickFeaturesData) && pickFeaturesData.length === 0)) {
    return; // 无数据时终止
  }

  // 解析显示字段（支持多个字段，取第一个存在的字段值）
  const displayFields = textFieldName ? textFieldName.split(',') : [];

  // 生成列表项内容
  pickFeaturesData.forEach((feature, index) => {
    // 提取显示文本（优先使用配置的字段）
    let displayText = '';
    for (const field of displayFields) {
      if (feature[field] !== undefined) {
        displayText = feature[field];
        break; // 找到第一个有效字段后终止
      }
    }

    // 处理要素属性（移除geometry属性，避免冗余）
    const featureProps = { ...feature };
    if (featureProps.geometry) {
      Reflect.deleteProperty(featureProps, 'geometry');
    }

    // 创建列表项（隐藏存储完整属性，点击时提取）
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <p hidden>${JSON.stringify(featureProps)}</p>
      <span>${displayText || `要素 ${index + 1}`}</span>
    `;
    contentList.appendChild(listItem);
  });

  // 设置弹出层位置（基于第一个要素的坐标）
  const targetFeature = Array.isArray(pickFeaturesData) ? pickFeaturesData[0] : pickFeaturesData;
  const coordinates = getFeatureCoordinates(targetFeature);
  if (coordinates) {
    overlay.setPosition([Number(coordinates[0]), Number(coordinates[1])]);
  }

  // 绑定列表项点击事件（事件委托）
  contentList.addEventListener('click', (event) => {
    event.stopPropagation();
    // 找到当前点击项的隐藏属性数据
    const hiddenDataEl = event.target.closest('li')?.querySelector('p[hidden]');
    if (hiddenDataEl) {
      const selectedData = JSON.parse(hiddenDataEl.innerText);
      // 隐藏弹出层并触发回调
      overlay.setPosition(undefined);
      olMap.removeOverlay(overlay);
      callback?.(selectedData);
    }
  }, false);
}

/**
 * 从要素数据中提取坐标（支持多种坐标字段格式）
 * @param {Object} feature - 要素数据
 * @returns {number[]|null} 坐标数组 [x, y]，提取失败返回null
 */
function getFeatureCoordinates(feature) {
  if (!feature) return null;

  // 尝试从不同字段提取坐标（支持大写/小写字段名）
  if (feature.LGTD && feature.LTTD) {
    return [feature.LGTD, feature.LTTD];
  }
  if (feature.lgtd && feature.lttd) {
    return [feature.lgtd, feature.lttd];
  }
  // 从geometry对象提取坐标（适用于ol/Feature格式）
  if (feature.geometry?.getCoordinates) {
    return feature.geometry.getCoordinates();
  }
  // 直接使用geometry坐标数组（适用于简化数据）
  if (Array.isArray(feature.geometry)) {
    return feature.geometry;
  }

  return null;
}

export default pickFeaturesPopover;
