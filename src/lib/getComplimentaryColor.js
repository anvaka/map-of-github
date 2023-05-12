export default function getComplimentaryColor(color, alpha = 0xaa) {
  if (typeof color === 'string') {
    if (color[0] === '#') {
      color = parseInt(color.slice(1), 16);
      color = color << 8 | 0xff;
    } else {
      console.error('getComplimentaryColor: color must be a number or a hex string', color);
      return 0xFFFFFF22;
    }
  }
  let r = (color >> 24) & 0xff;
  let g = (color >> 16) & 0xff;
  let b = (color >> 8) & 0xff;

  let [h, s, l] = rgbToHsl(r, g, b);
  if (l > 0.5) l = Math.max(0, l - 0.2);
  else l = Math.min(1, l + 0.2);
  s = Math.min(1, s * 1.2);
  let [r0, g0, b0] = hslToRgb(h, s, l);
  return (r0 << 24) | (g0 << 16) | (b0 << 8) | alpha;
}

function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, l ];
}

function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}