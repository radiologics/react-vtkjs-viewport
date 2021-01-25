import macro from 'vtk.js/Sources/macro';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkCoordinate from 'vtk.js/Sources/Rendering/Core/Coordinate';
import VTKAxis from './VTKAxis';
import Constants from 'vtk.js/Sources/Rendering/Core/InteractorStyle/Constants';
const { States } = Constants;

function vtkInteractorStyle2DCrosshairs(publicAPI, model) {
  //Set classname
  model.classHierarchy.push('vtkInteractorStyle2DCrosshairs');

  //get copy of default publicAPI
  const superAPI = Object.assign({}, publicAPI);

  //class to keep track of crosshairs
  const crosshairs = new VTKAxis(0, 0, 0, 0);
  publicAPI.setCrosshairs(crosshairs);

  publicAPI.moveCrosshairs = callData => {
    const api = model.apis[model.apiIndex];

    const mousePos = callData.position;

    //get in world position from on screen position
    const coords = vtkCoordinate.newInstance();
    coords.setCoordinateSystemToDisplay();
    coords.setValue(mousePos.x, mousePos.y, mousePos.z);

    const worldPos = coords.getComputedWorldValue(
      api.genericRenderWindow.getRenderer()
    );

    //set position to be on the same plane as the slice that was clicked on
    const mapper = publicAPI.getImageActor().getMapper();
    const slicingMode = mapper.getSlicingMode();
    worldPos[slicingMode] = mapper.getBoundsForSlice(mapper.getSlice())[
      slicingMode * 2
    ];

    //update crosshairs for each crosshair interactor
    model.apis.forEach((api, i) => {
      const istyle = api.genericRenderWindow
        .getRenderWindow()
        .getInteractor()
        .getInteractorStyle();

      istyle.updateCrosshairs(worldPos);
    });
  };

  publicAPI.updateCrosshairs = worldPos => {
    const pos = [...worldPos];

    const api = publicAPI.getApis()[publicAPI.getApiIndex()];

    //set the slice being viewed to the slice that was clicked on
    const mapper = publicAPI.getImageActor().getMapper();
    const slice = mapper.getSliceAtPosition(pos);
    mapper.setSlice(slice);

    //make sure crosshairs are in front of slice
    const slicingMode = mapper.getSlicingMode();
    pos[slicingMode] += 1;

    //set crosshairs to new position and re-render
    publicAPI.getCrosshairs().setPoint(...pos);

    api.genericRenderWindow.getRenderWindow().render();
  };

  publicAPI.setImageActor = actor => {
    //actually set image actor
    superAPI.setImageActor(actor);

    const renderer = model.interactor.getCurrentRenderer();

    //find the size the crosshairs should be
    const bounds = actor.getBounds();
    const width =
      Math.max(
        Math.abs(bounds[1] - bounds[0]),
        Math.abs(bounds[3] - bounds[2]),
        Math.abs(bounds[5] - bounds[4])
      ) * 2;

    //get the default position the crosshairs should be at
    const pos = actor.getCenter();

    //ensure that the crosshairs are in front of the imageSlice
    const mapper = actor.getMapper();
    const slicingMode = mapper.getSlicingMode();
    pos[slicingMode] += 1;

    //set crosshair values
    const crosshairs = publicAPI.getCrosshairs();
    crosshairs.actors.forEach(renderer.addActor);
    crosshairs.setWidth(width);
    crosshairs.setPoint(...pos);
  };

  publicAPI.handleLeftButtonPress = callData => {
    //allow user to use normal controls other than just pressing the left mouse button, which controls the crosshairs
    if (callData.shiftKey || callData.altKey || callData.controlKey) {
      superAPI.handleLeftButtonPress(callData);
    } else {
      publicAPI.moveCrosshairs(callData);
      model.movingCrosshairs = true;
    }
  };

  publicAPI.handleLeftButtonRelease = callData => {
    //on release, stop moving the crosshairs with the cursor
    model.movingCrosshairs = false;

    superAPI.handleLeftButtonRelease(callData);
  };

  publicAPI.handleRightButtonPress = callData => {
    // zoom
    model.previousPosition = callData.position;
    publicAPI.startDolly();
  };

  publicAPI.handleRightButtonRelease = callData => {
    switch (model.state) {
      case States.IS_PAN:
        publicAPI.endPan();
        break;

      default:
        publicAPI.endDolly();
        break;
    }
  };

  publicAPI.handleMouseMove = callData => {
    //when crosshairs aren't being moved, do what would normally be done on mouse move
    if (
      !(callData.shiftKey || callData.altKey || callData.controlKey) &&
      model.movingCrosshairs
    ) {
      publicAPI.moveCrosshairs(callData);
    } else {
      superAPI.handleMouseMove(callData);
    }
  };

  publicAPI.handleMouseWheel = callData => {
    const mapper = publicAPI.getImageActor().getMapper();
    const slice = mapper.getSlice() + callData.spinY;

    mapper.setSlice(slice);

    //get current position of crosshairs
    const worldPos = [
      publicAPI.getCrosshairs().x,
      publicAPI.getCrosshairs().y,
      publicAPI.getCrosshairs().z,
    ];

    //alter the position based on how much the mouse wheel has moved in the dimension the slice is being sliced
    const slicingMode = mapper.getSlicingMode();
    worldPos[slicingMode] = mapper.getBoundsForSlice(mapper.getSlice())[
      slicingMode * 2
    ];

    //move the crosshairs to the new position
    model.apis.forEach((api, i) => {
      const istyle = api.genericRenderWindow
        .getRenderWindow()
        .getInteractor()
        .getInteractorStyle();

      istyle.updateCrosshairs(worldPos);
    });
  };

  publicAPI.handleStartMouseWheel = () => {};
  publicAPI.handleEndMouseWheel = () => {};

  publicAPI.toggleCrosshairs = () => {
    const crosshairs = publicAPI.getCrosshairs();
    const renderer = model.interactor.getCurrentRenderer();

    crosshairs.actors.forEach((actor, i) => {
      if (renderer.getActors().includes(actor)) {
        renderer.removeActor(actor);
      } else {
        renderer.addActor(actor);
      }
    });

    renderer.getRenderWindow().render();
  };
}

//Class defaults
const DEFAULT_VALUES = {};

export function extend(publicAPI, model, initialValues = {}) {
  //combine all default values, initial values, and model into one object
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtkInteractorStyleTrackballCamera.extend(publicAPI, model, initialValues);

  //assign variables that can be set and gotten
  macro.setGet(publicAPI, model, [
    'apis',
    'apiIndex',
    'crosshairs',
    'imageActor',
    'actors',
  ]);

  //add function
  vtkInteractorStyle2DCrosshairs(publicAPI, model);
}

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyle2DCrosshairs'
);

export default { newInstance, extend };
