import React, { Component } from 'react';
import * as cornerstone from 'cornerstone-core';
import * as dicomParser from 'dicom-parser';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkLineSource from 'vtk.js/Sources/Filters/Sources/LineSource';
import vtkCellArray from 'vtk.js/Sources/Common/Core/CellArray';
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData';
import vtkPoints from 'vtk.js/Sources/Common/Core/Points';

class Axis {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;

    this.lines = [
      vtkLineSource.newInstance(),
      vtkLineSource.newInstance(),
      vtkLineSource.newInstance(),
    ];

    this.actors = [
      vtkActor.newInstance(),
      vtkActor.newInstance(),
      vtkActor.newInstance(),
    ];

    this.mappers = [
      vtkMapper.newInstance(),
      vtkMapper.newInstance(),
      vtkMapper.newInstance(),
    ];

    this.lines[0].setPoint1([x - 1, y, z]);
    this.lines[1].setPoint1([x, y - 1, z]);
    this.lines[2].setPoint1([x, y, z - 1]);

    this.lines[0].setPoint2([x + 1, y, z]);
    this.lines[1].setPoint2([x, y + 1, z]);
    this.lines[2].setPoint2([x, y, z + 1]);

    this.actors[0].getProperty().setColor(255, 0, 0);
    this.actors[1].getProperty().setColor(0, 255, 0);
    this.actors[2].getProperty().setColor(0, 0, 255);

    for (let i = 0; i < 3; i++) {
      this.actors[i].setMapper(this.mappers[i]);
      this.mappers[i].setInputConnection(this.lines[i].getOutputPort());
    }
  }

  setPoint(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;

    this.lines[0].setPoint1([x, y, z]);
    this.lines[1].setPoint1([x, y, z]);
    this.lines[2].setPoint1([x, y, z]);

    this.lines[0].setPoint2([x + 1, y, z]);
    this.lines[1].setPoint2([x, y + 1, z]);
    this.lines[2].setPoint2([x, y, z + 1]);
  }
}

export default Axis;
