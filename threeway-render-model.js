/* MEH Studio v5 — topology-neutral three-way render DTO boundary.

   This module filters and organizes geometry already supplied by one
   successful schema-2 three-way solution/orchestrator DTO. It performs no
   horn, mount, lumen, driver, package, transform, tessellation, rescaling,
   Boolean, or manufacturing math.

   State input hash, solution input hash, solution hash, render-geometry
   hashes, and every visual item's solution hash must agree. Materials,
   categories, visibility, transforms, meshes, and primitives are caller
   owned and are preserved. Missing geometry and ownership fail closed. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3RenderModel=factory();
})(function(){
  'use strict';

  const VERSION=1;
  const RENDER_SCHEMA_VERSION=1;
  const VIEW_IDS=Object.freeze([
    'full-assembly',
    'horn-only',
    'no-drivers-mount-assembly',
    'mounts-preview',
    'lumen-inspection',
    'section-cutaway',
    'package-bounds'
  ]);
  const CATEGORIES=Object.freeze([
    'horn-surface',
    'throat-interface',
    'driver',
    'mount-host',
    'aperture',
    'lumen-inspection',
    'station-marker',
    'rear-system',
    'enclosure',
    'axis',
    'datum',
    'annotation',
    'section-plane',
    'package-bounds'
  ]);
  const BAND_IDS=Object.freeze(['low','mid','high']);
  const TOPOLOGY_IDS=Object.freeze([
    'T3','CX3','H3','COMPOUND_RESEARCH'
  ]);
  const SOURCE_REQUIRED=new Set([
    'driver','mount-host','aperture','lumen-inspection','rear-system'
  ]);
  const STATION_REQUIRED=new Set([
    'aperture','lumen-inspection','station-marker'
  ]);
  const REQUIRED_VIEW_CATEGORY=Object.freeze({
    'full-assembly':'driver',
    'horn-only':'horn-surface',
    'no-drivers-mount-assembly':'mount-host',
    'mounts-preview':'mount-host',
    'lumen-inspection':'lumen-inspection',
    'section-cutaway':'section-plane',
    'package-bounds':'package-bounds'
  });
  const HORN_ONLY_ALLOWED=new Set([
    'horn-surface','throat-interface','aperture',
    'axis','datum','annotation'
  ]);
  const NO_DRIVER_HIDDEN=new Set(['driver','rear-system']);

  const FAILURE_CODES=deepFreeze({
    INPUT_INVALID:'THREEWAY_RENDER_INPUT_INVALID',
    STATE_INVALID:'THREEWAY_RENDER_STATE_INVALID',
    SOLUTION_INVALID:'THREEWAY_RENDER_SOLUTION_INVALID',
    MODEL_UNAVAILABLE:'THREEWAY_RENDER_MODEL_UNAVAILABLE',
    HASH_MISMATCH:'THREEWAY_RENDER_HASH_MISMATCH',
    GEOMETRY_INVALID:'THREEWAY_RENDER_GEOMETRY_INVALID',
    GEOMETRY_MISSING:'THREEWAY_RENDER_GEOMETRY_MISSING',
    ITEM_DUPLICATE:'THREEWAY_RENDER_ITEM_DUPLICATE',
    OWNERSHIP_INVALID:'THREEWAY_RENDER_OWNERSHIP_INVALID',
    MATERIAL_INVALID:'THREEWAY_RENDER_MATERIAL_INVALID',
    VISIBILITY_INVALID:'THREEWAY_RENDER_VISIBILITY_INVALID',
    TRANSFORM_INVALID:'THREEWAY_RENDER_TRANSFORM_INVALID',
    VIEW_INCOMPLETE:'THREEWAY_RENDER_VIEW_INCOMPLETE',
    NONFINITE_VALUE:'THREEWAY_RENDER_NONFINITE_VALUE',
    MANUFACTURING_UNAVAILABLE:'THREEWAY_MANUFACTURING_UNAVAILABLE'
  });

  const CAPABILITIES=deepFreeze({
    status:'solution-owned-render-dto-only',
    schema2Only:true,
    stateSolutionHashParity:true,
    deterministicViews:true,
    fullAssembly:true,
    hornOnly:true,
    noDriversMountAssembly:true,
    lumenInspection:true,
    sectionCutaway:true,
    packageBounds:true,
    geometryGeneration:false,
    geometryRescaling:false,
    transformGeneration:false,
    materialGeneration:false,
    legacyState:false,
    acousticAuthority:false,
    exactSolid:false,
    manufacturingPlan:false,
    manufacturingExport:false,
    manufacturing:false,
    stl:false,
    reason:
      'A render DTO is an analysis/inspection preview of solution-owned geometry, not an exact solid or fabrication artifact.'
  });

  const MODEL_METADATA=deepFreeze({
    id:'meh3-topology-neutral-render-model',
    revision:'stage-2-v1',
    fidelity:'analysis-inspection-preview',
    sourceOfGeometry:'successful-schema-2-solution-only',
    hardwareValidated:false,
    exactSolid:false,
    manufacturing:false,
    limitations:[
      'Geometry, transforms, materials, ownership, and visibility are copied, never solved.',
      'Mesh presence is validated structurally but no manifold or Boolean audit is performed.',
      'Primitive records are renderer-neutral declarations supplied by the solution.',
      'View filtering cannot authorize manufacturing or STL export.'
    ]
  });

  function isObject(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
  }

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    for(const key of Object.keys(value))deepFreeze(value[key]);
    return Object.freeze(value);
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function stableClone(value,path,invalidPaths,ancestors){
    const current=path||'$';
    const stack=ancestors||new WeakSet();
    if(Array.isArray(value)){
      if(stack.has(value)){
        invalidPaths.push(current);
        return null;
      }
      stack.add(value);
      const result=value.map((item,index)=>
        stableClone(item,current+'['+index+']',invalidPaths,stack)
      );
      stack.delete(value);
      return result;
    }
    if(isObject(value)){
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
      cloned=stableClone(value,path||'$',invalidPaths);
    return {
      ok:invalidPaths.length===0,
      value:cloned,
      invalidPaths:[...new Set(invalidPaths)].sort()
    };
  }

  function diagnostic(code,paths,message,details){
    const safe=safeClone(isObject(details)?details:{},'$details');
    return deepFreeze({
      code,
      severity:'error',
      phase:'render-model',
      paths:uniqueStrings(paths),
      message,
      details:safe.value,
      blocksCapabilities:[
        'renderPreview','exactSolid','manufacturing','stl'
      ]
    });
  }

  function fail(code,message,details,paths){
    return deepFreeze({
      ok:false,
      code,
      message,
      details:safeClone(
        isObject(details)?details:{},'$details'
      ).value,
      diagnostics:[diagnostic(code,paths,message,details)],
      dto:null,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function finiteArray(value,length,multiple){
    if(!Array.isArray(value))return null;
    if(length!==null&&value.length!==length)return null;
    if(multiple&&(!value.length||value.length%multiple!==0))return null;
    if(!value.every(item=>
      typeof item==='number'&&Number.isFinite(item)
    ))return null;
    return value;
  }

  function integerArray(value,multiple,maximumExclusive){
    if(!Array.isArray(value)||!value.length||
        (multiple&&value.length%multiple!==0))return null;
    if(!value.every(item=>
      Number.isInteger(item)&&item>=0&&item<maximumExclusive
    ))return null;
    return value;
  }

  function idMap(value,path){
    if(!Array.isArray(value))return {
      ok:false,
      code:FAILURE_CODES.STATE_INVALID,
      message:path+' must be an explicit array.'
    };
    const map=new Map();
    for(let index=0;index<value.length;index++){
      const record=value[index],
        id=isObject(record)?cleanString(record.id):null;
      if(!id||map.has(id))return {
        ok:false,
        code:FAILURE_CODES.STATE_INVALID,
        message:path+' requires unique stable IDs.',
        details:{index,id}
      };
      map.set(id,record);
    }
    return {ok:true,map};
  }

  function transformValid(transform){
    if(!isObject(transform))return false;
    const hasMatrix=Object.prototype.hasOwnProperty.call(
        transform,'matrix4'
      ),
      hasTrs=['positionM','quaternion','scale'].some(key=>
        Object.prototype.hasOwnProperty.call(transform,key)
      );
    if(hasMatrix)return !hasTrs&&
      !!finiteArray(transform.matrix4,16,null);
    if(!hasTrs)return false;
    const position=finiteArray(transform.positionM,3,null),
      quaternion=finiteArray(transform.quaternion,4,null),
      scale=finiteArray(transform.scale,3,null);
    return !!position&&!!quaternion&&!!scale&&
      quaternion.some(value=>value!==0)&&
      scale.every(value=>value!==0);
  }

  function meshValid(mesh){
    if(!isObject(mesh))return false;
    const positions=finiteArray(mesh.positionsM,null,3);
    if(!positions||positions.length<9)return false;
    const vertexCount=positions.length/3,
      indices=integerArray(mesh.indices,3,vertexCount);
    if(!indices)return false;
    if(Object.prototype.hasOwnProperty.call(mesh,'normals')&&
        !finiteArray(mesh.normals,positions.length,null))return false;
    if(Object.prototype.hasOwnProperty.call(mesh,'normalsM')&&
        !finiteArray(mesh.normalsM,positions.length,null))return false;
    return true;
  }

  function primitiveValid(primitive){
    if(!isObject(primitive)||!cleanString(primitive.kind)||
        !isObject(primitive.parameters))return false;
    return safeClone(primitive,'$primitive').ok;
  }

  function geometryValid(item){
    const hasMesh=isObject(item.mesh),
      hasPrimitive=isObject(item.primitive);
    if(hasMesh===hasPrimitive)return false;
    return hasMesh?meshValid(item.mesh):primitiveValid(item.primitive);
  }

  function materialValid(material){
    return isObject(material)&&cleanString(material.id)&&
      cleanString(material.category)&&
      safeClone(material,'$material').ok;
  }

  function visibilityValid(visibility){
    if(!isObject(visibility))return false;
    return VIEW_IDS.every(id=>typeof visibility[id]==='boolean')&&
      Object.keys(visibility).every(id=>VIEW_IDS.includes(id));
  }

  function normalizeOwnership(
    raw,topology,sourceMap,stationMap,itemPath
  ){
    if(!isObject(raw))return {
      ok:false,
      result:fail(
        FAILURE_CODES.OWNERSHIP_INVALID,
        'Every render item requires explicit ownership.',
        {},[itemPath+'.ownership']
      )
    };
    const topologyId=cleanString(raw.topologyId),
      bandIds=uniqueStrings(raw.bandIds),
      sourceIds=uniqueStrings(raw.sourceIds),
      stationIds=uniqueStrings(raw.stationIds);
    if(topologyId!==topology||
        bandIds.some(id=>!BAND_IDS.includes(id))||
        sourceIds.some(id=>!sourceMap.has(id))||
        stationIds.some(id=>!stationMap.has(id)))return {
      ok:false,
      result:fail(
        FAILURE_CODES.OWNERSHIP_INVALID,
        'Render ownership must reference the explicit topology, bands, sources, and stations.',
        {
          topologyId,expectedTopology:topology,
          bandIds,sourceIds,stationIds
        },[itemPath+'.ownership']
      )
    };
    for(const sourceId of sourceIds){
      const sourceBands=uniqueStrings(sourceMap.get(sourceId).bandIds);
      if(bandIds.some(id=>!sourceBands.includes(id)))return {
        ok:false,
        result:fail(
          FAILURE_CODES.OWNERSHIP_INVALID,
          'Item bands must be owned by every referenced source.',
          {sourceId,sourceBands,bandIds},
          [itemPath+'.ownership.bandIds']
        )
      };
    }
    for(const stationId of stationIds){
      const station=stationMap.get(stationId),
        stationSources=uniqueStrings(station.sourceIds),
        stationBands=uniqueStrings(station.bandIds);
      if(sourceIds.some(id=>!stationSources.includes(id))||
          bandIds.some(id=>!stationBands.includes(id)))return {
        ok:false,
        result:fail(
          FAILURE_CODES.OWNERSHIP_INVALID,
          'Station-owned items must use source and band IDs carried by that station.',
          {
            stationId,stationSources,stationBands,sourceIds,bandIds
          },[itemPath+'.ownership']
        )
      };
    }
    return {
      ok:true,
      ownership:{topologyId,bandIds,sourceIds,stationIds}
    };
  }

  function validateItem(
    raw,index,topology,sourceMap,stationMap,solutionHash
  ){
    const path='solution.renderGeometry.items['+index+']';
    if(!isObject(raw))return fail(
      FAILURE_CODES.GEOMETRY_INVALID,
      'Every render item must be an explicit record.',
      {index},[path]
    );
    const safe=safeClone(raw,'$.'+path);
    if(!safe.ok)return fail(
      FAILURE_CODES.NONFINITE_VALUE,
      'Render geometry contains nonfinite, undefined, or runtime values.',
      {invalidPaths:safe.invalidPaths},safe.invalidPaths
    );
    const id=cleanString(raw.id),
      category=cleanString(raw.category),
      itemSolutionHash=cleanString(raw.solutionHash);
    if(!id||!CATEGORIES.includes(category))return fail(
      FAILURE_CODES.GEOMETRY_INVALID,
      'Every render item needs a stable ID and supported category.',
      {id,category,allowedCategories:CATEGORIES},[path+'.id',path+'.category']
    );
    if(itemSolutionHash!==solutionHash)return fail(
      FAILURE_CODES.HASH_MISMATCH,
      'Every render item must carry the current solution hash.',
      {id,itemSolutionHash,solutionHash},[path+'.solutionHash']
    );
    const ownership=normalizeOwnership(
      raw.ownership,topology,sourceMap,stationMap,path
    );
    if(!ownership.ok)return ownership.result;
    if(SOURCE_REQUIRED.has(category)&&
        !ownership.ownership.sourceIds.length)return fail(
      FAILURE_CODES.OWNERSHIP_INVALID,
      category+' items require one or more source owners.',
      {id,category},[path+'.ownership.sourceIds']
    );
    if(SOURCE_REQUIRED.has(category)&&
        !ownership.ownership.bandIds.length)return fail(
      FAILURE_CODES.OWNERSHIP_INVALID,
      category+' items require one or more band owners.',
      {id,category},[path+'.ownership.bandIds']
    );
    if(STATION_REQUIRED.has(category)&&
        !ownership.ownership.stationIds.length)return fail(
      FAILURE_CODES.OWNERSHIP_INVALID,
      category+' items require one or more station owners.',
      {id,category},[path+'.ownership.stationIds']
    );
    if(!materialValid(raw.material))return fail(
      FAILURE_CODES.MATERIAL_INVALID,
      'Every render item requires an explicit renderer-neutral material record.',
      {id},[path+'.material']
    );
    if(!visibilityValid(raw.visibility))return fail(
      FAILURE_CODES.VISIBILITY_INVALID,
      'Every render item requires an explicit boolean for every supported view and no unknown view keys.',
      {id,requiredViews:VIEW_IDS},[path+'.visibility']
    );
    if(!transformValid(raw.transform))return fail(
      FAILURE_CODES.TRANSFORM_INVALID,
      'Every render item requires an explicit finite matrix4 or position/quaternion/scale transform.',
      {id},[path+'.transform']
    );
    if(!geometryValid(raw))return fail(
      FAILURE_CODES.GEOMETRY_MISSING,
      'Every render item requires exactly one valid supplied mesh or primitive.',
      {id},[path+'.mesh',path+'.primitive']
    );
    const item=safe.value;
    item.id=id;
    item.category=category;
    item.solutionHash=solutionHash;
    item.ownership=ownership.ownership;
    return deepFreeze({ok:true,item:deepFreeze(item)});
  }

  function viewContracts(items){
    const views=[],byView=Object.create(null);
    for(const viewId of VIEW_IDS){
      const visible=items.filter(item=>item.visibility[viewId]),
        required=REQUIRED_VIEW_CATEGORY[viewId];
      if(!visible.length||!visible.some(item=>item.category===required))
        return fail(
          FAILURE_CODES.VIEW_INCOMPLETE,
          'View '+viewId+' lacks required supplied '+required+' geometry.',
          {
            viewId,requiredCategory:required,
            visibleItemIds:visible.map(item=>item.id)
          },['solution.renderGeometry.items']
        );
      if(viewId==='no-drivers-mount-assembly'&&visible.some(
        item=>NO_DRIVER_HIDDEN.has(item.category)
      ))return fail(
        FAILURE_CODES.VISIBILITY_INVALID,
        'The no-drivers mount view cannot expose driver or rear-system items.',
        {
          viewId,
          invalidItemIds:visible.filter(
            item=>NO_DRIVER_HIDDEN.has(item.category)
          ).map(item=>item.id)
        },['solution.renderGeometry.items']
      );
      if(viewId==='mounts-preview'&&visible.some(
        item=>NO_DRIVER_HIDDEN.has(item.category)
      ))return fail(
        FAILURE_CODES.VISIBILITY_INVALID,
        'The mount-host preview cannot expose driver or rear-system items.',
        {
          viewId,
          invalidItemIds:visible.filter(
            item=>NO_DRIVER_HIDDEN.has(item.category)
          ).map(item=>item.id)
        },['solution.renderGeometry.items']
      );
      if(viewId==='horn-only'&&visible.some(
        item=>!HORN_ONLY_ALLOWED.has(item.category)
      ))return fail(
        FAILURE_CODES.VISIBILITY_INVALID,
        'The horn-only view contains a non-horn/context category.',
        {
          viewId,
          invalidItemIds:visible.filter(
            item=>!HORN_ONLY_ALLOWED.has(item.category)
          ).map(item=>item.id)
        },['solution.renderGeometry.items']
      );
      const view=deepFreeze({
        id:viewId,
        itemIds:visible.map(item=>item.id),
        itemCount:visible.length,
        solutionOwnedVisibility:true
      });
      views.push(view);
      byView[viewId]=view;
    }
    return {ok:true,views,byView};
  }

  function hashFrom(value,names){
    if(!isObject(value))return null;
    for(const name of names){
      const result=cleanString(value[name]);
      if(result)return result;
    }
    return null;
  }

  function declaredHashes(value,names,prefix){
    if(!isObject(value))return [];
    const records=[];
    for(const name of names){
      if(Object.prototype.hasOwnProperty.call(value,name))
        records.push({
          path:(prefix||'value')+'.'+name,
          value:cleanString(value[name])
        });
    }
    return records;
  }

  function buildRenderModel(input){
    if(!isObject(input))return fail(
      FAILURE_CODES.INPUT_INVALID,
      'An explicit render-model input record is required.',
      {},['input']
    );
    if(Object.prototype.hasOwnProperty.call(input,'legacyState'))
      return fail(
        FAILURE_CODES.STATE_INVALID,
        'Legacy flat state is never a render-model input.',
        {},['input.legacyState']
      );
    const state=input.state,
      solution=input.solution;
    if(!isObject(state)||state.schemaVersion!==2||
        !isObject(state.topology)||
        !TOPOLOGY_IDS.includes(cleanString(state.topology.kind)))
      return fail(
        FAILURE_CODES.STATE_INVALID,
        'A normalized schema-2 state with explicit supported topology is required.',
        {},['input.state']
      );
    const topology=cleanString(state.topology.kind),
      sources=idMap(state.sources,'state.sources'),
      stations=idMap(state.entryStations,'state.entryStations');
    if(!sources.ok)return fail(
      sources.code,sources.message,sources.details||{},
      ['input.state.sources']
    );
    if(!stations.ok)return fail(
      stations.code,stations.message,stations.details||{},
      ['input.state.entryStations']
    );
    if(!isObject(solution)||solution.schemaVersion!==2||
        solution.ok!==true||
        !isObject(solution.readiness)||
        solution.readiness.analysis!==true)
      return fail(
        FAILURE_CODES.SOLUTION_INVALID,
        'A successful schema-2 solution with analysis readiness is required.',
        {},['input.solution']
      );
    const stateHash=cleanString(input.stateHash)||
        hashFrom(state,['inputHash','stateHashInput','hashInput']),
      solutionInputHash=hashFrom(
        solution,['inputHash','stateHashInput']
      ),
      solutionHash=hashFrom(solution,['solutionHash']),
      geometry=solution.renderGeometry,
      geometryInputHash=hashFrom(geometry,['inputHash']),
      geometrySolutionHash=hashFrom(geometry,['solutionHash']);
    const declaredInputHashes=[
        ...declaredHashes(
          input,['stateHash'],'input'
        ),
        ...declaredHashes(
          state,['inputHash','stateHashInput','hashInput'],'input.state'
        ),
        ...declaredHashes(
          solution,['inputHash','stateHashInput'],'input.solution'
        ),
        ...declaredHashes(
          geometry,['inputHash'],'input.solution.renderGeometry'
        )
      ],
      declaredSolutionHashes=[
        ...declaredHashes(
          solution,['solutionHash'],'input.solution'
        ),
        ...declaredHashes(
          geometry,['solutionHash'],'input.solution.renderGeometry'
        )
      ],
      invalidHashPaths=[
        ...declaredInputHashes.filter(
          record=>!record.value||record.value!==stateHash
        ).map(record=>record.path),
        ...declaredSolutionHashes.filter(
          record=>!record.value||record.value!==solutionHash
        ).map(record=>record.path)
      ];
    if(!stateHash||!solutionInputHash||!solutionHash||
        !geometryInputHash||!geometrySolutionHash||
        stateHash!==solutionInputHash||
        stateHash!==geometryInputHash||
        solutionHash!==geometrySolutionHash||
        invalidHashPaths.length)return fail(
      FAILURE_CODES.HASH_MISMATCH,
      'State, solution input, render input, solution, and render solution hashes must have exact parity.',
      {
        stateHash,solutionInputHash,geometryInputHash,
        solutionHash,geometrySolutionHash,invalidHashPaths
      },[
        'input.stateHash','input.solution.inputHash',
        'input.solution.solutionHash',
        'input.solution.renderGeometry.inputHash',
        'input.solution.renderGeometry.solutionHash',
        ...invalidHashPaths
      ]
    );
    if(!isObject(geometry)||geometry.schemaVersion!==1||
        cleanString(geometry.topologyId)!==topology||
        !Array.isArray(geometry.items)||!geometry.items.length)
      return fail(
        FAILURE_CODES.MODEL_UNAVAILABLE,
        'The successful solution requires a nonempty schema-1 renderGeometry DTO for its topology.',
        {topology},['input.solution.renderGeometry']
      );
    const coordinateSystem=geometry.coordinateSystem===undefined||
        geometry.coordinateSystem===null
        ?{ok:true,value:null,invalidPaths:[]}
        :safeClone(
          geometry.coordinateSystem,
          '$.solution.renderGeometry.coordinateSystem'
        ),
      solutionDiagnostics=solution.diagnostics===undefined
        ?{ok:true,value:[],invalidPaths:[]}
        :safeClone(
          solution.diagnostics,'$.solution.diagnostics'
        ),
      providerVersion=geometry.providerVersion===undefined
        ?{ok:true,value:null,invalidPaths:[]}
        :safeClone(
          geometry.providerVersion,
          '$.solution.renderGeometry.providerVersion'
        ),
      stateRevision=state.revision===undefined
        ?{ok:true,value:null,invalidPaths:[]}
        :safeClone(state.revision,'$.state.revision');
    if((geometry.coordinateSystem!==undefined&&
        geometry.coordinateSystem!==null&&
        !isObject(geometry.coordinateSystem))||
        (solution.diagnostics!==undefined&&
        !Array.isArray(solution.diagnostics)))
      return fail(
        FAILURE_CODES.GEOMETRY_INVALID,
        'Render coordinate-system and solution-diagnostic metadata must use explicit records and arrays.',
        {},[
          'input.solution.renderGeometry.coordinateSystem',
          'input.solution.diagnostics'
        ]
      );
    const invalidMetadataPaths=[
      ...coordinateSystem.invalidPaths,
      ...solutionDiagnostics.invalidPaths,
      ...providerVersion.invalidPaths,
      ...stateRevision.invalidPaths
    ];
    if(invalidMetadataPaths.length)return fail(
      FAILURE_CODES.NONFINITE_VALUE,
      'Copied render metadata contains nonfinite, undefined, or runtime values.',
      {invalidPaths:invalidMetadataPaths},
      invalidMetadataPaths
    );
    const items=[],ids=new Set();
    for(let index=0;index<geometry.items.length;index++){
      const validated=validateItem(
        geometry.items[index],index,topology,
        sources.map,stations.map,solutionHash
      );
      if(!validated.ok)return validated;
      if(ids.has(validated.item.id))return fail(
        FAILURE_CODES.ITEM_DUPLICATE,
        'Render item IDs must be unique.',
        {id:validated.item.id},
        ['input.solution.renderGeometry.items['+index+'].id']
      );
      ids.add(validated.item.id);
      items.push(validated.item);
    }
    items.sort((left,right)=>left.id.localeCompare(right.id));
    const viewResult=viewContracts(items);
    if(!viewResult.ok)return viewResult;
    const byItem=Object.create(null);
    for(const item of items)byItem[item.id]=item;
    const dto=deepFreeze({
      schemaVersion:RENDER_SCHEMA_VERSION,
      kind:'meh-studio-threeway-render-model',
      topologyId:topology,
      designId:cleanString(state.designId),
      stateRevision:stateRevision.value,
      inputHash:stateHash,
      solutionHash,
      renderHash:solutionHash,
      hashParity:true,
      fidelity:{
        kind:'analysis-inspection-preview',
        exactSolid:false,
        hardwareValidated:false,
        manufacturing:false,
        stl:false
      },
      coordinateSystem:coordinateSystem.value,
      items,
      byItem,
      views:deepFreeze(viewResult.views),
      byView:deepFreeze(viewResult.byView),
      solutionDiagnostics:solutionDiagnostics.value,
      geometrySource:{
        schemaVersion:geometry.schemaVersion,
        provider:cleanString(geometry.provider),
        providerVersion:providerVersion.value,
        generatedByRenderModel:false,
        transformsAltered:false,
        geometryAltered:false,
        materialAltered:false,
        visibilityAltered:false
      },
      exactSolid:false,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
    return deepFreeze({
      ok:true,
      code:null,
      dto,
      renderHash:solutionHash,
      solutionHash,
      itemCount:items.length,
      viewCount:VIEW_IDS.length,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function selectView(value,viewId){
    const dto=isObject(value)&&isObject(value.dto)?value.dto:value,
      id=cleanString(viewId);
    if(!isObject(dto)||dto.kind!=='meh-studio-threeway-render-model'||
        dto.schemaVersion!==RENDER_SCHEMA_VERSION||
        !TOPOLOGY_IDS.includes(cleanString(dto.topologyId))||
        !VIEW_IDS.includes(id)||!isObject(dto.byView)||
        !dto.byView[id]||!isObject(dto.byItem))return fail(
      FAILURE_CODES.INPUT_INVALID,
      'selectView requires a valid render DTO and supported view ID.',
      {viewId:id},['viewId']
    );
    const inputHash=cleanString(dto.inputHash),
      solutionHash=cleanString(dto.solutionHash),
      renderHash=cleanString(dto.renderHash);
    if(!inputHash||!solutionHash||solutionHash!==renderHash)
      return fail(
        FAILURE_CODES.HASH_MISMATCH,
        'The selected render DTO must retain exact solution/render hash parity.',
        {inputHash,solutionHash,renderHash},
        ['dto.inputHash','dto.solutionHash','dto.renderHash']
      );
    const contract=dto.byView[id];
    if(!isObject(contract)||contract.id!==id||
        !Array.isArray(contract.itemIds)||
        !contract.itemIds.length||
        contract.itemIds.some(itemId=>!cleanString(itemId))||
        new Set(contract.itemIds).size!==contract.itemIds.length||
        contract.itemCount!==contract.itemIds.length)return fail(
      FAILURE_CODES.MODEL_UNAVAILABLE,
      'The render DTO has an invalid deterministic view contract.',
      {viewId:id},['dto.byView.'+id]
    );
    const items=contract.itemIds.map(itemId=>dto.byItem[itemId]);
    if(items.some((item,index)=>
      !isObject(item)||
      item.id!==contract.itemIds[index]||
      item.solutionHash!==solutionHash||
      !CATEGORIES.includes(item.category)||
      !isObject(item.ownership)||
      item.ownership.topologyId!==dto.topologyId||
      !materialValid(item.material)||
      !visibilityValid(item.visibility)||
      item.visibility[id]!==true||
      !transformValid(item.transform)||
      !geometryValid(item)||
      !safeClone(item,'$.dto.byItem.'+contract.itemIds[index]).ok
    ))return fail(
      FAILURE_CODES.MODEL_UNAVAILABLE,
      'The render DTO view references missing, stale, or invalid items.',
      {viewId:id,itemIds:contract.itemIds},['dto.byView']
    );
    const required=REQUIRED_VIEW_CATEGORY[id];
    if(!items.some(item=>item.category===required)||
        (id==='horn-only'&&items.some(
          item=>!HORN_ONLY_ALLOWED.has(item.category)
        ))||
        ([
          'no-drivers-mount-assembly','mounts-preview'
        ].includes(id)&&items.some(
          item=>NO_DRIVER_HIDDEN.has(item.category)
        )))return fail(
      FAILURE_CODES.VIEW_INCOMPLETE,
      'The selected render DTO no longer satisfies its view category contract.',
      {viewId:id,requiredCategory:required},
      ['dto.byView.'+id]
    );
    return deepFreeze({
      ok:true,
      code:null,
      viewId:id,
      inputHash:dto.inputHash,
      solutionHash:dto.solutionHash,
      renderHash:dto.renderHash,
      items,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function manufacturingPreflight(operation){
    return fail(
      FAILURE_CODES.MANUFACTURING_UNAVAILABLE,
      CAPABILITIES.reason,
      {operation:cleanString(operation)||'render-to-manufacturing'},
      ['operation']
    );
  }

  return deepFreeze({
    version:VERSION,
    renderSchemaVersion:RENDER_SCHEMA_VERSION,
    viewIds:VIEW_IDS,
    categories:CATEGORIES,
    failureCodes:FAILURE_CODES,
    modelMetadata:MODEL_METADATA,
    capabilities:CAPABILITIES,
    buildRenderModel,
    selectView,
    manufacturingPreflight
  });
});
