import React, { Component } from 'react'
import * as cornerstone from 'cornerstone-core'
import * as dicomParser from 'dicom-parser'
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow'
import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData'
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray'
import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper'
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor'
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper'
import vtkImageMarchingCubes from 'vtk.js/Sources/Filters/General/ImageMarchingCubes'
import vtkITKHelper from 'vtk.js/Sources/Common/DataModel/ITKHelper'

cornerstoneWADOImageLoader.external.cornerstone = cornerstone
cornerstoneWADOImageLoader.external.dicomParser = dicomParser

console.log('')
console.log('Page Reload')
console.log('')

async function downloadScan(url){

}

class Test extends Component {
  state = {
    files: []
  }

  async componentDidMount(){
    var scans = []

    for (let i = 0; i < 87; i++){
      let url = `wadouri:${window.location.href}/../dicoms/${i}.dcm`
      scans.push(cornerstone.loadImage(url))
    }
    scans = await Promise.all(scans)

    var scanPixelData = []
    for (let i = 0; i < scans.length; i ++){
      let image = scans[i]
      let pixelData = image.getPixelData()
      pixelData = pixelData.map(p => {return ((p - image.minPixelValue) / image.maxPixelValue) * 255})
      scanPixelData.push(pixelData)
    }

    /*var files = []
    for (let i = 0; i < 87; i++){
      let url = `${window.location.href}/../dicoms/${i}.dcm`
      let response = await fetch(url)
      let blob = await response.blob()
      files.push(blob)
    }
    console.log(files)
    readImageDICOMFileSeries([files[0]]).then(({image, webWorker}) => {
      console.log(image)
//      webWorker.terminate()

      const imageData = vtkITKHelper.convertItkToVtkImage(itkImage)
      console.log(imageData)*/

      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance()
      const renderer = fullScreenRenderer.getRenderer()
      const renderWindow = fullScreenRenderer.getRenderWindow()

      const imageData = vtkImageData.newInstance()
      const dataArray = vtkDataArray.newInstance({
        numberOfComponents: 1,
        values: scanPixelData
      })

      imageData.getPointData().setScalars(dataArray)
      //imageData.setDimensions([256, 256, scanPixelData.length])

      console.log(imageData.getPointData().getScalars().getData())

      const marchingCubes = vtkImageMarchingCubes.newInstance({ contourValue: 255 / 3, computeNormals: true, mergePoints: true })
      const actor = vtkActor.newInstance()
      const imageMapper = vtkMapper.newInstance()

      marchingCubes.setInputData(imageData)
      actor.setMapper(imageMapper)
      imageMapper.setInputConnection(marchingCubes.getOutputPort())

      renderer.addActor(actor)
      renderer.resetCamera()
      renderWindow.render()
  }

  render(){
    return (
      <h1>Model: </h1>
    )
  }
}

export default Test;
