import macro from 'vtk.js/Sources/macro';
import vtkInteractorStyleSlice from './vtkInteractorStyleSlice.js';
import Constants from 'vtk.js/Sources/Rendering/Core/InteractorStyle/Constants';
import vtkCoordinate from 'vtk.js/Sources/Rendering/Core/Coordinate';
import vtkPlaneManipulator from 'vtk.js/Sources/Widgets/Manipulators/PlaneManipulator';

const { States } = Constants;

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// vtkInteractorStyleMPRCrosshairs methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleCrosshairsImageMapper(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleCrosshairsImageMapper');
  model.planeManipulator = vtkPlaneManipulator.newInstance();

  function moveCrosshairs(callData) {
    const { apis, apiIndex } = model;
    const api = apis[apiIndex];

    const camera = api.genericRenderWindow.getRenderer().getActiveCamera();
    model.planeManipulator.setNormal(camera.getViewPlaneNormal());
    model.planeManipulator.setOrigin([0, 0, 0]);
    const worldCoords = model.planeManipulator.handleEvent(
      callData,
      api.genericRenderWindow.getOpenGLRenderWindow()
    );

    const imageActor = publicAPI.getVolumeActor();
    let index = [];
    imageActor
      .getMapper()
      .getInputData()
      .worldToIndex(worldCoords, index);

    api.svgWidgets.crosshairsWidget.moveCrosshairs(worldCoords, apis, apiIndex);

    publicAPI.invokeInteractionEvent({ type: 'InteractionEvent' });
  }

  const superHandleMouseMove = publicAPI.handleMouseMove;
  publicAPI.handleMouseMove = callData => {
    if (model.state === States.IS_PAN) {
      moveCrosshairs(callData);
    } else if (superHandleMouseMove) {
      superHandleMouseMove(callData);
    }
  };

  const superHandleLeftButtonPress = publicAPI.handleLeftButtonPress;
  publicAPI.handleLeftButtonPress = callData => {
    if (!callData.shiftKey && !callData.controlKey) {
      if (model.volumeActor) {
        moveCrosshairs(callData);
        publicAPI.startPan();
      }
    } else if (superHandleLeftButtonPress) {
      superHandleLeftButtonPress(callData);
    }
  };

  publicAPI.superHandleLeftButtonRelease = publicAPI.handleLeftButtonRelease;
  publicAPI.handleLeftButtonRelease = () => {
    switch (model.state) {
      case States.IS_PAN:
        publicAPI.endPan();
        break;

      default:
        publicAPI.superHandleLeftButtonRelease();
        break;
    }
  };

  publicAPI.superHandleMouseWheel = publicAPI.handleMouseWheel;
  publicAPI.handleMouseWheel = callData => {
    publicAPI.superHandleMouseWheel(callData);

    const { apis, apiIndex } = model;
    if (apis && apis[apiIndex] && apis[apiIndex].type === 'VIEW2D') {
      const api = apis[apiIndex];
      if (!api.svgWidgets.crosshairsWidget) {
        // If we aren't using the crosshairs widget, bail out early.
        return;
      }

      const renderer = api.genericRenderWindow.getRenderer();
      let cachedCrosshairWorldPosition = api.get(
        'cachedCrosshairWorldPosition'
      );

      if (cachedCrosshairWorldPosition === undefined) {
        // Crosshairs not initilised.
        return;
      }

      const wPos = vtkCoordinate.newInstance();
      wPos.setCoordinateSystemToWorld();
      wPos.setValue(...cachedCrosshairWorldPosition);

      const doubleDisplayPosition = wPos.getComputedDoubleDisplayValue(
        renderer
      );

      const dPos = vtkCoordinate.newInstance();
      dPos.setCoordinateSystemToDisplay();

      dPos.setValue(doubleDisplayPosition[0], doubleDisplayPosition[1], 0);
      let worldPos = dPos.getComputedWorldValue(renderer);
      api.svgWidgets.crosshairsWidget.moveCrosshairs(worldPos, apis, apiIndex);
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
  vtkInteractorStyleSlice.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, ['callback', 'apis', 'apiIndex']);

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
