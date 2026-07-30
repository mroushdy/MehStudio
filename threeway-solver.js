/* MEH Studio v5 — canonical schema-2 three-way orchestration boundary.

   This module coordinates independently-audited pure solvers.  It owns no
   acoustic equation, surface equation, placement equation, mesh generator,
   Boolean, DOM, renderer, persistence channel, or file exporter.

   Every physical choice remains explicit in analysisInput.  Successful
   upstream results are passed to downstream phases by identity, not rebuilt
   from pictures.  A failed or missing phase remains a typed refusal. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory({
    stateContract:require('./threeway-state-contract.js'),
    driverDb:require('./threeway-driver-db.js'),
    hornSurface:require('./threeway-horn-surface.js'),
    stationSolver:require('./threeway-station-solver.js'),
    apertureSolver:require('./threeway-aperture-solver.js'),
    chamberSolver:require('./threeway-chamber-solver.js'),
    interfacePlanner:require('./threeway-interface-planner.js'),
    passageSolver:require('./threeway-passage-solver.js'),
    mountSolver:require('./threeway-mount-solver.js'),
    packageInput:require('./threeway-package-input.js'),
    packageSolver:require('./threeway-package-solver.js'),
    coupledNetwork:require('./threeway-coupled-network.js'),
    renderAssembly:require('./threeway-render-assembly.js'),
    renderModel:require('./threeway-render-model.js'),
    solidIntent:require('./threeway-solid-intent.js'),
    analysisExport:require('./threeway-analysis-export.js')
  });
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3ThreewaySolver=factory({
      stateContract:globalThis.MEH3StateContract,
      driverDb:globalThis.MEH3DriverDB,
      hornSurface:globalThis.MEH3HornSurface,
      stationSolver:globalThis.MEH3StationSolver,
      apertureSolver:globalThis.MEH3ApertureSolver,
      chamberSolver:globalThis.MEH3ChamberSolver,
      interfacePlanner:globalThis.MEH3InterfacePlanner,
      passageSolver:globalThis.MEH3PassageSolver,
      mountSolver:globalThis.MEH3MountSolver,
      packageInput:globalThis.MEH3PackageInput,
      packageSolver:globalThis.MEH3PackageSolver,
      coupledNetwork:globalThis.MEH3CoupledNetwork,
      renderAssembly:globalThis.MEH3RenderAssembly,
      renderModel:globalThis.MEH3RenderModel,
      solidIntent:globalThis.MEH3SolidIntent,
      analysisExport:globalThis.MEH3AnalysisExport
    });
})(function(DefaultDependencies){
  'use strict';

  const VERSION=1;
  const SCHEMA_VERSION=2;
  const SOLUTION_HASH_VERSION='meh3-physics-solution-v1';
  const ANALYSIS_HASH_VERSION='meh3-analysis-input-v1';
  const PHASE_ORDER=Object.freeze([
    'state','drivers','horn','stations','apertures','chambers',
    'interfaces','passages','mounts','package-input','package',
    'coupled-network',
    'solid-intent',
    'render-assembly','render-model','analysis-report'
  ]);
  const FAILURE_CODES=deepFreeze({
    INPUT_INVALID:'THREEWAY_SOLVER_INPUT_INVALID',
    DEPENDENCY_UNAVAILABLE:'THREEWAY_SOLVER_DEPENDENCY_UNAVAILABLE',
    INPUT_HASH_MISMATCH:'THREEWAY_SOLVER_INPUT_HASH_MISMATCH',
    ANALYSIS_INPUT_HASH_MISMATCH:
      'THREEWAY_SOLVER_ANALYSIS_INPUT_HASH_MISMATCH',
    ANALYSIS_INPUT_REQUIRED:'THREEWAY_SOLVER_ANALYSIS_INPUT_REQUIRED',
    TOPOLOGY_UNSUPPORTED:'THREEWAY_SOLVER_TOPOLOGY_UNSUPPORTED',
    PHASE_FAILED:'THREEWAY_SOLVER_PHASE_FAILED',
    PHASE_RESULT_INVALID:'THREEWAY_SOLVER_PHASE_RESULT_INVALID',
    OWNERSHIP_MISMATCH:'THREEWAY_SOLVER_OWNERSHIP_MISMATCH',
    CHAMBER_MISMATCH:'THREEWAY_SOLVER_CHAMBER_MISMATCH',
    PREMATURE_AUTHORITY:'THREEWAY_SOLVER_PREMATURE_AUTHORITY',
    RENDER_UNAVAILABLE:'THREEWAY_SOLVER_RENDER_UNAVAILABLE',
    REPORT_UNAVAILABLE:'THREEWAY_SOLVER_REPORT_UNAVAILABLE',
    SOLID_INTENT_UNAVAILABLE:
      'THREEWAY_SOLVER_SOLID_INTENT_UNAVAILABLE'
  });
  const CAPABILITIES=deepFreeze({
    status:'schema-2-explicit-phase-orchestrator',
    immutable:true,
    topologyNormalization:true,
    explicitDriverResolution:true,
    explicitHornSurface:true,
    explicitStationSolve:true,
    explicitApertureSolve:true,
    explicitFrontChambers:true,
    explicitInterfacePlanning:true,
    canonicalPassages:true,
    fullFaceMountHosts:true,
    canonicalPackageBoundsAdapter:true,
    packageEnvelope:true,
    canonicalSolidIntent:true,
    providerNeutralSolidPlanInput:true,
    optionalExplicitCoupledNetwork:true,
    analysisRenderDto:true,
    analysisJson:true,
    driverInference:false,
    sourceCountInference:false,
    crossoverMutation:false,
    mouthMutation:false,
    automaticApertureSelection:false,
    automaticChamberSelection:false,
    legacyState:false,
    hornresp:false,
    booleanUnion:false,
    booleanSubtraction:false,
    exactSolid:false,
    manufacturingPlan:false,
    manufacturing:false,
    stl:false,
    reason:
      'This orchestrator admits immutable analysis results only. Exact-solid and fabrication authority require separate external evidence.'
  });

  function isObject(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function nonnegativeInteger(value){
    return Number.isInteger(value)&&value>=0?value:null;
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

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    for(const key of Object.keys(value))deepFreeze(value[key]);
    return Object.freeze(value);
  }

  function stableClone(value,path,invalid,ancestors){
    const current=path||'$',
      stack=ancestors||new WeakSet();
    if(Array.isArray(value)){
      if(stack.has(value)){
        invalid.push(current);
        return null;
      }
      stack.add(value);
      const result=value.map((item,index)=>
        stableClone(item,current+'['+index+']',invalid,stack)
      );
      stack.delete(value);
      return result;
    }
    if(isObject(value)){
      const prototype=Object.getPrototypeOf(value);
      if(prototype!==Object.prototype&&prototype!==null){
        invalid.push(current);
        return null;
      }
      if(stack.has(value)){
        invalid.push(current);
        return null;
      }
      stack.add(value);
      const result={};
      for(const key of Object.keys(value).sort()){
        if(value[key]===undefined){
          invalid.push(current+'.'+key);
          result[key]=null;
        }else result[key]=stableClone(
          value[key],current+'.'+key,invalid,stack
        );
      }
      stack.delete(value);
      return result;
    }
    if(typeof value==='number'){
      if(!Number.isFinite(value)){
        invalid.push(current);
        return null;
      }
      return Object.is(value,-0)?0:value;
    }
    if(value===null||typeof value==='string'||typeof value==='boolean')
      return value;
    invalid.push(current);
    return null;
  }

  function stableRecord(value){
    const invalidPaths=[],
      record=stableClone(value,'$',invalidPaths,new WeakSet());
    return {ok:invalidPaths.length===0,record,invalidPaths};
  }

  function stableStringify(value){
    const result=stableRecord(value);
    return result.ok?JSON.stringify(result.record):null;
  }

  function fnv1a64(text){
    let hash=0xcbf29ce484222325n;
    const bytes=typeof TextEncoder==='function'
      ?new TextEncoder().encode(text)
      :Array.from(unescape(encodeURIComponent(text))).map(
        character=>character.charCodeAt(0)
      );
    for(const byte of bytes){
      hash^=BigInt(byte);
      hash=BigInt.asUintN(64,hash*0x100000001b3n);
    }
    return hash.toString(16).padStart(16,'0');
  }

  function uniqueStrings(value){
    return [...new Set(
      (Array.isArray(value)?value:[]).map(cleanString).filter(Boolean)
    )].sort();
  }

  function diagnostic(code,severity,phase,paths,message,details){
    return deepFreeze({
      code,
      severity,
      phase,
      paths:uniqueStrings(paths),
      message,
      details:isObject(details)||Array.isArray(details)
        ?cloneValue(details):{}
    });
  }

  function compareDiagnostics(left,right){
    return [
      PHASE_ORDER.indexOf(left.phase),
      left.phase,left.code,(left.paths||[]).join('\u0000'),left.message
    ].join('\u0001').localeCompare([
      PHASE_ORDER.indexOf(right.phase),
      right.phase,right.code,(right.paths||[]).join('\u0000'),right.message
    ].join('\u0001'));
  }

  function claimsPrematureAuthority(value,ancestors){
    if(!value||typeof value!=='object')return false;
    const stack=ancestors||new WeakSet();
    if(stack.has(value))return true;
    stack.add(value);
    if(Array.isArray(value)){
      const result=value.some(item=>claimsPrematureAuthority(item,stack));
      stack.delete(value);
      return result;
    }
    for(const key of Object.keys(value)){
      if([
        'manufacturing','manufacturingPlan','manufacturingValidated',
        'exactSolid','stl','booleanUnionPerformed',
        'booleanSubtractionPerformed'
      ].includes(key)&&value[key]===true){
        stack.delete(value);
        return true;
      }
      if(claimsPrematureAuthority(value[key],stack)){
        stack.delete(value);
        return true;
      }
    }
    stack.delete(value);
    return false;
  }

  function method(dependency,names){
    if(!dependency)return null;
    for(const name of names)
      if(typeof dependency[name]==='function')
        return dependency[name].bind(dependency);
    return null;
  }

  function dependencyDiagnostics(dependencies){
    const required=[
      ['stateContract',['normalizeThreeWayState']],
      ['driverDb',['createDriverRegistry']],
      ['driverDb',['resolveSourceDrivers']],
      ['hornSurface',['solveHornSurface','solveThreeWayHornSurface']],
      ['stationSolver',['solveEntryStations']],
      ['apertureSolver',['solveApertureLayout']],
      ['chamberSolver',['solveFrontChamberNetwork']],
      ['interfacePlanner',[
        'planInterfaces','planEntryInterfaces','solveInterfaces'
      ]],
      ['passageSolver',['solveCanonicalPassages']],
      ['mountSolver',['solveSourceMounts']],
      ['packageInput',['buildPackageInput']],
      ['packageSolver',['solvePackageEnvelope']],
      ['solidIntent',['buildSolidIntent']],
      ['analysisExport',['buildAnalysisReport']]
    ];
    const diagnostics=[];
    for(const [key,names] of required)
      if(!method(dependencies[key],names))diagnostics.push(diagnostic(
        FAILURE_CODES.DEPENDENCY_UNAVAILABLE,'error','state',
        ['dependencies.'+key],
        'Required three-way dependency '+key+' is unavailable.',
        {acceptedMethods:names}
      ));
    return diagnostics;
  }

  function phaseAudit(name,result){
    return {
      phase:name,
      ok:result&&result.ok===true,
      code:result&&cleanString(result.code),
      hashInput:result&&(
        cleanString(result.hashInput)||
        cleanString(result.surfaceHash)||
        cleanString(result.canonical)
      )||null,
      diagnosticCodes:Array.isArray(result&&result.diagnostics)
        ?uniqueStrings(result.diagnostics.map(item=>item&&item.code)):[]
    };
  }

  function appendPhaseDiagnostics(target,name,result){
    if(!Array.isArray(result&&result.diagnostics))return;
    for(const item of result.diagnostics){
      if(!isObject(item))continue;
      target.push(diagnostic(
        cleanString(item.code)||FAILURE_CODES.PHASE_FAILED,
        cleanString(item.severity)||'error',
        name,
        Array.isArray(item.paths)?item.paths:[],
        cleanString(item.message)||name+' phase diagnostic.',
        isObject(item.details)?item.details:{upstreamPhase:name}
      ));
    }
  }

  function failedResult(identity,diagnostics,phaseAudits){
    const ordered=diagnostics.slice().sort(compareDiagnostics);
    return deepFreeze({
      schemaVersion:SCHEMA_VERSION,
      ok:false,
      code:ordered[0]?ordered[0].code:FAILURE_CODES.PHASE_FAILED,
      requestId:identity.requestId,
      revision:identity.revision,
      inputHash:identity.inputHash,
      analysisInputHash:identity.analysisInputHash||null,
      solution:null,
      renderModel:null,
      analysisReport:null,
      phaseAudits:phaseAudits.map(cloneValue),
      diagnostics:ordered,
      readiness:{
        topology:false,
        analysis:false,
        preview:false,
        coupledResponse:false,
        analysisJson:false,
        hornresp:false,
        manufacturingPlan:false,
        exactSolid:false,
        manufacturing:false,
        stl:false
      },
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function phaseFailure(
    identity,name,result,diagnostics,phaseAudits
  ){
    appendPhaseDiagnostics(diagnostics,name,result);
    if(!diagnostics.some(item=>
      item.phase===name&&item.severity==='error'
    ))diagnostics.push(diagnostic(
      FAILURE_CODES.PHASE_FAILED,'error',name,[name],
      'The '+name+' phase failed without a typed upstream error.',
      {upstreamCode:result&&result.code||null}
    ));
    phaseAudits.push(phaseAudit(name,result));
    return failedResult(identity,diagnostics,phaseAudits);
  }

  function successResultRecord(result){
    return isObject(result&&result.result)?result.result:result;
  }

  function skippedStationResult(state,inputHash){
    const result={
      schemaVersion:2,
      inputHash,
      topology:state.topology.kind,
      hornSurfaceHash:null,
      optimization:'not-applicable',
      selectedEntryStations:[],
      search:{
        deterministic:true,bounded:true,evaluatedCombinations:0,
        maxSearchCombinations:0,limitReached:false,score:0
      },
      crossoverIntentMutated:false,
      sourceCountInferred:false,
      mouthMutated:false,
      manufacturing:false
    };
    return deepFreeze({
      ok:true,code:null,result,diagnostics:[],
      hashInput:'meh3-station-solve-v1\n'+JSON.stringify(result),
      manufacturing:false
    });
  }

  function skippedApertureResult(){
    return deepFreeze({
      ok:true,code:null,sourceOrder:[],sources:[],bySource:{},
      diagnostics:[],automaticCountSelection:false,inferredValues:[],
      validationStatus:'not-applicable-no-wall-entry-stations',
      hardwareValidated:false,manufacturing:false,
      hashInput:'meh3-aperture-layout-v1\n[]'
    });
  }

  function skippedChamberResult(){
    return deepFreeze({
      ok:true,code:null,chambers:[],byId:{},diagnostics:[],
      inferredValues:[],automaticVolumeSelection:false,
      geometryCreated:false,manufacturing:false,
      hashInput:'meh3-front-chamber-network-v1\n[]'
    });
  }

  function skippedInterfaceResult(){
    return deepFreeze({
      ok:true,code:null,
      result:{
        schemaVersion:2,
        apertureLayouts:[],
        driverChamberInterfaces:[],
        mountPlans:[],
        manufacturing:false
      },
      diagnostics:[],
      hashInput:'meh3-interface-plan-v1\n[]',
      manufacturing:false
    });
  }

  function skippedPassageResult(){
    return deepFreeze({
      ok:true,code:null,
      result:{
        schemaVersion:1,passages:[],
        invariants:{oneCanonicalLumenPerAperture:true},
        exactSolid:false,manufacturing:false,stl:false
      },
      diagnostics:[],
      hashInput:'meh3-passage-solve-v1\n[]',
      manufacturing:false,stl:false
    });
  }

  function skippedMountResult(){
    return deepFreeze({
      ok:true,code:null,
      result:{
        schemaVersion:2,
        kind:'threeway-source-instance-mount-solution',
        mounts:[],
        invariants:{
          oneFullFaceHostPerPhysicalDriver:true,
          driverMoved:false,lumenPathMutated:false
        },
        manufacturing:false,stl:false
      },
      diagnostics:[],
      hashInput:'meh3-mount-solve-v1\n[]',
      manufacturing:false,stl:false
    });
  }

  function chamberRecords(result){
    return (Array.isArray(result&&result.chambers)
      ?result.chambers:[]).map(item=>item&&item.record)
      .filter(isObject).sort((left,right)=>
        String(left.id||'').localeCompare(String(right.id||''))
      );
  }

  function validateChamberOwnership(
    interfaces,chambers,diagnostics
  ){
    const byId=new Map(chambers.map(item=>[cleanString(item.id),item])),
      used=new Map();
    for(const item of interfaces){
      const chamber=isObject(item&&item.chamber)?item.chamber:{},
        id=cleanString(chamber.id),
        solved=byId.get(id),
        solvedVolumeM3=solved&&typeof solved.volumeM3==='number'
          ?solved.volumeM3
          :solved&&isObject(solved.volume)&&
            typeof solved.volume.chamberVolumeM3==='number'
            ?solved.volume.chamberVolumeM3:null;
      if(!id||!solved||typeof chamber.volumeM3!=='number'||
          solvedVolumeM3===null||
          Math.abs(chamber.volumeM3-solvedVolumeM3)>1e-12)
        diagnostics.push(diagnostic(
          FAILURE_CODES.CHAMBER_MISMATCH,'error','interfaces',
          ['driverChamberInterfaces','chambers'],
          'Every planned driver interface must reference one solved chamber with the identical explicit volume.',
          {
            interfaceId:item&&item.id||null,
            chamberId:id,
            interfaceVolumeM3:chamber.volumeM3,
            solvedVolumeM3
          }
        ));
      if(id){
        const owners=used.get(id)||[];
        owners.push(cleanString(item&&item.id)||null);
        used.set(id,owners);
      }
    }
    for(const [id,owners] of used.entries())if(owners.length!==1)
      diagnostics.push(diagnostic(
        FAILURE_CODES.CHAMBER_MISMATCH,'error','interfaces',
        ['driverChamberInterfaces','chambers['+id+']'],
        'A solved front chamber must be owned by exactly one physical driver interface.',
        {chamberId:id,interfaceIds:owners}
      ));
    for(const id of byId.keys())if(!used.has(id))
      diagnostics.push(diagnostic(
        FAILURE_CODES.CHAMBER_MISMATCH,'error','interfaces',
        ['chambers['+id+']'],
        'Every solved front chamber must be owned by one planned driver interface.',
        {chamberId:id}
      ));
  }

  function canonicalSolutionHash(core){
    const text=stableStringify(core);
    if(text===null)return null;
    return SOLUTION_HASH_VERSION+'-fnv1a64-'+fnv1a64(
      SOLUTION_HASH_VERSION+'\n'+text
    );
  }

  function directArrays(
    stationResult,interfaceResult,chamberResult,
    passageResult,mountResult
  ){
    const interfaces=successResultRecord(interfaceResult);
    return {
      entryStations:cloneValue(
        successResultRecord(stationResult).selectedEntryStations||[]
      ),
      apertureLayouts:cloneValue(interfaces.apertureLayouts||[]),
      driverChamberInterfaces:cloneValue(
        interfaces.driverChamberInterfaces||[]
      ),
      chambers:cloneValue(chamberRecords(chamberResult)),
      passages:cloneValue(
        successResultRecord(passageResult).passages||[]
      ),
      mounts:cloneValue(successResultRecord(mountResult).mounts||[])
    };
  }

  function createSolver(overrides){
    const dependencies={
      ...DefaultDependencies,
      ...(isObject(overrides)?overrides:{})
    };

    function solveThreeWay(rawRequest){
      const source=isObject(rawRequest)?rawRequest:{},
        stateSource=isObject(source.state)?source.state:null,
        identity={
          requestId:cleanString(source.requestId),
          revision:nonnegativeInteger(source.revision),
          inputHash:cleanString(source.inputHash),
          analysisInputHash:cleanString(source.analysisInputHash)
        },
        diagnostics=dependencyDiagnostics(dependencies),
        phaseAudits=[];
      if(!stateSource||Number(source.schemaVersion)!==1||
          !identity.requestId||identity.revision===null||
          !identity.inputHash||
          !identity.analysisInputHash)
        diagnostics.push(diagnostic(
          FAILURE_CODES.INPUT_INVALID,'error','state',
          [
            'schemaVersion','requestId','revision',
            'inputHash','analysisInputHash','state'
          ],
          'A controller-compatible schema-1 request envelope with schema-2 state, revision, state hash, and analysis-input hash is required.'
        ));
      const serialized=stableRecord(source);
      if(!serialized.ok)diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,'error','state',
        serialized.invalidPaths,
        'Three-way solve input must contain only finite JSON data.'
      ));
      if(diagnostics.length)
        return failedResult(identity,diagnostics,phaseAudits);

      const normalized=dependencies.stateContract
        .normalizeThreeWayState(stateSource);
      appendPhaseDiagnostics(diagnostics,'state',normalized);
      phaseAudits.push(phaseAudit('state',{
        ok:normalized.valid===true,
        code:normalized.valid?null:FAILURE_CODES.PHASE_FAILED,
        hashInput:normalized.hashInput,
        diagnostics:normalized.diagnostics
      }));
      if(normalized.valid!==true)
        return failedResult(identity,diagnostics,phaseAudits);
      if(normalized.hashInput!==identity.inputHash){
        diagnostics.push(diagnostic(
          FAILURE_CODES.INPUT_HASH_MISMATCH,'error','state',
          ['inputHash','state'],
          'The solve request input hash must exactly match normalized schema-2 state.',
          {
            requestedInputHash:identity.inputHash,
            normalizedInputHash:normalized.hashInput
          }
        ));
        return failedResult(identity,diagnostics,phaseAudits);
      }
      const state=normalized.state,
        topology=state.topology.kind;
      if(topology==='COMPOUND_RESEARCH'){
        diagnostics.push(diagnostic(
          FAILURE_CODES.TOPOLOGY_UNSUPPORTED,'error','state',
          ['state.topology.kind'],
          'COMPOUND_RESEARCH needs a named graph-specific solver and is never sent through the conventional T3/CX3/H3 pipeline.'
        ));
        return failedResult(identity,diagnostics,phaseAudits);
      }
      const input=isObject(source.analysisInput)
        ?source.analysisInput:null;
      if(!input){
        diagnostics.push(diagnostic(
          FAILURE_CODES.ANALYSIS_INPUT_REQUIRED,'error','state',
          ['analysisInput'],
          'Explicit driver, horn, station, aperture, chamber, placement, passage, mount, and package inputs are required.'
        ));
        return failedResult(identity,diagnostics,phaseAudits);
      }
      const canonicalAnalysis=stableStringify(input),
        expectedAnalysisHash=canonicalAnalysis===null?null:
          ANALYSIS_HASH_VERSION+'\n'+canonicalAnalysis;
      if(!expectedAnalysisHash||
          identity.analysisInputHash!==expectedAnalysisHash){
        diagnostics.push(diagnostic(
          FAILURE_CODES.ANALYSIS_INPUT_HASH_MISMATCH,
          'error','state',
          ['analysisInput','analysisInputHash'],
          'The immutable physical-analysis payload must exactly match its controller transaction hash.',
          {
            requestedAnalysisInputHash:identity.analysisInputHash,
            normalizedAnalysisInputHash:expectedAnalysisHash
          }
        ));
        return failedResult(identity,diagnostics,phaseAudits);
      }

      const registry=dependencies.driverDb.createDriverRegistry(
        input.driverRecords
      );
      if(!registry||registry.ok!==true)
        return phaseFailure(
          identity,'drivers',registry,diagnostics,phaseAudits
        );
      const resolved=dependencies.driverDb.resolveSourceDrivers(
        state,registry
      );
      if(!resolved||resolved.ok!==true)
        return phaseFailure(
          identity,'drivers',resolved,diagnostics,phaseAudits
        );
      appendPhaseDiagnostics(diagnostics,'drivers',resolved);
      phaseAudits.push(phaseAudit('drivers',{
        ...resolved,hashInput:registry.canonical
      }));

      const hornMethod=method(
          dependencies.hornSurface,
          ['solveHornSurface','solveThreeWayHornSurface']
        ),
        horn=hornMethod(input.horn);
      if(!horn||horn.ok!==true)
        return phaseFailure(
          identity,'horn',horn,diagnostics,phaseAudits
        );
      appendPhaseDiagnostics(diagnostics,'horn',horn);
      phaseAudits.push(phaseAudit('horn',horn));

      const hasWallEntries=state.entryStations.length>0,
        stations=hasWallEntries
          ?dependencies.stationSolver.solveEntryStations({
            ...(isObject(input.stations)?input.stations:{}),
            state,
            hornSurface:horn,
            stationRequirements:isObject(input.stations)
              ?input.stations.stationRequirements:undefined,
            inputHash:identity.inputHash
          })
          :skippedStationResult(state,identity.inputHash);
      if(!stations||stations.ok!==true)
        return phaseFailure(
          identity,'stations',stations,diagnostics,phaseAudits
        );
      appendPhaseDiagnostics(diagnostics,'stations',stations);
      phaseAudits.push(phaseAudit('stations',stations));

      const apertures=hasWallEntries
        ?dependencies.apertureSolver.solveApertureLayout(
          isObject(input.apertures)?input.apertures:{}
        )
        :skippedApertureResult();
      if(!apertures||apertures.ok!==true)
        return phaseFailure(
          identity,'apertures',apertures,diagnostics,phaseAudits
        );
      appendPhaseDiagnostics(diagnostics,'apertures',apertures);
      phaseAudits.push(phaseAudit('apertures',apertures));

      const chambers=hasWallEntries
        ?dependencies.chamberSolver.solveFrontChamberNetwork(
          isObject(input.chambers)?input.chambers:{}
        )
        :skippedChamberResult();
      if(!chambers||chambers.ok!==true)
        return phaseFailure(
          identity,'chambers',chambers,diagnostics,phaseAudits
        );
      appendPhaseDiagnostics(diagnostics,'chambers',chambers);
      phaseAudits.push(phaseAudit('chambers',chambers));

      const interfaceMethod=method(
          dependencies.interfacePlanner,
          ['planInterfaces','planEntryInterfaces','solveInterfaces']
        ),
        interfaces=hasWallEntries?interfaceMethod({
          schemaVersion:2,
          state,
          inputHash:identity.inputHash,
          hornSurface:horn,
          stationResult:stations,
          apertureResult:apertures,
          resolvedDrivers:resolved,
          placementPlans:Array.isArray(input.placementPlans)
            ?input.placementPlans:[],
          validation:isObject(input.interfaceValidation)
            ?input.interfaceValidation:{}
        }):skippedInterfaceResult();
      if(!interfaces||interfaces.ok!==true)
        return phaseFailure(
          identity,'interfaces',interfaces,diagnostics,phaseAudits
        );
      appendPhaseDiagnostics(diagnostics,'interfaces',interfaces);
      phaseAudits.push(phaseAudit('interfaces',interfaces));
      const interfaceRecord=successResultRecord(interfaces),
        plannedInterfaces=Array.isArray(
          interfaceRecord.driverChamberInterfaces
        )?interfaceRecord.driverChamberInterfaces:[];
      validateChamberOwnership(
        plannedInterfaces,chamberRecords(chambers),diagnostics
      );
      if(diagnostics.some(item=>item.severity==='error'))
        return failedResult(identity,diagnostics,phaseAudits);

      const passages=hasWallEntries
        ?dependencies.passageSolver.solveCanonicalPassages({
          ...(isObject(input.passages)?input.passages:{}),
          state,
          stationSolution:stations,
          apertureLayouts:Array.isArray(
            interfaceRecord.apertureLayouts
          )?interfaceRecord.apertureLayouts:[],
          driverChamberInterfaces:plannedInterfaces,
          acoustics:isObject(input.passages)
            ?input.passages.acoustics:undefined
        })
        :skippedPassageResult();
      if(!passages||passages.ok!==true)
        return phaseFailure(
          identity,'passages',passages,diagnostics,phaseAudits
        );
      appendPhaseDiagnostics(diagnostics,'passages',passages);
      phaseAudits.push(phaseAudit('passages',passages));

      const mounts=hasWallEntries
        ?dependencies.mountSolver.solveSourceMounts({
          schemaVersion:2,
          stationResult:stations,
          apertureResult:isObject(interfaceRecord.mountApertureResult)
            ?interfaceRecord.mountApertureResult:apertures,
          passageResult:passages,
          resolvedDrivers:resolved,
          mountPlans:Array.isArray(interfaceRecord.mountPlans)
            ?interfaceRecord.mountPlans:[],
          validation:isObject(input.mountValidation)
            ?input.mountValidation:{}
        })
        :skippedMountResult();
      if(!mounts||mounts.ok!==true)
        return phaseFailure(
          identity,'mounts',mounts,diagnostics,phaseAudits
        );
      appendPhaseDiagnostics(diagnostics,'mounts',mounts);
      phaseAudits.push(phaseAudit('mounts',mounts));

      const packageConfig=isObject(input.package)?input.package:{},
        packageInputResult=dependencies.packageInput.buildPackageInput({
          inputHash:identity.inputHash,
          hornSurface:horn,
          mountResult:mounts,
          packageLimitM:isObject(packageConfig.packageLimitM)
            ?packageConfig.packageLimitM:undefined,
          globalMarginM:packageConfig.globalMarginM,
          componentClearanceM:packageConfig.componentClearanceM,
          additionalComponents:Array.isArray(
            packageConfig.additionalComponents
          )?packageConfig.additionalComponents:[]
        });
      if(!packageInputResult||packageInputResult.ok!==true)
        return phaseFailure(
          identity,'package-input',packageInputResult,
          diagnostics,phaseAudits
        );
      appendPhaseDiagnostics(
        diagnostics,'package-input',packageInputResult
      );
      phaseAudits.push(phaseAudit(
        'package-input',packageInputResult
      ));
      const packageResult=dependencies.packageSolver.solvePackageEnvelope(
        packageInputResult.packageInput
      );
      if(!packageResult||packageResult.ok!==true)
        return phaseFailure(
          identity,'package',packageResult,diagnostics,phaseAudits
        );
      appendPhaseDiagnostics(diagnostics,'package',packageResult);
      phaseAudits.push(phaseAudit('package',packageResult));

      const coupledInputs=Array.isArray(input.coupledNetwork)
          ?input.coupledNetwork:[],
        coupledResponses=[];
      if(coupledInputs.length){
        const coupledMethod=method(
          dependencies.coupledNetwork,
          ['solveCoupledThreeSourceAtFrequency']
        );
        if(!coupledMethod){
          const unavailable={ok:false,code:
            FAILURE_CODES.DEPENDENCY_UNAVAILABLE,diagnostics:[]};
          return phaseFailure(
            identity,'coupled-network',unavailable,
            diagnostics,phaseAudits
          );
        }
        for(const request of coupledInputs){
          const response=coupledMethod(request);
          if(!response||response.ok!==true)
            return phaseFailure(
              identity,'coupled-network',response,
              diagnostics,phaseAudits
            );
          coupledResponses.push(response);
          appendPhaseDiagnostics(diagnostics,'coupled-network',response);
        }
      }
      coupledResponses.sort((left,right)=>
        Number(left.frequencyHz||0)-Number(right.frequencyHz||0)
      );
      phaseAudits.push({
        phase:'coupled-network',
        ok:coupledInputs.length>0,
        code:coupledInputs.length?null:
          'THREEWAY_COUPLED_RESPONSE_NOT_REQUESTED',
        hashInput:coupledInputs.length
          ?stableStringify(coupledResponses):null,
        diagnosticCodes:[]
      });

      const arrays=directArrays(
          stations,interfaces,chambers,passages,mounts
        ),
        physicsCore={
          schemaVersion:2,
          ok:true,
          kind:'threeway-physics-solution',
          inputHash:identity.inputHash,
          analysisInputHash:identity.analysisInputHash,
          designId:state.designId,
          stateRevision:state.revision,
          topology:cloneValue(state.topology),
          resolvedDrivers:cloneValue(resolved.sources||[]),
          hornSurface:cloneValue(horn),
          ...arrays,
          packageInput:cloneValue(packageInputResult.result),
          package:cloneValue(successResultRecord(packageResult)),
          coupledResponses:cloneValue(coupledResponses),
          phaseAudits:phaseAudits.map(cloneValue),
          invariants:{
            normalizedStateUnchanged:true,
            crossoverIntentMutated:false,
            mouthMutated:false,
            sourceCountInferred:false,
            automaticApertureSelection:false,
            automaticChamberSelection:false,
            oneCanonicalLumenPerAperture:true,
            oneFullFaceHostPerPhysicalDriver:true
          },
          readiness:{
            topology:true,
            drivers:true,
            horn:true,
            stations:true,
            apertures:true,
            chambers:true,
            interfaces:true,
            passages:true,
            mounts:true,
            package:true,
            coupledResponse:coupledInputs.length>0,
            analysis:true,
            solidPlanInput:false,
            preview:false,
            analysisJson:false,
            hornresp:false,
            manufacturingPlan:false,
            exactSolid:false,
            manufacturing:false,
            stl:false
          },
          exactSolid:false,
          manufacturingPlan:false,
          manufacturing:false,
          stl:false
        },
        solutionHash=canonicalSolutionHash(physicsCore);
      if(!solutionHash||claimsPrematureAuthority(physicsCore)){
        diagnostics.push(diagnostic(
          !solutionHash
            ?FAILURE_CODES.PHASE_RESULT_INVALID
            :FAILURE_CODES.PREMATURE_AUTHORITY,
          'error','package',['solution'],
          !solutionHash
            ?'The physics solution is not finite canonical JSON.'
            :'An upstream phase attempted to claim Boolean, exact-solid, manufacturing, or STL authority.'
        ));
        return failedResult(identity,diagnostics,phaseAudits);
      }
      let solution=deepFreeze({
          ...physicsCore,
          solutionHash,
          diagnostics:diagnostics.slice().sort(compareDiagnostics)
        }),
        renderDto=null;
      if(hasWallEntries){
        const solidIntentResult=dependencies.solidIntent
          .buildSolidIntent({
            physicsSolution:solution,
            solidGeometry:isObject(input.solidGeometry)
              ?input.solidGeometry:null
          });
        if(solidIntentResult&&solidIntentResult.ok===true&&
            isObject(solidIntentResult.solidIntent)&&
            isObject(solidIntentResult.canonicalRecords)){
          const canonical=solidIntentResult.canonicalRecords;
          solution=deepFreeze({
            ...cloneValue(solution),
            entryStations:cloneValue(canonical.entryStations),
            apertureLayouts:cloneValue(canonical.apertureLayouts),
            chambers:cloneValue(canonical.chambers),
            passages:cloneValue(canonical.passages),
            mounts:cloneValue(canonical.mounts),
            solidIntent:cloneValue(solidIntentResult.solidIntent),
            readiness:{
              ...cloneValue(solution.readiness),
              solidPlanInput:true
            }
          });
          phaseAudits.push(phaseAudit(
            'solid-intent',solidIntentResult
          ));
        }else{
          phaseAudits.push(phaseAudit(
            'solid-intent',solidIntentResult
          ));
          diagnostics.push(diagnostic(
            FAILURE_CODES.SOLID_INTENT_UNAVAILABLE,
            'warning','solid-intent',['solution.solidIntent'],
            'Physics solved, but canonical provider-neutral solid intent failed closed; exact-solid authority remains unavailable.',
            {
              upstreamCode:solidIntentResult&&
                solidIntentResult.code||null,
              upstreamDiagnosticCodes:Array.isArray(
                solidIntentResult&&solidIntentResult.diagnostics
              )?uniqueStrings(
                solidIntentResult.diagnostics.map(item=>item&&item.code)
              ):[]
            }
          ));
        }
      }else phaseAudits.push({
        phase:'solid-intent',
        ok:false,
        code:'THREEWAY_SOLID_INTENT_NOT_APPLICABLE',
        hashInput:null,
        diagnosticCodes:[]
      });
      if(isObject(input.render)){
        const assembleRenderGeometry=method(
            dependencies.renderAssembly,['assembleRenderGeometry']
          ),
          buildRenderModel=method(
            dependencies.renderModel,['buildRenderModel']
          ),
          renderResult=assembleRenderGeometry
          ?assembleRenderGeometry({
            stateHash:identity.inputHash,
            state,
            solutionCore:solution,
            hornSurface:horn,
            resolvedDrivers:resolved,
            passageResult:passages,
            mountResult:mounts,
            packageResult,
            renderIntents:input.render.renderIntents,
            azimuthSegments:input.render.azimuthSegments
          }):null;
        if(renderResult&&renderResult.ok===true){
          solution=isObject(renderResult.solution)
            ?renderResult.solution:deepFreeze({
              ...cloneValue(solution),
              renderGeometry:cloneValue(renderResult.renderGeometry)
            });
          phaseAudits.push(phaseAudit('render-assembly',renderResult));
          const dtoResult=buildRenderModel
            ?buildRenderModel({
              stateHash:identity.inputHash,state,solution
            }):null;
          if(dtoResult&&dtoResult.ok===true){
            renderDto=dtoResult.dto;
            phaseAudits.push(phaseAudit('render-model',dtoResult));
            solution=deepFreeze({
              ...cloneValue(solution),
              readiness:{
                ...cloneValue(solution.readiness),
                preview:true
              }
            });
          }else{
            appendPhaseDiagnostics(
              diagnostics,'render-model',dtoResult
            );
            diagnostics.push(diagnostic(
              FAILURE_CODES.RENDER_UNAVAILABLE,'warning','render-model',
              ['renderModel'],
              'Physics solved, but the render DTO failed closed.'
            ));
          }
        }else{
          appendPhaseDiagnostics(
            diagnostics,'render-assembly',renderResult
          );
          diagnostics.push(diagnostic(
            FAILURE_CODES.RENDER_UNAVAILABLE,'warning','render-assembly',
            ['analysisInput.render'],
            'Physics solved, but render assembly failed closed.'
          ));
        }
      }else diagnostics.push(diagnostic(
        FAILURE_CODES.RENDER_UNAVAILABLE,'info','render-assembly',
        ['analysisInput.render'],
        'No explicit render intents were supplied; physics remains available without preview geometry.'
      ));

      const reportResult=dependencies.analysisExport
        .buildAnalysisReport({
          stateHash:identity.inputHash,
          state,
          solution,
          build:cleanString(source.build),
          moduleManifest:Array.isArray(source.moduleManifest)
            ?source.moduleManifest:[],
          limitations:[
            'Analysis geometry is not an exact Boolean solid.',
            'Hornresp mapping is unavailable.',
            'Manufacturing and STL require the separate exact-solid fabrication gate.'
          ]
        });
      let analysisReport=null;
      if(reportResult&&reportResult.ok===true){
        analysisReport=reportResult;
        phaseAudits.push(phaseAudit('analysis-report',reportResult));
        solution=deepFreeze({
          ...cloneValue(solution),
          readiness:{
            ...cloneValue(solution.readiness),
            analysisJson:true
          }
        });
      }else{
        appendPhaseDiagnostics(
          diagnostics,'analysis-report',reportResult
        );
        diagnostics.push(diagnostic(
          FAILURE_CODES.REPORT_UNAVAILABLE,'warning','analysis-report',
          ['analysisReport'],
          'Physics solved, but deterministic analysis JSON failed closed.'
        ));
      }
      if(claimsPrematureAuthority(solution)||
          claimsPrematureAuthority(renderDto)||
          claimsPrematureAuthority(analysisReport)){
        diagnostics.push(diagnostic(
          FAILURE_CODES.PREMATURE_AUTHORITY,'error','analysis-report',
          ['solution','renderModel','analysisReport'],
          'The completed analysis bundle contains a forbidden positive fabrication authority claim.'
        ));
        return failedResult(identity,diagnostics,phaseAudits);
      }
      const ordered=diagnostics.slice().sort(compareDiagnostics);
      solution=deepFreeze({
        ...cloneValue(solution),
        phaseAudits:phaseAudits.map(cloneValue),
        diagnostics:ordered
      });
      return deepFreeze({
        schemaVersion:SCHEMA_VERSION,
        ok:true,
        code:null,
        requestId:identity.requestId,
        revision:identity.revision,
        inputHash:identity.inputHash,
        analysisInputHash:identity.analysisInputHash,
        solution,
        renderModel:renderDto,
        analysisReport,
        phaseAudits:phaseAudits.map(cloneValue),
        diagnostics:ordered,
        readiness:cloneValue(solution.readiness),
        manufacturing:false,
        stl:false,
        capabilities:CAPABILITIES
      });
    }

    return deepFreeze({
      version:VERSION,
      schemaVersion:SCHEMA_VERSION,
      solutionHashVersion:SOLUTION_HASH_VERSION,
      phaseOrder:PHASE_ORDER,
      failureCodes:FAILURE_CODES,
      capabilities:CAPABILITIES,
      stableStringify,
      createSolver,
      solveThreeWay,
      solve:solveThreeWay,
      solveCandidate:solveThreeWay,
      manufacturingPreflight
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'threeway-manufacturing',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      manufacturingPlan:false,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  return createSolver();
});
