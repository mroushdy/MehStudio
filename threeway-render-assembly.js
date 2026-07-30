/* MEH Studio v5 — canonical three-way render-geometry assembly.

   This pure boundary turns successful, already-solved schema-2 records into
   the renderer-neutral item DTO consumed by threeway-render-model.js.  It
   tessellates only the canonical horn through threeway-preview-geometry.js.
   Every other mesh, dimension, datum, transform, and ownership relation must
   already be present in the supplied solution records or explicit render
   intents.  It performs no acoustic solve, Boolean, rescale, driver motion,
   hidden fallback, exact-solid operation, or manufacturing authorization. */
(function attachThreeWayRenderAssembly(root,factory){
  'use strict';

  const preview=typeof module==='object'&&module.exports
    ?require('./threeway-preview-geometry.js')
    :root&&root.MEH3PreviewGeometry;
  const api=factory(preview);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MEH3RenderAssembly=api;
}(typeof globalThis!=='undefined'?globalThis:this,
function createThreeWayRenderAssembly(defaultPreview){
  'use strict';

  const VERSION=2;
  const STATE_SCHEMA_VERSION=2;
  const RENDER_SCHEMA_VERSION=1;
  const TOPOLOGY_IDS=Object.freeze([
    'T3','CX3','H3','COMPOUND_RESEARCH'
  ]);
  const BAND_IDS=Object.freeze(['low','mid','high']);
  const VIEW_IDS=Object.freeze([
    'full-assembly',
    'horn-only',
    'no-drivers-mount-assembly',
    'mounts-preview',
    'lumen-inspection',
    'section-cutaway',
    'package-bounds'
  ]);
  const ALLOWED_INTENT_PRIMITIVES=Object.freeze([
    'box','bounds','plane'
  ]);
  const IDENTITY_TRANSFORM=deepFreeze({
    matrix4:[
      1,0,0,0,
      0,1,0,0,
      0,0,1,0,
      0,0,0,1
    ]
  });

  const FAILURE_CODES=deepFreeze({
    INPUT_INVALID:'THREEWAY_RENDER_ASSEMBLY_INPUT_INVALID',
    DEPENDENCY_INVALID:'THREEWAY_RENDER_ASSEMBLY_DEPENDENCY_INVALID',
    STATE_INVALID:'THREEWAY_RENDER_ASSEMBLY_STATE_INVALID',
    SOLUTION_INVALID:'THREEWAY_RENDER_ASSEMBLY_SOLUTION_INVALID',
    HASH_MISMATCH:'THREEWAY_RENDER_ASSEMBLY_HASH_MISMATCH',
    HORN_INVALID:'THREEWAY_RENDER_ASSEMBLY_HORN_INVALID',
    DRIVER_RESULT_INVALID:
      'THREEWAY_RENDER_ASSEMBLY_DRIVER_RESULT_INVALID',
    PASSAGE_RESULT_INVALID:
      'THREEWAY_RENDER_ASSEMBLY_PASSAGE_RESULT_INVALID',
    MOUNT_RESULT_INVALID:'THREEWAY_RENDER_ASSEMBLY_MOUNT_RESULT_INVALID',
    PACKAGE_RESULT_INVALID:
      'THREEWAY_RENDER_ASSEMBLY_PACKAGE_RESULT_INVALID',
    OWNERSHIP_INVALID:'THREEWAY_RENDER_ASSEMBLY_OWNERSHIP_INVALID',
    GEOMETRY_MISSING:'THREEWAY_RENDER_ASSEMBLY_GEOMETRY_MISSING',
    GEOMETRY_INVALID:'THREEWAY_RENDER_ASSEMBLY_GEOMETRY_INVALID',
    CANONICAL_MESH_MISMATCH:
      'THREEWAY_RENDER_ASSEMBLY_CANONICAL_MESH_MISMATCH',
    RENDER_INTENT_INVALID:
      'THREEWAY_RENDER_ASSEMBLY_RENDER_INTENT_INVALID',
    DUPLICATE_ITEM:'THREEWAY_RENDER_ASSEMBLY_DUPLICATE_ITEM',
    PHYSICAL_AUTHORITY_FORBIDDEN:
      'THREEWAY_RENDER_ASSEMBLY_PHYSICAL_AUTHORITY_FORBIDDEN',
    PREVIEW_FAILED:'THREEWAY_RENDER_ASSEMBLY_PREVIEW_FAILED',
    NONFINITE_VALUE:'THREEWAY_RENDER_ASSEMBLY_NONFINITE_VALUE'
  });

  const CAPABILITIES=deepFreeze({
    status:'canonical-analysis-render-assembly-only',
    schema2Only:true,
    canonicalHornTessellation:true,
    canonicalInspectionMeshCopy:true,
    deterministicItems:true,
    deterministicVisibility:true,
    hashParity:true,
    acousticSolve:false,
    positionSolve:false,
    rescale:false,
    dimensionInference:false,
    driverMotion:false,
    booleanOperations:false,
    physicalMaterialAuthority:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'The assembly copies solved analysis geometry into visual DTOs; it is not a Boolean or fabrication boundary.'
  });

  const CATEGORY_VISIBILITY=deepFreeze({
    'horn-surface':[
      'horn-only','no-drivers-mount-assembly',
      'mounts-preview'
    ],
    'horn-full':['full-assembly'],
    'horn-xray':['lumen-inspection','package-bounds'],
    'horn-section':['section-cutaway'],
    'throat-interface':[
      'full-assembly','horn-only','no-drivers-mount-assembly',
      'lumen-inspection','section-cutaway','package-bounds'
    ],
    driver:['full-assembly','section-cutaway','package-bounds'],
    'driver-frame':['full-assembly','section-cutaway','package-bounds'],
    'driver-cone':['full-assembly','section-cutaway','package-bounds'],
    'driver-basket':['full-assembly','section-cutaway','package-bounds'],
    'driver-magnet':['full-assembly','section-cutaway','package-bounds'],
    'mount-host':[
      'no-drivers-mount-assembly',
      'mounts-preview','lumen-inspection','section-cutaway'
    ],
    'mount-adapter':[
      'full-assembly','no-drivers-mount-assembly',
      'mounts-preview','lumen-inspection','section-cutaway'
    ],
    aperture:[
      'full-assembly','horn-only','no-drivers-mount-assembly',
      'mounts-preview','lumen-inspection'
    ],
    'lumen-inspection':[
      'lumen-inspection','package-bounds'
    ],
    'station-marker':[
      'no-drivers-mount-assembly','mounts-preview',
      'lumen-inspection','section-cutaway'
    ],
    'section-plane':['section-cutaway'],
    'package-bounds':['package-bounds']
  });

  const MATERIALS=deepFreeze({
    'horn-surface':visualMaterial(
      'preview-horn-surface',0xd8d4cb,0.92,false,'mesh-standard'
    ),
    'horn-full':visualMaterial(
      'preview-horn-full-assembly',0xd8d4cb,0.96,false,'mesh-standard'
    ),
    'horn-xray':visualMaterial(
      'preview-horn-xray',0xb7c3bc,0.2,false,'mesh-standard'
    ),
    'horn-section':visualMaterial(
      'preview-horn-section',0xd8d4cb,0.34,false,'mesh-standard'
    ),
    'throat-interface':visualMaterial(
      'preview-throat-interface',0x20252a,0.92,false
    ),
    driver:visualMaterial('preview-driver-body',0x343a3e,0.98,false),
    'driver-frame':visualMaterial(
      'preview-driver-frame',0x777e82,0.96,false
    ),
    'driver-cone':visualMaterial(
      'preview-driver-diaphragm',0x262a2c,0.88,false
    ),
    'driver-basket':visualMaterial(
      'preview-driver-basket',0x566166,0.72,true
    ),
    'driver-magnet':visualMaterial(
      'preview-driver-magnet',0x17191a,0.98,false
    ),
    'mount-host':visualMaterial(
      'preview-full-face-mount-host',0x7b9290,0.88,false
    ),
    'mount-adapter':visualMaterial(
      'preview-solid-driver-cell-adapter',0xAEB7B3,0.9,false
    ),
    aperture:visualMaterial('preview-aperture',0x20272a,0.92,false),
    'lumen-inspection':visualMaterial(
      'preview-canonical-lumen',0x36b8c5,0.30,false
    ),
    'station-marker':visualMaterial(
      'preview-station-marker',0xf0b35b,0.5,true
    ),
    'section-plane':visualMaterial(
      'preview-section-plane',0xd96363,0.25,true
    ),
    'package-bounds':visualMaterial(
      'preview-package-bounds',0x8c8c94,0.16,true
    )
  });

  function isRecord(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
  }

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    for(const child of Object.values(value))deepFreeze(child);
    return Object.freeze(value);
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function finite(value){
    return typeof value==='number'&&Number.isFinite(value)?value:null;
  }

  function positive(value){
    const number=finite(value);
    return number!==null&&number>0?number:null;
  }

  function nonnegative(value){
    const number=finite(value);
    return number!==null&&number>=0?number:null;
  }

  function vec3(value){
    return Array.isArray(value)&&value.length===3&&
      value.every(item=>finite(item)!==null)
      ?value.map(item=>Object.is(item,-0)?0:item):null;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function visualMaterial(id,color,opacity,wireframe,kind){
    return {
      id,
      category:'analysis-preview-only',
      kind:kind||'mesh-basic',
      parameters:{
        color,
        opacity,
        transparent:opacity<1,
        depthWrite:opacity>=0.5,
        wireframe:wireframe===true,
        side:2
      },
      physicalMaterial:null,
      materialAuthority:false,
      manufacturing:false
    };
  }

  function stableClone(value,path,invalid,ancestors){
    const current=path||'$',
      invalidPaths=invalid||[],
      stack=ancestors||new WeakSet();
    if(Array.isArray(value)){
      if(stack.has(value)){
        invalidPaths.push(current);
        return null;
      }
      stack.add(value);
      const result=value.map((entry,index)=>
        stableClone(entry,current+'['+index+']',invalidPaths,stack)
      );
      stack.delete(value);
      return result;
    }
    if(isRecord(value)){
      const prototype=Object.getPrototypeOf(value);
      if(prototype!==null&&(
        !prototype.constructor||
        prototype.constructor.name!=='Object'
      )){
        invalidPaths.push(current);
        return null;
      }
      if(stack.has(value)){
        invalidPaths.push(current);
        return null;
      }
      stack.add(value);
      const result={};
      for(const key of Object.keys(value).sort()){
        if(value[key]===undefined){
          invalidPaths.push(current+'.'+key);
          result[key]=null;
        }else result[key]=stableClone(
          value[key],current+'.'+key,invalidPaths,stack
        );
      }
      stack.delete(value);
      return result;
    }
    if(typeof value==='number'){
      if(!Number.isFinite(value)){
        invalidPaths.push(current);
        return null;
      }
      return Object.is(value,-0)?0:value;
    }
    if(value===null||typeof value==='string'||typeof value==='boolean')
      return value;
    invalidPaths.push(current);
    return null;
  }

  function safeClone(value,path){
    const invalidPaths=[],
      result=stableClone(value,path||'$',invalidPaths);
    return {
      ok:invalidPaths.length===0,
      value:result,
      invalidPaths:[...new Set(invalidPaths)].sort()
    };
  }

  function stableStringify(value){
    const cloned=safeClone(value,'$');
    return cloned.ok?JSON.stringify(cloned.value):null;
  }

  function diagnostic(code,paths,message,details){
    const safe=safeClone(isRecord(details)?details:{},'$details');
    return deepFreeze({
      code,
      severity:'error',
      phase:'render-assembly',
      paths:uniqueStrings(paths),
      message,
      details:safe.value,
      blocksCapabilities:[
        'renderPreview','exactSolid','manufacturing','stl'
      ]
    });
  }

  function failure(code,paths,message,details){
    return deepFreeze({
      ok:false,
      code,
      message,
      diagnostics:[diagnostic(code,paths,message,details)],
      solution:null,
      renderGeometry:null,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function authorityForbidden(value){
    if(!isRecord(value))return false;
    return value.exactSolid===true||
      value.manufacturing===true||
      value.stl===true||
      value.manufacturingValidated===true||
      value.manufacturingAuthority===true||
      value.materialAuthority===true;
  }

  function sourceAndStationMaps(state){
    const sourceMap=new Map(),
      stationMap=new Map(),
      interfaceMap=new Map();
    if(!Array.isArray(state.sources)||
        !Array.isArray(state.entryStations)||
        !Array.isArray(state.interfaces))return null;
    for(const [index,source] of state.sources.entries()){
      const id=isRecord(source)?cleanString(source.id):null,
        bands=isRecord(source)?uniqueStrings(source.bandIds):[];
      if(!id||sourceMap.has(id)||!bands.length||
          bands.some(band=>!BAND_IDS.includes(band)))return null;
      sourceMap.set(id,{record:source,index,bands});
    }
    for(const [index,station] of state.entryStations.entries()){
      const id=isRecord(station)?cleanString(station.id):null,
        sourceIds=isRecord(station)?uniqueStrings(station.sourceIds):[],
        bands=isRecord(station)?uniqueStrings(station.bandIds):[];
      if(!id||stationMap.has(id)||!sourceIds.length||!bands.length||
          sourceIds.some(sourceId=>!sourceMap.has(sourceId))||
          bands.some(band=>!BAND_IDS.includes(band)))
        return null;
      stationMap.set(id,{record:station,index,sourceIds,bands});
    }
    for(const [index,item] of state.interfaces.entries()){
      const id=isRecord(item)?cleanString(item.id):null,
        sourceIds=isRecord(item)?uniqueStrings(item.sourceIds):[],
        bands=isRecord(item)?uniqueStrings(item.bandIds):[];
      if(!id||interfaceMap.has(id)||!sourceIds.length||!bands.length||
          sourceIds.some(sourceId=>!sourceMap.has(sourceId))||
          bands.some(band=>!BAND_IDS.includes(band))||
          !isRecord(item.geometry))return null;
      interfaceMap.set(id,{record:item,index,sourceIds,bands});
    }
    return {sourceMap,stationMap,interfaceMap};
  }

  function ownership(topologyId,sourceIds,bandIds,stationIds){
    return {
      topologyId,
      bandIds:uniqueStrings(bandIds),
      sourceIds:uniqueStrings(sourceIds),
      stationIds:uniqueStrings(stationIds)
    };
  }

  function ownershipValid(owner,maps){
    if(!owner||owner.topologyId!==maps.topologyId||
        owner.bandIds.some(band=>!BAND_IDS.includes(band))||
        owner.sourceIds.some(id=>!maps.sourceMap.has(id))||
        owner.stationIds.some(id=>!maps.stationMap.has(id)))return false;
    for(const sourceId of owner.sourceIds)
      if(owner.bandIds.some(
        band=>!maps.sourceMap.get(sourceId).bands.includes(band)
      ))return false;
    for(const stationId of owner.stationIds){
      const station=maps.stationMap.get(stationId);
      if(owner.sourceIds.some(id=>!station.sourceIds.includes(id))||
          owner.bandIds.some(band=>!station.bands.includes(band)))
        return false;
    }
    return true;
  }

  function visibility(category){
    const enabled=CATEGORY_VISIBILITY[category]||[];
    return Object.fromEntries(
      VIEW_IDS.map(viewId=>[viewId,enabled.includes(viewId)])
    );
  }

  function transformValid(transform){
    if(!isRecord(transform))return false;
    const hasMatrix=Object.prototype.hasOwnProperty.call(
        transform,'matrix4'
      ),
      hasTrs=['positionM','quaternion','scale'].some(key=>
        Object.prototype.hasOwnProperty.call(transform,key)
      );
    if(hasMatrix)return !hasTrs&&
      Array.isArray(transform.matrix4)&&transform.matrix4.length===16&&
      transform.matrix4.every(item=>finite(item)!==null);
    return hasTrs&&
      vec3(transform.positionM)!==null&&
      Array.isArray(transform.quaternion)&&
      transform.quaternion.length===4&&
      transform.quaternion.every(item=>finite(item)!==null)&&
      transform.quaternion.some(item=>item!==0)&&
      vec3(transform.scale)!==null&&
      transform.scale.every(item=>item!==0);
  }

  function flattenInspectionMesh(mesh,path){
    if(!isRecord(mesh)||!Array.isArray(mesh.verticesM)||
        !mesh.verticesM.length||!Array.isArray(mesh.triangles)||
        !mesh.triangles.length)return {
      ok:false,
      result:failure(
        FAILURE_CODES.GEOMETRY_MISSING,
        [path+'.verticesM',path+'.triangles'],
        'A supplied canonical indexed inspection mesh is required.'
      )
    };
    if(authorityForbidden(mesh))return {
      ok:false,
      result:failure(
        FAILURE_CODES.PHYSICAL_AUTHORITY_FORBIDDEN,[path],
        'Inspection meshes cannot carry exact-solid, material, manufacturing, or STL authority.'
      )
    };
    const positionsM=[];
    for(let index=0;index<mesh.verticesM.length;index++){
      const vertex=vec3(mesh.verticesM[index]);
      if(!vertex)return {
        ok:false,
        result:failure(
          FAILURE_CODES.GEOMETRY_INVALID,
          [path+'.verticesM['+index+']'],
          'Inspection-mesh vertices must be finite SI [x,y,z] arrays.'
        )
      };
      positionsM.push(...vertex);
    }
    const indices=[];
    for(let index=0;index<mesh.triangles.length;index++){
      const triangle=mesh.triangles[index];
      if(!Array.isArray(triangle)||triangle.length!==3||
          triangle.some(value=>!Number.isInteger(value)||
            value<0||value>=mesh.verticesM.length))return {
        ok:false,
        result:failure(
          FAILURE_CODES.GEOMETRY_INVALID,
          [path+'.triangles['+index+']'],
          'Inspection-mesh triangles must index supplied vertices.'
        )
      };
      indices.push(...triangle);
    }
    return {
      ok:true,
      mesh:{
        positionsM,
        indices,
        topology:'triangles'
      }
    };
  }

  function auditedInspectionMesh(mesh,path){
    const flattened=flattenInspectionMesh(mesh,path);
    if(!flattened.ok)return flattened;
    const audit=isRecord(mesh.audit)?mesh.audit:null;
    if(!audit||audit.closed!==true||audit.twoManifold!==true||
        audit.outwardOrientation!==true||
        finite(audit.degenerateTriangles)!==0)return {
      ok:false,
      result:failure(
        FAILURE_CODES.GEOMETRY_INVALID,[path+'.audit'],
        'Canonical inspection meshes must retain a successful closed, outward two-manifold upstream audit.'
      )
    };
    return flattened;
  }

  function auditedLitInspectionMesh(mesh,path){
    const flattened=auditedInspectionMesh(mesh,path);
    if(!flattened.ok)return flattened;
    const normals=Array.from(
      {length:mesh.verticesM.length},()=>[0,0,0]
    );
    for(const triangle of mesh.triangles){
      const a=mesh.verticesM[triangle[0]],
        b=mesh.verticesM[triangle[1]],
        c=mesh.verticesM[triangle[2]],
        ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],
        vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],
        face=[
          uy*vz-uz*vy,
          uz*vx-ux*vz,
          ux*vy-uy*vx
        ];
      for(const index of triangle){
        normals[index][0]+=face[0];
        normals[index][1]+=face[1];
        normals[index][2]+=face[2];
      }
    }
    flattened.mesh.normals=[];
    for(const normal of normals){
      const length=Math.hypot(...normal)||1;
      flattened.mesh.normals.push(
        normal[0]/length,normal[1]/length,normal[2]/length
      );
    }
    return flattened;
  }

  function intentGeometry(intent,path){
    const hasMesh=isRecord(intent&&intent.mesh),
      hasPrimitive=isRecord(intent&&intent.primitive);
    if(hasMesh===hasPrimitive)return {
      ok:false,
      result:failure(
        FAILURE_CODES.RENDER_INTENT_INVALID,
        [path+'.mesh',path+'.primitive'],
        'A render intent requires exactly one supplied mesh or primitive.'
      )
    };
    if(hasMesh){
      const flattened=flattenInspectionMesh(intent.mesh,path+'.mesh');
      return flattened.ok
        ?{ok:true,geometry:{mesh:flattened.mesh}}
        :flattened;
    }
    const kind=cleanString(intent.primitive.kind),
      parameters=intent.primitive.parameters,
      dimensions=isRecord(parameters)?parameters.dimensionsM:null,
      length=kind==='plane'?2:3;
    if(!ALLOWED_INTENT_PRIMITIVES.includes(kind)||
        !isRecord(parameters)||
        Object.keys(parameters).length!==1||
        !Array.isArray(dimensions)||dimensions.length!==length||
        dimensions.some(value=>positive(value)===null))return {
      ok:false,
      result:failure(
        FAILURE_CODES.RENDER_INTENT_INVALID,[path+'.primitive'],
        'Explicit render primitives are limited to box, bounds, or plane with positive supplied dimensionsM.'
      )
    };
    return {
      ok:true,
      geometry:{primitive:{
        kind,
        parameters:{dimensionsM:[...dimensions]}
      }}
    };
  }

  function boundsPrimitive(bounds,path){
    if(!isRecord(bounds))return null;
    const minM=vec3(bounds.minM),
      maxM=vec3(bounds.maxM);
    if(!minM||!maxM||
        maxM.some((value,index)=>!(value>minM[index])))return null;
    const dimensionsM=maxM.map((value,index)=>value-minM[index]),
      centerM=maxM.map((value,index)=>(value+minM[index])/2);
    return {
      primitive:{kind:'bounds',parameters:{dimensionsM}},
      transform:{
        positionM:centerM,
        quaternion:[0,0,0,1],
        scale:[1,1,1]
      },
      sourceBoundsM:{minM,maxM},
      path
    };
  }

  function closedAxialCylinderMesh(lengthM,radiusM,segments){
    const count=Math.max(16,Math.min(96,segments||48)),
      positionsM=[],
      indices=[],
      rearX=-lengthM/2,
      frontX=lengthM/2;
    for(const x of [rearX,frontX])
      for(let index=0;index<count;index++){
        const angle=2*Math.PI*index/count;
        positionsM.push(
          x,
          radiusM*Math.cos(angle),
          radiusM*Math.sin(angle)
        );
      }
    const rearCenter=positionsM.length/3;
    positionsM.push(rearX,0,0);
    const frontCenter=positionsM.length/3;
    positionsM.push(frontX,0,0);
    for(let index=0;index<count;index++){
      const next=(index+1)%count,
        rear=index,
        rearNext=next,
        front=count+index,
        frontNext=count+next;
      indices.push(
        rear,rearNext,frontNext,
        rear,frontNext,front,
        rearCenter,rearNext,rear,
        frontCenter,front,frontNext
      );
    }
    return {
      positionsM,
      indices,
      topology:'triangles'
    };
  }

  function closedAxialAnnulusMesh(lengthM,outerRadiusM,innerRadiusM,segments){
    const count=Math.max(16,Math.min(96,segments||48)),
      positionsM=[],
      indices=[],
      rearX=-lengthM/2,
      frontX=lengthM/2;
    for(const x of [rearX,frontX])
      for(const radius of [outerRadiusM,innerRadiusM])
        for(let index=0;index<count;index++){
          const angle=2*Math.PI*index/count;
          positionsM.push(
            x,
            radius*Math.cos(angle),
            radius*Math.sin(angle)
          );
        }
    const ring=(xIndex,radiusIndex,index)=>
      (xIndex*2+radiusIndex)*count+index;
    for(let index=0;index<count;index++){
      const next=(index+1)%count,
        ro=ring(0,0,index),ron=ring(0,0,next),
        ri=ring(0,1,index),rin=ring(0,1,next),
        fo=ring(1,0,index),fon=ring(1,0,next),
        fi=ring(1,1,index),fin=ring(1,1,next);
      indices.push(
        ro,ron,fon,ro,fon,fo,
        ri,fin,rin,ri,fi,fin,
        fo,fon,fin,fo,fin,fi,
        ro,rin,ron,ro,ri,rin
      );
    }
    return {positionsM,indices,topology:'triangles'};
  }

  function closedAxialFrustumMesh(
    lengthM,rearRadiusM,frontRadiusM,segments
  ){
    const count=Math.max(16,Math.min(96,segments||48)),
      positionsM=[],
      indices=[],
      rearX=-lengthM/2,
      frontX=lengthM/2;
    for(const [x,radius] of [
      [rearX,rearRadiusM],[frontX,frontRadiusM]
    ])
      for(let index=0;index<count;index++){
        const angle=2*Math.PI*index/count;
        positionsM.push(
          x,
          radius*Math.cos(angle),
          radius*Math.sin(angle)
        );
      }
    const rearCenter=positionsM.length/3;
    positionsM.push(rearX,0,0);
    const frontCenter=positionsM.length/3;
    positionsM.push(frontX,0,0);
    for(let index=0;index<count;index++){
      const next=(index+1)%count;
      indices.push(
        index,next,count+next,index,count+next,count+index,
        rearCenter,next,index,
        frontCenter,count+index,count+next
      );
    }
    return {positionsM,indices,topology:'triangles'};
  }

  /* A product view must not display the complete acoustic negative as a
     cyan bar.  This deliberately shallow, closed indicator copies the
     canonical horn-end section and frame without changing the physical
     passage.  The full lumen remains available only in the inspection view. */
  function apertureIndicatorMesh(lumenIntent){
    const frames=isRecord(lumenIntent)&&
        Array.isArray(lumenIntent.frames)?lumenIntent.frames:null,
      startSection=isRecord(lumenIntent&&lumenIntent.startSection)
        ?lumenIntent.startSection:null,
      endSection=isRecord(lumenIntent&&lumenIntent.endSection)
        ?lumenIntent.endSection:null;
    if(!frames||!frames.length||!startSection||!endSection)return null;
    const count=32,positionsM=[],indices=[];
    function appendIndicator(frame,section,axialOffsets){
      const origin=vec3(frame&&frame.originM),
        axial=vec3(frame&&frame.axial),
        u=vec3(frame&&frame.u),
        v=vec3(frame&&frame.v),
        diameter=positive(section&&section.diameterM),
        width=positive(section&&section.widthM)||(diameter||0),
        height=positive(section&&section.heightM)||(diameter||0);
      if(!origin||!axial||!u||!v||!(width>0)||!(height>0))
        return false;
      const exponent=section.family==='racetrack'?4:2,
        rotation=finite(section.rotationRad)||0,
        cosine=Math.cos(rotation),
        sine=Math.sin(rotation),
        base=positionsM.length/3;
      for(const axialOffset of axialOffsets)
        for(let index=0;index<count;index++){
          const angle=2*Math.PI*index/count,
            ca=Math.cos(angle),
            sa=Math.sin(angle),
            px=width/2*Math.sign(ca)*
              Math.pow(Math.abs(ca),2/exponent),
            py=height/2*Math.sign(sa)*
              Math.pow(Math.abs(sa),2/exponent),
            rx=px*cosine-py*sine,
            ry=px*sine+py*cosine;
          positionsM.push(
            origin[0]+axial[0]*axialOffset+u[0]*rx+v[0]*ry,
            origin[1]+axial[1]*axialOffset+u[1]*rx+v[1]*ry,
            origin[2]+axial[2]*axialOffset+u[2]*rx+v[2]*ry
          );
        }
      const rearCenter=positionsM.length/3;
      positionsM.push(
        origin[0]+axial[0]*axialOffsets[0],
        origin[1]+axial[1]*axialOffsets[0],
        origin[2]+axial[2]*axialOffsets[0]
      );
      const frontCenter=positionsM.length/3;
      positionsM.push(
        origin[0]+axial[0]*axialOffsets[1],
        origin[1]+axial[1]*axialOffsets[1],
        origin[2]+axial[2]*axialOffsets[1]
      );
      for(let index=0;index<count;index++){
        const next=(index+1)%count,
          rear=base+index,
          front=base+count+index,
          rearNext=base+next,
          frontNext=base+count+next;
        indices.push(
          rear,rearNext,frontNext,
          rear,frontNext,front,
          rearCenter,rearNext,rear,
          frontCenter,front,frontNext
        );
      }
      return true;
    }
    if(!appendIndicator(
      frames[0],startSection,[-0.0034,-0.0004]
    ))return null;
    if(!appendIndicator(
      frames[frames.length-1],endSection,[0.0004,0.0034]
    ))return null;
    return {positionsM,indices,topology:'triangles'};
  }

  function datumTransform(datum,center){
    return {
      matrix4:[
        datum.normal[0],datum.normal[1],datum.normal[2],0,
        datum.uAxis[0],datum.uAxis[1],datum.uAxis[2],0,
        datum.vAxis[0],datum.vAxis[1],datum.vAxis[2],0,
        center[0],center[1],center[2],1
      ]
    };
  }

  function driverInspectionVisual(source,envelope,datum){
    const frame=isRecord(source&&source.driver&&source.driver.frame)
        ?source.driver.frame:null,
      diaphragm=isRecord(
        source&&source.driver&&source.driver.diaphragm
      )?source.driver.diaphragm:null,
      frameRadius=positive(frame&&frame.diameterM)/2,
      activeRadius=positive(diaphragm&&diaphragm.activeDiameterM)/2,
      depth=positive(frame&&frame.depthM),
      front=vec3(envelope&&envelope.frontPointM),
      normal=vec3(datum&&datum.normal);
    if(frameRadius===null||activeRadius===null||depth===null||
        !front||!normal||!(activeRadius<frameRadius))return null;
    const pointAt=offset=>front.map(
        (value,index)=>value+normal[index]*offset
      ),
      frameThickness=Math.min(0.008,Math.max(0.003,depth*0.09)),
      basketLength=Math.max(0.018,depth*0.42),
      magnetLength=Math.max(0.016,depth*0.26),
      backPlateLength=Math.max(0.006,depth*0.1),
      basketCenter=-frameThickness-basketLength/2,
      magnetCenter=-frameThickness-basketLength-
        magnetLength/2,
      backCenter=-frameThickness-basketLength-
        magnetLength-backPlateLength/2,
      coneDepth=Math.min(0.022,depth*0.28);
    return [
      {
        role:'frame',
        category:'driver-frame',
        mesh:closedAxialAnnulusMesh(
          frameThickness,frameRadius,
          Math.max(activeRadius*1.02,frameRadius*0.72),56
        ),
        transform:datumTransform(
          datum,pointAt(-frameThickness/2)
        )
      },
      {
        role:'diaphragm',
        category:'driver-cone',
        mesh:closedAxialFrustumMesh(
          coneDepth,activeRadius*0.18,activeRadius,56
        ),
        transform:datumTransform(
          datum,pointAt(-frameThickness-coneDepth/2)
        )
      },
      {
        role:'basket',
        category:'driver-basket',
        mesh:closedAxialFrustumMesh(
          basketLength,frameRadius*0.48,frameRadius*0.82,40
        ),
        transform:datumTransform(datum,pointAt(basketCenter))
      },
      {
        role:'magnet',
        category:'driver-magnet',
        mesh:closedAxialCylinderMesh(
          magnetLength,frameRadius*0.45,48
        ),
        transform:datumTransform(datum,pointAt(magnetCenter))
      },
      {
        role:'back-plate',
        category:'driver',
        mesh:closedAxialCylinderMesh(
          backPlateLength,frameRadius*0.34,48
        ),
        transform:datumTransform(datum,pointAt(backCenter))
      }
    ];
  }

  function driverEnvelopeVisual(envelope,datum){
    if(!isRecord(envelope)||!isRecord(datum))return null;
    const radiusM=positive(envelope.radiusM),
      depthM=positive(envelope.depthM),
      frontProjectionM=nonnegative(envelope.frontProjectionM),
      rear=vec3(envelope.rearPointM),
      front=vec3(envelope.frontPointM),
      normal=vec3(datum.normal),
      uAxis=vec3(datum.uAxis),
      vAxis=vec3(datum.vAxis);
    if(radiusM===null||depthM===null||frontProjectionM===null||
        !rear||!front||!normal||!uAxis||!vAxis)
      return null;
    const delta=front.map((value,index)=>value-rear[index]),
      endpointDistanceM=Math.hypot(...delta),
      lengthM=depthM+frontProjectionM,
      norm=value=>Math.hypot(...value),
      dot=(left,right)=>left.reduce(
        (sum,value,index)=>sum+value*right[index],0
      ),
      axisTolerance=1e-8;
    if(!(lengthM>0)||
        Math.abs(endpointDistanceM-lengthM)>
          axisTolerance*Math.max(1,lengthM)||
        Math.abs(norm(normal)-1)>axisTolerance||
        Math.abs(norm(uAxis)-1)>axisTolerance||
        Math.abs(norm(vAxis)-1)>axisTolerance||
        Math.abs(dot(normal,uAxis))>axisTolerance||
        Math.abs(dot(normal,vAxis))>axisTolerance||
        Math.abs(dot(uAxis,vAxis))>axisTolerance||
        dot(delta,normal)<=0)return null;
    const center=front.map((value,index)=>(value+rear[index])/2);
    return {
      mesh:closedAxialCylinderMesh(lengthM,radiusM,48),
      transform:{
        matrix4:[
          normal[0],normal[1],normal[2],0,
          uAxis[0],uAxis[1],uAxis[2],0,
          vAxis[0],vAxis[1],vAxis[2],0,
          center[0],center[1],center[2],1
        ]
      }
    };
  }

  function itemRecord(
    id,category,solutionHash,owner,geometry,transform,metadata
  ){
    return Object.assign({
      id,
      category,
      solutionHash,
      ownership:owner,
      material:safeClone(MATERIALS[category],'$material').value,
      visibility:visibility(category),
      transform:safeClone(transform,'$transform').value
    },geometry,isRecord(metadata)?metadata:{},{
      analysisOnly:true,
      exactSolid:false,
      manufacturing:false,
      stl:false
    });
  }

  function unwrapResult(value,field){
    if(!isRecord(value)||value.ok!==true||authorityForbidden(value))
      return null;
    if(field&&isRecord(value.result)&&
        Object.prototype.hasOwnProperty.call(value.result,field))
      return value.result;
    if(!field||Object.prototype.hasOwnProperty.call(value,field))
      return value;
    return null;
  }

  function validateIntentSet(
    intents,key,idKey,expectedMap,path
  ){
    const values=isRecord(intents)&&Array.isArray(intents[key])
      ?intents[key]:null;
    if(!values||values.length!==expectedMap.size)return {
      ok:false,
      result:failure(
        FAILURE_CODES.RENDER_INTENT_INVALID,[path],
        path+' must contain exactly one explicit geometry intent per canonical owner.',
        {expectedIds:[...expectedMap.keys()].sort()}
      )
    };
    const map=new Map();
    for(let index=0;index<values.length;index++){
      const intent=values[index],
        id=isRecord(intent)?cleanString(intent[idKey]):null,
        intentPath=path+'['+index+']';
      if(!id||!expectedMap.has(id)||map.has(id)||
          !transformValid(intent.transform))return {
        ok:false,
        result:failure(
          FAILURE_CODES.RENDER_INTENT_INVALID,
          [intentPath+'.'+idKey,intentPath+'.transform'],
          'Render intents require one unique canonical owner ID and one explicit finite transform.',
          {id}
        )
      };
      const geometry=intentGeometry(intent,intentPath);
      if(!geometry.ok)return geometry;
      map.set(id,{intent,geometry:geometry.geometry});
    }
    return {ok:true,map};
  }

  function makeAssembler(previewApi){
    function assembleRenderGeometry(input){
      if(!isRecord(previewApi)||
          typeof previewApi.buildHornInnerSurface!=='function')
        return failure(
          FAILURE_CODES.DEPENDENCY_INVALID,
          ['threeway-preview-geometry.js'],
          'A callable threeway-preview-geometry.js dependency is required.'
        );
      if(!isRecord(input))return failure(
        FAILURE_CODES.INPUT_INVALID,['input'],
        'An explicit render-assembly input record is required.'
      );
      const state=input.state,
        solutionCore=input.solutionCore;
      if(!isRecord(state)||state.schemaVersion!==STATE_SCHEMA_VERSION||
          !isRecord(state.topology)||
          !TOPOLOGY_IDS.includes(cleanString(state.topology.kind)))
        return failure(
          FAILURE_CODES.STATE_INVALID,['state'],
          'A normalized schema-2 three-way state is required.'
        );
      const safeState=safeClone(state,'$.state');
      if(!safeState.ok)return failure(
        FAILURE_CODES.NONFINITE_VALUE,safeState.invalidPaths,
        'Normalized state contains nonfinite, undefined, cyclic, or runtime values.',
        {invalidPaths:safeState.invalidPaths}
      );
      const topologyId=cleanString(state.topology.kind),
        stateMaps=sourceAndStationMaps(state);
      if(!stateMaps)return failure(
        FAILURE_CODES.STATE_INVALID,
        ['state.sources','state.interfaces','state.entryStations'],
        'State sources, throat interfaces, and entry stations require complete unique canonical ownership.'
      );
      const maps=Object.assign({topologyId},stateMaps);
      if(!isRecord(solutionCore)||solutionCore.schemaVersion!==2||
          solutionCore.ok!==true||
          !isRecord(solutionCore.readiness)||
          solutionCore.readiness.analysis!==true||
          authorityForbidden(solutionCore))
        return failure(
          authorityForbidden(solutionCore)
            ?FAILURE_CODES.PHYSICAL_AUTHORITY_FORBIDDEN
            :FAILURE_CODES.SOLUTION_INVALID,
          ['solutionCore'],
          'A successful analysis-ready schema-2 solution core without physical authority is required.'
        );
      if(Object.prototype.hasOwnProperty.call(solutionCore,'renderGeometry'))
        return failure(
          FAILURE_CODES.SOLUTION_INVALID,
          ['solutionCore.renderGeometry'],
          'Render assembly accepts a solution core, not a pre-existing or stale renderGeometry DTO.'
        );
      const stateHash=cleanString(input.stateHash)||
          cleanString(input.inputHash)||
          cleanString(state.inputHash)||
          cleanString(state.stateHashInput)||
          cleanString(state.hashInput),
        inputHash=cleanString(solutionCore.inputHash),
        solutionHash=cleanString(solutionCore.solutionHash);
      if(!stateHash||!inputHash||!solutionHash||stateHash!==inputHash)
        return failure(
          FAILURE_CODES.HASH_MISMATCH,
          ['stateHash','solutionCore.inputHash','solutionCore.solutionHash'],
          'Normalized state, solution input, and solution identity require exact nonempty hash parity.',
          {stateHash,inputHash,solutionHash}
        );
      for(const [key,value] of Object.entries({
        'state.inputHash':state.inputHash,
        'state.stateHashInput':state.stateHashInput,
        'state.hashInput':state.hashInput
      }))
        if(value!==undefined&&cleanString(value)!==stateHash)
          return failure(
            FAILURE_CODES.HASH_MISMATCH,[key],
            'Every declared state input hash must equal the solution input hash.'
          );
      if(solutionCore.topologyId!==undefined&&
          cleanString(solutionCore.topologyId)!==topologyId)
        return failure(
          FAILURE_CODES.OWNERSHIP_INVALID,
          ['solutionCore.topologyId','state.topology.kind'],
          'Solution topology and normalized state topology must agree.'
        );

      const solidResult=isRecord(input.solidIntentResult)&&
          input.solidIntentResult.ok===true
          ?input.solidIntentResult:null,
        solidIntent=solidResult&&isRecord(solidResult.solidIntent)
          ?solidResult.solidIntent
          :isRecord(solutionCore.solidIntent)
            ?solutionCore.solidIntent:null,
        solidBodies=solidIntent&&Array.isArray(solidIntent.positiveBodies)
          ?solidIntent.positiveBodies:[],
        solidNegatives=solidIntent&&
          Array.isArray(solidIntent.acousticLumenNegatives)
          ?solidIntent.acousticLumenNegatives:[],
        solidReady=!!(
          solidIntent&&
          cleanString(solidIntent.inputHash)===inputHash&&
          cleanString(solidIntent.solutionHash)===solutionHash&&
          isRecord(solidIntent.invariants)&&
          solidIntent.invariants.closedOperandAuditsPassed===true&&
          solidIntent.invariants.oneSolidAdapterPerMount===true&&
          solidIntent.invariants.booleanExecuted===false&&
          solidIntent.invariants.exactSolid===false&&
          solidIntent.invariants.manufacturing===false&&
          solidIntent.invariants.stl===false
        );
      if(solidIntent&&!solidReady)return failure(
        FAILURE_CODES.HASH_MISMATCH,
        ['solidIntentResult.solidIntent'],
        'Closed preview operands require exact solution hashes, passed local audits, and no manufacturing authority.'
      );
      function positiveBody(role,ownerId){
        if(!solidReady)return null;
        return solidBodies.find(body=>
          isRecord(body)&&body.role===role&&
          (ownerId===undefined||cleanString(body.ownerId)===ownerId)
        )||null;
      }
      function negativeBody(passageId){
        if(!solidReady)return null;
        return solidNegatives.find(body=>
          isRecord(body)&&cleanString(body.passageId)===passageId
        )||null;
      }

      const horn=isRecord(input.hornSurface)&&
          isRecord(input.hornSurface.hornSurface)
          ?input.hornSurface.hornSurface:input.hornSurface;
      if(!isRecord(horn)||horn.ok!==true||
          horn.kind!=='threeway-horn-surface'||
          !cleanString(horn.surfaceHash)||
          !isRecord(horn.coordinateSystem)||
          authorityForbidden(horn))
        return failure(
          FAILURE_CODES.HORN_INVALID,['hornSurface'],
          'A successful canonical, analysis-only horn surface with coordinate-system ownership is required.'
        );
      const safeCoordinateSystem=safeClone(
        horn.coordinateSystem,'$.hornSurface.coordinateSystem'
      );
      if(!safeCoordinateSystem.ok)return failure(
        FAILURE_CODES.NONFINITE_VALUE,
        safeCoordinateSystem.invalidPaths,
        'Canonical horn coordinate-system metadata must be finite and serializable.',
        {invalidPaths:safeCoordinateSystem.invalidPaths}
      );
      const drivers=unwrapResult(input.resolvedDrivers,'sources'),
        passageRecord=unwrapResult(input.passageResult,'passages'),
        mountRecord=unwrapResult(input.mountResult,'mounts'),
        packageRecord=unwrapResult(input.packageResult,'package');
      if(!drivers||!Array.isArray(drivers.sources))
        return failure(
          FAILURE_CODES.DRIVER_RESULT_INVALID,['resolvedDrivers'],
          'A successful resolved-driver result is required.'
        );
      if(!passageRecord||!Array.isArray(passageRecord.passages)||
          !passageRecord.passages.length)
        return failure(
          FAILURE_CODES.PASSAGE_RESULT_INVALID,['passageResult'],
          'A successful nonempty canonical passage result is required.'
        );
      if(!mountRecord||!Array.isArray(mountRecord.mounts)||
          !mountRecord.mounts.length)
        return failure(
          FAILURE_CODES.MOUNT_RESULT_INVALID,['mountResult'],
          'A successful nonempty source-instance mount result is required.'
        );
      if(!packageRecord||!isRecord(packageRecord.package)||
          authorityForbidden(packageRecord))
        return failure(
          FAILURE_CODES.PACKAGE_RESULT_INVALID,['packageResult'],
          'A successful analysis-only package result is required.'
        );
      const driverMap=new Map();
      for(const [index,source] of drivers.sources.entries()){
        const sourceId=isRecord(source)?cleanString(source.sourceId):null,
          driverId=isRecord(source)&&isRecord(source.driver)
            ?cleanString(source.driver.id):null;
        if(!sourceId||!driverId||driverMap.has(sourceId)||
            !maps.sourceMap.has(sourceId))
          return failure(
            FAILURE_CODES.DRIVER_RESULT_INVALID,
            ['resolvedDrivers.sources['+index+']'],
            'Resolved drivers require one canonical driver record per known source.'
          );
        driverMap.set(sourceId,source);
      }

      const preview=previewApi.buildHornInnerSurface({
        hornSurface:horn,
        azimuthSegments:input.azimuthSegments
      });
      if(!preview||preview.ok!==true||!isRecord(preview.geometry))
        return failure(
          FAILURE_CODES.PREVIEW_FAILED,['hornSurface'],
          'Canonical horn tessellation failed closed.',
          {
            previewCode:preview&&preview.code||null,
            previewDiagnostics:preview&&preview.diagnostics||[]
          }
        );
      const hornBody=positiveBody('horn-shell'),
        hornMesh=hornBody
          ?auditedLitInspectionMesh(
            hornBody.mesh,'solidIntent.positiveBodies.horn-shell.mesh'
          )
          :flattenInspectionMesh(
            {
              verticesM:preview.geometry.verticesM,
              triangles:preview.geometry.triangles
            },
            'preview.geometry'
          );
      if(!hornMesh.ok)return hornMesh.result;

      const intents=isRecord(input.renderIntents)
          ?input.renderIntents:null,
        throatIntents=validateIntentSet(
          intents,'throatInterfaces','interfaceId',
          maps.interfaceMap,'renderIntents.throatInterfaces'
        ),
        stationIntents=validateIntentSet(
          intents,'stationMarkers','stationId',
          maps.stationMap,'renderIntents.stationMarkers'
        );
      if(!throatIntents.ok)return throatIntents.result;
      if(!stationIntents.ok)return stationIntents.result;
      if(!isRecord(intents.sectionPlane)||
          !cleanString(intents.sectionPlane.id)||
          !transformValid(intents.sectionPlane.transform))
        return failure(
          FAILURE_CODES.RENDER_INTENT_INVALID,
          ['renderIntents.sectionPlane'],
          'One explicit section-plane ID, geometry, and transform is required.'
        );
      const sectionGeometry=intentGeometry(
        intents.sectionPlane,'renderIntents.sectionPlane'
      );
      if(!sectionGeometry.ok)return sectionGeometry.result;

      const passageMap=new Map();
      for(const [index,passage] of passageRecord.passages.entries()){
        const path='passageResult.result.passages['+index+']',
          id=isRecord(passage)?cleanString(passage.id):null,
          apertureId=isRecord(passage)?cleanString(passage.apertureId):null,
          sourceId=isRecord(passage)?cleanString(passage.sourceId):null,
          stationId=isRecord(passage)?cleanString(passage.stationId):null,
          bandId=isRecord(passage)?cleanString(passage.bandId):null,
          owner=ownership(
            topologyId,[sourceId],[bandId],[stationId]
          );
        if(!id||!apertureId||passageMap.has(id)||
            passage.canonicalNegative!==true||
            passage.subtractedFromPositiveHosts!==false||
            authorityForbidden(passage)||
            !ownershipValid(owner,maps))
          return failure(
            FAILURE_CODES.OWNERSHIP_INVALID,[path],
            'Every canonical passage requires unique identity and exact source/band/station ownership.'
          );
        const mesh=auditedInspectionMesh(
          passage.negativeInspectionMesh,
          path+'.negativeInspectionMesh'
        );
        if(!mesh.ok)return mesh.result;
        passageMap.set(id,{passage,owner,mesh:mesh.mesh});
      }

      const items=[],
        ids=new Set();
      function pushItem(item,path){
        if(!item||!cleanString(item.id)||ids.has(item.id))
          return failure(
            FAILURE_CODES.DUPLICATE_ITEM,[path||'items'],
            'Every assembled render item requires a unique deterministic ID.',
            {id:item&&item.id||null}
          );
        if(!ownershipValid(item.ownership,maps))
          return failure(
            FAILURE_CODES.OWNERSHIP_INVALID,
            [path||'items',item.id+'.ownership'],
            'Assembled item ownership is not carried by the canonical state graph.',
            {id:item.id,ownership:item.ownership}
          );
        ids.add(item.id);
        items.push(item);
        return null;
      }

      let issue=pushItem(itemRecord(
        hornBody?cleanString(hornBody.id):
          'horn-surface:'+cleanString(horn.surfaceHash),
        'horn-surface',solutionHash,
        ownership(topologyId,[],[],[]),
        {mesh:hornMesh.mesh},IDENTITY_TRANSFORM,
        {
          canonicalSurfaceHash:horn.surfaceHash,
          previewHashInput:cleanString(preview.hashInput),
          intentionallyOpen:hornBody
            ?false:preview.geometry.intentionallyOpen===true,
          closedMaterialShell:!!hornBody,
          geometryAuthority:hornBody
            ?'closed-canonical-construction-operand'
            :'canonical-horn-surface'
        }
      ),'hornSurface');
      if(issue)return issue;
      if(hornBody){
        for(const category of [
          'horn-full','horn-xray','horn-section'
        ]){
          issue=pushItem(itemRecord(
            cleanString(hornBody.id)+':'+category,
            category,solutionHash,
            ownership(topologyId,[],[],[]),
            {mesh:safeClone(hornMesh.mesh,'$.'+category+'.mesh').value},
            IDENTITY_TRANSFORM,
            {
              canonicalSurfaceHash:horn.surfaceHash,
              intentionallyOpen:false,
              closedMaterialShell:true,
              inspectionOverlay:true,
              geometryAuthority:
                'closed-canonical-construction-operand'
            }
          ),'hornSurface.'+category);
          if(issue)return issue;
        }
      }

      for(const interfaceId of [...maps.interfaceMap.keys()].sort()){
        const stateInterface=maps.interfaceMap.get(interfaceId),
          intent=throatIntents.map.get(interfaceId),
          highSource=stateInterface.sourceIds
            .map(sourceId=>driverMap.get(sourceId))
            .find(source=>source&&source.driver&&
              source.driver.kind==='compression'),
          highDriver=highSource&&highSource.driver,
          throatBody=positiveBody('throat-interface'),
          throatMesh=throatBody
            ?auditedInspectionMesh(
              throatBody.mesh,
              'solidIntent.positiveBodies.throat-interface.mesh'
            ):null;
        if(throatMesh&&!throatMesh.ok)return throatMesh.result;
        issue=pushItem(itemRecord(
          throatBody?cleanString(throatBody.id):
            'throat-interface:'+interfaceId,
          'throat-interface',solutionHash,
          ownership(
            topologyId,stateInterface.sourceIds,
            stateInterface.bands,[]
          ),
          throatMesh?{mesh:throatMesh.mesh}:intent.geometry,
          throatMesh?IDENTITY_TRANSFORM:intent.intent.transform,
          {
            interfaceId,
            interfaceKind:cleanString(stateInterface.record.kind),
            canonicalGeometry:safeClone(
              stateInterface.record.geometry,
              '$.interface.geometry'
            ).value,
            highDriverRecordId:highDriver
              ?cleanString(highDriver.id):null,
            highFrameDiameterM:highDriver
              ?positive(highDriver.frame&&highDriver.frame.diameterM):null,
            highDriverDepthM:highDriver
              ?positive(highDriver.frame&&highDriver.frame.depthM):null,
            highThroatDiameterM:highDriver
              ?positive(
                highDriver.outputs&&highDriver.outputs[0]&&
                highDriver.outputs[0].geometry&&
                highDriver.outputs[0].geometry.diameterM
              ):null,
            highDriverVisualRequired:!!highDriver,
            geometryAuthority:throatMesh
              ?'closed-canonical-construction-operand'
              :'explicit-throat-interface-intent',
            duplicateThroatDisc:false
          }
        ),'renderIntents.throatInterfaces');
        if(issue)return issue;
      }

      const boundPassageIds=new Set(),
        mountCounts=new Map();
      for(const [index,mount] of [...mountRecord.mounts].sort(
        (left,right)=>String(left&&left.id||'').localeCompare(
          String(right&&right.id||'')
        )
      ).entries()){
        const path='mountResult.result.mounts['+index+']',
          id=isRecord(mount)?cleanString(mount.id):null,
          instanceId=isRecord(mount)?cleanString(mount.instanceId):null,
          sourceId=isRecord(mount)?cleanString(mount.sourceId):null,
          stationId=isRecord(mount)?cleanString(mount.stationId):null,
          driverRecordId=isRecord(mount)
            ?cleanString(mount.driverRecordId):null,
          source=sourceId?maps.sourceMap.get(sourceId):null,
          station=stationId?maps.stationMap.get(stationId):null,
          driver=sourceId?driverMap.get(sourceId):null,
          owner=ownership(
            topologyId,[sourceId],source?source.bands:[],[stationId]
          );
        if(!id||!instanceId||!source||!station||!driver||
            cleanString(driver.driver.id)!==driverRecordId||
            !ownershipValid(owner,maps)||
            !isRecord(mount.mountDatum)||
            !isRecord(mount.driverEnvelope)||
            !isRecord(mount.mountHost)||
            mount.mountHost.positiveHost?.fullFace!==true||
            mount.mountHost.positiveHost?.centerOpen!==false||
            mount.mountHost.positiveHost?.booleanUnionPerformed!==false||
            mount.mountHost.negativeIntents
              ?.booleanSubtractionPerformed!==false||
            authorityForbidden(mount))
          return failure(
            FAILURE_CODES.MOUNT_RESULT_INVALID,[path],
            'Every mount requires an owned full-face positive host, datum, driver envelope, and matching resolved driver.'
          );
        const solidHost=positiveBody('mount-host',id),
          solidAdapter=positiveBody('mount-adapter',id),
          hostMesh=auditedInspectionMesh(
            solidHost?solidHost.mesh:mount.inspectionMesh,
            solidHost
              ?'solidIntent.positiveBodies.mount-host['+id+'].mesh'
              :path+'.inspectionMesh'
          ),
          adapterMesh=solidAdapter?auditedInspectionMesh(
            solidAdapter.mesh,
            'solidIntent.positiveBodies.mount-adapter['+id+'].mesh'
          ):null;
        if(!hostMesh.ok)return hostMesh.result;
        if(adapterMesh&&!adapterMesh.ok)return adapterMesh.result;
        const envelope=driverEnvelopeVisual(
          mount.driverEnvelope,mount.mountDatum
        ),
          driverParts=driverInspectionVisual(
            driver,mount.driverEnvelope,mount.mountDatum
          );
        if(!envelope||!driverParts)return failure(
          FAILURE_CODES.MOUNT_RESULT_INVALID,
          [path+'.driverEnvelope',path+'.mountDatum'],
          'Driver envelopes require supplied radius, endpoints, and complete mount-datum axes.'
        );
        mountCounts.set(sourceId,(mountCounts.get(sourceId)||0)+1);
        for(const part of driverParts){
          issue=pushItem(itemRecord(
            'driver-part:'+instanceId+':'+part.role,
            part.category,solutionHash,owner,
            {mesh:part.mesh},part.transform,
            {
              instanceId,driverRecordId,
              partRole:part.role,
              frameDiameterM:
                positive(driver.driver.frame.diameterM),
              activeDiameterM:
                positive(
                  driver.driver.diaphragm&&
                  driver.driver.diaphragm.activeDiameterM
                )||positive(driver.driver.frame.diameterM)*0.72,
              driverDepthM:
                positive(driver.driver.frame.depthM),
              dimensionsFromDriverRecord:true,
              commercialCad:false,
              visualReferenceOnly:true,
              hardwareValidated:false,
              conservativeEnvelopeId:
                'driver-envelope:'+instanceId
            }
          ),path+'.driverInspection.'+part.role);
          if(issue)return issue;
        }
        issue=pushItem(itemRecord(
          'mount-host:'+instanceId,
          'mount-host',solutionHash,owner,
          {mesh:hostMesh.mesh},IDENTITY_TRANSFORM,
          {
            instanceId,
            mountHostId:cleanString(mount.mountHost.id),
            frameDiameterM:
              positive(driver.driver.frame.diameterM),
            activeDiameterM:
              positive(
                driver.driver.diaphragm&&
                driver.driver.diaphragm.activeDiameterM
              )||positive(driver.driver.frame.diameterM)*0.72,
            mountFaceM:vec3(mount.driverEnvelope.frontPointM),
            mountNormal:vec3(mount.mountDatum.normal),
            fullFace:true,
            centerOpen:false,
            upstreamAudit:safeClone(
              (solidHost?solidHost.mesh:mount.inspectionMesh).audit,
              '$.mount.audit'
            ).value,
            negativesApplied:false,
            geometryAuthority:solidHost
              ?'closed-canonical-construction-operand'
              :'positive-host-inspection-mesh'
          }
        ),path+'.inspectionMesh');
        if(issue)return issue;
        if(adapterMesh){
          issue=pushItem(itemRecord(
            cleanString(solidAdapter.id),
            'mount-adapter',solutionHash,owner,
            {mesh:adapterMesh.mesh},IDENTITY_TRANSFORM,
            {
              instanceId,
              mountHostId:id,
              joinsPlateToHorn:true,
              geometryAuthority:
                'closed-canonical-construction-operand'
            }
          ),path+'.solidAdapter');
          if(issue)return issue;
        }
        if(!Array.isArray(mount.apertureBindings)||
            !mount.apertureBindings.length)
          return failure(
            FAILURE_CODES.MOUNT_RESULT_INVALID,
            [path+'.apertureBindings'],
            'Every mounted source instance requires explicit canonical lumen bindings.'
          );
        for(const [bindingIndex,binding] of
          mount.apertureBindings.entries()){
          const bindingPath=path+'.apertureBindings['+bindingIndex+']',
            passageId=isRecord(binding)
              ?cleanString(binding.passageId):null,
            canonical=passageId?passageMap.get(passageId):null;
          if(!canonical||boundPassageIds.has(passageId)||
              binding.apertureId!==canonical.passage.apertureId||
              binding.canonicalLumenThroughHostIntent!==true||
              binding.booleanSubtractionPerformed!==false||
              stableStringify(binding.negativeInspectionMesh)!==
                stableStringify(
                  canonical.passage.negativeInspectionMesh
                )||
              canonical.passage.sourceId!==sourceId||
              canonical.passage.stationId!==stationId)
            return failure(
              canonical&&
                stableStringify(binding.negativeInspectionMesh)!==
                  stableStringify(
                    canonical.passage.negativeInspectionMesh
                  )
                ?FAILURE_CODES.CANONICAL_MESH_MISMATCH
                :FAILURE_CODES.MOUNT_RESULT_INVALID,
              [bindingPath,'passageResult'],
              'Each mount binding must consume exactly one byte-equivalent canonical passage mesh with matching ownership.'
            );
          boundPassageIds.add(passageId);
        }
      }
      if(boundPassageIds.size!==passageMap.size)
        return failure(
          FAILURE_CODES.MOUNT_RESULT_INVALID,
          ['mountResult','passageResult'],
          'Every canonical passage must be bound by exactly one mount.',
          {
            passageIds:[...passageMap.keys()].sort(),
            boundPassageIds:[...boundPassageIds].sort()
          }
        );
      for(const station of maps.stationMap.values())
        for(const sourceId of station.sourceIds){
          const count=positive(maps.sourceMap.get(sourceId).record.count);
          if(count===null||mountCounts.get(sourceId)!==count)
            return failure(
              FAILURE_CODES.MOUNT_RESULT_INVALID,
              ['state.sources['+sourceId+'].count','mountResult'],
              'Physical mount count must equal the explicit canonical source count.',
              {
                sourceId,
                expected:count,
                actual:mountCounts.get(sourceId)||0
              }
            );
        }

      for(const passageId of [...passageMap.keys()].sort()){
        const canonical=passageMap.get(passageId),
          solidNegative=negativeBody(passageId),
          solidLumen=solidNegative?auditedInspectionMesh(
            solidNegative.mesh,
            'solidIntent.acousticLumenNegatives['+passageId+'].mesh'
          ):null,
          visibleLumenMesh=solidLumen&&solidLumen.ok
            ?solidLumen.mesh:canonical.mesh,
          apertureMesh=apertureIndicatorMesh(
            canonical.passage.canonicalLumenIntent
          )||visibleLumenMesh,
          apertureItemId='aperture:'+canonical.passage.apertureId,
          lumenItemId='lumen-inspection:'+passageId;
        if(solidLumen&&!solidLumen.ok)return solidLumen.result;
        issue=pushItem(itemRecord(
          apertureItemId,'aperture',solutionHash,canonical.owner,
          {mesh:safeClone(apertureMesh,'$.aperture.mesh').value},
          IDENTITY_TRANSFORM,
          {
            apertureId:canonical.passage.apertureId,
            passageId,
            geometryAuthority:apertureMesh===visibleLumenMesh
              ?'canonical-lumen-negative-preview'
              :'canonical-horn-end-section-indicator',
            booleanSubtractionPerformed:false
          }
        ),'passageResult');
        if(issue)return issue;
        issue=pushItem(itemRecord(
          lumenItemId,'lumen-inspection',solutionHash,canonical.owner,
          {mesh:safeClone(visibleLumenMesh,'$.lumen.mesh').value},
          IDENTITY_TRANSFORM,
          {
            apertureId:canonical.passage.apertureId,
            passageId,
            canonicalNegative:true,
            upstreamAudit:safeClone(
              canonical.passage.negativeInspectionMesh.audit,
              '$.lumen.audit'
            ).value,
            geometryAuthority:solidNegative
              ?'continuous-closed-canonical-lumen-negative'
              :'exact-canonical-inspection-mesh',
            booleanSubtractionPerformed:false
          }
        ),'passageResult');
        if(issue)return issue;
      }

      for(const stationId of [...maps.stationMap.keys()].sort()){
        const stateStation=maps.stationMap.get(stationId),
          intent=stationIntents.map.get(stationId);
        issue=pushItem(itemRecord(
          'station-marker:'+stationId,
          'station-marker',solutionHash,
          ownership(
            topologyId,stateStation.sourceIds,
            stateStation.bands,[stationId]
          ),
          intent.geometry,intent.intent.transform,
          {
            stationId,
            stationRole:cleanString(stateStation.record.role),
            geometryAuthority:'explicit-station-marker-intent'
          }
        ),'renderIntents.stationMarkers');
        if(issue)return issue;
      }

      issue=pushItem(itemRecord(
        'section-plane:'+cleanString(intents.sectionPlane.id),
        'section-plane',solutionHash,
        ownership(topologyId,[],[],[]),
        sectionGeometry.geometry,intents.sectionPlane.transform,
        {
          sectionPlaneId:cleanString(intents.sectionPlane.id),
          geometryAuthority:'explicit-section-plane-intent'
        }
      ),'renderIntents.sectionPlane');
      if(issue)return issue;

      const packageBounds=boundsPrimitive(
        packageRecord.package.boundsM,
        'packageResult.result.package.boundsM'
      );
      if(!packageBounds||
          packageRecord.driverEnvelopeCount!==mountRecord.mounts.length||
          packageRecord.mountHostCount!==mountRecord.mounts.length)
        return failure(
          FAILURE_CODES.PACKAGE_RESULT_INVALID,
          ['packageResult.result.package.boundsM','packageResult.result'],
          'Package bounds and explicit driver/mount counts must match the assembled source instances.'
        );
      issue=pushItem(itemRecord(
        'package-bounds','package-bounds',solutionHash,
        ownership(topologyId,[],[],[]),
        {primitive:packageBounds.primitive},packageBounds.transform,
        {
          sourceBoundsM:packageBounds.sourceBoundsM,
          withinLimit:packageRecord.package.withinLimit===true,
          geometryAuthority:'solved-package-bounds'
        }
      ),'packageResult');
      if(issue)return issue;

      items.sort((left,right)=>left.id.localeCompare(right.id));
      const safeCore=safeClone(solutionCore,'$.solutionCore');
      if(!safeCore.ok)return failure(
        FAILURE_CODES.NONFINITE_VALUE,
        safeCore.invalidPaths,
        'The solution core contains nonfinite, undefined, cyclic, or runtime values.',
        {invalidPaths:safeCore.invalidPaths}
      );
      const renderGeometry=deepFreeze({
        schemaVersion:RENDER_SCHEMA_VERSION,
        topologyId,
        inputHash,
        solutionHash,
        provider:'threeway-render-assembly.js',
        providerVersion:VERSION,
        coordinateSystem:safeCoordinateSystem.value,
        items:items.map(item=>deepFreeze(item)),
        fidelity:'analysis-inspection-preview',
        closedOperandPreview:solidReady,
        geometryRescaled:false,
        dimensionsInferred:false,
        booleanOperations:false,
        physicalMaterialAuthority:false,
        exactSolid:false,
        manufacturing:false,
        stl:false
      });
      const solution=Object.assign({},safeCore.value,{
        renderGeometry,
        exactSolid:false,
        manufacturing:false,
        stl:false
      });
      return deepFreeze({
        ok:true,
        code:null,
        solution:deepFreeze(solution),
        renderGeometry,
        itemCount:items.length,
        inputHash,
        solutionHash,
        hashInput:
          'meh3-render-assembly-v1\n'+stableStringify(renderGeometry),
        diagnostics:[],
        exactSolid:false,
        manufacturing:false,
        stl:false,
        capabilities:CAPABILITIES
      });
    }

    function manufacturingPreflight(operation){
      return deepFreeze({
        ok:false,
        available:false,
        operation:cleanString(operation)||'render-assembly-export',
        code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
        reason:CAPABILITIES.reason,
        exactSolid:false,
        manufacturing:false,
        stl:false,
        capabilities:CAPABILITIES
      });
    }

    return deepFreeze({
      version:VERSION,
      schemaVersion:STATE_SCHEMA_VERSION,
      renderSchemaVersion:RENDER_SCHEMA_VERSION,
      failureCodes:FAILURE_CODES,
      viewIds:VIEW_IDS,
      capabilities:CAPABILITIES,
      stableStringify,
      assembleRenderGeometry,
      manufacturingPreflight,
      createRenderAssembly:makeAssembler
    });
  }

  return makeAssembler(defaultPreview);
}));
