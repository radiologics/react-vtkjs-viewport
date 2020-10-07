import React, { Component } from 'react';
import PropTypes from 'prop-types';
import vtkGenericRenderWindow from 'vtk.js/Sources/Rendering/Misc/GenericRenderWindow';
import vtkWidgetManager from 'vtk.js/Sources/Widgets/Core/WidgetManager';

import ViewportOverlay from '../ViewportOverlay/ViewportOverlay.js';
import { createSub } from '../lib/createSub.js';

export default class View3DMarchingCubes extends Component {
  static propTypes = {
    volumes: PropTypes.array,
    onCreated: PropTypes.func,
    onDestroyed: PropTypes.func,
    dataDetails: PropTypes.object,
  };

  static defaultProps = {
    painting: false,
    sliceNormal: [0, 0, 1],
    labelmapRenderingOptions: {
      visible: true,
      renderOutline: false,
    },
  };

  constructor(props) {
    super(props);

    this.genericRenderWindow = null;
    this.widgetManager = vtkWidgetManager.newInstance();
    this.container = React.createRef();
    this.subs = {
      interactor: createSub(),
    };
  }

  componentDidMount() {
    this.genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0, 0, 0],
    });

    this.genericRenderWindow.setContainer(this.container.current);

    let volumes = [];

    this.renderer = this.genericRenderWindow.getRenderer();
    this.renderWindow = this.genericRenderWindow.getRenderWindow();

    this.widgetManager.disablePicking();
    this.widgetManager.setRenderer(this.renderer);

    // trigger pipeline update
    this.componentDidUpdate({});

    if (this.props.volumes) {
      volumes = volumes.concat(this.props.volumes);
    }

    this.renderer.resetCamera();
    this.renderer.updateLightsGeometryToFollowCamera();

    // TODO: Not sure why this is necessary to force the initial draw
    this.genericRenderWindow.resize();

    if (this.props.onCreated) {
      /**
       * Note: The contents of this Object are
       * considered part of the API contract
       * we make with consumers of this component.
       */
      const api = {
        genericRenderWindow: this.genericRenderWindow,
        widgetManager: this.widgetManager,
        container: this.container.current,
        volumes,
        type: 'VIEW3D',
        _component: this, // Backdoor still open for now whilst the API isn't as mature as View2D.
      };

      this.props.onCreated(api);
    }
  }

  componentDidUpdate(prevProps) {
    console.time('View3DMarchingCubes componentDidUpdate');
    if (prevProps.volumes !== this.props.volumes) {
      this.props.volumes.forEach(volume => {
        if (!volume.isA('vtkVolume')) {
          console.warn('Data to <View3DMarchingCubes> is not vtkVolume data');
        }
        volume.getProperty().setShade(true);
        volume.getProperty().setAmbient(0.2);
        volume.getProperty().setDiffuse(0.7);
        volume.getProperty().setSpecular(0.3);
        volume.getProperty().setSpecularPower(8.0);
      });

      if (this.props.volumes.length) {
        this.props.volumes.forEach(this.renderer.addVolume);
      } else {
        // TODO: Remove all volumes
      }

      this.renderWindow.render();
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

  render() {
    if (!this.props.volumes) {
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
