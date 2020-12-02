import macro from 'vtk.js/Sources/macro';
import vtkCoordinate from 'vtk.js/Sources/Rendering/Core/Coordinate';
import { VTKAxis } from '@vtk-viewport';

let instanceId = 1;

function getWidgetNode(svgContainer, widgetId) {
  let node = svgContainer.querySelector(`#${widgetId}`);
  if (!node) {
    node = document.createElement('g');
    node.setAttribute('id', widgetId);
    svgContainer.appendChild(node);
  }
  return node;
}

// ----------------------------------------------------------------------------

function vtk3DCrosshairsInterface(publicAPI, model) {
  model.classHierarchy.push('vtkSVGCrosshairsWidgetImageMapper');
  model.widgetId = `vtkSVGCrosshairsWidgetImageMapper-${instanceId++}`;
  model.crosshairs = new VTKAxis(0, 0, 0);

  publicAPI.moveCrosshairs = (worldPos, apis, apiIndex) => {
    if (worldPos === undefined || apis === undefined) {
      console.error(
        'worldPos, apis must be defined in order to update crosshairs.'
      );
    }
    console.log(apis[apiIndex].get('actor'));
    apis[apiIndex].set('cachedCrosshairWorldPosition', worldPos);
    console.log(apis[apiIndex].get('cachedCrosshairWorldPosition'));
    console.log(apis[apiIndex].get('axis'));

    apis.map(api => {
      const renderWindow = api.genericRenderWindow.getRenderWindow();
      const renderer = api.genericRenderWindow.getRenderer();
      const wPos = vtkCoordinate.newInstance();
      wPos.setCoordinateSystemToWorld();
      wPos.setValue(...worldPos);

      console.log(apis[apiIndex]);
      console.log(apis[apiIndex].get('axis'));

      api.get('axis').axis.setPoint(...wPos.getComputedWorldValue(renderer));

      if (api.type === 'VIEW2D') {
        if (viewportIndex == apiIndex) {
          const istyle = renderWindow.getInteractor().getInteractorStyle();
          const camera = renderer.getActiveCamera();
          camera.setFocalPoint(...istyle.getSliceCenter());
        } else {
          const imageMapper = api.actors[0].getMapper();
          const slice = imageMapper.getSliceAtPosition(worldPos);
          imageMapper.setSlice(slice);
        }
      }

      renderWindow.render();
    });
  };
}
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  point: [null, null],
  strokeColor: '#00ff00',
  strokeWidth: 1,
  strokeDashArray: '',
  padding: 20,
  display: true,
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  macro.obj(publicAPI, model);
  macro.get(publicAPI, model, ['widgetId']);
  macro.setGet(publicAPI, model, [
    'strokeColor',
    'strokeWidth',
    'strokeDashArray',
    'display',
  ]);
  macro.setGetArray(publicAPI, model, ['point', 'padding'], 2);

  vtk3DCrosshairsInterface(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtk3DCrosshairsInterface'
);

// ----------------------------------------------------------------------------

export default { newInstance, extend };
