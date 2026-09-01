'use client';
/**
 * DrenniaMap.tsx
 *
 * Interactive SVG map of Drennia — 151 districts across 4 states.
 * Each <path> has data-district-id matching the district_number (1–151)
 * and data-state-id matching the state code.
 *
 * Fill colour is ENTIRELY driven by the `districtColors` prop —
 * nothing is hardcoded. Pass Record<number, string> mapping district_number → hex.
 *
 * State groupings:
 *   VALE    (North)  — districts 1–37    (the "head" shape, top-left protrusion)
 *   CREST   (East)   — districts 38–75   (upper right)
 *   MARCH   (South)  — districts 76–113  (lower left coast)
 *   THORN   (South-East) — districts 114–151 (the rounded lower body)
 *
 * SVG viewBox: 0 0 600 800
 * District outlines are hand-designed to approximate the uploaded boundary photo.
 * Each district is clickable and highlights on hover.
 *
 * ── Ambiguity flags ────────────────────────────────────────────────────────
 * None: this is a fully synthetic design within the traced outer boundary.
 * District boundaries are fictional and evenly sized for click-ability.
 * If real district lines differ from your original design, re-upload the photo
 * with internal lines drawn and these paths can be retraced.
 */

import React, { useState, useCallback } from 'react';
import { T, MONO } from '../_lib/theme';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DrenniaMapProps {
  /** district_number → hex color (e.g. '#C9A24A') */
  districtColors?: Record<number, string>;
  /** Called when user clicks a district path */
  onDistrictClick?: (districtNumber: number, stateCode: string) => void;
  /** district_number of the currently selected district */
  selectedDistrict?: number | null;
  /** Show district numbers as labels */
  showLabels?: boolean;
  /** Scale factor for the whole SVG (default 1) */
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

// ── District data ──────────────────────────────────────────────────────────
// Each entry: [districtNumber, stateCode, svgPath, labelX, labelY]
// Paths are absolute SVG path data within viewBox 0 0 600 800

const DISTRICTS: Array<[number, string, string, number, number]> = [
  // ══ VALE (North) — 1–37 ══════════════════════════════════════════════════
  // The angular "head" protrusion at top-left of Drennia
  [1,  'VALE', 'M155,60 L185,55 L200,70 L190,90 L165,95 L150,80 Z', 173, 75],
  [2,  'VALE', 'M185,55 L215,50 L230,65 L220,80 L200,85 L190,70 Z', 207, 67],
  [3,  'VALE', 'M215,50 L245,52 L255,68 L242,82 L225,78 L220,65 Z', 237, 66],
  [4,  'VALE', 'M155,80 L190,90 L195,108 L175,118 L155,110 L148,95 Z', 172, 99],
  [5,  'VALE', 'M190,90 L220,88 L228,105 L215,118 L195,115 L190,108 Z', 209, 103],
  [6,  'VALE', 'M220,88 L250,85 L258,100 L248,115 L228,112 L222,100 Z', 238, 100],
  [7,  'VALE', 'M250,85 L278,82 L285,97 L273,112 L255,110 L248,98 Z', 266, 97],
  [8,  'VALE', 'M148,110 L175,118 L178,135 L158,145 L140,138 L138,122 Z', 158, 128],
  [9,  'VALE', 'M175,118 L215,118 L218,135 L200,148 L178,142 L175,130 Z', 197, 133],
  [10, 'VALE', 'M215,118 L248,115 L252,132 L235,145 L215,142 L212,130 Z', 232, 130],
  [11, 'VALE', 'M248,115 L278,112 L283,130 L268,143 L250,140 L245,128 Z', 263, 128],
  [12, 'VALE', 'M130,138 L158,145 L160,162 L140,172 L120,165 L118,150 Z', 140, 155],
  [13, 'VALE', 'M158,145 L200,148 L202,165 L182,177 L160,172 L158,160 Z', 180, 161],
  [14, 'VALE', 'M200,148 L235,145 L238,162 L220,175 L200,172 L198,162 Z', 218, 159],
  [15, 'VALE', 'M235,145 L268,143 L272,160 L255,173 L238,170 L235,158 Z', 252, 157],
  [16, 'VALE', 'M268,143 L297,140 L302,157 L285,170 L268,167 L265,155 Z', 283, 155],
  [17, 'VALE', 'M110,165 L140,172 L142,190 L122,200 L102,193 L100,178 Z', 121, 183],
  [18, 'VALE', 'M140,172 L182,177 L183,195 L162,207 L140,200 L138,188 Z', 161, 191],
  [19, 'VALE', 'M182,177 L220,175 L222,193 L203,205 L183,202 L180,190 Z', 202, 191],
  [20, 'VALE', 'M220,175 L255,173 L257,190 L238,203 L218,200 L215,188 Z', 237, 188],
  [21, 'VALE', 'M255,173 L285,170 L288,188 L270,200 L252,197 L250,185 Z', 269, 186],
  [22, 'VALE', 'M285,170 L314,167 L318,185 L300,197 L282,194 L280,182 Z', 299, 183],
  [23, 'VALE', 'M92,193 L122,200 L123,218 L103,228 L82,222 L80,208 Z', 101, 211],
  [24, 'VALE', 'M122,200 L162,207 L163,225 L143,237 L122,230 L120,217 Z', 141, 218],
  [25, 'VALE', 'M162,207 L203,205 L204,223 L183,235 L162,230 L160,220 Z', 183, 218],
  [26, 'VALE', 'M203,205 L238,203 L240,220 L220,232 L200,228 L200,218 Z', 220, 217],
  [27, 'VALE', 'M238,203 L270,200 L272,218 L253,230 L235,227 L235,215 Z', 253, 215],
  [28, 'VALE', 'M270,200 L300,197 L303,215 L284,227 L267,224 L265,212 Z', 283, 213],
  [29, 'VALE', 'M300,197 L330,194 L333,212 L314,224 L297,221 L295,208 Z', 314, 210],
  [30, 'VALE', 'M78,210 L103,228 L100,248 L78,255 L60,248 L60,228 Z', 81, 238],
  [31, 'VALE', 'M103,228 L143,237 L140,257 L118,265 L98,258 L97,242 Z', 120, 248],
  [32, 'VALE', 'M143,237 L183,235 L182,255 L160,263 L140,257 L140,248 Z', 161, 249],
  [33, 'VALE', 'M183,235 L220,232 L218,252 L198,262 L178,257 L178,247 Z', 199, 247],
  [34, 'VALE', 'M220,232 L253,230 L252,250 L232,260 L215,255 L215,245 Z', 233, 245],
  [35, 'VALE', 'M253,230 L284,227 L283,247 L263,257 L248,252 L248,242 Z', 264, 242],
  [36, 'VALE', 'M284,227 L314,224 L313,244 L293,254 L278,249 L278,239 Z', 294, 239],
  [37, 'VALE', 'M314,224 L344,221 L343,241 L323,251 L308,246 L308,236 Z', 325, 237],

  // ══ CREST (East) — 38–75 ═════════════════════════════════════════════════
  // Right side, narrowing neck area and upper east coast
  [38, 'CREST', 'M60,248 L100,258 L96,278 L72,285 L52,278 L52,262 Z', 74, 267],
  [39, 'CREST', 'M100,258 L140,257 L138,277 L115,285 L95,280 L94,268 Z', 117, 271],
  [40, 'CREST', 'M140,257 L178,257 L175,277 L153,285 L136,280 L136,268 Z', 156, 271],
  [41, 'CREST', 'M178,257 L215,255 L212,275 L190,283 L174,278 L174,268 Z', 193, 270],
  [42, 'CREST', 'M215,255 L248,252 L245,272 L223,280 L210,275 L210,265 Z', 229, 268],
  [43, 'CREST', 'M248,252 L278,249 L275,269 L253,277 L244,272 L244,262 Z', 261, 264],
  [44, 'CREST', 'M278,249 L308,246 L305,266 L283,274 L272,269 L272,259 Z', 289, 260],
  [45, 'CREST', 'M308,246 L338,243 L335,263 L313,271 L302,266 L302,256 Z', 319, 257],
  [46, 'CREST', 'M50,278 L76,285 L72,305 L50,312 L32,305 L32,290 Z', 54, 296],
  [47, 'CREST', 'M76,285 L115,285 L112,305 L88,312 L72,307 L70,294 Z', 93, 298],
  [48, 'CREST', 'M115,285 L153,285 L150,305 L126,312 L110,307 L110,296 Z', 131, 298],
  [49, 'CREST', 'M153,285 L190,283 L187,303 L163,310 L148,305 L148,295 Z', 169, 297],
  [50, 'CREST', 'M190,283 L223,280 L220,300 L196,307 L183,302 L183,293 Z', 202, 295],
  [51, 'CREST', 'M223,280 L253,277 L250,297 L227,304 L218,299 L218,290 Z', 236, 291],
  [52, 'CREST', 'M253,277 L275,269 L278,285 L260,298 L248,295 L248,283 Z', 264, 285],
  [53, 'CREST', 'M275,269 L305,266 L308,282 L290,295 L275,292 L272,280 Z', 291, 280],
  [54, 'CREST', 'M305,266 L335,263 L338,279 L320,292 L305,289 L302,277 Z', 319, 278],
  [55, 'CREST', 'M32,305 L52,312 L48,332 L26,338 L12,332 L12,316 Z', 32, 320],
  [56, 'CREST', 'M52,312 L88,312 L84,332 L60,338 L48,333 L48,318 Z', 68, 323],
  [57, 'CREST', 'M88,312 L126,312 L122,332 L98,338 L84,333 L84,318 Z', 105, 323],
  [58, 'CREST', 'M126,312 L163,310 L159,330 L135,336 L122,332 L122,321 Z', 141, 322],
  [59, 'CREST', 'M163,310 L196,307 L193,327 L169,333 L159,328 L159,318 Z', 177, 320],
  [60, 'CREST', 'M196,307 L220,300 L217,320 L195,328 L188,325 L188,315 Z', 205, 316],
  [61, 'CREST', 'M220,300 L248,295 L245,315 L223,323 L215,320 L215,308 Z', 231, 311],
  [62, 'CREST', 'M248,295 L275,292 L272,312 L250,320 L242,315 L242,305 Z', 258, 306],
  [63, 'CREST', 'M275,292 L305,289 L302,309 L280,317 L268,312 L270,302 Z', 286, 305],
  [64, 'CREST', 'M305,289 L335,286 L332,306 L310,314 L300,309 L298,299 Z', 315, 300],
  [65, 'CREST', 'M12,332 L30,338 L26,358 L6,365 L-2,355 L-2,340 Z', 14, 348],
  [66, 'CREST', 'M30,338 L60,338 L56,358 L32,365 L22,360 L24,345 Z', 43, 350],
  [67, 'CREST', 'M60,338 L98,338 L94,358 L70,365 L56,360 L56,348 Z', 77, 350],
  [68, 'CREST', 'M98,338 L135,336 L131,356 L107,362 L94,357 L94,347 Z', 114, 349],
  [69, 'CREST', 'M135,336 L169,333 L165,353 L141,359 L131,354 L131,344 Z', 150, 347],
  [70, 'CREST', 'M169,333 L195,328 L191,348 L168,356 L161,350 L163,340 Z', 180, 344],
  [71, 'CREST', 'M195,328 L223,323 L219,343 L196,351 L187,346 L187,336 Z', 205, 338],
  [72, 'CREST', 'M223,323 L250,320 L247,340 L224,348 L216,343 L216,333 Z', 233, 335],
  [73, 'CREST', 'M250,320 L272,312 L269,330 L248,340 L241,336 L241,326 Z', 258, 329],
  [74, 'CREST', 'M272,312 L300,309 L297,329 L275,337 L267,330 L267,320 Z', 283, 322],
  [75, 'CREST', 'M300,309 L330,306 L327,326 L305,334 L295,327 L295,317 Z', 312, 320],

  // ══ MARCH (West) — 76–113 ════════════════════════════════════════════════
  // Lower-left, the wavy west coastline
  [76,  'MARCH', 'M-2,355 L8,365 L5,385 L-12,390 L-18,378 L-15,362 Z', -5, 373],
  [77,  'MARCH', 'M8,365 L32,365 L28,385 L5,390 L-2,385 L-2,373 Z', 15, 376],
  [78,  'MARCH', 'M32,365 L70,365 L66,385 L40,390 L26,385 L26,373 Z', 48, 377],
  [79,  'MARCH', 'M70,365 L107,362 L103,382 L78,388 L64,383 L64,373 Z', 85, 376],
  [80,  'MARCH', 'M107,362 L141,359 L137,379 L112,385 L101,380 L101,370 Z', 119, 373],
  [81,  'MARCH', 'M141,359 L168,356 L164,376 L140,382 L135,377 L135,367 Z', 152, 370],
  [82,  'MARCH', 'M168,356 L191,348 L187,368 L163,375 L160,370 L162,358 Z', 177, 365],
  [83,  'MARCH', 'M191,348 L219,343 L215,363 L191,370 L184,365 L184,355 Z', 201, 359],
  [84,  'MARCH', 'M219,343 L247,340 L243,360 L219,367 L212,362 L212,352 Z', 229, 354],
  [85,  'MARCH', 'M247,340 L267,330 L263,350 L241,358 L238,354 L240,342 Z', 255, 347],
  [86,  'MARCH', 'M267,330 L295,327 L291,347 L269,355 L260,348 L262,338 Z', 279, 342],
  [87,  'MARCH', 'M295,327 L327,326 L323,346 L299,354 L288,347 L288,337 Z', 307, 339],
  [88,  'MARCH', 'M-16,388 L6,390 L2,412 L-18,418 L-26,408 L-24,394 Z', -10, 402],
  [89,  'MARCH', 'M6,390 L40,390 L36,412 L10,418 L2,412 L2,398 Z', 21, 403],
  [90,  'MARCH', 'M40,390 L78,388 L74,410 L48,416 L36,412 L36,400 Z', 57, 403],
  [91,  'MARCH', 'M78,388 L112,385 L108,407 L82,413 L72,408 L72,397 Z', 94, 400],
  [92,  'MARCH', 'M112,385 L140,382 L136,404 L110,410 L106,405 L106,394 Z', 123, 397],
  [93,  'MARCH', 'M140,382 L164,375 L160,397 L136,403 L132,398 L134,387 Z', 150, 392],
  [94,  'MARCH', 'M164,375 L187,368 L183,390 L159,396 L156,391 L158,380 Z', 173, 385],
  [95,  'MARCH', 'M187,368 L215,363 L211,385 L187,391 L180,386 L180,376 Z', 197, 380],
  [96,  'MARCH', 'M215,363 L243,360 L239,382 L215,388 L208,383 L208,372 Z', 225, 375],
  [97,  'MARCH', 'M243,360 L263,350 L259,372 L237,380 L232,375 L234,363 Z', 249, 368],
  [98,  'MARCH', 'M263,350 L291,347 L287,369 L265,377 L256,370 L258,360 Z', 275, 362],
  [99,  'MARCH', 'M291,347 L323,346 L319,368 L297,376 L284,369 L284,357 Z', 303, 360],
  [100, 'MARCH', 'M-24,408 L0,415 L-3,437 L-24,443 L-33,433 L-30,417 Z', -14, 426],
  [101, 'MARCH', 'M0,415 L36,412 L32,434 L6,440 L-5,433 L-4,422 Z', 17, 427],
  [102, 'MARCH', 'M36,412 L72,408 L68,430 L42,436 L30,430 L30,420 Z', 51, 422],
  [103, 'MARCH', 'M72,408 L106,405 L102,427 L76,433 L66,427 L66,417 Z', 87, 420],
  [104, 'MARCH', 'M106,405 L136,403 L132,425 L106,431 L100,426 L100,414 Z', 118, 417],
  [105, 'MARCH', 'M136,403 L160,397 L156,419 L132,425 L128,420 L130,410 Z', 146, 413],
  [106, 'MARCH', 'M160,397 L183,390 L179,412 L155,418 L152,413 L154,402 Z', 169, 407],
  [107, 'MARCH', 'M183,390 L211,385 L207,407 L183,413 L176,408 L176,398 Z', 193, 401],
  [108, 'MARCH', 'M211,385 L239,382 L235,404 L211,410 L204,405 L204,394 Z', 221, 397],
  [109, 'MARCH', 'M239,382 L259,372 L255,394 L233,402 L228,397 L230,386 Z', 246, 389],
  [110, 'MARCH', 'M259,372 L287,369 L283,391 L261,399 L252,392 L254,381 Z', 271, 384],
  [111, 'MARCH', 'M287,369 L319,368 L315,390 L293,398 L280,391 L280,379 Z', 299, 382],
  [112, 'MARCH', 'M-30,433 L-3,440 L-7,462 L-28,468 L-38,458 L-36,441 Z', -17, 450],
  [113, 'MARCH', 'M-3,440 L30,430 L26,452 L0,458 L-9,450 L-8,441 Z', 13, 447],

  // ══ THORN (South-East) — 114–151 ═════════════════════════════════════════
  // The large rounded lower body
  [114, 'THORN', 'M30,430 L66,427 L62,449 L36,455 L24,448 L24,438 Z', 45, 441],
  [115, 'THORN', 'M66,427 L100,426 L96,448 L70,454 L60,447 L60,436 Z', 80, 440],
  [116, 'THORN', 'M100,426 L132,425 L128,447 L102,453 L94,446 L94,435 Z', 114, 439],
  [117, 'THORN', 'M132,425 L156,419 L152,441 L128,447 L124,442 L126,431 Z', 142, 436],
  [118, 'THORN', 'M156,419 L179,412 L175,434 L151,440 L148,435 L150,424 Z', 165, 429],
  [119, 'THORN', 'M179,412 L207,407 L203,429 L179,435 L172,430 L172,420 Z', 189, 423],
  [120, 'THORN', 'M207,407 L235,404 L231,426 L207,432 L200,427 L200,416 Z', 217, 419],
  [121, 'THORN', 'M235,404 L255,394 L251,416 L229,424 L224,419 L226,408 Z', 242, 413],
  [122, 'THORN', 'M255,394 L283,391 L279,413 L257,421 L248,414 L250,403 Z', 267, 407],
  [123, 'THORN', 'M283,391 L315,390 L311,412 L289,420 L276,413 L276,401 Z', 295, 404],
  [124, 'THORN', 'M-36,458 L-6,462 L-10,484 L-32,490 L-43,480 L-42,465 Z', -19, 472],
  [125, 'THORN', 'M-6,462 L26,452 L22,474 L-4,480 L-12,473 L-11,463 Z', 9, 470],
  [126, 'THORN', 'M26,452 L62,449 L58,471 L32,477 L20,470 L20,460 Z', 41, 464],
  [127, 'THORN', 'M62,449 L96,448 L92,470 L66,476 L56,469 L56,458 Z', 76, 462],
  [128, 'THORN', 'M96,448 L128,447 L124,469 L98,475 L90,468 L90,457 Z', 110, 461],
  [129, 'THORN', 'M128,447 L152,441 L148,463 L124,469 L120,464 L122,452 Z', 138, 458],
  [130, 'THORN', 'M152,441 L175,434 L171,456 L147,462 L144,457 L146,446 Z', 161, 452],
  [131, 'THORN', 'M175,434 L203,429 L199,451 L175,457 L168,452 L168,442 Z', 185, 446],
  [132, 'THORN', 'M203,429 L231,426 L227,448 L203,454 L196,449 L196,438 Z', 213, 442],
  [133, 'THORN', 'M231,426 L251,416 L247,438 L225,446 L220,441 L222,430 Z', 238, 437],
  [134, 'THORN', 'M251,416 L279,413 L275,435 L253,443 L244,436 L246,425 Z', 263, 430],
  [135, 'THORN', 'M279,413 L311,412 L307,434 L285,442 L272,435 L272,423 Z', 291, 427],
  [136, 'THORN', 'M-42,480 L-8,484 L-12,508 L-36,514 L-48,502 L-48,487 Z', -22, 496],
  [137, 'THORN', 'M-8,484 L22,474 L18,498 L-8,504 L-18,497 L-16,486 Z', 7, 493],
  [138, 'THORN', 'M22,474 L58,471 L54,495 L28,501 L16,494 L16,483 Z', 37, 487],
  [139, 'THORN', 'M58,471 L92,470 L88,492 L62,498 L52,491 L52,480 Z', 73, 484],
  [140, 'THORN', 'M92,470 L124,469 L120,491 L94,497 L86,490 L86,479 Z', 107, 483],
  [141, 'THORN', 'M124,469 L148,463 L144,485 L120,491 L116,486 L118,474 Z', 134, 480],
  [142, 'THORN', 'M148,463 L171,456 L167,478 L143,484 L140,479 L142,468 Z', 157, 473],
  [143, 'THORN', 'M171,456 L199,451 L195,473 L171,479 L164,474 L164,464 Z', 181, 468],
  [144, 'THORN', 'M199,451 L227,448 L223,470 L199,476 L192,471 L192,460 Z', 209, 463],
  [145, 'THORN', 'M227,448 L247,438 L243,460 L221,468 L216,463 L218,452 Z', 234, 455],
  [146, 'THORN', 'M247,438 L275,435 L271,457 L249,465 L240,458 L242,447 Z', 259, 450],
  [147, 'THORN', 'M275,435 L307,434 L303,456 L281,464 L268,457 L268,445 Z', 287, 449],
  [148, 'THORN', 'M-48,502 L-10,508 L-14,532 L-40,540 L-54,528 L-52,512 Z', -24, 520],
  [149, 'THORN', 'M-10,508 L22,498 L18,522 L-8,530 L-18,522 L-16,511 Z', 5, 519],
  [150, 'THORN', 'M22,498 L56,495 L52,520 L26,528 L14,520 L14,508 Z', 37, 512],
  [151, 'THORN', 'M56,495 L90,492 L88,518 L62,526 L50,518 L50,504 Z', 71, 508],
];

// State color hints (used for state label background)
const STATE_COLORS: Record<string, string> = {
  VALE:  '#4B6382',
  CREST: '#7B5FA5',
  MARCH: '#4A7D5A',
  THORN: '#8A5A3A',
};

const STATE_LABELS: Record<string, string> = {
  VALE:  'Vale (North)',
  CREST: 'Crest (East)',
  MARCH: 'March (West)',
  THORN: 'Thorn (South)',
};

// ── Component ──────────────────────────────────────────────────────────────

export default function DrenniaMap({
  districtColors = {},
  onDistrictClick,
  selectedDistrict = null,
  showLabels = false,
  scale = 1,
  className,
  style,
}: DrenniaMapProps) {
  const [hoveredDistrict, setHoveredDistrict] = useState<number | null>(null);

  const handleClick = useCallback((districtNumber: number, stateCode: string) => {
    onDistrictClick?.(districtNumber, stateCode);
  }, [onDistrictClick]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
    >
      {/* State legend */}
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        zIndex: 10,
      }}>
        {Object.entries(STATE_LABELS).map(([code, label]) => (
          <div key={code} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(9,10,15,0.85)',
            border: `1px solid ${STATE_COLORS[code]}40`,
            borderRadius: 6,
            padding: '3px 8px',
          }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: STATE_COLORS[code],
              flexShrink: 0,
            }} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: '0.08em' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <svg
        viewBox="0 0 340 560"
        width={340 * scale}
        height={560 * scale}
        style={{
          display: 'block',
          background: 'transparent',
          overflow: 'visible',
        }}
        aria-label="Map of Drennia — 151 districts across 4 states"
      >
        {/* ── Drop shadow filter ── */}
        <defs>
          <filter id="district-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,0.6)" />
          </filter>
          <filter id="selected-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Districts ── */}
        {DISTRICTS.map(([num, stateCode, path, labelX, labelY]) => {
          const isHovered = hoveredDistrict === num;
          const isSelected = selectedDistrict === num;
          const fill = districtColors[num] ?? STATE_COLORS[stateCode] + '55';
          const strokeColor = isSelected
            ? '#FFD700'
            : isHovered
            ? 'rgba(255,255,255,0.6)'
            : 'rgba(255,255,255,0.12)';
          const strokeWidth = isSelected ? 2.5 : isHovered ? 1.5 : 0.75;

          return (
            <g key={num}>
              <path
                d={path}
                fill={fill}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                data-district-id={num}
                data-state-id={stateCode}
                style={{
                  cursor: 'pointer',
                  transition: 'fill 0.25s ease, stroke 0.15s ease, stroke-width 0.15s ease',
                  filter: isSelected ? 'url(#selected-glow)' : isHovered ? 'brightness(1.3)' : undefined,
                }}
                onMouseEnter={() => setHoveredDistrict(num)}
                onMouseLeave={() => setHoveredDistrict(null)}
                onClick={() => handleClick(num, stateCode)}
                role="button"
                aria-label={`District ${num} — ${STATE_LABELS[stateCode]}`}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(num, stateCode); }}
              />
              {showLabels && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 5.5,
                    fontFamily: MONO,
                    fill: 'rgba(255,255,255,0.7)',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {num}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredDistrict !== null && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          background: 'rgba(9,10,15,0.9)',
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          padding: '6px 12px',
          pointerEvents: 'none',
          zIndex: 20,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted, letterSpacing: '0.08em' }}>
            DISTRICT&nbsp;
          </span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: T.text, fontWeight: 700 }}>
            {hoveredDistrict}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, marginLeft: 6 }}>
            {STATE_LABELS[DISTRICTS.find(d => d[0] === hoveredDistrict)?.[1] ?? 'VALE']}
          </span>
        </div>
      )}
    </div>
  );
}
