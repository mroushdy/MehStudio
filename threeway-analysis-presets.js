/* MEH Studio v5 — evidence-bounded three-way analysis preset adapter.

   Reference cards describe source graphs, not solved products. This module
   binds explicit driver records to a normalized schema-2 card state and
   assembles the physical-analysis payload accepted by threeway-solver.js.

   It deliberately has no product dimensions. Missing horn, station,
   aperture, chamber, placement, passage, mount, package, or render values
   remain typed explicit-input requirements. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(
    require('./threeway-state-contract.js'),
    require('./threeway-driver-db.js'),
    require('./threeway-reference-cards.js')
  );
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3AnalysisPresets=factory(
      globalThis.MEH3StateContract,
      globalThis.MEH3DriverDB,
      globalThis.MEH3ReferenceCards
    );
})(function(DefaultStateContract,DefaultDriverDb,DefaultReferenceCards){
  'use strict';

  const VERSION=1;
  const SCHEMA_VERSION=2;
  const PRESET_IDS=Object.freeze([
    'cosyne-t3',
    'hinson-cx3',
    'u15-h3'
  ]);
  const FAILURE_CODES=deepFreeze({
    INPUT_INVALID:'THREEWAY_ANALYSIS_PRESET_INPUT_INVALID',
    DEPENDENCY_UNAVAILABLE:
      'THREEWAY_ANALYSIS_PRESET_DEPENDENCY_UNAVAILABLE',
    REFERENCE_CARD_REQUIRED:
      'THREEWAY_ANALYSIS_PRESET_REFERENCE_CARD_REQUIRED',
    REFERENCE_CARD_UNSUPPORTED:
      'THREEWAY_ANALYSIS_PRESET_REFERENCE_CARD_UNSUPPORTED',
    STATE_INVALID:'THREEWAY_ANALYSIS_PRESET_STATE_INVALID',
    STATE_MISMATCH:'THREEWAY_ANALYSIS_PRESET_STATE_MISMATCH',
    DRIVER_RECORD_INVALID:
      'THREEWAY_ANALYSIS_PRESET_DRIVER_RECORD_INVALID',
    DRIVER_BINDING_REQUIRED:
      'THREEWAY_ANALYSIS_PRESET_DRIVER_BINDING_REQUIRED',
    DRIVER_BINDING_CONFLICT:
      'THREEWAY_ANALYSIS_PRESET_DRIVER_BINDING_CONFLICT',
    EXPLICIT_INPUTS_REQUIRED:
      'THREEWAY_ANALYSIS_PRESET_EXPLICIT_INPUTS_REQUIRED'
  });
  const CAPABILITIES=deepFreeze({
    status:'reference-card-to-explicit-analysis-input',
    immutable:true,
    schema2Only:true,
    documentedTopologyDefaults:true,
    explicitDriverBinding:true,
    explicitPhysicalOverrides:true,
    typedAvailability:true,
    typedMissingInputs:true,
    driverAreaInferenceFromNominalSize:false,
    productDimensionInference:false,
    mouthInference:false,
    crossoverInference:false,
    sourceCountInference:false,
    stationInference:false,
    chamberInference:false,
    passageInference:false,
    mountInference:false,
    renderIntentInference:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'Reference cards establish topology and documented source counts only; every unsourced physical design value remains explicit.'
  });
  const PRESETS=deepFreeze({
    'cosyne-t3':{
      id:'cosyne-t3',
      referenceCardId:'cosyne-t3-documented-topology',
      topology:'T3',
      title:'CoSyne documented T3 topology',
      defaultAvailability:'explicit-design-inputs-required',
      sourceContracts:[
        sourceContract('source-high',['high'],'throat-source',1),
        sourceContract('source-low',['low'],'wall-source',4),
        sourceContract('source-mid',['mid'],'wall-source',4)
      ],
      stationContracts:[
        stationContract(
          'station-mid-intent',['mid'],['source-mid'],1
        ),
        stationContract(
          'station-low-intent',['low'],['source-low'],2
        )
      ],
      unknownIds:[
        'cosyne-current-drivers','cosyne-horn-geometry',
        'cosyne-station-geometry','cosyne-crossover'
      ],
      evidenceRefs:[
        'prov-waslo-cosyne','prov-waslo-synergy-calc-guide'
      ]
    },
    'hinson-cx3':{
      id:'hinson-cx3',
      referenceCardId:'hinson-cx3-documented-topology',
      topology:'CX3',
      title:'Hinson-style documented CX3 topology',
      defaultAvailability:'explicit-design-inputs-required',
      sourceContracts:[
        sourceContract(
          'source-coax-mid-high',['mid','high'],'throat-module',1
        ),
        sourceContract('source-low',['low'],'wall-source',2)
      ],
      stationContracts:[
        stationContract(
          'station-low-intent',['low'],['source-low'],0
        )
      ],
      unknownIds:[
        'hinson-current-drivers','hinson-horn-geometry',
        'hinson-lf-station-geometry','hinson-crossover'
      ],
      evidenceRefs:['prov-hinson-meh-guide']
    },
    'u15-h3':{
      id:'u15-h3',
      referenceCardId:'u15-h3-documented-topology',
      topology:'H3',
      title:'U15-style H3 shared MF/HF plus external LF topology',
      defaultAvailability:'explicit-design-inputs-required',
      sourceContracts:[
        sourceContract(
          'source-high',['high'],'throat-source',1
        ),
        sourceContract(
          'source-low-external',['low'],
          'external-to-shared-horn',1
        ),
        sourceContract(
          'source-mid',['mid'],'throat-module',3
        )
      ],
      stationContracts:[],
      unknownIds:[
        'u15-derivative-drivers','u15-shared-horn-geometry',
        'u15-interface-geometry','u15-derivative-crossover'
      ],
      evidenceRefs:[
        'prov-yorkville-u15','prov-yorkville-u15-spec'
      ]
    }
  });
  const CARD_TO_PRESET=deepFreeze(Object.fromEntries(
    Object.values(PRESETS).map(item=>[item.referenceCardId,item.id])
  ));
  const STATIC_CARD_AVAILABILITY=deepFreeze({
    'patent-t3-generic':{
      available:false,
      code:FAILURE_CODES.EXPLICIT_INPUTS_REQUIRED,
      reason:
        'The generic patent card does not document universal source counts, selected drivers, or physical geometry.'
    },
    'compound-research-generic':{
      available:false,
      code:FAILURE_CODES.REFERENCE_CARD_UNSUPPORTED,
      reason:
        'COMPOUND_RESEARCH requires an explicit directed graph and a named graph-specific solver.'
    }
  });

  function sourceContract(id,bandIds,role,count){
    return {id,bandIds,role,count};
  }

  function stationContract(id,bandIds,sourceIds,order){
    return {id,bandIds,sourceIds,order,role:'wall-entry'};
  }

  function isObject(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
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

  function positiveInteger(value){
    return Number.isInteger(value)&&value>0;
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

  function stableClone(value,path,invalid){
    if(value===undefined){
      invalid.push(path);
      return null;
    }
    if(Array.isArray(value))
      return value.map((item,index)=>
        stableClone(item,path+'['+index+']',invalid)
      );
    if(isObject(value)){
      const result={};
      for(const key of Object.keys(value).sort())
        result[key]=stableClone(
          value[key],path?path+'.'+key:key,invalid
        );
      return result;
    }
    if(typeof value==='number'){
      if(!Number.isFinite(value))invalid.push(path);
      return Number.isFinite(value)?(Object.is(value,-0)?0:value):null;
    }
    if(value===null||typeof value==='string'||
        typeof value==='boolean')return value;
    invalid.push(path);
    return null;
  }

  function stableStringify(value){
    const invalid=[];
    const canonical=stableClone(value,'input',invalid);
    return invalid.length?null:JSON.stringify(canonical);
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function sameStrings(left,right){
    return JSON.stringify(uniqueStrings(left))===
      JSON.stringify(uniqueStrings(right));
  }

  function diagnostic(code,severity,paths,message,evidenceRefs){
    return deepFreeze({
      code,
      severity,
      phase:'analysis-preset',
      paths:uniqueStrings(paths),
      message,
      evidenceRefs:uniqueStrings(evidenceRefs),
      blocksCapabilities:severity==='error'
        ?['analysis','preview','manufacturing']:[]
    });
  }

  function missing(
    id,path,category,reason,evidenceRefs,blocksCapabilities
  ){
    return deepFreeze({
      id,
      path,
      category,
      reason,
      evidenceRefs:uniqueStrings(evidenceRefs),
      blocksCapabilities:uniqueStrings(
        blocksCapabilities||['analysis','preview']
      )
    });
  }

  function getPresetDefinition(idOrCardId){
    const id=cleanString(idOrCardId),
      presetId=id&&PRESETS[id]?id:CARD_TO_PRESET[id];
    return presetId?PRESETS[presetId]:null;
  }

  function listPresetDefinitions(){
    return deepFreeze(PRESET_IDS.map(id=>PRESETS[id]));
  }

  function cardIdFromState(state){
    const intentId=cleanString(
      state&&state.intent&&state.intent.referenceCardId
    );
    if(intentId)return intentId;
    const references=state&&state.research&&
      Array.isArray(state.research.referenceCardIds)
      ?uniqueStrings(state.research.referenceCardIds):[];
    return references.length===1?references[0]:null;
  }

  function bindDrivers(state,bindings,diagnostics,missingInputs){
    const result=cloneValue(state),
      refs=isObject(bindings)?bindings:{};
    for(let index=0;index<result.sources.length;index++){
      const source=result.sources[index],
        supplied=cleanString(refs[source.id]),
        existing=cleanString(source.driverRef);
      if(existing&&supplied&&existing!==supplied){
        diagnostics.push(diagnostic(
          FAILURE_CODES.DRIVER_BINDING_CONFLICT,'error',
          ['state.sources['+index+'].driverRef',
            'sourceDriverRefs.'+source.id],
          'The state driverRef and explicit source binding disagree for '+
            source.id+'.'
        ));
      }else if(supplied)source.driverRef=supplied;
      if(!cleanString(source.driverRef))missingInputs.push(missing(
        'driver-binding:'+source.id,
        'state.sources['+source.id+'].driverRef',
        'documented-unknown',
        'The reference card does not select a replacement driver; bind one explicit validated driver record.',
        [],
        ['analysis','preview']
      ));
    }
    return result;
  }

  function validatePresetGraph(state,preset,diagnostics){
    if(!state||!state.topology||state.topology.kind!==preset.topology)
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATE_MISMATCH,'error',['state.topology.kind'],
        'Reference preset '+preset.id+' requires topology '+
          preset.topology+'.',
        preset.evidenceRefs
      ));
    const sources=Array.isArray(state&&state.sources)
        ?state.sources.slice().sort((a,b)=>
          String(a.id||'').localeCompare(String(b.id||''))):[],
      expectedSources=preset.sourceContracts.slice().sort((a,b)=>
        a.id.localeCompare(b.id));
    if(sources.length!==expectedSources.length)
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATE_MISMATCH,'error',['state.sources'],
        'The source graph no longer matches the documented reference card.',
        preset.evidenceRefs
      ));
    for(const expected of expectedSources){
      const actual=sources.find(item=>item.id===expected.id);
      if(!actual||actual.role!==expected.role||
          Number(actual.count)!==expected.count||
          !sameStrings(actual.bandIds,expected.bandIds))
        diagnostics.push(diagnostic(
          FAILURE_CODES.STATE_MISMATCH,'error',
          ['state.sources['+expected.id+']'],
          'Source '+expected.id+' must retain the documented role, bands, and count before this preset label is used.',
          preset.evidenceRefs
        ));
    }
    const stations=Array.isArray(state&&state.entryStations)
        ?state.entryStations:[],
      expectedStations=preset.stationContracts;
    if(stations.length!==expectedStations.length)
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATE_MISMATCH,'error',['state.entryStations'],
        'The entry-station graph no longer matches the reference card.',
        preset.evidenceRefs
      ));
    for(const expected of expectedStations){
      const actual=stations.find(item=>item.id===expected.id);
      if(!actual||actual.role!==expected.role||
          Number(actual.order)!==expected.order||
          !sameStrings(actual.bandIds,expected.bandIds)||
          !sameStrings(actual.sourceIds,expected.sourceIds))
        diagnostics.push(diagnostic(
          FAILURE_CODES.STATE_MISMATCH,'error',
          ['state.entryStations['+expected.id+']'],
          'Station '+expected.id+' must retain its documented identity and order.',
          preset.evidenceRefs
        ));
    }
  }

  function hasPath(root,path){
    let cursor=root;
    for(const key of path.split('.')){
      if(!isObject(cursor)&&!Array.isArray(cursor))return false;
      if(!Object.prototype.hasOwnProperty.call(cursor,key))return false;
      cursor=cursor[key];
    }
    return cursor!==undefined&&cursor!==null;
  }

  function requirePath(
    root,path,id,reason,evidenceRefs,missingInputs,validator
  ){
    let cursor=root;
    for(const key of path.split('.')){
      if((!isObject(cursor)&&!Array.isArray(cursor))||
          !Object.prototype.hasOwnProperty.call(cursor,key)){
        missingInputs.push(missing(
          id,path,'explicit-input-required',reason,evidenceRefs
        ));
        return null;
      }
      cursor=cursor[key];
    }
    if(cursor===undefined||cursor===null||
        (validator&&!validator(cursor))){
      missingInputs.push(missing(
        id,path,'explicit-input-required',reason,evidenceRefs
      ));
      return null;
    }
    return cursor;
  }

  function validateHorn(overrides,preset,missingInputs){
    const reason=
      'The card documents no derivative horn dimensions; provide a complete explicit horn-surface request.';
    const paths=[
      ['horn.schemaVersion',value=>Number(value)===2],
      ['horn.throat.widthM',positive],
      ['horn.throat.heightM',positive],
      ['horn.mouth.widthM',positive],
      ['horn.mouth.heightM',positive],
      ['horn.depthM',positive],
      ['horn.coverageDeg.horizontal',positive],
      ['horn.coverageDeg.vertical',positive],
      ['horn.surfaceLaw.family',value=>!!cleanString(value)],
      ['horn.surfaceLaw.parameters',isObject],
      ['horn.crossSection.family',value=>!!cleanString(value)],
      ['horn.crossSection.parameters',isObject],
      ['horn.azimuthRad',finite],
      ['horn.sampling.axialStationCount',positiveInteger],
      ['horn.sampling.perimeterSampleCount',positiveInteger],
      ['horn.provenanceRefs',value=>
        Array.isArray(value)&&uniqueStrings(value).length>0]
    ];
    for(const [path,validator] of paths)requirePath(
      overrides,path,'horn:'+path,reason,preset.evidenceRefs,
      missingInputs,validator
    );
  }

  function validatePackage(overrides,preset,missingInputs){
    const reason=
      'Package clearances are design and fabrication constraints, not documented reference-card constants.';
    requirePath(
      overrides,'package.globalMarginM','package:global-margin',
      reason,preset.evidenceRefs,missingInputs,nonnegative
    );
    requirePath(
      overrides,'package.componentClearanceM',
      'package:component-clearance',reason,preset.evidenceRefs,
      missingInputs,nonnegative
    );
    if(hasPath(overrides,'package.packageLimitM')&&
        !isObject(overrides.package.packageLimitM))
      missingInputs.push(missing(
        'package:limit','package.packageLimitM',
        'explicit-input-required',
        'If supplied, packageLimitM must be an explicit SI dimension record.',
        preset.evidenceRefs
      ));
  }

  function sourceAndStationMaps(state){
    return {
      sources:new Map(state.sources.map(item=>[item.id,item])),
      stations:new Map(state.entryStations.map(item=>[item.id,item]))
    };
  }

  function validateStationRequirements(
    overrides,state,preset,missingInputs
  ){
    const requirements=overrides.stations&&
        Array.isArray(overrides.stations.stationRequirements)
      ?overrides.stations.stationRequirements:[],
      reason=
        'Each documented wall-entry station still needs explicit legal axial bounds and physical packing spans.';
    if(requirements.length!==state.entryStations.length)
      missingInputs.push(missing(
        'stations:one-to-one','stations.stationRequirements',
        'explicit-input-required',reason,preset.evidenceRefs
      ));
    for(const station of state.entryStations){
      const record=requirements.find(item=>
        item&&item.stationId===station.id);
      if(!record){
        missingInputs.push(missing(
          'station:'+station.id,
          'stations.stationRequirements['+station.id+']',
          'documented-unknown',reason,preset.evidenceRefs
        ));
        continue;
      }
      const fields=[
        ['sourceCount',positiveInteger],
        ['legalIntervalM.minimum',nonnegative],
        ['legalIntervalM.maximum',positive],
        ['selectionMode',value=>[
          'solve','bounded-override','documented-lock'
        ].includes(value)],
        ['requiredAxialSpanM',positive],
        ['requiredCircumferentialSpanPerSourceM',positive],
        ['minimumCircumferentialGapM',nonnegative],
        ['minimumAxialGapM',nonnegative],
        ['distribution',value=>!!cleanString(value)],
        ['provenanceRefs',value=>
          Array.isArray(value)&&uniqueStrings(value).length>0]
      ];
      for(const [field,validator] of fields)requirePath(
        record,field,'station:'+station.id+':'+field,
        reason,preset.evidenceRefs,missingInputs,validator
      );
    }
  }

  function validateApertures(
    overrides,state,preset,missingInputs,derivations,resolved
  ){
    const records=overrides.apertures&&
        Array.isArray(overrides.apertures.sources)
      ?overrides.apertures.sources:[],
      maps=sourceAndStationMaps(state),
      wallSources=[...new Set(state.entryStations.flatMap(
        station=>station.sourceIds
      ))],
      reason=
        'Aperture count, area/compression policy, host fit, shape, spacing, and limits are driver-specific calculations, not card defaults.';
    if(records.length!==wallSources.length)missingInputs.push(missing(
      'apertures:one-to-one','apertures.sources',
      'explicit-input-required',reason,preset.evidenceRefs
    ));
    for(const sourceId of wallSources){
      const record=records.find(item=>item&&item.sourceId===sourceId);
      if(!record){
        missingInputs.push(missing(
          'aperture:'+sourceId,'apertures.sources['+sourceId+']',
          'documented-unknown',reason,preset.evidenceRefs
        ));
        continue;
      }
      const resolvedSource=resolved&&Array.isArray(resolved.sources)
        ?resolved.sources.find(item=>item.sourceId===sourceId):null;
      if(!hasPath(record,'driverEffectiveAreaM2')&&resolvedSource&&
          resolvedSource.driver&&positive(
            resolvedSource.driver.diaphragm.effectiveAreaM2
          )){
        record.driverEffectiveAreaM2=
          resolvedSource.driver.diaphragm.effectiveAreaM2;
        derivations.push({
          path:'apertures.sources['+sourceId+
            '].driverEffectiveAreaM2',
          kind:'documented-driver-record-copy',
          value:record.driverEffectiveAreaM2,
          sourcePath:'driverRecords['+
            resolvedSource.driver.id+'].diaphragm.effectiveAreaM2',
          inferredProductData:false
        });
      }
      const fields=[
        ['candidatePolicy',isObject],
        ['allowedCounts',value=>
          Array.isArray(value)&&value.length>0&&
          value.every(positiveInteger)],
        ['driverEffectiveAreaM2',positive],
        ['areaPolicy',isObject],
        ['compressionRatioBounds.minimum',positive],
        ['compressionRatioBounds.maximum',positive],
        ['host',isObject],
        ['apertureShape',isObject],
        ['limits',isObject],
        ['orientationPolicy',isObject],
        ['placementPolicy',isObject],
        ['upperFrequencyHz',positive],
        ['speedOfSoundMps',positive],
        ['wavelengthSpacingPolicy',value=>!!cleanString(value)],
        ['provenance',isObject]
      ];
      for(const [field,validator] of fields)requirePath(
        record,field,'aperture:'+sourceId+':'+field,
        reason,preset.evidenceRefs,missingInputs,validator
      );
      if(!maps.sources.has(sourceId))missingInputs.push(missing(
        'aperture:unknown-source:'+sourceId,
        'apertures.sources['+sourceId+'].sourceId',
        'identity-mismatch',
        'Aperture ownership must name a wall-entry source in state.',
        preset.evidenceRefs
      ));
    }
  }

  function validateChambersAndPlacements(
    overrides,state,preset,missingInputs
  ){
    const chambers=overrides.chambers&&
        Array.isArray(overrides.chambers.chambers)
      ?overrides.chambers.chambers:[],
      plans=Array.isArray(overrides.placementPlans)
        ?overrides.placementPlans:[],
      reason=
        'Front volume, passage coupling, mount setback, axis, instance positions, and chamber ownership require a driver-specific physical solve.';
    for(const station of state.entryStations){
      for(const sourceId of station.sourceIds){
        const source=state.sources.find(item=>item.id===sourceId),
          plan=plans.find(item=>item&&
            item.sourceId===sourceId&&item.stationId===station.id);
        if(!plan){
          missingInputs.push(missing(
            'placement:'+sourceId,
            'placementPlans['+sourceId+']',
            'documented-unknown',reason,preset.evidenceRefs
          ));
          continue;
        }
        const fields=[
          ['bandId',value=>!!cleanString(value)],
          ['driverOutputId',value=>!!cleanString(value)],
          ['apertureCandidateId',value=>!!cleanString(value)],
          ['mountSetbackM',nonnegative],
          ['distributionFamily',value=>!!cleanString(value)],
          ['axisPolicy',isObject],
          ['diagnosticFrequencyHz',positive],
          ['maximumAllowedSpreadM',nonnegative],
          ['referencePathToDatumM',positive],
          ['pathDatumId',value=>!!cleanString(value)],
          ['pathSettings',isObject],
          ['construction',isObject],
          ['instances',value=>
            Array.isArray(value)&&source&&
            value.length===source.count],
          ['panels',Array.isArray],
          ['provenanceRefs',value=>
            Array.isArray(value)&&uniqueStrings(value).length>0]
        ];
        for(const [field,validator] of fields)requirePath(
          plan,field,'placement:'+sourceId+':'+field,
          reason,preset.evidenceRefs,missingInputs,validator
        );
        const chamberIds=new Set(
          Array.isArray(plan.instances)?plan.instances.map(item=>
            cleanString(item&&item.chamber&&item.chamber.id)
          ).filter(Boolean):[]
        );
        for(const chamberId of chamberIds){
          const chamber=chambers.find(item=>item&&
            item.id===chamberId&&item.sourceId===sourceId&&
            item.stationId===station.id);
          if(!chamber)missingInputs.push(missing(
            'chamber:'+chamberId,
            'chambers.chambers['+chamberId+']',
            'documented-unknown',
            'Every physical driver instance chamber ID must have one explicit chamber-network input.',
            preset.evidenceRefs
          ));
        }
      }
    }
    if(!chambers.length)missingInputs.push(missing(
      'chambers:required','chambers.chambers',
      'documented-unknown',reason,preset.evidenceRefs
    ));
  }

  function validateValidationBlock(
    overrides,path,preset,missingInputs
  ){
    const reason=
      'Geometric tolerances and minimum physical clearance must be declared explicitly for this analysis transaction.';
    const fields=[
      ['positionToleranceM',positive],
      ['sectionToleranceM',positive],
      ['angleToleranceDeg',positive],
      ['azimuthToleranceRad',positive],
      ['minimumDriverClearanceM',nonnegative]
    ];
    for(const [field,validator] of fields)requirePath(
      overrides,path+'.'+field,path+':'+field,reason,
      preset.evidenceRefs,missingInputs,validator
    );
  }

  function validatePassages(overrides,preset,missingInputs){
    const reason=
      'Air properties and passage boundary assumptions must be explicit; the reference card does not define the derivative passage network.';
    const fields=[
      ['passages.acoustics.densityKgM3',positive],
      ['passages.acoustics.speedOfSoundMps',positive],
      ['passages.acoustics.quarterWaveBoundaryAssumption',
        value=>!!cleanString(value)],
      ['passages.acoustics.halfWaveBoundaryAssumption',
        value=>!!cleanString(value)],
      ['passages.acoustics.provenance.classification',
        value=>!!cleanString(value)],
      ['passages.acoustics.provenance.evidenceRefs',
        value=>Array.isArray(value)&&uniqueStrings(value).length>0]
    ];
    for(const [path,validator] of fields)requirePath(
      overrides,path,'passage:'+path,reason,preset.evidenceRefs,
      missingInputs,validator
    );
  }

  function validateRender(overrides,preset,missingInputs,required){
    if(!required&&!isObject(overrides.render))return;
    const reason=
      'Canonical render intents depend on solved stations, physical apertures, passages, and mounts; none are inferred from the card.';
    requirePath(
      overrides,'render.renderIntents','render:intents',reason,
      preset.evidenceRefs,missingInputs,
      isObject
    );
    requirePath(
      overrides,'render.renderIntents.throatInterfaces',
      'render:intents:throat-interfaces',reason,
      preset.evidenceRefs,missingInputs,Array.isArray
    );
    requirePath(
      overrides,'render.renderIntents.stationMarkers',
      'render:intents:station-markers',reason,
      preset.evidenceRefs,missingInputs,Array.isArray
    );
    requirePath(
      overrides,'render.renderIntents.sectionPlane',
      'render:intents:section-plane',reason,
      preset.evidenceRefs,missingInputs,isObject
    );
    requirePath(
      overrides,'render.azimuthSegments','render:segments',reason,
      preset.evidenceRefs,missingInputs,positiveInteger
    );
  }

  function canonicalAnalysisDraft(
    overrides,driverRecords,hasWallEntries
  ){
    const orderedDrivers=cloneValue(driverRecords).sort((left,right)=>
      String(left&&left.id||'').localeCompare(
        String(right&&right.id||'')
      )
    );
    const result={
      driverRecords:orderedDrivers,
      horn:isObject(overrides.horn)?cloneValue(overrides.horn):{},
      stations:hasWallEntries
        ?(isObject(overrides.stations)
          ?cloneValue(overrides.stations):{})
        :{stationRequirements:[]},
      apertures:hasWallEntries
        ?(isObject(overrides.apertures)
          ?cloneValue(overrides.apertures):{})
        :{sources:[]},
      chambers:hasWallEntries
        ?(isObject(overrides.chambers)
          ?cloneValue(overrides.chambers):{})
        :{chambers:[]},
      placementPlans:hasWallEntries&&
          Array.isArray(overrides.placementPlans)
        ?cloneValue(overrides.placementPlans):[],
      interfaceValidation:hasWallEntries&&
          isObject(overrides.interfaceValidation)
        ?cloneValue(overrides.interfaceValidation):{},
      passages:hasWallEntries&&isObject(overrides.passages)
        ?cloneValue(overrides.passages):{},
      mountValidation:hasWallEntries&&
          isObject(overrides.mountValidation)
        ?cloneValue(overrides.mountValidation):{},
      package:isObject(overrides.package)
        ?cloneValue(overrides.package):{},
      coupledNetwork:Array.isArray(overrides.coupledNetwork)
        ?cloneValue(overrides.coupledNetwork):[]
    };
    if(isObject(overrides.render))result.render=cloneValue(overrides.render);
    return result;
  }

  function buildFailure(
    code,preset,cardId,state,stateHashInput,draft,
    missingInputs,diagnostics,derivations
  ){
    const orderedMissing=missingInputs.slice().sort((left,right)=>
        [left.path,left.id].join('\u0000').localeCompare(
          [right.path,right.id].join('\u0000')
        )
      ),
      orderedDiagnostics=diagnostics.slice().sort((left,right)=>
        [left.code,left.paths.join('\u0000'),left.message]
          .join('\u0001').localeCompare(
            [right.code,right.paths.join('\u0000'),right.message]
              .join('\u0001')
          )
      );
    return deepFreeze({
      ok:false,
      available:false,
      code,
      presetId:preset?preset.id:null,
      referenceCardId:cardId,
      topology:preset?preset.topology:
        cleanString(state&&state.topology&&state.topology.kind),
      state:state||null,
      stateHashInput:stateHashInput||null,
      analysisInput:null,
      analysisInputDraft:draft||null,
      missingInputs:orderedMissing,
      diagnostics:orderedDiagnostics,
      derivations:derivations.slice().sort((left,right)=>
        String(left.path||'').localeCompare(String(right.path||''))
      ),
      readiness:{
        topology:!!state&&!orderedDiagnostics.some(item=>
          item.severity==='error'&&item.code!==
            FAILURE_CODES.DRIVER_RECORD_INVALID),
        drivers:false,
        solverInput:false,
        preview:false,
        exactSolid:false,
        manufacturing:false,
        stl:false
      },
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function buildAnalysisPreset(rawInput){
    const input=isObject(rawInput)?rawInput:{},
      diagnostics=[],
      missingInputs=[],
      derivations=[],
      dependencies={
        stateContract:input.stateContract||DefaultStateContract,
        driverDb:input.driverDb||DefaultDriverDb,
        referenceCards:input.referenceCards||DefaultReferenceCards
      };
    if(!dependencies.stateContract||
        typeof dependencies.stateContract.normalizeThreeWayState!==
          'function'||!dependencies.driverDb||
        typeof dependencies.driverDb.createDriverRegistry!=='function'||
        typeof dependencies.driverDb.resolveSourceDrivers!=='function'||
        !dependencies.referenceCards||
        typeof dependencies.referenceCards.getReferenceCard!=='function')
      return buildFailure(
        FAILURE_CODES.DEPENDENCY_UNAVAILABLE,null,null,null,null,null,[],
        [diagnostic(
          FAILURE_CODES.DEPENDENCY_UNAVAILABLE,'error',
          ['dependencies'],
          'State contract, driver database, and reference-card catalog are required.'
        )],[]
      );
    if(!isObject(input.state)||!Array.isArray(input.driverRecords))
      return buildFailure(
        FAILURE_CODES.INPUT_INVALID,null,null,null,null,null,[],
        [diagnostic(
          FAILURE_CODES.INPUT_INVALID,'error',
          ['state','driverRecords'],
          'A schema-2 state and an explicit driver-record array are required.'
        )],[]
      );
    const finiteInput=stableStringify({
      state:input.state,
      driverRecords:input.driverRecords,
      sourceDriverRefs:input.sourceDriverRefs||{},
      analysisOverrides:input.analysisOverrides||{},
      requirePreview:input.requirePreview===true
    });
    if(!finiteInput)return buildFailure(
      FAILURE_CODES.INPUT_INVALID,null,null,null,null,null,[],
      [diagnostic(
        FAILURE_CODES.INPUT_INVALID,'error',['input'],
        'Preset input must contain only finite inert JSON data.'
      )],[]
    );
    const initial=dependencies.stateContract
        .normalizeThreeWayState(input.state),
      initialState=initial&&initial.state,
      requestedCardId=cleanString(input.referenceCardId)||
        cardIdFromState(initialState),
      preset=getPresetDefinition(
        cleanString(input.presetId)||requestedCardId
      );
    if(!requestedCardId)return buildFailure(
      FAILURE_CODES.REFERENCE_CARD_REQUIRED,null,null,
      initialState,initial&&initial.hashInput,null,[
        missing(
          'reference-card','state.intent.referenceCardId',
          'explicit-input-required',
          'A reference-card identity is required; topology alone is not a product preset.',
          []
        )
      ],[diagnostic(
        FAILURE_CODES.REFERENCE_CARD_REQUIRED,'error',
        ['state.intent.referenceCardId',
          'state.research.referenceCardIds'],
        'No unambiguous reference-card identity is present.'
      )],[]
    );
    if(!preset){
      const staticRecord=STATIC_CARD_AVAILABILITY[requestedCardId];
      return buildFailure(
        staticRecord?staticRecord.code:
          FAILURE_CODES.REFERENCE_CARD_UNSUPPORTED,
        null,requestedCardId,initialState,initial&&initial.hashInput,
        null,[missing(
          'reference-card-unsupported','state.intent.referenceCardId',
          'unsupported-reference',
          staticRecord?staticRecord.reason:
            'This reference card has no conventional T3/CX3/H3 preset adapter.',
          []
        )],[diagnostic(
          staticRecord?staticRecord.code:
            FAILURE_CODES.REFERENCE_CARD_UNSUPPORTED,
          'error',['state.intent.referenceCardId'],
          staticRecord?staticRecord.reason:
            'Unsupported reference card: '+requestedCardId+'.'
        )],[]
      );
    }
    if(requestedCardId!==preset.referenceCardId)
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATE_MISMATCH,'error',
        ['referenceCardId','presetId'],
        'Preset '+preset.id+' belongs to card '+
          preset.referenceCardId+', not '+requestedCardId+'.'
      ));
    if(!initial||initial.valid!==true)
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATE_INVALID,'error',['state'],
        'The supplied reference-card state is not a valid normalized schema-2 topology.'
      ));
    validatePresetGraph(initialState,preset,diagnostics);
    const boundSource=bindDrivers(
        initialState,input.sourceDriverRefs,diagnostics,missingInputs
      ),
      normalized=dependencies.stateContract
        .normalizeThreeWayState(boundSource),
      state=normalized.state,
      registry=dependencies.driverDb.createDriverRegistry(
        input.driverRecords
      );
    if(!registry||registry.ok!==true)
      diagnostics.push(diagnostic(
        FAILURE_CODES.DRIVER_RECORD_INVALID,'error',
        ['driverRecords'],
        'Every selected driver record must pass the explicit driver database boundary.'
      ));
    let resolved=null;
    if(registry&&registry.ok===true){
      resolved=dependencies.driverDb.resolveSourceDrivers(state,registry);
      if(!resolved||resolved.ok!==true)
        diagnostics.push(diagnostic(
          FAILURE_CODES.DRIVER_BINDING_REQUIRED,'error',
          ['state.sources[].driverRef','driverRecords'],
          'Every reference-card source must bind to one compatible explicit driver record.'
        ));
    }
    const overrides=isObject(input.analysisOverrides)
        ?cloneValue(input.analysisOverrides):{},
      hasWallEntries=state.entryStations.length>0;
    validateHorn(overrides,preset,missingInputs);
    validatePackage(overrides,preset,missingInputs);
    if(hasWallEntries){
      validateStationRequirements(
        overrides,state,preset,missingInputs
      );
      validateApertures(
        overrides,state,preset,missingInputs,derivations,resolved
      );
      validateChambersAndPlacements(
        overrides,state,preset,missingInputs
      );
      validateValidationBlock(
        overrides,'interfaceValidation',preset,missingInputs
      );
      validateValidationBlock(
        overrides,'mountValidation',preset,missingInputs
      );
      validatePassages(overrides,preset,missingInputs);
    }
    validateRender(
      overrides,preset,missingInputs,input.requirePreview===true
    );
    const draft=canonicalAnalysisDraft(
      overrides,input.driverRecords,hasWallEntries
    );
    if(stableStringify(draft)===null)
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,'error',['analysisOverrides'],
        'The physical-analysis override record must be finite inert JSON.'
      ));
    const hasErrors=diagnostics.some(item=>item.severity==='error');
    if(hasErrors||missingInputs.length)return buildFailure(
      hasErrors
        ?diagnostics[0].code
        :FAILURE_CODES.EXPLICIT_INPUTS_REQUIRED,
      preset,requestedCardId,state,normalized.hashInput,draft,
      missingInputs,diagnostics,derivations
    );
    const analysisInput=deepFreeze(cloneValue(draft));
    return deepFreeze({
      ok:true,
      available:true,
      code:null,
      presetId:preset.id,
      referenceCardId:requestedCardId,
      topology:preset.topology,
      state,
      stateHashInput:normalized.hashInput,
      analysisInput,
      analysisInputDraft:analysisInput,
      missingInputs:[],
      diagnostics:[],
      derivations:derivations.slice().sort((left,right)=>
        left.path.localeCompare(right.path)
      ),
      readiness:{
        topology:true,
        drivers:true,
        solverInput:true,
        preview:isObject(analysisInput.render),
        exactSolid:false,
        manufacturing:false,
        stl:false
      },
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function inspectPresetAvailability(input){
    return buildAnalysisPreset(input);
  }

  return deepFreeze({
    version:VERSION,
    schemaVersion:SCHEMA_VERSION,
    presetIds:PRESET_IDS,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    listPresetDefinitions,
    getPresetDefinition,
    inspectPresetAvailability,
    buildAnalysisPreset,
    stableStringify
  });
});
