/* MEH Studio v5 — canonical package-envelope input builder.

   This pure adapter derives conservative axis-aligned bounds only from
   already-solved horn sections, positive mount inspection meshes, and
   documented driver capsules.  It does not move, resize, or solve them. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3PackageInput=factory();
})(function(){
  'use strict';

  const VERSION=1;
  const ADDITIONAL_ROLES=deepFreeze([
    'rear-system',
    'service-envelope',
    'cabinet-structure',
    'research-envelope'
  ]);
  const FAILURE_CODES=deepFreeze({
    INPUT_INVALID:'THREEWAY_PACKAGE_INPUT_INVALID',
    HORN_INVALID:'THREEWAY_PACKAGE_INPUT_HORN_INVALID',
    MOUNT_RESULT_INVALID:'THREEWAY_PACKAGE_INPUT_MOUNT_INVALID',
    MESH_INVALID:'THREEWAY_PACKAGE_INPUT_MESH_INVALID',
    DRIVER_ENVELOPE_INVALID:
      'THREEWAY_PACKAGE_INPUT_DRIVER_ENVELOPE_INVALID',
    COMPONENT_INVALID:'THREEWAY_PACKAGE_INPUT_COMPONENT_INVALID',
    AUTHORITY_FORBIDDEN:'THREEWAY_PACKAGE_INPUT_AUTHORITY_FORBIDDEN'
  });
  const CAPABILITIES=deepFreeze({
    status:'solved-geometry-to-conservative-package-bounds',
    canonicalHornBounds:true,
    positiveMountBounds:true,
    documentedDriverCapsuleBounds:true,
    explicitAdditionalComponents:true,
    axisAlignedConservativeBounds:true,
    geometryMutation:false,
    driverMotion:false,
    hornGrowth:false,
    productInference:false,
    booleanOperations:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'This adapter reports conservative analysis envelopes only; the package solver decides whether growth or collision resolution is required.'
  });

  function isObject(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function finite(value){
    return typeof value==='number'&&Number.isFinite(value);
  }

  function nonnegative(value){
    return finite(value)&&value>=0?value:null;
  }

  function vec3(value){
    return Array.isArray(value)&&value.length===3&&value.every(finite)
      ?value.map(item=>Object.is(item,-0)?0:item):null;
  }

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    for(const key of Object.keys(value))deepFreeze(value[key]);
    return Object.freeze(value);
  }

  function cloneValue(value){
    if(Array.isArray(value))return value.map(cloneValue);
    if(isObject(value)){
      const result={};
      for(const key of Object.keys(value))result[key]=cloneValue(value[key]);
      return result;
    }
    if(typeof value==='number')return Object.is(value,-0)?0:value;
    return value;
  }

  function stableClone(value){
    if(Array.isArray(value))return value.map(stableClone);
    if(isObject(value)){
      const result={};
      for(const key of Object.keys(value).sort())
        if(value[key]!==undefined)result[key]=stableClone(value[key]);
      return result;
    }
    if(typeof value==='number')
      return Number.isFinite(value)?(Object.is(value,-0)?0:value):null;
    if(value===null||typeof value==='string'||typeof value==='boolean')
      return value;
    return null;
  }

  function stableStringify(value){
    return JSON.stringify(stableClone(value));
  }

  function uniqueStrings(value){
    return [...new Set(
      (Array.isArray(value)?value:[]).map(cleanString).filter(Boolean)
    )].sort();
  }

  function diagnostic(code,paths,message,details){
    return deepFreeze({
      code,severity:'error',phase:'package-input',
      paths:uniqueStrings(paths),message,
      details:isObject(details)||Array.isArray(details)
        ?cloneValue(details):{}
    });
  }

  function compareDiagnostics(left,right){
    return [
      left.code,left.paths.join('\u0000'),left.message
    ].join('\u0001').localeCompare([
      right.code,right.paths.join('\u0000'),right.message
    ].join('\u0001'));
  }

  function authorityForbidden(value,ancestors){
    if(!value||typeof value!=='object')return false;
    const stack=ancestors||new WeakSet();
    if(stack.has(value))return true;
    stack.add(value);
    for(const key of Object.keys(value)){
      if([
        'manufacturing','exactSolid','stl',
        'booleanUnionPerformed','booleanSubtractionPerformed'
      ].includes(key)&&value[key]===true){
        stack.delete(value);
        return true;
      }
      if(authorityForbidden(value[key],stack)){
        stack.delete(value);
        return true;
      }
    }
    stack.delete(value);
    return false;
  }

  function boundsFromPoints(points){
    if(!Array.isArray(points)||!points.length)return null;
    const first=vec3(points[0]);
    if(!first)return null;
    const minimum=first.slice(),maximum=first.slice();
    for(let index=1;index<points.length;index++){
      const point=vec3(points[index]);
      if(!point)return null;
      for(let axis=0;axis<3;axis++){
        minimum[axis]=Math.min(minimum[axis],point[axis]);
        maximum[axis]=Math.max(maximum[axis],point[axis]);
      }
    }
    return {minM:minimum,maxM:maximum};
  }

  function hornBounds(horn,diagnostics){
    if(!isObject(horn)||horn.ok!==true||
        horn.kind!=='threeway-horn-surface'||
        !cleanString(horn.surfaceHash)||
        !Array.isArray(horn.stations)||horn.stations.length<2||
        authorityForbidden(horn)){
      diagnostics.push(diagnostic(
        authorityForbidden(horn)
          ?FAILURE_CODES.AUTHORITY_FORBIDDEN
          :FAILURE_CODES.HORN_INVALID,
        ['hornSurface'],
        'A successful analysis-only canonical horn surface is required.'
      ));
      return null;
    }
    let minimumX=Infinity,maximumX=-Infinity,
      maximumHalfWidth=0,maximumHalfHeight=0;
    for(let index=0;index<horn.stations.length;index++){
      const station=horn.stations[index],
        x=station&&station.axialM,
        width=station&&station.section&&station.section.widthM,
        height=station&&station.section&&station.section.heightM;
      if(!finite(x)||!finite(width)||width<=0||
          !finite(height)||height<=0){
        diagnostics.push(diagnostic(
          FAILURE_CODES.HORN_INVALID,
          ['hornSurface.stations['+index+']'],
          'Every horn station requires finite positive section axes.'
        ));
        continue;
      }
      minimumX=Math.min(minimumX,x);
      maximumX=Math.max(maximumX,x);
      maximumHalfWidth=Math.max(maximumHalfWidth,width/2);
      maximumHalfHeight=Math.max(maximumHalfHeight,height/2);
    }
    if(!Number.isFinite(minimumX)||!Number.isFinite(maximumX))
      return null;
    if(!(maximumX>minimumX)){
      diagnostics.push(diagnostic(
        FAILURE_CODES.HORN_INVALID,
        ['hornSurface.stations'],
        'Canonical horn stations must span a positive axial depth.'
      ));
      return null;
    }
    return {
      id:'horn:'+horn.surfaceHash,
      boundsM:{
        minM:[minimumX,-maximumHalfWidth,-maximumHalfHeight],
        maxM:[maximumX,maximumHalfWidth,maximumHalfHeight]
      },
      provenanceRefs:[
        'threeway-horn-surface:'+horn.surfaceHash
      ]
    };
  }

  function meshBounds(mesh,path,diagnostics){
    const vertices=isObject(mesh)&&Array.isArray(mesh.verticesM)
      ?mesh.verticesM:null;
    if(!vertices||!vertices.length){
      diagnostics.push(diagnostic(
        FAILURE_CODES.MESH_INVALID,[path],
        'A positive mount inspection mesh with explicit verticesM is required.'
      ));
      return null;
    }
    const bounds=boundsFromPoints(vertices);
    if(!bounds||bounds.minM.some((value,axis)=>
      !(value<bounds.maxM[axis]))){
      diagnostics.push(diagnostic(
        FAILURE_CODES.MESH_INVALID,[path+'.verticesM'],
        'Mount inspection vertices must form finite positive-volume SI bounds.'
      ));
      return null;
    }
    return bounds;
  }

  function capsuleBounds(envelope,path,diagnostics){
    const rear=vec3(envelope&&envelope.rearPointM),
      front=vec3(envelope&&envelope.frontPointM),
      radius=envelope&&envelope.radiusM;
    if(!rear||!front||!finite(radius)||radius<=0||
        envelope.inferredDimensions!==false){
      diagnostics.push(diagnostic(
        FAILURE_CODES.DRIVER_ENVELOPE_INVALID,[path],
        'A documented, non-inferred driver capsule with two endpoints and positive radius is required.'
      ));
      return null;
    }
    return {
      minM:rear.map((value,index)=>
        Math.min(value,front[index])-radius
      ),
      maxM:rear.map((value,index)=>
        Math.max(value,front[index])+radius
      )
    };
  }

  function normalizeAdditional(
    items,clearance,ids,diagnostics
  ){
    const result=[];
    for(let index=0;index<(Array.isArray(items)?items:[]).length;index++){
      const item=isObject(items[index])?items[index]:{},
        id=cleanString(item.id),
        role=cleanString(item.role),
        minimum=vec3(item.boundsM&&item.boundsM.minM),
        maximum=vec3(item.boundsM&&item.boundsM.maxM),
        itemClearance=item.clearanceM===undefined
          ?clearance:nonnegative(item.clearanceM);
      if(authorityForbidden(item)){
        diagnostics.push(diagnostic(
          FAILURE_CODES.AUTHORITY_FORBIDDEN,
          ['additionalComponents['+index+']'],
          'Additional package envelopes may not carry exact-solid, Boolean, STL, or manufacturing authority.'
        ));
        continue;
      }
      if(!id||ids.has(id)||!ADDITIONAL_ROLES.includes(role)||
          !minimum||!maximum||
          minimum.some((value,axis)=>!(value<maximum[axis]))||
          itemClearance===null){
        diagnostics.push(diagnostic(
          FAILURE_CODES.COMPONENT_INVALID,
          ['additionalComponents['+index+']'],
          'Additional package envelopes require unique IDs, an explicit rear/enclosure role, finite positive-volume bounds, and nonnegative clearance.'
        ));
        continue;
      }
      ids.add(id);
      result.push({
        id,role,
        ownerId:cleanString(item.ownerId),
        boundsM:{minM:minimum,maxM:maximum},
        clearanceM:itemClearance,
        required:item.required!==false,
        allowedOverlapIds:uniqueStrings(item.allowedOverlapIds),
        provenanceRefs:uniqueStrings(item.provenanceRefs),
        metadata:isObject(item.metadata)?cloneValue(item.metadata):{}
      });
    }
    return result;
  }

  function buildPackageInput(input){
    const source=isObject(input)?input:{},
      diagnostics=[],
      inputHash=cleanString(source.inputHash),
      globalMarginM=nonnegative(source.globalMarginM),
      componentClearanceM=nonnegative(source.componentClearanceM),
      horn=hornBounds(source.hornSurface,diagnostics);
    if(!inputHash||globalMarginM===null||componentClearanceM===null)
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,
        ['inputHash','globalMarginM','componentClearanceM'],
        'A canonical input hash plus explicit nonnegative package and component clearances are required.'
      ));
    const hasWrappedMountResult=isObject(source.mountResult)&&
        Object.prototype.hasOwnProperty.call(source.mountResult,'result'),
      mountEnvelope=isObject(source.mountResult)&&
        isObject(source.mountResult.result)
      ?source.mountResult.result:source.mountResult,
      mounts=mountEnvelope&&Array.isArray(mountEnvelope.mounts)
        ?mountEnvelope.mounts:null;
    if(!mounts||
        (hasWrappedMountResult&&source.mountResult.ok!==true)||
        cleanString(mountEnvelope&&mountEnvelope.kind)!==
          'threeway-source-instance-mount-solution'||
        authorityForbidden(source.mountResult))
      diagnostics.push(diagnostic(
        authorityForbidden(source.mountResult)
          ?FAILURE_CODES.AUTHORITY_FORBIDDEN
          :FAILURE_CODES.MOUNT_RESULT_INVALID,
        ['mountResult'],
        'A successful analysis-only mount result with an explicit mounts array is required.'
      ));
    const components=[],ids=new Set();
    for(let index=0;index<(mounts||[]).length;index++){
      const mount=mounts[index],
        mountId=cleanString(mount&&mount.id),
        instanceId=cleanString(mount&&mount.instanceId),
        sourceId=cleanString(mount&&mount.sourceId),
        mountBounds=meshBounds(
          mount&&mount.inspectionMesh,
          'mountResult.mounts['+index+'].inspectionMesh',
          diagnostics
        ),
        driverBounds=capsuleBounds(
          mount&&mount.driverEnvelope,
          'mountResult.mounts['+index+'].driverEnvelope',
          diagnostics
        ),
        driverId=instanceId?'driver-body:'+instanceId:null;
      if(!mountId||!instanceId||!sourceId||
          mountId===driverId||
          ids.has(mountId)||ids.has(driverId)){
        diagnostics.push(diagnostic(
          FAILURE_CODES.MOUNT_RESULT_INVALID,
          ['mountResult.mounts['+index+']'],
          'Mount, driver instance, and source IDs must be complete and unique.'
        ));
        continue;
      }
      ids.add(mountId);
      ids.add(driverId);
      if(mountBounds)components.push({
        id:mountId,
        role:'mount-host',
        ownerId:sourceId,
        boundsM:mountBounds,
        clearanceM:componentClearanceM,
        required:true,
        allowedOverlapIds:[driverId],
        provenanceRefs:uniqueStrings(mount.provenanceRefs),
        metadata:{
          instanceId,
          mountHostHashInput:cleanString(mount.mountHostHashInput)
        }
      });
      if(driverBounds)components.push({
        id:driverId,
        role:'driver-body',
        ownerId:sourceId,
        boundsM:driverBounds,
        clearanceM:componentClearanceM,
        required:true,
        allowedOverlapIds:[mountId],
        provenanceRefs:uniqueStrings(mount.provenanceRefs),
        metadata:{
          instanceId,
          driverRecordId:cleanString(mount.driverRecordId)
        }
      });
    }
    components.push(...normalizeAdditional(
      source.additionalComponents,
      componentClearanceM,ids,diagnostics
    ));
    if(diagnostics.length)return failure(diagnostics);
    components.sort((left,right)=>left.id.localeCompare(right.id));
    const result={
      horn,
      components,
      packageLimitM:isObject(source.packageLimitM)
        ?cloneValue(source.packageLimitM):null,
      globalMarginM,
      sourceHashInput:inputHash,
      componentBoundsDerivedOnly:true,
      geometryMoved:false,
      geometryResized:false,
      manufacturing:false
    };
    return deepFreeze({
      ok:true,
      code:null,
      result,
      packageInput:{
        horn:cloneValue(horn),
        components:cloneValue(components),
        packageLimitM:isObject(source.packageLimitM)
          ?cloneValue(source.packageLimitM):null,
        globalMarginM
      },
      diagnostics:[],
      hashInput:'meh3-package-input-v1\n'+stableStringify(result),
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function failure(diagnostics){
    const ordered=diagnostics.slice().sort(compareDiagnostics);
    return deepFreeze({
      ok:false,
      code:ordered[0]?ordered[0].code:FAILURE_CODES.INPUT_INVALID,
      result:null,
      packageInput:null,
      diagnostics:ordered,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,available:false,
      operation:cleanString(operation)||'package-export',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      exactSolid:false,manufacturing:false,stl:false,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    version:VERSION,
    additionalRoles:ADDITIONAL_ROLES,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    stableStringify,
    buildPackageInput,
    manufacturingPreflight
  });
});
