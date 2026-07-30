/* MEH Studio v5 — canonical three-way passage intent solver.

   This module joins four already-solved domains without silently solving any
   of them again:
     1. schema-2 source/station ownership,
     2. an explicitly selected aperture layout,
     3. explicit driver/chamber and endpoint records, and
     4. the canonical lumen geometry and acoustic equation libraries.

   The result is exactly one canonical acoustic-lumen intent per aperture.
   It is deliberately not an exact Boolean, printable solid, STL, or
   manufacturing authorization. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(
    require('./threeway-lumen-geometry.js'),
    require('./threeway-acoustics.js')
  );
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3PassageSolver=factory(
      globalThis.MEH3LumenGeometry,
      globalThis.MEH3Acoustics
    );
})(function(LumenGeometry,Acoustics){
  'use strict';

  const VERSION=1;
  const HASH_VERSION='meh3-passage-solve-v1';
  const PASSAGE_HASH_VERSION='meh3-passage-v1';
  const NUMERICAL_TOLERANCES=deepFreeze({
    coordinateM:1e-8,
    stationAxialM:1e-8,
    areaAbsoluteM2:1e-10,
    areaRelative:1e-7,
    dimensionM:1e-8,
    angleRad:1e-8,
    frameDot:1e-7,
    frameLength:1e-7
  });
  const FAILURE_CODES=deepFreeze({
    DEPENDENCY_UNAVAILABLE:'THREEWAY_PASSAGE_DEPENDENCY_UNAVAILABLE',
    INPUT_REQUIRED:'THREEWAY_PASSAGE_INPUT_REQUIRED',
    INPUT_INVALID:'THREEWAY_PASSAGE_INPUT_INVALID',
    STATE_SCHEMA_UNSUPPORTED:'THREEWAY_PASSAGE_STATE_SCHEMA_UNSUPPORTED',
    SOURCE_INVALID:'THREEWAY_PASSAGE_SOURCE_INVALID',
    STATION_SOLUTION_INVALID:'THREEWAY_PASSAGE_STATION_SOLUTION_INVALID',
    STATION_OWNERSHIP_CONFLICT:
      'THREEWAY_PASSAGE_STATION_OWNERSHIP_CONFLICT',
    APERTURE_LAYOUT_INVALID:'THREEWAY_PASSAGE_APERTURE_LAYOUT_INVALID',
    APERTURE_DUPLICATE:'THREEWAY_PASSAGE_APERTURE_DUPLICATE',
    INTERFACE_INVALID:'THREEWAY_PASSAGE_INTERFACE_INVALID',
    DRIVER_COUNT_CONFLICT:'THREEWAY_PASSAGE_DRIVER_COUNT_CONFLICT',
    APERTURE_OWNERSHIP_CONFLICT:
      'THREEWAY_PASSAGE_APERTURE_OWNERSHIP_CONFLICT',
    NONCANONICAL_DUPLICATE_OWNERSHIP:
      'THREEWAY_PASSAGE_NONCANONICAL_DUPLICATE_OWNERSHIP',
    ENDPOINT_FRAME_INVALID:'THREEWAY_PASSAGE_ENDPOINT_FRAME_INVALID',
    APERTURE_GEOMETRY_CONFLICT:
      'THREEWAY_PASSAGE_APERTURE_GEOMETRY_CONFLICT',
    LUMEN_GEOMETRY_CONFLICT:'THREEWAY_PASSAGE_LUMEN_GEOMETRY_CONFLICT',
    ACOUSTIC_INPUT_INVALID:'THREEWAY_PASSAGE_ACOUSTIC_INPUT_INVALID',
    ACOUSTIC_CONFLICT:'THREEWAY_PASSAGE_ACOUSTIC_CONFLICT',
    PATH_SPREAD_FAILED:'THREEWAY_PASSAGE_PATH_SPREAD_FAILED'
  });
  const CAPABILITIES=deepFreeze({
    status:'canonical-driver-chamber-to-horn-lumen-intents',
    schema2Only:true,
    explicitStationSolutionRequired:true,
    explicitApertureCandidateSelectionRequired:true,
    explicitDriverRequired:true,
    explicitChamberRequired:true,
    explicitApertureAreaRequired:true,
    explicitDiagnosticFrequencyRequired:true,
    physicalDriverQualifiedLayouts:true,
    templateApertureProvenance:true,
    explicitEndpoints:true,
    explicitLocalFrames:true,
    oneCanonicalOwnerPerAperture:true,
    pathSpreadDiagnostics:true,
    crossoverInference:false,
    mouthInference:false,
    driverInference:false,
    chamberInference:false,
    countInference:false,
    apertureAreaInference:false,
    exactBooleanSubtraction:false,
    meshSubtraction:false,
    exactSolid:false,
    manufacturingPlan:false,
    manufacturing:false,
    stl:false,
    reason:
      'Canonical lumen intents remain non-manufacturing until exact host subtraction and solid audits are supplied by a separate authority.'
  });
  const MODEL_METADATA=deepFreeze({
    id:'threeway-canonical-passage-intent',
    version:VERSION,
    maturity:'analytic-integration-contract',
    hardwareValidated:false,
    manufacturing:false,
    limitations:[
      'No missing source, driver, chamber, count, aperture area, crossover, or mouth value is inferred.',
      'Path resonances are ideal one-dimensional estimates under explicit boundary assumptions.',
      'A canonical negative lumen is not proof of an exact subtraction through positive host solids.'
    ]
  });

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

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function finite(value){
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }

  function positive(value){
    const number=finite(value);
    return number!==null&&number>0?number:null;
  }

  function nonnegative(value){
    const number=finite(value);
    return number!==null&&number>=0?number:null;
  }

  function positiveInteger(value){
    const number=Number(value);
    return Number.isInteger(number)&&number>0?number:null;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return Array.from(new Set(value.map(cleanString).filter(Boolean))).sort();
  }

  function vec(value){
    if(!Array.isArray(value)||value.length!==3)return null;
    const result=value.map(finite);
    return result.every(item=>item!==null)?result:null;
  }

  function vAdd(a,b){
    return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  }

  function vScale(a,s){
    return [a[0]*s,a[1]*s,a[2]*s];
  }

  function vSub(a,b){
    return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
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
    return length>1e-14?vScale(a,1/length):null;
  }

  function vDistance(a,b){
    return vLength(vSub(a,b));
  }

  function near(a,b,absolute,relative){
    return Math.abs(a-b)<=absolute+
      (relative||0)*Math.max(Math.abs(a),Math.abs(b));
  }

  function diagnostic(code,severity,paths,message,details){
    return deepFreeze({
      code,
      severity:severity||'error',
      phase:'canonical-passage-solve',
      paths:(paths||[]).filter(Boolean).slice().sort(),
      message,
      details:isObject(details)?cloneValue(details):{},
      blocksCapabilities:(severity||'error')==='error'
        ?[
          'canonicalPassages','preview','exactSolid',
          'manufacturingPlan','manufacturing','stl'
        ]:[]
    });
  }

  function sortDiagnostics(items){
    return items.slice().sort((left,right)=>
      left.severity.localeCompare(right.severity)||
      left.code.localeCompare(right.code)||
      left.paths.join('|').localeCompare(right.paths.join('|'))||
      left.message.localeCompare(right.message)
    );
  }

  function hasErrors(diagnostics){
    return diagnostics.some(item=>item.severity==='error');
  }

  function failResult(diagnostics){
    const ordered=sortDiagnostics(diagnostics),
      first=ordered.find(item=>item.severity==='error');
    return deepFreeze({
      ok:false,
      code:first?first.code:FAILURE_CODES.INPUT_INVALID,
      result:null,
      diagnostics:ordered,
      hashInput:null,
      manufacturing:false,
      stl:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function dependencyDiagnostics(){
    const diagnostics=[];
    if(!LumenGeometry||
        typeof LumenGeometry.buildCanonicalLumen!=='function'||
        typeof LumenGeometry.sectionArea!=='function')
      diagnostics.push(diagnostic(
        FAILURE_CODES.DEPENDENCY_UNAVAILABLE,'error',
        ['dependencies.threeway-lumen-geometry'],
        'The canonical lumen geometry dependency is unavailable.',
        {required:[
          'buildCanonicalLumen','sectionArea'
        ]}
      ));
    if(!Acoustics||
        typeof Acoustics.passageInertance!=='function'||
        typeof Acoustics.passageDelayAndResonances!=='function'||
        typeof Acoustics.analyzeBandPaths!=='function')
      diagnostics.push(diagnostic(
        FAILURE_CODES.DEPENDENCY_UNAVAILABLE,'error',
        ['dependencies.threeway-acoustics'],
        'The explicit three-way acoustics dependency is unavailable.',
        {required:[
          'passageInertance','passageDelayAndResonances',
          'analyzeBandPaths'
        ]}
      ));
    return diagnostics;
  }

  function normalizeFrame(raw,path,diagnostics){
    const record=isObject(raw)?raw:{},
      originM=vec(record.originM),
      axial=vNormalize(vec(record.axial)||[]),
      u=vNormalize(vec(record.u)||[]),
      v=vNormalize(vec(record.v)||[]);
    if(!originM||!axial||!u||!v){
      diagnostics.push(diagnostic(
        FAILURE_CODES.ENDPOINT_FRAME_INVALID,'error',[path],
        'A local frame requires explicit finite originM, axial, u, and v vectors.'
      ));
      return null;
    }
    const dotTolerance=NUMERICAL_TOLERANCES.frameDot,
      handed=vDot(vCross(axial,u),v);
    if(Math.abs(vDot(axial,u))>dotTolerance||
        Math.abs(vDot(axial,v))>dotTolerance||
        Math.abs(vDot(u,v))>dotTolerance||
        handed<1-dotTolerance){
      diagnostics.push(diagnostic(
        FAILURE_CODES.ENDPOINT_FRAME_INVALID,'error',[path],
        'The local frame must be orthonormal and right-handed.',
        {
          axialDotU:vDot(axial,u),
          axialDotV:vDot(axial,v),
          uDotV:vDot(u,v),
          handedness:handed
        }
      ));
      return null;
    }
    return {originM,axial,u,v};
  }

  function normalizeEndpoint(raw,path,diagnostics){
    const record=isObject(raw)?raw:{},
      pointM=vec(record.pointM),
      flowDirection=vNormalize(vec(record.flowDirection)||[]),
      surfaceNormal=vNormalize(vec(record.surfaceNormal)||[]),
      datum=cleanString(record.datum),
      localFrame=normalizeFrame(
        record.localFrame,path+'.localFrame',diagnostics
      );
    if(!pointM||!flowDirection||!surfaceNormal||!datum)
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_REQUIRED,'error',
        [
          path+'.pointM',path+'.flowDirection',
          path+'.surfaceNormal',path+'.datum'
        ],
        'Every passage endpoint requires an explicit point, flow direction, surface normal, and datum.'
      ));
    if(pointM&&localFrame&&
        vDistance(pointM,localFrame.originM)>
          NUMERICAL_TOLERANCES.coordinateM)
      diagnostics.push(diagnostic(
        FAILURE_CODES.ENDPOINT_FRAME_INVALID,'error',
        [path+'.pointM',path+'.localFrame.originM'],
        'Endpoint pointM and local-frame originM must name the same physical datum.',
        {distanceM:vDistance(pointM,localFrame.originM)}
      ));
    if(flowDirection&&localFrame&&
        vDot(flowDirection,localFrame.axial)<
          1-NUMERICAL_TOLERANCES.frameDot)
      diagnostics.push(diagnostic(
        FAILURE_CODES.ENDPOINT_FRAME_INVALID,'error',
        [path+'.flowDirection',path+'.localFrame.axial'],
        'Endpoint local-frame axial must point with the declared acoustic flow direction.',
        {dot:vDot(flowDirection,localFrame.axial)}
      ));
    return {
      pointM,
      flowDirection,
      surfaceNormal,
      datum,
      localFrame,
      stationId:cleanString(record.stationId),
      axialCoordinateM:finite(record.axialCoordinateM),
      provenanceRefs:uniqueStrings(record.provenanceRefs)
    };
  }

  function stationResult(input,diagnostics){
    const wrapper=isObject(input)?input:{};
    if(Object.prototype.hasOwnProperty.call(wrapper,'ok')&&wrapper.ok!==true)
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATION_SOLUTION_INVALID,'error',
        ['stationSolution.ok'],
        'The supplied station solution must already be successful.'
      ));
    const result=isObject(wrapper.result)?wrapper.result:wrapper;
    if(Number(result.schemaVersion)!==2||
        !Array.isArray(result.selectedEntryStations)||
        !result.selectedEntryStations.length){
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATION_SOLUTION_INVALID,'error',
        ['stationSolution'],
        'An explicit schema-2 station solution with selectedEntryStations is required.'
      ));
      return {result:null,byId:new Map()};
    }
    const byId=new Map();
    for(let index=0;index<result.selectedEntryStations.length;index++){
      const station=result.selectedEntryStations[index],
        id=isObject(station)?cleanString(station.stationId):null;
      if(!id||byId.has(id)){
        diagnostics.push(diagnostic(
          FAILURE_CODES.STATION_SOLUTION_INVALID,'error',
          ['stationSolution.selectedEntryStations['+index+'].stationId'],
          'Solved station ids must be explicit and unique.',{stationId:id}
        ));
        continue;
      }
      if(nonnegative(station.axialM)===null)
        diagnostics.push(diagnostic(
          FAILURE_CODES.STATION_SOLUTION_INVALID,'error',
          ['stationSolution.selectedEntryStations['+index+'].axialM'],
          'Every solved station requires an explicit nonnegative axial coordinate.'
        ));
      byId.set(id,station);
    }
    return {result,byId};
  }

  function stateRecords(raw,diagnostics){
    const state=isObject(raw)?raw:{};
    if(Number(state.schemaVersion)!==2)
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATE_SCHEMA_UNSUPPORTED,'error',
        ['state.schemaVersion'],
        'Canonical passage solving accepts schemaVersion 2 only.',
        {value:state.schemaVersion}
      ));
    if(!Array.isArray(state.sources)||!state.sources.length)
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_REQUIRED,'error',['state.sources'],
        'One or more explicit schema-2 sources are required.'
      ));
    if(!Array.isArray(state.entryStations)||!state.entryStations.length)
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_REQUIRED,'error',['state.entryStations'],
        'One or more explicit schema-2 entry stations are required.'
      ));
    const sources=new Map(),stations=new Map();
    for(let index=0;index<(state.sources||[]).length;index++){
      const item=state.sources[index],
        id=isObject(item)?cleanString(item.id):null,
        count=isObject(item)?positiveInteger(item.count):null;
      if(!id||sources.has(id)||count===null){
        diagnostics.push(diagnostic(
          FAILURE_CODES.SOURCE_INVALID,'error',
          ['state.sources['+index+']'],
          'Every source needs a unique id and explicit positive integer count.',
          {id,count:item&&item.count}
        ));
        continue;
      }
      sources.set(id,{
        id,
        count,
        bandIds:uniqueStrings(item.bandIds),
        driverRef:cleanString(item.driverRef)
      });
    }
    for(let index=0;index<(state.entryStations||[]).length;index++){
      const item=state.entryStations[index],
        id=isObject(item)?cleanString(item.id):null;
      if(!id||stations.has(id)){
        diagnostics.push(diagnostic(
          FAILURE_CODES.STATION_OWNERSHIP_CONFLICT,'error',
          ['state.entryStations['+index+'].id'],
          'Every state entry station needs a unique explicit id.',
          {stationId:id}
        ));
        continue;
      }
      stations.set(id,{
        id,
        sourceIds:uniqueStrings(item.sourceIds),
        bandIds:uniqueStrings(item.bandIds),
        role:cleanString(item.role)
      });
    }
    return {state,sources,stations};
  }

  function validateSolvedStationAgainstState(
    stationId,solved,stateStation,stateSource,sourceId,bandId,diagnostics,path
  ){
    if(!solved||!stateStation){
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATION_OWNERSHIP_CONFLICT,'error',[path],
        'The aperture layout must name a station present in both state and solved-station records.',
        {stationId}
      ));
      return;
    }
    const solvedSources=uniqueStrings(solved.sourceIds),
      solvedBands=uniqueStrings(solved.bandIds);
    if(!stateStation.sourceIds.includes(sourceId)||
        !solvedSources.includes(sourceId))
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATION_OWNERSHIP_CONFLICT,'error',[path],
        'The state and solved station must both own the aperture source.',
        {stationId,sourceId}
      ));
    if(!stateStation.bandIds.includes(bandId)||
        !solvedBands.includes(bandId)||
        !stateSource||!stateSource.bandIds.includes(bandId))
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATION_OWNERSHIP_CONFLICT,'error',[path],
        'The state source, state station, and solved station must agree on the aperture band.',
        {stationId,sourceId,bandId}
      ));
    if(positiveInteger(solved.sourceCount)!==stateSource.count)
      diagnostics.push(diagnostic(
        FAILURE_CODES.DRIVER_COUNT_CONFLICT,'error',
        [path,'state.sources['+sourceId+'].count'],
        'Solved sourceCount must equal the explicit schema-2 source count.',
        {
          sourceId,
          stateCount:stateSource.count,
          solvedCount:solved.sourceCount
        }
      ));
  }

  function normalizeLayouts(raw,context,diagnostics){
    if(!Array.isArray(raw)||!raw.length){
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_REQUIRED,'error',['apertureLayouts'],
        'One or more explicitly selected aperture layouts are required.'
      ));
      return {layouts:[],byAperture:new Map(),byId:new Map()};
    }
    const layouts=[],byAperture=new Map(),byId=new Map(),owners=new Set();
    for(let index=0;index<raw.length;index++){
      const item=isObject(raw[index])?raw[index]:{},
        path='apertureLayouts['+index+']',
        id=cleanString(item.id),
        stationId=cleanString(item.stationId),
        sourceId=cleanString(item.sourceId),
        bandId=cleanString(item.bandId),
        driverInstanceId=cleanString(item.driverInstanceId),
        selectedCandidateId=cleanString(item.selectedCandidateId),
        templateCandidateId=cleanString(item.templateCandidateId),
        candidate=isObject(item.candidate)?item.candidate:null,
        diagnosticFrequencyHz=positive(item.diagnosticFrequencyHz),
        pathDatumId=cleanString(item.pathDatumId),
        maximumAllowedSpreadM=item.maximumAllowedSpreadM===undefined
          ?null:nonnegative(item.maximumAllowedSpreadM),
        referencePathToDatumM=item.referencePathToDatumM===undefined
          ?null:nonnegative(item.referencePathToDatumM);
      if(!id||byId.has(id))
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_LAYOUT_INVALID,'error',[path+'.id'],
          'Every aperture layout needs a unique explicit id.',{id}
        ));
      const physicalOwner=stationId+'|'+sourceId+'|'+driverInstanceId;
      if(owners.has(physicalOwner))
        diagnostics.push(diagnostic(
          FAILURE_CODES.NONCANONICAL_DUPLICATE_OWNERSHIP,'error',[path],
          'Only one explicitly selected physical layout may own a station/source/driver-instance tuple.',
          {stationId,sourceId,driverInstanceId}
        ));
      owners.add(physicalOwner);
      if(!stationId||!sourceId||!bandId||!driverInstanceId||
          !selectedCandidateId||!templateCandidateId||
          diagnosticFrequencyHz===null||!pathDatumId)
        diagnostics.push(diagnostic(
          FAILURE_CODES.INPUT_REQUIRED,'error',[path],
          'Layout id, stationId, sourceId, bandId, driverInstanceId, physical selectedCandidateId, templateCandidateId, pathDatumId, and diagnosticFrequencyHz are explicit requirements.'
        ));
      if(item.maximumAllowedSpreadM!==undefined&&
          maximumAllowedSpreadM===null)
        diagnostics.push(diagnostic(
          FAILURE_CODES.ACOUSTIC_INPUT_INVALID,'error',
          [path+'.maximumAllowedSpreadM'],
          'maximumAllowedSpreadM must be finite and nonnegative when supplied.'
        ));
      if(item.referencePathToDatumM!==undefined&&
          referencePathToDatumM===null)
        diagnostics.push(diagnostic(
          FAILURE_CODES.ACOUSTIC_INPUT_INVALID,'error',
          [path+'.referencePathToDatumM'],
          'referencePathToDatumM must be finite and nonnegative when supplied.'
        ));
      if(!candidate||candidate.ok!==true||
          cleanString(candidate.id)!==selectedCandidateId||
          cleanString(candidate.physicalDriverInstanceId)!==
            driverInstanceId||
          cleanString(candidate.templateCandidateId)!==
            templateCandidateId||
          candidate.templateGeometryChanged!==false||
          cleanString(candidate.sourceId)!==sourceId||
          !Array.isArray(candidate.apertures)||
          !candidate.apertures.length||
          positiveInteger(candidate.count)!==candidate.apertures.length)
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_LAYOUT_INVALID,'error',
          [path+'.candidate',path+'.selectedCandidateId'],
          'The selected physical candidate must be explicit, successful, instance-qualified, template-linked, source-matched, and contain its declared aperture count.'
        ));
      const stateSource=context.sources.get(sourceId),
        stateStation=context.stations.get(stationId),
        solved=context.solvedById.get(stationId);
      if(!stateSource)
        diagnostics.push(diagnostic(
          FAILURE_CODES.SOURCE_INVALID,'error',[path+'.sourceId'],
          'The aperture source does not exist in schema-2 state.',
          {sourceId}
        ));
      else validateSolvedStationAgainstState(
        stationId,solved,stateStation,stateSource,sourceId,bandId,
        diagnostics,path
      );
      const layout={
        id,
        stationId,
        sourceId,
        bandId,
        driverInstanceId,
        selectedCandidateId,
        templateCandidateId,
        diagnosticFrequencyHz,
        pathDatumId,
        maximumAllowedSpreadM,
        referencePathToDatumM,
        apertures:[],
        provenanceRefs:uniqueStrings(item.provenanceRefs)
      };
      for(let apertureIndex=0;
          apertureIndex<(candidate&&candidate.apertures||[]).length;
          apertureIndex++){
        const aperture=candidate.apertures[apertureIndex],
          aperturePath=path+'.candidate.apertures['+apertureIndex+']',
          apertureId=isObject(aperture)?cleanString(aperture.id):null,
          templateApertureId=isObject(aperture)
            ?cleanString(aperture.templateApertureId):null,
          area=isObject(aperture)&&isObject(aperture.shape)
            ?positive(aperture.shape.areaM2):null,
          x=isObject(aperture)&&isObject(aperture.centerM)
            ?finite(aperture.centerM.x):null,
          y=isObject(aperture)&&isObject(aperture.centerM)
            ?finite(aperture.centerM.y):null,
          angle=isObject(aperture)?finite(aperture.angleRad):null,
          kind=isObject(aperture)&&isObject(aperture.shape)
            ?cleanString(aperture.shape.kind):null;
        if(!apertureId||!templateApertureId||
            cleanString(aperture.physicalDriverInstanceId)!==
              driverInstanceId||
            cleanString(aperture.physicalCandidateId)!==
              selectedCandidateId||
            cleanString(aperture.templateCandidateId)!==
              templateCandidateId||
            area===null||x===null||y===null||angle===null||
            !['round','racetrack'].includes(kind))
          diagnostics.push(diagnostic(
            FAILURE_CODES.APERTURE_LAYOUT_INVALID,'error',[aperturePath],
            'Every selected physical aperture requires instance-qualified physical/template identity, centerM, angleRad, a supported shape, and explicit positive areaM2.'
          ));
        if(apertureId&&byAperture.has(apertureId))
          diagnostics.push(diagnostic(
            FAILURE_CODES.APERTURE_DUPLICATE,'error',
            [aperturePath],
            'Aperture ids must be globally unique across selected layouts.',
            {apertureId}
          ));
        const normalized={
          id:apertureId,
          templateApertureId,
          physicalDriverInstanceId:driverInstanceId,
          physicalCandidateId:selectedCandidateId,
          templateCandidateId,
          centerM:{x,y},
          angleRad:angle,
          shape:isObject(aperture.shape)?cloneValue(aperture.shape):{},
          layoutId:id,
          stationId,
          sourceId,
          bandId,
          driverInstanceId
        };
        layout.apertures.push(normalized);
        if(apertureId)byAperture.set(apertureId,normalized);
      }
      layout.apertures.sort((left,right)=>
        String(left.id).localeCompare(String(right.id))
      );
      layouts.push(layout);
      if(id)byId.set(id,layout);
    }
    layouts.sort((left,right)=>String(left.id).localeCompare(String(right.id)));
    return {layouts,byAperture,byId};
  }

  function expectedPoint(frame,center){
    return vAdd(
      frame.originM,
      vAdd(vScale(frame.u,center.x),vScale(frame.v,center.y))
    );
  }

  function validateApertureSection(aperture,section,path,diagnostics){
    if(!isObject(section)){
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_REQUIRED,'error',[path],
        'Every aperture requires an explicit startSection.'
      ));
      return;
    }
    const area=LumenGeometry.sectionArea(section),
      apertureArea=aperture.shape.areaM2;
    if(!Number.isFinite(area)||area<=0||
        !near(
          area,apertureArea,
          NUMERICAL_TOLERANCES.areaAbsoluteM2,
          NUMERICAL_TOLERANCES.areaRelative
        ))
      diagnostics.push(diagnostic(
        FAILURE_CODES.APERTURE_GEOMETRY_CONFLICT,'error',
        [path,aperture.id],
        'The explicit lumen start section must have the selected aperture area.',
        {sectionAreaM2:area,apertureAreaM2:apertureArea}
      ));
    if(aperture.shape.kind==='round'){
      const diameter=positive(section.diameterM),
        expected=positive(aperture.shape.radiusM)!==null
          ?2*Number(aperture.shape.radiusM)
          :positive(aperture.shape.longAxisM);
      if(cleanString(section.family)!=='round'||diameter===null||
          expected===null||
          !near(
            diameter,expected,NUMERICAL_TOLERANCES.dimensionM,0
          ))
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_GEOMETRY_CONFLICT,'error',
          [path,aperture.id],
          'A round selected aperture requires the same explicit round lumen diameter.',
          {sectionDiameterM:diameter,apertureDiameterM:expected}
        ));
    }else if(aperture.shape.kind==='racetrack'){
      const major=Math.max(
          positive(section.widthM)||0,positive(section.heightM)||0
        ),
        minor=Math.min(
          positive(section.widthM)||0,positive(section.heightM)||0
        ),
        expectedMajor=positive(aperture.shape.lengthM),
        expectedMinor=positive(aperture.shape.widthM);
      if(cleanString(section.family)!=='racetrack'||
          expectedMajor===null||expectedMinor===null||
          !near(major,expectedMajor,NUMERICAL_TOLERANCES.dimensionM,0)||
          !near(minor,expectedMinor,NUMERICAL_TOLERANCES.dimensionM,0))
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_GEOMETRY_CONFLICT,'error',
          [path,aperture.id],
          'A racetrack selected aperture requires matching explicit lumen major and minor dimensions.',
          {
            sectionMajorM:major,sectionMinorM:minor,
            apertureMajorM:expectedMajor,apertureMinorM:expectedMinor
          }
        ));
    }
    const rotation=finite(section.rotationRad);
    if(rotation===null||
        Math.abs(rotation-aperture.angleRad)>
          NUMERICAL_TOLERANCES.angleRad)
      diagnostics.push(diagnostic(
        FAILURE_CODES.APERTURE_GEOMETRY_CONFLICT,'error',
        [path+'.rotationRad',aperture.id],
        'The start-section rotation must equal the selected aperture orientation.',
        {sectionRotationRad:rotation,apertureAngleRad:aperture.angleRad}
      ));
  }

  function normalizeAcoustics(raw,diagnostics){
    const record=isObject(raw)?raw:{},
      densityKgM3=positive(record.densityKgM3),
      speedOfSoundMps=positive(record.speedOfSoundMps),
      quarter=cleanString(record.quarterWaveBoundaryAssumption),
      half=cleanString(record.halfWaveBoundaryAssumption);
    if(densityKgM3===null||speedOfSoundMps===null||!quarter||!half)
      diagnostics.push(diagnostic(
        FAILURE_CODES.ACOUSTIC_INPUT_INVALID,'error',['acoustics'],
        'Explicit density, sound speed, quarter-wave boundary, and half-wave boundary assumptions are required.'
      ));
    return {
      densityKgM3,
      speedOfSoundMps,
      quarterWaveBoundaryAssumption:quarter,
      halfWaveBoundaryAssumption:half,
      provenance:isObject(record.provenance)
        ?cloneValue(record.provenance):{}
    };
  }

  function normalizeInterfaces(raw,context,diagnostics){
    if(!Array.isArray(raw)||!raw.length){
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_REQUIRED,'error',
        ['driverChamberInterfaces'],
        'One or more explicit driver/chamber interface records are required.'
      ));
      return {interfaces:[],owners:new Map()};
    }
    const interfaces=[],owners=new Map(),interfaceIds=new Set(),
      driverOwners=new Set();
    for(let index=0;index<raw.length;index++){
      const item=isObject(raw[index])?raw[index]:{},
        path='driverChamberInterfaces['+index+']',
        id=cleanString(item.id),
        stationId=cleanString(item.stationId),
        sourceId=cleanString(item.sourceId),
        bandId=cleanString(item.bandId),
        driverInstanceId=cleanString(item.driverInstanceId),
        driverRecordId=cleanString(item.driverRecordId),
        chamber=isObject(item.chamber)?item.chamber:{},
        chamberId=cleanString(chamber.id),
        chamberVolumeM3=positive(chamber.volumeM3),
        driverFaceFrame=normalizeFrame(
          item.driverFaceFrame,path+'.driverFaceFrame',diagnostics
        );
      if(!id||interfaceIds.has(id))
        diagnostics.push(diagnostic(
          FAILURE_CODES.INTERFACE_INVALID,'error',[path+'.id'],
          'Every driver/chamber interface needs a unique id.',{id}
        ));
      if(id)interfaceIds.add(id);
      if(!stationId||!sourceId||!bandId||!driverInstanceId||
          !driverRecordId||!chamberId||chamberVolumeM3===null)
        diagnostics.push(diagnostic(
          FAILURE_CODES.INPUT_REQUIRED,'error',[path],
          'Interface station, source, band, driver instance, driver record, chamber id, and chamber volume are explicit requirements.'
        ));
      const driverOwner=sourceId+'|'+driverInstanceId;
      if(driverOwners.has(driverOwner))
        diagnostics.push(diagnostic(
          FAILURE_CODES.NONCANONICAL_DUPLICATE_OWNERSHIP,'error',[path],
          'A physical driver instance may have only one canonical driver/chamber interface.',
          {sourceId,driverInstanceId}
        ));
      driverOwners.add(driverOwner);
      const stateSource=context.sources.get(sourceId);
      if(!stateSource)
        diagnostics.push(diagnostic(
          FAILURE_CODES.SOURCE_INVALID,'error',[path+'.sourceId'],
          'The interface source does not exist in schema-2 state.',
          {sourceId}
        ));
      else if(stateSource.driverRef&&
          stateSource.driverRef!==driverRecordId)
        diagnostics.push(diagnostic(
          FAILURE_CODES.STATION_OWNERSHIP_CONFLICT,'error',
          [path+'.driverRecordId','state.sources['+sourceId+'].driverRef'],
          'The explicit interface driver record conflicts with state driverRef.',
          {driverRecordId,stateDriverRef:stateSource.driverRef}
        ));
      const normalized={
        id,
        stationId,
        sourceId,
        bandId,
        driverInstanceId,
        driverRecordId,
        chamber:{
          id:chamberId,
          volumeM3:chamberVolumeM3,
          provenanceRefs:uniqueStrings(chamber.provenanceRefs)
        },
        driverFaceFrame,
        apertures:[],
        provenanceRefs:uniqueStrings(item.provenanceRefs)
      };
      if(!Array.isArray(item.apertures)||!item.apertures.length)
        diagnostics.push(diagnostic(
          FAILURE_CODES.INTERFACE_INVALID,'error',[path+'.apertures'],
          'Every driver/chamber interface must explicitly own at least one aperture.'
        ));
      for(let apertureIndex=0;
          apertureIndex<(item.apertures||[]).length;
          apertureIndex++){
        const spec=isObject(item.apertures[apertureIndex])
            ?item.apertures[apertureIndex]:{},
          specPath=path+'.apertures['+apertureIndex+']',
          apertureId=cleanString(spec.apertureId),
          templateApertureId=cleanString(spec.templateApertureId),
          physicalCandidateId=cleanString(spec.physicalCandidateId),
          templateCandidateId=cleanString(spec.templateCandidateId),
          aperture=apertureId
            ?context.aperturesById.get(apertureId):null,
          driverEndpoint=normalizeEndpoint(
            spec.driverEndpoint,specPath+'.driverEndpoint',diagnostics
          ),
          hornEndpoint=normalizeEndpoint(
            spec.hornEndpoint,specPath+'.hornEndpoint',diagnostics
          ),
          effectiveAreaM2=positive(spec.effectiveAreaM2),
          upstreamPathToDriverEndpointM=
            nonnegative(spec.upstreamPathToDriverEndpointM),
          downstreamPathFromHornEndpointToDatumM=
            nonnegative(spec.downstreamPathFromHornEndpointToDatumM),
          pathDatumId=cleanString(spec.pathDatumId);
        if(!apertureId||!templateApertureId||!physicalCandidateId||
            !templateCandidateId||!aperture)
          diagnostics.push(diagnostic(
            FAILURE_CODES.APERTURE_OWNERSHIP_CONFLICT,'error',
            [specPath+'.apertureId',specPath+'.templateApertureId'],
            'Every interface aperture must name one physical selected-layout aperture and its immutable template aperture.',
            {
              apertureId,templateApertureId,physicalCandidateId,
              templateCandidateId
            }
          ));
        if(apertureId&&owners.has(apertureId))
          diagnostics.push(diagnostic(
            FAILURE_CODES.NONCANONICAL_DUPLICATE_OWNERSHIP,'error',
            [specPath+'.apertureId'],
            'Every aperture must have exactly one canonical driver/chamber owner.',
            {
              apertureId,
              firstInterfaceId:owners.get(apertureId).interfaceId,
              duplicateInterfaceId:id
            }
          ));
        if(aperture&&(
          aperture.stationId!==stationId||
          aperture.sourceId!==sourceId||
          aperture.bandId!==bandId||
          aperture.driverInstanceId!==driverInstanceId||
          aperture.templateApertureId!==templateApertureId||
          aperture.physicalCandidateId!==physicalCandidateId||
          aperture.templateCandidateId!==templateCandidateId
        ))diagnostics.push(diagnostic(
          FAILURE_CODES.STATION_OWNERSHIP_CONFLICT,'error',
          [specPath,path],
          'Interface station/source/band/driver/template ownership must match the physical selected aperture layout.',
          {
            interface:{
              stationId,sourceId,bandId,driverInstanceId,
              templateApertureId,physicalCandidateId,templateCandidateId
            },
            aperture:{
              stationId:aperture.stationId,
              sourceId:aperture.sourceId,
              bandId:aperture.bandId,
              driverInstanceId:aperture.driverInstanceId,
              templateApertureId:aperture.templateApertureId,
              physicalCandidateId:aperture.physicalCandidateId,
              templateCandidateId:aperture.templateCandidateId
            }
          }
        ));
        if(effectiveAreaM2===null||
            upstreamPathToDriverEndpointM===null||
            downstreamPathFromHornEndpointToDatumM===null||
            !pathDatumId)
          diagnostics.push(diagnostic(
            FAILURE_CODES.ACOUSTIC_INPUT_INVALID,'error',[specPath],
            'Every passage requires explicit effective area, upstream path, downstream path, and acoustic datum id.'
          ));
        const layout=aperture
          ?context.layoutsById.get(aperture.layoutId):null;
        if(layout&&pathDatumId!==layout.pathDatumId)
          diagnostics.push(diagnostic(
            FAILURE_CODES.ACOUSTIC_CONFLICT,'error',
            [specPath+'.pathDatumId','apertureLayouts['+layout.id+'].pathDatumId'],
            'Every path in a spread group must terminate at the declared common acoustic datum.',
            {pathDatumId,layoutPathDatumId:layout.pathDatumId}
          ));
        if(aperture&&driverFaceFrame&&driverEndpoint.pointM){
          const expected=expectedPoint(driverFaceFrame,aperture.centerM),
            error=vDistance(expected,driverEndpoint.pointM);
          if(error>NUMERICAL_TOLERANCES.coordinateM)
            diagnostics.push(diagnostic(
              FAILURE_CODES.APERTURE_GEOMETRY_CONFLICT,'error',
              [specPath+'.driverEndpoint.pointM',apertureId],
              'The driver endpoint must land at the selected aperture center in the declared driver-face frame.',
              {distanceM:error,expectedPointM:expected}
            ));
        }
        if(aperture)
          validateApertureSection(
            aperture,spec.startSection,
            specPath+'.startSection',diagnostics
          );
        const solved=context.solvedById.get(stationId);
        if(hornEndpoint.stationId!==stationId||
            !solved||hornEndpoint.axialCoordinateM===null||
            !near(
              hornEndpoint.axialCoordinateM,Number(solved.axialM),
              NUMERICAL_TOLERANCES.stationAxialM,0
            ))
          diagnostics.push(diagnostic(
            FAILURE_CODES.STATION_OWNERSHIP_CONFLICT,'error',
            [
              specPath+'.hornEndpoint.stationId',
              specPath+'.hornEndpoint.axialCoordinateM'
            ],
            'The horn endpoint must explicitly reference the solved station and its solved axial coordinate.',
            {
              endpointStationId:hornEndpoint.stationId,
              interfaceStationId:stationId,
              endpointAxialM:hornEndpoint.axialCoordinateM,
              solvedAxialM:solved&&solved.axialM
            }
          ));
        const normalizedSpec={
          apertureId,
          templateApertureId,
          physicalCandidateId,
          templateCandidateId,
          driverEndpoint,
          hornEndpoint,
          startSection:isObject(spec.startSection)
            ?cloneValue(spec.startSection):null,
          endSection:isObject(spec.endSection)
            ?cloneValue(spec.endSection):null,
          areaProgression:cleanString(spec.areaProgression),
          areaProgressionTolerance:finite(spec.areaProgressionTolerance),
          path:isObject(spec.path)?cloneValue(spec.path):null,
          sectionSegments:positiveInteger(spec.sectionSegments),
          driverAxisToleranceDeg:positive(spec.driverAxisToleranceDeg),
          hornCrossingMinimumDeg:positive(spec.hornCrossingMinimumDeg),
          effectiveAreaM2,
          upstreamPathToDriverEndpointM,
          downstreamPathFromHornEndpointToDatumM,
          pathDatumId,
          provenanceRefs:uniqueStrings(spec.provenanceRefs)
        };
        normalized.apertures.push(normalizedSpec);
        if(apertureId&&!owners.has(apertureId))
          owners.set(apertureId,{
            interfaceId:id,
            interfaceRecord:normalized,
            spec:normalizedSpec
          });
      }
      normalized.apertures.sort((left,right)=>
        String(left.apertureId).localeCompare(String(right.apertureId))
      );
      interfaces.push(normalized);
    }
    for(const [apertureId,aperture] of context.aperturesById)
      if(!owners.has(apertureId))
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_OWNERSHIP_CONFLICT,'error',
          ['apertureLayouts['+aperture.layoutId+']',apertureId],
          'Every selected aperture must have exactly one explicit driver/chamber owner.',
          {apertureId}
        ));
    for(const source of context.sources.values()){
      const driverIds=new Set(
        interfaces.filter(item=>item.sourceId===source.id)
          .map(item=>item.driverInstanceId).filter(Boolean)
      ),
        layoutDriverIds=new Set(
          context.layouts.filter(item=>item.sourceId===source.id)
            .map(item=>item.driverInstanceId).filter(Boolean)
        ),
        sourceHasLayout=layoutDriverIds.size>0;
      if(sourceHasLayout&&(
        driverIds.size!==source.count||
        layoutDriverIds.size!==source.count||
        stableStringify([...driverIds].sort())!==
          stableStringify([...layoutDriverIds].sort())
      ))
        diagnostics.push(diagnostic(
          FAILURE_CODES.DRIVER_COUNT_CONFLICT,'error',
          [
            'state.sources['+source.id+'].count',
            'driverChamberInterfaces','apertureLayouts'
          ],
          'Physical aperture layouts and driver interfaces must enumerate the identical driver-instance set and equal the schema-2 source count.',
          {
            sourceId:source.id,
            declaredCount:source.count,
            interfaceDriverIds:[...driverIds].sort(),
            layoutDriverIds:[...layoutDriverIds].sort()
          }
        ));
    }
    interfaces.sort((left,right)=>String(left.id).localeCompare(String(right.id)));
    return {interfaces,owners};
  }

  function dependencyFailure(code,path,message,result){
    return diagnostic(
      code,'error',[path],message,
      {
        dependencyCode:result&&result.code||null,
        dependencyDiagnostics:result&&Array.isArray(result.diagnostics)
          ?result.diagnostics:[]
      }
    );
  }

  function passageFromOwner(
    aperture,layout,owner,acousticInputs,diagnostics
  ){
    const iface=owner.interfaceRecord,spec=owner.spec,
      lumenId='passage:'+aperture.id,
      geometryInput={
        id:lumenId,
        ownerStationId:aperture.stationId,
        ownerSourceId:aperture.sourceId,
        driverEndpoint:{
          pointM:spec.driverEndpoint.pointM,
          flowDirection:spec.driverEndpoint.flowDirection,
          surfaceNormal:spec.driverEndpoint.surfaceNormal,
          datum:spec.driverEndpoint.datum,
          provenanceRefs:spec.driverEndpoint.provenanceRefs
        },
        hornEndpoint:{
          pointM:spec.hornEndpoint.pointM,
          flowDirection:spec.hornEndpoint.flowDirection,
          surfaceNormal:spec.hornEndpoint.surfaceNormal,
          datum:spec.hornEndpoint.datum,
          provenanceRefs:spec.hornEndpoint.provenanceRefs
        },
        path:spec.path,
        startSection:spec.startSection,
        endSection:spec.endSection,
        areaProgression:spec.areaProgression,
        provenanceRefs:Array.from(new Set([
          ...layout.provenanceRefs,
          ...iface.provenanceRefs,
          ...spec.provenanceRefs
        ])).sort()
      };
    if(spec.areaProgressionTolerance!==null)
      geometryInput.areaProgressionTolerance=
        spec.areaProgressionTolerance;
    if(spec.sectionSegments!==null)
      geometryInput.sectionSegments=spec.sectionSegments;
    if(spec.driverAxisToleranceDeg!==null)
      geometryInput.driverAxisToleranceDeg=
        spec.driverAxisToleranceDeg;
    if(spec.hornCrossingMinimumDeg!==null)
      geometryInput.hornCrossingMinimumDeg=
        spec.hornCrossingMinimumDeg;
    const geometry=LumenGeometry.buildCanonicalLumen(geometryInput);
    if(!geometry||geometry.ok!==true||
        !geometry.record||geometry.record.canonicalNegative!==true){
      diagnostics.push(dependencyFailure(
        FAILURE_CODES.LUMEN_GEOMETRY_CONFLICT,
        aperture.id,
        'The explicit endpoints and section progression did not produce one canonical lumen.',
        geometry
      ));
      return null;
    }
    const areas=geometry.record.areasM2,
      minimumAreaM2=Math.min(...areas),
      maximumAreaM2=Math.max(...areas);
    if(spec.effectiveAreaM2<
          minimumAreaM2-NUMERICAL_TOLERANCES.areaAbsoluteM2||
        spec.effectiveAreaM2>
          maximumAreaM2+NUMERICAL_TOLERANCES.areaAbsoluteM2){
      diagnostics.push(diagnostic(
        FAILURE_CODES.ACOUSTIC_CONFLICT,'error',
        [aperture.id+'.effectiveAreaM2'],
        'Explicit effective acoustic area must lie within the canonical section-area range.',
        {
          effectiveAreaM2:spec.effectiveAreaM2,
          minimumSectionAreaM2:minimumAreaM2,
          maximumSectionAreaM2:maximumAreaM2
        }
      ));
      return null;
    }
    const lengthM=geometry.record.path.centerlineLengthM,
      inertance=Acoustics.passageInertance({
        densityKgM3:acousticInputs.densityKgM3,
        effectiveLengthM:lengthM,
        effectiveAreaM2:spec.effectiveAreaM2,
        provenance:acousticInputs.provenance
      }),
      delay=Acoustics.passageDelayAndResonances({
        speedOfSoundMps:acousticInputs.speedOfSoundMps,
        effectiveLengthM:lengthM,
        quarterWaveBoundaryAssumption:
          acousticInputs.quarterWaveBoundaryAssumption,
        halfWaveBoundaryAssumption:
          acousticInputs.halfWaveBoundaryAssumption,
        provenance:acousticInputs.provenance
      });
    if(!inertance||inertance.ok!==true||!delay||delay.ok!==true){
      diagnostics.push(dependencyFailure(
        FAILURE_CODES.ACOUSTIC_CONFLICT,
        aperture.id,
        'The canonical lumen failed explicit inertance or delay/mode analysis.',
        inertance&&inertance.ok!==true?inertance:delay
      ));
      return null;
    }
    const pathToDatumM=
      spec.upstreamPathToDriverEndpointM+
      lengthM+
      spec.downstreamPathFromHornEndpointToDatumM,
      base={
        schemaVersion:1,
        id:lumenId,
        apertureId:aperture.id,
        templateApertureId:aperture.templateApertureId,
        physicalCandidateId:aperture.physicalCandidateId,
        templateCandidateId:aperture.templateCandidateId,
        layoutId:aperture.layoutId,
        stationId:aperture.stationId,
        sourceId:aperture.sourceId,
        bandId:aperture.bandId,
        driverInstanceId:iface.driverInstanceId,
        driverRecordId:iface.driverRecordId,
        chamber:{
          id:iface.chamber.id,
          volumeM3:iface.chamber.volumeM3,
          provenanceRefs:iface.chamber.provenanceRefs
        },
        canonicalOwnership:{
          interfaceId:iface.id,
          ownerCount:1,
          canonical:true
        },
        endpoints:{
          driver:{
            pointM:spec.driverEndpoint.pointM,
            flowDirection:spec.driverEndpoint.flowDirection,
            surfaceNormal:spec.driverEndpoint.surfaceNormal,
            datum:spec.driverEndpoint.datum,
            localFrame:spec.driverEndpoint.localFrame
          },
          horn:{
            pointM:spec.hornEndpoint.pointM,
            flowDirection:spec.hornEndpoint.flowDirection,
            surfaceNormal:spec.hornEndpoint.surfaceNormal,
            datum:spec.hornEndpoint.datum,
            stationId:spec.hornEndpoint.stationId,
            axialCoordinateM:spec.hornEndpoint.axialCoordinateM,
            localFrame:spec.hornEndpoint.localFrame
          }
        },
        selectedAperture:{
          centerM:aperture.centerM,
          angleRad:aperture.angleRad,
          shape:aperture.shape
        },
        sectionProgression:{
          policy:geometry.record.areaProgression,
          start:geometry.record.startSection,
          end:geometry.record.endSection,
          samples:geometry.record.sectionSamples,
          areasM2:geometry.record.areasM2,
          minimumAreaM2,
          maximumAreaM2
        },
        canonicalLumenIntent:geometry.record,
        negativeInspectionMesh:geometry.mesh?{
          role:geometry.mesh.role,
          verticesM:cloneValue(geometry.mesh.verticesM),
          triangles:cloneValue(geometry.mesh.triangles),
          audit:cloneValue(geometry.mesh.audit),
          manufacturingAuthority:false
        }:null,
        negativeInspectionAudit:geometry.mesh&&geometry.mesh.audit
          ?cloneValue(geometry.mesh.audit):null,
        acousticMetrics:{
          effectiveLengthM:lengthM,
          directLengthM:geometry.record.path.directLengthM,
          tortuosity:geometry.record.path.tortuosity,
          effectiveAreaM2:spec.effectiveAreaM2,
          acousticInertancePaS2M3:
            inertance.acousticInertancePaS2M3,
          oneWayDelayS:delay.oneWayDelayS,
          oneWayDelayMs:delay.oneWayDelayMs,
          modes:cloneValue(delay.modes),
          pathDatumId:spec.pathDatumId,
          pathToDatumM,
          pathComponentsM:{
            upstreamToDriverEndpoint:
              spec.upstreamPathToDriverEndpointM,
            canonicalLumen:lengthM,
            hornEndpointToDatum:
              spec.downstreamPathFromHornEndpointToDatumM
          }
        },
        geometryHashInput:geometry.hashInput,
        canonicalNegative:true,
        subtractedFromPositiveHosts:false,
        exactSolid:false,
        manufacturing:false,
        stl:false
      },
      hashInput=PASSAGE_HASH_VERSION+'\n'+stableStringify(base);
    return deepFreeze({...base,hashInput});
  }

  function pathSpreadForLayout(
    layout,passages,acousticInputs,diagnostics
  ){
    const paths=passages.filter(
      passage=>passage.layoutId===layout.id
    ).map(passage=>({
      id:passage.id,
      pathToDatumM:passage.acousticMetrics.pathToDatumM,
      sourceId:passage.sourceId,
      apertureId:passage.apertureId,
      evidenceRefs:passage.canonicalLumenIntent.provenanceRefs
    }));
    const input={
      bandId:layout.bandId,
      frequencyHz:layout.diagnosticFrequencyHz,
      speedOfSoundMps:acousticInputs.speedOfSoundMps,
      paths,
      provenance:acousticInputs.provenance
    };
    if(layout.maximumAllowedSpreadM!==null)
      input.maximumAllowedSpreadM=layout.maximumAllowedSpreadM;
    if(layout.referencePathToDatumM!==null)
      input.referencePathToDatumM=layout.referencePathToDatumM;
    const analysis=Acoustics.analyzeBandPaths(input);
    if(!analysis||analysis.ok!==true){
      diagnostics.push(dependencyFailure(
        FAILURE_CODES.PATH_SPREAD_FAILED,
        layout.id,
        'The explicit paths failed path-spread analysis.',
        analysis
      ));
      return null;
    }
    for(const item of analysis.diagnostics||[])
      diagnostics.push(diagnostic(
        item.code||FAILURE_CODES.PATH_SPREAD_FAILED,
        item.severity||'warning',
        [layout.id,...(item.paths||[])],
        item.message||'Path-spread diagnostic.',
        item.details
      ));
    return deepFreeze({
      layoutId:layout.id,
      driverInstanceId:layout.driverInstanceId,
      stationId:layout.stationId,
      sourceId:layout.sourceId,
      bandId:layout.bandId,
      pathDatumId:layout.pathDatumId,
      diagnosticFrequencyHz:layout.diagnosticFrequencyHz,
      pathCount:paths.length,
      referencePathToDatumM:analysis.referencePathToDatumM,
      minimumPathToDatumM:analysis.minimumPathToDatumM,
      maximumPathToDatumM:analysis.maximumPathToDatumM,
      spreadM:analysis.spreadM,
      spreadDelayS:analysis.spreadDelayS,
      spreadPhaseDeg:analysis.spreadPhaseDeg,
      maximumAllowedSpreadM:analysis.maximumAllowedSpreadM,
      withinDeclaredSpreadLimit:analysis.withinDeclaredSpreadLimit,
      paths:cloneValue(analysis.paths),
      units:cloneValue(analysis.units)
    });
  }

  function solveCanonicalPassages(input){
    const diagnostics=dependencyDiagnostics();
    if(diagnostics.length)return failResult(diagnostics);
    if(!isObject(input))return failResult([
      diagnostic(
        FAILURE_CODES.INPUT_REQUIRED,'error',['input'],
        'An explicit canonical-passage input record is required.'
      )
    ]);
    const stateContext=stateRecords(input.state,diagnostics),
      solved=stationResult(input.stationSolution,diagnostics);
    if(stateContext.state&&solved.result&&
        isObject(stateContext.state.topology)&&
        isObject(solved.result.topology)&&
        cleanString(stateContext.state.topology.kind)!==
          cleanString(solved.result.topology.kind))
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATION_SOLUTION_INVALID,'error',
        ['state.topology.kind','stationSolution.topology.kind'],
        'State and solved-station topology kinds must match.',
        {
          stateKind:stateContext.state.topology.kind,
          solvedKind:solved.result.topology.kind
        }
      ));
    const layoutContext=normalizeLayouts(
      input.apertureLayouts,
      {
        sources:stateContext.sources,
        stations:stateContext.stations,
        solvedById:solved.byId
      },
      diagnostics
    );
    const acousticInputs=normalizeAcoustics(
      input.acoustics,diagnostics
    );
    const interfaceContext=normalizeInterfaces(
      input.driverChamberInterfaces,
      {
        sources:stateContext.sources,
        solvedById:solved.byId,
        layouts:layoutContext.layouts,
        layoutsById:layoutContext.byId,
        aperturesById:layoutContext.byAperture
      },
      diagnostics
    );
    if(hasErrors(diagnostics))return failResult(diagnostics);
    const passages=[];
    for(const aperture of Array.from(layoutContext.byAperture.values())
      .sort((left,right)=>left.id.localeCompare(right.id))){
      const layout=layoutContext.byId.get(aperture.layoutId),
        owner=interfaceContext.owners.get(aperture.id),
        passage=passageFromOwner(
          aperture,layout,owner,acousticInputs,diagnostics
        );
      if(passage)passages.push(passage);
    }
    if(hasErrors(diagnostics))return failResult(diagnostics);
    if(passages.length!==layoutContext.byAperture.size){
      diagnostics.push(diagnostic(
        FAILURE_CODES.APERTURE_OWNERSHIP_CONFLICT,'error',
        ['passages','apertureLayouts'],
        'The result must contain exactly one canonical lumen intent per selected aperture.',
        {
          apertureCount:layoutContext.byAperture.size,
          passageCount:passages.length
        }
      ));
      return failResult(diagnostics);
    }
    const pathSpreadAnalyses=[];
    for(const layout of layoutContext.layouts){
      const analysis=pathSpreadForLayout(
        layout,passages,acousticInputs,diagnostics
      );
      if(analysis)pathSpreadAnalyses.push(analysis);
    }
    if(hasErrors(diagnostics))return failResult(diagnostics);
    const ownership=passages.map(item=>({
        apertureId:item.apertureId,
        templateApertureId:item.templateApertureId,
        passageId:item.id,
        interfaceId:item.canonicalOwnership.interfaceId,
        driverInstanceId:item.driverInstanceId,
        chamberId:item.chamber.id,
        canonicalOwnerCount:1
      })),
      consumedState={
        schemaVersion:2,
        designId:cleanString(stateContext.state.designId),
        revision:finite(stateContext.state.revision),
        topologyKind:isObject(stateContext.state.topology)
          ?cleanString(stateContext.state.topology.kind):null,
        sources:Array.from(stateContext.sources.values())
          .filter(source=>layoutContext.layouts.some(
            layout=>layout.sourceId===source.id
          )).sort((left,right)=>left.id.localeCompare(right.id))
      },
      base={
        schemaVersion:1,
        consumedState,
        stationSolutionSchemaVersion:2,
        passages,
        passageIdsByApertureId:Object.fromEntries(
          passages.map(item=>[item.apertureId,item.id])
        ),
        canonicalOwnership:ownership,
        pathSpreadAnalyses,
        counts:{
          selectedLayouts:layoutContext.layouts.length,
          selectedApertures:layoutContext.byAperture.size,
          driverChamberInterfaces:interfaceContext.interfaces.length,
          canonicalPassages:passages.length
        },
        invariants:{
          oneCanonicalLumenPerAperture:
            passages.length===layoutContext.byAperture.size,
          allDriversExplicit:true,
          allChambersExplicit:true,
          allAreasExplicit:true,
          allEndpointsAndFramesExplicit:true,
          crossoverInferred:false,
          mouthInferred:false,
          meshesSubtracted:false
        },
        ignoredStateInputs:[
          'intent.crossoversHz','intent.mouthLimitM',
          'horn.mouth','preview geometry','manufacturing settings'
        ],
        exactSolid:false,
        manufacturing:false,
        stl:false
      },
      hashInput=HASH_VERSION+'\n'+stableStringify(base),
      orderedDiagnostics=sortDiagnostics(diagnostics);
    return deepFreeze({
      ok:true,
      code:null,
      result:base,
      diagnostics:orderedDiagnostics,
      hashInput,
      manufacturing:false,
      stl:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'manufacturing-export',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    version:VERSION,
    hashVersion:HASH_VERSION,
    passageHashVersion:PASSAGE_HASH_VERSION,
    failureCodes:FAILURE_CODES,
    numericalTolerances:NUMERICAL_TOLERANCES,
    modelMetadata:MODEL_METADATA,
    capabilities:CAPABILITIES,
    stableStringify,
    solveCanonicalPassages,
    manufacturingPreflight
  });
});
