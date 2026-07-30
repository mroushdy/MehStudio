const EPSILON = 1e-9;

function assertion(name, value, operator, limit, pass, units = "normalized") {
  return { name, value, operator, limit, units, pass: Boolean(pass) };
}

function minimum(values, fallback = Infinity) {
  return values.length ? Math.min(...values) : fallback;
}

export function evaluateRenderDescriptor(descriptor, contract) {
  const limits = contract.limits || {};
  const drivers = descriptor.drivers || [];
  const expectedDrivers = descriptor.driverCount ?? drivers.length;
  const expectedTaps = descriptor.expectedTapCount ?? 0;
  const pairClearances = descriptor.pairClearances || [];
  const proportionsValid = drivers.every((driver) =>
    driver.frameDiameter > driver.gasketOuterDiameter &&
    driver.gasketOuterDiameter > driver.gasketInnerDiameter &&
    driver.gasketInnerDiameter > driver.activeDiameter &&
    driver.bodyLocalRadialDiameter + EPSILON >= driver.frameDiameter
  );
  const bodyClearance = minimum(
    drivers.map((driver) => driver.bodyMinimumWallClearance),
    0
  );
  const pairClearance = minimum(
    pairClearances.map((pair) => pair.frameClearance),
    Infinity
  );
  const assertions = [
    assertion("mount lands present", descriptor.mountLandCount, "==", expectedDrivers,
      descriptor.mountLandCount === expectedDrivers, "count"),
    assertion("gaskets present", descriptor.gasketCount, "==", expectedDrivers,
      descriptor.gasketCount === expectedDrivers, "count"),
    assertion("driver bodies present", descriptor.driverBodyCount, "==", expectedDrivers,
      descriptor.driverBodyCount === expectedDrivers, "count"),
    assertion("tap interfaces present", descriptor.tapInterfaceCount, "==", expectedTaps,
      descriptor.tapInterfaceCount === expectedTaps, "count"),
    assertion("frame > gasket OD > gasket ID > active cone",
      proportionsValid, "==", true, proportionsValid, "boolean"),
    assertion("minimum body-to-wall clearance", bodyClearance, ">=",
      limits.minimumBodyWallClearance,
      bodyClearance >= limits.minimumBodyWallClearance, "m"),
    assertion("minimum pair frame clearance", pairClearance, ">=",
      limits.minimumPairFrameClearance,
      pairClearance >= limits.minimumPairFrameClearance, "m"),
    assertion("renderer seals continuous", descriptor.invariants?.sealsContinuous,
      "==", true, descriptor.invariants?.sealsContinuous === true, "boolean"),
    assertion("renderer drivers behind wall", descriptor.invariants?.driversBehindWall,
      "==", true, descriptor.invariants?.driversBehindWall === true, "boolean"),
    assertion("renderer reports no overlap", descriptor.invariants?.noDriverOverlap,
      "==", true, descriptor.invariants?.noDriverOverlap === true, "boolean")
  ];
  return {
    pass: assertions.every((item) => item.pass),
    assertions,
    metrics: {
      family: descriptor.family,
      shape: descriptor.shape,
      mountMode: descriptor.mountMode,
      expectedDrivers,
      expectedTaps,
      bodyClearance,
      pairClearance
    }
  };
}
