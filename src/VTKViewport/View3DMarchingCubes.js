import React, { Component } from 'react';
import PropTypes from 'prop-types';
import vtkGenericRenderWindow from 'vtk.js/Sources/Rendering/Misc/GenericRenderWindow';
import vtkWidgetManager from 'vtk.js/Sources/Widgets/Core/WidgetManager';
import vtkSVGWidgetManager from './vtkSVGWidgetManager';
import vtkOrientationMarkerWidget from 'vtk.js/Sources/Interaction/Widgets/OrientationMarkerWidget';
import vtkAnnotatedCubeActor from 'vtk.js/Sources/Rendering/Core/AnnotatedCubeActor';

import { createSub } from '../lib/createSub.js';

const stlKey = 'STL';
const mcKey = 'MC';
const displayName = {};
displayName[stlKey] = 'STL surface mesh';
displayName[mcKey] = 'DICOM-SEG marching cubes';

export default class View3DMarchingCubes extends Component {
  static propTypes = {
    marchingCubesActors: PropTypes.array,
    stlActors: PropTypes.array,
    onCreated: PropTypes.func,
    onDestroyed: PropTypes.func,
    dataDetails: PropTypes.object,
    planeMap: PropTypes.object,
    labelmapRenderingOptions: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.genericRenderWindow = null;
    this.widgetManager = vtkWidgetManager.newInstance();
    this.container = React.createRef();
    this.subs = {
      interactor: createSub(),
    };
    this.interactorStyleSubs = [];
    this.apiProperties = {};

    const defaultDisplay = this.setActorMapAndDisplay();
    this.state = {
      display: defaultDisplay,
      loading: true,
    };
  }

  getActorsForDisplay = display => {
    if (!display) {
      return [];
    }
    return this.actorMap[display];
  };

  setOrUpdateActors(display) {
    if (display === this.state.display) {
      this.setState({ loading: false });
      return;
    }

    if (display) {
      // We are updating, remove old actors
      const oldActors = this.getActorsForDisplay(this.state.display);
      if (oldActors.length) {
        oldActors.forEach(this.renderer.removeActor);
      }
    } else {
      // Initial rendering
      display = this.state.display;
    }
    const actors = this.getActorsForDisplay(display);
    if (actors.length) {
      actors.forEach(this.renderer.addActor);
    }

    // show sagittal view
    const { planeMap } = this.props;
    const normal = [0, 0, 0];
    normal[planeMap.Sagittal.plane] = planeMap.Sagittal.flip ? -1 : 1;
    const viewUp = [0, 0, 0];
    viewUp[planeMap.Axial.plane] = planeMap.Axial.flip ? -1 : 1;

    // Set camera
    const camera = this.renderer.getActiveCamera();
    // Direction of projection - negative of the normal
    camera.setDirectionOfProjection(-normal[0], -normal[1], -normal[2]);
    // View up is the Axial direction
    camera.setViewUp(...viewUp);
    this.renderer.resetCamera();

    // orientation widget (update marker orientation after camera reset)
    this.orientationWidget.updateMarkerOrientation();
    this.genericRenderWindow.getRenderWindow().render();
    this.setState({ loading: false, display });
  }

  setActorMapAndDisplay() {
    this.actorMap = {};
    let defaultDisplay;
    if (this.props.stlActors && this.props.stlActors.length) {
      this.actorMap[stlKey] = this.props.stlActors;
      defaultDisplay = stlKey;
    }
    if (
      this.props.marchingCubesActors &&
      this.props.marchingCubesActors.length
    ) {
      this.actorMap[mcKey] = this.props.marchingCubesActors;
      if (!defaultDisplay) {
        defaultDisplay = mcKey;
      }
    }
    return defaultDisplay;
  }

  componentDidMount() {
    this.genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0, 0, 0],
    });

    this.genericRenderWindow.setContainer(this.container.current);

    this.renderer = this.genericRenderWindow.getRenderer();
    this.renderWindow = this.genericRenderWindow.getRenderWindow();
    const interactor = this.renderWindow.getInteractor();

    this.widgetManager.disablePicking();
    this.widgetManager.setRenderer(this.renderer);

    // setup orientation widget
    this.axes = vtkAnnotatedCubeActor.newInstance();
    this.orientationWidget = vtkOrientationMarkerWidget.newInstance({
      actor: this.axes,
      interactor: interactor,
    });
    this.orientationWidget.setEnabled(true);
    this.orientationWidget.setViewportCorner(
      vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT
    );
    this.orientationWidget.setMinPixelSize(50);
    this.orientationWidget.setMaxPixelSize(500);

    const { planeMap } = this.props;
    const setAxes = function(key) {
      const value = planeMap[key];
      const flip = value.flip;
      let plusText, minusText, plusRotation, minusRotation;
      switch (key) {
        case 'Sagittal':
          if (flip) {
            minusText = 'L';
            plusText = 'R';
          } else {
            minusText = 'R';
            plusText = 'L';
          }
          minusRotation = -90; //+270 -> 180
          plusRotation = 90; //+90 -> 180
          break;
        case 'Coronal':
          if (flip) {
            minusText = 'P';
            plusText = 'A';
          } else {
            minusText = 'A';
            plusText = 'P';
          }
          minusRotation = 0; //+180 -> 180
          plusRotation = 180;
          break;
        case 'Axial':
          if (flip) {
            minusText = 'S';
            plusText = 'I';
          } else {
            minusText = 'I';
            plusText = 'S';
          }
          minusRotation = 180; //+180 -> 0 skip for now
          plusRotation = 0;
          break;
      }
      let plusSetterFn, minusSetterFn;
      switch (value.plane) {
        case 0:
          minusSetterFn = this.axes.setXMinusFaceProperty;
          plusSetterFn = this.axes.setXPlusFaceProperty;
          break;
        case 1:
          minusSetterFn = this.axes.setYMinusFaceProperty;
          plusSetterFn = this.axes.setYPlusFaceProperty;
          break;
        case 2:
          minusSetterFn = this.axes.setZMinusFaceProperty;
          plusSetterFn = this.axes.setZPlusFaceProperty;
          break;
      }
      plusSetterFn({
        text: plusText,
        faceRotation: plusRotation,
      });
      minusSetterFn({
        text: minusText,
        faceRotation: minusRotation,
      });
    }.bind(this);
    Object.keys(planeMap).forEach(setAxes);

    window.addEventListener('resize', this.genericRenderWindow.resize);
    window.addEventListener('resize', this.orientationWidget.updateViewport);

    this.setOrUpdateActors();

    this.renderer.resetCamera();
    this.renderer.updateLightsGeometryToFollowCamera();

    const svgWidgetManager = vtkSVGWidgetManager.newInstance();

    svgWidgetManager.setRenderer(this.renderer);
    svgWidgetManager.setScale(1);

    this.svgWidgetManager = svgWidgetManager;

    // TODO: Not sure why this is necessary to force the initial draw
    this.genericRenderWindow.resize();

    const boundAddSVGWidget = this.addSVGWidget.bind(this);
    const boundSetInteractorStyle = this.setInteractorStyle.bind(this);
    const boundGetApiProperty = this.getApiProperty.bind(this);
    const boundSetApiProperty = this.setApiProperty.bind(this);
    const boundRequestNewSegmentation = this.requestNewSegmentation.bind(this);
    const boundUpdateColorLUT = this.updateColorLUT.bind(this);
    const boundUpdateImage = this.updateImage.bind(this);

    this.svgWidgets = {};

    if (this.props.onCreated) {
      /**
       * Note: The contents of this Object are
       * considered part of the API contract
       * we make with consumers of this component.
       */
      const api = {
        genericRenderWindow: this.genericRenderWindow,
        widgetManager: this.widgetManager,
        svgWidgetManager: this.svgWidgetManager,
        addSVGWidget: boundAddSVGWidget,
        setInteractorStyle: boundSetInteractorStyle,
        container: this.container.current,
        marchingCubesActors: this.props.marchingCubesActors,
        stlActors: this.props.stlActors,
        svgWidgets: this.svgWidgets,
        get: boundGetApiProperty,
        set: boundSetApiProperty,
        requestNewSegmentation: boundRequestNewSegmentation,
        updateImage: boundUpdateImage,
        updateColorLUT: boundUpdateColorLUT,
        type: 'VIEW3D',
        _component: this, // Backdoor still open for now whilst the API isn't as mature as View2D.
      };

      this.props.onCreated(api);
    }
  }

  componentDidUpdate(prevProps) {
    if (
      (prevProps.stlActors !== this.props.stlActors &&
        ((prevProps.stlActors && prevProps.stlActors.length > 0) ||
          (this.props.stlActors && this.props.stlActors.length > 0))) ||
      (prevProps.marchingCubesActors !== this.props.marchingCubesActors &&
        ((prevProps.marchingCubesActors &&
          prevProps.marchingCubesActors.length > 0) ||
          (this.props.marchingCubesActors &&
            this.props.marchingCubesActors.length > 0)))
    ) {
      const defaultDisplay = this.setActorMapAndDisplay();
      this.setState({ loading: true, display: defaultDisplay }, () => {
        this.setOrUpdateActors();
        this.renderer.resetCamera();
        this.renderer.updateLightsGeometryToFollowCamera();
      });
    }
  }

  componentWillUnmount() {
    Object.keys(this.subs).forEach(k => {
      this.subs[k].unsubscribe();
    });

    if (this.props.onDestroyed) {
      this.props.onDestroyed();
    }

    this.genericRenderWindow.delete();
  }

  addSVGWidget(widget, name) {
    const { svgWidgetManager } = this;

    svgWidgetManager.addWidget(widget);
    svgWidgetManager.render();

    this.svgWidgets[name] = widget;
  }

  setInteractorStyle({ istyle, callbacks = {}, configuration = {} }) {
    const actors = this.getActorsForDisplay(this.state.display);
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    const currentIStyle = renderWindow.getInteractor().getInteractorStyle();

    // unsubscribe from previous iStyle's callbacks.
    while (this.interactorStyleSubs.length) {
      this.interactorStyleSubs.pop().unsubscribe();
    }

    let currentViewport;
    if (currentIStyle.getViewport && istyle.getViewport) {
      currentViewport = currentIStyle.getViewport();
    }

    const interactor = renderWindow.getInteractor();

    interactor.setInteractorStyle(istyle);

    // TODO: Not sure why this is required the second time this function is called
    istyle.setInteractor(interactor);

    if (currentViewport) {
      istyle.setViewport(currentViewport);
    }

    if (istyle.getActor && istyle.getActor() !== actors[0]) {
      istyle.setActor(actors[0]);
    }

    // Add appropriate callbacks
    Object.keys(callbacks).forEach(key => {
      if (typeof istyle[key] === 'function') {
        const subscription = istyle[key](callbacks[key]);

        if (subscription && typeof subscription.unsubscribe === 'function') {
          this.interactorStyleSubs.push(subscription);
        }
      }
    });

    // Set Configuration
    if (configuration) {
      istyle.set(configuration);
    }

    renderWindow.render();
  }

  getApiProperty(propertyName) {
    return this.apiProperties[propertyName];
  }

  setApiProperty(propertyName, value) {
    this.apiProperties[propertyName] = value;
  }

  requestNewSegmentation() {
    this.props.labelmapRenderingOptions.onNewSegmentationRequested();
  }

  updateColorLUT() {
    this.props.labelmapRenderingOptions.onColorLUTUpdate();
  }

  updateImage() {
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    renderWindow.render();
  }

  render() {
    const style = { width: '100%', height: '100%', position: 'relative' };
    const selectContainer = { top: '10px', left: '10px', position: 'absolute' };

    let select = null;
    if (this.state.display) {
      select = (
        <select
          onChange={e => {
            const actorType = e.target.value;
            this.setState({ loading: true }, () =>
              setTimeout(() => this.setOrUpdateActors(actorType), 50)
            );
          }}
          defaultValue={this.state.display}
        >
          {Object.keys(this.actorMap).map(key => {
            return (
              <option key={key} value={key}>
                {displayName[key]}
              </option>
            );
          })}
        </select>
      );
    }

    return (
      <div style={style}>
        <div ref={this.container} style={style} />
        <div style={selectContainer}>
          {this.state.loading ? (
            <div style={{ color: 'white' }}>Loading...</div>
          ) : (
            select
          )}
        </div>
      </div>
    );
  }
}
