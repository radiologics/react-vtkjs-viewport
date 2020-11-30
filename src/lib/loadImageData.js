import cornerstone from 'cornerstone-core';
import { requestPoolManager } from 'cornerstone-tools';
import insertSlice from './data/insertSlice.js';
import getPatientWeightAndCorrectedDose from './data/getPatientWeightAndCorrectedDose.js';

// TODO: If we attempt to load multiple imageDataObjects at once this will break.
export default function loadImageDataProgressively(imageDataObject) {
  if (imageDataObject.loaded || imageDataObject.isLoading) {
    // Returning instantly resolved promise as good to go.
    // Returning promise to be resolved by other process as loading.
    return;
  }

  const {
    imageIds,
    vtkImageData,
    metaDataMap,
    sortedDatasets,
  } = imageDataObject;

  const imageId0 = imageIds[0];

  const seriesModule = cornerstone.metaData.get(
    'generalSeriesModule',
    imageId0
  );

  // If no seriesModule is present will default to linear scaling function.
  const modality = seriesModule && seriesModule.modality;
  let modalitySpecificScalingParameters;

  if (modality === 'PT') {
    modalitySpecificScalingParameters = getPatientWeightAndCorrectedDose(
      imageId0
    );
  }

  imageDataObject.isLoading = true;

  // This is straight up a hack: vtkjs cries when you feed it data with a range of zero.
  // So lets set the first voxel to 1, which will be replaced when the first image comes in.
  const scalars = vtkImageData.getPointData().getScalars();
  const scalarData = scalars.getData();

  scalarData[0] = 1;

  const range = {
    max: Number.NEGATIVE_INFINITY,
    min: Number.POSITIVE_INFINITY,
  };

  const numberOfFrames = imageIds.length;
  let numberProcessed = 0;

  let reRenderFraction = Math.min(numberOfFrames / 10, 20);
  let reRenderTarget = reRenderFraction;

  const insertPixelDataErrorHandler = error => {
    numberProcessed++;
    imageDataObject._publishPixelDataInsertedError(error);

    if (numberProcessed === numberOfFrames) {
      // Done loading, publish complete and remove all subscriptions.
      imageDataObject._publishAllPixelDataInserted();
    }
  };

  const insertPixelData = image => {
    const { imagePositionPatient } = metaDataMap.get(image.imageId);

    const sliceIndex = sortedDatasets.findIndex(
      dataset => dataset.imagePositionPatient === imagePositionPatient
    );

    const { max, min } = insertSlice(
      vtkImageData,
      sliceIndex,
      image,
      modality,
      modalitySpecificScalingParameters
    );

    if (max > range.max) {
      range.max = max;
    }

    if (min < range.min) {
      range.min = min;
    }

    const dataArray = vtkImageData.getPointData().getScalars();

    dataArray.setRange(range, 1);
    numberProcessed++;

    if (numberProcessed > reRenderTarget) {
      if (numberProcessed / numberOfFrames > 0.5) {
        reRenderFraction = Math.min(numberOfFrames / 5, 50);
      }
      reRenderTarget += reRenderFraction;

      vtkImageData.modified();
    }

    imageDataObject._publishPixelDataInserted(numberProcessed);

    if (numberProcessed === numberOfFrames) {
      // Done loading, publish complete and remove all subscriptions.
      imageDataObject._publishAllPixelDataInserted();
    }
  };

  prefetchImageIds(imageIds, insertPixelData, insertPixelDataErrorHandler);
}

const requestType = 'prefetch';
const preventCache = false;

function prefetchImageIds(
  imageIds,
  insertPixelData,
  insertPixelDataErrorHandler
) {
  const loadImage = function(imageId) {
    requestPoolManager.addRequest(
      {},
      imageId,
      requestType,
      preventCache,
      insertPixelData,
      insertPixelDataErrorHandler
    );
  };

  // load from middle frame outward
  let n = imageIds.length;
  let i = Math.ceil(n / 2);
  let j = i - 1;
  while (j >= 0) {
    loadImage(imageIds[j--]);
    if (i < n) loadImage(imageIds[i++]);
  }

  requestPoolManager.startGrabbing();
}
