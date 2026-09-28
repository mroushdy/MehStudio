/* MEH Studio v5 — explicit three-way front-chamber relation solver.

   This is an analysis boundary, not a chamber mesh generator.  It evaluates
   a caller-declared chamber volume or, only when explicitly requested,
   derives the ideal lumped volume associated with a target Helmholtz
   frequency.  Driver area, source count, aperture area, passage length,
   end correction, bounds, air properties, and resonance policy are never
   inferred from a product name, mouth size, crossover, or preview geometry.

   The ideal Helmholtz relation is retained as an estimate.  It is not a
   replacement for the coupled branch model and cannot authorize hardware,
   Boolean geometry, manufacturing, or STL export. */
(function(factory){
  if(typeof module==='object'&&module.exports)
    module.exports=factory(require('./threeway-acoustics.js'));
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3ChamberSolver=factory(globalThis.MEH3Acoustics);
})(function(acoustics){
  'use strict';

  const VERSION=1;
  const VOLUME_MODES=Object.freeze(['explicit','target-resonance']);
  const RESONANCE_POLICIES=Object.freeze(['warn','refuse']);
  const FAILURE_CODES=Object.freeze({
    DEPENDENCY_UNAVAILABLE:'THREEWAY_CHAMBER_DEPENDENCY_UNAVAILABLE',
    INPUT_INVALID:'THREEWAY_CHAMBER_INPUT_INVALID',
    ID_DUPLICATE:'THREEWAY_CHAMBER_ID_DUPLICATE',
    OWNERSHIP_INVALID:'THREEWAY_CHAMBER_OWNERSHIP_INVALID',
    VOLUME_POLICY_INVALID:'THREEWAY_CHAMBER_VOLUME_POLICY_INVALID',
    VOLUME_OUTSIDE_BOUNDS:'THREEWAY_CHAMBER_VOLUME_OUTSIDE_BOUNDS',
    NETWORK_UNSOLVABLE:'THREEWAY_CHAMBER_NETWORK_UNSOLVABLE',
    RESONANCE_IN_BAND:'THREEWAY_PASSAGE_RESONANCE_IN_BAND',
    DISPLACEMENT_RATIO_EXCEEDED:
      'THREEWAY_CHAMBER_DISPLACEMENT_RATIO_EXCEEDED'
  });
  const CAPABILITIES=deepFreeze({
    status:'ideal-lumped-front-chamber-analysis',
    explicitVolume:true,
    explicitTargetResonanceSolve:true,
    chamberCompliance:true,
    passageInertance:true,
    delayAndIdealModes:true,
    coupledBranchReplacement:false,
    geometrySolve:false,
    crossoverMutation:false,
    mouthInference:false,
    driverInference:false,
    hardwareValidated:false,
    manufacturingPlan:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'An ideal lumped chamber relation is not a connected chamber solid or a validated coupled electroacoustic model.'
  });
  const BAND_IDS=Object.freeze(['low','mid','high']);
  const EPS=1e-12;

  function isObject(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
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

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function positive(value){
    const number=Number(value);
    return Number.isFinite(number)&&number>0?number:null;
  }

  function nonnegative(value){
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
    return uniqueStrings(value).filter(item=>BAND_IDS.includes(item))
      .sort((left,right)=>BAND_IDS.indexOf(left)-BAND_IDS.indexOf(right));
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

  function diagnostic(code,severity,paths,message,details){
    return deepFreeze({
      code,
      severity,
      phase:'front-chamber-analysis',
      paths:uniqueStrings(paths),
      message,
      details:isObject(details)?cloneValue(details):{},
      blocksCapabilities:severity==='error'
        ?['analysis','renderPreview','manufacturingPlan','exactSolid',
          'manufacturing','stl']:[]
    });
  }

  function compareDiagnostics(left,right){
    return [left.code,left.paths.join('\u0000'),left.message]
      .join('\u0001').localeCompare(
        [right.code,right.paths.join('\u0000'),right.message]
          .join('\u0001')
      );
  }

  function failure(diagnostics,id,sourceId,stationId){
    const ordered=diagnostics.slice().sort(compareDiagnostics);
    return deepFreeze({
      ok:false,
      code:ordered.length?ordered[0].code:FAILURE_CODES.INPUT_INVALID,
      id:id||null,
      sourceId:sourceId||null,
      stationId:stationId||null,
      record:null,
      diagnostics:ordered,
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function dependencyReady(){
    return isObject(acoustics)&&
      typeof acoustics.passageInertance==='function'&&
      typeof acoustics.helmholtzEstimate==='function'&&
      typeof acoustics.passageDelayAndResonances==='function'&&
      typeof acoustics.helmholtzAssumption==='string'&&
      typeof acoustics.quarterWaveBoundaryAssumption==='string'&&
      Array.isArray(acoustics.halfWaveBoundaryAssumptions);
  }

  function normalizeBounds(raw,diagnostics,path){
    const bounds=isObject(raw)?raw:{},
      minimum=positive(bounds.minimum),
      maximum=positive(bounds.maximum);
    if(minimum===null||maximum===null||maximum<minimum)
      diagnostics.push(diagnostic(
        FAILURE_CODES.VOLUME_POLICY_INVALID,'error',[path],
        'Chamber volume bounds require positive minimum and maximum values in increasing order.'
      ));
    return {minimum,maximum};
  }

  function solveFrontChamber(input){
    if(!dependencyReady())return failure([diagnostic(
      FAILURE_CODES.DEPENDENCY_UNAVAILABLE,'error',['threeway-acoustics'],
      'The audited three-way acoustic relation provider is unavailable.'
    )]);
    const source=isObject(input)?input:{},
      diagnostics=[],
      id=cleanString(source.id),
      sourceId=cleanString(source.sourceId),
      stationId=cleanString(source.stationId),
      bandIds=normalizeBands(source.bandIds),
      sourceCount=positiveInteger(source.sourceCount),
      driverEffectiveAreaM2=positive(source.driverEffectiveAreaM2),
      apertureAreaM2=positive(source.summedApertureAreaM2),
      air=isObject(source.air)?source.air:{},
      densityKgM3=positive(air.densityKgM3),
      speedOfSoundMps=positive(air.speedOfSoundMps),
      passage=isObject(source.passage)?source.passage:{},
      physicalLengthM=positive(passage.physicalLengthM),
      endCorrectionM=nonnegative(passage.endCorrectionM),
      volumePolicy=isObject(source.volumePolicy)?source.volumePolicy:{},
      volumeMode=cleanString(volumePolicy.mode),
      volumeBounds=normalizeBounds(
        source.volumeBoundsM3,diagnostics,'volumeBoundsM3'
      ),
      resonancePolicy=isObject(source.resonancePolicy)
        ?source.resonancePolicy:{},
      minimumAllowedResonanceHz=
        positive(resonancePolicy.minimumAllowedHz),
      resonanceAction=cleanString(resonancePolicy.action),
      provenanceRefs=uniqueStrings(source.provenanceRefs);
    if(!id||!sourceId||!stationId||!bandIds.length)
      diagnostics.push(diagnostic(
        FAILURE_CODES.OWNERSHIP_INVALID,'error',
        ['id','sourceId','stationId','bandIds'],
        'A chamber requires stable ID, source/station ownership, and one or more canonical bands.'
      ));
    if(sourceCount===null||driverEffectiveAreaM2===null||
        apertureAreaM2===null||densityKgM3===null||
        speedOfSoundMps===null||physicalLengthM===null||
        endCorrectionM===null)
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,'error',
        [
          'sourceCount','driverEffectiveAreaM2',
          'summedApertureAreaM2','air',
          'passage.physicalLengthM','passage.endCorrectionM'
        ],
        'Count, driver area, aperture area, air properties, and physical/effective passage lengths must be explicit positive SI values.'
      ));
    if(!VOLUME_MODES.includes(volumeMode))
      diagnostics.push(diagnostic(
        FAILURE_CODES.VOLUME_POLICY_INVALID,'error',
        ['volumePolicy.mode'],
        'Volume mode must be explicit or target-resonance.'
      ));
    if(minimumAllowedResonanceHz===null||
        !RESONANCE_POLICIES.includes(resonanceAction))
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,'error',['resonancePolicy'],
        'An explicit minimum resonance and warn/refuse action are required.'
      ));
    let chamberVolumeM3=null,targetFrequencyHz=null;
    const effectiveLengthM=physicalLengthM!==null&&endCorrectionM!==null
      ?physicalLengthM+endCorrectionM:null;
    if(volumeMode==='explicit')
      chamberVolumeM3=positive(volumePolicy.volumeM3);
    else if(volumeMode==='target-resonance'){
      targetFrequencyHz=positive(volumePolicy.targetFrequencyHz);
      if(targetFrequencyHz!==null&&speedOfSoundMps!==null&&
          apertureAreaM2!==null&&effectiveLengthM!==null)
        chamberVolumeM3=apertureAreaM2/
          (effectiveLengthM*
            Math.pow(2*Math.PI*targetFrequencyHz/speedOfSoundMps,2));
    }
    if((volumeMode==='explicit'&&chamberVolumeM3===null)||
        (volumeMode==='target-resonance'&&targetFrequencyHz===null))
      diagnostics.push(diagnostic(
        FAILURE_CODES.VOLUME_POLICY_INVALID,'error',['volumePolicy'],
        volumeMode==='target-resonance'
          ?'Target-resonance mode requires an explicit positive target frequency.'
          :'Explicit mode requires an explicit positive chamber volume.'
      ));
    if(chamberVolumeM3!==null&&volumeBounds.minimum!==null&&
        volumeBounds.maximum!==null&&
        (chamberVolumeM3<volumeBounds.minimum-EPS||
          chamberVolumeM3>volumeBounds.maximum+EPS))
      diagnostics.push(diagnostic(
        FAILURE_CODES.VOLUME_OUTSIDE_BOUNDS,'error',
        ['volumePolicy','volumeBoundsM3'],
        'The selected or explicitly derived chamber volume lies outside its declared package bounds.',
        {chamberVolumeM3,volumeBoundsM3:volumeBounds}
      ));
    if(diagnostics.some(item=>item.severity==='error'))
      return failure(diagnostics,id,sourceId,stationId);
    const inertance=acoustics.passageInertance({
        densityKgM3,
        effectiveLengthM,
        effectiveAreaM2:apertureAreaM2,
        provenance:{evidenceRefs:provenanceRefs}
      }),
      helmholtz=acoustics.helmholtzEstimate({
        speedOfSoundMps,
        chamberVolumeM3,
        effectiveNeckAreaM2:apertureAreaM2,
        effectiveNeckLengthM:effectiveLengthM,
        modelAssumption:acoustics.helmholtzAssumption,
        provenance:{evidenceRefs:provenanceRefs}
      }),
      modes=acoustics.passageDelayAndResonances({
        speedOfSoundMps,
        effectiveLengthM,
        quarterWaveBoundaryAssumption:
          acoustics.quarterWaveBoundaryAssumption,
        halfWaveBoundaryAssumption:
          acoustics.halfWaveBoundaryAssumptions[0],
        provenance:{evidenceRefs:provenanceRefs}
      });
    if(!inertance.ok||!helmholtz.ok||!modes.ok)
      return failure([diagnostic(
        FAILURE_CODES.NETWORK_UNSOLVABLE,'error',
        ['passage','volumePolicy'],
        'The explicit chamber/passsage relation provider refused the selected inputs.',
        {
          inertanceCode:inertance.code||null,
          helmholtzCode:helmholtz.code||null,
          modesCode:modes.code||null
        }
      )],id,sourceId,stationId);
    const resonanceHz=helmholtz.estimatedHelmholtzHz;
    if(resonanceHz<minimumAllowedResonanceHz-EPS)
      diagnostics.push(diagnostic(
        FAILURE_CODES.RESONANCE_IN_BAND,
        resonanceAction==='refuse'?'error':'warning',
        ['resonancePolicy','volumePolicy','passage'],
        'The ideal chamber/passage resonance is below the explicitly declared minimum.',
        {estimatedHz:resonanceHz,minimumAllowedHz:minimumAllowedResonanceHz}
      ));
    const xMaxM=source.displacement
        ?nonnegative(source.displacement.xMaxM):null,
      maximumDisplacementFraction=source.displacement
        ?positive(source.displacement.maximumChamberFraction):null,
      peakDisplacementVolumeM3=xMaxM===null?null:
        sourceCount*driverEffectiveAreaM2*xMaxM,
      displacementFraction=peakDisplacementVolumeM3===null?null:
        peakDisplacementVolumeM3/chamberVolumeM3;
    if(source.displacement&&
        (xMaxM===null||maximumDisplacementFraction===null))
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,'error',['displacement'],
        'Displacement analysis requires explicit nonnegative Xmax and a positive maximum chamber fraction.'
      ));
    else if(displacementFraction!==null&&
        displacementFraction>maximumDisplacementFraction+EPS)
      diagnostics.push(diagnostic(
        FAILURE_CODES.DISPLACEMENT_RATIO_EXCEEDED,
        cleanString(source.displacement.action)==='refuse'
          ?'error':'warning',
        ['displacement'],
        'Peak geometric displacement exceeds the declared fraction of front-chamber volume.',
        {
          peakDisplacementVolumeM3,
          chamberVolumeM3,
          displacementFraction,
          maximumChamberFraction:maximumDisplacementFraction
        }
      ));
    if(diagnostics.some(item=>item.severity==='error'))
      return failure(diagnostics,id,sourceId,stationId);
    const totalDriverAreaM2=sourceCount*driverEffectiveAreaM2,
      complianceM5PerN=chamberVolumeM3/
        (densityKgM3*speedOfSoundMps*speedOfSoundMps),
      record=deepFreeze({
        schemaVersion:1,
        id,
        sourceId,
        stationId,
        bandIds,
        sourceCount,
        driverEffectiveAreaM2,
        totalDriverAreaM2,
        summedApertureAreaM2:apertureAreaM2,
        compressionRatio:totalDriverAreaM2/apertureAreaM2,
        air:{densityKgM3,speedOfSoundMps},
        passage:{
          physicalLengthM,
          endCorrectionM,
          effectiveLengthM
        },
        volume:{
          mode:volumeMode,
          chamberVolumeM3,
          boundsM3:volumeBounds,
          targetFrequencyHz,
          automaticallySelected:false
        },
        lumpedEstimate:{
          modelAssumption:acoustics.helmholtzAssumption,
          chamberComplianceM5PerN:complianceM5PerN,
          acousticInertancePaS2M3:
            inertance.acousticInertancePaS2M3,
          estimatedHelmholtzHz:resonanceHz,
          oneWayDelayS:modes.oneWayDelayS,
          idealLongitudinalModes:modes.modes,
          coupledBranchReplacement:false
        },
        resonancePolicy:{
          minimumAllowedHz:minimumAllowedResonanceHz,
          action:resonanceAction,
          pass:resonanceHz>=minimumAllowedResonanceHz-EPS
        },
        displacement:source.displacement?{
          xMaxM,
          peakDisplacementVolumeM3,
          displacementFraction,
          maximumChamberFraction:maximumDisplacementFraction,
          action:cleanString(source.displacement.action)||'warn'
        }:null,
        provenanceRefs,
        geometryCreated:false,
        manufacturingValidated:false
      });
    return deepFreeze({
      ok:true,
      code:null,
      record,
      diagnostics:diagnostics.slice().sort(compareDiagnostics),
      hashInput:'meh3-front-chamber-v1\n'+stableStringify(record),
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function solveFrontChamberNetwork(input){
    const items=isObject(input)&&Array.isArray(input.chambers)
        ?input.chambers:[],
      diagnostics=[],
      ids=new Set(),
      keyed=[];
    if(!items.length)return failure([diagnostic(
      FAILURE_CODES.INPUT_INVALID,'error',['chambers'],
      'One or more explicit chamber records are required.'
    )]);
    for(let index=0;index<items.length;index++){
      const id=cleanString(items[index]&&items[index].id);
      if(!id||ids.has(id)){
        diagnostics.push(diagnostic(
          FAILURE_CODES.ID_DUPLICATE,'error',
          ['chambers['+index+'].id'],
          'Chamber IDs must be nonempty and unique.'
        ));
        continue;
      }
      ids.add(id);
      keyed.push({id,input:items[index]});
    }
    if(diagnostics.length)return failure(diagnostics);
    keyed.sort((left,right)=>left.id.localeCompare(right.id));
    const results=keyed.map(item=>solveFrontChamber(item.input));
    for(const result of results)
      if(Array.isArray(result.diagnostics))
        diagnostics.push(...result.diagnostics);
    const ok=results.every(item=>item.ok);
    return deepFreeze({
      ok,
      code:ok?null:FAILURE_CODES.NETWORK_UNSOLVABLE,
      chambers:results,
      byId:Object.fromEntries(results.map(item=>[
        item.id||item.record&&item.record.id,item
      ])),
      diagnostics:diagnostics.slice().sort(compareDiagnostics),
      inferredValues:[],
      automaticVolumeSelection:false,
      geometryCreated:false,
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'front-chamber-solid',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    version:VERSION,
    volumeModes:VOLUME_MODES,
    resonancePolicies:RESONANCE_POLICIES,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    stableStringify,
    solveFrontChamber,
    solveFrontChamberNetwork,
    manufacturingPreflight
  });
});
