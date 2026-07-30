/* MEH Studio v5 — provenance-bearing three-way analysis-report export.

   JSON analysis reports are distinct from manufacturing exports.  This
   module serializes only already-solved, JSON-safe values and checks state /
   solution hash parity.  It does not derive geometry or simulation data.

   Hornresp remains fail-closed: the audited King 2026 records contradict the
   legacy field ownership, direction, and units, and no new topology mapping
   has a source-pinned round-trip fixture yet. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3AnalysisExport=factory();
})(function(){
  'use strict';

  const VERSION=1;
  const REPORT_SCHEMA_VERSION=1;
  const FAILURE_CODES=Object.freeze({
    INPUT_INVALID:'THREEWAY_ANALYSIS_REPORT_INPUT_INVALID',
    STATE_INVALID:'THREEWAY_ANALYSIS_REPORT_STATE_INVALID',
    SOLUTION_INVALID:'THREEWAY_ANALYSIS_REPORT_SOLUTION_INVALID',
    HASH_MISMATCH:'THREEWAY_ANALYSIS_REPORT_HASH_MISMATCH',
    NONFINITE_VALUE:'THREEWAY_ANALYSIS_REPORT_NONFINITE_VALUE',
    HORNRESP_MAPPING_UNAVAILABLE:'THREEWAY_HORNRESP_MAPPING_UNAVAILABLE',
    HORNRESP_INPUT_INCOMPLETE:'THREEWAY_HORNRESP_INPUT_INCOMPLETE',
    MANUFACTURING_UNAVAILABLE:'THREEWAY_MANUFACTURING_UNAVAILABLE'
  });
  const CAPABILITIES=deepFreeze({
    status:'analysis-json-only',
    deterministicJsonReport:true,
    provenancePreservation:true,
    stateSolutionHashParity:true,
    hornrespT3:false,
    hornrespCX3:false,
    hornrespH3:false,
    hornrespCompound:false,
    manufacturingExport:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'A provenance-bearing JSON analysis report is not a verified Hornresp mapping or manufacturing artifact.'
  });
  const HORNRESP_BLOCKERS=deepFreeze({
    T3:[
      'source-pinned fixture for LF→ME2, MF→ME1, and real HF→Nd ownership',
      'verified S1 throat→S4 mouth direction for every horn segment',
      'verified Hornresp units and Vtc/Lrc/Atc/Ap field ownership',
      'round-trip fixture matching the audited King 2026 records'
    ],
    CX3:[
      'a model format for the shared MF/HF coaxial throat interface',
      'source-pinned LF station and shared-throat record mapping',
      'round-trip fixture'
    ],
    H3:[
      'separate MF/HF shared-horn and external-LF model graph',
      'verified export target capable of expressing that graph',
      'round-trip fixture'
    ],
    COMPOUND_RESEARCH:[
      'named compound subtype',
      'verified record graph and field mapping',
      'round-trip fixture'
    ]
  });

  function isObject(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
  }

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    for(const key of Object.keys(value))deepFreeze(value[key]);
    return Object.freeze(value);
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function stableClone(value,path,failures){
    const currentPath=path||'$';
    if(Array.isArray(value))
      return value.map((item,index)=>
        stableClone(item,currentPath+'['+index+']',failures)
      );
    if(isObject(value)){
      const result={};
      for(const key of Object.keys(value).sort()){
        if(value[key]===undefined)continue;
        result[key]=stableClone(
          value[key],currentPath+'.'+key,failures
        );
      }
      return result;
    }
    if(typeof value==='number'){
      if(!Number.isFinite(value)){
        failures.push(currentPath);
        return null;
      }
      return Object.is(value,-0)?0:value;
    }
    if(value===null||typeof value==='string'||typeof value==='boolean')
      return value;
    failures.push(currentPath);
    return null;
  }

  function stableJson(value,space){
    const failures=[],
      safe=stableClone(value,'$',failures);
    return {
      ok:failures.length===0,
      text:JSON.stringify(safe,null,space===undefined?2:space),
      value:safe,
      invalidPaths:[...new Set(failures)].sort()
    };
  }

  function fail(code,message,details){
    return deepFreeze({
      ok:false,
      code,
      message,
      details:isObject(details)?stableClone(details,'$',[]):{},
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function reportStateRecord(value){
    if(isObject(value)&&isObject(value.state))return value.state;
    return isObject(value)?value:null;
  }

  function reportHash(value){
    if(isObject(value)){
      return cleanString(value.inputHash)||
        cleanString(value.stateHashInput)||
        cleanString(value.hashInput);
    }
    return null;
  }

  function buildAnalysisReport(input){
    if(!isObject(input))return fail(
      FAILURE_CODES.INPUT_INVALID,
      'An explicit analysis-report input record is required.'
    );
    const state=reportStateRecord(input.state),
      solution=isObject(input.solution)?input.solution:null,
      stateHash=cleanString(input.stateHash)||
        reportHash(input.state),
      solutionHash=solution?reportHash(solution):null,
      topology=state&&state.topology
        ?cleanString(state.topology.kind):null;
    if(!state||Number(state.schemaVersion)!==2||!topology)
      return fail(
        FAILURE_CODES.STATE_INVALID,
        'A normalized schema-2 three-way state with explicit topology is required.'
      );
    if(!solution||Number(solution.schemaVersion)!==2)
      return fail(
        FAILURE_CODES.SOLUTION_INVALID,
        'A schema-2 three-way solution is required.'
      );
    if(!stateHash||!solutionHash||stateHash!==solutionHash)
      return fail(
        FAILURE_CODES.HASH_MISMATCH,
        'State and solution must carry the same nonempty input hash.',
        {stateHash,solutionHash}
      );
    const report={
      reportSchemaVersion:REPORT_SCHEMA_VERSION,
      reportKind:'meh-studio-threeway-analysis',
      generator:{
        module:'threeway-analysis-export',
        version:VERSION,
        build:cleanString(input.build)||null
      },
      design:{
        designId:cleanString(state.designId),
        revision:state.revision===undefined?null:state.revision,
        topology,
        inputHash:stateHash
      },
      state,
      solution,
      provenance:{
        records:state.provenance&&Array.isArray(
          state.provenance.records
        )?state.provenance.records:[],
        research:state.research||{},
        sourceLedgers:[
          'docs/threeway-primary-source-ledger.md',
          'docs/threeway-build-visual-ledger.md',
          'docs/threeway-king-2026-math-notes.md',
          'docs/threeway-rebuild-blueprint.md'
        ]
      },
      moduleManifest:Array.isArray(input.moduleManifest)
        ?input.moduleManifest:[],
      limitations:Array.isArray(input.limitations)
        ?input.limitations:[],
      exportCapabilities:{
        jsonAnalysis:true,
        hornresp:false,
        manufacturing:false,
        stl:false
      }
    };
    const serialized=stableJson(report,2);
    if(!serialized.ok)return fail(
      FAILURE_CODES.NONFINITE_VALUE,
      'The report contains nonfinite or non-JSON runtime values.',
      {invalidPaths:serialized.invalidPaths}
    );
    const designPart=(cleanString(state.designId)||'unspecified')
        .replace(/[^a-zA-Z0-9._-]+/g,'-'),
      frozenReport=deepFreeze(serialized.value);
    return deepFreeze({
      ok:true,
      code:null,
      report:frozenReport,
      filename:'MEH3-'+topology+'-'+designPart+'-analysis.json',
      mimeType:'application/json',
      text:serialized.text+'\n',
      hashInput:'meh3-analysis-report-v1\n'+serialized.text,
      hornrespAvailable:false,
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function hornrespPreflight(topology,inputCompleteness){
    const kind=cleanString(topology),
      blockers=HORNRESP_BLOCKERS[kind];
    if(!blockers)return fail(
      FAILURE_CODES.HORNRESP_MAPPING_UNAVAILABLE,
      'Hornresp export requires an explicit T3, CX3, H3, or COMPOUND_RESEARCH topology.',
      {topology:kind}
    );
    const missing=isObject(inputCompleteness)&&
        Array.isArray(inputCompleteness.missingPaths)
      ?inputCompleteness.missingPaths.map(cleanString)
        .filter(Boolean).sort():[];
    if(missing.length)return fail(
      FAILURE_CODES.HORNRESP_INPUT_INCOMPLETE,
      'Hornresp input fields are incomplete.',
      {topology:kind,missingPaths:missing,blockers}
    );
    return fail(
      FAILURE_CODES.HORNRESP_MAPPING_UNAVAILABLE,
      'No source-pinned round-trip Hornresp mapping is admitted for '+kind+'.',
      {topology:kind,blockers}
    );
  }

  function manufacturingPreflight(operation){
    return fail(
      FAILURE_CODES.MANUFACTURING_UNAVAILABLE,
      CAPABILITIES.reason,
      {operation:cleanString(operation)||'manufacturing-export'}
    );
  }

  return deepFreeze({
    version:VERSION,
    reportSchemaVersion:REPORT_SCHEMA_VERSION,
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    hornrespBlockers:HORNRESP_BLOCKERS,
    stableJson,
    buildAnalysisReport,
    hornrespPreflight,
    manufacturingPreflight
  });
});
