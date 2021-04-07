import macro from 'vtk.js/Sources/macro';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkCoordinate from 'vtk.js/Sources/Rendering/Core/Coordinate';
import vtkPointPicker from 'vtk.js/Sources/Rendering/Core/PointPicker';
import vtkOpenGLHardwareSelector from 'vtk.js/Sources/Rendering/OpenGL/HardwareSelector';
import VTKAxis from './VTKAxis';

function vtkInteractorStyle3DCrosshairs(publicAPI, model) {
  //Set classname
  model.classHierarchy.push('vtkInteractorStyle3DCrosshairs');

  //get copy of default publicAPI
  const superAPI = Object.assign({}, publicAPI);

  //class containing crosshair position
  const crosshairs = new VTKAxis(0, 0, 0, 0);
  publicAPI.setCrosshairs(crosshairs);

  publicAPI.moveCrosshairs = callData => {
    const api = model.apis[model.apiIndex];
    const mousePos = callData.position;
    const renderer = api.genericRenderWindow.getRenderer();

    const hws = publicAPI.getHardwareSelector();

    if (hws.captureBuffers()) {
      //Use HardwareSelector to get in world coordinates from screen coordinates
      const selection = hws.generateSelection(
        mousePos.x,
        mousePos.y,
        mousePos.x,
        mousePos.y
      );
      hws.releasePixBuffers();

      renderer.getRenderWindow().render();
      const worldPos = selection[0].getProperties().worldPosition;

      //update crosshairs for each crosshair interactor
      model.apis.forEach((api, i) => {
        const istyle = api.genericRenderWindow
          .getRenderWindow()
          .getInteractor()
          .getInteractorStyle();

        istyle.updateCrosshairs(worldPos);
      });
    }
  };

  publicAPI.updateCrosshairs = worldPos => {
    //update the position of the crosshairs and re-render
    publicAPI.getCrosshairs().setPoint(...worldPos);
    publicAPI
      .getApis()
      [publicAPI.getApiIndex()].genericRenderWindow.getRenderWindow()
      .render();
  };

  publicAPI.setActor = actor => {
    //actually set the actor
    superAPI.setActor(actor);

    const renderer = model.interactor.getCurrentRenderer();

    //get default width of crosshairs
    const bounds = actor.getBounds();
    const width =
      Math.max(
        Math.abs(bounds[1] - bounds[0]),
        Math.abs(bounds[3] - bounds[2]),
        Math.abs(bounds[5] - bounds[4])
      ) * 2;

    //get default position of crosshairs
    const pos = actor.getCenter();
    //set default values of crosshairs
    const crosshairs = publicAPI.getCrosshairs();
    crosshairs.actors.forEach(renderer.addActor);
    crosshairs.setPoint(...pos);
    crosshairs.setWidth(width);
  };

  publicAPI.onConfigSet = () => {
    const apis = publicAPI.getApis();
    const apiIndex = publicAPI.getApiIndex();

    //set actors
    superAPI.setActors(apis[apiIndex].actors);

    const api = model.apis[model.apiIndex];
    const renderer = api.genericRenderWindow.getRenderer();
    const openGLRenderWindow = api.genericRenderWindow.getOpenGLRenderWindow(); //renderer.getRenderWindow().getOpenGL()[0];
    const size = openGLRenderWindow.getSize();

    const hws = vtkOpenGLHardwareSelector.newInstance({ captureZValues: true });
    hws.setFieldAssociation(0);
    hws.attach(openGLRenderWindow, renderer);
    hws.setArea(0, 0, ...size);

    publicAPI.setHardwareSelector(hws);
  };

  publicAPI.setApis = apis => {
    superAPI.setApis(apis);

    //if all configs have been set
    if (publicAPI.getApiIndex()) {
      publicAPI.onConfigSet();
    }
  };

  publicAPI.setApiIndex = apiIndex => {
    superAPI.setApiIndex(apiIndex);

    //if all configs have been set
    if (publicAPI.getApis()) {
      publicAPI.onConfigSet();
    }
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

  publicAPI.toggleCrosshairSlices = () => {
    const renderer = model.interactor.getCurrentRenderer();

    model.apis.forEach((api, i) => {
      if (api.type == 'VIEW2D') {
        const actor = api.actors[0];
        if (renderer.getActors().includes(actor)) {
          renderer.removeActor(actor);
        } else {
          renderer.addActor(actor);
        }
      }
    });

    renderer.getRenderWindow().render();
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
  macro.setGet(publicAPI, model, [
    'apis',
    'apiIndex',
    'crosshairs',
    'crosshairList',
    'actor',
    'actors',
    'hardwareSelector',
  ]);

  //add function
  vtkInteractorStyle3DCrosshairs(publicAPI, model);
}

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyle3DCrosshairs'
);

export default { newInstance, extend };
