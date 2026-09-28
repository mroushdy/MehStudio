/* MEH Studio v5 — deterministic three-way entry-station placement.

   The solver selects axial stations only from explicit legal intervals on an
   already-solved horn surface.  It never changes crossover intent, source
   count, aperture area, mouth size, or driver dimensions.  Required host
   footprint and circumferential packing values are explicit inputs from
   upstream driver/aperture/mount phases.

   T3 order is throat → MF → LF.  CX3 solves LF after the shared coax throat.
   H3 has no LF shared-horn station.  COMPOUND_RESEARCH requires a named graph
   solver and is intentionally refused here. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3StationSolver=factory();
})(function(){
  'use strict';

  const VERSION=1;
  const FAILURE_CODES=Object.freeze({
    INPUT_INVALID:'THREEWAY_STATION_INPUT_INVALID',
    STATE_INVALID:'THREEWAY_STATION_STATE_INVALID',
    HORN_INVALID:'THREEWAY_STATION_HORN_INVALID',
    TOPOLOGY_UNSUPPORTED:'THREEWAY_STATION_TOPOLOGY_UNSUPPORTED',
    REQUIREMENT_MISSING:'THREEWAY_ENTRY_STATION_REQUIRED',
    REQUIREMENT_INVALID:'THREEWAY_STATION_REQUIREMENT_INVALID',
    STATION_MISMATCH:'THREEWAY_STATION_REQUIREMENT_MISMATCH',
    INTERVAL_EMPTY:'THREEWAY_ENTRY_STATION_INTERVAL_EMPTY',
    PACKING_UNSOLVABLE:'THREEWAY_ENTRY_STATION_PACKING_UNSOLVABLE',
    ORDER_INVALID:'THREEWAY_ENTRY_STATION_ORDER_INVALID',
    SEARCH_LIMIT:'THREEWAY_STATION_SEARCH_LIMIT',
    NO_COUPLED_SOLUTION:'THREEWAY_ENTRY_STATION_COUPLED_UNSOLVABLE'
  });
  const CAPABILITIES=deepFreeze({
    status:'analysis-placement-only',
    t3:true,
    cx3:true,
    h3:true,
    compoundResearch:false,
    explicitLegalIntervals:true,
    explicitFootprintPacking:true,
    deterministicBoundedSearch:true,
    crossoverMutation:false,
    sourceCountInference:false,
    apertureInference:false,
    mouthGrowth:false,
    driverMotion:false,
    localFrameSolve:false,
    mountSolid:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'Axial placement and broad circumferential packing do not create mounts, passages, solids, or fabrication authority.'
  });
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

  function finiteNumber(value){
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }

  function positiveNumber(value){
    const number=finiteNumber(value);
    return number!==null&&number>0?number:null;
  }

  function nonnegativeNumber(value){
    const number=finiteNumber(value);
    return number!==null&&number>=0?number:null;
  }

  function positiveInteger(value){
    const number=Number(value);
    return Number.isInteger(number)&&number>0?number:null;
  }

  function normalizedAngle(value){
    const number=finiteNumber(value);
    if(number===null)return null;
    const turn=2*Math.PI,
      wrapped=number%turn;
    return wrapped<0?wrapped+turn:wrapped;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function diagnostic(code,severity,paths,message,details){
    return deepFreeze({
      code,
      severity,
      phase:'station-placement',
      paths:uniqueStrings(paths),
      message,
      details:isObject(details)?cloneValue(details):{},
      blocksCapabilities:severity==='error'
        ?['analysis','renderPreview','manufacturingPlan','exactSolid',
          'manufacturing','stl']:[]
    });
  }

  function stableClone(value){
    if(Array.isArray(value))return value.map(stableClone);
    if(isObject(value)){
      const result={};
      for(const key of Object.keys(value).sort()){
        if(value[key]!==undefined)result[key]=stableClone(value[key]);
      }
      return result;
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

  function stateRecord(value){
    return isObject(value)&&isObject(value.state)?value.state:value;
  }

  function sameStrings(left,right){
    return uniqueStrings(left).join('\u0000')===
      uniqueStrings(right).join('\u0000');
  }

  function normalizeRequirement(raw,index,stateStation,diagnostics){
    const record=isObject(raw)?raw:{},
      path='stationRequirements['+index+']',
      stationId=cleanString(record.stationId),
      bandIds=uniqueStrings(record.bandIds),
      sourceIds=uniqueStrings(record.sourceIds),
      sourceCount=positiveInteger(record.sourceCount),
      interval=isObject(record.legalIntervalM)
        ?record.legalIntervalM:{},
      minimumM=nonnegativeNumber(interval.minimum),
      maximumM=nonnegativeNumber(interval.maximum),
      selectionMode=cleanString(record.selectionMode)||'solve',
      requestedM=record.requestedM===null||record.requestedM===undefined
        ?null:nonnegativeNumber(record.requestedM),
      preferenceM=record.preferenceM===null||
          record.preferenceM===undefined
        ?null:nonnegativeNumber(record.preferenceM),
      requiredAxialSpanM=positiveNumber(record.requiredAxialSpanM),
      requiredCircumferentialSpanPerSourceM=positiveNumber(
        record.requiredCircumferentialSpanPerSourceM
      ),
      minimumCircumferentialGapM=nonnegativeNumber(
        record.minimumCircumferentialGapM
      ),
      minimumAxialGapM=nonnegativeNumber(record.minimumAxialGapM),
      azimuthOffsetRad=record.azimuthOffsetRad===undefined
        ?0:normalizedAngle(record.azimuthOffsetRad);
    if(!stationId||!stateStation||stationId!==stateStation.id||
        !sameStrings(bandIds,stateStation.bandIds)||
        !sameStrings(sourceIds,stateStation.sourceIds))
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATION_MISMATCH,'error',
        [path+'.stationId',path+'.bandIds',path+'.sourceIds'],
        'Requirement identity must exactly match the schema-2 entry station.',
        {
          stationId,
          stateStationId:stateStation&&stateStation.id
        }
      ));
    if(sourceCount===null||minimumM===null||maximumM===null||
        maximumM<minimumM||requiredAxialSpanM===null||
        requiredCircumferentialSpanPerSourceM===null||
        minimumCircumferentialGapM===null||
        minimumAxialGapM===null||
        azimuthOffsetRad===null||
        !['solve','bounded-override','documented-lock']
          .includes(selectionMode)||
        ((selectionMode==='bounded-override'||
          selectionMode==='documented-lock')&&requestedM===null))
      diagnostics.push(diagnostic(
        FAILURE_CODES.REQUIREMENT_INVALID,'error',[path],
        'A station requirement needs explicit source count, legal interval, host spans/gaps, and a valid selection mode.'
      ));
    if(requestedM!==null&&minimumM!==null&&maximumM!==null&&
        (requestedM<minimumM-EPS||requestedM>maximumM+EPS))
      diagnostics.push(diagnostic(
        FAILURE_CODES.INTERVAL_EMPTY,'error',
        [path+'.requestedM',path+'.legalIntervalM'],
        'The requested station lies outside its explicit legal interval.'
      ));
    return {
      stationId,
      order:stateStation&&Number.isInteger(stateStation.order)
        ?stateStation.order:null,
      role:stateStation?cleanString(stateStation.role):null,
      bandIds,
      sourceIds,
      sourceCount,
      legalIntervalM:{minimum:minimumM,maximum:maximumM},
      legalBounds:Array.isArray(record.legalBounds)
        ?record.legalBounds.map(cloneValue):[],
      selectionMode,
      requestedM,
      preferenceM,
      requiredAxialSpanM,
      requiredCircumferentialSpanPerSourceM,
      minimumCircumferentialGapM,
      minimumAxialGapM,
      azimuthOffsetRad,
      distribution:cleanString(record.distribution)||'rotational',
      provenanceRefs:uniqueStrings(record.provenanceRefs)
    };
  }

  function interpolateNumber(left,right,t){
    return left+(right-left)*t;
  }

  function querySurfaceAt(surface,axialM){
    const stations=surface.stations;
    if(axialM<stations[0].axialM-EPS||
        axialM>stations[stations.length-1].axialM+EPS)return null;
    if(Math.abs(axialM-stations[0].axialM)<=EPS)
      return stationQuery(stations[0],axialM,0,0);
    for(let index=1;index<stations.length;index++){
      const right=stations[index],left=stations[index-1];
      if(axialM<=right.axialM+EPS){
        const denominator=right.axialM-left.axialM,
          t=denominator>EPS
            ?Math.max(0,Math.min(1,(axialM-left.axialM)/denominator)):0;
        return {
          axialM,
          sourceStationIndices:[index-1,index],
          interpolationFraction:t,
          localHornAreaM2:interpolateNumber(
            left.sectionAreaM2,right.sectionAreaM2,t
          ),
          localHornPerimeterM:interpolateNumber(
            left.sectionPerimeterM,right.sectionPerimeterM,t
          ),
          section:{
            widthM:interpolateNumber(
              left.section.widthM,right.section.widthM,t
            ),
            heightM:interpolateNumber(
              left.section.heightM,right.section.heightM,t
            ),
            family:left.section.family,
            exponent:interpolateNumber(
              left.section.exponent,right.section.exponent,t
            )
          },
          surfaceHash:surface.surfaceHash
        };
      }
    }
    const last=stations[stations.length-1];
    return stationQuery(last,axialM,stations.length-1,0);
  }

  function stationQuery(station,axialM,index,fraction){
    return {
      axialM,
      sourceStationIndices:[index,index],
      interpolationFraction:fraction,
      localHornAreaM2:station.sectionAreaM2,
      localHornPerimeterM:station.sectionPerimeterM,
      section:{
        widthM:station.section.widthM,
        heightM:station.section.heightM,
        family:station.section.family,
        exponent:station.section.exponent
      }
    };
  }

  function candidateAxials(requirement,surface,optimization){
    const half=requirement.requiredAxialSpanM/2,
      hornMinimum=surface.stations[0].axialM,
      hornMaximum=surface.stations[surface.stations.length-1].axialM,
      minimum=Math.max(
        requirement.legalIntervalM.minimum+half,hornMinimum+half
      ),
      maximum=Math.min(
        requirement.legalIntervalM.maximum-half,hornMaximum-half
      );
    if(maximum<minimum-EPS)return {
      minimum,maximum,axials:[],effectiveEmpty:true
    };
    const values=[minimum,maximum,(minimum+maximum)/2];
    for(const station of surface.stations){
      if(station.axialM>=minimum-EPS&&station.axialM<=maximum+EPS)
        values.push(Math.max(minimum,Math.min(maximum,station.axialM)));
    }
    if(requirement.requestedM!==null)
      values.push(requirement.requestedM);
    if(requirement.preferenceM!==null)
      values.push(requirement.preferenceM);
    let axials=[...new Set(values.map(value=>
      Math.round(value*1e12)/1e12
    ))].filter(value=>value>=minimum-EPS&&value<=maximum+EPS)
      .sort((left,right)=>left-right);
    if(requirement.selectionMode==='documented-lock')
      axials=axials.filter(value=>
        Math.abs(value-requirement.requestedM)<=1e-9
      );
    const target=requirement.selectionMode!=='solve'&&
        requirement.requestedM!==null
      ?requirement.requestedM
      :optimization==='compact'?minimum
        :optimization==='low-distortion'&&
          requirement.preferenceM!==null
          ?requirement.preferenceM:(minimum+maximum)/2;
    return {minimum,maximum,axials,target,effectiveEmpty:false};
  }

  function candidatesFor(requirement,surface,optimization){
    const range=candidateAxials(requirement,surface,optimization);
    if(range.effectiveEmpty)return {...range,candidates:[]};
    const candidates=[];
    for(const axialM of range.axials){
      const query=querySurfaceAt(surface,axialM);
      if(!query)continue;
      const requiredPerimeterM=requirement.sourceCount*(
          requirement.requiredCircumferentialSpanPerSourceM+
          requirement.minimumCircumferentialGapM
        ),
        availablePitchM=query.localHornPerimeterM/
          requirement.sourceCount,
        requiredPitchM=
          requirement.requiredCircumferentialSpanPerSourceM+
          requirement.minimumCircumferentialGapM,
        packingMarginM=query.localHornPerimeterM-requiredPerimeterM,
        packingOk=packingMarginM>=-EPS,
        intervalSpan=Math.max(range.maximum-range.minimum,EPS),
        selectionScore=Math.abs(axialM-range.target)/intervalSpan;
      if(packingOk)candidates.push({
        stationId:requirement.stationId,
        axialM,
        query,
        requiredPerimeterM,
        availablePitchM,
        requiredPitchM,
        packingMarginM,
        selectionScore
      });
    }
    candidates.sort((left,right)=>
      left.selectionScore-right.selectionScore||
      left.axialM-right.axialM
    );
    return {...range,candidates};
  }

  function orderGap(leftRequirement,rightRequirement){
    return (
      leftRequirement.requiredAxialSpanM+
      rightRequirement.requiredAxialSpanM
    )/2+Math.max(
      leftRequirement.minimumAxialGapM,
      rightRequirement.minimumAxialGapM
    );
  }

  function solveCombinations(requirements,candidateSets,maxSearch){
    let evaluated=0,limitReached=false,best=null;
    function visit(index,selected,score){
      if(limitReached)return;
      if(index===requirements.length){
        evaluated++;
        const key=selected.map(item=>item.axialM.toFixed(12)).join('|');
        if(!best||score<best.score-EPS||
            (Math.abs(score-best.score)<=EPS&&key<best.key))
          best={selected:selected.slice(),score,key};
        if(evaluated>=maxSearch)limitReached=true;
        return;
      }
      const requirement=requirements[index],
        candidates=candidateSets[index].candidates;
      for(const candidate of candidates){
        if(selected.length){
          const previous=selected[selected.length-1],
            previousRequirement=requirements[index-1],
            minimum=previous.axialM+
              orderGap(previousRequirement,requirement);
          if(candidate.axialM<minimum-EPS)continue;
        }
        selected.push(candidate);
        visit(index+1,selected,score+candidate.selectionScore);
        selected.pop();
        if(limitReached)return;
      }
    }
    visit(0,[],0);
    return {best,evaluated,limitReached};
  }

  function solveEntryStations(input){
    if(!isObject(input))return failure([
      diagnostic(
        FAILURE_CODES.INPUT_INVALID,'error',['input'],
        'An explicit station-solver input is required.'
      )
    ]);
    const state=stateRecord(input.state),
      surface=input.hornSurface,
      diagnostics=[];
    if(!isObject(state)||Number(state.schemaVersion)!==2||
        !isObject(state.topology)||!cleanString(state.topology.kind)||
        !Array.isArray(state.entryStations))
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATE_INVALID,'error',['state'],
        'A normalized schema-2 state with explicit entry stations is required.'
      ));
    if(!isObject(surface)||surface.ok!==true||
        surface.kind!=='threeway-horn-surface'||
        !cleanString(surface.surfaceHash)||
        !Array.isArray(surface.stations)||surface.stations.length<2)
      diagnostics.push(diagnostic(
        FAILURE_CODES.HORN_INVALID,'error',['hornSurface'],
        'A successful immutable three-way horn-surface result is required.'
      ));
    const topology=state&&state.topology
        ?cleanString(state.topology.kind):null;
    if(topology==='COMPOUND_RESEARCH')diagnostics.push(diagnostic(
      FAILURE_CODES.TOPOLOGY_UNSUPPORTED,'error',
      ['state.topology.kind'],
      'COMPOUND_RESEARCH requires a named graph-specific station solver.'
    ));
    if(diagnostics.length)return failure(diagnostics);
    const requirementsRaw=Array.isArray(input.stationRequirements)
        ?input.stationRequirements:[],
      stateStations=state.entryStations.slice().sort((left,right)=>
        (Number.isInteger(left.order)?left.order:Number.MAX_SAFE_INTEGER)-
          (Number.isInteger(right.order)?right.order:
            Number.MAX_SAFE_INTEGER)||
        String(left.id||'').localeCompare(String(right.id||''))
      ),
      rawById=new Map(requirementsRaw.map(item=>[
        cleanString(item&&item.stationId),item
      ])),
      requirements=[];
    for(let index=0;index<stateStations.length;index++){
      const station=stateStations[index],
        raw=rawById.get(cleanString(station.id));
      if(!raw){
        diagnostics.push(diagnostic(
          FAILURE_CODES.REQUIREMENT_MISSING,'error',
          ['stationRequirements'],
          'Every schema-2 entry station needs one explicit placement requirement.',
          {stationId:station.id}
        ));
        continue;
      }
      requirements.push(normalizeRequirement(
        raw,index,station,diagnostics
      ));
    }
    if(requirementsRaw.length!==stateStations.length)
      diagnostics.push(diagnostic(
        FAILURE_CODES.REQUIREMENT_INVALID,'error',
        ['stationRequirements'],
        'Station requirements must be one-to-one with state.entryStations.'
      ));
    for(let index=1;index<requirements.length;index++){
      if(!(requirements[index].order>requirements[index-1].order))
        diagnostics.push(diagnostic(
          FAILURE_CODES.ORDER_INVALID,'error',
          ['state.entryStations'],
          'Conventional shared-horn station order must be explicit and strictly increasing.'
        ));
    }
    if(diagnostics.some(item=>item.severity==='error'))
      return failure(diagnostics);
    const optimization=cleanString(input.optimization)||'balanced';
    if(!['compact','balanced','low-distortion'].includes(optimization))
      return failure([diagnostic(
        FAILURE_CODES.INPUT_INVALID,'error',['optimization'],
        'Optimization must be compact, balanced, or low-distortion.'
      )]);
    if(optimization==='low-distortion'&&
        requirements.some(item=>item.preferenceM===null))
      return failure([diagnostic(
        FAILURE_CODES.REQUIREMENT_INVALID,'error',
        ['stationRequirements[].preferenceM'],
        'Low-distortion ranking requires an explicit upstream acoustic preference for every station.'
      )]);
    const candidateSets=requirements.map(requirement=>
      candidatesFor(requirement,surface,optimization)
    );
    for(let index=0;index<candidateSets.length;index++){
      const set=candidateSets[index],requirement=requirements[index];
      if(set.maximum<set.minimum-EPS)diagnostics.push(diagnostic(
        FAILURE_CODES.INTERVAL_EMPTY,'error',
        ['stationRequirements['+index+'].legalIntervalM',
          'stationRequirements['+index+'].requiredAxialSpanM'],
        'The explicit legal interval cannot contain the required axial host span.',
        {effectiveIntervalM:{minimum:set.minimum,maximum:set.maximum}}
      ));
      else if(!set.candidates.length)diagnostics.push(diagnostic(
        FAILURE_CODES.PACKING_UNSOLVABLE,'error',
        ['stationRequirements['+index+']','hornSurface.stations'],
        'No horn station in the legal interval has enough explicit perimeter for this source footprint.',
        {
          stationId:requirement.stationId,
          sourceCount:requirement.sourceCount,
          requiredPerimeterM:requirement.sourceCount*(
            requirement.requiredCircumferentialSpanPerSourceM+
            requirement.minimumCircumferentialGapM
          ),
          legalIntervalM:requirement.legalIntervalM
        }
      ));
    }
    if(diagnostics.some(item=>item.severity==='error'))
      return failure(diagnostics);
    const maxSearch=positiveInteger(input.maxSearchCombinations)||200000,
      search=solveCombinations(requirements,candidateSets,maxSearch);
    if(!search.best){
      diagnostics.push(diagnostic(
        FAILURE_CODES.NO_COUPLED_SOLUTION,'error',
        ['stationRequirements'],
        'Individually feasible stations cannot satisfy their explicit order, host spans, and inter-station gaps.'
      ));
      return failure(diagnostics);
    }
    if(search.limitReached)diagnostics.push(diagnostic(
      FAILURE_CODES.SEARCH_LIMIT,'warning',['maxSearchCombinations'],
      'The bounded deterministic search reached its declared evaluation limit after finding a candidate.',
      {evaluated:search.evaluated,maxSearchCombinations:maxSearch}
    ));
    const selected=search.best.selected.map((candidate,index)=>({
        stationId:candidate.stationId,
        order:requirements[index].order,
        role:requirements[index].role,
        bandIds:requirements[index].bandIds,
        sourceIds:requirements[index].sourceIds,
        sourceCount:requirements[index].sourceCount,
        axialM:candidate.axialM,
        legalIntervalM:requirements[index].legalIntervalM,
        selectionMode:requirements[index].selectionMode,
        requestedM:requirements[index].requestedM,
        preferenceM:requirements[index].preferenceM,
        requiredAxialSpanM:requirements[index].requiredAxialSpanM,
        minimumAxialGapM:requirements[index].minimumAxialGapM,
        distribution:requirements[index].distribution,
        azimuthOffsetRad:requirements[index].azimuthOffsetRad,
        circumferential:{
          requiredSpanPerSourceM:
            requirements[index].requiredCircumferentialSpanPerSourceM,
          minimumGapM:
            requirements[index].minimumCircumferentialGapM,
          requiredPerimeterM:candidate.requiredPerimeterM,
          localHornPerimeterM:candidate.query.localHornPerimeterM,
          packingMarginM:candidate.packingMarginM,
          pitchM:candidate.availablePitchM,
          sourceAzimuthsRad:Array.from(
            {length:requirements[index].sourceCount},
            (_,sourceIndex)=>(
              requirements[index].azimuthOffsetRad+
              2*Math.PI*sourceIndex/requirements[index].sourceCount
            )%(2*Math.PI)
          )
        },
        hornQuery:{
          queryId:'station-query:'+candidate.stationId,
          stationId:candidate.stationId,
          axialCoordinateM:candidate.axialM,
          localHornAreaM2:candidate.query.localHornAreaM2,
          localHornPerimeterM:candidate.query.localHornPerimeterM,
          section:candidate.query.section,
          surfaceRevision:surface.surfaceHash,
          interpolation:{
            sourceStationIndices:
              candidate.query.sourceStationIndices,
            fraction:candidate.query.interpolationFraction
          }
        },
        provenanceRefs:requirements[index].provenanceRefs
      })),
      resultRecord=deepFreeze({
        schemaVersion:2,
        inputHash:cleanString(input.inputHash)||null,
        topology,
        hornSurfaceHash:surface.surfaceHash,
        optimization,
        selectedEntryStations:selected,
        search:{
          deterministic:true,
          bounded:true,
          evaluatedCombinations:search.evaluated,
          maxSearchCombinations:maxSearch,
          limitReached:search.limitReached,
          score:search.best.score
        },
        crossoverIntentMutated:false,
        sourceCountInferred:false,
        mouthMutated:false,
        manufacturing:false
      });
    return deepFreeze({
      ok:true,
      code:null,
      result:resultRecord,
      diagnostics:diagnostics.slice().sort(compareDiagnostics),
      hashInput:'meh3-station-solve-v1\n'+stableStringify(resultRecord),
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function compareDiagnostics(left,right){
    return [
      left.code,left.paths.join('\u0000'),left.message
    ].join('\u0001').localeCompare([
      right.code,right.paths.join('\u0000'),right.message
    ].join('\u0001'));
  }

  function failure(diagnostics){
    const ordered=diagnostics.slice().sort(compareDiagnostics);
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
      operation:cleanString(operation)||'station-manufacturing',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    version:VERSION,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    stableStringify,
    solveEntryStations,
    manufacturingPreflight
  });
});
