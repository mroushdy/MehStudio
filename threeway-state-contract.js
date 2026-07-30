/* MEH Studio v5 — immutable three-way state/topology/provenance contract.

   Stage 1 only. This module owns no renderer, horn solver, mesh, Boolean
   operation, driver database, DOM state, or manufacturing export. It:

   - normalizes the schema-2 input state without mutating the caller;
   - validates explicit T3, CX3, H3, and COMPOUND_RESEARCH source graphs;
   - keeps entry-station identity and order explicit;
   - preserves provenance records and conflicts without promotion;
   - produces deterministic canonical JSON/hash input; and
   - refuses manufacturing capability unconditionally.

   Mouth dimensions are copied as user intent. They are never used to infer a
   source, physical driver count, interface, entry station, aperture, or
   placement. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3StateContract=factory();
})(function(){
  'use strict';

  const SCHEMA_VERSION=2;
  const TOPOLOGY_SCHEMA_VERSION=1;
  const HASH_INPUT_VERSION='meh3-state-v2.topology-v1';
  const BAND_IDS=Object.freeze(['low','mid','high']);
  const PROVENANCE_CLASSIFICATIONS=Object.freeze([
    'documented',
    'calculated-adaptation',
    'envelope-study',
    'adjacent'
  ]);
  const TOPOLOGY_IDS=Object.freeze([
    'T3','CX3','H3','COMPOUND_RESEARCH'
  ]);
  const BAND_ALIASES=Object.freeze({
    low:'low',lf:'low',woofer:'low',
    mid:'mid',mf:'mid',midrange:'mid',
    high:'high',hf:'high',cd:'high'
  });
  const TOPOLOGY_ALIASES=Object.freeze({
    t3:'T3',
    'three-station-shared-horn':'T3',
    'shared-horn-three-band':'T3',
    cx3:'CX3',
    'coax-throat-three-band':'CX3',
    'coax-throat-tapped-lf':'CX3',
    h3:'H3',
    'hybrid-three-band':'H3',
    'mf-hf-horn-direct-lf':'H3',
    compound_research:'COMPOUND_RESEARCH',
    'compound-research':'COMPOUND_RESEARCH'
  });
  const TOPOLOGY_REGISTRY=deepFreeze({
    T3:{
      id:'T3',
      title:'three-station shared horn',
      stationOrder:'explicit-mid-before-low',
      analysisFamily:'coupled-three-station',
      manufacturingAvailable:false
    },
    CX3:{
      id:'CX3',
      title:'coax-throat three-band shared horn',
      stationOrder:'explicit-low-after-throat',
      analysisFamily:'coax-throat-plus-low-entry',
      manufacturingAvailable:false
    },
    H3:{
      id:'H3',
      title:'MF/HF shared horn with external LF',
      stationOrder:'no-low-shared-horn-entry',
      analysisFamily:'shared-mid-high-plus-external-low',
      manufacturingAvailable:false
    },
    COMPOUND_RESEARCH:{
      id:'COMPOUND_RESEARCH',
      title:'explicit compound acoustic graph',
      stationOrder:'graph-owned-no-conventional-order',
      analysisFamily:'research-graph-only',
      manufacturingAvailable:false
    }
  });
  const CAPABILITIES=deepFreeze({
    status:'immutable-state-contract-only',
    schemaNormalization:true,
    topologyValidation:true,
    provenancePreservation:true,
    deterministicCanonicalization:true,
    analysisSolver:false,
    renderModel:false,
    manufacturingPlan:false,
    manufacturingSolids:false,
    manufacturingAudit:false,
    manufacturingExport:false,
    stlExport:false,
    reason:
      'Stage 1 defines state only; no audited three-way manufacturing plan or solid exists.'
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
    if(typeof value==='number')return Object.is(value,-0)?0:value;
    return value;
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function finiteInteger(value){
    const number=Number(value);
    return Number.isInteger(number)&&number>=0?number:null;
  }

  function positiveInteger(value){
    const number=Number(value);
    return Number.isInteger(number)&&number>0?number:null;
  }

  function uniqueStrings(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function compareNullableStrings(left,right){
    return String(left||'').localeCompare(String(right||''));
  }

  function compareIds(left,right){
    return compareNullableStrings(left&&left.id,right&&right.id);
  }

  function canonicalBandId(value){
    const key=cleanString(value);
    return key?BAND_ALIASES[key.toLowerCase()]||null:null;
  }

  function normalizeBandIds(value,diagnostics,path){
    const supplied=Array.isArray(value)?value:[],
      result=[];
    for(let index=0;index<supplied.length;index++){
      const id=canonicalBandId(supplied[index]);
      if(!id)diagnostics.push(makeDiagnostic(
        'THREEWAY_TOPOLOGY_GRAPH_INVALID','error','topology',
        [path+'['+index+']'],
        'Every band reference must resolve to low, mid, or high.',
        [],['analysis','preview','hornresp','manufacturing']
      ));
      else if(!result.includes(id))result.push(id);
    }
    return result.sort(
      (left,right)=>BAND_IDS.indexOf(left)-BAND_IDS.indexOf(right)
    );
  }

  function makeDiagnostic(
    code,severity,phase,paths,message,evidenceRefs,blocksCapabilities
  ){
    return deepFreeze({
      code,
      severity,
      phase,
      paths:uniqueStrings(paths),
      message,
      evidenceRefs:uniqueStrings(evidenceRefs),
      blocksCapabilities:uniqueStrings(blocksCapabilities)
    });
  }

  function addGraphDiagnostic(diagnostics,paths,message){
    diagnostics.push(makeDiagnostic(
      'THREEWAY_TOPOLOGY_GRAPH_INVALID','error','topology',paths,message,[],
      ['analysis','preview','hornresp','manufacturing']
    ));
  }

  function normalizeTopology(raw,diagnostics){
    const record=isObject(raw)?raw:{kind:raw},
      requested=cleanString(record.kind),
      key=requested?requested.toLowerCase():null,
      kind=requested&&TOPOLOGY_IDS.includes(requested)
        ?requested:TOPOLOGY_ALIASES[key]||null,
      schemaVersion=finiteInteger(record.schemaVersion);
    if(!requested)diagnostics.push(makeDiagnostic(
      'THREEWAY_TOPOLOGY_REQUIRED','error','topology',['topology.kind'],
      'An explicit T3, CX3, H3, or COMPOUND_RESEARCH topology is required.',
      [],['analysis','preview','hornresp','manufacturing']
    ));
    else if(!kind)diagnostics.push(makeDiagnostic(
      'THREEWAY_TOPOLOGY_UNSUPPORTED','error','topology',['topology.kind'],
      'Unsupported three-way topology: '+requested+'.',[],
      ['analysis','preview','hornresp','manufacturing']
    ));
    if(schemaVersion!==TOPOLOGY_SCHEMA_VERSION)
      diagnostics.push(makeDiagnostic(
        'THREEWAY_SCHEMA_UNSUPPORTED','error','schema',
        ['topology.schemaVersion'],
        'Topology schemaVersion must be '+TOPOLOGY_SCHEMA_VERSION+'.',[],
        ['analysis','preview','hornresp','manufacturing']
      ));
    const normalized=cloneValue(record);
    normalized.kind=kind;
    normalized.schemaVersion=schemaVersion;
    if(kind==='COMPOUND_RESEARCH')
      normalized.graph=normalizeCompoundGraph(
        record.graph,diagnostics,'topology.graph'
      );
    else delete normalized.graph;
    return normalized;
  }

  function normalizeCompoundGraph(raw,diagnostics,path){
    const graph=isObject(raw)?cloneValue(raw):{},
      nodes=Array.isArray(graph.nodes)?graph.nodes:[],
      edges=Array.isArray(graph.edges)?graph.edges:[],
      normalizedNodes=[],
      normalizedEdges=[],
      nodeIds=new Set();
    if(!isObject(raw))addGraphDiagnostic(
      diagnostics,[path],
      'COMPOUND_RESEARCH requires an explicit directed acoustic graph.'
    );
    for(let index=0;index<nodes.length;index++){
      const node=isObject(nodes[index])?cloneValue(nodes[index]):{},
        id=cleanString(node.id);
      node.id=id;
      node.kind=cleanString(node.kind);
      if(!id||nodeIds.has(id))addGraphDiagnostic(
        diagnostics,[path+'.nodes['+index+'].id'],
        'Compound graph node IDs must be nonempty and unique.'
      );
      if(id)nodeIds.add(id);
      normalizedNodes.push(node);
    }
    for(let index=0;index<edges.length;index++){
      const edge=isObject(edges[index])?cloneValue(edges[index]):{},
        from=cleanString(edge.from),
        to=cleanString(edge.to);
      edge.id=cleanString(edge.id);
      edge.from=from;
      edge.to=to;
      edge.directed=true;
      if(!from||!to||!nodeIds.has(from)||!nodeIds.has(to))
        addGraphDiagnostic(
          diagnostics,[path+'.edges['+index+']'],
          'Every compound graph edge must connect two declared nodes.'
        );
      normalizedEdges.push(edge);
    }
    if(!normalizedNodes.length||!normalizedEdges.length)addGraphDiagnostic(
      diagnostics,[path],
      'COMPOUND_RESEARCH requires at least one node and one directed edge.'
    );
    graph.nodes=normalizedNodes.sort(compareIds);
    graph.edges=normalizedEdges.sort((left,right)=>{
      const leftKey=[
          left.from||'',left.to||'',left.id||'',stableStringify(left)
        ].join('\u0000'),
        rightKey=[
          right.from||'',right.to||'',right.id||'',stableStringify(right)
        ].join('\u0000');
      return leftKey.localeCompare(rightKey);
    });
    return graph;
  }

  function duplicateIdDiagnostic(
    diagnostics,collection,path,index,id
  ){
    addGraphDiagnostic(
      diagnostics,[path+'['+index+'].id'],
      collection+' IDs must be nonempty and unique'+
        (id?' (duplicate '+id+')':'.')
    );
  }

  function normalizeSources(raw,diagnostics){
    const supplied=Array.isArray(raw)?raw:[],
      result=[],
      ids=new Set();
    for(let index=0;index<supplied.length;index++){
      const source=isObject(supplied[index])?cloneValue(supplied[index]):{},
        path='sources['+index+']',
        id=cleanString(source.id),
        role=cleanString(source.role),
        count=positiveInteger(source.count);
      source.id=id;
      source.bandIds=normalizeBandIds(
        source.bandIds,diagnostics,path+'.bandIds'
      );
      source.role=role;
      source.count=count;
      source.provenanceRefs=uniqueStrings(source.provenanceRefs);
      if(!id||ids.has(id))duplicateIdDiagnostic(
        diagnostics,'Source','sources',index,id
      );
      if(id)ids.add(id);
      if(!role)diagnostics.push(makeDiagnostic(
        'THREEWAY_SOURCE_ROLE_INVALID','error','topology',[path+'.role'],
        'Every source requires an explicit topology role.',[],
        ['analysis','preview','hornresp','manufacturing']
      ));
      if(count===null)addGraphDiagnostic(
        diagnostics,[path+'.count'],
        'Every source requires an explicit positive physical count; count is not inferred.'
      );
      result.push(source);
    }
    return result.sort(compareIds);
  }

  function normalizeInterfaces(raw,diagnostics){
    const supplied=Array.isArray(raw)?raw:[],
      result=[],
      ids=new Set();
    for(let index=0;index<supplied.length;index++){
      const item=isObject(supplied[index])?cloneValue(supplied[index]):{},
        path='interfaces['+index+']',
        id=cleanString(item.id);
      item.id=id;
      item.kind=cleanString(item.kind);
      item.sourceIds=uniqueStrings(item.sourceIds);
      item.bandIds=normalizeBandIds(
        item.bandIds,diagnostics,path+'.bandIds'
      );
      item.provenanceRefs=uniqueStrings(item.provenanceRefs);
      if(!id||ids.has(id))duplicateIdDiagnostic(
        diagnostics,'Interface','interfaces',index,id
      );
      if(id)ids.add(id);
      if(!item.kind)addGraphDiagnostic(
        diagnostics,[path+'.kind'],
        'Every interface requires an explicit kind.'
      );
      result.push(item);
    }
    return result.sort(compareIds);
  }

  function normalizeEntryStations(raw,topologyKind,diagnostics){
    const supplied=Array.isArray(raw)?raw:[],
      result=[],
      ids=new Set();
    for(let index=0;index<supplied.length;index++){
      const item=isObject(supplied[index])?cloneValue(supplied[index]):{},
        path='entryStations['+index+']',
        id=cleanString(item.id);
      item.id=id;
      item.role=cleanString(item.role);
      item.sourceIds=uniqueStrings(item.sourceIds);
      item.bandIds=normalizeBandIds(
        item.bandIds,diagnostics,path+'.bandIds'
      );
      item.order=item.order===null?null:finiteInteger(item.order);
      item.provenanceRefs=uniqueStrings(item.provenanceRefs);
      if(!id||ids.has(id))duplicateIdDiagnostic(
        diagnostics,'Entry station','entryStations',index,id
      );
      if(id)ids.add(id);
      if(topologyKind!=='COMPOUND_RESEARCH'&&item.order===null)
        diagnostics.push(makeDiagnostic(
          'THREEWAY_ENTRY_STATION_ORDER_INVALID','error','stations',
          [path+'.order'],
          'Conventional topologies require an explicit nonnegative station order.',
          [],['analysis','preview','hornresp','manufacturing']
        ));
      result.push(item);
    }
    if(topologyKind==='COMPOUND_RESEARCH')return result.sort(compareIds);
    return result.sort((left,right)=>{
      const leftOrder=left.order===null?Number.MAX_SAFE_INTEGER:left.order,
        rightOrder=right.order===null?Number.MAX_SAFE_INTEGER:right.order;
      return leftOrder-rightOrder||compareIds(left,right);
    });
  }

  function normalizeRearSystems(raw){
    const supplied=Array.isArray(raw)?raw:[],
      result=supplied.map(item=>isObject(item)?cloneValue(item):{});
    for(const item of result){
      item.id=cleanString(item.id);
      item.sourceIds=uniqueStrings(item.sourceIds);
      item.provenanceRefs=uniqueStrings(item.provenanceRefs);
    }
    return result.sort(compareIds);
  }

  function normalizeProvenance(raw,diagnostics){
    const container=isObject(raw)?cloneValue(raw):{},
      supplied=Array.isArray(container.records)?container.records:[],
      records=[],
      ids=new Set();
    for(let index=0;index<supplied.length;index++){
      const record=isObject(supplied[index])?cloneValue(supplied[index]):{},
        path='provenance.records['+index+']',
        id=cleanString(record.id),
        classification=cleanString(record.classification);
      record.id=id;
      record.classification=classification;
      record.sourceUrl=cleanString(record.sourceUrl);
      record.title=cleanString(record.title);
      record.publicationRevision=cleanString(record.publicationRevision);
      record.accessedAt=cleanString(record.accessedAt);
      record.sha256=cleanString(record.sha256);
      record.valuePaths=uniqueStrings(record.valuePaths);
      if(!id||ids.has(id))duplicateIdDiagnostic(
        diagnostics,'Provenance record','provenance.records',index,id
      );
      if(id)ids.add(id);
      if(!PROVENANCE_CLASSIFICATIONS.includes(classification))
        diagnostics.push(makeDiagnostic(
          'THREEWAY_PROVENANCE_CLASS_UNKNOWN','error','provenance',
          [path+'.classification'],
          'Unknown provenance classification is preserved but cannot authorize a locked value.',
          id?[id]:[],['analysis','preview','hornresp','manufacturing']
        ));
      records.push(record);
    }
    container.records=records.sort(compareIds);
    appendProvenanceConflicts(container.records,diagnostics);
    return container;
  }

  function provenanceFingerprint(record){
    return stableStringify({
      classification:record.classification||null,
      sourceUrl:record.sourceUrl||null,
      publicationRevision:record.publicationRevision||null,
      sha256:record.sha256||null
    });
  }

  function appendProvenanceConflicts(records,diagnostics){
    const byPath=new Map();
    for(const record of records){
      for(const valuePath of record.valuePaths||[]){
        if(!byPath.has(valuePath))byPath.set(valuePath,[]);
        byPath.get(valuePath).push(record);
      }
    }
    for(const [valuePath,items] of byPath){
      const fingerprints=new Set(items.map(provenanceFingerprint));
      if(fingerprints.size>1)diagnostics.push(makeDiagnostic(
        'THREEWAY_PROVENANCE_CONFLICT','warning','provenance',[valuePath],
        'Conflicting source records are preserved side by side for this value.',
        items.map(item=>item.id),[]
      ));
    }
  }

  function mapsFor(state){
    return {
      sources:new Map(state.sources.map(item=>[item.id,item])),
      interfaces:new Map(state.interfaces.map(item=>[item.id,item])),
      stations:new Map(state.entryStations.map(item=>[item.id,item])),
      provenance:new Map(
        state.provenance.records.map(item=>[item.id,item])
      )
    };
  }

  function validateReferences(state,diagnostics,maps){
    const bandSources={low:[],mid:[],high:[]};
    for(const source of state.sources){
      for(const bandId of source.bandIds)bandSources[bandId].push(source);
      validateProvenanceRefs(
        source.provenanceRefs,maps.provenance,diagnostics,
        ['sources['+(source.id||'?')+'].provenanceRefs']
      );
    }
    for(const bandId of BAND_IDS)if(!bandSources[bandId].length)
      diagnostics.push(makeDiagnostic(
        'THREEWAY_BAND_SOURCE_MISSING','error','topology',
        ['sources'],
        'The '+bandId+' electrical band requires an explicit source.',
        [],['analysis','preview','hornresp','manufacturing']
      ));
    for(const item of state.interfaces)validateGraphMemberReferences(
      item,'interfaces',maps,diagnostics
    );
    for(const item of state.entryStations)validateGraphMemberReferences(
      item,'entryStations',maps,diagnostics
    );
    return bandSources;
  }

  function validateProvenanceRefs(
    refs,provenanceMap,diagnostics,paths
  ){
    for(const ref of refs||[])if(!provenanceMap.has(ref))
      diagnostics.push(makeDiagnostic(
        'THREEWAY_PROVENANCE_REQUIRED','error','provenance',paths,
        'Referenced provenance record '+ref+' does not exist.',[ref],
        ['analysis','preview','hornresp','manufacturing']
      ));
  }

  function validateGraphMemberReferences(
    item,collection,maps,diagnostics
  ){
    const path=collection+'['+(item.id||'?')+']';
    if(!item.sourceIds.length)addGraphDiagnostic(
      diagnostics,[path+'.sourceIds'],
      'Every interface and entry station requires explicit source IDs.'
    );
    if(!item.bandIds.length)addGraphDiagnostic(
      diagnostics,[path+'.bandIds'],
      'Every interface and entry station requires explicit band IDs.'
    );
    const referenced=[];
    for(const sourceId of item.sourceIds){
      const source=maps.sources.get(sourceId);
      if(!source)addGraphDiagnostic(
        diagnostics,[path+'.sourceIds'],
        'Unknown source reference '+sourceId+'.'
      );
      else referenced.push(source);
    }
    for(const bandId of item.bandIds){
      const carried=referenced.some(
        source=>source.bandIds.includes(bandId)
      );
      if(!carried)diagnostics.push(makeDiagnostic(
        'THREEWAY_INTERFACE_CONFLICT','error','topology',
        [path+'.bandIds',path+'.sourceIds'],
        'Band '+bandId+' is not carried by a referenced source.',[],
        ['analysis','preview','hornresp','manufacturing']
      ));
    }
    validateProvenanceRefs(
      item.provenanceRefs,maps.provenance,diagnostics,
      [path+'.provenanceRefs']
    );
  }

  function stationCarries(station,bandId){
    return station.bandIds.includes(bandId);
  }

  function interfaceCarries(item,bandId){
    return item.bandIds.includes(bandId);
  }

  function requireSingleInterface(
    state,diagnostics,predicate,description
  ){
    const matches=state.interfaces.filter(predicate);
    if(matches.length!==1)diagnostics.push(makeDiagnostic(
      'THREEWAY_INTERFACE_CONFLICT','error','topology',['interfaces'],
      description+'; found '+matches.length+'.',[],
      ['analysis','preview','hornresp','manufacturing']
    ));
    return matches;
  }

  function validateStationRoles(stations,diagnostics){
    for(const station of stations)if(station.role!=='wall-entry')
      diagnostics.push(makeDiagnostic(
        'THREEWAY_TOPOLOGY_GRAPH_INVALID','error','topology',
        ['entryStations['+(station.id||'?')+'].role'],
        'Conventional shared-horn entry stations must use role wall-entry.',
        [],['analysis','preview','hornresp','manufacturing']
      ));
  }

  function validateT3(state,diagnostics){
    validateStationRoles(state.entryStations,diagnostics);
    const hfInterfaces=requireSingleInterface(
      state,diagnostics,
      item=>item.kind==='throat'&&interfaceCarries(item,'high'),
      'T3 requires exactly one HF throat interface'
    );
    if(hfInterfaces[0]&&hfInterfaces[0].bandIds.some(id=>id!=='high'))
      diagnostics.push(makeDiagnostic(
        'THREEWAY_INTERFACE_CONFLICT','error','topology',
        ['interfaces['+hfInterfaces[0].id+'].bandIds'],
        'The T3 HF throat interface may carry only the high band.',[],
        ['analysis','preview','hornresp','manufacturing']
      ));
    const mid=state.entryStations.filter(
        item=>stationCarries(item,'mid')
      ),
      low=state.entryStations.filter(
        item=>stationCarries(item,'low')
      ),
      high=state.entryStations.filter(
        item=>stationCarries(item,'high')
      );
    requireStations(mid,'mid','T3',diagnostics);
    requireStations(low,'low','T3',diagnostics);
    if(high.length)addGraphDiagnostic(
      diagnostics,high.map(item=>'entryStations['+item.id+']'),
      'T3 high frequency energy enters at the throat, not a wall station.'
    );
    if(mid.length&&low.length){
      const midOrders=mid.map(item=>item.order).filter(Number.isInteger),
        lowOrders=low.map(item=>item.order).filter(Number.isInteger);
      if(midOrders.length!==mid.length||lowOrders.length!==low.length||
          Math.max(...midOrders)>=Math.min(...lowOrders))
        diagnostics.push(makeDiagnostic(
          'THREEWAY_ENTRY_STATION_ORDER_INVALID','error','stations',
          ['entryStations'],
          'T3 requires every explicit mid station to precede every explicit low station.',
          [],['analysis','preview','hornresp','manufacturing']
        ));
    }
    for(const source of state.sources){
      const expected=source.bandIds.includes('high')
        ?'throat-source':'wall-source';
      if(source.role!==expected)invalidSourceRole(
        diagnostics,source,
        'T3 '+source.bandIds.join('/')+' sources require role '+expected+'.'
      );
    }
  }

  function validateCX3(state,diagnostics){
    validateStationRoles(state.entryStations,diagnostics);
    requireSingleInterface(
      state,diagnostics,
      item=>item.kind==='coaxial-throat'&&
        interfaceCarries(item,'mid')&&interfaceCarries(item,'high'),
      'CX3 requires exactly one coaxial-throat interface carrying mid and high'
    );
    const low=state.entryStations.filter(
        item=>stationCarries(item,'low')
      ),
      forbidden=state.entryStations.filter(
        item=>stationCarries(item,'mid')||stationCarries(item,'high')
      );
    requireStations(low,'low','CX3',diagnostics);
    if(forbidden.length)addGraphDiagnostic(
      diagnostics,forbidden.map(item=>'entryStations['+item.id+']'),
      'CX3 has no fabricated mid/high wall-entry station.'
    );
    for(const source of state.sources){
      const isLow=source.bandIds.includes('low'),
        allowed=isLow
          ?source.role==='wall-source'
          :source.role==='throat-module'||source.role==='throat-source';
      if(!allowed)invalidSourceRole(
        diagnostics,source,
        'CX3 low sources are wall-source; mid/high sources are throat-module or throat-source.'
      );
    }
  }

  function validateH3(state,diagnostics){
    requireSingleInterface(
      state,diagnostics,
      item=>['shared-throat','coaxial-throat','throat'].includes(
        item.kind
      )&&interfaceCarries(item,'mid')&&interfaceCarries(item,'high'),
      'H3 requires exactly one shared MF/HF horn interface'
    );
    if(state.entryStations.length)addGraphDiagnostic(
      diagnostics,state.entryStations.map(
        item=>'entryStations['+item.id+']'
      ),
      'H3 has no LF shared-horn entry station; LF is external to the shared horn.'
    );
    for(const source of state.sources){
      const isLow=source.bandIds.includes('low'),
        allowed=isLow
          ?source.role==='external-to-shared-horn'
          :source.role==='throat-module'||source.role==='throat-source';
      if(!allowed)invalidSourceRole(
        diagnostics,source,
        'H3 low sources require role external-to-shared-horn; mid/high sources use the shared horn interface.'
      );
    }
  }

  function validateCompound(state,diagnostics){
    const graph=state.topology.graph||{},
      nodeRefs=new Set(
        (graph.nodes||[]).map(node=>cleanString(node.refId)).filter(Boolean)
      ),
      expected=[
        ...state.sources.map(item=>item.id),
        ...state.interfaces.map(item=>item.id),
        ...state.entryStations.map(item=>item.id)
      ].filter(Boolean);
    for(const ref of expected)if(!nodeRefs.has(ref))addGraphDiagnostic(
      diagnostics,['topology.graph.nodes'],
      'Compound graph has no node with refId '+ref+'.'
    );
    /* No station-order check belongs here. The directed graph owns order. */
  }

  function requireStations(items,bandId,topologyId,diagnostics){
    if(!items.length)diagnostics.push(makeDiagnostic(
      'THREEWAY_ENTRY_STATION_REQUIRED','error','stations',
      ['entryStations'],
      topologyId+' requires at least one '+bandId+' wall-entry station.',
      [],['analysis','preview','hornresp','manufacturing']
    ));
  }

  function invalidSourceRole(diagnostics,source,message){
    diagnostics.push(makeDiagnostic(
      'THREEWAY_SOURCE_ROLE_INVALID','error','topology',
      ['sources['+(source.id||'?')+'].role'],message,[],
      ['analysis','preview','hornresp','manufacturing']
    ));
  }

  function validateTopology(state,diagnostics){
    if(!TOPOLOGY_IDS.includes(state.topology.kind))return;
    if(state.topology.kind==='T3')validateT3(state,diagnostics);
    else if(state.topology.kind==='CX3')validateCX3(state,diagnostics);
    else if(state.topology.kind==='H3')validateH3(state,diagnostics);
    else validateCompound(state,diagnostics);
  }

  function lockModesForStation(station){
    const result=[];
    if(station.axial&&station.axial.mode==='documented-lock')
      result.push('axial');
    if(station.apertures&&
        station.apertures.summedAreaMode==='documented-lock')
      result.push('apertures');
    if(station.frontChamber&&
        station.frontChamber.mode==='documented-lock')
      result.push('frontChamber');
    if(station.passages&&
        station.passages.lengthMode==='documented-lock')
      result.push('passages');
    return result;
  }

  function validateLockedProvenance(state,diagnostics,maps){
    for(const station of state.entryStations){
      const locks=lockModesForStation(station);
      if(!locks.length)continue;
      const path='entryStations['+(station.id||'?')+']',
        records=station.provenanceRefs
          .map(ref=>maps.provenance.get(ref)).filter(Boolean);
      if(!records.length)diagnostics.push(makeDiagnostic(
        'THREEWAY_PROVENANCE_REQUIRED','error','provenance',
        locks.map(lock=>path+'.'+lock),
        'Every documented lock requires at least one provenance record.',
        station.provenanceRefs,
        ['analysis','preview','hornresp','manufacturing']
      ));
      else if(records.every(record=>
        record.classification==='envelope-study'||
        record.classification==='adjacent'
      ))diagnostics.push(makeDiagnostic(
        'THREEWAY_ENVELOPE_PROMOTION_REFUSED','error','provenance',
        locks.map(lock=>path+'.'+lock),
        'Envelope/adjacent evidence may seed package intent but cannot become locked acoustic geometry.',
        records.map(record=>record.id),
        ['analysis','preview','hornresp','manufacturing']
      ));
    }
  }

  function sortDiagnostics(diagnostics){
    return diagnostics.slice().sort((left,right)=>{
      const leftKey=[
          left.phase,left.code,left.paths.join('\u0000'),left.message
        ].join('\u0001'),
        rightKey=[
          right.phase,right.code,right.paths.join('\u0000'),right.message
        ].join('\u0001');
      return leftKey.localeCompare(rightKey);
    });
  }

  function stableClone(value){
    if(Array.isArray(value))return value.map(stableClone);
    if(isObject(value)){
      const result={};
      for(const key of Object.keys(value).sort()){
        const item=value[key];
        if(item!==undefined)result[key]=stableClone(item);
      }
      return result;
    }
    if(typeof value==='number'){
      if(!Number.isFinite(value))return null;
      return Object.is(value,-0)?0:value;
    }
    if(value===null||typeof value==='string'||typeof value==='boolean')
      return value;
    /* Persisted state is JSON. Unsupported runtime values become an explicit
       null in canonical form rather than disappearing differently between
       object and array positions. */
    return null;
  }

  function canonicalizeThreeWayState(value){
    const source=isObject(value)?cloneValue(value):{},
      kind=source.topology&&source.topology.kind;
    if(Array.isArray(source.sources))source.sources.sort(compareIds);
    if(Array.isArray(source.interfaces))source.interfaces.sort(compareIds);
    if(Array.isArray(source.rearSystems))source.rearSystems.sort(compareIds);
    if(Array.isArray(source.entryStations)){
      if(kind==='COMPOUND_RESEARCH')
        source.entryStations.sort(compareIds);
      else source.entryStations.sort((left,right)=>{
        const leftOrder=Number.isInteger(left.order)
            ?left.order:Number.MAX_SAFE_INTEGER,
          rightOrder=Number.isInteger(right.order)
            ?right.order:Number.MAX_SAFE_INTEGER;
        return leftOrder-rightOrder||compareIds(left,right);
      });
    }
    if(source.provenance&&Array.isArray(source.provenance.records))
      source.provenance.records.sort(compareIds);
    if(source.topology&&source.topology.graph){
      const graph=source.topology.graph;
      if(Array.isArray(graph.nodes))graph.nodes.sort(compareIds);
      if(Array.isArray(graph.edges))graph.edges.sort((left,right)=>
        stableStringify(left).localeCompare(stableStringify(right))
      );
    }
    return deepFreeze(stableClone(source));
  }

  function stableStringify(value){
    return JSON.stringify(stableClone(value));
  }

  function stateHashInput(value){
    const state=isObject(value)&&isObject(value.state)
        ?value.state:value,
      canonical=canonicalizeThreeWayState(state);
    return HASH_INPUT_VERSION+'\n'+stableStringify(canonical);
  }

  function normalizeThreeWayState(input){
    const source=isObject(input)?input:{},
      diagnostics=[];
    if(Number(source.schemaVersion)!==SCHEMA_VERSION)
      diagnostics.push(makeDiagnostic(
        'THREEWAY_SCHEMA_UNSUPPORTED','error','schema',
        ['schemaVersion'],
        'Three-way input schemaVersion must be '+SCHEMA_VERSION+'.',[],
        ['analysis','preview','hornresp','manufacturing']
      ));
    const topology=normalizeTopology(source.topology,diagnostics),
      sources=normalizeSources(source.sources,diagnostics),
      interfaces=normalizeInterfaces(source.interfaces,diagnostics),
      entryStations=normalizeEntryStations(
        source.entryStations,topology.kind,diagnostics
      ),
      provenance=normalizeProvenance(source.provenance,diagnostics),
      state={
        schemaVersion:SCHEMA_VERSION,
        designId:cleanString(source.designId),
        revision:finiteInteger(source.revision),
        topology,
        intent:isObject(source.intent)?cloneValue(source.intent):{},
        horn:isObject(source.horn)?cloneValue(source.horn):{},
        sources,
        interfaces,
        entryStations,
        rearSystems:normalizeRearSystems(source.rearSystems),
        provenance,
        research:isObject(source.research)
          ?cloneValue(source.research):{notes:[],referenceCardIds:[]}
      };
    const maps=mapsFor(state);
    validateReferences(state,diagnostics,maps);
    validateTopology(state,diagnostics);
    validateLockedProvenance(state,diagnostics,maps);
    const canonical=canonicalizeThreeWayState(state),
      orderedDiagnostics=sortDiagnostics(diagnostics),
      hasError=orderedDiagnostics.some(item=>item.severity==='error');
    return deepFreeze({
      state:canonical,
      valid:!hasError,
      diagnostics:orderedDiagnostics,
      hashInput:stateHashInput(canonical),
      readiness:{
        topology:!hasError,
        analysis:false,
        preview:false,
        hornresp:false,
        manufacturingPlan:false,
        exactSolid:false,
        manufacturing:false,
        stl:false
      },
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
      manufacturingPlan:false,
      exactSolid:false,
      manufacturing:false,
      stl:false,
      capabilities:CAPABILITIES
    });
  }

  return deepFreeze({
    schemaVersion:SCHEMA_VERSION,
    topologySchemaVersion:TOPOLOGY_SCHEMA_VERSION,
    hashInputVersion:HASH_INPUT_VERSION,
    topologyIds:TOPOLOGY_IDS,
    topologyRegistry:TOPOLOGY_REGISTRY,
    bandIds:BAND_IDS,
    provenanceClassifications:PROVENANCE_CLASSIFICATIONS,
    capabilities:CAPABILITIES,
    normalizeThreeWayState,
    canonicalizeThreeWayState,
    stableStringify,
    stateHashInput,
    manufacturingPreflight
  });
});
