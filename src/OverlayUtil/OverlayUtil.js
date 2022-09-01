/*
 * @Author: xuhongling
 * @Date:   2022-08-21 17:18:46
 * @Last Modified by:   xuhongling
 * @Last Modified time: 2022-08-22 11:06:10
 */
import Overlay from 'ol/Overlay';

export function addOverlayPopup(olMap) {
  const overlayContainer_ = document.createElement('div');
  const overlayContainerCloser_ = document.createElement('div');
  const overlayContainerContent_ = document.createElement('ul');
  overlayContainer_.className = 'ol-popup';
  overlayContainerCloser_.className = 'ol-popup-closer';
  overlayContainer_.appendChild(overlayContainerCloser_);
  overlayContainer_.appendChild(overlayContainerContent_);

  if (olMap === null) return;

  let overlay = new Overlay({
    id: 'Overlay',
    element: overlayContainer_,
    autoPan: true,
    positioning: 'bottom-center',
    stopEvent: true,
    autoPanAnimation: {
      duration: 250,
    },
  });
  overlayContainerCloser_.addEventListener(
    'click',
    (event) => {
      event.stopPropagation();
      overlay.setPosition(undefined);
      overlayContainer_.blur();
      olMap.removeOverlay(olMap.getOverlayById('Overlay'));
    },
    false
  );
  olMap.addOverlay(overlay);
}
