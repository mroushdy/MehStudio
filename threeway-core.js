/* MEH Studio v5 — three-way analysis-core boundary, schema 1.

   This module intentionally owns no renderer, mesh, driver mount, chamber,
   Boolean subtraction, or manufacturing export. It only:

   - normalizes explicit three-band/shared-horn inputs;
   - preserves their source classification and revision metadata;
   - evaluates wavelength, path-spread, adjacent-arrival, quarter-wave-null,
     and explicit aperture/local-area ratios; and
   - refuses manufacturing capability until a future exact three-way solid
     system is independently implemented and certified.

   Product photographs and envelope records are never converted into internal
   geometry here. All dimensional invariants require explicit caller inputs. */
(function(factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else if(typeof globalThis!=='undefined') globalThis.MEH3=factory();
})(function(){
  'use strict';

  const SCHEMA_VERSION=1;
  const SPEED_OF_SOUND_MPS=343;
  const PROVENANCE_CLASSIFICATIONS=Object.freeze([
    'documented',
    'calculated-adaptation',
    'envelope-study',
    'adjacent'
  ]);
  const BAND_IDS=Object.freeze(['low','mid','high']);
  const BAND_ALIASES=Object.freeze({
    low:'low',lf:'low',woofer:'low',woof:'low',
    mid:'mid',mf:'mid',midrange:'mid',
    high:'high',hf:'high',cd:'high',compression:'high'
  });
  const TOPOLOGY_ALIASES=Object.freeze({
    '3way':'shared-horn-three-band',
    'threeway':'shared-horn-three-band',
    'three-way':'shared-horn-three-band',
    'shared-horn':'shared-horn-three-band',
    'shared-horn-three-band':'shared-horn-three-band',
    'stepped-summation':'shared-horn-three-band',
    'dual-diaphragm-throat-tapped-lf':'dual-diaphragm-throat-tapped-lf',
    'hinson-hybrid':'dual-diaphragm-throat-tapped-lf',
    'coax-throat-tapped-lf':'dual-diaphragm-throat-tapped-lf',
    'envelope-study':'envelope-study',
    'adjacent':'adjacent-architecture',
    'adjacent-architecture':'adjacent-architecture'
  });
  const TOPOLOGIES=deepFreeze({
    'shared-horn-three-band':{
      analysisMode:'shared-horn-paths',
      pathAnalysisSupported:true,
      bandRoles:{low:'wall-entry',mid:'wall-entry',high:'throat'}
    },
    'dual-diaphragm-throat-tapped-lf':{
      analysisMode:'hybrid-shared-horn-paths',
      pathAnalysisSupported:true,
      bandRoles:{low:'wall-entry',mid:'throat-module',high:'throat-module'}
    },
    'envelope-study':{
      analysisMode:'envelope-only',
      pathAnalysisSupported:false,
      bandRoles:{low:'unspecified',mid:'unspecified',high:'unspecified'}
    },
    'adjacent-architecture':{
      analysisMode:'catalog-only',
      pathAnalysisSupported:false,
      bandRoles:{low:'unspecified',mid:'unspecified',high:'unspecified'}
    }
  });
  const EQUATION_CATALOG=deepFreeze({
    wavelength:{
      id:'shared-horn.wavelength.v1',
      equation:'lambda = c / f',
      status:'physical-identity',
      units:{c:'m/s',f:'Hz',lambda:'m'}
    },
    pathPhase:{
      id:'shared-horn.path-phase.v1',
      equation:'phase_deg = 360 * f * delta_path / c',
      status:'physical-identity',
      units:{f:'Hz',delta_path:'m',phase_deg:'deg'}
    },
    quarterWaveNull:{
      id:'shared-horn.quarter-wave-null.v1',
      equation:'f_null = c / (4 * reflection_path)',
      status:'documented-design-relation',
      sources:[
        'US 6,411,718 / US 2002/0106097 — shared-horn entry/crossover relation',
        'Scott Hinson, Multiple Entry Horns (2022) — tap-to-apex reflection notch'
      ],
      units:{c:'m/s',reflection_path:'m',f_null:'Hz'}
    },
    apertureAreaRatio:{
      id:'shared-horn.aperture-area-ratio.v1',
      equation:'area_ratio = summed_aperture_area / local_horn_area',
      status:'documented-design-relation',
      sources:[
        'US 6,411,718 / US 2002/0106097 — summed entry area at a horn station'
      ],
      units:{summed_aperture_area:'m^2',local_horn_area:'m^2'}
    }
  });
  const CAPABILITIES=deepFreeze({
    status:'analysis-core-only',
    inputNormalization:true,
    provenancePreservation:true,
    bandOrdering:true,
    pathInvariants:true,
    quarterWaveNull:true,
    explicitAreaRatio:true,
    manufacturingSolids:false,
    driverMountSolids:false,
    chamberSolids:false,
    tapBooleanSubtraction:false,
    watertightManufacturingAudit:false,
    manufacturingExport:false,
    stlExport:false,
    reason:'Stage 1 has no exact Boolean-integrated three-way manufacturing geometry.'
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
  function firstDefined(){
    for(const value of arguments)if(value!==undefined&&value!==null)return value;
    return undefined;
  }
  function finiteNonnegative(value){
    const number=Number(value);
    return Number.isFinite(number)&&number>=0?number:null;
  }
  function finitePositive(value){
    const number=Number(value);
    return Number.isFinite(number)&&number>0?number:null;
  }
  function diagnostic(code,severity,path,message){
    return Object.freeze({code,severity,path,message});
  }
  function normalizeBandId(value){
    const key=cleanString(value);
    return key?BAND_ALIASES[key.toLowerCase()]||null:null;
  }
  function normalizeProvenance(value,fallback){
    let record={};
    if(typeof fallback==='string')record.classification=fallback;
    else if(isObject(fallback))record=cloneValue(fallback);
    if(typeof value==='string')record.classification=value;
    else if(isObject(value))Object.assign(record,cloneValue(value));
    const classification=cleanString(record.classification),
      recognized=!!classification&&
        PROVENANCE_CLASSIFICATIONS.includes(classification);
    record.classification=classification;
    record.recognizedClassification=recognized;
    return deepFreeze(record);
  }
  function topologyValue(input){
    const value=firstDefined(input.topology,input.topo,input.family);
    if(isObject(value))
      return firstDefined(value.id,value.key,value.kind,value.family);
    return value;
  }
  function normalizeTopology(input,diagnostics){
    const requested=cleanString(topologyValue(input));
    if(!requested){
      diagnostics.push(diagnostic(
        'THREEWAY_TOPOLOGY_REQUIRED','error','topology',
        'An explicit three-way topology is required; no commercial family is assumed.'
      ));
      return deepFreeze({
        requested:null,canonical:null,supported:false,
        analysisMode:'unavailable',pathAnalysisSupported:false
      });
    }
    const canonical=TOPOLOGY_ALIASES[requested.toLowerCase()]||null,
      record=canonical?TOPOLOGIES[canonical]:null;
    if(!record)diagnostics.push(diagnostic(
      'THREEWAY_TOPOLOGY_UNSUPPORTED','error','topology',
      'Unsupported three-way topology: '+requested
    ));
    return deepFreeze({
      requested,
      canonical,
      supported:!!record,
      analysisMode:record?record.analysisMode:'unavailable',
      pathAnalysisSupported:!!(record&&record.pathAnalysisSupported)
    });
  }
  function crossoverInput(input,key){
    const cross=isObject(input.crossovers)?input.crossovers:{},
      derived=isObject(input.fxDerived)?input.fxDerived:{};
    if(key==='lowMid')return firstDefined(
      cross.lowMidHz,cross.lfMfHz,cross.lowToMidHz,
      input.lowMidHz,input.lfMfHz,derived.lo
    );
    return firstDefined(
      cross.midHighHz,cross.mfHfHz,cross.midToHighHz,
      input.midHighHz,input.mfHfHz,derived.hi
    );
  }
  function normalizeCrossovers(input,diagnostics){
    const lowRaw=crossoverInput(input,'lowMid'),
      highRaw=crossoverInput(input,'midHigh'),
      lowMidHz=finitePositive(lowRaw),
      midHighHz=finitePositive(highRaw);
    if(lowMidHz===null)diagnostics.push(diagnostic(
      'LOW_MID_CROSSOVER_REQUIRED','unavailable','crossovers.lowMidHz',
      'A positive LF-to-MF acoustic crossover is required for band/path analysis.'
    ));
    if(midHighHz===null)diagnostics.push(diagnostic(
      'MID_HIGH_CROSSOVER_REQUIRED','unavailable','crossovers.midHighHz',
      'A positive MF-to-HF acoustic crossover is required for band/path analysis.'
    ));
    const ordered=lowMidHz!==null&&midHighHz!==null&&midHighHz>lowMidHz;
    if(lowMidHz!==null&&midHighHz!==null&&!ordered)
      diagnostics.push(diagnostic(
        'CROSSOVER_ORDER_INVALID','error','crossovers',
        'The MF-to-HF crossover must be above the LF-to-MF crossover.'
      ));
    return deepFreeze({
      lowMidHz,
      midHighHz,
      ordered,
      ratio:ordered?midHighHz/lowMidHz:null,
      midBandOctaves:ordered?Math.log2(midHighHz/lowMidHz):null
    });
  }
  function rawBands(input){
    if(Array.isArray(input.bands)){
      const result={};
      for(const item of input.bands){
        if(!isObject(item))continue;
        const id=normalizeBandId(firstDefined(item.id,item.band,item.role));
        if(id&&!result[id])result[id]=item;
      }
      return result;
    }
    if(isObject(input.bands)){
      const result={};
      for(const [key,value] of Object.entries(input.bands)){
        const id=normalizeBandId(key)||
          (isObject(value)?normalizeBandId(firstDefined(value.id,value.band)):null);
        if(id&&isObject(value)&&!result[id])result[id]=value;
      }
      return result;
    }
    return {};
  }
  function pathValues(raw,diagnostics,path){
    /* Each value is an explicit total acoustic propagation length from a
       driver's declared acoustic reference to one shared datum. It is not a
       Cartesian station coordinate. Reflection-path length is a separate
       input because the tap-to-reflector round-trip model cannot be recovered
       from a generic arrival path without inventing geometry. */
    const provided=firstDefined(
      raw.pathsToDatumM,raw.pathSamplesM,raw.pathsM
    );
    let values=Array.isArray(provided)?provided.slice():[];
    const single=firstDefined(
      raw.acousticPathToDatumM,raw.pathToDatumM,raw.referencePathToDatumM
    );
    if(!values.length&&single!==undefined)values=[single];
    const valid=[];
    for(let index=0;index<values.length;index++){
      const number=finiteNonnegative(values[index]);
      if(number===null)diagnostics.push(diagnostic(
        'PATH_VALUE_INVALID','error',path+'['+index+']',
        'Acoustic paths must be finite nonnegative lengths in metres.'
      ));
      else valid.push(number);
    }
    return valid;
  }
  function optionalPositive(raw,key,diagnostics,path){
    if(raw[key]===undefined||raw[key]===null)return null;
    const value=finitePositive(raw[key]);
    if(value===null)diagnostics.push(diagnostic(
      'POSITIVE_VALUE_REQUIRED','error',path,
      path+' must be a positive finite SI value.'
    ));
    return value;
  }
  function normalizeBand(id,raw,topology,crossovers,globalProvenance,diagnostics){
    const path='bands.'+id,
      record=isObject(raw)?raw:{},
      paths=pathValues(record,diagnostics,path+'.pathsToDatumM'),
      explicitReference=firstDefined(
        record.referencePathToDatumM,
        record.acousticPathToDatumM,
        record.pathToDatumM
      );
    let referencePathToDatumM=explicitReference===undefined
      ?null:finiteNonnegative(explicitReference);
    if(explicitReference!==undefined&&referencePathToDatumM===null)
      diagnostics.push(diagnostic(
        'REFERENCE_PATH_INVALID','error',path+'.referencePathToDatumM',
        'The reference acoustic path must be a finite nonnegative length in metres.'
      ));
    if(explicitReference===undefined&&referencePathToDatumM===null&&paths.length){
      const first=paths[0],
        equal=paths.every(value=>Math.abs(value-first)<=1e-12);
      if(equal)referencePathToDatumM=first;
    }
    if(!paths.length)diagnostics.push(diagnostic(
      'BAND_PATH_INPUT_MISSING','unavailable',path+'.pathsToDatumM',
      'No acoustic path to the common datum was supplied; no path geometry is inferred.'
    ));
    if(referencePathToDatumM!==null&&paths.length){
      const min=Math.min(...paths),max=Math.max(...paths);
      if(referencePathToDatumM<min-1e-12||
          referencePathToDatumM>max+1e-12)
        diagnostics.push(diagnostic(
          'REFERENCE_PATH_OUTSIDE_SAMPLES','warning',
          path+'.referencePathToDatumM',
          'The declared reference path lies outside the supplied path sample range.'
        ));
    }
    const topologyRecord=topology.canonical?TOPOLOGIES[topology.canonical]:null,
      defaultRole=topologyRecord?topologyRecord.bandRoles[id]:'unspecified',
      recordRole=cleanString(record.role),
      role=cleanString(record.entryRole)||
        (recordRole&&!normalizeBandId(recordRole)?recordRole:null)||
        defaultRole,
      lowerHz=id==='low'?null:
        id==='mid'?crossovers.lowMidHz:crossovers.midHighHz,
      upperHz=id==='low'?crossovers.lowMidHz:
        id==='mid'?crossovers.midHighHz:null,
      reflectionPathM=optionalPositive(
        record,'reflectionPathM',diagnostics,path+'.reflectionPathM'
      ),
      summedApertureAreaM2=optionalPositive(
        record,'summedApertureAreaM2',diagnostics,
        path+'.summedApertureAreaM2'
      ),
      localHornAreaM2=optionalPositive(
        record,'localHornAreaM2',diagnostics,path+'.localHornAreaM2'
      );
    return deepFreeze({
      id,
      entryRole:role,
      lowerHz,
      upperHz,
      pathsToDatumM:paths,
      referencePathToDatumM,
      reflectionPathM,
      summedApertureAreaM2,
      localHornAreaM2,
      provenance:normalizeProvenance(record.provenance,globalProvenance)
    });
  }
  function normalizeThreeWayInput(input){
    const source=isObject(input)?input:{},
      diagnostics=[],
      topology=normalizeTopology(source,diagnostics),
      crossovers=normalizeCrossovers(source,diagnostics),
      provenance=normalizeProvenance(source.provenance),
      suppliedBands=rawBands(source),
      bands={};
    for(const id of BAND_IDS)
      bands[id]=normalizeBand(
        id,suppliedBands[id],topology,crossovers,provenance,diagnostics
      );
    return deepFreeze({
      schemaVersion:SCHEMA_VERSION,
      topology,
      provenance,
      crossovers,
      bands,
      diagnostics
    });
  }
  function frequencyForBand(band){
    return band.id==='high'?band.lowerHz:band.upperHz;
  }
  function bandPathInvariant(band,speedOfSoundMps){
    const speed=finitePositive(speedOfSoundMps)||SPEED_OF_SOUND_MPS,
      frequencyHz=frequencyForBand(band),
      pathAvailable=band.pathsToDatumM.length>0&&frequencyHz!==null,
      minPathM=band.pathsToDatumM.length
        ?Math.min(...band.pathsToDatumM):null,
      maxPathM=band.pathsToDatumM.length
        ?Math.max(...band.pathsToDatumM):null,
      spreadM=minPathM===null?null:maxPathM-minPathM,
      wavelengthM=frequencyHz===null?null:speed/frequencyHz,
      quarterWaveM=wavelengthM===null?null:wavelengthM/4,
      reflectionNullHz=band.reflectionPathM===null
        ?null:speed/(4*band.reflectionPathM),
      areaRatio=band.summedApertureAreaM2!==null&&
          band.localHornAreaM2!==null
        ?band.summedApertureAreaM2/band.localHornAreaM2:null;
    return deepFreeze({
      band:idFor(band),
      frequencyHz,
      pathAvailable,
      minPathM,
      maxPathM,
      spreadM,
      wavelengthM,
      quarterWaveM,
      spreadWavelengthRatio:pathAvailable?spreadM/wavelengthM:null,
      spreadQuarterWaveRatio:pathAvailable?spreadM/quarterWaveM:null,
      spreadPhaseDeg:pathAvailable?360*frequencyHz*spreadM/speed:null,
      reflectionPathM:band.reflectionPathM,
      reflectionNullHz,
      reflectionNullToBoundaryRatio:
        reflectionNullHz!==null&&frequencyHz!==null
          ?reflectionNullHz/frequencyHz:null,
      summedApertureAreaM2:band.summedApertureAreaM2,
      localHornAreaM2:band.localHornAreaM2,
      apertureToLocalHornAreaRatio:areaRatio
    });
  }
  function idFor(band){
    return BAND_IDS.includes(band&&band.id)?band.id:null;
  }
  function adjacentPathInvariant(lower,upper,crossoverHz,speedOfSoundMps){
    const speed=finitePositive(speedOfSoundMps)||SPEED_OF_SOUND_MPS,
      frequency=finitePositive(crossoverHz),
      lowPaths=lower&&Array.isArray(lower.pathsToDatumM)
        ?lower.pathsToDatumM:[],
      highPaths=upper&&Array.isArray(upper.pathsToDatumM)
        ?upper.pathsToDatumM:[],
      available=frequency!==null&&lowPaths.length>0&&highPaths.length>0;
    if(!available)return deepFreeze({
      lowerBand:idFor(lower),upperBand:idFor(upper),
      crossoverHz:frequency,available:false,
      deltaPathRangeM:null,worstAbsoluteDeltaM:null,
      nominalDeltaM:null,nominalPhaseDeg:null,worstAbsolutePhaseDeg:null
    });
    const lowMin=Math.min(...lowPaths),lowMax=Math.max(...lowPaths),
      highMin=Math.min(...highPaths),highMax=Math.max(...highPaths),
      deltaMin=lowMin-highMax,deltaMax=lowMax-highMin,
      worst=Math.max(Math.abs(deltaMin),Math.abs(deltaMax)),
      nominal=lower.referencePathToDatumM!==null&&
          upper.referencePathToDatumM!==null
        ?lower.referencePathToDatumM-upper.referencePathToDatumM:null;
    return deepFreeze({
      lowerBand:idFor(lower),
      upperBand:idFor(upper),
      crossoverHz:frequency,
      available:true,
      deltaPathRangeM:[deltaMin,deltaMax],
      worstAbsoluteDeltaM:worst,
      nominalDeltaM:nominal,
      nominalPhaseDeg:nominal===null
        ?null:360*frequency*nominal/speed,
      worstAbsolutePhaseDeg:360*frequency*worst/speed
    });
  }
  function analyzeThreeWay(input,options){
    const normalized=normalizeThreeWayInput(input),
      speed=finitePositive(options&&options.speedOfSoundMps)||
        SPEED_OF_SOUND_MPS,
      bandPaths={};
    for(const id of BAND_IDS)
      bandPaths[id]=bandPathInvariant(normalized.bands[id],speed);
    const adjacent={
      lowMid:adjacentPathInvariant(
        normalized.bands.low,normalized.bands.mid,
        normalized.crossovers.lowMidHz,speed
      ),
      midHigh:adjacentPathInvariant(
        normalized.bands.mid,normalized.bands.high,
        normalized.crossovers.midHighHz,speed
      )
    };
    const pathAnalysisAvailable=
      normalized.topology.pathAnalysisSupported&&
      normalized.crossovers.ordered&&
      bandPaths.low.pathAvailable&&bandPaths.mid.pathAvailable&&
      bandPaths.high.pathAvailable&&
      adjacent.lowMid.available&&adjacent.midHigh.available;
    return deepFreeze({
      schemaVersion:SCHEMA_VERSION,
      speedOfSoundMps:speed,
      normalized,
      invariants:{bandPaths,adjacent},
      readiness:{
        topology:normalized.topology.supported,
        bandOrder:normalized.crossovers.ordered,
        pathAnalysis:pathAnalysisAvailable,
        manufacturing:false
      },
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
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    schemaVersion:SCHEMA_VERSION,
    speedOfSoundMps:SPEED_OF_SOUND_MPS,
    provenanceClassifications:PROVENANCE_CLASSIFICATIONS,
    bandIds:BAND_IDS,
    topologies:TOPOLOGIES,
    equationCatalog:EQUATION_CATALOG,
    capabilities:CAPABILITIES,
    normalizeProvenance,
    normalizeThreeWayInput,
    bandPathInvariant,
    adjacentPathInvariant,
    analyzeThreeWay,
    manufacturingPreflight
  });
});
