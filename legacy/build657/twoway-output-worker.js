/* MEH Studio v5 — one-shot packed render/STL output phase.
   This worker accepts only content-bound geometry carrying a passing audit
   certificate. It performs no topology or deep-intersection audit itself, so
   the audit worker and all of its scratch storage are already terminated before
   the first render or STL output buffer is allocated. */
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

function validateCertificate(message){
  const certificate=message.certificate,deep=message.mode==='export';
  if(!certificate||
      certificate.version!=='packed-audit-certificate-v1'||
      certificate.id!==message.id||
      certificate.kernel!==WORKER_KERNEL||
      certificate.policyVersion!==message.policyVersion||
      certificate.stateDigest!==message.stateDigest||
      certificate.mode!==message.mode||
      certificate.deep!==deep||
      certificate.detachable!==!!message.detachable||
      certificate.pass!==true||
      !certificate.audit||certificate.audit.pass!==true||
      typeof certificate.geometryDigest!=='string')
    throw phaseError('MESH_AUDIT_CERTIFICATE_INVALID',
      'Output phase refused a missing, mismatched, or failing audit certificate');
  return certificate;
}

function validateAndReconstructParts(message,certificate){
  const budget=message.budget,limits=budget&&budget.limits;
  if(!budget||budget.policyVersion!==message.policyVersion||!limits)
    throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
      'Output phase received an invalid preflight budget');
  if(!Array.isArray(message.parts)||message.parts.length!==certificate.partCount)
    throw phaseError('MESH_AUDIT_CERTIFICATE_INVALID',
      'Output part count differs from its audit certificate');

  let vertices=0,triangles=0;
  const parts=message.parts.map((part,index)=>{
    if(!part||
        !(part.positions instanceof Float32Array||part.positions instanceof Float64Array)||
        !(part.indices instanceof Uint32Array)||
        part.positions.length%3||part.indices.length%3||
        !fullTypedView(part.positions)||!fullTypedView(part.indices))
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Output phase received an invalid packed part',{partIndex:index});
    const partVertices=part.positions.length/3,partTriangles=part.indices.length/3;
    for(let at=0;at<part.indices.length;at++)
      if(part.indices[at]>=partVertices)
        throw phaseError('MESH_PACKED_INDEX_LIMIT',
          'Packed output part contains an out-of-range vertex index',
          {partIndex:index,indexOffset:at,value:part.indices[at],vertices:partVertices});
    vertices+=partVertices;triangles+=partTriangles;
    if(vertices>limits.maxVertices||triangles>limits.maxTriangles)
      throw phaseError(vertices>limits.maxVertices?'MESH_VERTEX_LIMIT':'MESH_TRIANGLE_LIMIT',
        'Packed output parts exceed their preflight budget',{
          vertices,vertexLimit:limits.maxVertices,
          triangles,triangleLimit:limits.maxTriangles
        });
    return MEH2.packedMesh(part.positions,part.indices,{
      grid:part.grid||null,
      outputLimits:{maxStlBytes:limits.maxStlBytes}
    });
  });
  if(vertices!==certificate.vertices||triangles!==certificate.triangles||
      geometryDigest(message.parts)!==certificate.geometryDigest)
    throw phaseError('MESH_AUDIT_CERTIFICATE_INVALID',
      'Packed geometry content differs from the audited geometry',{
        vertices,certifiedVertices:certificate.vertices,
        triangles,certifiedTriangles:certificate.triangles
      });
  return {parts,vertices,triangles,limits};
}

function combinedMesh(reconstructed,message,certificate){
  const {parts,vertices,triangles}=reconstructed;
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
    mesh=MEH2.packedMesh(positions,indices);
  }
  mesh.grid=message.grids&&message.grids[0]||parts[0].grid||null;
  mesh.grids=Array.isArray(message.grids)?message.grids:[mesh.grid];
  mesh.detachable=!!message.detachable;
  mesh.audit=certificate.audit;
  return mesh;
}

function renderBuffers(mesh,field,limits){
  const vertexCount=MEH2.meshVertexCount(mesh),
    triangleCount=MEH2.meshTriangleCount(mesh),
    estimatedBytes=vertexCount*48+triangleCount*12;
  if(!Number.isSafeInteger(estimatedBytes)||
      estimatedBytes>limits.maxRenderBufferBytes)
    throw phaseError('MESH_RENDER_BUFFER_LIMIT',
      'Exact preview buffers require '+estimatedBytes+
      ' bytes; limit is '+limits.maxRenderBufferBytes,
      {required:estimatedBytes,limit:limits.maxRenderBufferBytes});

  const pos=new Float32Array(vertexCount*3),
    nrm=new Float32Array(vertexCount*3),
    acc=new Float64Array(vertexCount*3),
    point=[0,0,0],triangle=[0,0,0];
  let zeroAreaFaces=0,fieldFallbackVertices=0;
  const orientationSign=mesh.audit&&mesh.audit.volume<0?-1:1;
  for(let i=0;i<vertexCount;i++){
    MEH2.meshVertex(mesh,i,point);const at=i*3;
    pos[at]=point[0];pos[at+1]=point[2];pos[at+2]=point[1];
  }
  for(let i=0;i<triangleCount;i++){
    MEH2.meshTriangle(mesh,i,triangle);
    const ia=triangle[0]*3,ib=triangle[2]*3,ic=triangle[1]*3,
      abx=pos[ib]-pos[ia],aby=pos[ib+1]-pos[ia+1],abz=pos[ib+2]-pos[ia+2],
      acx=pos[ic]-pos[ia],acy=pos[ic+1]-pos[ia+1],acz=pos[ic+2]-pos[ia+2];
    let nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
    if(Math.hypot(nx,ny,nz)<1e-20){zeroAreaFaces++;continue;}
    nx*=orientationSign;ny*=orientationSign;nz*=orientationSign;
    acc[ia]+=nx;acc[ia+1]+=ny;acc[ia+2]+=nz;
    acc[ib]+=nx;acc[ib+1]+=ny;acc[ib+2]+=nz;
    acc[ic]+=nx;acc[ic+1]+=ny;acc[ic+2]+=nz;
  }
  const epsilon=Math.max(0.00025,
    Math.min(0.0015,(mesh.grid&&mesh.grid.step||0.012)*0.10));
  for(let i=0;i<vertexCount;i++){
    MEH2.meshVertex(mesh,i,point);
    const at=i*3;
    let nx=acc[at],ny=acc[at+1],nz=acc[at+2],
      length=Math.hypot(nx,ny,nz);
    if(length<1e-20){
      fieldFallbackVertices++;
      if(field){
        const gx=field([point[0]+epsilon,point[1],point[2]])-
            field([point[0]-epsilon,point[1],point[2]]),
          gy=field([point[0],point[1]+epsilon,point[2]])-
            field([point[0],point[1]-epsilon,point[2]]),
          gz=field([point[0],point[1],point[2]+epsilon])-
            field([point[0],point[1],point[2]-epsilon]);
        nx=gx;ny=gz;nz=gy;length=Math.hypot(nx,ny,nz)||1;
      }else{nx=1;ny=0;nz=0;length=1;}
    }
    nrm[at]=nx/length;nrm[at+1]=ny/length;nrm[at+2]=nz/length;
  }
  const idx=new Uint32Array(triangleCount*3);
  for(let i=0;i<triangleCount;i++){
    MEH2.meshTriangle(mesh,i,triangle);const at=i*3;
    idx[at]=triangle[0];idx[at+1]=triangle[2];idx[at+2]=triangle[1];
  }
  return {pos,nrm,idx,diagnostics:{
    normalMode:'area-weighted-coherent-winding',
    topologyChanged:false,
    vertices:vertexCount,
    triangles:triangleCount,
    zeroAreaFaces,
    fieldFallbackVertices,
    globalOrientationFlip:orientationSign<0,
    duplicateFaces:mesh.audit?mesh.audit.duplicateFaces:null,
    badEdges:mesh.audit?mesh.audit.badEdges:null,
    badOrientation:mesh.audit?mesh.audit.badOrientation:null,
    grid:mesh.grid?{nx:mesh.grid.nx,ny:mesh.grid.ny,nz:mesh.grid.nz,
      step:mesh.grid.step}:null
  }};
}

self.onmessage=function(event){
  const message=event.data||{};
  if(!started)activeMessage=message;
  if(started){
    fail(message,phaseError('MESH_PHASE_PROTOCOL_ERROR',
      'The output phase worker accepts one job only'));
    return;
  }
  started=true;
  try{
    if(message.kernel!==WORKER_KERNEL)
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR','Output phase kernel mismatch');
    if(message.mode!=='preview'&&message.mode!=='export')
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Unsupported output mode: '+String(message.mode));
    const intent=message.mode==='preview'?'manufacturing-preview':'export',
      digest=stateDigest(message.state),
      policy=policyVersion(message.state,intent),
      expectedPlan=MEH2.twoWayPlan(message.state),
      expectedDetachable=
        expectedPlan.S.driverCellConstruction==='cartridge';
    if(digest!==message.stateDigest||policy!==message.policyVersion)
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Output phase state or policy provenance mismatch');
    if(!!message.detachable!==expectedDetachable)
      throw phaseError('MESH_AUDIT_CERTIFICATE_INVALID',
        'Output assembly mode differs from the solved state');

    const certificate=validateCertificate(message),
      reconstructed=validateAndReconstructParts(message,certificate),
      plan=expectedPlan;
    if(message.mode==='export'){
      const stlLimit=reconstructed.limits.maxStlBytes;
      let required=0;
      for(const part of reconstructed.parts){
        const bytes=84+MEH2.meshTriangleCount(part)*50;
        if(!Number.isSafeInteger(bytes)||!Number.isSafeInteger(required+bytes))
          throw phaseError('MESH_STL_LIMIT',
            'STL output size is not a safe integer',{required,partBytes:bytes});
        required+=bytes;
      }
      if(required>stlLimit)
        throw phaseError('MESH_STL_LIMIT',
          'STL output requires '+required+' bytes; limit is '+stlLimit,
          {required,limit:stlLimit});
      const files=[],transfer=[];
      for(let index=0;index<reconstructed.parts.length;index++){
        const part=reconstructed.parts[index],
          buffer=MEH2.stlBytes(part,stlLimit);
        files.push({
          role:message.detachable?
            (index===0?'horn':'driver_cartridge_'+String(index).padStart(2,'0')):
            'integrated_manifold',
          tris:MEH2.meshTriangleCount(part),
          buffer
        });
        transfer.push(buffer);
      }
      self.postMessage({
        ...provenance(message,'done'),
        budget:message.budget,
        audit:certificate.audit,
        auditCertificate:{
          version:certificate.version,
          geometryDigest:certificate.geometryDigest,
          deep:certificate.deep
        },
        detachable:!!message.detachable,
        files
      },transfer);
      self.close();
      return;
    }

    if(message.reviewOnly){
      self.postMessage({
        ...provenance(message,'done'),
        budget:message.budget,
        audit:certificate.audit,
        auditCertificate:{
          version:certificate.version,
          geometryDigest:certificate.geometryDigest,
          deep:certificate.deep
        },
        detachable:!!message.detachable,
        plan,
        triangles:certificate.triangles
      });
      self.close();
      return;
    }

    const mesh=combinedMesh(reconstructed,message,certificate),
      field=MEH2.twoWaySolidField(plan,!!message.detachable),
      packed=renderBuffers(mesh,field,reconstructed.limits);
    if(!fullTypedView(packed.pos)||!fullTypedView(packed.nrm)||
        !fullTypedView(packed.idx))
      throw phaseError('MESH_PHASE_PROTOCOL_ERROR',
        'Preview output cannot transfer a partial backing buffer view');
    self.postMessage({
      ...provenance(message,'done'),
      budget:message.budget,
      audit:certificate.audit,
      auditCertificate:{
        version:certificate.version,
        geometryDigest:certificate.geometryDigest,
        deep:certificate.deep
      },
      detachable:!!message.detachable,
      plan,
      triangles:certificate.triangles,
      renderDiagnostics:packed.diagnostics,
      pos:packed.pos,
      nrm:packed.nrm,
      idx:packed.idx
    },[packed.pos.buffer,packed.nrm.buffer,packed.idx.buffer]);
    self.close();
  }catch(error){
    fail(message,error);
  }
};

self.onmessageerror=function(){
  fail(activeMessage||{},phaseError('MESH_PHASE_MESSAGE_ERROR',
    'The output phase request could not be deserialized'));
};
