/* MEH Studio v5 — canonical three-way acoustic-lumen geometry.

   A lumen is a closed negative volume, not a decorative dark tube.  This
   module constructs one deterministic swept volume from the driver/chamber
   endpoint to the horn endpoint.  The same record can later be consumed by
   acoustics, inspection rendering, and an exact Boolean worker.

   This module does not perform a Boolean subtraction and cannot authorize
   manufacturing.  Its mesh is an inspection/negative-tool candidate only. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3LumenGeometry=factory();
})(function(){
  'use strict';

  const VERSION=1;
  const FAILURE_CODES=Object.freeze({
    INVALID_INPUT:'THREEWAY_LUMEN_INPUT_INVALID',
    ENDPOINT_INVALID:'THREEWAY_LUMEN_ENDPOINT_INVALID',
    DRIVER_AXIS_MISMATCH:'THREEWAY_LUMEN_DRIVER_AXIS_MISMATCH',
    HORN_INTERSECTION_INVALID:'THREEWAY_LUMEN_HORN_INTERSECTION_INVALID',
    SECTION_INVALID:'THREEWAY_LUMEN_SECTION_INVALID',
    AREA_PROGRESSION_INVALID:'THREEWAY_PASSAGE_AREA_NONMONOTONIC',
    PATH_DEGENERATE:'THREEWAY_PASSAGE_DISCONNECTED',
    MESH_NONMANIFOLD:'THREEWAY_LUMEN_NEGATIVE_NONMANIFOLD'
  });
  const CAPABILITIES=deepFreeze({
    status:'canonical-negative-volume-candidate',
    endpointContract:true,
    perpendicularDriverEntry:true,
    parallelTransportFrames:true,
    roundSection:true,
    ellipseSection:true,
    racetrackSection:true,
    roundedRectangleSection:true,
    closedInspectionMesh:true,
    exactBooleanSubtraction:false,
    positiveHostUnion:false,
    fabricationAudit:false,
    manufacturingPlan:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'A closed lumen candidate is not proof that it was subtracted through every positive host layer.'
  });
  const EPS=1e-10;

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

  function finiteInteger(value,min,max){
    const number=Number(value);
    return Number.isInteger(number)&&number>=min&&number<=max?number:null;
  }

  function vec(value){
    if(!Array.isArray(value)||value.length!==3)return null;
    const result=value.map(finiteNumber);
    return result.every(item=>item!==null)?result:null;
  }

  function vAdd(a,b){
    return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  }

  function vSub(a,b){
    return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  }

  function vScale(a,s){
    return [a[0]*s,a[1]*s,a[2]*s];
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
    const length=vLength(a);
    return length>EPS?vScale(a,1/length):null;
  }

  function vDistance(a,b){
    return vLength(vSub(a,b));
  }

  function clamp(value,min,max){
    return Math.max(min,Math.min(max,value));
  }

  function diagnostic(code,paths,message){
    return deepFreeze({
      code,
      severity:'error',
      phase:'lumen-geometry',
      paths:(paths||[]).slice().sort(),
      message,
      blocksCapabilities:[
        'renderPreview','manufacturingPlan','exactSolid','manufacturing','stl'
      ]
    });
  }

  function stableClone(value){
    if(Array.isArray(value))return value.map(stableClone);
    if(isObject(value)){
      const result={};
      for(const key of Object.keys(value).sort()){
        if(value[key]!==undefined)result[key]=stableClone(value[key]);
      }
      return result;
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

  function endpoint(raw,path,diagnostics){
    const record=isObject(raw)?raw:{},
      point=vec(record.pointM),
      flowDirection=vNormalize(vec(record.flowDirection)||[]),
      surfaceNormal=vNormalize(vec(record.surfaceNormal)||[]);
    if(!point||!flowDirection)diagnostics.push(diagnostic(
      FAILURE_CODES.ENDPOINT_INVALID,
      [path+'.pointM',path+'.flowDirection'],
      'Each endpoint requires an explicit SI point and nonzero flow direction.'
    ));
    return {
      pointM:point,
      flowDirection,
      surfaceNormal,
      datum:cleanString(record.datum),
      provenanceRefs:Array.isArray(record.provenanceRefs)
        ?record.provenanceRefs.map(cleanString).filter(Boolean).sort():[]
    };
  }

  function sectionArea(section){
    if(section.family==='round')
      return Math.PI*section.diameterM*section.diameterM/4;
    if(section.family==='ellipse')
      return Math.PI*section.widthM*section.heightM/4;
    if(section.family==='racetrack'){
      const major=Math.max(section.widthM,section.heightM),
        minor=Math.min(section.widthM,section.heightM);
      return (major-minor)*minor+Math.PI*minor*minor/4;
    }
    if(section.family==='rounded-rectangle'){
      const r=section.cornerRadiusM;
      return section.widthM*section.heightM-
        (4-Math.PI)*r*r;
    }
    return null;
  }

  function normalizeSection(raw,path,diagnostics){
    const record=isObject(raw)?raw:{},
      family=cleanString(record.family),
      diameterM=positiveNumber(record.diameterM),
      widthM=positiveNumber(record.widthM),
      heightM=positiveNumber(record.heightM),
      cornerRadiusM=positiveNumber(record.cornerRadiusM);
    if(!['round','ellipse','racetrack','rounded-rectangle']
      .includes(family))diagnostics.push(diagnostic(
      FAILURE_CODES.SECTION_INVALID,[path+'.family'],
      'Section family must be round, ellipse, racetrack, or rounded-rectangle.'
    ));
    if(family==='round'&&diameterM===null)diagnostics.push(diagnostic(
      FAILURE_CODES.SECTION_INVALID,[path+'.diameterM'],
      'A round lumen section requires an explicit diameter.'
    ));
    if(['ellipse','racetrack','rounded-rectangle'].includes(family)&&
        (widthM===null||heightM===null))diagnostics.push(diagnostic(
      FAILURE_CODES.SECTION_INVALID,[path+'.widthM',path+'.heightM'],
      'This lumen section requires explicit width and height.'
    ));
    if(family==='rounded-rectangle'&&
        (cornerRadiusM===null||
         (widthM!==null&&heightM!==null&&
          cornerRadiusM>Math.min(widthM,heightM)/2)))
      diagnostics.push(diagnostic(
        FAILURE_CODES.SECTION_INVALID,[path+'.cornerRadiusM'],
        'Rounded-rectangle corner radius must be positive and no larger than half the short side.'
      ));
    const section={
      family,
      diameterM,
      widthM,
      heightM,
      cornerRadiusM,
      rotationRad:finiteNumber(record.rotationRad)||0
    };
    section.areaM2=sectionArea(section);
    return section;
  }

  function interpolateSection(start,end,t){
    const mix=(a,b)=>a===null||b===null?null:a+(b-a)*t;
    return {
      family:start.family,
      diameterM:mix(start.diameterM,end.diameterM),
      widthM:mix(start.widthM,end.widthM),
      heightM:mix(start.heightM,end.heightM),
      cornerRadiusM:mix(start.cornerRadiusM,end.cornerRadiusM),
      rotationRad:start.rotationRad+
        (end.rotationRad-start.rotationRad)*t
    };
  }

  function hermitePoint(p0,p1,m0,m1,t){
    const t2=t*t,t3=t2*t,
      h00=2*t3-3*t2+1,
      h10=t3-2*t2+t,
      h01=-2*t3+3*t2,
      h11=t3-t2;
    return [
      h00*p0[0]+h10*m0[0]+h01*p1[0]+h11*m1[0],
      h00*p0[1]+h10*m0[1]+h01*p1[1]+h11*m1[1],
      h00*p0[2]+h10*m0[2]+h01*p1[2]+h11*m1[2]
    ];
  }

  function hermiteTangent(p0,p1,m0,m1,t){
    const t2=t*t,
      h00=6*t2-6*t,
      h10=3*t2-4*t+1,
      h01=-6*t2+6*t,
      h11=3*t2-2*t;
    return vNormalize([
      h00*p0[0]+h10*m0[0]+h01*p1[0]+h11*m1[0],
      h00*p0[1]+h10*m0[1]+h01*p1[1]+h11*m1[1],
      h00*p0[2]+h10*m0[2]+h01*p1[2]+h11*m1[2]
    ]);
  }

  function deterministicPerpendicular(axis,upHint){
    let projected=null;
    if(upHint){
      projected=vSub(upHint,vScale(axis,vDot(upHint,axis)));
      if(vLength(projected)<=EPS)projected=null;
    }
    if(!projected){
      const candidates=[[1,0,0],[0,1,0],[0,0,1]].sort(
        (left,right)=>Math.abs(vDot(left,axis))-Math.abs(vDot(right,axis))
      );
      projected=vSub(
        candidates[0],vScale(axis,vDot(candidates[0],axis))
      );
    }
    return vNormalize(projected);
  }

  function parallelFrames(points,tangents,upHint){
    const frames=[],
      initialU=deterministicPerpendicular(tangents[0],upHint),
      initialV=vNormalize(vCross(tangents[0],initialU));
    frames.push({
      originM:points[0].slice(),
      axial:tangents[0].slice(),
      u:initialU,
      v:initialV
    });
    for(let index=1;index<points.length;index++){
      const axial=tangents[index],
        previous=frames[index-1],
        projected=vSub(previous.u,vScale(axial,vDot(previous.u,axial))),
        u=vNormalize(projected)||
          deterministicPerpendicular(axial,previous.v),
        v=vNormalize(vCross(axial,u));
      frames.push({
        originM:points[index].slice(),
        axial:axial.slice(),
        u,
        v
      });
    }
    return frames;
  }

  function rotate2(point,angle){
    if(!angle)return point;
    const c=Math.cos(angle),s=Math.sin(angle);
    return [c*point[0]-s*point[1],s*point[0]+c*point[1]];
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
    const q=count/4,r=height/2,halfStraight=(width-height)/2,
      points=[];
    for(let index=0;index<q;index++){
      const angle=-Math.PI/2+Math.PI*index/q;
      points.push([
        halfStraight+r*Math.cos(angle),r*Math.sin(angle)
      ]);
    }
    for(let index=0;index<q;index++){
      const t=index/q;
      points.push([halfStraight-2*halfStraight*t,r]);
    }
    for(let index=0;index<q;index++){
      const angle=Math.PI/2+Math.PI*index/q;
      points.push([
        -halfStraight+r*Math.cos(angle),r*Math.sin(angle)
      ]);
    }
    for(let index=0;index<q;index++){
      const t=index/q;
      points.push([-halfStraight+2*halfStraight*t,-r]);
    }
    return points;
  }

  function sampleCapsule(width,height,count){
    if(width>=height)return sampleHorizontalCapsule(width,height,count);
    return sampleHorizontalCapsule(height,width,count)
      .map(point=>[-point[1],point[0]]);
  }

  function sampleRoundedRectangle(width,height,radius,count){
    const q=count/4,points=[],
      centers=[
        [width/2-radius,height/2-radius],
        [-width/2+radius,height/2-radius],
        [-width/2+radius,-height/2+radius],
        [width/2-radius,-height/2+radius]
      ],
      starts=[0,Math.PI/2,Math.PI,3*Math.PI/2];
    for(let corner=0;corner<4;corner++){
      for(let index=0;index<q;index++){
        const angle=starts[corner]+Math.PI*index/(2*q),
          center=centers[corner];
        points.push([
          center[0]+radius*Math.cos(angle),
          center[1]+radius*Math.sin(angle)
        ]);
      }
    }
    return points;
  }

  function sampleSection(section,count){
    let points;
    if(section.family==='round')
      points=sampleRound(section.diameterM,section.diameterM,count);
    else if(section.family==='ellipse')
      points=sampleRound(section.widthM,section.heightM,count);
    else if(section.family==='racetrack')
      points=sampleCapsule(section.widthM,section.heightM,count);
    else points=sampleRoundedRectangle(
      section.widthM,section.heightM,section.cornerRadiusM,count
    );
    return points.map(point=>rotate2(point,section.rotationRad));
  }

  function worldPoint(frame,point){
    return vAdd(
      frame.originM,
      vAdd(vScale(frame.u,point[0]),vScale(frame.v,point[1]))
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
      for(let edge=0;edge<3;edge++){
        const left=triangle[edge],right=triangle[(edge+1)%3],
          key=left<right?left+':'+right:right+':'+left;
        edges.set(key,(edges.get(key)||0)+1);
      }
    }
    const counts=[...edges.values()],
      openEdges=counts.filter(count=>count===1).length,
      nonManifoldEdges=counts.filter(count=>count!==2).length,
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

  function buildMesh(frames,sections,sectionSegments){
    const vertices=[],triangles=[],
      ringCount=frames.length;
    for(let ring=0;ring<ringCount;ring++){
      const points=sampleSection(sections[ring],sectionSegments);
      for(const point of points)
        vertices.push(worldPoint(frames[ring],point));
    }
    for(let ring=0;ring<ringCount-1;ring++){
      for(let side=0;side<sectionSegments;side++){
        const next=(side+1)%sectionSegments,
          a=ring*sectionSegments+side,
          b=ring*sectionSegments+next,
          c=(ring+1)*sectionSegments+side,
          d=(ring+1)*sectionSegments+next;
        triangles.push([a,b,d],[a,d,c]);
      }
    }
    const startCenter=vertices.length;
    vertices.push(frames[0].originM.slice());
    const endCenter=vertices.length;
    vertices.push(frames[ringCount-1].originM.slice());
    const endOffset=(ringCount-1)*sectionSegments;
    for(let side=0;side<sectionSegments;side++){
      const next=(side+1)%sectionSegments;
      triangles.push([startCenter,next,side]);
      triangles.push([endCenter,endOffset+side,endOffset+next]);
    }
    const audit=auditMesh(vertices,triangles);
    if(!audit.outwardOrientation){
      for(const triangle of triangles){
        const swap=triangle[1];
        triangle[1]=triangle[2];
        triangle[2]=swap;
      }
    }
    return {vertices,triangles,audit:auditMesh(vertices,triangles)};
  }

  function areaProgressionValid(areas,policy,tolerance){
    if(policy==='either')return true;
    for(let index=1;index<areas.length;index++){
      const delta=areas[index]-areas[index-1],
        scale=Math.max(areas[index],areas[index-1],EPS);
      if(policy==='constant'&&Math.abs(delta)>tolerance*scale)
        return false;
      if(policy==='nondecreasing'&&delta<-tolerance*scale)return false;
      if(policy==='nonincreasing'&&delta>tolerance*scale)return false;
    }
    return true;
  }

  function buildCanonicalLumen(input){
    const source=isObject(input)?input:{},
      diagnostics=[],
      id=cleanString(source.id),
      driver=endpoint(source.driverEndpoint,'driverEndpoint',diagnostics),
      horn=endpoint(source.hornEndpoint,'hornEndpoint',diagnostics),
      startSection=normalizeSection(
        source.startSection,'startSection',diagnostics
      ),
      endSection=normalizeSection(
        source.endSection,'endSection',diagnostics
      ),
      path=isObject(source.path)?source.path:{},
      samples=finiteInteger(path.samples,3,257)||17,
      sectionSegmentsRaw=finiteInteger(
        source.sectionSegments,8,256
      )||32,
      sectionSegments=Math.ceil(sectionSegmentsRaw/4)*4,
      tangentScaleStartM=positiveNumber(path.driverTangentScaleM),
      tangentScaleEndM=positiveNumber(path.hornTangentScaleM),
      progression=cleanString(source.areaProgression)||'either',
      progressionTolerance=positiveNumber(
        source.areaProgressionTolerance
      )||1e-8,
      driverAxisToleranceDeg=positiveNumber(
        source.driverAxisToleranceDeg
      )||1,
      hornCrossingMinimumDeg=positiveNumber(
        source.hornCrossingMinimumDeg
      )||15;
    if(!id)diagnostics.push(diagnostic(
      FAILURE_CODES.INVALID_INPUT,['id'],'A stable lumen ID is required.'
    ));
    if(startSection.family&&endSection.family&&
        startSection.family!==endSection.family)diagnostics.push(diagnostic(
      FAILURE_CODES.SECTION_INVALID,
      ['startSection.family','endSection.family'],
      'One swept lumen keeps one section family; use a declared transition split for a family change.'
    ));
    if(!['constant','nondecreasing','nonincreasing','either']
      .includes(progression))diagnostics.push(diagnostic(
      FAILURE_CODES.AREA_PROGRESSION_INVALID,['areaProgression'],
      'Area progression must be constant, nondecreasing, nonincreasing, or either.'
    ));
    if(driver.flowDirection&&driver.surfaceNormal){
      const alignment=clamp(
        vDot(driver.flowDirection,driver.surfaceNormal),-1,1
      ),
        angleDeg=Math.acos(alignment)*180/Math.PI;
      if(angleDeg>driverAxisToleranceDeg)diagnostics.push(diagnostic(
        FAILURE_CODES.DRIVER_AXIS_MISMATCH,
        ['driverEndpoint.flowDirection','driverEndpoint.surfaceNormal'],
        'The passage must leave the driver/chamber perpendicular to its declared face; mismatch is '+
          angleDeg.toFixed(3)+' degrees.'
      ));
    }
    if(horn.flowDirection&&horn.surfaceNormal){
      const crossing=Math.abs(vDot(
          horn.flowDirection,horn.surfaceNormal
        )),
        crossingDeg=Math.asin(clamp(crossing,0,1))*180/Math.PI;
      if(crossingDeg<hornCrossingMinimumDeg)diagnostics.push(diagnostic(
        FAILURE_CODES.HORN_INTERSECTION_INVALID,
        ['hornEndpoint.flowDirection','hornEndpoint.surfaceNormal'],
        'The lumen centerline is too tangent to the horn wall to form a robust through-interface.'
      ));
    }
    const directLength=driver.pointM&&horn.pointM
      ?vDistance(driver.pointM,horn.pointM):null;
    if(!(directLength>EPS))diagnostics.push(diagnostic(
      FAILURE_CODES.PATH_DEGENERATE,
      ['driverEndpoint.pointM','hornEndpoint.pointM'],
      'Driver and horn endpoints must be distinct and connected.'
    ));
    const startScale=tangentScaleStartM||
        (directLength?directLength/3:null),
      endScale=tangentScaleEndM||(directLength?directLength/3:null);
    if(diagnostics.length)return failResult(
      id,source,diagnostics,startSection,endSection
    );
    const p0=driver.pointM,p1=horn.pointM,
      m0=vScale(driver.flowDirection,startScale),
      m1=vScale(horn.flowDirection,endScale),
      points=[],tangents=[],sections=[],areas=[];
    for(let index=0;index<samples;index++){
      const t=index/(samples-1),
        point=hermitePoint(p0,p1,m0,m1,t),
        tangent=hermiteTangent(p0,p1,m0,m1,t);
      if(!tangent){
        diagnostics.push(diagnostic(
          FAILURE_CODES.PATH_DEGENERATE,['path'],
          'The Hermite centerline has a zero tangent.'
        ));
        return failResult(
          id,source,diagnostics,startSection,endSection
        );
      }
      const section=interpolateSection(startSection,endSection,t);
      section.areaM2=sectionArea(section);
      points.push(point);
      tangents.push(tangent);
      sections.push(section);
      areas.push(section.areaM2);
    }
    if(!areaProgressionValid(
      areas,progression,progressionTolerance
    )){
      diagnostics.push(diagnostic(
        FAILURE_CODES.AREA_PROGRESSION_INVALID,
        ['startSection','endSection','areaProgression'],
        'The interpolated section areas violate the declared progression policy.'
      ));
      return failResult(id,source,diagnostics,startSection,endSection);
    }
    const upHint=vNormalize(vec(path.upHint)||[]),
      frames=parallelFrames(points,tangents,upHint),
      mesh=buildMesh(frames,sections,sectionSegments);
    if(!mesh.audit.twoManifold||!mesh.audit.closed||
        mesh.audit.degenerateTriangles){
      diagnostics.push(diagnostic(
        FAILURE_CODES.MESH_NONMANIFOLD,['mesh'],
        'The closed negative-volume candidate failed its local manifold audit.'
      ));
      return failResult(id,source,diagnostics,startSection,endSection);
    }
    let centerlineLengthM=0,maxTurnDeg=0;
    for(let index=1;index<points.length;index++){
      centerlineLengthM+=vDistance(points[index-1],points[index]);
      maxTurnDeg=Math.max(
        maxTurnDeg,
        Math.acos(clamp(vDot(
          tangents[index-1],tangents[index]
        ),-1,1))*180/Math.PI
      );
    }
    const record=deepFreeze({
      schemaVersion:1,
      id,
      ownerStationId:cleanString(source.ownerStationId),
      ownerSourceId:cleanString(source.ownerSourceId),
      canonicalNegative:true,
      subtractedFromPositiveHosts:false,
      driverEndpoint:driver,
      hornEndpoint:horn,
      path:{
        family:'cubic-hermite',
        samples,
        driverTangentScaleM:startScale,
        hornTangentScaleM:endScale,
        centerlineLengthM,
        directLengthM:directLength,
        tortuosity:centerlineLengthM/directLength,
        maximumSampleTurnDeg:maxTurnDeg
      },
      startSection,
      endSection,
      sectionSamples:sections,
      centerlinePointsM:points,
      frames,
      areasM2:areas,
      areaProgression:progression,
      provenanceRefs:Array.isArray(source.provenanceRefs)
        ?source.provenanceRefs.map(cleanString).filter(Boolean).sort():[]
    });
    return deepFreeze({
      ok:true,
      code:null,
      record,
      mesh:{
        role:'negative-inspection-volume',
        verticesM:mesh.vertices,
        triangles:mesh.triangles,
        audit:mesh.audit,
        manufacturingAuthority:false
      },
      diagnostics:[],
      hashInput:'meh3-lumen-v1\n'+stableStringify(record),
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function failResult(id,source,diagnostics,startSection,endSection){
    const ordered=diagnostics.slice().sort((left,right)=>
      [left.code,left.paths.join('\u0000'),left.message].join('\u0001')
        .localeCompare(
          [right.code,right.paths.join('\u0000'),right.message]
            .join('\u0001')
        )
    );
    return deepFreeze({
      ok:false,
      code:ordered.length?ordered[0].code:FAILURE_CODES.INVALID_INPUT,
      record:{
        schemaVersion:1,
        id:id||null,
        canonicalNegative:false,
        subtractedFromPositiveHosts:false,
        startSection:cloneValue(startSection),
        endSection:cloneValue(endSection),
        provenanceRefs:Array.isArray(source.provenanceRefs)
          ?source.provenanceRefs.map(cleanString).filter(Boolean).sort():[]
      },
      mesh:null,
      diagnostics:ordered,
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'lumen-subtraction',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      exactBooleanSubtraction:false,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    version:VERSION,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    sectionArea,
    stableStringify,
    buildCanonicalLumen,
    manufacturingPreflight
  });
});
