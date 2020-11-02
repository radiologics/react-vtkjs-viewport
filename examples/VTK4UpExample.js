import React from 'react';
import { Component } from 'react';
import dcmjs from 'dcmjs';
import {
  View2DImageMapper,
  View3DMarchingCubes,
  getImageData,
  loadImageData,
  vtkInteractorStyleCrosshairsImageMapper,
  vtkSVGCrosshairsWidgetImageMapper,
  vtkInteractorStyleImagePanZoom,
} from '@vtk-viewport';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper';
import vtkImageSlice from 'vtk.js/Sources/Rendering/Core/ImageSlice';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkImageMarchingCubes from 'vtk.js/Sources/Filters/General/ImageMarchingCubes';
import vtkSTLReader from 'vtk.js/Sources/IO/Geometry/STLReader';
import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import cornerstoneTools from 'cornerstone-tools';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from 'vtk.js/Sources/Common/DataModel/PiecewiseFunction';
import vtkImageOutlineFilter from 'vtk.js/Sources/Filters/General/ImageOutlineFilter';

const segmentationModule = cornerstoneTools.getModule('segmentation');

const segURL = `${window.location.origin}/seg/RoiCollection_Combined.dcm`;

const stlUrls = [
  `${window.location.origin}/surfaces/Mandible_Surface.stl`,
  `${window.location.origin}/surfaces/Maxilla_Surface.stl`,
];

const ROOT_URL =
  window.location.hostname === 'localhost'
    ? window.location.host
    : window.location.hostname;

const imageIds = [
  `dicomweb://${ROOT_URL}/background/DICOM000.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM001.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM002.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM003.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM004.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM005.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM006.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM007.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM008.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM009.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM010.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM011.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM012.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM013.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM014.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM015.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM016.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM017.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM018.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM019.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM020.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM021.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM022.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM023.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM024.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM025.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM026.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM027.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM028.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM029.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM030.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM031.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM032.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM033.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM034.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM035.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM036.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM037.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM038.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM039.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM040.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM041.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM042.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM043.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM044.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM045.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM046.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM047.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM048.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM049.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM050.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM051.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM052.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM053.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM054.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM055.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM056.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM057.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM058.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM059.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM060.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM061.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM062.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM063.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM064.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM065.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM066.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM067.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM068.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM069.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM070.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM071.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM072.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM073.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM074.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM075.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM076.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM077.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM078.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM079.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM080.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM081.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM082.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM083.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM084.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM085.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM086.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM087.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM088.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM089.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM090.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM091.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM092.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM093.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM094.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM095.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM096.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM097.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM098.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM099.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM100.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM101.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM102.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM103.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM104.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM105.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM106.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM107.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM108.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM109.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM110.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM111.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM112.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM113.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM114.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM115.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM116.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM117.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM118.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM119.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM120.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM121.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM122.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM123.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM124.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM125.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM126.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM127.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM128.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM129.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM130.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM131.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM132.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM133.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM134.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM135.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM136.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM137.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM138.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM139.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM140.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM141.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM142.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM143.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM144.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM145.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM146.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM147.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM148.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM149.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM150.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM151.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM152.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM153.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM154.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM155.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM156.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM157.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM158.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM159.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM160.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM161.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM162.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM163.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM164.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM165.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM166.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM167.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM168.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM169.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM170.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM171.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM172.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM173.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM174.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM175.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM176.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM177.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM178.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM179.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM180.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM181.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM182.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM183.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM184.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM185.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM186.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM187.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM188.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM189.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM190.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM191.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM192.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM193.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM194.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM195.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM196.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM197.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM198.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM199.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM200.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM201.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM202.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM203.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM204.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM205.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM206.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM207.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM208.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM209.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM210.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM211.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM212.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM213.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM214.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM215.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM216.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM217.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM218.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM219.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM220.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM221.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM222.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM223.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM224.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM225.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM226.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM227.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM228.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM229.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM230.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM231.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM232.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM233.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM234.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM235.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM236.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM237.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM238.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM239.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM240.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM241.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM242.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM243.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM244.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM245.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM246.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM247.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM248.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM249.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM250.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM251.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM252.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM253.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM254.dcm`,
  `dicomweb://${ROOT_URL}/background/DICOM255.dcm`,
];

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

  for (let i = 0; i < numColors; i++) {
    const color = colorLUT[i];
    labelmap.cfun.addRGBPoint(
      i,
      color[0] / 255,
      color[1] / 255,
      color[2] / 255
    );

    // Set the opacity per label.
    const segmentOpacity = (color[3] / 255) * opacity;
    labelmap.ofun.addPointLong(i, segmentOpacity, 0.5, 1.0);
  }
};

const generateSegVolume = (imageDataObject, segP10ArrayBuffer, imageIds) => {
  // Use dcmjs to extract a labelmap from the SEG.
  const {
    labelmapBuffer,
    segMetadata,
  } = dcmjs.adapters.Cornerstone.Segmentation.generateToolState(
    imageIds,
    segP10ArrayBuffer,
    window.cornerstone.metaData
  );

  const dataArray = vtkDataArray.newInstance({
    numberOfComponents: 1, // labelmap with single component
    values: new Uint16Array(labelmapBuffer),
  });

  // Create VTK Image Data with buffer as input
  const labelmapDataObject = vtkImageData.newInstance();
  labelmapDataObject.getPointData().setScalars(dataArray);
  labelmapDataObject.setDimensions(...imageDataObject.dimensions);
  labelmapDataObject.setSpacing(...imageDataObject.vtkImageData.getSpacing());
  labelmapDataObject.setOrigin(...imageDataObject.vtkImageData.getOrigin());
  labelmapDataObject.setDirection(
    ...imageDataObject.vtkImageData.getDirection()
  );

  const labelmapColorLUT = segmentationModule.state.colorLutTables[0];

  // Cache the labelmap volume.
  return { labelmapDataObject, labelmapColorLUT, segMetadata };
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
  state = {};

  async componentDidMount() {
    this.apis = [];

    const seg = await fetchSegArrayBuffer(segURL);

    // Pre-retrieve the images for demo purposes
    // Note: In a real application you wouldn't need to do this
    // since you would probably have the image metadata ahead of time.
    // In this case, we preload the images so the WADO Image Loader can
    // read and store all of their metadata and subsequently the 'getImageData'
    // can run properly (it requires metadata).
    const promises = imageIds.map(imageId => {
      return cornerstone.loadAndCacheImage(imageId);
    });

    const imageDataObject = await Promise.all(promises).then(() => {
      const displaySetInstanceUid = '12345';
      return getImageData(imageIds, displaySetInstanceUid);
    });

    const onAllPixelDataInsertedCallback = () => {
      const {
        labelmapDataObject,
        labelmapColorLUT,
        segMetadata,
      } = generateSegVolume(imageDataObject, seg, imageIds);

      // Use one dataset, and 3 actors/mappers for the 3 different views
      // background image
      const imageData = imageDataObject.vtkImageData;

      const direction = imageData.getDirection();
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

      const range = imageData
        .getPointData()
        .getScalars()
        .getRange();

      const windowWidth = Math.abs(range[1] - range[0]);
      const windowLevel = range[0] + windowWidth / 2;

      const imageActors = [];

      for (let i = 0; i < 3; i++) {
        const imageMapper = vtkImageMapper.newInstance();
        const imageActor = vtkImageSlice.newInstance();

        imageMapper.setInputData(imageData);
        imageActor.setMapper(imageMapper);

        imageActor.getProperty().setColorWindow(windowWidth);
        imageActor.getProperty().setColorLevel(windowLevel);

        imageActors.push(imageActor);
      }

      // seg
      const labelmapTransferFunctions = makeLabelMapColorTransferFunction(
        labelmapColorLUT
      );

      // volume
      let segActors = [];
      for (let i = 0; i < segMetadata.data.length; i++) {
        let md = segMetadata.data[i];
        if (!md) {
          continue;
        }

        // set voxels not in this segment to 0
        let dataVals = labelmapDataObject
          .getPointData()
          .getScalars()
          .getData()
          .map(function(item) {
            return item != i ? 0 : item;
          });

        const dataArray = vtkDataArray.newInstance({
          numberOfComponents: 1, // labelmap with single component
          values: dataVals,
        });

        // new labelmap data object for this SegmentSequence
        const seqSeqData = vtkImageData.newInstance();
        seqSeqData.getPointData().setScalars(dataArray);
        seqSeqData.setDimensions(...labelmapDataObject.getDimensions());
        seqSeqData.setSpacing(...labelmapDataObject.getSpacing());
        seqSeqData.setOrigin(...labelmapDataObject.getOrigin());
        seqSeqData.setDirection(...labelmapDataObject.getDirection());

        const segMapper = vtkMapper.newInstance();
        const segActor = vtkActor.newInstance();

        const marchingCube = vtkImageMarchingCubes.newInstance({
          contourValue: 0.3,
          computeNormals: true,
          mergePoints: true,
        });
        marchingCube.setInputData(seqSeqData);

        let color = [];
        labelmapTransferFunctions.cfun.getColor(i, color);
        segActor.getProperty().setColor(...color);
        segActor.setMapper(segMapper);
        segMapper.setInputConnection(marchingCube.getOutputPort());

        segActors.push(segActor);
      }

      // labelmaps for 2D
      const labelmapActors = {};
      //fill
      const labelmapFillOFun = vtkPiecewiseFunction.newInstance();
      labelmapFillOFun.addPoint(0, 0); // our background value, 0, will be invisible
      labelmapFillOFun.addPoint(0.5, 0.1);
      labelmapFillOFun.addPoint(1, 0.2);

      const labelmapFillMapper = vtkImageMapper.newInstance();
      const labelmapFillActor = vtkImageSlice.newInstance();

      labelmapFillMapper.setInputData(labelmapDataObject);
      labelmapFillActor.setMapper(labelmapFillMapper);
      labelmapFillActor.getProperty().setInterpolationType(0);

      labelmapFillActor
        .getProperty()
        .setRGBTransferFunction(labelmapTransferFunctions.cfun);

      labelmapFillActor.getProperty().setScalarOpacity(labelmapFillOFun);

      // outline
      // opacity function for the outline filter
      const labelmapOFun = vtkPiecewiseFunction.newInstance();
      labelmapOFun.addPoint(0, 0); // our background value, 0, will be invisible
      labelmapOFun.addPoint(0.5, 1);
      labelmapOFun.addPoint(1, 1);
      const slicingModes = [
        vtkImageMapper.SlicingMode.I,
        vtkImageMapper.SlicingMode.J,
        vtkImageMapper.SlicingMode.K,
      ];
      slicingModes.forEach(mode => {
        const outline = vtkImageOutlineFilter.newInstance();
        outline.setInputData(labelmapDataObject);
        outline.setSlicingMode(mode);
        const labelmapMapper = vtkImageMapper.newInstance();
        const labelmapActor = vtkImageSlice.newInstance();

        labelmapMapper.setInputData(outline.getOutputData());
        labelmapActor.setMapper(labelmapMapper);
        labelmapActor.getProperty().setInterpolationType(0);

        labelmapActor
          .getProperty()
          .setRGBTransferFunction(labelmapTransferFunctions.cfun);

        labelmapActor.getProperty().setScalarOpacity(labelmapOFun);

        labelmapActors[mode] = [labelmapActor, labelmapFillActor];
      });

      const readStl = async (url, i) => {
        const reader = vtkSTLReader.newInstance();
        const mapper = vtkMapper.newInstance({ scalarVisibility: false });
        const actor = vtkActor.newInstance();

        actor.setMapper(mapper);
        mapper.setInputConnection(reader.getOutputPort());
        let color = [];
        labelmapTransferFunctions.cfun.getColor(i + 1, color); // colors are 1-indexed
        actor.getProperty().setColor(...color);

        await reader.setUrl(url, { binary: true });

        return actor;
      };

      const stlActorPromises = stlUrls.map(readStl);
      Promise.all(stlActorPromises).then(stlActors => {
        this.setState({
          imageActors: {
            I: imageActors[0],
            J: imageActors[1],
            K: imageActors[2],
          },
          labelmapActors,
          stlActors,
          marchingCubesActors: segActors,
          paintFilterLabelMapImageData: labelmapDataObject,
          paintFilterBackgroundImageData: imageDataObject.vtkImageData,
          labelmapColorLUT,
          displayCrosshairs: false,
          planeMap,
        });
      });
    };

    imageDataObject.onAllPixelDataInserted(onAllPixelDataInsertedCallback);
    loadImageData(imageDataObject);
  }

  storeApi = (viewportIndex, type) => {
    return api => {
      const apis = this.apis;
      apis[viewportIndex] = api;

      // Add svg widget
      if (api.type !== 'VIEW3D') {
        api.addSVGWidget(
          vtkSVGCrosshairsWidgetImageMapper.newInstance(),
          'crosshairsWidget'
        );
      }

      const istyle =
        type === '2D'
          ? vtkInteractorStyleImagePanZoom.newInstance()
          : vtkInteractorStyleTrackballCamera.newInstance();

      // add istyle
      api.setInteractorStyle({
        istyle,
        configuration: { apis, apiIndex: viewportIndex },
      });
    };
  };

  toggleCrosshairs = () => {
    const { displayCrosshairs } = this.state;
    const apis = this.apis;

    const shouldDisplayCrosshairs = !displayCrosshairs;

    apis.forEach((api, index) => {
      const { svgWidgetManager, svgWidgets } = api;
      if (
        !svgWidgets ||
        !svgWidgets.crosshairsWidget ||
        api.type === 'VIEW3D'
      ) {
        return;
      }

      // add istyle
      const istyle = vtkInteractorStyleCrosshairsImageMapper.newInstance();
      api.setInteractorStyle({
        istyle,
        configuration: { apis, apiIndex: index },
      });
      svgWidgets.crosshairsWidget.setDisplay(shouldDisplayCrosshairs);
      svgWidgetManager.render();
    });

    const targetApi = apis[0];
    const targetIstyle = targetApi.genericRenderWindow
      .getRenderWindow()
      .getInteractor()
      .getInteractorStyle();
    targetIstyle.resetCrosshairs();

    this.setState({ displayCrosshairs: shouldDisplayCrosshairs });
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
          <div className="col-xs-4">
            <p>This example demonstrates a 4up.</p>
          </div>
          <div className="col-xs-4">
            <p>Click bellow to toggle crosshairs on/off.</p>
            <button onClick={this.toggleCrosshairs}>
              {this.state.displayCrosshairs
                ? 'Hide Crosshairs'
                : 'Show Crosshairs'}
            </button>
          </div>
        </div>
        <div className="row">
          <div className="col-sm-4">
            <View2DImageMapper
              actors={[this.state.imageActors.I]}
              labelmapActors={this.state.labelmapActors}
              planeMap={this.state.planeMap}
              onCreated={this.storeApi(0, '2D')}
              orientation={'Sagittal'}
            />
          </div>
          <div className="col-sm-4">
            <View2DImageMapper
              actors={[this.state.imageActors.J]}
              labelmapActors={this.state.labelmapActors}
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
              labelmapActors={this.state.labelmapActors}
              planeMap={this.state.planeMap}
              onCreated={this.storeApi(2, '2D')}
              orientation={'Axial'}
            />
          </div>
          {/** 3D  View */}
          <div className="col-sm-4">
            <View3DMarchingCubes
              marchingCubesActors={this.state.marchingCubesActors}
              stlActors={this.state.stlActors}
              planeMap={this.state.planeMap}
              onCreated={this.storeApi(3, '3D')}
            />
          </div>
        </div>
      </>
    );
  }
}

export default VTK4UPExample;
