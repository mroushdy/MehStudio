/* MEH Studio v5 — analysis-only preview geometry from canonical solutions.

   This module tessellates records already produced by the three-way horn,
   lumen, and mount phases.  It owns no acoustic solve, placement rule, hidden
   wall profile, Boolean operation, or fabrication claim.  The horn preview is
   deliberately an open inner acoustic surface; closed lumen and mount
   inspection meshes retain their upstream audit metadata and are never
   relabeled as production solids. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3PreviewGeometry=factory();
})(function(){
  'use strict';

  const VERSION=1;
  const FAILURE_CODES=Object.freeze({
    INPUT_INVALID:'THREEWAY_PREVIEW_GEOMETRY_INPUT_INVALID',
    HORN_INVALID:'THREEWAY_PREVIEW_HORN_INVALID',
    SECTION_UNSUPPORTED:'THREEWAY_PREVIEW_SECTION_UNSUPPORTED',
    SOURCE_MESH_INVALID:'THREEWAY_PREVIEW_SOURCE_MESH_INVALID'
  });
  const CAPABILITIES=deepFreeze({
    status:'analysis-preview-tessellation-only',
    canonicalHornStations:true,
    canonicalInspectionMeshes:true,
    independentAcousticGeometry:false,
    wallSolid:false,
    booleanOperations:false,
    exactSolid:false,
    manufacturing:false,
    stl:false,
    reason:
      'Preview triangles visualize canonical analysis records; they are not a closed horn wall or audited fabrication solid.'
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

  function positiveInteger(value){
    const number=Number(value);
    return Number.isInteger(number)&&number>0?number:null;
  }

  function finite(value){
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
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

  function diagnostic(code,paths,message,details){
    return deepFreeze({
      code,
      severity:'error',
      phase:'preview-geometry',
      paths:uniqueStrings(paths),
      message,
      details:isObject(details)?cloneValue(details):{},
      blocksCapabilities:['renderPreview','manufacturingPlan','exactSolid',
        'manufacturing','stl']
    });
  }

  function failure(item){
    return deepFreeze({
      ok:false,
      code:item.code,
      geometry:null,
      diagnostics:[item],
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function signedPower(value,power){
    if(Math.abs(value)<1e-15)return 0;
    return Math.sign(value)*Math.pow(Math.abs(value),power);
  }

  function sectionPoint(section,angle){
    const width=finite(section.widthM),
      height=finite(section.heightM),
      exponent=finite(section.exponent),
      family=cleanString(section.family);
    if(width===null||height===null||width<=0||height<=0||
        exponent===null||exponent<2||
        !['ellipse','superellipse'].includes(family))
      return null;
    const power=2/exponent;
    return {
      y:width/2*signedPower(Math.cos(angle),power),
      z:height/2*signedPower(Math.sin(angle),power)
    };
  }

  function normalizeHornSurface(value){
    const surface=isObject(value)&&isObject(value.hornSurface)
      ?value.hornSurface:value;
    if(!isObject(surface)||surface.ok!==true||
        surface.kind!=='threeway-horn-surface'||
        !cleanString(surface.surfaceHash)||
        !Array.isArray(surface.stations)||surface.stations.length<2)
      return null;
    return surface;
  }

  function buildHornInnerSurface(input){
    const source=isObject(input)?input:{},
      surface=normalizeHornSurface(source.hornSurface||source),
      segments=positiveInteger(source.azimuthSegments)||
        positiveInteger(source.segments)||128;
    if(!surface)return failure(diagnostic(
      FAILURE_CODES.HORN_INVALID,['hornSurface'],
      'A successful canonical three-way horn-surface record is required.'
    ));
    if(segments<16||segments>2048||segments%4!==0)
      return failure(diagnostic(
        FAILURE_CODES.INPUT_INVALID,['azimuthSegments'],
        'Preview azimuthSegments must be a multiple of four from 16 through 2048.'
      ));
    const verticesM=[],triangles=[];
    for(let stationIndex=0;stationIndex<surface.stations.length;
        stationIndex++){
      const station=surface.stations[stationIndex],
        axial=finite(station.axialM),
        section=station.section;
      if(axial===null||!isObject(section))
        return failure(diagnostic(
          FAILURE_CODES.HORN_INVALID,
          ['hornSurface.stations['+stationIndex+']'],
          'Every horn station requires finite axial coordinate and canonical section.'
        ));
      for(let segment=0;segment<segments;segment++){
        const point=sectionPoint(
          section,2*Math.PI*segment/segments
        );
        if(!point)return failure(diagnostic(
          FAILURE_CODES.SECTION_UNSUPPORTED,
          ['hornSurface.stations['+stationIndex+'].section'],
          'Preview tessellation supports only canonical ellipse and Lamé superellipse stations.'
        ));
        verticesM.push([axial,point.y,point.z]);
      }
    }
    for(let ring=0;ring<surface.stations.length-1;ring++)
      for(let segment=0;segment<segments;segment++){
        const next=(segment+1)%segments,
          a=ring*segments+segment,
          b=ring*segments+next,
          c=(ring+1)*segments+next,
          d=(ring+1)*segments+segment;
        triangles.push([a,b,c],[a,c,d]);
      }
    const geometry=deepFreeze({
      schemaVersion:1,
      id:'horn-inner:'+surface.surfaceHash,
      role:'analysis-horn-inner-surface',
      ownerId:surface.surfaceHash,
      solutionHash:null,
      surfaceHash:surface.surfaceHash,
      primitive:'indexed-triangle-surface',
      verticesM,
      triangles,
      ringCount:surface.stations.length,
      azimuthSegments:segments,
      intentionallyOpen:true,
      cappedAtThroat:false,
      cappedAtMouth:false,
      doubleSided:true,
      wallThicknessM:null,
      materialAuthority:false,
      exactSolid:false,
      manufacturing:false
    });
    return deepFreeze({
      ok:true,
      code:null,
      geometry,
      diagnostics:[],
      hashInput:'meh3-preview-horn-v1\n'+stableStringify(geometry),
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function copyInspectionMesh(input){
    const source=isObject(input)?input:{},
      mesh=isObject(source.mesh)?source.mesh:source,
      id=cleanString(source.id)||cleanString(mesh.id),
      role=cleanString(source.role)||cleanString(mesh.role),
      vertices=Array.isArray(mesh.verticesM)?mesh.verticesM:null,
      triangles=Array.isArray(mesh.triangles)?mesh.triangles:null;
    if(!id||!role||!vertices||!triangles||!vertices.length||
        !triangles.length)
      return failure(diagnostic(
        FAILURE_CODES.SOURCE_MESH_INVALID,
        ['id','role','mesh.verticesM','mesh.triangles'],
        'An inspection mesh requires stable identity, typed role, vertices, and triangles.'
      ));
    for(let index=0;index<vertices.length;index++)
      if(!Array.isArray(vertices[index])||vertices[index].length!==3||
          vertices[index].some(value=>finite(value)===null))
        return failure(diagnostic(
          FAILURE_CODES.SOURCE_MESH_INVALID,
          ['mesh.verticesM['+index+']'],
          'Inspection vertices must be finite three-component SI vectors.'
        ));
    for(let index=0;index<triangles.length;index++){
      const triangle=triangles[index];
      if(!Array.isArray(triangle)||triangle.length!==3||
          triangle.some(value=>!Number.isInteger(value)||
            value<0||value>=vertices.length))
        return failure(diagnostic(
          FAILURE_CODES.SOURCE_MESH_INVALID,
          ['mesh.triangles['+index+']'],
          'Inspection triangle indices must reference existing vertices.'
        ));
    }
    const geometry=deepFreeze({
      schemaVersion:1,
      id,
      role,
      ownerId:cleanString(source.ownerId)||null,
      sourceId:cleanString(source.sourceId)||null,
      stationId:cleanString(source.stationId)||null,
      solutionHash:cleanString(source.solutionHash)||null,
      primitive:'indexed-triangle-inspection-mesh',
      verticesM:vertices.map(item=>item.map(Number)),
      triangles:triangles.map(item=>item.slice()),
      upstreamAudit:isObject(mesh.audit)?cloneValue(mesh.audit):null,
      upstreamRole:cleanString(mesh.role)||null,
      inspectionOnly:true,
      materialAuthority:false,
      exactSolid:false,
      manufacturing:false
    });
    return deepFreeze({
      ok:true,
      code:null,
      geometry,
      diagnostics:[],
      hashInput:'meh3-preview-inspection-v1\n'+stableStringify(geometry),
      manufacturing:false,
      capabilities:CAPABILITIES
    });
  }

  function manufacturingPreflight(operation){
    return deepFreeze({
      ok:false,
      available:false,
      operation:cleanString(operation)||'preview-stl',
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
    failureCodes:FAILURE_CODES,
    capabilities:CAPABILITIES,
    stableStringify,
    buildHornInnerSurface,
    copyInspectionMesh,
    manufacturingPreflight
  });
});
