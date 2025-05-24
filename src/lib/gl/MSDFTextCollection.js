import {defineProgram, InstancedAttribute, GLCollection} from 'w-gl';
import {vec4} from 'gl-matrix';

export default class MSDFTextCollection extends GLCollection {
  constructor(gl, options = {}) {
    gl.getExtension('OES_standard_derivatives');

    super(getTextProgram(gl, options));

    let img = (this.msdfImage = new Image());
    img.crossOrigin = 'Anonymous';
    this.isReady = false;
    this.queue = [];
    this.fontSize = options.fontSize || 14;
    this.fontInfo = null;

    let fontPath = 'fonts';
    fetch(`${fontPath}/Roboto.json`, { mode: 'cors' })
      .then((x) => x.json())
      .then((fontInfo) => {
        this.fontInfo = fontInfo;
        this.alphabet = new Map();
        fontInfo.chars.forEach((char) => {
          let charValue = String.fromCharCode(char.id);
          this.alphabet.set(charValue, char);
        });

        this.msdfImage.onload = () => {
          this._sdfTextureChanged = true;
          this.program.setTextureCanvas('msdf', this.msdfImage);
          this.isReady = true;
          this.sdfTextureWidth = img.width;
          this.sdfTextureHeight = img.height;

          this.queue.forEach((q) => this.addText(q));
          this.queue = [];
        };
        this.msdfImage.src = `${fontPath}/Roboto0.png`;
      });
  }

  clear() {
    this.program.setCount(0);
    if (this.queue.length > 0) {
      this.queue = [];
    }
  }

  draw(/* gl, drawContext */) {
    if (!this.uniforms) {
      this.uniforms = {
        modelViewProjection: this.modelViewProjection,
        color: [0.9, 0.9, 0.9, 1.0],
        bias: 0.5,
      };
    }

    this.uniforms.color[0] = 0.2;
    this.uniforms.color[1] = 0.4;
    this.uniforms.color[2] = 0.8;
    this.uniforms.color[3] = 0.8;
    this.uniforms.bias = 0.35;
    this.program.draw(this.uniforms);

    this.uniforms.color[0] = 0.9;
    this.uniforms.color[1] = 0.9;
    this.uniforms.color[2] = 0.9;
    this.uniforms.color[3] = 1;
    this.uniforms.bias = 0.5;
    this.program.draw(this.uniforms);
  }

  addText(textInfo) {
    if (!this.isReady) {
      this.queue.push(textInfo);
      return;
    }
    let { text, x = 0, y = 0, z = 0 } = textInfo;
    if (text === undefined) {
      throw new Error('Text is not defined in ' + textInfo)
    }

    let desiredScreenHeight = textInfo.fontSize || this.fontSize;
    let currentWorldFontSize = desiredScreenHeight; // Default to desiredScreenHeight

    let totalXAdvance = 0;
    if (this.fontInfo && this.fontInfo.chars) {
      for (let char of text) {
        let sdfPos = this.alphabet.get(char);
        if (!sdfPos) continue;
        totalXAdvance += sdfPos.xadvance;
      }
    }
    // Avoid division by zero later. If text is empty or all chars are missing/zero-width.
    if (totalXAdvance === 0 && this.fontInfo && this.fontInfo.info && this.fontInfo.info.size > 0) {
        totalXAdvance = this.fontInfo.info.size; // Use a nominal value like font size
    } else if (totalXAdvance === 0) {
        totalXAdvance = 1; // Absolute fallback
    }

    const dc = this.scene.getDrawContext();
    const pMat = dc.projection;

    // Use the provided x, y, z as the local anchor point for the text
    let textAnchorClip = [0, 0, 0, 1];
    vec4.transformMat4(textAnchorClip, [x, y, z, 1.0], this.modelViewProjection);
    
    let wClip = textAnchorClip[3];

    if (Math.abs(wClip) < 1e-6) { // Avoid division by zero or very small w
      wClip = (wClip < 0 ? -1e-6 : 1e-6);
    }

    // Projection matrix P's element P[1][1] (or pMat[5] in gl-matrix's flat array) 
    // relates to how Y in view space maps to Y in clip space.
    // Clip space Y ranges from -1 to 1. Viewport height maps this to pixel height.
    // So, screenPixelHeight = (clipY * 0.5 + 0.5) * viewportHeight
    // And clipY = worldY * P[1][1] / wClip (simplified, ignoring other terms for height scaling)
    // We want worldHeightAtUnitClipDistance = desiredScreenHeight / (0.5 * P[1][1] * viewportHeight)
    // Then, currentWorldFontSize = worldHeightAtUnitClipDistance * wClip
    let projYScale = pMat[5]; 
    if (Math.abs(projYScale) < 1e-6) projYScale = 1e-6; // Avoid division by zero

    let viewportHeight = dc.height; // dc.height is already in pixels

    // This is the size in world units that would make the text `desiredScreenHeight` pixels tall
    // if the text was at a distance from the camera where its wClip coordinate is 1.
    // We then scale this by the actual wClip of the text's anchor.
    currentWorldFontSize = (desiredScreenHeight * wClip) / (projYScale * 0.5 * viewportHeight);

    let scale = 0;
    if (this.fontInfo && this.fontInfo.info && this.fontInfo.info.size > 0) {
      scale = currentWorldFontSize / this.fontInfo.info.size;
    }

    let dx = 0;
    if (textInfo.cx !== undefined) {
      dx -= totalXAdvance * textInfo.cx * scale;
    }

    const rectAnchorX = textInfo.x === undefined ? 0 : textInfo.x;
    const rectAnchorY = textInfo.y === undefined ? 0 : textInfo.y;
    const rectAnchorZ = textInfo.z === undefined ? 0 : textInfo.z;

    const rectWidth = totalXAdvance * scale;
    const rectHeight = currentWorldFontSize;
    const alignY = textInfo.cy === undefined ? 0 : textInfo.cy;

    const occupiedRectangle = {
      x: rectAnchorX + dx, // Left edge
      y: rectAnchorY - rectHeight * alignY, // Bottom edge
      width: rectWidth,
      height: rectHeight,
      z: rectAnchorZ
    };

    if (textInfo.cy !== undefined) {
      // y is modified here for baseline calculation for rendering individual characters
      y += currentWorldFontSize * textInfo.cy;
    }

    for (let char of text) {
      let sdfPos = this.alphabet.get(char);
      if (!sdfPos) {
        console.error(char + ' is missing in the font');
        continue;
      }

      this.add({
        position: [x + dx, y - sdfPos.yoffset * scale, z],
        charSize: [
          scale * sdfPos.width, // Use scaled width directly
          -scale * sdfPos.height, // Use scaled height directly
        ],
        texturePosition: [
          sdfPos.x / this.sdfTextureWidth,
          1 - sdfPos.y / this.sdfTextureHeight,
          sdfPos.width / this.sdfTextureWidth,
          -sdfPos.height / this.sdfTextureHeight,
        ],
      });
      dx += sdfPos.xadvance * scale;
    }
    if (this.scene) this.scene.renderFrame();
    console.log('MSDFTextCollection: addText: ', text, ' at ', x, y, z, 'font size: ', currentWorldFontSize, 'scale: ', scale, 'dx: ', dx, 'totalXAdvance: ', totalXAdvance);
  }
}

function getTextProgram(gl, options) {
  return defineProgram({
    capacity: options.capacity || 1,
    buffer: options.buffer,
    debug: options.debug,
    gl,
    vertex: `
  uniform mat4 modelViewProjection;
  uniform vec4 color;

  // Position of the text character:
  attribute vec3 position;
  // Instanced quad coordinate:
  attribute vec2 point;
  attribute vec2 charSize;
  // [x, y, w, h] - of the character in the msdf texture;
  attribute vec4 texturePosition;

  varying vec2 vPoint;

  void main() {
    gl_Position = modelViewProjection * vec4(
      position + vec3(
        vec2(point.x, point.y) * charSize,
        position.z),
      1.);
    vPoint = texturePosition.xy + point * texturePosition.zw;
  }`,

    fragment: `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
  precision highp float;
  varying vec2 vPoint;

  uniform vec4 color;
  uniform float bias;
  uniform sampler2D msdf;

  float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
  }

  void main() {
    vec3 sample = texture2D(msdf, vPoint).rgb;
    float sigDist = median(sample.r, sample.g, sample.b) - bias;
    float alpha = clamp(sigDist / fwidth(sigDist) + bias, 0.0, 1.0);
    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }`,
    instanced: {
      point: new InstancedAttribute([0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1]),
    },
  });
}