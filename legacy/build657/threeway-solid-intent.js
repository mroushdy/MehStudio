/*
 * MEH Studio v5 — canonical schema-2 three-way solid-intent builder.
 *
 * This module converts one already-solved, hash-owned calculated T3 result
 * into the provider-neutral operand/contact input consumed by
 * threeway-solid-plan.js.  Closed horn, throat, full-frame mount, solid
 * driver-cell adapter, and continuous acoustic-negative operands are built
 * only from the explicit source-pinned construction record.
 */
(function attachThreeWaySolidIntent(root,factory){
  'use strict';

  const preview=typeof module==='object'&&module.exports
    ?require('./threeway-preview-geometry.js')
    :root&&root.MEH3PreviewGeometry;
  const closedGeometry=typeof module==='object'&&module.exports
    ?require('./threeway-solid-geometry.js')
    :root&&root.MEH3SolidGeometry;
  const api=factory(preview,closedGeometry);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MEH3SolidIntent=api;
}(typeof globalThis!=='undefined'?globalThis:this,
function createThreeWaySolidIntent(defaultPreview,defaultClosedGeometry){
  'use strict';

  const VERSION=1;
  const SCHEMA_VERSION=1;
  const INPUT_SCHEMA_VERSION=2;
  const HASH_VERSION='meh3-solid-intent-v1';
  const IMPLEMENTATION_REVISION=
    'schema2-calculated-t3-closed-operands-r2';
  const SUPPORTED_TOPOLOGIES=Object.freeze(['T3']);
  const FAILURE_CODES=deepFreeze({
    INPUT_INVALID:'THREEWAY_SOLID_INTENT_INPUT_INVALID',
    DEPENDENCY_UNAVAILABLE:
      'THREEWAY_SOLID_INTENT_DEPENDENCY_UNAVAILABLE',
    SOLID_GEOMETRY_UNAVAILABLE:
      'THREEWAY_SOLID_INTENT_SOLID_GEOMETRY_UNAVAILABLE',
    SOLUTION_INVALID:'THREEWAY_SOLID_INTENT_SOLUTION_INVALID',
    TOPOLOGY_UNSUPPORTED:'THREEWAY_SOLID_INTENT_TOPOLOGY_UNSUPPORTED',
    CANONICAL_RECORD_INVALID:
      'THREEWAY_SOLID_INTENT_CANONICAL_RECORD_INVALID',
    HORN_MESH_UNAVAILABLE:
      'THREEWAY_SOLID_INTENT_HORN_MESH_UNAVAILABLE',
    MOUNT_MESH_INVALID:'THREEWAY_SOLID_INTENT_MOUNT_MESH_INVALID',
    LUMEN_MESH_INVALID:'THREEWAY_SOLID_INTENT_LUMEN_MESH_INVALID',
    AUXILIARY_MESH_INVALID:
      'THREEWAY_SOLID_INTENT_AUXILIARY_MESH_INVALID',
    OWNERSHIP_INVALID:'THREEWAY_SOLID_INTENT_OWNERSHIP_INVALID',
    PREMATURE_AUTHORITY:
      'THREEWAY_SOLID_INTENT_PREMATURE_AUTHORITY'
  });
  const CAPABILITIES=deepFreeze({
    status:'closed-canonical-solid-intent-only',
    schema2Only:true,
    canonicalRecordStamping:true,
    deterministicOwnership:true,
    deterministicContacts:true,
    deterministicHash:true,
    canonicalMountMeshCopy:true,
    canonicalLumenMeshCopy:false,
    closedHornShell:true,
    closedThroatCollar:true,
    fullFrameDriverPlates:true,
    solidDriverCellAdapters:true,
    continuousExtendedLumenNegatives:true,
    localClosedManifoldAudit:true,
    hornWallSolid:true,
    geometryInference:false,
    toleranceInference:false,
    booleanExecution:false,
    exactSolid:false,
    fabricationAudit:false,
    manufacturing:false,
    export:false,
    stl:false,
    reason:
      'Closed provider-neutral operands are not an executed Boolean, exact solid, fabrication audit, manufacturing authority, or STL.'
  });

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
      const copy={};
      for(const key of Object.keys(value).sort())
        if(value[key]!==undefined)copy[key]=cloneValue(value[key]);
      return copy;
    }
    if(typeof value==='number'&&Object.is(value,-0))return 0;
    return value;
  }

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    for(const child of Object.values(value))deepFreeze(child);
    return Object.freeze(value);
  }

  function stableClone(value,path,invalid,ancestors){
    const current=path||'$',
      issues=invalid||[],
      stack=ancestors||new WeakSet();
    if(Array.isArray(value)){
      if(stack.has(value)){
        issues.push(current);
        return null;
      }
      stack.add(value);
      const copy=value.map((item,index)=>
        stableClone(item,current+'['+index+']',issues,stack)
      );
      stack.delete(value);
      return copy;
    }
    if(isRecord(value)){
      const prototype=Object.getPrototypeOf(value);
      if(prototype!==Object.prototype&&prototype!==null){
        issues.push(current);
        return null;
      }
      if(stack.has(value)){
        issues.push(current);
        return null;
      }
      stack.add(value);
      const copy={};
      for(const key of Object.keys(value).sort()){
        if(value[key]===undefined){
          issues.push(current+'.'+key);
          copy[key]=null;
        }else copy[key]=stableClone(
          value[key],current+'.'+key,issues,stack
        );
      }
      stack.delete(value);
      return copy;
    }
    if(typeof value==='number'){
      if(!Number.isFinite(value)){
        issues.push(current);
        return null;
      }
      return Object.is(value,-0)?0:value;
    }
    if(value===null||typeof value==='string'||typeof value==='boolean')
      return value;
    issues.push(current);
    return null;
  }

  function stableStringify(value){
    const invalid=[];
    const record=stableClone(value,'$',invalid,new WeakSet());
    return invalid.length?null:JSON.stringify(record);
  }

  function uniqueStrings(value){
    return [...new Set(
      (Array.isArray(value)?value:[])
        .map(cleanString).filter(Boolean)
    )].sort();
  }

  function diagnostic(code,paths,message,details){
    return {
      code,
      severity:'error',
      phase:'solid-intent',
      paths:uniqueStrings(paths),
      message,
      details:isRecord(details)?cloneValue(details):{},
      blocksCapabilities:[
        'solidIntent','solidPlan','exactSolid',
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
      solidIntent:null,
      canonicalRecords:null,
      diagnostics:ordered,
      hashInput:null,
      booleanExecuted:false,
      exactSolid:false,
      manufacturing:false,
      export:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function authorityClaimed(value,seen){
    if(!value||typeof value!=='object')return false;
    const visited=seen||new WeakSet();
    if(visited.has(value))return true;
    visited.add(value);
    if(Array.isArray(value)){
      const found=value.some(item=>authorityClaimed(item,visited));
      visited.delete(value);
      return found;
    }
    for(const [key,child] of Object.entries(value)){
      if([
        'booleanExecuted','booleanUnionPerformed',
        'booleanSubtractionPerformed','exactSolid',
        'manufacturingPlan','manufacturing','stl'
      ].includes(key)&&child===true){
        visited.delete(value);
        return true;
      }
      if(authorityClaimed(child,visited)){
        visited.delete(value);
        return true;
      }
    }
    visited.delete(value);
    return false;
  }

  function meshValid(mesh){
    return isRecord(mesh)&&
      Array.isArray(mesh.verticesM)&&mesh.verticesM.length>=3&&
      mesh.verticesM.every(vertex=>
        Array.isArray(vertex)&&vertex.length===3&&vertex.every(finite)
      )&&
      Array.isArray(mesh.triangles)&&mesh.triangles.length>=1&&
      mesh.triangles.every(triangle=>
        Array.isArray(triangle)&&triangle.length===3&&
        triangle.every(index=>
          Number.isInteger(index)&&index>=0&&
          index<mesh.verticesM.length
        )&&new Set(triangle).size===3
      )&&mesh.manufacturingAuthority!==true&&
      mesh.exactSolid!==true&&mesh.manufacturing!==true;
  }

  function auditMesh(vertices,triangles){
    const edges=new Map();
    let signedVolumeM3=0;
    function edge(left,right){
      const key=left<right?left+':'+right:right+':'+left;
      edges.set(key,(edges.get(key)||0)+1);
    }
    for(const triangle of triangles){
      edge(triangle[0],triangle[1]);
      edge(triangle[1],triangle[2]);
      edge(triangle[2],triangle[0]);
      const a=vertices[triangle[0]],
        b=vertices[triangle[1]],
        c=vertices[triangle[2]];
      signedVolumeM3+=(
        a[0]*(b[1]*c[2]-b[2]*c[1])+
        a[1]*(b[2]*c[0]-b[0]*c[2])+
        a[2]*(b[0]*c[1]-b[1]*c[0])
      )/6;
    }
    const counts=[...edges.values()],
      openEdges=counts.filter(count=>count===1).length,
      nonManifoldEdges=counts.filter(count=>count>2).length;
    return {
      vertexCount:vertices.length,
      triangleCount:triangles.length,
      edgeCount:edges.size,
      openEdges,
      nonManifoldEdges,
      closed:openEdges===0,
      twoManifold:nonManifoldEdges===0,
      signedVolumeM3,
      volumeM3:Math.abs(signedVolumeM3),
      outwardOrientation:signedVolumeM3>0
    };
  }

  function stamp(record,identity,extra){
    return {
      ...cloneValue(record),
      ...(isRecord(extra)?cloneValue(extra):{}),
      inputHash:identity.inputHash,
      solutionHash:identity.solutionHash
    };
  }

  function idCompare(left,right){
    return String(
      left&&(left.id||left.stationId)||''
    ).localeCompare(String(
      right&&(right.id||right.stationId)||''
    ));
  }

  function canonicalRecords(solution,identity,diagnostics){
    const entryStations=(Array.isArray(solution.entryStations)
      ?solution.entryStations:[]).map(record=>
      stamp(record,identity)
    ).sort(idCompare);
    const apertureLayouts=(Array.isArray(solution.apertureLayouts)
      ?solution.apertureLayouts:[]).map((layout,index)=>{
      const sourceId=cleanString(layout&&layout.sourceId);
      const stationId=cleanString(layout&&layout.stationId);
      const rawApertures=Array.isArray(layout&&layout.apertures)&&
          layout.apertures.length
        ?layout.apertures
        :isRecord(layout&&layout.candidate)&&
          Array.isArray(layout.candidate.apertures)
          ?layout.candidate.apertures:[];
      const apertures=rawApertures.map(aperture=>stamp(
        aperture,identity,{sourceId,stationId}
      )).sort(idCompare);
      if(!cleanString(layout&&layout.id)||!sourceId||!stationId||
          !apertures.length)diagnostics.push(diagnostic(
        FAILURE_CODES.CANONICAL_RECORD_INVALID,
        ['physicsSolution.apertureLayouts['+index+']'],
        'Each physical layout requires explicit ID, source, station, and selected physical apertures.'
      ));
      return stamp(layout,identity,{apertures});
    }).sort(idCompare);
    const chambers=(Array.isArray(solution.chambers)
      ?solution.chambers:[]).map(record=>
      stamp(record,identity)
    ).sort(idCompare);
    const chamberInterfaces=Array.isArray(
        solution.driverChamberInterfaces
      )?solution.driverChamberInterfaces:[],
      passages=(Array.isArray(solution.passages)
      ?solution.passages:[]).map((record,index)=>{
      if(!meshValid(record&&record.negativeInspectionMesh))
        diagnostics.push(diagnostic(
          FAILURE_CODES.LUMEN_MESH_INVALID,
          [
            'physicsSolution.passages['+index+
              '].negativeInspectionMesh'
          ],
          'Every canonical passage requires its finite caller-owned negative inspection mesh.'
        ));
      const ownedInterface=chamberInterfaces.find(item=>
          cleanString(item&&item.driverInstanceId)===
            cleanString(record&&record.driverInstanceId)
        ),
        chamberId=cleanString(record&&record.chamberId)||
          cleanString(
            ownedInterface&&ownedInterface.chamber&&
            ownedInterface.chamber.id
          );
      if(!chamberId)diagnostics.push(diagnostic(
        FAILURE_CODES.OWNERSHIP_INVALID,
        ['physicsSolution.passages['+index+'].chamberId'],
        'Every canonical passage must retain the solved chamber owned by its physical driver interface.'
      ));
      return stamp(record,identity,{chamberId});
    }).sort(idCompare);
    const mounts=(Array.isArray(solution.mounts)
      ?solution.mounts:[]).map((record,index)=>{
      if(!meshValid(record&&record.inspectionMesh))
        diagnostics.push(diagnostic(
          FAILURE_CODES.MOUNT_MESH_INVALID,
          ['physicsSolution.mounts['+index+'].inspectionMesh'],
          'Every physical mount requires its finite full-face positive inspection mesh.'
        ));
      return stamp(record,identity);
    }).sort(idCompare);
    if(!entryStations.length||!apertureLayouts.length||
        !chambers.length||!passages.length||!mounts.length)
      diagnostics.push(diagnostic(
        FAILURE_CODES.CANONICAL_RECORD_INVALID,
        [
          'physicsSolution.entryStations',
          'physicsSolution.apertureLayouts',
          'physicsSolution.chambers',
          'physicsSolution.passages',
          'physicsSolution.mounts'
        ],
        'A conventional three-way solid intent requires nonempty solved station, aperture, chamber, passage, and mount records.'
      ));
    return {
      entryStations,apertureLayouts,chambers,passages,mounts
    };
  }

  function hornMesh(previewGeometry){
    const mesh={
      role:'canonical-horn-inner-surface-operand',
      verticesM:cloneValue(previewGeometry.verticesM),
      triangles:cloneValue(previewGeometry.triangles),
      audit:auditMesh(
        previewGeometry.verticesM,previewGeometry.triangles
      ),
      intentionallyOpen:true,
      wallThicknessM:null,
      exactSolid:false,
      manufacturingAuthority:false
    };
    return mesh;
  }

  function throatMesh(previewGeometry,hornSurface){
    const segments=Number(previewGeometry.azimuthSegments),
      stations=hornSurface.stations;
    if(!Number.isInteger(segments)||segments<3||
        !Array.isArray(stations)||stations.length<2||
        previewGeometry.verticesM.length<segments*2)return null;
    const vertices=previewGeometry.verticesM.slice(0,segments*2)
        .map(cloneValue),
      throatCenter=vertices.length,
      forwardCenter=throatCenter+1,
      x0=stations[0].axialM,
      x1=stations[1].axialM,
      triangles=[];
    if(!finite(x0)||!finite(x1)||!(x1>x0))return null;
    vertices.push([x0,0,0],[x1,0,0]);
    for(let index=0;index<segments;index++){
      const next=(index+1)%segments,
        a=index,b=next,c=segments+next,d=segments+index;
      triangles.push([a,b,c],[a,c,d]);
      triangles.push([throatCenter,b,a]);
      triangles.push([forwardCenter,d,c]);
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
      role:'canonical-throat-transition-inspection-volume',
      verticesM:vertices,
      triangles,
      audit,
      sourceAxialIntervalM:[x0,x1],
      exactSolid:false,
      manufacturingAuthority:false
    };
  }

  function vAdd(left,right){
    return [
      left[0]+right[0],left[1]+right[1],left[2]+right[2]
    ];
  }

  function vScale(value,scalar){
    return value.map(component=>component*scalar);
  }

  function sampleSection(section,count){
    const family=cleanString(section&&section.family),
      rotation=finite(section&&section.rotationRad)
        ?section.rotationRad:0,
      points=[];
    let width,height,radius;
    if(family==='round'){
      width=positive(section.diameterM);
      height=width;
    }else{
      width=positive(section&&section.widthM);
      height=positive(section&&section.heightM);
    }
    if(width===null||height===null)return null;
    if(family==='round'||family==='ellipse'){
      for(let index=0;index<count;index++){
        const angle=2*Math.PI*index/count;
        points.push([
          width*Math.cos(angle)/2,height*Math.sin(angle)/2
        ]);
      }
    }else if(family==='racetrack'){
      radius=Math.min(width,height)/2;
      const horizontal=width>=height,
        straight=Math.abs(width-height)/2,
        quarter=count/4;
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
      if(!horizontal)
        for(let index=0;index<points.length;index++)
          points[index]=[-points[index][1],points[index][0]];
    }else if(family==='rounded-rectangle'){
      radius=section.cornerRadiusM;
      if(!finite(radius)||radius<0||
          radius>Math.min(width,height)/2)return null;
      const quarter=count/4,
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
    }else return null;
    if(rotation)for(let index=0;index<points.length;index++){
      const point=points[index],
        cosine=Math.cos(rotation),sine=Math.sin(rotation);
      points[index]=[
        cosine*point[0]-sine*point[1],
        sine*point[0]+cosine*point[1]
      ];
    }
    return points;
  }

  function auxiliaryMesh(mount,negative){
    const datum=mount&&mount.mountDatum,
      origin=vec3(datum&&datum.originM),
      normal=vec3(datum&&datum.normal),
      uAxis=vec3(datum&&datum.uAxis),
      vAxis=vec3(datum&&datum.vAxis),
      center=Array.isArray(negative&&negative.centerOffsetM)&&
        negative.centerOffsetM.length===2&&
        negative.centerOffsetM.every(finite)
        ?negative.centerOffsetM:null,
      boundary=sampleSection(negative&&negative.section,64),
      hostThickness=positive(
        mount&&mount.mountHost&&mount.mountHost.positiveHost&&
        mount.mountHost.positiveHost.thicknessM
      );
    let depth=positive(negative&&negative.depthM);
    if(negative&&negative.throughHost===true)depth=hostThickness;
    if(!origin||!normal||!uAxis||!vAxis||!center||
        !boundary||depth===null||hostThickness===null)return null;
    const front=hostThickness/2,
      back=negative.throughHost===true
        ?-hostThickness/2:front-depth,
      vertices=[],triangles=[];
    for(const offset of [back,front])
      for(const point of boundary)
        vertices.push(vAdd(
          vAdd(origin,vAdd(
            vScale(uAxis,center[0]+point[0]),
            vScale(vAxis,center[1]+point[1])
          )),
          vScale(normal,offset)
        ));
    const segments=boundary.length,
      backCenter=vertices.length,
      frontCenter=backCenter+1;
    vertices.push(
      vAdd(vAdd(origin,vAdd(
        vScale(uAxis,center[0]),vScale(vAxis,center[1])
      )),vScale(normal,back)),
      vAdd(vAdd(origin,vAdd(
        vScale(uAxis,center[0]),vScale(vAxis,center[1])
      )),vScale(normal,front))
    );
    for(let index=0;index<segments;index++){
      const next=(index+1)%segments,
        a=index,b=next,c=segments+next,d=segments+index;
      triangles.push([a,b,c],[a,c,d]);
      triangles.push([backCenter,b,a],[frontCenter,d,c]);
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
      role:'canonical-auxiliary-negative-inspection-volume',
      verticesM:vertices,
      triangles,
      audit,
      exactSolid:false,
      manufacturingAuthority:false
    };
  }

  function contact(id,a,b,kind,identity){
    return {
      id,a,b,kind,
      inputHash:identity.inputHash,
      solutionHash:identity.solutionHash
    };
  }

  function overlap(a,b,identity){
    return {
      a,b,
      inputHash:identity.inputHash,
      solutionHash:identity.solutionHash
    };
  }

  function buildSolidIntent(input){
    const diagnostics=[],
      source=isRecord(input)?input:{},
      solution=isRecord(source.physicsSolution)
        ?source.physicsSolution:null;
    if(!solution)return failure([diagnostic(
      FAILURE_CODES.INPUT_INVALID,['physicsSolution'],
      'One explicit solved physicsSolution is required.'
    )]);
    const serialized=stableStringify(solution);
    if(serialized===null)return failure([diagnostic(
      FAILURE_CODES.INPUT_INVALID,['physicsSolution'],
      'The physics solution must be finite acyclic plain JSON data.'
    )]);
    const inputHash=cleanString(solution.inputHash),
      solutionHash=cleanString(solution.solutionHash),
      topology=cleanString(
        solution.topology&&solution.topology.kind
      ),
      identity={inputHash,solutionHash};
    if(solution.schemaVersion!==INPUT_SCHEMA_VERSION||
        solution.ok!==true||!inputHash||!solutionHash||
        !isRecord(solution.hornSurface)||
        solution.hornSurface.ok!==true)
      diagnostics.push(diagnostic(
        FAILURE_CODES.SOLUTION_INVALID,
        [
          'physicsSolution.schemaVersion',
          'physicsSolution.ok',
          'physicsSolution.inputHash',
          'physicsSolution.solutionHash',
          'physicsSolution.hornSurface'
        ],
        'A successful hash-owned schema-2 physics solution with its canonical horn surface is required.'
      ));
    if(!SUPPORTED_TOPOLOGIES.includes(topology))
      diagnostics.push(diagnostic(
        FAILURE_CODES.TOPOLOGY_UNSUPPORTED,
        ['physicsSolution.topology.kind'],
        'Closed calculated solid construction is currently certified only for conventional T3.',
        {topology}
      ));
    if(authorityClaimed(solution))
      diagnostics.push(diagnostic(
        FAILURE_CODES.PREMATURE_AUTHORITY,
        ['physicsSolution'],
        'Upstream analysis records may not claim Boolean, exact-solid, manufacturing, or STL authority.'
      ));
    const geometryApi=source.solidGeometryBuilder||
      defaultClosedGeometry;
    if(!geometryApi||
        typeof geometryApi.buildClosedSolidGeometry!=='function')
      diagnostics.push(diagnostic(
        FAILURE_CODES.DEPENDENCY_UNAVAILABLE,
        ['solidGeometryBuilder.buildClosedSolidGeometry'],
        'The closed canonical T3 construction builder is unavailable.'
      ));
    if(diagnostics.length)return failure(diagnostics);

    const canonical=canonicalRecords(solution,identity,diagnostics);
    if(diagnostics.length)return failure(diagnostics);
    const geometryResult=geometryApi.buildClosedSolidGeometry({
      physicsSolution:solution,
      solidGeometry:source.solidGeometry,
      previewGeometry:source.previewGeometry||defaultPreview
    });
    if(!geometryResult||geometryResult.ok!==true||
        !isRecord(geometryResult.result))
      return failure([diagnostic(
        FAILURE_CODES.SOLID_GEOMETRY_UNAVAILABLE,
        ['solidGeometry','physicsSolution'],
        'Closed horn, plate, adapter, and continuous-lumen construction failed closed.',
        {
          upstreamCode:geometryResult&&geometryResult.code||null,
          upstreamDiagnosticCodes:Array.isArray(
            geometryResult&&geometryResult.diagnostics
          )?geometryResult.diagnostics.map(item=>
            cleanString(item&&item.code)
          ).filter(Boolean).sort():[]
        }
      )]);
    const geometry=geometryResult.result,
      negativeGeometryByPassage=new Map(
        geometry.acousticLumenNegatives.map(negative=>[
          cleanString(negative.passageId),negative
        ])
      ),
      records={
        ...canonical,
        passages:canonical.passages.map(passage=>{
          const negative=negativeGeometryByPassage.get(passage.id);
          return {
            ...passage,
            solidNegativeInspectionMesh:
              cloneValue(negative&&negative.mesh)
          };
        }),
        mounts:canonical.mounts.map(mount=>{
          const positive=geometry.positiveBodies.find(body=>
            body.role==='mount-host'&&body.ownerId===mount.id
          );
          return {
            ...mount,
            solidPositiveInspectionMesh:
              cloneValue(positive&&positive.mesh)
          };
        })
      },
      positiveBodies=geometry.positiveBodies.map(body=>stamp({
        id:body.id,
        role:body.role,
        ownerId:body.ownerId,
        sourceId:body.sourceId,
        stationId:body.stationId,
        bandId:body.bandId,
        bandIds:body.bandIds,
        bodyKind:body.bodyKind,
        mesh:body.mesh
      },identity)),
      acousticLumenNegatives=
        geometry.acousticLumenNegatives.map(negative=>stamp({
          id:negative.id,
          role:negative.role,
          ownerId:negative.ownerId,
          passageId:negative.passageId,
          apertureId:negative.apertureId,
          sourceId:negative.sourceId,
          stationId:negative.stationId,
          bandId:negative.bandId,
          mountId:negative.mountId,
          acoustic:true,
          bodyKind:negative.bodyKind,
          mesh:negative.mesh
        },identity)),
      hornBody=positiveBodies.find(body=>
        body.role==='horn-shell'
      ),
      throatBody=positiveBodies.find(body=>
        body.role==='throat-interface'
      ),
      hornBodyId=hornBody&&hornBody.id,
      throatBodyId=throatBody&&throatBody.id,
      mountBodyByMount=new Map(positiveBodies.filter(body=>
        body.role==='mount-host'
      ).map(body=>[body.ownerId,body.id])),
      adapterBodyByMount=new Map(positiveBodies.filter(body=>
        body.role==='mount-adapter'
      ).map(body=>[body.ownerId,body.id])),
      expectedContacts=[],
      allowedOverlapPairs=[];
    function addPositiveContact(left,right){
      expectedContacts.push(contact(
        'contact:positive:'+left+':'+right,
        left,right,'positive-union',identity
      ));
      allowedOverlapPairs.push(overlap(left,right,identity));
    }
    addPositiveContact(hornBodyId,throatBodyId);
    for(const mount of records.mounts){
      const mountBodyId=mountBodyByMount.get(mount.id),
        adapterBodyId=adapterBodyByMount.get(mount.id);
      if(!mountBodyId||!adapterBodyId){
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          ['physicsSolution.mounts['+mount.id+']'],
          'Every mount must own one full-frame plate and one solid adapter.'
        ));
        continue;
      }
      addPositiveContact(hornBodyId,adapterBodyId);
      addPositiveContact(adapterBodyId,mountBodyId);
    }
    for(const negative of acousticLumenNegatives){
      const mountBodyId=mountBodyByMount.get(negative.mountId),
        adapterBodyId=adapterBodyByMount.get(negative.mountId);
      for(const bodyId of [
        hornBodyId,adapterBodyId,mountBodyId
      ].filter(Boolean))expectedContacts.push(contact(
        'contact:acoustic:'+negative.id+':'+bodyId,
        negative.id,bodyId,'acoustic-through',identity
      ));
    }

    const auxiliaryNegatives=[];
    for(const mount of records.mounts){
      const bodyId=mountBodyByMount.get(mount.id),
        auxiliary=mount.mountHost&&mount.mountHost.negativeIntents&&
          Array.isArray(mount.mountHost.negativeIntents.auxiliary)
          ?mount.mountHost.negativeIntents.auxiliary:[];
      for(const negative of auxiliary){
        const mesh=auxiliaryMesh(mount,negative),
          id='negative:aux:'+mount.id+':'+negative.id;
        if(!meshValid(mesh)){
          diagnostics.push(diagnostic(
            FAILURE_CODES.AUXILIARY_MESH_INVALID,
            ['physicsSolution.mounts['+mount.id+
              '].mountHost.negativeIntents.auxiliary['+
              String(negative.id||'?')+']'],
            'An explicit auxiliary negative could not be represented from its solved mount datum, section, and depth.'
          ));
          continue;
        }
        auxiliaryNegatives.push(stamp({
          id,
          role:negative.type,
          ownerId:bodyId,
          sourceId:mount.sourceId,
          stationId:mount.stationId,
          acoustic:false,
          mesh
        },identity));
        expectedContacts.push(contact(
          'contact:auxiliary:'+id+':'+bodyId,
          id,bodyId,'auxiliary-through',identity
        ));
      }
    }
    if(diagnostics.length)return failure(diagnostics);
    positiveBodies.sort(idCompare);
    acousticLumenNegatives.sort(idCompare);
    auxiliaryNegatives.sort(idCompare);
    expectedContacts.sort(idCompare);
    allowedOverlapPairs.sort((left,right)=>
      (left.a+'\u0000'+left.b).localeCompare(
        right.a+'\u0000'+right.b
      )
    );

    const intentBase=stamp({
      schemaVersion:SCHEMA_VERSION,
      units:'m',
      constructionId:geometry.construction.constructionId,
      topologyImplementationRevision:IMPLEMENTATION_REVISION,
      geometryAuthority:'closed-canonical-construction-operands',
      geometryHash:geometry.geometryHash,
      integratedFieldContract:
        cloneValue(geometry.integratedFieldContract),
      hornOperandStatus:'closed-material-shell',
      requestedBooleanToleranceM:
        geometry.construction.booleanToleranceM,
      positiveBodies,
      acousticLumenNegatives,
      auxiliaryNegatives,
      expectedContacts,
      allowedOverlapPairs,
      bandOwnership:cloneValue(geometry.bandOwnership),
      operandAudits:cloneValue(geometry.audits),
      invariants:{
        canonicalSolvedRecordsOnly:true,
        closedOperandAuditsPassed:
          geometry.audits.allOperandsClosedManifold===true,
        mountMeshesCopiedVerbatim:true,
        oneSolidAdapterPerMount:true,
        passageSolidMeshesPreserved:true,
        hornInnerSurfaceTessellatedDeterministically:true,
        hornWallThicknessExplicit:true,
        hornWallThicknessInferred:false,
        toleranceInferred:false,
        booleanExecuted:false,
        exactSolid:false,
        manufacturing:false,
        stl:false
      }
    },identity);
    const intentHash=HASH_VERSION+'\n'+stableStringify(intentBase),
      solidIntent={
        ...intentBase,
        intentHash
      },
      result={
        schemaVersion:SCHEMA_VERSION,
        kind:'threeway-canonical-solid-intent-build',
        inputHash,
        solutionHash,
        topology:{kind:topology},
        canonicalRecords:records,
        solidIntent,
        counts:{
          entryStations:records.entryStations.length,
          apertureLayouts:records.apertureLayouts.length,
          chambers:records.chambers.length,
          passages:records.passages.length,
          mounts:records.mounts.length,
          positiveBodies:positiveBodies.length,
          mountAdapters:positiveBodies.filter(body=>
            body.role==='mount-adapter'
          ).length,
          acousticLumenNegatives:acousticLumenNegatives.length,
          auxiliaryNegatives:auxiliaryNegatives.length,
          expectedContacts:expectedContacts.length
        },
        execution:{
          booleanExecuted:false,
          exactSolid:false,
          fabricationAudited:false,
          manufacturing:false,
          export:false,
          stl:false
        }
      };
    return deepFreeze({
      ok:true,
      code:null,
      result,
      solidIntent,
      canonicalRecords:records,
      diagnostics:[],
      hashInput:intentHash,
      booleanExecuted:false,
      exactSolid:false,
      manufacturing:false,
      export:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'solid-intent-execution',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      booleanExecuted:false,
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
    supportedTopologies:SUPPORTED_TOPOLOGIES,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    stableStringify,
    buildSolidIntent,
    manufacturingPreflight
  });
}));
