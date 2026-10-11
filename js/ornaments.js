/*
 * RELIKT — procedural ornaments.
 * Neo-tribal blades + gothic tracery, generated as SVG strings so every plate
 * on the site can be unique without shipping image files.
 */
(function (root) {
  'use strict';

  var f = function (n) { return Math.round(n * 100) / 100; };

  // A single leaf-shaped thorn lying along +x: pointed at the base, swelling,
  // then curling to a sharp tip. `bend` is the sideways offset of the tip.
  function blade(r0, r1, w, bend, skew) {
    var L = r1 - r0;
    skew = skew == null ? 0.35 : skew;
    return 'M' + f(r0) + ',0' +
      ' C' + f(r0 + L * 0.12) + ',' + f(-w * 1.7) + ' ' + f(r0 + L * 0.55) + ',' + f(bend * skew - w * 0.9) + ' ' + f(r1) + ',' + f(bend) +
      ' C' + f(r0 + L * 0.6) + ',' + f(bend * skew + w * 0.5) + ' ' + f(r0 + L * 0.25) + ',' + f(w * 1.5) + ' ' + f(r0) + ',0 Z';
  }

  // Pointed gothic lancet (arch) pointing outward along +x, outline only.
  function lancet(r0, r1, w) {
    var L = r1 - r0;
    return 'M' + f(r0) + ',' + f(-w) +
      ' C' + f(r0 + L * 0.55) + ',' + f(-w) + ' ' + f(r0 + L * 0.85) + ',' + f(-w * 0.35) + ' ' + f(r1) + ',0' +
      ' C' + f(r0 + L * 0.85) + ',' + f(w * 0.35) + ' ' + f(r0 + L * 0.55) + ',' + f(w) + ' ' + f(r0) + ',' + f(w);
  }

  function ring(r, extra) {
    return '<circle r="' + r + '" fill="none" stroke="currentColor"' + (extra || '') + '/>';
  }

  function ticks(r, n, len, offset) {
    var d = '';
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + (offset || 0);
      var c = Math.cos(a), s = Math.sin(a);
      d += 'M' + f(c * r) + ',' + f(s * r) + 'L' + f(c * (r + len)) + ',' + f(s * (r + len));
    }
    return '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1"/>';
  }

  function rotated(path, n, extraAngle, cls, fill) {
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '<path d="' + path + '" transform="rotate(' + f((360 / n) * i + (extraAngle || 0)) + ')"' +
        (fill === false ? ' fill="none" stroke="currentColor" stroke-width="1"' : ' fill="currentColor"') + '/>';
    }
    return '<g' + (cls ? ' class="' + cls + '"' : '') + '>' + out + '</g>';
  }

  /*
   * sigil(): a rose-window / tribal-sun mandala. Every segment is bilaterally
   * symmetric (a centre spike flanked by mirrored curling blades) so the whole
   * reads as gothic tracery first and tattoo flash second. Options change the
   * segment count, how far the flanking blades curl, and whether they hook
   * inwards (claws) or sweep outwards (wings).
   */
  function sigil(o) {
    o = o || {};
    var n = o.n || 8;
    var curl = o.curl == null ? 1 : o.curl;      // >0 wings, <0 claws
    var reach = o.reach || 1;                      // scales blade length
    var seg = 360 / n;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 400 400" fill="none" aria-hidden="true" focusable="false">';

    svg += '<g class="orn-a">';
    svg += ring(190, ' stroke-width="0.8" opacity=".55"');
    svg += ring(184, ' stroke-width="0.5" opacity=".35" stroke-dasharray="1 5"');
    svg += ticks(190, n * 6, 6, 0);
    svg += '</g>';

    svg += '<g class="orn-b">';
    var spike = blade(58, 178 * reach, 5.5, 0, 0.3);
    var wing = blade(52, 150 * reach, 10, 58 * curl, 0.3);
    var nub = blade(84, 120 * reach, 4, 24 * curl, 0.4);
    var half = '<path d="' + wing + '"/><path d="' + nub + '" opacity=".8"/>';
    var parts = '';
    for (var i = 0; i < n; i++) {
      var ang = f(seg * i - 90);
      parts += '<g transform="rotate(' + ang + ')" fill="currentColor"><path d="' + spike + '"/>' +
        half + '<g transform="scale(1,-1)">' + half + '</g></g>';
    }
    svg += parts + '</g>';

    svg += '<g class="orn-c">';
    svg += rotated(lancet(30, 96, 18), n, seg / 2 - 90, '', false);
    svg += ring(30, ' stroke-width="0.9"');
    svg += ring(37, ' stroke-width="0.5" opacity=".5"');
    svg += ring(150 * reach, ' stroke-width="0.5" opacity=".35"');
    svg += '</g>';

    svg += '<path d="M0,-24 L5,0 L0,24 L-5,0Z M-24,0 L0,-5 L24,0 L0,5Z" fill="currentColor"/>';
    svg += '</svg>';
    return svg;
  }

  /*
   * divider(): bilateral horned crest. Left half is a mirror of the right, with
   * a hairline that runs out to the edges.
   */
  function divider() {
    var half = '';
    var specs = [
      [16, 250, 6.5, -34], [16, 190, 5.5, -62], [18, 135, 5, -84], [20, 92, 4.2, -98]
    ];
    var up = '';
    specs.forEach(function (s) {
      up += '<path d="' + blade(s[0], s[1], s[2], s[3], 0.28) + '"/>';
    });
    half += '<g fill="currentColor">' + up + '<g transform="scale(1,-1)">' + up + '</g></g>';
    half += '<path d="M262,0 L600,0" stroke="currentColor" stroke-width="0.7" opacity=".45"/>';
    half += '<circle cx="272" cy="0" r="2.2" fill="currentColor"/>';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-600 -110 1200 220" fill="none" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">' +
      '<g>' + half + '</g>' +
      '<g transform="scale(-1,1)">' + half + '</g>' +
      '<path d="M0,-30 L5,-5 L30,0 L5,5 L0,30 L-5,5 L-30,0 L-5,-5Z" fill="currentColor"/>' +
      '</svg>';
    return svg;
  }

  // Short crest used beside headings: one side only, unmirrored.
  function crest(flip) {
    var half = '';
    var up = '';
    [[0, 150, 5, -30], [0, 110, 4.5, -56], [4, 70, 4, -72]].forEach(function (s) {
      up += '<path d="' + blade(s[0], s[1], s[2], s[3], 0.28) + '"/>';
    });
    half += '<g fill="currentColor">' + up + '<g transform="scale(1,-1)">' + up + '</g></g>';
    half += '<path d="M160,0 L400,0" stroke="currentColor" stroke-width="0.7" opacity=".45"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -90 400 180" fill="none" aria-hidden="true" focusable="false"' +
      (flip ? ' style="transform:scaleX(-1)"' : '') + '>' + half + '</svg>';
  }

  // Corner thorn for frames (draws into the top-left; rotate with CSS).
  function corner() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none" aria-hidden="true" focusable="false">' +
      '<path d="M0.5,60 L0.5,0.5 L60,0.5" stroke="currentColor" stroke-width="1"/>' +
      '<path d="' + blade(4, 34, 3.2, 11, 0.3) + '" transform="translate(2 2) rotate(45)" fill="currentColor"/>' +
      '</svg>';
  }

  var api = { blade: blade, lancet: lancet, sigil: sigil, divider: divider, crest: crest, corner: corner };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Orn = api;
})(typeof window !== 'undefined' ? window : this);
