/* MEH Studio v5 — pure three-way acoustic relations, Stage 2.

   This module owns no DOM, renderer, Three.js object, horn-profile solver,
   driver database, placement search, mesh, Boolean operation, or
   manufacturing export. Every dimensional value is an explicit SI input.

   In particular, mouth dimensions, source count, aperture count, visual
   spacing, and preview geometry are never used to invent an entry station or
   a missing acoustic value. The quarter-wave relation is reported as an
   estimated constraint, never selected as an equality. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3Acoustics=factory();
})(function(){
  'use strict';

  const MODULE_VERSION=1;
  const BAND_IDS=Object.freeze(['low','mid','high']);
  const QUARTER_WAVE_BOUND_ROLE=
    'estimated-first-cancellation-upper-frequency-bound';
  const HELMHOLTZ_ASSUMPTION=
    'ideal-no-end-correction-single-effective-neck';
  const QUARTER_WAVE_BOUNDARY=
    'one-end-closed-one-end-open';
  const HALF_WAVE_BOUNDARIES=Object.freeze([
    'both-ends-open','both-ends-closed'
  ]);

  const FAILURE_CODES=deepFreeze({
    INPUT_REQUIRED:'THREEWAY_ACOUSTICS_INPUT_REQUIRED',
    INPUT_INVALID:'THREEWAY_ACOUSTICS_INPUT_INVALID',
    STATE_SCHEMA_UNSUPPORTED:
      'THREEWAY_ACOUSTICS_STATE_SCHEMA_UNSUPPORTED',
    ENTRY_STATION_NOT_FOUND:
      'THREEWAY_ACOUSTICS_ENTRY_STATION_NOT_FOUND',
    ENTRY_STATION_MISMATCH:
      'THREEWAY_ACOUSTICS_ENTRY_STATION_MISMATCH',
    HORN_QUERY_REQUIRED:
      'THREEWAY_ACOUSTICS_HORN_QUERY_REQUIRED',
    HORN_QUERY_MISMATCH:
      'THREEWAY_ACOUSTICS_HORN_QUERY_MISMATCH',
    PATHS_INVALID:'THREEWAY_ACOUSTICS_PATHS_INVALID',
    PATH_SPREAD_EXCEEDED:'THREEWAY_PATH_SPREAD_EXCEEDED',
    ADJACENT_BANDS_INVALID:
      'THREEWAY_ACOUSTICS_ADJACENT_BANDS_INVALID',
    ADJACENT_PHASE_EXCEEDED:
      'THREEWAY_ADJACENT_BAND_PHASE_EXCEEDED',
    BOUNDARY_ASSUMPTION_REQUIRED:
      'THREEWAY_ACOUSTICS_BOUNDARY_ASSUMPTION_REQUIRED',
    AXIAL_BOUNDS_INVALID:'THREEWAY_ENTRY_STATION_BOUNDS_INVALID',
    AXIAL_BOUNDS_INCOMPLETE:
      'THREEWAY_ENTRY_STATION_BOUNDS_INCOMPLETE',
    AXIAL_INTERVAL_EMPTY:'THREEWAY_ENTRY_STATION_INTERVAL_EMPTY',
    ENTRY_STATION_QUERY_OUTSIDE_INTERVAL:
      'THREEWAY_ENTRY_STATION_QUERY_OUTSIDE_INTERVAL',
    TRANSFER_PROVIDER_UNAVAILABLE:
      'THREEWAY_MATH_TRANSFER_PROVIDER_UNAVAILABLE',
    MOUTH_LOAD_PROVIDER_UNAVAILABLE:
      'THREEWAY_MATH_MOUTH_LOAD_PROVIDER_UNAVAILABLE'
  });

  const MODEL_METADATA=deepFreeze({
    id:'meh3-explicit-acoustic-relations',
    revision:'stage-2-v1',
    classification:'experimental-analysis-relations',
    peerReviewedAsImplementation:false,
    hardwareValidated:false,
    manufacturing:false,
    limitations:[
      'No horn-segment or branch ABCD coefficient provider is implemented.',
      'No mouth-radiation load or noncircular-mouth mapping is implemented.',
      'Lumped passage and Helmholtz relations omit distributed loading, loss, and higher modes.',
      'Quarter-wave and longitudinal resonances are estimates under declared boundary assumptions.',
      'Coupled simulation, BEM/FEM, prototype measurement, and structural validation remain required.'
    ],
    sourceLedger:{
      primary:'docs/threeway-primary-source-ledger.md',
      kingMathNotes:'docs/threeway-king-2026-math-notes.md',
      rebuildBlueprint:'docs/threeway-rebuild-blueprint.md'
    }
  });

  const EQUATIONS=deepFreeze({
    wavelength:{
      id:'meh3.wavelength.v1',
      expression:'lambda = c / f',
      status:'physical-identity',
      units:{c:'m/s',f:'Hz',lambda:'m'},
      sources:['threeway-primary-source-ledger.md §4.1']
    },
    pathPhase:{
      id:'meh3.path-phase.v1',
      expression:'phase_deg = 360 f delta_path / c',
      status:'physical-identity',
      signConvention:'positive delta_path means the first path is longer',
      units:{f:'Hz',delta_path:'m',phase:'deg'},
      sources:['threeway-rebuild-blueprint.md § Acoustic path and phase solve']
    },
    quarterWaveReflectionBound:{
      id:'meh3.quarter-wave-reflection-bound.v1',
      expression:'f_notch_estimate = c / (4 d_effective)',
      status:'documented-design-heuristic-bound',
      automaticEquality:false,
      sources:[
        'threeway-primary-source-ledger.md §4.1',
        'US 6,411,718 / US 2002/0106097',
        'Scott Hinson, Multiple Entry Horns (2022)'
      ]
    },
    apertureToHornAreaRatio:{
      id:'meh3.local-aperture-area-ratio.v1',
      expression:'ratio = summed_aperture_area / local_horn_area',
      status:'documented-design-relation',
      units:{
        summedApertureArea:'m^2',localHornArea:'m^2',ratio:'1'
      },
      sources:[
        'threeway-primary-source-ledger.md §8.1',
        'US 6,411,718 / US 2002/0106097'
      ]
    },
    passageInertance:{
      id:'meh3.lumped-passage-inertance.v1',
      expression:'M_a = rho L_effective / A_effective',
      status:'standard-lumped-acoustic-relation',
      units:{
        density:'kg/m^3',length:'m',area:'m^2',
        inertance:'Pa*s^2/m^3'
      },
      sources:[
        'threeway-primary-source-ledger.md conclusions 2 and 4',
        'threeway-rebuild-blueprint.md § Aperture/chamber/passage solve'
      ]
    },
    helmholtzEstimate:{
      id:'meh3.ideal-helmholtz-estimate.v1',
      expression:'f_H = c/(2 pi) sqrt(A_neck/(V_chamber L_neck))',
      status:'independent-dimensional-sanity-check',
      assumptions:[
        'single effective neck',
        'no end correction',
        'lossless lumped chamber and neck',
        'no horn radiation load'
      ],
      sources:['threeway-king-2026-math-notes.md §6, independent check']
    },
    passageDelay:{
      id:'meh3.passage-one-way-delay.v1',
      expression:'delay = L_effective / c',
      status:'ideal-wave-propagation-relation',
      units:{length:'m',speed:'m/s',delay:'s'}
    },
    passageQuarterWave:{
      id:'meh3.passage-quarter-wave-mode.v1',
      expression:'f_1 = c / (4 L_effective)',
      status:'ideal-longitudinal-mode-estimate',
      requiredBoundaryAssumption:QUARTER_WAVE_BOUNDARY
    },
    passageHalfWave:{
      id:'meh3.passage-half-wave-mode.v1',
      expression:'f_1 = c / (2 L_effective)',
      status:'ideal-longitudinal-mode-estimate',
      requiredBoundaryAssumptions:HALF_WAVE_BOUNDARIES.slice()
    },
    pathSpread:{
      id:'meh3.path-spread.v1',
      expression:'spread = max(path_to_datum) - min(path_to_datum)',
      status:'geometric-path-identity'
    },
    adjacentBandPhase:{
      id:'meh3.adjacent-band-phase.v1',
      expression:
        'delta_path = path_lower - path_upper; phase_deg = 360 f_x delta_path / c',
      status:'physical-identity-with-explicit-path-datum',
      signConvention:'positive phase value means the lower-band path is longer'
    },
    axialIntervalIntersection:{
      id:'meh3.axial-bound-intersection.v1',
      expression:'legal = [max(all explicit minima), min(all explicit maxima)]',
      status:'mathematical-set-intersection',
      automaticStationSelection:false
    }
  });

  const CAPABILITIES=deepFreeze({
    status:'pure-explicit-acoustic-relations-only',
    schema2StationAnalysis:true,
    wavelength:true,
    pathPhase:true,
    quarterWaveReflectionBound:true,
    localApertureAreaRatio:true,
    passageInertance:true,
    idealHelmholtzEstimate:true,
    idealPassageModes:true,
    pathSpread:true,
    adjacentBandPhase:true,
    explicitAxialBoundIntersection:true,
    automaticStationSelection:false,
    countInference:false,
    spacingInference:false,
    mouthInference:false,
    geometryInference:false,
    hornSegmentAbcdProvider:false,
    branchAbcdProvider:false,
    mouthRadiationLoadProvider:false,
    hardwareValidation:false,
    manufacturingPlan:false,
    manufacturingSolids:false,
    manufacturingExport:false,
    stlExport:false,
    reason:
      'Stage 2 evaluates explicit analysis inputs only; no audited three-way solid or fabrication plan exists.'
  });

  function isObject(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
  }

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    for(const key of Object.keys(value))deepFreeze(value[key]);
    return Object.freeze(value);
  }

  function cloneValue(value){
    if(Array.isArray(value))return value.map(cloneValue);
    if(isObject(value)){
      const copy={};
      for(const key of Object.keys(value))copy[key]=cloneValue(value[key]);
      return copy;
    }
    if(typeof value==='number')
      return Number.isFinite(value)?(Object.is(value,-0)?0:value):null;
    return value;
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function numeric(value){
    return typeof value==='number'&&Number.isFinite(value)?value:null;
  }

  function positive(value){
    const number=numeric(value);
    return number!==null&&number>0?number:null;
  }

  function nonnegative(value){
    const number=numeric(value);
    return number!==null&&number>=0?number:null;
  }

  function has(record,key){
    return Object.prototype.hasOwnProperty.call(record,key);
  }

  function fail(code,message,details,paths){
    return deepFreeze({
      ok:false,
      code,
      message,
      paths:uniqueStrings(paths),
      details:isObject(details)||Array.isArray(details)
        ?cloneValue(details):{},
      validationStatus:'refused',
      hardwareValidated:false,
      manufacturing:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function diagnostic(code,severity,paths,message,details){
    return deepFreeze({
      code,
      severity,
      paths:uniqueStrings(paths),
      message,
      details:isObject(details)||Array.isArray(details)
        ?cloneValue(details):{}
    });
  }

  function success(payload,equation,provenance,diagnostics){
    const result={
      ok:true,
      code:null,
      ...cloneValue(payload),
      equation,
      provenance:isObject(provenance)?cloneValue(provenance):{},
      diagnostics:Array.isArray(diagnostics)
        ?diagnostics.map(cloneValue):[],
      validationStatus:
        'experimental-analysis-relation-not-hardware-validated',
      hardwareValidated:false,
      manufacturing:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    };
    return deepFreeze(result);
  }

  function requireRecord(input,path){
    if(!isObject(input))return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'An explicit input record is required.',
      {expected:'object'},[path||'input']
    );
    return null;
  }

  function requireNumber(record,key,mode,pathPrefix){
    const path=(pathPrefix?pathPrefix+'.':'')+key;
    if(!has(record,key))return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'Missing explicit SI input: '+path+'.',
      {field:path},[path]
    );
    const value=mode==='positive'
      ?positive(record[key]):mode==='nonnegative'
        ?nonnegative(record[key]):numeric(record[key]);
    if(value===null)return fail(
      FAILURE_CODES.INPUT_INVALID,
      path+' must be a finite '+(
        mode==='positive'?'positive':mode==='nonnegative'
          ?'nonnegative':'numeric'
      )+' SI value.',
      {field:path,value:record[key]},[path]
    );
    return {ok:true,value};
  }

  function requireSpeed(record,pathPrefix){
    return requireNumber(
      record,'speedOfSoundMps','positive',pathPrefix
    );
  }

  function wavelength(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const frequency=requireNumber(input,'frequencyHz','positive','input');
    if(!frequency.ok)return frequency;
    const speed=requireSpeed(input,'input');
    if(!speed.ok)return speed;
    return success({
      frequencyHz:frequency.value,
      speedOfSoundMps:speed.value,
      wavelengthM:speed.value/frequency.value,
      units:{frequency:'Hz',speedOfSound:'m/s',wavelength:'m'}
    },EQUATIONS.wavelength,input.provenance);
  }

  function pathPhase(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const frequency=requireNumber(input,'frequencyHz','positive','input');
    if(!frequency.ok)return frequency;
    const delta=requireNumber(input,'deltaPathM','finite','input');
    if(!delta.ok)return delta;
    const speed=requireSpeed(input,'input');
    if(!speed.ok)return speed;
    return success({
      frequencyHz:frequency.value,
      speedOfSoundMps:speed.value,
      deltaPathM:delta.value,
      phaseDeg:360*frequency.value*delta.value/speed.value,
      phaseCycles:frequency.value*delta.value/speed.value,
      signConvention:EQUATIONS.pathPhase.signConvention,
      units:{
        frequency:'Hz',speedOfSound:'m/s',deltaPath:'m',phase:'deg'
      }
    },EQUATIONS.pathPhase,input.provenance);
  }

  function quarterWaveReflectionBound(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const path=requireNumber(
      input,'effectiveReflectionPathM','positive','input'
    );
    if(!path.ok)return path;
    const speed=requireSpeed(input,'input');
    if(!speed.ok)return speed;
    const role=cleanString(input.boundRole);
    if(!role)return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'The quarter-wave relation requires an explicit boundRole.',
      {allowed:[QUARTER_WAVE_BOUND_ROLE]},['input.boundRole']
    );
    if(role!==QUARTER_WAVE_BOUND_ROLE)return fail(
      FAILURE_CODES.INPUT_INVALID,
      'Unsupported quarter-wave boundRole.',
      {value:role,allowed:[QUARTER_WAVE_BOUND_ROLE]},
      ['input.boundRole']
    );
    const estimateHz=speed.value/(4*path.value);
    return success({
      effectiveReflectionPathM:path.value,
      speedOfSoundMps:speed.value,
      estimatedFirstCancellationHz:estimateHz,
      bound:{
        role,
        estimateHz,
        hardBound:false,
        automaticEquality:false,
        automaticStationSelection:false,
        interpretation:
          'Use as an initial upper-operating-edge candidate with explicit margin; verify with the coupled network and measurement.'
      },
      units:{
        effectiveReflectionPath:'m',speedOfSound:'m/s',
        estimatedFirstCancellation:'Hz'
      }
    },EQUATIONS.quarterWaveReflectionBound,input.provenance);
  }

  function apertureToHornAreaRatio(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const aperture=requireNumber(
      input,'summedApertureAreaM2','positive','input'
    );
    if(!aperture.ok)return aperture;
    const local=requireNumber(
      input,'localHornAreaM2','positive','input'
    );
    if(!local.ok)return local;
    return success({
      summedApertureAreaM2:aperture.value,
      localHornAreaM2:local.value,
      apertureToLocalHornAreaRatio:aperture.value/local.value,
      percentOfLocalHornArea:100*aperture.value/local.value,
      units:{
        summedApertureArea:'m^2',localHornArea:'m^2',ratio:'1'
      }
    },EQUATIONS.apertureToHornAreaRatio,input.provenance);
  }

  function passageInertance(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const density=requireNumber(input,'densityKgM3','positive','input');
    if(!density.ok)return density;
    const length=requireNumber(
      input,'effectiveLengthM','positive','input'
    );
    if(!length.ok)return length;
    const area=requireNumber(input,'effectiveAreaM2','positive','input');
    if(!area.ok)return area;
    return success({
      densityKgM3:density.value,
      effectiveLengthM:length.value,
      effectiveAreaM2:area.value,
      acousticInertancePaS2M3:
        density.value*length.value/area.value,
      units:{
        density:'kg/m^3',effectiveLength:'m',effectiveArea:'m^2',
        acousticInertance:'Pa*s^2/m^3'
      }
    },EQUATIONS.passageInertance,input.provenance);
  }

  function helmholtzEstimate(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const speed=requireSpeed(input,'input');
    if(!speed.ok)return speed;
    const volume=requireNumber(
      input,'chamberVolumeM3','positive','input'
    );
    if(!volume.ok)return volume;
    const area=requireNumber(
      input,'effectiveNeckAreaM2','positive','input'
    );
    if(!area.ok)return area;
    const length=requireNumber(
      input,'effectiveNeckLengthM','positive','input'
    );
    if(!length.ok)return length;
    const assumption=cleanString(input.modelAssumption);
    if(!assumption)return fail(
      FAILURE_CODES.BOUNDARY_ASSUMPTION_REQUIRED,
      'The Helmholtz estimate requires an explicit modelAssumption.',
      {allowed:[HELMHOLTZ_ASSUMPTION]},['input.modelAssumption']
    );
    if(assumption!==HELMHOLTZ_ASSUMPTION)return fail(
      FAILURE_CODES.INPUT_INVALID,
      'Unsupported Helmholtz modelAssumption.',
      {value:assumption,allowed:[HELMHOLTZ_ASSUMPTION]},
      ['input.modelAssumption']
    );
    const frequency=speed.value/(2*Math.PI)*
      Math.sqrt(area.value/(volume.value*length.value));
    return success({
      speedOfSoundMps:speed.value,
      chamberVolumeM3:volume.value,
      effectiveNeckAreaM2:area.value,
      effectiveNeckLengthM:length.value,
      modelAssumption:assumption,
      estimatedHelmholtzHz:frequency,
      replacementForCoupledBranchModel:false,
      limitations:EQUATIONS.helmholtzEstimate.assumptions.slice(),
      units:{
        speedOfSound:'m/s',chamberVolume:'m^3',
        effectiveNeckArea:'m^2',effectiveNeckLength:'m',
        estimatedFrequency:'Hz'
      }
    },EQUATIONS.helmholtzEstimate,input.provenance);
  }

  function passageDelayAndResonances(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const speed=requireSpeed(input,'input');
    if(!speed.ok)return speed;
    const length=requireNumber(
      input,'effectiveLengthM','positive','input'
    );
    if(!length.ok)return length;
    const quarter=cleanString(input.quarterWaveBoundaryAssumption),
      half=cleanString(input.halfWaveBoundaryAssumption);
    if(!quarter||!half)return fail(
      FAILURE_CODES.BOUNDARY_ASSUMPTION_REQUIRED,
      'Quarter-wave and half-wave boundary assumptions are both required.',
      {
        quarterWaveAllowed:[QUARTER_WAVE_BOUNDARY],
        halfWaveAllowed:HALF_WAVE_BOUNDARIES
      },
      [
        !quarter?'input.quarterWaveBoundaryAssumption':null,
        !half?'input.halfWaveBoundaryAssumption':null
      ]
    );
    if(quarter!==QUARTER_WAVE_BOUNDARY||
        !HALF_WAVE_BOUNDARIES.includes(half))return fail(
      FAILURE_CODES.INPUT_INVALID,
      'Unsupported longitudinal-mode boundary assumption.',
      {
        quarterWaveValue:quarter,
        quarterWaveAllowed:[QUARTER_WAVE_BOUNDARY],
        halfWaveValue:half,
        halfWaveAllowed:HALF_WAVE_BOUNDARIES
      },
      [
        'input.quarterWaveBoundaryAssumption',
        'input.halfWaveBoundaryAssumption'
      ]
    );
    const delayS=length.value/speed.value,
      quarterHz=speed.value/(4*length.value),
      halfHz=speed.value/(2*length.value);
    return success({
      effectiveLengthM:length.value,
      speedOfSoundMps:speed.value,
      oneWayDelayS:delayS,
      oneWayDelayMs:1000*delayS,
      modes:[
        {
          id:'first-quarter-wave',
          label:'first ideal quarter-wave longitudinal resonance',
          frequencyHz:quarterHz,
          boundaryAssumption:quarter,
          equation:EQUATIONS.passageQuarterWave
        },
        {
          id:'first-half-wave',
          label:'first ideal half-wave longitudinal resonance',
          frequencyHz:halfHz,
          boundaryAssumption:half,
          equation:EQUATIONS.passageHalfWave
        }
      ],
      units:{
        effectiveLength:'m',speedOfSound:'m/s',
        oneWayDelay:'s',modeFrequency:'Hz'
      }
    },EQUATIONS.passageDelay,input.provenance);
  }

  function parsePaths(value,pathPrefix){
    if(!Array.isArray(value)||!value.length)return fail(
      FAILURE_CODES.PATHS_INVALID,
      'One or more explicit path records are required.',
      {expected:'[{id, pathToDatumM}]'},[pathPrefix]
    );
    const result=[],ids=new Set();
    for(let index=0;index<value.length;index++){
      const item=value[index],
        path=pathPrefix+'['+index+']';
      if(!isObject(item))return fail(
        FAILURE_CODES.PATHS_INVALID,
        'Every acoustic path must be a record.',
        {index},[path]
      );
      const id=cleanString(item.id),
        length=nonnegative(item.pathToDatumM);
      if(!id||ids.has(id)||length===null)return fail(
        FAILURE_CODES.PATHS_INVALID,
        'Every path requires a unique id and finite nonnegative pathToDatumM.',
        {index,id,value:item.pathToDatumM},[path]
      );
      ids.add(id);
      result.push({
        id,
        pathToDatumM:length,
        sourceId:cleanString(item.sourceId),
        apertureId:cleanString(item.apertureId),
        evidenceRefs:uniqueStrings(item.evidenceRefs)
      });
    }
    result.sort((left,right)=>left.id.localeCompare(right.id));
    return {ok:true,paths:result};
  }

  function bandPathCore(record,pathPrefix,frequencyHz,speedOfSoundMps){
    if(!isObject(record))return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'An explicit band path record is required.',
      {},[pathPrefix]
    );
    const bandId=cleanString(record.bandId);
    if(!BAND_IDS.includes(bandId))return fail(
      FAILURE_CODES.INPUT_INVALID,
      'bandId must be low, mid, or high.',
      {value:bandId},[pathPrefix+'.bandId']
    );
    const parsed=parsePaths(record.paths,pathPrefix+'.paths');
    if(!parsed.ok)return parsed;
    let reference=null;
    if(has(record,'referencePathToDatumM')){
      reference=nonnegative(record.referencePathToDatumM);
      if(reference===null)return fail(
        FAILURE_CODES.INPUT_INVALID,
        'referencePathToDatumM must be a finite nonnegative SI value.',
        {value:record.referencePathToDatumM},
        [pathPrefix+'.referencePathToDatumM']
      );
    }
    const values=parsed.paths.map(item=>item.pathToDatumM),
      minimum=Math.min(...values),
      maximum=Math.max(...values),
      spread=maximum-minimum,
      diagnostics=[];
    let maximumSpread=null;
    if(has(record,'maximumAllowedSpreadM')){
      maximumSpread=nonnegative(record.maximumAllowedSpreadM);
      if(maximumSpread===null)return fail(
        FAILURE_CODES.INPUT_INVALID,
        'maximumAllowedSpreadM must be finite and nonnegative.',
        {value:record.maximumAllowedSpreadM},
        [pathPrefix+'.maximumAllowedSpreadM']
      );
      if(spread>maximumSpread)diagnostics.push(diagnostic(
        FAILURE_CODES.PATH_SPREAD_EXCEEDED,'warning',
        [pathPrefix+'.paths',pathPrefix+'.maximumAllowedSpreadM'],
        'Explicit path spread exceeds the declared band limit.',
        {spreadM:spread,maximumAllowedSpreadM:maximumSpread}
      ));
    }
    const paths=parsed.paths.map(item=>({
      ...item,
      deltaFromReferenceM:reference===null
        ?null:item.pathToDatumM-reference,
      phaseFromReferenceDeg:reference===null
        ?null:360*frequencyHz*
          (item.pathToDatumM-reference)/speedOfSoundMps
    }));
    return {
      ok:true,
      bandId,
      paths,
      referencePathToDatumM:reference,
      minimumPathToDatumM:minimum,
      maximumPathToDatumM:maximum,
      spreadM:spread,
      spreadDelayS:spread/speedOfSoundMps,
      spreadPhaseDeg:360*frequencyHz*spread/speedOfSoundMps,
      maximumAllowedSpreadM:maximumSpread,
      withinDeclaredSpreadLimit:
        maximumSpread===null?null:spread<=maximumSpread,
      diagnostics
    };
  }

  function analyzeBandPaths(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const frequency=requireNumber(input,'frequencyHz','positive','input');
    if(!frequency.ok)return frequency;
    const speed=requireSpeed(input,'input');
    if(!speed.ok)return speed;
    const core=bandPathCore(
      input,'input',frequency.value,speed.value
    );
    if(!core.ok)return core;
    return success({
      bandId:core.bandId,
      frequencyHz:frequency.value,
      speedOfSoundMps:speed.value,
      paths:core.paths,
      referencePathToDatumM:core.referencePathToDatumM,
      minimumPathToDatumM:core.minimumPathToDatumM,
      maximumPathToDatumM:core.maximumPathToDatumM,
      spreadM:core.spreadM,
      spreadDelayS:core.spreadDelayS,
      spreadPhaseDeg:core.spreadPhaseDeg,
      maximumAllowedSpreadM:core.maximumAllowedSpreadM,
      withinDeclaredSpreadLimit:core.withinDeclaredSpreadLimit,
      units:{
        frequency:'Hz',speedOfSound:'m/s',path:'m',
        delay:'s',phase:'deg'
      }
    },EQUATIONS.pathSpread,input.provenance,core.diagnostics);
  }

  function analyzeAdjacentBandPhase(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const frequency=requireNumber(
      input,'crossoverFrequencyHz','positive','input'
    );
    if(!frequency.ok)return frequency;
    const speed=requireSpeed(input,'input');
    if(!speed.ok)return speed;
    const lower=bandPathCore(
      input.lowerBand,'input.lowerBand',frequency.value,speed.value
    );
    if(!lower.ok)return lower;
    const upper=bandPathCore(
      input.upperBand,'input.upperBand',frequency.value,speed.value
    );
    if(!upper.ok)return upper;
    const pair=lower.bandId+'-'+upper.bandId;
    if(pair!=='low-mid'&&pair!=='mid-high')return fail(
      FAILURE_CODES.ADJACENT_BANDS_INVALID,
      'Bands must be supplied in low-to-mid or mid-to-high order.',
      {lowerBandId:lower.bandId,upperBandId:upper.bandId},
      ['input.lowerBand.bandId','input.upperBand.bandId']
    );
    const deltaMinimum=
        lower.minimumPathToDatumM-upper.maximumPathToDatumM,
      deltaMaximum=
        lower.maximumPathToDatumM-upper.minimumPathToDatumM,
      phaseMinimum=
        360*frequency.value*deltaMinimum/speed.value,
      phaseMaximum=
        360*frequency.value*deltaMaximum/speed.value,
      worstAbsoluteDeltaM=Math.max(
        Math.abs(deltaMinimum),Math.abs(deltaMaximum)
      ),
      worstAbsolutePhaseDeg=Math.max(
        Math.abs(phaseMinimum),Math.abs(phaseMaximum)
      ),
      nominalAvailable=
        lower.referencePathToDatumM!==null&&
        upper.referencePathToDatumM!==null,
      nominalDeltaM=nominalAvailable
        ?lower.referencePathToDatumM-upper.referencePathToDatumM:null,
      nominalPhaseDeg=nominalAvailable
        ?360*frequency.value*nominalDeltaM/speed.value:null,
      diagnostics=[...lower.diagnostics,...upper.diagnostics];
    let maximumPhase=null;
    if(has(input,'maximumAllowedAbsolutePhaseDeg')){
      maximumPhase=nonnegative(input.maximumAllowedAbsolutePhaseDeg);
      if(maximumPhase===null)return fail(
        FAILURE_CODES.INPUT_INVALID,
        'maximumAllowedAbsolutePhaseDeg must be finite and nonnegative.',
        {value:input.maximumAllowedAbsolutePhaseDeg},
        ['input.maximumAllowedAbsolutePhaseDeg']
      );
      if(worstAbsolutePhaseDeg>maximumPhase)
        diagnostics.push(diagnostic(
          FAILURE_CODES.ADJACENT_PHASE_EXCEEDED,'warning',
          [
            'input.lowerBand.paths','input.upperBand.paths',
            'input.maximumAllowedAbsolutePhaseDeg'
          ],
          'Worst explicit adjacent-band phase exceeds the declared limit.',
          {
            worstAbsolutePhaseDeg,
            maximumAllowedAbsolutePhaseDeg:maximumPhase
          }
        ));
    }
    return success({
      lowerBandId:lower.bandId,
      upperBandId:upper.bandId,
      crossoverFrequencyHz:frequency.value,
      speedOfSoundMps:speed.value,
      deltaPathRangeM:[deltaMinimum,deltaMaximum],
      phaseRangeDeg:[phaseMinimum,phaseMaximum],
      worstAbsoluteDeltaM,
      worstAbsolutePhaseDeg,
      nominalAvailable,
      nominalDeltaM,
      nominalPhaseDeg,
      maximumAllowedAbsolutePhaseDeg:maximumPhase,
      withinDeclaredPhaseLimit:maximumPhase===null
        ?null:worstAbsolutePhaseDeg<=maximumPhase,
      signConvention:EQUATIONS.adjacentBandPhase.signConvention,
      lowerBandPaths:lower.paths,
      upperBandPaths:upper.paths,
      units:{
        crossoverFrequency:'Hz',speedOfSound:'m/s',
        deltaPath:'m',phase:'deg'
      }
    },EQUATIONS.adjacentBandPhase,input.provenance,diagnostics);
  }

  function parseAxialBounds(value){
    if(!Array.isArray(value)||!value.length)return fail(
      FAILURE_CODES.AXIAL_BOUNDS_INVALID,
      'One or more explicit axial bound records are required.',
      {expected:'[{id, minimumM?, maximumM?, reason}]'},
      ['input.bounds']
    );
    const result=[],ids=new Set();
    for(let index=0;index<value.length;index++){
      const item=value[index],
        path='input.bounds['+index+']';
      if(!isObject(item))return fail(
        FAILURE_CODES.AXIAL_BOUNDS_INVALID,
        'Every axial bound must be a record.',{index},[path]
      );
      const id=cleanString(item.id),
        reason=cleanString(item.reason),
        minimum=has(item,'minimumM')&&item.minimumM!==null
          ?nonnegative(item.minimumM):null,
        maximum=has(item,'maximumM')&&item.maximumM!==null
          ?nonnegative(item.maximumM):null,
        suppliedMinimum=has(item,'minimumM')&&item.minimumM!==null,
        suppliedMaximum=has(item,'maximumM')&&item.maximumM!==null;
      if(!id||ids.has(id)||!reason||
          (!suppliedMinimum&&!suppliedMaximum)||
          (suppliedMinimum&&minimum===null)||
          (suppliedMaximum&&maximum===null)||
          (minimum!==null&&maximum!==null&&minimum>maximum))
        return fail(
          FAILURE_CODES.AXIAL_BOUNDS_INVALID,
          'Each axial bound needs a unique id, reason, and one or two valid nonnegative limits.',
          {
            index,id,reason,minimumM:item.minimumM,
            maximumM:item.maximumM
          },[path]
        );
      ids.add(id);
      result.push({
        id,
        minimumM:minimum,
        maximumM:maximum,
        reason,
        evidenceRefs:uniqueStrings(item.evidenceRefs),
        provenance:isObject(item.provenance)
          ?cloneValue(item.provenance):{}
      });
    }
    result.sort((left,right)=>left.id.localeCompare(right.id));
    return {ok:true,bounds:result};
  }

  function intersectAxialBounds(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const stationId=cleanString(input.stationId);
    if(!stationId)return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'An explicit stationId is required.',
      {},['input.stationId']
    );
    const parsed=parseAxialBounds(input.bounds);
    if(!parsed.ok)return parsed;
    const minima=parsed.bounds.filter(item=>item.minimumM!==null),
      maxima=parsed.bounds.filter(item=>item.maximumM!==null);
    if(!minima.length||!maxima.length)return fail(
      FAILURE_CODES.AXIAL_BOUNDS_INCOMPLETE,
      'The explicit bounds must contain at least one finite minimum and one finite maximum.',
      {
        stationId,
        hasMinimum:minima.length>0,
        hasMaximum:maxima.length>0,
        bounds:parsed.bounds
      },['input.bounds']
    );
    const minimumM=Math.max(...minima.map(item=>item.minimumM)),
      maximumM=Math.min(...maxima.map(item=>item.maximumM)),
      activeMinimumBounds=minima.filter(
        item=>item.minimumM===minimumM
      ),
      activeMaximumBounds=maxima.filter(
        item=>item.maximumM===maximumM
      );
    if(minimumM>maximumM)return fail(
      FAILURE_CODES.AXIAL_INTERVAL_EMPTY,
      'The explicit axial constraints have an empty intersection.',
      {
        stationId,
        candidateMinimumM:minimumM,
        candidateMaximumM:maximumM,
        activeMinimumBounds,
        activeMaximumBounds,
        bounds:parsed.bounds
      },['input.bounds']
    );
    return success({
      stationId,
      legalIntervalM:{minimum:minimumM,maximum:maximumM},
      widthM:maximumM-minimumM,
      bounds:parsed.bounds,
      activeMinimumBounds,
      activeMaximumBounds,
      reasons:parsed.bounds.map(item=>({
        id:item.id,
        reason:item.reason,
        evidenceRefs:item.evidenceRefs
      })),
      selectedAxialM:null,
      automaticStationSelection:false,
      units:{axialCoordinate:'m'}
    },EQUATIONS.axialIntervalIntersection,input.provenance);
  }

  function sameStrings(left,right){
    const a=uniqueStrings(left),b=uniqueStrings(right);
    return a.length===b.length&&a.every((value,index)=>value===b[index]);
  }

  function analyzeEntryStation(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    const state=input.state,
      station=input.entryStation,
      horn=input.hornQuery,
      acoustic=input.acousticInputs;
    if(!isObject(state))return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'An explicit schema-2 state is required.',{},['input.state']
    );
    if(state.schemaVersion!==2)return fail(
      FAILURE_CODES.STATE_SCHEMA_UNSUPPORTED,
      'threeway-acoustics accepts only explicit schemaVersion 2 state.',
      {value:state.schemaVersion},['input.state.schemaVersion']
    );
    if(!isObject(station))return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'An explicit entryStation record is required.',
      {},['input.entryStation']
    );
    const stationId=cleanString(station.id),
      stateStations=Array.isArray(state.entryStations)
        ?state.entryStations:[],
      stateStation=stateStations.find(
        item=>isObject(item)&&cleanString(item.id)===stationId
      );
    if(!stationId||!stateStation)return fail(
      FAILURE_CODES.ENTRY_STATION_NOT_FOUND,
      'The explicit entry station does not exist in the schema-2 state.',
      {stationId},['input.entryStation.id','input.state.entryStations']
    );
    if(cleanString(station.role)!==cleanString(stateStation.role)||
        station.order!==stateStation.order||
        !sameStrings(station.sourceIds,stateStation.sourceIds)||
        !sameStrings(station.bandIds,stateStation.bandIds))
      return fail(
        FAILURE_CODES.ENTRY_STATION_MISMATCH,
        'The supplied entryStation identity fields do not match the state record.',
        {
          stationId,
          supplied:{
            role:station.role,order:station.order,
            sourceIds:station.sourceIds,bandIds:station.bandIds
          },
          state:{
            role:stateStation.role,order:stateStation.order,
            sourceIds:stateStation.sourceIds,bandIds:stateStation.bandIds
          }
        },['input.entryStation','input.state.entryStations']
      );
    if(!isObject(horn))return fail(
      FAILURE_CODES.HORN_QUERY_REQUIRED,
      'An explicit horn-surface query result is required.',
      {},['input.hornQuery']
    );
    const queryId=cleanString(horn.queryId),
      queryStationId=cleanString(horn.stationId),
      axial=nonnegative(horn.axialCoordinateM),
      localArea=positive(horn.localHornAreaM2);
    if(!queryId||queryStationId!==stationId||
        axial===null||localArea===null)return fail(
      FAILURE_CODES.HORN_QUERY_MISMATCH,
      'hornQuery requires queryId, matching stationId, axialCoordinateM, and localHornAreaM2.',
      {
        queryId,queryStationId,stationId,
        axialCoordinateM:horn.axialCoordinateM,
        localHornAreaM2:horn.localHornAreaM2
      },['input.hornQuery']
    );
    if(!isObject(acoustic))return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'Explicit station acousticInputs are required.',
      {},['input.acousticInputs']
    );
    const bandId=cleanString(acoustic.bandId);
    if(!BAND_IDS.includes(bandId)||
        !uniqueStrings(station.bandIds).includes(bandId))
      return fail(
        FAILURE_CODES.INPUT_INVALID,
        'acousticInputs.bandId must be carried by this explicit station.',
        {bandId,stationBandIds:station.bandIds},
        ['input.acousticInputs.bandId']
      );
    const common={
      frequencyHz:acoustic.frequencyHz,
      speedOfSoundMps:acoustic.speedOfSoundMps,
      provenance:acoustic.provenance
    };
    const wavelengthResult=wavelength(common);
    if(!wavelengthResult.ok)return wavelengthResult;
    const reflection=quarterWaveReflectionBound({
      effectiveReflectionPathM:acoustic.effectiveReflectionPathM,
      speedOfSoundMps:acoustic.speedOfSoundMps,
      boundRole:acoustic.quarterWaveBoundRole,
      provenance:acoustic.provenance
    });
    if(!reflection.ok)return reflection;
    const areaRatio=apertureToHornAreaRatio({
      summedApertureAreaM2:acoustic.summedApertureAreaM2,
      localHornAreaM2:localArea,
      provenance:acoustic.provenance
    });
    if(!areaRatio.ok)return areaRatio;
    if(!isObject(acoustic.passage))return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'Explicit passage inputs are required.',
      {},['input.acousticInputs.passage']
    );
    const passage=acoustic.passage,
      inertance=passageInertance({
        densityKgM3:passage.densityKgM3,
        effectiveLengthM:passage.effectiveLengthM,
        effectiveAreaM2:passage.effectiveAreaM2,
        provenance:passage.provenance
      });
    if(!inertance.ok)return inertance;
    const helmholtz=helmholtzEstimate({
      speedOfSoundMps:acoustic.speedOfSoundMps,
      chamberVolumeM3:passage.chamberVolumeM3,
      effectiveNeckAreaM2:passage.effectiveNeckAreaM2,
      effectiveNeckLengthM:passage.effectiveNeckLengthM,
      modelAssumption:passage.helmholtzModelAssumption,
      provenance:passage.provenance
    });
    if(!helmholtz.ok)return helmholtz;
    const timing=passageDelayAndResonances({
      speedOfSoundMps:acoustic.speedOfSoundMps,
      effectiveLengthM:passage.effectiveLengthM,
      quarterWaveBoundaryAssumption:
        passage.quarterWaveBoundaryAssumption,
      halfWaveBoundaryAssumption:
        passage.halfWaveBoundaryAssumption,
      provenance:passage.provenance
    });
    if(!timing.ok)return timing;
    const paths=analyzeBandPaths({
      bandId,
      frequencyHz:acoustic.frequencyHz,
      speedOfSoundMps:acoustic.speedOfSoundMps,
      paths:acoustic.paths,
      ...(has(acoustic,'referencePathToDatumM')
        ?{referencePathToDatumM:acoustic.referencePathToDatumM}:{}),
      ...(has(acoustic,'maximumAllowedSpreadM')
        ?{maximumAllowedSpreadM:acoustic.maximumAllowedSpreadM}:{}),
      provenance:acoustic.provenance
    });
    if(!paths.ok)return paths;
    const interval=intersectAxialBounds({
      stationId,
      bounds:acoustic.axialBounds,
      provenance:acoustic.provenance
    });
    if(!interval.ok)return interval;
    const inside=axial>=interval.legalIntervalM.minimum&&
      axial<=interval.legalIntervalM.maximum,
      diagnostics=[...paths.diagnostics];
    if(!inside)diagnostics.push(diagnostic(
      FAILURE_CODES.ENTRY_STATION_QUERY_OUTSIDE_INTERVAL,'error',
      ['input.hornQuery.axialCoordinateM','input.acousticInputs.axialBounds'],
      'The explicit horn query lies outside the legal axial interval.',
      {
        axialCoordinateM:axial,
        legalIntervalM:interval.legalIntervalM
      }
    ));
    return success({
      stateReference:{
        schemaVersion:2,
        designId:cleanString(state.designId),
        revision:has(state,'revision')?cloneValue(state.revision):null
      },
      entryStationReference:{
        id:stationId,
        role:cleanString(station.role),
        order:station.order,
        sourceIds:uniqueStrings(station.sourceIds),
        bandIds:uniqueStrings(station.bandIds),
        provenanceRefs:uniqueStrings(station.provenanceRefs)
      },
      hornQuery:{
        queryId,
        stationId,
        axialCoordinateM:axial,
        localHornAreaM2:localArea,
        surfaceRevision:cleanString(horn.surfaceRevision),
        provenance:isObject(horn.provenance)
          ?cloneValue(horn.provenance):{}
      },
      bandId,
      wavelength:wavelengthResult,
      reflectionBound:reflection,
      localAreaRatio:areaRatio,
      passage:{
        inertance,
        helmholtzEstimate:helmholtz,
        timingAndResonances:timing
      },
      paths,
      legalAxialInterval:interval,
      hornQueryInsideLegalInterval:inside,
      automaticStationSelection:false,
      inferredValues:[],
      ignoredStateFields:[
        'horn.mouth','sources[].count',
        'entryStations[].apertures.countPerSource',
        'visual spacing and preview geometry'
      ]
    },deepFreeze({
      id:'meh3.explicit-entry-station-analysis.v1',
      expression:
        'composition of explicit acoustic relation results; no geometry solve',
      componentEquationIds:[
        EQUATIONS.wavelength.id,
        EQUATIONS.quarterWaveReflectionBound.id,
        EQUATIONS.apertureToHornAreaRatio.id,
        EQUATIONS.passageInertance.id,
        EQUATIONS.helmholtzEstimate.id,
        EQUATIONS.passageDelay.id,
        EQUATIONS.pathSpread.id,
        EQUATIONS.axialIntervalIntersection.id
      ]
    }),acoustic.provenance,diagnostics);
  }

  function sourceDependencyPreflight(dependency){
    const requested=cleanString(dependency);
    if(requested==='mouth-radiation-load')return fail(
      FAILURE_CODES.MOUTH_LOAD_PROVIDER_UNAVAILABLE,
      'No audited mouth-radiation equation or square/rectangular-to-piston mapping is available in the current source set.',
      {dependency:requested},['dependency']
    );
    if(requested==='horn-segment-abcd'||requested==='branch-abcd')
      return fail(
        FAILURE_CODES.TRANSFER_PROVIDER_UNAVAILABLE,
        'The current source set does not provide the requested ABCD coefficient provider.',
        {dependency:requested},['dependency']
      );
    return fail(
      FAILURE_CODES.INPUT_INVALID,
      'Unknown dependency. Expected horn-segment-abcd, branch-abcd, or mouth-radiation-load.',
      {dependency:requested},['dependency']
    );
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'manufacturing-export',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      hardwareValidated:false,
      manufacturing:false,
      stl:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    version:MODULE_VERSION,
    bandIds:BAND_IDS,
    quarterWaveBoundRole:QUARTER_WAVE_BOUND_ROLE,
    helmholtzAssumption:HELMHOLTZ_ASSUMPTION,
    quarterWaveBoundaryAssumption:QUARTER_WAVE_BOUNDARY,
    halfWaveBoundaryAssumptions:HALF_WAVE_BOUNDARIES,
    failureCodes:FAILURE_CODES,
    modelMetadata:MODEL_METADATA,
    equations:EQUATIONS,
    capabilities:CAPABILITIES,
    wavelength,
    pathPhase,
    quarterWaveReflectionBound,
    apertureToHornAreaRatio,
    passageInertance,
    helmholtzEstimate,
    passageDelayAndResonances,
    analyzeBandPaths,
    analyzeAdjacentBandPhase,
    intersectAxialBounds,
    analyzeEntryStation,
    sourceDependencyPreflight,
    manufacturingPreflight
  });
});
