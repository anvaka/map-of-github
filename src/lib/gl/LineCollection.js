import {GLCollection, defineProgram, InstancedAttribute, ColorAttribute} from 'w-gl';

export default class LineCollection extends GLCollection {
  constructor(gl, options = {}) {
    let program = defineProgram({
      gl,
      vertex: `
    uniform mat4 modelViewProjection;
    uniform float width;
    uniform vec2 resolution;

    attribute vec4 color;
    attribute vec3 from, to;
    attribute vec2 point;

    varying vec4 vColor;
    varying vec2 vPoint;

    void main() {
      vec4 clip0 = modelViewProjection * vec4(from, 1.0);
      vec4 clip1 = modelViewProjection * vec4(to, 1.0);

      vec2 screen0 = resolution * (0.5 * clip0.xy/clip0.w + 0.5);
      vec2 screen1 = resolution * (0.5 * clip1.xy/clip1.w + 0.5);

      vec2 xBasis = normalize(screen1 - screen0);
      vec2 yBasis = vec2(-xBasis.y, xBasis.x);

      // Offset the original points:
      vec2 pt0 = screen0 + width * point.x * yBasis;
      vec2 pt1 = screen1 + width * point.x * yBasis;

      vec2 pt = mix(pt0, pt1, point.y);
      vec4 clip = mix(clip0, clip1, point.y);

      gl_Position = vec4(clip.w * (2.0 * pt/resolution - 1.0), clip.z, clip.w);
      vColor = color.abgr; // mix(.abgr, aToColor.abgr, aPosition.y);
    }`,

      fragment: `
    precision highp float;
    varying vec4 vColor;

    void main() {
      gl_FragColor = vColor;
    }`,
      attributes: {
        color: new ColorAttribute()
      },
      instanced: {
        point: new InstancedAttribute([
          -0.5, 0, -0.5, 1, 0.5, 1, // First 2D triangle of the quad
          -0.5, 0, 0.5, 1, 0.5, 0   // Second 2D triangle of the quad
        ])
      }
    });
    super(program);
    this.width = options.width || 2;
  }

  draw(_, drawContext) {
    if (!this.uniforms) {
      this.uniforms = {
        modelViewProjection: this.modelViewProjection,
        width: this.width,
        resolution: [drawContext.width, drawContext.height]
      }
    }
    this.uniforms.resolution[0] = drawContext.width;
    this.uniforms.resolution[1] = drawContext.height;
    this.program.draw(this.uniforms);
  }

  // implement lineRenderTrait to allow SVG export via w-gl
  forEachLine(cb) {
    let count = this.program.getCount()
    for (let i = 0; i < count; ++i) {
      let vertex = this.program.get(i);
      let from = { x: vertex.from[0], y: vertex.from[1], z: vertex.from[2], color: vertex.color }
      let to = { x: vertex.to[0], y: vertex.to[1], z: vertex.to[2], color: vertex.color }
      cb(from, to);
    }
  }

  getLineColor(from) {
    let count = this.program.getCount()
    let c = from ? 
              from.color :  
              count > 0 ? this.program.get(0).color : 0xFFFFFFFF;

    return [
      (c >> 24) & 0xFF / 255,
      (c >> 16) & 0xFF / 255,
      (c >>  8) & 0xFF / 255,
      (c >>  0) & 0xFF / 255,
    ]
  }
}