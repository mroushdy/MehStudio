/* MEH Studio v5 — positive three-way driver-mount host intent.

   A mount host is a full-face positive body spanning the documented driver
   frame and optional gasket envelope. Acoustic openings are owned canonical
   lumen negatives. Fastener, gasket, and clearance negatives are distinct
   non-acoustic intents. This module validates and builds an inspection mesh;
   it performs no Boolean operation and grants no manufacturing authority. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3MountHost=factory();
})(function(){
  'use strict';

  const VERSION=1;
  const EPS=1e-10;
  const MODES=Object.freeze([
    'integrated-solid',
    'detachable-gasketed'
  ]);
  const AUXILIARY_NEGATIVE_TYPES=Object.freeze([
    'fastener-negative',
    'gasket-negative',
    'clearance-negative'
  ]);
  const FAILURE_CODES=Object.freeze({
    INVALID_INPUT:'THREEWAY_MOUNT_INPUT_INVALID',
    MODE_INVALID:'THREEWAY_MOUNT_MODE_INVALID',
    OWNERSHIP_INVALID:'THREEWAY_MOUNT_OWNERSHIP_INVALID',
    DATUM_INVALID:'THREEWAY_MOUNT_DATUM_INVALID',
    AXIS_MISMATCH:'THREEWAY_MOUNT_AXIS_MISMATCH',
    ENVELOPE_MISSING:'THREEWAY_MOUNT_ENVELOPE_MISSING',
    ENVELOPE_UNSUPPORTED:'THREEWAY_MOUNT_ENVELOPE_UNSUPPORTED',
    HOST_INVALID:'THREEWAY_MOUNT_HOST_INVALID',
    ACTIVE_CONE_INVALID:'THREEWAY_MOUNT_ACTIVE_CONE_INVALID',
    LUMEN_REQUIRED:'THREEWAY_MOUNT_LUMEN_REQUIRED',
    LUMEN_INVALID:'THREEWAY_MOUNT_LUMEN_INVALID',
    LUMEN_OWNERSHIP_MISMATCH:
      'THREEWAY_MOUNT_LUMEN_OWNERSHIP_MISMATCH',
    LUMEN_AXIS_MISMATCH:'THREEWAY_MOUNT_LUMEN_AXIS_MISMATCH',
    LUMEN_START_OUTSIDE_ACTIVE_CONE:
      'THREEWAY_MOUNT_LUMEN_START_OUTSIDE_ACTIVE_CONE',
    NEGATIVE_TYPE_INVALID:'THREEWAY_MOUNT_NEGATIVE_TYPE_INVALID',
    CENTRAL_HOLE_REFUSED:'THREEWAY_MOUNT_CENTRAL_HOLE_REFUSED',
    EDGE_CLEARANCE:'THREEWAY_MOUNT_EDGE_CLEARANCE_INVALID',
    WEB_FAILURE:'THREEWAY_MOUNT_MINIMUM_WEB_FAILURE',
    INSPECTION_MESH_INVALID:'THREEWAY_MOUNT_INSPECTION_MESH_INVALID'
  });
  const CAPABILITIES=deepFreeze({
    status:'positive-host-intent-only',
    fullFacePositiveHost:true,
    integratedSolidIntent:true,
    detachableGasketedIntent:true,
    canonicalLumenOwnership:true,
    typedAuxiliaryNegatives:true,
    datumAxisValidation:true,
    activeConeContainment:true,
    webAndEdgeValidation:true,
    closedInspectionMesh:true,
    booleanUnion:false,
    booleanSubtraction:false,
    exactSolid:false,
    fabricationAudit:false,
    manufacturingPlan:false,
    manufacturing:false,
    stl:false,
    reason:
      'A validated positive-host intent and inspection mesh are not proof of Boolean union, subtraction, printability, or manufacture.'
  });

  function isObject(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
  }

  function cloneValue(value){
    if(Array.isArray(value))return value.map(cloneValue);
    if(isObject(value)){
      const copy={};
      for(const key of Object.keys(value))copy[key]=cloneValue(value[key]);
      return copy;
    }
    if(typeof value==='number')return Object.is(value,-0)?0:value;
    return value;
  }

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    for(const key of Object.keys(value))deepFreeze(value[key]);
    return Object.freeze(value);
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function finiteNumber(value){
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }

  function positiveNumber(value){
    const number=finiteNumber(value);
    return number!==null&&number>0?number:null;
  }

  function nonnegativeNumber(value){
    const number=finiteNumber(value);
    return number!==null&&number>=0?number:null;
  }

  function vec3(value){
    if(!Array.isArray(value)||value.length!==3)return null;
    const result=value.map(finiteNumber);
    return result.every(item=>item!==null)?result:null;
  }

  function vec2(value){
    if(!Array.isArray(value)||value.length!==2)return null;
    const result=value.map(finiteNumber);
    return result.every(item=>item!==null)?result:null;
  }

  function vAdd(a,b){
    return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  }

  function vSub(a,b){
    return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  }

  function vScale(a,scale){
    return [a[0]*scale,a[1]*scale,a[2]*scale];
  }

  function vDot(a,b){
    return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  }

  function vCross(a,b){
    return [
      a[1]*b[2]-a[2]*b[1],
      a[2]*b[0]-a[0]*b[2],
      a[0]*b[1]-a[1]*b[0]
    ];
  }

  function vLength(a){
    return Math.hypot(a[0],a[1],a[2]);
  }

  function vNormalize(a){
    const length=a?vLength(a):0;
    return length>EPS?vScale(a,1/length):null;
  }

  function vDistance(a,b){
    return vLength(vSub(a,b));
  }

  function clamp(value,min,max){
    return Math.max(min,Math.min(max,value));
  }

  function angleDeg(a,b){
    return Math.acos(clamp(vDot(a,b),-1,1))*180/Math.PI;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function stableClone(value){
    if(Array.isArray(value))return value.map(stableClone);
    if(isObject(value)){
      const copy={};
      for(const key of Object.keys(value).sort()){
        if(value[key]!==undefined)copy[key]=stableClone(value[key]);
      }
      return copy;
    }
    if(typeof value==='number')return Number.isFinite(value)
      ?(Object.is(value,-0)?0:value):null;
    if(value===null||typeof value==='string'||typeof value==='boolean')
      return value;
    return null;
  }

  function stableStringify(value){
    return JSON.stringify(stableClone(value));
  }

  function diagnostic(code,paths,message){
    return deepFreeze({
      code,
      severity:'error',
      phase:'mount-host',
      paths:uniqueStrings(paths),
      message,
      blocksCapabilities:[
        'inspectionMesh','mountIntent','exactSolid','manufacturing','stl'
      ]
    });
  }

  function orderedDiagnostics(diagnostics){
    return diagnostics.slice().sort((left,right)=>
      [left.code,left.paths.join('\u0000'),left.message].join('\u0001')
        .localeCompare(
          [right.code,right.paths.join('\u0000'),right.message]
            .join('\u0001')
        )
    );
  }

  function normalizeDatum(raw,diagnostics){
    const record=isObject(raw)?raw:{},
      originM=vec3(record.originM),
      normal=vNormalize(vec3(record.normal)),
      uAxis=vNormalize(vec3(record.uAxis)),
      vAxis=vNormalize(vec3(record.vAxis));
    if(!originM||!normal||!uAxis||!vAxis){
      diagnostics.push(diagnostic(
        FAILURE_CODES.DATUM_INVALID,
        [
          'mountDatum.originM','mountDatum.normal',
          'mountDatum.uAxis','mountDatum.vAxis'
        ],
        'Mount datum requires an origin and three explicit nonzero axes.'
      ));
    }else{
      const orthogonality=Math.max(
          Math.abs(vDot(normal,uAxis)),
          Math.abs(vDot(normal,vAxis)),
          Math.abs(vDot(uAxis,vAxis))
        ),
        handedness=vDot(vCross(uAxis,vAxis),normal);
      if(orthogonality>1e-7||handedness<1-1e-7)
        diagnostics.push(diagnostic(
          FAILURE_CODES.DATUM_INVALID,
          ['mountDatum.normal','mountDatum.uAxis','mountDatum.vAxis'],
          'Mount datum axes must be orthonormal and right-handed.'
        ));
    }
    return {originM,normal,uAxis,vAxis};
  }

  function normalizeEnvelope(raw,path,requireBody,diagnostics){
    const record=isObject(raw)?raw:{},
      shape=cleanString(record.shape),
      diameterM=positiveNumber(record.diameterM),
      widthM=positiveNumber(record.widthM),
      heightM=positiveNumber(record.heightM),
      cornerRadiusM=nonnegativeNumber(record.cornerRadiusM),
      depthM=positiveNumber(record.depthM),
      frontProjectionM=nonnegativeNumber(record.frontProjectionM);
    if(!['round','rounded-rectangle'].includes(shape))
      diagnostics.push(diagnostic(
        shape?FAILURE_CODES.ENVELOPE_UNSUPPORTED:
          FAILURE_CODES.ENVELOPE_MISSING,
        [path+'.shape'],
        'Documented mount envelopes must be round or rounded-rectangle.'
      ));
    if(shape==='round'&&diameterM===null)diagnostics.push(diagnostic(
      FAILURE_CODES.ENVELOPE_MISSING,[path+'.diameterM'],
      'A round mount envelope requires an explicit full diameter.'
    ));
    if(shape==='rounded-rectangle'){
      if(widthM===null||heightM===null||cornerRadiusM===null)
        diagnostics.push(diagnostic(
          FAILURE_CODES.ENVELOPE_MISSING,
          [path+'.widthM',path+'.heightM',path+'.cornerRadiusM'],
          'A rounded-rectangle mount envelope requires full width, height, and corner radius.'
        ));
      else if(cornerRadiusM>Math.min(widthM,heightM)/2)
        diagnostics.push(diagnostic(
          FAILURE_CODES.ENVELOPE_UNSUPPORTED,[path+'.cornerRadiusM'],
          'Corner radius may not exceed half the short envelope side.'
        ));
    }
    if(requireBody&&(depthM===null||frontProjectionM===null))
      diagnostics.push(diagnostic(
        FAILURE_CODES.ENVELOPE_MISSING,
        [path+'.depthM',path+'.frontProjectionM'],
        'Full documented body depth and front projection are required.'
      ));
    return {
      shape,
      diameterM,
      widthM,
      heightM,
      cornerRadiusM,
      depthM,
      frontProjectionM,
      provenanceRefs:uniqueStrings(record.provenanceRefs)
    };
  }

  function selectGasketEnvelope(source,driverRecord){
    if(isObject(source.gasketEnvelope))return source.gasketEnvelope;
    const gasket=driverRecord&&driverRecord.mounting&&
      driverRecord.mounting.gasket;
    return gasket&&isObject(gasket.envelope)?gasket.envelope:null;
  }

  function buildHostEnvelope(frame,gasket,edgeExtensionM,diagnostics){
    if(!frame.shape||edgeExtensionM===null)return null;
    if(gasket&&gasket.shape&&gasket.shape!==frame.shape){
      diagnostics.push(diagnostic(
        FAILURE_CODES.ENVELOPE_UNSUPPORTED,
        ['driverRecord.frame.shape','gasketEnvelope.shape'],
        'A mixed-shape frame/gasket enclosure needs an explicit audited host solver.'
      ));
      return null;
    }
    if(frame.shape==='round'){
      const diameter=Math.max(
        frame.diameterM||0,gasket&&gasket.diameterM||0
      );
      return {
        shape:'round',
        diameterM:diameter+2*edgeExtensionM,
        widthM:null,
        heightM:null,
        cornerRadiusM:null
      };
    }
    const width=Math.max(
        frame.widthM||0,gasket&&gasket.widthM||0
      ),
      height=Math.max(
        frame.heightM||0,gasket&&gasket.heightM||0
      ),
      radii=[
        frame.cornerRadiusM,
        gasket&&gasket.cornerRadiusM
      ].filter(value=>value!==null&&value!==undefined);
    return {
      shape:'rounded-rectangle',
      diameterM:null,
      widthM:width+2*edgeExtensionM,
      heightM:height+2*edgeExtensionM,
      cornerRadiusM:Math.min(...radii)
    };
  }

  function normalizeActiveCone(raw,driverRecord,diagnostics){
    const record=isObject(raw)?raw:{},
      envelope=normalizeEnvelope(
        record,'activeConeEnvelope',false,diagnostics
      ),
      centerOffsetM=vec2(record.centerOffsetM),
      documented=driverRecord&&driverRecord.diaphragm,
      documentedDiameterM=positiveNumber(
        documented&&documented.activeDiameterM
      ),
      documentedGeometry=documented&&isObject(documented.geometry)
        ?documented.geometry:{},
      documentedShape=cleanString(documentedGeometry.shape),
      documentedCenterOffsetM=vec2(
        documentedGeometry.centerOffsetM
      );
    if(!centerOffsetM)diagnostics.push(diagnostic(
      FAILURE_CODES.ACTIVE_CONE_INVALID,
      ['activeConeEnvelope.centerOffsetM'],
      'Active-cone containment needs an explicit two-dimensional center offset.'
    ));
    if(envelope.shape==='round'&&envelope.diameterM===null||
        envelope.shape==='rounded-rectangle'&&
        (envelope.widthM===null||envelope.heightM===null))
      diagnostics.push(diagnostic(
        FAILURE_CODES.ACTIVE_CONE_INVALID,
        ['activeConeEnvelope'],
        'A complete active-cone face envelope is required.'
      ));
    if(envelope.shape==='round'&&documentedDiameterM!==null&&
        envelope.diameterM!==null&&
        Math.abs(envelope.diameterM-documentedDiameterM)>1e-9)
      diagnostics.push(diagnostic(
        FAILURE_CODES.ACTIVE_CONE_INVALID,
        [
          'activeConeEnvelope.diameterM',
          'driverRecord.diaphragm.activeDiameterM'
        ],
        'Active-cone envelope must match the documented active diameter; it is not independently enlarged.'
      ));
    if(documentedShape&&envelope.shape&&
        documentedShape!==envelope.shape)
      diagnostics.push(diagnostic(
        FAILURE_CODES.ACTIVE_CONE_INVALID,
        [
          'activeConeEnvelope.shape',
          'driverRecord.diaphragm.geometry.shape'
        ],
        'Active-cone envelope shape conflicts with the documented diaphragm geometry.'
      ));
    if(centerOffsetM&&documentedCenterOffsetM&&
        Math.hypot(
          centerOffsetM[0]-documentedCenterOffsetM[0],
          centerOffsetM[1]-documentedCenterOffsetM[1]
        )>1e-9)
      diagnostics.push(diagnostic(
        FAILURE_CODES.ACTIVE_CONE_INVALID,
        [
          'activeConeEnvelope.centerOffsetM',
          'driverRecord.diaphragm.geometry.centerOffsetM'
        ],
        'Active-cone center conflicts with the documented diaphragm geometry.'
      ));
    if(!envelope.provenanceRefs.length&&
        !uniqueStrings(driverRecord&&driverRecord.provenanceRefs).length)
      diagnostics.push(diagnostic(
        FAILURE_CODES.ACTIVE_CONE_INVALID,
        ['activeConeEnvelope.provenanceRefs'],
        'Active-cone geometry requires an explicit provenance reference.'
      ));
    return {
      shape:envelope.shape,
      diameterM:envelope.diameterM,
      widthM:envelope.widthM,
      heightM:envelope.heightM,
      cornerRadiusM:envelope.cornerRadiusM,
      centerOffsetM,
      provenanceRefs:envelope.provenanceRefs
    };
  }

  function normalizeSection(raw,path,diagnostics){
    const section=isObject(raw)?raw:{},
      family=cleanString(section.family),
      diameterM=positiveNumber(section.diameterM),
      widthM=positiveNumber(section.widthM),
      heightM=positiveNumber(section.heightM),
      cornerRadiusM=nonnegativeNumber(section.cornerRadiusM),
      rotationRad=finiteNumber(section.rotationRad);
    if(!['round','ellipse','racetrack','rounded-rectangle']
      .includes(family))diagnostics.push(diagnostic(
      FAILURE_CODES.LUMEN_INVALID,[path+'.family'],
      'Opening section must be round, ellipse, racetrack, or rounded-rectangle.'
    ));
    if(family==='round'&&diameterM===null)diagnostics.push(diagnostic(
      FAILURE_CODES.LUMEN_INVALID,[path+'.diameterM'],
      'A round opening requires an explicit diameter.'
    ));
    if(['ellipse','racetrack','rounded-rectangle'].includes(family)&&
        (widthM===null||heightM===null))diagnostics.push(diagnostic(
      FAILURE_CODES.LUMEN_INVALID,
      [path+'.widthM',path+'.heightM'],
      'This opening section requires explicit width and height.'
    ));
    if(family==='rounded-rectangle'&&
        (cornerRadiusM===null||
          widthM!==null&&heightM!==null&&
          cornerRadiusM>Math.min(widthM,heightM)/2))
      diagnostics.push(diagnostic(
        FAILURE_CODES.LUMEN_INVALID,[path+'.cornerRadiusM'],
        'Rounded-rectangle opening radius must fit the short side.'
      ));
    return {
      family,
      diameterM,
      widthM,
      heightM,
      cornerRadiusM,
      rotationRad:rotationRad===null?0:rotationRad
    };
  }

  function sampleRound(width,height,count){
    const points=[];
    for(let index=0;index<count;index++){
      const angle=2*Math.PI*index/count;
      points.push([
        width*Math.cos(angle)/2,
        height*Math.sin(angle)/2
      ]);
    }
    return points;
  }

  function sampleHorizontalCapsule(width,height,count){
    const quarter=count/4,
      radius=height/2,
      straight=(width-height)/2,
      points=[];
    for(let index=0;index<quarter;index++){
      const angle=-Math.PI/2+Math.PI*index/quarter;
      points.push([
        straight+radius*Math.cos(angle),radius*Math.sin(angle)
      ]);
    }
    for(let index=0;index<quarter;index++)
      points.push([straight-2*straight*index/quarter,radius]);
    for(let index=0;index<quarter;index++){
      const angle=Math.PI/2+Math.PI*index/quarter;
      points.push([
        -straight+radius*Math.cos(angle),radius*Math.sin(angle)
      ]);
    }
    for(let index=0;index<quarter;index++)
      points.push([-straight+2*straight*index/quarter,-radius]);
    return points;
  }

  function sampleRoundedRectangle(width,height,radius,count){
    const quarter=count/4,
      centers=[
        [width/2-radius,height/2-radius],
        [-width/2+radius,height/2-radius],
        [-width/2+radius,-height/2+radius],
        [width/2-radius,-height/2+radius]
      ],
      starts=[0,Math.PI/2,Math.PI,3*Math.PI/2],
      points=[];
    for(let corner=0;corner<4;corner++)
      for(let index=0;index<quarter;index++){
        const angle=starts[corner]+
          Math.PI*index/(2*quarter);
        points.push([
          centers[corner][0]+radius*Math.cos(angle),
          centers[corner][1]+radius*Math.sin(angle)
        ]);
      }
    return points;
  }

  function rotate2(point,angle){
    if(!angle)return point.slice();
    const cosine=Math.cos(angle),sine=Math.sin(angle);
    return [
      cosine*point[0]-sine*point[1],
      sine*point[0]+cosine*point[1]
    ];
  }

  function sampleSection(section,count){
    let points=[];
    if(section.family==='round')
      points=sampleRound(section.diameterM,section.diameterM,count);
    else if(section.family==='ellipse')
      points=sampleRound(section.widthM,section.heightM,count);
    else if(section.family==='racetrack'){
      if(section.widthM>=section.heightM)
        points=sampleHorizontalCapsule(
          section.widthM,section.heightM,count
        );
      else points=sampleHorizontalCapsule(
        section.heightM,section.widthM,count
      ).map(point=>[-point[1],point[0]]);
    }else if(section.family==='rounded-rectangle')
      points=sampleRoundedRectangle(
        section.widthM,section.heightM,
        section.cornerRadiusM,count
      );
    return points.map(point=>rotate2(point,section.rotationRad));
  }

  function projectPoint(point,datum){
    const delta=vSub(point,datum.originM);
    return [vDot(delta,datum.uAxis),vDot(delta,datum.vAxis)];
  }

  function worldSectionBoundary(record,section,datum){
    const frame=record.frames&&record.frames[0],
      points=sampleSection(section,64);
    if(!frame||!vec3(frame.originM)||!vec3(frame.u)||!vec3(frame.v))
      return null;
    return points.map(point=>projectPoint(
      vAdd(
        frame.originM,
        vAdd(vScale(frame.u,point[0]),vScale(frame.v,point[1]))
      ),
      datum
    ));
  }

  function envelopeSignedDistance(point,envelope){
    const x=point[0]-(envelope.centerOffsetM?
        envelope.centerOffsetM[0]:0),
      y=point[1]-(envelope.centerOffsetM?
        envelope.centerOffsetM[1]:0);
    if(envelope.shape==='round')
      return Math.hypot(x,y)-envelope.diameterM/2;
    const radius=envelope.cornerRadiusM,
      qx=Math.abs(x)-(envelope.widthM/2-radius),
      qy=Math.abs(y)-(envelope.heightM/2-radius),
      outside=Math.hypot(Math.max(qx,0),Math.max(qy,0)),
      inside=Math.min(Math.max(qx,qy),0);
    return outside+inside-radius;
  }

  function boundaryRadius(points,center){
    return Math.max(...points.map(point=>
      Math.hypot(point[0]-center[0],point[1]-center[1])
    ));
  }

  function unwrapLumen(item){
    if(isObject(item)&&isObject(item.record))
      return {
        ok:item.ok!==false,
        record:item.record,
        hashInput:cleanString(item.hashInput)
      };
    return {
      ok:isObject(item)&&item.canonicalNegative===true,
      record:isObject(item)?item:{},
      hashInput:null
    };
  }

  function normalizeLumen(
    item,index,source,datum,driverAxis,constraints,diagnostics
  ){
    const wrapped=unwrapLumen(item),
      record=wrapped.record,
      path='lumenNegatives['+index+']',
      id=cleanString(record.id),
      endpoint=isObject(record.driverEndpoint)
        ?record.driverEndpoint:{},
      pointM=vec3(endpoint.pointM),
      flowDirection=vNormalize(vec3(endpoint.flowDirection)),
      surfaceNormal=vNormalize(vec3(endpoint.surfaceNormal)),
      frame=record.frames&&record.frames[0],
      frameAxial=frame?vNormalize(vec3(frame.axial)):null,
      section=normalizeSection(
        record.startSection,path+'.record.startSection',diagnostics
      );
    if(!wrapped.ok||record.canonicalNegative!==true||!id)
      diagnostics.push(diagnostic(
        FAILURE_CODES.LUMEN_INVALID,
        [path],
        'Every acoustic opening must be an explicit successful canonical lumen negative.'
      ));
    if(cleanString(record.ownerSourceId)!==source.ownerSourceId||
        cleanString(record.ownerStationId)!==source.ownerStationId)
      diagnostics.push(diagnostic(
        FAILURE_CODES.LUMEN_OWNERSHIP_MISMATCH,
        [path+'.record.ownerSourceId',path+'.record.ownerStationId'],
        'Every lumen must be owned by this mount source and station.'
      ));
    if(!pointM||!flowDirection||!surfaceNormal||!frameAxial)
      diagnostics.push(diagnostic(
        FAILURE_CODES.LUMEN_INVALID,
        [path+'.record.driverEndpoint',path+'.record.frames[0]'],
        'Canonical lumen start point, face normal, flow axis, and frame are required.'
      ));
    if(pointM&&Math.abs(vDot(
      vSub(pointM,datum.originM),datum.normal
    ))>constraints.datumToleranceM)
      diagnostics.push(diagnostic(
        FAILURE_CODES.LUMEN_AXIS_MISMATCH,
        [path+'.record.driverEndpoint.pointM','mountDatum.originM'],
        'The lumen start must lie on the declared mount datum plane.'
      ));
    if(flowDirection&&surfaceNormal&&
        (angleDeg(flowDirection,driverAxis)>
          constraints.axisToleranceDeg||
         angleDeg(surfaceNormal,driverAxis)>
          constraints.axisToleranceDeg||
         angleDeg(flowDirection,surfaceNormal)>
          constraints.axisToleranceDeg||
         frameAxial&&angleDeg(frameAxial,driverAxis)>
          constraints.axisToleranceDeg))
      diagnostics.push(diagnostic(
        FAILURE_CODES.LUMEN_AXIS_MISMATCH,
        [
          path+'.record.driverEndpoint.flowDirection',
          path+'.record.driverEndpoint.surfaceNormal',
          path+'.record.frames[0].axial',
          'driverAxis'
        ],
        'Each lumen must leave the driver/chamber perpendicular to the driver face.'
      ));
    const boundary=pointM&&frame
        ?worldSectionBoundary(record,section,datum):null,
      center=pointM?projectPoint(pointM,datum):null;
    if(!boundary||!boundary.length||!center)
      diagnostics.push(diagnostic(
        FAILURE_CODES.LUMEN_INVALID,
        [path+'.record.frames[0]',path+'.record.startSection'],
        'The canonical lumen start boundary is unavailable.'
      ));
    return {
      id,
      type:'canonical-lumen-negative',
      acoustic:true,
      ownerSourceId:cleanString(record.ownerSourceId),
      ownerStationId:cleanString(record.ownerStationId),
      canonicalNegative:record.canonicalNegative===true,
      appliedToPositiveHost:false,
      startPointM:pointM,
      startCenterOffsetM:center,
      startSection:section,
      startBoundary2D:boundary,
      boundingRadiusM:boundary&&center
        ?boundaryRadius(boundary,center):null,
      lumenHashInput:wrapped.hashInput||
        (record.canonicalNegative===true
          ?'meh3-lumen-record\n'+stableStringify(record):null),
      provenanceRefs:uniqueStrings(record.provenanceRefs)
    };
  }

  function normalizeAuxiliary(
    item,index,source,diagnostics
  ){
    const record=isObject(item)?item:{},
      path='auxiliaryNegatives['+index+']',
      id=cleanString(record.id),
      type=cleanString(record.type),
      centerOffsetM=vec2(record.centerOffsetM),
      throughHost=typeof record.throughHost==='boolean'
        ?record.throughHost:null,
      section=normalizeSection(
        record.section,path+'.section',diagnostics
      ),
      boundary=centerOffsetM
        ?sampleSection(section,64).map(point=>[
          point[0]+centerOffsetM[0],point[1]+centerOffsetM[1]
        ]):null;
    if(!id||!AUXILIARY_NEGATIVE_TYPES.includes(type))
      diagnostics.push(diagnostic(
        FAILURE_CODES.NEGATIVE_TYPE_INVALID,
        [path+'.id',path+'.type'],
        'Non-acoustic negatives require an ID and fastener, gasket, or clearance type.'
      ));
    if(cleanString(record.ownerSourceId)!==source.ownerSourceId||
        cleanString(record.ownerStationId)!==source.ownerStationId)
      diagnostics.push(diagnostic(
        FAILURE_CODES.OWNERSHIP_INVALID,
        [path+'.ownerSourceId',path+'.ownerStationId'],
        'Auxiliary negatives must be owned by this mount source and station.'
      ));
    if(!centerOffsetM||throughHost===null)
      diagnostics.push(diagnostic(
        FAILURE_CODES.NEGATIVE_TYPE_INVALID,
        [path+'.centerOffsetM',path+'.throughHost'],
        'Auxiliary negatives need an explicit center and through-host status.'
      ));
    if(type==='gasket-negative'&&throughHost===true)
      diagnostics.push(diagnostic(
        FAILURE_CODES.NEGATIVE_TYPE_INVALID,
        [path+'.type',path+'.throughHost'],
        'A gasket negative is a sealing recess, never an acoustic through-opening.'
      ));
    return {
      id,
      type,
      acoustic:false,
      ownerSourceId:cleanString(record.ownerSourceId),
      ownerStationId:cleanString(record.ownerStationId),
      centerOffsetM,
      section,
      throughHost,
      depthM:nonnegativeNumber(record.depthM),
      purpose:cleanString(record.purpose),
      appliedToPositiveHost:false,
      boundary2D:boundary,
      boundingRadiusM:boundary&&centerOffsetM
        ?boundaryRadius(boundary,centerOffsetM):null,
      provenanceRefs:uniqueStrings(record.provenanceRefs)
    };
  }

  function validateLayout(
    lumens,auxiliary,activeCone,hostEnvelope,constraints,diagnostics
  ){
    const openings=[];
    const activeBoundary=sampleEnvelope(activeCone,128).map(point=>[
      point[0]+activeCone.centerOffsetM[0],
      point[1]+activeCone.centerOffsetM[1]
    ]);
    if(activeBoundary.some(point=>
      envelopeSignedDistance(point,hostEnvelope)>
        constraints.datumToleranceM
    ))diagnostics.push(diagnostic(
      FAILURE_CODES.ACTIVE_CONE_INVALID,
      ['activeConeEnvelope','positiveHost.faceEnvelope'],
      'The documented active cone must be fully contained by the positive host face.'
    ));
    for(const lumen of lumens){
      if(!lumen.startBoundary2D||!lumen.startCenterOffsetM)continue;
      const outside=lumen.startBoundary2D.some(point=>
        envelopeSignedDistance(point,activeCone)>constraints.datumToleranceM
      );
      if(outside)diagnostics.push(diagnostic(
        FAILURE_CODES.LUMEN_START_OUTSIDE_ACTIVE_CONE,
        ['lumenNegatives['+(lumen.id||'?')+'].startSection'],
        'Every lumen start boundary must remain inside the documented active-cone envelope.'
      ));
      openings.push({
        id:lumen.id,
        center:lumen.startCenterOffsetM,
        boundary:lumen.startBoundary2D,
        radius:lumen.boundingRadiusM
      });
    }
    for(const negative of auxiliary){
      if(!negative.boundary2D||!negative.centerOffsetM)continue;
      if(negative.throughHost&&
          envelopeSignedDistance(
            negative.centerOffsetM,activeCone
          )<=0)
        diagnostics.push(diagnostic(
          FAILURE_CODES.CENTRAL_HOLE_REFUSED,
          ['auxiliaryNegatives['+(negative.id||'?')+']'],
          'A non-lumen through-hole may not open the active cone; central driver cutouts are refused.'
        ));
      openings.push({
        id:negative.id,
        center:negative.centerOffsetM,
        boundary:negative.boundary2D,
        radius:negative.boundingRadiusM
      });
    }
    for(const opening of openings){
      const minimumEdge=Math.min(...opening.boundary.map(point=>
        -envelopeSignedDistance(point,hostEnvelope)
      ));
      if(minimumEdge+EPS<constraints.minimumEdgeM)
        diagnostics.push(diagnostic(
          FAILURE_CODES.EDGE_CLEARANCE,
          ['negativeIntents['+(opening.id||'?')+']'],
          'Every negative must retain the declared minimum edge distance to the positive host boundary.'
        ));
    }
    for(let left=0;left<openings.length;left++)
      for(let right=left+1;right<openings.length;right++){
        const a=openings[left],b=openings[right];
        if(a.radius===null||b.radius===null)continue;
        const clearance=Math.hypot(
          a.center[0]-b.center[0],a.center[1]-b.center[1]
        )-a.radius-b.radius;
        if(clearance+EPS<constraints.minimumWebM)
          diagnostics.push(diagnostic(
            FAILURE_CODES.WEB_FAILURE,
            [
              'negativeIntents['+(a.id||'?')+']',
              'negativeIntents['+(b.id||'?')+']'
            ],
            'Opening pair '+(a.id||'?')+' / '+(b.id||'?')+
              ' violates the declared minimum solid web.'
          ));
      }
  }

  function sampleEnvelope(envelope,count){
    if(envelope.shape==='round')
      return sampleRound(envelope.diameterM,envelope.diameterM,count);
    return sampleRoundedRectangle(
      envelope.widthM,envelope.heightM,envelope.cornerRadiusM,count
    );
  }

  function signedVolume(vertices,triangles){
    let volume=0;
    for(const triangle of triangles){
      const a=vertices[triangle[0]],
        b=vertices[triangle[1]],
        c=vertices[triangle[2]];
      volume+=vDot(a,vCross(b,c))/6;
    }
    return volume;
  }

  function auditMesh(vertices,triangles){
    const edges=new Map();
    let degenerateTriangles=0;
    for(const triangle of triangles){
      const a=vertices[triangle[0]],
        b=vertices[triangle[1]],
        c=vertices[triangle[2]];
      if(vLength(vCross(vSub(b,a),vSub(c,a)))<=EPS)
        degenerateTriangles++;
      for(let index=0;index<3;index++){
        const left=triangle[index],
          right=triangle[(index+1)%3],
          key=left<right?left+':'+right:right+':'+left;
        edges.set(key,(edges.get(key)||0)+1);
      }
    }
    const values=[...edges.values()],
      openEdges=values.filter(value=>value===1).length,
      nonManifoldEdges=values.filter(value=>value!==2).length,
      volume=signedVolume(vertices,triangles);
    return {
      vertexCount:vertices.length,
      triangleCount:triangles.length,
      edgeCount:edges.size,
      openEdges,
      nonManifoldEdges,
      degenerateTriangles,
      signedVolumeM3:volume,
      volumeM3:Math.abs(volume),
      closed:openEdges===0,
      twoManifold:nonManifoldEdges===0,
      outwardOrientation:volume>0
    };
  }

  function buildInspectionMesh(envelope,thicknessM,datum,segments){
    const boundary=sampleEnvelope(envelope,segments),
      vertices=[],
      triangles=[],
      half=thicknessM/2;
    for(const offset of [-half,half])
      for(const point of boundary)
        vertices.push(vAdd(
          vAdd(
            datum.originM,
            vAdd(
              vScale(datum.uAxis,point[0]),
              vScale(datum.vAxis,point[1])
            )
          ),
          vScale(datum.normal,offset)
        ));
    const backCenter=vertices.length,
      frontCenter=backCenter+1;
    vertices.push(
      vAdd(datum.originM,vScale(datum.normal,-half)),
      vAdd(datum.originM,vScale(datum.normal,half))
    );
    for(let index=0;index<segments;index++){
      const next=(index+1)%segments,
        back=index,
        backNext=next,
        front=segments+index,
        frontNext=segments+next;
      triangles.push([back,backNext,frontNext],[back,frontNext,front]);
      triangles.push([backCenter,backNext,back]);
      triangles.push([frontCenter,front,frontNext]);
    }
    let audit=auditMesh(vertices,triangles);
    if(!audit.outwardOrientation){
      for(const triangle of triangles){
        const swap=triangle[1];
        triangle[1]=triangle[2];
        triangle[2]=swap;
      }
      audit=auditMesh(vertices,triangles);
    }
    return {
      role:'positive-host-inspection-mesh',
      verticesM:vertices,
      triangles,
      audit,
      fullFace:true,
      centerOpen:false,
      negativesApplied:false,
      manufacturingAuthority:false
    };
  }

  function buildMountHost(input){
    const source=isObject(input)?input:{},
      diagnostics=[],
      id=cleanString(source.id),
      mode=cleanString(source.mode),
      ownerSourceId=cleanString(source.ownerSourceId),
      ownerStationId=cleanString(source.ownerStationId),
      datum=normalizeDatum(source.mountDatum,diagnostics),
      driverAxis=vNormalize(vec3(source.driverAxis)),
      axisToleranceDeg=positiveNumber(
        source.constraints&&source.constraints.axisToleranceDeg
      ),
      minimumWebM=positiveNumber(
        source.constraints&&source.constraints.minimumWebM
      ),
      minimumEdgeM=positiveNumber(
        source.constraints&&source.constraints.minimumEdgeM
      ),
      datumToleranceM=nonnegativeNumber(
        source.constraints&&source.constraints.datumToleranceM
      ),
      constraints={
        axisToleranceDeg,
        minimumWebM,
        minimumEdgeM,
        datumToleranceM:datumToleranceM===null?1e-6:datumToleranceM
      },
      hostThicknessM=positiveNumber(
        source.host&&source.host.thicknessM
      ),
      edgeExtensionM=nonnegativeNumber(
        source.host&&source.host.edgeExtensionM
      ),
      driverInput=isObject(source.driverRecord)&&
        isObject(source.driverRecord.record)
          ?source.driverRecord.record:source.driverRecord,
      driverRecord=isObject(driverInput)?driverInput:{};
    if(!id)diagnostics.push(diagnostic(
      FAILURE_CODES.INVALID_INPUT,['id'],'A stable mount-host ID is required.'
    ));
    if(!MODES.includes(mode))diagnostics.push(diagnostic(
      FAILURE_CODES.MODE_INVALID,['mode'],
      'Mount mode must be integrated-solid or detachable-gasketed.'
    ));
    if(!ownerSourceId||!ownerStationId)diagnostics.push(diagnostic(
      FAILURE_CODES.OWNERSHIP_INVALID,
      ['ownerSourceId','ownerStationId'],
      'Mount host source and station ownership are both required.'
    ));
    if(isObject(source.driverRecord)&&
        Object.prototype.hasOwnProperty.call(source.driverRecord,'ok')&&
        source.driverRecord.ok!==true)
      diagnostics.push(diagnostic(
        FAILURE_CODES.ENVELOPE_MISSING,['driverRecord'],
        'A failed driver-record validation result cannot own a mount host.'
      ));
    if(!cleanString(driverRecord.id))diagnostics.push(diagnostic(
      FAILURE_CODES.ENVELOPE_MISSING,['driverRecord.id'],
      'A documented driver record is required.'
    ));
    if(!driverAxis)diagnostics.push(diagnostic(
      FAILURE_CODES.DATUM_INVALID,['driverAxis'],
      'A nonzero driver axis is required.'
    ));
    if(driverAxis&&datum.normal&&
        angleDeg(driverAxis,datum.normal)>
          (axisToleranceDeg||1))
      diagnostics.push(diagnostic(
        FAILURE_CODES.AXIS_MISMATCH,
        ['driverAxis','mountDatum.normal'],
        'Driver axis must be perpendicular to and aligned with the mount face.'
      ));
    if(axisToleranceDeg===null||axisToleranceDeg>15||
        minimumWebM===null||minimumEdgeM===null)
      diagnostics.push(diagnostic(
        FAILURE_CODES.HOST_INVALID,
        [
          'constraints.axisToleranceDeg',
          'constraints.minimumWebM',
          'constraints.minimumEdgeM'
        ],
        'Positive axis tolerance up to 15 degrees and explicit positive web/edge constraints are required.'
      ));
    if(hostThicknessM===null||edgeExtensionM===null)
      diagnostics.push(diagnostic(
        FAILURE_CODES.HOST_INVALID,
        ['host.thicknessM','host.edgeExtensionM'],
        'Host thickness and nonnegative full-envelope edge extension are required.'
      ));
    const frame=normalizeEnvelope(
        driverRecord.frame,'driverRecord.frame',true,diagnostics
      ),
      gasketRaw=selectGasketEnvelope(source,driverRecord),
      gasket=gasketRaw
        ?normalizeEnvelope(
          gasketRaw,'gasketEnvelope',false,diagnostics
        ):null;
    if(mode==='detachable-gasketed'&&!gasket)
      diagnostics.push(diagnostic(
        FAILURE_CODES.ENVELOPE_MISSING,['gasketEnvelope'],
        'A detachable-gasketed host requires an explicit documented gasket envelope.'
      ));
    const hostEnvelope=buildHostEnvelope(
        frame,gasket,edgeExtensionM,diagnostics
      ),
      activeCone=normalizeActiveCone(
        source.activeConeEnvelope,driverRecord,diagnostics
      ),
      lumenInput=Array.isArray(source.lumenNegatives)
        ?source.lumenNegatives:[],
      auxiliaryInput=Array.isArray(source.auxiliaryNegatives)
        ?source.auxiliaryNegatives:[],
      lumenIds=new Set(),
      auxiliaryIds=new Set(),
      lumens=[],
      auxiliary=[];
    if(!lumenInput.length)diagnostics.push(diagnostic(
      FAILURE_CODES.LUMEN_REQUIRED,['lumenNegatives'],
      'A mount host requires at least one separately owned canonical acoustic lumen.'
    ));
    if(datum.originM&&datum.normal&&datum.uAxis&&datum.vAxis&&
        driverAxis)
      for(let index=0;index<lumenInput.length;index++){
        const lumen=normalizeLumen(
          lumenInput[index],index,
          {ownerSourceId,ownerStationId},
          datum,driverAxis,constraints,diagnostics
        );
        if(!lumen.id||lumenIds.has(lumen.id))
          diagnostics.push(diagnostic(
            FAILURE_CODES.LUMEN_INVALID,
            ['lumenNegatives['+index+'].record.id'],
            'Canonical lumen IDs must be nonempty and unique.'
          ));
        if(lumen.id)lumenIds.add(lumen.id);
        lumens.push(lumen);
      }
    for(let index=0;index<auxiliaryInput.length;index++){
      const negative=normalizeAuxiliary(
        auxiliaryInput[index],index,
        {ownerSourceId,ownerStationId},diagnostics
      );
      if(!negative.id||auxiliaryIds.has(negative.id)||
          lumenIds.has(negative.id))
        diagnostics.push(diagnostic(
          FAILURE_CODES.NEGATIVE_TYPE_INVALID,
          ['auxiliaryNegatives['+index+'].id'],
          'All mount negative IDs must be nonempty and unique.'
        ));
      if(negative.id)auxiliaryIds.add(negative.id);
      auxiliary.push(negative);
    }
    const activeConeReady=activeCone.centerOffsetM&&
      (activeCone.shape==='round'&&activeCone.diameterM!==null||
       activeCone.shape==='rounded-rectangle'&&
        activeCone.widthM!==null&&activeCone.heightM!==null&&
        activeCone.cornerRadiusM!==null);
    if(hostEnvelope&&activeConeReady&&
        constraints.minimumWebM&&constraints.minimumEdgeM)
      validateLayout(
        lumens,auxiliary,activeCone,hostEnvelope,
        constraints,diagnostics
      );
    const ordered=orderedDiagnostics(diagnostics);
    if(ordered.length)return failureResult(
      id,mode,ownerSourceId,ownerStationId,ordered
    );
    const segmentsRaw=Number(
        source.inspection&&source.inspection.segments
      ),
      segments=Number.isInteger(segmentsRaw)&&
        segmentsRaw>=16&&segmentsRaw<=256
        ?Math.ceil(segmentsRaw/4)*4:64,
      inspectionMesh=buildInspectionMesh(
        hostEnvelope,hostThicknessM,datum,segments
      );
    if(!inspectionMesh.audit.closed||
        !inspectionMesh.audit.twoManifold||
        inspectionMesh.audit.degenerateTriangles||
        !inspectionMesh.audit.outwardOrientation){
      return failureResult(
        id,mode,ownerSourceId,ownerStationId,
        [diagnostic(
          FAILURE_CODES.INSPECTION_MESH_INVALID,
          ['inspectionMesh'],
          'The full-face positive-host inspection mesh failed its local manifold audit.'
        )]
      );
    }
    const record=deepFreeze({
      schemaVersion:1,
      id,
      mode,
      ownerSourceId,
      ownerStationId,
      driverRecordId:cleanString(driverRecord.id),
      positiveHost:{
        role:'full-face-positive-solid-host-intent',
        positiveVolumeIntended:true,
        fullFace:true,
        centerOpen:false,
        decorativeSkin:false,
        datum,
        driverAxis,
        faceEnvelope:hostEnvelope,
        thicknessM:hostThicknessM,
        edgeExtensionM,
        axialSpanM:{
          minimum:-hostThicknessM/2,
          maximum:hostThicknessM/2
        },
        documentedDriverBodyEnvelope:frame,
        documentedGasketEnvelope:gasket,
        attachmentIntent:mode==='integrated-solid'
          ?'integrated-with-horn-positive-host'
          :'detachable-gasketed-host',
        booleanUnionPerformed:false
      },
      activeConeEnvelope:activeCone,
      negativeIntents:{
        acousticLumens:lumens.sort((left,right)=>
          String(left.id).localeCompare(String(right.id))
        ),
        auxiliary:auxiliary.sort((left,right)=>
          String(left.id).localeCompare(String(right.id))
        ),
        onlyCanonicalLumensAreAcoustic:true,
        booleanSubtractionPerformed:false
      },
      constraints,
      validation:{
        datumAxis:true,
        fullBodyEnvelope:true,
        activeConeContainment:true,
        minimumWeb:true,
        minimumEdge:true,
        ownership:true,
        perpendicularDriverEntry:true
      },
      manufacturingValidated:false
    });
    return deepFreeze({
      ok:true,
      code:null,
      record,
      inspectionMesh,
      diagnostics:[],
      hashInput:'meh3-mount-host-v1\n'+stableStringify(record),
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function failureResult(
    id,mode,ownerSourceId,ownerStationId,diagnostics
  ){
    const ordered=orderedDiagnostics(diagnostics);
    return deepFreeze({
      ok:false,
      code:ordered.length?ordered[0].code:FAILURE_CODES.INVALID_INPUT,
      record:{
        schemaVersion:1,
        id:id||null,
        mode:mode||null,
        ownerSourceId:ownerSourceId||null,
        ownerStationId:ownerStationId||null,
        positiveHost:null,
        negativeIntents:null,
        manufacturingValidated:false
      },
      inspectionMesh:null,
      diagnostics:ordered,
      hashInput:null,
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'mount-host-boolean',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      booleanUnion:false,
      booleanSubtraction:false,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    version:VERSION,
    modes:MODES,
    auxiliaryNegativeTypes:AUXILIARY_NEGATIVE_TYPES,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    stableStringify,
    buildMountHost,
    manufacturingPreflight
  });
});
