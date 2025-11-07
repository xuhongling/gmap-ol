/*
 * @Author: xuhongling
 * @Date:   2022-08-21 17:18:46
 * @Last Modified by:   xuhongling
 * @Last Modified time: 2025-11-07 10:10:18
 */
import Overlay from 'ol/Overlay';

/**
 * 为地图添加弹出层(Overlay)组件，包含关闭按钮和内容容器
 *
 * @param {import("ol/Map").default} olMap - 目标地图实例
 * @returns {void}
 */
export function addOverlayPopup(olMap) {
  // 地图实例不存在时直接终止执行，避免无效操作
  if (!olMap) return;

  // 创建弹出层DOM元素
  const popupContainer = document.createElement('div'); // 弹出层容器
  const popupCloser = document.createElement('div'); // 关闭按钮
  const popupContent = document.createElement('ul'); // 内容容器

  // 设置元素样式类名
  popupContainer.className = 'ol-popup';
  popupCloser.className = 'ol-popup-closer';

  // 组装弹出层结构
  popupContainer.appendChild(popupCloser);
  popupContainer.appendChild(popupContent);

  // 创建OpenLayers弹出层实例
  const overlay = new Overlay({
    id: 'Overlay', // 弹出层唯一标识
    element: popupContainer, // 关联DOM元素
    autoPan: true, // 自动平移地图以确保弹出层可见
    positioning: 'bottom-center', // 弹出层相对于坐标的定位方式
    stopEvent: true, // 阻止事件冒泡到地图
    autoPanAnimation: {
      duration: 250, // 自动平移动画时长(毫秒)
    },
  });

  // 绑定关闭按钮事件
  popupCloser.addEventListener('click', (event) => {
    event.stopPropagation(); // 阻止事件冒泡
    overlay.setPosition(undefined); // 清除弹出层位置（隐藏）
    popupContainer.blur(); // 移除焦点
    olMap.removeOverlay(olMap.getOverlayById('Overlay')); // 从地图移除弹出层
  }, false);

  // 将弹出层添加到地图
  olMap.addOverlay(overlay);
}
