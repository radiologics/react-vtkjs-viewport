import macro from 'vtk.js/Sources/macro';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkCoordinate from 'vtk.js/Sources/Rendering/Core/Coordinate';
import vtkPointPicker from 'vtk.js/Sources/Rendering/Core/PointPicker';
import vtkImageMarchingSquares from 'vtk.js/Sources/Filters/General/ImageMarchingCubes';
import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';

import VTKAxis from './VTKAxis';

function vtkInteractorStyle3DCrosshairs(publicAPI, model) {
  //Set classname
  model.classHierarchy.push('vtkInteractorStyle3DCrosshairs');

  //get copy of default publicAPI
  const superAPI = Object.assign({}, publicAPI);

  publicAPI.moveCrosshairs = callData => {
    const api = model.apis[model.apiIndex];

    const mousePos = callData.position;

    const coords = vtkCoordinate.newInstance();
    coords.setCoordinateSystemToDisplay();
    coords.setValue(mousePos.x, mousePos.y, mousePos.z);

    // const worldPos = coords.getComputedWorldValue(
    //   api.genericRenderWindow.getRenderer()
    // );

    const actor = publicAPI.getActor();
    const renderer = api.genericRenderWindow.getRenderer();
    const screenPoint = [mousePos.x, mousePos.y, 0];

    const picker = vtkPointPicker.newInstance();
    picker.setPickFromList(1);
    picker.initializePickList();
    picker.addPickList(actor, renderer);

    picker.pick(screenPoint, renderer);
    const pointId = picker.getPointId();
    console.log(picker.getPointId());
    console.log(picker.getPickPosition());

    console.log(actor);
    console.log(actor.getMapper());
    console.log(actor.getMapper().getInputData());
    //console.log(actor.getMapper().getInputData().getPointCells(picker.getPointId()))
    console.log(
      actor
        .getMapper()
        .getInputData()
        .getPoints()
    );
    console.log(
      actor
        .getMapper()
        .getInputData()
        .getPoints()
        .getPoint(picker.getPointId())
    );

    const worldPos = actor
      .getMapper()
      .getInputData()
      .getPoints()
      .getPoint(pointId);

    //const worldPos = picker.getPickPosition()

    model.apis.forEach((api, i) => {
      const istyle = api.genericRenderWindow
        .getRenderWindow()
        .getInteractor()
        .getInteractorStyle();

      istyle.updateCrosshairs(worldPos);
    });
  };

  publicAPI.updateCrosshairs = worldPos => {
    publicAPI.getCrosshairs().setPoint(...worldPos);
    publicAPI
      .getApis()
      [publicAPI.getApiIndex()].genericRenderWindow.getRenderWindow()
      .render();
  };

  publicAPI.setActor = actor => {
    actor.getProperty().setOpacity(0.5);
    superAPI.setActor(actor);

    const renderer = model.interactor.getCurrentRenderer();

    console.log(renderer);
    console.log(renderer.getActiveCamera());

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

    publicAPI.setCrosshairs(crosshairs);

    model.apis.forEach((api, i) => {
      if (api.type == 'VIEW2D') {
        renderer.addActor(api.actors[0]);
      }
    });
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
    if (
      !(callData.shiftKey || callData.altKey || callData.controlKey) &&
      model.movingCrosshairs
    ) {
      //otherwise, move the crosshairs
      publicAPI.moveCrosshairs(callData);
    } else {
      //If not just pressing the mouse button, do whatever trackball camera would normally do
      superAPI.handleMouseMove(callData);
    }
  };

  publicAPI.handleRightButtonPress = superAPI.handleLeftButtonPress;
  publicAPI.handleRightButtonRelease = superAPI.handleLeftButtonRelease;
}

//Class defaults
const DEFAULT_VALUES = {};

export function extend(publicAPI, model, initialValues = {}) {
  //combine all default values, initial values, and model into one object
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtkInteractorStyleTrackballCamera.extend(publicAPI, model, initialValues);

  //assign variables that can be set and gotten
  macro.setGet(publicAPI, model, ['apis', 'apiIndex', 'crosshairs', 'actor']);

  //add function
  vtkInteractorStyle3DCrosshairs(publicAPI, model);
}

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyle3DCrosshairs'
);

export default { newInstance, extend };
