/* MEH Studio v5 — schema-2 three-way controller / transaction boundary.

   The controller owns candidate-state transactions, asynchronous solve
   identity, and canonical persistence records. It has no DOM or storage
   global, and it never reads a two-way state channel. Storage is performed
   only through an explicitly supplied adapter.

   A solver result is not trusted merely because it arrived last: request id,
   candidate revision, normalized schema-2 input hash, and the canonical hash
   of the explicit physical-analysis input must all match before it can become
   ready, and must match again before commit. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(
    require('./threeway-state-contract.js'),
    require('./threeway-reference-cards.js'),
    null
  );
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3Controller=factory(
      globalThis.MEH3StateContract,
      globalThis.MEH3ReferenceCards,
      globalThis.MEH3ThreewaySolver
    );
})(function(DefaultStateContract,DefaultReferenceCards,DefaultSolver){
  'use strict';

  const VERSION=1;
  const STORAGE_KEY='meh5_threeway_state_v2';
  const ANALYSIS_HASH_VERSION='meh3-analysis-input-v1';
  const ACTIONS=deepFreeze({
    START_FROM_REFERENCE_CARD:'threeway/start-from-reference-card',
    SWITCH_TOPOLOGY_CARD:'threeway/switch-topology-card',
    REPLACE_CANDIDATE_STATE:'threeway/replace-candidate-state',
    UPDATE_USER_INTENT:'threeway/update-user-intent',
    BEGIN_SOLVE:'threeway/begin-solve',
    RECEIVE_SOLVE_RESULT:'threeway/receive-solve-result',
    COMMIT_SOLUTION:'threeway/commit-solution',
    RESTORE_SERIALIZED_STATE:'threeway/restore-serialized-state'
  });
  const FAILURE_CODES=deepFreeze({
    DEPENDENCY_UNAVAILABLE:'THREEWAY_CONTROLLER_DEPENDENCY_UNAVAILABLE',
    ACTION_INVALID:'THREEWAY_CONTROLLER_ACTION_INVALID',
    REFERENCE_CARD_FAILED:'THREEWAY_CONTROLLER_REFERENCE_CARD_FAILED',
    CANDIDATE_INVALID:'THREEWAY_CONTROLLER_CANDIDATE_INVALID',
    CANDIDATE_REQUIRED:'THREEWAY_CONTROLLER_CANDIDATE_REQUIRED',
    USER_INTENT_NOT_ALLOWED:'THREEWAY_CONTROLLER_USER_INTENT_NOT_ALLOWED',
    USER_INTENT_INVALID:'THREEWAY_CONTROLLER_USER_INTENT_INVALID',
    TOPOLOGY_SWITCH_REQUIRES_CARD:
      'THREEWAY_CONTROLLER_TOPOLOGY_SWITCH_REQUIRES_CARD',
    SOLVE_REQUEST_INVALID:'THREEWAY_CONTROLLER_SOLVE_REQUEST_INVALID',
    ANALYSIS_INPUT_INVALID:'THREEWAY_CONTROLLER_ANALYSIS_INPUT_INVALID',
    SOLVER_UNAVAILABLE:'THREEWAY_CONTROLLER_SOLVER_UNAVAILABLE',
    SOLVER_FAILED:'THREEWAY_CONTROLLER_SOLVER_FAILED',
    SOLVE_RESULT_INVALID:'THREEWAY_CONTROLLER_SOLVE_RESULT_INVALID',
    STALE_SOLVE_RESULT:'THREEWAY_CONTROLLER_STALE_SOLVE_RESULT',
    INPUT_HASH_MISMATCH:'THREEWAY_CONTROLLER_INPUT_HASH_MISMATCH',
    MANUFACTURING_CLAIM_FORBIDDEN:
      'THREEWAY_CONTROLLER_MANUFACTURING_CLAIM_FORBIDDEN',
    COMMIT_NOT_READY:'THREEWAY_CONTROLLER_COMMIT_NOT_READY',
    PERSISTENCE_INVALID:'THREEWAY_CONTROLLER_PERSISTENCE_INVALID',
    STORAGE_ADAPTER_INVALID:'THREEWAY_CONTROLLER_STORAGE_ADAPTER_INVALID'
  });
  const USER_INTENT_FIELDS=deepFreeze({
    'intent.crossoversHz.lowMid':{
      unit:'Hz',
      minimumExclusive:0,
      topologies:['T3','CX3','H3']
    },
    'intent.crossoversHz.midHigh':{
      unit:'Hz',
      minimumExclusive:0,
      topologies:['T3','CX3','H3']
    },
    'intent.mouthLimitM.width':{
      unit:'m',
      minimumExclusive:0,
      topologies:['T3','CX3','H3','COMPOUND_RESEARCH']
    },
    'intent.mouthLimitM.height':{
      unit:'m',
      minimumExclusive:0,
      topologies:['T3','CX3','H3','COMPOUND_RESEARCH']
    }
  });
  const PERSISTENCE_OMIT_KEYS=deepFreeze([
    'capabilities',
    'readiness',
    'solution',
    'solutions',
    'solveResult',
    'mesh',
    'meshes',
    'previewMesh',
    'renderModel',
    'manufacturing',
    'manufacturingPlan',
    'manufacturingValidated',
    'exactSolid',
    'stl',
    'geometryResolved',
    'analysisResolved'
  ]);
  const MANUFACTURING_TRUE_KEYS=deepFreeze([
    'manufacturing',
    'manufacturingPlan',
    'manufacturingValidated',
    'exactSolid',
    'stl'
  ]);
  const CAPABILITIES=deepFreeze({
    status:'schema-2-controller-transaction-boundary',
    immutableReducer:true,
    referenceCardStart:true,
    candidateReplacement:true,
    topologyAwareUserIntent:true,
    explicitSolveTransactions:true,
    staleResultRejection:true,
    normalizedHashCommitGuard:true,
    analysisInputHashCommitGuard:true,
    finiteJsonAnalysisInput:true,
    canonicalSchema2Persistence:true,
    storageAdapterRequired:true,
    domAccess:false,
    implicitStorageGlobal:false,
    twoWayStateImport:false,
    topologyGraphMutation:false,
    manufacturing:false,
    stl:false,
    reason:
      'This controller coordinates schema-2 input and analysis transactions only; it never grants manufacturing authority.'
  });

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

  function finite(value){
    return typeof value==='number'&&Number.isFinite(value)
      ?(Object.is(value,-0)?0:value):null;
  }

  function nonnegativeInteger(value){
    return typeof value==='number'&&
      Number.isInteger(value)&&value>=0?value:null;
  }

  function isPlainJsonObject(value){
    if(!isObject(value))return false;
    const prototype=Object.getPrototypeOf(value);
    if(prototype===null||prototype===Object.prototype)return true;
    return Object.prototype.toString.call(value)==='[object Object]'&&
      typeof prototype.constructor==='function'&&
      prototype.constructor.name==='Object';
  }

  function normalizeFiniteJson(value,path,active){
    const type=typeof value;
    if(value===null||type==='string'||type==='boolean')
      return {ok:true,value};
    if(type==='number')return Number.isFinite(value)
      ?{ok:true,value:Object.is(value,-0)?0:value}
      :{ok:false,path,reason:'Every analysis number must be finite.'};
    if(type!=='object')return {
      ok:false,path,
      reason:'Analysis input may contain only JSON data values.'
    };
    if(active.has(value))return {
      ok:false,path,
      reason:'Analysis input must not contain reference cycles.'
    };
    if(!Array.isArray(value)&&!isPlainJsonObject(value))return {
      ok:false,path,
      reason:'Runtime objects are not valid physical-analysis input.'
    };
    const ownKeys=Reflect.ownKeys(value);
    if(ownKeys.some(key=>typeof key!=='string'))return {
      ok:false,path,
      reason:'Symbol-keyed analysis data is not valid JSON.'
    };
    active.add(value);
    if(Array.isArray(value)){
      const result=[];
      for(let index=0;index<value.length;index++){
        if(!Object.prototype.hasOwnProperty.call(value,index)){
          active.delete(value);
          return {
            ok:false,path:path+'['+index+']',
            reason:'Sparse analysis arrays are not accepted.'
          };
        }
        const descriptor=Object.getOwnPropertyDescriptor(
          value,String(index)
        );
        if(!descriptor||!Object.prototype.hasOwnProperty.call(
          descriptor,'value'
        )){
          active.delete(value);
          return {
            ok:false,path:path+'['+index+']',
            reason:'Accessor-backed analysis values are not accepted.'
          };
        }
        const normalized=normalizeFiniteJson(
          descriptor.value,path+'['+index+']',active
        );
        if(!normalized.ok){
          active.delete(value);
          return normalized;
        }
        result.push(normalized.value);
      }
      const extraKeys=ownKeys.filter(key=>
        key!=='length'&&!/^(0|[1-9]\d*)$/.test(key)
      );
      active.delete(value);
      if(extraKeys.length)return {
        ok:false,path:path+'.'+extraKeys[0],
        reason:'JSON arrays cannot carry named properties.'
      };
      return {ok:true,value:result};
    }
    const result={};
    for(const key of ownKeys.slice().sort()){
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(!descriptor||descriptor.enumerable!==true||
          !Object.prototype.hasOwnProperty.call(descriptor,'value')){
        active.delete(value);
        return {
          ok:false,path:path+'.'+key,
          reason:'Analysis objects require enumerable data properties.'
        };
      }
      const normalized=normalizeFiniteJson(
        descriptor.value,path+'.'+key,active
      );
      if(!normalized.ok){
        active.delete(value);
        return normalized;
      }
      Object.defineProperty(result,key,{
        value:normalized.value,
        enumerable:true,
        writable:true,
        configurable:true
      });
    }
    active.delete(value);
    return {ok:true,value:result};
  }

  function normalizeAnalysisInput(value,dependencies){
    if(!isPlainJsonObject(value))return {
      ok:false,
      diagnostics:[diagnostic(
        FAILURE_CODES.ANALYSIS_INPUT_INVALID,
        ['action.analysisInput'],
        'A solve requires an explicit plain JSON analysis-input object.'
      )]
    };
    const normalized=normalizeFiniteJson(
      value,'analysisInput',new WeakSet()
    );
    if(!normalized.ok)return {
      ok:false,
      diagnostics:[diagnostic(
        FAILURE_CODES.ANALYSIS_INPUT_INVALID,
        [normalized.path],
        normalized.reason
      )]
    };
    const analysisInput=deepFreeze(normalized.value),
      canonical=dependencies.stateContract.stableStringify(
        analysisInput
      );
    return {
      ok:true,
      analysisInput,
      analysisInputHash:ANALYSIS_HASH_VERSION+'\n'+canonical
    };
  }

  function diagnostic(code,paths,message,details){
    return deepFreeze({
      code,
      severity:'error',
      phase:'threeway-controller',
      paths:(paths||[]).filter(Boolean).slice().sort(),
      message,
      details:isObject(details)?cloneValue(details):{},
      blocksCapabilities:[
        'solve','commit','preview','manufacturing','stl'
      ]
    });
  }

  function sortDiagnostics(items){
    return items.slice().sort((left,right)=>
      left.code.localeCompare(right.code)||
      left.paths.join('|').localeCompare(right.paths.join('|'))||
      left.message.localeCompare(right.message)
    );
  }

  function initialControllerState(){
    return deepFreeze({
      schemaVersion:1,
      storageKey:STORAGE_KEY,
      candidateRevision:0,
      candidate:null,
      solve:{
        status:'idle',
        requestId:null,
        revision:null,
        inputHash:null,
        analysisInputHash:null,
        result:null,
        diagnostics:[]
      },
      committed:null,
      lastAction:'initialized',
      manufacturing:false,
      stl:false
    });
  }

  function transition(ok,state,code,diagnostics,extra){
    return deepFreeze({
      ok,
      code:code||null,
      state,
      diagnostics:sortDiagnostics(diagnostics||[]),
      solveRequest:extra&&extra.solveRequest||null,
      persistenceRecord:extra&&extra.persistenceRecord||null,
      manufacturing:false,
      stl:false
    });
  }

  function fail(state,code,paths,message,details){
    return transition(
      false,state,code,[diagnostic(code,paths,message,details)]
    );
  }

  function dependencyErrors(dependencies,needsSolver){
    const errors=[],
      stateContract=dependencies.stateContract,
      referenceCards=dependencies.referenceCards,
      solver=dependencies.solver;
    if(!stateContract||
        typeof stateContract.normalizeThreeWayState!=='function'||
        typeof stateContract.stateHashInput!=='function'||
        typeof stateContract.stableStringify!=='function')
      errors.push(diagnostic(
        FAILURE_CODES.DEPENDENCY_UNAVAILABLE,
        ['dependencies.stateContract'],
        'The schema-2 state-contract API is unavailable.'
      ));
    if(!referenceCards||
        typeof referenceCards.applyReferenceCard!=='function'||
        typeof referenceCards.getReferenceCard!=='function')
      errors.push(diagnostic(
        FAILURE_CODES.DEPENDENCY_UNAVAILABLE,
        ['dependencies.referenceCards'],
        'The three-way reference-card API is unavailable.'
      ));
    if(needsSolver&&!solverMethod(solver))
      errors.push(diagnostic(
        FAILURE_CODES.SOLVER_UNAVAILABLE,
        ['dependencies.solver'],
        'An explicit three-way solver API is required to execute a solve request.'
      ));
    return errors;
  }

  function solverMethod(solver){
    if(!solver)return null;
    if(typeof solver.solveCandidate==='function')
      return solver.solveCandidate.bind(solver);
    if(typeof solver.solveThreeWay==='function')
      return solver.solveThreeWay.bind(solver);
    if(typeof solver.solve==='function')
      return solver.solve.bind(solver);
    return null;
  }

  function stripDerivedState(value){
    if(Array.isArray(value))return value.map(stripDerivedState);
    if(!isObject(value))return cloneValue(value);
    const result={};
    for(const key of Object.keys(value)){
      if(PERSISTENCE_OMIT_KEYS.includes(key))continue;
      result[key]=stripDerivedState(value[key]);
    }
    return result;
  }

  function normalizeCandidate(raw,dependencies){
    const errors=dependencyErrors(dependencies,false);
    if(errors.length)return {ok:false,diagnostics:errors};
    if(!isObject(raw)||Number(raw.schemaVersion)!==2)return {
      ok:false,
      diagnostics:[diagnostic(
        FAILURE_CODES.CANDIDATE_INVALID,['candidate'],
        'A candidate must be an explicit schema-2 state record.'
      )]
    };
    const first=dependencies.stateContract.normalizeThreeWayState(raw);
    if(!first||!isObject(first.state)||!cleanString(first.hashInput))return {
      ok:false,
      diagnostics:[
        diagnostic(
          FAILURE_CODES.CANDIDATE_INVALID,['candidate'],
          'The schema-2 state contract could not canonicalize the candidate.',
          {
            stateDiagnostics:first&&Array.isArray(first.diagnostics)
              ?first.diagnostics:[]
          }
        )
      ]
    };
    const inputOnly=stripDerivedState(first.state),
      second=dependencies.stateContract.normalizeThreeWayState(inputOnly);
    if(!second||!isObject(second.state)||!cleanString(second.hashInput))return {
      ok:false,
      diagnostics:[
        diagnostic(
          FAILURE_CODES.CANDIDATE_INVALID,['candidate'],
          'The state contract could not canonicalize the input-only candidate.',
          {
            stateDiagnostics:second&&Array.isArray(second.diagnostics)
              ?second.diagnostics:[]
          }
        )
      ]
    };
    return {
      ok:true,
      state:second.state,
      inputHash:second.hashInput,
      valid:second.valid===true,
      stateDiagnostics:second.diagnostics
    };
  }

  function unsolvedController(previous,normalized,source,lastAction){
    const revision=previous.candidateRevision+1;
    return deepFreeze({
      schemaVersion:1,
      storageKey:STORAGE_KEY,
      candidateRevision:revision,
      candidate:{
        state:normalized.state,
        inputHash:normalized.inputHash,
        valid:normalized.valid,
        diagnostics:cloneValue(normalized.stateDiagnostics||[]),
        source:cloneValue(source)
      },
      solve:{
        status:'unsolved',
        requestId:null,
        revision:null,
        inputHash:null,
        analysisInputHash:null,
        result:null,
        diagnostics:[]
      },
      committed:null,
      lastAction,
      manufacturing:false,
      stl:false
    });
  }

  function startFromCard(controller,action,dependencies,isSwitch){
    const cardId=cleanString(action.cardId);
    if(!cardId)return fail(
      controller,FAILURE_CODES.ACTION_INVALID,['action.cardId'],
      'A reference card id is required.'
    );
    const applied=dependencies.referenceCards.applyReferenceCard(cardId);
    if(!applied||applied.ok!==true||!isObject(applied.state))
      return fail(
        controller,FAILURE_CODES.REFERENCE_CARD_FAILED,
        ['action.cardId'],
        'The requested reference card could not start a candidate.',
        {
          cardId,
          referenceDiagnostics:applied&&applied.diagnostics||[]
        }
      );
    const normalized=normalizeCandidate(applied.state,dependencies);
    if(!normalized.ok)return transition(
      false,controller,FAILURE_CODES.CANDIDATE_INVALID,
      normalized.diagnostics
    );
    const topology=normalized.state.topology&&
      normalized.state.topology.kind;
    return transition(
      true,
      unsolvedController(
        controller,normalized,
        {
          kind:'reference-card',
          cardId,
          topology
        },
        isSwitch?ACTIONS.SWITCH_TOPOLOGY_CARD:
          ACTIONS.START_FROM_REFERENCE_CARD
      ),
      isSwitch?'THREEWAY_TOPOLOGY_CARD_STARTED':
        'THREEWAY_REFERENCE_CARD_STARTED',
      []
    );
  }

  function replaceCandidate(controller,action,dependencies,lastAction){
    const normalized=normalizeCandidate(action.state,dependencies);
    if(!normalized.ok)return transition(
      false,controller,FAILURE_CODES.CANDIDATE_INVALID,
      normalized.diagnostics
    );
    return transition(
      true,
      unsolvedController(
        controller,normalized,
        {
          kind:lastAction===ACTIONS.RESTORE_SERIALIZED_STATE
            ?'restored-canonical-state':'replacement-candidate',
          cardId:null,
          topology:normalized.state.topology&&
            normalized.state.topology.kind
        },
        lastAction
      ),
      lastAction===ACTIONS.RESTORE_SERIALIZED_STATE
        ?'THREEWAY_CANONICAL_STATE_RESTORED':
          'THREEWAY_CANDIDATE_REPLACED',
      []
    );
  }

  function setPath(record,path,value){
    const parts=path.split('.'),
      result=cloneValue(record);
    let cursor=result;
    for(let index=0;index<parts.length-1;index++){
      const key=parts[index];
      if(!isObject(cursor[key]))cursor[key]={};
      cursor=cursor[key];
    }
    cursor[parts[parts.length-1]]=value;
    return result;
  }

  function updateUserIntent(controller,action,dependencies){
    if(!controller.candidate)return fail(
      controller,FAILURE_CODES.CANDIDATE_REQUIRED,['candidate'],
      'Start or replace a candidate before updating user intent.'
    );
    const path=cleanString(action.path),
      policy=path&&USER_INTENT_FIELDS[path],
      topology=controller.candidate.state.topology&&
        controller.candidate.state.topology.kind;
    if(!policy||!policy.topologies.includes(topology))
      return fail(
        controller,FAILURE_CODES.USER_INTENT_NOT_ALLOWED,
        ['action.path'],
        'This field is not an allowlisted user-intent field for the active topology.',
        {
          path,
          topology,
          allowlistedPaths:Object.keys(USER_INTENT_FIELDS)
        }
      );
    const value=finite(action.value);
    if(value===null||value<=policy.minimumExclusive)
      return fail(
        controller,FAILURE_CODES.USER_INTENT_INVALID,
        ['action.value'],
        'User intent must be an explicit positive finite SI value.',
        {path,value:action.value,unit:policy.unit}
      );
    let candidate=setPath(controller.candidate.state,path,value);
    candidate.revision=
      (nonnegativeInteger(candidate.revision)||0)+1;
    const crossovers=candidate.intent&&candidate.intent.crossoversHz;
    if(isObject(crossovers)&&
        finite(crossovers.lowMid)!==null&&
        finite(crossovers.midHigh)!==null&&
        Number(crossovers.lowMid)>=Number(crossovers.midHigh))
      return fail(
        controller,FAILURE_CODES.USER_INTENT_INVALID,
        [
          'intent.crossoversHz.lowMid',
          'intent.crossoversHz.midHigh'
        ],
        'The explicit low/mid crossover must remain below the mid/high crossover.',
        {
          lowMidHz:crossovers.lowMid,
          midHighHz:crossovers.midHigh
        }
      );
    const normalized=normalizeCandidate(candidate,dependencies);
    if(!normalized.ok)return transition(
      false,controller,FAILURE_CODES.CANDIDATE_INVALID,
      normalized.diagnostics
    );
    return transition(
      true,
      unsolvedController(
        controller,normalized,
        {
          kind:'user-intent-update',
          cardId:controller.candidate.source.cardId,
          topology
        },
        ACTIONS.UPDATE_USER_INTENT
      ),
      'THREEWAY_USER_INTENT_UPDATED',
      []
    );
  }

  function beginSolve(controller,action,dependencies){
    if(!controller.candidate)return fail(
      controller,FAILURE_CODES.CANDIDATE_REQUIRED,['candidate'],
      'A normalized candidate is required before solving.'
    );
    if(controller.candidate.valid!==true)return fail(
      controller,FAILURE_CODES.CANDIDATE_INVALID,['candidate'],
      'The canonical candidate still has schema/topology errors and cannot be solved.',
      {stateDiagnostics:controller.candidate.diagnostics||[]}
    );
    const requestId=cleanString(action.requestId);
    if(!requestId)return fail(
      controller,FAILURE_CODES.SOLVE_REQUEST_INVALID,
      ['action.requestId'],
      'Every solve transaction needs a nonempty request id.'
    );
    if(!Object.prototype.hasOwnProperty.call(action,'analysisInput'))
      return fail(
        controller,FAILURE_CODES.ANALYSIS_INPUT_INVALID,
        ['action.analysisInput'],
        'Every solve transaction needs explicit physical analysis input.'
      );
    const normalizedAnalysis=normalizeAnalysisInput(
      action.analysisInput,dependencies
    );
    if(!normalizedAnalysis.ok)return transition(
      false,controller,FAILURE_CODES.ANALYSIS_INPUT_INVALID,
      normalizedAnalysis.diagnostics
    );
    const normalized=normalizeCandidate(
      controller.candidate.state,dependencies
    );
    if(!normalized.ok)return transition(
      false,controller,FAILURE_CODES.CANDIDATE_INVALID,
      normalized.diagnostics
    );
    if(normalized.inputHash!==controller.candidate.inputHash)
      return fail(
        controller,FAILURE_CODES.INPUT_HASH_MISMATCH,
        ['candidate.inputHash'],
        'The candidate no longer matches its normalized schema-2 input hash.'
      );
    const request=deepFreeze({
      schemaVersion:1,
      requestId,
      revision:controller.candidateRevision,
      inputHash:normalized.inputHash,
      analysisInputHash:normalizedAnalysis.analysisInputHash,
      state:normalized.state,
      analysisInput:normalizedAnalysis.analysisInput
    });
    const next=deepFreeze({
      ...cloneValue(controller),
      solve:{
        status:'pending',
        requestId,
        revision:controller.candidateRevision,
        inputHash:normalized.inputHash,
        analysisInputHash:normalizedAnalysis.analysisInputHash,
        result:null,
        diagnostics:[]
      },
      committed:null,
      lastAction:ACTIONS.BEGIN_SOLVE,
      manufacturing:false,
      stl:false
    });
    return transition(
      true,next,'THREEWAY_SOLVE_REQUESTED',[],
      {solveRequest:request}
    );
  }

  function transactionIdentity(record){
    const source=isObject(record)?record:{};
    return {
      requestId:cleanString(source.requestId),
      revision:nonnegativeInteger(source.revision),
      inputHash:cleanString(source.inputHash),
      analysisInputHash:cleanString(source.analysisInputHash)
    };
  }

  function sameIdentity(left,right){
    return left.requestId===right.requestId&&
      left.revision===right.revision&&
      left.inputHash===right.inputHash&&
      left.analysisInputHash===right.analysisInputHash;
  }

  function claimsManufacturing(value){
    if(Array.isArray(value))return value.some(claimsManufacturing);
    if(!isObject(value))return false;
    for(const key of Object.keys(value)){
      if(MANUFACTURING_TRUE_KEYS.includes(key)&&value[key]===true)
        return true;
      if(claimsManufacturing(value[key]))return true;
    }
    return false;
  }

  function receiveSolveResult(controller,action,dependencies){
    if(controller.solve.status!=='pending')
      return fail(
        controller,FAILURE_CODES.STALE_SOLVE_RESULT,
        ['solve.status'],
        'No matching solve request is pending.'
      );
    const pending=transactionIdentity(controller.solve),
      actionIdentity=transactionIdentity(action),
      result=isObject(action.result)?action.result:null,
      resultIdentity=transactionIdentity(result);
    if(!sameIdentity(pending,actionIdentity)||
        !sameIdentity(pending,resultIdentity)||
        controller.candidateRevision!==pending.revision||
        !controller.candidate||
        controller.candidate.inputHash!==pending.inputHash)
      return fail(
        controller,FAILURE_CODES.STALE_SOLVE_RESULT,
        [
          'action.requestId','action.revision','action.inputHash',
          'action.analysisInputHash',
          'action.result.requestId','action.result.revision',
          'action.result.inputHash',
          'action.result.analysisInputHash'
        ],
        'Solve result request, revision, candidate hash, and analysis-input hash must all match the pending transaction.',
        {pending,action:actionIdentity,result:resultIdentity}
      );
    const normalized=normalizeCandidate(
      controller.candidate.state,dependencies
    );
    if(!normalized.ok)return transition(
      false,controller,FAILURE_CODES.CANDIDATE_INVALID,
      normalized.diagnostics
    );
    if(normalized.inputHash!==pending.inputHash||
        result.inputHash!==normalized.inputHash)
      return fail(
        controller,FAILURE_CODES.INPUT_HASH_MISMATCH,
        ['candidate','action.result.inputHash'],
        'The normalized candidate hash does not match the solve result hash.',
        {
          normalizedInputHash:normalized.inputHash,
          solveResultInputHash:result.inputHash
        }
      );
    if(claimsManufacturing(result))
      return fail(
        controller,FAILURE_CODES.MANUFACTURING_CLAIM_FORBIDDEN,
        ['action.result'],
        'A solver result with a positive manufacturing, exact-solid, or STL claim cannot enter the controller.'
      );
    if(result.ok!==true){
      const next=deepFreeze({
        ...cloneValue(controller),
        solve:{
          status:'failed',
          requestId:pending.requestId,
          revision:pending.revision,
          inputHash:pending.inputHash,
          analysisInputHash:pending.analysisInputHash,
          result:null,
          diagnostics:Array.isArray(result.diagnostics)
            ?cloneValue(result.diagnostics):[]
        },
        committed:null,
        lastAction:ACTIONS.RECEIVE_SOLVE_RESULT,
        manufacturing:false,
        stl:false
      });
      return transition(
        true,next,FAILURE_CODES.SOLVER_FAILED,[]
      );
    }
    const next=deepFreeze({
      ...cloneValue(controller),
      solve:{
        status:'ready',
        requestId:pending.requestId,
        revision:pending.revision,
        inputHash:pending.inputHash,
        analysisInputHash:pending.analysisInputHash,
        result:cloneValue(result),
        diagnostics:Array.isArray(result.diagnostics)
          ?cloneValue(result.diagnostics):[]
      },
      committed:null,
      lastAction:ACTIONS.RECEIVE_SOLVE_RESULT,
      manufacturing:false,
      stl:false
    });
    return transition(
      true,next,'THREEWAY_SOLVE_RESULT_READY',[]
    );
  }

  function commitSolution(controller,action,dependencies){
    if(controller.solve.status!=='ready'||!controller.solve.result)
      return fail(
        controller,FAILURE_CODES.COMMIT_NOT_READY,['solve.status'],
        'Only a ready, matching solve result can be committed.'
      );
    const ready=transactionIdentity(controller.solve),
      requested=transactionIdentity(action),
      resultIdentity=transactionIdentity(controller.solve.result);
    if(!sameIdentity(ready,requested)||
        !sameIdentity(ready,resultIdentity)||
        controller.candidateRevision!==ready.revision||
        !controller.candidate||
        controller.candidate.inputHash!==ready.inputHash)
      return fail(
        controller,FAILURE_CODES.STALE_SOLVE_RESULT,
        ['action','solve','candidate'],
        'Commit request, ready result, and current candidate transaction identities must match.'
      );
    const normalized=normalizeCandidate(
      controller.candidate.state,dependencies
    );
    if(!normalized.ok)return transition(
      false,controller,FAILURE_CODES.CANDIDATE_INVALID,
      normalized.diagnostics
    );
    if(normalized.inputHash!==ready.inputHash||
        controller.solve.result.inputHash!==normalized.inputHash)
      return fail(
        controller,FAILURE_CODES.INPUT_HASH_MISMATCH,
        ['candidate','solve.result.inputHash'],
        'Commit refused because the normalized input hash no longer matches the solve result.'
      );
    if(claimsManufacturing(controller.solve.result))
      return fail(
        controller,FAILURE_CODES.MANUFACTURING_CLAIM_FORBIDDEN,
        ['solve.result'],
        'Manufacturing claims cannot be committed by this controller.'
      );
    const next=deepFreeze({
      ...cloneValue(controller),
      solve:{
        ...cloneValue(controller.solve),
        status:'committed'
      },
      committed:{
        requestId:ready.requestId,
        revision:ready.revision,
        inputHash:ready.inputHash,
        analysisInputHash:ready.analysisInputHash,
        inputState:normalized.state,
        solveResult:cloneValue(controller.solve.result)
      },
      lastAction:ACTIONS.COMMIT_SOLUTION,
      manufacturing:false,
      stl:false
    });
    return transition(
      true,next,'THREEWAY_SOLUTION_COMMITTED',[]
    );
  }

  function restoreSerialized(controller,action,dependencies){
    if(typeof action.value!=='string'||!action.value.trim())
      return fail(
        controller,FAILURE_CODES.PERSISTENCE_INVALID,
        ['action.value'],
        'A serialized canonical schema-2 state string is required.'
      );
    let parsed;
    try{
      parsed=JSON.parse(action.value);
    }catch(error){
      return fail(
        controller,FAILURE_CODES.PERSISTENCE_INVALID,
        ['action.value'],
        'Stored three-way input is not valid JSON.',
        {error:String(error&&error.message||error)}
      );
    }
    if(!isObject(parsed)||Number(parsed.schemaVersion)!==2)
      return fail(
        controller,FAILURE_CODES.PERSISTENCE_INVALID,
        ['action.value.schemaVersion'],
        'Stored content must be the canonical schema-2 input state itself, not a controller or solution wrapper.'
      );
    return replaceCandidate(
      controller,{state:parsed},dependencies,
      ACTIONS.RESTORE_SERIALIZED_STATE
    );
  }

  function reduceController(controller,action,dependencies){
    const current=isObject(controller)?controller:
      initialControllerState(),
      errors=dependencyErrors(dependencies,false);
    if(errors.length)return transition(
      false,current,FAILURE_CODES.DEPENDENCY_UNAVAILABLE,errors
    );
    if(!isObject(action)||!cleanString(action.type))
      return fail(
        current,FAILURE_CODES.ACTION_INVALID,['action'],
        'A controller action with an explicit type is required.'
      );
    switch(action.type){
      case ACTIONS.START_FROM_REFERENCE_CARD:
        return startFromCard(current,action,dependencies,false);
      case ACTIONS.SWITCH_TOPOLOGY_CARD:
        return startFromCard(current,action,dependencies,true);
      case ACTIONS.REPLACE_CANDIDATE_STATE:
        return replaceCandidate(
          current,action,dependencies,ACTIONS.REPLACE_CANDIDATE_STATE
        );
      case ACTIONS.UPDATE_USER_INTENT:
        return updateUserIntent(current,action,dependencies);
      case ACTIONS.BEGIN_SOLVE:
        return beginSolve(current,action,dependencies);
      case ACTIONS.RECEIVE_SOLVE_RESULT:
        return receiveSolveResult(current,action,dependencies);
      case ACTIONS.COMMIT_SOLUTION:
        return commitSolution(current,action,dependencies);
      case ACTIONS.RESTORE_SERIALIZED_STATE:
        return restoreSerialized(current,action,dependencies);
      default:
        return fail(
          current,FAILURE_CODES.ACTION_INVALID,['action.type'],
          'Unknown three-way controller action.',
          {type:action.type,allowed:Object.values(ACTIONS)}
        );
    }
  }

  function persistenceRecord(controller,dependencies){
    if(!isObject(controller)||!controller.candidate)
      return {
        ok:false,
        code:FAILURE_CODES.CANDIDATE_REQUIRED,
        diagnostics:[diagnostic(
          FAILURE_CODES.CANDIDATE_REQUIRED,['candidate'],
          'A canonical candidate is required before persistence.'
        )]
      };
    const normalized=normalizeCandidate(
      controller.candidate.state,dependencies
    );
    if(!normalized.ok)return {
      ok:false,
      code:FAILURE_CODES.PERSISTENCE_INVALID,
      diagnostics:normalized.diagnostics
    };
    if(normalized.inputHash!==controller.candidate.inputHash)
      return {
        ok:false,
        code:FAILURE_CODES.INPUT_HASH_MISMATCH,
        diagnostics:[diagnostic(
          FAILURE_CODES.INPUT_HASH_MISMATCH,
          ['candidate.inputHash'],
          'Persistence refused because the normalized input hash changed.'
        )]
      };
    const value=dependencies.stateContract.stableStringify(
      normalized.state
    );
    return deepFreeze({
      ok:true,
      code:'THREEWAY_CANONICAL_STATE_SERIALIZED',
      key:STORAGE_KEY,
      value,
      inputHash:normalized.inputHash,
      schemaVersion:2,
      diagnostics:[]
    });
  }

  function persistCanonicalState(controller,adapter,dependencies){
    const record=persistenceRecord(controller,dependencies);
    if(!record.ok)return record;
    if(!adapter||typeof adapter.write!=='function')
      return deepFreeze({
        ok:false,
        code:FAILURE_CODES.STORAGE_ADAPTER_INVALID,
        key:STORAGE_KEY,
        diagnostics:[diagnostic(
          FAILURE_CODES.STORAGE_ADAPTER_INVALID,['adapter.write'],
          'Persistence requires an explicit external adapter.write(key, value) function.'
        )]
      });
    adapter.write(record.key,record.value);
    return deepFreeze({
      ok:true,
      code:'THREEWAY_CANONICAL_STATE_PERSISTED',
      key:record.key,
      inputHash:record.inputHash,
      schemaVersion:2,
      diagnostics:[]
    });
  }

  async function executeSolveRequest(request,dependencies){
    const identity=transactionIdentity(request),
      failedAction=diagnostics=>deepFreeze({
        type:ACTIONS.RECEIVE_SOLVE_RESULT,
        requestId:identity.requestId,
        revision:identity.revision,
        inputHash:identity.inputHash,
        analysisInputHash:identity.analysisInputHash,
        result:{
          ok:false,
          requestId:identity.requestId,
          revision:identity.revision,
          inputHash:identity.inputHash,
          analysisInputHash:identity.analysisInputHash,
          diagnostics
        }
      }),
      errors=dependencyErrors(dependencies,true);
    if(errors.length)return deepFreeze({
      type:ACTIONS.RECEIVE_SOLVE_RESULT,
      requestId:identity.requestId,
      revision:identity.revision,
      inputHash:identity.inputHash,
      analysisInputHash:identity.analysisInputHash,
      result:{
        ok:false,
        requestId:identity.requestId,
        revision:identity.revision,
        inputHash:identity.inputHash,
        analysisInputHash:identity.analysisInputHash,
        diagnostics:errors
      }
    });
    if(!isObject(request)||Number(request.schemaVersion)!==1||
        !identity.requestId||identity.revision===null||
        !identity.inputHash||!identity.analysisInputHash||
        !isObject(request.state)||
        !Object.prototype.hasOwnProperty.call(request,'analysisInput'))
      return failedAction([diagnostic(
        FAILURE_CODES.SOLVE_REQUEST_INVALID,['solveRequest'],
        'The solver request envelope is invalid.'
      )]);
    const normalizedAnalysis=normalizeAnalysisInput(
      request.analysisInput,dependencies
    );
    if(!normalizedAnalysis.ok)return failedAction(
      normalizedAnalysis.diagnostics
    );
    if(normalizedAnalysis.analysisInputHash!==
        identity.analysisInputHash)
      return failedAction([diagnostic(
        FAILURE_CODES.INPUT_HASH_MISMATCH,
        [
          'solveRequest.analysisInput',
          'solveRequest.analysisInputHash'
        ],
        'The canonical physical-analysis input does not match its declared transaction hash.',
        {
          declaredAnalysisInputHash:identity.analysisInputHash,
          normalizedAnalysisInputHash:
            normalizedAnalysis.analysisInputHash
        }
      )]);
    let result;
    try{
      result=await solverMethod(dependencies.solver)(request);
    }catch(error){
      result={
        ok:false,
        requestId:identity.requestId,
        revision:identity.revision,
        inputHash:identity.inputHash,
        analysisInputHash:identity.analysisInputHash,
        diagnostics:[diagnostic(
          FAILURE_CODES.SOLVER_FAILED,['solver'],
          'The injected solver threw while processing the request.',
          {error:String(error&&error.message||error)}
        )]
      };
    }
    if(!isObject(result))result={
      ok:false,
      requestId:identity.requestId,
      revision:identity.revision,
      inputHash:identity.inputHash,
      analysisInputHash:identity.analysisInputHash,
      diagnostics:[diagnostic(
        FAILURE_CODES.SOLVER_FAILED,['solver.result'],
        'The injected solver returned a non-object result.'
      )]
    };
    else if(result.analysisInputHash!==undefined&&
        result.analysisInputHash!==identity.analysisInputHash)
      result={
        ok:false,
        requestId:identity.requestId,
        revision:identity.revision,
        inputHash:identity.inputHash,
        analysisInputHash:identity.analysisInputHash,
        diagnostics:[diagnostic(
          FAILURE_CODES.INPUT_HASH_MISMATCH,
          ['solver.result.analysisInputHash'],
          'The solver returned a result for different physical analysis input.',
          {
            requestAnalysisInputHash:identity.analysisInputHash,
            solverAnalysisInputHash:result.analysisInputHash
          }
        )]
      };
    else result={
      ...cloneValue(result),
      analysisInputHash:identity.analysisInputHash
    };
    return deepFreeze({
      type:ACTIONS.RECEIVE_SOLVE_RESULT,
      requestId:identity.requestId,
      revision:identity.revision,
      inputHash:identity.inputHash,
      analysisInputHash:identity.analysisInputHash,
      result:cloneValue(result)
    });
  }

  async function solveCandidate(
    controller,requestId,analysisInput,api
  ){
    const started=api.reduceController(controller,{
      type:ACTIONS.BEGIN_SOLVE,
      requestId,
      analysisInput:analysisInput===undefined?{}:analysisInput
    });
    if(!started.ok)return started;
    const action=await api.executeSolveRequest(started.solveRequest);
    return api.reduceController(started.state,action);
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'manufacturing-export',
      code:'THREEWAY_MANUFACTURING_UNAVAILABLE',
      reason:CAPABILITIES.reason,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  function createController(overrides){
    const supplied=isObject(overrides)?overrides:{},
      dependencies=deepFreeze({
        stateContract:supplied.stateContract||DefaultStateContract,
        referenceCards:supplied.referenceCards||DefaultReferenceCards,
        solver:supplied.solver||DefaultSolver
      });
    const api={
      version:VERSION,
      storageKey:STORAGE_KEY,
      actions:ACTIONS,
      failureCodes:FAILURE_CODES,
      userIntentFields:USER_INTENT_FIELDS,
      capabilities:CAPABILITIES,
      createInitialState:initialControllerState,
      reduceController:(state,action)=>
        reduceController(state,action,dependencies),
      reduce:(state,action)=>reduceController(
        state,action,dependencies
      ),
      createPersistenceRecord:state=>
        deepFreeze(persistenceRecord(state,dependencies)),
      persistCanonicalState:(state,adapter)=>
        persistCanonicalState(state,adapter,dependencies),
      executeSolveRequest:request=>
        executeSolveRequest(request,dependencies),
      solveCandidate:null,
      manufacturingPreflight
    };
    api.solveCandidate=(state,requestId,analysisInput)=>
      solveCandidate(state,requestId,analysisInput,api);
    return deepFreeze(api);
  }

  const defaultApi=createController();
  return deepFreeze({
    ...defaultApi,
    createController
  });
});
