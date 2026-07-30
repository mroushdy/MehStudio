/* MEH Studio v5 — explicit three-way package-envelope solver.

   The solver never scales, moves, clips, or hides a component.  It evaluates
   caller-supplied SI bounds for the solved horn, positive mount hosts, full
   driver bodies, rear systems, and service envelopes.  If a mount or driver
   lies outside the horn/package, the result reports the exact growth needed;
   it does not shrink the part or silently grow persisted user intent. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3PackageSolver=factory();
})(function(){
  'use strict';

  const VERSION=1;
  const ROLES=Object.freeze([
    'horn','mount-host','driver-body','rear-system','service-envelope',
    'cabinet-structure','research-envelope'
  ]);
  const FAILURE_CODES=Object.freeze({
    INPUT_INVALID:'THREEWAY_PACKAGE_INPUT_INVALID',
    HORN_BOUNDS_REQUIRED:'THREEWAY_PACKAGE_HORN_BOUNDS_REQUIRED',
    COMPONENT_INVALID:'THREEWAY_PACKAGE_COMPONENT_INVALID',
    COMPONENT_DUPLICATE:'THREEWAY_PACKAGE_COMPONENT_DUPLICATE',
    DRIVER_OUTSIDE_PACKAGE:'THREEWAY_DRIVER_OUTSIDE_PACKAGE',
    HORN_GROWTH_REQUIRED:'THREEWAY_HORN_GROWTH_REQUIRED',
    COMPONENT_COLLISION:'THREEWAY_DRIVER_COLLISION'
  });
  const CAPABILITIES=deepFreeze({
    status:'explicit-envelope-evaluation-only',
    unionBounds:true,
    packageLimitCheck:true,
    hornGrowthReport:true,
    collisionBroadPhase:true,
    componentMotion:false,
    automaticHornGrowth:false,
    automaticMouthGrowth:false,
    exactCollision:false,
    manufacturingPlan:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'Axis-aligned package envelopes are a feasibility/broad-phase result, not exact assembly or fabrication proof.'
  });
  const EPS=1e-12;

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

  function finiteNonnegative(value){
    const number=Number(value);
    return Number.isFinite(number)&&number>=0?number:null;
  }

  function vec3(value){
    if(!Array.isArray(value)||value.length!==3)return null;
    const result=value.map(Number);
    return result.every(Number.isFinite)?result:null;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function diagnostic(code,severity,paths,message,details){
    return deepFreeze({
      code,
      severity,
      phase:'package',
      paths:uniqueStrings(paths),
      message,
      details:isObject(details)?cloneValue(details):{},
      blocksCapabilities:severity==='error'
        ?['package','renderPreview','manufacturingPlan','exactSolid',
          'manufacturing','stl']:[]
    });
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

  function boundsRecord(raw,path,diagnostics){
    const record=isObject(raw)?raw:{},
      minM=vec3(record.minM),
      maxM=vec3(record.maxM);
    if(!minM||!maxM||maxM.some((value,index)=>
      !(value>minM[index])))diagnostics.push(diagnostic(
      FAILURE_CODES.COMPONENT_INVALID,'error',
      [path+'.minM',path+'.maxM'],
      'Bounds require finite [x,y,z] minima and strictly larger maxima.'
    ));
    return {minM,maxM};
  }

  function normalizeComponent(raw,index,diagnostics,pathPrefix){
    const record=isObject(raw)?raw:{},
      path=pathPrefix+'['+index+']',
      id=cleanString(record.id),
      role=cleanString(record.role),
      bounds=boundsRecord(record.boundsM,path+'.boundsM',diagnostics),
      clearanceM=finiteNonnegative(record.clearanceM);
    if(!id||!ROLES.includes(role))diagnostics.push(diagnostic(
      FAILURE_CODES.COMPONENT_INVALID,'error',
      [path+'.id',path+'.role'],
      'Each component requires a stable ID and supported role.'
    ));
    if(record.clearanceM!==undefined&&clearanceM===null)
      diagnostics.push(diagnostic(
        FAILURE_CODES.COMPONENT_INVALID,'error',[path+'.clearanceM'],
        'Component clearance must be a finite nonnegative SI value.'
      ));
    return {
      id,
      role,
      ownerId:cleanString(record.ownerId),
      boundsM:bounds,
      clearanceM:clearanceM===null?0:clearanceM,
      required:record.required!==false,
      allowedOverlapIds:uniqueStrings(record.allowedOverlapIds),
      provenanceRefs:uniqueStrings(record.provenanceRefs),
      metadata:isObject(record.metadata)?cloneValue(record.metadata):{}
    };
  }

  function expanded(bounds,amount){
    return {
      minM:bounds.minM.map(value=>value-amount),
      maxM:bounds.maxM.map(value=>value+amount)
    };
  }

  function dimensions(bounds){
    return bounds.maxM.map((value,index)=>value-bounds.minM[index]);
  }

  function unionBounds(records){
    const minM=[Infinity,Infinity,Infinity],
      maxM=[-Infinity,-Infinity,-Infinity];
    for(const record of records){
      for(let axis=0;axis<3;axis++){
        minM[axis]=Math.min(minM[axis],record.boundsM.minM[axis]);
        maxM[axis]=Math.max(maxM[axis],record.boundsM.maxM[axis]);
      }
    }
    return {minM,maxM};
  }

  function overlapDepth(left,right){
    const depth=[];
    for(let axis=0;axis<3;axis++){
      const value=Math.min(left.maxM[axis],right.maxM[axis])-
        Math.max(left.minM[axis],right.minM[axis]);
      depth.push(value);
    }
    return depth;
  }

  function requiredGrowth(container,content){
    return {
      negativeM:container.minM.map((value,index)=>
        Math.max(0,value-content.minM[index])
      ),
      positiveM:container.maxM.map((value,index)=>
        Math.max(0,content.maxM[index]-value)
      )
    };
  }

  function hasGrowth(growth){
    return growth.negativeM.some(value=>value>EPS)||
      growth.positiveM.some(value=>value>EPS);
  }

  function limitRecord(raw,diagnostics){
    if(raw===undefined||raw===null)return null;
    const record=isObject(raw)?raw:{},
      widthM=finiteNonnegative(record.widthM),
      heightM=finiteNonnegative(record.heightM),
      depthM=finiteNonnegative(record.depthM);
    for(const key of ['widthM','heightM','depthM']){
      if(record[key]!==undefined&&finiteNonnegative(record[key])===null)
        diagnostics.push(diagnostic(
          FAILURE_CODES.INPUT_INVALID,'error',['packageLimitM.'+key],
          'Package limits must be finite nonnegative SI values.'
        ));
    }
    return {widthM,heightM,depthM};
  }

  function solvePackageEnvelope(input){
    const source=isObject(input)?input:{},
      diagnostics=[],
      hornRaw=isObject(source.horn)?source.horn:{},
      hornId=cleanString(hornRaw.id),
      hornBounds=boundsRecord(
        hornRaw.boundsM,'horn.boundsM',diagnostics
      );
    if(!hornId)diagnostics.push(diagnostic(
      FAILURE_CODES.HORN_BOUNDS_REQUIRED,'error',['horn.id'],
      'An explicit solved horn ID is required.'
    ));
    const supplied=Array.isArray(source.components)
        ?source.components:[],
      components=supplied.map((item,index)=>
        normalizeComponent(item,index,diagnostics,'components')
      ),
      ids=new Set();
    for(let index=0;index<components.length;index++){
      const component=components[index];
      if(component.id&&ids.has(component.id))
        diagnostics.push(diagnostic(
          FAILURE_CODES.COMPONENT_DUPLICATE,'error',
          ['components['+index+'].id'],
          'Component IDs must be unique: '+component.id+'.'
        ));
      if(component.id)ids.add(component.id);
    }
    const limit=limitRecord(source.packageLimitM,diagnostics),
      globalMargin=finiteNonnegative(source.globalMarginM);
    if(source.globalMarginM!==undefined&&globalMargin===null)
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,'error',['globalMarginM'],
        'Global package margin must be a finite nonnegative SI value.'
      ));
    if(diagnostics.some(item=>item.severity==='error'))
      return failureResult(diagnostics);
    const hornComponent={
        id:hornId,
        role:'horn',
        ownerId:null,
        boundsM:hornBounds,
        clearanceM:0,
        required:true,
        allowedOverlapIds:components
          .filter(item=>item.role==='mount-host')
          .map(item=>item.id),
        provenanceRefs:uniqueStrings(hornRaw.provenanceRefs),
        metadata:{}
      },
      expandedComponents=components.filter(item=>item.required).map(item=>({
        ...item,
        boundsM:expanded(
          item.boundsM,item.clearanceM+(globalMargin||0)
        )
      })),
      all=[hornComponent,...expandedComponents],
      packageBounds=unionBounds(all),
      packageDimensions=dimensions(packageBounds),
      mountBounds=components.filter(item=>item.role==='mount-host')
        .map(item=>item.boundsM),
      driverBounds=components.filter(item=>item.role==='driver-body')
        .map(item=>item.boundsM),
      hornRequiredBounds=mountBounds.length
        ?unionBounds([{boundsM:hornBounds},...mountBounds.map(boundsM=>({
          boundsM
        }))]):hornBounds,
      hornGrowth=requiredGrowth(hornBounds,hornRequiredBounds),
      collisions=[];
    for(let leftIndex=0;leftIndex<components.length;leftIndex++){
      const left=components[leftIndex];
      for(let rightIndex=leftIndex+1;
        rightIndex<components.length;rightIndex++){
        const right=components[rightIndex],
          allowed=left.allowedOverlapIds.includes(right.id)||
            right.allowedOverlapIds.includes(left.id),
          depth=overlapDepth(left.boundsM,right.boundsM);
        if(depth.every(value=>value>EPS)&&!allowed)
          collisions.push({
            leftId:left.id,
            rightId:right.id,
            overlapDepthM:depth
          });
      }
    }
    if(hasGrowth(hornGrowth))diagnostics.push(diagnostic(
      FAILURE_CODES.HORN_GROWTH_REQUIRED,'warning',
      ['horn.boundsM','components'],
      'One or more positive mount hosts extend beyond the solved horn envelope; the horn/package candidate must grow or be re-solved.',
      hornGrowth
    ));
    if(collisions.length)diagnostics.push(diagnostic(
      FAILURE_CODES.COMPONENT_COLLISION,'error',['components'],
      'Unapproved component envelope collisions were detected.',
      {collisions}
    ));
    const limitValues=limit
        ?[limit.depthM,limit.widthM,limit.heightM]:[null,null,null],
      limitExcessM=limitValues.map((value,index)=>
        value===null?null:Math.max(0,packageDimensions[index]-value)
      ),
      packageWithinLimit=!limit||
        limitExcessM.every(value=>value===null||value<=EPS);
    if(!packageWithinLimit)diagnostics.push(diagnostic(
      FAILURE_CODES.DRIVER_OUTSIDE_PACKAGE,'error',['packageLimitM'],
      'The explicit horn, driver, mount, rear, or service envelopes exceed the declared package limits.',
      {limitExcessM}
    ));
    const ordered=diagnostics.slice().sort((left,right)=>
      [left.code,left.paths.join('\u0000'),left.message].join('\u0001')
        .localeCompare(
          [right.code,right.paths.join('\u0000'),right.message]
            .join('\u0001')
        )
    );
    const resultRecord=deepFreeze({
      schemaVersion:1,
      horn:{
        id:hornId,
        boundsM:hornBounds,
        requiredBoundsM:hornRequiredBounds,
        growthRequiredM:hornGrowth,
        containsMountHosts:!hasGrowth(hornGrowth)
      },
      components:components.slice().sort((left,right)=>
        String(left.id).localeCompare(String(right.id))
      ),
      package:{
        boundsM:packageBounds,
        dimensionsM:{
          depth:packageDimensions[0],
          width:packageDimensions[1],
          height:packageDimensions[2]
        },
        limitM:limit,
        limitExcessM:{
          depth:limitExcessM[0],
          width:limitExcessM[1],
          height:limitExcessM[2]
        },
        withinLimit:packageWithinLimit,
        globalMarginM:globalMargin||0
      },
      driverEnvelopeCount:driverBounds.length,
      mountHostCount:mountBounds.length,
      collisions,
      automaticHornGrowth:false,
      automaticComponentMotion:false
    });
    const ok=!ordered.some(item=>item.severity==='error');
    return deepFreeze({
      ok,
      code:ok?null:ordered.find(item=>
        item.severity==='error').code,
      result:resultRecord,
      diagnostics:ordered,
      hashInput:'meh3-package-v1\n'+stableStringify(resultRecord),
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function failureResult(diagnostics){
    const ordered=diagnostics.slice().sort((left,right)=>
      [left.code,left.paths.join('\u0000'),left.message].join('\u0001')
        .localeCompare(
          [right.code,right.paths.join('\u0000'),right.message]
            .join('\u0001')
        )
    );
    return deepFreeze({
      ok:false,
      code:ordered.length?ordered[0].code:FAILURE_CODES.INPUT_INVALID,
      result:null,
      diagnostics:ordered,
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'package-manufacturing',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    version:VERSION,
    roles:ROLES,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    stableStringify,
    solvePackageEnvelope,
    manufacturingPreflight
  });
});
