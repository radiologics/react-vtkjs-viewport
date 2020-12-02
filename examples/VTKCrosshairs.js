import React, { Component } from 'react'
import * as cornerstone from 'cornerstone-core'
import * as dicomParser from 'dicom-parser'
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import vtkOpenGlRenderWindow from 'vtk.js/Sources/Rendering/OpenGl/RenderWindow'
import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow'
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow'
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer'
import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData'
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray'
import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper'
import vtkImageSlice from 'vtk.js/Sources/Rendering/Core/ImageSlice'
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor'
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper'
import vtkImageMarchingCubes from 'vtk.js/Sources/Filters/General/ImageMarchingCubes'
import vtkCubeSource from 'vtk.js/Sources/Filters/Sources/CubeSource'
import vtkSampleFunction from 'vtk.js/Sources/Imaging/Hybrid/SampleFunction'
import vtkLineSource from 'vtk.js/Sources/Filters/Sources/LineSource'
import vtkSphere from 'vtk.js/Sources/Common/DataModel/Sphere'
import vtkBox from 'vtk.js/Sources/Common/DataModel/Box'
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import {
  VTKAxis,
  View2DImageMapper,
  View3DMarchingCubes,
  vtkInteractorStyleCrosshairsImageMapper,
  vtkSVGCrosshairsWidgetImageMapper,
  vtkInteractorStyle3DCrosshairs,
  vtk3DCrosshairsInterface,
  vtkInteractorStyleImagePanZoom,} from '@vtk-viewport'

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

  cubeActor = null

  async componentDidMount(){

    this.apis = []

    /*const renderWindow = vtkRenderWindow.newInstance()
    const renderer = vtkRenderer.newInstance()
    renderWindow.addRenderer(renderer)

    const openGlRenderWindow = vtkOpenGlRenderWindow.newInstance({background: [0, 0, 0]})
    renderWindow.addView(openGlRenderWindow)

    /*const container = document.getElementById('VTKWindow')
    openGlRenderWindow.setContainer(container)
    const dims = container.getBoundingClientRect()
    openGlRenderWindow.setSize(dims.width, dims.height)*/

    const actor3D = vtkActor.newInstance()
    const actor2D = vtkImageSlice.newInstance()

    const mapper3D = vtkMapper.newInstance()
    const mapper2D = vtkImageMapper.newInstance()

    actor3D.setMapper(mapper3D)
    actor2D.setMapper(mapper2D)

    const sphere = vtkSphere.newInstance({ center: [0.0, 0.0, 0.0], radius: 0.5 })//bounds: [0.5, -0.5, 0.5, -0.5, 0.5, -0.5] })
    const sample = vtkSampleFunction.newInstance({
      implicitFunction: sphere,
      sampleDimensions: [10, 10, 10],
      modelBounds: [0.5, -0.5, 0.5, -0.5, 0.5, -0.5]
    })

    mapper2D.setInputConnection(sample.getOutputPort())

    const marchingCubes = vtkImageMarchingCubes.newInstance({ contourValue: 0, computeNormals: false })
    marchingCubes.setInputConnection(sample.getOutputPort())
    mapper3D.setInputConnection(marchingCubes.getOutputPort())


    actor3D.getProperty().setOpacity(.5)

    document.getElementById('button').onclick = () => {console.log(this.apis[3])}

    this.setState({actor2D: actor2D, actor3D: actor3D, planeMap: {
      Sagittal: {
        plane: 0,
      },
      Coronal: {
        plane: 1,
      },
      Axial: {
        plane: 2,
      },
    }})
  }

  storeApi = (viewportIndex, type) => {
    return api => {
      const apis = this.apis;
      apis[viewportIndex] = api;

      var crosshairsWidget;
    //    if (type === '3D'){
        crosshairsWidget = vtk3DCrosshairsInterface.newInstance()
    //  }
    //  else{
      //  crosshairsWidget = vtkSVGCrosshairsWidgetImageMapper.newInstance()
    //  }
      // Add svg widget
      api.addSVGWidget(
        crosshairsWidget,
        'crosshairsWidget'
      );

      const istyle =
        type === '2D'
          ? vtkInteractorStyle3DCrosshairs.newInstance()
          : vtkInteractorStyle3DCrosshairs.newInstance();

      // add istyle
      api.setInteractorStyle({
        istyle,
        configuration: { apis, apiIndex: viewportIndex },
      });
    };
  };

  render(){
    if (this.state.actor2D && this.state.actor3D){
      var view2DS = <View2DImageMapper
      actors = {[this.state.actor2D]}
      orientation = 'Sagittal'
      planeMap = {this.state.planeMap}
      onCreated = {this.storeApi(0, '2D')}
      />

      var view2DC = <View2DImageMapper
      actors = {[this.state.actor2D]}
      orientation = 'Coronal'
      planeMap = {this.state.planeMap}
      onCreated = {this.storeApi(1, '2D')}
      />

      var view2DA = <View2DImageMapper
      actors = {[this.state.actor2D]}
      orientation = 'Axial'
      planeMap = {this.state.planeMap}
      onCreated = {this.storeApi(2, '2D')}
      />

      var view3D = <View3DMarchingCubes
        actors = {[this.state.actor3D]}
        planeMap = {this.state.planeMap}
        onCreated = {this.storeApi(3, '3D')}
      />
    }
    else {
      var view2D = <p>Loading...</p>
      var view3D = <p>Loading...</p>
    }
    return (
      <div>
        <div className = 'row' style={{padding: '15px'}}>
          <div id='View3D' className="col-sm-4">
            {view3D}
          </div>
          <div id='View2DS' className="col-sm-4">
            {view2DS}
          </div>
        </div>
        <div className = 'row'  style={{padding: '15px'}}>
          <div id='View2DC' className="col-sm-4">
            {view2DC}
          </div>
          <div id='View2DA' className="col-sm-4">
            {view2DA}
          </div>
        </div>
        <button id='button'>Click</button>
      </div>
    )
  }
}

export default Test;
//style = {{display: 'grid', grid_temple_columns: '1fr 1fr', grid_temple_rows: '1fr 1fr'}}>
//style = {{outline: 'black', width: '500px',  height: '500px', margin: '0px', display: 'inline-block'}}
