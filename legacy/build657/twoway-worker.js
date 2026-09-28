/* MEH Studio v5 — exact-mesh worker coordinator.
   The page owns one logical worker, while this coordinator gives all three
   allocation phases different, terminated worker lifetimes:

     mesh worker -> audit worker -> render/STL output worker

   Each transition transfers packed ownership and terminates the sender. The
   release boundaries do not depend on JavaScript garbage collection deciding
   that scalar planes, edge caches, audit scratch, or output buffers are dead. */
'use strict';

const workerCacheKey=self.location&&self.location.search||'';
const WORKER_KERNEL='b642-phased-packed-mesh-v1';
importScripts('profile-laws.js'+workerCacheKey,'engine.js'+workerCacheKey,
  'twoway-core.js'+workerCacheKey);

let activeChild=null;
let activeJob=null;
let started=false;
let finished=false;

function stateDigest(state){
  return MEH2.twoWayMeshStateFingerprint(state);
}

function meshPolicyVersion(state,intent){
  const key=MEH2.twoWayMeshKey(state,intent);
  const separator=key.indexOf('|');
  if(separator<=0)throw protocolError('Exact mesh identity omitted its policy version');
  return key.slice(0,separator);
}

function protocolError(message,details){
  const error=new Error(message);
  error.name='MeshProtocolError';
  error.code='MESH_PHASE_PROTOCOL_ERROR';
  if(details)error.details=details;
  return error;
}

function terminateChild(){
  if(activeChild){
    activeChild.onmessage=null;
    activeChild.onmessageerror=null;
    activeChild.onerror=null;
    activeChild.terminate();
    activeChild=null;
  }
}

function errorRecord(error,fallback){
  return {
    code:error&&error.code?error.code:(fallback||'MESH_WORKER_ERROR'),
    details:error&&error.details?error.details:null,
    error:error&&error.stack?error.stack:String(error)
  };
}

function fail(error,fallback){
  if(finished)return;
  const record=errorRecord(error,fallback);
  terminateChild();
  const job=activeJob||{};
  try{
    self.postMessage({
      id:job.id,
      phase:'error',
      kernel:WORKER_KERNEL,
      policyVersion:job.policyVersion||null,
      stateDigest:job.stateDigest||null,
      code:record.code,
      details:record.details,
      error:record.error
    });
  }finally{
    activeJob=null;
    finished=true;
    self.close();
  }
}

function validateProvenance(message,expectedPhase){
  const job=activeJob;
  if(!job)throw protocolError('A phase worker responded without an active exact-mesh job');
  if(!message||message.id!==job.id||
      message.kernel!==WORKER_KERNEL||
      message.policyVersion!==job.policyVersion||
      message.stateDigest!==job.stateDigest)
    throw protocolError('Exact-mesh phase provenance did not match the active job',{
      expected:{id:job.id,kernel:WORKER_KERNEL,
        policyVersion:job.policyVersion,stateDigest:job.stateDigest},
      received:message?{id:message.id,kernel:message.kernel,
        policyVersion:message.policyVersion,stateDigest:message.stateDigest}:null
    });
  if(expectedPhase&&message.phase!==expectedPhase)
    throw protocolError('Unexpected exact-mesh phase transition',{
      expectedPhase,receivedPhase:message.phase
    });
}

function spawnPhaseWorker(file){
  if(typeof Worker==='undefined')
    throw protocolError('Nested workers are unavailable for phase-separated exact meshing');
  const child=new Worker(file+workerCacheKey);
  activeChild=child;
  return child;
}

function childRuntimeError(event,phase){
  if(event&&typeof event.preventDefault==='function')event.preventDefault();
  const error=new Error(event&&event.message?
    event.message:'The '+phase+' phase worker failed');
  error.code='MESH_PHASE_WORKER_ERROR';
  error.details={phase,filename:event&&event.filename||null,
    lineno:event&&event.lineno||null,colno:event&&event.colno||null};
  fail(error);
}

function childMessageError(event,phase){
  const error=protocolError(
    'The '+phase+' phase worker returned a message that could not be deserialized',
    {phase,type:event&&event.type||'messageerror'});
  error.code='MESH_PHASE_MESSAGE_ERROR';
  fail(error);
}

function fullTypedView(value){
  return value.byteOffset===0&&value.byteLength===value.buffer.byteLength;
}

function partTransferList(parts){
  if(!Array.isArray(parts)||!parts.length)
    throw protocolError('Mesh phase returned no packed printable parts');
  const transfer=[],seen=new Set();
  for(const [index,part] of parts.entries()){
    if(!part||
        !(part.positions instanceof Float32Array||part.positions instanceof Float64Array)||
        !(part.indices instanceof Uint32Array)||
        part.positions.length%3||part.indices.length%3||
        !fullTypedView(part.positions)||!fullTypedView(part.indices))
      throw protocolError('Mesh phase returned an invalid packed part',{partIndex:index});
    for(const buffer of [part.positions.buffer,part.indices.buffer]){
      if(!(buffer instanceof ArrayBuffer)||!buffer.byteLength||seen.has(buffer))
        throw protocolError('Mesh phase returned an invalid or aliased transfer buffer',
          {partIndex:index});
      seen.add(buffer);transfer.push(buffer);
    }
  }
  return transfer;
}

function outputTransferList(message,certificate){
  const limits=activeJob&&activeJob.budget&&activeJob.budget.limits;
  if(!limits||!certificate)
    throw protocolError('Output validation omitted its certificate or budget');
  if(!message.auditCertificate||
      message.auditCertificate.version!==certificate.version||
      message.auditCertificate.geometryDigest!==certificate.geometryDigest||
      message.auditCertificate.deep!==certificate.deep)
    throw protocolError('Output phase returned a mismatched audit-certificate receipt');
  if(activeJob.mode==='export'){
    if(!Array.isArray(message.files)||
        message.files.length!==certificate.partCount)
      throw protocolError('Export phase completed without STL files');
    const buffers=[],seenBuffers=new Set(),seenRoles=new Set();
    let triangles=0,totalBytes=0;
    for(let index=0;index<message.files.length;index++){
      const file=message.files[index];
      if(!file||!(file.buffer instanceof ArrayBuffer)||
          !Number.isSafeInteger(file.tris)||file.tris<1||
          typeof file.role!=='string'||!file.role||
          seenBuffers.has(file.buffer)||seenRoles.has(file.role))
        throw protocolError('Export phase returned an invalid STL buffer',{fileIndex:index});
      const required=84+file.tris*50;
      if(!Number.isSafeInteger(required)||file.buffer.byteLength!==required)
        throw protocolError('Export phase returned an incorrectly sized STL buffer',
          {fileIndex:index,required,received:file.buffer.byteLength});
      triangles+=file.tris;totalBytes+=required;
      if(!Number.isSafeInteger(triangles)||!Number.isSafeInteger(totalBytes))
        throw protocolError('Export output counts are not safe integers');
      seenBuffers.add(file.buffer);seenRoles.add(file.role);buffers.push(file.buffer);
    }
    if(triangles!==certificate.triangles||totalBytes>limits.maxStlBytes)
      throw protocolError('Export output differs from its certified triangle or byte budget',
        {triangles,certifiedTriangles:certificate.triangles,
          totalBytes,limit:limits.maxStlBytes});
    return buffers;
  }
  if(activeJob.reviewOnly){
    if(message.triangles!==certificate.triangles)
      throw protocolError('Review-only output changed its certified triangle count');
    return [];
  }
  const outputs=[
    ['pos',message.pos,Float32Array],
    ['nrm',message.nrm,Float32Array],
    ['idx',message.idx,Uint32Array]
  ];
  for(const [name,value,Type] of outputs)
    if(!(value instanceof Type)||!fullTypedView(value))
      throw protocolError('Preview phase returned an invalid '+name+' buffer');
  if(message.pos.length!==certificate.vertices*3||
      message.nrm.length!==certificate.vertices*3||
      message.idx.length!==certificate.triangles*3||
      message.triangles!==certificate.triangles)
    throw protocolError('Preview output lengths differ from the audit certificate');
  const buffers=outputs.map(([,value])=>value.buffer);
  if(new Set(buffers).size!==buffers.length)
    throw protocolError('Preview output buffers unexpectedly alias one another');
  const outputBytes=outputs.reduce((sum,[,value])=>sum+value.byteLength,0);
  if(!Number.isSafeInteger(outputBytes)||outputBytes>limits.maxRenderBufferBytes)
    throw protocolError('Preview output exceeds its render-buffer budget',
      {required:outputBytes,limit:limits.maxRenderBufferBytes});
  for(let index=0;index<message.idx.length;index++)
    if(message.idx[index]>=certificate.vertices)
      throw protocolError('Preview output contains an out-of-range vertex index',
        {index,value:message.idx[index],vertices:certificate.vertices});
  return buffers;
}

function validateAuditCertificate(message){
  const job=activeJob,certificate=message&&message.certificate;
  if(!certificate||
      certificate.version!=='packed-audit-certificate-v1'||
      certificate.id!==job.id||
      certificate.kernel!==WORKER_KERNEL||
      certificate.policyVersion!==job.policyVersion||
      certificate.stateDigest!==job.stateDigest||
      certificate.mode!==job.mode||
      certificate.deep!==(job.mode==='export')||
      certificate.detachable!==job.detachable||
      certificate.pass!==true||
      !certificate.audit||certificate.audit.pass!==true||
      typeof certificate.geometryDigest!=='string')
    throw protocolError('Audit phase returned an invalid or failing certificate');
  return certificate;
}

function startOutput(auditMessage){
  validateProvenance(auditMessage,'audit-ready');
  if(!!auditMessage.detachable!==activeJob.detachable)
    throw protocolError('Audit phase changed the printable assembly mode');
  const certificate=validateAuditCertificate(auditMessage),
    transfers=partTransferList(auditMessage.parts);
  terminateChild();

  const child=spawnPhaseWorker('twoway-output-worker.js');
  child.onerror=event=>childRuntimeError(event,'output');
  child.onmessageerror=event=>childMessageError(event,'output');
  child.onmessage=event=>{
    const message=event.data||{};
    try{
      validateProvenance(message);
      if(message.phase==='error'){
        const error=new Error(message.error||'Exact mesh output phase failed');
        error.code=message.code||'MESH_WORKER_ERROR';
        error.details=message.details||null;
        fail(error);
        return;
      }
      if(message.phase!=='done')
        throw protocolError('Output worker returned an unknown phase',
          {receivedPhase:message.phase});
      const outputTransfers=outputTransferList(message,certificate);
      terminateChild();
      self.postMessage(message,outputTransfers);
      activeJob=null;
      finished=true;
      self.close();
    }catch(error){
      fail(error);
    }
  };
  child.postMessage({
    id:activeJob.id,
    mode:activeJob.mode,
    reviewOnly:activeJob.reviewOnly,
    state:activeJob.state,
    kernel:WORKER_KERNEL,
    policyVersion:activeJob.policyVersion,
    stateDigest:activeJob.stateDigest,
    budget:activeJob.budget,
    certificate,
    detachable:!!auditMessage.detachable,
    parts:auditMessage.parts,
    grids:auditMessage.grids
  },transfers);
}

function startAuditPhase(meshMessage){
  validateProvenance(meshMessage,'mesh-ready');
  if(!!meshMessage.detachable!==activeJob.detachable)
    throw protocolError('Mesh phase returned the wrong printable assembly mode');
  if(!activeJob.sawBudget||!activeJob.sawMeshing)
    throw protocolError('Mesh phase completed before required preflight transitions');
  const transfers=partTransferList(meshMessage.parts);
  terminateChild();

  const child=spawnPhaseWorker('twoway-audit-worker.js');
  child.onerror=event=>childRuntimeError(event,'audit');
  child.onmessageerror=event=>childMessageError(event,'audit');
  child.onmessage=event=>{
    const message=event.data||{};
    try{
      validateProvenance(message);
      if(message.phase==='auditing'){
        if(activeJob.sawAuditing)
          throw protocolError('Audit phase was announced more than once');
        activeJob.sawAuditing=true;
        self.postMessage(message);
        return;
      }
      if(message.phase==='audit-ready'){
        if(!activeJob.sawAuditing)
          throw protocolError('Audit phase completed without announcing its audit');
        startOutput(message);
        return;
      }
      if(message.phase==='error'){
        const error=new Error(message.error||'Exact mesh audit phase failed');
        error.code=message.code||'MESH_WORKER_ERROR';
        error.details=message.details||null;
        fail(error);
        return;
      }
      throw protocolError('Audit worker returned an unknown phase',
        {receivedPhase:message.phase});
    }catch(error){
      fail(error);
    }
  };
  child.postMessage({
    id:activeJob.id,
    mode:activeJob.mode,
    reviewOnly:activeJob.reviewOnly,
    state:activeJob.state,
    kernel:WORKER_KERNEL,
    policyVersion:activeJob.policyVersion,
    stateDigest:activeJob.stateDigest,
    budget:activeJob.budget,
    detachable:!!meshMessage.detachable,
    parts:meshMessage.parts,
    grids:meshMessage.grids,
    rawComponentCount:meshMessage.rawComponentCount,
    discardedComponents:meshMessage.discardedComponents,
    partDiagnostics:meshMessage.partDiagnostics
  },transfers);
}

function startMeshPhase(){
  const child=spawnPhaseWorker('twoway-mesh-worker.js');
  child.onerror=event=>childRuntimeError(event,'mesh');
  child.onmessageerror=event=>childMessageError(event,'mesh');
  child.onmessage=event=>{
    const message=event.data||{};
    try{
      validateProvenance(message);
      if(message.phase==='budget'){
        if(activeJob.sawBudget)
          throw protocolError('Mesh preflight budget was announced more than once');
        if(!message.budget||message.budget.policyVersion!==activeJob.policyVersion)
          throw protocolError('Mesh preflight returned a mismatched policy budget');
        activeJob.sawBudget=true;
        activeJob.budget=message.budget;
        self.postMessage(message);
        return;
      }
      if(message.phase==='meshing'){
        if(!activeJob.sawBudget||activeJob.sawMeshing)
          throw protocolError('Mesh construction started outside the preflight sequence');
        activeJob.sawMeshing=true;
        self.postMessage(message);
        return;
      }
      if(message.phase==='mesh-ready'){
        startAuditPhase(message);
        return;
      }
      if(message.phase==='error'){
        const error=new Error(message.error||'Exact mesh construction failed');
        error.code=message.code||'MESH_WORKER_ERROR';
        error.details=message.details||null;
        fail(error);
        return;
      }
      throw protocolError('Mesh worker returned an unknown phase',
        {receivedPhase:message.phase});
    }catch(error){
      fail(error);
    }
  };
  child.postMessage({
    id:activeJob.id,
    mode:activeJob.mode,
    state:activeJob.state,
    kernel:WORKER_KERNEL,
    policyVersion:activeJob.policyVersion,
    stateDigest:activeJob.stateDigest
  });
}

self.onmessage=function(event){
  if(started){
    fail(protocolError('The exact-mesh coordinator accepts one job only'));
    return;
  }
  started=true;
  try{
    const message=event.data||{};
    if(message.mode!=='preview'&&message.mode!=='export')
      throw protocolError('Unsupported worker mode: '+String(message.mode));
    if(message.id===undefined||message.id===null||!message.state)
      throw protocolError('Exact-mesh request omitted its id or state');
    const intent=message.mode==='preview'?'manufacturing-preview':'export',
      digest=stateDigest(message.state),
      policyVersion=meshPolicyVersion(message.state,intent),
      plan=MEH2.twoWayPlan(message.state),
      detachable=plan.S.driverCellConstruction==='cartridge';
    activeJob={
      id:message.id,
      mode:message.mode,
      reviewOnly:!!message.reviewOnly,
      state:message.state,
      intent,
      stateDigest:digest,
      policyVersion,
      detachable,
      budget:null,
      sawBudget:false,
      sawMeshing:false,
      sawAuditing:false
    };
    startMeshPhase();
  }catch(error){
    fail(error);
  }
};

self.onmessageerror=function(event){
  const error=protocolError(
    'The exact-mesh request could not be deserialized',
    {phase:'coordinator-input',type:event&&event.type||'messageerror'});
  error.code='MESH_PHASE_MESSAGE_ERROR';
  fail(error);
};
