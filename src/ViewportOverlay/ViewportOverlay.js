import { PureComponent } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import { helpers } from '../helpers/index.js';
import './ViewportOverlay.css';

const {
  formatPN,
  formatDA,
  formatNumberPrecision,
  formatTM,
  isValidNumber,
} = helpers;

class ViewportOverlay extends PureComponent {
  static propTypes = {
    voi: PropTypes.object.isRequired,
    orientation: PropTypes.string,
    rotation: PropTypes.object,
    neswMetadata: PropTypes.object,
    slice: PropTypes.number,
    studyDate: PropTypes.string,
    studyTime: PropTypes.string,
    studyDescription: PropTypes.string,
    patientName: PropTypes.string,
    patientId: PropTypes.string,
    seriesNumber: PropTypes.string,
    seriesDescription: PropTypes.string,
  };

  static defaultProps = {
    voi: {
      windowWidth: 0,
      windowCenter: 0,
    },
    neswMetadata: {
      n: '',
      s: '',
      e: '',
      w: '',
    },
  };

  render() {
    const {
      studyDate,
      studyTime,
      studyDescription,
      patientName,
      patientId,
      seriesNumber,
      seriesDescription,
      voi,
      orientation,
      rotation,
      neswMetadata,
      slice,
    } = this.props;
    const { windowWidth, windowCenter } = voi;
    const wwwc = `W: ${windowWidth.toFixed(0)} L: ${windowCenter.toFixed(0)}`;
    const rotationString = rotation
      ? `\u03B8: ${rotation.theta.toFixed(1)} \u03D5: ${rotation.phi.toFixed(
          1
        )}`
      : null;

    const sliceNumber = typeof slice === 'number' ? `Slice ${slice}` : '';

    return (
      <div className="ViewportOverlay">
        <div className="top-left overlay-element">
          <div>{formatPN(patientName)}</div>
          <div>{patientId}</div>
        </div>
        <div className="top-center overlay-element">
          <div>{neswMetadata.n}</div>
        </div>
        <div className="top-right overlay-element">
          <div>{studyDescription}</div>
          <div>
            {formatDA(studyDate)} {formatTM(studyTime)}
          </div>
        </div>
        <div className="center-left overlay-element">
          <div>{neswMetadata.w}</div>
        </div>
        <div className="center-right overlay-element">
          <div>{neswMetadata.e}</div>
        </div>
        <div className="bottom-right overlay-element">
          <div>{wwwc}</div>
          <div>{rotationString}</div>
          <div>{orientation}</div>
          <div>{sliceNumber}</div>
        </div>
        <div className="bottom-center overlay-element">
          <div>{neswMetadata.s}</div>
        </div>
        <div className="bottom-left overlay-element">
          <div>{seriesNumber >= 0 ? `Ser: ${seriesNumber}` : ''}</div>
          <div>
            <div>{seriesDescription}</div>
          </div>
        </div>
      </div>
    );
  }
}

export default ViewportOverlay;
