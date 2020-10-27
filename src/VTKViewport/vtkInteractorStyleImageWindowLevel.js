import macro from 'vtk.js/Sources/macro';
import vtkInteractorStyleImage from 'vtk.js/Sources/Interaction/Style/InteractorStyleImage';

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// vtkInteractorStyleImageWindowLevel methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleImageWindowLevel(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleImageWindowLevel');

  publicAPI.superWindowLevel = publicAPI.windowLevel;
  publicAPI.windowLevel = (renderer, position) => {
    publicAPI.superWindowLevel(renderer, position);
    const windowWidth = model.currentImageProperty.getColorWindow();
    const windowCenter = model.currentImageProperty.getColorLevel();
    const onLevelsChanged = publicAPI.getOnLevelsChanged();
    if (onLevelsChanged) {
      onLevelsChanged({ windowCenter, windowWidth });
    }
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
  vtkInteractorStyleImage.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, ['onLevelsChanged', 'levelScale']);

  // Object specific methods
  vtkInteractorStyleImageWindowLevel(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyleImageWindowLevel'
);

// ----------------------------------------------------------------------------

export default Object.assign({ newInstance, extend });
