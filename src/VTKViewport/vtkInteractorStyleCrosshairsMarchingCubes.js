import macro from 'vtk.js/Sources/macro';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import Constants from 'vtk.js/Sources/Rendering/Core/InteractorStyle/Constants';
import vtkPlaneManipulator from 'vtk.js/Sources/Widgets/Manipulators/PlaneManipulator';
import vtkCoordinate from 'vtk.js/Sources/Rendering/Core/Coordinate';

const { States } = Constants;

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// vtkInteractorStyleCrosshairsMarchingCubes methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleCrosshairsMarchingCubes(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleCrosshairsMarchingCubes');
  model.planeManipulator = vtkPlaneManipulator.newInstance();

  publicAPI.resetCrosshairs = () => {
    const { apis, apiIndex } = model;
    const api = apis[apiIndex];

    api.svgWidgets.crosshairsWidget.moveCrosshairs(
      publicAPI.getCenter(),
      apis,
      apiIndex
    );

    publicAPI.invokeInteractionEvent({ type: 'InteractionEvent' });
  };

  publicAPI.moveCrosshairs = callData => {
    const { apis, apiIndex } = model;
    const api = apis[apiIndex];

    const pos = callData.position;
    const renderer = callData.pokedRenderer;

    const dPos = vtkCoordinate.newInstance();
    dPos.setCoordinateSystemToDisplay();

    dPos.setValue(pos.x, pos.y, 0);
    const worldCoords = dPos.getComputedWorldValue(renderer);

    api.svgWidgets.crosshairsWidget.moveCrosshairs(worldCoords, apis, apiIndex);

    publicAPI.invokeInteractionEvent({ type: 'InteractionEvent' });
  };

  const superHandleMouseMove = publicAPI.handleMouseMove;
  publicAPI.handleMouseMove = callData => {
    if (model.state === States.IS_WINDOW_LEVEL) {
      publicAPI.moveCrosshairs(callData);
    } else if (superHandleMouseMove) {
      superHandleMouseMove(callData);
    }
  };

  const superHandleLeftButtonPress = publicAPI.handleLeftButtonPress;
  publicAPI.handleLeftButtonPress = callData => {
    if (!callData.shiftKey && !callData.controlKey) {
      if (model.actor) {
        publicAPI.moveCrosshairs(callData);
        publicAPI.startWindowLevel();
      }
    } else if (superHandleLeftButtonPress) {
      superHandleLeftButtonPress(callData);
    }
  };

  publicAPI.handleRightButtonPress = callData => {
    superHandleLeftButtonPress(callData);
  };

  const superHandleLeftButtonRelease = publicAPI.handleLeftButtonRelease;
  publicAPI.handleRightButtonRelease = callData => {
    superHandleLeftButtonRelease(callData);
  };

  publicAPI.superHandleLeftButtonRelease = publicAPI.handleLeftButtonRelease;
  publicAPI.handleLeftButtonRelease = () => {
    switch (model.state) {
      case States.IS_WINDOW_LEVEL:
        publicAPI.endWindowLevel();
        break;

      default:
        publicAPI.superHandleLeftButtonRelease();
        break;
    }
  };

  // Slice normal is just camera DOP
  publicAPI.getSliceNormal = () => {
    if (model.actor && model.interactor) {
      const renderer = model.interactor.getCurrentRenderer();
      const camera = renderer.getActiveCamera();
      return camera.getDirectionOfProjection();
    }
    return [0, 0, 0];
  };

  publicAPI.setActor = actor => {
    model.actor = actor;
    const renderer = model.interactor.getCurrentRenderer();
    const camera = renderer.getActiveCamera();
    if (actor) {
      // prevent zoom manipulator from messing with our focal point
      camera.setFreezeFocalPoint(true);
    } else {
      camera.setFreezeFocalPoint(false);
    }
  };

  publicAPI.getCemter = () => {
    // Get viewport and get its center.
    const renderer = model.interactor.getCurrentRenderer();
    const view = renderer.getRenderWindow().getViews()[0];
    const dims = view.getViewportSize(renderer);
    const dPos = vtkCoordinate.newInstance();

    dPos.setCoordinateSystemToDisplay();

    dPos.setValue(0.5 * dims[0], 0.5 * dims[1], 0);
    return dPos.getComputedWorldValue(renderer);
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
  vtkInteractorStyleTrackballCamera.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, ['callback', 'apis', 'apiIndex', 'actor']);

  // Object specific methods
  vtkInteractorStyleCrosshairsMarchingCubes(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyleCrosshairsMarchingCubes'
);

// ----------------------------------------------------------------------------

export default Object.assign({ newInstance, extend });
