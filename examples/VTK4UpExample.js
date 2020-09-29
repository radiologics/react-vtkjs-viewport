import React from 'react';
import { Component } from 'react';
import dcmjs from 'dcmjs';
import {
  View2D,
  View3D,
  getImageData,
  loadImageData,
  vtkInteractorStyleMPRSlice,
} from '@vtk-viewport';
import { api as dicomwebClientApi } from 'dicomweb-client';
import vtkVolume from 'vtk.js/Sources/Rendering/Core/Volume';
import vtkVolumeMapper from 'vtk.js/Sources/Rendering/Core/VolumeMapper';

const url = 'https://server.dcmjs.org/dcm4chee-arc/aets/DCM4CHEE/rs';
const studyInstanceUID =
  '1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046';
const mrSeriesInstanceUID =
  '1.3.12.2.1107.5.2.32.35162.1999123112191238897317963.0.0.0';
const segSeriesInstanceUID =
  '1.3.12.2.1107.5.2.32.35162.1999123112191238897317963.0.0.0';
const searchInstanceOptions = {
  studyInstanceUID,
};

// MR  1.3.12.2.1107.5.2.32.35162.1999123112191238897317963.0.0.0
// SEG 	1.2.276.0.7230010.3.1.3.296485376.8.1542816659.201008

const segURL =
  'https://server.dcmjs.org/dcm4chee-arc/aets/DCM4CHEE/rs/studies/1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046/series/1.2.276.0.7230010.3.1.3.296485376.8.1542816659.201008/instances/1.2.276.0.7230010.3.1.4.296485376.8.1542816659.201009';

function loadDataset(imageIds, displaySetInstanceUid) {
  const imageDataObject = getImageData(imageIds, displaySetInstanceUid);

  loadImageData(imageDataObject);
  return imageDataObject;
}

function createStudyImageIds(baseUrl, studySearchOptions) {
  const SOP_INSTANCE_UID = '00080018';
  const SERIES_INSTANCE_UID = '0020000E';

  const client = new dicomwebClientApi.DICOMwebClient({ url });

  return new Promise((resolve, reject) => {
    client.retrieveStudyMetadata(studySearchOptions).then(instances => {
      const imageIds = instances.map(metaData => {
        const imageId =
          `wadors:` +
          baseUrl +
          '/studies/' +
          studyInstanceUID +
          '/series/' +
          metaData[SERIES_INSTANCE_UID].Value[0] +
          '/instances/' +
          metaData[SOP_INSTANCE_UID].Value[0] +
          '/frames/1';

        window.cornerstoneWADOImageLoader.wadors.metaDataManager.add(
          imageId,
          metaData
        );

        return imageId;
      });

      resolve(imageIds);
    }, reject);
  });
}

const generateSegVolume = async (
  imageDataObject,
  segP10ArrayBuffer,
  imageIds
) => {
  debugger;
  const imagePromises = [];

  const numImages = imageIds.length;
  let processed = 0;

  //
  for (let i = 0; i < imageIds.length; i++) {
    const promise = window.cornerstone.loadAndCacheImage(imageIds[i]);

    imagePromises.push(promise);
  }

  await Promise.all(imagePromises);
  debugger;

  const {
    labelmapBuffer,
    segmentsOnFrame,
  } = dcmjs.adapters.Cornerstone.Segmentation.generateToolState(
    imageIds,
    segP10ArrayBuffer,
    window.cornerstone.metaData
  );

  // Create VTK Image Data with buffer as input
  labelmapDataObject = vtkImageData.newInstance();

  const dataArray = vtkDataArray.newInstance({
    numberOfComponents: 1, // labelmap with single component
    values: new Uint16Array(labelmapBuffer),
  });

  labelmapDataObject.getPointData().setScalars(dataArray);
  labelmapDataObject.setDimensions(...imageDataObject.dimensions);
  labelmapDataObject.setSpacing(...imageDataObject.vtkImageData.getSpacing());
  labelmapDataObject.setOrigin(...imageDataObject.vtkImageData.getOrigin());
  labelmapDataObject.setDirection(
    ...imageDataObject.vtkImageData.getDirection()
  );

  // Cache the labelmap volume.
  return labelmapDataObject;
};

function fetchSegArrayBuffer(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    console.log(`fetching: ${url}`);

    xhr.onload = () => {
      debugger;
      console.log(`Request returned, status: ${xhr.status}`);
      if (xhr.status === 200) {
        resolve(xhr.response);
      } else {
        resolve(null);
      }
    };

    xhr.onerror = () => {
      console.log(`Request returned, status: ${xhr.status}`);
      reject(xhr.responseText);
    };

    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.send();
  });
}

const fetchSeg = () => {
  return new Promise(resolve => {
    const oReq = new XMLHttpRequest();

    // Add event listeners for request failure
    oReq.addEventListener('error', error => {
      console.warn('An error occurred while retrieving the data');
      reject(error);
    });

    // When the JSON has been returned, parse it into a JavaScript Object
    // and render the OHIF Viewer with this data
    oReq.addEventListener('load', event => {
      debugger;
      resolve(oReq.response);
    });

    // Open the Request to the server for the JSON data
    // In this case we have a server-side route called /api/
    // which responds to GET requests with the study data
    console.log(`Sending Request to: ${segURL}`);
    oReq.open('GET', segURL);
    oReq.responseType = 'arraybuffer';

    // Fire the request to the server
    oReq.send();
  });
};

class VTK4UPExample extends Component {
  state = {
    volumes: [],
  };

  async componentDidMount() {
    this.apis = [];

    const imageIds = await createStudyImageIds(url, searchInstanceOptions);

    let mrImageIds = imageIds.filter(imageId =>
      imageId.includes(mrSeriesInstanceUID)
    );

    const mrImageDataObject = loadDataset(mrImageIds, 'mrDisplaySet');

    debugger;

    const seg = await fetchSegArrayBuffer(segURL);

    const segVol = await generateSegVolume(mrImageDataObject, seg, mrImageIds);

    debugger;

    const onAllPixelDataInsertedCallback = () => {
      const mrImageData = mrImageDataObject.vtkImageData;

      const range = mrImageData
        .getPointData()
        .getScalars()
        .getRange();

      const mapper = vtkVolumeMapper.newInstance();
      const mrVol = vtkVolume.newInstance();
      const rgbTransferFunction = mrVol.getProperty().getRGBTransferFunction(0);

      mapper.setInputData(mrImageData);
      mapper.setMaximumSamplesPerRay(2000);
      rgbTransferFunction.setRange(range[0], range[1]);
      mrVol.setMapper(mapper);

      this.setState({
        volumes: [mrVol],
      });
    };

    mrImageDataObject.onAllPixelDataInserted(onAllPixelDataInsertedCallback);
  }

  storeApi = viewportIndex => {
    return api => {
      this.apis[viewportIndex] = api;

      const apis = this.apis;
      const renderWindow = api.genericRenderWindow.getRenderWindow();

      const istyle = vtkInteractorStyleMPRSlice.newInstance();

      // add istyle
      api.setInteractorStyle({
        istyle,
      });

      // set blend mode to MIP.
      const mapper = api.volumes[0].getMapper();
      if (mapper.setBlendModeToMaximumIntensity) {
        mapper.setBlendModeToMaximumIntensity();
      }

      api.setSlabThickness(0.1);

      renderWindow.render();
    };
  };

  handleSlabThicknessChange(evt) {
    const value = evt.target.value;
    const valueInMM = value / 10;
    const apis = this.apis;

    apis.forEach(api => {
      const renderWindow = api.genericRenderWindow.getRenderWindow();

      api.setSlabThickness(valueInMM);
      renderWindow.render();
    });
  }

  render() {
    if (!this.state.volumes || !this.state.volumes.length) {
      return <h4>Loading...</h4>;
    }

    return (
      <>
        <div className="row">
          <div className="col-xs-4">
            <p>This example demonstrates how to use the 4up manipulator.</p>
            <label htmlFor="set-slab-thickness">SlabThickness: </label>
            <input
              id="set-slab-thickness"
              type="range"
              name="points"
              min="1"
              max="5000"
              onChange={this.handleSlabThicknessChange.bind(this)}
            />
          </div>
        </div>
        <div className="row">
          {/**
                  <div className="col-sm-4">
            <View2D
              volumes={this.state.volumes}
              onCreated={this.storeApi(0)}
              orientation={{ sliceNormal: [0, 1, 0], viewUp: [0, 0, 1] }}
            />
          </div>


        */}

          <div className="col-sm-4">
            <View2D
              volumes={this.state.volumes}
              onCreated={this.storeApi(1)}
              orientation={{ sliceNormal: [1, 0, 0], viewUp: [0, 0, 1] }}
            />
          </div>
          {/**
                    <div className="col-sm-4">
            <View2D
              volumes={this.state.volumes}
              onCreated={this.storeApi(2)}
              orientation={{ sliceNormal: [0, 0, 1], viewUp: [0, -1, 0] }}
            />
          </div>
          <div className="col-sm-4">
            <View2D
              volumes={this.state.volumes}
              onCreated={this.storeApi(3)}
              orientation={{ sliceNormal: [0, 0, 1], viewUp: [0, -1, 0] }}
            />
          </div>

          */}
        </div>
      </>
    );
  }
}

export default VTK4UPExample;
