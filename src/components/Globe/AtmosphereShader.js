/**
 * AtmosphereShader.js
 * Custom GLSL shaders for photorealistic Earth atmosphere.
 * Produces a bright cyan/blue limb glow matching the reference image.
 */

// Strong cyan atmospheric rim — matches image 1's bright edge glow
export const AtmosphereShader = {
  uniforms: {
    atmosphereColor: { value: null },
    coefficient:     { value: 0.8 },
    power:           { value: 3.2 },
    opacity:         { value: 1.0 },
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal   = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform vec3  atmosphereColor;
    uniform float coefficient;
    uniform float power;
    uniform float opacity;
    varying vec3  vNormal;
    varying vec3  vPosition;
    void main() {
      vec3  viewDir  = normalize(-vPosition);
      float rim      = 1.0 - max(dot(vNormal, viewDir), 0.0);
      float intensity = coefficient * pow(rim, power);
      intensity = clamp(intensity, 0.0, 1.0);
      gl_FragColor = vec4(atmosphereColor * intensity, intensity * opacity);
    }
  `,
}

// Outer deep-blue halo (backside glow, much larger and softer)
export const HaloShader = {
  uniforms: {
    innerColor: { value: null },
    outerColor: { value: null },
    power:      { value: 6.0 },
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal   = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform vec3  innerColor;
    uniform vec3  outerColor;
    uniform float power;
    varying vec3  vNormal;
    varying vec3  vPosition;
    void main() {
      vec3  viewDir = normalize(-vPosition);
      float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
      float intensity = pow(rim, power);
      intensity = clamp(intensity, 0.0, 1.0);
      vec3 col = mix(innerColor, outerColor, rim);
      gl_FragColor = vec4(col * intensity, intensity * 0.9);
    }
  `,
}
