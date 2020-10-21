import React, { Component } from 'react';
import PropTypes from 'prop-types';
import vtkGenericRenderWindow from 'vtk.js/Sources/Rendering/Misc/GenericRenderWindow';
import vtkWidgetManager from 'vtk.js/Sources/Widgets/Core/WidgetManager';
import vtkSVGWidgetManager from './vtkSVGWidgetManager';
import vtkOrientationMarkerWidget from 'vtk.js/Sources/Interaction/Widgets/OrientationMarkerWidget';
import vtkAnnotatedCubeActor from 'vtk.js/Sources/Rendering/Core/AnnotatedCubeActor';

import { createSub } from '../lib/createSub.js';

export default class View3DMarchingCubes extends Component {
  static propTypes = {
    actors: PropTypes.array,
    sourceDataDirection: PropTypes.object,
    onCreated: PropTypes.func,
    onDestroyed: PropTypes.func,
    dataDetails: PropTypes.object,
    planeMap: PropTypes.object,
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
  }

  componentDidMount() {
    this.genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0, 0, 0],
    });

    this.genericRenderWindow.setContainer(this.container.current);

    let actors = [];

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
            (minusText = 'L'), (minusRotation = -90);
            (plusText = 'R'), (plusRotation = 90);
          } else {
            (minusText = 'R'), (minusRotation = -90);
            (plusText = 'L'), (plusRotation = 90);
          }
          break;
        case 'Coronal':
          if (flip) {
            (minusText = 'P'), (minusRotation = 0);
            (plusText = 'A'), (plusRotation = 180);
          } else {
            (minusText = 'A'), (minusRotation = 0);
            (plusText = 'P'), (plusRotation = 180);
          }
          break;
        case 'Axial':
          if (flip) {
            (minusText = 'S'), (minusRotation = 180);
            (plusText = 'I'), (plusRotation = 0);
          } else {
            (minusText = 'I'), (minusRotation = 180);
            (plusText = 'S'), (plusRotation = 0);
          }
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

    // trigger pipeline update
    this.componentDidUpdate({});

    if (this.props.actors) {
      actors = actors.concat(this.props.actors);
    }

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
        actors,
        svgWidgets: this.svgWidgets,
        get: boundGetApiProperty,
        set: boundSetApiProperty,
        type: 'VIEW3D',
        _component: this, // Backdoor still open for now whilst the API isn't as mature as View2D.
      };

      this.props.onCreated(api);
    }
  }

  componentDidUpdate(prevProps) {
    console.time('View3DMarchingCubes componentDidUpdate');
    if (prevProps.actors !== this.props.actors) {
      if (this.props.actors.length) {
        this.props.actors.forEach(this.renderer.addActor);
      } else {
        // TODO: Remove all actors
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

      // orientation widget (enable after camera reset to properly update marker orientation)
      this.orientationWidget.setEnabled(true);
    }
    console.timeEnd('View3DMarchingCubes componentDidUpdate');
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
    const { actors } = this.props;
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

  render() {
    if (!this.props.actors) {
      return null;
    }

    const style = { width: '100%', height: '100%', position: 'relative' };

    return (
      <div style={style}>
        <div ref={this.container} style={style} />
      </div>
    );
  }
}
