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
import vtkCutter from 'vtk.js/Sources/Filters/Core/Cutter';
import vtkPlane from 'vtk.js/Sources/Common/DataModel/Plane';
import vtkProperty from 'vtk.js/Sources/Rendering/Core/Property';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkBoundingBox from 'vtk.js/Sources/Common/DataModel/BoundingBox';
import vtkTubeFilter from 'vtk.js/Sources/Filters/General/TubeFilter';

export default class View2DImageMapper extends Component {
  static propTypes = {
    actors: PropTypes.array,
    stlPolyData: PropTypes.array,
    colors: PropTypes.array,
    labelmapActors: PropTypes.object,
    dataDetails: PropTypes.object,
    onCreated: PropTypes.func,
    onDestroyed: PropTypes.func,
    orientation: PropTypes.string.isRequired,
    orientationName: PropTypes.string,
    labelmapRenderingOptions: PropTypes.object,
    planeMap: PropTypes.object,
    onUpdateSTLConfig: PropTypes.func,
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
      freezeSlice: false,
    };
    this.apiProperties = {};
    this.resetCutActorsCache();
  }

  resetCutActorsCache() {
    this.cutActorsCache = {};
    [
      vtkImageMapper.SlicingMode.I,
      vtkImageMapper.SlicingMode.J,
      vtkImageMapper.SlicingMode.K,
    ].forEach(mode => (this.cutActorsCache[mode] = {}));
  }

  setupActors(actors, labelmapActorsArray, imageMapper, slice, sliceMode) {
    // Set source data
    actors.forEach(actor => {
      // Set slice orientation/mode and camera view
      actor.getMapper().setSlicingMode(sliceMode);

      // Set middle slice.
      actor.getMapper().setSlice(slice);
    });

    this.replaceCutActors();

    // if (labelmapActorsArray) {
    //   // Set labelmaps
    //   labelmapActorsArray.forEach(actor => {
    //     // Set slice orientation/mode and camera view
    //     actor.getMapper().setSlicingMode(sliceMode);

    //     // Set middle slice.
    //     actor.getMapper().setSlice(slice);
    //   });
    // }

    // Update slices of labelmaps when source data slice changed
    imageMapper.onModified(() => {
      const slice = imageMapper.getSlice();
      this.setState({
        slice,
      });
      this.replaceCutActors();
      // if (labelmapActorsArray) {
      //   labelmapActorsArray.forEach(actor => {
      //     actor.getMapper().setSlice(slice);
      //   });
      // }
    });
  }

  replaceCutActors() {
    if (this.cutActors && this.cutActors.length > 0) {
      this.cutActors.forEach(this.renderer.removeActor);
    }

    this.cutActors = [];
    if (this.props.stlPolyData) {
      const { sliceMode } = this.state;
      const sliceCenter = vtkBoundingBox.getCenter(
        this.props.actors[0].getMapper().getBoundsForSlice()
      );
      if (this.cutActorsCache[sliceMode][sliceCenter]) {
        this.cutActors = this.cutActorsCache[sliceMode][sliceCenter];
      } else {
        let normal = [1, 0, 0];
        switch (sliceMode) {
          case vtkImageMapper.SlicingMode.I:
            normal = [1, 0, 0];
            break;
          case vtkImageMapper.SlicingMode.J:
            normal = [0, 1, 0];
            break;
          case vtkImageMapper.SlicingMode.K:
            normal = [0, 0, 1];
            break;
        }

        this.props.stlPolyData.forEach((polyData, i) => {
          const plane = vtkPlane.newInstance();
          plane.setOrigin(sliceCenter);
          plane.setNormal(...normal);
          const cutter = vtkCutter.newInstance();
          cutter.setCutFunction(plane);
          cutter.setInputData(polyData);
          const tubeFilter = vtkTubeFilter.newInstance();
          tubeFilter.setInputConnection(cutter.getOutputPort());
          tubeFilter.setCapping(false);
          tubeFilter.setNumberOfSides(50);
          tubeFilter.setRadius(1);
          const cutMapper = vtkMapper.newInstance();
          cutMapper.setInputConnection(tubeFilter.getOutputPort());
          const cutActor = vtkActor.newInstance();
          cutActor.setMapper(cutMapper);
          const cutProperty = cutActor.getProperty();
          cutProperty.setRepresentation(vtkProperty.Representation.SURFACE);
          cutProperty.setLighting(false);
          cutProperty.setColor(...this.props.colors[i].map(c => c / 255));
          cutProperty.setOpacity(this.props.colors[i][3] / 255);
          this.cutActors.push(cutActor);
        });
        this.cutActorsCache[sliceMode][sliceCenter] = [...this.cutActors];
      }

      this.cutActors.forEach(this.renderer.addActor);
      this.updateImage();
    }
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
    const { orientation, planeMap, actors } = this.props;

    let sliceMode;
    switch (planeMap[orientation].plane) {
      case 0:
        sliceMode = vtkImageMapper.SlicingMode.I;
        break;
      case 1:
        sliceMode = vtkImageMapper.SlicingMode.J;
        break;
      case 2:
        sliceMode = vtkImageMapper.SlicingMode.K;
        break;
    }
    const labelmapActorsArray = this.props.labelmapActors
      ? this.props.labelmapActors[sliceMode]
      : [];

    const renderer = this.genericRenderWindow.getRenderer();
    this.renderer = renderer;
    this.renderWindow = this.genericRenderWindow.getRenderWindow();
    const oglrw = this.genericRenderWindow.getOpenGLRenderWindow();

    // Add labelmap only renderer so we can interact with source data
    // this.labelmapRenderer = vtkRenderer.newInstance();
    // const labelmapRenderer = this.labelmapRenderer;
    // this.renderWindow.addRenderer(labelmapRenderer);
    // this.renderWindow.setNumberOfLayers(2);
    // labelmapRenderer.setLayer(1);
    // labelmapRenderer.setInteractive(false);

    // update view node tree so that vtkOpenGLHardwareSelector can access
    // the vtkOpenGLRenderer instance.
    oglrw.buildPass(true);

    const iStyle = vtkInteractorStyleImage.newInstance();
    iStyle.setInteractionMode('IMAGE_SLICING');
    this.renderWindow.getInteractor().setInteractorStyle(iStyle);

    const inter = this.renderWindow.getInteractor();
    this.updateCameras = function() {
      const baseCamera = this.renderer.getActiveCamera();
      // const labelmapCamera = this.labelmapRenderer.getActiveCamera();

      // const position = baseCamera.getReferenceByName('position');
      // const focalPoint = baseCamera.getReferenceByName('focalPoint');
      // const viewUp = baseCamera.getReferenceByName('viewUp');
      // const viewAngle = baseCamera.getReferenceByName('viewAngle');
      // const parallelScale = baseCamera.getParallelScale();

      // labelmapCamera.set({
      //   position,
      //   focalPoint,
      //   viewUp,
      //   viewAngle,
      //   parallelScale,
      // });

      if (!this.state.freezeSlice) {
        this.props.actors.forEach(actor => {
          actor.getMapper().setSliceFromCamera(baseCamera);
        });
      }
    }.bind(this);

    // TODO unsubscribe from this before component unmounts.
    inter.onAnimation(this.updateCameras);

    this.widgetManager.disablePicking();
    this.widgetManager.setRenderer(renderer);
    const svgWidgetManager = vtkSVGWidgetManager.newInstance();
    svgWidgetManager.setRenderer(this.renderer);
    svgWidgetManager.setScale(1);
    this.svgWidgetManager = svgWidgetManager;

    // Add all actors to renderer
    actors.forEach(renderer.addActor);
    if (labelmapActorsArray) {
      labelmapActorsArray.forEach(renderer.addActor);
    }

    const imageActor = actors[0];
    imageActor.onModified(() => {
      this.updateImage();
    });
    const imageMapper = imageActor.getMapper();
    const actorVTKImageData = imageMapper.getInputData();
    const dimensions = actorVTKImageData.getDimensions();

    const dimensionsOfSliceDirection = dimensions[planeMap[orientation].plane];
    const slice = Math.floor(dimensionsOfSliceDirection / 2);
    const flipped = planeMap[orientation].flip;

    let viewUp, neswMetadata;
    // Use orientation to set viewUp and N/S/E/W overlay
    switch (orientation) {
      case 'Sagittal':
        viewUp = [0, 0, 1];
        neswMetadata = {
          n: 'S',
          s: 'I',
          e: 'P',
          w: 'A',
        };
        break;
      case 'Coronal':
        viewUp = [0, 0, 1];
        neswMetadata = {
          n: 'S',
          s: 'I',
          e: 'R',
          w: 'L',
        };
        break;
      case 'Axial':
        viewUp = [0, -1, 0];
        neswMetadata = {
          n: 'A',
          s: 'P',
          e: 'R',
          w: 'L',
        };
        break;
    }

    // Set up camera
    const camera = this.renderer.getActiveCamera();

    camera.setParallelProjection(true);
    //labelmapRenderer.getActiveCamera().setParallelProjection(true);

    // set 2D camera position
    this.setCamera(sliceMode, flipped, viewUp, renderer, actorVTKImageData);

    this.setupActors(
      actors,
      labelmapActorsArray,
      imageMapper,
      slice,
      sliceMode
    );

    this.setState({
      slice,
      neswMetadata,
      sliceMode,
    });

    // TODO: Not sure why this is necessary to force the initial draw
    renderer.resetCamera();
    //labelmapRenderer.resetCamera();

    this.updateCameras();

    this.genericRenderWindow.resize();
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
    const boundUpdateSegmentationConfig = this.updateSegmentationConfig.bind(
      this
    );
    const boundUpdateSTLConfig = this.updateSTLConfig.bind(this);
    const boundSetFreezeSlice = this.setFreezeSlice.bind(this);

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
        updateSegmentationConfig: boundUpdateSegmentationConfig,
        updateSTLConfig: boundUpdateSTLConfig,
        setCamera: boundSetCamera,
        get: boundGetApiProperty,
        set: boundSetApiProperty,
        setFreezeSlice: boundSetFreezeSlice,
        type: 'VIEW2D',
      };

      this.props.onCreated(api);
    }
  }

  componentDidUpdate(prevProps) {
    const { slice, sliceMode } = this.state;
    const { actors, labelmapActors, stlPolyData, colors } = this.props;
    let updated = false;
    const renderer = this.renderer;
    if (actors !== prevProps.actors) {
      prevProps.actors.forEach(renderer.removeActor);
      actors.forEach(renderer.addActor);
      updated = true;
    }
    const imageMapper = actors[0].getMapper();
    const labelmapActorsArrayOld = prevProps.labelmapActors
      ? prevProps.labelmapActors[sliceMode]
      : [];
    const labelmapActorsArray = labelmapActors ? labelmapActors[sliceMode] : [];
    if (
      labelmapActorsArrayOld !== labelmapActorsArray &&
      (labelmapActorsArray.length > 0 || labelmapActorsArrayOld.length > 0)
    ) {
      if (labelmapActorsArrayOld) {
        labelmapActorsArrayOld.forEach(renderer.removeActor);
      }
      labelmapActorsArray.forEach(renderer.addActor);
      updated = true;
    }
    if (
      stlPolyData !== prevProps.stlPolyData &&
      (stlPolyData.length > 0 || prevProps.stlPolyData.length > 0)
    ) {
      updated = true;
    }
    if (colors !== prevProps.colors) {
      this.resetCutActorsCache();
      this.replaceCutActors();
    }

    if (updated) {
      this.setupActors(
        actors,
        labelmapActorsArray,
        imageMapper,
        slice,
        sliceMode
      );
      renderer.resetCamera();
      //this.labelmapRenderer.resetCamera();
      this.genericRenderWindow.resize();
      this.updateCameras();
      this.updateImage();
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

  updateSegmentationConfig() {
    this.props.labelmapRenderingOptions.onUpdateSegmentationConfig();
  }

  updateSTLConfig() {
    this.props.onUpdateSTLConfig();
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
    const actors = this.props.actors;
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    actors.forEach(actor => {
      actor.getProperty().setColorWindow(windowWidth);
      actor.getProperty().setColorLevel(windowCenter);
    });
    renderWindow.render();
    this.setState({ voi: { windowWidth, windowCenter } });
  }

  getOrientation() {
    return this.props.orientation;
  }

  setCamera(sliceMode, flipped, viewUp, renderer, data) {
    const ijk = [0, 0, 0];
    const position = [0, 0, 0];
    const focalPoint = [0, 0, 0];
    data.indexToWorldVec3(ijk, focalPoint);
    ijk[sliceMode] = flipped ? -1 : 1;
    data.indexToWorldVec3(ijk, position);
    renderer.getActiveCamera().set({ focalPoint, position, viewUp });
    renderer.resetCamera();
  }

  getSliceNormal() {
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    const currentIStyle = renderWindow.getInteractor().getInteractorStyle();
    return currentIStyle.getSliceNormal();
  }

  setFreezeSlice(freezeSlice) {
    this.setState({ freezeSlice });
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
          slice={this.state.slice}
        />
      </div>
    );
  }
}
