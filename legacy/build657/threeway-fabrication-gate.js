/* MEH Studio v5 — pure schema-2 three-way fabrication admission gate.

   This module evaluates evidence records only. It does not create, repair,
   serialize, export, write, or render geometry; it does not infer tolerances;
   and it does not claim acoustic or hardware validation. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3FabricationGate=factory();
})(function(){
  'use strict';

  const VERSION=1;
  const AUTHORIZATION_SCHEMA_VERSION=1;
  const SUPPORTED_TOPOLOGIES=Object.freeze([
    'T3','CX3','H3','COMPOUND_RESEARCH'
  ]);
  const SUPPORTED_FORMATS=Object.freeze(['stl']);
  const ZERO_TOPOLOGY_FIELDS=Object.freeze([
    'openEdgeCount',
    'nonmanifoldEdgeCount',
    'reversedFaceCount',
    'degenerateFaceCount',
    'selfIntersectionCount',
    'trappedVolumeCount',
    'internalMembraneCount'
  ]);
  const THRESHOLD_FIELDS=Object.freeze([
    'minWallM',
    'minWebM',
    'minFeatureM',
    'minClearanceM'
  ]);
  const FAILURE_CODES=deepFreeze({
    INPUT_INVALID:'THREEWAY_FABRICATION_GATE_INPUT_INVALID',
    NONFINITE_VALUE:'THREEWAY_FABRICATION_GATE_NONFINITE_VALUE',
    STATE_INVALID:'THREEWAY_FABRICATION_GATE_STATE_INVALID',
    SOLUTION_INVALID:'THREEWAY_FABRICATION_GATE_SOLUTION_INVALID',
    FORMAT_UNSUPPORTED:'THREEWAY_FABRICATION_GATE_FORMAT_UNSUPPORTED',
    PROVIDER_UNAVAILABLE:
      'THREEWAY_FABRICATION_GATE_PROVIDER_UNAVAILABLE',
    KERNEL_UNAVAILABLE:
      'THREEWAY_FABRICATION_GATE_KERNEL_UNAVAILABLE',
    AUDIT_UNAVAILABLE:'THREEWAY_FABRICATION_GATE_AUDIT_UNAVAILABLE',
    HASH_MISMATCH:'THREEWAY_FABRICATION_GATE_HASH_MISMATCH',
    PROVIDER_MISMATCH:'THREEWAY_FABRICATION_GATE_PROVIDER_MISMATCH',
    TOPOLOGY_MISMATCH:'THREEWAY_FABRICATION_GATE_TOPOLOGY_MISMATCH',
    SOLID_INVALID:'THREEWAY_FABRICATION_GATE_SOLID_INVALID',
    MANIFOLD_FAILED:'THREEWAY_FABRICATION_GATE_MANIFOLD_FAILED',
    COMPONENT_FAILED:'THREEWAY_FABRICATION_GATE_COMPONENT_FAILED',
    DIMENSIONS_INVALID:
      'THREEWAY_FABRICATION_GATE_DIMENSIONS_INVALID',
    THRESHOLDS_MISSING:
      'THREEWAY_FABRICATION_GATE_THRESHOLDS_MISSING',
    THRESHOLD_FAILED:'THREEWAY_FABRICATION_GATE_THRESHOLD_FAILED',
    LUMEN_CONTINUITY_FAILED:
      'THREEWAY_FABRICATION_GATE_LUMEN_CONTINUITY_FAILED',
    MOUNT_CONTINUITY_FAILED:
      'THREEWAY_FABRICATION_GATE_MOUNT_CONTINUITY_FAILED',
    COLLISION_FAILED:'THREEWAY_FABRICATION_GATE_COLLISION_FAILED',
    MANUFACTURING_UNAVAILABLE:'THREEWAY_MANUFACTURING_UNAVAILABLE'
  });
  const CODE_ORDER=Object.freeze([
    FAILURE_CODES.INPUT_INVALID,
    FAILURE_CODES.NONFINITE_VALUE,
    FAILURE_CODES.STATE_INVALID,
    FAILURE_CODES.SOLUTION_INVALID,
    FAILURE_CODES.FORMAT_UNSUPPORTED,
    FAILURE_CODES.PROVIDER_UNAVAILABLE,
    FAILURE_CODES.KERNEL_UNAVAILABLE,
    FAILURE_CODES.AUDIT_UNAVAILABLE,
    FAILURE_CODES.HASH_MISMATCH,
    FAILURE_CODES.PROVIDER_MISMATCH,
    FAILURE_CODES.TOPOLOGY_MISMATCH,
    FAILURE_CODES.SOLID_INVALID,
    FAILURE_CODES.MANIFOLD_FAILED,
    FAILURE_CODES.COMPONENT_FAILED,
    FAILURE_CODES.DIMENSIONS_INVALID,
    FAILURE_CODES.THRESHOLDS_MISSING,
    FAILURE_CODES.THRESHOLD_FAILED,
    FAILURE_CODES.LUMEN_CONTINUITY_FAILED,
    FAILURE_CODES.MOUNT_CONTINUITY_FAILED,
    FAILURE_CODES.COLLISION_FAILED
  ]);
  const CAPABILITIES=deepFreeze({
    status:'evidence-only-export-admission-gate',
    schema2Only:true,
    hashParityRequired:true,
    providerAndKernelRequired:true,
    deepFabricationAuditRequired:true,
    explicitThresholdsRequired:true,
    lumenContinuityRequired:true,
    mountHostContinuityRequired:true,
    collisionAuditRequired:true,
    authorizationEvaluation:true,
    geometryGeneration:false,
    geometryRepair:false,
    toleranceInference:false,
    fileExport:false,
    fileWrite:false,
    domAccess:false,
    rendererAccess:false,
    legacyAccess:false,
    hardwareValidated:false,
    acousticValidated:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'Capabilities remain false until current exact-solid and deep-audit evidence passes every explicit gate.'
  });
  const MODEL_METADATA=deepFreeze({
    id:'meh3-fabrication-admission-gate',
    revision:'stage-6-v1',
    evidenceOnly:true,
    authorizationRecordIsNotFile:true,
    authorizationRecordIsNotSignature:true,
    hardwareValidated:false,
    acousticValidated:false,
    limitations:[
      'The gate trusts no preview or renderer geometry.',
      'Thresholds must be supplied explicitly by the manufacturing specification and audit.',
      'A successful record authorizes only its exact state, solution, plan, solid, audit, provider, kernel, topology revision, construction, units, and format.',
      'No export bytes or filesystem writes are produced here.'
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

  function exactString(value){
    const cleaned=cleanString(value);
    return cleaned&&cleaned===value?cleaned:null;
  }

  function finite(value){
    return typeof value==='number'&&Number.isFinite(value);
  }

  function positive(value){
    return finite(value)&&value>0;
  }

  function nonnegative(value){
    return finite(value)&&value>=0;
  }

  function nonnegativeInteger(value){
    return Number.isInteger(value)&&value>=0;
  }

  function cloneValue(value,path,invalidPaths,ancestors){
    const current=path||'$',
      stack=ancestors||new WeakSet();
    if(Array.isArray(value)){
      if(stack.has(value)){
        invalidPaths.push(current);
        return null;
      }
      stack.add(value);
      const result=value.map((entry,index)=>
        cloneValue(entry,current+'['+index+']',invalidPaths,stack)
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
        }else result[key]=cloneValue(
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
      cloned=cloneValue(value,path||'$',invalidPaths);
    return {
      ok:invalidPaths.length===0,
      value:cloned,
      invalidPaths:[...new Set(invalidPaths)].sort()
    };
  }

  function stableStringify(value){
    if(Array.isArray(value))
      return '['+value.map(stableStringify).join(',')+']';
    if(isObject(value))
      return '{'+Object.keys(value).sort().map(key=>
        JSON.stringify(key)+':'+stableStringify(value[key])
      ).join(',')+'}';
    return JSON.stringify(value);
  }

  function stringArray(value,allowEmpty){
    if(!Array.isArray(value)||
        (!allowEmpty&&!value.length)||
        value.some(entry=>!exactString(entry))||
        new Set(value).size!==value.length)return null;
    return [...value].sort();
  }

  function vector3(value,positiveOnly){
    if(!Array.isArray(value)||value.length!==3||
        !value.every(finite)||
        (positiveOnly&&!value.every(entry=>entry>0)))return null;
    return [...value];
  }

  function sameStrings(left,right){
    const a=stringArray(left,true),
      b=stringArray(right,true);
    return !!a&&!!b&&a.length===b.length&&
      a.every((entry,index)=>entry===b[index]);
  }

  function diagnostic(code,message,paths,details){
    const safe=safeClone(
      isObject(details)?details:{},'$details'
    );
    return {
      code,
      severity:'error',
      phase:'fabrication-gate',
      paths:[...new Set(
        (Array.isArray(paths)?paths:[])
          .map(exactString).filter(Boolean)
      )].sort(),
      message,
      details:safe.value,
      blocksCapabilities:[
        'exportAuthorization','exactSolid','manufacturing','stl'
      ]
    };
  }

  function sortDiagnostics(values){
    const order=new Map(CODE_ORDER.map(
      (code,index)=>[code,index]
    ));
    return values.sort((left,right)=>{
      const a=order.has(left.code)?order.get(left.code):999,
        b=order.has(right.code)?order.get(right.code):999;
      if(a!==b)return a-b;
      const pathOrder=left.paths.join('|').localeCompare(
        right.paths.join('|')
      );
      if(pathOrder)return pathOrder;
      const messageOrder=left.message.localeCompare(right.message);
      if(messageOrder)return messageOrder;
      return stableStringify(left.details).localeCompare(
        stableStringify(right.details)
      );
    });
  }

  function refusal(diagnostics){
    const sorted=sortDiagnostics(diagnostics).map(
      value=>deepFreeze(value)
    );
    return deepFreeze({
      ok:false,
      code:sorted.length
        ?sorted[0].code:FAILURE_CODES.MANUFACTURING_UNAVAILABLE,
      message:sorted.length
        ?sorted[0].message:CAPABILITIES.reason,
      diagnostics:sorted,
      authorization:null,
      exportAuthorized:false,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      hardwareValidated:false,
      acousticValidated:false,
      capabilities:CAPABILITIES
    });
  }

  function providerRecord(value,requireFormats){
    if(!isObject(value))return null;
    const id=exactString(value.id),
      version=exactString(value.version),
      kernel=isObject(value.kernel)?value.kernel:null,
      kernelId=kernel?exactString(kernel.id):null,
      kernelVersion=kernel?exactString(kernel.version):null,
      formats=requireFormats
        ?stringArray(value.supportedFormats,false):[];
    if(!id||!version||!kernelId||!kernelVersion||
        (requireFormats&&!formats))return null;
    return {
      id,
      version,
      kernel:{id:kernelId,version:kernelVersion},
      ...(requireFormats?{supportedFormats:formats}:{})
    };
  }

  function sameProvider(left,right){
    return !!left&&!!right&&
      left.id===right.id&&
      left.version===right.version&&
      left.kernel.id===right.kernel.id&&
      left.kernel.version===right.kernel.version;
  }

  function componentEvidence(auditComponents,solidComponents){
    if(!isObject(auditComponents))return null;
    const policy=exactString(auditComponents.policy),
      expected=auditComponents.expectedCount,
      actual=auditComponents.actualCount,
      componentIds=stringArray(
        auditComponents.componentIds,false
      );
    if(!['single-intended-solid','documented-set'].includes(policy)||
        !Number.isInteger(expected)||expected<=0||
        !Number.isInteger(actual)||actual<=0||
        expected!==actual||
        !componentIds||componentIds.length!==actual||
        auditComponents.connectedWithinEach!==true||
        !sameStrings(componentIds,solidComponents))return null;
    let documentedSetId=null,
      documentationRefs=[];
    if(policy==='single-intended-solid'){
      if(expected!==1)return null;
    }else{
      documentedSetId=exactString(auditComponents.documentedSetId);
      documentationRefs=stringArray(
        auditComponents.documentationRefs,false
      );
      if(!documentedSetId||!documentationRefs)return null;
    }
    return {
      policy,
      expectedCount:expected,
      actualCount:actual,
      componentIds,
      connectedWithinEach:true,
      documentedSetId,
      documentationRefs
    };
  }

  function dimensionsEvidence(value){
    if(!isObject(value)||value.finite!==true||
        !positive(value.volumeM3))return null;
    const minM=vector3(value.minM,false),
      maxM=vector3(value.maxM,false),
      sizeM=vector3(value.sizeM,true);
    if(!minM||!maxM||!sizeM||
        !maxM.every((entry,index)=>entry>minM[index]))return null;
    return {
      finite:true,
      minM,
      maxM,
      sizeM,
      volumeM3:value.volumeM3
    };
  }

  function thresholdsEvidence(value){
    if(!isObject(value)||value.units!=='m'||
        !isObject(value.required)||
        !isObject(value.measured))return {
      ok:false,
      missing:true,
      failed:[]
    };
    const required={},
      measured={},
      missing=[],
      failed=[];
    for(const field of THRESHOLD_FIELDS){
      if(!positive(value.required[field])||
          !nonnegative(value.measured[field])){
        missing.push(field);
        continue;
      }
      required[field]=value.required[field];
      measured[field]=value.measured[field];
      if(measured[field]<required[field])failed.push(field);
    }
    if(missing.length)return {
      ok:false,
      missing:true,
      missingFields:missing.sort(),
      failed:failed.sort()
    };
    if(failed.length)return {
      ok:false,
      missing:false,
      required,
      measured,
      failed:failed.sort()
    };
    return {
      ok:true,
      evidence:{units:'m',required,measured}
    };
  }

  function lumenEvidence(value,solidLumenIds){
    if(!isObject(value)||value.allConnected!==true||
        value.allChamberToApertureContinuous!==true||
        !nonnegativeInteger(value.expectedCount)||
        !nonnegativeInteger(value.connectedCount)||
        !nonnegativeInteger(value.continuousCount)||
        !Array.isArray(value.records)||
        value.records.length!==value.expectedCount||
        value.connectedCount!==value.expectedCount||
        value.continuousCount!==value.expectedCount)return null;
    const records=[];
    for(const record of value.records){
      if(!isObject(record)||!exactString(record.id)||
          !exactString(record.sourceId)||
          !exactString(record.stationId)||
          record.connected!==true||
          record.chamberToApertureContinuous!==true)return null;
      records.push({
        id:record.id,
        sourceId:record.sourceId,
        stationId:record.stationId,
        connected:true,
        chamberToApertureContinuous:true
      });
    }
    records.sort((left,right)=>left.id.localeCompare(right.id));
    if(new Set(records.map(record=>record.id)).size!==records.length||
        !sameStrings(
          records.map(record=>record.id),solidLumenIds
        ))return null;
    return {
      expectedCount:value.expectedCount,
      connectedCount:value.connectedCount,
      continuousCount:value.continuousCount,
      allConnected:true,
      allChamberToApertureContinuous:true,
      records
    };
  }

  function mountEvidence(value,solidMountIds){
    if(!isObject(value)||value.allBodyContinuous!==true||
        value.allHornContactsContinuous!==true||
        !Number.isInteger(value.expectedCount)||
        value.expectedCount<=0||
        !nonnegativeInteger(value.continuousCount)||
        value.continuousCount!==value.expectedCount||
        !Array.isArray(value.records)||
        value.records.length!==value.expectedCount)return null;
    const records=[];
    for(const record of value.records){
      if(!isObject(record)||!exactString(record.id)||
          !exactString(record.sourceId)||
          record.bodyContinuous!==true||
          record.hornContactContinuous!==true)return null;
      records.push({
        id:record.id,
        sourceId:record.sourceId,
        bodyContinuous:true,
        hornContactContinuous:true
      });
    }
    records.sort((left,right)=>left.id.localeCompare(right.id));
    if(new Set(records.map(record=>record.id)).size!==records.length||
        !sameStrings(
          records.map(record=>record.id),solidMountIds
        ))return null;
    return {
      expectedCount:value.expectedCount,
      continuousCount:value.continuousCount,
      allBodyContinuous:true,
      allHornContactsContinuous:true,
      records
    };
  }

  function collisionEvidence(value){
    if(!isObject(value)||value.checked!==true||
        !nonnegativeInteger(value.count)||
        !nonnegativeInteger(value.unallowedCount)||
        value.unallowedCount!==0||
        !Array.isArray(value.records)||
        value.records.length!==value.count)return null;
    const records=[];
    for(const record of value.records){
      if(!isObject(record)||!exactString(record.id)||
          !exactString(record.leftId)||
          !exactString(record.rightId)||
          record.leftId===record.rightId||
          !nonnegative(record.overlapM3)||
          record.allowed!==true||
          !exactString(record.allowanceId))return null;
      const refs=stringArray(record.documentationRefs,false);
      if(!refs)return null;
      records.push({
        id:record.id,
        leftId:record.leftId,
        rightId:record.rightId,
        overlapM3:record.overlapM3,
        allowed:true,
        allowanceId:record.allowanceId,
        documentationRefs:refs
      });
    }
    records.sort((left,right)=>left.id.localeCompare(right.id));
    if(new Set(records.map(record=>record.id)).size!==records.length)
      return null;
    return {
      checked:true,
      count:value.count,
      unallowedCount:0,
      records
    };
  }

  function authorizeExport(rawInput){
    if(!isObject(rawInput))return refusal([
      diagnostic(
        FAILURE_CODES.INPUT_INVALID,
        'An explicit fabrication-gate input record is required.',
        ['input'],{}
      )
    ]);
    const safe=safeClone(rawInput,'$');
    if(!safe.ok)return refusal([
      diagnostic(
        FAILURE_CODES.NONFINITE_VALUE,
        'Fabrication evidence contains nonfinite, undefined, cyclic, or runtime values.',
        safe.invalidPaths,{invalidPaths:safe.invalidPaths}
      )
    ]);
    const input=safe.value,
      diagnostics=[],
      state=isObject(input.state)?input.state:null,
      solution=isObject(input.solution)?input.solution:null,
      solid=isObject(input.exactSolid)?input.exactSolid:null,
      audit=isObject(input.audit)?input.audit:null,
      requestedFormat=exactString(input.requestedFormat),
      stateHash=exactString(input.stateHash);

    if(Object.prototype.hasOwnProperty.call(input,'legacyState')||
        !state||state.schemaVersion!==2||
        !isObject(state.topology)||
        !SUPPORTED_TOPOLOGIES.includes(
          exactString(state.topology.kind)
        ))diagnostics.push(diagnostic(
      FAILURE_CODES.STATE_INVALID,
      'A normalized schema-2 three-way state with explicit supported topology is required.',
      ['state','legacyState'],{}
    ));
    if(!solution||solution.schemaVersion!==2||
        solution.ok!==true||
        !isObject(solution.readiness)||
        solution.readiness.analysis!==true||
        solution.exactSolid===true||
        solution.manufacturing===true||
        solution.stl===true)diagnostics.push(diagnostic(
      FAILURE_CODES.SOLUTION_INVALID,
      'A successful analysis-ready schema-2 physics solution without premature manufacturing claims is required.',
      ['solution'],{}
    ));
    if(!requestedFormat||
        !SUPPORTED_FORMATS.includes(requestedFormat))
      diagnostics.push(diagnostic(
        FAILURE_CODES.FORMAT_UNSUPPORTED,
        'The requested export format is not admitted by this gate.',
        ['requestedFormat'],
        {requestedFormat,supportedFormats:SUPPORTED_FORMATS}
      ));

    const solidProvider=solid
        ?providerRecord(solid.provider,true):null,
      auditedSolidProvider=audit
        ?providerRecord(audit.solidProvider,true):null,
      auditProvider=audit
        ?providerRecord(audit.provider,false):null;
    if(!solid||solid.schemaVersion!==1||solid.ok!==true||
        solid.exactSolid!==true||!solidProvider)
      diagnostics.push(diagnostic(
        FAILURE_CODES.PROVIDER_UNAVAILABLE,
        'A successful exact-solid provider result with stable identity and version is required.',
        ['exactSolid','exactSolid.provider'],{}
      ));
    if(!solidProvider||!solidProvider.kernel.id||
        !solidProvider.kernel.version)
      diagnostics.push(diagnostic(
        FAILURE_CODES.KERNEL_UNAVAILABLE,
        'The exact-solid provider must identify its Boolean kernel and version.',
        ['exactSolid.provider.kernel'],{}
      ));
    if(!audit||audit.schemaVersion!==1||audit.ok!==true||
        audit.pass!==true||audit.deep!==true||!auditProvider)
      diagnostics.push(diagnostic(
        FAILURE_CODES.AUDIT_UNAVAILABLE,
        'A successful deep fabrication audit with stable provider identity is required.',
        ['audit','audit.provider'],{}
      ));
    if(audit&&!auditedSolidProvider)
      diagnostics.push(diagnostic(
        FAILURE_CODES.PROVIDER_MISMATCH,
        'The audit must record the exact-solid provider and kernel identity it evaluated.',
        ['audit.solidProvider'],{}
      ));
    if(solidProvider&&requestedFormat&&
        !solidProvider.supportedFormats.includes(requestedFormat))
      diagnostics.push(diagnostic(
        FAILURE_CODES.FORMAT_UNSUPPORTED,
        'The exact-solid provider does not declare support for the requested format.',
        ['exactSolid.provider.supportedFormats'],
        {
          requestedFormat,
          supportedFormats:solidProvider.supportedFormats
        }
      ));
    if(audit&&requestedFormat){
      const auditedFormats=stringArray(
        audit.auditedFormats,false
      );
      if(!auditedFormats||
          !auditedFormats.includes(requestedFormat))
        diagnostics.push(diagnostic(
          FAILURE_CODES.FORMAT_UNSUPPORTED,
          'The deep audit does not cover the requested format.',
          ['audit.auditedFormats'],{requestedFormat}
        ));
    }
    if(solidProvider&&auditedSolidProvider&&
        !sameProvider(solidProvider,auditedSolidProvider))
      diagnostics.push(diagnostic(
        FAILURE_CODES.PROVIDER_MISMATCH,
        'The audit must identify the exact provider and kernel that produced the solid.',
        ['exactSolid.provider','audit.solidProvider'],
        {solidProvider,auditedSolidProvider}
      ));

    const solutionInputHash=solution
        ?exactString(solution.inputHash):null,
      solutionHash=solution
        ?exactString(solution.solutionHash):null,
      solidInputHash=solid?exactString(solid.inputHash):null,
      solidSolutionHash=solid
        ?exactString(solid.solutionHash):null,
      planHash=solid?exactString(solid.planHash):null,
      solidHash=solid?exactString(solid.solidHash):null,
      auditInputHash=audit?exactString(audit.inputHash):null,
      auditSolutionHash=audit
        ?exactString(audit.solutionHash):null,
      auditPlanHash=audit?exactString(audit.planHash):null,
      auditSolidHash=audit?exactString(audit.solidHash):null,
      auditHash=audit?exactString(audit.auditHash):null;
    if(!stateHash||!solutionInputHash||!solutionHash||
        !solidInputHash||!solidSolutionHash||!planHash||
        !solidHash||!auditInputHash||!auditSolutionHash||
        !auditPlanHash||!auditSolidHash||!auditHash||
        stateHash!==solutionInputHash||
        stateHash!==solidInputHash||
        stateHash!==auditInputHash||
        solutionHash!==solidSolutionHash||
        solutionHash!==auditSolutionHash||
        planHash!==auditPlanHash||
        solidHash!==auditSolidHash)
      diagnostics.push(diagnostic(
        FAILURE_CODES.HASH_MISMATCH,
        'State, physics solution, manufacturing plan, exact solid, and audit hashes require exact parity.',
        [
          'stateHash','solution.inputHash','solution.solutionHash',
          'exactSolid.inputHash','exactSolid.solutionHash',
          'exactSolid.planHash','exactSolid.solidHash',
          'audit.inputHash','audit.solutionHash','audit.planHash',
          'audit.solidHash','audit.auditHash'
        ],{
          stateHash,solutionInputHash,solutionHash,
          solidInputHash,solidSolutionHash,planHash,solidHash,
          auditInputHash,auditSolutionHash,auditPlanHash,
          auditSolidHash,auditHash
        }
      ));

    const topologyId=state&&state.topology
        ?exactString(state.topology.kind):null,
      solidTopology=solid?exactString(solid.topologyId):null,
      auditTopology=audit?exactString(audit.topologyId):null,
      constructionId=solid
        ?exactString(solid.constructionId):null,
      auditConstruction=audit
        ?exactString(audit.constructionId):null,
      implementationRevision=solid
        ?exactString(solid.topologyImplementationRevision):null,
      auditImplementationRevision=audit
        ?exactString(audit.topologyImplementationRevision):null;
    if(!topologyId||!solidTopology||!auditTopology||
        topologyId!==solidTopology||
        topologyId!==auditTopology||
        !constructionId||!auditConstruction||
        constructionId!==auditConstruction||
        !implementationRevision||!auditImplementationRevision||
        implementationRevision!==auditImplementationRevision||
        !solid||solid.units!=='m'||!audit||audit.units!=='m')
      diagnostics.push(diagnostic(
        FAILURE_CODES.TOPOLOGY_MISMATCH,
        'Topology, construction, implementation revision, and metre units must agree across all exact evidence.',
        [
          'state.topology.kind','exactSolid.topologyId',
          'audit.topologyId','exactSolid.constructionId',
          'audit.constructionId',
          'exactSolid.topologyImplementationRevision',
          'audit.topologyImplementationRevision',
          'exactSolid.units','audit.units'
        ],{
          topologyId,solidTopology,auditTopology,
          constructionId,auditConstruction,
          implementationRevision,auditImplementationRevision,
          solidUnits:solid&&solid.units,
          auditUnits:audit&&audit.units
        }
      ));

    const solidArtifactId=solid
        ?exactString(solid.solidArtifactId):null,
      solidComponentIds=solid
        ?stringArray(solid.componentIds,false):null,
      solidLumenIds=solid
        ?stringArray(solid.lumenIds,true):null,
      solidMountIds=solid
        ?stringArray(solid.mountHostIds,false):null;
    if(!solid||solid.booleanCompleted!==true||
        solid.withinResourceBudget!==true||
        !solidArtifactId||!solidComponentIds||
        !solidLumenIds||!solidMountIds)
      diagnostics.push(diagnostic(
        FAILURE_CODES.SOLID_INVALID,
        'Exact-solid evidence requires completed bounded Booleans and explicit artifact/component/lumen/mount IDs.',
        ['exactSolid'],{}
      ));

    if(audit){
      const checks=isObject(audit.topologyChecks)
          ?audit.topologyChecks:null,
        invalidChecks=!checks||
          ZERO_TOPOLOGY_FIELDS.some(field=>
            checks[field]!==0
          );
      if(invalidChecks)diagnostics.push(diagnostic(
        FAILURE_CODES.MANIFOLD_FAILED,
        'The deep audit requires zero open, nonmanifold, reversed, degenerate, self-intersecting, trapped, and membrane defects.',
        ['audit.topologyChecks'],
        {requiredZeroFields:ZERO_TOPOLOGY_FIELDS}
      ));
    }

    const components=audit&&solidComponentIds
        ?componentEvidence(
          audit.components,solidComponentIds
        ):null;
    if(audit&&!components)diagnostics.push(diagnostic(
      FAILURE_CODES.COMPONENT_FAILED,
      'The audited solid must be one connected intended solid or an explicit documented connected component set.',
      ['audit.components','exactSolid.componentIds'],{}
    ));

    const dimensions=audit
        ?dimensionsEvidence(audit.dimensionsM):null;
    if(audit&&!dimensions)diagnostics.push(diagnostic(
      FAILURE_CODES.DIMENSIONS_INVALID,
      'The audit must report explicit finite bounds, positive dimensions, and positive volume in metres.',
      ['audit.dimensionsM'],{}
    ));

    const thresholds=audit
        ?thresholdsEvidence(audit.thresholds):null;
    if(audit&&thresholds&&!thresholds.ok){
      if(thresholds.missing)diagnostics.push(diagnostic(
        FAILURE_CODES.THRESHOLDS_MISSING,
        'Required and measured wall, web, feature, and clearance thresholds must be explicit in metres.',
        ['audit.thresholds'],{
          requiredFields:THRESHOLD_FIELDS,
          missingFields:thresholds.missingFields||THRESHOLD_FIELDS
        }
      ));
      else diagnostics.push(diagnostic(
        FAILURE_CODES.THRESHOLD_FAILED,
        'One or more audited fabrication minima fail the supplied specification.',
        thresholds.failed.map(
          field=>'audit.thresholds.measured.'+field
        ),{
          failedFields:thresholds.failed,
          required:thresholds.required,
          measured:thresholds.measured
        }
      ));
    }

    const lumens=audit&&solidLumenIds
        ?lumenEvidence(audit.lumens,solidLumenIds):null;
    if(audit&&!lumens)diagnostics.push(diagnostic(
      FAILURE_CODES.LUMEN_CONTINUITY_FAILED,
      'Every declared lumen must be connected continuously from its chamber to exactly its horn-side aperture.',
      ['audit.lumens','exactSolid.lumenIds'],{}
    ));

    const mounts=audit&&solidMountIds
        ?mountEvidence(audit.mountHosts,solidMountIds):null;
    if(audit&&!mounts)diagnostics.push(diagnostic(
      FAILURE_CODES.MOUNT_CONTINUITY_FAILED,
      'Every declared mount host must be a continuous body with continuous horn contact.',
      ['audit.mountHosts','exactSolid.mountHostIds'],{}
    ));

    const collisions=audit
        ?collisionEvidence(audit.collisions):null;
    if(audit&&!collisions)diagnostics.push(diagnostic(
      FAILURE_CODES.COLLISION_FAILED,
      'Every collision must be absent or explicitly allowed by a stable allowance and documentation.',
      ['audit.collisions'],{}
    ));

    if(diagnostics.length)return refusal(diagnostics);

    const successCapabilities=deepFreeze(Object.assign(
      {},CAPABILITIES,{
        status:'current-evidence-export-authorized',
        authorizationEvaluation:true,
        exportAuthorization:true,
        exactSolid:true,
        manufacturing:true,
        stl:requestedFormat==='stl',
        reason:
          'All current schema-2, provider, kernel, hash, manifold, continuity, threshold, collision, and format gates passed.'
      }
    ));
    const evidence={
      schemaVersion:AUTHORIZATION_SCHEMA_VERSION,
      kind:'threeway-export-authorization',
      format:requestedFormat,
      mimeType:'model/stl',
      stateHash,
      solutionHash,
      planHash,
      solidHash,
      auditHash,
      topologyId,
      constructionId,
      topologyImplementationRevision:implementationRevision,
      units:'m',
      solidArtifactId,
      solidProvider,
      auditProvider,
      components,
      dimensionsM:dimensions,
      thresholds:thresholds.evidence,
      lumens,
      mountHosts:mounts,
      collisions,
      validations:{
        schema2:true,
        hashParity:true,
        providerParity:true,
        closedManifold:true,
        finiteDimensions:true,
        thresholdsPassed:true,
        lumenContinuity:true,
        mountHostContinuity:true,
        collisionsAccepted:true,
        hardwareValidated:false,
        acousticValidated:false
      },
      exportWritesPerformed:false,
      exactSolid:true,
      manufacturing:true,
      stl:requestedFormat==='stl',
      hardwareValidated:false,
      acousticValidated:false
    };
    const fingerprintInput=
      'meh3-export-authorization-v1\n'+stableStringify(evidence),
      authorization=deepFreeze(Object.assign(
        {},evidence,{fingerprintInput}
      ));
    return deepFreeze({
      ok:true,
      code:null,
      diagnostics:[],
      authorization,
      exportAuthorized:true,
      exactSolid:true,
      manufacturing:true,
      stl:requestedFormat==='stl',
      hardwareValidated:false,
      acousticValidated:false,
      capabilities:successCapabilities
    });
  }

  function preflight(input){
    return authorizeExport(input);
  }

  return deepFreeze({
    version:VERSION,
    authorizationSchemaVersion:AUTHORIZATION_SCHEMA_VERSION,
    supportedTopologies:SUPPORTED_TOPOLOGIES,
    supportedFormats:SUPPORTED_FORMATS,
    zeroTopologyFields:ZERO_TOPOLOGY_FIELDS,
    thresholdFields:THRESHOLD_FIELDS,
    failureCodes:FAILURE_CODES,
    modelMetadata:MODEL_METADATA,
    capabilities:CAPABILITIES,
    authorizeExport,
    preflight
  });
});
