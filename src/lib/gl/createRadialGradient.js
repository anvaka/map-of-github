import {defineProgram} from 'w-gl';


export function createRadialGradient(layerName = 'radial-gradient') {

  return {
    id: layerName,
    type: 'custom',
    onAdd: function (map, gl) {
      this.map = map;
      this.program = defineProgram({
        gl,
        vertex: `
uniform mat4 modelViewProjection;
attribute vec2 pos;
attribute vec2 point;
varying vec2 vPos;
void main() {
  gl_Position = modelViewProjection * vec4(pos, 0.0, 1.0);
  vPos = point;
}`,

        fragment: `
      precision mediump float;
      varying vec2 vPos;
      uniform vec3 uCenterColor;
      uniform vec3 uEdgeColor;
      void main() {
        float t = smoothstep(0., 1., length(vPos));
        gl_FragColor = vec4(mix(uCenterColor, uEdgeColor, t), 1.);
      }`,
      });

      let r = 0.20;
      this.radius = [r, r];
      this.program.add({pos: [0.5 - r, 0.5 - r], point: [-1, -1]});
      this.program.add({pos: [0.5 - r, 0.5 + r], point: [-1,  1]});
      this.program.add({pos: [0.5 + r, 0.5 + r], point: [ 1,  1]});
      this.program.add({pos: [0.5 + r, 0.5 + r], point: [ 1,  1]});
      this.program.add({pos: [0.5 + r, 0.5 - r], point: [ 1, -1]});
      this.program.add({pos: [0.5 - r, 0.5 - r], point: [-1, -1]});
    },

    render: function (gl, matrix) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.program.draw({
          uCenterColor: [0x08/255, 0x1B/255, 0x3D/255],
          uEdgeColor: [0x4/255, 0x0F/255, 0x2C/255],
          modelViewProjection: matrix,
        });
    },
};

}
