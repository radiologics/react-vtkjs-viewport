import React from 'react';
import { Component } from 'react';
import dcmjs from 'dcmjs';
import {
  View2DImageMapper,
  View3DMarchingCubes,
  vtkInteractorStyle3D4UpCrosshairs,
  vtkInteractorStyle2D4UpCrosshairs,
  vtkInteractorStyleImagePanZoom,
} from '@vtk-viewport';
import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper';
import vtkImageSlice from 'vtk.js/Sources/Rendering/Core/ImageSlice';
import vtkImageMarchingCubes from 'vtk.js/Sources/Filters/General/ImageMarchingCubes';
import { api as dicomwebClientApi } from 'dicomweb-client';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import cornerstoneTools from 'cornerstone-tools';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from 'vtk.js/Sources/Common/DataModel/PiecewiseFunction';
import vtkImageOutlineFilter from 'vtk.js/Sources/Filters/General/ImageOutlineFilter';

const segmentationModule = cornerstoneTools.getModule('segmentation');

// MR  1.3.12.2.1107.5.2.32.35162.1999123112191238897317963.0.0.0
// SEG 	1.2.276.0.7230010.3.1.3.296485376.8.1542816659.201008

const segURL = `${window.location.origin}/dicoms/brainSeg.dcm`;
const seg2URL = `${window.location.origin}/dicoms/rightEyeSeg.dcm`;
const dicomPath = `${window.location.origin}/dicoms`;

// const segURL =
//   'https://server.dcmjs.org/dcm4chee-arc/aets/DCM4CHEE/rs/studies/1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046/series/1.2.276.0.7230010.3.1.3.296485376.8.1542816659.201008/instances/1.2.276.0.7230010.3.1.4.296485376.8.1542816659.201009';

function loadDataset(images) {
  const width = images[0].width;
  const height = images[0].height;
  const depth = images.length;

  const spacingXZ = images[0].data.string('x00280030');
  const spacingX = spacingXZ.split('\\')[0];
  const spacingZ = spacingXZ.split('\\')[1];
  const spacingY = images[0].data.string('x00180050');

  var pixelDatas = images.map(image => {
    return image.getPixelData();
  });
  var pixelData = [];
  pixelDatas.map(data => {
    pixelData = pixelData.concat([...data]);
  });
  var pixelData = new Uint16Array(pixelData);

  const dataArray = vtkDataArray.newInstance({
    values: pixelData,
  });
  const imageData = vtkImageData.newInstance();
  imageData.getPointData().setScalars(dataArray);
  imageData.setDimensions([width, height, depth]);
  imageData.setSpacing(Number(spacingX), Number(spacingZ), Number(spacingY));

  return { vtkImageData: imageData, dimensions: [width, height, depth] };
}

function makeLabelMapColorTransferFunction(lablemapColorLUT, color) {
  const labelMap = {
    cfun: vtkColorTransferFunction.newInstance(),
    ofun: vtkPiecewiseFunction.newInstance(),
  };

  // labelmap pipeline
  labelMap.ofun.addPointLong(0, 0, 0.5, 1.0);
  labelMap.ofun.addPointLong(1, 1.0, 0.5, 1.0);

  buildColorTransferFunction(labelMap, lablemapColorLUT, 1.0, color);

  return labelMap;
}

const buildColorTransferFunction = (labelmap, colorLUT, opacity, color) => {
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

  labelmap.cfun.addRGBPoint(1, ...color); // label '1' will be red
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

async function getImageIds(urls) {
  const ids = [];
  for (let i = 0; i < urls.length; i++) {
    const file = await fetch(urls[i]);
    const blob = await file.blob();
    const id = await window.cornerstoneWADOImageLoader.wadouri.fileManager.add(
      blob
    );
    const image = await window.cornerstone.loadAndCacheImage(id);
    const metaDataProvider =
      window.cornerstoneWADOImageLoader.wadouri.metaData.metaDataProvider;
    cornerstone.metaData.addProvider(metaDataProvider);
    ids.push({ image, id });
  }
  return ids;
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

  // Set all labels the same, so this is more similar to our example.

  const Uint16LabelmapBuffer = new Uint16Array(labelmapBuffer);

  for (let i = 0; i < Uint16LabelmapBuffer.length; i++) {
    if (Uint16LabelmapBuffer[i] !== 0) {
      Uint16LabelmapBuffer[i] = 1;
    }
  }

  const dataArray = vtkDataArray.newInstance({
    numberOfComponents: 1, // labelmap with single component
    values: Uint16LabelmapBuffer,
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

function generate4Up(
  mrImageDataObject,
  labelmapDataObject,
  labelmapColorLUT,
  color = [1, 0, 0]
) {
  const mrImageData = mrImageDataObject.vtkImageData;
  const direction = mrImageData.getDirection();
  const planes = [
    direction.slice(0, 3),
    direction.slice(3, 6),
    direction.slice(6, 9),
  ];
  const orient = planes.map(arr =>
    arr.findIndex(i => Math.abs(Math.round(i)) === 1)
  );
  const planeMap = {
    Sagittal: {
      plane: orient.indexOf(0),
    },
    Coronal: {
      plane: orient.indexOf(1),
    },
    Axial: {
      plane: orient.indexOf(2),
    },
  };
  planeMap.Sagittal.flip = planes[planeMap.Sagittal.plane].some(
    i => Math.round(i) === -1
  );
  planeMap.Coronal.flip = planes[planeMap.Coronal.plane].some(
    i => Math.round(i) === -1
  );
  planeMap.Axial.flip = planes[planeMap.Axial.plane].some(
    i => Math.round(i) === -1
  );

  const range = mrImageData
    .getPointData()
    .getScalars()
    .getRange();

  const windowWidth = Math.abs(range[1] - range[0]);
  const windowLevel = range[0] + windowWidth / 2;

  const imageActors = [];

  for (let i = 0; i < 3; i++) {
    const imageMapper = vtkImageMapper.newInstance();
    const imageActor = vtkImageSlice.newInstance();

    imageMapper.setInputData(mrImageData);
    imageActor.setMapper(imageMapper);

    imageActor.getProperty().setColorWindow(windowWidth);
    imageActor.getProperty().setColorLevel(windowLevel);

    imageActors.push(imageActor);
  }

  // SEG

  const segRange = labelmapDataObject
    .getPointData()
    .getScalars()
    .getRange();

  const segMapper = vtkMapper.newInstance();
  const segActor = vtkActor.newInstance();

  const labelmapTransferFunctions = makeLabelMapColorTransferFunction(
    labelmapColorLUT,
    color
  );

  const marchingCube = vtkImageMarchingCubes.newInstance({
    contourValue: (segRange[0] + segRange[1]) / 3,
    computeNormals: true,
    mergePoints: true,
  });
  marchingCube.setInputData(labelmapDataObject);
  segActor.getProperty().setColor(...color);
  segActor.setMapper(segMapper);
  segMapper.setInputConnection(marchingCube.getOutputPort());

  // labelmapActors for 2D views

  const outline = vtkImageOutlineFilter.newInstance();
  // opacity function for the outline filter
  const labelmapOFun = vtkPiecewiseFunction.newInstance();

  labelmapOFun.addPoint(0, 0); // our background value, 0, will be invisible
  labelmapOFun.addPoint(0.5, 1);
  labelmapOFun.addPoint(1, 1);

  const labelmapActors = [];

  outline.setInputData(labelmapDataObject);
  outline.setSlicingMode(2);

  for (let i = 0; i < 3; i++) {
    const labelmapMapper = vtkImageMapper.newInstance();
    const labelmapActor = vtkImageSlice.newInstance();

    labelmapMapper.setInputData(outline.getOutputData());
    labelmapActor.setMapper(labelmapMapper);
    labelmapActor.getProperty().setInterpolationType(0);

    labelmapActor
      .getProperty()
      .setRGBTransferFunction(labelmapTransferFunctions.cfun);

    labelmapActor.getProperty().setScalarOpacity(labelmapOFun);

    labelmapActors.push(labelmapActor);
  }

  const labelmapFillOFun = vtkPiecewiseFunction.newInstance();

  labelmapFillOFun.addPoint(0, 0); // our background value, 0, will be invisible
  labelmapFillOFun.addPoint(0.5, 0.1);
  labelmapFillOFun.addPoint(1, 0.2);

  const labelmapFillActors = [];

  for (let i = 0; i < 3; i++) {
    const labelmapFillMapper = vtkImageMapper.newInstance();
    const labelmapFillActor = vtkImageSlice.newInstance();

    labelmapFillMapper.setInputData(labelmapDataObject);
    labelmapFillActor.setMapper(labelmapFillMapper);
    labelmapFillActor.getProperty().setInterpolationType(0);

    labelmapFillActor
      .getProperty()
      .setRGBTransferFunction(labelmapTransferFunctions.cfun);

    labelmapFillActor.getProperty().setScalarOpacity(labelmapFillOFun);

    labelmapFillActors.push(labelmapFillActor);
  }

  return {
    imageActors,
    labelmapActors,
    labelmapFillActors,
    segActor,
    labelmapDataObject,
    labelmapColorLUT,
    planeMap,
  };
}

class VTK4UPCrosshairsExample extends Component {
  state = {
    imageMappers: [],
  };

  async componentDidMount() {
    this.apis = [];

    const imageUrls = [];
    for (let i = 0; i < 88; i++) {
      imageUrls.push(`${dicomPath}/${i}.dcm`);
    }

    const ids = await getImageIds(imageUrls);

    // let mrImageIds = imageIds.filter(imageId =>
    //      imageId.includes(mrSeriesInstanceUID)
    //    );

    // Sort the imageIds so the SEG is allocated correctly.

    ids.sort((a, b) => {
      const spotA = Number(a.image.data.string('x00201041'));
      const spotB = Number(b.image.data.string('x00201041'));

      return spotA - spotB;
    });

    const images = [];
    const mrImageIds = [];
    ids.forEach((id, i) => {
      images.push(id.image);
      mrImageIds.push(id.id);
    });

    const mrImageDataObject = loadDataset(images);

    const segs = [];
    segs.push(await fetchSegArrayBuffer(segURL));
    segs.push(await fetchSegArrayBuffer(seg2URL));

    const volumes = [];
    for (const seg of segs) {
      volumes.push(await generateSegVolume(mrImageDataObject, seg, mrImageIds));
    }

    const fourUps = [];
    // volumes.forEach(({labelmapDataObject, labelmapColorLUT}, i) => {
    //   const fourUp = generate4Up(mrImageDataObject, labelmapDataObject, labelmapColorLUT)
    //   fourUps.push(fourUp)
    // });

    fourUps.push(
      generate4Up(
        mrImageDataObject,
        volumes[0].labelmapDataObject,
        volumes[0].labelmapColorLUT
      )
    );
    fourUps.push(
      generate4Up(
        mrImageDataObject,
        volumes[1].labelmapDataObject,
        volumes[1].labelmapColorLUT,
        [0, 1, 0]
      )
    );

    const {
      imageActors,
      labelmapDataObject,
      labelmapColorLUT,
      planeMap,
    } = fourUps[0];

    const labelmapActors = {};
    const ijk = ['I', 'J', 'K'];
    ijk.forEach((key, index) => {
      labelmapActors[key] = fourUps.map(fourUp => fourUp.labelmapActors[index]);
      labelmapActors[key + 'Fill'] = fourUps.map(
        fourUp => fourUp.labelmapFillActors[index]
      );
    });

    const marchingCubesActors = fourUps.map(fourUp => fourUp.segActor);

    // MR
    /////// Replace with image mapping. ///////

    // Use one dataset, and 3 actors/mappers for the 3 different views

    this.setState({
      imageActors: {
        I: imageActors[0],
        J: imageActors[1],
        K: imageActors[2],
      },
      labelmapActors: labelmapActors,
      marchingCubesActors,
      paintFilterLabelMapImageData: labelmapDataObject,
      paintFilterBackgroundImageData: mrImageDataObject.vtkImageData,
      labelmapColorLUT,
      planeMap,
    });
  }

  storeApi = (viewportIndex, type) => {
    return api => {
      const apis = this.apis;
      apis[viewportIndex] = api;

      const istyle =
        type === '2D'
          ? vtkInteractorStyle2D4UpCrosshairs.newInstance()
          : vtkInteractorStyle3D4UpCrosshairs.newInstance();

      // add crosshair interactor
      api.setInteractorStyle({
        istyle,
        configuration: { apis, apiIndex: viewportIndex },
      });

      // // Its up to the layout manager of an app to know how many viewports are being created.
      // if (apis.length === 4) {
      //   const targetApi = apis[0];
      //   const targetIstyle = targetApi.genericRenderWindow
      //     .getRenderWindow()
      //     .getInteractor()
      //     .getInteractorStyle();
      //   targetIstyle.resetCrosshairs();
      // }
    };
  };

  toggleCrosshairs = () => {
    const apis = this.apis;

    apis.forEach((api, i) => {
      const istyle = api.genericRenderWindow
        .getRenderWindow()
        .getInteractor()
        .getInteractorStyle();

      istyle.toggleCrosshairs();
    });
  };

  toggleCrosshairSlices = e => {
    const apis = this.apis;

    apis.forEach((api, i) => {
      if (api.type == 'VIEW3D') {
        const istyle = api.genericRenderWindow
          .getRenderWindow()
          .getInteractor()
          .getInteractorStyle();

        istyle.toggleCrosshairSlices();
      }
    });
  };

  render() {
    if (
      !this.state.imageActors ||
      !this.state.labelmapActors ||
      !this.state.marchingCubesActors ||
      !this.state.marchingCubesActors.length
    ) {
      return <h4>Loading...</h4>;
    }

    return (
      <>
        <div className="row">
          <table style={{ margin: '20px' }}>
            <tbody style={{ margin: '20px' }}>
              <tr>
                <th>
                  <button type="checkbox" onClick={this.toggleCrosshairs}>
                    Toggle Crosshairs
                  </button>
                </th>
              </tr>
              <tr>
                <th>
                  <button type="checkbox" onClick={this.toggleCrosshairSlices}>
                    Toggle Crosshair Slices
                  </button>
                </th>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="row">
          <div className="col-sm-4">
            <View2DImageMapper
              actors={[this.state.imageActors.I]}
              labelmapActors={[
                ...this.state.labelmapActors.IFill,
                ...this.state.labelmapActors.I,
              ]}
              planeMap={this.state.planeMap}
              onCreated={this.storeApi(0, '2D')}
              orientation={'Sagittal'}
            />
          </div>
          <div className="col-sm-4">
            <View2DImageMapper
              actors={[this.state.imageActors.J]}
              labelmapActors={[
                ...this.state.labelmapActors.JFill,
                ...this.state.labelmapActors.J,
              ]}
              planeMap={this.state.planeMap}
              onCreated={this.storeApi(1, '2D')}
              orientation={'Coronal'}
            />
          </div>
        </div>
        <div className="row">
          <div className="col-sm-4">
            <View2DImageMapper
              actors={[this.state.imageActors.K]}
              labelmapActors={[
                ...this.state.labelmapActors.KFill,
                ...this.state.labelmapActors.K,
              ]}
              planeMap={this.state.planeMap}
              onCreated={this.storeApi(2, '2D')}
              orientation={'Axial'}
            />
          </div>
          {/** 3D  View*/}
          <div className="col-sm-4">
            <View3DMarchingCubes
              actors={this.state.marchingCubesActors}
              planeMap={this.state.planeMap}
              onCreated={this.storeApi(3, '3D')}
            />
          </div>
        </div>
      </>
    );
  }
}

export default VTK4UPCrosshairsExample;
