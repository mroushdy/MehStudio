/* MEH Studio v5 — one-shot packed fabrication-audit phase.
   This worker starts only after the mesh worker has terminated. It returns the
   same transferable part buffers plus a content-bound audit certificate, then
   closes so audit scratch is gone before rendering or STL allocation begins. */
'use strict';

const workerCacheKey=self.location&&self.location.search||'';
const WORKER_KERNEL='b642-phased-packed-mesh-v1';
importScripts('profile-laws.js'+workerCacheKey,'engine.js'+workerCacheKey,
  'twoway-core.js'+workerCacheKey);

let started=false,activeMessage=null;

function stateDigest(state){
  return MEH2.twoWayMeshStateFingerprint(state);
}

function policyVersion(state,intent){
  const key=MEH2.twoWayMeshKey(state,intent),separator=key.indexOf('|');
  if(separator<=0)throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
    'Exact mesh identity omitted its policy version');
  return key.slice(0,separator);
}

function phaseError(code,message,details){
  const error=new Error(message);error.name='MeshPhaseError';error.code=code;
  if(details)error.details=details;
  return error;
}

function provenance(message,phase){
  return {
    id:message.id,
    phase,
    kernel:WORKER_KERNEL,
    policyVersion:message.policyVersion,
    stateDigest:message.stateDigest
  };
}

function publicAudit(audit){
  if(!audit)return audit;
  const out={...audit};
  delete out.flips;
  return out;
}

function fail(message,error){
  const details=error&&error.details?{...error.details}:null;
  if(details&&details.audit)details.audit=publicAudit(details.audit);
  self.postMessage({
    ...provenance(message,'error'),
    code:error&&error.code?error.code:'MESH_WORKER_ERROR',
    details,
    error:error&&error.stack?error.stack:String(error)
  });
  self.close();
}

function fullTypedView(value){
  return value.byteOffset===0&&value.byteLength===value.buffer.byteLength;
}

function geometryDigest(parts){
  let hash=2166136261>>>0;
  const mixByte=value=>{hash=Math.imul((hash^(value&255))>>>0,16777619)>>>0;};
  const mixUint=value=>{
    value=Number(value)>>>0;
    mixByte(value);mixByte(value>>>8);mixByte(value>>>16);mixByte(value>>>24);
  };
  mixUint(parts.length);
  for(const part of parts){
    mixUint(part.positions.length);mixUint(part.indices.length);
    const positionBytes=new Uint8Array(part.positions.buffer,
        part.positions.byteOffset,part.positions.byteLength),
      indexBytes=new Uint8Array(part.indices.buffer,
        part.indices.byteOffset,part.indices.byteLength);
    for(let i=0;i<positionBytes.length;i++)mixByte(positionBytes[i]);
    mixByte(0xa5);
    for(let i=0;i<indexBytes.length;i++)mixByte(indexBytes[i]);
    mixByte(0x5a);
  }
  return hash.toString(16).padStart(8,'0');
}

function validateAndReconstructParts(message){
  const budget=message.budget,limits=budget&&budget.limits;
  if(!budget||budget.policyVersion!==message.policyVersion||!limits)
    throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
      'Audit phase received an invalid preflight budget');
  if(!Array.isArray(message.parts)||!message.parts.length)
    throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
      'Audit phase received no packed printable parts');

  let vertices=0,triangles=0;
  const parts=message.parts.map((part,index)=>{
    if(!part||
        !(part.positions instanceof Float32Array||part.positions instanceof Float64Array)||
        !(part.indices instanceof Uint32Array)||
        part.positions.length%3||part.indices.length%3||
        !fullTypedView(part.positions)||!fullTypedView(part.indices))
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Audit phase received an invalid packed part',{partIndex:index});
    const partVertices=part.positions.length/3,partTriangles=part.indices.length/3;
    if(!Number.isSafeInteger(partVertices)||!Number.isSafeInteger(partTriangles))
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Packed part counts are not safe integers',{partIndex:index});
    for(let at=0;at<part.indices.length;at++)
      if(part.indices[at]>=partVertices)
        throw phaseError('MESH_PACKED_INDEX_LIMIT',
          'Packed part contains an out-of-range vertex index',
          {partIndex:index,indexOffset:at,value:part.indices[at],vertices:partVertices});
    vertices+=partVertices;triangles+=partTriangles;
    if(vertices>limits.maxVertices||triangles>limits.maxTriangles)
      throw phaseError(vertices>limits.maxVertices?'MESH_VERTEX_LIMIT':'MESH_TRIANGLE_LIMIT',
        'Transferred packed parts exceed their preflight output budget',{
          vertices,vertexLimit:limits.maxVertices,
          triangles,triangleLimit:limits.maxTriangles
        });
    return MEH2.packedMesh(part.positions,part.indices,{
      grid:part.grid||null,
      auditLimits:{
        maxAuditBinRefs:limits.maxAuditBinRefs,
        maxAuditBinOccupancy:limits.maxAuditBinOccupancy,
        maxAuditPairVisits:limits.maxAuditPairVisits,
        maxIntersectionPairs:limits.maxIntersectionPairs
      },
      outputLimits:{maxStlBytes:limits.maxStlBytes}
    });
  });
  return {parts,vertices,triangles,limits};
}

function combinedMesh(reconstructed,message){
  const {parts,vertices,triangles,limits}=reconstructed;
  let mesh;
  if(parts.length===1)mesh=parts[0];
  else{
    const positions=new Float64Array(vertices*3),
      indices=new Uint32Array(triangles*3);
    let positionOffset=0,indexOffset=0,vertexOffset=0;
    for(const part of parts){
      positions.set(part.positions,positionOffset);
      for(let i=0;i<part.indices.length;i++)
        indices[indexOffset+i]=part.indices[i]+vertexOffset;
      positionOffset+=part.positions.length;
      indexOffset+=part.indices.length;
      vertexOffset+=MEH2.meshVertexCount(part);
    }
    mesh=MEH2.packedMesh(positions,indices,{
      auditLimits:{
        maxAuditBinRefs:limits.maxAuditBinRefs,
        maxAuditBinOccupancy:limits.maxAuditBinOccupancy,
        maxAuditPairVisits:limits.maxAuditPairVisits,
        maxIntersectionPairs:limits.maxIntersectionPairs
      },
      outputLimits:{maxStlBytes:limits.maxStlBytes}
    });
  }
  mesh.grid=message.grids&&message.grids[0]||parts[0].grid||null;
  mesh.grids=Array.isArray(message.grids)?message.grids:[mesh.grid];
  mesh.detachable=!!message.detachable;
  mesh.rawComponentCount=message.rawComponentCount;
  mesh.discardedComponents=message.discardedComponents;
  mesh.partDiagnostics=Array.isArray(message.partDiagnostics)?
    message.partDiagnostics:[];
  mesh.audit=MEH2.meshAudit(mesh);
  return mesh;
}

function transferList(parts){
  const transfer=[],seen=new Set();
  for(const [index,part] of parts.entries()){
    for(const view of [part.positions,part.indices]){
      const buffer=view.buffer;
      if(!fullTypedView(view))
        throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
          'Audit phase cannot transfer a partial backing buffer view',
          {partIndex:index});
      if(!(buffer instanceof ArrayBuffer)||!buffer.byteLength||seen.has(buffer))
        throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
          'Audit phase cannot transfer an invalid or aliased part buffer',
          {partIndex:index});
      seen.add(buffer);transfer.push(buffer);
    }
  }
  return transfer;
}

self.onmessage=function(event){
  const message=event.data||{};
  if(!started)activeMessage=message;
  if(started){
    fail(message,phaseError('MESH_PHASE_PROTOCOL_ERROR',
      'The audit phase worker accepts one job only'));
    return;
  }
  started=true;
  try{
    if(message.kernel!==WORKER_KERNEL)
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR','Audit phase kernel mismatch');
    if(message.mode!=='preview'&&message.mode!=='export')
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Unsupported audit mode: '+String(message.mode));
    const intent=message.mode==='preview'?'manufacturing-preview':'export',
      digest=stateDigest(message.state),
      policy=policyVersion(message.state,intent),
      plan=MEH2.twoWayPlan(message.state),
      expectedDetachable=plan.S.driverCellConstruction==='cartridge';
    if(digest!==message.stateDigest||policy!==message.policyVersion)
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Audit phase state or policy provenance mismatch');
    if(!!message.detachable!==expectedDetachable)
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Audit phase received the wrong printable assembly mode');

    self.postMessage(provenance(message,'auditing'));
    const reconstructed=validateAndReconstructParts(message),
      mesh=combinedMesh(reconstructed,message),
      deep=message.mode==='export',
      audit=MEH2.fabricationAudit(message.state,mesh,deep),
      visibleAudit=publicAudit(audit);
    if(audit.pass!==true)
      throw phaseError('MESH_AUDIT_FAILED',
        'Fabrication audit failed before output-worker creation',
        {audit:visibleAudit});

    const certificate={
      version:'packed-audit-certificate-v1',
      id:message.id,
      kernel:WORKER_KERNEL,
      policyVersion:message.policyVersion,
      stateDigest:message.stateDigest,
      mode:message.mode,
      deep,
      detachable:expectedDetachable,
      pass:true,
      geometryDigest:geometryDigest(message.parts),
      vertices:reconstructed.vertices,
      triangles:reconstructed.triangles,
      partCount:reconstructed.parts.length,
      audit:visibleAudit
    };
    const transfer=transferList(message.parts);
    self.postMessage({
      ...provenance(message,'audit-ready'),
      certificate,
      detachable:!!message.detachable,
      parts:message.parts,
      grids:message.grids
    },transfer);
    self.close();
  }catch(error){
    fail(message,error);
  }
};

self.onmessageerror=function(){
  fail(activeMessage||{},phaseError('MESH_PHASE_MESSAGE_ERROR',
    'The audit phase request could not be deserialized'));
};
