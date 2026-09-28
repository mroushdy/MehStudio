/* MEH Studio v5 — explicit three-way driver-record boundary.

   This module is deliberately a validator/registry, not a catalogue of
   remembered products.  Callers supply measured or documented records and
   provenance IDs.  Missing dimensions, T/S values, acoustic datums, throat
   areas, and mounting features remain unavailable; none are inferred from a
   product name, nominal diameter, photograph, or another dimension.

   Records use SI units.  Display conversions belong to the UI. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3DriverDB=factory();
})(function(){
  'use strict';

  const SCHEMA_VERSION=1;
  const RECORD_KINDS=Object.freeze([
    'cone','compression','coaxial','dual-diaphragm','research'
  ]);
  const BAND_IDS=Object.freeze(['low','mid','high']);
  const FAILURE_CODES=Object.freeze({
    RECORD_INVALID:'THREEWAY_DRIVER_RECORD_INVALID',
    RECORD_DUPLICATE:'THREEWAY_DRIVER_RECORD_DUPLICATE',
    RECORD_NOT_FOUND:'THREEWAY_DRIVER_RECORD_NOT_FOUND',
    RECORD_INCOMPLETE:'THREEWAY_DRIVER_RECORD_INCOMPLETE',
    ENVELOPE_INCOMPLETE:'THREEWAY_DRIVER_ENVELOPE_INCOMPLETE',
    BAND_UNSUPPORTED:'THREEWAY_DRIVER_BAND_UNSUPPORTED',
    SOURCE_INVALID:'THREEWAY_DRIVER_SOURCE_INVALID',
    PROVENANCE_REQUIRED:'THREEWAY_PROVENANCE_REQUIRED'
  });
  const CAPABILITIES=deepFreeze({
    status:'explicit-driver-records-only',
    recordValidation:true,
    deterministicRegistry:true,
    sourceResolution:true,
    dimensionalInference:false,
    productNameInference:false,
    imageInference:false,
    geometrySolve:false,
    responseSolve:false,
    manufacturingPlan:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'Driver records describe evidence and envelopes only; they are not mount solids or manufacturing authority.'
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

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function finitePositive(value){
    const number=Number(value);
    return Number.isFinite(number)&&number>0?number:null;
  }

  function finiteNonnegative(value){
    const number=Number(value);
    return Number.isFinite(number)&&number>=0?number:null;
  }

  function positiveInteger(value){
    const number=Number(value);
    return Number.isInteger(number)&&number>0?number:null;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function normalizeBands(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(id=>
      BAND_IDS.includes(id)
    ))].sort((left,right)=>BAND_IDS.indexOf(left)-BAND_IDS.indexOf(right));
  }

  function diagnostic(code,severity,paths,message){
    return deepFreeze({
      code,
      severity,
      phase:'driver-record',
      paths:uniqueStrings(paths),
      message,
      blocksCapabilities:
        severity==='error'?['analysis','preview','mount','manufacturing']:[]
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

  function normalizeFrame(raw,diagnostics,path){
    const frame=isObject(raw)?cloneValue(raw):{},
      shape=cleanString(frame.shape),
      diameterM=finitePositive(frame.diameterM),
      widthM=finitePositive(frame.widthM),
      heightM=finitePositive(frame.heightM),
      depthM=finitePositive(frame.depthM);
    if(!shape)diagnostics.push(diagnostic(
      FAILURE_CODES.ENVELOPE_INCOMPLETE,'error',[path+'.shape'],
      'The physical frame/envelope shape is required.'
    ));
    const round=shape==='round',
      rectangular=shape==='rectangle'||shape==='rounded-rectangle'||
        shape==='square';
    if(round&&diameterM===null)diagnostics.push(diagnostic(
      FAILURE_CODES.ENVELOPE_INCOMPLETE,'error',[path+'.diameterM'],
      'A round frame requires an explicit physical diameter.'
    ));
    if(rectangular&&(widthM===null||heightM===null))
      diagnostics.push(diagnostic(
        FAILURE_CODES.ENVELOPE_INCOMPLETE,'error',
        [path+'.widthM',path+'.heightM'],
        'A rectangular frame requires explicit width and height.'
      ));
    if(shape&&!round&&!rectangular)diagnostics.push(diagnostic(
      FAILURE_CODES.RECORD_INVALID,'error',[path+'.shape'],
      'Frame shape must be round, square, rectangle, or rounded-rectangle.'
    ));
    if(depthM===null)diagnostics.push(diagnostic(
      FAILURE_CODES.ENVELOPE_INCOMPLETE,'error',[path+'.depthM'],
      'Full body depth behind the mounting datum is required for packing.'
    ));
    return {
      shape,
      diameterM,
      widthM,
      heightM,
      cornerRadiusM:finiteNonnegative(frame.cornerRadiusM),
      depthM,
      frontProjectionM:finiteNonnegative(frame.frontProjectionM),
      metadata:isObject(frame.metadata)?cloneValue(frame.metadata):{}
    };
  }

  function normalizeDatum(raw,diagnostics,path){
    const datum=isObject(raw)?cloneValue(raw):{},
      kind=cleanString(datum.kind),
      offsetM=finiteNonnegative(datum.offsetM);
    if(!kind||offsetM===null)diagnostics.push(diagnostic(
      FAILURE_CODES.RECORD_INCOMPLETE,'error',
      [path+'.kind',path+'.offsetM'],
      'An acoustic datum kind and nonnegative offset from the mounting plane are required.'
    ));
    return {kind,offsetM};
  }

  function normalizeDiaphragm(raw,diagnostics,path){
    const record=isObject(raw)?cloneValue(raw):{},
      effectiveAreaM2=finitePositive(record.effectiveAreaM2),
      activeDiameterM=finitePositive(record.activeDiameterM),
      maxLinearExcursionM=finiteNonnegative(record.maxLinearExcursionM);
    if(effectiveAreaM2===null)diagnostics.push(diagnostic(
      FAILURE_CODES.RECORD_INCOMPLETE,'error',[path+'.effectiveAreaM2'],
      'Effective radiating area must be explicit; it is not inferred from diameter.'
    ));
    return {
      effectiveAreaM2,
      activeDiameterM,
      maxLinearExcursionM,
      geometry:isObject(record.geometry)?cloneValue(record.geometry):{},
      provenanceRefs:uniqueStrings(record.provenanceRefs)
    };
  }

  function normalizeOutput(raw,index,diagnostics,path){
    const output=isObject(raw)?cloneValue(raw):{},
      id=cleanString(output.id),
      bandIds=normalizeBands(output.bandIds),
      kind=cleanString(output.kind),
      geometry=isObject(output.geometry)?cloneValue(output.geometry):{},
      shape=cleanString(geometry.shape),
      diameterM=finitePositive(geometry.diameterM),
      widthM=finitePositive(geometry.widthM),
      heightM=finitePositive(geometry.heightM),
      areaM2=finitePositive(geometry.areaM2);
    if(!id||!bandIds.length||!kind)diagnostics.push(diagnostic(
      FAILURE_CODES.RECORD_INVALID,'error',
      [path+'.id',path+'.bandIds',path+'.kind'],
      'Every acoustic output needs an ID, one or more bands, and a kind.'
    ));
    if(!shape||areaM2===null)diagnostics.push(diagnostic(
      FAILURE_CODES.RECORD_INCOMPLETE,'error',
      [path+'.geometry.shape',path+'.geometry.areaM2'],
      'Output shape and acoustic area must be explicit.'
    ));
    if(shape==='round'&&diameterM===null)diagnostics.push(diagnostic(
      FAILURE_CODES.RECORD_INCOMPLETE,'error',
      [path+'.geometry.diameterM'],
      'A round output requires an explicit diameter; area alone is not inverted.'
    ));
    if((shape==='rectangle'||shape==='rounded-rectangle')&&
        (widthM===null||heightM===null))diagnostics.push(diagnostic(
      FAILURE_CODES.RECORD_INCOMPLETE,'error',
      [path+'.geometry.widthM',path+'.geometry.heightM'],
      'A rectangular output requires explicit width and height.'
    ));
    return {
      id,
      index,
      bandIds,
      kind,
      geometry:{
        shape,
        diameterM,
        widthM,
        heightM,
        cornerRadiusM:finiteNonnegative(geometry.cornerRadiusM),
        areaM2
      },
      acousticDatum:normalizeDatum(
        output.acousticDatum,diagnostics,path+'.acousticDatum'
      ),
      provenanceRefs:uniqueStrings(output.provenanceRefs)
    };
  }

  function normalizeTs(raw){
    const record=isObject(raw)?raw:{};
    return {
      fsHz:finitePositive(record.fsHz),
      vasM3:finitePositive(record.vasM3),
      qts:finitePositive(record.qts),
      qes:finitePositive(record.qes),
      qms:finitePositive(record.qms),
      reOhm:finitePositive(record.reOhm),
      leH:finiteNonnegative(record.leH),
      blTm:finitePositive(record.blTm),
      mmsKg:finitePositive(record.mmsKg),
      cmsMPerN:finitePositive(record.cmsMPerN),
      rmsNsPerM:finiteNonnegative(record.rmsNsPerM),
      sdM2:finitePositive(record.sdM2),
      xmaxM:finiteNonnegative(record.xmaxM),
      provenanceRefs:uniqueStrings(record.provenanceRefs)
    };
  }

  function tsReadiness(ts){
    const lumped=['reOhm','blTm','mmsKg','cmsMPerN','rmsNsPerM','sdM2'],
      thieleSmall=['fsHz','vasM3','qts','reOhm','sdM2'];
    return {
      lumpedDriverTerms:lumped.every(key=>ts[key]!==null),
      thieleSmall:thieleSmall.every(key=>ts[key]!==null),
      excursion:ts.xmaxM!==null
    };
  }

  function normalizeMounting(raw){
    const mounting=isObject(raw)?cloneValue(raw):{};
    return {
      datum:cleanString(mounting.datum),
      cutout:isObject(mounting.cutout)?cloneValue(mounting.cutout):null,
      boltCircle:isObject(mounting.boltCircle)
        ?cloneValue(mounting.boltCircle):null,
      fasteners:Array.isArray(mounting.fasteners)
        ?mounting.fasteners.map(cloneValue):[],
      gasket:isObject(mounting.gasket)?cloneValue(mounting.gasket):null,
      provenanceRefs:uniqueStrings(mounting.provenanceRefs)
    };
  }

  function validateDriverRecord(input){
    const raw=isObject(input)?input:{},
      diagnostics=[],
      schemaVersion=Number(raw.schemaVersion),
      id=cleanString(raw.id),
      revision=positiveInteger(raw.revision),
      kind=cleanString(raw.kind),
      bandIds=normalizeBands(raw.bandIds),
      provenanceRefs=uniqueStrings(raw.provenanceRefs);
    if(schemaVersion!==SCHEMA_VERSION)diagnostics.push(diagnostic(
      FAILURE_CODES.RECORD_INVALID,'error',['schemaVersion'],
      'Driver record schemaVersion must be '+SCHEMA_VERSION+'.'
    ));
    if(!id||revision===null||!kind||!RECORD_KINDS.includes(kind)||
        !bandIds.length)diagnostics.push(diagnostic(
      FAILURE_CODES.RECORD_INVALID,'error',
      ['id','revision','kind','bandIds'],
      'Driver ID, positive revision, supported kind, and explicit bands are required.'
    ));
    if(!provenanceRefs.length)diagnostics.push(diagnostic(
      FAILURE_CODES.PROVENANCE_REQUIRED,'error',['provenanceRefs'],
      'At least one provenance record ID is required for a driver record.'
    ));
    const frame=normalizeFrame(raw.frame,diagnostics,'frame'),
      diaphragm=normalizeDiaphragm(
        raw.diaphragm,diagnostics,'diaphragm'
      ),
      outputs=(Array.isArray(raw.outputs)?raw.outputs:[]).map(
        (item,index)=>normalizeOutput(
          item,index,diagnostics,'outputs['+index+']'
        )
      ),
      outputIds=new Set();
    for(let index=0;index<outputs.length;index++){
      const output=outputs[index];
      if(output.id&&outputIds.has(output.id))diagnostics.push(diagnostic(
        FAILURE_CODES.RECORD_INVALID,'error',['outputs['+index+'].id'],
        'Acoustic output IDs must be unique within a driver record.'
      ));
      if(output.id)outputIds.add(output.id);
    }
    for(const band of bandIds){
      if(!outputs.some(output=>output.bandIds.includes(band)))
        diagnostics.push(diagnostic(
          FAILURE_CODES.RECORD_INCOMPLETE,'error',['outputs'],
          'Every declared driver band must be owned by an explicit acoustic output: '+band+'.'
        ));
    }
    for(const output of outputs){
      for(const band of output.bandIds){
        if(!bandIds.includes(band))diagnostics.push(diagnostic(
          FAILURE_CODES.BAND_UNSUPPORTED,'error',['outputs'],
          'An output may not claim a band absent from driver.bandIds: '+band+'.'
        ));
      }
    }
    const ts=normalizeTs(raw.ts),
      normalized=deepFreeze({
        schemaVersion:SCHEMA_VERSION,
        id,
        revision,
        manufacturer:cleanString(raw.manufacturer),
        model:cleanString(raw.model),
        kind,
        bandIds,
        frame,
        diaphragm,
        outputs:outputs.sort((left,right)=>
          String(left.id||'').localeCompare(String(right.id||''))
        ),
        mounting:normalizeMounting(raw.mounting),
        ts,
        limits:isObject(raw.limits)?cloneValue(raw.limits):{},
        provenanceRefs,
        notes:Array.isArray(raw.notes)
          ?raw.notes.map(cleanString).filter(Boolean):[]
      }),
      orderedDiagnostics=diagnostics.slice().sort((left,right)=>
        [left.code,left.paths.join('\u0000'),left.message].join('\u0001')
          .localeCompare(
            [right.code,right.paths.join('\u0000'),right.message]
              .join('\u0001')
          )
      ),
      valid=!orderedDiagnostics.some(item=>item.severity==='error'),
      tsReady=tsReadiness(ts);
    return deepFreeze({
      ok:valid,
      code:valid?null:FAILURE_CODES.RECORD_INVALID,
      record:normalized,
      diagnostics:orderedDiagnostics,
      readiness:{
        identity:!!id&&revision!==null,
        packing:valid&&frame.depthM!==null,
        acousticOutput:valid&&outputs.length>0,
        lumpedDriverTerms:valid&&tsReady.lumpedDriverTerms,
        thieleSmall:valid&&tsReady.thieleSmall,
        excursion:valid&&tsReady.excursion,
        mountSolid:false,
        manufacturing:false
      },
      canonical:stableStringify(normalized),
      capabilities:CAPABILITIES
    });
  }

  function createDriverRegistry(records){
    const supplied=Array.isArray(records)?records:[],
      results=supplied.map(validateDriverRecord),
      diagnostics=[],
      map=new Map();
    for(const result of results){
      diagnostics.push(...result.diagnostics);
      const id=result.record.id;
      if(!id)continue;
      if(map.has(id)){
        diagnostics.push(diagnostic(
          FAILURE_CODES.RECORD_DUPLICATE,'error',['records'],
          'Driver registry IDs must be unique: '+id+'.'
        ));
        continue;
      }
      map.set(id,result);
    }
    const ids=[...map.keys()].sort(),
      frozenRecords=ids.map(id=>map.get(id).record),
      orderedDiagnostics=diagnostics.slice().sort((left,right)=>
        [left.code,left.paths.join('\u0000'),left.message].join('\u0001')
          .localeCompare(
            [right.code,right.paths.join('\u0000'),right.message]
              .join('\u0001')
          )
      ),
      ok=results.length===supplied.length&&
        results.every(result=>result.ok)&&
        !orderedDiagnostics.some(item=>item.code===
          FAILURE_CODES.RECORD_DUPLICATE);
    function get(id){
      const key=cleanString(id),result=key?map.get(key):null;
      return result&&result.ok?result.record:null;
    }
    return deepFreeze({
      ok,
      code:ok?null:FAILURE_CODES.RECORD_INVALID,
      ids,
      records:frozenRecords,
      diagnostics:orderedDiagnostics,
      get,
      canonical:stableStringify(frozenRecords),
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function resolveSourceDrivers(state,registry){
    const sources=isObject(state)&&Array.isArray(state.sources)
        ?state.sources:[],
      lookup=registry&&typeof registry.get==='function'
        ?registry.get:null,
      diagnostics=[],
      resolved=[];
    if(!lookup)diagnostics.push(diagnostic(
      FAILURE_CODES.RECORD_INVALID,'error',['registry'],
      'A validated driver registry is required.'
    ));
    for(let index=0;index<sources.length;index++){
      const source=isObject(sources[index])?sources[index]:{},
        sourceId=cleanString(source.id),
        driverRef=cleanString(source.driverRef),
        count=positiveInteger(source.count),
        sourceBands=normalizeBands(source.bandIds),
        driver=lookup&&driverRef?lookup(driverRef):null;
      if(!sourceId||!driverRef||count===null)diagnostics.push(diagnostic(
        FAILURE_CODES.SOURCE_INVALID,'error',
        ['sources['+index+'].id','sources['+index+'].driverRef',
          'sources['+index+'].count'],
        'Every source needs an ID, explicit driverRef, and positive count.'
      ));
      if(driverRef&&!driver)diagnostics.push(diagnostic(
        FAILURE_CODES.RECORD_NOT_FOUND,'error',
        ['sources['+index+'].driverRef'],
        'Driver record not found or invalid: '+driverRef+'.'
      ));
      const unsupported=driver
        ?sourceBands.filter(band=>!driver.bandIds.includes(band)):sourceBands;
      if(driver&&unsupported.length)diagnostics.push(diagnostic(
        FAILURE_CODES.BAND_UNSUPPORTED,'error',
        ['sources['+index+'].bandIds'],
        'Driver '+driver.id+' does not declare source bands: '+
          unsupported.join(', ')+'.'
      ));
      resolved.push({
        sourceId,
        driverRef,
        count,
        bandIds:sourceBands,
        driver,
        totalEffectiveAreaM2:
          driver&&count!==null&&driver.diaphragm.effectiveAreaM2!==null
            ?count*driver.diaphragm.effectiveAreaM2:null
      });
    }
    const orderedDiagnostics=diagnostics.slice().sort((left,right)=>
        [left.code,left.paths.join('\u0000'),left.message].join('\u0001')
          .localeCompare(
            [right.code,right.paths.join('\u0000'),right.message]
              .join('\u0001')
          )
      ),
      ok=!orderedDiagnostics.some(item=>item.severity==='error');
    return deepFreeze({
      ok,
      code:ok?null:FAILURE_CODES.SOURCE_INVALID,
      sources:resolved.sort((left,right)=>
        String(left.sourceId||'').localeCompare(String(right.sourceId||''))
      ),
      diagnostics:orderedDiagnostics,
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'driver-mount-solid',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    schemaVersion:SCHEMA_VERSION,
    recordKinds:RECORD_KINDS,
    bandIds:BAND_IDS,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    stableStringify,
    validateDriverRecord,
    createDriverRegistry,
    resolveSourceDrivers,
    manufacturingPreflight
  });
});
