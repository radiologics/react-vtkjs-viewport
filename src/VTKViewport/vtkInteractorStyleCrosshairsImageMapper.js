import macro from 'vtk.js/Sources/macro';
import vtkInteractorStyleImage from 'vtk.js/Sources/Interaction/Style/InteractorStyleImage';
import Constants from 'vtk.js/Sources/Rendering/Core/InteractorStyle/Constants';
import vtkPlaneManipulator from 'vtk.js/Sources/Widgets/Manipulators/PlaneManipulator';
import vtkBoundingBox from 'vtk.js/Sources/Common/DataModel/BoundingBox';
import vtkCoordinate from 'vtk.js/Sources/Rendering/Core/Coordinate';

const { States } = Constants;

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// vtkInteractorStyleCrosshairsImageMapper methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleCrosshairsImageMapper(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleCrosshairsImageMapper');
  model.planeManipulator = vtkPlaneManipulator.newInstance();

  publicAPI.resetCrosshairs = () => {
    const { apis, apiIndex } = model;
    const api = apis[apiIndex];

    api.svgWidgets.crosshairsWidget.moveCrosshairs(
      publicAPI.getSliceCenter(),
      apis,
      apiIndex
    );

    publicAPI.invokeInteractionEvent({ type: 'InteractionEvent' });
  };

  publicAPI.moveCrosshairs = callData => {
    const { apis, apiIndex } = model;
    const api = apis[apiIndex];

    model.planeManipulator.setNormal(publicAPI.getSliceNormal());
    model.planeManipulator.setOrigin(publicAPI.getSliceCenter());
    const worldCoords = model.planeManipulator.handleEvent(
      callData,
      api.genericRenderWindow.getOpenGLRenderWindow()
    );

    api.svgWidgets.crosshairsWidget.moveCrosshairs(worldCoords, apis, apiIndex);

    publicAPI.invokeInteractionEvent({ type: 'InteractionEvent' });
  };

  publicAPI.updateCrosshairsAfterScroll = () => {
    const { apis, apiIndex } = model;
    const api = apis[apiIndex];

    const renderer = api.genericRenderWindow.getRenderer();
    const camera = renderer.getActiveCamera();
    api.actors.forEach(actor => {
      actor.getMapper().setSliceFromCamera(camera);
    });

    let worldCoords = api.get('cachedCrosshairWorldPosition');
    // we want to reuse the cached coords, replacing for our new slice (set by camera)
    const idx = publicAPI
      .getSliceNormal()
      .findIndex(i => Math.abs(Math.round(i)) == 1);
    worldCoords[idx] = camera.getFocalPoint()[idx];
    api.svgWidgets.crosshairsWidget.moveCrosshairs(worldCoords, apis, apiIndex);

    publicAPI.invokeInteractionEvent({ type: 'InteractionEvent' });
  };

  const superHandleMouseMove = publicAPI.handleMouseMove;
  publicAPI.handleMouseMove = callData => {
    if (model.state === States.IS_ROTATE) {
      publicAPI.moveCrosshairs(callData);
    } else if (superHandleMouseMove) {
      superHandleMouseMove(callData);
    }
  };

  const superHandleLeftButtonPress = publicAPI.handleLeftButtonPress;
  publicAPI.handleLeftButtonPress = callData => {
    if (model.imageActor && !callData.shiftKey && !callData.controlKey) {
      publicAPI.moveCrosshairs(callData);
      publicAPI.startRotate();
    } else if (superHandleLeftButtonPress) {
      superHandleLeftButtonPress(callData);
    }
  };

  publicAPI.superHandleLeftButtonRelease = publicAPI.handleLeftButtonRelease;
  publicAPI.handleLeftButtonRelease = () => {
    switch (model.state) {
      case States.IS_ROTATE:
        publicAPI.endRotate();
        break;

      default:
        publicAPI.superHandleLeftButtonRelease();
        break;
    }
  };

  publicAPI.superHandleMouseWheel = publicAPI.handleMouseWheel;
  publicAPI.handleMouseWheel = callData => {
    publicAPI.superHandleMouseWheel(callData);
    publicAPI.updateCrosshairsAfterScroll();
  };

  publicAPI.getSliceNormal = () => {
    const renderer = model.interactor.getCurrentRenderer();
    const camera = renderer.getActiveCamera();
    return camera.getDirectionOfProjection();
  };

  publicAPI.getSliceCenter = () => {
    //set to center of current slice
    return vtkBoundingBox.getCenter(model.imageActor.getBoundsForSlice());
  };

  publicAPI.setImageActor = actor => {
    model.imageActor = actor;
    const renderer = model.interactor.getCurrentRenderer();
    const camera = renderer.getActiveCamera();
    if (actor) {
      // prevent zoom manipulator from messing with our focal point
      camera.setFreezeFocalPoint(true);
    } else {
      camera.setFreezeFocalPoint(false);
    }
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  vtkInteractorStyleImage.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, [
    'callback',
    'apis',
    'apiIndex',
    'imageActor',
  ]);

  // Object specific methods
  vtkInteractorStyleCrosshairsImageMapper(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyleCrosshairsImageMapper'
);

// ----------------------------------------------------------------------------

export default Object.assign({ newInstance, extend });
