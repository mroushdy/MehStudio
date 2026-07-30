/*
 * MEH Studio v5 — closed canonical geometry operands for calculated T3.
 *
 * This module converts one successful schema-2 T3 analysis solution plus an
 * explicit calculated construction record into closed positive and negative
 * indexed meshes.  It does not execute Boolean operations, select a kernel,
 * certify printability, authorize manufacture, or export STL.
 *
 * Construction rules intentionally mirror the mature two-way path:
 *   - the horn is a closed material shell, not an open render skin;
 *   - each driver keeps its complete documented full-frame bearing plate;
 *   - a solid tapered driver-cell adapter overlaps plate and horn;
 *   - one canonical lumen is extended through chamber, plate, adapter, and
 *     horn wall, with no unrelated central hole;
 *   - every operand is locally audited before it can enter a solid plan.
 */
(function attachThreeWaySolidGeometry(root,factory){
  'use strict';

  const preview=typeof module==='object'&&module.exports
    ?require('./threeway-preview-geometry.js')
    :root&&root.MEH3PreviewGeometry;
  const api=factory(preview);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MEH3SolidGeometry=api;
}(typeof globalThis!=='undefined'?globalThis:this,
function createThreeWaySolidGeometry(defaultPreview){
  'use strict';

  const VERSION=1;
  const SCHEMA_VERSION=1;
  const INPUT_SCHEMA_VERSION=2;
  const HASH_VERSION='meh3-closed-solid-geometry-v1';
  const IMPLEMENTATION_REVISION=
    'calculated-t3-closed-operands-r1';
  const FAILURE_CODES=deepFreeze({
    INPUT_INVALID:'THREEWAY_SOLID_GEOMETRY_INPUT_INVALID',
    CONSTRUCTION_REQUIRED:
      'THREEWAY_SOLID_GEOMETRY_CONSTRUCTION_REQUIRED',
    CONSTRUCTION_INVALID:
      'THREEWAY_SOLID_GEOMETRY_CONSTRUCTION_INVALID',
    TOPOLOGY_UNSUPPORTED:
      'THREEWAY_SOLID_GEOMETRY_TOPOLOGY_UNSUPPORTED',
    DEPENDENCY_UNAVAILABLE:
      'THREEWAY_SOLID_GEOMETRY_DEPENDENCY_UNAVAILABLE',
    HORN_INVALID:'THREEWAY_SOLID_GEOMETRY_HORN_INVALID',
    MOUNT_INVALID:'THREEWAY_SOLID_GEOMETRY_MOUNT_INVALID',
    PASSAGE_INVALID:'THREEWAY_SOLID_GEOMETRY_PASSAGE_INVALID',
    BAND_OWNERSHIP_INVALID:
      'THREEWAY_SOLID_GEOMETRY_BAND_OWNERSHIP_INVALID',
    MESH_AUDIT_FAILED:
      'THREEWAY_SOLID_GEOMETRY_MESH_AUDIT_FAILED'
  });
  const CAPABILITIES=deepFreeze({
    status:'closed-canonical-construction-operands',
    schema2Only:true,
    calculatedT3:true,
    closedHornShell:true,
    closedThroatCollar:true,
    fullFrameDriverPlates:true,
    solidDriverCellAdapters:true,
    continuousExtendedLumenNegatives:true,
    deterministicBandOwnership:true,
    localClosedManifoldAudit:true,
    samplingResolutionContract:true,
    centralNonLumenHole:false,
    booleanExecution:false,
    exactSolid:false,
    fabricationAudit:false,
    manufacturing:false,
    export:false,
    stl:false,
    reason:
      'Closed audited operands remain provider-neutral inputs; only an executed Boolean result and separate deep fabrication audit may grant later authority.'
  });
  const EPS=1e-11;

  function isRecord(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function finite(value){
    return typeof value==='number'&&Number.isFinite(value);
  }

  function positive(value){
    return finite(value)&&value>0?value:null;
  }

  function vec3(value){
    return Array.isArray(value)&&value.length===3&&value.every(finite)
      ?value.map(number=>Object.is(number,-0)?0:number):null;
  }

  function cloneValue(value){
    if(Array.isArray(value))return value.map(cloneValue);
    if(isRecord(value)){
      const result={};
      for(const key of Object.keys(value).sort())
        if(value[key]!==undefined)result[key]=cloneValue(value[key]);
      return result;
    }
    if(typeof value==='number'&&Object.is(value,-0))return 0;
    return value;
  }

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    for(const child of Object.values(value))deepFreeze(child);
    return Object.freeze(value);
  }

  function stableClone(value){
    if(Array.isArray(value))return value.map(stableClone);
    if(isRecord(value)){
      const result={};
      for(const key of Object.keys(value).sort())
        if(value[key]!==undefined)result[key]=stableClone(value[key]);
      return result;
    }
    if(typeof value==='number')
      return Number.isFinite(value)
        ?(Object.is(value,-0)?0:value):null;
    if(value===null||typeof value==='string'||typeof value==='boolean')
      return value;
    return null;
  }

  function stableStringify(value){
    return JSON.stringify(stableClone(value));
  }

  function uniqueStrings(value){
    return [...new Set((Array.isArray(value)?value:[])
      .map(cleanString).filter(Boolean))].sort();
  }

  function diagnostic(code,paths,message,details){
    return {
      code,
      severity:'error',
      phase:'solid-geometry',
      paths:uniqueStrings(paths),
      message,
      details:isRecord(details)?cloneValue(details):{},
      blocksCapabilities:[
        'solidGeometry','solidIntent','solidPlan','exactSolid',
        'manufacturing','export','stl'
      ]
    };
  }

  function failure(diagnostics){
    const ordered=diagnostics.slice().sort((left,right)=>[
      left.code,left.paths.join('\u0000'),left.message
    ].join('\u0001').localeCompare([
      right.code,right.paths.join('\u0000'),right.message
    ].join('\u0001')));
    return deepFreeze({
      ok:false,
      code:ordered[0]
        ?ordered[0].code:FAILURE_CODES.INPUT_INVALID,
      result:null,
      diagnostics:ordered,
      hashInput:null,
      exactSolid:false,
      manufacturing:false,
      export:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  const add=(left,right)=>[
    left[0]+right[0],left[1]+right[1],left[2]+right[2]
  ];
  const subtract=(left,right)=>[
    left[0]-right[0],left[1]-right[1],left[2]-right[2]
  ];
  const scale=(value,factor)=>[
    value[0]*factor,value[1]*factor,value[2]*factor
  ];
  const dot=(left,right)=>
    left[0]*right[0]+left[1]*right[1]+left[2]*right[2];
  const cross=(left,right)=>[
    left[1]*right[2]-left[2]*right[1],
    left[2]*right[0]-left[0]*right[2],
    left[0]*right[1]-left[1]*right[0]
  ];
  const length=value=>Math.hypot(value[0],value[1],value[2]);
  const normalize=value=>{
    const magnitude=length(value);
    return magnitude>EPS?scale(value,1/magnitude):null;
  };
  const average=points=>{
    const total=points.reduce((sum,point)=>add(sum,point),[0,0,0]);
    return scale(total,1/points.length);
  };

  function meshEdges(triangles){
    const edges=new Map();
    for(let triangleIndex=0;triangleIndex<triangles.length;
        triangleIndex++){
      const triangle=triangles[triangleIndex];
      for(let edgeIndex=0;edgeIndex<3;edgeIndex++){
        const left=triangle[edgeIndex],
          right=triangle[(edgeIndex+1)%3],
          key=left<right?left+':'+right:right+':'+left,
          direction=left<right?1:-1;
        if(!edges.has(key))edges.set(key,[]);
        edges.get(key).push({triangleIndex,direction});
      }
    }
    return edges;
  }

  function auditMesh(vertices,triangles){
    const edges=meshEdges(triangles),
      faceKeys=new Set(),
      adjacency=Array.from({length:triangles.length},()=>[]);
    let signedVolumeM3=0,
      degenerateTriangles=0,
      duplicateTriangles=0,
      nonFiniteVertices=0,
      orientationConflicts=0;
    for(const vertex of vertices)
      if(!Array.isArray(vertex)||vertex.length!==3||
          !vertex.every(finite))nonFiniteVertices++;
    for(let triangleIndex=0;triangleIndex<triangles.length;
        triangleIndex++){
      const triangle=triangles[triangleIndex],
        key=triangle.slice().sort((a,b)=>a-b).join(':');
      if(faceKeys.has(key))duplicateTriangles++;
      else faceKeys.add(key);
      const a=vertices[triangle[0]],
        b=vertices[triangle[1]],
        c=vertices[triangle[2]];
      if(!a||!b||!c)continue;
      const normal=cross(subtract(b,a),subtract(c,a));
      if(length(normal)<=EPS)degenerateTriangles++;
      signedVolumeM3+=dot(a,cross(b,c))/6;
    }
    for(const entries of edges.values()){
      if(entries.length!==2)continue;
      const parity=entries[0].direction===entries[1].direction?1:0;
      adjacency[entries[0].triangleIndex].push([
        entries[1].triangleIndex,parity
      ]);
      adjacency[entries[1].triangleIndex].push([
        entries[0].triangleIndex,parity
      ]);
    }
    const seen=new Uint8Array(triangles.length),
      flips=new Uint8Array(triangles.length);
    let components=0;
    for(let start=0;start<triangles.length;start++){
      if(seen[start])continue;
      components++;
      seen[start]=1;
      const stack=[start];
      while(stack.length){
        const current=stack.pop();
        for(const [next,parity] of adjacency[current]){
          const expected=flips[current]^parity;
          if(!seen[next]){
            seen[next]=1;
            flips[next]=expected;
            stack.push(next);
          }else if(flips[next]!==expected)orientationConflicts++;
        }
      }
    }
    const counts=[...edges.values()].map(entries=>entries.length),
      openEdges=counts.filter(count=>count===1).length,
      nonManifoldEdges=counts.filter(count=>count!==2).length,
      sameDirectionEdges=[...edges.values()].filter(entries=>
        entries.length===2&&
        entries[0].direction===entries[1].direction
      ).length;
    return {
      vertexCount:vertices.length,
      triangleCount:triangles.length,
      edgeCount:edges.size,
      openEdges,
      nonManifoldEdges,
      sameDirectionEdges,
      degenerateTriangles,
      duplicateTriangles,
      nonFiniteVertices,
      components,
      orientationConflicts,
      signedVolumeM3,
      volumeM3:Math.abs(signedVolumeM3),
      closed:openEdges===0&&nonManifoldEdges===0,
      twoManifold:nonManifoldEdges===0,
      consistentlyOriented:
        sameDirectionEdges===0&&orientationConflicts===0,
      outwardOrientation:signedVolumeM3>0,
      pass:openEdges===0&&nonManifoldEdges===0&&
        sameDirectionEdges===0&&degenerateTriangles===0&&
        duplicateTriangles===0&&nonFiniteVertices===0&&
        components===1&&orientationConflicts===0&&
        signedVolumeM3>EPS
    };
  }

  function orientMesh(vertices,sourceTriangles){
    const triangles=sourceTriangles.map(triangle=>triangle.slice()),
      edges=meshEdges(triangles),
      adjacency=Array.from({length:triangles.length},()=>[]);
    for(const entries of edges.values()){
      if(entries.length!==2)continue;
      const parity=entries[0].direction===entries[1].direction?1:0;
      adjacency[entries[0].triangleIndex].push([
        entries[1].triangleIndex,parity
      ]);
      adjacency[entries[1].triangleIndex].push([
        entries[0].triangleIndex,parity
      ]);
    }
    const seen=new Uint8Array(triangles.length),
      flips=new Uint8Array(triangles.length);
    for(let start=0;start<triangles.length;start++){
      if(seen[start])continue;
      seen[start]=1;
      const stack=[start];
      while(stack.length){
        const current=stack.pop();
        for(const [next,parity] of adjacency[current]){
          const expected=flips[current]^parity;
          if(!seen[next]){
            seen[next]=1;
            flips[next]=expected;
            stack.push(next);
          }
        }
      }
    }
    for(let index=0;index<triangles.length;index++)
      if(flips[index]){
        const swap=triangles[index][1];
        triangles[index][1]=triangles[index][2];
        triangles[index][2]=swap;
      }
    let audit=auditMesh(vertices,triangles);
    if(audit.signedVolumeM3<0){
      for(const triangle of triangles){
        const swap=triangle[1];
        triangle[1]=triangle[2];
        triangle[2]=swap;
      }
      audit=auditMesh(vertices,triangles);
    }
    return {verticesM:vertices,triangles,audit};
  }

  function meshValid(mesh){
    return isRecord(mesh)&&Array.isArray(mesh.verticesM)&&
      Array.isArray(mesh.triangles)&&
      mesh.verticesM.length>=4&&mesh.triangles.length>=4&&
      mesh.verticesM.every(vertex=>
        Array.isArray(vertex)&&vertex.length===3&&vertex.every(finite)
      )&&mesh.triangles.every(triangle=>
        Array.isArray(triangle)&&triangle.length===3&&
        triangle.every(index=>Number.isInteger(index)&&
          index>=0&&index<mesh.verticesM.length)&&
        new Set(triangle).size===3
      );
  }

  function auditedMesh(mesh,role,metadata){
    if(!meshValid(mesh))return null;
    const oriented=orientMesh(
      mesh.verticesM.map(vertex=>vertex.slice()),
      mesh.triangles
    );
    return {
      role,
      verticesM:oriented.verticesM,
      triangles:oriented.triangles,
      audit:oriented.audit,
      ...(isRecord(metadata)?cloneValue(metadata):{}),
      exactSolid:false,
      manufacturingAuthority:false,
      manufacturing:false
    };
  }

  function normalizeConstruction(raw,diagnostics){
    if(!isRecord(raw)){
      diagnostics.push(diagnostic(
        FAILURE_CODES.CONSTRUCTION_REQUIRED,['solidGeometry'],
        'Calculated T3 solid geometry requires one explicit construction record; no hidden wall, overlap, or tolerance default is permitted.'
      ));
      return null;
    }
    const schemaVersion=raw.schemaVersion,
      constructionId=cleanString(raw.constructionId),
      mode=cleanString(raw.mode),
      wallThicknessM=positive(raw.wallThicknessM),
      throatCollarLengthM=positive(raw.throatCollarLengthM),
      lumenWallOvershootM=positive(raw.lumenWallOvershootM),
      lumenChamberOverlapM=positive(raw.lumenChamberOverlapM),
      minimumPrintableWebM=positive(raw.minimumPrintableWebM),
      meshClearanceM=positive(raw.meshClearanceM),
      booleanToleranceM=positive(raw.booleanToleranceM),
      segments=Number(raw.inspection&&
        raw.inspection.perimeterSegments),
      classification=cleanString(
        raw.provenance&&raw.provenance.classification
      ),
      evidenceRefs=uniqueStrings(
        raw.provenance&&raw.provenance.evidenceRefs
      );
    const validSegments=Number.isInteger(segments)&&segments>=32&&
      segments<=512&&segments%4===0;
    if(schemaVersion!==SCHEMA_VERSION||!constructionId||
        mode!=='integrated-solid'||
        wallThicknessM===null||wallThicknessM<0.004||
        wallThicknessM>0.03||
        throatCollarLengthM===null||
        throatCollarLengthM<0.006||
        throatCollarLengthM>0.08||
        lumenWallOvershootM===null||
        lumenWallOvershootM<0.001||
        lumenWallOvershootM>0.012||
        lumenChamberOverlapM===null||
        lumenChamberOverlapM<0.001||
        lumenChamberOverlapM>0.02||
        minimumPrintableWebM===null||
        minimumPrintableWebM<0.002||
        minimumPrintableWebM>0.012||
        meshClearanceM===null||meshClearanceM<1e-5||
        meshClearanceM>0.001||
        booleanToleranceM===null||booleanToleranceM<1e-7||
        booleanToleranceM>5e-4||
        !validSegments||
        classification!=='calculated-design-intent'||
        !evidenceRefs.length){
      diagnostics.push(diagnostic(
        FAILURE_CODES.CONSTRUCTION_INVALID,
        [
          'solidGeometry.schemaVersion',
          'solidGeometry.constructionId',
          'solidGeometry.mode',
          'solidGeometry.wallThicknessM',
          'solidGeometry.throatCollarLengthM',
          'solidGeometry.lumenWallOvershootM',
          'solidGeometry.lumenChamberOverlapM',
          'solidGeometry.minimumPrintableWebM',
          'solidGeometry.meshClearanceM',
          'solidGeometry.booleanToleranceM',
          'solidGeometry.inspection.perimeterSegments',
          'solidGeometry.provenance'
        ],
        'The explicit integrated-solid construction is incomplete or outside its admitted calculated T3 bounds.'
      ));
      return null;
    }
    return {
      schemaVersion,
      constructionId,
      mode,
      wallThicknessM,
      throatCollarLengthM,
      lumenWallOvershootM,
      lumenChamberOverlapM,
      minimumPrintableWebM,
      meshClearanceM,
      booleanToleranceM,
      inspection:{perimeterSegments:segments},
      provenance:{classification,evidenceRefs}
    };
  }

  function closedHornShell(surface,previewApi,construction){
    const segments=construction.inspection.perimeterSegments,
      previewResult=previewApi.buildHornInnerSurface({
        hornSurface:surface,
        azimuthSegments:segments
      });
    if(!previewResult||previewResult.ok!==true||
        !isRecord(previewResult.geometry))return null;
    const inner=previewResult.geometry.verticesM.map(vertex=>vertex.slice()),
      ringCount=surface.stations.length,
      outer=[],
      wall=construction.wallThicknessM;
    for(let ring=0;ring<ringCount;ring++)
      for(let side=0;side<segments;side++){
        const index=ring*segments+side,
          previousSide=ring*segments+
            (side+segments-1)%segments,
          nextSide=ring*segments+(side+1)%segments,
          previousRing=(ring===0?0:ring-1)*segments+side,
          nextRing=(ring===ringCount-1
            ?ringCount-1:ring+1)*segments+side,
          tangentSection=subtract(inner[nextSide],inner[previousSide]),
          tangentAxial=subtract(inner[nextRing],inner[previousRing]);
        let normal=normalize(cross(tangentSection,tangentAxial));
        if(!normal)return null;
        const radial=[0,inner[index][1],inner[index][2]];
        if(dot(normal,radial)<0)normal=scale(normal,-1);
        outer.push(add(inner[index],scale(normal,wall)));
      }
    const vertices=[...inner,...outer],
      triangles=[],
      outerOffset=inner.length;
    for(let ring=0;ring<ringCount-1;ring++)
      for(let side=0;side<segments;side++){
        const next=(side+1)%segments,
          a=ring*segments+side,
          b=ring*segments+next,
          c=(ring+1)*segments+side,
          d=(ring+1)*segments+next,
          oa=outerOffset+a,
          ob=outerOffset+b,
          oc=outerOffset+c,
          od=outerOffset+d;
        triangles.push([a,d,b],[a,c,d]);
        triangles.push([oa,ob,od],[oa,od,oc]);
      }
    for(const ring of [0,ringCount-1])
      for(let side=0;side<segments;side++){
        const next=(side+1)%segments,
          a=ring*segments+side,
          b=ring*segments+next,
          oa=outerOffset+a,
          ob=outerOffset+b;
        triangles.push([a,b,ob],[a,ob,oa]);
      }
    return auditedMesh(
      {verticesM:vertices,triangles},
      'closed-canonical-horn-shell',
      {
        closedMaterialShell:true,
        innerSurfaceHash:surface.surfaceHash,
        wallThicknessM:wall,
        offsetLaw:
          'sampled-local-surface-normal-explicit-thickness',
        ringCount,
        perimeterSegments:segments,
        intentionallyOpen:false
      }
    );
  }

  function closedThroatCollar(hornMesh,construction){
    const segments=construction.inspection.perimeterSegments,
      ringCount=hornMesh.ringCount,
      innerCount=ringCount*segments,
      innerFront=hornMesh.verticesM.slice(0,segments),
      outerFront=hornMesh.verticesM.slice(
        innerCount,innerCount+segments
      ),
      frontOverlap=[construction.meshClearanceM,0,0],
      shift=[-construction.throatCollarLengthM,0,0],
      innerBack=innerFront.map(point=>add(point,shift)),
      outerBack=outerFront.map(point=>add(point,shift)),
      innerOverlap=innerFront.map(point=>add(point,frontOverlap)),
      outerOverlap=outerFront.map(point=>add(point,frontOverlap)),
      vertices=[
        ...innerBack,...outerBack,...innerOverlap,...outerOverlap
      ],
      triangles=[],
      ring=(group,side)=>group*segments+side;
    for(let side=0;side<segments;side++){
      const next=(side+1)%segments,
        ib=ring(0,side),ibn=ring(0,next),
        ob=ring(1,side),obn=ring(1,next),
        iff=ring(2,side),ifn=ring(2,next),
        of=ring(3,side),ofn=ring(3,next);
      triangles.push(
        [ib,ifn,ibn],[ib,iff,ifn],
        [ob,obn,ofn],[ob,ofn,of],
        [ib,ibn,obn],[ib,obn,ob],
        [iff,ofn,ifn],[iff,of,ofn]
      );
    }
    return auditedMesh(
      {verticesM:vertices,triangles},
      'closed-canonical-throat-collar',
      {
        closedMaterialShell:true,
        collarLengthM:construction.throatCollarLengthM,
        wallThicknessM:construction.wallThicknessM,
        sharedHornInterface:true,
        hornOverlapM:construction.meshClearanceM,
        perimeterSegments:segments
      }
    );
  }

  function rotate2(point,angle){
    if(!angle)return point;
    const cosine=Math.cos(angle),sine=Math.sin(angle);
    return [
      cosine*point[0]-sine*point[1],
      sine*point[0]+cosine*point[1]
    ];
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

  function sampleCapsule(width,height,count){
    if(height>width)
      return sampleCapsule(height,width,count)
        .map(point=>[-point[1],point[0]]);
    const quarter=count/4,
      radius=height/2,
      straight=(width-height)/2,
      points=[];
    for(let index=0;index<quarter;index++){
      const angle=-Math.PI/2+Math.PI*index/quarter;
      points.push([
        straight+radius*Math.cos(angle),
        radius*Math.sin(angle)
      ]);
    }
    for(let index=0;index<quarter;index++)
      points.push([
        straight-2*straight*index/quarter,radius
      ]);
    for(let index=0;index<quarter;index++){
      const angle=Math.PI/2+Math.PI*index/quarter;
      points.push([
        -straight+radius*Math.cos(angle),
        radius*Math.sin(angle)
      ]);
    }
    for(let index=0;index<quarter;index++)
      points.push([
        -straight+2*straight*index/quarter,-radius
      ]);
    return points;
  }

  function sampleRoundedRectangle(width,height,radius,count){
    if(radius<=EPS){
      const quarter=count/4,
        points=[],
        corners=[
          [width/2,height/2],
          [-width/2,height/2],
          [-width/2,-height/2],
          [width/2,-height/2]
        ];
      for(let edge=0;edge<4;edge++){
        const start=corners[edge],
          end=corners[(edge+1)%4];
        for(let index=0;index<quarter;index++){
          const fraction=index/quarter;
          points.push([
            start[0]+(end[0]-start[0])*fraction,
            start[1]+(end[1]-start[1])*fraction
          ]);
        }
      }
      return points;
    }
    const quarter=count/4,
      points=[],
      centers=[
        [width/2-radius,height/2-radius],
        [-width/2+radius,height/2-radius],
        [-width/2+radius,-height/2+radius],
        [width/2-radius,-height/2+radius]
      ];
    for(let corner=0;corner<4;corner++)
      for(let index=0;index<quarter;index++){
        const angle=corner*Math.PI/2+
          Math.PI*index/(2*quarter);
        points.push([
          centers[corner][0]+radius*Math.cos(angle),
          centers[corner][1]+radius*Math.sin(angle)
        ]);
      }
    return points;
  }

  function sampleSection(section,count){
    if(!isRecord(section))return null;
    const family=cleanString(section.family),
      rotation=finite(section.rotationRad)?section.rotationRad:0;
    let points=null;
    if(family==='round'){
      const diameter=positive(section.diameterM);
      if(diameter!==null)points=sampleRound(diameter,diameter,count);
    }else if(family==='ellipse'){
      const width=positive(section.widthM),
        height=positive(section.heightM);
      if(width!==null&&height!==null)
        points=sampleRound(width,height,count);
    }else if(family==='racetrack'){
      const width=positive(section.widthM),
        height=positive(section.heightM);
      if(width!==null&&height!==null)
        points=sampleCapsule(width,height,count);
    }else if(family==='rounded-rectangle'){
      const width=positive(section.widthM),
        height=positive(section.heightM),
        radius=finite(section.cornerRadiusM)
          ?section.cornerRadiusM:null;
      if(width!==null&&height!==null&&radius!==null&&radius>=0&&
          radius<=Math.min(width,height)/2)
        points=sampleRoundedRectangle(width,height,radius,count);
    }
    return points?points.map(point=>rotate2(point,rotation)):null;
  }

  function sampleEnvelope(envelope,count){
    if(!isRecord(envelope))return null;
    if(envelope.shape==='round'){
      const diameter=positive(envelope.diameterM);
      return diameter===null?null:
        sampleRound(diameter,diameter,count);
    }
    if(envelope.shape==='rounded-rectangle'){
      const width=positive(envelope.widthM),
        height=positive(envelope.heightM),
        radius=finite(envelope.cornerRadiusM)
          ?envelope.cornerRadiusM:null;
      return width===null||height===null||radius===null?null:
        sampleRoundedRectangle(width,height,radius,count);
    }
    return null;
  }

  function sweepMesh(frames,sections,segments,metadata){
    if(!Array.isArray(frames)||frames.length<2||
        !Array.isArray(sections)||sections.length!==frames.length)
      return null;
    const vertices=[],
      triangles=[];
    for(let ringIndex=0;ringIndex<frames.length;ringIndex++){
      const frame=frames[ringIndex],
        origin=vec3(frame.originM),
        u=normalize(vec3(frame.u)||[]),
        v=normalize(vec3(frame.v)||[]),
        boundary=sampleSection(sections[ringIndex],segments);
      if(!origin||!u||!v||!boundary)return null;
      for(const point of boundary)
        vertices.push(add(origin,add(
          scale(u,point[0]),scale(v,point[1])
        )));
    }
    for(let ringIndex=0;ringIndex<frames.length-1;ringIndex++)
      for(let side=0;side<segments;side++){
        const next=(side+1)%segments,
          a=ringIndex*segments+side,
          b=ringIndex*segments+next,
          c=(ringIndex+1)*segments+side,
          d=(ringIndex+1)*segments+next;
        triangles.push([a,b,d],[a,d,c]);
      }
    const startCenter=vertices.length,
      endCenter=startCenter+1,
      endOffset=(frames.length-1)*segments;
    vertices.push(
      frames[0].originM.slice(),
      frames[frames.length-1].originM.slice()
    );
    for(let side=0;side<segments;side++){
      const next=(side+1)%segments;
      triangles.push([startCenter,next,side]);
      triangles.push([
        endCenter,endOffset+side,endOffset+next
      ]);
    }
    return auditedMesh(
      {verticesM:vertices,triangles},
      'closed-canonical-acoustic-lumen-negative',
      metadata
    );
  }

  function extendedLumen(passage,mount,construction){
    const canonical=passage&&passage.canonicalLumenIntent,
      frames=canonical&&Array.isArray(canonical.frames)
        ?canonical.frames.map(cloneValue):null,
      sections=canonical&&Array.isArray(canonical.sectionSamples)
        ?canonical.sectionSamples.map(cloneValue):null,
      hostThickness=positive(
        mount&&mount.mountHost&&mount.mountHost.positiveHost&&
        mount.mountHost.positiveHost.thicknessM
      );
    if(!frames||frames.length<2||!sections||
        sections.length!==frames.length||hostThickness===null)return null;
    const first=frames[0],
      last=frames[frames.length-1],
      firstAxis=normalize(vec3(first.axial)||[]),
      lastAxis=normalize(vec3(last.axial)||[]),
      firstOrigin=vec3(first.originM),
      lastOrigin=vec3(last.originM),
      mountNormal=normalize(vec3(
        mount&&mount.mountDatum&&mount.mountDatum.normal
      )||[]),
      hornNormal=normalize(vec3(
        passage&&passage.endpoints&&
        passage.endpoints.horn&&
        passage.endpoints.horn.surfaceNormal
      )||[]);
    if(!firstAxis||!lastAxis||!firstOrigin||!lastOrigin||
        !mountNormal||!hornNormal)return null;
    const driverIncidence=Math.abs(dot(firstAxis,mountNormal)),
      hornIncidence=Math.abs(dot(lastAxis,hornNormal));
    if(driverIncidence<0.15||hornIncidence<0.15)return null;
    const startExtension=hostThickness/(2*driverIncidence)+
        construction.lumenChamberOverlapM,
      endExtension=construction.wallThicknessM/hornIncidence+
        construction.lumenWallOvershootM,
      extendedFrames=[
        {
          ...cloneValue(first),
          originM:add(firstOrigin,scale(firstAxis,-startExtension))
        },
        ...frames,
        {
          ...cloneValue(last),
          originM:add(lastOrigin,scale(lastAxis,endExtension))
        }
      ],
      extendedSections=[
        cloneValue(sections[0]),
        ...sections,
        cloneValue(sections[sections.length-1])
      ];
    return sweepMesh(
      extendedFrames,
      extendedSections,
      construction.inspection.perimeterSegments,
      {
        passageId:passage.id,
        apertureId:passage.apertureId,
        sourceId:passage.sourceId,
        stationId:passage.stationId,
        bandId:passage.bandId,
        startExtensionM:startExtension,
        endExtensionM:endExtension,
        driverSurfaceIncidenceCos:driverIncidence,
        hornSurfaceIncidenceCos:hornIncidence,
        startsInsideDeclaredChamber:true,
        crossesFullFramePlate:true,
        crossesHornWall:true,
        centerOpen:false,
        onlyAcousticLumen:true,
        perimeterSegments:
          construction.inspection.perimeterSegments
      }
    );
  }

  function orthogonalFrame(axis,preferred){
    let u=normalize(subtract(preferred,scale(axis,dot(preferred,axis))));
    if(!u){
      const seed=Math.abs(axis[0])<0.8?[1,0,0]:[0,1,0];
      u=normalize(subtract(seed,scale(axis,dot(seed,axis))));
    }
    const v=u?normalize(cross(axis,u)):null;
    return u&&v?{u,v}:null;
  }

  function mountAdapter(mount,passages,construction){
    const datum=mount&&mount.mountDatum,
      origin=vec3(datum&&datum.originM),
      datumU=normalize(vec3(datum&&datum.uAxis)||[]),
      hostEnvelope=mount&&mount.mountHost&&
        mount.mountHost.positiveHost&&
        mount.mountHost.positiveHost.faceEnvelope,
      hostBoundary=sampleEnvelope(
        hostEnvelope,construction.inspection.perimeterSegments
      );
    if(!origin||!datumU||!hostBoundary||!passages.length)return null;
    const hornFrames=passages.map(passage=>{
      const canonical=passage.canonicalLumenIntent,
        frames=canonical&&canonical.frames;
      return Array.isArray(frames)&&frames.length
        ?frames[frames.length-1]:null;
    });
    if(hornFrames.some(frame=>!frame||!vec3(frame.originM)))return null;
    const rootCenter=average(hornFrames.map(frame=>frame.originM)),
      axis=normalize(subtract(rootCenter,origin)),
      frame=axis?orthogonalFrame(axis,datumU):null;
    if(!axis||!frame)return null;
    const startBoundary=hostBoundary.map(point=>{
      const world=add(
        scale(normalize(vec3(datum.uAxis)),point[0]),
        scale(normalize(vec3(datum.vAxis)),point[1])
      );
      return [dot(world,frame.u),dot(world,frame.v)];
    });
    let halfU=construction.minimumPrintableWebM,
      halfV=construction.minimumPrintableWebM;
    for(const passage of passages){
      const canonical=passage.canonicalLumenIntent,
        frames=canonical.frames,
        sections=canonical.sectionSamples,
        endFrame=frames[frames.length-1],
        boundary=sampleSection(
          sections[sections.length-1],
          construction.inspection.perimeterSegments
        );
      if(!boundary)return null;
      for(const point of boundary){
        const world=add(
          endFrame.originM,
          add(
            scale(endFrame.u,point[0]),
            scale(endFrame.v,point[1])
          )
        ),
          relative=subtract(world,rootCenter);
        halfU=Math.max(
          halfU,
          Math.abs(dot(relative,frame.u))+
            construction.minimumPrintableWebM
        );
        halfV=Math.max(
          halfV,
          Math.abs(dot(relative,frame.v))+
            construction.minimumPrintableWebM
        );
      }
    }
    const rootRadius=Math.min(
        construction.minimumPrintableWebM,
        halfU*0.3,halfV*0.3
      ),
      rootBoundary=sampleRoundedRectangle(
        2*halfU,2*halfV,rootRadius,
        construction.inspection.perimeterSegments
      ),
      adapterLength=length(subtract(rootCenter,origin)),
      hornOverlapFraction=construction.meshClearanceM/
        Math.max(adapterLength,construction.meshClearanceM),
      ringFractions=[0,0.35,0.72,1,1+hornOverlapFraction],
      vertices=[],
      triangles=[],
      segments=construction.inspection.perimeterSegments;
    for(const fraction of ringFractions){
      const center=add(origin,scale(subtract(rootCenter,origin),fraction)),
        shapeFraction=Math.min(1,fraction);
      for(let side=0;side<segments;side++){
        const local=[
          startBoundary[side][0]+
            (rootBoundary[side][0]-startBoundary[side][0])*
              shapeFraction,
          startBoundary[side][1]+
            (rootBoundary[side][1]-startBoundary[side][1])*
              shapeFraction
        ];
        vertices.push(add(center,add(
          scale(frame.u,local[0]),scale(frame.v,local[1])
        )));
      }
    }
    for(let ringIndex=0;ringIndex<ringFractions.length-1;ringIndex++)
      for(let side=0;side<segments;side++){
        const next=(side+1)%segments,
          a=ringIndex*segments+side,
          b=ringIndex*segments+next,
          c=(ringIndex+1)*segments+side,
          d=(ringIndex+1)*segments+next;
        triangles.push([a,b,d],[a,d,c]);
      }
    const startCenter=vertices.length,
      endCenter=startCenter+1,
      endOffset=(ringFractions.length-1)*segments;
    vertices.push(origin.slice(),rootCenter.slice());
    for(let side=0;side<segments;side++){
      const next=(side+1)%segments;
      triangles.push([startCenter,next,side]);
      triangles.push([
        endCenter,endOffset+side,endOffset+next
      ]);
    }
    return auditedMesh(
      {verticesM:vertices,triangles},
      'closed-solid-driver-cell-adapter',
      {
        mountId:mount.id,
        sourceId:mount.sourceId,
        stationId:mount.stationId,
        fullFrameAtDriverFace:true,
        solidExceptCanonicalLumens:true,
        centerOpen:false,
        overlapsPlateAtDatum:true,
        intersectsHornAtCanonicalEndpoints:true,
        hornOverlapM:construction.meshClearanceM,
        rootWidthM:2*halfU,
        rootHeightM:2*halfV,
        minimumPrintableWebM:
          construction.minimumPrintableWebM,
        perimeterSegments:segments
      }
    );
  }

  function pointTriangleDistanceSquared(point,a,b,c){
    const ab=subtract(b,a),ac=subtract(c,a),ap=subtract(point,a),
      d1=dot(ab,ap),d2=dot(ac,ap);
    if(d1<=0&&d2<=0)return dot(ap,ap);
    const bp=subtract(point,b),
      d3=dot(ab,bp),d4=dot(ac,bp);
    if(d3>=0&&d4<=d3)return dot(bp,bp);
    const vc=d1*d4-d3*d2;
    if(vc<=0&&d1>=0&&d3<=0){
      const fraction=d1/(d1-d3),
        nearest=add(a,scale(ab,fraction)),
        delta=subtract(point,nearest);
      return dot(delta,delta);
    }
    const cp=subtract(point,c),
      d5=dot(ab,cp),d6=dot(ac,cp);
    if(d6>=0&&d5<=d6)return dot(cp,cp);
    const vb=d5*d2-d1*d6;
    if(vb<=0&&d2>=0&&d6<=0){
      const fraction=d2/(d2-d6),
        nearest=add(a,scale(ac,fraction)),
        delta=subtract(point,nearest);
      return dot(delta,delta);
    }
    const va=d3*d6-d5*d4;
    if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){
      const edge=subtract(c,b),
        fraction=(d4-d3)/((d4-d3)+(d5-d6)),
        nearest=add(b,scale(edge,fraction)),
        delta=subtract(point,nearest);
      return dot(delta,delta);
    }
    const denominator=1/(va+vb+vc),
      v=vb*denominator,
      w=vc*denominator,
      nearest=add(a,add(scale(ab,v),scale(ac,w))),
      delta=subtract(point,nearest);
    return dot(delta,delta);
  }

  function boxDistanceSquared(point,lo,hi){
    let sum=0;
    for(let axis=0;axis<3;axis++){
      const delta=point[axis]<lo[axis]
        ?lo[axis]-point[axis]
        :point[axis]>hi[axis]?point[axis]-hi[axis]:0;
      sum+=delta*delta;
    }
    return sum;
  }

  function rayHitsBox(origin,direction,lo,hi){
    let minimum=0,maximum=Infinity;
    for(let axis=0;axis<3;axis++){
      if(Math.abs(direction[axis])<1e-15){
        if(origin[axis]<lo[axis]||origin[axis]>hi[axis])
          return false;
        continue;
      }
      const inverse=1/direction[axis],
        first=(lo[axis]-origin[axis])*inverse,
        second=(hi[axis]-origin[axis])*inverse,
        near=Math.min(first,second),
        far=Math.max(first,second);
      minimum=Math.max(minimum,near);
      maximum=Math.min(maximum,far);
      if(maximum<minimum)return false;
    }
    return maximum>1e-12;
  }

  function rayHitsTriangle(origin,direction,triangle){
    const edge1=subtract(triangle.b,triangle.a),
      edge2=subtract(triangle.c,triangle.a),
      p=cross(direction,edge2),
      determinant=dot(edge1,p);
    if(Math.abs(determinant)<1e-13)return false;
    const inverse=1/determinant,
      offset=subtract(origin,triangle.a),
      u=dot(offset,p)*inverse;
    if(u<-1e-10||u>1+1e-10)return false;
    const q=cross(offset,edge1),
      v=dot(direction,q)*inverse;
    if(v<-1e-10||u+v>1+1e-10)return false;
    return dot(edge2,q)*inverse>1e-10;
  }

  function meshCollider(mesh){
    const triangles=mesh.triangles.map((indices,index)=>{
      const a=mesh.verticesM[indices[0]],
        b=mesh.verticesM[indices[1]],
        c=mesh.verticesM[indices[2]],
        lo=[0,1,2].map(axis=>Math.min(
          a[axis],b[axis],c[axis]
        )),
        hi=[0,1,2].map(axis=>Math.max(
          a[axis],b[axis],c[axis]
        ));
      return {
        index,a,b,c,lo,hi,
        center:scale(add(add(a,b),c),1/3)
      };
    });
    function node(items){
      const lo=[Infinity,Infinity,Infinity],
        hi=[-Infinity,-Infinity,-Infinity];
      for(const triangle of items)
        for(let axis=0;axis<3;axis++){
          lo[axis]=Math.min(lo[axis],triangle.lo[axis]);
          hi[axis]=Math.max(hi[axis],triangle.hi[axis]);
        }
      if(items.length<=12)return {lo,hi,triangles:items};
      const span=[0,1,2].map(axis=>hi[axis]-lo[axis]),
        axis=span.indexOf(Math.max(...span)),
        ordered=items.slice().sort((left,right)=>
          left.center[axis]-right.center[axis]||
          left.index-right.index
        ),
        middle=Math.floor(ordered.length/2);
      return {
        lo,hi,
        left:node(ordered.slice(0,middle)),
        right:node(ordered.slice(middle))
      };
    }
    const root=node(triangles),
      rayDirection=normalize([1,0.3713906763541037,
        0.137102034120776]);
    function nearestSquared(point,current,nodeRecord){
      if(boxDistanceSquared(
        point,nodeRecord.lo,nodeRecord.hi
      )>=current)return current;
      if(nodeRecord.triangles){
        let best=current;
        for(const triangle of nodeRecord.triangles)
          best=Math.min(best,pointTriangleDistanceSquared(
            point,triangle.a,triangle.b,triangle.c
          ));
        return best;
      }
      const leftDistance=boxDistanceSquared(
          point,nodeRecord.left.lo,nodeRecord.left.hi
        ),
        rightDistance=boxDistanceSquared(
          point,nodeRecord.right.lo,nodeRecord.right.hi
        );
      let best=current;
      if(leftDistance<=rightDistance){
        best=nearestSquared(point,best,nodeRecord.left);
        best=nearestSquared(point,best,nodeRecord.right);
      }else{
        best=nearestSquared(point,best,nodeRecord.right);
        best=nearestSquared(point,best,nodeRecord.left);
      }
      return best;
    }
    function hitCount(origin,nodeRecord){
      if(!rayHitsBox(
        origin,rayDirection,nodeRecord.lo,nodeRecord.hi
      ))return 0;
      if(nodeRecord.triangles){
        let count=0;
        for(const triangle of nodeRecord.triangles)
          if(rayHitsTriangle(origin,rayDirection,triangle))count++;
        return count;
      }
      return hitCount(origin,nodeRecord.left)+
        hitCount(origin,nodeRecord.right);
    }
    function signedDistance(point){
      const squared=nearestSquared(point,Infinity,root),
        distance=Math.sqrt(Math.max(0,squared));
      if(point.some((value,axis)=>
        value<root.lo[axis]||value>root.hi[axis]
      ))return distance;
      const origin=[
        point[0]+1.7320508075688772e-10,
        point[1]+2.2360679774997898e-10,
        point[2]+3.3166247903554e-10
      ];
      return hitCount(origin,root)%2?-distance:distance;
    }
    return {
      lo:root.lo,
      hi:root.hi,
      signedDistance,
      boxDistanceSquared:point=>
        boxDistanceSquared(point,root.lo,root.hi)
    };
  }

  function createIntegratedField(input){
    const source=isRecord(input)&&isRecord(input.result)
        ?input.result:input,
      positives=source&&Array.isArray(source.positiveBodies)
        ?source.positiveBodies:[],
      negatives=source&&Array.isArray(
        source.acousticLumenNegatives
      )?source.acousticLumenNegatives:[],
      construction=source&&source.construction;
    if(!positives.length||!negatives.length||
        !isRecord(construction)||
        positives.some(body=>
          !body||!body.mesh||!body.mesh.audit||
          body.mesh.audit.pass!==true
        )||
        negatives.some(body=>
          !body||!body.mesh||!body.mesh.audit||
          body.mesh.audit.pass!==true
        ))return null;
    const positiveColliders=positives.map(body=>({
        id:body.id,collider:meshCollider(body.mesh)
      })),
      negativeColliders=negatives.map(body=>({
        id:body.id,collider:meshCollider(body.mesh)
      })),
      lo=[Infinity,Infinity,Infinity],
      hi=[-Infinity,-Infinity,-Infinity];
    for(const {collider} of positiveColliders)
      for(let axis=0;axis<3;axis++){
        lo[axis]=Math.min(lo[axis],collider.lo[axis]);
        hi[axis]=Math.max(hi[axis],collider.hi[axis]);
      }
    const padding=Math.max(
      construction.meshClearanceM*2,
      construction.wallThicknessM*1.5
    ),
      minimumResolvedFeatureM=Math.min(
        construction.minimumPrintableWebM,
        construction.wallThicknessM
      ),
      maximumSamplingStepM=minimumResolvedFeatureM/2;
    for(let axis=0;axis<3;axis++){
      lo[axis]-=padding;
      hi[axis]+=padding;
    }
    const field=point=>{
      let material=Infinity;
      for(const {collider} of positiveColliders){
        const lower=Math.sqrt(collider.boxDistanceSquared(point));
        if(lower>=material)continue;
        material=Math.min(
          material,collider.signedDistance(point)
        );
      }
      if(material>=0)return material;
      let result=material;
      for(const {collider} of negativeColliders){
        const lower=Math.sqrt(collider.boxDistanceSquared(point));
        if(lower>-result)continue;
        const negative=collider.signedDistance(point);
        result=Math.max(result,-negative);
      }
      return result;
    };
    return Object.freeze({
      schemaVersion:1,
      kind:'threeway-mesh-backed-composite-signed-distance',
      signConvention:'negative-material-positive-air',
      field,
      bounds:Object.freeze({
        lo:Object.freeze(lo),
        hi:Object.freeze(hi),
        paddingM:padding
      }),
      positiveBodyIds:Object.freeze(
        positiveColliders.map(item=>item.id).sort()
      ),
      acousticNegativeIds:Object.freeze(
        negativeColliders.map(item=>item.id).sort()
      ),
      driverBodiesIncluded:false,
      centralNonLumenHoles:false,
      booleanExpression:
        'union(positiveBodies) minus union(acousticLumenNegatives)',
      samplingContract:Object.freeze({
        minimumResolvedFeatureM,
        maximumStepM:maximumSamplingStepM,
        rule:
          'sample step must not exceed one half of the smallest admitted structural web'
      }),
      exactBooleanProviderEvidence:false,
      exactSolid:false,
      manufacturing:false,
      stl:false
    });
  }

  function buildBandOwnership(solution,positiveBodies,negatives,diagnostics){
    const bands=['high','low','mid'],
      resolved=Array.isArray(solution.resolvedDrivers)
        ?solution.resolvedDrivers:[],
      sourceByBand=new Map();
    for(const bandId of bands){
      const sourceIds=resolved.filter(item=>
        uniqueStrings(item&&item.bandIds).includes(bandId)
      ).map(item=>cleanString(item.sourceId)).filter(Boolean).sort();
      if(sourceIds.length!==1)diagnostics.push(diagnostic(
        FAILURE_CODES.BAND_OWNERSHIP_INVALID,
        ['physicsSolution.resolvedDrivers'],
        'The certified calculated T3 construction requires exactly one explicit source owner for each high, mid, and low band.',
        {bandId,sourceIds}
      ));
      sourceByBand.set(bandId,sourceIds);
    }
    const ownership={};
    for(const bandId of bands){
      const sourceIds=sourceByBand.get(bandId)||[];
      ownership[bandId]={
        bandId,
        sourceIds,
        positiveBodyIds:positiveBodies.filter(body=>
          body.bandId===bandId||
          Array.isArray(body.bandIds)&&body.bandIds.includes(bandId)
        ).map(body=>body.id).sort(),
        acousticNegativeIds:negatives.filter(negative=>
          negative.bandId===bandId
        ).map(negative=>negative.id).sort()
      };
    }
    return ownership;
  }

  function buildClosedSolidGeometry(input){
    const source=isRecord(input)?input:{},
      solution=isRecord(source.physicsSolution)
        ?source.physicsSolution:null,
      diagnostics=[],
      construction=normalizeConstruction(
        source.solidGeometry,diagnostics
      );
    if(!solution||solution.schemaVersion!==INPUT_SCHEMA_VERSION||
        solution.ok!==true||!cleanString(solution.inputHash)||
        !cleanString(solution.solutionHash)){
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,['physicsSolution'],
        'One successful hash-owned schema-2 physics solution is required.'
      ));
    }
    if(solution&&cleanString(
      solution.topology&&solution.topology.kind
    )!=='T3')diagnostics.push(diagnostic(
      FAILURE_CODES.TOPOLOGY_UNSUPPORTED,
      ['physicsSolution.topology.kind'],
      'Closed calculated construction operands are currently certified only for conventional T3.'
    ));
    const previewApi=source.previewGeometry||defaultPreview;
    if(!previewApi||
        typeof previewApi.buildHornInnerSurface!=='function')
      diagnostics.push(diagnostic(
        FAILURE_CODES.DEPENDENCY_UNAVAILABLE,
        ['previewGeometry.buildHornInnerSurface'],
        'Canonical horn tessellation is unavailable.'
      ));
    if(diagnostics.length)return failure(diagnostics);

    const hornMesh=closedHornShell(
        solution.hornSurface,previewApi,construction
      ),
      throatMesh=hornMesh
        ?closedThroatCollar(hornMesh,construction):null;
    if(!hornMesh||!throatMesh||
        !hornMesh.audit.pass||!throatMesh.audit.pass)
      return failure([diagnostic(
        FAILURE_CODES.HORN_INVALID,
        ['physicsSolution.hornSurface','solidGeometry'],
        'The explicit horn wall and throat collar failed their local closed-manifold audit.',
        {
          hornAudit:hornMesh&&hornMesh.audit||null,
          throatAudit:throatMesh&&throatMesh.audit||null
        }
      )]);

    const mounts=(Array.isArray(solution.mounts)
      ?solution.mounts:[]).slice().sort((left,right)=>
      String(left&&left.id||'').localeCompare(
        String(right&&right.id||'')
      )
    ),
      passages=(Array.isArray(solution.passages)
        ?solution.passages:[]).slice().sort((left,right)=>
        String(left&&left.id||'').localeCompare(
          String(right&&right.id||'')
        )
      ),
      passageById=new Map(passages.map(passage=>[
        cleanString(passage&&passage.id),passage
      ])),
      mountHosts=[],
      mountAdapters=[],
      lumenNegatives=[];
    for(const mount of mounts){
      const hostMesh=auditedMesh(
          mount&&mount.inspectionMesh,
          'closed-full-frame-driver-plate',
          {
            mountId:mount&&mount.id,
            sourceId:mount&&mount.sourceId,
            stationId:mount&&mount.stationId,
            fullFace:true,
            centerOpen:false,
            driverBodiesExcluded:true,
            sizedFromDocumentedDriverEnvelope:true
          }
        ),
        minimumWeb=positive(
          mount&&mount.mountHost&&mount.mountHost.constraints&&
          mount.mountHost.constraints.minimumWebM
        ),
        bindings=Array.isArray(mount&&mount.apertureBindings)
          ?mount.apertureBindings:[],
        ownedPassages=bindings.map(binding=>
          passageById.get(cleanString(binding&&binding.passageId))
        ).filter(Boolean);
      if(!hostMesh||!hostMesh.audit.pass||
          mount&&mount.mountHost&&mount.mountHost.positiveHost&&
          (
            mount.mountHost.positiveHost.fullFace!==true||
            mount.mountHost.positiveHost.centerOpen!==false
          )||
          minimumWeb===null||
          minimumWeb+EPS<construction.minimumPrintableWebM||
          ownedPassages.length!==bindings.length||
          !ownedPassages.length){
        diagnostics.push(diagnostic(
          FAILURE_CODES.MOUNT_INVALID,
          ['physicsSolution.mounts['+
            String(mount&&mount.id||'?')+']'],
          'Every calculated T3 driver cell requires a closed full-frame plate, sufficient declared web, and complete passage bindings.',
          {
            audit:hostMesh&&hostMesh.audit||null,
            minimumWebM:minimumWeb,
            requiredWebM:construction.minimumPrintableWebM
          }
        ));
        continue;
      }
      const adapter=mountAdapter(
        mount,ownedPassages,construction
      );
      if(!adapter||!adapter.audit.pass){
        diagnostics.push(diagnostic(
          FAILURE_CODES.MOUNT_INVALID,
          ['physicsSolution.mounts['+
            String(mount&&mount.id||'?')+']'],
          'The solid driver-cell adapter between full-frame plate and horn failed its local closed-manifold audit.',
          {audit:adapter&&adapter.audit||null}
        ));
        continue;
      }
      mountHosts.push({
        id:'body:mount:'+mount.id,
        mountId:mount.id,
        sourceId:mount.sourceId,
        stationId:mount.stationId,
        bandId:ownedPassages[0].bandId,
        mesh:hostMesh
      });
      mountAdapters.push({
        id:'body:adapter:'+mount.id,
        mountId:mount.id,
        sourceId:mount.sourceId,
        stationId:mount.stationId,
        bandId:ownedPassages[0].bandId,
        mesh:adapter
      });
      for(const passage of ownedPassages){
        const mesh=extendedLumen(
          passage,mount,construction
        );
        if(!mesh||!mesh.audit.pass){
          diagnostics.push(diagnostic(
            FAILURE_CODES.PASSAGE_INVALID,
            ['physicsSolution.passages['+
              String(passage&&passage.id||'?')+']'],
            'The continuous chamber-to-horn acoustic negative failed its local closed-manifold audit.',
            {audit:mesh&&mesh.audit||null}
          ));
          continue;
        }
        lumenNegatives.push({
          id:'negative:lumen:'+passage.id,
          passageId:passage.id,
          apertureId:passage.apertureId,
          sourceId:passage.sourceId,
          stationId:passage.stationId,
          bandId:passage.bandId,
          mountId:mount.id,
          mesh
        });
      }
    }
    if(diagnostics.length)return failure(diagnostics);
    if(lumenNegatives.length!==passages.length)
      return failure([diagnostic(
        FAILURE_CODES.PASSAGE_INVALID,
        ['physicsSolution.passages','physicsSolution.mounts'],
        'Every canonical passage must produce exactly one continuous solid negative.'
      )]);

    const inputHash=solution.inputHash,
      solutionHash=solution.solutionHash,
      hornId='body:horn:'+solution.hornSurface.surfaceHash,
      throatId='body:throat:'+solution.hornSurface.surfaceHash,
      highSource=(Array.isArray(solution.resolvedDrivers)
        ?solution.resolvedDrivers:[]).find(item=>
        uniqueStrings(item&&item.bandIds).includes('high')
      ),
      positives=[
        {
          id:hornId,
          role:'horn-shell',
          ownerId:solutionHash,
          bandIds:['high','low','mid'],
          bodyKind:'closed-canonical-horn-material-shell',
          mesh:hornMesh
        },
        {
          id:throatId,
          role:'throat-interface',
          ownerId:solutionHash,
          sourceId:highSource&&highSource.sourceId||null,
          bandId:'high',
          stationId:null,
          bodyKind:'solution-owned-closed-throat-collar',
          mesh:throatMesh
        },
        ...mountHosts.map(item=>({
          id:item.id,
          role:'mount-host',
          ownerId:item.mountId,
          sourceId:item.sourceId,
          stationId:item.stationId,
          bandId:item.bandId,
          bodyKind:'full-face-solid-host',
          mesh:item.mesh
        })),
        ...mountAdapters.map(item=>({
          id:item.id,
          role:'mount-adapter',
          ownerId:item.mountId,
          sourceId:item.sourceId,
          stationId:item.stationId,
          bandId:item.bandId,
          bodyKind:'solid-driver-cell-adapter',
          mesh:item.mesh
        }))
      ].sort((left,right)=>left.id.localeCompare(right.id)),
      negatives=lumenNegatives.map(item=>({
        id:item.id,
        role:'acoustic-lumen',
        ownerId:item.passageId,
        passageId:item.passageId,
        apertureId:item.apertureId,
        sourceId:item.sourceId,
        stationId:item.stationId,
        bandId:item.bandId,
        mountId:item.mountId,
        acoustic:true,
        bodyKind:'continuous-chamber-plate-adapter-wall-negative',
        mesh:item.mesh
      })).sort((left,right)=>left.id.localeCompare(right.id)),
      bandOwnership=buildBandOwnership(
        solution,positives,negatives,diagnostics
      );
    if(diagnostics.length)return failure(diagnostics);
    const integratedField=createIntegratedField({
      positiveBodies:positives,
      acousticLumenNegatives:negatives,
      construction
    });
    if(!integratedField)return failure([diagnostic(
      FAILURE_CODES.MESH_AUDIT_FAILED,
      ['positiveBodies','acousticLumenNegatives'],
      'The audited operands could not produce one composite signed-distance construction contract.'
    )]);
    const integratedFieldContract={
      schemaVersion:integratedField.schemaVersion,
      kind:integratedField.kind,
      signConvention:integratedField.signConvention,
      bounds:cloneValue(integratedField.bounds),
      samplingContract:cloneValue(
        integratedField.samplingContract
      ),
      positiveBodyIds:cloneValue(
        integratedField.positiveBodyIds
      ),
      acousticNegativeIds:cloneValue(
        integratedField.acousticNegativeIds
      ),
      driverBodiesIncluded:false,
      centralNonLumenHoles:false,
      booleanExpression:integratedField.booleanExpression,
      exactBooleanProviderEvidence:false,
      exactSolid:false,
      manufacturing:false,
      stl:false
    };
    const resultBase={
      schemaVersion:SCHEMA_VERSION,
      kind:'threeway-closed-solid-geometry-operands',
      inputHash,
      solutionHash,
      topology:{kind:'T3'},
      construction:cloneValue(construction),
      topologyImplementationRevision:IMPLEMENTATION_REVISION,
      positiveBodies:positives,
      acousticLumenNegatives:negatives,
      bandOwnership,
      integratedFieldContract,
      audits:{
        positiveBodies:positives.map(body=>({
          id:body.id,audit:cloneValue(body.mesh.audit)
        })),
        acousticLumenNegatives:negatives.map(negative=>({
          id:negative.id,audit:cloneValue(negative.mesh.audit)
        })),
        allOperandsClosedManifold:
          positives.every(body=>body.mesh.audit.pass)&&
          negatives.every(negative=>negative.mesh.audit.pass)
      },
      invariants:{
        explicitConstructionOnly:true,
        driverBodiesExcluded:true,
        oneFullFramePlatePerMount:true,
        oneSolidAdapterPerMount:true,
        oneContinuousNegativePerPassage:true,
        nonLumenCentralHoles:false,
        deterministicThreeBandOwnership:true,
        booleansExecuted:false,
        exactSolid:false,
        manufacturing:false,
        stl:false
      },
      exactSolid:false,
      manufacturing:false,
      stl:false
    },
      hashInput=HASH_VERSION+'\n'+stableStringify(resultBase),
      result={...resultBase,geometryHash:hashInput};
    return deepFreeze({
      ok:true,
      code:null,
      result,
      diagnostics:[],
      hashInput,
      exactSolid:false,
      manufacturing:false,
      export:false,
      stl:false,
      capabilities:CAPABILITIES,
      integratedField
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'solid-geometry-boolean',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      exactSolid:false,
      fabricationAudited:false,
      manufacturing:false,
      export:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    version:VERSION,
    schemaVersion:SCHEMA_VERSION,
    inputSchemaVersion:INPUT_SCHEMA_VERSION,
    hashVersion:HASH_VERSION,
    implementationRevision:IMPLEMENTATION_REVISION,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    stableStringify,
    auditMesh,
    createIntegratedField,
    buildClosedSolidGeometry,
    manufacturingPreflight
  });
}));
