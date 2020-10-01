import React, { Component } from 'react';
import PropTypes from 'prop-types';
import vtkGenericRenderWindow from 'vtk.js/Sources/Rendering/Misc/GenericRenderWindow';
import vtkWidgetManager from 'vtk.js/Sources/Widgets/Core/WidgetManager';
import vtkInteractorStyleMPRSlice from './vtkInteractorStyleMPRSlice';
import vtkSVGWidgetManager from './vtkSVGWidgetManager';
import ViewportOverlay from '../ViewportOverlay/ViewportOverlay.js';
import { createSub } from '../lib/createSub.js';
import { uuidv4 } from './../helpers';
import setGlobalOpacity from './setGlobalOpacity';

export default class View2D extends Component {
  static propTypes = {
    volumes: PropTypes.array.isRequired,
    actors: PropTypes.array,
    dataDetails: PropTypes.object,
    onCreated: PropTypes.func,
    onDestroyed: PropTypes.func,
    orientation: PropTypes.object,
  };

  static defaultProps = {};

  constructor(props) {
    super(props);

    this.genericRenderWindow = null;
    this.widgetManager = vtkWidgetManager.newInstance();
    this.container = React.createRef();
    this.subs = {
      interactor: createSub(),
      data: createSub(),
      labelmap: createSub(),
    };
    this.interactorStyleSubs = [];
    this.state = {
      voi: this.getVOI(props.volumes[0]),
    };

    this.apiProperties = {};
  }

  componentDidMount() {
    // Tracking ID to tie emitted events to this component
    const uid = uuidv4();

    this.genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0, 0, 0],
    });

    this.genericRenderWindow.setContainer(this.container.current);

    let widgets = [];
    let filters = [];
    let actors = [];
    let volumes = [];

    const radius = 5;
    const label = 1;

    this.renderer = this.genericRenderWindow.getRenderer();
    this.renderWindow = this.genericRenderWindow.getRenderWindow();
    const oglrw = this.genericRenderWindow.getOpenGLRenderWindow();

    // update view node tree so that vtkOpenGLHardwareSelector can access
    // the vtkOpenGLRenderer instance.
    oglrw.buildPass(true);

    const istyle = vtkInteractorStyleMPRSlice.newInstance();
    this.renderWindow.getInteractor().setInteractorStyle(istyle);

    // TODO unsubscribe from this before component unmounts.

    this.widgetManager.disablePicking();

    // trigger pipeline update
    this.componentDidUpdate({});

    if (this.labelmap && this.labelmap.actor) {
      actors = actors.concat(this.labelmap.actor);
    }

    if (this.props.volumes) {
      volumes = volumes.concat(this.props.volumes);
    }

    // Set orientation based on props
    if (this.props.orientation) {
      const { orientation } = this.props;

      istyle.setSliceOrientation(orientation.sliceNormal, orientation.viewUp);
    } else {
      istyle.setSliceNormal(0, 0, 1);
    }

    const camera = this.renderer.getActiveCamera();

    camera.setParallelProjection(true);
    this.renderer.resetCamera();

    istyle.setVolumeActor(this.props.volumes[0]);
    const range = istyle.getSliceRange();
    istyle.setSlice((range[0] + range[1]) / 2);

    const svgWidgetManager = vtkSVGWidgetManager.newInstance();

    svgWidgetManager.setRenderer(this.renderer);
    svgWidgetManager.setScale(1);

    this.svgWidgetManager = svgWidgetManager;

    // TODO: Not sure why this is necessary to force the initial draw
    this.genericRenderWindow.resize();

    const boundUpdateVOI = this.updateVOI.bind(this);
    const boundGetOrienation = this.getOrientation.bind(this);
    const boundSetInteractorStyle = this.setInteractorStyle.bind(this);
    const boundAddSVGWidget = this.addSVGWidget.bind(this);
    const boundGetApiProperty = this.getApiProperty.bind(this);
    const boundSetApiProperty = this.setApiProperty.bind(this);
    const boundSetSegmentRGB = this.setSegmentRGB.bind(this);
    const boundSetSegmentRGBA = this.setSegmentRGBA.bind(this);
    const boundSetSegmentAlpha = this.setSegmentAlpha.bind(this);
    const boundUpdateImage = this.updateImage.bind(this);
    const boundSetSegmentVisibility = this.setSegmentVisibility.bind(this);
    const boundSetGlobalOpacity = this.setGlobalOpacity.bind(this);
    const boundSetVisibility = this.setVisibility.bind(this);
    const boundSetOutlineThickness = this.setOutlineThickness.bind(this);
    const boundOutlineRendering = this.setOutlineRendering.bind(this);
    const boundRequestNewSegmentation = this.requestNewSegmentation.bind(this);

    this.svgWidgets = {};

    if (this.props.onCreated) {
      /**
       * Note: The contents of this Object are
       * considered part of the API contract
       * we make with consumers of this component.
       */
      const api = {
        uid, // Tracking id available on `api`
        genericRenderWindow: this.genericRenderWindow,
        widgetManager: this.widgetManager,
        svgWidgetManager: this.svgWidgetManager,
        addSVGWidget: boundAddSVGWidget,
        container: this.container.current,
        widgets,
        svgWidgets: this.svgWidgets,
        filters,
        actors,
        volumes,
        _component: this,
        updateImage: boundUpdateImage,
        updateVOI: boundUpdateVOI,
        getOrientation: boundGetOrienation,
        setInteractorStyle: boundSetInteractorStyle,
        setSegmentRGB: boundSetSegmentRGB,
        setSegmentRGBA: boundSetSegmentRGBA,
        setSegmentAlpha: boundSetSegmentAlpha,
        setSegmentVisibility: boundSetSegmentVisibility,
        setGlobalOpacity: boundSetGlobalOpacity,
        setVisibility: boundSetVisibility,
        setOutlineThickness: boundSetOutlineThickness,
        setOutlineRendering: boundOutlineRendering,
        requestNewSegmentation: boundRequestNewSegmentation,
        get: boundGetApiProperty,
        set: boundSetApiProperty,
        type: 'VIEW2D',
      };

      this.props.onCreated(api);
    }
  }

  getApiProperty(propertyName) {
    return this.apiProperties[propertyName];
  }

  setApiProperty(propertyName, value) {
    this.apiProperties[propertyName] = value;
  }

  addSVGWidget(widget, name) {
    const { svgWidgetManager } = this;

    svgWidgetManager.addWidget(widget);
    svgWidgetManager.render();

    this.svgWidgets[name] = widget;
  }

  updateImage() {
    const renderWindow = this.genericRenderWindow.getRenderWindow();

    renderWindow.render();
  }

  setInteractorStyle({ istyle, callbacks = {}, configuration = {} }) {
    const { volumes } = this.props;
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

    const slabThickness = this.getSlabThickness();
    const interactor = renderWindow.getInteractor();

    interactor.setInteractorStyle(istyle);

    // TODO: Not sure why this is required the second time this function is called
    istyle.setInteractor(interactor);

    if (currentViewport) {
      istyle.setViewport(currentViewport);
    }

    if (istyle.getVolumeActor() !== volumes[0]) {
      if (slabThickness && istyle.setSlabThickness) {
        istyle.setSlabThickness(slabThickness);
      }

      istyle.setVolumeActor(volumes[0]);
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

  updateVOI(windowWidth, windowCenter) {
    this.setState({ voi: { windowWidth, windowCenter } });
  }

  getOrientation() {
    return this.props.orientation;
  }

  setSegmentRGBA(segmentIndex, [red, green, blue, alpha]) {
    this.setSegmentRGB(segmentIndex, [red, green, blue]);
    this.setSegmentAlpha(segmentIndex, alpha);
  }

  setGlobalOpacity(globalOpacity) {
    const { labelmap } = this;
    const colorLUT = this.props.labelmapRenderingOptions.colorLUT;
    setGlobalOpacity(labelmap, colorLUT, globalOpacity);
  }

  setVisibility(visible) {
    const { labelmap } = this;
    labelmap.actor.setVisibility(visible);
  }

  setOutlineThickness(outlineThickness) {
    const { labelmap } = this;
    labelmap.actor.getProperty().setLabelOutlineThickness(outlineThickness);
  }

  setOutlineRendering(renderOutline) {
    const { labelmap } = this;
    labelmap.actor.getProperty().setUseLabelOutline(renderOutline);
  }

  requestNewSegmentation() {
    this.props.labelmapRenderingOptions.onNewSegmentationRequested();
  }

  setSegmentRGB(segmentIndex, [red, green, blue]) {
    const { labelmap } = this;

    labelmap.cfun.addRGBPoint(segmentIndex, red / 255, green / 255, blue / 255);
  }

  setSegmentVisibility(segmentIndex, isVisible) {
    this.setSegmentAlpha(segmentIndex, isVisible ? 255 : 0);
  }

  setSegmentAlpha(segmentIndex, alpha) {
    const { labelmap } = this;
    let { globalOpacity } = this.props.labelmapRenderingOptions;

    if (globalOpacity === undefined) {
      globalOpacity = 1.0;
    }

    const segmentOpacity = (alpha / 255) * globalOpacity;

    labelmap.ofun.addPointLong(segmentIndex, segmentOpacity, 0.5, 1.0);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.volumes !== this.props.volumes) {
      this.props.volumes.forEach(volume => {
        if (!volume.isA('vtkVolume')) {
          console.warn('Data to <Vtk2D> is not vtkVolume data');
        }
      });

      if (this.props.volumes.length) {
        this.props.volumes.forEach(this.renderer.addVolume);
      } else {
        // TODO: Remove all volumes
      }

      this.renderWindow.render();
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

  getVOI = actor => {
    // Note: This controls window/level

    // TODO: Make this work reactively with onModified...

    debugger;
    const rgbTransferFunction = actor.getProperty().getRGBTransferFunction(0);
    const range = rgbTransferFunction.getMappingRange();
    const windowWidth = Math.abs(range[1] - range[0]);
    const windowCenter = range[0] + windowWidth / 2;

    return {
      windowCenter,
      windowWidth,
    };
  };

  render() {
    if (!this.props.volumes || !this.props.volumes.length) {
      return null;
    }

    const style = { width: '100%', height: '100%', position: 'relative' };
    const voi = this.state.voi;

    return (
      <div style={style}>
        <div ref={this.container} style={style} />
        <ViewportOverlay {...this.props.dataDetails} voi={voi} />
      </div>
    );
  }
}
