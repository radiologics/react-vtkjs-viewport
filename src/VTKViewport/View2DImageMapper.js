import React, { Component } from 'react';
import PropTypes from 'prop-types';
import vtkGenericRenderWindow from 'vtk.js/Sources/Rendering/Misc/GenericRenderWindow';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkWidgetManager from 'vtk.js/Sources/Widgets/Core/WidgetManager';
import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper';
import vtkInteractorStyleImage from 'vtk.js/Sources/Interaction/Style/InteractorStyleImage';
import vtkSVGWidgetManager from './vtkSVGWidgetManager';
import ViewportOverlay from '../ViewportOverlay/ViewportOverlay.js';
import { createSub } from '../lib/createSub.js';
import { uuidv4 } from './../helpers';

export default class View2DImageMapper extends Component {
  static propTypes = {
    actors: PropTypes.array,
    labelmapActors: PropTypes.array,
    dataDetails: PropTypes.object,
    onCreated: PropTypes.func,
    onDestroyed: PropTypes.func,
    orientation: PropTypes.string.isRequired,
    orientationName: PropTypes.string,
    labelmapRenderingOptions: PropTypes.object,
  };

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
      voi: this.getVOI(props.actors[0]),
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
    this.renderWindow = this.genericRenderWindow.getRenderWindow();

    let widgets = [];
    let filters = [];
    let actors = this.props.actors;
    let labelmapActors = this.props.labelmapActors;

    const renderer = this.genericRenderWindow.getRenderer();

    this.renderer = renderer;
    this.renderWindow = this.genericRenderWindow.getRenderWindow();
    const oglrw = this.genericRenderWindow.getOpenGLRenderWindow();

    // Add labelmap only renderer so we can interact with source data
    this.labelmapRenderer = vtkRenderer.newInstance();

    const labelmapRenderer = this.labelmapRenderer;

    this.renderWindow.addRenderer(this.labelmapRenderer);
    this.renderWindow.setNumberOfLayers(2);
    labelmapRenderer.setLayer(1);
    labelmapRenderer.setInteractive(false);

    // update view node tree so that vtkOpenGLHardwareSelector can access
    // the vtkOpenGLRenderer instance.
    oglrw.buildPass(true);

    const iStyle = vtkInteractorStyleImage.newInstance();

    iStyle.setInteractionMode('IMAGE_SLICING');
    this.renderWindow.getInteractor().setInteractorStyle(iStyle);

    const inter = this.renderWindow.getInteractor();
    const updateCameras = () => {
      const baseCamera = this.renderer.getActiveCamera();
      const labelmapCamera = this.labelmapRenderer.getActiveCamera();

      const position = baseCamera.getReferenceByName('position');
      const focalPoint = baseCamera.getReferenceByName('focalPoint');
      const viewUp = baseCamera.getReferenceByName('viewUp');
      const viewAngle = baseCamera.getReferenceByName('viewAngle');

      labelmapCamera.set({
        position,
        focalPoint,
        viewUp,
        viewAngle,
      });

      this.props.actors.forEach(actor => {
        actor.getMapper().setSliceFromCamera(baseCamera);
      });
    };
    // TODO unsubscribe from this before component unmounts.
    inter.onAnimation(updateCameras);

    this.widgetManager.disablePicking();
    this.widgetManager.setRenderer(this.labelmapRenderer);

    // Add all actors to renderer
    actors.forEach(actor => {
      renderer.addViewProp(actor);
    });

    if (labelmapActors) {
      labelmapActors.forEach(actor => {
        labelmapRenderer.addViewProp(actor);
      });
    }

    const imageActor = actors[0];
    const imageMapper = imageActor.getMapper();
    const actorVTKImageData = imageMapper.getInputData();
    const dimensions = actorVTKImageData.getDimensions();
    const direction = actorVTKImageData.getDirection();
    const planes = [
      direction.slice(0, 3),
      direction.slice(3, 6),
      direction.slice(6, 9),
    ];
    const orient = planes.map(arr =>
      arr.findIndex(i => Math.abs(Math.round(i)) === 1)
    );

    const sagPlane = orient.indexOf(0);
    const corPlane = orient.indexOf(1);
    const axPlane = orient.indexOf(2);

    const sagFlip = planes[sagPlane].some(i => Math.round(i) === -1);
    const corFlip = planes[corPlane].some(i => Math.round(i) === -1);
    const axFlip = planes[axPlane].some(i => Math.round(i) === -1);

    let sliceMode;
    let dimensionsOfSliceDirection;
    let viewUp;
    const { orientation } = this.props;

    // Use orientation prop to set slice direction
    switch (orientation) {
      case 'Sagittal':
        if (sagPlane === 1) {
          sliceMode = vtkImageMapper.SlicingMode.J;
        } else if (sagPlane === 2) {
          sliceMode = vtkImageMapper.SlicingMode.K;
        } else {
          // already sag
          sliceMode = vtkImageMapper.SlicingMode.I;
        }
        dimensionsOfSliceDirection = dimensions[sagPlane];
        viewUp = [0, 0, 1];
        this.setState({
          neswMetadata: {
            n: 'S',
            s: 'I',
            e: sagFlip ? 'A' : 'P',
            w: sagFlip ? 'P' : 'A',
          },
        });
        break;
      case 'Coronal':
        if (corPlane === 0) {
          sliceMode = vtkImageMapper.SlicingMode.I;
        } else if (corPlane === 2) {
          sliceMode = vtkImageMapper.SlicingMode.K;
        } else {
          // already cor
          sliceMode = vtkImageMapper.SlicingMode.J;
        }
        dimensionsOfSliceDirection = dimensions[corPlane];
        viewUp = [0, 0, 1];
        this.setState({
          neswMetadata: {
            n: 'S',
            s: 'I',
            e: sagFlip ? 'R' : 'L',
            w: sagFlip ? 'L' : 'R',
          },
        });
        break;
      case 'Axial':
        if (axPlane === 0) {
          sliceMode = vtkImageMapper.SlicingMode.I;
        } else if (axPlane === 1) {
          sliceMode = vtkImageMapper.SlicingMode.J;
        } else {
          // already ax
          sliceMode = vtkImageMapper.SlicingMode.K;
        }
        dimensionsOfSliceDirection = dimensions[axPlane];
        viewUp = [0, -1, 0];
        this.setState({
          neswMetadata: {
            n: 'A',
            s: 'P',
            e: sagFlip ? 'R' : 'L',
            w: sagFlip ? 'L' : 'R',
          },
        });
        break;
    }

    // Set source data
    actors.forEach(actor => {
      // Set slice orientation/mode and camera view
      actor.getMapper().setSlicingMode(sliceMode);

      // Set middle slice.
      actor.getMapper().setSlice(Math.floor(dimensionsOfSliceDirection / 2));
    });

    if (labelmapActors) {
      // Set labelmaps
      labelmapActors.forEach(actor => {
        // Set slice orientation/mode and camera view
        actor.getMapper().setSlicingMode(sliceMode);

        // Set middle slice.
        actor.getMapper().setSlice(Math.floor(dimensionsOfSliceDirection / 2));
      });
    }

    // Update slices of labelmaps when source data slice changed
    imageMapper.onModified(() => {
      if (labelmapActors) {
        labelmapActors.forEach(actor => {
          actor.getMapper().setSlice(imageMapper.getSlice());
        });
      }
    });

    // Set up camera

    const camera = this.renderer.getActiveCamera();

    camera.setParallelProjection(true);
    labelmapRenderer.getActiveCamera().setParallelProjection(true);

    // set 2D camera position
    this.setCamera(sliceMode, viewUp, renderer, actorVTKImageData);

    const svgWidgetManager = vtkSVGWidgetManager.newInstance();

    svgWidgetManager.setRenderer(this.renderer);
    svgWidgetManager.setScale(1);

    this.svgWidgetManager = svgWidgetManager;

    // TODO: Not sure why this is necessary to force the initial draw
    this.renderer.resetCamera();
    this.labelmapRenderer.resetCamera();
    this.genericRenderWindow.resize();

    updateCameras();

    this.renderWindow.render();

    const boundUpdateVOI = this.updateVOI.bind(this);
    const boundGetOrienation = this.getOrientation.bind(this);
    const boundSetInteractorStyle = this.setInteractorStyle.bind(this);
    const boundAddSVGWidget = this.addSVGWidget.bind(this);
    const boundGetApiProperty = this.getApiProperty.bind(this);
    const boundSetApiProperty = this.setApiProperty.bind(this);
    const boundSetCamera = this.setCamera.bind(this);
    const boundUpdateImage = this.updateImage.bind(this);
    const boundGetSliceNormal = this.getSliceNormal.bind(this);
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
        sliceMode,
        _component: this,
        updateImage: boundUpdateImage,
        updateVOI: boundUpdateVOI,
        getOrientation: boundGetOrienation,
        setInteractorStyle: boundSetInteractorStyle,
        getSliceNormal: boundGetSliceNormal,
        requestNewSegmentation: boundRequestNewSegmentation,
        setCamera: boundSetCamera,
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

  requestNewSegmentation() {
    this.props.labelmapRenderingOptions.onNewSegmentationRequested();
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
    if (istyle.getImageActor && istyle.getImageActor() !== actors[0]) {
      istyle.setImageActor(actors[0]);
    }
    renderWindow.render();
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

  setCamera(sliceMode, viewUp, renderer, data) {
    const ijk = [0, 0, 0];
    const position = [0, 0, 0];
    const focalPoint = [0, 0, 0];
    data.indexToWorldVec3(ijk, focalPoint);
    ijk[sliceMode] = 1;
    data.indexToWorldVec3(ijk, position);
    renderer.getActiveCamera().set({ focalPoint, position, viewUp });
    renderer.resetCamera();
  }

  getSliceNormal() {
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    const currentIStyle = renderWindow.getInteractor().getInteractorStyle();
    return currentIStyle.getSliceNormal();
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
    const windowCenter = actor.getProperty().getColorLevel();
    const windowWidth = actor.getProperty().getColorWindow();

    return {
      windowCenter,
      windowWidth,
    };
  };

  render() {
    if (!this.props.actors || !this.props.actors.length) {
      return null;
    }

    const style = { width: '100%', height: '100%', position: 'relative' };
    const voi = this.state.voi;

    return (
      <div style={style}>
        <div ref={this.container} style={style} />
        <ViewportOverlay
          {...this.props.dataDetails}
          voi={voi}
          orientation={this.props.orientation}
          neswMetadata={this.state.neswMetadata}
        />
      </div>
    );
  }
}
