import React from 'react';
import { Component } from 'react';
import dcmjs from 'dcmjs';
import {
  View2DImageMapper,
  View3D,
  getImageData,
  loadImageData,
  vtkInteractorStyleMPRSlice,
} from '@vtk-viewport';
import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper';
import vtkImageSlice from 'vtk.js/Sources/Rendering/Core/ImageSlice';
import { api as dicomwebClientApi } from 'dicomweb-client';
import vtkVolume from 'vtk.js/Sources/Rendering/Core/Volume';
import vtkVolumeMapper from 'vtk.js/Sources/Rendering/Core/VolumeMapper';
import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import cornerstoneTools from 'cornerstone-tools';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from 'vtk.js/Sources/Common/DataModel/PiecewiseFunction';

const segmentationModule = cornerstoneTools.getModule('segmentation');

const url = 'https://server.dcmjs.org/dcm4chee-arc/aets/DCM4CHEE/rs';
const studyInstanceUID =
  '1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046';
const mrSeriesInstanceUID =
  '1.3.12.2.1107.5.2.32.35162.1999123112191238897317963.0.0.0';
// const segSeriesInstanceUID =
//   '1.3.12.2.1107.5.2.32.35162.1999123112191238897317963.0.0.0';
const searchInstanceOptions = {
  studyInstanceUID,
};

// MR  1.3.12.2.1107.5.2.32.35162.1999123112191238897317963.0.0.0
// SEG 	1.2.276.0.7230010.3.1.3.296485376.8.1542816659.201008

const segURL = `${window.location.origin}/brainSeg/brainSeg.dcm`;

// const segURL =
//   'https://server.dcmjs.org/dcm4chee-arc/aets/DCM4CHEE/rs/studies/1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046/series/1.2.276.0.7230010.3.1.3.296485376.8.1542816659.201008/instances/1.2.276.0.7230010.3.1.4.296485376.8.1542816659.201009';

function loadDataset(imageIds, displaySetInstanceUid) {
  const imageDataObject = getImageData(imageIds, displaySetInstanceUid);

  loadImageData(imageDataObject);
  return imageDataObject;
}

function makeLabelMapColorTransferFunction(lablemapColorLUT) {
  const labelMap = {
    cfun: vtkColorTransferFunction.newInstance(),
    ofun: vtkPiecewiseFunction.newInstance(),
  };

  // labelmap pipeline
  labelMap.ofun.addPointLong(0, 0, 0.5, 1.0);
  labelMap.ofun.addPointLong(1, 1.0, 0.5, 1.0);

  buildColorTransferFunction(labelMap, lablemapColorLUT, 1.0);

  return labelMap;
}

const buildColorTransferFunction = (labelmap, colorLUT, opacity) => {
  // TODO -> It seems to crash if you set it higher than 256??
  const numColors = Math.min(256, colorLUT.length);

  // This commented out code will read the actual labelmap values, but we have one (?) volume

  // for (let i = 0; i < numColors; i++) {
  //   //for (let i = 0; i < colorLUT.length; i++) {
  //   const color = colorLUT[i];
  //   labelmap.cfun.addRGBPoint(
  //     i,
  //     color[0] / 255,
  //     color[1] / 255,
  //     color[2] / 255
  //   );

  //   // Set the opacity per label.
  //   const segmentOpacity = (color[3] / 255) * opacity;
  //   labelmap.ofun.addPointLong(i, segmentOpacity, 0.5, 1.0);
  // }

  labelmap.cfun.addRGBPoint(1, 1, 0, 0); // label '1' will be red
  labelmap.ofun.addPointLong(1, 1.0, 0.5, 1.0); // All labels full opacity
};

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
  const imagePromises = [];

  //Fetch images with cornerstone just to cache the metadata needed to format the SEG.
  for (let i = 0; i < imageIds.length; i++) {
    const promise = window.cornerstone.loadAndCacheImage(imageIds[i]);

    imagePromises.push(promise);
  }

  await Promise.all(imagePromises);

  // Use dcmjs to extract a labelmap from the SEG.
  const {
    labelmapBuffer,
  } = dcmjs.adapters.Cornerstone.Segmentation.generateToolState(
    imageIds,
    segP10ArrayBuffer,
    window.cornerstone.metaData
  );

  // Create VTK Image Data with buffer as input
  const labelmapDataObject = vtkImageData.newInstance();

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

  const labelmapColorLUT = segmentationModule.state.colorLutTables[0];

  // Cache the labelmap volume.
  return { labelmapDataObject, labelmapColorLUT };
};

async function fetchSegArrayBuffer(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    console.log(`fetching: ${url}`);

    xhr.onload = () => {
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

class VTK4UPExample extends Component {
  state = {
    imageMappers: [],
  };

  async componentDidMount() {
    this.apis = [];

    const imageIds = await createStudyImageIds(url, searchInstanceOptions);

    let mrImageIds = imageIds.filter(imageId =>
      imageId.includes(mrSeriesInstanceUID)
    );

    // Sort the imageIds so the SEG is allocated correctly.
    mrImageIds.sort((imageIdA, imageIdB) => {
      const imagePlaneA = cornerstone.metaData.get(
        'imagePlaneModule',
        imageIdA
      );
      const imagePlaneB = cornerstone.metaData.get(
        'imagePlaneModule',
        imageIdB
      );

      return (
        imagePlaneA.imagePositionPatient[0] -
        imagePlaneB.imagePositionPatient[0]
      );
    });

    const mrImageDataObject = loadDataset(mrImageIds, 'mrDisplaySet');

    // As we are using an image mapper, set the direction to upright rather than correctly oriented in 3D.

    // Note: You may have to work out which direction to set in OHIF.
    // Also for the views I and J are in plane, and K is out of plane.
    // This demo data is sagittal, you may have to perform some logic on scans to put then in
    // The correct slots for a 4 Up
    mrImageDataObject.vtkImageData.setDirection(
      ...[1, 0, 0],
      ...[0, -1, 0],
      ...[0, 0, -1]
    );

    const seg = await fetchSegArrayBuffer(segURL);

    const { labelmapDataObject, labelmapColorLUT } = await generateSegVolume(
      mrImageDataObject,
      seg,
      mrImageIds
    );

    const onAllPixelDataInsertedCallback = () => {
      // MR
      /////// Replace with image mapping. ///////

      // Use one dataset, and 3 actors/mappers for the 3 different views
      const mrImageData = mrImageDataObject.vtkImageData;

      const range = mrImageData
        .getPointData()
        .getScalars()
        .getRange();

      const windowWidth = Math.abs(range[1] - range[0]);
      const windowLevel = range[0] + windowWidth / 2;

      // I
      const imageMapperI = vtkImageMapper.newInstance();
      const imageActorI = vtkImageSlice.newInstance();

      imageMapperI.setInputData(mrImageData);
      imageActorI.setMapper(imageMapperI);

      imageActorI.getProperty().setColorWindow(windowWidth);
      imageActorI.getProperty().setColorLevel(windowLevel);

      // J
      const imageMapperJ = vtkImageMapper.newInstance();
      const imageActorJ = vtkImageSlice.newInstance();

      imageMapperJ.setInputData(mrImageData);
      imageActorJ.setMapper(imageMapperJ);

      imageActorJ.getProperty().setColorWindow(windowWidth);
      imageActorJ.getProperty().setColorLevel(windowLevel);

      // K
      const imageMapperK = vtkImageMapper.newInstance();
      const imageActorK = vtkImageSlice.newInstance();

      imageMapperK.setInputData(mrImageData);
      imageActorK.setMapper(imageMapperK);

      imageActorK.getProperty().setColorWindow(windowWidth);
      imageActorK.getProperty().setColorLevel(windowLevel);

      ///////

      // SEG

      const segRange = labelmapDataObject
        .getPointData()
        .getScalars()
        .getRange();

      const segMapper = vtkVolumeMapper.newInstance();
      const segVol = vtkVolume.newInstance();

      const labelmapTransferFunctions = makeLabelMapColorTransferFunction(
        labelmapColorLUT
      );

      const rgbTransferFunctionSeg = segVol
        .getProperty()
        .getRGBTransferFunction(0);

      segVol
        .getProperty()
        .setRGBTransferFunction(0, labelmapTransferFunctions.cfun);
      segVol.getProperty().setScalarOpacity(0, labelmapTransferFunctions.ofun);
      segMapper.setInputData(labelmapDataObject);
      segMapper.setMaximumSamplesPerRay(2000);
      rgbTransferFunctionSeg.setRange(segRange[0], segRange[1]);
      segVol.setMapper(segMapper);

      this.setState({
        imageActors: { I: imageActorI, J: imageActorI, K: imageActorK },
        volumeRenderingVolumes: [segVol],
        paintFilterLabelMapImageData: labelmapDataObject,
        paintFilterBackgroundImageData: mrImageDataObject.vtkImageData,
        labelmapColorLUT,
      });
    };

    mrImageDataObject.onAllPixelDataInserted(onAllPixelDataInsertedCallback);
  }

  storeApi = (viewportIndex, type) => {
    return api => {
      this.apis[viewportIndex] = api;

      if (type === '2D') {
        // TODO: Set new options if we need them for this type.
        //
        // const renderWindow = api.genericRenderWindow.getRenderWindow();
        // const istyle = vtkInteractorStyleMPRSlice.newInstance();
        // // add istyle
        // api.setInteractorStyle({
        //   istyle,
        // });
        // renderWindow.render();
      }
    };
  };

  render() {
    if (
      !this.state.imageActors ||
      !this.state.volumeRenderingVolumes ||
      !this.state.volumeRenderingVolumes.length
    ) {
      return <h4>Loading...</h4>;
    }

    debugger;

    // Get labelmap rendering config
    const { configuration } = segmentationModule;

    return (
      <>
        <div className="row">
          <div className="col-sm-4">
            <View2DImageMapper
              actors={[this.state.imageActors.I]}
              onCreated={this.storeApi(0, '2D')}
              orientation={'I'}
            />
          </div>
          <div className="col-sm-4">
            <View2DImageMapper
              actors={[this.state.imageActors.J]}
              onCreated={this.storeApi(1, '2D')}
              orientation={'J'}
            />
          </div>
        </div>
        <div className="row">
          <div className="col-sm-4">
            <View2DImageMapper
              actors={[this.state.imageActors.K]}
              onCreated={this.storeApi(2, '2D')}
              orientation={'K'}
            />
          </div>
          {/** 3D  View*/}
          <div className="col-sm-4">
            <View3D
              volumes={this.state.volumeRenderingVolumes}
              onCreated={this.storeApi(3, '3D')}
            />
          </div>
        </div>
      </>
    );
  }
}

/** // Old View2D props
paintFilterLabelMapImageData={
  this.state.paintFilterLabelMapImageData
}
paintFilterBackgroundImageData={
  this.state.paintFilterBackgroundImageData
}
labelmapRenderingOptions={{
  colorLUT: this.state.labelmapColorLUT,
  globalOpacity: configuration.fillAlpha,
  visible: configuration.renderFill,
  outlineThickness: configuration.outlineWidth,
  renderOutline: configuration.renderOutline,
  segmentsDefaultProperties: [], // Its kinda dumb that this needs to be present.
}}
*/

export default VTK4UPExample;
