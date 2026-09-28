/* MEH Studio v5 — experimental three-source coupled-network math.

   Pure numerical Stage 2 foundation based on Martin J. King's 2026
   author-origin transfer-matrix / branch-continuity / 3x3 acoustic-impedance
   method. The source documents explicitly identify physical construction and
   measurement as future work. This module therefore makes no hardware-
   validation, geometry, directivity, renderer, solid, or manufacturing claim.

   All transfer matrices, source-plane impedance columns, driver equation
   terms, units, and orientation conventions are caller supplied. Frequency is
   retained as metadata but is never used to invent geometry or missing driver
   terms. */
(function(factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else if(typeof globalThis!=='undefined')
    globalThis.MEH3CoupledNetwork=factory();
})(function(){
  'use strict';

  const MODULE_VERSION=1;
  const SOURCE_ORDER_DEFAULT=Object.freeze(['high','mid','low']);
  const FAILURE_CODES=deepFreeze({
    INVALID_INPUT:'THREEWAY_MATH_INVALID_INPUT',
    DIMENSION_MISMATCH:'THREEWAY_MATH_DIMENSION_MISMATCH',
    SINGULAR_SYSTEM:'THREEWAY_MATH_SINGULAR_SYSTEM',
    TRANSFER_INVALID:'THREEWAY_MATH_TRANSFER_INVALID',
    BRANCH_INVALID:'THREEWAY_MATH_BRANCH_INVALID',
    BRANCH_CONTINUITY_FAILED:'THREEWAY_MATH_BRANCH_CONTINUITY_FAILED',
    IMPEDANCE_MATRIX_INVALID:'THREEWAY_MATH_IMPEDANCE_MATRIX_INVALID',
    IMPEDANCE_COLUMNS_INVALID:'THREEWAY_MATH_IMPEDANCE_COLUMNS_INVALID',
    DRIVER_TERMS_INVALID:'THREEWAY_MATH_DRIVER_TERMS_INVALID',
    FREQUENCY_INVALID:'THREEWAY_MATH_FREQUENCY_INVALID',
    TRANSFER_PROVIDER_UNAVAILABLE:
      'THREEWAY_MATH_TRANSFER_PROVIDER_UNAVAILABLE',
    MOUTH_LOAD_PROVIDER_UNAVAILABLE:
      'THREEWAY_MATH_MOUTH_LOAD_PROVIDER_UNAVAILABLE'
  });
  const MODEL_METADATA=deepFreeze({
    id:'king-2026-three-driver-coupled-network',
    revision:'source-structure-v1',
    classification:'experimental-author-model',
    peerReviewed:false,
    hardwareValidated:false,
    manufacturing:false,
    unresolvedDependencies:[
      'horn-segment ABCD coefficient provider',
      'branch-volume/passage ABCD coefficient provider',
      'mouth radiation-load provider and noncircular-mouth mapping'
    ],
    sources:[
      {
        title:'Algorithm for Modeling a Three Driver MEH Speaker System',
        author:'Martin J. King',
        date:'2026-05-18',
        localFile:'MEH-Three-Drivers-Algorithm-2026-05-18.pdf',
        sha256:
          '471e543f8d862284ac4be8cabbb8e42139165d6808a429578eecfc107386aa5f'
      },
      {
        title:'Multi Entry Horn Modeling Methods',
        author:'Martin J. King',
        date:'2026-06-16',
        localFile:'MEH-Modeling-Methods-2026.pdf',
        sha256:
          'a1b8165be58fa3f68553ec8a8285ff566830b673a99ac428ed3a6527416349cf'
      },
      {
        title:'Passive Crossover Modeling Methods for a MEH Design',
        author:'Martin J. King',
        date:'2026-06-23',
        localFile:'MEH-Crossover-Design-2026.pdf',
        sha256:
          '317300b9bb3f4e018761c809876e00a90fef3c00043e50083424bc9baa518c6b'
      }
    ]
  });
  const EQUATIONS=deepFreeze({
    transfer:{
      id:'king-2026.transfer-state-up-pressure.v1',
      expression:'[U_i, p_i]^T = T_(i<-j) [U_j, p_j]^T',
      stateOrder:['volumeVelocity','pressure'],
      coefficientOrder:[
        ['A: volumeVelocity/volumeVelocity',
          'B: volumeVelocity/pressure'],
        ['C: pressure/volumeVelocity','D: pressure/pressure']
      ],
      status:'experimental-author-model'
    },
    branchPressure:{
      id:'king-2026.branch-pressure-continuity.v1',
      expression:'p_minus = p_plus = p_branch',
      status:'physical-conservation-with-caller-orientation'
    },
    branchVelocity:{
      id:'king-2026.branch-volume-velocity.v1',
      expression:
        's_minus U_minus + s_plus U_plus + s_branch U_branch = 0',
      documentedCanonicalExample:'U_plus = U_minus - U_branch',
      status:'physical-conservation-with-caller-supplied-signs'
    },
    acousticImpedance:{
      id:'king-2026.three-source-acoustic-impedance.v1',
      expression:'p_i = sum_j Z_(i,j) U_j',
      rowQuantity:'source-plane pressure',
      columnQuantity:'unit source volume-velocity excitation',
      status:'experimental-author-model'
    },
    coupledDriver:{
      id:'king-2026.three-source-driver-kvl.v1',
      expression:
        'drive_i = (Z_driver_i + Z_(i,i)) U_i + sum_(j!=i) Z_(i,j) U_j',
      status:'experimental-author-model',
      note:
        'Z_driver_i and drive_i are explicit caller-composed terms; this module does not derive driver, rear-load, DSP, or Thevenin values.'
    }
  });
  const CAPABILITIES=deepFreeze({
    status:'experimental-analysis-math-only',
    complexArithmetic:true,
    deterministicLinearSolve:true,
    transferMatrices:true,
    branchContinuity:true,
    acousticImpedanceMatrix:true,
    coupledThreeSourceSolve:true,
    hornSegmentAbcdProvider:false,
    branchAbcdProvider:false,
    mouthRadiationLoadProvider:false,
    geometryInference:false,
    driverParameterInference:false,
    hardwareValidation:false,
    manufacturingPlan:false,
    manufacturingSolids:false,
    manufacturingExport:false,
    stlExport:false,
    reason:
      'This is an unvalidated author-model math foundation with no exact solid or fabrication audit.'
  });
  const DEFAULT_PIVOT_ABS_TOLERANCE=1e-14;
  const DEFAULT_PIVOT_REL_TOLERANCE=1e-12;

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
    return value;
  }

  function cleanString(value){
    return typeof value==='string'&&value.trim()?value.trim():null;
  }

  function finiteNumber(value){
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }

  function positiveNumber(value){
    const number=finiteNumber(value);
    return number!==null&&number>0?number:null;
  }

  function rawComplex(value,imaginary){
    if(arguments.length>1){
      const re=finiteNumber(value),im=finiteNumber(imaginary);
      return re===null||im===null?null:{re,im};
    }
    if(typeof value==='number'){
      const re=finiteNumber(value);
      return re===null?null:{re,im:0};
    }
    if(isObject(value)){
      const re=finiteNumber(value.re),im=finiteNumber(value.im);
      return re===null||im===null?null:{re,im};
    }
    return null;
  }

  function publicComplex(value){
    const parsed=rawComplex(value);
    return parsed?Object.freeze(parsed):null;
  }

  function complex(real,imaginary){
    return publicComplex(rawComplex(real,imaginary===undefined?0:imaginary));
  }

  function cAdd(left,right){
    return {re:left.re+right.re,im:left.im+right.im};
  }

  function cSub(left,right){
    return {re:left.re-right.re,im:left.im-right.im};
  }

  function cNeg(value){
    return {re:-value.re,im:-value.im};
  }

  function cMul(left,right){
    return {
      re:left.re*right.re-left.im*right.im,
      im:left.re*right.im+left.im*right.re
    };
  }

  function cDiv(left,right){
    const denominator=right.re*right.re+right.im*right.im;
    if(!(denominator>0)||!Number.isFinite(denominator))return null;
    return {
      re:(left.re*right.re+left.im*right.im)/denominator,
      im:(left.im*right.re-left.re*right.im)/denominator
    };
  }

  function cAbsSquared(value){
    return value.re*value.re+value.im*value.im;
  }

  function cAbs(value){
    return Math.hypot(value.re,value.im);
  }

  function cScale(value,scalar){
    return {re:value.re*scalar,im:value.im*scalar};
  }

  function complexBinary(operation,left,right){
    const parsedLeft=rawComplex(left),parsedRight=rawComplex(right);
    if(!parsedLeft||!parsedRight)return null;
    const value=operation(parsedLeft,parsedRight);
    return value?Object.freeze(value):null;
  }

  function complexAdd(left,right){
    return complexBinary(cAdd,left,right);
  }

  function complexSubtract(left,right){
    return complexBinary(cSub,left,right);
  }

  function complexMultiply(left,right){
    return complexBinary(cMul,left,right);
  }

  function complexDivide(left,right){
    return complexBinary(cDiv,left,right);
  }

  function complexNegate(value){
    const parsed=rawComplex(value);
    return parsed?Object.freeze(cNeg(parsed)):null;
  }

  function complexConjugate(value){
    const parsed=rawComplex(value);
    return parsed?Object.freeze({re:parsed.re,im:-parsed.im}):null;
  }

  function complexMagnitude(value){
    const parsed=rawComplex(value);
    return parsed?cAbs(parsed):null;
  }

  function complexPhaseRad(value){
    const parsed=rawComplex(value);
    return parsed?Math.atan2(parsed.im,parsed.re):null;
  }

  function complexScale(value,scalar){
    const parsed=rawComplex(value),factor=finiteNumber(scalar);
    return parsed&&factor!==null?Object.freeze(cScale(parsed,factor)):null;
  }

  function fail(code,message,details){
    return deepFreeze({
      ok:false,
      code,
      message,
      details:isObject(details)?cloneValue(details):{},
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function parseVector(value,expectedLength){
    if(!Array.isArray(value)||
        (expectedLength!==undefined&&value.length!==expectedLength))
      return null;
    const result=[];
    for(const item of value){
      const parsed=rawComplex(item);
      if(!parsed)return null;
      result.push(parsed);
    }
    return result;
  }

  function parseMatrix(value,rows,columns){
    if(!Array.isArray(value)||
        (rows!==undefined&&value.length!==rows))return null;
    const result=[];
    for(const row of value){
      if(!Array.isArray(row)||
          (columns!==undefined&&row.length!==columns))return null;
      const parsedRow=parseVector(row);
      if(!parsedRow)return null;
      result.push(parsedRow);
    }
    return result;
  }

  function freezeVector(vector){
    return deepFreeze(vector.map(value=>({re:value.re,im:value.im})));
  }

  function freezeMatrix(matrix){
    return deepFreeze(matrix.map(row=>
      row.map(value=>({re:value.re,im:value.im}))
    ));
  }

  function matrixVectorProductRaw(matrix,vector){
    return matrix.map(row=>{
      let sum={re:0,im:0};
      for(let index=0;index<row.length;index++)
        sum=cAdd(sum,cMul(row[index],vector[index]));
      return sum;
    });
  }

  function matrixProductRaw(left,right){
    const rows=left.length,columns=right[0].length,
      shared=right.length,
      result=Array.from({length:rows},()=>Array(columns));
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
      let sum={re:0,im:0};
      for(let index=0;index<shared;index++)
        sum=cAdd(sum,cMul(left[row][index],right[index][column]));
      result[row][column]=sum;
    }
    return result;
  }

  function vectorNorm2(vector){
    return Math.sqrt(vector.reduce(
      (sum,value)=>sum+cAbsSquared(value),0
    ));
  }

  function matrixFrobeniusNorm(matrix){
    let sum=0;
    for(const row of matrix)for(const value of row)sum+=cAbsSquared(value);
    return Math.sqrt(sum);
  }

  function residualReport(matrix,solution,rhs){
    const product=matrixVectorProductRaw(matrix,solution),
      vector=product.map((value,index)=>cSub(value,rhs[index])),
      l2Norm=vectorNorm2(vector),
      rhsL2Norm=vectorNorm2(rhs),
      matrixNorm=matrixFrobeniusNorm(matrix),
      solutionL2Norm=vectorNorm2(solution),
      backwardDenominator=matrixNorm*solutionL2Norm+rhsL2Norm;
    return deepFreeze({
      vector:freezeVector(vector),
      maxAbs:vector.reduce(
        (maximum,value)=>Math.max(maximum,cAbs(value)),0
      ),
      l2Norm,
      rhsL2Norm,
      relativeToRhs:rhsL2Norm>0?l2Norm/rhsL2Norm:l2Norm,
      backwardRelative:backwardDenominator>0
        ?l2Norm/backwardDenominator:l2Norm
    });
  }

  function solveComplexLinearSystem(matrix,rhs,options){
    if(!Array.isArray(matrix)||!matrix.length||!Array.isArray(rhs))
      return fail(
        FAILURE_CODES.INVALID_INPUT,
        'A nonempty square complex matrix and matching right-hand vector are required.'
      );
    const size=matrix.length;
    if(rhs.length!==size||matrix.some(
      row=>!Array.isArray(row)||row.length!==size
    ))return fail(
      FAILURE_CODES.DIMENSION_MISMATCH,
      'The complex linear system must be square and match the right-hand vector.',
      {matrixRows:size,rhsLength:rhs.length}
    );
    const parsedMatrix=parseMatrix(matrix,size,size),
      parsedRhs=parseVector(rhs,size);
    if(!parsedMatrix||!parsedRhs)return fail(
      FAILURE_CODES.INVALID_INPUT,
      'Every matrix and right-hand value must be a finite complex number.'
    );
    const absoluteInput=options&&options.pivotAbsTolerance,
      relativeInput=options&&options.pivotRelTolerance,
      absoluteTolerance=absoluteInput===undefined
        ?DEFAULT_PIVOT_ABS_TOLERANCE:finiteNumber(absoluteInput),
      relativeTolerance=relativeInput===undefined
        ?DEFAULT_PIVOT_REL_TOLERANCE:finiteNumber(relativeInput);
    if(absoluteTolerance===null||absoluteTolerance<0||
        relativeTolerance===null||relativeTolerance<0)return fail(
      FAILURE_CODES.INVALID_INPUT,
      'Pivot tolerances must be finite nonnegative values.'
    );
    const originalMatrix=parsedMatrix.map(row=>row.map(value=>({...value}))),
      originalRhs=parsedRhs.map(value=>({...value})),
      work=parsedMatrix.map(row=>row.map(value=>({...value}))),
      workRhs=parsedRhs.map(value=>({...value})),
      scale=Math.max(...work.flat().map(cAbs)),
      pivotThreshold=Math.max(
        absoluteTolerance,relativeTolerance*scale
      ),
      rowPermutation=Array.from({length:size},(_,index)=>index),
      selectedPivotRows=[],
      pivotMagnitudes=[];
    let swapCount=0;
    for(let column=0;column<size;column++){
      let selected=column,
        selectedMagnitude=cAbs(work[column][column]);
      for(let row=column+1;row<size;row++){
        const magnitude=cAbs(work[row][column]);
        /* Strict comparison makes equal-magnitude ties deterministic: the
           lowest current row wins. */
        if(magnitude>selectedMagnitude){
          selected=row;
          selectedMagnitude=magnitude;
        }
      }
      if(!(selectedMagnitude>pivotThreshold))return fail(
        FAILURE_CODES.SINGULAR_SYSTEM,
        'Complex partial pivot fell at or below the singularity threshold.',
        {
          rank:column,
          column,
          pivotMagnitude:selectedMagnitude,
          pivotThreshold,
          selectedPivotRows,
          rowPermutation
        }
      );
      selectedPivotRows.push(rowPermutation[selected]);
      pivotMagnitudes.push(selectedMagnitude);
      if(selected!==column){
        [work[column],work[selected]]=[work[selected],work[column]];
        [workRhs[column],workRhs[selected]]=[
          workRhs[selected],workRhs[column]
        ];
        [rowPermutation[column],rowPermutation[selected]]=[
          rowPermutation[selected],rowPermutation[column]
        ];
        swapCount++;
      }
      for(let row=column+1;row<size;row++){
        const factor=cDiv(work[row][column],work[column][column]);
        if(!factor)return fail(
          FAILURE_CODES.SINGULAR_SYSTEM,
          'Complex elimination encountered a zero pivot.',
          {rank:column,column,pivotThreshold}
        );
        work[row][column]={re:0,im:0};
        for(let inner=column+1;inner<size;inner++)
          work[row][inner]=cSub(
            work[row][inner],cMul(factor,work[column][inner])
          );
        workRhs[row]=cSub(
          workRhs[row],cMul(factor,workRhs[column])
        );
      }
    }
    const solution=Array(size);
    for(let row=size-1;row>=0;row--){
      let remainder={...workRhs[row]};
      for(let column=row+1;column<size;column++)
        remainder=cSub(
          remainder,cMul(work[row][column],solution[column])
        );
      const value=cDiv(remainder,work[row][row]);
      if(!value)return fail(
        FAILURE_CODES.SINGULAR_SYSTEM,
        'Complex back substitution encountered a zero pivot.',
        {rank:row,row,pivotThreshold}
      );
      solution[row]=value;
    }
    return deepFreeze({
      ok:true,
      code:null,
      solution:freezeVector(solution),
      residual:residualReport(originalMatrix,solution,originalRhs),
      pivotReport:{
        method:'deterministic-complex-partial-pivot',
        absoluteTolerance,
        relativeTolerance,
        pivotThreshold,
        selectedPivotRows,
        rowPermutation,
        pivotMagnitudes,
        swapCount,
        rank:size
      },
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function matrixMetadataValid(metadata){
    return isObject(metadata)&&
      Array.isArray(metadata.stateOrder)&&
      metadata.stateOrder.length===2&&
      metadata.stateOrder[0]==='volumeVelocity'&&
      metadata.stateOrder[1]==='pressure'&&
      isObject(metadata.units)&&
      !!cleanString(metadata.units.volumeVelocity)&&
      !!cleanString(metadata.units.pressure)&&
      isObject(metadata.coefficientUnits)&&
      !!cleanString(metadata.coefficientUnits.A)&&
      !!cleanString(metadata.coefficientUnits.B)&&
      !!cleanString(metadata.coefficientUnits.C)&&
      !!cleanString(metadata.coefficientUnits.D)&&
      isObject(metadata.orientation)&&
      !!cleanString(metadata.orientation.positiveVolumeVelocity)&&
      !!cleanString(metadata.toPort)&&!!cleanString(metadata.fromPort);
  }

  function acceptTransferMatrix(input){
    const record=isObject(input)?input:{},
      matrix=parseMatrix(record.matrix,2,2),
      metadata=isObject(record.metadata)?cloneValue(record.metadata):{};
    if(!matrix||!matrixMetadataValid(metadata))return fail(
      FAILURE_CODES.TRANSFER_INVALID,
      'A transfer requires a finite 2x2 matrix and explicit [U,p], coefficient units, ports, and positive-volume-velocity orientation.'
    );
    return deepFreeze({
      ok:true,
      code:null,
      transfer:{
        matrix:freezeMatrix(matrix),
        metadata:deepFreeze(metadata)
      },
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function compatibleTransferMetadata(left,right){
    return left.units.volumeVelocity===right.units.volumeVelocity&&
      left.units.pressure===right.units.pressure&&
      left.coefficientUnits.A===right.coefficientUnits.A&&
      left.coefficientUnits.B===right.coefficientUnits.B&&
      left.coefficientUnits.C===right.coefficientUnits.C&&
      left.coefficientUnits.D===right.coefficientUnits.D&&
      left.orientation.positiveVolumeVelocity===
        right.orientation.positiveVolumeVelocity&&
      left.fromPort===right.toPort;
  }

  function cascadeTransferMatrices(transfers){
    if(!Array.isArray(transfers)||!transfers.length)return fail(
      FAILURE_CODES.TRANSFER_INVALID,
      'At least one explicit transfer matrix is required.'
    );
    const accepted=[];
    for(let index=0;index<transfers.length;index++){
      const result=acceptTransferMatrix(transfers[index]);
      if(!result.ok)return fail(
        FAILURE_CODES.TRANSFER_INVALID,
        'Invalid transfer at cascade index '+index+'.',
        {index,cause:result.message}
      );
      accepted.push(result.transfer);
    }
    for(let index=0;index<accepted.length-1;index++)
      if(!compatibleTransferMetadata(
        accepted[index].metadata,accepted[index+1].metadata
      ))return fail(
        FAILURE_CODES.TRANSFER_INVALID,
        'Adjacent transfer ports, units, and volume-velocity orientation must match.',
        {leftIndex:index,rightIndex:index+1}
      );
    let matrix=accepted[0].matrix.map(row=>row.map(value=>({...value})));
    for(let index=1;index<accepted.length;index++)
      matrix=matrixProductRaw(matrix,accepted[index].matrix);
    const first=accepted[0].metadata,
      last=accepted[accepted.length-1].metadata,
      metadata={
        stateOrder:['volumeVelocity','pressure'],
        units:cloneValue(first.units),
        coefficientUnits:cloneValue(first.coefficientUnits),
        orientation:cloneValue(first.orientation),
        toPort:first.toPort,
        fromPort:last.fromPort,
        segments:accepted.map(item=>cloneValue(item.metadata))
      };
    return deepFreeze({
      ok:true,
      code:null,
      transfer:{
        matrix:freezeMatrix(matrix),
        metadata:deepFreeze(metadata)
      },
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function applyTransferMatrix(transferInput,state){
    const accepted=acceptTransferMatrix(transferInput);
    if(!accepted.ok)return accepted;
    const parsedState=parseVector(state,2);
    if(!parsedState)return fail(
      FAILURE_CODES.TRANSFER_INVALID,
      'Transfer state must be [volumeVelocity, pressure] with finite complex values.'
    );
    const output=matrixVectorProductRaw(
      accepted.transfer.matrix,parsedState
    );
    return deepFreeze({
      ok:true,
      code:null,
      state:freezeVector(output),
      metadata:{
        stateOrder:['volumeVelocity','pressure'],
        units:cloneValue(accepted.transfer.metadata.units),
        coefficientUnits:cloneValue(
          accepted.transfer.metadata.coefficientUnits
        ),
        orientation:cloneValue(
          accepted.transfer.metadata.orientation
        ),
        atPort:accepted.transfer.metadata.toPort,
        fromPort:accepted.transfer.metadata.fromPort
      },
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function branchMetadata(input){
    const metadata=isObject(input)?cloneValue(input):{},
      signs=metadata.orientation&&
        metadata.orientation.volumeVelocitySigns;
    if(!isObject(metadata.units)||
        !cleanString(metadata.units.volumeVelocity)||
        !cleanString(metadata.units.pressure)||
        !isObject(metadata.orientation)||
        !isObject(signs))return null;
    const minus=finiteNumber(signs.minus),
      plus=finiteNumber(signs.plus),
      branch=finiteNumber(signs.branch);
    if(minus===null||plus===null||branch===null||plus===0)return null;
    metadata.orientation.volumeVelocitySigns={minus,plus,branch};
    return metadata;
  }

  function branchResiduals(states,metadata){
    const minus=states.minus,plus=states.plus,branch=states.branch,
      signs=metadata.orientation.volumeVelocitySigns;
    return {
      pressureMinusPlus:cSub(minus[1],plus[1]),
      pressureMinusBranch:cSub(minus[1],branch[1]),
      signedVolumeVelocity:cAdd(
        cAdd(cScale(minus[0],signs.minus),cScale(plus[0],signs.plus)),
        cScale(branch[0],signs.branch)
      )
    };
  }

  function checkBranchContinuity(input,options){
    const record=isObject(input)?input:{},
      metadata=branchMetadata(record.metadata),
      states=isObject(record.states)?{
        minus:parseVector(record.states.minus,2),
        plus:parseVector(record.states.plus,2),
        branch:parseVector(record.states.branch,2)
      }:null,
      pressureTolerance=options&&
          options.pressureAbsTolerance!==undefined
        ?finiteNumber(options.pressureAbsTolerance):1e-9,
      velocityTolerance=options&&
          options.volumeVelocityAbsTolerance!==undefined
        ?finiteNumber(options.volumeVelocityAbsTolerance):1e-12;
    if(!metadata||!states||!states.minus||!states.plus||!states.branch||
        pressureTolerance===null||pressureTolerance<0||
        velocityTolerance===null||velocityTolerance<0)return fail(
      FAILURE_CODES.BRANCH_INVALID,
      'Branch continuity requires three [U,p] states, units, explicit signed velocity orientation, and nonnegative tolerances.'
    );
    const residuals=branchResiduals(states,metadata),
      magnitudes={
        pressureMinusPlus:cAbs(residuals.pressureMinusPlus),
        pressureMinusBranch:cAbs(residuals.pressureMinusBranch),
        signedVolumeVelocity:cAbs(residuals.signedVolumeVelocity)
      },
      continuous=magnitudes.pressureMinusPlus<=pressureTolerance&&
        magnitudes.pressureMinusBranch<=pressureTolerance&&
        magnitudes.signedVolumeVelocity<=velocityTolerance;
    return deepFreeze({
      ok:continuous,
      code:continuous?null:FAILURE_CODES.BRANCH_CONTINUITY_FAILED,
      message:continuous
        ?'Pressure and signed volume velocity satisfy the declared branch orientation.'
        :'Branch pressure continuity or signed volume-velocity conservation failed.',
      states:{
        minus:freezeVector(states.minus),
        plus:freezeVector(states.plus),
        branch:freezeVector(states.branch)
      },
      residuals:{
        pressureMinusPlus:Object.freeze(residuals.pressureMinusPlus),
        pressureMinusBranch:Object.freeze(residuals.pressureMinusBranch),
        signedVolumeVelocity:Object.freeze(
          residuals.signedVolumeVelocity
        ),
        magnitudes
      },
      tolerances:{
        pressureAbsTolerance:pressureTolerance,
        volumeVelocityAbsTolerance:velocityTolerance
      },
      metadata:deepFreeze(metadata),
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function splitBranchState(input,options){
    const record=isObject(input)?input:{},
      metadata=branchMetadata(record.metadata),
      minus=parseVector(record.minusState,2),
      branchVolumeVelocity=rawComplex(record.branchVolumeVelocity);
    if(!metadata||!minus||!branchVolumeVelocity)return fail(
      FAILURE_CODES.BRANCH_INVALID,
      'Branch split requires an incoming [U,p], branch volume velocity, units, and explicit signed orientation.'
    );
    const signs=metadata.orientation.volumeVelocitySigns,
      numerator=cAdd(
        cScale(minus[0],signs.minus),
        cScale(branchVolumeVelocity,signs.branch)
      ),
      plusVelocity=cScale(numerator,-1/signs.plus),
      states={
        minus,
        plus:[plusVelocity,{...minus[1]}],
        branch:[branchVolumeVelocity,{...minus[1]}]
      };
    return checkBranchContinuity({states,metadata},options);
  }

  function sourceOrder(value){
    if(!Array.isArray(value)||value.length!==3)return null;
    const result=value.map(cleanString);
    return result.every((id,index)=>id===SOURCE_ORDER_DEFAULT[index])
      ?result:null;
  }

  function acousticMetadata(input){
    const units=isObject(input&&input.units)?cloneValue(input.units):{},
      orientation=isObject(input&&input.orientation)
        ?cloneValue(input.orientation):{};
    if(!cleanString(units.pressure)||
        !cleanString(units.volumeVelocity)||
        !cleanString(units.acousticImpedance)||
        !cleanString(orientation.pressure)||
        !cleanString(orientation.volumeVelocity))return null;
    return {units,orientation};
  }

  function acousticSymmetryReport(matrix){
    let maximum=0,sum=0,count=0;
    const residualMatrix=Array.from({length:3},()=>Array(3));
    for(let row=0;row<3;row++)for(let column=0;column<3;column++){
      const residual=cSub(matrix[row][column],matrix[column][row]),
        magnitude=cAbs(residual);
      residualMatrix[row][column]=residual;
      maximum=Math.max(maximum,magnitude);
      sum+=magnitude*magnitude;
      count++;
    }
    return deepFreeze({
      residualMatrix:freezeMatrix(residualMatrix),
      maxAbs:maximum,
      l2Norm:Math.sqrt(sum),
      sampleCount:count,
      enforced:false
    });
  }

  function acceptAcousticImpedanceMatrix(input){
    const record=isObject(input)?input:{},
      order=sourceOrder(record.sourceOrder),
      matrix=parseMatrix(record.matrix,3,3),
      metadata=acousticMetadata(record);
    if(!order||!matrix||!metadata)return fail(
      FAILURE_CODES.IMPEDANCE_MATRIX_INVALID,
      'A 3x3 complex impedance matrix requires canonical [high, mid, low] indexing plus explicit pressure, volume-velocity, impedance units and orientation.'
    );
    return deepFreeze({
      ok:true,
      code:null,
      sourceOrder:order.slice(),
      matrix:freezeMatrix(matrix),
      units:deepFreeze(metadata.units),
      orientation:deepFreeze(metadata.orientation),
      provenance:deepFreeze(
        isObject(record.provenance)?cloneValue(record.provenance):{}
      ),
      symmetry:acousticSymmetryReport(matrix),
      matrixConvention:{
        row:'pressure at sourceOrder[row]',
        column:'volume velocity of sourceOrder[column]',
        equation:'p = Z U'
      },
      validationStatus:'experimental-author-model-not-hardware-validated',
      manufacturing:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function approximatelyUnitBasis(vector,index,tolerance){
    for(let row=0;row<vector.length;row++){
      const expected={re:row===index?1:0,im:0};
      if(cAbs(cSub(vector[row],expected))>tolerance)return false;
    }
    return true;
  }

  function constructAcousticImpedanceMatrixFromUnitExcitations(input){
    const record=isObject(input)?input:{},
      order=sourceOrder(record.sourceOrder),
      metadata=acousticMetadata(record),
      supplied=Array.isArray(record.columns)?record.columns:[],
      tolerance=record.unitTolerance===undefined
        ?1e-12:finiteNumber(record.unitTolerance);
    if(!order||!metadata||supplied.length!==3||tolerance===null||
        tolerance<0)return fail(
      FAILURE_CODES.IMPEDANCE_COLUMNS_INVALID,
      'Exactly three [high, mid, low] unit-source excitation columns with explicit units and orientation are required.'
    );
    const bySource=new Map();
    for(const column of supplied){
      const id=cleanString(column&&column.sourceId);
      if(!id||bySource.has(id))return fail(
        FAILURE_CODES.IMPEDANCE_COLUMNS_INVALID,
        'Unit-source excitation column IDs must be unique and explicit.',
        {sourceId:id}
      );
      bySource.set(id,column);
    }
    const matrix=Array.from({length:3},()=>Array(3)),
      normalizedColumns=[];
    for(let columnIndex=0;columnIndex<3;columnIndex++){
      const id=order[columnIndex],
        column=bySource.get(id),
        velocities=column&&parseVector(column.volumeVelocities,3),
        pressures=column&&parseVector(column.pressures,3);
      if(!column||!velocities||!pressures||
          !approximatelyUnitBasis(velocities,columnIndex,tolerance))
        return fail(
          FAILURE_CODES.IMPEDANCE_COLUMNS_INVALID,
          'Column '+id+' must drive its own source at 1 + j0 and hold the other two source velocities at zero.',
          {sourceId:id,columnIndex}
        );
      const drivenVelocity=velocities[columnIndex];
      for(let row=0;row<3;row++){
        const impedance=cDiv(pressures[row],drivenVelocity);
        if(!impedance)return fail(
          FAILURE_CODES.IMPEDANCE_COLUMNS_INVALID,
          'The driven unit volume velocity cannot be zero.',
          {sourceId:id,columnIndex}
        );
        matrix[row][columnIndex]=impedance;
      }
      normalizedColumns.push({
        sourceId:id,
        volumeVelocities:freezeVector(velocities),
        pressures:freezeVector(pressures),
        metadata:deepFreeze(
          isObject(column.metadata)?cloneValue(column.metadata):{}
        )
      });
    }
    const accepted=acceptAcousticImpedanceMatrix({
      sourceOrder:order,
      matrix,
      units:metadata.units,
      orientation:metadata.orientation,
      provenance:isObject(record.provenance)
        ?record.provenance:{}
    });
    if(!accepted.ok)return accepted;
    return deepFreeze({
      ...accepted,
      construction:{
        method:'three-unit-source-excitation-columns',
        columns:normalizedColumns,
        unitTolerance:tolerance,
        otherSourceBoundary:'volume velocity held at zero'
      }
    });
  }

  function driverTerm(input,index,impedanceRecord){
    const record=isObject(input)?input:{},
      sourceId=cleanString(record.sourceId),
      drivePressure=rawComplex(record.drivePressure),
      terms=Array.isArray(record.selfImpedanceTerms)
        ?record.selfImpedanceTerms:null,
      units=isObject(record.units)?cloneValue(record.units):{};
    if(!sourceId||!drivePressure||!terms||!terms.length||
        cleanString(units.drivePressure)!==
          impedanceRecord.units.pressure||
        cleanString(units.selfImpedance)!==
          impedanceRecord.units.acousticImpedance)return null;
    let self={re:0,im:0};
    const normalizedTerms=[];
    for(let termIndex=0;termIndex<terms.length;termIndex++){
      const term=isObject(terms[termIndex])?terms[termIndex]:{},
        id=cleanString(term.id),
        value=rawComplex(term.value);
      if(!id||!value)return null;
      self=cAdd(self,value);
      normalizedTerms.push({
        id,
        value:Object.freeze(value),
        metadata:deepFreeze(
          isObject(term.metadata)?cloneValue(term.metadata):{}
        )
      });
    }
    return {
      sourceId,
      drivePressure,
      selfImpedance:self,
      selfImpedanceTerms:normalizedTerms,
      units,
      metadata:deepFreeze(
        isObject(record.metadata)?cloneValue(record.metadata):{}
      ),
      inputIndex:index
    };
  }

  function solveCoupledThreeSourceAtFrequency(input,options){
    const record=isObject(input)?input:{},
      frequencyHz=positiveNumber(record.frequencyHz);
    if(frequencyHz===null)return fail(
      FAILURE_CODES.FREQUENCY_INVALID,
      'A positive explicit frequency in hertz is required.'
    );
    const impedance=acceptAcousticImpedanceMatrix(
      record.acousticImpedance
    );
    if(!impedance.ok)return impedance;
    const supplied=Array.isArray(record.drivers)?record.drivers:[],
      parsed=supplied.map((item,index)=>
        driverTerm(item,index,impedance)
      );
    if(parsed.length!==3||parsed.some(item=>!item))
      return fail(
        FAILURE_CODES.DRIVER_TERMS_INVALID,
        'Exactly three drivers require explicit drive pressure, one or more self-impedance terms, and matching units.'
      );
    const bySource=new Map();
    for(const driver of parsed){
      if(bySource.has(driver.sourceId))return fail(
        FAILURE_CODES.DRIVER_TERMS_INVALID,
        'Driver source IDs must be unique.',
        {sourceId:driver.sourceId}
      );
      bySource.set(driver.sourceId,driver);
    }
    if(impedance.sourceOrder.some(id=>!bySource.has(id))||
        parsed.some(item=>!impedance.sourceOrder.includes(item.sourceId)))
      return fail(
        FAILURE_CODES.DRIVER_TERMS_INVALID,
        'Driver IDs must match the acoustic impedance source order exactly.',
        {
          sourceOrder:impedance.sourceOrder,
          driverIds:parsed.map(item=>item.sourceId)
        }
      );
    const ordered=impedance.sourceOrder.map(id=>bySource.get(id)),
      systemMatrix=impedance.matrix.map(row=>
        row.map(value=>({...value}))
      ),
      rhs=ordered.map(item=>({...item.drivePressure}));
    for(let index=0;index<3;index++)
      systemMatrix[index][index]=cAdd(
        systemMatrix[index][index],ordered[index].selfImpedance
      );
    const linear=solveComplexLinearSystem(systemMatrix,rhs,options);
    if(!linear.ok)return linear;
    const velocities=linear.solution.map(value=>({...value})),
      acousticPressures=matrixVectorProductRaw(
        impedance.matrix,velocities
      ),
      bySourceResult={};
    for(let index=0;index<3;index++){
      const driver=ordered[index];
      bySourceResult[driver.sourceId]={
        volumeVelocity:velocities[index],
        acousticPressure:acousticPressures[index],
        drivePressure:driver.drivePressure,
        driverSelfImpedance:driver.selfImpedance,
        selfImpedanceTerms:driver.selfImpedanceTerms
      };
    }
    return deepFreeze({
      ok:true,
      code:null,
      frequencyHz,
      sourceOrder:impedance.sourceOrder.slice(),
      volumeVelocities:freezeVector(velocities),
      acousticPressures:freezeVector(acousticPressures),
      bySource:bySourceResult,
      system:{
        equation:
          'drive = (Z_acoustic + diag(Z_driver_self)) volumeVelocity',
        matrix:freezeMatrix(systemMatrix),
        rhs:freezeVector(rhs),
        residual:linear.residual,
        pivotReport:linear.pivotReport
      },
      acousticImpedance:impedance,
      units:{
        frequency:'Hz',
        drivePressure:impedance.units.pressure,
        acousticPressure:impedance.units.pressure,
        volumeVelocity:impedance.units.volumeVelocity,
        impedance:impedance.units.acousticImpedance
      },
      orientation:impedance.orientation,
      provenance:deepFreeze(
        isObject(record.provenance)?cloneValue(record.provenance):{}
      ),
      validationStatus:'experimental-author-model-not-hardware-validated',
      manufacturing:false,
      model:MODEL_METADATA,
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
      manufacturing:false,
      stl:false,
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
  }

  function sourceDependencyPreflight(dependency){
    const requested=cleanString(dependency);
    if(requested==='mouth-radiation-load')return deepFreeze({
      ok:false,
      available:false,
      dependency:requested,
      code:FAILURE_CODES.MOUTH_LOAD_PROVIDER_UNAVAILABLE,
      reason:
        'The audited King 2026 source set does not supply a mouth-radiation equation or square/rectangular-to-piston mapping.',
      model:MODEL_METADATA,
      capabilities:CAPABILITIES
    });
    if(requested==='horn-segment-abcd'||requested==='branch-abcd')
      return deepFreeze({
        ok:false,
        available:false,
        dependency:requested,
        code:FAILURE_CODES.TRANSFER_PROVIDER_UNAVAILABLE,
        reason:
          'The audited King 2026 source set specifies transfer-network assembly but does not supply this ABCD coefficient provider.',
        model:MODEL_METADATA,
        capabilities:CAPABILITIES
      });
    return fail(
      FAILURE_CODES.INVALID_INPUT,
      'Unknown source dependency. Expected horn-segment-abcd, branch-abcd, or mouth-radiation-load.',
      {dependency:requested}
    );
  }

  return deepFreeze({
    version:MODULE_VERSION,
    sourceOrderDefault:SOURCE_ORDER_DEFAULT,
    failureCodes:FAILURE_CODES,
    modelMetadata:MODEL_METADATA,
    equations:EQUATIONS,
    capabilities:CAPABILITIES,
    complex,
    complexAdd,
    complexSubtract,
    complexMultiply,
    complexDivide,
    complexNegate,
    complexConjugate,
    complexMagnitude,
    complexPhaseRad,
    complexScale,
    solveComplexLinearSystem,
    acceptTransferMatrix,
    cascadeTransferMatrices,
    applyTransferMatrix,
    checkBranchContinuity,
    splitBranchState,
    acceptAcousticImpedanceMatrix,
    constructAcousticImpedanceMatrixFromUnitExcitations,
    solveCoupledThreeSourceAtFrequency,
    sourceDependencyPreflight,
    manufacturingPreflight
  });
});
