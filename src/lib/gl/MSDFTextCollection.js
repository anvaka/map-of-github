import { defineProgram, InstancedAttribute, GLCollection } from 'w-gl';
import { vec4 } from 'gl-matrix';

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
    this.onReadyCallback = options.onReady; // Store the callback

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

          if (this.onReadyCallback) {
            this.onReadyCallback(); // Invoke the callback
          }
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
    if (textInfo.text === undefined) {
      throw new Error('Text is not defined in ' + textInfo)
    }

    const layout = this._calculateTextLayout(textInfo);
    if (layout.error) {
      console.error("Error calculating text layout for addText:", layout.error);
      return;
    }

    for (const detail of layout.charDetailsList) {
      const sdfPos = detail.sdfPos;
      this.add({
        position: [detail.worldX, detail.worldY, detail.worldZ],
        charSize: [
          detail.scaledWidth,
          -detail.scaledHeight,
        ],
        texturePosition: [
          sdfPos.x / this.sdfTextureWidth,
          1 - sdfPos.y / this.sdfTextureHeight,
          sdfPos.width / this.sdfTextureWidth,
          -sdfPos.height / this.sdfTextureHeight,
        ],
      });
    }

    if (this.scene) this.scene.renderFrame();
  }

  measureText(textInfo) {
    if (!this.isReady && (!this.fontInfo || !this.alphabet)) {
      // Attempt to provide a best-effort measurement if critical font info is missing
      const fallbackSize = textInfo.fontSize || this.fontSize;
      const estimatedCharWidth = fallbackSize * 0.6; // Rough estimate
      const textLength = textInfo.text ? textInfo.text.length : 0;
      return {
        x: textInfo.x || 0, y: textInfo.y || 0, 
        width: textLength * estimatedCharWidth, // Estimated width
        height: fallbackSize, // Estimated height
        scale: 0, currentWorldFontSize: fallbackSize
      };
    }
    if (textInfo.text === undefined) {
      return { x: textInfo.x || 0, y: textInfo.y || 0, width: 0, height: 0, scale: 0, currentWorldFontSize: textInfo.fontSize || this.fontSize, error: "Text not defined" };
    }

    const layout = this._calculateTextLayout(textInfo);
    if (layout.error && layout.error !== "Font info not fully available") { // Allow "Font info not fully available" if isReady was false but some info existed
      console.error("Error measuring text:", layout.error);
      return { x: textInfo.x || 0, y: textInfo.y || 0, width: 0, height: 0, scale: layout.scale || 0, currentWorldFontSize: layout.currentWorldFontSize || (textInfo.fontSize || this.fontSize) };
    }

    let measuredHeight = 0;
    if (layout.charDetailsList.length > 0) {
      measuredHeight = layout.maxWorldY - layout.minWorldY;
    } else if (textInfo.text && textInfo.text.length > 0 && layout.scale > 0 && this.fontInfo && this.fontInfo.common) {
      // Estimate height based on font common line height if no chars were processed but text exists
      // This is a rough fallback.
      measuredHeight = this.fontInfo.common.lineHeight * layout.scale;
      // Adjust y based on cy if specified
      let tempY = textInfo.y || 0;
      if (textInfo.cy !== undefined) {
        tempY += layout.currentWorldFontSize * textInfo.cy;
        // Assuming cy is for baseline, and we want bounding box y
        // This part is tricky without actual character metrics.
        // For simplicity, if cy is 0.5 (center), y could be tempY - measuredHeight/2
      }
      return {
        x: layout.startX,
        y: tempY - measuredHeight, // A very rough estimate for y if using lineheight
        width: layout.overallWidth,
        height: measuredHeight,
        scale: layout.scale,
        currentWorldFontSize: layout.currentWorldFontSize
      };
    }


    return {
      x: layout.startX,
      y: layout.minWorldY,
      width: layout.overallWidth,
      height: measuredHeight,
      scale: layout.scale,
      currentWorldFontSize: layout.currentWorldFontSize
    };
  }

  _calculateTextLayout(textInfo) {
    if (!this.fontInfo || !this.fontInfo.chars || !this.alphabet) {
      return {
        charDetailsList: [], overallWidth: 0, minWorldY: textInfo.y || 0, maxWorldY: textInfo.y || 0,
        startX: textInfo.x || 0, scale: 0, currentWorldFontSize: textInfo.fontSize || this.fontSize,
        error: "Font info not fully available"
      };
    }

    let { text, x = 0, y = 0, z = 0 } = textInfo;
    if (text === undefined || text === null) {
      return { /* ... error structure ... */ error: "Text not defined", charDetailsList: [], overallWidth: 0, minWorldY: y, maxWorldY: y, startX: x, scale: 0, currentWorldFontSize: textInfo.fontSize || this.fontSize };
    }

    let desiredScreenHeight = textInfo.fontSize || this.fontSize;
    let currentWorldFontSize = desiredScreenHeight; // Default

    let totalXAdvance = 0;
    for (let char of text) {
      let sdfPos = this.alphabet.get(char);
      if (!sdfPos) continue;
      totalXAdvance += sdfPos.xadvance;
    }

    if (totalXAdvance === 0) {
      if (this.fontInfo.info && this.fontInfo.info.size > 0) {
        totalXAdvance = this.fontInfo.info.size; // Nominal value if text is empty or chars have no advance
      } else {
        totalXAdvance = 1; // Absolute fallback
      }
    }

    let scale = 0;
    // Projection-dependent font size calculation
    const dc = this.scene.getDrawContext();
    const pMat = dc.projection;
    let textAnchorClip = [0, 0, 0, 1];
    vec4.transformMat4(textAnchorClip, [x, y, z, 1.0], this.modelViewProjection);

    let wClip = textAnchorClip[3];
    if (Math.abs(wClip) < 1e-6) { wClip = (wClip < 0 ? -1e-6 : 1e-6); }

    let projYScale = pMat[5];
    if (Math.abs(projYScale) < 1e-6) projYScale = 1e-6;

    let viewportHeight = dc.height;
    const dpr = window.devicePixelRatio || 1;
    currentWorldFontSize = (desiredScreenHeight * dpr * wClip) / (projYScale * 0.5 * viewportHeight);

    if (this.fontInfo.info && this.fontInfo.info.size > 0) {
      scale = currentWorldFontSize / this.fontInfo.info.size;
    } else {
      scale = 0; // Fallback if font size info is missing
    }

    let offsetX = 0;
    if (textInfo.cx !== undefined) {
      offsetX -= totalXAdvance * textInfo.cx * scale;
    }

    let effectiveBaselineY = y;
    if (textInfo.cy !== undefined) {
      effectiveBaselineY += currentWorldFontSize * textInfo.cy;
    }

    const charDetailsList = [];
    let currentRelativeX = offsetX;
    let minWorldY = Infinity;
    let maxWorldY = -Infinity;
    let actualStartX = x + offsetX; // Default start X if no chars
    let firstCharProcessed = false;

    if (text && text.length > 0) {
      for (let char of text) {
        let sdfPos = this.alphabet.get(char);
        if (!sdfPos) {
          // console.error(char + ' is missing in the font'); // Optional: log missing char
          continue;
        }

        if (!firstCharProcessed) {
          actualStartX = x + currentRelativeX;
          firstCharProcessed = true;
        }

        const charScaledWidth = sdfPos.width * scale;
        const charScaledHeight = sdfPos.height * scale;
        const charScaledYOffset = sdfPos.yoffset * scale;
        const charScaledXAdvance = sdfPos.xadvance * scale;

        const finalCharX = x + currentRelativeX; // World X for this char quad's origin
        const finalCharY = effectiveBaselineY - charScaledYOffset; // World Y for the top of the character

        charDetailsList.push({
          char: char,
          sdfPos: sdfPos,
          worldX: finalCharX,
          worldY: finalCharY,
          worldZ: z,
          scaledWidth: charScaledWidth,
          scaledHeight: charScaledHeight, // Positive height
        });

        minWorldY = Math.min(minWorldY, finalCharY - charScaledHeight); // Bottom of char
        maxWorldY = Math.max(maxWorldY, finalCharY); // Top of char

        currentRelativeX += charScaledXAdvance;
      }
    }

    if (charDetailsList.length === 0) { // If text was empty or all chars missing
      minWorldY = effectiveBaselineY;
      maxWorldY = effectiveBaselineY;
      // actualStartX is already x + offsetX
    }

    const overallWidth = currentRelativeX - offsetX;

    return {
      charDetailsList,
      overallWidth,
      minWorldY,
      maxWorldY,
      startX: actualStartX,
      scale,
      currentWorldFontSize
    };
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