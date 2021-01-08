import macro from 'vtk.js/Sources/macro';
import Constants from 'vtk.js/Sources/Rendering/Core/InteractorStyle/Constants';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';

const { States } = Constants;

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// vtkInteractorStyleImagePanZoom methods
// Left Mouse: Zoom
// Right Mouse or Left Mouse + shift or Left Mouse + control: Pan
// Mouse Wheel: Slices scroll
// Multi-Touch Pinch: Zoom
// Multi-Touch Pan: Pan
// ----------------------------------------------------------------------------

function vtkInteractorStyleImagePanZoom(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleImagePanZoom');

  publicAPI.superStartPan = publicAPI.startPan;
  publicAPI.startPan = () => {
    const { apis, apiIndex } = model;
    const api = apis[apiIndex];
    api.setFreezeSlice(true);
    publicAPI.superStartPan();
  };

  publicAPI.superEndPan = publicAPI.endPan;
  publicAPI.endPan = () => {
    const { apis, apiIndex } = model;
    const api = apis[apiIndex];
    api.setFreezeSlice(false);
    publicAPI.superEndPan();
  };

  publicAPI.handleLeftButtonPress = callData => {
    if (callData.shiftKey || callData.controlKey) {
      model.previousTranslation = callData.translation;
      publicAPI.startPan();
    } else {
      model.previousPosition = callData.position;
      publicAPI.startDolly();
    }
  };

  publicAPI.handleLeftButtonRelease = callData => {
    switch (model.state) {
      case States.IS_PAN:
        publicAPI.endPan();
        break;

      default:
        publicAPI.endDolly();
        break;
    }
  };

  publicAPI.handleRightButtonPress = callData => {
    model.previousTranslation = callData.translation;
    publicAPI.startPan();
  };

  publicAPI.handleRightButtonRelease = callData => {
    publicAPI.endPan();
  };

  publicAPI.handleStartMouseWheel = callData => {
    publicAPI.startSlice();
    publicAPI.handleMouseWheel(callData);
  };

  publicAPI.handleEndMouseWheel = () => {
    publicAPI.endSlice();
  };

  publicAPI.handleMouseWheel = callData => {
    const camera = callData.pokedRenderer.getActiveCamera();

    let distance = camera.getDistance();
    distance += callData.spinY;

    // clamp the distance to the clipping range
    const range = camera.getClippingRange();
    if (distance < range[0]) {
      distance = range[0];
    }
    if (distance > range[1]) {
      distance = range[1];
    }
    camera.setDistance(distance);
  };

  // do nothing on keypresses
  publicAPI.handleKeyPress = event => {};

  publicAPI.handleKeyDown = event => {};

  publicAPI.handleKeyUp = event => {};
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  vtkInteractorStyleTrackballCamera.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, ['apis', 'apiIndex']);

  // Object specific methods
  vtkInteractorStyleImagePanZoom(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyleImagePanZoom'
);

// ----------------------------------------------------------------------------

export default Object.assign({ newInstance, extend });
