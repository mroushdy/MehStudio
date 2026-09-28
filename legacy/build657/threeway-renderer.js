/* MEH Studio v5 — injected Three.js adapter for validated three-way views.

   This module owns no acoustic, placement, profile, tessellation, Boolean,
   camera, animation, state, storage, DOM, exact-solid, or manufacturing
   logic. It converts only geometry, transforms, materials, visibility, and
   ownership already present in a hash-matched render-model view selection. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3Renderer=factory();
})(function(){
  'use strict';

  const VERSION=1;
  const VIEW_IDS=Object.freeze([
    'full-assembly',
    'horn-only',
    'no-drivers-mount-assembly',
    'mounts-preview',
    'lumen-inspection',
    'section-cutaway',
    'package-bounds'
  ]);
  const ALLOWED_PRIMITIVES=Object.freeze(['box','bounds','plane']);
  const MATERIAL_CONSTRUCTORS=Object.freeze({
    'mesh-basic':'MeshBasicMaterial',
    'mesh-standard':'MeshStandardMaterial',
    'mesh-phong':'MeshPhongMaterial',
    'mesh-lambert':'MeshLambertMaterial',
    'mesh-normal':'MeshNormalMaterial'
  });
  const HARD_LIMITS=deepFreeze({
    maxNodes:1024,
    maxVertices:2000000,
    maxIndices:6000000,
    maxUploadBytes:134217728,
    maxMetadataBytes:2097152
  });
  const DEFAULT_LIMITS=deepFreeze({
    maxNodes:512,
    maxVertices:1000000,
    maxIndices:3000000,
    maxUploadBytes:67108864,
    maxMetadataBytes:1048576
  });
  const FAILURE_CODES=deepFreeze({
    OPTIONS_INVALID:'THREEWAY_RENDERER_OPTIONS_INVALID',
    THREE_UNAVAILABLE:'THREEWAY_RENDERER_THREE_UNAVAILABLE',
    SELECTION_INVALID:'THREEWAY_RENDERER_SELECTION_INVALID',
    HASH_MISMATCH:'THREEWAY_RENDERER_HASH_MISMATCH',
    UNSUPPORTED_GEOMETRY:'THREEWAY_RENDERER_UNSUPPORTED_GEOMETRY',
    UNSUPPORTED_MATERIAL:'THREEWAY_RENDERER_UNSUPPORTED_MATERIAL',
    TRANSFORM_INVALID:'THREEWAY_RENDERER_TRANSFORM_INVALID',
    OWNERSHIP_INVALID:'THREEWAY_RENDERER_OWNERSHIP_INVALID',
    RESOURCE_LIMIT:'THREEWAY_RENDERER_RESOURCE_LIMIT',
    GROUP_INVALID:'THREEWAY_RENDERER_GROUP_INVALID',
    BUILD_FAILED:'THREEWAY_RENDERER_BUILD_FAILED',
    DISPOSED:'THREEWAY_RENDERER_DISPOSED',
    MANUFACTURING_UNAVAILABLE:'THREEWAY_MANUFACTURING_UNAVAILABLE'
  });
  const CAPABILITIES=deepFreeze({
    status:'validated-render-view-adapter-only',
    injectedThree:true,
    injectedScene:true,
    injectedGroupFactory:true,
    deterministicReplacement:true,
    resourceCeilings:true,
    geometryGeneration:false,
    acousticAuthority:false,
    placementAuthority:false,
    stateAccess:false,
    domAccess:false,
    localStorageAccess:false,
    animationLoop:false,
    cameraCreation:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'The renderer adapts a validated analysis-view DTO; it cannot authorize exact solids, fabrication, or STL.'
  });
  const MODEL_METADATA=deepFreeze({
    id:'meh3-threejs-render-adapter',
    revision:'stage-3-v1',
    input:'validated-threeway-render-model-view-selection',
    output:'caller-owned-threejs-scene-group',
    exactSolid:false,
    manufacturing:false,
    limitations:[
      'Only explicit triangle meshes and allowed box/bounds/plane primitives are converted.',
      'Normals are never generated and transforms are never solved.',
      'The adapter does not create cameras, controls, lights, animation loops, or export artifacts.'
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

  function plainClone(value,path,invalidPaths,ancestors){
    const current=path||'$',
      stack=ancestors||new WeakSet();
    if(Array.isArray(value)){
      if(stack.has(value)){
        invalidPaths.push(current);
        return null;
      }
      stack.add(value);
      const result=value.map((entry,index)=>
        plainClone(entry,current+'['+index+']',invalidPaths,stack)
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
        }else result[key]=plainClone(
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
      return value;
    }
    if(value===null||typeof value==='string'||typeof value==='boolean')
      return value;
    invalidPaths.push(current);
    return null;
  }

  function safeClone(value,path){
    const invalidPaths=[],
      cloned=plainClone(value,path||'$',invalidPaths);
    return {
      ok:invalidPaths.length===0,
      value:cloned,
      invalidPaths:[...new Set(invalidPaths)].sort()
    };
  }

  function fail(code,message,details,paths){
    const safe=safeClone(
      isObject(details)?details:{},'$details'
    );
    return deepFreeze({
      ok:false,
      code,
      message,
      details:safe.value,
      paths:Array.isArray(paths)
        ?[...new Set(paths.map(cleanString).filter(Boolean))].sort():[],
      group:null,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function frozenSuccess(record){
    return Object.freeze(Object.assign({
      ok:true,
      code:null,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    },record));
  }

  function finiteArray(value,length,multiple){
    if(!Array.isArray(value))return null;
    if(length!==null&&value.length!==length)return null;
    if(multiple&&(!value.length||value.length%multiple!==0))return null;
    if(!value.every(entry=>
      typeof entry==='number'&&Number.isFinite(entry)
    ))return null;
    return value;
  }

  function integerArray(value,multiple,maximumExclusive){
    if(!Array.isArray(value)||!value.length||
        (multiple&&value.length%multiple!==0))return null;
    if(!value.every(entry=>
      Number.isInteger(entry)&&entry>=0&&entry<maximumExclusive
    ))return null;
    return value;
  }

  function transformKind(transform){
    if(!isObject(transform))return null;
    const hasMatrix=Object.prototype.hasOwnProperty.call(
        transform,'matrix4'
      ),
      hasTrs=['positionM','quaternion','scale'].some(key=>
        Object.prototype.hasOwnProperty.call(transform,key)
      );
    if(hasMatrix){
      if(hasTrs||!finiteArray(transform.matrix4,16,null))return null;
      return 'matrix4';
    }
    if(!hasTrs||
        !finiteArray(transform.positionM,3,null)||
        !finiteArray(transform.quaternion,4,null)||
        !finiteArray(transform.scale,3,null)||
        !transform.quaternion.some(value=>value!==0)||
        !transform.scale.every(value=>value!==0))return null;
    return 'trs';
  }

  function ownershipRecord(value){
    const safe=safeClone(value,'$ownership');
    if(!safe.ok||!isObject(value)||
        !cleanString(value.topologyId)||
        value.topologyId!==cleanString(value.topologyId))return null;
    for(const key of ['bandIds','sourceIds','stationIds']){
      if(!Array.isArray(value[key])||
          value[key].some(entry=>
            !cleanString(entry)||entry!==cleanString(entry)
          )||
          new Set(value[key]).size!==value[key].length)return null;
    }
    return safe.value;
  }

  function materialRecord(value){
    const id=isObject(value)?cleanString(value.id):null,
      category=isObject(value)?cleanString(value.category):null,
      kind=isObject(value)?cleanString(value.kind):null;
    if(!isObject(value)||!id||value.id!==id||
        !category||value.category!==category||
        !kind||value.kind!==kind||
        !Object.prototype.hasOwnProperty.call(
          MATERIAL_CONSTRUCTORS,kind
        )||
        !isObject(value.parameters))return null;
    const safe=safeClone(value,'$material');
    return safe.ok?safe.value:null;
  }

  function primitiveRecord(value){
    if(!isObject(value)||!ALLOWED_PRIMITIVES.includes(
      cleanString(value.kind)
    )||!isObject(value.parameters))return null;
    const kind=cleanString(value.kind),
      keys=Object.keys(value.parameters).sort();
    if(keys.length!==1||keys[0]!=='dimensionsM')return null;
    const length=kind==='plane'?2:3,
      dimensions=finiteArray(
        value.parameters.dimensionsM,length,null
      );
    if(!dimensions||!dimensions.every(entry=>entry>0))return null;
    return {
      kind,
      dimensionsM:[...dimensions],
      vertices:kind==='plane'?4:24,
      indices:kind==='plane'?6:36
    };
  }

  function meshRecord(value){
    if(!isObject(value))return null;
    if(Object.prototype.hasOwnProperty.call(value,'normalsM'))
      return null;
    if(Object.prototype.hasOwnProperty.call(value,'topology')&&
        value.topology!=='triangles')return null;
    const positions=finiteArray(value.positionsM,null,3);
    if(!positions||positions.length<9)return null;
    const vertices=positions.length/3,
      indices=integerArray(value.indices,3,vertices);
    if(!indices)return null;
    const normals=Object.prototype.hasOwnProperty.call(value,'normals')
      ?finiteArray(value.normals,positions.length,null):null;
    if(Object.prototype.hasOwnProperty.call(value,'normals')&&!normals)
      return null;
    return {
      positions,
      indices,
      normals,
      vertices,
      uploadBytes:
        positions.length*4+indices.length*4+
        (normals?normals.length*4:0)
    };
  }

  function normalizeLimits(value){
    const source=value===undefined?{}:value;
    if(!isObject(source))return null;
    const result={};
    for(const key of Object.keys(DEFAULT_LIMITS)){
      const candidate=Object.prototype.hasOwnProperty.call(source,key)
        ?source[key]:DEFAULT_LIMITS[key];
      if(!Number.isInteger(candidate)||candidate<=0||
          candidate>HARD_LIMITS[key])return null;
      result[key]=candidate;
    }
    if(Object.keys(source).some(key=>
      !Object.prototype.hasOwnProperty.call(DEFAULT_LIMITS,key)
    ))return null;
    return deepFreeze(result);
  }

  function dependencyAvailable(THREE){
    return isObject(THREE)&&
      typeof THREE.BufferGeometry==='function'&&
      (
        typeof THREE.Float32BufferAttribute==='function'||
        typeof THREE.BufferAttribute==='function'
      )&&
      typeof THREE.Mesh==='function';
  }

  function preflightSelection(selection,expectedRenderHash,limits,THREE){
    if(!isObject(selection)||selection.ok!==true||
        !VIEW_IDS.includes(cleanString(selection.viewId))||
        !Array.isArray(selection.items)||!selection.items.length)
      return fail(
        FAILURE_CODES.SELECTION_INVALID,
        'A successful validated render-model view selection is required.',
        {},['selection']
      );
    const inputHash=cleanString(selection.inputHash),
      solutionHash=cleanString(selection.solutionHash),
      renderHash=cleanString(selection.renderHash),
      expected=cleanString(expectedRenderHash);
    if(!inputHash||!solutionHash||!renderHash||!expected||
        selection.inputHash!==inputHash||
        selection.solutionHash!==solutionHash||
        selection.renderHash!==renderHash||
        expectedRenderHash!==expected||
        solutionHash!==renderHash||renderHash!==expected)
      return fail(
        FAILURE_CODES.HASH_MISMATCH,
        'Selection, solution, render, and caller-expected hashes must agree exactly.',
        {inputHash,solutionHash,renderHash,expectedRenderHash:expected},
        [
          'selection.solutionHash','selection.renderHash',
          'expectedRenderHash'
        ]
      );
    if(selection.exactSolid!==false||
        selection.manufacturing!==false||
        selection.stl!==false)return fail(
      FAILURE_CODES.SELECTION_INVALID,
      'A render selection cannot carry exact-solid, manufacturing, or STL authority.',
      {},['selection']
    );
    const itemIds=selection.items.map(item=>
        isObject(item)?cleanString(item.id):null
      ),
      sortedIds=[...itemIds].sort();
    if(itemIds.some((id,index)=>
        !id||selection.items[index].id!==id
      )||
        new Set(itemIds).size!==itemIds.length||
        itemIds.some((id,index)=>id!==sortedIds[index]))
      return fail(
        FAILURE_CODES.SELECTION_INVALID,
        'Validated render item IDs must be unique and canonically ordered.',
        {itemIds},['selection.items']
      );
    let nodeCount=1,
      vertexCount=0,
      indexCount=0,
      uploadBytes=0,
      metadataBytes=0;
    const plans=[];
    for(let index=0;index<selection.items.length;index++){
      const item=selection.items[index],
        path='selection.items['+index+']';
      if(!isObject(item)||item.solutionHash!==solutionHash||
          !cleanString(item.category)||
          !isObject(item.visibility)||
          item.visibility[selection.viewId]!==true)return fail(
        FAILURE_CODES.SELECTION_INVALID,
        'Every selected item must be visible, categorized, and carry the current solution hash.',
        {index,id:itemIds[index]},[path]
      );
      const ownership=ownershipRecord(item.ownership);
      if(!ownership)return fail(
        FAILURE_CODES.OWNERSHIP_INVALID,
        'Every selected item requires explicit topology/band/source/station ownership.',
        {index,id:item.id},[path+'.ownership']
      );
      const material=materialRecord(item.material);
      if(!material)return fail(
        FAILURE_CODES.UNSUPPORTED_MATERIAL,
        'Every selected item needs one supported explicit material record.',
        {
          index,id:item.id,
          allowedKinds:Object.keys(MATERIAL_CONSTRUCTORS)
        },[path+'.material']
      );
      const constructorName=MATERIAL_CONSTRUCTORS[material.kind];
      if(typeof THREE[constructorName]!=='function')return fail(
        FAILURE_CODES.THREE_UNAVAILABLE,
        'The injected THREE namespace lacks the selected material constructor.',
        {id:item.id,constructorName},[path+'.material.kind']
      );
      const transform=transformKind(item.transform);
      if(!transform)return fail(
        FAILURE_CODES.TRANSFORM_INVALID,
        'Every selected item requires exactly one supported supplied transform.',
        {index,id:item.id},[path+'.transform']
      );
      const hasMesh=isObject(item.mesh),
        hasPrimitive=isObject(item.primitive);
      if(hasMesh===hasPrimitive)return fail(
        FAILURE_CODES.UNSUPPORTED_GEOMETRY,
        'Every selected item requires exactly one mesh or allowed primitive.',
        {index,id:item.id},[path+'.mesh',path+'.primitive']
      );
      let geometry;
      if(hasMesh){
        const mesh=meshRecord(item.mesh);
        if(!mesh)return fail(
          FAILURE_CODES.UNSUPPORTED_GEOMETRY,
          'Only supplied finite indexed triangle meshes with optional supplied normals are supported.',
          {index,id:item.id},[path+'.mesh']
        );
        geometry={type:'mesh',record:mesh};
        vertexCount+=mesh.vertices;
        indexCount+=mesh.indices.length;
        uploadBytes+=mesh.uploadBytes;
      }else{
        const primitive=primitiveRecord(item.primitive);
        if(!primitive)return fail(
          FAILURE_CODES.UNSUPPORTED_GEOMETRY,
          'The supplied primitive kind or parameter record is unsupported.',
          {
            index,id:item.id,
            allowedPrimitives:ALLOWED_PRIMITIVES
          },[path+'.primitive']
        );
        const constructorName=primitive.kind==='plane'
          ?'PlaneGeometry':'BoxGeometry';
        if(typeof THREE[constructorName]!=='function')return fail(
          FAILURE_CODES.THREE_UNAVAILABLE,
          'The injected THREE namespace lacks the selected primitive constructor.',
          {id:item.id,constructorName},[path+'.primitive.kind']
        );
        geometry={type:'primitive',record:primitive};
        vertexCount+=primitive.vertices;
        indexCount+=primitive.indices;
        uploadBytes+=
          primitive.vertices*3*4+primitive.indices*4;
      }
      const metadata={
        id:item.id,
        category:item.category,
        solutionHash:item.solutionHash,
        ownership,
        material
      };
      metadataBytes+=JSON.stringify(metadata).length*2;
      nodeCount++;
      plans.push({
        item,
        id:item.id,
        category:item.category,
        ownership,
        material,
        materialConstructor:constructorName,
        transform,
        geometry
      });
    }
    const totals={
      nodes:nodeCount,
      vertices:vertexCount,
      indices:indexCount,
      uploadBytes,
      metadataBytes
    };
    const exceeded=[];
    if(nodeCount>limits.maxNodes)exceeded.push('maxNodes');
    if(vertexCount>limits.maxVertices)exceeded.push('maxVertices');
    if(indexCount>limits.maxIndices)exceeded.push('maxIndices');
    if(uploadBytes>limits.maxUploadBytes)
      exceeded.push('maxUploadBytes');
    if(metadataBytes>limits.maxMetadataBytes)
      exceeded.push('maxMetadataBytes');
    if(exceeded.length)return fail(
      FAILURE_CODES.RESOURCE_LIMIT,
      'The selected render view exceeds an explicit resource ceiling.',
      {totals,limits,exceeded},['selection.items']
    );
    return {
      ok:true,
      inputHash,
      solutionHash,
      renderHash,
      viewId:selection.viewId,
      plans,
      totals
    };
  }

  function makeAttribute(THREE,values,itemSize){
    if(typeof THREE.Float32BufferAttribute==='function')
      return new THREE.Float32BufferAttribute(values,itemSize);
    return new THREE.BufferAttribute(
      Float32Array.from(values),itemSize
    );
  }

  function createGeometry(THREE,plan){
    if(plan.geometry.type==='primitive'){
      const primitive=plan.geometry.record,
        dimensions=primitive.dimensionsM;
      if(primitive.kind==='plane')
        return new THREE.PlaneGeometry(
          dimensions[0],dimensions[1]
        );
      return new THREE.BoxGeometry(
        dimensions[0],dimensions[1],dimensions[2]
      );
    }
    const source=plan.geometry.record,
      geometry=new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',makeAttribute(THREE,source.positions,3)
    );
    geometry.setIndex([...source.indices]);
    if(source.normals)geometry.setAttribute(
      'normal',makeAttribute(THREE,source.normals,3)
    );
    return geometry;
  }

  function createMaterial(THREE,plan){
    const Constructor=THREE[plan.materialConstructor],
      parameters=safeClone(
        plan.material.parameters,'$material.parameters'
      ).value;
    return new Constructor(parameters);
  }

  function applyTransform(node,plan){
    const transform=plan.item.transform;
    if(plan.transform==='matrix4'){
      if(!node.matrix||typeof node.matrix.fromArray!=='function')
        throw new Error('THREE Mesh matrix.fromArray is unavailable.');
      node.matrix.fromArray([...transform.matrix4]);
      node.matrixAutoUpdate=false;
      return;
    }
    if(!node.position||typeof node.position.fromArray!=='function'||
        !node.quaternion||
        typeof node.quaternion.fromArray!=='function'||
        !node.scale||typeof node.scale.fromArray!=='function')
      throw new Error('THREE Mesh TRS targets are unavailable.');
    node.position.fromArray([...transform.positionM]);
    node.quaternion.fromArray([...transform.quaternion]);
    node.scale.fromArray([...transform.scale]);
  }

  function disposeResources(group,extraGeometries,extraMaterials){
    const geometries=new Set(extraGeometries||[]),
      materials=new Set(extraMaterials||[]),
      visit=node=>{
        if(!node||typeof node!=='object')return;
        if(node.geometry)geometries.add(node.geometry);
        if(Array.isArray(node.material)){
          for(const material of node.material)materials.add(material);
        }else if(node.material)materials.add(node.material);
        if(Array.isArray(node.children))
          for(const child of [...node.children])visit(child);
      };
    visit(group);
    for(const geometry of geometries)
      if(geometry&&typeof geometry.dispose==='function')
        geometry.dispose();
    for(const material of materials)
      if(material&&typeof material.dispose==='function')
        material.dispose();
    if(group&&Array.isArray(group.children)){
      if(typeof group.clear==='function')group.clear();
      else if(typeof group.remove==='function')
        for(const child of [...group.children])group.remove(child);
    }
    return {
      geometriesDisposed:geometries.size,
      materialsDisposed:materials.size
    };
  }

  function validateGroup(group){
    return isObject(group)&&
      typeof group.add==='function'&&
      typeof group.remove==='function'&&
      Array.isArray(group.children)&&
      group.children.length===0&&
      !group.parent;
  }

  function createRenderer(options){
    if(!isObject(options)||!isObject(options.THREE)||
        typeof options.groupFactory!=='function')
      return fail(
        FAILURE_CODES.OPTIONS_INVALID,
        'createRenderer requires injected THREE and groupFactory values.',
        {},['options']
      );
    const THREE=options.THREE;
    if(!dependencyAvailable(THREE))return fail(
      FAILURE_CODES.THREE_UNAVAILABLE,
      'The injected THREE namespace lacks required mesh/geometry constructors.',
      {},['options.THREE']
    );
    let scene=options.scene;
    if(!scene&&typeof options.sceneFactory==='function'){
      try{
        scene=options.sceneFactory({THREE});
      }catch(error){
        return fail(
          FAILURE_CODES.OPTIONS_INVALID,
          'The injected sceneFactory failed.',
          {reason:String(error&&error.message||error)},
          ['options.sceneFactory']
        );
      }
    }
    if(!scene||typeof scene.add!=='function'||
        typeof scene.remove!=='function')return fail(
      FAILURE_CODES.OPTIONS_INVALID,
      'An injected scene or sceneFactory result with add/remove is required.',
      {},['options.scene','options.sceneFactory']
    );
    const limits=normalizeLimits(options.limits);
    if(!limits)return fail(
      FAILURE_CODES.OPTIONS_INVALID,
      'Renderer limits must be positive integers at or below hard ceilings.',
      {hardLimits:HARD_LIMITS},['options.limits']
    );
    const groupFactory=options.groupFactory;
    let active=null,
      disposed=false,
      generation=0;

    function state(){
      return deepFreeze({
        disposed,
        generation,
        active:active?{
          renderHash:active.renderHash,
          solutionHash:active.solutionHash,
          viewId:active.viewId,
          nodeCount:active.nodeCount
        }:null,
        limits
      });
    }

    function activeGroup(){
      return active?active.group:null;
    }

    function renderView(selection,expectedRenderHash){
      if(disposed)return fail(
        FAILURE_CODES.DISPOSED,
        'A disposed renderer cannot accept another view.',
        {},['renderer']
      );
      const checked=preflightSelection(
        selection,expectedRenderHash,limits,THREE
      );
      if(!checked.ok)return checked;
      let group;
      try{
        group=groupFactory({
          THREE,
          renderHash:checked.renderHash,
          solutionHash:checked.solutionHash,
          viewId:checked.viewId,
          generation:generation+1
        });
      }catch(error){
        return fail(
          FAILURE_CODES.GROUP_INVALID,
          'The injected groupFactory failed.',
          {reason:String(error&&error.message||error)},
          ['groupFactory']
        );
      }
      if(!validateGroup(group))return fail(
        FAILURE_CODES.GROUP_INVALID,
        'groupFactory must return a detached empty group with add/remove and children.',
        {},['groupFactory']
      );
      group.name='MEH3_RENDER_'+checked.renderHash+
        '_'+checked.viewId;
      if(!isObject(group.userData))group.userData={};
      group.userData.meh3=deepFreeze({
        kind:'threeway-render-group',
        inputHash:checked.inputHash,
        solutionHash:checked.solutionHash,
        renderHash:checked.renderHash,
        viewId:checked.viewId,
        exactSolid:false,
        manufacturing:false,
        stl:false
      });
      group.userData.renderHash=checked.renderHash;
      group.userData.viewId=checked.viewId;
      const createdGeometries=[],
        createdMaterials=[];
      try{
        for(const plan of checked.plans){
          const geometry=createGeometry(THREE,plan);
          createdGeometries.push(geometry);
          const material=createMaterial(THREE,plan);
          createdMaterials.push(material);
          const node=new THREE.Mesh(geometry,material);
          if(!isObject(node))
            throw new Error('THREE.Mesh did not return an object.');
          node.name='MEH3_ITEM_'+plan.id;
          if(!isObject(node.userData))node.userData={};
          node.userData.meh3=deepFreeze({
            id:plan.id,
            category:plan.category,
            solutionHash:checked.solutionHash,
            ownership:plan.ownership,
            material:plan.material,
            exactSolid:false,
            manufacturing:false,
            stl:false
          });
          applyTransform(node,plan);
          group.add(node);
        }
      }catch(error){
        disposeResources(
          group,createdGeometries,createdMaterials
        );
        return fail(
          FAILURE_CODES.BUILD_FAILED,
          'The injected THREE adapter failed while building the validated view.',
          {reason:String(error&&error.message||error)},
          ['selection.items']
        );
      }
      try{
        scene.add(group);
      }catch(error){
        disposeResources(
          group,createdGeometries,createdMaterials
        );
        return fail(
          FAILURE_CODES.BUILD_FAILED,
          'The injected scene rejected the completed render group.',
          {reason:String(error&&error.message||error)},
          ['scene.add']
        );
      }
      const previous=active;
      if(previous){
        try{
          scene.remove(previous.group);
        }catch(error){
          try{scene.remove(group);}catch(ignore){}
          disposeResources(
            group,createdGeometries,createdMaterials
          );
          return fail(
            FAILURE_CODES.BUILD_FAILED,
            'The previous render group could not be detached safely.',
            {reason:String(error&&error.message||error)},
            ['scene.remove']
          );
        }
        disposeResources(previous.group);
      }
      generation++;
      active={
        group,
        inputHash:checked.inputHash,
        solutionHash:checked.solutionHash,
        renderHash:checked.renderHash,
        viewId:checked.viewId,
        nodeCount:checked.plans.length,
        totals:checked.totals
      };
      return frozenSuccess({
        group,
        inputHash:checked.inputHash,
        solutionHash:checked.solutionHash,
        renderHash:checked.renderHash,
        viewId:checked.viewId,
        generation,
        nodeCount:checked.plans.length,
        resources:deepFreeze(Object.assign({},checked.totals)),
        replaced:previous?deepFreeze({
          renderHash:previous.renderHash,
          viewId:previous.viewId,
          nodeCount:previous.nodeCount
        }):null
      });
    }

    function dispose(){
      if(disposed)return frozenSuccess({
        disposed:true,
        alreadyDisposed:true,
        generation,
        resources:deepFreeze({
          geometriesDisposed:0,
          materialsDisposed:0
        })
      });
      let resources={
        geometriesDisposed:0,
        materialsDisposed:0
      };
      if(active){
        try{scene.remove(active.group);}catch(ignore){}
        resources=disposeResources(active.group);
        active=null;
      }
      disposed=true;
      return frozenSuccess({
        disposed:true,
        alreadyDisposed:false,
        generation,
        resources:deepFreeze(resources)
      });
    }

    function manufacturingPreflight(operation){
      return fail(
        FAILURE_CODES.MANUFACTURING_UNAVAILABLE,
        CAPABILITIES.reason,
        {operation:cleanString(operation)||'renderer-to-solid'},
        ['operation']
      );
    }

    return Object.freeze({
      ok:true,
      renderView,
      switchView:renderView,
      dispose,
      getState:state,
      getActiveGroup:activeGroup,
      manufacturingPreflight,
      limits,
      hardLimits:HARD_LIMITS,
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
      {operation:cleanString(operation)||'renderer-to-solid'},
      ['operation']
    );
  }

  return deepFreeze({
    version:VERSION,
    viewIds:VIEW_IDS,
    allowedPrimitives:ALLOWED_PRIMITIVES,
    materialKinds:Object.freeze(
      Object.keys(MATERIAL_CONSTRUCTORS)
    ),
    defaultLimits:DEFAULT_LIMITS,
    hardLimits:HARD_LIMITS,
    failureCodes:FAILURE_CODES,
    modelMetadata:MODEL_METADATA,
    capabilities:CAPABILITIES,
    createRenderer,
    manufacturingPreflight
  });
});
