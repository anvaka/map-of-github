import {defineProgram, InstancedAttribute, ColorAttribute} from 'w-gl';


export function getCustomLayer(layerName = 'graph-edges') {
  return {
    id: layerName,
    type: 'custom',
    onAdd: function (map, gl) {
      this.map = map;
      this.program = defineProgram({
        gl,
        vertex: `
uniform mat4 modelViewProjection;
uniform float width;

attribute vec2 from, to;
attribute vec2 point;
attribute vec4 color;
varying vec2 vPoint;
varying vec4 vColor;

void main() {
  vec2 xBasis = normalize(to - from);
  vec2 yBasis = vec2(-xBasis.y, xBasis.x);
  vec4 clip0 = modelViewProjection * vec4(from.xy + width * yBasis * point.x, 0., 1.0);
  vec4 clip1 = modelViewProjection * vec4(to.xy + width * yBasis * point.x, 0., 1.0);
  gl_Position = mix(clip0, clip1, point.y);
  vColor = color;
}`,

        fragment: `
    precision highp float;
    varying vec4 vColor;

    void main() {
      gl_FragColor = vColor.abgr;
    }`,
      attributes: { color: new ColorAttribute() },
      instanced: {
          point: new InstancedAttribute([
            -0.5, 0, -0.5, 1, 0.5, 1, // First 2D triangle of the quad
            -0.5, 0, 0.5, 1, 0.5, 0   // Second 2D triangle of the quad
          ])
        }
      });
    },
    render: function (gl, matrix) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        let zoom = this.map.getZoom();
        this.program.draw({
          width: 0.00005 / zoom,
          modelViewProjection: matrix,
        });
    },
    clear() {
      this.program.setCount(0);
    },
    addLine(lineDef) {
      this.program.add(lineDef);
    }
};

}