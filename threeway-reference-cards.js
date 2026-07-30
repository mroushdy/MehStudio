/* MEH Studio v5 — provenance-bearing three-way reference intents.

   These cards describe source/station topology only. They do not contain a
   horn solution, driver substitution, manufacturing geometry, or a product
   clone. Applying a card returns an immutable schema-2 state intent whose
   unresolved values remain unresolved. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3ReferenceCards=factory();
})(function(){
  'use strict';

  const CATALOG_VERSION=1;
  const SERIALIZATION_VERSION='meh3-reference-cards-v1';
  const CARD_IDS=Object.freeze([
    'patent-t3-generic',
    'cosyne-t3-documented-topology',
    'hinson-cx3-documented-topology',
    'u15-h3-documented-topology',
    'compound-research-generic'
  ]);
  const CAPABILITIES=deepFreeze({
    status:'reference-intents-only',
    schema2StateIntent:true,
    provenanceBearing:true,
    deterministicSerialization:true,
    topologySolved:false,
    dimensionsSolved:false,
    acousticAnalysis:false,
    manufacturingValidated:false,
    manufacturingGeometry:false,
    productClone:false
  });

  function isObject(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value);
  }

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    for(const key of Object.keys(value))deepFreeze(value[key]);
    return Object.freeze(value);
  }

  function stableClone(value){
    if(Array.isArray(value))return value.map(stableClone);
    if(isObject(value)){
      const copy={};
      for(const key of Object.keys(value).sort())
        copy[key]=stableClone(value[key]);
      return copy;
    }
    if(typeof value==='number')return Object.is(value,-0)?0:value;
    return value;
  }

  function stableStringify(value){
    return JSON.stringify(stableClone(value));
  }

  function cleanId(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function provenance(
    id,classification,title,sourceUrl,localLedgerRefs,supports,doesNotSupport,
    valuePaths
  ){
    return {
      id,
      classification,
      title,
      sourceUrl,
      localLedgerRefs,
      supports,
      doesNotSupport,
      valuePaths
    };
  }

  function fact(id,statement,provenanceRefs){
    return {id,statement,provenanceRefs};
  }

  function unknown(id,fieldPaths,reason){
    return {id,fieldPaths,reason};
  }

  const RAW_CARDS={
    'patent-t3-generic':{
      id:'patent-t3-generic',
      title:'Generic patent T3 topology',
      topologyFamily:'T3',
      intentStatus:'unsolved-reference-intent',
      manufacturingValidated:false,
      summary:
        'Generic HF-throat, MF-wall-entry, then LF-wall-entry topology; no embodiment dimensions are promoted to defaults.',
      provenance:[
        provenance(
          'prov-unity-patent-t3',
          'documented',
          'Unity Summation Aperture — US 6,411,718 B1',
          'https://patents.google.com/patent/US6411718B1/en',
          [
            'docs/threeway-research-manifest.md#foundational-patents',
            'docs/threeway-primary-source-ledger.md#foundational-patent-record'
          ],
          [
            'HF introduction at the throat',
            'downstream MF and LF wall-entry stations',
            'MF station before LF station'
          ],
          [
            'universal source counts',
            'universal station coordinates',
            'universal passage or chamber dimensions',
            'manufacturing validation'
          ],
          [
            'topology.kind',
            'interfaces[interface-high-throat].kind',
            'entryStations[station-mid-intent].bandIds',
            'entryStations[station-mid-intent].order',
            'entryStations[station-low-intent].bandIds',
            'entryStations[station-low-intent].order'
          ]
        ),
        provenance(
          'prov-unity-continuation-t3',
          'documented',
          'Unity Summation Aperture continuation — US 2002/0106097 A1',
          'https://patents.google.com/patent/US20020106097A1/en',
          [
            'docs/threeway-research-manifest.md#foundational-patents',
            'docs/threeway-primary-source-ledger.md#foundational-patent-record'
          ],
          [
            'shared-horn multiple-entry topology',
            'station, passage, and local-expansion considerations'
          ],
          [
            'a solved contemporary design',
            'freedom-to-operate advice',
            'manufacturing validation'
          ],
          []
        )
      ],
      knownFacts:[
        fact(
          'patent-t3-high-at-throat',
          'The high band enters at the horn throat.',
          ['prov-unity-patent-t3']
        ),
        fact(
          'patent-t3-station-order',
          'Separate mid and low sources enter through downstream wall stations, with the mid station preceding the low station.',
          ['prov-unity-patent-t3','prov-unity-continuation-t3']
        )
      ],
      unknowns:[
        unknown(
          'patent-t3-source-counts',
          ['sources[*].count'],
          'The generic disclosure does not establish one universal physical source count.'
        ),
        unknown(
          'patent-t3-drivers',
          ['sources[*].driverRef'],
          'No driver substitution is selected by this topology card.'
        ),
        unknown(
          'patent-t3-horn',
          ['horn'],
          'Coverage, profile, throat, mouth, and depth require a separate solve.'
        ),
        unknown(
          'patent-t3-station-geometry',
          [
            'entryStations[*].axial',
            'entryStations[*].apertures',
            'entryStations[*].frontChamber',
            'entryStations[*].passages'
          ],
          'Logical order is documented; physical station and passage geometry is not a generic constant.'
        ),
        unknown(
          'patent-t3-crossover',
          ['intent.crossoversHz'],
          'Crossover values require selected sources, a solved horn, and measured verification.'
        )
      ],
      stateIntentSeed:{
        topology:{schemaVersion:1,kind:'T3'},
        sources:[
          {
            id:'source-high',
            bandIds:['high'],
            role:'throat-source',
            count:null,
            provenanceRefs:['prov-unity-patent-t3']
          },
          {
            id:'source-mid',
            bandIds:['mid'],
            role:'wall-source',
            count:null,
            provenanceRefs:['prov-unity-patent-t3']
          },
          {
            id:'source-low',
            bandIds:['low'],
            role:'wall-source',
            count:null,
            provenanceRefs:['prov-unity-patent-t3']
          }
        ],
        interfaces:[
          {
            id:'interface-high-throat',
            kind:'throat',
            sourceIds:['source-high'],
            bandIds:['high'],
            provenanceRefs:['prov-unity-patent-t3']
          }
        ],
        entryStations:[
          {
            id:'station-mid-intent',
            role:'wall-entry',
            sourceIds:['source-mid'],
            bandIds:['mid'],
            order:1,
            provenanceRefs:['prov-unity-patent-t3']
          },
          {
            id:'station-low-intent',
            role:'wall-entry',
            sourceIds:['source-low'],
            bandIds:['low'],
            order:2,
            provenanceRefs:['prov-unity-patent-t3']
          }
        ]
      }
    },

    'cosyne-t3-documented-topology':{
      id:'cosyne-t3-documented-topology',
      title:'CoSyne documented T3 topology',
      topologyFamily:'T3',
      intentStatus:'unsolved-reference-intent',
      manufacturingValidated:false,
      summary:
        'Documented 1 HF + 4 MF + 4 LF T3 source graph; driver substitutions and physical geometry remain a new design problem.',
      provenance:[
        provenance(
          'prov-waslo-cosyne',
          'documented',
          'Bill Waslo — Synergy Calc V5 / CoSyne',
          'https://libinst.com/SynergyCalc/',
          [
            'docs/threeway-primary-source-ledger.md#81-bill-waslo--synergy-calc-v5--cosyne',
            'docs/threeway-build-visual-ledger.md#1-bill-waslo-cosyne'
          ],
          [
            'T3 source graph',
            'one HF, four MF, and four LF sources',
            'separate MF and LF station groups'
          ],
          [
            'drop-in replacement drivers',
            'transplanted port or chamber geometry',
            'manufacturing validation of an adaptation'
          ],
          [
            'topology.kind',
            'sources[source-high].count',
            'sources[source-mid].count',
            'sources[source-low].count',
            'interfaces[interface-high-throat].kind',
            'entryStations[station-mid-intent].order',
            'entryStations[station-low-intent].order'
          ]
        ),
        provenance(
          'prov-waslo-synergy-calc-guide',
          'documented',
          'Synergy Calc V5 guide',
          'https://libinst.com/SynergyCalc/Synergy%20Calc%20V5.pdf',
          [
            'docs/threeway-research-manifest.md#author-origin-diy-documents-and-calculators',
            'docs/threeway-primary-source-ledger.md#81-bill-waslo--synergy-calc-v5--cosyne'
          ],
          [
            'calculation and Hornresp iteration workflow',
            'redesign requirement when drivers change'
          ],
          [
            'a universal geometry',
            'a verified current-driver substitution'
          ],
          []
        ),
        provenance(
          'prov-cosyne-build-thread',
          'adjacent',
          'CoSyne author build thread',
          'https://www.diyaudio.com/community/threads/fs-diy-synergy-horn-speakers-cosyne.297097/',
          ['docs/threeway-build-visual-ledger.md#1-bill-waslo-cosyne'],
          ['documented physical build context'],
          ['machine-readable geometry','manufacturing validation'],
          []
        )
      ],
      knownFacts:[
        fact(
          'cosyne-source-counts',
          'The documented source graph is one HF source, four MF sources, and four LF sources.',
          ['prov-waslo-cosyne','prov-waslo-synergy-calc-guide']
        ),
        fact(
          'cosyne-t3-order',
          'The reference is a conventional T3 arrangement with HF at the throat and MF before LF wall-entry groups.',
          ['prov-waslo-cosyne']
        ),
        fact(
          'cosyne-redesign-substitutions',
          'Changing drivers requires new passage, chamber, crossover, and prototype work.',
          ['prov-waslo-synergy-calc-guide']
        )
      ],
      unknowns:[
        unknown(
          'cosyne-current-drivers',
          ['sources[*].driverRef'],
          'The archived source graph does not select a current-driver adaptation.'
        ),
        unknown(
          'cosyne-horn-geometry',
          ['horn'],
          'The card does not clone the documented product package or solve a new horn.'
        ),
        unknown(
          'cosyne-station-geometry',
          [
            'entryStations[*].axial',
            'entryStations[*].apertures',
            'entryStations[*].frontChamber',
            'entryStations[*].passages'
          ],
          'Station existence and order are retained; every physical value requires a driver-specific solve.'
        ),
        unknown(
          'cosyne-crossover',
          ['intent.crossoversHz'],
          'No crossover is carried into an unsolved adaptation.'
        )
      ],
      stateIntentSeed:{
        topology:{schemaVersion:1,kind:'T3'},
        sources:[
          {
            id:'source-high',
            bandIds:['high'],
            role:'throat-source',
            count:1,
            provenanceRefs:['prov-waslo-cosyne']
          },
          {
            id:'source-mid',
            bandIds:['mid'],
            role:'wall-source',
            count:4,
            provenanceRefs:['prov-waslo-cosyne']
          },
          {
            id:'source-low',
            bandIds:['low'],
            role:'wall-source',
            count:4,
            provenanceRefs:['prov-waslo-cosyne']
          }
        ],
        interfaces:[
          {
            id:'interface-high-throat',
            kind:'throat',
            sourceIds:['source-high'],
            bandIds:['high'],
            provenanceRefs:['prov-waslo-cosyne']
          }
        ],
        entryStations:[
          {
            id:'station-mid-intent',
            role:'wall-entry',
            sourceIds:['source-mid'],
            bandIds:['mid'],
            order:1,
            provenanceRefs:['prov-waslo-cosyne']
          },
          {
            id:'station-low-intent',
            role:'wall-entry',
            sourceIds:['source-low'],
            bandIds:['low'],
            order:2,
            provenanceRefs:['prov-waslo-cosyne']
          }
        ]
      }
    },

    'hinson-cx3-documented-topology':{
      id:'hinson-cx3-documented-topology',
      title:'Hinson-style documented CX3 topology',
      topologyFamily:'CX3',
      intentStatus:'unsolved-reference-intent',
      manufacturingValidated:false,
      summary:
        'One dual-diaphragm MF/HF throat module plus two wall-tapped LF sources; no reference dimensions are transplanted.',
      provenance:[
        provenance(
          'prov-hinson-meh-guide',
          'documented',
          'Scott Hinson — Multiple Entry Horns / MEH guide',
          'https://device.report/m/303b9e618394104d6a72e34bc18bfe61e7e118d97ecfd6db8b563819530e533b.pdf',
          [
            'docs/threeway-primary-source-ledger.md#82-scott-hinson--dual-diaphragm-throat-plus-tapped-lf',
            'docs/threeway-research-manifest.md#author-origin-diy-documents-and-calculators'
          ],
          [
            'one dual-diaphragm MF/HF throat module',
            'two LF cone sources entering through horn-wall slots',
            'CX3 source/interface graph'
          ],
          [
            'generic replacement-driver geometry',
            'universal LF station or aperture dimensions',
            'manufacturing validation of a derivative'
          ],
          [
            'topology.kind',
            'sources[source-coax-mid-high].count',
            'sources[source-low].count',
            'interfaces[interface-coaxial-throat].kind',
            'entryStations[station-low-intent].bandIds'
          ]
        )
      ],
      knownFacts:[
        fact(
          'hinson-coax-throat-module',
          'The documented build uses one dual-diaphragm coaxial compression-driver module to supply the mid and high bands at one throat interface.',
          ['prov-hinson-meh-guide']
        ),
        fact(
          'hinson-low-count',
          'Two cone LF sources enter the common horn through wall slots.',
          ['prov-hinson-meh-guide']
        ),
        fact(
          'hinson-coupled-driver-warning',
          'The two throat diaphragms acoustically interact, so the throat module is not reduced to an inert diameter.',
          ['prov-hinson-meh-guide']
        )
      ],
      unknowns:[
        unknown(
          'hinson-current-drivers',
          ['sources[*].driverRef'],
          'The card records source roles and documented counts, not a replacement-driver selection.'
        ),
        unknown(
          'hinson-horn-geometry',
          ['horn'],
          'Profile, coverage, throat handoff, mouth, and depth require a new solve.'
        ),
        unknown(
          'hinson-lf-station-geometry',
          [
            'entryStations[*].axial',
            'entryStations[*].apertures',
            'entryStations[*].frontChamber',
            'entryStations[*].passages'
          ],
          'The physical LF feed must be recalculated for selected cones and the solved horn.'
        ),
        unknown(
          'hinson-crossover',
          ['intent.crossoversHz'],
          'No documented crossover is promoted into a derivative intent.'
        )
      ],
      stateIntentSeed:{
        topology:{schemaVersion:1,kind:'CX3'},
        sources:[
          {
            id:'source-coax-mid-high',
            bandIds:['mid','high'],
            role:'throat-module',
            count:1,
            provenanceRefs:['prov-hinson-meh-guide']
          },
          {
            id:'source-low',
            bandIds:['low'],
            role:'wall-source',
            count:2,
            provenanceRefs:['prov-hinson-meh-guide']
          }
        ],
        interfaces:[
          {
            id:'interface-coaxial-throat',
            kind:'coaxial-throat',
            sourceIds:['source-coax-mid-high'],
            bandIds:['mid','high'],
            provenanceRefs:['prov-hinson-meh-guide']
          }
        ],
        entryStations:[
          {
            id:'station-low-intent',
            role:'wall-entry',
            sourceIds:['source-low'],
            bandIds:['low'],
            order:0,
            provenanceRefs:['prov-hinson-meh-guide']
          }
        ]
      }
    },

    'u15-h3-documented-topology':{
      id:'u15-h3-documented-topology',
      title:'U15-style H3 shared MF/HF plus external LF topology',
      topologyFamily:'H3',
      intentStatus:'unsolved-reference-intent',
      manufacturingValidated:false,
      summary:
        'A shared MF/HF horn with external direct LF; this is an H3 topology reference, not a three-band shared-horn MEH.',
      provenance:[
        provenance(
          'prov-yorkville-u15',
          'documented',
          'Yorkville Unity U15 legacy product record',
          'https://www.yorkville.com/legacy/product/u15',
          [
            'docs/threeway-research-manifest.md#manufacturer-primary-pages',
            'docs/threeway-build-visual-ledger.md#dreadnoughts-cowan-lambda-unity-yorkville-u15-jmod-hinson-and-related-systems'
          ],
          [
            'one external LF source',
            'three MF sources using the shared horn',
            'one HF throat source',
            'H3 source/interface graph'
          ],
          [
            'three-band shared-horn topology',
            'machine-readable horn geometry',
            'manufacturing validation'
          ],
          [
            'topology.kind',
            'sources[source-low-external].count',
            'sources[source-mid].count',
            'sources[source-high].count',
            'interfaces[interface-shared-mid-high].kind'
          ]
        ),
        provenance(
          'prov-yorkville-u15-spec',
          'documented',
          'Yorkville U15 specification',
          'https://www.yorkville.com/images/products/specsheet/ss_u15.pdf',
          ['docs/threeway-research-manifest.md#manufacturer-primary-pages'],
          ['published system and crossover description'],
          ['a solved parametric derivative','manufacturing geometry'],
          []
        ),
        provenance(
          'prov-yorkville-u15-service',
          'documented',
          'Yorkville U15/U215 service manual',
          'https://www.yorkville.com/images/products/servicemanual/sm_u15-u215.pdf',
          ['docs/threeway-research-manifest.md#manufacturer-primary-pages'],
          ['documented system context'],
          ['permission to clone product geometry','manufacturing validation'],
          []
        )
      ],
      knownFacts:[
        fact(
          'u15-external-low',
          'One direct-radiating LF source remains external to the common MF/HF horn.',
          ['prov-yorkville-u15','prov-yorkville-u15-spec']
        ),
        fact(
          'u15-shared-mid-high',
          'Three MF sources use the shared horn and one HF source feeds its throat.',
          ['prov-yorkville-u15']
        ),
        fact(
          'u15-classification',
          'The complete loudspeaker is three-way, while the shared horn carries only the mid and high bands.',
          ['prov-yorkville-u15','prov-yorkville-u15-spec']
        )
      ],
      unknowns:[
        unknown(
          'u15-derivative-drivers',
          ['sources[*].driverRef'],
          'The topology card does not select or reproduce the product drivers.'
        ),
        unknown(
          'u15-shared-horn-geometry',
          ['horn'],
          'No commercial horn surface or cabinet geometry is cloned.'
        ),
        unknown(
          'u15-interface-geometry',
          ['interfaces[*].geometry'],
          'The shared MF/HF interface is topological only.'
        ),
        unknown(
          'u15-derivative-crossover',
          ['intent.crossoversHz'],
          'Published product crossover points are evidence, not automatic derivative values.'
        )
      ],
      stateIntentSeed:{
        topology:{schemaVersion:1,kind:'H3'},
        sources:[
          {
            id:'source-low-external',
            bandIds:['low'],
            role:'external-to-shared-horn',
            count:1,
            provenanceRefs:['prov-yorkville-u15']
          },
          {
            id:'source-mid',
            bandIds:['mid'],
            role:'throat-module',
            count:3,
            provenanceRefs:['prov-yorkville-u15']
          },
          {
            id:'source-high',
            bandIds:['high'],
            role:'throat-source',
            count:1,
            provenanceRefs:['prov-yorkville-u15']
          }
        ],
        interfaces:[
          {
            id:'interface-shared-mid-high',
            kind:'shared-throat',
            sourceIds:['source-mid','source-high'],
            bandIds:['mid','high'],
            provenanceRefs:['prov-yorkville-u15']
          }
        ],
        entryStations:[]
      }
    },

    'compound-research-generic':{
      id:'compound-research-generic',
      title:'Generic compound-research topology',
      topologyFamily:'COMPOUND_RESEARCH',
      intentStatus:'unsolved-reference-intent',
      manufacturingValidated:false,
      summary:
        'Research placeholder for a directed acoustic graph involving tapped LF and/or a layered or parallel combiner; no branded system graph is inferred.',
      provenance:[
        provenance(
          'prov-parallel-line-source-patent',
          'adjacent',
          'Horn-loaded acoustic line source — US 2009/0323997 A1',
          'https://patents.google.com/patent/US20090323997A1/en',
          [
            'docs/threeway-research-manifest.md#foundational-patents',
            'docs/threeway-primary-source-ledger.md#55-layered-and-parallel-path-combiner-families'
          ],
          ['parallel-path and curved-wavefront combiner research'],
          [
            'a complete generic three-way graph',
            'direct-tap station geometry',
            'manufacturing validation'
          ],
          []
        ),
        provenance(
          'prov-layered-combiner-patent',
          'adjacent',
          'Horn enclosure for combining output — US 2012/0328140 A1',
          'https://patents.google.com/patent/US20120328140A1/en',
          [
            'docs/threeway-research-manifest.md#foundational-patents',
            'docs/threeway-primary-source-ledger.md#55-layered-and-parallel-path-combiner-families'
          ],
          ['layered output-combiner research'],
          [
            'a complete generic three-way graph',
            'product-independent branch geometry',
            'manufacturing validation'
          ],
          ['topology.kind']
        ),
        provenance(
          'prov-jericho-product-context',
          'adjacent',
          'Danley J1-94 product context',
          'https://www.danleysoundlabs.com/products/j1-94/',
          [
            'docs/threeway-research-manifest.md#manufacturer-primary-pages',
            'docs/threeway-primary-source-ledger.md#manufacturer-verified-commercial-systems'
          ],
          ['evidence that compound three-way architectures exist'],
          [
            'permission to clone product geometry',
            'a machine-readable acoustic graph',
            'manufacturing validation'
          ],
          []
        )
      ],
      knownFacts:[
        fact(
          'compound-separate-family',
          'A topology with tapped LF and/or a layered or parallel combiner is not safely represented as an ordinary T3, CX3, or H3 source graph.',
          [
            'prov-parallel-line-source-patent',
            'prov-layered-combiner-patent',
            'prov-jericho-product-context'
          ]
        ),
        fact(
          'compound-explicit-graph-required',
          'A compound design needs an explicit directed graph before sources, interfaces, stations, and branches can be validated.',
          ['prov-parallel-line-source-patent','prov-layered-combiner-patent']
        )
      ],
      unknowns:[
        unknown(
          'compound-graph',
          ['topology.graph.nodes','topology.graph.edges'],
          'No graph is inferred from a product name or photograph.'
        ),
        unknown(
          'compound-sources',
          ['sources'],
          'Every band source and physical count remains unspecified.'
        ),
        unknown(
          'compound-interfaces-stations',
          ['interfaces','entryStations'],
          'No combiner interface, tap station, branch, or source connection is invented.'
        ),
        unknown(
          'compound-geometry',
          ['horn','rearSystems'],
          'All physical, loading, chamber, and horn geometry remains research work.'
        ),
        unknown(
          'compound-crossover',
          ['intent.crossoversHz'],
          'The acoustic graph and sources must exist before crossover work begins.'
        )
      ],
      stateIntentSeed:{
        topology:{
          schemaVersion:1,
          kind:'COMPOUND_RESEARCH',
          graph:{nodes:[],edges:[]}
        },
        sources:[],
        interfaces:[],
        entryStations:[]
      }
    }
  };

  const CARDS=deepFreeze((function(){
    const cards={};
    for(const id of CARD_IDS)cards[id]=RAW_CARDS[id];
    return cards;
  })());

  function listReferenceCards(){
    return deepFreeze(CARD_IDS.map(id=>CARDS[id]));
  }

  function getReferenceCard(cardId){
    const id=cleanId(cardId);
    return id&&Object.prototype.hasOwnProperty.call(CARDS,id)
      ?CARDS[id]:null;
  }

  function cardProvenanceRecords(card){
    return card.provenance.map(record=>({
      id:record.id,
      classification:record.classification,
      title:record.title,
      sourceUrl:record.sourceUrl,
      publicationRevision:null,
      accessedAt:null,
      sha256:null,
      valuePaths:record.valuePaths,
      localLedgerRefs:record.localLedgerRefs,
      supports:record.supports,
      doesNotSupport:record.doesNotSupport
    }));
  }

  function makeStateIntent(card){
    const seed=stableClone(card.stateIntentSeed);
    return deepFreeze({
      schemaVersion:2,
      designId:null,
      revision:0,
      topology:seed.topology,
      intent:{
        status:'unsolved-reference-intent',
        referenceCardId:card.id,
        topologyFamily:card.topologyFamily,
        geometryResolved:false,
        analysisResolved:false,
        manufacturingValidated:false
      },
      horn:{},
      sources:seed.sources||[],
      interfaces:seed.interfaces||[],
      entryStations:seed.entryStations||[],
      rearSystems:[],
      provenance:{records:cardProvenanceRecords(card)},
      research:{
        referenceCardIds:[card.id],
        notes:[
          'Reference topology intent only; unresolved values must be solved and validated independently.'
        ],
        knownFactIds:card.knownFacts.map(item=>item.id),
        unknownIds:card.unknowns.map(item=>item.id),
        localLedgerRefs:[
          ...new Set(card.provenance.flatMap(
            record=>record.localLedgerRefs
          ))
        ].sort()
      }
    });
  }

  function unknownResult(cardId){
    return deepFreeze({
      ok:false,
      available:false,
      code:'THREEWAY_REFERENCE_CARD_UNKNOWN',
      cardId:cleanId(cardId),
      state:null,
      unresolved:[],
      manufacturingValidated:false,
      diagnostics:[{
        code:'THREEWAY_REFERENCE_CARD_UNKNOWN',
        severity:'error',
        message:'Unknown three-way reference card; no fallback card was applied.',
        availableCardIds:[...CARD_IDS]
      }],
      capabilities:CAPABILITIES
    });
  }

  function applyReferenceCard(cardId){
    const card=getReferenceCard(cardId);
    if(!card)return unknownResult(cardId);
    return deepFreeze({
      ok:true,
      available:true,
      code:'THREEWAY_REFERENCE_CARD_APPLIED',
      cardId:card.id,
      state:makeStateIntent(card),
      unresolved:stableClone(card.unknowns),
      manufacturingValidated:false,
      diagnostics:[],
      capabilities:CAPABILITIES
    });
  }

  function serializeReferenceCard(cardId){
    const card=getReferenceCard(cardId);
    return card
      ?SERIALIZATION_VERSION+'\n'+stableStringify(card)
      :null;
  }

  function serializeStateIntent(cardId){
    const result=applyReferenceCard(cardId);
    return result.ok
      ?SERIALIZATION_VERSION+'.state\n'+stableStringify(result.state)
      :null;
  }

  return deepFreeze({
    catalogVersion:CATALOG_VERSION,
    serializationVersion:SERIALIZATION_VERSION,
    cardIds:CARD_IDS,
    cards:CARDS,
    capabilities:CAPABILITIES,
    listReferenceCards,
    getReferenceCard,
    applyReferenceCard,
    serializeReferenceCard,
    serializeStateIntent,
    stableStringify
  });
});
