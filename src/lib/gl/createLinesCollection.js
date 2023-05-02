import maplibregl from 'maplibre-gl';
import {defineProgram, InstancedAttribute, ColorAttribute} from 'w-gl';


export function getCustomLayer(layerName = 'graph-edges') {
  return {
    id: layerName,
    type: 'custom',
    onAdd: function (map, gl) {
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
      // let angle = Math.PI * 2 / 100;
      // for (let i =0 ; i < 100; ++i) {
      //   let x = Math.cos(angle * i);
      //   let y = Math.sin(angle * i);
      //   let from = maplibregl.MercatorCoordinate.fromLngLat({ lng: (Math.random() - 0.5) * 10, lat: y })
      //   let to = maplibregl.MercatorCoordinate.fromLngLat({ lng: 0, lat: 0 })
      //   this.program.add({
      //     from: [from.x, from.y], 
      //     to: [to.x, to.y],
      //     color: 0x0000ff9f
      //   })
      // }
    },
    render: function (gl, matrix) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.program.draw({
          width: 0.000001,
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