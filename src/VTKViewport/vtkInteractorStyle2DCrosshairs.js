import macro from 'vtk.js/Sources/macro';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkCoordinate from 'vtk.js/Sources/Rendering/Core/Coordinate';
import VTKAxis from './VTKAxis';

function vtkInteractorStyle2DCrosshairs(publicAPI, model) {
  //Set classname
  model.classHierarchy.push('vtkInteractorStyle2DCrosshairs');

  //get copy of default publicAPI
  const superAPI = Object.assign({}, publicAPI);

  publicAPI.moveCrosshairs = callData => {
    const api = model.apis[model.apiIndex];

    const mousePos = callData.position;

    const coords = vtkCoordinate.newInstance();
    coords.setCoordinateSystemToDisplay();
    coords.setValue(mousePos.x, mousePos.y, mousePos.z);

    const worldPos = coords.getComputedWorldValue(
      api.genericRenderWindow.getRenderer()
    );

    const mapper = api.actors[0].getMapper();
    const slicingMode = mapper.getSlicingMode();
    worldPos[slicingMode] = mapper.getBoundsForSlice(mapper.getSlice())[
      slicingMode * 2
    ];

    model.apis.forEach((api, i) => {
      const istyle = api.genericRenderWindow
        .getRenderWindow()
        .getInteractor()
        .getInteractorStyle();

      istyle.updateCrosshairs(worldPos);
    });
  };

  publicAPI.updateCrosshairs = worldPos => {
    const api = publicAPI.getApis()[publicAPI.getApiIndex()];

    const mapper = api.actors[0].getMapper();
    const slice = mapper.getSliceAtPosition(worldPos);
    mapper.setSlice(slice);

    const slicingMode = mapper.getSlicingMode();
    worldPos[slicingMode] += 1;

    publicAPI.getCrosshairs().setPoint(...worldPos);

    api.genericRenderWindow.getRenderWindow().render();
  };

  publicAPI.setImageActor = actor => {
    superAPI.setImageActor(actor);

    const renderer = model.interactor.getCurrentRenderer();

    const bounds = actor.getBounds();
    const width =
      Math.max(
        Math.abs(bounds[1] - bounds[0]),
        Math.abs(bounds[3] - bounds[2]),
        Math.abs(bounds[5] - bounds[4])
      ) * 2;

    const pos = actor.getCenter();

    const crosshairs = new VTKAxis(...pos, width);
    crosshairs.actors.forEach((actor, i) => {
      renderer.addActor(actor);
    });

    console.log(crosshairs.actors);
    console.log(renderer);

    publicAPI.setCrosshairs(crosshairs);
  };

  publicAPI.handleLeftButtonPress = callData => {
    if (callData.shiftKey || callData.altKey || callData.controlKey) {
      //If not just pressing the mouse button, do whatever trackball camera would normally do
      superAPI.handleLeftButtonPress(callData);
    } else {
      //otherwise, move the crosshairs
      publicAPI.moveCrosshairs(callData);
      model.movingCrosshairs = true;
    }
  };

  publicAPI.handleLeftButtonRelease = callData => {
    model.movingCrosshairs = false;

    superAPI.handleLeftButtonRelease(callData);
  };

  publicAPI.handleMouseMove = callData => {
    if (callData.shiftKey || callData.altKey || callData.controlKey) {
      //If not just pressing the mouse button, do whatever trackball camera would normally do
      superAPI.handleMouseMove(callData);
    } else if (model.movingCrosshairs) {
      //otherwise, move the crosshairs
      publicAPI.moveCrosshairs(callData);
    }
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
  ]);

  //add function
  vtkInteractorStyle2DCrosshairs(publicAPI, model);
}

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyle2DCrosshairs'
);

export default { newInstance, extend };
