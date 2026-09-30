# Earcut

`earcut.cjs` is the unmodified CommonJS source of Mapbox Earcut 2.2.4 from
https://github.com/mapbox/earcut/blob/v2.2.4/src/earcut.js.

The ISC license is retained in `earcut-LICENSE.txt` and embedded in the offline
editor together with this source. The embedding wrapper supplies a private
CommonJS module and exposes `MEHEarcut`; it does not fetch scripts at runtime.

Earcut triangulates the plate faces around the central opening and bolt holes.
The mounting generator additionally checks input clearances, triangle area,
closed oriented topology and volume; triangulation alone is not a solid check.
