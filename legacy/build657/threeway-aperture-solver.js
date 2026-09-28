/* MEH Studio v5 — pure explicit three-way aperture candidate solver.

   This Stage 2 module solves analytic round or racetrack apertures inside an
   explicitly declared two-dimensional driver-local host. It owns no driver
   catalogue, horn placement, mouth sizing, renderer, mesh, Boolean, or
   manufacturing operation.

   Count, summed area, compression bounds, host, footprint limits, structural
   web, edge clearance, placement policy, orientation, upper frequency, and
   sound speed are all required inputs. Product names, mouth dimensions, and
   source-array order never create acoustic or geometric values. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3ApertureSolver=factory();
})(function(){
  'use strict';

  const MODULE_VERSION=1;
  const FAILURE_CODES=deepFreeze({
    INPUT_REQUIRED:'THREEWAY_APERTURE_INPUT_REQUIRED',
    INPUT_INVALID:'THREEWAY_APERTURE_INPUT_INVALID',
    SOURCE_DUPLICATE:'THREEWAY_APERTURE_SOURCE_DUPLICATE',
    COUNT_INVALID:'THREEWAY_APERTURE_COUNT_INVALID',
    AREA_UNSOLVABLE:'THREEWAY_APERTURE_AREA_UNSOLVABLE',
    COMPRESSION_RATIO_OUT_OF_BOUNDS:
      'THREEWAY_APERTURE_COMPRESSION_RATIO_OUT_OF_BOUNDS',
    ORIENTATION_POLICY_INVALID:
      'THREEWAY_APERTURE_ORIENTATION_POLICY_INVALID',
    PLACEMENT_POLICY_INVALID:
      'THREEWAY_APERTURE_PLACEMENT_POLICY_INVALID',
    FOOTPRINT_OUTSIDE_HOST:
      'THREEWAY_APERTURE_FOOTPRINT_OUTSIDE_HOST',
    STRUCTURAL_WEB_INSUFFICIENT:
      'THREEWAY_STRUCTURAL_WEB_INSUFFICIENT',
    SPACING_EXCEEDED:'THREEWAY_APERTURE_SPACING_EXCEEDED',
    LAYOUT_UNSOLVABLE:'THREEWAY_APERTURE_LAYOUT_UNSOLVABLE'
  });
  const HOST_ROLES=Object.freeze(['active-cone','front-chamber']);
  const HOST_SHAPES=Object.freeze(['circle','rectangle']);
  const APERTURE_SHAPES=Object.freeze(['round','racetrack']);
  const AREA_MODES=Object.freeze(['target','range']);
  const AREA_RANGE_SELECTIONS=Object.freeze([
    'minimum','midpoint','maximum'
  ]);
  const ORIENTATION_MODES=Object.freeze([
    'driver-local-parallel','panel-parallel'
  ]);
  const SPACING_MODES=Object.freeze([
    'explicit-center-spacing','maximize-symmetric-spacing'
  ]);
  const WAVELENGTH_POLICIES=Object.freeze(['warn','refuse']);
  const CANDIDATE_POLICY='enumerate-all-declared-counts';

  const MODEL_METADATA=deepFreeze({
    id:'meh3-explicit-aperture-candidate-solver',
    revision:'stage-2-v1',
    classification:'experimental-analytic-geometry',
    hardwareValidated:false,
    manufacturing:false,
    sourceBasis:[
      {
        relation:'aperture center spacing <= approximately lambda/4',
        source:'threeway-primary-source-ledger.md §4.7 / Waslo guide',
        status:'author rule of thumb, not a universal theorem'
      },
      {
        relation:'short, corner-biased racetrack openings reduce intrusion',
        source:'threeway-primary-source-ledger.md §8.2 / Hinson guide',
        status:'documented build method, not universal optimization'
      },
      {
        relation:'entry count and optimum spacing are not mouth-derived',
        source:'threeway-primary-source-ledger.md §4.8',
        status:'explicit corpus limitation'
      }
    ],
    limitations:[
      'The host is a driver-local 2D circle or axis-aligned rectangle.',
      'Racetracks are exact planar capsules with semicircular end caps.',
      'All apertures in one candidate share one declared long-axis angle.',
      'Wavelength spacing is only a warning unless the caller explicitly requests refusal.',
      'No horn-surface projection, passage sweep, structural stress, or acoustic field solve is performed.'
    ]
  });

  const EQUATIONS=deepFreeze({
    round:{
      id:'meh3.aperture-round.v1',
      area:'A = pi r^2',
      perimeter:'P = 2 pi r',
      status:'analytic-plane-geometry'
    },
    racetrack:{
      id:'meh3.aperture-racetrack.v1',
      area:'A = w (l - w) + pi w^2 / 4',
      perimeter:'P = 2 (l - w) + pi w',
      constraint:'l >= w > 0',
      status:'analytic-capsule-geometry'
    },
    compression:{
      id:'meh3.aperture-compression-ratio.v1',
      expression:'compression_ratio = driver_effective_area / summed_aperture_area',
      status:'explicit-dimensionless-ratio'
    },
    quarterWavelengthSpacing:{
      id:'meh3.aperture-quarter-wavelength-spacing.v1',
      expression:'center_spacing_bound = c / (4 f_upper)',
      status:'author-rule-of-thumb-warning',
      hardConstraintByDefault:false,
      sources:['threeway-primary-source-ledger.md §4.7']
    },
    parallelCapsuleClearance:{
      id:'meh3.parallel-capsule-clearance.v1',
      expression:
        'clearance = sqrt(perpendicular_delta^2 + max(0, parallel_delta - 2h)^2) - 2r',
      status:'analytic-plane-geometry',
      symbols:{
        h:'half straight-segment length',
        r:'end-cap radius'
      }
    }
  });

  const CAPABILITIES=deepFreeze({
    status:'explicit-analytic-aperture-candidates-only',
    roundApertures:true,
    racetrackApertures:true,
    circularHosts:true,
    rectangularHosts:true,
    symmetricLinePlacement:true,
    explicitSpacing:true,
    maximumSymmetricSpacing:true,
    driverLocalParallelOrientation:true,
    panelParallelOrientation:true,
    exactAreaAndPerimeter:true,
    pairSpacingAndWeb:true,
    wavelengthSpacingDiagnostic:true,
    countInference:false,
    areaInferenceFromMouth:false,
    spacingInferenceFromMouth:false,
    productNameInference:false,
    sourceOrderDependence:false,
    hornSurfaceProjection:false,
    passageGeometry:false,
    manufacturingPlan:false,
    manufacturingSolids:false,
    manufacturingExport:false,
    manufacturing:false,
    stl:false,
    reason:
      'Candidates are analytic 2D intent only and do not authorize a printable solid.'
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

  function positiveInteger(value){
    return Number.isInteger(value)&&value>0&&value<=32?value:null;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function has(record,key){
    return Object.prototype.hasOwnProperty.call(record,key);
  }

  function normalizeAngle2Pi(value){
    const number=numeric(value);
    if(number===null)return null;
    const turn=2*Math.PI,
      normalized=((number%turn)+turn)%turn;
    return Object.is(normalized,-0)?0:normalized;
  }

  function normalizeAxisAngle(value){
    const angle=normalizeAngle2Pi(value);
    if(angle===null)return null;
    return angle>=Math.PI?angle-Math.PI:angle;
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

  function fail(code,message,details,paths){
    return deepFreeze({
      ok:false,
      code,
      message,
      paths:uniqueStrings(paths),
      details:isObject(details)||Array.isArray(details)
        ?cloneValue(details):{},
      diagnostics:[
        diagnostic(code,'error',paths,message,details)
      ],
      hardwareValidated:false,
      manufacturing:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function success(payload,diagnostics,provenance){
    return deepFreeze({
      ok:true,
      code:null,
      ...cloneValue(payload),
      diagnostics:Array.isArray(diagnostics)
        ?diagnostics.map(cloneValue):[],
      provenance:isObject(provenance)?cloneValue(provenance):{},
      validationStatus:
        'analytic-candidate-not-hardware-or-manufacturing-validated',
      hardwareValidated:false,
      manufacturing:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function requireRecord(value,path){
    if(isObject(value))return null;
    return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'An explicit record is required at '+path+'.',
      {expected:'object'},[path]
    );
  }

  function parseAllowedCounts(value,path){
    if(!Array.isArray(value)||!value.length)return fail(
      FAILURE_CODES.COUNT_INVALID,
      'allowedCounts must contain one or more explicit positive integers.',
      {},[path]
    );
    const counts=[];
    for(let index=0;index<value.length;index++){
      const count=positiveInteger(value[index]);
      if(count===null)return fail(
        FAILURE_CODES.COUNT_INVALID,
        'Aperture counts must be integers from 1 through 32.',
        {index,value:value[index]},[path+'['+index+']']
      );
      if(!counts.includes(count))counts.push(count);
    }
    return {ok:true,counts:counts.sort((left,right)=>left-right)};
  }

  function parseAreaPolicy(value,path){
    const missing=requireRecord(value,path);
    if(missing)return missing;
    const mode=cleanString(value.mode);
    if(!AREA_MODES.includes(mode))return fail(
      FAILURE_CODES.AREA_UNSOLVABLE,
      'areaPolicy.mode must be target or range.',
      {value:mode,allowed:AREA_MODES},[path+'.mode']
    );
    if(mode==='target'){
      const target=positive(value.summedAreaTargetM2);
      if(target===null)return fail(
        FAILURE_CODES.AREA_UNSOLVABLE,
        'Target mode requires positive summedAreaTargetM2.',
        {value:value.summedAreaTargetM2},
        [path+'.summedAreaTargetM2']
      );
      return {
        ok:true,
        mode,
        selectedSummedAreaM2:target,
        declaredRangeM2:{minimum:target,maximum:target},
        selection:'explicit-target'
      };
    }
    const range=value.summedAreaRangeM2,
      selection=cleanString(value.selection);
    if(!isObject(range)||positive(range.minimum)===null||
        positive(range.maximum)===null||
        range.minimum>range.maximum||
        !AREA_RANGE_SELECTIONS.includes(selection))return fail(
      FAILURE_CODES.AREA_UNSOLVABLE,
      'Range mode requires positive ordered limits and an explicit minimum, midpoint, or maximum selection.',
      {
        range:cloneValue(range),
        selection,
        allowedSelections:AREA_RANGE_SELECTIONS
      },[path+'.summedAreaRangeM2',path+'.selection']
    );
    const selected=selection==='minimum'?range.minimum:
      selection==='maximum'?range.maximum:
        (range.minimum+range.maximum)/2;
    return {
      ok:true,
      mode,
      selectedSummedAreaM2:selected,
      declaredRangeM2:{
        minimum:range.minimum,maximum:range.maximum
      },
      selection
    };
  }

  function parseCompression(value,path,driverArea,summedArea){
    const missing=requireRecord(value,path);
    if(missing)return missing;
    const minimum=positive(value.minimum),
      maximum=positive(value.maximum);
    if(minimum===null||maximum===null||minimum>maximum)return fail(
      FAILURE_CODES.INPUT_INVALID,
      'compressionRatioBounds require positive ordered minimum and maximum values.',
      {minimum:value.minimum,maximum:value.maximum},[path]
    );
    const ratio=driverArea/summedArea;
    if(!Number.isFinite(ratio))return fail(
      FAILURE_CODES.INPUT_INVALID,
      'The declared areas produce a nonfinite compression ratio.',
      {
        driverEffectiveAreaM2:driverArea,
        summedApertureAreaM2:summedArea
      },[path]
    );
    if(ratio<minimum||ratio>maximum)return fail(
      FAILURE_CODES.COMPRESSION_RATIO_OUT_OF_BOUNDS,
      'The explicit summed aperture area violates the declared compression-ratio bounds.',
      {
        driverEffectiveAreaM2:driverArea,
        summedApertureAreaM2:summedArea,
        compressionRatio:ratio,
        bounds:{minimum,maximum}
      },[path]
    );
    return {
      ok:true,
      bounds:{minimum,maximum},
      compressionRatio:ratio
    };
  }

  function parseHost(value,path){
    const missing=requireRecord(value,path);
    if(missing)return missing;
    const id=cleanString(value.id),
      role=cleanString(value.role),
      shape=cleanString(value.shape);
    if(!id||!HOST_ROLES.includes(role)||!HOST_SHAPES.includes(shape))
      return fail(
        FAILURE_CODES.INPUT_INVALID,
        'host requires id, active-cone/front-chamber role, and circle/rectangle shape.',
        {id,role,shape},[path]
      );
    if(shape==='circle'){
      const radius=positive(value.radiusM);
      if(radius===null)return fail(
        FAILURE_CODES.INPUT_INVALID,
        'A circular host requires positive radiusM.',
        {value:value.radiusM},[path+'.radiusM']
      );
      return {
        ok:true,
        host:{id,role,shape,radiusM:radius}
      };
    }
    const width=positive(value.widthM),
      height=positive(value.heightM);
    if(width===null||height===null)return fail(
      FAILURE_CODES.INPUT_INVALID,
      'A rectangular host requires positive widthM and heightM.',
      {widthM:value.widthM,heightM:value.heightM},
      [path+'.widthM',path+'.heightM']
    );
    return {
      ok:true,
      host:{id,role,shape,widthM:width,heightM:height}
    };
  }

  function parseShape(value,path){
    const missing=requireRecord(value,path);
    if(missing)return missing;
    const kind=cleanString(value.kind);
    if(!APERTURE_SHAPES.includes(kind))return fail(
      FAILURE_CODES.INPUT_INVALID,
      'apertureShape.kind must be round or racetrack.',
      {value:kind,allowed:APERTURE_SHAPES},[path+'.kind']
    );
    if(kind==='round')return {ok:true,shape:{kind}};
    const ratio=positive(value.lengthToWidthRatio);
    if(ratio===null||ratio<1)return fail(
      FAILURE_CODES.INPUT_INVALID,
      'A racetrack requires lengthToWidthRatio >= 1.',
      {value:value.lengthToWidthRatio},
      [path+'.lengthToWidthRatio']
    );
    return {
      ok:true,
      shape:{kind,lengthToWidthRatio:ratio}
    };
  }

  function parseLimits(value,path){
    const missing=requireRecord(value,path);
    if(missing)return missing;
    const minimumWeb=nonnegative(value.minimumWebM),
      minimumEdge=nonnegative(value.minimumEdgeM),
      maximumLong=positive(value.maximumApertureLongAxisM),
      maximumShort=positive(value.maximumApertureShortAxisM);
    if(minimumWeb===null||minimumEdge===null||
        maximumLong===null||maximumShort===null||
        maximumLong<maximumShort)return fail(
      FAILURE_CODES.INPUT_INVALID,
      'limits require nonnegative web/edge and positive ordered long/short aperture footprint limits.',
      {limits:cloneValue(value)},[path]
    );
    return {
      ok:true,
      limits:{
        minimumWebM:minimumWeb,
        minimumEdgeM:minimumEdge,
        maximumApertureLongAxisM:maximumLong,
        maximumApertureShortAxisM:maximumShort
      }
    };
  }

  function parseOrientation(value,path){
    const missing=requireRecord(value,path);
    if(missing)return missing;
    const mode=cleanString(value.mode);
    if(!ORIENTATION_MODES.includes(mode))return fail(
      FAILURE_CODES.ORIENTATION_POLICY_INVALID,
      'orientationPolicy.mode must be driver-local-parallel or panel-parallel.',
      {value:mode,allowed:ORIENTATION_MODES},[path+'.mode']
    );
    if(mode==='driver-local-parallel'){
      const angle=normalizeAxisAngle(value.angleRad);
      if(angle===null)return fail(
        FAILURE_CODES.ORIENTATION_POLICY_INVALID,
        'driver-local-parallel requires an explicit finite angleRad.',
        {value:value.angleRad},[path+'.angleRad']
      );
      return {
        ok:true,
        orientation:{
          mode,
          driverLocalAngleRad:angle,
          panelAngleRad:null,
          driverLocalToPanelAngleRad:null,
          allLongAxesParallel:true
        }
      };
    }
    const panelAngle=normalizeAxisAngle(value.panelAngleRad),
      localToPanel=normalizeAngle2Pi(
        value.driverLocalToPanelAngleRad
      );
    if(panelAngle===null||localToPanel===null)return fail(
      FAILURE_CODES.ORIENTATION_POLICY_INVALID,
      'panel-parallel requires panelAngleRad and driverLocalToPanelAngleRad.',
      {
        panelAngleRad:value.panelAngleRad,
        driverLocalToPanelAngleRad:value.driverLocalToPanelAngleRad
      },[path+'.panelAngleRad',path+'.driverLocalToPanelAngleRad']
    );
    return {
      ok:true,
      orientation:{
        mode,
        driverLocalAngleRad:normalizeAxisAngle(
          panelAngle-localToPanel
        ),
        panelAngleRad:panelAngle,
        driverLocalToPanelAngleRad:localToPanel,
        allLongAxesParallel:true
      }
    };
  }

  function parsePlacement(value,path){
    const missing=requireRecord(value,path);
    if(missing)return missing;
    const family=cleanString(value.family),
      spacingMode=cleanString(value.spacingMode),
      axisAngle=normalizeAngle2Pi(value.axisAngleRad);
    if(family!=='symmetric-line'||axisAngle===null||
        !SPACING_MODES.includes(spacingMode))return fail(
      FAILURE_CODES.PLACEMENT_POLICY_INVALID,
      'placementPolicy requires symmetric-line, explicit axisAngleRad, and a supported spacingMode.',
      {
        family,spacingMode,axisAngleRad:value.axisAngleRad,
        allowedSpacingModes:SPACING_MODES
      },[path]
    );
    let centerSpacing=null;
    if(spacingMode==='explicit-center-spacing'){
      centerSpacing=positive(value.centerSpacingM);
      if(centerSpacing===null)return fail(
        FAILURE_CODES.PLACEMENT_POLICY_INVALID,
        'explicit-center-spacing requires positive centerSpacingM.',
        {value:value.centerSpacingM},[path+'.centerSpacingM']
      );
    }
    return {
      ok:true,
      placement:{
        family,
        spacingMode,
        axisAngleRad:axisAngle,
        explicitCenterSpacingM:centerSpacing
      }
    };
  }

  function solveShapeDimensions(shape,areaM2){
    if(shape.kind==='round'){
      const radius=Math.sqrt(areaM2/Math.PI),
        diameter=2*radius;
      return {
        kind:'round',
        areaM2:Math.PI*radius*radius,
        perimeterM:2*Math.PI*radius,
        longAxisM:diameter,
        shortAxisM:diameter,
        radiusM:radius,
        lengthM:diameter,
        widthM:diameter,
        capsuleHalfStraightM:0,
        capsuleRadiusM:radius,
        equation:EQUATIONS.round
      };
    }
    const aspect=shape.lengthToWidthRatio,
      coefficient=aspect-1+Math.PI/4,
      width=Math.sqrt(areaM2/coefficient),
      length=aspect*width,
      radius=width/2,
      halfStraight=(length-width)/2;
    return {
      kind:'racetrack',
      areaM2:width*(length-width)+Math.PI*width*width/4,
      perimeterM:2*(length-width)+Math.PI*width,
      longAxisM:length,
      shortAxisM:width,
      radiusM:radius,
      lengthM:length,
      widthM:width,
      lengthToWidthRatio:aspect,
      capsuleHalfStraightM:halfStraight,
      capsuleRadiusM:radius,
      equation:EQUATIONS.racetrack
    };
  }

  function shapeSupport(shape,angleRad){
    const h=shape.capsuleHalfStraightM,
      r=shape.capsuleRadiusM;
    return {
      x:h*Math.abs(Math.cos(angleRad))+r,
      y:h*Math.abs(Math.sin(angleRad))+r
    };
  }

  function shapeFitsAtCenter(host,shape,orientationAngle,edge){
    if(host.shape==='circle')
      return shape.capsuleHalfStraightM+
        shape.capsuleRadiusM<=host.radiusM-edge;
    const support=shapeSupport(shape,orientationAngle);
    return support.x<=host.widthM/2-edge&&
      support.y<=host.heightM/2-edge;
  }

  function maximumCenterOffset(
    host,shape,orientationAngle,placementAngle,edge
  ){
    if(!shapeFitsAtCenter(
      host,shape,orientationAngle,edge
    ))return null;
    const h=shape.capsuleHalfStraightM,
      r=shape.capsuleRadiusM;
    if(host.shape==='circle'){
      const q=host.radiusM-edge-r,
        cosine=Math.cos(placementAngle-orientationAngle),
        radicand=h*h*cosine*cosine+q*q-h*h;
      if(radicand<0)return null;
      return Math.max(0,Math.sqrt(radicand)-Math.abs(h*cosine));
    }
    const support=shapeSupport(shape,orientationAngle),
      availableX=host.widthM/2-edge-support.x,
      availableY=host.heightM/2-edge-support.y,
      directionX=Math.abs(Math.cos(placementAngle)),
      directionY=Math.abs(Math.sin(placementAngle)),
      xLimit=directionX>1e-15?availableX/directionX:Infinity,
      yLimit=directionY>1e-15?availableY/directionY:Infinity;
    return Math.max(0,Math.min(xLimit,yLimit));
  }

  function contained(host,shape,center,orientationAngle,edge){
    const h=shape.capsuleHalfStraightM,
      r=shape.capsuleRadiusM,
      ux=Math.cos(orientationAngle),
      uy=Math.sin(orientationAngle);
    if(host.shape==='circle'){
      const a=Math.hypot(center.x+h*ux,center.y+h*uy)+r,
        b=Math.hypot(center.x-h*ux,center.y-h*uy)+r;
      return Math.max(a,b)<=host.radiusM-edge+1e-12;
    }
    const support=shapeSupport(shape,orientationAngle);
    return Math.abs(center.x)+support.x<=
        host.widthM/2-edge+1e-12&&
      Math.abs(center.y)+support.y<=
        host.heightM/2-edge+1e-12;
  }

  function capsuleClearance(first,second,shape,orientationAngle){
    const dx=second.x-first.x,
      dy=second.y-first.y,
      ux=Math.cos(orientationAngle),
      uy=Math.sin(orientationAngle),
      parallel=Math.abs(dx*ux+dy*uy),
      perpendicular=Math.abs(-dx*uy+dy*ux),
      axialGap=Math.max(
        0,parallel-2*shape.capsuleHalfStraightM
      ),
      segmentDistance=Math.hypot(perpendicular,axialGap);
    return segmentDistance-2*shape.capsuleRadiusM;
  }

  function refusalCandidate(sourceId,count,code,message,details){
    return deepFreeze({
      ok:false,
      id:sourceId+'/candidate-count-'+count,
      sourceId,
      count,
      code,
      reasons:[diagnostic(code,'error',[],message,details)],
      manufacturing:false
    });
  }

  function solveCountCandidate(parsed,count){
    const {
      sourceId,area,shapePolicy,host,limits,orientation,placement,
      upperFrequencyHz,speedOfSoundMps,wavelengthSpacingPolicy,
      compression
    }=parsed,
      perApertureAreaM2=area.selectedSummedAreaM2/count,
      shape=solveShapeDimensions(shapePolicy,perApertureAreaM2),
      id=sourceId+'/candidate-count-'+count;
    if(![
      perApertureAreaM2,shape.areaM2,shape.perimeterM,
      shape.longAxisM,shape.shortAxisM,shape.capsuleHalfStraightM,
      shape.capsuleRadiusM
    ].every(Number.isFinite))return refusalCandidate(
      sourceId,count,FAILURE_CODES.INPUT_INVALID,
      'The explicit values exceed finite analytic aperture geometry.',
      {perApertureAreaM2,shape}
    );
    if(shape.longAxisM>limits.maximumApertureLongAxisM||
        shape.shortAxisM>limits.maximumApertureShortAxisM)
      return refusalCandidate(
        sourceId,count,FAILURE_CODES.FOOTPRINT_OUTSIDE_HOST,
        'The analytic aperture exceeds its declared footprint limits.',
        {
          apertureLongAxisM:shape.longAxisM,
          apertureShortAxisM:shape.shortAxisM,
          maximumApertureLongAxisM:
            limits.maximumApertureLongAxisM,
          maximumApertureShortAxisM:
            limits.maximumApertureShortAxisM
        }
      );
    const maxOffset=maximumCenterOffset(
      host,shape,orientation.driverLocalAngleRad,
      placement.axisAngleRad,limits.minimumEdgeM
    );
    if(maxOffset===null||!Number.isFinite(maxOffset))
      return refusalCandidate(
      sourceId,count,FAILURE_CODES.FOOTPRINT_OUTSIDE_HOST,
      'The analytic aperture cannot fit at the center of the declared host with its edge clearance.',
      {host,shape,minimumEdgeM:limits.minimumEdgeM}
    );
    let spacingM=0;
    if(count>1){
      spacingM=placement.spacingMode==='explicit-center-spacing'
        ?placement.explicitCenterSpacingM:2*maxOffset/(count-1);
    }
    if(!Number.isFinite(spacingM))return refusalCandidate(
      sourceId,count,FAILURE_CODES.INPUT_INVALID,
      'The explicit placement values exceed finite analytic geometry.',
      {spacingM,maxOffset}
    );
    const direction={
      x:Math.cos(placement.axisAngleRad),
      y:Math.sin(placement.axisAngleRad)
    },
      apertures=[];
    for(let index=0;index<count;index++){
      const offset=(index-(count-1)/2)*spacingM,
        center={x:offset*direction.x,y:offset*direction.y};
      if(!contained(
        host,shape,center,orientation.driverLocalAngleRad,
        limits.minimumEdgeM
      ))return refusalCandidate(
        sourceId,count,FAILURE_CODES.FOOTPRINT_OUTSIDE_HOST,
        'One or more aperture footprints lie outside the declared host edge limit.',
        {
          apertureIndex:index,
          center,
          host,
          minimumEdgeM:limits.minimumEdgeM
        }
      );
      apertures.push({
        id:sourceId+'/aperture-'+String(index+1).padStart(2,'0'),
        sourceId,
        index,
        centerM:center,
        angleRad:orientation.driverLocalAngleRad,
        panelAngleRad:orientation.panelAngleRad,
        shape:cloneValue(shape)
      });
    }
    const quarterWavelengthM=speedOfSoundMps/(4*upperFrequencyHz),
      pairs=[],
      diagnostics=[];
    if(!Number.isFinite(quarterWavelengthM)||
        quarterWavelengthM<=0)return refusalCandidate(
      sourceId,count,FAILURE_CODES.INPUT_INVALID,
      'The explicit frequency and sound speed do not produce a finite positive quarter-wavelength bound.',
      {upperFrequencyHz,speedOfSoundMps,quarterWavelengthM}
    );
    for(let left=0;left<apertures.length;left++)
      for(let right=left+1;right<apertures.length;right++){
        const first=apertures[left],
          second=apertures[right],
          dx=second.centerM.x-first.centerM.x,
          dy=second.centerM.y-first.centerM.y,
          centerDistanceM=Math.hypot(dx,dy),
          clearanceM=capsuleClearance(
            first.centerM,second.centerM,shape,
            orientation.driverLocalAngleRad
          ),
          withinWavelength=centerDistanceM<=quarterWavelengthM+1e-12,
          pair={
            id:first.id+'__'+second.id,
            firstApertureId:first.id,
            secondApertureId:second.id,
            centerDistanceM,
            boundaryClearanceM:clearanceM,
            minimumWebM:limits.minimumWebM,
            structuralWebPass:clearanceM+1e-12>=limits.minimumWebM,
            quarterWavelengthBoundM:quarterWavelengthM,
            centerDistanceQuarterWavelengthRatio:
              centerDistanceM/quarterWavelengthM,
            withinQuarterWavelengthBound:withinWavelength
          };
        if(!pair.structuralWebPass)return refusalCandidate(
          sourceId,count,FAILURE_CODES.STRUCTURAL_WEB_INSUFFICIENT,
          'An aperture pair violates the declared minimum structural web.',
          pair
        );
        if(!withinWavelength)diagnostics.push(diagnostic(
          FAILURE_CODES.SPACING_EXCEEDED,
          wavelengthSpacingPolicy==='refuse'?'error':'warning',
          [],
          'Aperture center spacing exceeds the declared quarter-wavelength rule-of-thumb check.',
          pair
        ));
        pairs.push(pair);
      }
    if(wavelengthSpacingPolicy==='refuse'&&diagnostics.some(
      item=>item.code===FAILURE_CODES.SPACING_EXCEEDED
    ))return refusalCandidate(
      sourceId,count,FAILURE_CODES.SPACING_EXCEEDED,
      'The caller made the quarter-wavelength spacing diagnostic a refusal.',
      {
        quarterWavelengthBoundM:quarterWavelengthM,
        violatingPairs:diagnostics.map(item=>item.details)
      }
    );
    const summedAreaM2=apertures.reduce(
      (sum,item)=>sum+item.shape.areaM2,0
    );
    if(!Number.isFinite(summedAreaM2))return refusalCandidate(
      sourceId,count,FAILURE_CODES.INPUT_INVALID,
      'The explicit aperture areas do not produce a finite sum.',
      {summedAreaM2}
    );
    return deepFreeze({
      ok:true,
      code:null,
      id,
      sourceId,
      count,
      host:cloneValue(host),
      apertureShape:shape.kind,
      apertures,
      pairSpacing:pairs,
      perApertureAreaM2,
      summedAreaM2,
      summedPerimeterM:apertures.reduce(
        (sum,item)=>sum+item.shape.perimeterM,0
      ),
      declaredAreaPolicy:cloneValue(area),
      driverEffectiveAreaM2:parsed.driverEffectiveAreaM2,
      compressionRatio:compression.compressionRatio,
      compressionRatioBounds:cloneValue(compression.bounds),
      placementPolicy:cloneValue(placement),
      orientationPolicy:cloneValue(orientation),
      allLongAxesParallel:true,
      twoTapParallelPolicyPass:
        count===2?apertures[0].angleRad===apertures[1].angleRad:true,
      limits:cloneValue(limits),
      wavelengthSpacing:{
        upperFrequencyHz,
        speedOfSoundMps,
        quarterWavelengthBoundM:quarterWavelengthM,
        policy:wavelengthSpacingPolicy,
        sourceStatus:'author-rule-of-thumb-not-universal-theorem',
        allPairsWithinBound:pairs.every(
          item=>item.withinQuarterWavelengthBound
        )
      },
      diagnostics,
      equations:{
        aperture:shape.equation,
        compression:EQUATIONS.compression,
        pairClearance:EQUATIONS.parallelCapsuleClearance,
        wavelengthSpacing:EQUATIONS.quarterWavelengthSpacing
      },
      hardwareValidated:false,
      manufacturing:false
    });
  }

  function parseSource(input){
    const missing=requireRecord(input,'source');
    if(missing)return missing;
    const sourceId=cleanString(input.sourceId);
    if(!sourceId)return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'An explicit sourceId is required.',{},['source.sourceId']
    );
    const counts=parseAllowedCounts(
      input.allowedCounts,'source.allowedCounts'
    );
    if(!counts.ok)return counts;
    if(cleanString(input.candidatePolicy)!==CANDIDATE_POLICY)return fail(
      FAILURE_CODES.INPUT_INVALID,
      'candidatePolicy must explicitly request enumeration of all declared counts.',
      {
        value:input.candidatePolicy,
        allowed:[CANDIDATE_POLICY]
      },['source.candidatePolicy']
    );
    const driverArea=positive(input.driverEffectiveAreaM2);
    if(driverArea===null)return fail(
      FAILURE_CODES.INPUT_INVALID,
      'driverEffectiveAreaM2 must be an explicit positive SI value.',
      {value:input.driverEffectiveAreaM2},
      ['source.driverEffectiveAreaM2']
    );
    const area=parseAreaPolicy(input.areaPolicy,'source.areaPolicy');
    if(!area.ok)return area;
    const compression=parseCompression(
      input.compressionRatioBounds,
      'source.compressionRatioBounds',
      driverArea,area.selectedSummedAreaM2
    );
    if(!compression.ok)return compression;
    const host=parseHost(input.host,'source.host');
    if(!host.ok)return host;
    const shape=parseShape(
      input.apertureShape,'source.apertureShape'
    );
    if(!shape.ok)return shape;
    const limits=parseLimits(input.limits,'source.limits');
    if(!limits.ok)return limits;
    const orientation=parseOrientation(
      input.orientationPolicy,'source.orientationPolicy'
    );
    if(!orientation.ok)return orientation;
    const placement=parsePlacement(
      input.placementPolicy,'source.placementPolicy'
    );
    if(!placement.ok)return placement;
    const upperFrequency=positive(input.upperFrequencyHz),
      speed=positive(input.speedOfSoundMps),
      wavelengthPolicy=cleanString(input.wavelengthSpacingPolicy);
    if(upperFrequency===null||speed===null||
        !WAVELENGTH_POLICIES.includes(wavelengthPolicy))return fail(
      FAILURE_CODES.INPUT_INVALID,
      'upperFrequencyHz, speedOfSoundMps, and warn/refuse wavelengthSpacingPolicy are required.',
      {
        upperFrequencyHz:input.upperFrequencyHz,
        speedOfSoundMps:input.speedOfSoundMps,
        wavelengthSpacingPolicy:wavelengthPolicy
      },
      [
        'source.upperFrequencyHz','source.speedOfSoundMps',
        'source.wavelengthSpacingPolicy'
      ]
    );
    return {
      ok:true,
      parsed:{
        sourceId,
        allowedCounts:counts.counts,
        candidatePolicy:CANDIDATE_POLICY,
        driverEffectiveAreaM2:driverArea,
        area,
        compression,
        host:host.host,
        shapePolicy:shape.shape,
        limits:limits.limits,
        orientation:orientation.orientation,
        placement:placement.placement,
        upperFrequencyHz:upperFrequency,
        speedOfSoundMps:speed,
        wavelengthSpacingPolicy:wavelengthPolicy,
        provenance:isObject(input.provenance)
          ?cloneValue(input.provenance):{}
      }
    };
  }

  function solveSourceApertures(input){
    const normalized=parseSource(input);
    if(!normalized.ok){
      const sourceId=isObject(input)?cleanString(input.sourceId):null;
      return sourceId?deepFreeze({
        ...cloneValue(normalized),sourceId
      }):normalized;
    }
    const parsed=normalized.parsed,
      allCandidates=parsed.allowedCounts.map(
        count=>solveCountCandidate(parsed,count)
      ),
      feasibleCandidates=allCandidates.filter(item=>item.ok),
      refusedCandidates=allCandidates.filter(item=>!item.ok),
      diagnostics=[];
    for(const candidate of allCandidates)
      diagnostics.push(...(
        candidate.ok?candidate.diagnostics:candidate.reasons
      ));
    if(!feasibleCandidates.length){
      const first=refusedCandidates[0];
      return deepFreeze({
        ok:false,
        code:first?first.code:FAILURE_CODES.AREA_UNSOLVABLE,
        sourceId:parsed.sourceId,
        allowedCounts:parsed.allowedCounts.slice(),
        feasibleCandidates:[],
        refusedCandidates,
        selectedCandidateId:null,
        automaticCountSelection:false,
        diagnostics,
        provenance:parsed.provenance,
        validationStatus:'no-feasible-explicit-aperture-candidate',
        hardwareValidated:false,
        manufacturing:false,
        model:MODEL_METADATA,
        capabilities:CAPABILITIES
      });
    }
    return success({
      sourceId:parsed.sourceId,
      allowedCounts:parsed.allowedCounts.slice(),
      candidatePolicy:CANDIDATE_POLICY,
      feasibleCandidates,
      refusedCandidates,
      selectedCandidateId:null,
      automaticCountSelection:false,
      declaredInputs:{
        driverEffectiveAreaM2:parsed.driverEffectiveAreaM2,
        areaPolicy:parsed.area,
        compressionRatioBounds:parsed.compression.bounds,
        host:parsed.host,
        apertureShape:parsed.shapePolicy,
        limits:parsed.limits,
        placementPolicy:parsed.placement,
        orientationPolicy:parsed.orientation,
        upperFrequencyHz:parsed.upperFrequencyHz,
        speedOfSoundMps:parsed.speedOfSoundMps,
        wavelengthSpacingPolicy:parsed.wavelengthSpacingPolicy
      },
      ignoredInputs:[
        'mouth dimensions','product/manufacturer/model name',
        'source array order','preview geometry'
      ]
    },diagnostics,parsed.provenance);
  }

  function solveApertureLayout(input){
    const missing=requireRecord(input,'input');
    if(missing)return missing;
    if(!Array.isArray(input.sources)||!input.sources.length)return fail(
      FAILURE_CODES.INPUT_REQUIRED,
      'One or more explicit source aperture inputs are required.',
      {},['input.sources']
    );
    const ids=new Set(),sourceInputs=[];
    for(let index=0;index<input.sources.length;index++){
      const item=input.sources[index],
        id=isObject(item)?cleanString(item.sourceId):null;
      if(!id)return fail(
        FAILURE_CODES.INPUT_REQUIRED,
        'Every source aperture input requires sourceId.',
        {index},['input.sources['+index+'].sourceId']
      );
      if(ids.has(id))return fail(
        FAILURE_CODES.SOURCE_DUPLICATE,
        'sourceId values must be unique.',
        {sourceId:id},['input.sources['+index+'].sourceId']
      );
      ids.add(id);
      sourceInputs.push({id,input:item});
    }
    sourceInputs.sort((left,right)=>
      left.id.localeCompare(right.id)
    );
    const sources=sourceInputs.map(item=>
        solveSourceApertures(item.input)
      ),
      bySource=Object.create(null),
      diagnostics=[];
    for(const result of sources){
      bySource[result.sourceId||'unknown']=result;
      if(Array.isArray(result.diagnostics))
        diagnostics.push(...result.diagnostics);
    }
    const ok=sources.every(result=>result.ok);
    return deepFreeze({
      ok,
      code:ok?null:FAILURE_CODES.LAYOUT_UNSOLVABLE,
      sourceOrder:sources.map(item=>item.sourceId),
      sources,
      bySource,
      diagnostics,
      automaticCountSelection:false,
      inferredValues:[],
      validationStatus:ok
        ?'analytic-candidates-not-hardware-or-manufacturing-validated'
        :'one-or-more-explicit-source-layouts-unsolved',
      hardwareValidated:false,
      manufacturing:false,
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
      hardwareValidated:false,
      manufacturing:false,
      stl:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    version:MODULE_VERSION,
    failureCodes:FAILURE_CODES,
    hostRoles:HOST_ROLES,
    hostShapes:HOST_SHAPES,
    apertureShapes:APERTURE_SHAPES,
    areaModes:AREA_MODES,
    orientationModes:ORIENTATION_MODES,
    spacingModes:SPACING_MODES,
    candidatePolicy:CANDIDATE_POLICY,
    modelMetadata:MODEL_METADATA,
    equations:EQUATIONS,
    capabilities:CAPABILITIES,
    solveSourceApertures,
    solveApertureLayout,
    manufacturingPreflight
  });
});
