/* MEH Studio v5 — one-shot packed exact-mesh phase.
   This worker owns every transient meshing allocation. Its only successful
   output is a set of transferable typed part buffers, after which it closes
   and the coordinator terminates it before deep audit begins. */
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

function fail(message,error){
  self.postMessage({
    ...provenance(message,'error'),
    code:error&&error.code?error.code:'MESH_WORKER_ERROR',
    details:error&&error.details?error.details:null,
    error:error&&error.stack?error.stack:String(error)
  });
  self.close();
}

function fullTypedView(value){
  return value.byteOffset===0&&value.byteLength===value.buffer.byteLength;
}

function plainGrid(grid){
  if(!grid)return null;
  return {
    nx:grid.nx,ny:grid.ny,nz:grid.nz,step:grid.step,
    gridPoints:grid.gridPoints,cells:grid.cells
  };
}

self.onmessage=function(event){
  const message=event.data||{};
  if(!started)activeMessage=message;
  if(started){
    fail(message,phaseError('MESH_PHASE_PROTOCOL_ERROR',
      'The mesh phase worker accepts one job only'));
    return;
  }
  started=true;
  try{
    if(message.kernel!==WORKER_KERNEL)
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR','Mesh phase kernel mismatch');
    if(message.mode!=='preview'&&message.mode!=='export')
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Unsupported mesh phase mode: '+String(message.mode));
    const intent=message.mode==='preview'?'manufacturing-preview':'export',
      digest=stateDigest(message.state),
      policy=policyVersion(message.state,intent);
    if(digest!==message.stateDigest||policy!==message.policyVersion)
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Mesh phase state or policy provenance mismatch');

    const budget=MEH2.twoWayMeshPreflight(message.state,intent);
    if(budget.policyVersion!==policy)
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Mesh phase preflight policy mismatch');
    self.postMessage({...provenance(message,'budget'),budget});
    self.postMessage(provenance(message,'meshing'));

    const geometry=MEH2.twoWayGeometry(message.state,intent);
    if(!geometry||!Array.isArray(geometry.parts)||!geometry.parts.length)
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Exact geometry did not expose packed printable parts');
    const parts=[],transfer=[],seen=new Set();
    for(let index=0;index<geometry.parts.length;index++){
      const mesh=geometry.parts[index];
      if(!mesh||mesh.packed!==true||
          !(mesh.positions instanceof Float32Array||mesh.positions instanceof Float64Array)||
          !(mesh.indices instanceof Uint32Array)||
          !fullTypedView(mesh.positions)||!fullTypedView(mesh.indices))
        throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
          'Exact geometry returned a non-packed printable part',{partIndex:index});
      for(const buffer of [mesh.positions.buffer,mesh.indices.buffer]){
        if(seen.has(buffer))
          throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
            'Printable parts unexpectedly alias an ownership buffer',{partIndex:index});
        seen.add(buffer);transfer.push(buffer);
      }
      parts.push({
        partIndex:index,
        positions:mesh.positions,
        indices:mesh.indices,
        grid:plainGrid(mesh.grid)
      });
    }
    self.postMessage({
      ...provenance(message,'mesh-ready'),
      detachable:!!geometry.detachable,
      parts,
      grids:(geometry.mesh&&geometry.mesh.grids||parts.map(part=>part.grid)).map(plainGrid),
      rawComponentCount:geometry.rawComponentCount,
      discardedComponents:geometry.discardedComponents,
      partDiagnostics:geometry.partDiagnostics
    },transfer);
    if(typeof MEH2.clearTwoWayMeshCache==='function')MEH2.clearTwoWayMeshCache();
    self.close();
  }catch(error){
    fail(message,error);
  }
};

self.onmessageerror=function(){
  fail(activeMessage||{},phaseError('MESH_PHASE_MESSAGE_ERROR',
    'The mesh phase request could not be deserialized'));
};
