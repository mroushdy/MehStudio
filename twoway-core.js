/* MEH Studio v5 — two-way rebuild.
   One design plan feeds acoustics, inspectors, the viewport and STL.
   The two mechanical families are deliberately few:
     panel  — direct panel/front-chamber construction, 2, 4 or 6 woofers
     radial — printed radial manifolds, 2..8 woofers
   Named builds remain evidence records. Calculated states are never called proven. */
(function(factory){
  if(typeof module==='object'&&module.exports) module.exports=factory;
  else if(typeof MEH2!=='undefined') Object.assign(MEH2,factory(MEH2));
})(function(M){
  'use strict';
  const C=M.C, IN=M.IN, CM=M.CM;
  /* Peak entry velocity cannot be inferred from Sd/Ap alone; it also needs a
     piston-velocity reference.  In the excursion-controlled LF region the
     conservative ceiling is:

       u_entry = (Sd / Ap) · 2π · f_ref · Xmax

     A Mach-0.10 hard limit is deliberately dimensionless.  It is not the
     unrelated 17 m/s rear bass-reflex chuffing heuristic, and it does not
     pretend to replace a power/SPL-domain Hornresp or nonlinear BEM check. */
  const TAP_MACH_LIMIT=0.10, TAP_MACH_WARN=0.15;
  const MESH_POLICY_VERSION='b653-differential-cell-terminal-grid-v3';
  const CURRENT_TWO_WAY_STATE_SCHEMA=3;
  const DRIVER_CELL_SCHEMA_VERSION=1;
  const RETENTION_SCHEMA_VERSION=1;
  const CORNER_PLATE_SCHEMA_VERSION=1;
  const DRIVER_ARRAY_SCHEMA_VERSION=1;
  const DRIVER_ARRAY_MODES=Object.freeze(['auto','manual']);
  const DRIVER_MANIFOLD_SCHEMA_VERSION=1;
  const DRIVER_MOUNT_MODES=Object.freeze([
    'shortest','extended-manifold'
  ]);
  /* Printed panel cells need a real load path between their conformal root
     and driver-bearing face.  Eight millimetres is a structural design
     minimum, not a component-filtering tolerance: it remains present in the
     exact solid at every mesh intent. */
  const PRINTED_PANEL_ROOT_WEB=0.008;
  /* The cartridge joint is mechanically independent of the woofer BCD.
     SPIROL's short M4 heat-set insert publishes a 6.38 mm over-knurl body
     envelope, but the recommended installation hole is 5.61 mm.  Keep both
     dimensions explicit: collision/layout checks reserve the real insert
     body while the exact SDF subtracts only the installation pocket. */
  const CARTRIDGE_RETENTION=Object.freeze({
    fastener:'M4 × 0.7',
    screwsPerCartridge:2,
    clearanceD:0.0046,
    insertBodyEnvelopeD:0.00638,
    insertHoleD:0.00561,
    insertLength:0.00470,
    insertPocketDepth:0.00490,
    counterboreD:0.0084,
    counterboreDepth:0.0032,
    blindAcousticCap:0.0024,
    minWeb:0.0032,
    bossR:0.0074,
    bossDepth:0.0060
  });
  const CONE_PROFILE_MODES=Object.freeze(['flat','parametric','measured']);
  const DRIVER_CELL_CONSTRUCTIONS=Object.freeze(['integrated','cartridge']);
  const MESH_QUALITY_ALIASES=Object.freeze({
    display:'display',
    test:'manufacturing',
    preview:'manufacturing',
    export:'manufacturing',
    'manufacturing-preview':'manufacturing'
  });
  const MESH_LIMITS=Object.freeze({
    display:Object.freeze({
      /* The display mesh is still an exact Boolean inspection mesh.  Three
         millimetres is its ceiling, not an unconditional LOD: the active
         feature-resolution law below refines it when a cylindrical clearance
         has fewer than two cells across.  The marcher streams two x-planes,
         so a refined point count does not imply a full volume allocation. */
      intent:'display',step:0.003,maxAxisSamples:400,
      maxActivePartGridPoints:12000000,maxJobGridPoints:12000000,
      maxVertices:1000000,maxTriangles:2000000,maxStlBytes:128*1024*1024,
      maxRenderBufferBytes:128*1024*1024,
      maxAuditBinRefs:40000000,maxAuditBinOccupancy:16384,
      maxAuditPairVisits:250000000,maxIntersectionPairs:100000000,
      baseOverheadBytes:192*1024*1024,bytesPerActivePlanePoint:8,
      bytesPerMeshVertex:160,bytesPerMeshTriangle:80,
      bytesPerAuditTriangle:44,bytesPerAuditBinRef:4,
      maxEstimatedPeakBytes:1536*1024*1024,
      maxBoundGrowthPasses:8
    }),
    manufacturing:Object.freeze({
      intent:'manufacturing',step:0.0025,maxAxisSamples:320,
      /* The released six-W5 corner/face manifold is a single 159 × 302 × 209
         grid (10,035,762 points). Its streamed two-plane allocation is only
         521,831,536 bytes under the existing conservative accounting model.
         Admit that certified grid without coarsening its 2.5 mm feature
         resolution. 10,040,000 is deliberately below the very next lattice
         tier (159 × 303 × 209 = 10,068,993), so this is a bounded release-case
         allowance rather than a general memory-limit expansion. */
      maxActivePartGridPoints:10100000,maxJobGridPoints:10100000,
      maxVertices:1000000,maxTriangles:2000000,maxStlBytes:128*1024*1024,
      maxRenderBufferBytes:128*1024*1024,
      maxAuditBinRefs:40000000,maxAuditBinOccupancy:16384,
      maxAuditPairVisits:250000000,maxIntersectionPairs:100000000,
      baseOverheadBytes:192*1024*1024,bytesPerActivePlanePoint:8,
      bytesPerMeshVertex:160,bytesPerMeshTriangle:80,
      bytesPerAuditTriangle:44,bytesPerAuditBinRef:4,
      maxEstimatedPeakBytes:1536*1024*1024,
      maxBoundGrowthPasses:8
    })
  });
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  /* Candidate compression is quantized in half-ratio steps. Values produced by
     equal-area aperture math can land one ULP above an exact half step (for
     example 8.500000000000002). A raw Math.ceil then promotes that legal 8.5
     candidate to 9.0 and makes Smart Adapt exhaust the complete mouth/XO grid
     while proving a false refusal. Snap only values within floating-point
     roundoff of an exact half step; real values above the step still ceil. */
  const ceilHalfStep=v=>{
    const scaled=2*v,nearest=Math.round(scaled),
      tolerance=Number.EPSILON*32*Math.max(1,Math.abs(scaled));
    return (Math.abs(scaled-nearest)<=tolerance
      ?nearest:Math.ceil(scaled))/2;
  };
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const len=a=>Math.hypot(a[0],a[1],a[2]);
  const unit=a=>{const z=len(a)||1;return [a[0]/z,a[1]/z,a[2]/z];};
  const lerp=(a,b,t)=>a+(b-a)*t;
  function meshError(code,message,details){
    const error=new Error(message);
    error.name='MeshBudgetError';error.code=code;
    if(details)error.details=details;
    return error;
  }
  function meshLimitsFor(quality,override){
    const intent=MESH_QUALITY_ALIASES[quality||'preview'];
    if(!intent)throw meshError('MESH_QUALITY_UNSUPPORTED',
      'Unsupported two-way mesh intent: '+String(quality),{quality});
    return Object.freeze({...MESH_LIMITS[intent],...(override||{}),intent});
  }
  function exactFeatureMeshOverride(S,P,quality){
    const intent=MESH_QUALITY_ALIASES[quality||'preview'];
    if(!intent)return null;
    /* Exact Boolean meshes must resolve every active cylindrical clearance
       instead of relying on a fixed visual LOD.  QA of the swept tap/chamber
       junction first looked resolution-sensitive, but exact probes proved
       that its islands were real solid lenses between two positive SDFs.
       That topology is physically removed by the local chamber blend below;
       mesh resolution therefore follows the actual cylindrical feature and
       keeps at least two cells across it until the 3 mm display ceiling.
       Never make an exact grid finer than the certified 2.5 mm allocation
       floor.  The proven complex woofer fastener/chamber topology is refused
       below 5 mm; simple CD and cartridge bores may use their independently
       supported 4.6 mm clearance while still selecting the 2.5 mm grid. */
    const frameFastenerD=P&&P.frame&&P.frame.fastenerPocketD,
      diameters=[
      frameFastenerD,
      +S.cdBoltD>0?+S.cdBoltD/1000:0.0065
    ];
    if(P&&P.retention&&P.retention.active)
      diameters.push(CARTRIDGE_RETENTION.clearanceD);
    const finite=diameters.filter(value=>Number.isFinite(value)&&value>0),
      smallest=finite.length?Math.min(...finite):Infinity,
      exactFloor=MESH_LIMITS.manufacturing.step,
      minimumDiameter=2*exactFloor;
    if(Number.isFinite(frameFastenerD)&&frameFastenerD>0&&
        frameFastenerD<minimumDiameter-1e-12)
      throw meshError('MESH_FEATURE_BELOW_EXACT_FLOOR',
        'Exact mesh refused because the woofer-fastener clearance is smaller than the certified feature-resolution floor',
        {quality,intent,feature:'woofer fastener',
          diameter:frameFastenerD,minimumDiameter,step:exactFloor});
    if(intent!=='display')return null;
    const step=Math.min(MESH_LIMITS.display.step,
      Math.max(exactFloor,smallest/2));
    return Number.isFinite(step)&&step<MESH_LIMITS.display.step-1e-12
      ?{step}:null;
  }

  const TWO_ARCH={
    panel:{
      name:'panel-wall / box manifold',
      tier:'derived',
      family:'panel',
      counts:[2,4,6],
      summary:'Two, four or six woofers seal to relieved wall plates. Cone-following front chambers feed short racetrack or round passages through the horn wall near a common station.',
      source:'Calculated construction family. Tap station follows the quarter-wave phase bound; area follows declared Sd/Ap; chamber and passage mass are solved together. Hinson and JMOD are separate sourced records.',
      defaults:{twoArch:'panel',twoFamily:'panel',style:'angular',seN:12,nW:2,npW:2,
        shW:'slot',tapShapeW:'slot',
        driverArrayMode:'auto',driverArrayRotationDeg:0,tapBasis:'model',
        driverMountMode:'shortest',driverMountExtraMm:0,
        driverAxisBlend:0,
        tapPairMode:'auto',
        twoXO:500,tapCRW:6,phaseMargin:1.2,rearAlign:'external',wallT:0.018,
        wPre:'ndl88',odW:31.5,dpW:14,sdW:522,vtcW:180,xmW:8}
    },
    radial:{
      name:'radial printed manifold',
      tier:'derived',
      family:'radial',
      counts:[2,3,4,5,6,7,8],
      summary:'Two to eight woofer axes sit perpendicular to the HF axis and point into a compact central hub. Each driver has a sealed printed cone chamber and equal-path petal feeding a common station ring.',
      source:'Calculated construction family. Woofer axes are 90° to the HF axis, adapter paths are equal by rotational symmetry, and every tap/chamber dimension is derived from the selected drivers and crossover.',
      defaults:{twoArch:'radial',twoFamily:'radial',style:'smooth',seN:6,nW:4,npW:1,
        shW:'slot',tapShapeW:'slot',
        driverArrayMode:'auto',driverArrayRotationDeg:0,tapBasis:'model',
        driverMountMode:'shortest',driverMountExtraMm:0,
        driverAxisBlend:1,
        tapPairMode:'auto',
        twoXO:400,tapCRW:5,phaseMargin:1.2,adapterReach:35,adapterReachMode:'auto',
        rearAlign:'external',
        wPre:'w5',odW:13.76,dpW:6.95,sdW:91.6,vtcW:35,xmW:2.5}
    }
  };
  const familyKey=S=>TWO_ARCH[S.twoArch]?S.twoArch:
    (TWO_ARCH[S.twoFamily]?S.twoFamily:'panel');
  const driverArrayPeriodDeg=S=>360/Math.max(1,S.nW|0);
  const normalizeDriverArrayRotation=(degrees,count)=>{
    const period=360/Math.max(1,count|0),
      value=Number.isFinite(+degrees)?+degrees:0;
    let normalized=value%period;
    if(normalized<0)normalized+=period;
    /* Keep the half-open periodic interval exact at the floating-point seam. */
    if(Math.abs(normalized-period)<1e-10||Math.abs(normalized)<1e-12)
      normalized=0;
    return normalized;
  };

  const baseBuilds=M.BUILDS||{};
  const common={wallT:0.012,rollR:2,mouthCap:64,subXO:80,placeW:'auto',mount:'flush',
    fxHi:900,fxLo:300,coaxRing:4.5,cdSel:'dcx464',td:1.4,throat:1.4,
    cdFloor:300,cdDepth:2.4,
    tapPairMode:'auto',
    coneProfileMode:'flat',coneDepthMm:0,coneDepthKnown:false,
    coneAxialClearanceMm:0,coneRadialClearanceMm:0,
    driverCellConstruction:'integrated'};
  const TWO_BUILDS=[
    {key:'hinson10',name:'Hinson DCX464 + 2×10NW76 — published panel geometry',
      evidence:'published',source:'Scott Hinson, Multiple Entry Horns (2022): two 101.6 × 19.1 mm racetrack entries per woofer, 18 mm relieved plate, and 1400 cm³ total front-chamber volume (700 cm³ per woofer).',
      s:{...common,topo:'2way',twoArch:'panel',twoFamily:'panel',twoDesign:'hinson10',
        tapBasis:'published',style:'angular',seN:12,covH:90,covV:60,mouthW:28,
        wallT:0.018,nW:2,npW:2,panelAxis:'horizontal',shW:'slot',tapShapeW:'slot',
        twoXO:500,tapStationW:143.3,tapAreaW:37.24,tapLptW:18,
        tapSlotL:101.6,tapSlotW:19.1,tapVtcW:700,tapCRW:8.59,
        rearAlign:'reflex',rearV:45,rearFb:65,rearPortArea:91.2,rearPortLen:184,
        wPre:'nw10',odW:26.1,dpW:11.9,sdW:320,vtcW:1400,xmW:6.8,
        frameW:'round',boltNW:8,bcdW:244,boltDW:6.5,gasketW:1.6}},
    {key:'jmod88',name:'JMOD Rev 2.02 package reference — calculated panel approximation',
      evidence:'hybrid',source:'JW Sound JMOD Rev 2.02 documents the 90 × 60 package, 2× B&C 12NDL88 + DCX464 and Fb 70 Hz. Its source manufacturing CAD and numeric tap geometry are not present, so MEH Studio preserves the sourced driver/package facts but calculates a generic panel-wall manifold; this is not an exact JMOD replica.',
      s:{...common,topo:'2way',twoArch:'panel',twoFamily:'panel',twoDesign:'jmod88',
        tapBasis:'model',style:'angular',seN:12,covH:90,covV:60,mouthW:32,
        wallT:0.018,nW:2,npW:2,panelAxis:'horizontal',shW:'slot',tapShapeW:'slot',
        twoXO:370,tapCRW:4,rearAlign:'reflex',rearFb:70,
        wPre:'ndl88',odW:31.5,dpW:14,sdW:522,vtcW:180,xmW:8,
        frameW:'round',boltNW:8,bcdW:298,boltDW:7,gasketW:1.6}}
  ];
  /* Calculated quick starts are deliberately not evidence records.  They are
     small, named sets of user-facing intent that exercise the same solver as
     a hand-built calculated design.  Keeping them out of TWO_BUILDS prevents
     the report, provenance badges and saved-state identity from ever calling
     a convenient starting point "documented".

     `unset` is just as important as `s`: a driver change must not inherit the
     previous driver's bolt circle, gasket record or measured tap package.
     Every start uses the integrated print topology; detachable cartridges
     remain an explicit prototype choice after the start has been applied. */
  const TWO_STARTS=Object.freeze([
    Object.freeze({
      key:'compact-2x5-panel',
      name:'Compact 2×5 panel',
      family:'panel',
      evidence:'calculated',
      summary:'Compact 24-inch four-face starting point with two Dayton 5.25-inch woofers and one round entry per woofer.',
      s:Object.freeze({
        topo:'2way',twoArch:'panel',twoFamily:'panel',
        twoDesign:'arch:panel',tapBasis:'model',
        driverCellConstruction:'integrated',
        style:'angular',profileLaw:'conical',
        sectionFamily:'superellipse',seN:12,
        covH:90,covV:60,mouthW:24,mouthCap:64,wallT:0.018,
        nW:2,npW:1,shW:'round',tapShapeW:'round',
        driverArrayMode:'auto',driverArrayRotationDeg:0,
        driverMountMode:'shortest',driverMountExtraMm:0,
        driverAxisBlend:0,tapPairMode:'auto',
        twoXO:500,tapCRW:6,phaseMargin:1.2,
        rearAlign:'external',
        wPre:'w5',odW:13.76,dpW:6.95,sdW:91.6,vtcW:35,xmW:2.5
      }),
      unset:Object.freeze([
        'frameW','boltNW','bcdW','boltDW','gasketW','cutoutW'
      ])
    }),
    Object.freeze({
      key:'high-output-4x10-panel',
      name:'High-output 4×10 panel',
      family:'panel',
      evidence:'calculated',
      summary:'Large 44-inch four-face starting point with four B&C 10HPL64 woofers and two solved slot entries per woofer.',
      s:Object.freeze({
        topo:'2way',twoArch:'panel',twoFamily:'panel',
        twoDesign:'arch:panel',tapBasis:'model',
        driverCellConstruction:'integrated',
        style:'angular',profileLaw:'conical',
        sectionFamily:'superellipse',seN:12,
        covH:90,covV:60,mouthW:44,mouthCap:64,wallT:0.018,
        nW:4,npW:2,shW:'slot',tapShapeW:'slot',
        driverArrayMode:'auto',driverArrayRotationDeg:0,
        driverMountMode:'shortest',driverMountExtraMm:0,
        driverAxisBlend:0,tapPairMode:'auto',
        twoXO:450,tapCRW:7,phaseMargin:1.2,
        rearAlign:'external',
        wPre:'hpl10',odW:26.1,dpW:12.2,sdW:320,vtcW:130,xmW:4
      }),
      unset:Object.freeze([
        'frameW','boltNW','bcdW','boltDW','gasketW','cutoutW'
      ])
    }),
    Object.freeze({
      key:'shallow-radial-4x5',
      name:'Shallow radial 4×5',
      family:'radial',
      evidence:'calculated',
      summary:'Smooth 36-inch radial printed manifold with four Dayton 5.25-inch woofers and one short solved slot per woofer.',
      s:Object.freeze({
        topo:'2way',twoArch:'radial',twoFamily:'radial',
        twoDesign:'arch:radial',tapBasis:'model',
        driverCellConstruction:'integrated',
        style:'smooth',profileLaw:'conical',
        sectionFamily:'superellipse',seN:6,
        covH:90,covV:60,mouthW:36,mouthCap:64,wallT:0.012,
        nW:4,npW:1,shW:'slot',tapShapeW:'slot',
        driverArrayMode:'auto',driverArrayRotationDeg:0,
        driverMountMode:'shortest',driverMountExtraMm:0,
        driverAxisBlend:1,tapPairMode:'auto',
        adapterReach:35,adapterReachMode:'auto',
        twoXO:400,tapCRW:5,phaseMargin:1.2,
        rearAlign:'external',
        wPre:'w5',odW:13.76,dpW:6.95,sdW:91.6,vtcW:35,xmW:2.5
      }),
      unset:Object.freeze([
        'frameW','boltNW','bcdW','boltDW','gasketW','cutoutW'
      ])
    })
  ]);
  const BUILDS={...baseBuilds,'2way':TWO_BUILDS};

  function migrate(S0){
    /* There is no released project format to preserve.  A state explicitly
       marked as the current pre-release schema must therefore be interpreted
       exactly or refused; silently replacing an unknown value with a default
       would make the controls, report and manufactured mesh describe
       different designs.  Schema-less internal fixtures retain normalization
       solely as test/construction helpers. */
    if(S0&&+S0._smart2waySchema===CURRENT_TWO_WAY_STATE_SCHEMA){
      const refuse=(field,value,allowed)=>{
        throw meshError('CURRENT_STATE_ENUM_UNSUPPORTED',
          'Current two-way state refuses unsupported '+field+': '+String(value),
          {schema:CURRENT_TWO_WAY_STATE_SCHEMA,field,value,allowed});
      };
      if(S0.twoArch!==undefined&&!TWO_ARCH[S0.twoArch])
        refuse('architecture',S0.twoArch,Object.keys(TWO_ARCH));
      if(S0.twoFamily!==undefined&&!TWO_ARCH[S0.twoFamily])
        refuse('family',S0.twoFamily,Object.keys(TWO_ARCH));
      if(S0.twoDesign!==undefined){
        const knownDesign=TWO_BUILDS.some(build=>build.key===S0.twoDesign)||
          S0.twoDesign==='arch:panel'||S0.twoDesign==='arch:radial';
        if(!knownDesign)refuse('design',S0.twoDesign,
          [...TWO_BUILDS.map(build=>build.key),'arch:panel','arch:radial']);
      }
      if(S0.sectionFamily!==undefined){
        const schema=M.sectionFamilySchema&&M.sectionFamilySchema(S0.sectionFamily);
        if(!schema||!schema.supported)
          refuse('section family',S0.sectionFamily,
            ['ellipse','superellipse','roundedRectangle']);
      }
      if(S0.profileLaw!==undefined){
        const currentProfileLaws=['conical','classicOS','osse','rosse'];
        if(!currentProfileLaws.includes(S0.profileLaw))
          refuse('profile law',S0.profileLaw,currentProfileLaws);
      }
      if(S0.driverCellConstruction!==undefined&&
          !DRIVER_CELL_CONSTRUCTIONS.includes(S0.driverCellConstruction))
        refuse('driver-cell construction',S0.driverCellConstruction,
          DRIVER_CELL_CONSTRUCTIONS);
      if(S0.driverArrayMode!==undefined&&
          !DRIVER_ARRAY_MODES.includes(S0.driverArrayMode))
        refuse('driver array mode',S0.driverArrayMode,
          DRIVER_ARRAY_MODES);
      if(S0.driverArrayRotationDeg!==undefined&&
          !Number.isFinite(+S0.driverArrayRotationDeg))
        throw meshError('CURRENT_STATE_NUMBER_INVALID',
          'Current two-way state refuses a non-finite driver array rotation',
          {schema:CURRENT_TWO_WAY_STATE_SCHEMA,
            field:'driverArrayRotationDeg',
            value:S0.driverArrayRotationDeg});
      if(S0.driverMountMode!==undefined&&
          !DRIVER_MOUNT_MODES.includes(S0.driverMountMode))
        refuse('driver mount mode',S0.driverMountMode,
          DRIVER_MOUNT_MODES);
      for(const field of ['driverMountExtraMm','driverAxisBlend'])
        if(S0[field]!==undefined&&!Number.isFinite(+S0[field]))
          throw meshError('CURRENT_STATE_NUMBER_INVALID',
            'Current two-way state refuses non-finite '+field,
            {schema:CURRENT_TWO_WAY_STATE_SCHEMA,
              field,value:S0[field]});
      if(S0.coneProfileMode!==undefined&&
          !CONE_PROFILE_MODES.includes(S0.coneProfileMode))
        refuse('cone profile',S0.coneProfileMode,CONE_PROFILE_MODES);
      if(S0.shW!==undefined&&!['slot','oval','round'].includes(S0.shW))
        refuse('tap shape',S0.shW,['slot','oval','round']);
      if(S0.tapBasis!==undefined&&
          !['published','manual','model'].includes(S0.tapBasis))
        refuse('tap basis',S0.tapBasis,['published','manual','model']);
    }
    const S={...S0};
    const f=familyKey(S);
    S.twoArch=f; S.twoFamily=f;
    S.style=S.style||TWO_ARCH[f].defaults.style;
    S.seN=+S.seN||TWO_ARCH[f].defaults.seN;
    /* Angular and curved-face constructions are both exact four-face
       rectangles.  This pre-release state has no compatibility obligation to
       the retired Lamé/chamfer slider, so stale values are normalized instead
       of silently restoring diagonal corner boards. */
    if(S.style==='angular'||S.style==='curvedFacets')S.seN=12;
    {
      const schema=M.sectionFamilySchema&&
        M.sectionFamilySchema(S.sectionFamily||'superellipse');
      S.sectionFamily=schema&&schema.supported
        ?schema.family:'superellipse';
    }
    S.sectionCornerRatio=clamp(
      Number.isFinite(+S.sectionCornerRatio)?+S.sectionCornerRatio:0.25,
      0.05,1);
    S.covH=+S.covH||90; S.covV=+S.covV||60;
    S.mouthW=+S.mouthW||32; S.mouthCap=+S.mouthCap||64;
    S.rollR=Number.isFinite(+S.rollR)?+S.rollR:2;
    /* MEH Studio has not shipped a public file format, so new/calculated
       states use the acoustically explicit conical law.  An explicitly
       requested regressionEasedConical value remains callable only so the
       internal geometry-regression oracle can compare historical stations. */
    if(S.profileLaw===undefined)S.profileLaw='conical';
    if(S.osseThroatAngle===undefined)S.osseThroatAngle=7.5;
    if(S.osseK===undefined)S.osseK=1.8;
    if(S.osseS===undefined)S.osseS=0.7;
    if(S.osseTerminationN===undefined)S.osseTerminationN=4;
    if(S.osseQ===undefined)S.osseQ=0.995;
    if(S.rosseThroatAngle===undefined)S.rosseThroatAngle=7.5;
    if(S.rosseK===undefined)S.rosseK=1.8;
    if(S.rosseApexRadiusFactor===undefined)S.rosseApexRadiusFactor=0.3;
    if(S.rosseB===undefined)S.rosseB=0.3;
    if(S.rosseM===undefined)S.rosseM=0.8;
    if(S.rosseQ===undefined)S.rosseQ=3.7;
    S.wallT=+S.wallT||0.012;
    S.td=+S.td||+S.throat||1.4; S.throat=S.td;
    S.cdFloor=+S.cdFloor||300; S.cdDepth=+S.cdDepth||2.4;
    const namedDesign=TWO_BUILDS.some(build=>build.key===S.twoDesign),
      calculatedDesign=S.twoDesign==='arch:panel'||S.twoDesign==='arch:radial';
    if(!namedDesign&&!calculatedDesign)S.twoDesign='arch:'+f;
    const A=TWO_ARCH[f], allowed=A.counts;
    let n=(S.nW|0)||A.defaults.nW;
    if(!allowed.includes(n)) n=allowed.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a,allowed[0]);
    S.nW=n;
    S.npW=clamp((S.npW|0)||A.defaults.npW,1,2);
    /* One canonical symmetric-array rotation serves both construction
       families.  The exact unique interval is one driver pitch: rotating by
       360/N only relabels the same physical array.  Schema-less pre-release
       states may still carry panelAxis/radialRotation; migrate them once,
       then remove those aliases so no downstream subsystem can disagree. */
    const currentCanonical=+S0._smart2waySchema===
        CURRENT_TWO_WAY_STATE_SCHEMA&&
        (S0.driverArrayMode!==undefined||
          S0.driverArrayRotationDeg!==undefined),
      legacyPanel=!currentCanonical&&f==='panel'&&
        (S0.panelAxis==='horizontal'||S0.panelAxis==='vertical'),
      legacyRadial=!currentCanonical&&f==='radial'&&
        Number.isFinite(+S0.radialRotation);
    if(legacyPanel){
      S.driverArrayMode='manual';
      S.driverArrayRotationDeg=S0.panelAxis==='horizontal'?0:90;
    }else if(legacyRadial){
      S.driverArrayMode='manual';
      S.driverArrayRotationDeg=+S0.radialRotation;
    }else{
      S.driverArrayMode=DRIVER_ARRAY_MODES.includes(S.driverArrayMode)
        ?S.driverArrayMode:A.defaults.driverArrayMode;
      S.driverArrayRotationDeg=Number.isFinite(+S.driverArrayRotationDeg)
        ?+S.driverArrayRotationDeg:A.defaults.driverArrayRotationDeg;
    }
    S.driverArrayRotationDeg=normalizeDriverArrayRotation(
      S.driverArrayRotationDeg,S.nW);
    delete S.panelAxis;
    delete S.radialRotation;
    S.driverMountMode=DRIVER_MOUNT_MODES.includes(S.driverMountMode)
      ?S.driverMountMode:A.defaults.driverMountMode;
    S.driverMountExtraMm=clamp(
      Number.isFinite(+S.driverMountExtraMm)
        ?+S.driverMountExtraMm:0,0,250);
    if(S.driverMountMode==='shortest')S.driverMountExtraMm=0;
    S.driverAxisBlend=clamp(
      Number.isFinite(+S.driverAxisBlend)
        ?+S.driverAxisBlend:A.defaults.driverAxisBlend,0,1);
    S.mount='flush'; S.placeW='auto';
    /* driverCellConstruction is the sole two-way construction input.
       mountRing is emitted only as a derived internal field for shared
       renderer/export code; it never selects or restores a construction. */
    const construction=DRIVER_CELL_CONSTRUCTIONS.includes(S.driverCellConstruction)
      ?S.driverCellConstruction:'integrated';
    S.driverCellConstruction=construction;
    S.mountRing=construction==='cartridge'?'ring':'integrated';
    /* A panel's complete bearing/fastener envelope is owned by mouth sizing.
       Rear boss depth is not an alternate containment knob: its blind pocket
       base remains fixed near the acoustic surface. Radial packaging uses
       adapterReach, so the generic panel workaround has no valid semantics. */
    delete S.mountEnvelopeReachMm;
    S.adapterReachMode=S.adapterReachMode==='manual'?'manual':'auto';
    if(!CONE_PROFILE_MODES.includes(S.coneProfileMode))S.coneProfileMode='flat';
    S.coneDepthMm=clamp(Number.isFinite(+S.coneDepthMm)?+S.coneDepthMm:0,0,250);
    S.coneDepthKnown=S.coneDepthKnown===true||S.coneDepthKnown===1||
      S.coneDepthKnown==='true';
    /* Zero selects the conservative automatic allowance; a positive value
       requests explicit additional clearance without unit ambiguity. */
    S.coneAxialClearanceMm=clamp(
      Number.isFinite(+S.coneAxialClearanceMm)?+S.coneAxialClearanceMm:0,0,100);
    S.coneRadialClearanceMm=clamp(
      Number.isFinite(+S.coneRadialClearanceMm)?+S.coneRadialClearanceMm:0,0,50);
    if(!['slot','oval','round'].includes(S.shW)) S.shW='slot';
    if(!['published','manual','model'].includes(S.tapBasis)) S.tapBasis='model';
    S.tapPairMode=S.tapPairMode==='custom'?'custom':'auto';
    if(Number.isFinite(+S.tapPairSpreadMm)&&+S.tapPairSpreadMm>=0)
      S.tapPairSpreadMm=+S.tapPairSpreadMm;
    else delete S.tapPairSpreadMm;
    /* tapShapeW records the shape attached to locked source dimensions.
       shW is the currently requested output shape. Keeping those two facts
       separate lets a published/manual aperture be converted by equal area
       instead of reinterpreting the same dimensions as a different shape. */
    if(!['slot','oval','round'].includes(S.tapShapeW))
      S.tapShapeW=S.tapBasis==='published'?'slot':S.shW;
    S.phaseMargin=clamp(+S.phaseMargin||1.2,1.05,1.8);
    return S;
  }

  function frameSpec(S){
    const od=Math.max(0.08,(+S.odW||22)*CM);
    const sd=Math.max(20,+S.sdW||220)*1e-4;
    const activeR=Math.sqrt(sd/Math.PI);
    const boltN=Math.max(4,(S.boltNW|0)||(+S.odW>=30?8:4));
    const family=familyKey(S),
      boltD=(+S.boltDW>0?+S.boltDW/1000:0.0065),
      insertWeb=0.0032,
      radialClearance=(Number.isFinite(+S.coneRadialClearanceMm)&&
          +S.coneRadialClearanceMm>0)
        ?+S.coneRadialClearanceMm/1000:0.002,
      movingRadius=activeR+radialClearance,
      boltInnerWebRequired=0.0032,
      explicitBcd=Number.isFinite(+S.bcdW)&&+S.bcdW>0,
      requestedBcd=explicitBcd
        ?+S.bcdW/1000:od*(boltN>=8?0.945:0.88);
    /* The selected bolt diameter is already the declared clearance cutter in
       the existing mount schema.  Keep that exact dimension for an
       integrated printed panel; a separate insert record must name and own
       any larger heat-set pocket rather than inheriting a timber tee-nut
       barrel. */
    const panelPocketD=boltD,
      targetInsertPocketD=Math.max(0.010,boltD+0.003),
      generatedPanelBcd=family==='panel'&&!explicitBcd,
      generatedRadialBcd=family==='radial'&&!explicitBcd,
      minimumPanelBcd=2*
        (movingRadius+panelPocketD/2+boltInnerWebRequired),
      minimumRadialBcd=2*
        (movingRadius+targetInsertPocketD/2+boltInnerWebRequired),
      bcd=family==='panel'
        ?(generatedPanelBcd
          ?Math.max(requestedBcd,minimumPanelBcd)
          :requestedBcd)
        :(generatedRadialBcd
          ?Math.max(activeR*2+0.014,requestedBcd,minimumRadialBcd)
          :requestedBcd);
    /* Printed radial modules do not use a timber-style clearance bore through
       the whole adapter. They receive a blind heat-set insert from the driver
       face. Keep the acoustic/user bolt diameter as the fastener clearance,
       while giving the insert its own manufacturable pocket diameter. */
    const insertPocketLimit=bcd-2*activeR-2*insertWeb;
    const insertPocketD=Math.max(boltD,
      Math.min(targetInsertPocketD,insertPocketLimit));
    const panelPocketLimit=Math.max(0,2*(od/2-bcd/2-insertWeb)),
      fastenerPocketD=family==='panel'?panelPocketD:insertPocketD,
      boltInnerWeb=bcd/2-fastenerPocketD/2-movingRadius,
      boltInnerWebPass=boltInnerWeb>=boltInnerWebRequired-1e-12;
    const gasketT=(+S.gasketW>0?+S.gasketW/1000:0.0016);
    return {od,sd,activeR,frameR:od/2,depth:Math.max(0.04,(+S.dpW||9)*CM),
      xmax:Math.max(0.001,(+S.xmW||5)/1000),boltN,bcd,boltD,
      insertPocketD,insertPocketLimit,panelPocketD,panelPocketLimit,
      fastenerPocketD,insertWeb,gasketT,
      requestedBcd,explicitBcd,generatedPanelBcd,generatedRadialBcd,
      minimumPanelBcd,minimumRadialBcd,
      movingRadius,boltInnerWeb,boltInnerWebRequired,boltInnerWebPass,
      frame:S.frameW||'round'};
  }

  function integrateReliefStations(stations){
    let volume=0;
    for(let i=1;i<stations.length;i++){
      const a=stations[i-1],b=stations[i],
        h=Math.abs(a.depthFromFaceM-b.depthFromFaceM);
      volume+=Math.PI*h*
        (a.radiusM*a.radiusM+a.radiusM*b.radiusM+b.radiusM*b.radiusM)/3;
    }
    return volume;
  }

  /* One sampled generatrix owns the declared cone relief, its conservative
     moving clearance and the exact solid cutter.  Parametric relief uses a
     quarter-sine radius law: it is monotone, tangent to the active-radius rim
     and materially different from the old single straight frustum.  A
     measured scalar without surface samples remains a containing cylinder;
     it is deliberately not promoted to a measured cone shape. */
  function coneReliefProfile(options){
    options=options||{};
    const mode=CONE_PROFILE_MODES.includes(options.mode)
        ?options.mode:'flat',
      activeRadius=Math.max(1e-6,+options.activeRadius||0),
      coneTipRadius=clamp(+options.coneTipRadius||activeRadius,
        1e-6,activeRadius),
      declaredDepth=Math.max(0,+options.depth||0),
      profileDepth=mode==='flat'?0:declaredDepth,
      xmax=Math.max(0,+options.xmax||0),
      axialClearance=Math.max(0,+options.axialClearance||0),
      radialClearance=Math.max(0,+options.radialClearance||0),
      motionAllowance=xmax+axialClearance,
      requiredDepth=profileDepth+motionAllowance;
    let kind='flat-piston-plane',profileStations;
    if(mode==='parametric'&&profileDepth>0){
      kind='parametric-quarter-sine-generatrix';
      profileStations=Array.from({length:17},(_,index)=>{
        const u=index/16;
        return {u,depthFromFaceM:profileDepth*(1-u),
          radiusM:coneTipRadius+
            (activeRadius-coneTipRadius)*Math.sin(Math.PI*u/2)};
      });
    }else if(mode==='measured'&&profileDepth>0){
      kind='measured-scalar-cylinder-bound';
      profileStations=[
        {u:0,depthFromFaceM:profileDepth,radiusM:activeRadius},
        {u:1,depthFromFaceM:0,radiusM:activeRadius}
      ];
    }else{
      profileStations=[{u:1,depthFromFaceM:0,radiusM:activeRadius}];
    }
    const rimRadius=activeRadius+radialClearance,
      cavityStations=profileStations.map(station=>({
        u:station.u,
        depthFromFaceM:station.depthFromFaceM+motionAllowance,
        radiusM:station.radiusM+radialClearance
      })),
      deepest=cavityStations[0],
      generatedSpan=Math.max(requiredDepth,
        Number.isFinite(+options.generatedSpan)?+options.generatedSpan:requiredDepth);
    if(generatedSpan>deepest.depthFromFaceM+1e-12)
      cavityStations.unshift({u:0,depthFromFaceM:generatedSpan,
        radiusM:deepest.radiusM,extension:true});
    const face=cavityStations[cavityStations.length-1];
    if(face.depthFromFaceM>1e-12)
      cavityStations.push({u:1,depthFromFaceM:0,radiusM:rimRadius,
        clearanceShelf:true});
    return {
      kind,mode,
      nonlinear:kind==='parametric-quarter-sine-generatrix',
      conservativeBound:kind==='measured-scalar-cylinder-bound',
      measuredSampleCount:0,
      activeRadiusM:activeRadius,tipRadiusM:coneTipRadius,
      rimRadiusM:activeRadius,
      radialClearanceM:radialClearance,
      motionAllowanceM:motionAllowance,
      requiredDepthM:requiredDepth,generatedDepthM:generatedSpan,
      sampleCount:profileStations.length,
      profileStations,
      cavityStations,
      profileVolumeM3:integrateReliefStations(profileStations),
      cavityEnvelopeVolumeM3:integrateReliefStations(cavityStations)
    };
  }

  function driverCellMetadata(S,fs,f,acousticVolume,acousticDepth,coneTipRadius){
    const mode=CONE_PROFILE_MODES.includes(S.coneProfileMode)
        ?S.coneProfileMode:'flat',
      construction=DRIVER_CELL_CONSTRUCTIONS.includes(S.driverCellConstruction)
        ?S.driverCellConstruction:'integrated',
      declaredDepth=Math.max(0,+S.coneDepthMm||0)/1000,
      profileDepth=mode==='flat'?0:declaredDepth,
      depthKnown=!!S.coneDepthKnown,
      explicitAxial=Math.max(0,+S.coneAxialClearanceMm||0)/1000,
      explicitRadial=Math.max(0,+S.coneRadialClearanceMm||0)/1000,
      /* Six millimetres is the existing two-way chamber allowance above Xmax.
         Two millimetres is the existing panel opening allowance around the Sd
         radius. They become named metadata instead of hidden constants. */
      axialClearance=explicitAxial>0?explicitAxial:0.006,
      radialClearance=explicitRadial>0?explicitRadial:0.002,
      movingRadius=fs.activeR+radialClearance,
      relief=coneReliefProfile({mode,activeRadius:fs.activeR,
        coneTipRadius,depth:profileDepth,xmax:fs.xmax,
        axialClearance,radialClearance}),
      requiredAxialDepth=relief.requiredDepthM,
      designDepth=Math.max(acousticDepth,requiredAxialDepth),
      coneEnvelopeVolume=relief.profileVolumeM3,
      movingSweepVolume=Math.PI*movingRadius*movingRadius*(2*fs.xmax),
      profileComplete=mode==='flat'||(depthKnown&&declaredDepth>0);
    return {
      schemaVersion:DRIVER_CELL_SCHEMA_VERSION,
      construction,
      interfaceKind:construction==='cartridge'
        ?'registered horn-side cartridge':'integrated horn cell',
      coneProfile:{
        mode,depthMm:+S.coneDepthMm||0,depthM:declaredDepth,
        effectiveDepthMm:profileDepth*1000,effectiveDepthM:profileDepth,
        depthKnown,
        evidence:mode==='flat'?'flat solver assumption':
          mode==='measured'?(profileComplete?'measured depth':'measurement required'):
            (depthKnown?'declared parametric depth':'parametric estimate'),
        envelopeModel:relief.kind==='flat-piston-plane'?'flat plane':
          mode==='parametric'?'sampled cone-following generatrix':
            'maximum-depth cylinder bound',
        complete:profileComplete,
        relief
      },
      clearance:{
        axialMm:axialClearance*1000,axialM:axialClearance,
        radialMm:radialClearance*1000,radialM:radialClearance,
        axialSource:explicitAxial>0?'user':'conservative automatic',
        radialSource:explicitRadial>0?'user':'conservative automatic'
      },
      movingEnvelope:{
        activeRadiusM:fs.activeR,activeRadiusMm:fs.activeR*1000,
        radiusM:movingRadius,radiusMm:movingRadius*1000,
        xmaxM:fs.xmax,xmaxMm:fs.xmax*1000,totalStrokeM:2*fs.xmax,
        totalStrokeMm:2*fs.xmax*1000,
        conservativeAxialDepthM:requiredAxialDepth,
        conservativeAxialDepthMm:requiredAxialDepth*1000,
        sweptVolumeM3:movingSweepVolume,sweptVolumeCm3:movingSweepVolume*1e6,
        profileComplete
      },
      frontChamber:{
        acousticVolumeM3:acousticVolume,acousticVolumeCm3:acousticVolume*1e6,
        acousticDepthM:acousticDepth,acousticDepthMm:acousticDepth*1000,
        requiredAxialDepthM:requiredAxialDepth,
        requiredAxialDepthMm:requiredAxialDepth*1000,
        designAxialDepthM:designDepth,designAxialDepthMm:designDepth*1000,
        axialMarginM:designDepth-requiredAxialDepth,
        axialMarginMm:(designDepth-requiredAxialDepth)*1000,
        coneEnvelopeVolumeM3:coneEnvelopeVolume,
        coneEnvelopeVolumeCm3:coneEnvelopeVolume*1e6,
        reliefCavityEnvelopeVolumeM3:relief.cavityEnvelopeVolumeM3,
        reliefCavityEnvelopeVolumeCm3:relief.cavityEnvelopeVolumeM3*1e6,
        minimumGrossCavityM3:acousticVolume+coneEnvelopeVolume,
        minimumGrossCavityCm3:(acousticVolume+coneEnvelopeVolume)*1e6,
        family:f
      }
    };
  }

  const apertureShape=s=>['round','oval','slot'].includes(s)?s:'slot';
  function apertureArea(shape,sa,sb){
    shape=apertureShape(shape);
    sa=Math.max(1e-6,+sa||0);sb=Math.max(1e-6,+sb||0);
    if(shape==='round')return Math.PI*sb*sb;
    if(shape==='oval')return Math.PI*sa*sb;
    return 4*sb*Math.max(0,sa-sb)+Math.PI*sb*sb;
  }
  function apertureDescriptor(shape,sa,sb,meta){
    shape=apertureShape(shape);
    sa=Math.max(1e-6,+sa||0);sb=Math.max(1e-6,+sb||0);
    if(shape==='round')sa=sb=Math.max(sa,sb);
    else if(sa<sb){const t=sa;sa=sb;sb=t;}
    const core=shape==='slot'?Math.max(0,sa-sb):0;
    return {shape,sa,sb,core,boundR:Math.max(sa,sb),
      aspect:sa/sb,area:apertureArea(shape,sa,sb),...(meta||{})};
  }
  function apertureFromArea(shape,area,aspect,source){
    shape=apertureShape(shape);
    const A=Math.max(1e-8,+area||0),ar=Math.max(1,+aspect||1);
    if(shape==='round'){
      const r=Math.sqrt(A/Math.PI);
      return apertureDescriptor(shape,r,r,{targetArea:A,source});
    }
    if(shape==='oval'){
      const sb=Math.sqrt(A/(Math.PI*ar));
      return apertureDescriptor(shape,ar*sb,sb,{targetArea:A,source});
    }
    const sb=Math.sqrt(A/(4*ar-4+Math.PI));
    return apertureDescriptor(shape,ar*sb,sb,{targetArea:A,source});
  }
  function apertureSupport(q,du,dv){
    const shape=apertureShape(q.shape),L=Math.hypot(du,dv);
    /* A section whose axis is parallel to the queried normal has no
       transverse aperture support in that direction. Normalising floating
       roundoff such as (6e-16, 0) to a unit vector falsely reports the full
       major radius and makes an exactly mount-normal terminal appear to
       cross its bearing plane by tens of millimetres. */
    if(L<=1e-10)return 0;
    du/=L;dv/=L;
    if(shape==='round')return q.sb;
    if(shape==='oval')
      return Math.hypot(q.sa*du,q.sb*dv);
    return Math.max(0,q.sa-q.sb)*Math.abs(du)+q.sb;
  }
  function apertureProjectedSupport(q,direction){
    const du=dot(direction,q.flow),dv=dot(direction,q.cross),
      projection=Math.hypot(du,dv);
    /* apertureSupport() accepts a direction *inside* the aperture plane and
       normalises it.  A bearing-plane clearance direction can be oblique to
       the wall aperture, so only its projection onto q.flow/q.cross changes
       the support of that aperture.  Restore that projection magnitude after
       querying the canonical 2-D support function. */
    return projection<=1e-10
      ?0:apertureSupport(q,du,dv)*projection;
  }
  function apertureOutline(q,count){
    const shape=apertureShape(q.shape),N=Math.max(16,(count|0)||64),out=[];
    if(shape==='round'||shape==='oval'){
      for(let i=0;i<N;i++){
        const a=i/N*Math.PI*2;
        out.push([q.sa*Math.cos(a),q.sb*Math.sin(a)]);
      }
      return out;
    }
    const core=Math.max(0,q.sa-q.sb),half=Math.max(4,Math.floor(N/2));
    for(let i=0;i<half;i++){
      const a=-Math.PI/2+i/(half-1)*Math.PI;
      out.push([core+q.sb*Math.cos(a),q.sb*Math.sin(a)]);
    }
    for(let i=0;i<half;i++){
      const a=Math.PI/2+i/(half-1)*Math.PI;
      out.push([-core+q.sb*Math.cos(a),q.sb*Math.sin(a)]);
    }
    return out;
  }
  function apertureSdf2D(x,y,shape,sa,sb){
    shape=apertureShape(shape);
    if(shape==='round')return Math.hypot(x,y)-sb;
    if(shape==='oval')
      return (Math.hypot(x/Math.max(sa,1e-6),y/Math.max(sb,1e-6))-1)*
        Math.min(sa,sb);
    const core=Math.max(0,sa-sb),dx=Math.max(Math.abs(x)-core,0);
    return Math.hypot(dx,y)-sb;
  }
  function portSection(S,totalArea,np){
    const A=Math.max(1e-8,totalArea/np),requested=apertureShape(S.shW);
    if(S.tapBasis!=='model'&&+S.tapSlotL>0&&+S.tapSlotW>0){
      const sourceShape=apertureShape(S.tapShapeW),
        locked=apertureDescriptor(sourceShape,+S.tapSlotL/2000,+S.tapSlotW/2000,
          {targetArea:A,source:'locked '+sourceShape+' dimensions'});
      if(requested===sourceShape)return locked;
      return apertureFromArea(requested,locked.area,
        requested==='round'?1:locked.aspect,
        'equal-area '+requested+' converted from locked '+sourceShape);
    }
    const aspect=requested==='round'?1:
      requested==='oval'?2.25:(familyKey(S)==='panel'?3.4:2.5);
    return apertureFromArea(requested,A,aspect,
      requested==='round'?'equal-area circle':
      requested==='oval'?'equal-area ellipse':'equal-area racetrack');
  }

  function tangentFrame(n){
    let u=unit(sub([1,0,0],mul(n,n[0])));
    if(len(u)<0.1) u=[0,1,0];
    return {u,v:unit(cross(n,u))};
  }
  function sectionBoundaryPoint(P,x,phi,offsetA,offsetB){
    const d=M.dimsAt(P.st,clamp(x,0,P.st.depth)),offA=offsetA||0,
      offB=Number.isFinite(offsetB)?offsetB:offA,
      nn=d.n===undefined?P.st.n:d.n;
    if(M.sectionPolarPoint2D){
      const family=P.st.sectionFamily||P.S.sectionFamily||'superellipse',
        cornerR=family==='roundedRectangle'
          ?d.cornerR+Math.min(offA,offB):d.cornerR;
      return M.sectionPolarPoint2D(family,d.a+offA,d.b+offB,nn,
        cornerR,phi,P.S.style);
    }
    if(P.S.style==='angular'&&M.panelPoint)
      return M.panelPoint(d.a+offA,d.b+offB,nn,phi);
    /* sePoint() uses the superellipse parameter, while the implicit field gives
       us a true polar angle.  Intersect that ray with the selected section so
       the last morph ring and the first ordinary horn ring are the same locus,
       rather than twisting their vertices at the hand-off. */
    const a=Math.max(1e-9,d.a+offA),b=Math.max(1e-9,d.b+offB),
      trig=M.snappedTrig?M.snappedTrig(phi):[Math.cos(phi),Math.sin(phi)],
      ct=trig[0],sn=trig[1],
      den=Math.pow(Math.abs(ct)/a,nn)+Math.pow(Math.abs(sn)/b,nn),
      r=Math.pow(Math.max(1e-30,den),-1/nn);
    return [r*ct,r*sn];
  }
  function sectionPoint(P,x,phi,offsetA,offsetB,throatOffset){
    const xx=clamp(x,0,P.st.depth),offA=offsetA||0,
      offB=Number.isFinite(offsetB)?offsetB:offA,
      offThroat=Number.isFinite(throatOffset)?throatOffset:offA,
      morphL=Math.max(1e-6,P.throatMorphL),
      q=sectionBoundaryPoint(P,xx,phi,offA,offB);
    if(xx>=morphL)return q;
    const trig=M.snappedTrig?M.snappedTrig(phi):[Math.cos(phi),Math.sin(phi)],
      ct=trig[0],sn=trig[1],
      roundR=Math.max(1e-9,P.throatR+offThroat),
      end=sectionBoundaryPoint(P,morphL,phi,offA,offB),
      endR=Math.hypot(end[0],end[1]),
      delta=endR-roundR,
      u=clamp(xx/morphL,0,1);
    if(delta<=1e-9){
      /* This guard is only reachable for an infeasible section which has not
         yet grown around the declared CD bore. Keep the surface continuous;
         normal admitted plans have a strictly positive delta on every ray. */
      const blend=u*u*u*(10+u*(-15+6*u)),
        r=lerp(roundR,endR,blend);
      return [r*ct,r*sn];
    }
    /* A single monotone quintic Bezier owns every throat ray. The first three
       controls coincide at the exact circular CD exit (zero slope/curvature).
       The last controls follow the selected horn's downstream ray slope. Since
       the controls are ordered, radius cannot stall on one wall and balloon on
       another as the old per-sample max(roundR, sectionR) blend did. */
    const probeX=Math.min(P.st.depth,morphL+
        Math.max(1e-5,Math.min(morphL*0.01,P.st.depth/600))),
      probe=sectionBoundaryPoint(P,probeX,phi,offA,offB),
      rawSlope=probeX>morphL
        ?(Math.hypot(probe[0],probe[1])-endR)/(probeX-morphL):0,
      slope=clamp(rawSlope,0,2.5*delta/morphL),
      c3=clamp(endR-2*morphL*slope/5,roundR,endR),
      c4=clamp(endR-morphL*slope/5,c3,endR),
      v=1-u,
      r=roundR*(v*v*v*v*v+5*v*v*v*v*u+10*v*v*v*u*u)
        +10*c3*v*v*u*u*u+5*c4*v*u*u*u*u+endR*u*u*u*u*u;
    return [r*ct,r*sn];
  }
  function crossArea(P,x){
    const d=M.dimsAt(P.st,clamp(x,0,P.st.depth)),nn=d.n===undefined?P.st.n:d.n;
    if(P.S.style!=='angular'||!M.panelVerts)return M.areaAt(P.st,x);
    const V=M.panelVerts(d.a,d.b,nn);
    let a=0;
    for(let i=0;i<V.length;i++){
      const p=V[i],q=V[(i+1)%V.length];
      a+=p[0]*q[1]-q[0]*p[1];
    }
    return Math.abs(a)/2;
  }

  function driverPhis(S,rotationDeg){
    const N=Math.max(1,S.nW|0),
      rotation=normalizeDriverArrayRotation(
        rotationDeg===undefined?S.driverArrayRotationDeg:rotationDeg,N)*
        Math.PI/180;
    return Array.from({length:N},(_,index)=>
      rotation+index*2*Math.PI/N);
  }

  /*
     Canonical panel ownership
     -------------------------
     surfN() is intentionally smooth enough for general rendering, but a driver
     placed exactly on an angular-horn crease needs two real planes rather than
     one numerically averaged normal.  This topology is the shared datum used by
     the plan, exact solid, viewport and QA.  Face and seam ids are stable for a
     fixed station because they follow facetsAt()'s cyclic order.
  */
  function panelTopologyAt(st,station){
    if(!['angular','curvedFacets'].includes(st.style)||
        !M.facetsAt||!M.facetN)return null;
    const facets=M.facetsAt(st,station),count=facets.length;
    if(count<3)return null;
    const faces=facets.map((facet,index)=>{
      const normal=unit(M.facetN(st,station,index)),
        crossAxis=unit([0,facet.dir[0],facet.dir[1]]);
      let longAxis=unit(cross(crossAxis,normal));
      if(longAxis[0]<0)longAxis=mul(longAxis,-1);
      return {
        id:'face:'+index,index,
        normal,longAxis,crossAxis,
        vertexIds:['vertex:'+index,'vertex:'+((index+1)%count)],
        edgeLength:facet.len,
        p:[station,facet.p[0],facet.p[1]],
        q:[station,facet.q[0],facet.q[1]]
      };
    });
    const seams=facets.map((facet,index)=>{
      const previous=(index-1+count)%count,
        faceNormals=[faces[previous].normal,faces[index].normal];
      let seamDirection=unit(cross(faceNormals[0],faceNormals[1]));
      if(seamDirection[0]<0)seamDirection=mul(seamDirection,-1);
      const bisectorNormal=unit(add(faceNormals[0],faceNormals[1]));
      return {
        id:'seam:'+index,index,
        point:[station,facet.p[0],facet.p[1]],
        adjacentFaceIds:[faces[previous].id,faces[index].id],
        faceNormals,
        seamDirection,bisectorNormal,
        /* Dihedral is deliberately the outward-face-normal angle.  Keeping
           this convention explicit avoids a silent π-angle change in reports. */
        dihedralRad:Math.acos(clamp(dot(faceNormals[0],faceNormals[1]),-1,1))
      };
    });
    return {schemaVersion:CORNER_PLATE_SCHEMA_VERSION,station,faces,seams};
  }

  function panelSurfacePoint(st,station,phi){
    if(!['angular','curvedFacets'].includes(st.style)||!M.facetsAt)
      return M.surfPt(st,station,phi);
    const direction=[Math.cos(phi),Math.sin(phi)],
      facets=M.facetsAt(st,station);
    let radius=Infinity;
    for(const facet of facets){
      const denominator=facet.n2[0]*direction[0]+
        facet.n2[1]*direction[1];
      if(denominator<=1e-12)continue;
      const candidate=(facet.n2[0]*facet.p[0]+
        facet.n2[1]*facet.p[1])/denominator;
      if(candidate>=0)radius=Math.min(radius,candidate);
    }
    return Number.isFinite(radius)
      ?[station,radius*direction[0],radius*direction[1]]
      :M.surfPt(st,station,phi);
  }

  function pointSegmentDistance2(point,a,b){
    const ab=[b[0]-a[0],b[1]-a[1]],
      ap=[point[0]-a[0],point[1]-a[1]],
      den=ab[0]*ab[0]+ab[1]*ab[1],
      t=den>1e-18?clamp((ap[0]*ab[0]+ap[1]*ab[1])/den,0,1):0,
      dx=point[0]-(a[0]+ab[0]*t),dy=point[1]-(a[1]+ab[1]*t);
    return dx*dx+dy*dy;
  }
  function pointSegmentDistance3(point,a,b){
    const ab=sub(b,a),den=dot(ab,ab),
      t=den>1e-18?clamp(dot(sub(point,a),ab)/den,0,1):0;
    return len(sub(point,add(a,mul(ab,t))));
  }

  function panelPlacementAt(st,station,phi,topology,point){
    const surface=point||panelSurfacePoint(st,station,phi);
    if(!topology){
      const normal=unit(M.surfN(st,station,phi)),tf=tangentFrame(normal);
      return {kind:'surface',groupId:'surface',faceIds:[],seamId:null,
        surface,basis:{normal,u:tf.u,v:tf.v}};
    }
    const yz=[surface[1],surface[2]],
      scale=Math.max(1,...topology.faces.map(face=>face.edgeLength)),
      cornerTolerance=Math.max(1e-8,scale*1e-7);
    let seam=null,seamDistance=Infinity;
    for(const candidate of topology.seams){
      const distance=Math.hypot(yz[0]-candidate.point[1],
        yz[1]-candidate.point[2]);
      if(distance<seamDistance){
        seam=candidate;seamDistance=distance;
      }
    }
    if(seam&&seamDistance<=cornerTolerance){
      const normal=seam.bisectorNormal,u=seam.seamDirection,
        v=unit(cross(normal,u));
      return {kind:'corner',groupId:seam.id,
        faceIds:seam.adjacentFaceIds.slice(),seamId:seam.id,
        surface,basis:{normal,u,v}};
    }
    let face=topology.faces[0],best=Infinity;
    for(const candidate of topology.faces){
      const distance=pointSegmentDistance2(yz,
        [candidate.p[1],candidate.p[2]],[candidate.q[1],candidate.q[2]]);
      if(distance<best){face=candidate;best=distance;}
    }
    return {kind:'face',groupId:face.id,faceIds:[face.id],seamId:null,
      surface,basis:{normal:face.normal,u:face.longAxis,v:face.crossAxis}};
  }

  function topologyFaceForPoint(topology,point,preferredFaceIds){
    if(!topology)return null;
    const preferred=new Set(preferredFaceIds||[]),yz=[point[1],point[2]];
    let face=null,best=Infinity;
    for(const candidate of topology.faces){
      const distance=pointSegmentDistance2(yz,
        [candidate.p[1],candidate.p[2]],[candidate.q[1],candidate.q[2]]);
      const tie=Math.abs(distance-best)<=1e-16;
      if(distance<best-1e-16||
          (tie&&preferred.has(candidate.id)&&(!face||!preferred.has(face.id)))){
        face=candidate;best=distance;
      }
    }
    return face;
  }

  function radialMountNormal(phi){ return [0,Math.cos(phi),Math.sin(phi)]; }
  function slerpUnit(a,b,t){
    const u=unit(a),v=unit(b),amount=clamp(t,0,1),
      cosine=clamp(dot(u,v),-1,1);
    if(amount<=0)return u;
    if(amount>=1)return v;
    if(cosine>0.999999)return unit(add(mul(u,1-amount),
      mul(v,amount)));
    const angle=Math.acos(cosine),sine=Math.sin(angle);
    return unit(add(
      mul(u,Math.sin((1-amount)*angle)/sine),
      mul(v,Math.sin(amount*angle)/sine)));
  }
  function driverMountDatum(S,st,station,phi,topology,surface,family){
    const point=surface||(family==='panel'
        ?panelSurfacePoint(st,station,phi):M.surfPt(st,station,phi)),
      placement=family==='panel'
        ?panelPlacementAt(st,station,phi,topology,point):null,
      wallN=placement
        ?placement.basis.normal:unit(M.surfN(st,station,phi)),
      radialN=radialMountNormal(phi),
      shortest=family==='radial'?radialN:wallN,
      extended=S.driverMountMode==='extended-manifold',
      requestedBlend=clamp(Number.isFinite(+S.driverAxisBlend)
        ?+S.driverAxisBlend:(family==='radial'?1:0),0,1),
      mountN=extended?slerpUnit(wallN,radialN,requestedBlend):shortest,
      axisToCdDeg=Math.acos(clamp(Math.abs(mountN[0]),0,1))*
        180/Math.PI;
    return {surface:point,placement,wallN,radialN,mountN,
      requestedBlend,solvedBlend:extended?requestedBlend:
        (family==='radial'?1:0),axisToCdDeg};
  }
  function orientedDiscGap(a,na,b,nb,r){
    const delta=sub(b,a),D=len(delta);
    if(D<1e-9)return -2*r;
    const u=mul(delta,1/D);
    /* Projection of an oriented circular flange onto the line joining the
       flange centres. Opposed/angled panel drivers can overlap in a front
       projection while their real mounting discs remain widely separated;
       treating every frame as a sphere falsely rejected documented builds. */
    const ea=r*Math.sqrt(Math.max(0,1-Math.pow(dot(na,u),2)));
    const eb=r*Math.sqrt(Math.max(0,1-Math.pow(dot(nb,u),2)));
    return D-ea-eb;
  }
  function minimumPairGap(st,phis,station,reach,frameOD,family,S){
    if(phis.length<2)return Infinity;
    const topology=family==='panel'?panelTopologyAt(st,station):null;
    const mounts=phis.map(phi=>{
      const datum=driverMountDatum(S||{},st,station,phi,topology,
        null,family);
      return {c:add(datum.surface,mul(datum.mountN,reach)),
        n:datum.mountN};
    });
    let nearest=Infinity;
    for(let i=0;i<mounts.length;i++)for(let j=i+1;j<mounts.length;j++)
      nearest=Math.min(nearest,orientedDiscGap(
        mounts[i].c,mounts[i].n,mounts[j].c,mounts[j].n,frameOD/2));
    return nearest;
  }

  function driverArrayClassifications(st,station,phis,family){
    const topology=family==='panel'?panelTopologyAt(st,station):null;
    return phis.map((phi,driverIndex)=>{
      const surface=family==='panel'
          ?panelSurfacePoint(st,station,phi):M.surfPt(st,station,phi);
      if(!topology)return {
        driverIndex,phiDeg:phi*180/Math.PI,
        kind:'smooth-surface',faceIds:[],seamId:null,
        faceCenterOffsetM:null
      };
      const placement=panelPlacementAt(st,station,phi,topology,surface);
      if(placement.kind==='corner')return {
        driverIndex,phiDeg:phi*180/Math.PI,
        kind:'seam-corner',faceIds:placement.faceIds.slice(),
        seamId:placement.seamId,faceCenterOffsetM:null
      };
      const face=topology.faces.find(item=>
          item.id===placement.faceIds[0]),
        midpoint=face?mul(add(face.p,face.q),0.5):surface,
        faceCenterOffsetM=face
          ?Math.hypot(surface[1]-midpoint[1],
            surface[2]-midpoint[2]):Infinity,
        tolerance=face
          ?Math.max(1e-7,face.edgeLength*1e-5):0;
      return {
        driverIndex,phiDeg:phi*180/Math.PI,
        kind:faceCenterOffsetM<=tolerance
          ?'face-center':'intermediate',
        faceIds:placement.faceIds.slice(),seamId:null,
        faceCenterOffsetM
      };
    });
  }

  function solveDriverArrayPlacement(S,st,station,reach,frameOD,
      family,wantedGap,rootRadius,minWeb){
    const N=Math.max(1,S.nW|0),periodDeg=360/N,
      requestedRotationDeg=normalizeDriverArrayRotation(
        S.driverArrayRotationDeg,N),
      mode=S.driverArrayMode==='manual'?'manual':'auto',
      topology=family==='panel'?panelTopologyAt(st,station):null,
      candidates=[];
    const addCandidate=value=>{
      const normalized=normalizeDriverArrayRotation(value,N);
      if(!candidates.some(item=>
          Math.abs(item-normalized)<1e-9||
          Math.abs(Math.abs(item-normalized)-periodDeg)<1e-9))
        candidates.push(normalized);
    };
    addCandidate(requestedRotationDeg);
    if(mode==='auto'){
      /* Uniform probes handle smooth/asymmetric sections. Exact face-midpoint
         and seam rays ensure faceted topology candidates are not missed by a
         finite angular grid. */
      for(let index=0;index<72;index++)
        addCandidate(index*periodDeg/72);
      if(topology){
        for(const face of topology.faces){
          const midpoint=mul(add(face.p,face.q),0.5);
          addCandidate(Math.atan2(midpoint[2],midpoint[1])*180/Math.PI);
        }
        for(const seam of topology.seams)
          addCandidate(Math.atan2(seam.point[2],seam.point[1])*
            180/Math.PI);
      }
    }
    const evaluateRotation=rotationDeg=>{
      const phis=driverPhis(S,rotationDeg),
        classifications=driverArrayClassifications(
          st,station,phis,family),
        minimumGap=minimumPairGap(st,phis,station,reach,frameOD,family,S),
        alignedCount=classifications.filter(item=>
          item.kind==='face-center'||item.kind==='seam-corner').length,
        seamOwnershipValid=!topology||classifications.every(item=>{
          if(item.kind!=='seam-corner')return true;
          return item.faceIds.every(faceId=>{
            const face=topology.faces.find(candidate=>
              candidate.id===faceId);
            return face&&rootRadius+minWeb<face.edgeLength-1e-12;
          });
        }),
        legalGap=minimumGap>=wantedGap-1e-12,
        requestedDistance=Math.min(
          Math.abs(rotationDeg-requestedRotationDeg),
          periodDeg-Math.abs(rotationDeg-requestedRotationDeg));
      return {rotationDeg,phis,classifications,minimumGap,
        alignedCount,seamOwnershipValid,legalGap,requestedDistance};
    };
    let best=evaluateRotation(candidates[0]);
    for(let index=1;index<candidates.length;index++){
      const item=evaluateRotation(candidates[index]),
        a=[
          item.seamOwnershipValid?1:0,
          item.legalGap?1:0,
          topology?item.alignedCount:0,
          item.minimumGap,
          -item.requestedDistance,
          -item.rotationDeg
        ],
        b=[
          best.seamOwnershipValid?1:0,
          best.legalGap?1:0,
          topology?best.alignedCount:0,
          best.minimumGap,
          -best.requestedDistance,
          -best.rotationDeg
        ];
      let replace=false;
      for(let k=0;k<a.length;k++){
        if(a[k]>b[k]+1e-12){replace=true;break;}
        if(a[k]<b[k]-1e-12)break;
      }
      if(replace)best=item;
    }
    /*
       A panel seam is a ray through the actual section vertex, not a universal
       45° direction.  A 90° × 60° rectangular horn, for example, lands near
       30°, while a square horn lands at 45°.  Preserve the legal canonical
       two-driver seam datum in every solved record so the UI can offer the
       real geometry instead of a decorative fixed-angle shortcut.
    */
    let seamPresetRotationDeg=null,seamPresetMinimumGapM=null;
    if(N===2&&topology){
      const seamCandidates=[];
      for(const seam of topology.seams){
        const rotationDeg=normalizeDriverArrayRotation(
          Math.atan2(seam.point[2],seam.point[1])*180/Math.PI,N);
        if(!seamCandidates.some(item=>
            Math.abs(item-rotationDeg)<1e-9||
            Math.abs(Math.abs(item-rotationDeg)-periodDeg)<1e-9))
          seamCandidates.push(rotationDeg);
      }
      let seamBest=null;
      for(const rotationDeg of seamCandidates){
        const item=evaluateRotation(rotationDeg),
          allSeam=item.classifications.length===N&&
            item.classifications.every(classification=>
              classification.kind==='seam-corner');
        if(!allSeam||!item.seamOwnershipValid||!item.legalGap)continue;
        if(!seamBest||
            item.minimumGap>seamBest.minimumGap+1e-12||
            (Math.abs(item.minimumGap-seamBest.minimumGap)<=1e-12&&
              item.rotationDeg<seamBest.rotationDeg-1e-12))
          seamBest=item;
      }
      if(seamBest){
        seamPresetRotationDeg=seamBest.rotationDeg;
        seamPresetMinimumGapM=seamBest.minimumGap;
      }
    }
    return {
      schemaVersion:DRIVER_ARRAY_SCHEMA_VERSION,mode,
      requestedRotationDeg,solvedRotationDeg:best.rotationDeg,
      periodDeg,candidateCount:candidates.length,
      minimumGapM:best.minimumGap,wantedGapM:wantedGap,
      legalGap:best.legalGap,
      seamOwnershipValid:best.seamOwnershipValid,
      alignedCount:best.alignedCount,
      seamPresetRotationDeg,seamPresetMinimumGapM,
      classifications:best.classifications,
      phis:best.phis
    };
  }

  function radialBearingFaceDiagnostic(P,phis,station,reach,outerR,flangeT,
      wall,gap,minWeb,requiredClearance,sampleCount){
    /* A centreline/projection check cannot prove that an oblique horn clears
       a circular radial-driver land: the disc spans horn x, so its mouth-side
       arc can still be swallowed by the expanding flare. Probe the nominal
       horn-side flange plane against the same conformal boundedJoint used by
       cellBody(). One millimetre inside the bearing flange avoids evaluating
       its coincident end cap while retaining the most restrictive real
       section of the land. */
    const samples=Math.max(24,sampleCount|0||180),
      edgeInset=Math.max(0.0005,Math.min(0.001,minWeb*0.25)),
      probeRadius=Math.max(0.001,outerR-edgeInset),
      hornSideInset=Math.min(0.001,Math.max(0.00025,flangeT*0.20)),
      probeOffset=reach-flangeT+hornSideInset;
    let minimum=Infinity,clear=0,total=0;
    for(const phi of phis){
      const datum=driverMountDatum(P.S||{},P.st,station,phi,
          null,null,'radial'),
        tf=tangentFrame(datum.mountN),
        center=add(datum.surface,mul(datum.mountN,probeOffset));
      for(let i=0;i<samples;i++){
        const a=i*2*Math.PI/samples,
          point=add(center,add(
            mul(tf.u,Math.cos(a)*probeRadius),
            mul(tf.v,Math.sin(a)*probeRadius))),
          boundedJoint=Math.max(
            sdCross(P,point[0],point[1],point[2],wall+gap),
            -point[0],point[0]-P.st.depth);
        minimum=Math.min(minimum,boundedJoint);
        if(boundedJoint>=0)clear++;
        total++;
      }
    }
    return {
      clearance:Number.isFinite(minimum)?minimum:-1,
      coverage:total?clear/total:0,
      requiredClearance,
      probeRadius,
      probeOffset
    };
  }

  function panelBlindPocketDepth(frame,cellT,cellSkin,panelSkin){
    /* Keep the design-law probe and the exact subtraction on one datum.
       Panel fasteners enter from the driver side, but their blind acoustic
       cap remains a fixed distance from the horn surface when a rear boss is
       lengthened.  Measuring only from the moving driver face can therefore
       certify a long boss while the real pocket base is still inside air. */
    const cap=Math.max(0.0032,cellSkin||panelSkin||0.0032);
    return Math.max(frame.boltD*0.65,cellT-cap);
  }
  function localPrintedFastenerPocketDepth(frame,flangeT){
    /* A detachable printed cartridge owns a local blind insert/clearance
       pocket in its full-radius driver land. It is not a timber-style bore
       chased through the complete adapter taper. Keep this datum shared by
       the planning envelope and exact subtraction so the pocket cannot enter
       the narrowing root and sever a post-cutter crescent. */
    return Math.max(frame.boltD*0.65,
      Math.min(0.012,Math.max(0.006,flangeT*0.80)));
  }

  function mountBearingEnvelopeDiagnostic(P,phis,station,reach,fs,openingR,
      outerR,flangeT,wall,gap,minWeb,boltPhase,detachable,sampleCount,
      radialSampleCount,cellT,cellSkin,axialSampleCount){
    /* The exact solid intersects every driver-bearing land with the
       complement of the finite horn air volume.  A centre point or projected
       frame diameter cannot prove that this Boolean retains the complete
       annulus: on a curved profile, part of the nominal flange plane can bow
       back into horn air and be silently amputated.

       Probe the complete physical axial span rather than one moving plane.
       The bearing annulus is swept through the flange thickness.  Panel
       fastener lands are swept from the exact blind-pocket base through the
       driver face; critically, that base remains cellSkin from the acoustic
       surface when a rear boss grows.  Integrated cells are checked against
       bounded horn air; detachable cells are checked against the outer shell
       plus their gasket registration gap. */
    const angularSamples=Math.max(24,sampleCount|0||180),
      radialSamples=Math.max(2,radialSampleCount|0||5),
      axialSamples=Math.max(2,axialSampleCount|0||7),
      edgeInset=Math.max(0.00025,Math.min(0.00075,minWeb*0.12)),
      innerRadius=Math.min(
        Math.max(0.001,outerR-edgeInset),
        Math.max(0.001,openingR+minWeb)),
      outerRadius=Math.max(innerRadius,outerR-edgeInset),
      hornSideInset=Math.min(0.001,
        Math.max(0.00025,flangeT*0.20)),
      probeOffset=reach-flangeT+hornSideInset,
      requiredClearance=Math.max(0.0005,minWeb*0.20),
      pocketD=P.family==='panel'?fs.panelPocketD:fs.insertPocketD,
      boltLandR=pocketD/2+minWeb,
      panelBlindDepth=P.family==='panel'
        ?(detachable||
          (P.S&&P.S.driverMountMode==='extended-manifold')
          /* The extended printed cell owns a local blind insert pocket at
             its driver plate. It is not a timber tee-nut bore reaching back
             to the horn skin; making it span the complete stand-off defeats
             the extension and can reopen the acoustic wall. */
          ?localPrintedFastenerPocketDepth(fs,flangeT)
          :panelBlindPocketDepth(fs,cellT,cellSkin,cellSkin)):0,
      boltStartOffset=P.family==='panel'
        ?reach-panelBlindDepth:probeOffset,
      bearingStartOffset=P.family==='panel'&&!detachable
        ?Math.min(probeOffset,boltStartOffset):probeOffset,
      bearingEndOffset=Math.max(bearingStartOffset,reach-hornSideInset),
      boltEndOffset=P.family==='panel'
        ?Math.max(boltStartOffset,reach-hornSideInset):probeOffset,
      bearingAxialSamples=P.family==='panel'
        ?Math.max(2,Math.min(5,axialSamples)):1,
      boltAxialSamples=P.family==='panel'?axialSamples:1;
    let minimum=Infinity,clear=0,total=0;
    const topology=P.family==='panel'?panelTopologyAt(P.st,station):null;
    const samplePoint=(point)=>{
      const boundary=Math.max(
        sdCross(P,point[0],point[1],point[2],
          detachable?wall+gap:0),
        -point[0],point[0]-P.st.depth);
      minimum=Math.min(minimum,boundary);
      if(boundary>=requiredClearance-1e-12)clear++;
      total++;
    };
    for(const phi of phis){
      const datum=driverMountDatum(P.S||{},P.st,station,phi,
          topology,null,P.family),
        surface=datum.surface,mountN=datum.mountN,
        tf=tangentFrame(mountN);
      for(let h=0;h<bearingAxialSamples;h++){
        const axial=bearingAxialSamples===1?bearingStartOffset:
            lerp(bearingStartOffset,bearingEndOffset,
              h/(bearingAxialSamples-1)),
          center=add(surface,mul(mountN,axial));
        for(let j=0;j<radialSamples;j++){
          const r=radialSamples===1?outerRadius:
            lerp(innerRadius,outerRadius,j/(radialSamples-1));
          for(let i=0;i<angularSamples;i++){
            const a=i*2*Math.PI/angularSamples;
            samplePoint(add(center,add(
              mul(tf.u,Math.cos(a)*r),
              mul(tf.v,Math.sin(a)*r))));
          }
        }
      }
      /* Dense admission must include the exact integrated-plate gasket
         witness lattice.  A broad uniform frame sweep can step over a narrow
         re-entrant crescent on a curved horn (the NW10 mouth-45 case fell
         between 117.46 and 120.29 mm while the canonical witness was
         119.36 mm).  Use the same radii, plane inset and 144 angles as the
           post-field structural audit so Smart Adapt cannot certify a state
           that the canonical Boolean later amputates.  A 288-angle lattice
           is rotation-independent at 1.25° resolution and cannot step over
           the narrow crescent merely because two valid tangent bases differ
           by a fraction of the former 2.5° pitch. */
      if(P.family==='panel'&&!detachable&&angularSamples>=180){
        const gasketInset=Math.max(0.00035,
            Math.min(0.00075,minWeb*0.10)),
          plateOuterR=Math.max(fs.frameR,
            fs.bcd/2+fs.panelPocketD/2+minWeb),
          gasketInnerRadius=fs.activeR+0.002+gasketInset,
          gasketOuterRadius=Math.min(plateOuterR-gasketInset,
            fs.frameR-gasketInset),
          planeInset=Math.max(0.00035,
            Math.min(0.0008,flangeT*0.08)),
          center=add(surface,mul(mountN,reach-planeInset));
        if(gasketOuterRadius>gasketInnerRadius+0.001)
          for(let radialIndex=0;radialIndex<6;radialIndex++){
            const radius=lerp(gasketInnerRadius,gasketOuterRadius,
              radialIndex/5);
            for(let angleIndex=0;angleIndex<288;angleIndex++){
              const angle=angleIndex*2*Math.PI/288;
              samplePoint(add(center,add(
                mul(tf.u,Math.cos(angle)*radius),
                mul(tf.v,Math.sin(angle)*radius))));
            }
          }
      }
      const pitch=2*Math.PI/fs.boltN;
      for(let k=0;k<fs.boltN;k++){
        const phase=(boltPhase||0)+k*pitch,
          ringSamples=Math.max(16,Math.ceil(angularSamples/6));
        for(let h=0;h<boltAxialSamples;h++){
          const axial=boltAxialSamples===1?boltStartOffset:
              lerp(boltStartOffset,boltEndOffset,
                h/(boltAxialSamples-1)),
            center=add(surface,mul(mountN,axial)),
            boltCenter=add(center,add(
              mul(tf.u,Math.cos(phase)*fs.bcd/2),
              mul(tf.v,Math.sin(phase)*fs.bcd/2)));
          for(let i=0;i<ringSamples;i++){
            const a=i*2*Math.PI/ringSamples;
            samplePoint(add(boltCenter,add(
              mul(tf.u,Math.cos(a)*boltLandR),
              mul(tf.v,Math.sin(a)*boltLandR))));
          }
        }
      }
    }
    return {
      clearance:Number.isFinite(minimum)?minimum:-1,
      coverage:total?clear/total:0,
      requiredClearance,
      complete:Number.isFinite(minimum)&&
        minimum>=requiredClearance-1e-12&&clear===total,
      openingRadius:innerRadius,
      outerRadius,
      boltLandRadius:boltLandR,
      probeOffset,
      axialStartOffset:Math.min(bearingStartOffset,boltStartOffset),
      axialEndOffset:Math.max(bearingEndOffset,boltEndOffset),
      panelBlindDepth,
      bearingAxialSamples,
      boltAxialSamples,
      samples:total
    };
  }

  function radialChamberClearanceDiagnostic(P,phis,station,reach,chamberDepth,
      innerR,openingR,wall,requiredClearance,angularCount,axialCount){
    /* The radial front chamber is a physical frustum, not merely an acoustic
       number. Verify its complete swept boundary remains outside the exact
       outer horn shell; otherwise the -boundedOuter intersection in
       solidField() silently removes chamber volume. */
    const angularSamples=Math.max(24,angularCount|0||90),
      axialSamples=Math.max(2,axialCount|0||8);
    let minimum=Infinity,clear=0,total=0;
    for(const phi of phis){
      const datum=driverMountDatum(P.S||{},P.st,station,phi,
          null,null,'radial'),
        surface=datum.surface,mountN=datum.mountN,tf=tangentFrame(mountN);
      for(let j=0;j<=axialSamples;j++){
        const t=j/axialSamples,
          center=add(surface,mul(mountN,reach-chamberDepth+t*chamberDepth)),
          radius=lerp(innerR,openingR,t);
        for(let i=0;i<angularSamples;i++){
          const a=i*2*Math.PI/angularSamples,
            point=add(center,add(
              mul(tf.u,Math.cos(a)*radius),
              mul(tf.v,Math.sin(a)*radius))),
            boundedOuter=Math.max(
              sdCross(P,point[0],point[1],point[2],wall),
              -point[0],point[0]-P.st.depth);
          minimum=Math.min(minimum,boundedOuter);
          if(boundedOuter>=0)clear++;
          total++;
        }
      }
    }
    return {
      clearance:Number.isFinite(minimum)?minimum:-1,
      coverage:total?clear/total:0,
      requiredClearance
    };
  }

  function compressionFlangeRadius(S,throatR){
    return Math.max(throatR+0.028,
      (+S.cdFlangeD>0?+S.cdFlangeD/2000:0.075));
  }

  function driverBearingCdFlangeDiagnostic(drivers,flangeR,minimumWeb,
      angularCount){
    /* The woofer-fastener axes already have their own HF-flange keep-out.
       That does not prove the much larger bearing plate and compressible
       gasket are separate from the finite compression-driver flange.

       Sample the complete physical annulus through its constant-radius
       bearing thickness and gasket depth against the same finite CD cylinder
       used by the exact Boolean.  This is a 3-D ownership check: two parts may
       overlap in a perspective image while remaining safely separated in
       space, and the solver must report that real distance rather than infer
       a collision from screen projection. */
    const cdA=[-0.014,0,0],cdB=[0.006,0,0],
      requiredClearance=Math.max(0.004,minimumWeb||0),
      angularSamples=Math.max(36,angularCount|0||96),
      /* Smart Adapt calls this diagnostic for every bounded candidate. Its
         36-angle probe still includes both annulus radii and both physical
         depth limits, but uses a smaller interior grid; the committed plan
         retains the 8×4 dense grid used by reports and release QA. */
      radialSamples=angularSamples<=36?3:8,
      axialSamples=angularSamples<=36?2:4;
    let clearance=Infinity,clear=0,total=0,witness=null;
    for(const d of drivers){
      const n=unit(d.mountN),
        rawU=sub(d.flow,mul(n,dot(d.flow,n))),
        u=len(rawU)>1e-9?unit(rawU):tangentFrame(n).u,
        v0=unit(cross(n,u)),
        v=dot(v0,d.cross)<0?mul(v0,-1):v0,
        stations=d.cell&&d.cell.coneProfile&&
          d.cell.coneProfile.relief&&
          d.cell.coneProfile.relief.cavityStations,
        reliefOpening=Array.isArray(stations)&&stations.length
          ?Math.max(0,+stations[stations.length-1].radiusM||0):0,
        innerR=Math.min(d.outerR-1e-6,
          Math.max(reliefOpening,
            d.frame&&d.frame.activeR?d.frame.activeR+0.002:0)),
        rearDepth=Math.max(0.001,d.flangeT||0),
        gasketDepth=Math.max(0.0008,
          d.frame&&d.frame.gasketT||0.0016);
      for(let k=0;k<=axialSamples;k++){
        const axial=-rearDepth+
          (rearDepth+gasketDepth)*k/axialSamples,
          center=add(d.driverFace,mul(n,axial));
        for(let j=0;j<=radialSamples;j++){
          const radius=lerp(innerR,d.outerR,j/radialSamples);
          for(let i=0;i<angularSamples;i++){
            const angle=i*2*Math.PI/angularSamples,
              point=add(center,add(
                mul(u,Math.cos(angle)*radius),
                mul(v,Math.sin(angle)*radius))),
              distance=sdCylAxis(point,cdA,cdB,flangeR);
            if(distance<clearance){
              clearance=distance;
              witness={driverIndex:d.index,point,axial,radius,angle};
            }
            if(distance>=requiredClearance-1e-12)clear++;
            total++;
          }
        }
      }
    }
    return {
      basis:'full driver-bearing/gasket annulus vs finite CD flange cylinder',
      clearance:Number.isFinite(clearance)?clearance:-1,
      requiredClearance,
      coverage:total?clear/total:0,
      complete:total>0&&clear===total&&
        clearance>=requiredClearance-1e-12,
      samples:total,witness
    };
  }

  function panelBoltLayout(S,st,phis,station,reach,fs,panelT,panelSkin,
      flangeR,minimumWeb){
    if(!phis.length||!fs.boltN)return {phase:0,clearance:Infinity,required:minimumWeb};
    const cdA=[-0.014,0,0],cdB=[0.006,0,0],
      depth=Math.max(fs.boltD*0.65,panelT-panelSkin),
      rearAccess=Math.max(0.0015,fs.boltD*0.20),
      pitch=2*Math.PI/fs.boltN,
      phaseSteps=fs.frame==='round'?96:1;
    const topology=panelTopologyAt(st,station);
    let best={phase:fs.frame==='round'?pitch/2:0,clearance:-Infinity,
      required:minimumWeb};
    for(let j=0;j<phaseSteps;j++){
      const phase=phaseSteps===1?best.phase:j*pitch/phaseSteps;
      let clearance=Infinity;
      for(const phi of phis){
        const datum=driverMountDatum(S,st,station,phi,topology,
            null,'panel'),
          surface=datum.surface,mountN=datum.mountN,
          tf=tangentFrame(mountN),
          driverFace=add(surface,mul(mountN,reach));
        for(let k=0;k<fs.boltN;k++){
          const ph=phase+k*pitch,
            off=add(mul(tf.u,Math.cos(ph)*fs.bcd/2),
              mul(tf.v,Math.sin(ph)*fs.bcd/2)),
            base=add(driverFace,off),
            a=add(base,mul(mountN,-depth)),
            b=add(base,mul(mountN,rearAccess));
          /* Check the complete blind-pocket centreline against the finite
             compression-driver flange. A 2-D BCD/radius test is insufficient:
             an oblique panel bolt can pass radially inside the flange while
             remaining safely behind it in x. */
          for(let q=0;q<=16;q++){
            const p=add(a,mul(sub(b,a),q/16));
            clearance=Math.min(clearance,
              sdCylAxis(p,cdA,cdB,flangeR)-fs.panelPocketD/2);
          }
        }
      }
      if(clearance>best.clearance)best={phase,clearance,required:minimumWeb};
    }
    return best;
  }

  function finalPanelBoltLayout(P,drivers,fs,flangeR,minimumWeb,
      initialPhase){
    /* Differential path equalisation moves complete driver cells after the
       first panel-bolt solve.  Reusing the old phase can then let a deep blind
       bore from one cell cross a neighbouring driver's gasket, even though
       both circular frames still have positive projected clearance.

       Re-solve one common round-frame phase on the final bearing datums.  The
       fastener tools below use the same endpoints and radii as solidField().
       A candidate is legal only when every foreign bore clears every sampled
       point of every complete gasket annulus as well as the finite CD flange.
       The dense verification lattice matches the exact plate audit; the
       smaller first pass merely ranks the bounded phase candidates. */
    if(P.family!=='panel'||drivers.length<=2||!fs.boltN)
      return {
        phase:initialPhase||0,clearance:0,required:0,
        foreignGasketClearance:0,foreignGasketRequired:0,
        foreignGasketPass:true,verified:true
      };
    const pitch=2*Math.PI/fs.boltN,
      phaseSteps=fs.frame==='round'?96:1,
      cdA=[-0.014,0,0],cdB=[0.006,0,0],
      rearAccess=Math.max(0.0015,fs.boltD*0.20),
      foreignRequired=0.00020,
      gasketSpecs=drivers.map(d=>{
        const stations=d.cell&&d.cell.coneProfile&&
            d.cell.coneProfile.relief&&
            d.cell.coneProfile.relief.cavityStations,
          openingRadius=Array.isArray(stations)&&stations.length
            ?stations[stations.length-1].radiusM
            :fs.activeR+0.002,
          gasketInset=Math.max(0.00035,
            Math.min(0.00075,P.minWeb*0.10)),
          innerRadius=openingRadius+gasketInset,
          outerRadius=Math.min(d.outerR-gasketInset,
            fs.frameR-gasketInset),
          planeInset=Math.max(0.00035,
            Math.min(0.0008,d.flangeT*0.08)),
          center=add(d.driverFace,mul(d.mountN,-planeInset)),
          frame=orthogonalFrame(d.mountN,d.flow,d.cross);
        return {
          driverIndex:d.index,innerRadius,outerRadius,center,frame,
          active:outerRadius>innerRadius+0.001
        };
      }),
      boltRecords=phase=>drivers.flatMap(d=>{
        const depth=P.S.driverCellConstruction==='cartridge'||
            P.S.driverMountMode==='extended-manifold'
          ?localPrintedFastenerPocketDepth(fs,d.flangeT)
          :panelBlindPocketDepth(fs,d.cellT||d.panelT,
            d.cellSkin,d.panelSkin);
        return Array.from({length:fs.boltN},(_,boltIndex)=>{
          const angle=phase+boltIndex*pitch,
            off=add(mul(d.flow,Math.cos(angle)*fs.bcd/2),
              mul(d.cross,Math.sin(angle)*fs.bcd/2)),
            base=add(d.driverFace,off);
          return {
            driverIndex:d.index,boltIndex,
            a:add(base,mul(d.mountN,-depth)),
            b:add(base,mul(d.mountN,rearAccess)),
            r:fs.panelPocketD/2
          };
        });
      }),
      evaluate=(phase,dense)=>{
        const bolts=boltRecords(phase),
          angularSamples=dense?288:48,
          radialSamples=dense?6:3;
        let cdClearance=Infinity,foreignGasketClearance=Infinity,
          foreignWitness=null;
        for(const bolt of bolts){
          for(let index=0;index<=16;index++){
            const point=add(bolt.a,mul(sub(bolt.b,bolt.a),index/16));
            cdClearance=Math.min(cdClearance,
              sdCylAxis(point,cdA,cdB,flangeR)-bolt.r);
          }
          for(const gasket of gasketSpecs){
            if(!gasket.active||gasket.driverIndex===bolt.driverIndex)continue;
            for(let radialIndex=0;radialIndex<radialSamples;radialIndex++){
              const radius=lerp(gasket.innerRadius,gasket.outerRadius,
                radialSamples===1?0.5:radialIndex/(radialSamples-1));
              for(let angleIndex=0;angleIndex<angularSamples;angleIndex++){
                const angle=angleIndex*2*Math.PI/angularSamples,
                  point=add(gasket.center,add(
                    mul(gasket.frame.u,Math.cos(angle)*radius),
                    mul(gasket.frame.v,Math.sin(angle)*radius))),
                  clearance=pointSegmentDistance3(
                    point,bolt.a,bolt.b)-bolt.r;
                if(clearance<foreignGasketClearance){
                  foreignGasketClearance=clearance;
                  foreignWitness={
                    targetDriverIndex:gasket.driverIndex,
                    sourceDriverIndex:bolt.driverIndex,
                    sourceBoltIndex:bolt.boltIndex,
                    radialIndex,angleIndex,point
                  };
                }
              }
            }
          }
        }
        if(!Number.isFinite(foreignGasketClearance))
          foreignGasketClearance=Infinity;
        const cdMargin=cdClearance-minimumWeb,
          foreignMargin=foreignGasketClearance-foreignRequired,
          legal=cdMargin>=-1e-12&&foreignMargin>=-1e-12;
        return {
          phase,clearance:cdClearance,required:minimumWeb,
          foreignGasketClearance,foreignGasketRequired:foreignRequired,
          foreignGasketPass:foreignMargin>=-1e-12,
          cdPass:cdMargin>=-1e-12,
          margin:Math.min(cdMargin,foreignMargin),
          legal,foreignWitness,verified:dense
        };
      },
      candidates=[];
    for(let index=0;index<phaseSteps;index++){
      const phase=phaseSteps===1?(initialPhase||0):index*pitch/phaseSteps;
      candidates.push(evaluate(phase,false));
    }
    candidates.sort((a,b)=>
      (b.legal?1:0)-(a.legal?1:0)||
      b.margin-a.margin||
      a.phase-b.phase);
    let best=null;
    for(const candidate of candidates){
      const dense=evaluate(candidate.phase,true);
      if(!best||dense.margin>best.margin)best=dense;
      if(dense.legal){best=dense;break;}
    }
    return best||evaluate(initialPhase||0,true);
  }

  function orientedCircleLoop(center,normal,u0,v0,radius,count){
    const n=unit(normal),u=unit(sub(u0,mul(n,dot(u0,n))));
    let v=unit(sub(v0,add(mul(n,dot(v0,n)),mul(u,dot(v0,u)))));
    if(len(v)<1e-8)v=unit(cross(n,u));
    if(dot(cross(u,v),n)<0)v=mul(v,-1);
    return Array.from({length:Math.max(8,count|0||16)},(_,index)=>{
      const angle=index*2*Math.PI/Math.max(8,count|0||16);
      return add(center,add(mul(u,Math.cos(angle)*radius),
        mul(v,Math.sin(angle)*radius)));
    });
  }

  function cornerPlateMetadata(P,d){
    const placement=d.panelPlacement,
      inactive={schemaVersion:CORNER_PLATE_SCHEMA_VERSION,active:false,
        kind:null,wings:[],tapDatums:[],solidWitnesses:[],
        complete:true,multiSeamOverlap:false,overlappedSeamIds:[]};
    if(P.family!=='panel'||!P.panelTopology||
        !placement||placement.kind!=='corner')return inactive;
    const topology=P.panelTopology,
      seam=topology.seams.find(item=>item.id===placement.seamId);
    if(!seam)return {...inactive,complete:false};
    const plateRootR=driverCellRootRadius(P,d,P.shellT),
      rootRadius=Math.max(P.minWeb,plateRootR),
      anchorRadius=Math.max(P.minWeb*2,
        Math.min(rootRadius,(d.outerR-d.innerR)*0.62)),
      faceById=id=>topology.faces.find(face=>face.id===id),
      overlapped=new Set([seam.id]);
    for(const faceId of placement.faceIds){
      const face=faceById(faceId);
      if(!face)continue;
      for(const seamId of [
        'seam:'+face.index,
        'seam:'+((face.index+1)%topology.seams.length)
      ]) if(seamId!==seam.id&&
          rootRadius+P.minWeb>=face.edgeLength-1e-12)
        overlapped.add(seamId);
    }
    const multiSeamOverlap=overlapped.size>1,
      bisector=seam.bisectorNormal,
      seamDirection=seam.seamDirection,
      cornerV=unit(cross(bisector,seamDirection)),
      rootLift=Math.max(P.minWeb*0.55,P.shellT*0.45),
      anchorSeparation=Math.max(P.minWeb,
        Math.min(d.innerR*0.30,rootRadius*0.32)),
      loopCount=16,
      wings=placement.faceIds.map(faceId=>{
        const face=faceById(faceId);
        if(!face)return {faceId,complete:false};
        let toward=sub(face.normal,mul(bisector,dot(face.normal,bisector)));
        toward=len(toward)>1e-9?unit(toward):cornerV;
        const rootCenter=add(seam.point,mul(face.normal,rootLift)),
          anchorCenter=add(d.driverFace,mul(toward,anchorSeparation)),
          rootPoints=orientedCircleLoop(rootCenter,face.normal,
            face.longAxis,face.crossAxis,rootRadius,loopCount),
          anchorPoints=orientedCircleLoop(anchorCenter,bisector,
            seamDirection,cornerV,anchorRadius,loopCount),
          area=0.5*loopCount*rootRadius*rootRadius*
            Math.sin(2*Math.PI/loopCount),
          rootPatch={center:rootCenter,normal:face.normal,radius:rootRadius,
            points:rootPoints,area,minimumWeb:P.minWeb},
          bearingAnchor={center:anchorCenter,normal:bisector,
            radius:anchorRadius,points:anchorPoints};
        return {faceId,faceNormal:face.normal,rootPatch,bearingAnchor,
          rootRadius,anchorRadius,complete:true};
      }),
      boltCenters=Array.from({length:P.frame.boltN},(_,index)=>{
        const angle=(d.boltPhase||0)+index*2*Math.PI/P.frame.boltN;
        return add(d.driverFace,add(
          mul(seamDirection,Math.cos(angle)*P.frame.bcd/2),
          mul(cornerV,Math.sin(angle)*P.frame.bcd/2)));
      }),
      gasketOuterR=Math.max(P.frame.activeR+P.minWeb,
        Math.min(d.outerR-P.minWeb*0.20,P.frame.frameR)),
      gasketInnerR=Math.max(P.frame.activeR,
        gasketOuterR-Math.max(0.006,gasketOuterR*0.12)),
      /* A corner plate is geometrically complete when its own two roots and
         bearing annulus are complete. Overall finite-mouth containment remains
         the independent mount-envelope law below; conflating them caused legal
         arbitrary-dihedral plates to be labelled structurally incomplete. */
      bearingComplete=!multiSeamOverlap,
      bearing={center:d.driverFace,normal:bisector,
        innerR:d.innerR,outerR:d.outerR,
        gasketInnerR,gasketOuterR,boltCenters,
        coverage:bearingComplete?1:P.mountEnvelopeCoverage,
        complete:bearingComplete},
      tapDatums=d.ports.map(q=>{
        const rel=sub(q.center,d.surface),
          rawU=dot(rel,seamDirection),rawV=dot(rel,cornerV),
          rawRadius=Math.hypot(rawU,rawV),
          radial=rawRadius>1e-12
            ?unit(add(mul(seamDirection,rawU),mul(cornerV,rawV)))
            :[0,0,0],
          /* A racetrack's boundR is its long semi-axis, not its support in
             every direction.  The corner datum moves radially in the bearing
             plane while its long axis normally follows the seam.  Subtracting
             boundR here therefore invented a roughly 10 mm inward clamp in
             the six-W5 corner array and forced an avoidable elbow into every
             tap.  Test the actual aperture support along the move instead. */
          support=apertureProjectedSupport(q,radial),
          limit=Math.max(0,d.innerR-support-P.minWeb),
          scale=rawRadius>limit&&rawRadius>1e-12?limit/rawRadius:1;
        return {tapIndex:q.index,faceId:q.mountFaceId,
          flow:q.flow,cross:q.cross,
          chamberTarget:add(d.cavInner,add(
            mul(seamDirection,rawU*scale),mul(cornerV,rawV*scale)))};
      }),
      solidWitnesses=[];
    /* Witnesses are independent sample points on the retained bearing land.
       Move a witness only along the canonical mount normal until it is outside
       horn air; this keeps the audit deterministic at arbitrary dihedral angles. */
    for(let index=0;index<24;index++){
      const angle=index*2*Math.PI/24,
        radius=lerp(Math.max(d.innerR,P.frame.activeR),
          d.outerR,index%2?0.82:0.60);
      let point=add(d.driverFace,add(
        mul(seamDirection,Math.cos(angle)*radius),
        mul(cornerV,Math.sin(angle)*radius)));
      for(let guard=0;guard<160&&
          sdCross(P,point[0],point[1],point[2],0)<0;guard++)
        point=add(point,mul(bisector,0.001));
      solidWitnesses.push(point);
    }
    const airSideClearance=Math.min(...solidWitnesses.map(point=>
      sdCross(P,point[0],point[1],point[2],0))),
      complete=bearing.complete&&!multiSeamOverlap&&
        wings.length===2&&wings.every(wing=>wing.complete);
    return {schemaVersion:CORNER_PLATE_SCHEMA_VERSION,active:true,
      kind:'dihedral-corner-cell',
      seamDatum:seam.point,faceNormals:seam.faceNormals,
      dihedralRad:seam.dihedralRad,seamDirection,bisectorNormal:bisector,
      bearing,wings,tapDatums,solidWitnesses,airSideClearance,complete,
      multiSeamOverlap,
      overlappedSeamIds:[...overlapped].sort((a,b)=>
        String(a).localeCompare(String(b)))};
  }

  function populateCornerPlateMetadata(P){
    for(const driver of P.drivers)
      driver.cornerPlate=cornerPlateMetadata(P,driver);
    const active=P.drivers.map(driver=>driver.cornerPlate)
      .filter(plate=>plate&&plate.active);
    P.cornerPlateMultiSeamOverlap=
      active.some(plate=>plate.multiSeamOverlap);
    P.cornerPlateComplete=
      active.every(plate=>plate.complete)&&!P.cornerPlateMultiSeamOverlap;
    return P;
  }

  function twoWayPlan(S0,options){
    const S=migrate(S0), f=familyKey(S), A=TWO_ARCH[f], st=M.stations(S);
    const fs=frameSpec(S);
    /* The printed radial land only needs to cover the real driver frame,
       gasket and insert envelope. The previous unconditional +10 mm rim made
       neighbouring detachable petals overlap even when the driver frames
       themselves cleared. Keep the smallest manufacturable land and solve
       radial spacing against that actual envelope. */
    const radialLandR=Math.max(fs.frameR+0.002,
      fs.bcd/2+fs.insertPocketD/2+fs.insertWeb+0.001);
    const floor=Math.max(150,+S.cdFloor||300);
    const conePathD=2*fs.activeR/(S.npW>=2?2:1);
    const coneCeil=C/(2*Math.max(0.025,conePathD));
    const xo=clamp(+S.twoXO||A.defaults.twoXO,floor,Math.max(floor,coneCeil));
    const phaseMargin=S.phaseMargin||1.2;
    const phaseBound=C/(4*phaseMargin*xo);
    const targetCr=clamp(+S.tapCRW||A.defaults.tapCRW,1.5,20);
    const declaredTotalArea=(S.tapBasis!=='model'&&+S.tapAreaW>0)
      ?+S.tapAreaW*1e-4 : fs.sd/targetCr;
    const np=S.npW|0,port=portSection(S,declaredTotalArea,np),
      totalArea=port.area*np,cr=fs.sd/Math.max(1e-8,totalArea);
    const velocityRefHz=Math.max(20,+S.subXO||80);
    const conePeakVelocity=2*Math.PI*velocityRefHz*fs.xmax;
    const tapPeakVelocity=cr*conePeakVelocity;
    const tapMach=tapPeakVelocity/C;
    const tapMachLimit=TAP_MACH_LIMIT,tapMachWarn=TAP_MACH_WARN;
    const maxCrMach=tapMachLimit*C/Math.max(1e-9,conePeakVelocity);
    const wall=Math.max(0.004,+S.wallT||0.012);
    const minWeb=Math.max(0.0032,wall*0.30);
    const panelRootWeb=Math.max(minWeb,PRINTED_PANEL_ROOT_WEB);
    /* A detachable cone chamber needs more than the generic shell web at its
       horn-side root. A one-cell annulus can form microscopic isolated edge
       flecks where the circular chamber and curved horn joint are tangent.
       Compact frames use a half-shell collar so 5–8 radial petals retain
       usable angular roots; 7-inch-and-larger frames use a full-shell collar
       because their larger export envelope otherwise under-resolves that
       annulus. The packing solver below reserves this exact same envelope. */
    const adapterRootWeb=Math.max(minWeb,
      wall*(fs.od>=0.18?1:0.50));
    const hydR=Math.sqrt(totalArea/Math.PI);
    const passage=(S.tapBasis!=='model'&&+S.tapLptW>0)
      ?+S.tapLptW/1000 : wall+0.85*hydR;
    const lpTarget=1.35*xo;
    const vCalc=totalArea/(Math.pow(2*Math.PI*lpTarget/C,2)*Math.max(0.004,passage));
    const chamberV=(S.tapBasis!=='model'&&+S.tapVtcW>0)?+S.tapVtcW*1e-6:vCalc;
    const fLP=C/(2*Math.PI)*Math.sqrt(totalArea/(Math.max(1e-8,chamberV)*Math.max(0.004,passage)));
    /* A pair of coherent entries has its own transverse phase constraint,
       separate from the common axial tap-station bound. The chamber acoustic
       low-pass is the highest modeled frequency at which the pair materially
       contributes, unless crossover is higher. */
    const pairFrequency=Math.max(xo,fLP),pairLambda=C/pairFrequency,
      pairSpreadLimit=pairLambda/4,
      pairMode=np===2&&S.tapPairMode==='custom'?'custom':'auto',
      pairRequestedSpread=pairMode==='custom'&&Number.isFinite(+S.tapPairSpreadMm)
        ?+S.tapPairSpreadMm/1000:null,
      pairMatchTolerance=0.00025;
    const neckR=Math.max(port.sb+0.004,Math.sqrt(totalArea/Math.PI)),
      coneTipR=Math.max(neckR*0.55,fs.activeR*0.28,0.018);
    const coeff=Math.PI*(fs.activeR*fs.activeR+fs.activeR*neckR+neckR*neckR)/3;
    const acousticChamberDepth=clamp(
      chamberV/Math.max(1e-7,coeff),fs.xmax+0.006,0.14),
      driverCellBase=driverCellMetadata(
        S,fs,f,chamberV,acousticChamberDepth,coneTipR),
      chamberDepth=driverCellBase.frontChamber.designAxialDepthM;
    const flangeT=Math.max(0.008,+S.flangeTW/1000||0.010);
    const throatR=(+S.td||+S.throat||1.4)*IN/2;
    const cdFlangeR=compressionFlangeRadius(S,throatR);
    /* C² minimum-jerk morph length: the compression-driver exit is circular
       at x=0 and only becomes the selected horn section after this distance. */
    const throatMorphL=Math.min(st.depth*0.30,
      Math.max(0.038,Math.min(0.080,3*throatR)));
    let phis=[],arrayPlacement=null;
    const stationMax=Math.max(0.018,
      Math.min(phaseBound,Math.max(0.020,st.depth*0.86)));
    const openingExtent=port.boundR;
    const stationNear=Math.max(throatMorphL+0.006,throatR+openingExtent*0.82);
    /* The quarter-wave result is an upper bound, not a parking coordinate.
       Printed radial hubs use the nearest station after the round throat
       transition. Calculated panel horns use a conservative fraction of the
       bound; documented/measured stations remain locked. */
    let station=(S.tapBasis!=='model'&&+S.tapStationW>0)
      ?+S.tapStationW/1000
      :clamp(f==='radial'?stationNear:Math.max(stationNear,phaseBound*0.72),
        0.018,stationMax);
    if(S.tapBasis==='model'){
      const openArea=(S.nW|0)*totalArea;
      const areaAt=x=>{
        const d=M.dimsAt(st,x),nn=d.n===undefined?st.n:d.n;
        if(S.style!=='angular'||!M.panelVerts)return M.areaAt(st,x);
        const V=M.panelVerts(d.a,d.b,nn);let a=0;
        for(let i=0;i<V.length;i++){const p=V[i],q=V[(i+1)%V.length];a+=p[0]*q[1]-q[0]*p[1];}
        return Math.abs(a)/2;
      };
      for(let it=0;it<80&&openArea/Math.max(1e-8,areaAt(station))>0.48;it++)
        station=Math.min(stationMax,station+(stationMax-station)/18+0.0008);
    }
    /* In panel construction the sloped horn wall is the driver-bearing
       mounting plate. Passage length is an acoustic quantity and must never
       silently thicken that plate. Hinson and JMOD use 18 mm flare panels;
       calculated panel states use the selected wall thickness. */
    const cartridge=S.driverCellConstruction==='cartridge',
      panelT=wall,
      panelSkin=Math.max(0.006,panelT*0.50),
      cellSkin=Math.max(0.004,minWeb),
      profileGeometryActive=
        ((S.coneProfileMode==='parametric'||S.coneProfileMode==='measured')&&
          (+S.coneDepthMm||0)>0)||
        (+S.coneAxialClearanceMm||0)>0;
    const gasketGap=Math.max(0.0008,fs.gasketT*0.55);
    const moduleT=f==='panel'&&cartridge
      ?Math.max(0.010,chamberDepth+cellSkin)
      :Math.max(0.010,panelT);
    const requestedRadialReach=(Number.isFinite(+S.adapterReach)
      ?+S.adapterReach:TWO_ARCH.radial.defaults.adapterReach)/1000;
    let adapterReach=f==='radial'
      ?(S.adapterReachMode==='manual'
        ?Math.max(0.001,requestedRadialReach)
        :Math.max(wall+0.010,requestedRadialReach))
      :cartridge
        ?panelT+gasketGap+moduleT
        :Math.max(panelT,
          driverCellBase.frontChamber.requiredAxialDepthM+panelSkin)+
          panelRootWeb;
    const manifoldExtraReach=S.driverMountMode==='extended-manifold'
        ?S.driverMountExtraMm/1000:0;
    let manifoldMinimumReach=adapterReach;
    adapterReach+=manifoldExtraReach;
    {
      const wantedGap=Math.max(0.004,fs.gasketT*2),
        panelOuterR=Math.max(fs.frameR,
          fs.bcd/2+fs.panelPocketD/2+minWeb),
        provisionalInnerR=Math.max(neckR+0.010,
          fs.activeR*0.78),
        provisionalRootR=f==='panel'
          ?Math.min(panelOuterR-wall*0.50,
            Math.max(provisionalInnerR+panelRootWeb,
              panelOuterR*0.72))
          :radialLandR;
      arrayPlacement=solveDriverArrayPlacement(
        S,st,station,adapterReach,
        f==='radial'?2*radialLandR:fs.od,
        f,wantedGap,provisionalRootR,minWeb);
      phis=arrayPlacement.phis;
      S.driverArrayRotationDeg=arrayPlacement.solvedRotationDeg;
    }
    /* Packaging and phase are solved together.  First move the common tap
       station outward, but never beyond the quarter-wave limit.  Only then
       lengthen a radial spoke.  This keeps driver plates as short as possible
       and prevents count/driver dropdowns from producing overlapping frames. */
    if(phis.length>1){
      const wantedGap=Math.max(0.004,fs.gasketT*2);
      if(S.tapBasis==='model'&&f==='panel'){
        for(let it=0;it<100&&station<stationMax-1e-7&&
          minimumPairGap(st,phis,station,adapterReach,fs.od,f,S)<wantedGap;it++){
          const step=Math.max(0.001,(stationMax-station)/18);
          station=Math.min(stationMax,station+step);
        }
        /* A large/count-dense panel array can reach the acoustic station
           limit before its complete circular frames separate.  The shortest
           printable solution is then a small cone-normal stand-off, not an
           overlapping frame and not a silently larger acoustic station.
           Solve only the additional distance needed for the selected array;
           extended-manifold reach, when requested, remains an addition to
           this package floor. */
        const startingPanelGap=minimumPairGap(
          st,phis,station,adapterReach,fs.od,f,S);
        if(startingPanelGap<0){
          const startReach=adapterReach,reachCap=0.30,
            /* Face and seam cells can receive different straight-path
               equalization setbacks below. Reserve one millimetre so that
               the final, differentially moved frame datums still retain the
               declared 4 mm/gasket package clearance. */
            standOffGap=wantedGap+
              (S.driverMountMode==='shortest'&&phis.length>2?0.001:0),
            gapAt=reach=>minimumPairGap(
              st,phis,station,reach,fs.od,f,S);
          let lo=startReach,hi=startReach;
          while(hi<reachCap-1e-9&&gapAt(hi)<standOffGap){
            lo=hi;
            hi=Math.min(reachCap,hi+0.001);
          }
          if(gapAt(hi)>=standOffGap){
            for(let it=0;it<30;it++){
              const md=(lo+hi)/2;
              if(gapAt(md)<standOffGap)lo=md;else hi=md;
            }
            adapterReach=Math.min(reachCap,hi+0.00005);
          }else adapterReach=reachCap;
        }
      }
      const radialLandOD=2*radialLandR;
      if(f==='radial'&&S.adapterReachMode!=='manual'&&
          minimumPairGap(st,phis,station,adapterReach,radialLandOD,f,S)<wantedGap){
        /* Radial taps stay near the HF hub. More/larger drivers lengthen their
           equal radial petals instead of pushing the common acoustic station
           down the horn. The 300 mm ceiling is a packaging refusal boundary,
           not a default stand-off; the loop always stops at the first clear
           millimetre. */
        const maxReach=Math.min(0.30,Math.max(0.080,fs.od*1.34));
        for(let it=0;it<160&&adapterReach<maxReach-1e-7&&
          minimumPairGap(st,phis,station,adapterReach,radialLandOD,f,S)<wantedGap;it++)
          adapterReach=Math.min(maxReach,adapterReach+0.002);
      }
    }
    /* Round woofer frames may rotate on their bearing panels. Solve that
       rotational phase instead of aiming one BCD hole directly at the HF
       throat. Calculated layouts may then move the common acoustic station
       outward—never past the quarter-wave bound—until every blind pocket
       clears the finite CD flange by a printable web. Published and manual
       stations remain authoritative and are graded below rather than moved. */
    const panelBearingT=cartridge?moduleT:adapterReach,
      boltPanelSkin=cartridge?cellSkin:panelSkin,
      boltRequiredWeb=Math.max(minWeb,0.0032);
    let panelBolts=f==='panel'
      ?panelBoltLayout(S,st,phis,station,adapterReach,fs,panelBearingT,boltPanelSkin,
        cdFlangeR,boltRequiredWeb)
      /* Keep every solved-plan diagnostic finite. Radial modules do not use
         panel fasteners, so zero is the explicit not-applicable value rather
         than an Infinity sentinel that poisons serialization and QA. */
      :{phase:0,clearance:0,required:0};
    if(f==='panel'&&S.tapBasis==='model'&&
        panelBolts.clearance<panelBolts.required&&station<stationMax-1e-7){
      const atMax=panelBoltLayout(S,st,phis,stationMax,adapterReach,fs,panelBearingT,
        boltPanelSkin,cdFlangeR,boltRequiredWeb);
      if(atMax.clearance>=atMax.required){
        let lo=station,hi=stationMax;
        for(let it=0;it<42;it++){
          const md=(lo+hi)/2,
            q=panelBoltLayout(S,st,phis,md,adapterReach,fs,panelBearingT,
              boltPanelSkin,cdFlangeR,boltRequiredWeb);
          if(q.clearance<q.required)lo=md;else hi=md;
        }
        station=hi;
      }else station=stationMax;
      panelBolts=panelBoltLayout(S,st,phis,station,adapterReach,fs,panelBearingT,
        boltPanelSkin,cdFlangeR,boltRequiredWeb);
    }
    /* Separate radial adapters are petals, not intersecting round cones.
       Reserve enough angular room at the horn-side root for the complete tap
       envelope, chamber and minimum wall before the petals are generated.
       This moves a calculated build only as far down the horn as packaging
       requires; manual/published stations remain authoritative. */
    if(f==='radial'&&cartridge&&phis.length>1&&
        S.tapBasis==='model'){
      const maxPairOffset=Math.max(port.sb+0.004,
          fs.activeR-openingExtent-Math.max(0.003,wall*0.30)),
        pairOffset=np===2
          ?clamp(0.50*maxPairOffset,port.sb+0.004,maxPairOffset):0,
        innerNeed=Math.min(radialLandR-wall*1.35,Math.max(neckR+0.010,
          openingExtent+pairOffset+Math.max(0.004,wall*0.45),
          fs.activeR*0.78)),
        rootNeed=Math.min(radialLandR-wall*0.5,
          Math.max(innerNeed+adapterRootWeb,radialLandR*0.42)),
        halfSector=Math.PI/phis.length,
        seam=Math.max(gasketGap,0.0008),
        tanHalf=Math.max(0.12,Math.tan(halfSector)),
        rootAxisOffset=wall+gasketGap,
        chamberAxisOffset=wall+gasketGap-0.006,
        /* Two full retention bosses on adjacent cartridges must fit across
           the sector chord. The R7.4 boss already contains its 3.2 mm
           counterbore web; only the real gasket seam is added between
           independently printed boss envelopes. */
        retentionRadius=cartridge
          ?(2*CARTRIDGE_RETENTION.bossR+seam)/
            Math.max(1e-6,2*Math.sin(halfSector))
          :0,
        requiredRadius=Math.max(
          (rootNeed+seam/2+minWeb*0.15)/tanHalf-rootAxisOffset,
          (innerNeed+minWeb+seam/2+minWeb*0.15)/tanHalf-
            chamberAxisOffset,
          retentionRadius),
        radialRadiusAt=x=>Math.min(...phis.map(phi=>{
          const q=M.surfPt(st,x,phi);
          return Math.hypot(q[1],q[2]);
        }));
      if(radialRadiusAt(station)<requiredRadius){
        if(radialRadiusAt(stationMax)>=requiredRadius){
          let lo=station,hi=stationMax;
          for(let it=0;it<42;it++){
            const md=(lo+hi)/2;
            if(radialRadiusAt(md)<requiredRadius)lo=md;else hi=md;
          }
          station=hi;
        }else station=stationMax;
      }
    }
    const radialMaxPairOffset=Math.max(port.sb+0.004,
        fs.activeR-openingExtent-Math.max(0.003,wall*0.30)),
      radialPairOffset=np===2
        ?clamp(0.50*radialMaxPairOffset,port.sb+0.004,radialMaxPairOffset):0,
      radialInnerR=Math.min(radialLandR-wall*1.35,Math.max(neckR+0.010,
        openingExtent+radialPairOffset+Math.max(0.004,wall*0.45),
        fs.activeR*0.78)),
      radialFaceOpeningClearance=Math.max(0,Math.min(0.0015,
        fs.bcd/2-fs.insertPocketD/2-fs.insertWeb-fs.activeR)),
      radialOpeningR=fs.activeR+radialFaceOpeningClearance,
      radialChamberCoefficient=Math.PI*(
        radialInnerR*radialInnerR+
        radialInnerR*radialOpeningR+
        radialOpeningR*radialOpeningR)/3,
      radialAcousticChamberDepth=f==='radial'
        ?chamberV/Math.max(1e-9,radialChamberCoefficient):0,
      radialPhysicalChamberDepth=f==='radial'
        ?Math.max(radialAcousticChamberDepth,
          driverCellBase.frontChamber.requiredAxialDepthM):0,
      radialPhysicalChamberVolume=f==='radial'
        ?radialChamberCoefficient*radialPhysicalChamberDepth:0,
      radialRequiredFaceClearance=Math.max(0.0005,minWeb*0.20),
      radialRequiredChamberClearance=Math.max(0.00035,minWeb*0.12),
      radialProbePlan={S,st,throatMorphL,throatR};
    /* A radial driver face advances on its radial axis, while the horn wall
       can be steeply oblique to that axis.  Therefore adapterReach itself is
       not the acoustic-side clearance.  For AUTO mounts solve the exact
       projection needed to retain the selected wall cap; manual reaches stay
       authoritative and are refused below if they cannot satisfy the law. */
    if(f==='radial'&&S.adapterReachMode!=='manual'&&S.tapBasis==='model'){
      const requiredMountSide=Math.max(0.003,wall*0.75);
      const minProjection=Math.min(...phis.map(phi=>{
        const datum=driverMountDatum(S,st,station,phi,null,null,'radial');
        return Math.max(1e-4,dot(datum.mountN,datum.wallN));
      }));
      const projectedReach=requiredMountSide/minProjection+0.0005;
      const reachCap=Math.min(0.30,Math.max(0.080,fs.od*1.34));
      adapterReach=Math.min(reachCap,Math.max(adapterReach,projectedReach));
    }
    /* A declared cone profile is a geometric input, not report-only metadata.
       Auto radial cells grow until the complete moving envelope fits; panel
       cells already grew above by the retained acoustic-side skin. A manually
       locked radial reach stays authoritative and is graded below. Flat/0 mm
       mode retains zero-depth dimensions by definition. */
    if(f==='radial'&&profileGeometryActive&&S.adapterReachMode!=='manual'){
      const reachCap=Math.min(0.30,Math.max(0.080,fs.od*1.34)),
        requiredReach=wall+driverCellBase.frontChamber.requiredAxialDepthM;
      adapterReach=Math.min(reachCap,Math.max(adapterReach,requiredReach));
    }
    let radialFace={
        clearance:0,coverage:1,requiredClearance:radialRequiredFaceClearance,
        probeRadius:0,probeOffset:0
      },
      radialChamberClearance={
        clearance:0,coverage:1,
        requiredClearance:radialRequiredChamberClearance
    };
    if(f==='radial'){
      /* Frame separation uses the compact diameter-scaled spoke bound above,
         but a complete volume-derived chamber is not allowed to stop at that
         aesthetic/package target.  Continue the exact clearance search to the
         documented 300 mm hard boundary and keep the first passing reach.
         Otherwise a legal chamber can be refused a few millimetres beyond the
         compact frame target even though no count, phase or mouth law changes. */
      const reachCap=0.30,
        chamberFitReach=radialPhysicalChamberDepth+wall+
          (cartridge?gasketGap+cellSkin:cellSkin*0.5),
        /* Keep a finite search guard without hiding a full millimetre of
           avoidable manifold length. The dense fallback below already uses
           the same 0.25 mm manufacturing/numerical allowance. */
        solveGuard=0.00025,
        denseMetadata=!(options&&options.coarseRadialDiagnostics);
      if(S.adapterReachMode!=='manual')
        adapterReach=Math.min(reachCap,Math.max(adapterReach,chamberFitReach));
      const diagnosticsAt=(reach,dense)=>{
        const faceSamples=dense?180:54,
          chamberAngularSamples=dense?90:36,
          chamberAxialSamples=dense?8:4;
        const face=cartridge
            ?radialBearingFaceDiagnostic(radialProbePlan,phis,station,reach,
              radialLandR,flangeT,wall,gasketGap,minWeb,
              radialRequiredFaceClearance,faceSamples)
            :{
              clearance:0,coverage:1,
              requiredClearance:radialRequiredFaceClearance,
              probeRadius:radialLandR,probeOffset:reach
            },
          chamber=radialChamberClearanceDiagnostic(radialProbePlan,phis,
            station,reach,radialPhysicalChamberDepth,radialInnerR,
            radialOpeningR,wall,radialRequiredChamberClearance,
            chamberAngularSamples,chamberAxialSamples);
        return {face,chamber,pass:
          (!cartridge||face.clearance>=radialRequiredFaceClearance)&&
          chamber.clearance>=radialRequiredChamberClearance};
      };
      if(S.adapterReachMode!=='manual'){
        let coarse=diagnosticsAt(adapterReach,false);
        if(!coarse.pass&&adapterReach<reachCap-1e-9){
          const coarseAtCap=diagnosticsAt(reachCap,false);
          if(coarseAtCap.pass){
            let lo=adapterReach,hi=reachCap;
            for(let it=0;it<24;it++){
              const md=(lo+hi)/2;
              if(diagnosticsAt(md,false).pass)hi=md;else lo=md;
            }
            adapterReach=Math.min(reachCap,hi+solveGuard);
            coarse=diagnosticsAt(adapterReach,false);
          }else{
            adapterReach=reachCap;
            coarse=coarseAtCap;
          }
        }
        let q=denseMetadata?diagnosticsAt(adapterReach,true):coarse;
        /* Coarse monotonic solving is only a search accelerator. Published
           metadata always comes from the dense probes above. If their finer
           angular grid finds a missed arc, fall back to a bounded dense
           bisection rather than weakening the clearance law. */
        if(denseMetadata&&!q.pass&&adapterReach<reachCap-1e-9){
          const denseAtCap=diagnosticsAt(reachCap,true);
          if(denseAtCap.pass){
            let lo=adapterReach,hi=reachCap;
            for(let it=0;it<32;it++){
              const md=(lo+hi)/2;
              if(diagnosticsAt(md,true).pass)hi=md;else lo=md;
            }
            adapterReach=Math.min(reachCap,hi+0.00025);
            q=diagnosticsAt(adapterReach,true);
          }else{
            adapterReach=reachCap;
            q=denseAtCap;
          }
        }
        radialFace=q.face;
        radialChamberClearance=q.chamber;
      }else{
        const q=diagnosticsAt(adapterReach,denseMetadata);
        radialFace=q.face;
        radialChamberClearance=q.chamber;
      }
    }
    const panelTopology=f==='panel'?panelTopologyAt(st,station):null,
      denseMountEnvelope=!(options&&options.coarseRadialDiagnostics),
      mountOpeningR=f==='panel'?fs.activeR+0.002:radialOpeningR,
      mountOuterR=f==='panel'?fs.frameR+0.010:radialLandR,
      mountProbePlan={S,st,throatMorphL,throatR,family:f},
      mountEnvelopeInitial=mountBearingEnvelopeDiagnostic(
        mountProbePlan,phis,station,adapterReach,fs,mountOpeningR,
        mountOuterR,Math.min(flangeT,adapterReach),wall,gasketGap,minWeb,
        panelBolts.phase,cartridge,
        /* A curved horn can leave a narrow re-entrant air crescent between
           the inner and outer annulus probes. Five radii missed the real
           mouth-45 NW10 gasket intrusion even at 180 angular samples. */
        denseMountEnvelope?180:54,denseMountEnvelope?13:5,
        panelBearingT,boltPanelSkin,
        denseMountEnvelope?7:4);
    let mountEnvelope=mountEnvelopeInitial;
    const stationsAtPhi=phis.map(phi=>{
      const datum=driverMountDatum(S,st,station,phi,panelTopology,
        null,f);
      return {phi,surface:datum.surface,wallN:datum.wallN,
        mountN:datum.mountN,panelPlacement:datum.placement,
        radialN:datum.radialN,axisBlend:datum.solvedBlend,
        axisToCdDeg:datum.axisToCdDeg};
    });
    /* Convert the local cone-centred offset into the real two-centroid spread
       on the horn surface. The mapping is deliberately solved on the surface:
       neither 2*offset nor a screen-space distance is authoritative once a
       pair approaches a facet boundary or curved radial wall. */
    const pointAtPairOffset=(phi,surface,sign,offset)=>{
      if(!(offset>0))return {phi,center:surface};
      let lo=0,hi=Math.PI*0.48;
      const surfaceAt=angle=>f==='panel'
        ?panelSurfacePoint(st,station,angle):M.surfPt(st,station,angle),
        far=surfaceAt(phi+sign*hi);
      if(len(sub(far,surface))<=offset)return {phi:phi+sign*hi,center:far};
      for(let it=0;it<42;it++){
        const md=(lo+hi)/2,q=surfaceAt(phi+sign*md);
        if(len(sub(q,surface))<offset)lo=md;else hi=md;
      }
      const delta=(lo+hi)/2,pp=phi+sign*delta;
      return {phi:pp,center:surfaceAt(pp)};
    };
    const pairAtOffset=(phi,surface,offset)=>{
      const a=pointAtPairOffset(phi,surface,-1,offset),
        b=pointAtPairOffset(phi,surface,1,offset);
      return {points:[a,b],spread:len(sub(b.center,a.center))};
    };
    const offsetForSpread=(phi,surface,target,maxOffset)=>{
      const atMax=pairAtOffset(phi,surface,maxOffset);
      if(!(target>0))return {offset:0,placement:pairAtOffset(phi,surface,0),
        available:atMax.spread};
      if(target>=atMax.spread)return {offset:maxOffset,placement:atMax,
        available:atMax.spread};
      let lo=0,hi=maxOffset;
      for(let it=0;it<46;it++){
        const md=(lo+hi)/2,q=pairAtOffset(phi,surface,md);
        if(q.spread<target)lo=md;else hi=md;
      }
      const offset=(lo+hi)/2;
      return {offset,placement:pairAtOffset(phi,surface,offset),
        available:atMax.spread};
    };
    const canonicalPortFrame=(exit,pp,panelPlacement)=>{
      const face=f==='panel'
          ?topologyFaceForPoint(panelTopology,exit,
            panelPlacement&&panelPlacement.faceIds):null,
        en=face?face.normal:unit(M.surfN(st,station,pp)),
        ef=tangentFrame(en),
        frontRay=unit([0,exit[1],exit[2]]),
        projected=sub(frontRay,mul(en,dot(frontRay,en))),
        flow=f==='panel'
          ?(panelTopology&&panelPlacement.kind==='corner'
            ?panelPlacement.basis.u
            :(face?face.longAxis
              :(len(projected)>1e-7?unit(projected):ef.u)))
          :ef.u;
      return {face,en,flow,cross:unit(cross(en,flow))};
    };
    const drivers=[];
    for(let i=0;i<phis.length;i++){
      const {phi,surface,wallN,mountN,panelPlacement,
        radialN,axisBlend,axisToCdDeg}=stationsAtPhi[i];
      const tf=panelPlacement
        ?{u:panelPlacement.basis.u,v:panelPlacement.basis.v}
        :tangentFrame(mountN);
      let maxPairOffset=f==='radial'?radialMaxPairOffset:
        Math.max(port.sb+0.004,
          fs.activeR-openingExtent-Math.max(0.003,wall*0.30));
      if(f==='panel'&&np===2){
        /* Solve the real transformed aperture outline under the cone.  A
           racetrack's global boundR is its long semi-axis; subtracting that
           scalar from every centre direction falsely pulls a tangential slot
           toward the cone centre.  The same shortcut reduced the JMOD target
           from roughly 95 mm to 85.7 mm and made the quarter-wave branch look
           bypassed. */
        const outline=apertureOutline(port,96),
          activeLimit=fs.activeR-0.002,
          fits=offset=>{
            const placement=pairAtOffset(phi,surface,offset);
            return placement.points.every(placed=>{
              const frame=canonicalPortFrame(placed.center,placed.phi,
                panelPlacement);
              return outline.every(([u,v])=>
                len(sub(add(placed.center,add(
                  mul(frame.flow,u),mul(frame.cross,v))),surface))<=
                    activeLimit+1e-10);
            });
          };
        let lo=0,hi=Math.max(0,fs.activeR);
        if(fits(0)){
          for(let iteration=0;iteration<44;iteration++){
            const mid=(lo+hi)/2;
            if(fits(mid))lo=mid;else hi=mid;
          }
          maxPairOffset=Math.max(port.sb+0.004,lo);
        }
      }
      /* Two panel entries are deliberately edge-biased toward the adjacent
         panel intersections, as in the known box/panel builds.  They are not
         decorative holes at the cone centre; the complete slot envelope still
         has to remain under the active cone. */
      const targetPairOffset=np===2
          ?(f==='radial'?radialPairOffset:
            clamp(0.92*maxPairOffset,port.sb+0.004,maxPairOffset)):0,
        targetPairPlacement=np===2
          ?pairAtOffset(phi,surface,targetPairOffset):null;
      let pairOffset=targetPairOffset,pairPlacement=targetPairPlacement,
        pairLimitCode=f==='panel'?'AUTO_CORNER_TARGET':'AUTO_PACKAGE_TARGET',
        coneNormalPairClamp=null;
      if(np===2&&pairMode==='custom'){
        const solved=offsetForSpread(phi,surface,
          Math.max(0,pairRequestedSpread||0),maxPairOffset);
        pairOffset=solved.offset;pairPlacement=solved.placement;
        pairLimitCode=pairRequestedSpread>solved.available+pairMatchTolerance
          ?'TAP_PAIR_SPREAD_GEOMETRY':'CUSTOM_REQUEST';
      }else if(np===2&&targetPairPlacement.spread>pairSpreadLimit){
        const solved=offsetForSpread(phi,surface,pairSpreadLimit,targetPairOffset);
        pairOffset=solved.offset;pairPlacement=solved.placement;
        pairLimitCode='TAP_PAIR_SPREAD_WAVELENGTH';
      }
      /* A shortest panel passage is one mount-normal prism.  Its two entries
         may meet different wall stations on a curved/squircle horn, so their
         mount-normal distances to the common cone chamber can differ.  The
         chamber overlap range is the only honest equalization authority:
         moving an endpoint beyond it either misses the cone relief or crosses
         the driver-bearing datum.  If a pair's axial station difference would
         consume that complete range, move both entries inward symmetrically
         by the smallest deterministic amount that retains a 20 um
         manufacturing/equality guard.  This is a real aperture-placement
         change, not a widened numerical tolerance or hidden path meander. */
      if(np===2&&pairMode==='auto'&&f==='panel'&&
          S.driverMountMode==='shortest'){
        const pairReliefDepth=cartridge
            ?chamberDepth
            :Math.max(0,
              Math.min(adapterReach-panelSkin,
                driverCellBase.frontChamber.requiredAxialDepthM)),
          minimumOverlapM=Math.max(0.0025,
            Math.min(0.006,port.sb*0.50)),
          bearingClearanceM=Math.max(0.002,
            Math.min(0.004,(fs.gasketT||0.0016)+0.0004)),
          requestedOverlapM=Math.max(0.012,
            Math.min(0.024,wall*1.10+port.sb*0.20)),
          maximumOverlapM=Math.max(minimumOverlapM,
            Math.min(requestedOverlapM,
              pairReliefDepth-bearingClearanceM)),
          overlapAuthorityM=Math.max(0,
            maximumOverlapM-minimumOverlapM),
          equalityGuardM=0.000020,
          permittedAxialMismatchM=Math.max(0,
            overlapAuthorityM-equalityGuardM),
          axialMismatch=placement=>Math.abs(dot(sub(
            placement.points[1].center,
            placement.points[0].center),mountN)),
          requestedAxialMismatchM=axialMismatch(pairPlacement),
          requestedOffsetM=pairOffset;
        if(requestedAxialMismatchM>
            permittedAxialMismatchM+1e-12){
          let lo=0,hi=pairOffset;
          for(let iteration=0;iteration<52;iteration++){
            const mid=(lo+hi)/2,
              placement=pairAtOffset(phi,surface,mid);
            if(axialMismatch(placement)<=permittedAxialMismatchM)
              lo=mid;
            else hi=mid;
          }
          pairOffset=(lo+hi)/2;
          pairPlacement=pairAtOffset(phi,surface,pairOffset);
          pairLimitCode='TAP_PAIR_EQUALIZATION_GUARD';
        }
        coneNormalPairClamp={
          schemaVersion:1,active:pairOffset<requestedOffsetM-1e-12,
          basis:'mount-normal chamber-overlap authority minus explicit 20 um guard',
          requestedOffsetM,solvedOffsetM:pairOffset,
          inwardAdjustmentPerEntryM:requestedOffsetM-pairOffset,
          requestedAxialMismatchM,
          solvedAxialMismatchM:axialMismatch(pairPlacement),
          minimumOverlapM,maximumOverlapM,overlapAuthorityM,
          equalityGuardM,permittedAxialMismatchM,
          pass:axialMismatch(pairPlacement)<=
            permittedAxialMismatchM+1e-12
        };
      }
      const ports=[];
      for(let k=0;k<np;k++){
        const placed=np===2?pairPlacement.points[k]:{phi,center:surface},
          pp=placed.phi,exit=placed.center,
          frame=canonicalPortFrame(exit,pp,panelPlacement),
          face=frame.face,en=frame.en,
          slotFlow=frame.flow,slotCross=frame.cross;
        /* Every aperture on one flat panel consumes that panel's single
           deterministic long axis. A seam-owned driver instead follows its
           seam while each aperture still records the actual face it cuts.
           Smooth horns retain their projected throat-to-quadrant ray. */
        ports.push({index:k,phi:pp,center:exit,normal:en,flow:slotFlow,cross:slotCross,
          mountFaceId:face?face.id:null,
          faceGroupId:panelTopology&&panelPlacement
            ?panelPlacement.groupId:null,
          sa:port.sa,sb:port.sb,shape:port.shape,area:port.area,core:port.core,
          boundR:port.boundR,aspect:port.aspect,source:port.source});
      }
      /* A smooth flare has no planar face whose long axis can own a pair of
         apertures.  Projecting the throat ray independently at each aperture
         made the two slots visibly fan apart (and could flip the selected
         tangent branch on a vertical driver).  The intersection of the two
         aperture tangent planes is the unique undirected axis tangent to both
         local wall normals.  Stabilize its sign against the driver's
         continuous throat-to-station meridian, then assign that one canonical
         axis to both apertures.  Thus the printed pair is genuinely parallel,
         while opposed drivers still mirror by construction. */
      if(f==='panel'&&!panelTopology&&ports.length===2){
        const radial=unit([0,surface[1],surface[2]]),
          meridianProjection=sub(radial,mul(mountN,dot(radial,mountN))),
          meridian=len(meridianProjection)>1e-8
            ?unit(meridianProjection):tf.u,
          intersection=cross(ports[0].normal,ports[1].normal);
        let sharedFlow=len(intersection)>1e-8?unit(intersection):meridian;
        if(dot(sharedFlow,meridian)<0)sharedFlow=mul(sharedFlow,-1);
        for(const q of ports){
          q.flow=sharedFlow;
          q.cross=unit(cross(q.normal,sharedFlow));
        }
      }
      const inner=add(surface,mul(wallN,wall*0.15)),
        cartridgeStart=add(surface,mul(mountN,panelT+gasketGap)),
        driverFace=add(surface,mul(mountN,adapterReach)),
        outerR=f==='radial'?radialLandR:
          Math.max(fs.frameR,
            fs.bcd/2+fs.panelPocketD/2+minWeb),
        /* Enclose the complete pair of apertures plus a printable radial web.
           The old activeR*.72 cap could put a 154 mm slot outside a 93 mm
           chamber, so the cutters chopped the mount into disconnected
           islands. */
        innerR=f==='radial'?radialInnerR:
          Math.min(outerR-wall*1.35,Math.max(neckR+0.010,
            openingExtent+(np===2?pairOffset:0)+Math.max(0.004,wall*0.45),
            fs.activeR*0.78));
      /* Panel drivers seal directly to the rear face of the sloped flare
         panel. Its reverse side is relieved toward the cone while retaining a
         printable inner skin. Printed radial modules instead start their
         chamber just outside the horn wall. */
      /* Keep at least half of an 18 mm timber flare behind the reverse
         relief. Besides being a realistic machining floor, this preserves a
         robust structural bridge around the long paired slots at export
         resolution instead of leaving a paper-thin, disconnected membrane. */
      const reliefDepth=cartridge&&f==='panel'
        ?chamberDepth
        :f==='radial'
          ?radialPhysicalChamberDepth
        :Math.max(0,
          Math.min(adapterReach-panelSkin,
            driverCellBase.frontChamber.requiredAxialDepthM));
      const cavInner=f==='panel'
        ?add(driverFace,mul(mountN,-reliefDepth))
        /* The generated radial frustum owns the declared acoustic volume.
           Anchor its inner plane from the driver face—not from the changing
           horn wall—so a longer automatic petal cannot silently inflate the
           chamber and a short manual petal cannot silently collapse it. */
        :add(driverFace,mul(mountN,-radialPhysicalChamberDepth));
      const geometricSpan=Math.max(0,dot(sub(driverFace,cavInner),mountN)),
        generatedRelief=coneReliefProfile({
          mode:driverCellBase.coneProfile.mode,
          activeRadius:fs.activeR,
          coneTipRadius:coneTipR,
          depth:driverCellBase.coneProfile.effectiveDepthM,
          xmax:fs.xmax,
          axialClearance:driverCellBase.clearance.axialM,
          radialClearance:driverCellBase.clearance.radialM,
          generatedSpan:geometricSpan
        }),
        cell={
          schemaVersion:driverCellBase.schemaVersion,
          construction:driverCellBase.construction,
          interfaceKind:driverCellBase.interfaceKind,
          coneProfile:{...driverCellBase.coneProfile,relief:generatedRelief},
          clearance:{...driverCellBase.clearance},
          movingEnvelope:{...driverCellBase.movingEnvelope},
          frontChamber:{
            ...driverCellBase.frontChamber,
            geometricSpanM:geometricSpan,geometricSpanMm:geometricSpan*1000,
            generatedAcousticVolumeM3:f==='radial'
              ?radialPhysicalChamberVolume:chamberV,
            generatedAcousticVolumeCm3:(f==='radial'
              ?radialPhysicalChamberVolume:chamberV)*1e6,
            geometricSpanMarginM:
              geometricSpan-driverCellBase.frontChamber.requiredAxialDepthM,
            geometricSpanMarginMm:
              (geometricSpan-driverCellBase.frontChamber.requiredAxialDepthM)*1000,
            reliefCavityEnvelopeVolumeM3:
              generatedRelief.cavityEnvelopeVolumeM3,
            reliefCavityEnvelopeVolumeCm3:
              generatedRelief.cavityEnvelopeVolumeM3*1e6
          }
        };
      drivers.push({index:i,phi,surface,normal:mountN,mountN,wallN,
        /* Driver bearing/BCD coordinates remain in the centre mounting plane.
           The shared tap axis above is tangent to both off-centre aperture
           normals, but need not be tangent to the centre normal on a strongly
           curved flare; using it as the frame basis would skew a circular
           gasket and bolt pattern. */
        flow:tf.u,cross:tf.v,ports,panelPlacement,
        radialN,axisBlend,axisToCdDeg,
        cornerPlate:{schemaVersion:CORNER_PLATE_SCHEMA_VERSION,active:false,
          kind:null,wings:[],tapDatums:[],complete:true,
          multiSeamOverlap:false,overlappedSeamIds:[]},
        inner,driverFace,cavInner,adapterReach,outerR,innerR,flangeT,
        cartridgeStart,
        panelT,cellT:f==='panel'?(cartridge?moduleT:adapterReach):moduleT,
        moduleT,gasketGap,pairOffset,maxPairOffset,
        coneNormalPairClamp,
        pairTargetOffset:targetPairOffset,
        pairSpread:np===2?pairPlacement.spread:0,
        pairTargetSpread:np===2?targetPairPlacement.spread:0,
        pairLimitCode,panelSkin,
        cellSkin:cartridge?cellSkin:panelSkin,reliefDepth,coneTipR,
        boltPhase:panelBolts.phase,
        mountKind:cartridge?f+'-cartridge':
          (f==='radial'?'radial-direct':'panel-direct'),
        chamberDepth:f==='radial'?radialPhysicalChamberDepth:chamberDepth,
        chamberV,frame:fs,cell});
    }
    /* A common requested reach is the minimum setback, not permission to
       make the shorter face-cell passages meander or to extend their cutters
       through a woofer.  Build the same face/seam chamber datums consumed by
       the exact cutter, then move only the bearing/chamber pair of cells whose
       shortest legal interval cannot meet the global shortest target.  The
       driver-specific move preserves chamber depth and cone clearance. */
    const differentialProbe={
      S,st,family:f,panelTopology,shellT:panelT,
      panelRootWeb,minWeb,adapterRootWeb,frame:fs,
      throatMorphL,mountEnvelopeCoverage:1,
      mountEnvelopeClearance:0,retention:null
    };
    for(const driver of drivers)
      driver.cornerPlate=cornerPlateMetadata(differentialProbe,driver);
    solvePanelPairChamberScales(differentialProbe,drivers);
    const differentialSetback=solvePanelDifferentialSetbacks(
      differentialProbe,drivers,adapterReach,manifoldExtraReach);
    if(f==='panel'&&differentialSetback.active){
      panelBolts=finalPanelBoltLayout(
        differentialProbe,drivers,fs,cdFlangeR,boltRequiredWeb,
        panelBolts.phase);
      for(const driver of drivers)driver.boltPhase=panelBolts.phase;
      /* Refresh the phase-sensitive mount-envelope metadata after the final
         common fastener rotation. The per-cell path setback is audited on the
         exact field below; this probe retains its original station/reach
         ownership while no longer reporting the discarded preliminary bolt
         orientation. */
      mountEnvelope=mountBearingEnvelopeDiagnostic(
        mountProbePlan,phis,station,adapterReach,fs,mountOpeningR,
        mountOuterR,Math.min(flangeT,adapterReach),wall,gasketGap,minWeb,
        panelBolts.phase,cartridge,
        denseMountEnvelope?180:54,denseMountEnvelope?13:5,
        panelBearingT,boltPanelSkin,
        denseMountEnvelope?7:4);
    }
    const driverCdFlange=driverBearingCdFlangeDiagnostic(
      drivers,cdFlangeR,minWeb,
      options&&options.coarseRadialDiagnostics?36:96);
    const allPorts=drivers.flatMap(d=>d.ports);
    let pairSolvedSpread=0,pairMinimumSpread=np===2?Infinity:0,
      pairCoveragePathH=0,pairCoveragePathV=0;
    if(np===2){
      const h=(+S.covH||90)*Math.PI/360,
        v=(+S.covV||60)*Math.PI/360,
        raysH=[[Math.cos(h),Math.sin(h),0],[Math.cos(h),-Math.sin(h),0]],
        raysV=[[Math.cos(v),0,Math.sin(v)],[Math.cos(v),0,-Math.sin(v)]];
      for(const d of drivers){
        const delta=sub(d.ports[1].center,d.ports[0].center),
          spread=len(delta);
        pairSolvedSpread=Math.max(pairSolvedSpread,spread);
        pairMinimumSpread=Math.min(pairMinimumSpread,spread);
        for(const ray of raysH)
          pairCoveragePathH=Math.max(pairCoveragePathH,Math.abs(dot(delta,ray)));
        for(const ray of raysV)
          pairCoveragePathV=Math.max(pairCoveragePathV,Math.abs(dot(delta,ray)));
      }
    }
    const pairTargetSpread=np===2
        ?Math.max(...drivers.map(d=>d.pairTargetSpread)):0,
      pairWavelengthRatio=np===2?pairSolvedSpread/pairLambda:0,
      pairCoveragePhaseH=360*pairFrequency*pairCoveragePathH/C,
      pairCoveragePhaseV=360*pairFrequency*pairCoveragePathV/C,
      pairCoveragePath=Math.max(pairCoveragePathH,pairCoveragePathV),
      pairCoveragePhase=Math.max(pairCoveragePhaseH,pairCoveragePhaseV),
      pairRequestValid=pairMode!=='custom'||
        (Number.isFinite(pairRequestedSpread)&&pairRequestedSpread>0),
      pairRequestError=pairMode==='custom'&&pairRequestValid
        ?Math.max(...drivers.map(d=>Math.abs(d.pairSpread-pairRequestedSpread)))
        :pairMode==='custom'?Infinity:0,
      pairCustomHonored=pairMode!=='custom'||
        (pairRequestValid&&pairRequestError<=pairMatchTolerance);
    let maxSpread=0;
    for(let i=0;i<allPorts.length;i++)for(let j=i+1;j<allPorts.length;j++)
      maxSpread=Math.max(maxSpread,len(sub(allPorts[i].center,allPorts[j].center)));
    const localArea=crossArea({S,st,throatMorphL,throatR},station),
      tapFraction=(drivers.length*totalArea)/Math.max(1e-8,localArea);
    let pairWeb=np===2?Infinity:0;
    if(np===2) for(const d of drivers){
      const q0=d.ports[0],q1=d.ports[1],delta=sub(q1.center,q0.center),
        L=Math.max(1e-9,len(delta)),dir=mul(delta,1/L),back=mul(dir,-1),
        r0=apertureSupport(q0,dot(dir,q0.flow),dot(dir,q0.cross)),
        r1=apertureSupport(q1,dot(back,q1.flow),dot(back,q1.cross));
      pairWeb=Math.min(pairWeb,L-r0-r1);
    }
    /* boundR is the farthest real boundary point for every aperture family.
       It replaces the old bounding-box diagonal, which over-rejected circles
       and under-described a converted locked aperture. */
    const maxPortReach=Math.max(...drivers.flatMap(d=>d.ports.map(q=>
      Math.max(...apertureOutline(q,96).map(([u,v])=>
        len(sub(add(q.center,add(
          mul(q.flow,u),mul(q.cross,v))),d.surface)))))));
    let minDriverGap=Infinity;
    for(let i=0;i<drivers.length;i++)for(let j=i+1;j<drivers.length;j++)
      minDriverGap=Math.min(minDriverGap,orientedDiscGap(
        drivers[i].driverFace,drivers[i].mountN,
        drivers[j].driverFace,drivers[j].mountN,
        f==='radial'?Math.max(drivers[i].outerR,drivers[j].outerR):fs.frameR));
    const minMountSide=Math.min(...drivers.map(d=>dot(sub(d.driverFace,d.surface),d.wallN)));
    const boltOuterWeb=f==='panel'
        ?Math.min(...drivers.map(d=>
          d.outerR-fs.bcd/2-fs.panelPocketD/2))
        /* Radial cells have no separate circular panel edge; their complete
           bearing envelope is audited by radialFace/mountEnvelope instead.
           Keep the non-applicable panel-only measurement finite so every
           deterministic plan remains serializable and pairwise QA can reject
           real numeric faults rather than this former Infinity sentinel. */
        :0,
      boltOuterWebRequired=f==='panel'?minWeb:0,
      boltOuterWebPass=f!=='panel'||
        boltOuterWeb>=boltOuterWebRequired-1e-12;
    const tapEdgeBias=np===2
      ?Math.min(...drivers.map(d=>d.maxPairOffset>1e-9?d.pairOffset/d.maxPairOffset:0)):0;
    /* Station and pair-placement diagnostics are canonical plan data, not UI
       reconstructions.  Keep signed remaining margins so an authoritative
       manual/published station can explain why it is refused without being
       silently moved.  The paired-panel remainder is specifically the
       solver's local under-cone offset bound; it is not a measured physical
       distance to a panel seam. */
    const stationToThroatAxial=station,
      stationPhaseRatio=station/Math.max(1e-9,phaseBound),
      stationPhaseMarginRemaining=phaseBound-station,
      stationNullFrequency=C/(4*Math.max(0.001,station)),
      stationNullMarginRatio=
        stationNullFrequency/Math.max(1e-9,phaseMargin*xo)-1,
      pairedPanel=f==='panel'&&np===2,
      pairEdgeObjectiveOffset=pairedPanel
        ?Math.max(...drivers.map(d=>d.pairTargetOffset)):0,
      pairEdgeObjectiveRatio=pairedPanel
        ?Math.min(...drivers.map(d=>d.maxPairOffset>1e-9
          ?d.pairTargetOffset/d.maxPairOffset:0)):0,
      pairUnderConeOffsetRemaining=pairedPanel
        ?Math.min(...drivers.map(d=>d.maxPairOffset-d.pairOffset)):0;
    let pairLimitCode=np!==2?'NOT_APPLICABLE':
      drivers.some(d=>d.pairLimitCode==='TAP_PAIR_SPREAD_WAVELENGTH')
        ?'TAP_PAIR_SPREAD_WAVELENGTH':
      drivers.some(d=>d.pairLimitCode==='TAP_PAIR_SPREAD_GEOMETRY')
        ?'TAP_PAIR_SPREAD_GEOMETRY':
      f==='panel'?'AUTO_CORNER_TARGET':'AUTO_PACKAGE_TARGET';
    if(pairMode==='custom'){
      if(!pairRequestValid||!pairCustomHonored)
        pairLimitCode='TAP_PAIR_SPREAD_GEOMETRY';
      else if(pairSolvedSpread>pairSpreadLimit+pairMatchTolerance)
        pairLimitCode='TAP_PAIR_SPREAD_WAVELENGTH';
      else if(pairWeb<minWeb)
        pairLimitCode='TAP_PAIR_SPREAD_WEB';
      else if(maxPortReach>fs.activeR-0.002)
        pairLimitCode='TAP_PAIR_SPREAD_UNDER_CONE';
      else pairLimitCode='CUSTOM_REQUEST';
    }
    const pairLimitReason={
      NOT_APPLICABLE:'one entry per driver; pair spacing is not applicable',
      AUTO_CORNER_TARGET:'corner/seam target at 92% of the legal under-cone offset',
      AUTO_PACKAGE_TARGET:'radial package target',
      CUSTOM_REQUEST:'custom requested centre-to-centre spread',
      TAP_PAIR_SPREAD_WAVELENGTH:'quarter-wavelength limit at '+Math.round(pairFrequency)+' Hz',
      TAP_PAIR_SPREAD_GEOMETRY:'requested spread is outside the solvable under-cone geometry',
      TAP_PAIR_SPREAD_WEB:'requested spread violates the minimum aperture web',
      TAP_PAIR_SPREAD_UNDER_CONE:'requested spread leaves the active-cone envelope'
    }[pairLimitCode];
    /* A radial ring has a simple hard lower bound before any detailed CAD is
       attempted.  Adjacent complete frames need one frame diameter plus the
       gasket/manufacturing clearance as their chord.  This is intentionally a
       frame-envelope test (not a cone/Sd test): using Sd here is what allowed
       large drivers to overlap while the old solver still reported success. */
    const packageClearance=Math.max(0.004,fs.gasketT*2);
    const radialPitchR=f==='radial'&&drivers.length>1
      ?(2*radialLandR+packageClearance)/(2*Math.sin(Math.PI/drivers.length))
      :0;
    const radialPackageRequired=f==='radial'
      ?(drivers.length>1?2*(radialPitchR+radialLandR):2*radialLandR)
      :0;
    const radialPackageAvailable=S.mouthW*IN;
    const radialPackageCap=Math.max(S.mouthW,+S.mouthCap||S.mouthW)*IN;
    const panelCountScale=1.18+Math.max(0,S.nW-2)*0.235,
      packageMinMouthIn=f==='panel'
      ?Math.max(16,(fs.od/IN)*panelCountScale)
      :Math.max(14,(2*(fs.activeR+neckR+0.035))/IN,
        radialPackageRequired/IN),
      mountEnvelopeMinimumMouthIn=Number.isFinite(+S.mountEnvelopeMinMouthW)
        ?+S.mountEnvelopeMinMouthW
        :(mountEnvelope.complete?+S.mouthW:null),
      minMouthIn=Math.max(packageMinMouthIn,
        mountEnvelopeMinimumMouthIn||0);
    arrayPlacement={
      ...arrayPlacement,
      minimumGapM:minDriverGap,
      legalGap:minDriverGap>=Math.max(0.004,fs.gasketT*2)-1e-12,
      classifications:driverArrayClassifications(st,station,phis,f)
    };
    delete arrayPlacement.phis;
    manifoldMinimumReach=Math.max(0,
      adapterReach-manifoldExtraReach);
    const manifoldActualExtra=Math.max(0,
        adapterReach-manifoldMinimumReach),
      manifoldExtensionHonored=
        Math.abs(manifoldActualExtra-manifoldExtraReach)<=0.00025,
      outline=apertureOutline(port,64),
      portPerimeter=outline.reduce((sum,point,index)=>{
        const next=outline[(index+1)%outline.length];
        return sum+Math.hypot(next[0]-point[0],next[1]-point[1]);
      },0),
      hydraulicDiameter=4*port.area/Math.max(1e-9,portPerimeter),
      equivalentRadius=Math.sqrt(port.area/Math.PI),
      endCorrection=1.45*equivalentRadius,
      airDensity=1.204,
      estimatedCenterlineLength=passage+manifoldActualExtra,
      estimatedEffectiveLength=estimatedCenterlineLength+endCorrection,
      estimatedLowPass=C/(2*Math.PI)*Math.sqrt(
        totalArea/(Math.max(1e-9,chamberV)*
          Math.max(0.001,estimatedEffectiveLength))),
      estimatedDelay=estimatedEffectiveLength/C,
      estimatedPhase=360*xo*estimatedDelay,
      estimatedQuarterWave=C/(4*Math.max(0.001,
        estimatedEffectiveLength)),
      driverManifold={
        schemaVersion:DRIVER_MANIFOLD_SCHEMA_VERSION,
        mode:S.driverMountMode,
        requestedExtraM:manifoldExtraReach,
        minimumReachM:manifoldMinimumReach,
        extraReachM:manifoldActualExtra,
        totalReachM:adapterReach,
        maximumTotalReachM:differentialSetback.maximumSolvedReachM||
          adapterReach,
        differentialSetback,
        extensionHonored:manifoldExtensionHonored,
        requestedAxisBlend:S.driverAxisBlend,
        solvedAxisBlend:S.driverMountMode==='extended-manifold'
          ?S.driverAxisBlend:(f==='radial'?1:0),
        pathBasis:'plan estimate; exact swept centerline is attached to the solid field',
        driverCount:drivers.length,
        /* Before canonical cutters exist this is only a symmetric-layout
           expectation. H/V-asymmetric sections can still produce real path
           mismatch, so exact equality remains deliberately unknown here. */
        estimatedEqualPathBySymmetry:true,
        equalPath:null,pathMismatchM:null,
        hydraulicDiameterM:hydraulicDiameter,
        estimatedCenterlineLengthM:estimatedCenterlineLength,
        estimatedEffectiveLengthM:estimatedEffectiveLength,
        estimatedAcousticMassKgM4:
          airDensity*estimatedEffectiveLength/
            Math.max(1e-9,totalArea),
        estimatedLowPassHz:estimatedLowPass,
        estimatedDelayS:estimatedDelay,
        estimatedPhaseAtCrossoverDeg:estimatedPhase,
        estimatedQuarterWaveHz:estimatedQuarterWave,
        estimatedLossProxy:estimatedEffectiveLength/
          Math.max(1e-9,hydraulicDiameter),
        tapMach,
        phaseLegal:estimatedQuarterWave>=phaseMargin*xo,
        drivers:drivers.map(driver=>({
          index:driver.index,axis:driver.mountN,
          wallNormal:driver.wallN,radialAxis:driver.radialN,
          axisBlend:driver.axisBlend,
          axisToCdDeg:driver.axisToCdDeg,
          minimumReachM:manifoldMinimumReach,
          requestedExtraReachM:manifoldActualExtra,
          automaticDifferentialSetbackM:
            driver.automaticDifferentialSetbackM||0,
          extraReachM:manifoldActualExtra+
            (driver.automaticDifferentialSetbackM||0),
          totalReachM:driver.adapterReach
        }))
      };
    const driverCells=drivers.map(d=>d.cell);
    const plan={S,arch:A,family:f,st,frame:fs,xo,floor,coneCeil,phaseMargin,phaseBound,
      station,stationNear,stationMax,stationToThroatAxial,
      stationPhaseRatio,stationPhaseMarginRemaining,
      stationNullFrequency,stationNullMarginRatio,
      cr,totalArea,np,port,passage,lpTarget,chamberV,fLP,chamberDepth,
      acousticChamberDepth,profileGeometryActive,cartridge,
      driverCell:driverCellBase,driverCells,
      velocityRefHz,conePeakVelocity,tapPeakVelocity,tapMach,tapMachLimit,
      tapMachWarn,maxCrMach,
      flangeT,panelT,moduleT,gasketGap,adapterReach,shellT:f==='panel'?panelT:wall,
      throatR,throatMorphL,cdFlangeR,radialLandR,panelTopology,
      arrayPlacement,driverManifold,differentialSetback,
      drivers,allPorts,maxSpread,
      localArea,tapFraction,minWeb,panelRootWeb,adapterRootWeb,
      pairWeb,maxPortReach,minDriverGap,minMountSide,
      pairMode,pairRequestedSpread,pairTargetSpread,pairSolvedSpread,pairMinimumSpread,
      pairRequestValid,pairRequestError,pairMatchTolerance,pairCustomHonored,
      pairFrequency,pairLambda,pairSpreadLimit,pairWavelengthRatio,
      pairCoveragePathH,pairCoveragePathV,pairCoveragePath,
      pairCoveragePhaseH,pairCoveragePhaseV,pairCoveragePhase,
      pairLimitCode,pairLimitReason,
      panelBoltPhase:panelBolts.phase,panelBoltClearance:panelBolts.clearance,
      panelBoltRequired:panelBolts.required,
      panelBoltForeignGasketClearance:
        panelBolts.foreignGasketClearance,
      panelBoltForeignGasketRequired:
        panelBolts.foreignGasketRequired,
      panelBoltForeignGasketPass:
        panelBolts.foreignGasketPass!==false,
      panelBoltForeignGasketWitness:
        panelBolts.foreignWitness||null,
      driverCdFlangeClearance:driverCdFlange.clearance,
      driverCdFlangeRequired:driverCdFlange.requiredClearance,
      driverCdFlangeCoverage:driverCdFlange.coverage,
      driverCdFlangeComplete:driverCdFlange.complete,
      driverCdFlangeSamples:driverCdFlange.samples,
      driverCdFlangeWitness:driverCdFlange.witness,
      driverCdFlangeBasis:driverCdFlange.basis,
      boltInnerWeb:fs.boltInnerWeb,
      boltInnerWebRequired:fs.boltInnerWebRequired,
      boltInnerWebPass:fs.boltInnerWebPass,
      boltOuterWeb,boltOuterWebRequired,boltOuterWebPass,
      tapEdgeBias,pairEdgeObjectiveOffset,pairEdgeObjectiveRatio,
      pairUnderConeOffsetRemaining,
      minMouthIn,packageClearance,radialPitchR,
      radialPackageRequired,radialPackageAvailable,radialPackageCap,
      radialFaceClearance:radialFace.clearance,
      radialFaceCoverage:radialFace.coverage,
      radialFaceRequiredClearance:radialFace.requiredClearance,
      radialFaceProbeRadius:radialFace.probeRadius,
      radialFaceProbeOffset:radialFace.probeOffset,
      radialChamberClearance:radialChamberClearance.clearance,
      radialChamberCoverage:radialChamberClearance.coverage,
      radialChamberRequiredClearance:
        radialChamberClearance.requiredClearance,
      mountEnvelopeClearance:mountEnvelope.clearance,
      mountEnvelopeCoverage:mountEnvelope.coverage,
      mountEnvelopeRequiredClearance:mountEnvelope.requiredClearance,
      mountEnvelopeComplete:mountEnvelope.complete,
      mountEnvelopeOpeningRadius:mountEnvelope.openingRadius,
      mountEnvelopeOuterRadius:mountEnvelope.outerRadius,
      mountEnvelopeBoltLandRadius:mountEnvelope.boltLandRadius,
      mountEnvelopeProbeOffset:mountEnvelope.probeOffset,
      mountEnvelopeAxialStartOffset:mountEnvelope.axialStartOffset,
      mountEnvelopeAxialEndOffset:mountEnvelope.axialEndOffset,
      mountEnvelopePanelBlindDepth:mountEnvelope.panelBlindDepth,
      mountEnvelopeBearingAxialSamples:mountEnvelope.bearingAxialSamples,
      mountEnvelopeBoltAxialSamples:mountEnvelope.boltAxialSamples,
      mountEnvelopeSamples:mountEnvelope.samples,
      mountEnvelopeMinimumMouthIn,
      radialOpeningR,radialInnerR,
      radialAcousticChamberDepth,radialPhysicalChamberDepth,
      radialPhysicalChamberVolume};
    populateCornerPlateMetadata(plan);
    for(const driver of plan.drivers)
      driver.arrayPlacement=plan.arrayPlacement.classifications[
        driver.index]||null;
    /* Retention is solved after all acoustic, cell and driver-fastener
       geometry exists. This keeps the two M4 clamp screws independent of the
       woofer BCD while allowing their phase search to reject every real tap,
       cone chamber, driver pocket, neighbouring cartridge and acoustic cap. */
    plan.retention=options&&options.deferRetention&&plan.cartridge
      ?deferredCartridgeRetention(plan)
      :cartridgeRetentionLayout(plan);
    return plan;
  }
  function surfaceRadius(st,x){const d=M.dimsAt(st,x);return Math.min(d.a,d.b);}

  function planLayout(P){
    const out=P.drivers.map(d=>{
      const p=d.ports[0];
      const offm=P.np===2?len(sub(d.ports[1].center,d.ports[0].center))/2:0;
      return {kind:'woof',index:d.index,x:P.station,phi:d.phi,center:d.surface,normal:d.normal,
        mountN:d.normal,mountNormal:d.normal,mountX:P.station,od:P.frame.od,dp:P.frame.depth,
        tap:d.surface,seatR:P.frame.frameR+0.010,flowU:d.flow,crossV:d.cross,
        driverCell:d.cell,
        driverManifold:P.driverManifold.drivers[d.index],
        slot:{sa:P.port.sa,sb:P.port.sb,ap:P.totalArea*1e4,apEm:P.totalArea*1e4,
          np:P.np,offm,round:P.port.shape==='round',oval:P.port.shape==='oval',
          chamberV:P.chamberV,passage:P.passage}}; });
    out.twoWayPlan=P;
    return out;
  }

  function evaluate2(S0){
    const P=twoWayPlan(S0),S=P.S,rows=[];
    const row=(sec,name,val,ok,warn,why)=>rows.push({sec,name,val,st:ok?'ok':warn?'warn':'fail',why,grow:false});
    const source=S.twoDesign==='hinson10'?TWO_BUILDS[0].source:
      S.twoDesign==='jmod88'?TWO_BUILDS[1].source:P.arch.source;
    row('EVIDENCE','Two-way construction family',P.arch.name,true,true,source);
    row('EVIDENCE','Geometry provenance',
      S.tapBasis==='published'?'PUBLISHED DIMENSIONS':S.tapBasis==='manual'?'MEASURED OVERRIDE':'CALCULATED · Sd/Ap + chamber/tap model',
      true,true,'Photographs inform packaging only. Numeric geometry is published, measured, or explicitly calculated.');
    row('EVIDENCE','Cone-profile basis',
      P.driverCell.coneProfile.mode.toUpperCase()+' · '+
        P.driverCell.coneProfile.effectiveDepthMm.toFixed(1)+' mm · '+
        (P.driverCell.coneProfile.depthKnown?'depth known':'depth not measured'),
      P.driverCell.coneProfile.complete,true,
      'Flat is the zero-depth piston assumption. Parametric and measured profiles carry an explicit depth and evidence flag; an unmeasured profile remains a warning, never silently promoted to measured.');
    row('LAYOUT','Woofer count supported by family',
      S.nW+' · allowed '+P.arch.counts.join(', '),P.arch.counts.includes(S.nW),false,
      'Panel construction supports 2, 4 or 6 drivers; radial printed manifolds support 2 through 8.');
    row('LAYOUT','Symmetric driver-array rotation',
      P.arrayPlacement.mode.toUpperCase()+' · '+
        P.arrayPlacement.solvedRotationDeg.toFixed(2)+'° / '+
        P.arrayPlacement.periodDeg.toFixed(2)+'° unique interval · '+
        P.arrayPlacement.classifications.map(item=>item.kind).join(', '),
      P.arrayPlacement.seamOwnershipValid&&P.arrayPlacement.legalGap,
      P.arrayPlacement.seamOwnershipValid,
      'One rotation datum places every driver at exact 360°/N pitch. AUTO FIT searches the unique periodic interval for a legal frame gap and canonical face/seam ownership; MANUAL preserves the requested normalized rotation and fails rather than changing count or clipping a mount.');
    row('LAYOUT','Printed driver-manifold reach and axis',
      P.driverManifold.mode.toUpperCase()+' · '+
        (P.driverManifold.minimumReachM*1000).toFixed(1)+' + '+
        (P.driverManifold.extraReachM*1000).toFixed(1)+' = '+
        (P.driverManifold.totalReachM*1000).toFixed(1)+' mm · '+
        P.driverManifold.drivers.map(driver=>
          driver.axisToCdDeg.toFixed(1)+'°').join('/'),
      P.driverManifold.extensionHonored,
      P.driverManifold.extensionHonored,
      'SHORTEST reproduces the automatic minimum. EXTENDED MANIFOLD adds only the declared printed stand-off and spherically blends each local wall normal toward the radial axis, which is 90° to the compression-driver axis.');
    row('LAYOUT','Automatic equal-path cell setback',
      P.differentialSetback.active
        ?P.differentialSetback.drivers.map(driver=>
          (driver.additionalSetbackM*1000).toFixed(2)).join('/')+
          ' mm per cell · max reach '+
          (P.differentialSetback.maximumSolvedReachM*1000).toFixed(2)+' mm'
        :'NOT REQUIRED',
      P.differentialSetback.feasible&&P.arrayPlacement.legalGap,
      P.differentialSetback.feasible,
      'The requested stand-off is a common minimum. On a non-circular multi-cell horn, only shorter cells move farther rearward until their shortest smooth wall-to-chamber path intersects the common exact interval. No hidden serpentine or cutter overtravel supplies path length; an unpackaged differential solve is refused.');
    row('XO','CD floor inside LF overlap',Math.round(P.floor)+' ≤ '+Math.round(P.xo)+' ≤ '+Math.round(P.coneCeil)+' Hz',
      P.xo>=P.floor-1&&P.xo<=P.coneCeil+1,false,
      'The crossover must clear the selected compression-driver floor and stay below the cone path-spread ceiling.');
    const stationWithinLegalInterval=
      P.station>=P.stationNear-1e-12&&P.station<=P.stationMax+1e-12;
    row('PATH','Tap station quarter-wave margin',
      (P.station*1000).toFixed(1)+' mm in '+
        (P.stationNear*1000).toFixed(1)+'–'+(P.stationMax*1000).toFixed(1)+
        ' mm · '+Math.round(P.stationNullFrequency)+' Hz null / '+
        Math.round(P.xo)+' Hz XO',
      stationWithinLegalInterval&&
        P.stationNullFrequency>=P.phaseMargin*P.xo,
      stationWithinLegalInterval&&P.stationNullFrequency>=P.xo,
      'The legal axial interval begins after the throat transition and ends at the tighter of the horn-depth and c/(4·margin·XO) bounds. Published/manual stations remain authoritative and fail this row instead of being moved. Final phase still requires measured transfer functions.');
    row('PATH','Printed-manifold passage phase / quarter wave',
      P.driverManifold.estimatedCenterlineLengthM.toFixed(3)+' m · '+
        P.driverManifold.estimatedPhaseAtCrossoverDeg.toFixed(1)+'° @ XO · '+
        Math.round(P.driverManifold.estimatedQuarterWaveHz)+' Hz λ/4',
      P.driverManifold.phaseLegal,
      P.driverManifold.estimatedQuarterWaveHz>=P.xo,
      'The plan uses a conservative path estimate for coupled solving; exact swept-centerline length, end correction, acoustic mass, delay, low-pass and loss proxy are attached to the generated solid field and manufacturing audit.');
    row('TAP','Declared compression and total area',P.cr.toFixed(2)+':1 · '+(P.totalArea*1e4).toFixed(1)+' cm² / driver',
      P.cr>=2.5&&P.cr<=12,P.cr>=1.5&&P.cr<=20,
      'Tap area is Sd divided by an explicit compression target; there is no universal tap diameter.');
    row('TAP','Peak entry velocity / Mach at LF reference',
      P.tapPeakVelocity.toFixed(1)+' m/s · M '+P.tapMach.toFixed(3)+' @ '+Math.round(P.velocityRefHz)+' Hz',
      P.tapMach<=P.tapMachLimit,P.tapMach<=P.tapMachWarn,
      'Excursion ceiling: u=(Sd/Ap)·2πf·Xmax. M 0.10 is the strict calculated-family limit; this is not the 17 m/s rear-port heuristic.');
    row('TAP','Passage cross-section',
      P.np+'× '+P.port.shape+' '+(2*P.port.sa*1000).toFixed(1)+' × '+(2*P.port.sb*1000).toFixed(1)+' mm',
      2*Math.max(P.port.sa,P.port.sb)<C/P.xo,true,
      'US5526456: maximum passage width remains below the shortest wavelength carried by the passage.');
    row('TAP','Tap area vs local horn area',(P.tapFraction*100).toFixed(1)+'%',
      P.tapFraction<=0.50,P.tapFraction<=0.55,
      'Large openings disturb the HF wavefront; the audit compares every driver’s total open area to the horn section at the common station.');
    row('TAP','Entries remain under active cone',
      (P.maxPortReach*1000).toFixed(1)+' mm reach vs '+(P.frame.activeR*1000).toFixed(1)+' mm Sd radius',
      P.maxPortReach<=P.frame.activeR-0.002,P.maxPortReach<=P.frame.activeR,
      'Every passage center and full opening envelope must land inside the active cone/front-chamber footprint.');
    if(P.np===2){
      row('TAP',P.family==='panel'?'Facet-intersection bias':'Symmetric entry spacing',
        P.family==='panel'
          ?Math.round(P.tapEdgeBias*100)+'% edge bias · '+P.pairLimitReason
          :(P.pairSolvedSpread*1000).toFixed(1)+' mm · '+P.pairLimitReason,
        P.pairWeb>=P.minWeb,false,
        'Corner/seam placement reduces the tap interruption seen by the HF wavefront. It is an AUTO objective, not a validity predicate; wavelength, web and under-cone constraints remain authoritative.');
      row('TAP','Tap-pair spread / quarter wavelength',
        (P.pairSolvedSpread*1000).toFixed(1)+' mm · d/λ '+
          P.pairWavelengthRatio.toFixed(3)+' @ '+Math.round(P.pairFrequency)+' Hz · limit '+
          (P.pairSpreadLimit*1000).toFixed(1)+' mm',
        P.pairSolvedSpread<=P.pairSpreadLimit+P.pairMatchTolerance,false,
        'TAP_PAIR_SPREAD_WAVELENGTH: coherent entry centroids must remain within one quarter wavelength at max(XO, modeled chamber low-pass).');
      row('TAP','Pair phase at coverage boundary',
        'H '+P.pairCoveragePhaseH.toFixed(1)+'° / V '+
          P.pairCoveragePhaseV.toFixed(1)+'° · max path '+
          (P.pairCoveragePath*1000).toFixed(1)+' mm',
        P.pairCoveragePhase<=90+1e-6,false,
        'The actual three-dimensional centroid delta is projected onto both horizontal and vertical coverage-edge rays; screen-space spacing is never used.');
      if(P.pairMode==='custom')row('TAP','Custom tap-pair spread honored',
        (P.pairRequestValid?(P.pairRequestedSpread*1000).toFixed(1):'invalid')+
          ' mm requested · '+(P.pairSolvedSpread*1000).toFixed(1)+' mm solved · '+
          (Number.isFinite(P.pairRequestError)
            ?(P.pairRequestError*1000).toFixed(2)+' mm error':'invalid request'),
        P.pairCustomHonored,false,
        'TAP_PAIR_SPREAD_GEOMETRY: Custom is a hard manufacturing request. An unavailable spread is refused rather than silently clamped.');
      row('TAP','Tap-to-tap structural web',
        (P.pairWeb*1000).toFixed(1)+' mm remaining · '+
          (P.minWeb*1000).toFixed(1)+' mm required',
        P.pairWeb>=P.minWeb,false,
        'The real oriented aperture outlines—not their bounding boxes—must retain the complete printable web.');
    }
    row('CHAMBER','Front chamber acoustic low-pass',
      Math.round(P.fLP)+' Hz · '+Math.round(P.chamberV*1e6)+' cm³ / driver',
      P.fLP>=1.20*P.xo,P.fLP>=P.xo,
      'Lumped chamber compliance and end-corrected passage mass are solved together; prototype impedance verifies the result.');
    row('CHAMBER','Cone travel clearance',
      (P.chamberDepth*1000).toFixed(1)+' mm chamber depth · '+(P.frame.xmax*1000).toFixed(1)+' mm Xmax',
      P.chamberDepth>=P.frame.xmax+0.004,P.chamberDepth>=P.frame.xmax+0.002,
      'The relieved chamber follows the active cone and leaves excursion plus manufacturing clearance.');
    row('CHAMBER','Conservative moving envelope',
      P.driverCell.movingEnvelope.conservativeAxialDepthMm.toFixed(1)+
        ' mm axial × '+(2*P.driverCell.movingEnvelope.radiusMm).toFixed(1)+' mm diameter · '+
        P.driverCell.clearance.axialMm.toFixed(1)+'/'+
        P.driverCell.clearance.radialMm.toFixed(1)+' mm axial/radial clearance',
      P.driverCell.frontChamber.designAxialDepthM>=
        P.driverCell.frontChamber.requiredAxialDepthM,
      P.driverCell.frontChamber.designAxialDepthM>=
        P.driverCell.frontChamber.requiredAxialDepthM-0.002,
      'The conservative cell envelope contains the declared cone depth, one-way Xmax and explicit or automatic clearances. A non-flat declared profile drives the printable cell depth; a measured profile is still required to validate the detailed moving surface.');
    { const required=P.driverCell.frontChamber.requiredAxialDepthM,
        minSpan=Math.min(...P.driverCells.map(cell=>
          cell.frontChamber.geometricSpanM)),
        fits=minSpan>=required-1e-6;
      row('CHAMBER','Printable driver-cell envelope',
        (minSpan*1000).toFixed(1)+' mm minimum generated span vs '+
          (required*1000).toFixed(1)+' mm required'+
          (P.profileGeometryActive?' · profile-driven geometry':' · flat baseline geometry'),
        !P.profileGeometryActive||fits,
        fits,
        'Parametric/measured cone depth and axial clearance physically grow the integrated cell or automatic cartridge. A manually locked radial reach is refused when the declared moving envelope cannot fit.'); }
    if(P.family==='radial'){
      const complete=Number.isFinite(P.radialChamberClearance)&&
        Number.isFinite(P.radialChamberCoverage)&&
        P.radialChamberClearance>=P.radialChamberRequiredClearance-1e-7&&
        P.radialChamberCoverage>=1-1e-9;
      rows.push({sec:'CHAMBER',name:'Generated radial chamber volume',
        val:(P.radialPhysicalChamberVolume*1e6).toFixed(1)+
          ' cm³ generated vs '+(P.chamberV*1e6).toFixed(1)+
          ' cm³ acoustic target · '+
          (P.radialChamberClearance*1000).toFixed(1)+
          ' mm minimum outer-shell clearance',
        st:complete?'ok':'fail',
        why:'The complete volume-derived radial chamber frustum must remain outside the exact horn shell. The tap lumen is the only permitted connection back through the horn wall; shell clipping may not silently remove chamber volume.',
        grow:false,...(complete?{}:
          {code:'RADIAL_FRONT_CHAMBER_INCOMPLETE'})});
    }
    row('PATH','Nominal equal-path target',
      (P.passage*1000).toFixed(1)+' mm effective length per entry · physical cutter spread not yet measured',
      P.passage>0,true,
      'All entries share one station and nominal acoustic mass length. The generated cutter centerlines still require explicit per-port extraction before the tool may claim a measured 0.0 mm spread.');
    row('MOUNT','Driver axes point into horn center',
      P.family==='radial'?'radial / perpendicular to main axis':'local panel normals',
      P.drivers.every(d=>Math.abs(d.normal[0])<0.82),true,
      'Woofer cones fire into sealed front chambers; no driver is aimed forward into empty space.');
    row('MOUNT','Driver-cell construction',
      P.driverCell.construction.toUpperCase()+' · '+P.driverCell.interfaceKind,
      true,true,
      'Integrated cells are part of the horn body. Cartridges use the same solved acoustic cell metadata behind a registered, sealed horn-side interface; part separation remains family/export specific.');
    if(P.family==='panel'&&P.panelTopology){
      rows.push({sec:'MOUNT',
        name:'Corner plate root owns exactly one seam',
        val:P.cornerPlateMultiSeamOverlap
          ?'FAIL · root reaches multiple horn seams':'PASS · one owned seam per root',
        st:P.cornerPlateMultiSeamOverlap?'fail':'ok',
        why:'A parametric corner-driver plate may join the two faces adjacent to its owned seam only. A root footprint that reaches another seam is an ambiguous multi-corner solid and is explicitly refused.',
        grow:false,...(P.cornerPlateMultiSeamOverlap
          ?{code:'CORNER_PLATE_MULTI_SEAM_OVERLAP'}:{})});
      rows.push({sec:'MOUNT',name:'Complete two-face corner mounting plates',
        val:P.cornerPlateComplete?'complete':'incomplete',
        st:P.cornerPlateComplete?'ok':'fail',
        why:'Every seam-mounted driver requires two face-aligned attachment wings, a complete bearing annulus and canonical tap datums. Missing roots are refused rather than replaced with a floating ring.',
        grow:false,...(P.cornerPlateComplete?{}:
          {code:'CORNER_PLATE_ENVELOPE_INCOMPLETE'})});
    }
    { const complete=P.mountEnvelopeComplete&&
          P.mountEnvelopeCoverage>=1-1e-12&&
          P.mountEnvelopeClearance>=
            P.mountEnvelopeRequiredClearance-1e-12,
        canGrow=S.tapBasis==='model'&&S.mouthW<
          Math.max(S.mouthW,+S.mouthCap||S.mouthW);
      rows.push({sec:'MOUNT',name:'Complete driver bearing and bolt lands',
        val:(P.mountEnvelopeClearance*1000).toFixed(2)+
          ' mm minimum clearance · '+
          (P.mountEnvelopeCoverage*100).toFixed(2)+'% coverage · '+
          (P.mountEnvelopeRequiredClearance*1000).toFixed(2)+' mm required',
        st:complete?'ok':'fail',
        why:'Every sampled point on the full bearing annulus and every fastener pocket-plus-web land must remain outside the finite horn air boundary. Smart Adapt grows the horn mouth first; an envelope that cannot clear within the declared cap is explicitly refused rather than clipped.',
        grow:!complete&&canGrow,...(complete?{}:
          {code:'DRIVER_BEARING_ENVELOPE_INCOMPLETE'})}); }
    if(P.family==='radial'&&P.cartridge){
      const complete=Number.isFinite(P.radialFaceClearance)&&
        Number.isFinite(P.radialFaceCoverage)&&
        P.radialFaceClearance>=P.radialFaceRequiredClearance-1e-7&&
        P.radialFaceCoverage>=1-1e-9;
      rows.push({sec:'MOUNT',name:'Complete radial cartridge bearing face',
        val:(P.radialFaceClearance*1000).toFixed(1)+
          ' mm minimum conformal-joint clearance · '+
          (P.radialFaceCoverage*100).toFixed(1)+'% perimeter coverage · '+
          (P.adapterReach*1000).toFixed(1)+' mm '+
          (S.adapterReachMode==='manual'?'MANUAL':'AUTO')+' reach',
        st:complete?'ok':'fail',
        why:'The horn-side plane of every circular driver flange is sampled against the same exact curved boundedJoint used by the printable cartridge. AUTO reach grows to retain the complete face; MANUAL reach remains fixed and is explicitly refused when any arc is clipped by the horn.',
        grow:false,...(complete?{}:
          {code:'RADIAL_CARTRIDGE_BEARING_FACE_INCOMPLETE'})});
    }
    { const R=P.retention,pass=!R.active||R.ok;
      rows.push({sec:'MOUNT',name:'Cartridge-to-horn retention',
        val:R.active
          ?(R.ok
            ?R.countPerCartridge+'× '+R.fastener+' per cartridge · phase '+
              R.solvedPhaseDeg.toFixed(1)+'° · minimum dynamic clearance '+
              R.minimumClearanceMm.toFixed(1)+' mm'
            :'REFUSED · '+R.code)
          :'NOT APPLICABLE · integrated horn cell',
        st:pass?'ok':'fail',
        why:'Removable cells require two phase-solved clamp screws on a root annulus independent of the woofer BCD. The horn receives D5.61 × 4.9 mm short-M4 heat-set installation pockets with at least 2.4 mm acoustic cap; the module owns D4.6 clearance bores, D8.4 × 3.2 mm counterbores and R7.4 × 6 mm bosses.',
        grow:false,...(pass?{}:{code:'CARTRIDGE_RETENTION_NO_LAYOUT'})});
    }
    row('MOUNT','Driver-frame clearance',
      P.family==='panel'
        ?(P.minDriverGap*1000).toFixed(1)+' mm minimum gap · '
          +(S.driverCellConstruction==='cartridge'
            ?'detachable '+(P.adapterReach*1000).toFixed(1)+' mm module'
            :'direct '+(P.panelT*1000).toFixed(1)+' mm plate')
        :(P.minDriverGap*1000).toFixed(1)+' mm minimum gap · '+(P.adapterReach*1000).toFixed(1)+' mm radial reach',
      P.minDriverGap>=0.004,
      P.minDriverGap>=0,
      P.family==='panel'
        ?'Panel frames must clear one another at the solved station; Smart Adapt may move the station or refuse an impossible count/diameter.'
        :'The shortest radial petal length that clears complete circular frames is solved around the HF hub.');
    if(P.family==='panel')row('MOUNT','Woofer fasteners clear HF flange',
      (P.panelBoltClearance*1000).toFixed(1)+' mm web · '
        +(P.panelBoltPhase*180/Math.PI).toFixed(1)+'° frame rotation',
      P.panelBoltClearance>=P.panelBoltRequired,
      P.panelBoltClearance>=0,
      'The complete blind-pocket axes are checked in 3-D against the finite compression-driver flange. Calculated layouts rotate round frames and move the common station only as far as required; published/manual stations are never silently changed.');
    rows.push({
      sec:'MOUNT',
      name:'Driver bearing and gasket clear HF flange',
      val:(P.driverCdFlangeClearance*1000).toFixed(1)+
        ' mm 3-D minimum · '+
        (P.driverCdFlangeRequired*1000).toFixed(1)+' mm required · '+
        (P.driverCdFlangeCoverage*100).toFixed(1)+'% annulus coverage',
      st:P.driverCdFlangeComplete?'ok':'fail',
      why:'The complete driver-bearing/gasket annulus is sampled through its physical depth against the finite compression-driver flange cylinder. Perspective overlap in the viewport is not treated as a collision; a real shortfall grows a calculated package or is explicitly refused.',
      grow:!P.driverCdFlangeComplete&&
        S.tapBasis==='model'&&S.mouthW<
          Math.max(S.mouthW,+S.mouthCap||S.mouthW),
      ...(P.driverCdFlangeComplete?{}:
        {code:'DRIVER_CD_FLANGE_CLEARANCE_INSUFFICIENT'})
    });
    rows.push({
      sec:'MOUNT',
      name:'Cone-cavity to woofer-fastener web',
      val:(P.boltInnerWeb*1000).toFixed(2)+' mm · '+
        ((P.frame.generatedPanelBcd||P.frame.generatedRadialBcd)
          ?'AUTO ':'DECLARED ')+
        'BCD '+(P.frame.bcd*1000).toFixed(2)+' mm',
      st:P.boltInnerWebPass?'ok':'fail',
      why:'The exact cone-relief radius and selected '+
        (P.family==='panel'?'printed clearance-hole':'heat-set installation-pocket')+
        ' radius must leave at least '+
        (P.boltInnerWebRequired*1000).toFixed(1)+
        ' mm of solid material. A calculated mount with no declared BCD grows its bolt circle; explicit and sourced bolt circles are preserved and refused when insufficient.',
      grow:false,...(P.boltInnerWebPass?{}:
        {code:'DRIVER_FASTENER_INNER_WEB_INSUFFICIENT'})});
    if(P.family==='panel')rows.push({
      sec:'MOUNT',
      name:'Woofer-fastener to plate-edge web',
      val:(P.boltOuterWeb*1000).toFixed(2)+' mm · '+
        (P.boltOuterWebRequired*1000).toFixed(2)+' mm required',
      st:P.boltOuterWebPass?'ok':'fail',
      why:'The generated driver plate grows beyond the complete printed fastener bore by the selected structural web; this is measured from the same exact cutter and plate radius used by the solid.',
      grow:false,...(P.boltOuterWebPass?{}:
        {code:'DRIVER_FASTENER_OUTER_WEB_INSUFFICIENT'})});
    if(P.family==='radial')row('MOUNT','Radial packaging envelope',
      (P.radialPackageRequired*1000).toFixed(1)+' mm required · '
        +(P.radialPackageAvailable*1000).toFixed(1)+' mm available',
      P.radialPackageRequired<=P.radialPackageAvailable+1e-6,
      P.radialPackageRequired<=P.radialPackageCap+1e-6,
      'Complete driver frames plus gasket/manufacturing clearance must fit on the radial ring. Smart Adapt may grow the mouth only to the declared cap; an impossible package is explicitly refused.');
    row('MOUNT','Mounting faces stay behind the horn wall',
      (P.minMountSide*1000).toFixed(1)+' mm minimum outward offset',
      P.minMountSide>=Math.max(0.003,S.wallT*0.75),
      P.minMountSide>0,
      'Every driver face and detachable module must remain on the rear/outside of the acoustic surface; mounting plates may not intrude into the horn air path.');
    row('PRINT','Wall and gasket system',
      (S.wallT*1000).toFixed(1)+' mm wall · '+(P.frame.gasketT*1000).toFixed(1)+' mm gasket',
      S.wallT>=0.004,S.wallT>=0.003,
      'Driver-to-chamber, adapter-to-horn, and module-to-baffle seals are represented in the mount geometry.');
    row('PATTERN','Mouth width at LF crossover',
      S.mouthW+'″ vs λ/2 '+(C/(2*P.xo)/IN).toFixed(1)+'″',
      S.mouthW*IN>=C/(2*P.xo),true,
      'Warning tier: below roughly λ/2 the horn cannot maintain its nominal pattern to the LF crossover.');
    S.fxDerived={lo:Math.round(P.xo),hi:null};
    const L=planLayout(P);
    return {st:P.st,layout:L,rows,fails:rows.filter(r=>r.st==='fail').length,
      plan:P,driverCell:P.driverCell,driverCells:P.driverCells};
  }

  const baseSolve=M.solve,baseEvaluate=M.evaluate,baseAdapt=M.adapt,baseShell=M.shellMesh,
    baseFab=M.fabricationAudit,baseTapCutters=M.tapCutters;
  function evaluate(S0){
    return S0.topo==='2way'?evaluate2(S0):baseEvaluate(S0);
  }
  function solve(S0){
    if(S0.topo!=='2way') return baseSolve(S0);
    /* solve() is also used by exports, reports and the unattended QA matrix,
       not only by dropdown handlers. Run the same deterministic Smart Adapt
       packaging pass here so a valid 4-driver selection cannot render an
       overlapping pre-adapt assembly merely because it entered through a
       different code path. */
    const adapted=smartAdapt2way(migrate(S0),'repair',{}),S=migrate(adapted.S2),
      ev=evaluate2(S);
    S.fxDerived={...ev.plan.S.fxDerived};
    S.tapVtcDerivedW=ev.plan.chamberV*1e6;
    S.tapAreaDerivedW=ev.plan.totalArea*1e4;
    S.tapStationDerivedW=ev.plan.station*1000;
    S.tapLptDerivedW=ev.plan.passage*1000;
    S.tapPairDerived={
      mode:ev.plan.pairMode,
      requestedSpreadMm:ev.plan.pairRequestedSpread===null
        ?null:ev.plan.pairRequestedSpread*1000,
      solvedSpreadMm:ev.plan.pairSolvedSpread*1000,
      frequencyHz:ev.plan.pairFrequency,
      wavelengthRatio:ev.plan.pairWavelengthRatio,
      coveragePhaseHDeg:ev.plan.pairCoveragePhaseH,
      coveragePhaseVDeg:ev.plan.pairCoveragePhaseV,
      limitingCode:ev.plan.pairLimitCode,
      limitingReason:ev.plan.pairLimitReason
    };
    S.driverCellDerivedW={
      ...ev.plan.driverCell,
      driverCount:ev.plan.driverCells.length,
      drivers:ev.plan.driverCells.map((cell,index)=>({
        index,
        geometricSpanM:cell.frontChamber.geometricSpanM,
        geometricSpanMm:cell.frontChamber.geometricSpanMm,
        geometricSpanMarginM:cell.frontChamber.geometricSpanMarginM,
        geometricSpanMarginMm:cell.frontChamber.geometricSpanMarginMm
      }))
    };
    return {S,ev,grown:S.mouthW-(+S0.mouthW||S.mouthW),infeasible:ev.fails>0,
      ledger:adapted.ledger};
  }

  const TWO_START_SOLVER_OWNED=Object.freeze([
    'tapStationW','tapAreaW','tapLptW','tapSlotL','tapSlotW','tapVtcW',
    'tapVtcDerivedW','tapAreaDerivedW','tapStationDerivedW',
    'tapLptDerivedW','tapPairSpreadMm','tapPairDerived',
    'driverCellDerivedW','mountEnvelopeReachMm','mountEnvelopeMinMouthW',
    'rearV','rearFb','rearPortArea','rearPortLen','mountRing'
  ]);
  function cloneState(value){
    return value===undefined?undefined:JSON.parse(JSON.stringify(value));
  }
  /* Build and prove a quick-start candidate without touching the caller's
     live object.  The UI commits S2 only after this function returns ok=true,
     so an unknown key, incompatible count or failed acoustic/package solve
     leaves both saved state and the previous viewport intact.

     `requestedCount` is intentionally narrow: it lets count-aware clients
     test/apply the same card with a user-selected family count while refusing
     counts the family cannot own.  The browser cards omit it and therefore
     use the count printed in the card name. */
  function applyTwoWayStart(S0,key,options){
    const original=cloneState(S0||{}),request=options||{},
      fail=(code,message,details)=>({
        ok:false,code,message,details:details||null,
        S2:cloneState(original)
      }),
      start=TWO_STARTS.find(item=>item.key===key);
    if(!start)
      return fail('TWO_START_UNKNOWN',
        'Unknown calculated two-way quick start: '+String(key),
        {key,allowed:TWO_STARTS.map(item=>item.key)});
    const A=TWO_ARCH[start.family];
    if(!A)
      return fail('TWO_START_FAMILY_UNKNOWN',
        'Calculated two-way quick start has no supported mechanical family',
        {key,family:start.family});
    const requestedCount=request.requestedCount===undefined
      ?start.s.nW:+request.requestedCount;
    if(!Number.isInteger(requestedCount)||!A.counts.includes(requestedCount))
      return fail('TWO_START_COUNT_INCOMPATIBLE',
        'The requested woofer count is not supported by this quick-start family',
        {key,family:start.family,requestedCount,allowed:A.counts.slice()});
    try{
      const candidate=cloneState(original);
      for(const field of TWO_START_SOLVER_OWNED)delete candidate[field];
      for(const field of start.unset||[])delete candidate[field];
      Object.assign(candidate,cloneState(start.s),{
        nW:requestedCount,
        topo:'2way',
        twoArch:start.family,twoFamily:start.family,
        twoDesign:'arch:'+start.family,
        tapBasis:'model',
        driverCellConstruction:'integrated',
        requestedMouthW:start.s.mouthW,
        _smart2waySchema:CURRENT_TWO_WAY_STATE_SCHEMA
      });
      const solved=solve(candidate),P=solved&&solved.ev&&solved.ev.plan;
      if(!solved||solved.infeasible||!solved.ev||solved.ev.fails)
        return fail('TWO_START_PREFLIGHT_REFUSED',
          'Calculated two-way quick start did not pass the design-law preflight',
          {key,failedRows:solved&&solved.ev
            ?solved.ev.rows.filter(row=>row.st==='fail').map(row=>row.name)
            :['solver returned no plan']});
      if(solved.S.twoArch!==start.family||
          solved.S.twoFamily!==start.family||
          solved.S.twoDesign!=='arch:'+start.family||
          solved.S.tapBasis!=='model'||
          solved.S.driverCellConstruction!=='integrated'||
          solved.S.nW!==requestedCount)
        return fail('TWO_START_IDENTITY_DRIFT',
          'Calculated two-way quick start changed identity during preflight',
          {key,family:start.family,requestedCount,
            actual:{twoArch:solved.S.twoArch,twoFamily:solved.S.twoFamily,
              twoDesign:solved.S.twoDesign,tapBasis:solved.S.tapBasis,
              driverCellConstruction:solved.S.driverCellConstruction,
              nW:solved.S.nW}});
      return {
        ok:true,code:'TWO_START_READY',start,
        S2:cloneState(solved.S),
        solved,
        ledger:[{
          knob:'twoQuickStart',from:null,to:start.key,
          why:'calculated quick start passed the coupled design-law preflight'
        },...(solved.ledger||[])],
        preflight:{
          family:P.family,driverCount:P.drivers.length,
          passageCount:P.allPorts.length,
          crossoverHz:P.xo,mouthWidthIn:solved.S.mouthW,
          stationMm:P.station*1000,
          stateHash:twoWayStateHash(solved.S)
        }
      };
    }catch(error){
      return fail(error&&error.code?error.code:'TWO_START_PREFLIGHT_ERROR',
        error&&error.message?error.message:String(error),
        error&&error.details?error.details:{key});
    }
  }

  function smartAdapt2way(S0,key,T){
    let seed={...S0},baseLedger=[];
    const prior=familyKey(seed);
    if(['wPre','cdSel','odW'].includes(key)&&baseAdapt){
      const adaptedBase=baseAdapt(seed,key,T||{});
      seed=adaptedBase.S2;
      baseLedger=Array.isArray(adaptedBase.ledger)
        ?adaptedBase.ledger.slice():[];
    }
    const requestedCount=(seed.nW|0)||TWO_ARCH[familyKey(seed)].defaults.nW;
    /* The base adapter owns driver/CD preset dimensions and the two-way layer
       owns their coupled packaging. Keep both halves of that single atomic
       transition in one ledger so controls and provenance repaint from the
       same committed state; dropping the base entries left the OD slider on
       the previous driver while geometry correctly used the new one. */
    const S=migrate(seed),ledger=baseLedger;
    if(requestedCount!==S.nW)ledger.push({knob:'nW',from:requestedCount,to:S.nW,
      why:'selected family supports '+TWO_ARCH[S.twoArch].counts.join(', ')+' woofers'});
    const set=(k,v,why)=>{if(S[k]===v||v===undefined)return;const from=S[k];S[k]=v;ledger.push({knob:k,from,to:v,why});};
    T=T||{};
    /* Mount metadata belongs to the selected driver, never to the previously
       selected one. Family Smart Adapt can atomically replace a 12-inch
       package with the compact w5 default; retaining the old 298 mm bolt
       circle then creates four detached radial islands even though
       the visible driver dimensions say 5.25 inches. Clear absent fields just
       as deliberately as we set present ones. Keep the two published records
       available in the worker/CLI where the UI's WPRE table is not in scope. */
    const builtInMount={
      nw10:{frame:'round',boltN:8,bcd:244,boltD:6.5,gasket:1.6},
      ndl88:{frame:'round',boltN:8,bcd:298,boltD:7,gasket:1.6}
    };
    if(['wPre','twoDesign'].includes(key)&&S.wPre&&S.wPre!=='custom'){
      const p=(T.WPRE&&T.WPRE[S.wPre])||builtInMount[S.wPre]||{};
      for(const [to,from] of [['frameW','frame'],['boltNW','boltN'],['bcdW','bcd'],
        ['boltDW','boltD'],['gasketW','gasket']]){
        if(p[from]!==undefined)set(to,p[from],'selected driver mounting record');
        else if(S[to]!==undefined){
          const old=S[to];delete S[to];ledger.push({knob:to,from:old,to:undefined,
            why:'remove mounting dimension inherited from a different driver'});
        }
      }
    }
    if(T.CDP&&T.CDP[S.cdSel]){
      const p=T.CDP[S.cdSel];
      for(const [to,from] of [['cdBCD','bcd'],['cdBoltN','boltN'],['cdBoltD','boltD'],
        ['cdFlangeD','flangeD']]) if(p[from]!==undefined)set(to,p[from],'compression-driver mounting record');
    }
    const documented=TWO_BUILDS.some(b=>b.key===S.twoDesign);
    const documentedGeometryKeys=['wPre','odW','nW','npW','shW','cdSel','twoXO','tapCRW',
      'tapPairMode','tapPairSpreadMm',
      'style','profileLaw','osseThroatAngle','osseK','osseS','osseTerminationN','osseQ',
      'rosseThroatAngle','rosseK','rosseApexRadiusFactor','rosseB','rosseM','rosseQ',
      'sectionFamily','sectionCornerRatio','seN','covH','covV','mouthW','rollR','wallT',
      'driverArrayMode','driverArrayRotationDeg',
      'driverMountMode','driverMountExtraMm','driverAxisBlend',
      'driverCellConstruction','coneProfileMode','coneDepthMm','coneDepthKnown',
      'coneAxialClearanceMm','coneRadialClearanceMm',
      'boltNW','bcdW','boltDW','gasketW'];
    if(documented&&documentedGeometryKeys.includes(key)){
      set('twoDesign','arch:'+S.twoArch,'edited documented build becomes a calculated design');
      if(S.tapBasis==='published')set('tapBasis','model','published dimensions no longer describe the edited geometry');
      if(S.tapBasis==='model'){
        for(const k of ['tapStationW','tapAreaW','tapLptW','tapSlotL','tapSlotW','tapVtcW'])
          if(S[k]!==undefined){const from=S[k];delete S[k];ledger.push({knob:k,from,to:undefined,
            why:'remove dimensions tied to the documented build'});}
      }
    }
    const requested=(key==='twoArch'||key==='twoFamily'||key==='twoDesign')
      ?familyKey(S):prior;
    if(TWO_ARCH[requested]){
      set('twoArch',requested,'selected mechanical family');
      set('twoFamily',requested,'selected mechanical family');
    }
    const A=TWO_ARCH[S.twoArch];
    if((key==='twoArch'||key==='twoFamily'||key==='twoDesign')&&!A.counts.includes(S.nW))
      set('nW',A.defaults.nW,'nearest supported count for the selected family');
    if(!A.counts.includes(S.nW))
      set('nW',A.counts.reduce((a,b)=>Math.abs(b-S.nW)<Math.abs(a-S.nW)?b:a,A.counts[0]),'normalize unsupported driver count');
    /* Selecting Hinson/JMOD is an atomic documented package, not an edit to a
       generic family. A later driver/geometry edit takes the
       documented→calculated path above. */
    if(key==='twoArch'||key==='twoFamily'||(key==='twoDesign'&&!documented)){
      for(const k of ['style','seN','npW','shW',
        'driverArrayMode','driverArrayRotationDeg','phaseMargin',
        'driverMountMode','driverMountExtraMm','driverAxisBlend',
        'tapPairMode',
        'adapterReach','adapterReachMode','wPre','odW','dpW','sdW','vtcW','xmW'])
        if(A.defaults[k]!==undefined)set(k,A.defaults[k],'family default');
      set('driverCellConstruction','integrated','family default');
      if(!/^hinson10$|^jmod88$/.test(S.twoDesign||'')) set('twoDesign','arch:'+S.twoArch,'calculated family');
    }
    if(S.tapBasis==='model'){
      const fs=frameSpec(S),floor=Math.max(150,+S.cdFloor||300);
      const ceil=C/(2*Math.max(0.025,2*fs.activeR/(S.npW>=2?2:1)));
      if(['wPre','odW','cdSel','npW','twoArch','twoFamily','twoDesign','repair'].includes(key)){
        const preferred=+S.twoXO||A.defaults.twoXO;
        set('twoXO',Math.round(clamp(preferred,floor,Math.max(floor,ceil))/5)*5,'driver/CD overlap');
      }
      if(!(+S.tapCRW>0)) set('tapCRW',A.defaults.tapCRW,'family compression starting point');
      for(const k of ['tapStationW','tapAreaW','tapLptW','tapSlotL','tapSlotW','tapVtcW'])
        if(S[k]!==undefined){const from=S[k];delete S[k];ledger.push({knob:k,from,to:undefined,why:'solver-owned calculated geometry'});}
    }
    set('mount','flush','drivers fire along local/radial chamber axes');
    set('placeW','auto','family owns placement while count remains user-selectable');
    const geometryKeys=['wPre','odW','nW','npW','cdSel','twoXO','twoArch','twoFamily',
      'twoDesign','covH','covV','style','profileLaw','osseThroatAngle','osseK','osseS',
      'osseTerminationN','osseQ','rosseThroatAngle','rosseK','rosseApexRadiusFactor',
      'rosseB','rosseM','rosseQ','sectionFamily','sectionCornerRatio','seN',
      'driverArrayMode','driverArrayRotationDeg','mouthW',
      'driverMountMode','driverMountExtraMm','driverAxisBlend',
      'boltNW','bcdW','boltDW','gasketW','repair'];
    const compactRadial=S.twoArch==='radial'&&S.adapterReachMode!=='manual'&&
      ['wPre','odW','nW','twoArch','twoFamily','twoDesign','repair'].includes(key);
    /* Custom pair spread is a hard manufacturing request. Do not make it
       appear valid by silently walking mouth/XO/compression during the repair
       fixed point; evaluate the requested geometry once and fail closed. */
    const coupledGeometry=S.tapBasis==='model'&&S.tapPairMode!=='custom'&&
        geometryKeys.includes(key),
      work={...S},reasons={},
      /* Candidate acoustics/package plans do not need a 2,340-layout exact
         retention search. Defer that bounded search until the candidate has
         passed every cheaper coupled law. Their radial reach search likewise
         uses the guarded coarse probes; evaluate2() rebuilds the committed
         plan with dense published diagnostics. */
      fastPlan=state=>twoWayPlan(state,{
        deferRetention:true,coarseRadialDiagnostics:true}),
      densePlan=state=>twoWayPlan(state,{deferRetention:true}),
      baseGeometryLegal=q=>q.minDriverGap>=0.004&&q.tapFraction<=0.50&&
        q.maxPortReach<=q.frame.activeR-0.002&&
        (q.np!==2||q.pairWeb>=q.minWeb)&&
        q.tapMach<=q.tapMachLimit+1e-12&&
        q.boltInnerWebPass&&q.boltOuterWebPass&&
        q.cornerPlateComplete&&!q.cornerPlateMultiSeamOverlap,
      mountEnvelopeLegal=q=>q.mountEnvelopeComplete&&
        q.mountEnvelopeCoverage>=1-1e-12&&
        q.mountEnvelopeClearance>=
          q.mountEnvelopeRequiredClearance-1e-12&&
        q.driverCdFlangeComplete&&
        q.driverCdFlangeCoverage>=1-1e-12&&
        q.driverCdFlangeClearance>=
          q.driverCdFlangeRequired-1e-12,
      nonRetentionLegal=q=>baseGeometryLegal(q)&&mountEnvelopeLegal(q),
      exactRetention=q=>{
        if(!q.cartridge)return true;
        q.retention=cartridgeRetentionLayout(q);
        return q.retention.ok;
      };
    /* Panel containment is mouth-owned. Never carry a rear-depth workaround
       into a coupled solve; the exact blind-pocket base does not move with it. */
    if(work.twoArch==='panel')delete work.mountEnvelopeReachMm;
    /* AUTO radial reach is a solved value, not history. Normalize it to the
       same fresh family baseline before deciding whether the incoming
       package is already contained. Previously this happened inside the
       fixed-point loop: a first solve starting at 35 mm took the extension
       branch, while its already-solved 143 mm output took the compact-reset
       branch and changed XO/reach on pass two. */
    let p;
    if(compactRadial){
      const WA=TWO_ARCH[work.twoArch];
      p=fastPlan({...work,adapterReach:WA.defaults.adapterReach});
      work.adapterReach=Math.ceil(p.adapterReach*1000);
      reasons.adapterReach=
        'shortest radial spoke that clears every selected frame';
    }
    p=fastPlan(work);
    if(S.tapBasis==='model'&&p.tapMach>p.tapMachLimit){
      const machCr=Math.max(1.5,Math.floor(p.maxCrMach*2)/2);
      if(work.tapCRW!==machCr){
        work.tapCRW=machCr;
        reasons.tapCRW='limit peak entry velocity to Mach 0.10 at the LF excursion reference';
        p=fastPlan(work);
      }
    }
    const mountEnvelopeInitiallyLegal=mountEnvelopeLegal(p);
    let mountMouthSearchPassed=mountEnvelopeInitiallyLegal;
    if(mountEnvelopeInitiallyLegal)
      work.mountEnvelopeMinMouthW=+work.mouthW;
    if(coupledGeometry&&!mountEnvelopeInitiallyLegal&&
        work.twoArch==='radial'){
      /* First keep XO, count and reach fixed and walk mouth size. Compression
         may rise only as required by the existing Mach/HF-area laws, because
         that change also moves the solved station. This is the same legal
         candidate fit used by the coupled loop, but mouth containment gets
         priority over lowering crossover or lengthening a mount. */
      const startMouth=Math.ceil(+work.mouthW||0),
        capMouth=Math.floor(Math.max(startMouth,+work.mouthCap||64)),
        fixedXO=+work.twoXO||p.xo;
      let contained=null;
      for(let mouthW=startMouth;mouthW<=capMouth&&!contained;mouthW++){
        const probe=fastPlan({...work,mouthW,twoXO:fixedXO}),
          requiredCR=ceilHalfStep(clamp(
            probe.cr*probe.tapFraction/0.48,probe.cr,20)),
          maxLegalCR=Math.min(20,probe.maxCrMach);
        if(requiredCR>maxLegalCR+1e-9)continue;
        const q=fastPlan({...work,mouthW,twoXO:fixedXO,
          tapCRW:requiredCR});
        if(baseGeometryLegal(q)&&mountEnvelopeLegal(q))
          contained={mouthW,cr:q.cr,q};
      }
      if(contained){
        work.mouthW=contained.mouthW;
        work.tapCRW=contained.cr;
        work.mountEnvelopeMinMouthW=contained.mouthW;
        reasons.mouthW=
          'smallest mouth that contains every driver bearing and bolt land';
        if(S.tapCRW!==contained.cr)
          reasons.tapCRW=
            'minimum compression that preserves the bearing envelope and strict HF-area law';
        p=contained.q;
        mountMouthSearchPassed=true;
      }
    }
    if(coupledGeometry&&!mountMouthSearchPassed&&
        work.twoArch==='radial'&&
        work.adapterReachMode!=='manual'&&baseGeometryLegal(p)){
      /* Every integer mouth through the declared cap was tested above. A
         slope-invariant profile may therefore need a local radial-cell
         extension. Integrated cells and detachable cartridges share this
         same solver-owned petal reach. Prove the 300 mm hard bound first,
         then bisect to the shortest passing millimetre. */
      const startReach=Math.max(1,Math.ceil(p.adapterReach*1000)),
        capReach=300,
        atCap=fastPlan({...work,adapterReach:capReach});
      if(baseGeometryLegal(atCap)&&mountEnvelopeLegal(atCap)){
        let lo=startReach,hi=capReach;
        while(hi-lo>1){
          const md=Math.floor((lo+hi)/2),
            q=fastPlan({...work,adapterReach:md});
          if(baseGeometryLegal(q)&&mountEnvelopeLegal(q))hi=md;else lo=md;
        }
        work.adapterReach=hi;
        work.mountEnvelopeMinMouthW=+work.mouthW;
        reasons.adapterReach=
          'shortest radial cell extension after mouth-cap containment search';
        p=fastPlan(work);
        mountMouthSearchPassed=mountEnvelopeLegal(p);
      }
    }
    /* Reach, crossover, tap compression and mouth size are coupled: changing
       any one of them can move the tap station and therefore alter all the
       others. Solve that small bounded system to a fixed point in a private
       state, then commit each final knob once. This prevents a solved state
       from taking a second Smart Adapt step while preserving every refusal
       law when no legal package exists. */
    for(let pass=0;pass<16;pass++){
      const before=[work.mouthW,work.twoXO,work.tapCRW,work.adapterReach].join('|'),
        WA=TWO_ARCH[work.twoArch];
      p=fastPlan(work);
      /* Search the smallest mouth / highest crossover that clears the complete
         selected frames and leaves margin under the strict HF-area law.
         Compression, station and mouth are coupled, so test the compression
         implied by each candidate station instead of accepting a loose 55%
         candidate that the 20:1 ceiling cannot actually make legal. Count and
         driver identity remain immutable; impossible packages stay refused. */
      if(coupledGeometry&&
          (work.twoArch==='panel'||mountMouthSearchPassed)){
        const cap=Math.max(work.mouthW,+work.mouthCap||64),
          preferredXO=+work.twoXO||WA.defaults.twoXO;
        let best=null;
        for(let mw=Math.ceil(work.mouthW);mw<=cap&&!best;mw++){
          for(let xo=Math.round(preferredXO/5)*5;
              xo>=Math.max(150,+work.cdFloor||300);xo-=5){
            let q=fastPlan({...work,mouthW:mw,twoXO:xo});
            const requiredCR=ceilHalfStep(clamp(
              q.cr*q.tapFraction/0.48,q.cr,20));
            const maxLegalCR=Math.min(20,q.maxCrMach);
            if(requiredCR>maxLegalCR+1e-9)continue;
            /* Equal-area shape conversion does not imply equal packaging.
               Walk compression in explicit 0.5 steps until the complete
               aperture envelopes preserve the manufacturing web.  This is
               intentionally inside the coupled search: tap fraction, active
               cone reach and web may demand different minimum Ap ratios. */
            let fitted=null;
            /* A panel containment failure is mouth-owned. Permit one
               half-step above the area-derived compression so a quantized
               station does not force an unnecessary extra inch, but never
               use arbitrarily high compression as a hidden packaging lever.
               Beyond that half-step the horn must grow (or refuse at its
               declared cap). */
            const fitCrCeiling=work.twoArch==='panel'
              ?Math.min(maxLegalCR,requiredCR+0.5):maxLegalCR;
            for(let cr=requiredCR;cr<=fitCrCeiling+1e-9;cr+=0.5){
              /* q already represents this exact candidate whenever the
                 area law leaves compression unchanged. Reusing it avoids a
                 second complete corner-plate/annulus solve for every 5 Hz
                 crossover probe without weakening any admission law. */
              const candidate=Math.abs(cr-q.cr)<1e-12
                ?q:fastPlan({...work,mouthW:mw,twoXO:xo,tapCRW:cr});
              if(candidate.tapFraction<=0.50&&
                  (candidate.np!==2||candidate.pairWeb>=candidate.minWeb)&&
                  candidate.maxPortReach<=candidate.frame.activeR-0.002&&
                  /* Compression changes the solved station, so it also
                     changes finite-mouth bearing containment.  Do not stop
                     at the first aperture-only fit and then discard this
                     mouth: a half-step more compression can be the shortest
                     fully legal package (41 in / CR 4.5 is the canonical
                     OS-SE regression). */
                  nonRetentionLegal(candidate)){
                fitted=candidate;break;
              }
            }
            if(!fitted)continue;
            q=fitted;
            if(nonRetentionLegal(q)){
              best={mw,xo,cr:ceilHalfStep(q.cr),q};break;
            }
          }
        }
        if(best){
          if(work.mouthW!==best.mw)
            reasons.mouthW=!mountEnvelopeInitiallyLegal
              ?'smallest mouth that contains every driver bearing and bolt land'
              :'smallest mouth that clears every selected woofer frame';
          if(work.twoXO!==best.xo)
            reasons.twoXO='highest legal crossover that preserves frame clearance and tap phase';
          if(work.tapCRW!==best.cr)
            reasons.tapCRW='minimum compression that keeps total entry area below the strict HF-area law';
          work.mouthW=best.mw;work.twoXO=best.xo;work.tapCRW=best.cr;p=best.q;
          if(!mountEnvelopeInitiallyLegal)
            work.mountEnvelopeMinMouthW=best.mw;
        }
      }
      if(coupledGeometry&&p.tapFraction>0.50){
        const needed=ceilHalfStep(p.cr*p.tapFraction/0.48),
          maxMachCr=Math.max(1.5,Math.floor(p.maxCrMach*2)/2),
          next=clamp(needed,p.cr,Math.min(20,maxMachCr));
        if(work.tapCRW!==next)
          reasons.tapCRW='keep total entry area below 48% of the local horn section';
        work.tapCRW=next;p=fastPlan(work);
      }
      if(coupledGeometry&&work.twoArch==='radial'&&
          work.adapterReachMode!=='manual'&&
          p.adapterReach*1000>(+work.adapterReach||0)+0.6){
        work.adapterReach=Math.ceil(p.adapterReach*1000);
        reasons.adapterReach='separate complete circular driver frames while preserving radial count';
        p=fastPlan(work);
      }
      if(['wPre','odW','nW','twoArch','twoFamily','twoDesign'].includes(key)&&
          work.mouthW<p.minMouthIn){
        work.mouthW=Math.min(work.mouthCap||64,Math.ceil(p.minMouthIn));
        reasons.mouthW='minimum packaging for selected driver/count';
        p=fastPlan(work);
      }
      /* Only an otherwise legal cartridge candidate pays for the exact
         phase/radius solve. If it fails, retention becomes easier
         monotonically with a larger mouth and a lower crossover (more legal
         station distance). Use two integer binary searches instead of
         evaluating all 180×13 layouts at every mouth/XO candidate:

           1. at the lowest legal XO, find the smallest admitted mouth;
           2. at that mouth, recover the highest admitted XO.

         Every binary predicate still executes the complete exact clearance
         search; no web, cap or ownership law is approximated. */
      if(coupledGeometry&&p.cartridge&&nonRetentionLegal(p)&&
          !exactRetention(p)){
        const startMouth=Math.ceil(+work.mouthW||0),
          capMouth=Math.floor(Math.max(startMouth,+work.mouthCap||64)),
          floorXO=Math.ceil(Math.max(150,+work.cdFloor||300)/5)*5,
          preferredXO=Math.max(floorXO,Math.round((+work.twoXO||p.xo)/5)*5),
          retainedCache=new Map(),
          retainedAt=(mouthW,twoXO)=>{
            const cacheKey=mouthW+'|'+twoXO;
            if(retainedCache.has(cacheKey))return retainedCache.get(cacheKey);
            const q=fastPlan({...work,mouthW,twoXO});
            const ok=nonRetentionLegal(q)&&exactRetention(q);
            const result={ok,q};retainedCache.set(cacheKey,result);return result;
          };
        let retained=null;
        const lowStart=retainedAt(startMouth,floorXO);
        if(lowStart.ok)retained={mouthW:startMouth,twoXO:floorXO,q:lowStart.q};
        else if(capMouth>startMouth){
          const lowCap=retainedAt(capMouth,floorXO);
          if(lowCap.ok){
            let lo=startMouth,hi=capMouth;
            while(hi-lo>1){
              const md=Math.floor((lo+hi)/2),probe=retainedAt(md,floorXO);
              if(probe.ok)hi=md;else lo=md;
            }
            retained={mouthW:hi,twoXO:floorXO,
              q:retainedAt(hi,floorXO).q};
          }
        }
        if(retained){
          const steps=Math.max(0,Math.floor((preferredXO-floorXO)/5));
          let lo=0,hi=steps+1;
          while(hi-lo>1){
            const md=Math.floor((lo+hi)/2),
              xo=floorXO+md*5,
              probe=retainedAt(retained.mouthW,xo);
            if(probe.ok)lo=md;else hi=md;
          }
          const highestXO=floorXO+lo*5,
            highest=retainedAt(retained.mouthW,highestXO);
          retained={mouthW:retained.mouthW,twoXO:highestXO,q:highest.q};
          if(work.mouthW!==retained.mouthW)
            reasons.mouthW='smallest mouth that admits exact cartridge retention';
          if(work.twoXO!==retained.twoXO)
            reasons.twoXO='highest crossover admitted by exact cartridge retention';
          work.mouthW=retained.mouthW;
          work.twoXO=retained.twoXO;
          p=retained.q;
        }
      }
      const after=[work.mouthW,work.twoXO,work.tapCRW,work.adapterReach].join('|');
      if(after===before)break;
    }
    /* XO, compression and mouth changes can reduce the shortest radial reach.
       Re-solve AUTO reach from the family baseline after those coupled knobs
       settle, before the dense authority check. Without this final
       normalization, the first pass retained a reach derived from the
       previous compression/XO and only the second solve discovered the
       shorter value (PW-004/PW-057). The dense repair below still grows this
       fresh optimum whenever a narrow unsampled bearing arc requires it. */
    if(compactRadial){
      const WA=TWO_ARCH[work.twoArch],
        baseline=fastPlan({...work,adapterReach:WA.defaults.adapterReach});
      work.adapterReach=Math.ceil(baseline.adapterReach*1000);
      reasons.adapterReach=
        'shortest radial spoke after coupled mouth, crossover and compression settle';
      p=fastPlan(work);
    }
    /* Coarse probes only accelerate candidate search; they are never
       manufacturing authority. Rebuild the committed candidate with the
       dense annulus/bolt-land grid. If a narrow missed arc fails, grow to the
       first dense-passing integer mouth while preserving manual reach. */
    let denseCommitted=densePlan(work);
    if(coupledGeometry&&!mountEnvelopeLegal(denseCommitted)){
      const startMouth=Math.ceil(+work.mouthW||0),
        capMouth=Math.floor(Math.max(startMouth,+work.mouthCap||64)),
        startXO=Math.max(Math.ceil(Math.max(150,+work.cdFloor||300)/5)*5,
          Math.round((+work.twoXO||denseCommitted.xo)/5)*5),
        floorXO=Math.ceil(Math.max(150,+work.cdFloor||300)/5)*5;
      let contained=null;
      for(let mouthW=startMouth;mouthW<=capMouth&&!contained;mouthW++){
        /* A panel bearing can miss the CD flange in a narrow angular arc that
           the coarse candidate probe does not sample. Mouth growth cannot
           repair that slope-invariant collision; moving the tap station
           outward by lowering crossover can. Re-run the same bounded
           highest-XO search with the authoritative dense annulus probe
           instead of returning a false refusal at the coarse boundary. */
        const candidates=work.twoArch==='panel'
          ?Array.from({length:Math.floor((startXO-floorXO)/5)+1},
            (_,index)=>startXO-index*5)
          :[+work.twoXO||denseCommitted.xo];
        for(const twoXO of candidates){
          const q=densePlan({...work,mouthW,twoXO});
          if(baseGeometryLegal(q)&&mountEnvelopeLegal(q)){
            contained={mouthW,twoXO,q};break;
          }
        }
      }
      if(contained){
        if(work.mouthW!==contained.mouthW)
          reasons.mouthW=
            'smallest dense-verified mouth that contains every driver bearing and bolt land';
        if(work.twoXO!==contained.twoXO)
          reasons.twoXO=
            'highest dense-verified crossover that clears the complete CD flange annulus';
        work.mouthW=contained.mouthW;
        work.twoXO=contained.twoXO;
        work.mountEnvelopeMinMouthW=contained.mouthW;
        denseCommitted=contained.q;
      }
    }
    if(coupledGeometry&&!mountEnvelopeLegal(denseCommitted)){
      /* Mouth growth was exhausted. Only an automatic radial petal may grow
         locally—whether integrated or detachable. Panel containment remains
         mouth-owned, and a manually fixed radial reach is refused rather
         than rewritten. */
      if(work.twoArch==='radial'&&work.adapterReachMode!=='manual'){
        const startReach=Math.max(1,
            Math.ceil(denseCommitted.adapterReach*1000)),
          capReach=300,
          atCap=densePlan({...work,adapterReach:capReach});
        if(baseGeometryLegal(atCap)&&mountEnvelopeLegal(atCap)){
          let lo=startReach,hi=capReach;
          while(hi-lo>1){
            const md=Math.floor((lo+hi)/2),
              q=densePlan({...work,adapterReach:md});
            if(baseGeometryLegal(q)&&mountEnvelopeLegal(q))hi=md;else lo=md;
          }
          work.adapterReach=hi;
          reasons.adapterReach=
            'shortest dense-verified integrated cell extension after mouth-cap search';
          denseCommitted=densePlan(work);
        }
      }
    }
    p=denseCommitted;
    for(const k of ['mouthW','twoXO','tapCRW','adapterReach'])
      set(k,work[k],reasons[k]||'settled coupled two-way geometry');
    if(Number.isFinite(+work.mountEnvelopeMinMouthW))
      S.mountEnvelopeMinMouthW=+work.mountEnvelopeMinMouthW;
    else delete S.mountEnvelopeMinMouthW;
    return {S2:S,ledger};
  }

  /* ---------------- implicit constructive solid ---------------- */
  function sdCross(P,x,y,z,offset){
    const st=P.st,xx=clamp(x,0,st.depth),d=M.dimsAt(st,xx);
    const rho=Math.hypot(y,z),phi=Math.atan2(z,y);
    /* A radial offset is not a wall thickness on a steep flare. Smooth
       sections need the local meridian slope at this azimuth. Angular horns
       are different: each bearing panel is a plane, so its two section axes
       need independent normal-thickness projections. A single azimuthal
       radial offset bows the rectangular mouth and turns four planar Hinson
       panels into the pinched/curved frame seen in the viewport. */
    let off=offset,offA=offset,offB=offset;
    if(offset>0){
      const e=Math.max(0.0005,st.depth/600),x0=clamp(xx-e,0,st.depth),
        x1=clamp(xx+e,0,st.depth),den=Math.max(1e-7,x1-x0);
      const q0=sectionPoint(P,x0,phi,0),q1=sectionPoint(P,x1,phi,0),
        sl=Math.abs(Math.hypot(q1[0],q1[1])-Math.hypot(q0[0],q0[1]))/den;
      off=offset*Math.sqrt(1+sl*sl);
      offA=offB=off;
      if((P.S.style==='angular'||P.S.style==='curvedFacets')&&
          (P.S.style==='curvedFacets'||M.panelVerts)){
        const d0=M.dimsAt(st,x0),d1=M.dimsAt(st,x1);
        const sa=Math.abs(d1.a-d0.a)/den,sb=Math.abs(d1.b-d0.b)/den;
        const panelA=offset*Math.sqrt(1+sa*sa),
          panelB=offset*Math.sqrt(1+sb*sb),
          u=clamp(xx/Math.max(1e-6,P.throatMorphL),0,1),
          blend=u*u*u*(10+u*(-15+6*u));
        /* Use the same C² morph that changes the circular throat into the
           panel section to change the wall-thickness projection.  The old
           hard switch at throatMorphL left the inner surface continuous but
           stepped the outer surface, producing a detached ring/fleck in the
           exact printable mesh. */
        offA=lerp(off,panelA,blend);
        offB=lerp(off,panelB,blend);
      }
    }
    const a=d.a+offA,b=d.b+offB,nn=d.n===undefined?st.n:d.n,
      family=st.sectionFamily||P.S.sectionFamily||'superellipse',
      cornerR=family==='roundedRectangle'
        ?d.cornerR+Math.min(offA,offB):d.cornerR;
    if(xx<P.throatMorphL){
      /* Quintic smoothstep has zero first and second derivatives at both ends,
         so the round CD exit does not acquire a kink where it becomes the
         selected true panel or smooth section. */
      const q=sectionPoint(P,xx,phi,offA,offB,off);
      return rho-Math.hypot(q[0],q[1]);
    }
    if(P.S.style==='angular'&&M.panelVerts){
      /* Signed distance to the convex panel perimeter.  This is the printable
         solid itself—not faceted lighting on a rounded superellipse. */
      const V=M.panelVerts(a,b,nn);
      let outside=-Infinity;
      for(let i=0;i<V.length;i++){
        const p=V[i],q=V[(i+1)%V.length],ex=q[0]-p[0],ey=q[1]-p[1],
          L=Math.hypot(ex,ey)||1,nx=ey/L,ny=-ex/L;
        outside=Math.max(outside,(y-p[0])*nx+(z-p[1])*ny);
      }
      return outside;
    }
    /* CURVED FACETS keeps an exact rectangular air section while a(x) and
       b(x) follow the selected nonlinear profile station ladder.  The shared
       section field is also used by preview points, cutters and export. */
    if(P.S.style==='curvedFacets'&&M.sectionLevel2D)
      return M.sectionLevel2D('curvedFacets',a,b,nn,cornerR,y,z);
    if(family==='roundedRectangle'&&M.sectionLevel2D)
      return M.sectionLevel2D(family,a,b,nn,cornerR,y,z);
    const q=sectionPoint(P,xx,phi,off);
    return rho-Math.hypot(q[0],q[1]);
  }

  function retentionDimensions(){
    const R=CARTRIDGE_RETENTION;
    return {
      clearanceD:R.clearanceD,clearanceDMm:R.clearanceD*1000,
      insertBodyEnvelopeD:R.insertBodyEnvelopeD,
      insertBodyEnvelopeDMm:R.insertBodyEnvelopeD*1000,
      insertHoleD:R.insertHoleD,insertHoleDMm:R.insertHoleD*1000,
      insertPocketD:R.insertHoleD,insertPocketDMm:R.insertHoleD*1000,
      insertLength:R.insertLength,insertLengthMm:R.insertLength*1000,
      insertPocketDepth:R.insertPocketDepth,
      insertPocketDepthMm:R.insertPocketDepth*1000,
      counterboreD:R.counterboreD,counterboreDMm:R.counterboreD*1000,
      counterboreDepth:R.counterboreDepth,
      counterboreDepthMm:R.counterboreDepth*1000,
      blindAcousticCap:R.blindAcousticCap,
      blindAcousticCapMm:R.blindAcousticCap*1000,
      minWeb:R.minWeb,minWebMm:R.minWeb*1000,
      bossR:R.bossR,bossRMm:R.bossR*1000,
      bossD:2*R.bossR,bossDMm:2*R.bossR*1000,
      bossDepth:R.bossDepth,bossDepthMm:R.bossDepth*1000
    };
  }

  /* Find a selected inner or outer horn surface along the cartridge's clamp
     axis. The screw centre can be far enough from d.surface that reusing the
     centre-point tangent plane would put an insert partly in air on a curved
     horn. This bracketed projection evaluates the same analytic surface used
     by the exact solid and therefore gives each insert its real local cap. */
  function retentionSurfaceAlong(P,raw,axis,offset){
    const span=Math.max(0.08,P.shellT*8,
        P.drivers.length?P.drivers[0].outerR*0.8:0.08),
      samples=96;
    let priorT=-span,priorP=add(raw,mul(axis,priorT)),
      priorF=sdCross(P,priorP[0],priorP[1],priorP[2],offset),
      bestT=priorT,bestAbs=Math.abs(priorF),bracket=null;
    for(let i=1;i<=samples;i++){
      const t=-span+2*span*i/samples,p=add(raw,mul(axis,t)),
        f=sdCross(P,p[0],p[1],p[2],offset),af=Math.abs(f);
      if(af<bestAbs){bestAbs=af;bestT=t;}
      /* mountN points toward the cartridge, so prefer an inside→outside
         crossing. Retain a reversed bracket only as a numerical fallback. */
      if((priorF<=0&&f>=0)||(priorF>=0&&f<=0)){
        const outward=priorF<=0&&f>=0;
        if(outward||!bracket)bracket={lo:priorT,hi:t,fl:priorF,fh:f,outward};
        if(outward)break;
      }
      priorT=t;priorF=f;
    }
    if(!bracket)return {ok:bestAbs<1e-5,point:add(raw,mul(axis,bestT)),
      t:bestT,residual:bestAbs};
    let {lo,hi,fl}=bracket;
    for(let i=0;i<48;i++){
      const md=(lo+hi)/2,p=add(raw,mul(axis,md)),
        fm=sdCross(P,p[0],p[1],p[2],offset);
      if((fl<=0&&fm<=0)||(fl>=0&&fm>=0)){lo=md;fl=fm;}else hi=md;
    }
    const t=(lo+hi)/2,point=add(raw,mul(axis,t));
    return {ok:true,point,t,
      residual:Math.abs(sdCross(P,point[0],point[1],point[2],offset))};
  }

  function deferredCartridgeRetention(P){
    return {
      schemaVersion:RETENTION_SCHEMA_VERSION,
      active:true,ok:null,pass:null,deferred:true,code:null,
      message:'Retention layout deferred during bounded packaging search.',
      fastener:CARTRIDGE_RETENTION.fastener,
      specifiedCountPerCartridge:CARTRIDGE_RETENTION.screwsPerCartridge,
      countPerCartridge:CARTRIDGE_RETENTION.screwsPerCartridge,
      cartridgeCount:P.drivers.length,totalScrews:0,
      layoutBasis:'root annulus independent of woofer BCD',
      phaseSearch:{phaseSteps:180,radialSteps:13,deterministic:true},
      dimensions:retentionDimensions(),annuli:[],drivers:[]
    };
  }

  function cartridgeRetentionLayout(P){
    const D=retentionDimensions(),R=CARTRIDGE_RETENTION,
      active=P.S.driverCellConstruction==='cartridge',
      base={
        schemaVersion:RETENTION_SCHEMA_VERSION,
        active,ok:true,pass:true,code:null,
        message:active?'':'Integrated driver cells require no cartridge clamp hardware.',
        fastener:R.fastener,
        specifiedCountPerCartridge:R.screwsPerCartridge,
        countPerCartridge:active?R.screwsPerCartridge:0,
        cartridgeCount:active?P.drivers.length:0,totalScrews:0,
        layoutBasis:'root annulus independent of woofer BCD',
        phaseSearch:{phaseSteps:180,radialSteps:13,deterministic:true},
        dimensions:D,annuli:[],drivers:[]
      };
    if(!active)return base;

    const wall=Math.max(0.004,+P.shellT||+P.S.wallT||0.012),
      bossR=R.bossR,pocketR=R.insertHoleD/2,
      insertEnvelopeR=R.insertBodyEnvelopeD/2,
      counterboreR=R.counterboreD/2,
      boltPocketR=P.family==='panel'
        ?P.frame.panelPocketD/2:P.frame.insertPocketD/2,
      compactStart=d=>driverCellRootRadius(P,d,wall),
      annuli=P.drivers.map(d=>{
        /* The boss owns the complete 3.2 mm chamber-side web, and its outer
           edge remains inside the printable driver land. At least 3.2 mm of
           boss overlaps the existing cartridge root so it cannot become a
           decorative floating cylinder. */
        const inner=d.innerR+bossR,
          outer=Math.min(d.outerR-bossR,
            compactStart(d)+bossR-R.minWeb);
        return {index:d.index,innerR:inner,innerRMm:inner*1000,
          outerR:outer,outerRMm:outer*1000,
          rootBodyR:compactStart(d),rootBodyRMm:compactStart(d)*1000,
          valid:outer>=inner};
      });
    base.annuli=annuli;

    const makeTool=(d,rootRadius,phase,screwIndex)=>{
      const theta=phase+screwIndex*Math.PI,
        radialDirection=unit(add(mul(d.flow,Math.cos(theta)),
          mul(d.cross,Math.sin(theta)))),
        raw=add(d.surface,mul(radialDirection,rootRadius)),
        acoustic=retentionSurfaceAlong(P,raw,d.mountN,0),
        outer=retentionSurfaceAlong(P,raw,d.mountN,wall);
      if(!acoustic.ok||!outer.ok)return null;
      const shellSpan=dot(sub(outer.point,acoustic.point),d.mountN);
      if(!(shellSpan>0))return null;
      const hornOuter=outer.point,
        bossA=add(hornOuter,mul(d.mountN,P.gasketGap)),
        bossB=add(bossA,mul(d.mountN,R.bossDepth)),
        hornPocketA=add(hornOuter,mul(d.mountN,0.0008)),
        hornPocketB=add(hornOuter,mul(d.mountN,-R.insertPocketDepth)),
        moduleBoreA=add(bossA,mul(d.mountN,-0.0008)),
        moduleBoreB=add(bossB,mul(d.mountN,0.0008)),
        counterboreA=add(bossB,mul(d.mountN,-R.counterboreDepth)),
        counterboreB=add(bossB,mul(d.mountN,0.0008)),
        center=mul(add(bossA,bossB),0.5),
        blindCap=shellSpan-R.insertPocketDepth;
      return {
        index:screwIndex,driverIndex:d.index,phase,theta,rootRadius,
        rootRadiusMm:rootRadius*1000,center,
        acousticSurfaceCenter:acoustic.point,hornOuterSurfaceCenter:hornOuter,
        axis:[...d.mountN],mountN:[...d.mountN],
        radialDirection,
        hornPocketA,hornPocketB,hornPocketR:pocketR,
        hornPocketD:R.insertHoleD,hornPocketDepth:R.insertPocketDepth,
        insertHoleD:R.insertHoleD,
        insertBodyEnvelopeD:R.insertBodyEnvelopeD,
        insertLength:R.insertLength,
        moduleBoreA,moduleBoreB,moduleBoreR:R.clearanceD/2,
        moduleBoreD:R.clearanceD,
        counterboreA,counterboreB,counterboreR,
        counterboreD:R.counterboreD,
        counterboreDepth:R.counterboreDepth,
        bossA,bossB,bossR,bossD:2*bossR,bossDepth:R.bossDepth,
        shellSpan,shellSpanMm:shellSpan*1000,
        blindCap,blindCapMm:blindCap*1000,
        ownership:{
          horn:['hornPocket'],
          module:['boss','moduleBore','counterbore']
        }
      };
    };

    const scoreLayout=(driverLayouts)=>{
      const tools=driverLayouts.flatMap(x=>x.tools),
        cdA=[-0.014,0,0],cdB=[0.006,0,0];
      for(let i=0;i<driverLayouts.length;i++){
        const d=P.drivers[i],layout=driverLayouts[i],
          annulus=annuli[i];
        for(const tool of layout.tools){
          const clearances={
            annulusInner:tool.rootRadius-annulus.innerR,
            annulusOuter:annulus.outerR-tool.rootRadius,
            blindAcousticCap:tool.blindCap-R.blindAcousticCap,
            hornEnd:Math.min(
              tool.acousticSurfaceCenter[0]-bossR-R.minWeb,
              P.st.depth-tool.acousticSurfaceCenter[0]-bossR-R.minWeb),
            tap:1e6,driverBolt:1e6,cdFlange:1e6,sector:1e6,
            neighbour:1e6,
            insertEnvelopeWeb:bossR-insertEnvelopeR-R.minWeb,
            counterboreBossWeb:bossR-counterboreR-R.minWeb
          };
          /* Reserve the complete counterbore/boss around the canonical tap
             aperture, not merely the aperture centre. */
          for(const q of d.ports){
            const delta=sub(tool.acousticSurfaceCenter,q.center),
              x=dot(delta,q.flow),y=dot(delta,q.cross),
              apertureClear=apertureSdf2D(x,y,q.shape,q.sa,q.sb);
            clearances.tap=Math.min(clearances.tap,apertureClear-bossR);
          }
          /* Woofer bolts retain their own solved phase and BCD. Retention
             never derives from that BCD, but the independent axes must still
             leave a full printable web if the two systems cross the root. */
          for(let k=0;k<P.frame.boltN;k++){
            const ph=(d.boltPhase||0)+k*2*Math.PI/P.frame.boltN,
              boltOffset=add(mul(d.flow,Math.cos(ph)*P.frame.bcd/2),
                mul(d.cross,Math.sin(ph)*P.frame.bcd/2)),
              retentionOffset=sub(tool.acousticSurfaceCenter,d.surface),
              dx=dot(retentionOffset,d.flow)-dot(boltOffset,d.flow),
              dy=dot(retentionOffset,d.cross)-dot(boltOffset,d.cross);
            clearances.driverBolt=Math.min(clearances.driverBolt,
              Math.hypot(dx,dy)-counterboreR-boltPocketR-R.minWeb);
          }
          /* The compression-driver flange is a finite cylinder near the
             throat, not an infinite 2-D keep-out circle. Sample the complete
             short boss axis against that same finite cylinder and reserve the
             boss radius plus the structural web. */
          for(let k=0;k<=8;k++){
            const p=add(tool.bossA,mul(sub(tool.bossB,tool.bossA),k/8));
            clearances.cdFlange=Math.min(clearances.cdFlange,
              sdCylAxis(p,cdA,cdB,P.cdFlangeR)-bossR-R.minWeb);
          }
          if(P.family==='radial'&&P.drivers.length>1){
            /* The superellipse parameter phi is not generally the polar
               angle of its surface point. Centre the retention sector on the
               actual cartridge root vector; using mountN here shifted two
               otherwise identical R06 cartridges across a fictitious seam. */
            const radial=unit([0,d.surface[1],d.surface[2]]),
              tangent=[0,-radial[2],radial[1]],
              radialCoord=dot(tool.center,radial),
              tangentCoord=dot(tool.center,tangent),
              halfSector=Math.PI/P.drivers.length,
              /* Convert the half-plane numerator into true perpendicular
                 distance. The R7.4 boss already contains the complete
                 3.2 mm counterbore web; adding minWeb again here would
                 double-count it and falsely reject legal radial petals. */
              sectorRoom=(radialCoord*Math.tan(halfSector)-
                Math.abs(tangentCoord)-Math.max(P.gasketGap,0.0008)/2)*
                Math.cos(halfSector);
            clearances.sector=sectorRoom-bossR;
          }
          tool.clearances=clearances;
        }
      }
      /* Full bosses from neighbouring cartridges may not share material.
         The same pairwise law also guarantees the two opposite screws in one
         cartridge retain a printable bridge between their counterbores. */
      for(let i=0;i<tools.length;i++)for(let j=i+1;j<tools.length;j++){
        /* Each boss already owns its full counterbore web. Separate printed
           cartridges therefore need boss-envelope clearance plus the gasket
           seam, not a second 3.2 mm material allowance outside both bosses. */
        const gap=len(sub(tools[i].center,tools[j].center))-
          2*bossR-Math.max(P.gasketGap,0.0008);
        tools[i].clearances.neighbour=Math.min(
          tools[i].clearances.neighbour,gap);
        tools[j].clearances.neighbour=Math.min(
          tools[j].clearances.neighbour,gap);
      }
      let margin=1e6,complianceMargin=1e6;
      for(const tool of tools){
        const dynamic=[
          tool.clearances.annulusInner,tool.clearances.annulusOuter,
          tool.clearances.blindAcousticCap,tool.clearances.hornEnd,
          tool.clearances.tap,tool.clearances.driverBolt,
          tool.clearances.cdFlange,tool.clearances.sector,
          tool.clearances.neighbour
        ];
        tool.minimumClearance=Math.min(...dynamic);
        tool.minimumClearanceMm=tool.minimumClearance*1000;
        tool.clearances.minimum=tool.minimumClearance;
        tool.clearancesMm=Object.fromEntries(Object.entries(tool.clearances)
          .map(([key,value])=>[key,value*1000]));
        margin=Math.min(margin,tool.minimumClearance);
        complianceMargin=Math.min(complianceMargin,tool.minimumClearance,
          tool.clearances.insertEnvelopeWeb,
          tool.clearances.counterboreBossWeb);
      }
      return {minimumClearance:margin,complianceMargin};
    };

    let best=null,bestRejected=null,phaseZeroDiagnostic=null;
    if(annuli.every(a=>a.valid)){
      for(let ri=0;ri<base.phaseSearch.radialSteps;ri++){
        /* Start at the annulus centre, then alternate inward/outward. This
           ordering is deterministic; the final choice still maximizes the
           minimum real clearance before using radius/phase tie-breaks. */
        const rank=ri===0?0.5:
          (ri%2?0.5-(ri+1)/(2*(base.phaseSearch.radialSteps-1)):
            0.5+ri/(2*(base.phaseSearch.radialSteps-1)));
        for(let pi=0;pi<base.phaseSearch.phaseSteps;pi++){
          const phase=pi*Math.PI/base.phaseSearch.phaseSteps,
            layouts=[];
          let complete=true;
          for(let i=0;i<P.drivers.length;i++){
            const a=annuli[i],rootRadius=lerp(a.innerR,a.outerR,rank),
              tools=[makeTool(P.drivers[i],rootRadius,phase,0),
                makeTool(P.drivers[i],rootRadius,phase,1)];
            if(tools.some(tool=>!tool)){complete=false;break;}
            layouts.push({index:i,phase,phaseDeg:phase*180/Math.PI,
              rootRadius,rootRadiusMm:rootRadius*1000,tools});
          }
          if(!complete){
            if(ri===0&&pi===0)phaseZeroDiagnostic={complete:false};
            continue;
          }
          const scored=scoreLayout(layouts),
            minimumClearance=scored.minimumClearance,
            candidate={phase,phaseDeg:phase*180/Math.PI,
              radialFraction:rank,minimumClearance,
              minimumClearanceMm:minimumClearance*1000,
              complianceMargin:scored.complianceMargin,
              complianceMarginMm:scored.complianceMargin*1000,
              drivers:layouts};
          if(ri===0&&pi===0)phaseZeroDiagnostic={
            complete:true,minimumClearanceMm:candidate.minimumClearanceMm,
            complianceMarginMm:candidate.complianceMarginMm,
            clearancesMm:layouts.map(layout=>layout.tools.map(tool=>
              tool.clearancesMm))
          };
          const better=(a,b)=>!b||
            a.minimumClearance>b.minimumClearance+1e-12||
            (Math.abs(a.minimumClearance-b.minimumClearance)<=1e-12&&
              (a.radialFraction<b.radialFraction-1e-12||
                (Math.abs(a.radialFraction-b.radialFraction)<=1e-12&&
                  a.phase<b.phase)));
          if(better(candidate,bestRejected))bestRejected=candidate;
          if(scored.complianceMargin>=-1e-9&&better(candidate,best))best=candidate;
        }
      }
    }
    if(!best){
      const rejectedClearances={};
      if(bestRejected)for(const tool of bestRejected.drivers.flatMap(d=>d.tools))
        for(const [key,value] of Object.entries(tool.clearances||{}))
          if(Number.isFinite(value))
            rejectedClearances[key]=rejectedClearances[key]===undefined
              ?value:Math.min(rejectedClearances[key],value);
      return {...base,ok:false,pass:false,
        code:'CARTRIDGE_RETENTION_NO_LAYOUT',
        message:'No deterministic two-screw M4 root-annulus layout preserves the insert cap, counterbore, tap, driver-pocket, sector and 3.2 mm web laws.',
        totalScrews:0,drivers:[],
        diagnostics:{
          annuliValid:annuli.every(a=>a.valid),
          bestRejectedMargin:bestRejected?bestRejected.minimumClearance:-1,
          bestRejectedMarginMm:bestRejected
            ?bestRejected.minimumClearanceMm:-1000,
          bestRejectedComplianceMargin:bestRejected
            ?bestRejected.complianceMargin:-1,
          bestRejectedComplianceMarginMm:bestRejected
            ?bestRejected.complianceMarginMm:-1000,
          bestRejectedPhaseDeg:bestRejected?bestRejected.phaseDeg:0,
          phaseZero:phaseZeroDiagnostic,
          bestRejectedClearances:rejectedClearances,
          bestRejectedClearancesMm:Object.fromEntries(
            Object.entries(rejectedClearances)
              .map(([key,value])=>[key,value*1000]))
        }};
    }
    const drivers=best.drivers.map(layout=>({
      ...layout,
      minimumClearance:best.minimumClearance,
      minimumClearanceMm:best.minimumClearanceMm
    }));
    return {...base,ok:true,pass:true,code:null,
      message:'Two phase-solved M4 clamp screws retain each cartridge on its root annulus.',
      totalScrews:P.drivers.length*R.screwsPerCartridge,
      solvedPhase:best.phase,solvedPhaseDeg:best.phaseDeg,
      radialFraction:best.radialFraction,
      minimumClearance:best.minimumClearance,
      minimumClearanceMm:best.minimumClearanceMm,
      complianceMargin:best.complianceMargin,
      complianceMarginMm:best.complianceMarginMm,
      drivers};
  }

  function sdCylAxis(p,a,b,r){
    const ab=sub(b,a),L=len(ab)||1e-9,n=mul(ab,1/L),ap=sub(p,a),t=dot(ap,n);
    const radial=len(sub(ap,mul(n,t)))-r;
    return Math.max(radial,-t,t-L);
  }
  function driverReliefEnvelopeRadius(d){
    const stations=d.cell&&d.cell.coneProfile&&
        d.cell.coneProfile.relief&&
        d.cell.coneProfile.relief.cavityStations,
      stationRadius=Array.isArray(stations)&&stations.length
        ?Math.max(...stations.map(item=>Math.max(0,+item.radiusM||0))):0;
    return Math.max(stationRadius,d.coneTipR||0,
      d.frame&&d.frame.activeR?d.frame.activeR+0.002:0);
  }
  function driverCellRootRadius(P,d,wall){
    /* A cartridge root is a structural annulus around the actual cone-relief
       envelope, not around the smaller planning chamber radius. If its taper
       is narrower than the relief where that cutter begins, subtraction
       erases an axial slice and deterministically creates two printable
       bodies. Preserve the declared cell/minimum web at that first station;
       the outer driver land remains the hard packaging cap. */
    const detachablePanel=P.family==='panel'&&
        P.S.driverCellConstruction==='cartridge',
      structuralWeb=detachablePanel
        ?P.panelRootWeb:Math.max(P.minWeb,d.cellSkin||0),
      retentionRecord=P.retention&&P.retention.active&&
        P.retention.drivers.find(item=>item.index===d.index),
      bossExtent=retentionRecord&&retentionRecord.tools.length
        ?Math.max(...retentionRecord.tools.map(tool=>
          tool.rootRadius+tool.bossR)):0,
      /* The horn-side neck is the wall around every selected passage, not a
         decorative boss at the woofer axis.  Measure the complete aperture
         envelope in the mounting plane and retain the same structural web
         that the rest of the printed cell declares.  In particular, a
         two-entry face cell must span both displaced racetracks; using only
         d.innerR produced the narrow stalk visible between otherwise
         full-diameter driver lands. */
      tapFootprint=driverTapFootprintRadius(d),
      required=Math.max(
        driverReliefEnvelopeRadius(d)+structuralWeb,
        tapFootprint+structuralWeb,
        bossExtent,
        d.innerR+P.adapterRootWeb),
      /* A detachable panel collar is a module-side bearing structure; horn
         wall thickness must not truncate it. Its real cap is the selected
         driver land. Other adapter families retain the half-wall clearance
         used by their conformal/angular packing contract. */
      cap=P.family==='panel'?d.outerR:d.outerR-wall*0.5;
    return Math.min(cap,Math.max(required,
      d.innerR+P.adapterRootWeb,d.outerR*0.42));
  }
  function driverTapFootprintRadius(d){
    if(!d||!Array.isArray(d.ports)||!d.ports.length)return 0;
    const axis=unit(d.mountN);
    return Math.max(...d.ports.flatMap(q=>
      apertureOutline(q,96).map(([u,v])=>{
        const boundary=add(q.center,
            add(mul(q.flow,u),mul(q.cross,v))),
          rel=sub(boundary,d.surface),
          transverse=sub(rel,mul(axis,dot(rel,axis)));
        return len(transverse);
      })));
  }
  function projectTapToWall(P,base,guideN){
    let span=0.040,lo=-span,hi=span;
    const at=t=>add(base,mul(guideN,t));
    let fl=sdCross(P,...at(lo),0),fh=sdCross(P,...at(hi),0);
    for(let k=0;k<5&&!(fl<=0&&fh>=0);k++){
      span*=1.8;lo=-span;hi=span;
      fl=sdCross(P,...at(lo),0);fh=sdCross(P,...at(hi),0);
    }
    if(!(fl<=0&&fh>=0))return base;
    for(let k=0;k<36;k++){
      const md=(lo+hi)/2,fm=sdCross(P,...at(md),0);
      if(fm<0)lo=md;else hi=md;
    }
    return at((lo+hi)/2);
  }
  function tapChamberOverlapBounds(P,d,q,wall){
    const minimumM=Math.max(0.0025,
        Math.min(0.006,q.sb*0.50)),
      /* The driver cone begins behind the gasket/bearing datum.  Keep the
         canonical centreline at least two millimetres inside the generated
         front chamber and subsequently cap the Boolean segment itself at
         that same bearing plane.  The former unbounded 12–24 mm overlap was
         12.6 mm beyond driverFace in the six-W5 case. */
      bearingClearanceM=Math.max(0.002,
        Math.min(0.004,(P.frame&&P.frame.gasketT||0.0016)+0.0004)),
      availableM=dot(sub(d.driverFace,d.cavInner),d.mountN)-
        bearingClearanceM,
      requestedM=Math.max(0.012,
        Math.min(0.024,wall*1.10+q.sb*0.20)),
      maximumM=Math.max(minimumM,
        Math.min(requestedM,availableM));
    return {
      minimumM,maximumM,requestedM,bearingClearanceM,
      availableM,feasible:availableM>=minimumM-1e-9
    };
  }
  /* The shortest panel manifold is a three-line polyline: wall normal,
     direct wall-to-cell chord, then a finite mount-normal terminal.  Leaving
     its two vertices sharp makes the finite-prism Boolean truthful but gives
     it 59–93 degree acoustic elbows.  A full-span Bezier fixes the elbows at
     the cost of hidden path length, infeasible pair intervals, and an
     O(sectionCount²) analytic-union shader.

     Replace only those two vertices with exact tangent circular fillets. The
     entry trim cannot consume the final 1 mm wall-exit guard. The terminal
     trim retains more than half of the explicit straight run into the cone
     chamber. Adaptive arc subdivision holds every finite turn at or below
     25 degrees; the six-W5 corner fixture needs at most ten sections. */
  function boundedPanelFilletPath(wallPt,curveStart,curveEnd,
      chamberPoint,q){
    const maximumTurnAllowed=Math.PI*25/180,
      incoming=unit(sub(curveStart,wallPt)),
      direct=unit(sub(curveEnd,curveStart)),
      terminal=unit(sub(chamberPoint,curveEnd)),
      entryLength=len(sub(curveStart,wallPt)),
      directLength=len(sub(curveEnd,curveStart)),
      terminalLength=len(sub(chamberPoint,curveEnd)),
      entryAngle=Math.acos(clamp(dot(incoming,direct),-1,1)),
      terminalAngle=Math.acos(clamp(dot(direct,terminal),-1,1));
    let entryTrim=Math.min(0.002,entryLength*0.45,
        directLength*0.18,Math.max(0.0008,q.sb*0.40)),
      terminalTrim=Math.min(0.004,terminalLength*0.45,
        directLength*0.18,Math.max(0.0008,q.sb*0.65));
    const trimBudget=Math.max(0,directLength*0.55),
      trimSum=entryTrim+terminalTrim;
    if(trimSum>trimBudget&&trimSum>1e-12){
      const scale=trimBudget/trimSum;
      entryTrim*=scale;
      terminalTrim*=scale;
    }
    const arc=(vertex,inDirection,outDirection,trim,angle)=>{
      if(trim<1e-8||angle<1e-7)
        return {
          points:[vertex],segmentCount:0,
          radius:Infinity,trim:0,angle
        };
      const tangent=Math.tan(angle/2),
        radius=trim/Math.max(1e-9,tangent),
        start=add(vertex,mul(inDirection,-trim)),
        end=add(vertex,mul(outDirection,trim)),
        bisector=unit(sub(outDirection,inDirection)),
        center=add(vertex,mul(bisector,
          radius/Math.max(1e-9,Math.cos(angle/2)))),
        radial=sub(start,center),
        radialEnd=sub(end,center),
        axis=unit(cross(radial,radialEnd)),
        central=Math.acos(clamp(
          dot(radial,radialEnd)/
            Math.max(1e-18,len(radial)*len(radialEnd)),-1,1)),
        segmentCount=Math.max(1,
          Math.ceil(central/maximumTurnAllowed)),
        points=[];
      for(let index=0;index<=segmentCount;index++){
        const phase=central*index/segmentCount,
          cosine=Math.cos(phase),sine=Math.sin(phase),
          rotated=add(add(mul(radial,cosine),
            mul(cross(axis,radial),sine)),
            mul(axis,dot(axis,radial)*(1-cosine)));
        points.push(add(center,rotated));
      }
      return {points,segmentCount,radius,trim,angle:central};
    },
      entry=arc(curveStart,incoming,direct,entryTrim,entryAngle),
      exit=arc(curveEnd,direct,terminal,terminalTrim,terminalAngle),
      points=[wallPt];
    if(entry.segmentCount)points.push(...entry.points);
    else points.push(curveStart);
    if(exit.segmentCount){
      const last=points[points.length-1],
        first=exit.points[0];
      if(len(sub(last,first))>1e-9)points.push(first);
      points.push(...exit.points.slice(1));
    }else points.push(curveEnd);
    points.push(chamberPoint);
    const sectionAxes=points.slice(1).map((point,index)=>
        unit(sub(point,points[index]))),
      maximumTurn=sectionAxes.slice(1).reduce((maximum,axis,index)=>
        Math.max(maximum,Math.acos(clamp(
          dot(sectionAxes[index],axis),-1,1))),0);
    return {
      schemaVersion:1,kind:'bounded-local-circular-fillet',
      points,wallEnd:points[1],entry,exit,
      sectionCount:points.length-1,maximumTurn,
      maximumTurnAllowed
    };
  }
  function canonicalPanelTapPath(P,d,q,overlapM,setbackM=0){
    const wall=Math.max(0.004,+P.S.wallT||0.012),
      coneNormalStraight=P.family==='panel'&&
        P.S.driverMountMode==='shortest',
      shiftedCavity=add(d.cavInner,mul(d.mountN,setbackM)),
      shiftedFace=add(d.driverFace,mul(d.mountN,setbackM)),
      wallPt=projectTapToWall(P,q.center,q.normal),
      n=q.normal,
      rel=sub(wallPt,d.surface),
      rawFlow=dot(rel,d.flow),rawCross=dot(rel,d.cross),
      rawLat=Math.hypot(rawFlow,rawCross),
      radial=rawLat>1e-12
        ?unit(add(mul(d.flow,rawFlow),mul(d.cross,rawCross)))
        :[0,0,0],
      support=apertureProjectedSupport(q,radial),
      maxLat=Math.max(0.001,d.innerR-support-P.minWeb),
      latScale=rawLat>maxLat?maxLat/rawLat:1,
      chamberLateralScale=Number.isFinite(q.chamberLateralScale)
        ?clamp(q.chamberLateralScale,-1,1):1,
      cornerDatum=d.cornerPlate&&d.cornerPlate.active
        ?d.cornerPlate.tapDatums.find(item=>item.tapIndex===q.index):null,
      /* A shortest printed panel tap is one cone-normal Boolean tool.  Its
         chamber endpoint is the mount-axis projection of the exact horn-wall
         station, so both taps under a driver are parallel and perpendicular
         to the driver plane.  The automatic pair clamp above guarantees that
         their finite chamber-overlap intervals intersect.  Extended
         manifolds retain the explicit routed path below. */
      chamberBase=coneNormalStraight
        ?add(wallPt,mul(d.mountN,
          dot(sub(shiftedCavity,wallPt),d.mountN)))
        :cornerDatum
          ?add(cornerDatum.chamberTarget,mul(d.mountN,setbackM))
          :add(add(shiftedCavity,
              mul(d.flow,rawFlow*latScale*chamberLateralScale)),
            mul(d.cross,rawCross*latScale*chamberLateralScale)),
      overlapBounds=tapChamberOverlapBounds(P,{
        ...d,cavInner:shiftedCavity,driverFace:shiftedFace
      },q,wall);
    if(coneNormalStraight){
      const axis=unit(d.mountN),
        frame=orthogonalFrame(axis,d.flow,d.cross),
        overlap=clamp(overlapM,
          overlapBounds.minimumM,overlapBounds.maximumM),
        toCavityPlaneM=dot(sub(shiftedCavity,wallPt),axis),
        chamberPoint=add(wallPt,mul(axis,
          toCavityPlaneM+overlap)),
        incidenceCos=dot(axis,q.normal),
        transverseSupportM=apertureSupport(q,
          dot(q.normal,frame.u),dot(q.normal,frame.v)),
        /* The Boolean prism begins far enough behind the oblique acoustic
           wall that every point of the selected ellipse/racetrack outline
           crosses the shell, plus a finite 0.4 mm meshing guard.  Acoustic
           length still begins at wallPt; this exterior tail is not a delay. */
        wallBackoffM=(transverseSupportM+0.0004)/
          Math.max(1e-9,incidenceCos),
        bearingClearanceM=dot(sub(shiftedFace,chamberPoint),axis),
        shiftedDriver={...d,cavInner:shiftedCavity,
          driverFace:shiftedFace},
        cavOuter=add(shiftedFace,mul(axis,0.002)),
        outline=apertureOutline(q,144),
        reliefSamples=[[0,0],...outline],
        maximumReliefSdfM=Math.max(...reliefSamples.map(([u,v])=>
          sdConeRelief(add(chamberPoint,add(
            mul(frame.u,u),mul(frame.v,v))),
          shiftedDriver,cavOuter))),
        reliefMarginM=-maximumReliefSdfM,
        centerlineContained=bearingClearanceM>=
          overlapBounds.bearingClearanceM-1e-9,
        cutterEndpointContained=bearingClearanceM>=-1e-9&&
          maximumReliefSdfM<=1e-9,
        points=[wallPt,chamberPoint],
        lengthM=len(sub(chamberPoint,wallPt));
      return {
        schemaVersion:1,kind:'straight-cone-normal',
        points,lengthM,wallPt,curveStart:wallPt,chamberPoint,
        filletPath:null,overlapBounds,bearingClearanceM,
        terminalLength:lengthM,curveEnd:wallPt,
        terminalSupportM:0,terminalEndOverlapM:0,
        terminalCutterClearanceM:bearingClearanceM,
        centerlineContained,cutterEndpointContained,
        endpointContained:centerlineContained&&
          cutterEndpointContained,
        axis,frame,wallBackoffM,transverseSupportM,
        wallIncidenceCos:incidenceCos,
        wallIncidenceDeg:Math.acos(clamp(incidenceCos,-1,1)),
        wallTraversalM:wall/Math.max(1e-9,incidenceCos),
        toCavityPlaneM,solvedOverlapM:overlap,
        reliefMarginM,maximumReliefSdfM,
        chamberDiscContained:maximumReliefSdfM<=1e-9,
        chamberCapMaximumSdf:maximumReliefSdfM,
        reliefSampleCount:reliefSamples.length
      };
    }
    let chamberPoint=add(chamberBase,mul(d.mountN,
      clamp(overlapM,overlapBounds.minimumM,overlapBounds.maximumM)));
    const outerEnvelope=p=>Math.max(
        sdCross(P,p[0],p[1],p[2],wall),
        -p[0],p[0]-P.st.depth),
      targetClear=Math.max(0.002,Math.min(0.004,q.sb*0.25)),
      room=Math.max(0,dot(sub(shiftedFace,chamberPoint),d.mountN)-
        overlapBounds.bearingClearanceM);
    if(outerEnvelope(chamberPoint)<targetClear&&room>0){
      let lo=0,hi=room;
      if(outerEnvelope(add(chamberPoint,mul(d.mountN,hi)))>=targetClear){
        for(let it=0;it<36;it++){
          const md=(lo+hi)/2;
          if(outerEnvelope(add(chamberPoint,mul(d.mountN,md)))<
              targetClear)lo=md;else hi=md;
        }
        chamberPoint=add(chamberPoint,mul(d.mountN,hi));
      }
    }
    const curveStart=add(wallPt,mul(n,P.family==='panel'
        ?wall+0.003:Math.max(0.002,wall*0.72))),
      span=len(sub(chamberPoint,curveStart)),
      terminalLength=Math.max(0.006,
        Math.min(0.016,span*0.16)),
      curveEnd=add(chamberPoint,mul(d.mountN,-terminalLength)),
      filletPath=P.family==='panel'
        ?boundedPanelFilletPath(
          wallPt,curveStart,curveEnd,chamberPoint,q)
        :null,
      c1=add(curveStart,mul(n,
        Math.max(0.008,Math.min(0.035,span*0.38)))),
      c2=add(curveEnd,mul(d.mountN,
        -Math.max(0.006,Math.min(0.024,span*0.24)))),
      curvePoints=[];
    if(!filletPath)for(let j=0;j<=4;j++)
      curvePoints.push(bezier3(curveStart,c1,c2,curveEnd,j/4));
    const points=filletPath
        ?filletPath.points
        :[wallPt,curveStart,...curvePoints.slice(1),chamberPoint],
      lengthM=points.slice(1).reduce((sum,point,index)=>
        sum+len(sub(point,points[index])),0),
      bearingClearanceM=dot(sub(shiftedFace,chamberPoint),d.mountN),
      terminalAxis=unit(sub(chamberPoint,curveEnd)),
      terminalFrame=orthogonalFrame(terminalAxis,q.flow,q.cross),
      terminalSupportM=apertureSupport(q,
        dot(d.mountN,terminalFrame.u),
        dot(d.mountN,terminalFrame.v)),
      terminalAxial=Math.max(1e-9,dot(terminalAxis,d.mountN)),
      terminalJointOverlapM=Math.max(0.00045,
        Math.min(0.016,q.boundR*0.45)),
      terminalRoomM=bearingClearanceM-terminalSupportM-0.0004,
      terminalEndOverlapM=Math.max(0,
        Math.min(terminalJointOverlapM,
          terminalRoomM/terminalAxial)),
      terminalCutterClearanceM=bearingClearanceM-
        terminalEndOverlapM*terminalAxial-terminalSupportM,
      centerlineContained=bearingClearanceM>=
        overlapBounds.bearingClearanceM-1e-9,
      cutterEndpointContained=terminalCutterClearanceM>=-1e-9;
    return {
      points,lengthM,wallPt,curveStart,chamberPoint,filletPath,
      overlapBounds,bearingClearanceM,terminalLength,curveEnd,
      terminalSupportM,terminalEndOverlapM,
      terminalCutterClearanceM,centerlineContained,
      cutterEndpointContained,
      endpointContained:centerlineContained&&cutterEndpointContained
    };
  }
  function solvePanelPairChamberScales(P,drivers){
    /* On a smooth, non-rotational flare the two wall entries of one driver
       can encounter different generatrices. Keep both exterior apertures
       fixed and equalize their shortest direct routes by moving only the
       shorter route's chamber-side target inside the already-declared cone
       chamber. This is a straight-path endpoint solve, not hidden meander. */
    if(P.family!=='panel'||P.panelTopology||drivers.length<=2)return;
    const wall=Math.max(0.004,+P.S.wallT||0.012),
      interval=(d,q,scale)=>{
        q.chamberLateralScale=scale;
        const bounds=tapChamberOverlapBounds(P,d,q,wall),
          a=canonicalPanelTapPath(P,d,q,bounds.minimumM),
          b=canonicalPanelTapPath(P,d,q,bounds.maximumM),
          low=Math.min(a.lengthM,b.lengthM),
          high=Math.max(a.lengthM,b.lengthM);
        return {low,high};
      },
      gap=(a,b)=>Math.max(0,a.low-b.high,b.low-a.high);
    for(const d of drivers){
      if(d.ports.length!==2)continue;
      const first=interval(d,d.ports[0],1),
        second=interval(d,d.ports[1],1);
      if(gap(first,second)<=0.00002)continue;
      const firstLong=(first.low+first.high)>=(second.low+second.high),
        fixedIndex=firstLong?0:1,solvedIndex=firstLong?1:0,
        fixed=firstLong?first:second,
        solvedPort=d.ports[solvedIndex];
      let best={scale:1,interval:firstLong?second:first,
        gap:gap(fixed,firstLong?second:first)};
      /* The one-dimensional target is cheap and bounded. A coarse complete
         search prevents false monotonic assumptions at a curved shell; a
         local ternary refinement then makes the result deterministic. */
      const samples=64;
      for(let i=0;i<=samples;i++){
        const scale=1-2*i/samples,item=interval(d,solvedPort,scale),
          value=gap(fixed,item);
        if(value<best.gap-1e-12||
            (Math.abs(value-best.gap)<=1e-12&&scale>best.scale))
          best={scale,interval:item,gap:value};
      }
      const step=2/samples;
      let lo=Math.max(-1,best.scale-step),
        hi=Math.min(1,best.scale+step);
      for(let iteration=0;iteration<40;iteration++){
        const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3,
          ia=interval(d,solvedPort,a),ib=interval(d,solvedPort,b),
          ga=gap(fixed,ia),gb=gap(fixed,ib);
        if(ga<=gb)hi=b;else lo=a;
      }
      const scale=(lo+hi)/2,item=interval(d,solvedPort,scale),
        value=gap(fixed,item);
      if(value<best.gap+1e-10)best={scale,interval:item,gap:value};
      solvedPort.chamberLateralScale=best.scale;
      d.ports[fixedIndex].chamberLateralScale=1;
      d.pairChamberEndpointSolve={
        schemaVersion:1,active:true,
        fixedTapIndex:fixedIndex,solvedTapIndex:solvedIndex,
        solvedLateralScale:best.scale,
        residualIntervalGapM:best.gap,
        feasible:best.gap<=0.00002
      };
    }
  }
  function solvePanelDifferentialSetbacks(P,drivers,baselineReachM,
      requestedExtraM){
    const inactive={
      schemaVersion:1,active:false,feasible:true,
      centerlineFeasible:true,cutterEndpointFeasible:true,
      basis:'not required for this construction',
      targetLengthM:null,maximumAdditionalSetbackM:0,
      drivers:drivers.map(d=>({
        driverIndex:d.index,baselineReachM,
        additionalSetbackM:0,solvedReachM:d.adapterReach,
        endpointContained:true,paths:[]
      }))
    };
    if(P.family!=='panel'||drivers.length<=2)return inactive;
    const maximumAdditionalSetbackM=Math.max(0,0.250-requestedExtraM),
      intervalAt=(d,setbackM)=>{
        const paths=d.ports.map(q=>{
          const bounds=tapChamberOverlapBounds(P,d,q,
              Math.max(0.004,+P.S.wallT||0.012)),
            minimum=canonicalPanelTapPath(P,d,q,bounds.minimumM,setbackM),
            maximum=canonicalPanelTapPath(P,d,q,bounds.maximumM,setbackM);
          const candidates=[minimum,maximum].sort((a,b)=>
            a.lengthM-b.lengthM);
          return {
            tapIndex:q.index,bounds,
            minimumLengthM:candidates[0].lengthM,
            maximumLengthM:candidates[1].lengthM,
            minimumEndpointContained:minimum.endpointContained,
            maximumEndpointContained:maximum.endpointContained,
            centerlineFeasible:minimum.centerlineContained&&
              maximum.centerlineContained,
            cutterEndpointFeasible:
              minimum.cutterEndpointContained&&
              maximum.cutterEndpointContained,
            terminalCutterClearanceM:
              Math.min(minimum.terminalCutterClearanceM,
                maximum.terminalCutterClearanceM),
            minimumTerminalCutterClearanceM:
              Math.min(minimum.terminalCutterClearanceM,
                maximum.terminalCutterClearanceM),
            feasible:bounds.feasible&&
              minimum.endpointContained&&maximum.endpointContained
          };
        });
        return {
          paths,
          intervalMinM:Math.max(...paths.map(path=>path.minimumLengthM)),
          intervalMaxM:Math.min(...paths.map(path=>path.maximumLengthM)),
          centerlineFeasible:paths.every(path=>
            path.bounds.feasible&&path.centerlineFeasible),
          cutterEndpointFeasible:paths.every(path=>
            path.cutterEndpointFeasible),
          endpointContained:paths.every(path=>
            path.bounds.feasible&&path.minimumEndpointContained&&
            path.maximumEndpointContained)
        };
      },
      baseline=drivers.map(d=>intervalAt(d,0)),
      targetLengthM=Math.max(...baseline.flatMap(item=>
        item.paths.map(path=>path.minimumLengthM))),
      records=[];
    let centerlineFeasible=true,cutterEndpointFeasible=true,
      feasible=true;
    for(let index=0;index<drivers.length;index++){
      const d=drivers[index],atZero=baseline[index];
      let setbackM=0,solved=atZero;
      if(atZero.intervalMaxM<targetLengthM-0.00002){
        const atCap=intervalAt(d,maximumAdditionalSetbackM);
        if(atCap.intervalMaxM<targetLengthM-0.00002){
          feasible=false;solved=atCap;setbackM=maximumAdditionalSetbackM;
        }else{
          let lo=0,hi=maximumAdditionalSetbackM;
          for(let iteration=0;iteration<52;iteration++){
            const mid=(lo+hi)/2,item=intervalAt(d,mid);
            if(item.intervalMaxM<targetLengthM)lo=mid;else hi=mid;
          }
          setbackM=(lo+hi)/2;
          solved=intervalAt(d,setbackM);
        }
      }
      const containsTarget=solved.intervalMinM<=targetLengthM+0.00002&&
          solved.intervalMaxM>=targetLengthM-0.00002,
        endpointContained=solved.endpointContained;
      centerlineFeasible=centerlineFeasible&&containsTarget&&
        solved.centerlineFeasible;
      cutterEndpointFeasible=cutterEndpointFeasible&&
        solved.cutterEndpointFeasible;
      feasible=feasible&&containsTarget&&endpointContained&&
        solved.centerlineFeasible&&solved.cutterEndpointFeasible;
      if(setbackM>0){
        d.driverFace=add(d.driverFace,mul(d.mountN,setbackM));
        d.cavInner=add(d.cavInner,mul(d.mountN,setbackM));
        d.adapterReach+=setbackM;
        d.cellT+=setbackM;
      }
      d.automaticDifferentialSetbackM=setbackM;
      records.push({
        driverIndex:d.index,baselineReachM,
        additionalSetbackM:setbackM,solvedReachM:d.adapterReach,
        intervalMinM:solved.intervalMinM,
        intervalMaxM:solved.intervalMaxM,
        centerlineFeasible:solved.centerlineFeasible,
        cutterEndpointFeasible:solved.cutterEndpointFeasible,
        feasible:containsTarget&&endpointContained&&
          solved.centerlineFeasible&&solved.cutterEndpointFeasible,
        endpointContained,containsTarget,paths:solved.paths
      });
    }
    return {
      schemaVersion:1,active:true,feasible,
      centerlineFeasible,cutterEndpointFeasible,
      basis:'minimum common reach plus shortest per-cell differential setback',
      targetLengthM,maximumAdditionalSetbackM,
      maximumSolvedReachM:Math.max(...records.map(item=>item.solvedReachM)),
      maximumAdditionalSolvedM:
        Math.max(...records.map(item=>item.additionalSetbackM)),
      drivers:records
    };
  }
  function sdFrustum(p,a,b,ra,rb){
    const ab=sub(b,a),L=len(ab)||1e-9,n=mul(ab,1/L),ap=sub(p,a),t=dot(ap,n);
    const tc=clamp(t,0,L),r=lerp(ra,rb,tc/L),radial=len(sub(ap,mul(n,t)))-r;
    return Math.max(radial,-t,t-L);
  }
  function sdConeRelief(p,d,cavOuter){
    const relief=d.cell&&d.cell.coneProfile&&d.cell.coneProfile.relief,
      stations=relief&&relief.cavityStations;
    if(!Array.isArray(stations)||stations.length<2)
      return sdFrustum(p,d.cavInner,cavOuter,d.coneTipR,
        d.frame.activeR+0.002);
    let cavity=Infinity;
    for(let i=1;i<stations.length;i++){
      const a=stations[i-1],b=stations[i],
        pa=add(d.driverFace,mul(d.mountN,-a.depthFromFaceM)),
        pb=add(d.driverFace,mul(d.mountN,-b.depthFromFaceM));
      cavity=Math.min(cavity,sdFrustum(p,pa,pb,a.radiusM,b.radiusM));
    }
    const face=stations[stations.length-1],
      facePoint=add(d.driverFace,mul(d.mountN,-face.depthFromFaceM));
    cavity=Math.min(cavity,
      sdFrustum(p,facePoint,cavOuter,face.radiusM,face.radiusM));
    return cavity;
  }
  function sdTorusAxis(p,c,n,R,r){
    const q=sub(p,c),ax=dot(q,n),rr=len(sub(q,mul(n,ax)));
    return Math.hypot(rr-R,ax)-r;
  }
  function sdAnnularGroove(p,c,n,R,halfWidth,halfDepth){
    const q=sub(p,c),ax=dot(q,n),rr=len(sub(q,mul(n,ax)));
    return Math.max(Math.abs(rr-R)-halfWidth,Math.abs(ax)-halfDepth);
  }
  function sdSlotTube(p,a,b,u,v,sa,sb,shape){
    const ab=sub(b,a),L=len(ab)||1e-9,w=mul(ab,1/L),ap=sub(p,a),t=dot(ap,w);
    const q=sub(ap,mul(w,t)),x=dot(q,u),y=dot(q,v);
    const d2=apertureSdf2D(x,y,shape,sa,sb);
    return Math.max(d2,-t,t-L);
  }
  function orthogonalFrame(axis,preferredU,preferredV){
    const w=unit(axis);
    let u=sub(preferredU||[0,1,0],mul(w,dot(preferredU||[0,1,0],w)));
    if(len(u)<1e-7){
      const seed=Math.abs(w[0])<0.8?[1,0,0]:[0,1,0];
      u=sub(seed,mul(w,dot(seed,w)));
    }
    u=unit(u);
    let v=unit(cross(w,u));
    if(preferredV&&dot(v,preferredV)<0){u=mul(u,-1);v=mul(v,-1);}
    return {u,v,w};
  }
  function bezier3(a,b,c,d,t){
    const s=1-t,s2=s*s,t2=t*t;
    return [
      a[0]*s2*s+3*b[0]*s2*t+3*c[0]*s*t2+d[0]*t2*t,
      a[1]*s2*s+3*b[1]*s2*t+3*c[1]*s*t2+d[1]*t2*t,
      a[2]*s2*s+3*b[2]*s2*t+3*c[2]*s*t2+d[2]*t2*t
    ];
  }
  function sdChamferUnion(a,b,r){
    /* Finite 45° physical blend between two cavities. Unlike a component
       filter this changes the exact solid: only the local region where both
       SDFs are within r can be removed. */
    return Math.min(a,b,(a+b-Math.max(0,r))*Math.SQRT1_2);
  }
  function minAll(a){let m=Infinity;for(const x of a)if(x<m)m=x;return m;}

  function solidField(P,detachable,partIndex){
    const S=P.S,wall=Math.max(0.004,+P.shellT||+S.wallT||0.012),st=P.st;
    /* The Boolean zero set can only cross a grid cell whose sampled solid
       distance is close to zero.  Keep a four-cell guard before taking any
       broad-phase exit so the marcher still receives the complete local CSG
       field around every printable/cavity surface.  Samples farther away
       cannot participate in a zero-crossing cell at either certified mesh
       step, and need not pay for four complete horn-section evaluations. */
    const broadPhaseMargin=4*MESH_LIMITS.display.step;
    const throatR=(+S.td||+S.throat||1.4)*IN/2;
    /* UI/catalog mounting dimensions are millimetres; acoustic dimensions
       such as wallT are metres.  Treating the 152 mm DCX464 flange as 152 m
       created an effectively infinite black slab and clipped the print box. */
    const flangeR=compressionFlangeRadius(S,throatR);
    const xPad=Math.max(0.010,wall);
    const cdA=[-0.014,0,0],cdB=[0.006,0,0];
    const boltBCD=+S.cdBCD>0?+S.cdBCD/1000:((+S.td||1.4)>=2?0.127:0.102);
    const boltN=(S.cdBoltN|0)||4,cdBoltD=(+S.cdBoltD>0?+S.cdBoltD/1000:0.0065);
    const gap=P.gasketGap;
    const hasCells=P.family==='radial'||detachable;
    const includeHorn=!detachable||partIndex===undefined||partIndex===null||partIndex===0;
    const includeCell=i=>hasCells&&
      (!detachable||partIndex===undefined||partIndex===null||partIndex===i+1);
    const retentionTools=detachable&&P.retention&&P.retention.active&&
      P.retention.ok
      ?P.drivers.map(d=>{
        const record=P.retention.drivers.find(x=>x.index===d.index);
        return record?record.tools:[];
      })
      :P.drivers.map(()=>[]);
    /* Conservative per-cell AABBs are much cheaper than evaluating four
       vector-heavy frustum/section CSGs for every point in a mouth-sized
       Cartesian grid.  Both structural endpoints are expanded by the full
       driver land radius plus the same zero-crossing guard, so skipping an
       evaluation outside this box cannot remove any cell surface. */
    const cellBroadBounds=P.drivers.map(d=>{
      const radius=d.outerR+broadPhaseMargin,
        points=[d.surface,d.driverFace,d.cavInner],
        lo=[Infinity,Infinity,Infinity],
        hi=[-Infinity,-Infinity,-Infinity];
      for(const point of points)for(let axis=0;axis<3;axis++){
        lo[axis]=Math.min(lo[axis],point[axis]-radius);
        hi[axis]=Math.max(hi[axis],point[axis]+radius);
      }
      return {lo,hi};
    });
    const insideCellBroadBounds=(p,index)=>{
      const bounds=cellBroadBounds[index];
      return p[0]>=bounds.lo[0]&&p[0]<=bounds.hi[0]&&
        p[1]>=bounds.lo[1]&&p[1]<=bounds.hi[1]&&
        p[2]>=bounds.lo[2]&&p[2]<=bounds.hi[2];
    };
    const driverCellRootDiagnostics=P.drivers.map(d=>{
      const active=detachable&&P.family==='panel',
        reliefRadius=driverReliefEnvelopeRadius(d),
        rootRadius=driverCellRootRadius(P,d,wall),
        tools=retentionTools[d.index]||[],
        minimumCounterboreOuterLigament=tools.length
          ?Math.min(...tools.map(tool=>
            rootRadius-(tool.rootRadius+tool.counterboreR))):Infinity,
        reliefWeb=rootRadius-reliefRadius,
        reliefWebPass=!active||
          reliefWeb>=P.panelRootWeb-1e-12,
        retentionLigamentPass=!active||!tools.length||
          minimumCounterboreOuterLigament>=
            CARTRIDGE_RETENTION.minWeb-1e-12,
        pass=!active||(reliefWebPass&&retentionLigamentPass&&
          rootRadius<=d.outerR+1e-12);
      return {
        schemaVersion:1,driverIndex:d.index,active,
        basis:'post-cutter annular spine around cone relief and M4 counterbores',
        reliefRadius,rootRadius,outerLandRadius:d.outerR,
        requiredReliefWeb:P.panelRootWeb,reliefWeb,reliefWebPass,
        requiredCounterboreOuterLigament:CARTRIDGE_RETENTION.minWeb,
        minimumCounterboreOuterLigament:
          Number.isFinite(minimumCounterboreOuterLigament)
            ?minimumCounterboreOuterLigament:null,
        retentionLigamentPass,pass
      };
    });
    const radialInsertDepth=d=>Math.max(0.006,Math.min(d.flangeT-0.001,
      P.frame.insertPocketD*0.80));
    const cellBody=(p,d)=>{
      /* Integrated radial cells and removable panel/radial cartridges share
         one registered, cone-following body contract. Integrated panel cells
         remain part of the driver-bearing horn wall and use the plate branch
         below. */
      const start=detachable
        ?(d.cartridgeStart||add(d.surface,mul(d.mountN,wall+gap)))
        /* A radial adapter is a coaxial loft on the radial driver axis.
           Centering its root on the unrelated horn-wall normal twists the
           taper, makes the fastener bores oblique to their own flange, and
           creates the “flying plate”/crescent failures. The root extends
           inward on mountN and is clipped at the acoustic surface below. */
        :add(d.surface,mul(d.mountN,-Math.max(d.innerR,wall)));
      /* A mount is an adapter, not a full-diameter cylinder rammed through
         the flare.  Its horn-side footprint surrounds the complete tap
         envelope; it expands to the driver gasket land only at the mounting
         face.  This keeps the shortest legal adapter connected without
         intruding into adjacent horn panels. */
      const compactStart=driverCellRootRadius(P,d,wall);
      /* The root already encloses the complete chamber opening plus its
         solved printable web. Expanding an integrated root almost to the
         driver-land radius makes a radial-axis disc reach far across x; on a
         conical throat that oversized disc can graze the shell again near the
         CD and leave a closed, disconnected one-voxel fleck. Keep the same
         acoustically sufficient compact root for both constructions. The
         integrated-only rootBridge below supplies the deliberate shell
         overlap instead of relying on an accidental remote tangency. */
      const startR=compactStart,
        flangeInner=add(d.driverFace,mul(d.mountN,-d.flangeT)),
        overlap=Math.min(0.002,d.flangeT*0.25),
        /* The cone relief removes the centre of the module. If the structural
           taper reaches the full driver radius only at driverFace, the
           constant-radius flange annulus that begins one flange-thickness
           earlier has no load path and becomes a second printable body.
           Finish the taper inside the flange using the already-declared
           overlap on both sides of flangeInner. */
        taperEnd=add(flangeInner,mul(d.mountN,overlap)),
        taper=sdFrustum(p,start,taperEnd,startR,d.outerR),
        flange=sdCylAxis(p,add(flangeInner,mul(d.mountN,-overlap)),
          d.driverFace,d.outerR),
        /* Give an integrated petal a volumetric root through the middle of
           the horn shell. A mount-axis frustum can otherwise only kiss a
           steep flare tangentially after the acoustic-air clipping step,
           yielding one watertight but disconnected island per woofer. This
           short capsule overlaps both the shell thickness and the existing
           taper; the final bounded-air clip still prevents any protrusion
           into the horn. */
        shellRoot=add(d.surface,mul(d.wallN,wall*0.45)),
        taperRoot=add(d.surface,mul(d.mountN,Math.max(0.012,wall))),
        rootBridge=sdCylAxis(p,shellRoot,taperRoot,
          Math.max(0.010,Math.min(startR*0.72,d.innerR*0.92))),
        unboundedBody=Math.min(taper,flange,
          detachable?Infinity:rootBridge);
      /* Removable radial adapters tile around the HF hub as true petals.
         Clip each one to its equal angular Voronoi sector, with a gasket seam
         between neighbours. This retains a circular driver land whenever the
         packaging solver says it fits, while preventing the intermediate
         adapter lofts from crossing one another behind the horn. */
      let body=unboundedBody;
      if(detachable&&P.family==='radial'&&P.drivers.length>1){
        const radial=[0,d.mountN[1],d.mountN[2]],
          tangent=[0,-radial[2],radial[1]],
          radialCoord=dot(p,radial),
          tangentCoord=dot(p,tangent),
          halfSector=Math.PI/P.drivers.length,
          seam=Math.max(gap,0.0008),
          sector=Math.max(Math.abs(tangentCoord)+seam/2-
            radialCoord*Math.tan(halfSector),-radialCoord);
        body=Math.max(body,sector);
      }
      if(body>broadPhaseMargin)return body;
      /* Every land/module belongs behind the acoustic surface. A raw frustum
         union crossing a panel or curved wall can leave the exact interior
         artifacts reported in the review renders. Only tap cutters cross it. */
      const boundedAir=Math.max(sdCross(P,p[0],p[1],p[2],0),
        -p[0],p[0]-st.depth);
      /* A detachable module receives the horn's real curved outer surface,
         not a flat tangent approximation. Clip it outside the shell plus the
         declared gasket gap so no petal can intersect the horn away from its
         centreline. Integrated petals retain a small shell overlap and are
         unioned into one printable body. */
      const boundedJoint=Math.max(
        sdCross(P,p[0],p[1],p[2],wall+(detachable?gap:0)),
        -p[0],p[0]-st.depth);
      return Math.max(body,detachable?-boundedJoint:-boundedAir);
    };
    /* Precompute the physical tap cutters once. Long radial stadium entries
       cannot be represented by one flat extrusion on a curved flare: its two
       ends graze different wall depths. Project a short chain of overlapping
       round bores onto the real surface instead, producing one smooth
       rounded-end passage that follows the horn and joins the front chamber.
       A corner plate uses that same fixed-cost sweep between its face-owned
       horn cut and canonical chamber target; ordinary one-face panel slots
       remain literal straight router cuts through a flat facet. */
    const tapTools=P.drivers.map(d=>d.ports.map(q=>{
      const cornerDatum=d.cornerPlate&&d.cornerPlate.active
        ?d.cornerPlate.tapDatums.find(item=>item.tapIndex===q.index):null;
      const extendedPathActive=
        P.S.driverMountMode==='extended-manifold'&&
        (P.driverManifold.extraReachM>1e-9||
          len(sub(d.mountN,d.wallN))>1e-8),
        /* On a smooth flare, the off-centre aperture normal is not the
           driver's centre mount axis.  Extending that normal as one straight
           router cut can cross the horn wall yet pass entirely in front of
           the cone chamber—the exact failure visible as a bright slot with
           no speaker connection.  It therefore needs the same canonical
           wall-to-chamber sweep as a corner or turned manifold.  A genuinely
           planar face retains its literal straight through-cut below. */
        smoothPanelAdapter=P.family==='panel'&&!P.panelTopology,
        /* A panel array with more than one opposed pair is not one repeated
           planar datum: seam cells and face cells encounter different local
           generatrices.  Leaving only the seam cells on the equalizer made
           the live six-woofer shortest manifold report eight equalized paths
           while its two planar cells remained short straight cuts.  Route
           every path in a multi-cell panel array through the same canonical
           swept/equalizer record so the exact admission law measures—and
           physically creates—all selected paths on one length target. */
        multiCellPanelEqualizer=P.family==='panel'&&P.drivers.length>2,
        shortestPanelStraight=P.family==='panel'&&
          P.S.driverMountMode==='shortest',
        pathEqualizerActive=extendedPathActive||
          P.family==='radial'||!!cornerDatum||smoothPanelAdapter||
          multiCellPanelEqualizer;
      if(P.family==='radial'||cornerDatum||extendedPathActive||
          smoothPanelAdapter||multiCellPanelEqualizer||
          shortestPanelStraight){
        /* One canonical aperture is swept from the acoustic wall into the
           cone chamber. The former oval/slot implementation expanded the
           outline into an aspect-ratio-dependent chain of round cylinders;
           large apertures therefore created hundreds of cutters, froze the
           worker, and no longer matched the selected mouth. This fixed-cost
           sweep preserves the exact round/ellipse/racetrack section at every
           stage and is independent of driver count or aspect ratio. */
        const wallPt=projectTapToWall(P,q.center,q.normal),
          ph=Math.atan2(wallPt[2],wallPt[1]);
        let n=P.family==='panel'?q.normal:unit(M.surfN(st,wallPt[0],ph));
        if(dot(n,q.normal)<0)n=mul(n,-1);
        const lipDepth=Math.max(0.010,Math.min(0.035,0.006+q.boundR*0.40)),
          overlapBounds=tapChamberOverlapBounds(P,d,q,wall),
          chamberOverlap=overlapBounds.maximumM,
          rel=sub(wallPt,d.surface),
          rawFlow=dot(rel,d.flow),rawCross=dot(rel,d.cross),
          rawLat=Math.hypot(rawFlow,rawCross),
          radial=rawLat>1e-12
            ?unit(add(mul(d.flow,rawFlow),mul(d.cross,rawCross)))
            :[0,0,0],
          support=apertureProjectedSupport(q,radial),
          maxLat=Math.max(0.001,d.innerR-support-P.minWeb),
          latScale=rawLat>maxLat?maxLat/rawLat:1,
          chamberLateralScale=Number.isFinite(q.chamberLateralScale)
            ?clamp(q.chamberLateralScale,-1,1):1;
        let chamberPoint=shortestPanelStraight
          ?add(wallPt,mul(d.mountN,
            dot(sub(d.cavInner,wallPt),d.mountN)+chamberOverlap))
          :cornerDatum
            ?add(cornerDatum.chamberTarget,mul(d.mountN,chamberOverlap))
            :add(add(add(d.cavInner,
                mul(d.flow,rawFlow*latScale*chamberLateralScale)),
                mul(d.cross,rawCross*latScale*chamberLateralScale)),
                mul(d.mountN,chamberOverlap));
        const outerEnvelope=p=>Math.max(
            sdCross(P,p[0],p[1],p[2],wall),-p[0],p[0]-st.depth),
          room=Math.max(0,dot(sub(d.driverFace,chamberPoint),d.mountN)-
            overlapBounds.bearingClearanceM),
          targetClear=Math.max(0.002,Math.min(0.004,q.sb*0.25));
        if(outerEnvelope(chamberPoint)<targetClear&&room>0){
          let lo=0,hi=room;
          if(outerEnvelope(add(chamberPoint,mul(d.mountN,hi)))>=targetClear){
            for(let it=0;it<36;it++){
              const md=(lo+hi)/2;
              if(outerEnvelope(add(chamberPoint,mul(d.mountN,md)))<
                  targetClear)lo=md;else hi=md;
            }
            chamberPoint=add(chamberPoint,mul(d.mountN,hi));
          }
        }
        if(shortestPanelStraight){
          const axis=d.mountN,
            frame=orthogonalFrame(axis,q.flow,q.cross),
            incidence=Math.max(1e-6,dot(axis,q.normal)),
            transverseSupport=apertureSupport(q,
              dot(q.normal,frame.u),dot(q.normal,frame.v)),
            exteriorGuard=0.0004,
            exteriorBackoff=(transverseSupport+exteriorGuard)/
              incidence,
            wallIn=add(wallPt,mul(axis,-exteriorBackoff)),
            section={
              a:wallIn,b:chamberPoint,
              u:frame.u,v:frame.v,sa:q.sa,sb:q.sb,
              shape:q.shape,stage:'straight-cone-normal'
            },
            minimumChamberOverlap=overlapBounds.minimumM,
            resolvedChamberOverlap=dot(sub(chamberPoint,d.cavInner),
              d.mountN),
            canonical=canonicalPanelTapPath(
              P,d,q,resolvedChamberOverlap,0);
          return {
            kind:'swept-aperture',
            geometryMode:'straight-cone-normal',
            sections:[section],
            centerlinePoints:[wallPt,chamberPoint],
            shape:q.shape,sa:q.sa,sb:q.sb,
            equalizer:pathEqualizerActive?{
              active:true,geometryMode:'straight-cone-normal',
              wallPt,wallIn,n,q,chamberPoint,mountN:d.mountN,
              preferredU:q.flow,preferredV:q.cross,
              exteriorBackoff,
              maxRetreatM:Math.max(0,
                resolvedChamberOverlap-minimumChamberOverlap),
              requestedChamberOverlapM:resolvedChamberOverlap,
              minimumChamberOverlapM:minimumChamberOverlap,
              maximumChamberOverlapM:overlapBounds.maximumM,
              bearingFace:d.driverFace,
              bearingClearanceRequiredM:
                overlapBounds.bearingClearanceM,
              solvedRetreatM:0,
              chamberDiscContained:canonical.chamberDiscContained,
              chamberCapMaximumSdf:canonical.chamberCapMaximumSdf,
              endpointContained:canonical.endpointContained,
              feasible:overlapBounds.feasible&&
                canonical.endpointContained
            }:null,
            chamberTarget:null,mountFaceId:q.mountFaceId
          };
        }
        /* Consecutive constant-section sweeps meet on a bent centreline.
           Their outside edges need support·tan(turn/2) of overlap or a closed
           lens of solid can remain between them—the visible “layer inside
           the tap”.  Compute that overlap only at the actual curved joints.
           A large global overlap would push a downstream segment back into
           the horn wall and consume the web beside a perfectly legal entry. */
        const baseOverlap=Math.max(0.00045,
            Math.min(0.0015,q.sb*0.16)),
          jointGuard=0.00050,maxJointOverlap=0.016,
          /* The terminal section opens into a much wider cone chamber rather
             than another equal section.  Carry it far enough into that
             already-subtracted chamber to prevent a thin closed diaphragm
             between the lumen and cone relief.  This extension is wholly on
             the chamber side; it cannot consume entry-wall web. */
          chamberJointOverlap=Math.max(baseOverlap,
            Math.min(maxJointOverlap,q.boundR*0.45)),
          section=(a,b,preferredU,preferredV,stage,
              startOverlap=baseOverlap,endOverlap=baseOverlap)=>{
            const axis=sub(b,a),L=Math.max(1e-9,len(axis)),w=mul(axis,1/L),
              f=orthogonalFrame(axis,preferredU,preferredV);
            return {
              a:add(a,mul(w,-startOverlap)),
              b:add(b,mul(w,endOverlap)),
              u:f.u,v:f.v,sa:q.sa,sb:q.sb,shape:q.shape,stage};
          },
          wallIn=add(wallPt,mul(n,-lipDepth)),
          wallOut=add(wallPt,mul(n,wall+0.003)),
          curveStart=add(wallPt,mul(n,P.family==='panel'
            ?wall+0.003:Math.max(0.002,wall*0.72))),
          span=len(sub(chamberPoint,curveStart)),
          /* Finish every adapter with a finite straight run parallel to the
             driver mounting normal. A Bezier tangent alone is insufficient:
             its last finite chord remains oblique, so the aperture's
             transverse support can cross the bearing plane even when the
             centreline endpoint is legal. */
          terminalLength=Math.max(0.006,
            Math.min(0.016,span*0.16)),
          curveEnd=add(chamberPoint,mul(d.mountN,-terminalLength)),
          filletPath=P.family==='panel'
            ?boundedPanelFilletPath(
              wallPt,curveStart,curveEnd,chamberPoint,q)
            :null,
          c1=add(curveStart,mul(n,
            Math.max(0.008,Math.min(0.035,span*0.38)))),
          c2=add(curveEnd,mul(d.mountN,
            -Math.max(0.006,Math.min(0.024,span*0.24)))),
          curveIntervals=4,
          curvePoints=[];
        if(!filletPath)for(let j=0;j<=curveIntervals;j++)
          curvePoints.push(bezier3(curveStart,c1,c2,curveEnd,
            j/curveIntervals));
        const wallExit=filletPath?filletPath.wallEnd:wallOut,
          adapterPoints=filletPath
            ?filletPath.points.slice(1)
            :[...curvePoints,chamberPoint],
          adapterSegments=adapterPoints.slice(0,-1).map((point,index)=>{
            const next=adapterPoints[index+1],
              axis=unit(sub(next,point)),
              frame=orthogonalFrame(axis,q.flow,q.cross);
            return {point,next,axis,frame};
          }),
          overlapForJoint=(item,next)=>{
            const cosine=clamp(dot(item.axis,next.axis),-1,1),
              turn=Math.acos(cosine);
            if(turn<1e-7)return baseOverlap;
            const bend=unit(sub(item.axis,next.axis)),
              support=Math.max(
                apertureSupport(q,dot(bend,item.frame.u),
                  dot(bend,item.frame.v)),
                apertureSupport(q,dot(bend,next.frame.u),
                  dot(bend,next.frame.v)));
            return clamp(support*Math.tan(turn/2)+jointGuard,
              baseOverlap,maxJointOverlap);
          },
          wallAxis=unit(sub(wallExit,wallIn)),
          wallFrame=orthogonalFrame(wallAxis,q.flow,q.cross),
          entryJointOverlap=overlapForJoint(
            {axis:wallAxis,frame:wallFrame},adapterSegments[0]),
          jointOverlaps=adapterSegments.slice(0,-1).map((item,index)=>
            overlapForJoint(item,adapterSegments[index+1])),
          /* Segment overlap is cutter robustness only; it cannot extend the
             physical lumen through the driver-bearing datum. Account for
             both axial cap overtravel and the tilted aperture support when
             limiting the final section. */
          terminalEndOverlap=item=>{
            const axial=Math.max(1e-9,dot(item.axis,d.mountN)),
              transverse=apertureSupport(q,
                dot(d.mountN,item.frame.u),
                dot(d.mountN,item.frame.v)),
              room=dot(sub(d.driverFace,item.next),d.mountN)-
                transverse-0.0004;
            return Math.max(0,Math.min(chamberJointOverlap,
              room/axial));
          },
          /* Keep the oblique adapter out of the structural shell. Supply the
             bend-joining overlap by extending the straight wall cutter
             forward, never by pulling the adapter backwards through the web
             beside the exterior aperture. */
          sections=[section(wallIn,wallExit,q.flow,q.cross,'wall',
            baseOverlap,entryJointOverlap)];
        for(let j=0;j<adapterSegments.length;j++){
          const item=adapterSegments[j],
            /* A bend joint has one Boolean-overlap owner: the upstream
               section extends forward across the vertex. Pulling the
               downstream section backward by the same allowance doubles the
               overlap and, at a 16 mm terminal turn, can drag the chamber
               cutter back through the horn shell and consume the web beside
               an otherwise legal tap. */
            startOverlap=0,
            endOverlap=j<jointOverlaps.length
              ?jointOverlaps[j]:terminalEndOverlap(item);
          sections.push(section(item.point,item.next,
            q.flow,q.cross,'adapter',startOverlap,endOverlap));
        }
        const minimumChamberOverlap=overlapBounds.minimumM,
          resolvedChamberOverlap=dot(sub(chamberPoint,d.cavInner),
            d.mountN);
        return {kind:'swept-aperture',sections,
          /* Acoustic length follows the non-overlapped canonical sweep, not
             the deliberately extended Boolean section caps. */
          centerlinePoints:filletPath?filletPath.points:[
            wallPt,curveStart,...adapterPoints.slice(1)
          ],
          shape:q.shape,sa:q.sa,sb:q.sb,
          equalizer:pathEqualizerActive?{
            active:true,wallPt,wallIn,curveStart,n,q,
            chamberPoint,mountN:d.mountN,
            preferredU:q.flow,preferredV:q.cross,
            baseOverlap,jointGuard,maxJointOverlap,chamberJointOverlap,
            maxRetreatM:Math.max(0,
              resolvedChamberOverlap-minimumChamberOverlap),
            requestedChamberOverlapM:resolvedChamberOverlap,
            minimumChamberOverlapM:minimumChamberOverlap,
            maximumChamberOverlapM:overlapBounds.maximumM,
            bearingFace:d.driverFace,
            bearingClearanceRequiredM:
              overlapBounds.bearingClearanceM,
            solvedRetreatM:0,
            endpointContained:dot(sub(d.driverFace,chamberPoint),
              d.mountN)>=overlapBounds.bearingClearanceM-1e-9,
            feasible:overlapBounds.feasible
          }:null,
          chamberTarget:cornerDatum?cornerDatum.chamberTarget:null,
          mountFaceId:q.mountFaceId};
      }
      const axialToChamber=Math.max(0,
          dot(sub(d.cavInner,q.center),q.normal)),
        overlapBounds=tapChamberOverlapBounds(P,d,q,wall),
        /* A literal planar router cut still terminates inside the declared
           cone chamber; it is not permission to drill through the complete
           driver-bearing plane. */
        through=Math.max(d.panelT+0.0025,
          axialToChamber+overlapBounds.maximumM);
      const lipDepth=P.family==='panel'?0.006:
        Math.max(0.010,Math.min(0.030,0.006+q.sa*0.35));
      return {kind:'straight',a:add(q.center,mul(q.normal,-lipDepth)),
        b:add(q.center,mul(q.normal,through)),u:q.flow,v:q.cross,
        centerlinePoints:[q.center,
          add(q.center,mul(q.normal,through))],
        sa:q.sa,sb:q.sb,shape:q.shape};
    }));
    /* A finite non-circular horn is not rotationally invariant: six equally
       spaced cells on a squircle encounter different local generatrices.
       Giving every plate the same standoff therefore does not, by itself,
       give every lumen the same acoustic length.  Canonical radial/corner
       sweeps and extended panel manifolds use their already-declared chamber
       overlap as a trimming allowance.  The
       physical swept cutter is rebuilt (not merely relabelled) so every path
       ends at one common centre-line length while retaining at least the
       minimum overlap into the cone chamber.  If those intervals do not
       intersect, exact diagnostics refuse manufacturing. */
    const pathLength=points=>points.slice(1).reduce((sum,point,index)=>
        sum+len(sub(point,points[index])),0),
      equalizerGeometry=(tool,retreat)=>{
        const e=tool.equalizer,
          chamberPoint=add(e.chamberPoint,mul(e.mountN,-retreat));
        if(e.geometryMode==='straight-cone-normal'){
          const axis=e.mountN,
            frame=orthogonalFrame(axis,e.preferredU,e.preferredV),
            wallIn=add(e.wallPt,mul(axis,-e.exteriorBackoff));
          return {
            sections:[{
              a:wallIn,b:chamberPoint,
              u:frame.u,v:frame.v,
              sa:tool.sa,sb:tool.sb,shape:tool.shape,
              stage:'straight-cone-normal'
            }],
            centerlinePoints:[e.wallPt,chamberPoint]
          };
        }
        const span=len(sub(chamberPoint,e.curveStart)),
          terminalLength=Math.max(0.006,
            Math.min(0.016,span*0.16)),
          curveEnd=add(chamberPoint,mul(e.mountN,-terminalLength)),
          filletPath=P.family==='panel'
            ?boundedPanelFilletPath(
              e.wallPt,e.curveStart,curveEnd,chamberPoint,e.q)
            :null,
          c1=add(e.curveStart,mul(e.n,
            Math.max(0.008,Math.min(0.035,span*0.38)))),
          c2=add(curveEnd,mul(e.mountN,
            -Math.max(0.006,Math.min(0.024,span*0.24)))),
          curveIntervals=4,
          curvePoints=[],
          section=(a,b,stage,startOverlap=e.baseOverlap,
              endOverlap=e.baseOverlap)=>{
            const axis=sub(b,a),L=Math.max(1e-9,len(axis)),
              w=mul(axis,1/L),
              f=orthogonalFrame(axis,e.preferredU,e.preferredV);
            return {a:add(a,mul(w,-startOverlap)),
              b:add(b,mul(w,endOverlap)),
              u:f.u,v:f.v,sa:tool.sa,sb:tool.sb,
              shape:tool.shape,stage};
          };
        if(!filletPath)for(let j=0;j<=curveIntervals;j++)
          curvePoints.push(bezier3(e.curveStart,c1,c2,curveEnd,
            j/curveIntervals));
        const adapterPoints=filletPath
            ?filletPath.points.slice(1)
            :[...curvePoints,chamberPoint],
          segments=adapterPoints.slice(0,-1).map((point,index)=>{
            const next=adapterPoints[index+1],
              axis=unit(sub(next,point)),
              frame=orthogonalFrame(axis,e.preferredU,e.preferredV);
            return {point,next,axis,frame};
          }),
          overlapForJoint=(item,next)=>{
            const cosine=clamp(dot(item.axis,next.axis),-1,1),
              turn=Math.acos(cosine);
            if(turn<1e-7)return e.baseOverlap;
            const bend=unit(sub(item.axis,next.axis)),
              support=Math.max(
                apertureSupport(tool,dot(bend,item.frame.u),
                  dot(bend,item.frame.v)),
                apertureSupport(tool,dot(bend,next.frame.u),
                  dot(bend,next.frame.v)));
            return clamp(support*Math.tan(turn/2)+e.jointGuard,
              e.baseOverlap,e.maxJointOverlap);
          },
          wallAxis=unit(sub(tool.sections[0].b,tool.sections[0].a)),
          wallFrame=orthogonalFrame(wallAxis,
            e.preferredU,e.preferredV),
          entryOverlap=overlapForJoint(
            {axis:wallAxis,frame:wallFrame},segments[0]),
          overlaps=segments.slice(0,-1).map((item,index)=>
            overlapForJoint(item,segments[index+1])),
          terminalEndOverlap=item=>{
            const axial=Math.max(1e-9,dot(item.axis,e.mountN)),
              transverse=apertureSupport(tool,
                dot(e.mountN,item.frame.u),
                dot(e.mountN,item.frame.v)),
              room=dot(sub(e.bearingFace,item.next),e.mountN)-
                transverse-0.0004;
            return Math.max(0,Math.min(e.chamberJointOverlap,
              room/axial));
          },
          adapterSections=segments.map((item,index)=>
            section(item.point,item.next,'adapter',
              0,
              index<overlaps.length
                ?overlaps[index]:terminalEndOverlap(item)));
        return {
          sections:[
            filletPath
              ?section(e.wallIn,filletPath.wallEnd,'wall',
                e.baseOverlap,entryOverlap)
              :tool.sections[0],
            ...adapterSections
          ],
          centerlinePoints:filletPath?filletPath.points:[
            e.wallPt,e.curveStart,...adapterPoints.slice(1)
          ]
        };
      },
      equalizedTools=tapTools.flat().filter(tool=>
        tool.equalizer&&tool.equalizer.active),
      tapPathEqualization={
        active:equalizedTools.length>0,
        feasible:true,targetLengthM:null,
        intervalMinM:null,intervalMaxM:null,
        pathCount:equalizedTools.length
      };
    if(equalizedTools.length){
      const records=equalizedTools.map(tool=>{
          const endpointLength0M=pathLength(tool.centerlinePoints),
            minimumGeometry=equalizerGeometry(tool,
              tool.equalizer.maxRetreatM),
            endpointLengthCapM=pathLength(
              minimumGeometry.centerlinePoints),
            minimumLengthM=Math.min(endpointLength0M,
              endpointLengthCapM),
            maximumLengthM=Math.max(endpointLength0M,
              endpointLengthCapM);
          return {tool,maximumLengthM,minimumLengthM,
            endpointLength0M,endpointLengthCapM};
        }),
        intervalMinM=Math.max(...records.map(item=>item.minimumLengthM)),
        intervalMaxM=Math.min(...records.map(item=>item.maximumLengthM)),
        feasible=records.every(item=>item.tool.equalizer.feasible)&&
          intervalMinM<=intervalMaxM+0.00002,
        /* The common path is the shortest point in the intersecting legal
           intervals.  Longer overlaps remain available for Boolean joining,
           but do not become hidden acoustic ballast. */
        targetLengthM=P.differentialSetback&&
          P.differentialSetback.active?intervalMinM:intervalMaxM;
      Object.assign(tapPathEqualization,{
        feasible,targetLengthM,intervalMinM,intervalMaxM
      });
      for(const record of records){
        const e=record.tool.equalizer;
        e.feasible=feasible&&
          record.minimumLengthM<=targetLengthM+0.00002;
        e.targetLengthM=targetLengthM;
        e.minimumLengthM=record.minimumLengthM;
        e.maximumLengthM=record.maximumLengthM;
        if(!e.feasible)continue;
        let lo=0,hi=e.maxRetreatM,retreat=0;
        if(Math.abs(record.endpointLength0M-targetLengthM)>1e-9){
          for(let iteration=0;iteration<48;iteration++){
            const mid=(lo+hi)/2,
              geometry=equalizerGeometry(record.tool,mid),
              lengthM=pathLength(geometry.centerlinePoints);
            if(record.endpointLengthCapM>=record.endpointLength0M){
              if(lengthM<targetLengthM)lo=mid;else hi=mid;
            }else{
              if(lengthM>targetLengthM)lo=mid;else hi=mid;
            }
          }
          retreat=(lo+hi)/2;
        }
        const geometry=equalizerGeometry(record.tool,retreat);
        record.tool.sections=geometry.sections;
        record.tool.centerlinePoints=geometry.centerlinePoints;
        e.solvedRetreatM=retreat;
        e.solvedChamberOverlapM=
          e.requestedChamberOverlapM-retreat;
        e.solvedLengthM=pathLength(geometry.centerlinePoints);
        e.solvedEndpointClearanceM=dot(sub(e.bearingFace,
          geometry.centerlinePoints[
            geometry.centerlinePoints.length-1]),e.mountN);
        e.endpointContained=e.solvedEndpointClearanceM>=
          e.bearingClearanceRequiredM-1e-9;
      }
    }
    for(const tools of tapTools)for(const tool of tools){
      const sections=tool.kind==='swept-aperture'?tool.sections:[tool];
      tool.jointBlendRadius=tool.kind==='swept-aperture'&&sections.length>1
        ?Math.min(0.0012,P.minWeb*0.33,
          Math.min(...sections.map(section=>section.sb))*0.25)
        :0;
    }
    const tapEndpointAudit=P.drivers.flatMap(d=>
      tapTools[d.index].map((tool,tapIndex)=>{
        const sections=tool.kind==='swept-aperture'
            ?tool.sections:[tool],
          terminal=sections[sections.length-1],
          centreline=tool.centerlinePoints&&
              tool.centerlinePoints.length
            ?tool.centerlinePoints[tool.centerlinePoints.length-1]
            :terminal.b,
          centrelineClearanceM=dot(sub(d.driverFace,centreline),
            d.mountN),
          cutterSupportM=apertureSupport(tool,
            dot(d.mountN,terminal.u),dot(d.mountN,terminal.v)),
          cutterClearanceM=dot(sub(d.driverFace,terminal.b),
            d.mountN)-cutterSupportM,
          requiredCentrelineClearanceM=tool.equalizer
            ?tool.equalizer.bearingClearanceRequiredM:0,
          pass=centrelineClearanceM>=
              requiredCentrelineClearanceM-1e-9&&
            cutterClearanceM>=-1e-9;
        if(tool.equalizer){
          tool.equalizer.solvedEndpointClearanceM=
            centrelineClearanceM;
          tool.equalizer.terminalCutterClearanceM=
            cutterClearanceM;
          tool.equalizer.endpointContained=pass;
        }
        return {
          schemaVersion:1,driverIndex:d.index,tapIndex,
          bearingFace:d.driverFace,
          centrelineEndpoint:centreline,
          centrelineClearanceM,
          requiredCentrelineClearanceM,
          terminalCutterClearanceM:cutterClearanceM,
          pass
        };
      }));
    const tapPathGeometryRecords=P.drivers.flatMap(d=>
      tapTools[d.index].map((tool,tapIndex)=>{
        const q=d.ports[tapIndex],
          e=tool.equalizer,
          active=P.family==='panel'&&tool.kind==='swept-aperture'&&
            !!e&&!!e.q&&!!e.wallIn,
          points=Array.isArray(tool.centerlinePoints)
            ?tool.centerlinePoints:[],
          sections=tool.kind==='swept-aperture'?tool.sections:[tool],
          axes=points.slice(1).map((point,index)=>
            unit(sub(point,points[index]))),
          maximumTurn=axes.slice(1).reduce((maximum,axis,index)=>
            Math.max(maximum,Math.acos(clamp(
              dot(axes[index],axis),-1,1))),0),
          terminalRunM=points.length>=2
            ?len(sub(points[points.length-1],
              points[points.length-2])):0,
          terminalAlignment=points.length>=2
            ?dot(unit(sub(points[points.length-1],
              points[points.length-2])),d.mountN):0,
          wallExitGuardM=active&&points.length>=2
            ?dot(sub(points[1],e.wallPt),e.n)-wall:Infinity,
          apertureInvariant=sections.every(section=>
            Math.abs(section.sa-q.sa)<1e-12&&
            Math.abs(section.sb-q.sb)<1e-12&&
            section.shape===q.shape),
          endpoint=tapEndpointAudit.find(item=>
            item.driverIndex===d.index&&item.tapIndex===tapIndex),
          turnPass=maximumTurn<=Math.PI*25/180+1e-10,
          sectionPass=sections.length<=10&&
            (!active||sections.length===points.length-1),
          wallGuardPass=wallExitGuardM>=0.001-1e-10,
          terminalRunPass=terminalRunM>=0.003-1e-10&&
            terminalAlignment>=1-1e-9,
          endpointPass=!!endpoint&&endpoint.pass,
          pass=!active||(turnPass&&sectionPass&&wallGuardPass&&
            terminalRunPass&&endpointPass&&apertureInvariant);
        const record={
          schemaVersion:1,driverIndex:d.index,tapIndex,active,
          kind:active?(tool.geometryMode==='straight-cone-normal'
            ?'straight-cone-normal'
            :'bounded-local-circular-fillet'):
            'not a swept panel fillet',
          sectionCount:sections.length,maximumSections:10,
          maximumTurn,maximumTurnAllowed:Math.PI*25/180,
          wallExitGuardM,minimumWallExitGuardM:0.001,
          terminalRunM,minimumTerminalRunM:0.003,
          terminalAlignment,
          endpointContained:endpointPass,
          terminalCutterClearanceM:endpoint
            ?endpoint.terminalCutterClearanceM:null,
          jointBlendRadiusM:tool.jointBlendRadius,
          apertureInvariant,
          turnPass,sectionPass,wallGuardPass,terminalRunPass,
          endpointPass,pass
        };
        tool.pathGeometryAudit=record;
        return record;
      })),
      tapPathGeometryAudit={
        schemaVersion:1,
        basis:'shared canonical/raw/equalizer path; shortest panel uses one cone-normal prism',
        maximumTurnAllowed:Math.PI*25/180,
        maximumSections:10,
        minimumWallExitGuardM:0.001,
        minimumTerminalRunM:0.003,
        maximumJointBlendRadiusM:tapPathGeometryRecords.length
          ?Math.max(...tapPathGeometryRecords.map(item=>
            item.jointBlendRadiusM||0)):0,
        activeCount:tapPathGeometryRecords.filter(item=>item.active).length,
        records:tapPathGeometryRecords,
        pass:tapPathGeometryRecords.every(item=>item.pass)
      };
    const boundedHornAir=p=>Math.max(sdCross(P,p[0],p[1],p[2],0),
      -p[0],p[0]-st.depth);
    /* The swept aperture meets a much wider cone chamber at an oblique back
       plane. A raw min(tap, chamber) union can trap a real sliver of solid
       between two positive SDFs even though both centre-lines overlap—the
       visible “layer inside the tap”. Give each swept tap/chamber pair a
       finite printable chamfer. Literal straight router cuts already overlap
       their chamber and retain the ordinary hard Boolean union. The swept
       blend radius is derived from the smaller of the aperture minor radius
       and declared structural web, so it opens the terminal junction without
       changing the canonical entry outline or consuming the complete web. */
    const tapChamberBlends=P.drivers.map(d=>{
      const minorRadius=d.ports.length
        ?Math.min(...d.ports.map(q=>q.sb)):0,
        active=tapTools[d.index].some(tool=>
          tool.kind==='swept-aperture'&&
          tool.geometryMode!=='straight-cone-normal'),
        radius=active&&minorRadius>0
          ?Math.max(0.0008,
            /* The blend must consume the complete closed lens between the
               finite sweep and the wider cone chamber. At 0.35·web the
               six-W5 solid retained 0.213–0.509 mm lenses; exact witnesses
               required as much as 2.610 mm of local union. A half-web
               chamfer supplies 2.7 mm in that build while remaining strictly
               inside the declared structural web. */
            Math.min(0.003,0.50*Math.min(minorRadius,P.minWeb)))
          :0;
      return {
        schemaVersion:1,driverIndex:d.index,
        kind:'finite tap-to-cone-chamber chamfer',
        active,minorRadius,radius
      };
    });
    const rearAccess=Math.max(0.0015,P.frame.boltD*0.20);
    const panelBlindDepth=d=>{
      /* Driver bolts enter from the rear and stop before the acoustic face.
         Retain a real printable/machinable cap instead of extending the
         tee-nut pocket into horn air. */
      if(detachable||P.S.driverMountMode==='extended-manifold')
        return localPrintedFastenerPocketDepth(P.frame,d.flangeT);
      return panelBlindPocketDepth(P.frame,d.cellT||d.panelT,
        d.cellSkin,d.panelSkin);
    };
    const boltTools=P.drivers.map(d=>
      Array.from({length:P.frame.boltN},(_,k)=>{
        const ph=(d.boltPhase||0)+k*2*Math.PI/P.frame.boltN,
          off=add(mul(d.flow,Math.cos(ph)*P.frame.bcd/2),
            mul(d.cross,Math.sin(ph)*P.frame.bcd/2)),
          base=add(d.driverFace,off);
        if(P.family==='panel'){
          const depth=panelBlindDepth(d);
          return {a:add(base,mul(d.mountN,-depth)),
            b:add(base,mul(d.mountN,rearAccess)),
            r:P.frame.panelPocketD/2,depth,
            blindCap:Math.max(0,(d.cellT||d.panelT)-depth),
            fastenerD:P.frame.boltD,pocketD:P.frame.panelPocketD};
        }
        const depth=radialInsertDepth(d);
        return {a:add(base,mul(d.mountN,-depth)),
          b:add(base,mul(d.mountN,0.005)),
          r:P.frame.insertPocketD/2,depth};
      }));
    const driverFastenerPocketDiagnostics=P.drivers.map(d=>{
      const active=detachable&&P.family==='panel',
        rootRadius=driverCellRootRadius(P,d,wall),
        start=d.cartridgeStart||
          add(d.surface,mul(d.mountN,wall+gap)),
        flangeInner=add(d.driverFace,mul(d.mountN,-d.flangeT)),
        overlap=Math.min(0.002,d.flangeT*0.25),
        taperEnd=add(flangeInner,mul(d.mountN,overlap)),
        startAxial=dot(sub(start,d.driverFace),d.mountN),
        taperEndAxial=dot(sub(taperEnd,d.driverFace),d.mountN),
        flangeStartAxial=-d.flangeT-overlap,
        supportRadiusAt=axial=>{
          let radius=0;
          if(axial>=Math.min(startAxial,taperEndAxial)-1e-12&&
              axial<=Math.max(startAxial,taperEndAxial)+1e-12){
            const t=clamp((axial-startAxial)/
              Math.max(1e-12,taperEndAxial-startAxial),0,1);
            radius=Math.max(radius,lerp(rootRadius,d.outerR,t));
          }
          if(axial>=flangeStartAxial-1e-12&&axial<=1e-12)
            radius=Math.max(radius,d.outerR);
          return radius;
        },
        tools=boltTools[d.index]||[],
        records=tools.map((tool,boltIndex)=>{
          const deepestPocketAxial=dot(
              sub(tool.a,d.driverFace),d.mountN),
            supportRadius=supportRadiusAt(deepestPocketAxial),
            outerLigament=supportRadius-
              (P.frame.bcd/2+tool.r),
            pass=!active||
              outerLigament>=P.boltOuterWebRequired-1e-12;
          return {
            boltIndex,
            depth:tool.depth,deepestPocketAxial,
            supportRadius,outerLigament,pass
          };
        }),
        minimumOuterLigament=records.length
          ?Math.min(...records.map(item=>item.outerLigament)):Infinity,
        complete=!active||records.length===P.frame.boltN,
        pass=!active||(complete&&records.every(item=>item.pass));
      return {
        schemaVersion:1,driverIndex:d.index,active,
        basis:'deepest local driver-fastener pocket within structural taper/land',
        requiredOuterLigament:P.boltOuterWebRequired,
        minimumOuterLigament:
          Number.isFinite(minimumOuterLigament)
            ?minimumOuterLigament:null,
        complete,records,pass
      };
    });
    /* Canonical integrated-panel support records.  Keeping this outside the
       field evaluator makes the renderer, manufacturing audit and Boolean
       solid consume the same plate root, bearing land and two-face wings. */
    const integratedPlateTools=P.drivers.map(d=>{
      if(P.family!=='panel'||!includeHorn||detachable)return null;
      const cavityStations=d.cell&&d.cell.coneProfile&&
          d.cell.coneProfile.relief&&
          d.cell.coneProfile.relief.cavityStations,
        openingRadius=Array.isArray(cavityStations)&&cavityStations.length
          ?cavityStations[cavityStations.length-1].radiusM
          :P.frame.activeR+0.002,
        plateStart=add(d.surface,mul(d.mountN,
          -Math.min(0.002,d.panelT*0.20))),
        tapFootprintRadius=driverTapFootprintRadius(d),
        rootRadius=driverCellRootRadius(P,d,wall),
        tapEnvelopeWeb=rootRadius-tapFootprintRadius,
        gasketInset=Math.max(0.00035,Math.min(0.00075,P.minWeb*0.10)),
        /* Seal outside the real cone-relief opening at the bearing face.
           d.innerR is the deeper chamber/root envelope required to enclose
           the paired tap manifold; it is not an opening in the driver face
           and must not be presented as one by the renderer. */
        gasketInnerRadius=openingRadius+gasketInset,
        gasketOuterRadius=Math.min(d.outerR-gasketInset,
          P.frame.frameR-gasketInset),
        /* A wall-normal root collar is required when the driver axis turns
           away from the local normal.  At the 1.0 radial endpoint the axial
           frustum is tangent to a curved horn and otherwise has only
           zero-area contact.  This short conformal collar lives in the
           physical shell, overlaps the frustum volumetrically, and is still
           clipped against horn air by integratedPlateSupport(). */
        rootBridge={
          start:add(d.surface,mul(d.wallN,wall*0.12)),
          end:add(d.surface,mul(d.wallN,wall*0.92)),
          /* The cone/front-chamber cutter removes the collar centre.  Its
             outer radius must therefore reach beyond the complete chamber
             opening and retain the declared annular root web. */
          radius:rootRadius
        },
        /* The gasket bears on a constant-radius land, not the final slice of
           a taper.  Without this short cylinder the outer gasket sample can
           hang beyond a steep frustum only fractions of a millimetre behind
           the nominal face, even though the face outline itself looks right.
           The land is also a deliberate load path between every bolt sector. */
        bearingLandDepth=Math.max(0.012,d.flangeT,wall*0.75),
        bearingLand={
          start:add(d.driverFace,mul(d.mountN,-bearingLandDepth)),
          end:d.driverFace,
          radius:d.outerR,
          depth:bearingLandDepth
        };
      return {
        schemaVersion:1,driverIndex:d.index,
        start:plateStart,end:d.driverFace,
        /* The structural taper reaches the full bearing radius at the inner
           face of the constant-radius land. Ending the taper only at the
           driver face leaves the land's outer annulus unsupported through
           its entire depth; after the horn-air clip that annulus can become
           a detached crescent. This registered overlap is the physical load
           path from every gasket/bolt sector back into the conformal root. */
        taperEnd:bearingLand.start,
        rootRadius,outerRadius:d.outerR,openingRadius,
        tapFootprintRadius,tapEnvelopeWeb,
        tapEnvelopeWebRequired:P.panelRootWeb,
        tapEnvelopeWebPass:
          tapEnvelopeWeb>=P.panelRootWeb-1e-12,
        gasketInnerRadius,gasketOuterRadius,
        rootBridge,bearingLand,
        wings:d.cornerPlate&&d.cornerPlate.active
          ?d.cornerPlate.wings:[],
        subtractorWhitelist:[
          'front-chamber/cone-relief',
          'canonical-tap-lumens',
          'driver-fastener-holes'
        ]
      };
    });
    const rawPlateSupport=(p,tool)=>{
      let support=sdFrustum(p,tool.start,tool.taperEnd||tool.end,
        tool.rootRadius,tool.outerRadius);
      support=Math.min(support,sdCylAxis(p,
        tool.rootBridge.start,tool.rootBridge.end,
        tool.rootBridge.radius));
      support=Math.min(support,sdCylAxis(p,
        tool.bearingLand.start,tool.bearingLand.end,
        tool.bearingLand.radius));
      for(const wing of tool.wings){
        support=Math.min(support,sdFrustum(p,
          wing.rootPatch.center,wing.bearingAnchor.center,
          wing.rootRadius,wing.anchorRadius));
        const rootSpineEnd=add(wing.rootPatch.center,
          mul(wing.faceNormal,Math.max(P.minWeb,wall*0.45)));
        support=Math.min(support,sdCylAxis(p,
          wing.rootPatch.center,rootSpineEnd,
          Math.max(P.minWeb,wing.rootRadius*0.42)));
      }
      return support;
    };
    const integratedPlateSupport=(p,tool)=>{
      const raw=rawPlateSupport(p,tool),
        hard=Math.max(raw,-boundedHornAir(p)),
        /* A wide bearing taper can approach the curved shell twice. A raw
           hard union leaves a narrow exterior crevice; when the enlarged
           land closes that crevice at its mouth it becomes a sealed air
           bubble and therefore a second mesh surface. Add a finite exterior
           root fillet between the canonical shell and taper, still clipped
           against horn air, so the plate is one printable load path without
           altering the acoustic boundary. */
        rootFillet=Math.min(0.003,0.50*P.minWeb),
        fillet=Math.max(
          sdChamferUnion(baseHornShell(p),raw,rootFillet),
          -boundedHornAir(p));
      return Math.min(hard,fillet);
    };
    const baseHornShell=p=>{
      const dOuter=Math.max(sdCross(P,p[0],p[1],p[2],wall),
          -p[0],p[0]-st.depth),
        dCavity=Math.max(sdCross(P,p[0],p[1],p[2],0),
          -(p[0]+xPad),p[0]-(st.depth+xPad));
      return Math.max(dOuter,-dCavity);
    };
    const field=p=>{
      let solid=Infinity;
      if(includeHorn){
        const dOuter=Math.max(sdCross(P,p[0],p[1],p[2],wall),-p[0],p[0]-st.depth);
        const dCavity=Math.max(sdCross(P,p[0],p[1],p[2],0),-(p[0]+xPad),p[0]-(st.depth+xPad));
        solid=Math.max(dOuter,-dCavity);
        solid=Math.min(solid,sdCylAxis(p,cdA,cdB,flangeR));
      }
      for(let i=0;i<P.drivers.length;i++){
        const d=P.drivers[i];
        if(P.family==='panel'&&includeHorn&&!detachable){
          /* The sloped flare panel is also the woofer baffle, but the complete
             frame/gasket land may straddle a folded panel seam.  Preserve a
             full, panel-thickness bearing land behind the acoustic surface so
             every catalogue BCD has real material around it.  Clipping the
             land against the bounded horn air keeps its inner face exactly
             flush with the horn—no disc or mounting plate protrudes into the
             acoustic path—and the overlap with the shell makes it one solid. */
          /* A full-radius cylinder starts by grazing several curved horn
             facets at once. Cone and fastener subtraction can then split
             those tangencies into closed islands. The canonical support grows
             from a compact conformal root, includes both corner wings when
             present, and is clipped flush to the acoustic boundary. */
          solid=Math.min(solid,
            integratedPlateSupport(p,integratedPlateTools[i]));
        }
        /* Detachable petals register directly against the horn's curved
           outer shell.  Do not add a second horn-side collar here: its
           mount-axis cap protrudes beyond the real shell at oblique stations
           and intersects the independently meshed module even though the
           declared gasket plane is clear.  The module's conformal root is
           the registration land; only the tap cavities cross the interface. */
        if(includeCell(i)&&insideCellBroadBounds(p,i)){
          solid=Math.min(solid,cellBody(p,d));
          /* Each removable cell owns its two short root bosses. Clip their
             horn-facing ends to the same conformal gasket boundary as the
             cartridge body, so a boss cannot intrude into horn air or fuse
             to the independently meshed horn across the gasket seam. */
          for(const tool of retentionTools[i]){
            const boundedJoint=Math.max(
              sdCross(P,p[0],p[1],p[2],wall+gap),
              -p[0],p[0]-st.depth);
            const boss=Math.max(
              sdCylAxis(p,tool.bossA,tool.bossB,tool.bossR),
              -boundedJoint);
            solid=Math.min(solid,boss);
          }
        }
      }
      /* Subtraction cannot turn an exterior sample into solid. Farther than
         the guarded neighbourhood above, returning the already-computed
         union is sign-identical and leaves all cells that can cross the
         manufactured surface on the full evaluator. */
      if(solid>broadPhaseMargin)return solid;
      let cavity=Infinity;
      if(includeHorn){
        cavity=sdCylAxis(p,[-0.022,0,0],[0.028,0,0],throatR);
        for(let i=0;i<boltN;i++){
          const ph=i*2*Math.PI/boltN,y=Math.cos(ph)*boltBCD/2,z=Math.sin(ph)*boltBCD/2;
          /* Compression-driver fasteners belong only to the physical CD
             flange.  The former -22..+14 mm through-tool was applied after
             every woofer plate union, so it drilled a phantom continuation
             through an otherwise valid rear woofer gasket land.  Use the
             exact flange endpoints: a real package collision inside that
             flange still subtracts and fails the plate audit, while material
             beyond the flange remains owned by its actual component. */
          cavity=Math.min(cavity,
            sdCylAxis(p,[cdA[0],y,z],[cdB[0],y,z],cdBoltD/2));
        }
        /* The horn owns only the heat-set installation pockets. The 6.38 mm
           insert body envelope was reserved by the layout solver; exact
           subtraction follows SPIROL's 5.61 mm recommended M4 hole. */
        for(const tools of retentionTools)for(const tool of tools)
          cavity=Math.min(cavity,sdCylAxis(p,tool.hornPocketA,
            tool.hornPocketB,tool.hornPocketR));
      }
      for(let i=0;i<P.drivers.length;i++){
        if(!includeHorn&&!includeCell(i))continue;
        const d=P.drivers[i],
          ownsCell=includeCell(i)||
            (P.family==='panel'&&!detachable&&includeHorn);
        let tapCavity=Infinity;
        /* Horn and cartridge consume this exact same canonical swept lumen.
           Build it once per driver so its chamber-side union can receive a
           finite physical blend rather than a mesh-resolution workaround. */
        for(const tool of tapTools[i]){
          const sections=tool.kind==='swept-aperture'?tool.sections:[tool],
            jointBlend=tool.jointBlendRadius||0;
          let toolCavity=Infinity;
          for(const seg of sections){
            const segmentCavity=sdSlotTube(p,seg.a,seg.b,seg.u,seg.v,
              seg.sa,seg.sb,seg.shape);
            /* A bent lumen made from a hard union of straight prisms leaves a
               closed solid lens at the convex side of some joints.  Chamfer
               only adjacent segments of the same canonical path: the entry
               and every ordinary section keep their declared aperture, while
               the physical elbow receives a bounded local transition. */
            toolCavity=Number.isFinite(toolCavity)&&jointBlend>0
              ?sdChamferUnion(toolCavity,segmentCavity,jointBlend)
              :Math.min(toolCavity,segmentCavity);
          }
          tapCavity=Math.min(tapCavity,toolCavity);
        }
        if(ownsCell){
          const cavOuter=add(d.driverFace,mul(d.mountN,0.002));
          let coneChamber=sdConeRelief(p,d,cavOuter);
          if(P.family==='radial'){
            const boundedOuter=Math.max(sdCross(P,p[0],p[1],p[2],wall),
              -p[0],p[0]-st.depth);
            coneChamber=Math.max(coneChamber,-boundedOuter);
          }
          const blend=tapChamberBlends[i];
          cavity=Math.min(cavity,
            Number.isFinite(tapCavity)&&blend.radius>0
              ?sdChamferUnion(coneChamber,tapCavity,blend.radius)
              :coneChamber);
          for(const bolt of boltTools[i])
            cavity=Math.min(cavity,sdCylAxis(p,bolt.a,bolt.b,bolt.r));
          /* A cartridge owns its M4 clearance bore, head counterbore and
             boss. The mating horn owns neither of these cutters. */
          if(includeCell(i))for(const tool of retentionTools[i]){
            cavity=Math.min(cavity,
              sdCylAxis(p,tool.moduleBoreA,tool.moduleBoreB,
                tool.moduleBoreR),
              sdCylAxis(p,tool.counterboreA,tool.counterboreB,
                tool.counterboreR));
          }
        }
        cavity=Math.min(cavity,tapCavity);
      }
      return Number.isFinite(solid)?Math.max(solid,-cavity):1;
    };
    /* Keep the exact cutter centre-lines with the field so manufacturing QA
       probes the same paths that are meshed instead of guessing a straight
       wall-normal path for perpendicular radial adapters. */
    field.tapTools=tapTools;
    field.tapChamberBlends=tapChamberBlends;
    field.tapPathEqualization=tapPathEqualization;
    field.tapEndpointAudit=tapEndpointAudit;
    field.tapPathGeometryAudit=tapPathGeometryAudit;
    field.driverCellRootDiagnostics=driverCellRootDiagnostics;
    field.driverFastenerPocketDiagnostics=
      driverFastenerPocketDiagnostics;
    field.coneReliefs=P.drivers.map(d=>d.cell&&d.cell.coneProfile
      ?d.cell.coneProfile.relief:null);
    field.boltTools=boltTools;
    field.retentionTools=retentionTools;
    field.retentionOwnership={
      horn:'hornPocket',
      module:['boss','moduleBore','counterbore']
    };
    {
      const density=1.204,
        toolPath=tool=>{
          const points=Array.isArray(tool.centerlinePoints)&&
              tool.centerlinePoints.length>=2
            ?tool.centerlinePoints:[tool.a,tool.b],
            centerlineLengthM=points.slice(1).reduce((sum,point,index)=>
              sum+len(sub(point,points[index])),0);
          return {points,centerlineLengthM};
        },
        driverRecords=P.drivers.map(driver=>{
          const paths=tapTools[driver.index].map((tool,tapIndex)=>{
            const q=driver.ports[tapIndex],
              path=toolPath(tool),
              outline=apertureOutline(q,96),
              perimeter=outline.reduce((sum,point,index)=>{
                const next=outline[(index+1)%outline.length];
                return sum+Math.hypot(next[0]-point[0],
                  next[1]-point[1]);
              },0),
              hydraulicDiameterM=4*q.area/Math.max(1e-9,perimeter),
              equivalentRadiusM=Math.sqrt(q.area/Math.PI),
              endCorrectionM=1.45*equivalentRadiusM,
              effectiveLengthM=path.centerlineLengthM+endCorrectionM,
              delayS=effectiveLengthM/C;
            return {
              tapIndex,centerlinePoints:path.points,
              centerlineLengthM:path.centerlineLengthM,
              endCorrectionM,effectiveLengthM,
              areaM2:q.area,hydraulicDiameterM,
              acousticMassKgM4:density*effectiveLengthM/
                Math.max(1e-9,q.area),
              delayS,phaseAtCrossoverDeg:360*P.xo*delayS,
              quarterWaveHz:C/(4*Math.max(0.001,effectiveLengthM)),
              lossProxy:effectiveLengthM/
                Math.max(1e-9,hydraulicDiameterM),
              tapMach:P.tapMach
            };
          }),
            centerlineLengthM=paths.reduce((sum,path)=>
              sum+path.centerlineLengthM,0)/Math.max(1,paths.length),
            effectiveLengthM=paths.reduce((sum,path)=>
              sum+path.effectiveLengthM,0)/Math.max(1,paths.length),
            localMismatchM=paths.length
              ?Math.max(...paths.map(path=>path.centerlineLengthM))-
                Math.min(...paths.map(path=>path.centerlineLengthM)):0,
            hydraulicDiameterM=paths.reduce((sum,path)=>
              sum+path.hydraulicDiameterM,0)/Math.max(1,paths.length),
            delayS=effectiveLengthM/C,
            lowPassHz=C/(2*Math.PI)*Math.sqrt(
              P.totalArea/(Math.max(1e-9,P.chamberV)*
                Math.max(0.001,effectiveLengthM)));
          return {
            index:driver.index,axis:driver.mountN,
            wallNormal:driver.wallN,radialAxis:driver.radialN,
            axisBlend:driver.axisBlend,
            axisToCdDeg:driver.axisToCdDeg,
            minimumReachM:P.driverManifold.minimumReachM,
            requestedExtraReachM:P.driverManifold.extraReachM,
            automaticDifferentialSetbackM:
              driver.automaticDifferentialSetbackM||0,
            extraReachM:P.driverManifold.extraReachM+
              (driver.automaticDifferentialSetbackM||0),
            totalReachM:driver.adapterReach,
            paths,centerlineLengthM,effectiveLengthM,
            localPathMismatchM:localMismatchM,
            areaM2:P.totalArea,hydraulicDiameterM,
            acousticMassKgM4:density*effectiveLengthM/
              Math.max(1e-9,P.totalArea),
            lowPassHz,delayS,
            phaseAtCrossoverDeg:360*P.xo*delayS,
            quarterWaveHz:C/(4*Math.max(0.001,effectiveLengthM)),
            lossProxy:effectiveLengthM/
              Math.max(1e-9,hydraulicDiameterM),
            tapMach:P.tapMach
          };
        }),
        lengths=driverRecords.flatMap(item=>
          item.paths.map(path=>path.centerlineLengthM)),
        delays=driverRecords.flatMap(item=>
          item.paths.map(path=>path.delayS)),
        pathMismatchM=lengths.length
          ?Math.max(...lengths)-Math.min(...lengths):0,
        delayMismatchS=delays.length
          ?Math.max(...delays)-Math.min(...delays):0,
        minimumQuarterWaveHz=driverRecords.length
          ?Math.min(...driverRecords.map(item=>item.quarterWaveHz)):Infinity,
        minimumLowPassHz=driverRecords.length
          ?Math.min(...driverRecords.map(item=>item.lowPassHz)):Infinity,
        maximumPhaseAtCrossoverDeg=driverRecords.length
          ?Math.max(...driverRecords.map(item=>item.phaseAtCrossoverDeg)):0;
      field.driverManifoldDiagnostics={
        schemaVersion:DRIVER_MANIFOLD_SCHEMA_VERSION,
        basis:'exact swept centerline plus circular-equivalent end corrections',
        mode:P.driverManifold.mode,
        requestedExtraM:P.driverManifold.requestedExtraM,
        minimumReachM:P.driverManifold.minimumReachM,
        extraReachM:P.driverManifold.extraReachM,
        totalReachM:P.driverManifold.totalReachM,
        maximumTotalReachM:P.driverManifold.maximumTotalReachM,
        extensionHonored:P.driverManifold.extensionHonored,
        requestedAxisBlend:P.driverManifold.requestedAxisBlend,
        solvedAxisBlend:P.driverManifold.solvedAxisBlend,
        pathEqualization:tapPathEqualization,
        pathGeometry:tapPathGeometryAudit,
        drivers:driverRecords,
        pathMismatchM,delayMismatchS,
        phaseMismatchAtCrossoverDeg:360*P.xo*delayMismatchS,
        minimumQuarterWaveHz,minimumLowPassHz,
        maximumPhaseAtCrossoverDeg,
        endpointContained:tapEndpointAudit.every(item=>item.pass),
        differentialSetback:P.driverManifold.differentialSetback,
        equalPath:tapPathEqualization.feasible&&
          pathMismatchM<=0.00025,
        phaseLegal:minimumQuarterWaveHz>=P.phaseMargin*P.xo,
        machLegal:P.tapMach<=P.tapMachLimit,
        pass:P.driverManifold.extensionHonored&&
          P.driverManifold.differentialSetback.feasible&&
          tapEndpointAudit.every(item=>item.pass)&&
          tapPathGeometryAudit.pass&&
          tapPathEqualization.feasible&&
          pathMismatchM<=0.00025&&
          minimumQuarterWaveHz>=P.phaseMargin*P.xo&&
          P.tapMach<=P.tapMachLimit
      };
      P.driverManifold.exact=field.driverManifoldDiagnostics;
    }
    field.integratedPlateTools=integratedPlateTools.filter(Boolean);
    field.integratedPlateSubtractorManifest={
      schemaVersion:1,
      scope:'integrated panel driver plate',
      allowed:[
        'front-chamber/cone-relief',
        'canonical-tap-lumens',
        'driver-fastener-holes'
      ],
      drivers:integratedPlateTools.filter(Boolean).map(tool=>({
        driverIndex:tool.driverIndex,
        actual:[...tool.subtractorWhitelist]
      }))
    };
    /* Connectivity and gasket support are graded on the exact implicit solid,
       not inferred from a preview mesh.  A plate is connected only when a
       finite-area set of witnesses lies strictly inside the original horn
       shell, the canonical support, and the final subtracted union.  The
       complete gasket annulus is sampled independently; only the explicitly
       whitelisted driver fastener bores may interrupt it. */
    field.integratedPlateAudit=integratedPlateTools.filter(Boolean).map(tool=>{
      const d=P.drivers[tool.driverIndex],
        frame=orthogonalFrame(d.mountN,d.flow,d.cross),
        rootFrame=orthogonalFrame(d.wallN,d.flow,d.cross),
        epsilon=Math.max(0.00006,Math.min(0.00015,P.minWeb*0.02)),
        angleBins=new Set(),overlapWitnesses=[];
      for(const axialFraction of [0.18,0.34,0.50,0.66,0.82]){
        const center=add(d.surface,mul(d.mountN,wall*axialFraction));
        for(let radialIndex=1;radialIndex<=8;radialIndex++){
          const radius=tool.rootRadius*radialIndex/10;
          for(let angleIndex=0;angleIndex<24;angleIndex++){
            const angle=angleIndex*2*Math.PI/24,
              point=add(center,add(
                mul(frame.u,Math.cos(angle)*radius),
                mul(frame.v,Math.sin(angle)*radius))),
              shellValue=baseHornShell(point),
              supportValue=rawPlateSupport(point,tool),
              finalValue=field(point);
            if(shellValue<-epsilon&&supportValue<-epsilon&&
                finalValue<-epsilon){
              angleBins.add(angleIndex);
              overlapWitnesses.push({
                point,shellMargin:-shellValue,
                supportMargin:-supportValue,finalMargin:-finalValue
              });
            }
          }
        }
      }
      /* The root bridge owns the finite-area horn connection for strongly
         blended axes.  Probe it in the local wall-normal frame rather than
         assuming the mount axis crosses the shell. */
      for(const axialFraction of [0.18,0.34,0.50,0.66,0.82]){
        const center=add(tool.rootBridge.start,mul(
          sub(tool.rootBridge.end,tool.rootBridge.start),axialFraction));
        for(let radialIndex=1;radialIndex<=6;radialIndex++){
          const radius=tool.rootBridge.radius*radialIndex/8;
          for(let angleIndex=0;angleIndex<24;angleIndex++){
            const angle=angleIndex*2*Math.PI/24,
              point=add(center,add(
                mul(rootFrame.u,Math.cos(angle)*radius),
                mul(rootFrame.v,Math.sin(angle)*radius))),
              shellValue=baseHornShell(point),
              supportValue=rawPlateSupport(point,tool),
              finalValue=field(point);
            if(shellValue<-epsilon&&supportValue<-epsilon&&
                finalValue<-epsilon){
              angleBins.add(angleIndex);
              overlapWitnesses.push({
                point,shellMargin:-shellValue,
                supportMargin:-supportValue,finalMargin:-finalValue,
                source:'wall-normal root bridge'
              });
            }
          }
        }
      }
      const overlapPass=overlapWitnesses.length>=24&&angleBins.size>=12,
        planeInset=Math.max(0.00035,
          Math.min(0.0008,d.flangeT*0.08)),
        radialSamples=6,angularSamples=288;
      let gasketSamples=0,gasketSupported=0,gasketFastenerSkips=0,
        gasketMinimumMargin=Infinity;
      if(tool.gasketOuterRadius>tool.gasketInnerRadius+0.001){
        const planeCenter=add(d.driverFace,mul(d.mountN,-planeInset));
        for(let radialIndex=0;radialIndex<radialSamples;radialIndex++){
          const radius=lerp(tool.gasketInnerRadius,
            tool.gasketOuterRadius,radialIndex/(radialSamples-1));
          for(let angleIndex=0;angleIndex<angularSamples;angleIndex++){
            const angle=angleIndex*2*Math.PI/angularSamples,
              point=add(planeCenter,add(
                mul(frame.u,Math.cos(angle)*radius),
                mul(frame.v,Math.sin(angle)*radius))),
              fastener=boltTools[tool.driverIndex].some(bolt=>
                sdCylAxis(point,bolt.a,bolt.b,
                  bolt.r+0.00025)<=0);
            if(fastener){gasketFastenerSkips++;continue;}
            const value=field(point);
            gasketSamples++;
            gasketMinimumMargin=Math.min(gasketMinimumMargin,-value);
            if(value<=1e-7)gasketSupported++;
          }
        }
      }
      const gasketCoverage=gasketSamples
          ?gasketSupported/gasketSamples:0,
        gasketPass=gasketSamples>0&&gasketSupported===gasketSamples,
        allowed=field.integratedPlateSubtractorManifest.allowed,
        unknownSubtractors=tool.subtractorWhitelist.filter(name=>
          !allowed.includes(name));
      return {
        schemaVersion:1,driverIndex:tool.driverIndex,
        connected:overlapPass,
        overlapWitnessCount:overlapWitnesses.length,
        overlapAngularBins:angleBins.size,
        overlapMinimumRequired:24,
        overlapAngularBinsRequired:12,
        overlapWitnesses,
        gasketSupported:gasketPass,
        gasketCoverage,gasketSamples,gasketSupportedSamples:gasketSupported,
        gasketFastenerSkips,
        gasketMinimumMargin:Number.isFinite(gasketMinimumMargin)
          ?gasketMinimumMargin:null,
        gasketInnerRadius:tool.gasketInnerRadius,
        gasketOuterRadius:tool.gasketOuterRadius,
        subtractorWhitelistPass:unknownSubtractors.length===0,
        unknownSubtractors
      };
    });
    return field;
  }

  function boundsFor(P,partIndex){
    if(partIndex!==undefined&&partIndex!==null&&partIndex>0){
      const d=P.drivers[partIndex-1],r=d.outerR+0.025,pts=[d.surface,d.driverFace];
      const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
      for(const c of pts)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],c[j]-r);hi[j]=Math.max(hi[j],c[j]+r);}
      return {lo,hi};
    }
    const mo=M.dimsAt(P.st,P.st.depth),wall=P.shellT||P.S.wallT||0.012;
    /* wallT is measured normal to the flare. Near a steep second expansion,
       its section-plane projection can be several times wallT; using wallT
       directly clipped the mouth rim at the meshing box and produced hundreds
       of boundary edges. Bound the projected thickness from the steepest
       actual profile segment instead. */
    let maxSlope=0;
    for(let i=1;i<P.st.pts.length;i++){
      const a=P.st.pts[i-1],b=P.st.pts[i],dx=b.x-a.x;
      if(dx<=1e-7||a.x>P.st.depth+1e-7)continue;
      maxSlope=Math.max(maxSlope,Math.abs(b.a-a.a)/dx,Math.abs(b.b-a.b)/dx);
    }
    const projectedWall=wall*Math.sqrt(1+Math.min(8,maxSlope)**2);
    const lo=[-0.030,-mo.a-projectedWall-0.02,-mo.b-projectedWall-0.02];
    const hi=[P.st.depth+0.02,mo.a+projectedWall+0.02,mo.b+projectedWall+0.02];
    if(partIndex===0)for(const d of P.drivers){
      const r=d.innerR+0.030,c=add(d.surface,mul(d.normal,wall+0.008));
      for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],c[j]-r);hi[j]=Math.max(hi[j],c[j]+r);}
    }
    if(partIndex===undefined||partIndex===null)for(const d of P.drivers){
      const cornerPoints=d.cornerPlate&&d.cornerPlate.active
        ?d.cornerPlate.wings.flatMap(wing=>[
          wing.rootPatch.center,wing.bearingAnchor.center,
          ...wing.rootPatch.points,...wing.bearingAnchor.points])
        :[];
      for(const c of [d.surface,d.driverFace]){
        lo[0]=Math.min(lo[0],c[0]-d.outerR-0.02);hi[0]=Math.max(hi[0],c[0]+d.outerR+0.02);
        lo[1]=Math.min(lo[1],c[1]-d.outerR-0.02);hi[1]=Math.max(hi[1],c[1]+d.outerR+0.02);
        lo[2]=Math.min(lo[2],c[2]-d.outerR-0.02);hi[2]=Math.max(hi[2],c[2]+d.outerR+0.02);
      }
      for(const c of cornerPoints)for(let j=0;j<3;j++){
        lo[j]=Math.min(lo[j],c[j]-0.02);
        hi[j]=Math.max(hi[j],c[j]+0.02);
      }
    }
    return {lo,hi};
  }

  function boundaryHits(field,lo,hi){
    const samples=17,hit=[[false,false],[false,false],[false,false]];
    for(let axis=0;axis<3;axis++){
      const other=[0,1,2].filter(i=>i!==axis);
      for(let side=0;side<2;side++){
        scan:
        for(let i=0;i<samples;i++)for(let j=0;j<samples;j++){
          const p=[0,0,0];
          p[axis]=side?hi[axis]:lo[axis];
          p[other[0]]=lerp(lo[other[0]],hi[other[0]],i/(samples-1));
          p[other[1]]=lerp(lo[other[1]],hi[other[1]],j/(samples-1));
          if(field(p)<=0){hit[axis][side]=true;break scan;}
        }
      }
    }
    return hit;
  }
  function sealedBounds(field,bounds,maxPasses){
    /* The constructive field, not an assumed driver envelope, is the final
       authority for meshing bounds.  A remote adapter or a large mouth can
       otherwise touch a box face and marching tetrahedra will faithfully
       produce an open print.  Probe every face and grow only the faces that
       still intersect solid. */
    const lo=bounds.lo.slice(),hi=bounds.hi.slice(),
      limit=Number.isFinite(maxPasses)?maxPasses:8;
    for(let pass=0;pass<limit;pass++){
      const hit=boundaryHits(field,lo,hi);
      let grew=false;
      for(let axis=0;axis<3;axis++){
        const pad=Math.max(0.015,(hi[axis]-lo[axis])*0.12);
        if(hit[axis][0]){lo[axis]-=pad;grew=true;}
        if(hit[axis][1]){hi[axis]+=pad;grew=true;}
      }
      if(!grew)return {lo,hi,growthPasses:pass,boundaryClear:true};
    }
    const remaining=boundaryHits(field,lo,hi);
    if(remaining.some(axis=>axis.some(Boolean)))
      throw meshError('MESH_BOUNDS_UNSEALED',
        'Exact mesh bounds still intersect the solid after '+limit+' growth passes',
        {lo,hi,growthPasses:limit,remaining});
    return {lo,hi,growthPasses:limit,boundaryClear:true};
  }

  function safeProduct(values){
    let value=1;
    for(const item of values){
      if(!Number.isSafeInteger(item)||item<1||value>Number.MAX_SAFE_INTEGER/item)
        return null;
      value*=item;
    }
    return value;
  }
  function twoWayMeshBudget(boundsOrList,quality,override){
    const limits=meshLimitsFor(quality,override),
      list=Array.isArray(boundsOrList)?boundsOrList:[boundsOrList],
      reasons=[],parts=[];
    let totalGridPoints=0,totalCells=0,maxActivePlanePoints=0;
    if(!list.length)reasons.push({code:'MESH_BOUNDS_INVALID',message:'No mesh bounds were supplied'});
    for(let index=0;index<list.length;index++){
      const bounds=list[index]||{},lo=bounds.lo,hi=bounds.hi;
      if(!Array.isArray(lo)||!Array.isArray(hi)||lo.length!==3||hi.length!==3||
          lo.some(v=>!Number.isFinite(v))||hi.some(v=>!Number.isFinite(v))||
          hi.some((v,axis)=>v<=lo[axis])){
        reasons.push({code:'MESH_BOUNDS_INVALID',partIndex:index,lo,hi});
        continue;
      }
      const spans=hi.map((v,axis)=>v-lo[axis]),
        dims=spans.map(span=>Math.max(3,Math.ceil(span/limits.step)+1)),
        gridPoints=safeProduct(dims),
        cells=safeProduct(dims.map(v=>v-1));
      if(dims.some(v=>v>limits.maxAxisSamples))
        reasons.push({code:'MESH_AXIS_LIMIT',partIndex:index,dims,
          required:Math.max(...dims),limit:limits.maxAxisSamples});
      if(gridPoints===null||cells===null)
        reasons.push({code:'MESH_GRID_UNSAFE_INTEGER',partIndex:index,dims});
      else{
        if(safeProduct([gridPoints,gridPoints])===null)
          reasons.push({code:'MESH_EDGE_KEY_UNSAFE_INTEGER',partIndex:index,
            required:gridPoints,limit:Math.floor(Math.sqrt(Number.MAX_SAFE_INTEGER))});
        if(gridPoints>limits.maxActivePartGridPoints)
          reasons.push({code:'MESH_PART_GRID_LIMIT',partIndex:index,
            required:gridPoints,limit:limits.maxActivePartGridPoints});
        totalGridPoints+=gridPoints;totalCells+=cells;
      }
      const activePlanePoints=dims[1]*dims[2];
      maxActivePlanePoints=Math.max(maxActivePlanePoints,activePlanePoints);
      parts.push({index,lo:lo&&lo.slice(),hi:hi&&hi.slice(),spans,dims,
        nx:dims[0],ny:dims[1],nz:dims[2],gridPoints,cells,activePlanePoints,
        growthPasses:bounds.growthPasses||0});
    }
    /* Mesh generation, audit and output execute in terminated worker phases.
       Account for each phase independently and admit against their maximum:
       summing mutually exclusive phases would keep safe production jobs
       disabled, while pretending that their allocations overlap would be
       equally misleading. Coefficients include runtime/container overhead and
       are still an allocation envelope, not an operating-system RSS promise. */
    const baseOverheadBytes=Math.max(0,+limits.baseOverheadBytes||0),
      activePlaneBytes=maxActivePlanePoints*
        Math.max(0,+limits.bytesPerActivePlanePoint||0),
      gridBytes=activePlaneBytes,
      vertexReserveBytes=Math.max(0,+limits.maxVertices||0)*
        Math.max(0,+limits.bytesPerMeshVertex||0),
      triangleReserveBytes=Math.max(0,+limits.maxTriangles||0)*
        Math.max(0,+limits.bytesPerMeshTriangle||0),
      packedMeshReserveBytes=
        Math.max(0,+limits.maxVertices||0)*3*Float64Array.BYTES_PER_ELEMENT+
        Math.max(0,+limits.maxTriangles||0)*3*Uint32Array.BYTES_PER_ELEMENT,
      /* Detachable jobs retain their individually certified part buffers while
         the audit/output worker assembles one temporary combined mesh.  Charge
         that second packed allocation explicitly; integrated jobs have only
         one part and therefore do not pay for a copy they never create. */
      combinedMeshReserveBytes=list.length>1?packedMeshReserveBytes:0,
      auditTriangleReserveBytes=Math.max(0,+limits.maxTriangles||0)*
        Math.max(0,+limits.bytesPerAuditTriangle||0),
      auditBinReserveBytes=Math.max(0,+limits.maxAuditBinRefs||0)*
        Math.max(0,+limits.bytesPerAuditBinRef||0),
      outputReserveBytes=Math.max(0,+limits.maxRenderBufferBytes||0)+
        Math.max(0,+limits.maxStlBytes||0),
      meshPhaseBytes=baseOverheadBytes+activePlaneBytes+
        vertexReserveBytes+triangleReserveBytes,
      auditPhaseBytes=baseOverheadBytes+packedMeshReserveBytes+
        combinedMeshReserveBytes+
        auditTriangleReserveBytes+auditBinReserveBytes,
      outputPhaseBytes=baseOverheadBytes+packedMeshReserveBytes+
        combinedMeshReserveBytes+
        outputReserveBytes,
      estimatedPeakBytes=Math.max(meshPhaseBytes,auditPhaseBytes,outputPhaseBytes);
    if(totalGridPoints>limits.maxJobGridPoints)
      reasons.push({code:'MESH_JOB_GRID_LIMIT',
        required:totalGridPoints,limit:limits.maxJobGridPoints});
    if(!Number.isSafeInteger(estimatedPeakBytes)||
        estimatedPeakBytes>limits.maxEstimatedPeakBytes)
      reasons.push({code:'MESH_MEMORY_LIMIT',
        required:estimatedPeakBytes,limit:limits.maxEstimatedPeakBytes});
    return {ok:reasons.length===0,policyVersion:MESH_POLICY_VERSION,
      quality:quality||'preview',intent:limits.intent,step:limits.step,
      parts,totals:{gridPoints:totalGridPoints,cells:totalCells,
        maxActivePlanePoints,baseOverheadBytes,activePlaneBytes,gridBytes,
        vertexReserveBytes,triangleReserveBytes,packedMeshReserveBytes,
        combinedMeshReserveBytes,
        auditTriangleReserveBytes,auditBinReserveBytes,outputReserveBytes,
        meshPhaseBytes,auditPhaseBytes,outputPhaseBytes,
        estimatedPeakBytes,
        estimateScope:'maximum of terminated mesh, audit, and output phase allocation envelopes; not an OS RSS guarantee'},
      limits,reasons};
  }
  function requireMeshBudget(plan){
    if(plan.ok)return plan;
    const first=plan.reasons[0]||{code:'MESH_BUDGET_EXCEEDED'};
    throw meshError(first.code||'MESH_BUDGET_EXCEEDED',
      'Exact mesh refused by the '+plan.intent+' budget: '+(first.code||'unknown limit'),
      {budget:plan,reason:first});
  }

  function implicitMesh(field,bounds,partBudget,jobCounts,limits){
    const lo=bounds.lo,hi=bounds.hi,h=limits.step,
      nx=partBudget.nx,ny=partBudget.ny,nz=partBudget.nz;
    const dx=(hi[0]-lo[0])/(nx-1),dy=(hi[1]-lo[1])/(ny-1),dz=(hi[2]-lo[2])/(nz-1),
      N=partBudget.gridPoints,planeSize=ny*nz,
      vertexCapacity=Math.max(0,limits.maxVertices-jobCounts.vertices),
      triangleCapacity=Math.max(0,limits.maxTriangles-jobCounts.triangles),
      positions=new Float64Array(vertexCapacity*3),
      indices=new Uint32Array(triangleCapacity*3),
      edgeV=new Map(),point=[0,0,0];
    let current=new Float32Array(planeSize),next=new Float32Array(planeSize),
      vertexCount=0,triangleCount=0;
    const id=(i,j,k)=>(i*ny+j)*nz+k,
      samplePlane=(target,i)=>{
        point[0]=lo[0]+i*dx;
        for(let j=0;j<ny;j++){
          point[1]=lo[1]+j*dy;
          const row=j*nz;
          for(let k=0;k<nz;k++){
            point[2]=lo[2]+k*dz;
            target[row+k]=field(point);
          }
        }
      };
    samplePlane(current,0);
    const tets=[[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]];
    const vv=new Float32Array(8),gv=new Uint32Array(8),
      inside=new Uint8Array(4),outside=new Uint8Array(4);
    const vertex=(a,b,ga,gb)=>{
      const low=Math.min(ga,gb),high=Math.max(ga,gb),key=low*N+high,
        prior=edgeV.get(key);
      if(prior!==undefined)return prior;
      /* Exact-zero grid samples put several edge vertices on the same corner.
         Keeping the interpolation microscopically inside the edge preserves
         the closed tetrahedral topology without visibly moving the surface. */
      if(jobCounts.vertices>=limits.maxVertices)
        throw meshError('MESH_VERTEX_LIMIT',
          'Exact mesh exceeded the vertex budget before allocation could continue',
          {required:jobCounts.vertices+1,limit:limits.maxVertices});
      const den=a-b,t=Math.abs(den)<1e-12?0.5:clamp(a/den,1e-4,1-1e-4),
        ai=Math.floor(ga/planeSize),ar=ga-ai*planeSize,aj=Math.floor(ar/nz),ak=ar-aj*nz,
        bi=Math.floor(gb/planeSize),br=gb-bi*planeSize,bj=Math.floor(br/nz),bk=br-bj*nz,
        at=vertexCount*3;
      positions[at]=lerp(lo[0]+ai*dx,lo[0]+bi*dx,t);
      positions[at+1]=lerp(lo[1]+aj*dy,lo[1]+bj*dy,t);
      positions[at+2]=lerp(lo[2]+ak*dz,lo[2]+bk*dz,t);
      const index=vertexCount++;jobCounts.vertices++;
      edgeV.set(key,index);return index;
    };
    const emit=(a,b,c)=>{
      if(jobCounts.triangles>=limits.maxTriangles)
        throw meshError('MESH_TRIANGLE_LIMIT',
          'Exact mesh exceeded the triangle budget before allocation could continue',
          {required:jobCounts.triangles+1,limit:limits.maxTriangles});
      const at=triangleCount*3;
      indices[at]=a;indices[at+1]=b;indices[at+2]=c;
      triangleCount++;jobCounts.triangles++;
    };
    for(let i=0;i<nx-1;i++){
      samplePlane(next,i+1);
      for(let j=0;j<ny-1;j++)for(let k=0;k<nz-1;k++){
      const row=j*nz,rowNext=(j+1)*nz;
      vv[0]=current[row+k];vv[1]=next[row+k];
      vv[2]=current[rowNext+k];vv[3]=next[rowNext+k];
      vv[4]=current[row+k+1];vv[5]=next[row+k+1];
      vv[6]=current[rowNext+k+1];vv[7]=next[rowNext+k+1];
      let negative=0;
      for(let q=0;q<8;q++)if(vv[q]<0)negative++;
      if(!negative||negative===8)continue;
      gv[0]=id(i,j,k);gv[1]=id(i+1,j,k);
      gv[2]=id(i,j+1,k);gv[3]=id(i+1,j+1,k);
      gv[4]=id(i,j,k+1);gv[5]=id(i+1,j,k+1);
      gv[6]=id(i,j+1,k+1);gv[7]=id(i+1,j+1,k+1);
      for(const T of tets){
        let ni=0,no=0;
        for(let q=0;q<4;q++){
          const corner=T[q];
          if(vv[corner]<0)inside[ni++]=corner;else outside[no++]=corner;
        }
        if(!ni||ni===4)continue;
        const e=(a,b)=>vertex(vv[a],vv[b],gv[a],gv[b]);
        if(ni===1){
          const a=inside[0];emit(e(a,outside[0]),e(a,outside[1]),e(a,outside[2]));
        }else if(ni===3){
          const a=outside[0];emit(e(a,inside[0]),e(a,inside[2]),e(a,inside[1]));
        }else{
          const a=inside[0],b=inside[1],c=outside[0],d=outside[1],
            ac=e(a,c),ad=e(a,d),bc=e(b,c),bd=e(b,d);
          emit(ac,bc,ad);emit(ad,bc,bd);
        }
      }
      }
      const swap=current;current=next;next=swap;
    }
    const mesh=M.orientSolid(M.packedMesh(
      positions.slice(0,vertexCount*3),indices.slice(0,triangleCount*3),{
        auditLimits:{maxAuditBinRefs:limits.maxAuditBinRefs,
          maxAuditBinOccupancy:limits.maxAuditBinOccupancy,
          maxAuditPairVisits:limits.maxAuditPairVisits,
          maxIntersectionPairs:limits.maxIntersectionPairs},
        outputLimits:{maxStlBytes:limits.maxStlBytes}
      }));
    mesh.grid={nx,ny,nz,step:h,gridPoints:N,cells:partBudget.cells};
    return mesh;
  }

  /* Shared constructive-field meshing boundary.

     Three-way uses the same signed-distance convention as the released
     two-way solid: negative is printable material and positive is air.  Keep
     this adapter deliberately narrow so another topology can reuse the
     streamed marcher, sealed-boundary growth, memory budget and topology
     audit without borrowing any two-way acoustic or placement assumptions.

     The result is a sampled constructive/manifold candidate.  It is not an
     exact-Boolean provider result, a fabrication authorization or an STL
     export.  Those remain separate hash-matched gates. */
  function constructiveImplicitMesh(field,bounds,options){
    if(typeof field!=='function')
      throw meshError('CONSTRUCTIVE_FIELD_INVALID',
        'Constructive implicit meshing requires one signed-distance function');
    if(!bounds||!Array.isArray(bounds.lo)||!Array.isArray(bounds.hi)||
        bounds.lo.length!==3||bounds.hi.length!==3||
        bounds.lo.some(v=>!Number.isFinite(v))||
        bounds.hi.some(v=>!Number.isFinite(v))||
        bounds.hi.some((v,axis)=>v<=bounds.lo[axis]))
      throw meshError('MESH_BOUNDS_INVALID',
        'Constructive implicit meshing requires finite increasing xyz bounds',
        {bounds});
    const settings=options&&typeof options==='object'?options:{},
      quality=settings.quality||'display',
      override=settings.limits&&typeof settings.limits==='object'
        ?settings.limits:null,
      limits=meshLimitsFor(quality,override),
      sealed=sealedBounds(field,{
        lo:bounds.lo.slice(),hi:bounds.hi.slice()
      },limits.maxBoundGrowthPasses),
      budget=requireMeshBudget(twoWayMeshBudget(sealed,quality,override)),
      counts={vertices:0,triangles:0},
      mesh=implicitMesh(
        field,sealed,budget.parts[0],counts,limits
      ),
      audit=mesh.audit||M.meshAudit(mesh);
    mesh.audit=audit;
    mesh.budget=budget;
    return {
      mesh,
      audit,
      bounds:sealed,
      budget,
      classification:'constructive-sampled-manifold-candidate',
      exactBooleanProviderEvidence:false,
      exactSolid:false,
      manufacturing:false,
      stl:false
    };
  }

  function cleanMesh(mesh){
    const keep=[],seen=new Set(),q=p=>p.map(v=>Math.round(v*1e9)).join(',');
    for(const t of mesh.tri){
      const a=mesh.pos[t[0]],b=mesh.pos[t[1]],c=mesh.pos[t[2]],ka=q(a),kb=q(b),kc=q(c);
      if(ka===kb||kb===kc||kc===ka)continue;
      const u=sub(b,a),v=sub(c,a),area=len(cross(u,v))/2;
      if(area<5e-15)continue;
      const fk=[ka,kb,kc].sort().join('|');if(seen.has(fk))continue;seen.add(fk);keep.push(t);
    }
    return {...mesh,tri:keep};
  }

  const meshCache=new Map();
  /* Mesh identity is intentionally derived from the complete migrated state,
     not from a hand-maintained allow-list.  The old list omitted inputs such
     as subXO, phaseMargin and flangeTW, so an in-flight/exported mesh could be
     accepted after one of those manufacturing inputs changed.  Sorting every
     object key makes equivalent JSON states insertion-order independent while
     the type prefixes preserve values that JSON.stringify would otherwise
     collapse (notably undefined, NaN and infinities).  This is a cache/safety
     fingerprint, not a promise that every state field changes geometry: an
     occasional conservative rebuild is preferable to reusing stale solids. */
  function canonicalMeshState(value,seen){
    if(value===null)return 'null';
    const type=typeof value;
    if(type==='string')return 's:'+JSON.stringify(value);
    if(type==='boolean')return value?'b:1':'b:0';
    if(type==='undefined')return 'u:';
    if(type==='number'){
      if(Number.isNaN(value))return 'n:NaN';
      if(value===Infinity)return 'n:+Infinity';
      if(value===-Infinity)return 'n:-Infinity';
      if(Object.is(value,-0))return 'n:-0';
      return 'n:'+String(value);
    }
    if(type==='bigint')return 'i:'+String(value);
    if(type==='object'){
      seen=seen||new Set();
      if(seen.has(value))
        throw meshError('MESH_STATE_CYCLIC',
          'Exact mesh state must be serializable without circular references');
      seen.add(value);
      const body=Array.isArray(value)
        ?value.map(item=>canonicalMeshState(item,seen)).join(',')
        :Object.keys(value).sort().map(key=>
          JSON.stringify(key)+':'+canonicalMeshState(value[key],seen)).join(',');
      seen.delete(value);
      return Array.isArray(value)?'a:['+body+']':'o:{'+body+'}';
    }
    return type+':'+JSON.stringify(String(value));
  }
  function compactStateHash(canonical){
    /* 64-bit FNV-1a is deterministic in Node and every supported browser.
       Include the canonical byte-count so the compact token remains useful in
       reports and filenames while the sorted canonical record stays the
       collision-audit source of truth. */
    let hash=0xcbf29ce484222325n;
    for(let i=0;i<canonical.length;i++){
      const code=canonical.charCodeAt(i);
      hash^=BigInt(code&255);
      hash=BigInt.asUintN(64,hash*0x100000001b3n);
      hash^=BigInt(code>>>8);
      hash=BigInt.asUintN(64,hash*0x100000001b3n);
    }
    return 'b653-'+hash.toString(36).padStart(13,'0')+
      '-'+canonical.length.toString(36);
  }
  function twoWayStateHash(S0){
    return compactStateHash(canonicalMeshState(migrate(S0)));
  }
  function twoWayMeshStateFingerprint(S0){
    return twoWayStateHash(S0);
  }
  function meshKey(S,q){
    return MESH_POLICY_VERSION+'|'+q+'|'+canonicalMeshState(S);
  }
  function twoWayMeshKey(S0,q){
    return MESH_POLICY_VERSION+'|'+(q||'preview')+'|'+twoWayMeshStateFingerprint(S0);
  }
  function prepareMeshJob(S,P,q){
    /* Exact export is not a repair path. Refuse a raw/locked state before
       fields, bounds, grids or typed arrays are created when the finite horn
       would amputate any bearing-annulus or fastener-land sample. */
    if(P.cornerPlateMultiSeamOverlap)
      throw meshError('CORNER_PLATE_MULTI_SEAM_OVERLAP',
        'Exact mesh refused because a corner-driver plate root reaches more than its one owned horn seam',
        {quality:q,drivers:P.drivers.filter(driver=>
          driver.cornerPlate&&driver.cornerPlate.multiSeamOverlap).map(driver=>({
            index:driver.index,seamId:driver.panelPlacement.seamId,
            overlappedSeamIds:driver.cornerPlate.overlappedSeamIds
          }))});
    if(!P.cornerPlateComplete)
      throw meshError('CORNER_PLATE_ENVELOPE_INCOMPLETE',
        'Exact mesh refused because a seam-mounted driver lacks a complete two-face mounting plate',
        {quality:q,drivers:P.drivers.filter(driver=>
          driver.cornerPlate&&driver.cornerPlate.active&&
          !driver.cornerPlate.complete).map(driver=>driver.index)});
    /* Topological ownership errors are the primary manufacturing fault.
       Report them before downstream setback/package consequences so one
       malformed corner cannot masquerade as a generic frame collision. */
    if(P.differentialSetback&&P.differentialSetback.active&&
        !P.differentialSetback.feasible)
      throw meshError('DRIVER_DIFFERENTIAL_SETBACK_INFEASIBLE',
        'Exact mesh refused because the shorter panel cells cannot reach the common equal-path interval within the bounded differential setback',
        {quality:q,differentialSetback:P.differentialSetback});
    if(P.arrayPlacement&&!P.arrayPlacement.legalGap)
      throw meshError('DRIVER_DIFFERENTIAL_SETBACK_PACKAGE_COLLISION',
        'Exact mesh refused because the solved driver cells or frames overlap after equal-path setback',
        {quality:q,minimumGap:P.minDriverGap,
          requiredGap:P.arrayPlacement.requiredGapM,
          differentialSetback:P.differentialSetback});
    const mountEnvelopeValid=P.mountEnvelopeComplete&&
      P.mountEnvelopeCoverage>=1-1e-12&&
      P.mountEnvelopeClearance>=
        P.mountEnvelopeRequiredClearance-1e-12;
    if(!mountEnvelopeValid)
      throw meshError('DRIVER_BEARING_ENVELOPE_INCOMPLETE',
        'Exact mesh refused because the complete driver bearing and bolt lands do not fit the finite horn boundary',
        {quality:q,clearance:P.mountEnvelopeClearance,
          requiredClearance:P.mountEnvelopeRequiredClearance,
          coverage:P.mountEnvelopeCoverage,
          minimumMouthIn:P.mountEnvelopeMinimumMouthIn,
          mouthW:P.S.mouthW,mouthCap:P.S.mouthCap});
    if(!P.boltInnerWebPass)
      throw meshError('DRIVER_FASTENER_INNER_WEB_INSUFFICIENT',
        'Exact mesh refused because the cone cavity and printed woofer-fastener hole do not retain the required solid web',
        {quality:q,boltInnerWeb:P.boltInnerWeb,
          required:P.boltInnerWebRequired,bcd:P.frame.bcd,
          requestedBcd:P.frame.requestedBcd,
          explicitBcd:P.frame.explicitBcd,
          fastenerPocketD:P.frame.fastenerPocketD,
          movingRadius:P.frame.movingRadius});
    if(!P.boltOuterWebPass)
      throw meshError('DRIVER_FASTENER_OUTER_WEB_INSUFFICIENT',
        'Exact mesh refused because the printed woofer-fastener hole does not retain the required plate-edge web',
        {quality:q,boltOuterWeb:P.boltOuterWeb,
          required:P.boltOuterWebRequired,bcd:P.frame.bcd,
          panelPocketD:P.frame.panelPocketD});
    /* Retention is a production prerequisite for every separately printable
       cartridge. Refuse before bounds, grids or typed arrays are allocated;
       an invalid joint must never degrade into a bonded-prototype export. */
    if(P.retention&&P.retention.active&&!P.retention.ok)
      throw meshError('CARTRIDGE_RETENTION_NO_LAYOUT',
        P.retention.message||'No legal cartridge-to-horn retention layout exists',
        {retention:P.retention,quality:q});
    const meshOverride=exactFeatureMeshOverride(S,P,q),
      limits=meshLimitsFor(q,meshOverride),
      detachable=S.driverCellConstruction==='cartridge',
      field=solidField(P,detachable),items=[];
    /* A manufacturing mesh is an output gate, not a way to discover that an
       acoustic passage or its load-bearing plate was invalid after allocating
       the marching-cubes grid.  solidField() owns the canonical cutters, so
       its exact diagnostics are the first trustworthy admission evidence.
       Display intent remains available for explaining an invalid state; every
       preview/export/test alias with manufacturing intent is refused here. */
    let admission=null;
    if(limits.intent==='manufacturing'){
      admission=assemblyAudit(P,field);
      if(!admission.driverCellRootPass)
        throw meshError('CARTRIDGE_ROOT_LOAD_PATH_INVALID',
          'Manufacturing mesh refused because a detachable driver-cell root does not retain the declared post-cutter annular ligaments',
          {quality:q,diagnostics:admission.driverCellRootDiagnostics,
            failedRows:admission.rows.filter(row=>!row.pass)});
      if(!admission.driverFastenerPocketPass)
        throw meshError('DRIVER_FASTENER_TAPER_WEB_INSUFFICIENT',
          'Manufacturing mesh refused because a detachable driver-fastener pocket enters a taper section without its declared outer ligament',
          {quality:q,
            diagnostics:admission.driverFastenerPocketDiagnostics,
            failedRows:admission.rows.filter(row=>!row.pass)});
      if(!admission.driverManifoldDiagnostics||
          !admission.driverManifoldDiagnostics.pass)
        throw meshError('DRIVER_MANIFOLD_EXACT_INVALID',
          'Manufacturing mesh refused because the exact printed manifold fails reach, equal-path, phase or Mach limits',
          {quality:q,diagnostics:admission.driverManifoldDiagnostics,
            failedRows:admission.rows.filter(row=>!row.pass)});
      if(!admission.cutterContinuous||!admission.wallBesideCut)
        throw meshError('TAP_LUMEN_EXACT_INVALID',
          'Manufacturing mesh refused because a canonical tap lumen is blocked or lacks structural web',
          {quality:q,cutterContinuous:admission.cutterContinuous,
            wallBesideCut:admission.wallBesideCut,
            failedRows:admission.rows.filter(row=>!row.pass)});
      if(!admission.integratedPlateConnected||
          !admission.integratedGasketSupported||
          !admission.integratedPlateWhitelist)
        throw meshError('DRIVER_PLATE_EXACT_INVALID',
          'Manufacturing mesh refused because an integrated driver plate is disconnected, lacks gasket support, or has noncanonical subtractors',
          {quality:q,
            integratedPlateConnected:admission.integratedPlateConnected,
            integratedGasketSupported:admission.integratedGasketSupported,
            integratedPlateWhitelist:admission.integratedPlateWhitelist,
            integratedPlateAudit:admission.integratedPlateAudit,
            failedRows:admission.rows.filter(row=>!row.pass)});
    }
    if(detachable){
      for(let i=0;i<=S.nW;i++){
        const partField=solidField(P,true,i);
        items.push({partIndex:i,field:partField,
          bounds:sealedBounds(partField,boundsFor(P,i),limits.maxBoundGrowthPasses)});
      }
    }else items.push({partIndex:0,field,
      bounds:sealedBounds(field,boundsFor(P),limits.maxBoundGrowthPasses)});
    const budget=requireMeshBudget(twoWayMeshBudget(
      items.map(item=>item.bounds),q,meshOverride));
    return {detachable,field,items,budget,limits,admission};
  }
  function twoWayMeshPreflight(S0,quality){
    const S=migrate(S0),P=twoWayPlan(S),q=quality||'preview',
      prepared=prepareMeshJob(S,P,q);
    return {ok:true,policyVersion:MESH_POLICY_VERSION,quality:q,
      intent:prepared.budget.intent,step:prepared.budget.step,
      detachable:prepared.detachable,partCount:prepared.items.length,
      parts:prepared.budget.parts,totals:prepared.budget.totals,
      limits:prepared.budget.limits,reasons:[]};
  }
  function clearTwoWayMeshCache(){meshCache.clear();}
  function combinePackedMeshes(meshes,limits){
    if(meshes.length===1)return meshes[0];
    const vertices=meshes.reduce((sum,mesh)=>sum+M.meshVertexCount(mesh),0),
      triangles=meshes.reduce((sum,mesh)=>sum+M.meshTriangleCount(mesh),0);
    if(vertices>limits.maxVertices)
      throw meshError('MESH_VERTEX_LIMIT','Combined exact mesh exceeds the vertex budget',
        {required:vertices,limit:limits.maxVertices});
    if(triangles>limits.maxTriangles)
      throw meshError('MESH_TRIANGLE_LIMIT','Combined exact mesh exceeds the triangle budget',
        {required:triangles,limit:limits.maxTriangles});
    const positions=new Float64Array(vertices*3),indices=new Uint32Array(triangles*3);
    let vertexOffset=0,positionOffset=0,indexOffset=0;
    for(const mesh of meshes){
      positions.set(mesh.positions,positionOffset);
      for(let i=0;i<mesh.indices.length;i++)indices[indexOffset+i]=mesh.indices[i]+vertexOffset;
      vertexOffset+=M.meshVertexCount(mesh);
      positionOffset+=mesh.positions.length;indexOffset+=mesh.indices.length;
    }
    const combined=M.packedMesh(positions,indices,{
      auditLimits:{maxAuditBinRefs:limits.maxAuditBinRefs,
        maxAuditBinOccupancy:limits.maxAuditBinOccupancy,
        maxAuditPairVisits:limits.maxAuditPairVisits,
        maxIntersectionPairs:limits.maxIntersectionPairs},
      outputLimits:{maxStlBytes:limits.maxStlBytes}
    });
    combined.audit=M.meshAudit(combined);
    return combined;
  }
  function twoWayGeometry(S0,quality){
    const S=migrate(S0),P=twoWayPlan(S),q=quality||'preview',key=meshKey(S,q);
    if(meshCache.has(key))return meshCache.get(key);
    const prepared=prepareMeshJob(S,P,q),
      {detachable,field,budget,limits}=prepared,
      parts=[],grids=[],partDiagnostics=[],
      jobCounts={vertices:0,triangles:0};
    if(detachable){
      /* Mesh named parts independently. A sub-millimetre sealed joint must
         never become one fused shell merely because the preview grid is
         coarser than the gasket seam. Part 0 is always the horn.

         Never keep only the largest component. A detached fragment is a real
         manufacturing defect and must survive into the combined mesh so the
         fabrication gate can reject it. */
      for(let i=0;i<prepared.items.length;i++){
        const item=prepared.items[i],
          raw=implicitMesh(item.field,item.bounds,budget.parts[i],jobCounts,limits);
        const componentCount=raw.audit?raw.audit.components:M.meshAudit(raw).components;
        partDiagnostics.push({partIndex:item.partIndex,componentCount,
          triangles:M.meshTriangleCount(raw),vertices:M.meshVertexCount(raw),grid:raw.grid});
        parts.push(raw);
        grids.push(raw.grid);
      }
    }else{
      const item=prepared.items[0],
        raw=implicitMesh(item.field,item.bounds,budget.parts[0],jobCounts,limits),
        componentCount=raw.audit?raw.audit.components:M.meshAudit(raw).components;
      parts.push(raw);
      partDiagnostics.push({partIndex:0,componentCount,
        triangles:M.meshTriangleCount(raw),vertices:M.meshVertexCount(raw),grid:raw.grid});
      grids.push(raw.grid);
    }
    const mesh=combinePackedMeshes(parts,limits),
      rawComponentCount=partDiagnostics.reduce((sum,item)=>sum+item.componentCount,0);
    mesh.grid=grids[0];mesh.grids=grids;mesh.budget=budget;
    mesh.plan=P;mesh.detachable=detachable;
    mesh.rawComponentCount=rawComponentCount;
    mesh.discardedComponents=0;
    mesh.partDiagnostics=partDiagnostics;
    const out={mesh,plan:P,parts,field,budget,rawComponentCount,
      discardedComponents:0,partDiagnostics};
    /* One exact result is the entire cache budget. Browser workers terminate
       after a job; Node gates must not retain six multi-hundred-MB meshes. */
    if(meshCache.size&&!meshCache.has(key))meshCache.clear();
    meshCache.set(key,out);return out;
  }
  function splitComponents(mesh){
    const edge=new Map(),adj=Array.from({length:mesh.tri.length},()=>[]);
    const ek=(a,b)=>a<b?a+':'+b:b+':'+a;
    mesh.tri.forEach((t,ti)=>{for(const [a,b] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
      const k=ek(a,b);if(edge.has(k)){const j=edge.get(k);adj[ti].push(j);adj[j].push(ti);}else edge.set(k,ti);}});
    const seen=new Uint8Array(mesh.tri.length),parts=[];
    for(let s=0;s<mesh.tri.length;s++)if(!seen[s]){
      const stack=[s],faces=[];seen[s]=1;
      while(stack.length){const i=stack.pop();faces.push(mesh.tri[i]);for(const j of adj[i])if(!seen[j]){seen[j]=1;stack.push(j);}}
      const map=new Map(),pos=[],tri=faces.map(t=>t.map(v=>{if(!map.has(v)){map.set(v,pos.length);pos.push(mesh.pos[v]);}return map.get(v);}));
      parts.push(M.orientSolid({pos,tri}));
    }
    return parts.sort((a,b)=>b.tri.length-a.tri.length);
  }

  function shellMesh(S){
    if(S.topo==='2way')throw meshError('MESH_EXPLICIT_INTENT_REQUIRED',
      'Two-way exact meshing requires twoWayGeometry(state, intent)');
    return baseShell(S);
  }
  function assemblyAudit(P,field){
    const rows=[],wall=Math.max(0.004,+P.shellT||+P.S.wallT||0.012);
    const row=(name,pass,value)=>{
      const item={name,pass:!!pass,value};rows.push(item);return item;
    };
    row('complete driver frames clear',P.minDriverGap>=0.004,P.minDriverGap);
    row('driver bearing and gasket clear finite CD flange',
      P.driverCdFlangeComplete,
      P.driverCdFlangeClearance);
    row('mount faces remain outside the horn',P.minMountSide>=Math.max(0.003,wall*0.75),P.minMountSide);
    row('cone cavity preserves printed fastener inner web',
      P.boltInnerWebPass,P.boltInnerWeb);
    row('printed fasteners preserve plate-edge web',
      P.boltOuterWebPass,P.boltOuterWeb);
    const driverCellRootDiagnostics=field&&
        Array.isArray(field.driverCellRootDiagnostics)
      ?field.driverCellRootDiagnostics:[],
      activeDriverCellRoots=driverCellRootDiagnostics.filter(item=>
        item.active),
      expectedDriverCellRoots=P.family==='panel'&&
        P.S.driverCellConstruction==='cartridge'
        ?P.drivers.length:0,
      driverCellRootComplete=
        activeDriverCellRoots.length===expectedDriverCellRoots,
      driverCellRootPass=driverCellRootComplete&&
        activeDriverCellRoots.every(item=>item.pass),
      driverCellRootMinimumLigament=activeDriverCellRoots.length
        ?Math.min(...activeDriverCellRoots.map(item=>Math.min(
          item.reliefWeb,
          Number.isFinite(item.minimumCounterboreOuterLigament)
            ?item.minimumCounterboreOuterLigament:Infinity)))
        :0;
    row('detachable driver-cell roots retain declared post-cutter ligaments',
      driverCellRootPass,driverCellRootMinimumLigament);
    const driverFastenerPocketDiagnostics=field&&
        Array.isArray(field.driverFastenerPocketDiagnostics)
      ?field.driverFastenerPocketDiagnostics:[],
      activeFastenerPockets=driverFastenerPocketDiagnostics.filter(item=>
        item.active),
      expectedFastenerPocketDrivers=P.family==='panel'&&
        P.S.driverCellConstruction==='cartridge'
        ?P.drivers.length:0,
      driverFastenerPocketComplete=
        activeFastenerPockets.length===expectedFastenerPocketDrivers&&
        activeFastenerPockets.every(item=>item.complete),
      driverFastenerPocketPass=driverFastenerPocketComplete&&
        activeFastenerPockets.every(item=>item.pass),
      driverFastenerPocketMinimumLigament=activeFastenerPockets.length
        ?Math.min(...activeFastenerPockets.map(item=>
          Number.isFinite(item.minimumOuterLigament)
            ?item.minimumOuterLigament:Infinity))
        :0;
    row('detachable driver-fastener pockets retain taper-side outer web',
      driverFastenerPocketPass,
      driverFastenerPocketMinimumLigament);
    const driverContact=P.mountEnvelopeComplete&&
      P.mountEnvelopeCoverage>=1-1e-12&&
      P.mountEnvelopeClearance>=
        P.mountEnvelopeRequiredClearance-1e-12;
    row('complete driver bearing and bolt lands are retained',
      driverContact,P.mountEnvelopeClearance);
    const activeCornerPlates=P.drivers.filter(driver=>
        driver.cornerPlate&&driver.cornerPlate.active),
      cornerRootsComplete=!P.cornerPlateMultiSeamOverlap&&
        P.cornerPlateComplete&&activeCornerPlates.every(driver=>{
          const plate=driver.cornerPlate;
          return plate.wings.length===2&&
            plate.wings.every(wing=>wing.complete&&
              wing.rootPatch&&wing.rootPatch.area>0&&
              wing.rootPatch.minimumWeb>=P.minWeb-1e-12);
        }),
      canonicalTapDatums=P.drivers.every(driver=>{
        if(!driver.cornerPlate||!driver.cornerPlate.active)return true;
        return driver.ports.every(port=>{
          const datum=driver.cornerPlate.tapDatums.find(item=>
            item.tapIndex===port.index);
          return datum&&datum.faceId===port.mountFaceId&&
            len(sub(datum.flow,port.flow))<1e-10&&
            len(sub(datum.cross,port.cross))<1e-10&&
            Math.abs(dot(sub(datum.chamberTarget,driver.cavInner),
              driver.mountN))<1e-9;
        });
      }),
      plateAudits=field&&Array.isArray(field.integratedPlateAudit)
        ?field.integratedPlateAudit:[],
      integratedPlateExpected=P.family==='panel'&&!P.cartridge
        ?P.drivers.length:0,
      plateAuditComplete=plateAudits.length===integratedPlateExpected,
      integratedPlateConnected=plateAuditComplete&&
        plateAudits.every(item=>item.connected),
      integratedGasketSupported=plateAuditComplete&&
        plateAudits.every(item=>item.gasketSupported),
      integratedPlateWhitelist=plateAuditComplete&&
        plateAudits.every(item=>item.subtractorWhitelistPass),
      integratedTapEnvelopeWeb=plateAuditComplete&&
        field.integratedPlateTools.every(tool=>tool.tapEnvelopeWebPass),
      endpointAudit=field&&Array.isArray(field.tapEndpointAudit)
        ?field.tapEndpointAudit:[],
      tapEndpointsContained=endpointAudit.length===P.allPorts.length&&
        endpointAudit.every(item=>item.pass),
      pathGeometryAudit=field&&field.tapPathGeometryAudit||null,
      pathGeometryPass=!!pathGeometryAudit&&pathGeometryAudit.pass,
      manifoldExact=field&&field.driverManifoldDiagnostics||null,
      manifoldExactPass=!!manifoldExact&&manifoldExact.pass;
    const groupAxes=new Map();
    let parallelGroups=true,faceOwnership=true;
    for(const driver of P.drivers)for(const port of driver.ports){
      if(driver.panelPlacement&&driver.panelPlacement.kind==='face')
        faceOwnership=faceOwnership&&
          port.mountFaceId===driver.panelPlacement.faceIds[0];
      else if(driver.panelPlacement&&driver.panelPlacement.kind==='corner')
        faceOwnership=faceOwnership&&
          driver.panelPlacement.faceIds.includes(port.mountFaceId);
      if(!port.faceGroupId)continue;
      const prior=groupAxes.get(port.faceGroupId);
      if(prior&&Math.abs(dot(unit(prior),unit(port.flow)))<1-2e-5)
        parallelGroups=false;
      else if(!prior)groupAxes.set(port.faceGroupId,port.flow);
    }
    row('corner plate root owns exactly one seam',
      !P.cornerPlateMultiSeamOverlap,
      P.cornerPlateMultiSeamOverlap?0:1);
    row('complete two-face corner mounting plates',
      cornerRootsComplete,activeCornerPlates.length);
    row('panel apertures retain canonical face ownership',
      faceOwnership,faceOwnership?1:0);
    row('same-face and same-seam aperture axes remain parallel',
      parallelGroups,parallelGroups?1:0);
    row('corner plate and horn cutters share tap datums',
      canonicalTapDatums,canonicalTapDatums?1:0);
    row('integrated driver plates overlap the horn as one structural solid',
      integratedPlateConnected,
      plateAudits.reduce((sum,item)=>sum+item.overlapWitnessCount,0));
    row('complete gasket annulus is supported except driver fastener holes',
      integratedGasketSupported,
      plateAudits.length
        ?Math.min(...plateAudits.map(item=>item.gasketCoverage)):1);
    row('integrated plate subtractors match the canonical whitelist',
      integratedPlateWhitelist,
      plateAudits.reduce((sum,item)=>sum+item.unknownSubtractors.length,0));
    row('integrated cell roots enclose every paired tap plus structural web',
      integratedTapEnvelopeWeb,
      field&&field.integratedPlateTools.length
        ?Math.min(...field.integratedPlateTools.map(tool=>
          tool.tapEnvelopeWeb)):0);
    row('tap terminals remain inside the driver-bearing plane',
      tapEndpointsContained,
      endpointAudit.length
        ?Math.min(...endpointAudit.map(item=>
          item.terminalCutterClearanceM)):NaN);
    row('bounded panel tap fillets retain turn, section, wall, terminal and aperture laws',
      pathGeometryPass,
      pathGeometryAudit&&pathGeometryAudit.records.length
        ?Math.max(...pathGeometryAudit.records
          .filter(item=>item.active)
          .map(item=>item.maximumTurn)
          .concat([0])):NaN);
    row('exact printed-manifold acoustics satisfy path, phase and Mach laws',
      manifoldExactPass,
      manifoldExact
        ?manifoldExact.pathMismatchM:NaN);
    const arrayRecord=P.arrayPlacement,
      arrayPitch=2*Math.PI/Math.max(1,P.drivers.length),
      arraySymmetric=!!arrayRecord&&
        arrayRecord.classifications.length===P.drivers.length&&
        P.drivers.every((driver,index)=>{
          const expected=P.drivers[0].phi+index*arrayPitch;
          return Math.abs(driver.phi-expected)<1e-10;
        });
    row('driver array preserves exact count and rotational symmetry',
      arraySymmetric,arrayRecord?arrayRecord.solvedRotationDeg:NaN);
    row('driver array placement owns legal face/seam topology',
      !!arrayRecord&&arrayRecord.seamOwnershipValid,
      arrayRecord?arrayRecord.alignedCount:0);
    row('tap count matches the selected layout',
      P.drivers.every(d=>d.ports.length===P.np),P.allPorts.length);
    row('complete openings remain under active cones',
      P.maxPortReach<=P.frame.activeR-0.002,P.maxPortReach);
    row('tap-to-tap structural web',
      P.np!==2||P.pairWeb>=P.minWeb,P.pairWeb);
    row('tap-pair quarter-wavelength spread',
      P.np!==2||P.pairSolvedSpread<=P.pairSpreadLimit+P.pairMatchTolerance,
      P.pairSolvedSpread);
    row('custom tap-pair spread honored',
      P.np!==2||P.pairMode!=='custom'||P.pairCustomHonored,
      P.pairRequestError);
    row('tap area preserves the HF section',
      P.tapFraction<=0.55,P.tapFraction);
    row('tap peak velocity remains below Mach 0.10',
      P.tapMach<=P.tapMachLimit,P.tapMach);
    row('tap station preserves quarter-wave margin',
      P.stationNullFrequency>=P.phaseMargin*P.xo-1e-9,P.station);
    let cutterContinuous=true,wallBesideCut=true;
    if(field){
      for(const d of P.drivers)for(const q of d.ports){
        const cutter=field.tapTools&&field.tapTools[d.index]&&
            field.tapTools[d.index][q.index],
          paths=cutter
            ?(cutter.kind==='swept-aperture'?cutter.sections:
              cutter.kind==='curved-profile'?cutter.segs:[cutter])
            :[{a:add(q.center,mul(q.normal,-0.003)),
              b:add(q.center,mul(q.normal,
                P.family==='panel'?(d.cellT||d.panelT)+0.018:wall+0.014))}];
        for(const path of paths)for(let i=0;i<=12;i++){
          const t=i/12,p=add(path.a,mul(sub(path.b,path.a),t));
          /* Cutter and chamber terminal planes intentionally share a Boolean
             boundary.  IEEE round-off can report that endpoint as a few
             attometres inside the solid even though every interior section
             is open.  Grade real blockage, not signed-zero ownership. */
          if(field(p)<-1e-8){cutterContinuous=false;break;}
        }
        const t=Math.min(wall*0.55,0.006);
        /* A seam-owned opening crosses two folded face coordinate systems.
           Probing both sides along only q.normal walks off one face instead
           of onto the adjacent wing and falsely samples horn/outside air.
           An integrated cell therefore uses its canonical two-face plate
           envelope. A detachable cartridge intentionally has no integrated
           plate: its seal is outside the horn, while the folded horn shell
           still owns the web around the lumen. Probe that shell in the
           straight cutter's cone-normal frame so both sides project back to
           their real face instead of borrowing integrated-only metadata. */
        if(d.cornerPlate&&d.cornerPlate.active){
          if(P.S.driverCellConstruction!=='cartridge'){
            const plateTool=field.integratedPlateTools&&
              field.integratedPlateTools.find(item=>
                item.driverIndex===d.index);
            if(!plateTool||!plateTool.tapEnvelopeWebPass)
              wallBesideCut=false;
            continue;
          }
          const first=cutter&&cutter.kind==='swept-aperture'&&
              cutter.sections&&cutter.sections[0],
            axis=first?unit(sub(first.b,first.a)):null,
            transverse=first?unit(first.v):null,
            wallPt=cutter&&Array.isArray(cutter.centerlinePoints)
              ?cutter.centerlinePoints[0]:null;
          if(!first||!wallPt||!axis||!transverse){
            wallBesideCut=false;
            continue;
          }
          const footprintSupport=apertureSupport(q,
              dot(transverse,first.u),dot(transverse,first.v)),
            target=footprintSupport+P.minWeb*0.75,
            span=Math.max(wall*4,target*2,0.024);
          for(const s of [-1,1]){
            const tangent=add(wallPt,mul(transverse,s*target));
            let lo=-span,hi=span;
            const flo=sdCross(P,...add(tangent,mul(axis,lo)),0),
              fhi=sdCross(P,...add(tangent,mul(axis,hi)),0);
            if(!(flo<=0&&fhi>=0)){
              wallBesideCut=false;
              break;
            }
            for(let it=0;it<40;it++){
              const md=(lo+hi)/2,
                value=sdCross(P,...add(tangent,mul(axis,md)),0);
              if(value<0)lo=md;else hi=md;
            }
            const onWall=add(tangent,mul(axis,(lo+hi)/2)),
              side=add(onWall,mul(axis,t));
            if(field(side)>0){wallBesideCut=false;break;}
          }
          continue;
        }
        let surfaceWebPass=true;
        for(const s of [-1,1]){
          /* Follow the real horn surface when probing the web beside a tap.
             A straight tangent step falls into the air volume on a curved
             radial wall and falsely reports missing material even though the
             printable mesh has a continuous wall. */
          /* A cone-normal bore meets an oblique horn wall as the affine
             projection of its racetrack section, not as q.sb measured in
             the old wall-normal frame.  Probe beyond that real projected
             footprint; otherwise a valid open lumen is mislabeled as
             missing structural web. */
          let footprintSupport=q.sb;
          if(cutter&&cutter.kind==='swept-aperture'&&
              cutter.sections&&cutter.sections.length){
            const first=cutter.sections[0],
              axis=unit(sub(first.b,first.a)),
              wallNormal=unit(q.normal),
              tangentRaw=sub(q.cross,mul(wallNormal,
                dot(q.cross,wallNormal))),
              tangent=len(tangentRaw)>1e-10
                ?unit(tangentRaw):unit(q.cross),
              incidence=dot(axis,wallNormal);
            if(Math.abs(incidence)>1e-8){
              const footprintCovector=sub(tangent,mul(wallNormal,
                dot(axis,tangent)/incidence));
              footprintSupport=apertureSupport(q,
                dot(footprintCovector,first.u),
                dot(footprintCovector,first.v));
            }
          }
          const target=footprintSupport+P.minWeb*0.75;
          const tangent=add(q.center,mul(q.cross,s*target));
          /* Project that exact local cross-coordinate back onto the curved
             surface along the tap normal. This preserves the requested web
             dimension in the cutter's own frame; stepping by polar angle can
             leak into the slot's long-axis extent on a steep flare. */
          let lo=-Math.max(wall,target),hi=Math.max(wall*4,target);
          for(let it=0;it<32;it++){
            const md=(lo+hi)/2,p=add(tangent,mul(q.normal,md));
            if(sdCross(P,p[0],p[1],p[2],0)<0)lo=md;else hi=md;
          }
          const onWall=add(tangent,mul(q.normal,(lo+hi)/2));
          const side=add(onWall,mul(q.normal,t));
          if(field(side)>0){surfaceWebPass=false;break;}
        }
        /* A straight cone-normal prism walks laterally as it crosses an
           oblique wall. The surface-coordinate probe above is retained for
           curved/routed cutters, but its fixed wall centre can land inside
           the trailing side of a valid straight cutter. Recheck that case in
           the cutter's own section frame at the same physical wall depth. */
        if(!surfaceWebPass&&P.family==='panel'&&
            cutter&&cutter.kind==='swept-aperture'&&
            cutter.geometryMode==='straight-cone-normal'&&
            cutter.sections&&cutter.sections.length){
          const first=cutter.sections[0],
            axis=unit(sub(first.b,first.a)),
            wallNormal=unit(q.normal),
            incidence=dot(axis,wallNormal),
            tangentRaw=sub(q.cross,mul(wallNormal,
              dot(q.cross,wallNormal))),
            tangent=len(tangentRaw)>1e-10
              ?unit(tangentRaw):unit(q.cross),
            wallPt=Array.isArray(cutter.centerlinePoints)
              ?cutter.centerlinePoints[0]:null;
          if(wallPt&&incidence>1e-8){
            const footprintSupport=apertureSupport(q,
                dot(tangent,first.u),dot(tangent,first.v)),
              target=footprintSupport+P.minWeb*0.75,
              depthCenter=add(wallPt,mul(axis,t/incidence));
            surfaceWebPass=[-1,1].every(s=>
              field(add(depthCenter,mul(tangent,s*target)))<=0);
          }
        }
        if(!surfaceWebPass)wallBesideCut=false;
      }
    }
    row('tap cutters connect horn air to front chambers',cutterContinuous,cutterContinuous?1:0);
    row('solid web remains beside every tap',wallBesideCut,wallBesideCut?1:0);
    const R=P.retention||{active:false,ok:true,totalScrews:0,drivers:[]},
      exactTools=field&&Array.isArray(field.retentionTools)
        ?field.retentionTools.flat():[],
      retentionRows=[];
    retentionRows.push(row('cartridge retention matches construction',
      R.active
        ?R.ok&&R.totalScrews===P.drivers.length*2&&
          exactTools.length===R.totalScrews
        :R.totalScrews===0&&exactTools.length===0,
      exactTools.length));
    retentionRows.push(row('retention insert pockets preserve blind acoustic caps',
      !R.active||(R.ok&&R.drivers.flatMap(d=>d.tools).every(tool=>
        tool.blindCap+1e-9>=CARTRIDGE_RETENTION.blindAcousticCap)),
      R.active&&R.ok
        ?Math.min(...R.drivers.flatMap(d=>d.tools).map(tool=>tool.blindCap))
        :0));
    retentionRows.push(row('retention dimensions and ownership are represented in the exact solid',
      !R.active||(R.ok&&exactTools.every(tool=>
        Math.abs(tool.hornPocketD-CARTRIDGE_RETENTION.insertHoleD)<1e-12&&
        Math.abs(tool.moduleBoreD-CARTRIDGE_RETENTION.clearanceD)<1e-12&&
        Math.abs(tool.counterboreD-CARTRIDGE_RETENTION.counterboreD)<1e-12&&
        Math.abs(tool.bossR-CARTRIDGE_RETENTION.bossR)<1e-12&&
        tool.ownership&&tool.ownership.horn.length===1&&
        tool.ownership.module.length===3)),
      R.active?R.totalScrews:0));
    const retention={active:R.active,ok:R.ok,
      code:R.code||null,pass:retentionRows.every(r=>r.pass),
      toolCount:exactTools.length,rows:retentionRows};
    return {pass:rows.every(r=>r.pass),rows,
      driverContact,cutterContinuous,wallBesideCut,
      driverCellRootPass,driverCellRootComplete,
      driverCellRootDiagnostics,
      driverFastenerPocketPass,driverFastenerPocketComplete,
      driverFastenerPocketDiagnostics,
      integratedPlateConnected,integratedGasketSupported,
      integratedPlateWhitelist,integratedPlateAudit:plateAudits,
      tapPathGeometryAudit:pathGeometryAudit,
      driverManifoldDiagnostics:manifoldExact,
      retention};
  }
  function fabricationAudit(S,mesh,deep){
    if(S.topo!=='2way')return baseFab(S,mesh,deep);
    const a=mesh&&mesh.audit?mesh.audit:M.meshAudit(mesh),P=twoWayPlan(S),
      detachable=P.S.driverCellConstruction==='cartridge',
      expected=detachable?(S.nW+1):1,
      assembly=assemblyAudit(P,solidField(P,detachable)),
      rawComponents=Number.isFinite(mesh.rawComponentCount)?mesh.rawComponentCount:a.components,
      discardedComponents=Number.isFinite(mesh.discardedComponents)?mesh.discardedComponents:0,
      partDiagnostics=Array.isArray(mesh.partDiagnostics)?mesh.partDiagnostics:[],
      namedPartsConnected=!partDiagnostics.length||
        partDiagnostics.every(p=>p.componentCount===1),
      si=deep?M.meshSelfIntersections(mesh,1):
        {count:null,tested:0,limited:false,firstPair:null},
      fabricationRows=[
        {name:'cartridge retention represented in exact solid',
          pass:assembly.retention.pass,
          value:assembly.retention.active
            ?assembly.retention.toolCount+' exact owned tools'
            :'integrated / no retention tools'}
      ];
    const pass=!a.badEdges&&!a.badOrientation&&!a.degenerate&&!a.duplicateFaces&&!a.nonFinite&&
      !a.orientationConflict&&a.volume>0&&a.components===expected&&
      rawComponents===expected&&discardedComponents===0&&namedPartsConnected&&
      (!deep||si.count===0)&&assembly.pass&&fabricationRows.every(r=>r.pass);
    const {flips,...topology}=a;
    return {...topology,selfIntersections:si.count,intersectionPairs:si.tested,
      intersectionPairVisits:si.pairVisits||0,
      auditBinReferences:si.binReferences||0,
      auditPeakBinOccupancy:si.peakBinOccupancy||0,
      auditBinsPerAxis:si.binsPerAxis||0,
      firstIntersectionPair:si.firstPair,rawComponents,discardedComponents,
      partDiagnostics,namedPartsConnected,minWeb:P.minWeb,
      expectedComponents:expected,assembly,retention:assembly.retention,
      fabricationRows,pass};
  }
  function tapCutters(S){return S.topo==='2way'?null:baseTapCutters(S);}

  return {TWO_ARCH,TWO_STARTS,BUILDS,
    twoWayMeshPolicyVersion:MESH_POLICY_VERSION,
    twoWayDriverCellSchemaVersion:DRIVER_CELL_SCHEMA_VERSION,
    twoWayCartridgeRetentionSchemaVersion:RETENTION_SCHEMA_VERSION,
    twoWayCornerPlateSchemaVersion:CORNER_PLATE_SCHEMA_VERSION,
    twoWayDriverArraySchemaVersion:DRIVER_ARRAY_SCHEMA_VERSION,
    twoWayDriverArrayModes:DRIVER_ARRAY_MODES,
    normalizeTwoWayDriverArrayRotation:normalizeDriverArrayRotation,
    twoWayDriverManifoldSchemaVersion:DRIVER_MANIFOLD_SCHEMA_VERSION,
    twoWayDriverMountModes:DRIVER_MOUNT_MODES,
    twoWayCartridgeRetentionDimensions:retentionDimensions(),
    twoWayConeProfileModes:CONE_PROFILE_MODES,
    twoWayDriverCellConstructions:DRIVER_CELL_CONSTRUCTIONS,
    twoWayConeReliefProfile:coneReliefProfile,
    migrateTwoWayState:migrate,
    twoWayPlan,twoWayPanelTopology:panelTopologyAt,
    twoWaySectionPoint:sectionPoint,
    twoWaySdCross:sdCross,
    twoWayApertureArea:apertureArea,twoWayApertureOutline:apertureOutline,
    twoWayApertureSupport:apertureSupport,
    twoWaySolidField:solidField,twoWayGeometry,twoWayMeshKey,
    constructiveImplicitMesh,
    twoWayMeshStateFingerprint,twoWayStateHash,
    twoWayMeshBudget,twoWayMeshPreflight,
    twoWayMeshLimits:MESH_LIMITS,clearTwoWayMeshCache,
    evaluate,evaluate2way:evaluate2,solve,applyTwoWayStart,smartAdapt2way,
    shellMesh,fabricationAudit,
    assemblyAudit,tapCutters,splitMeshComponents:splitComponents};
});
