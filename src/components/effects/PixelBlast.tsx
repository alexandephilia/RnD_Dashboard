"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './PixelBlast.css';

type PixelBlastVariant = 'square' | 'circle' | 'triangle' | 'diamond';

type PixelBlastProps = {
    variant?: PixelBlastVariant;
    pixelSize?: number;
    color?: string;
    antialias?: boolean;
    patternScale?: number;
    patternDensity?: number;
    pixelSizeJitter?: number;
    enableRipples?: boolean;
    rippleIntensityScale?: number;
    rippleThickness?: number;
    rippleSpeed?: number;
    speed?: number;
    edgeFade?: number;
    liquid?: boolean;
    liquidStrength?: number;
    liquidRadius?: number;
    liquidWobbleSpeed?: number;
    wave?: boolean;
    waveStrength?: number;
    waveFrequency?: number;
    transparent?: boolean;
    className?: string;
    style?: React.CSSProperties;
    // New props for layout awareness
    respectLayout?: boolean;
    targetSelector?: string;
};

const SHAPE_MAP: Record<PixelBlastVariant, number> = {
    square: 0,
    circle: 1,
    triangle: 2,
    diamond: 3,
};

const MAX_CLICKS = 10;

const PixelBlast: React.FC<PixelBlastProps> = ({
    variant = 'square',
    pixelSize = 3,
    color = '#facc15',
    antialias = true,
    patternScale = 2,
    patternDensity = 1,
    pixelSizeJitter = 0,
    enableRipples = true,
    rippleIntensityScale = 1,
    rippleThickness = 0.1,
    rippleSpeed = 0.3,
    speed = 0.5,
    edgeFade = 0.5,
    liquid = false,
    liquidStrength = 0.08,
    liquidRadius = 1.2,
    liquidWobbleSpeed = 4.5,
    wave = false,
    waveStrength = 20,
    waveFrequency = 0.03,
    transparent = false,
    className,
    style,
    respectLayout = true,
    targetSelector = '[data-pixelblast-target="true"]',
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        renderer: any;
        scene: any;
        camera: any;
        material: any;
        uniforms: any;
        touchTexture?: any;
        raf: number;
    } | null>(null);

    // Touch/Mouse Trail Texture for Liquid Effect
    const createTouchTexture = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        ctx.fillStyle = 'rgba(127, 127, 0, 1)';
        ctx.fillRect(0, 0, size, size);

        const texture = new (THREE as any).Texture(canvas);
        texture.minFilter = (THREE as any).LinearFilter;
        texture.magFilter = (THREE as any).LinearFilter;
        texture.generateMipmaps = false;

        const trail: any[] = [];
        let last: any = null;
        const maxAge = 80;
        let radius = 0.12 * size;
        const speed = 1 / maxAge;

        const clear = () => {
            ctx.fillStyle = 'rgba(127, 127, 0, 1)';
            ctx.fillRect(0, 0, size, size);
        };

        const easeOutSine = (t: number) => {
            return Math.sin((t * Math.PI) / 2);
        };

        const easeOutQuad = (t: number) => {
            return -t * (t - 2);
        };

        const drawPoint = (p: any) => {
            const pos = { x: p.x * size, y: (1 - p.y) * size };
            let intensity = 1;

            if (p.age < maxAge * 0.3) {
                intensity = easeOutSine(p.age / (maxAge * 0.3));
            } else {
                intensity = easeOutQuad(1 - (p.age - maxAge * 0.3) / (maxAge * 0.7)) || 0;
            }
            intensity *= p.force;

            const r = Math.floor(((p.vx + 1) / 2) * 255);
            const g = Math.floor(((p.vy + 1) / 2) * 255);
            const b = Math.floor(intensity * 255);

            const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * (0.5 + intensity * 0.5));
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensity * 0.6})`);
            gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${intensity * 0.3})`);
            gradient.addColorStop(1, `rgba(127, 127, 0, 0)`);

            ctx.beginPath();
            ctx.fillStyle = gradient;
            ctx.arc(pos.x, pos.y, radius * (0.5 + intensity * 0.5), 0, Math.PI * 2);
            ctx.fill();
        };

        const addTouch = (norm: { x: number; y: number }) => {
            let force = 0;
            let vx = 0;
            let vy = 0;

            if (last) {
                const dx = norm.x - last.x;
                const dy = norm.y - last.y;
                if (dx === 0 && dy === 0) return;
                const dd = dx * dx + dy * dy;
                const d = Math.sqrt(dd);
                vx = dx / (d || 1);
                vy = dy / (d || 1);
                force = Math.min(dd * 8000, 1);
            }

            last = { x: norm.x, y: norm.y };
            trail.push({ x: norm.x, y: norm.y, age: 0, force, vx, vy });
        };

        const update = () => {
            clear();

            for (let i = trail.length - 1; i >= 0; i--) {
                const point = trail[i];
                const f = point.force * speed * (1 - point.age / maxAge);
                point.x += point.vx * f * 0.5;
                point.y += point.vy * f * 0.5;
                point.age++;
                if (point.age > maxAge) {
                    trail.splice(i, 1);
                }
            }

            for (let i = 0; i < trail.length; i++) {
                drawPoint(trail[i]);
            }

            texture.needsUpdate = true;
        };

        const setRadiusScale = (v: number) => {
            radius = 0.12 * size * v;
        };

        const reset = () => {
            last = null;
        };

        return {
            canvas,
            texture,
            addTouch,
            update,
            setRadiusScale,
            reset,
            size
        };
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // Check for Three.js
        if (typeof THREE === 'undefined') {
            console.error('Three.js is not loaded');
            return;
        }

        // Get viewport size
        const getViewportSize = () => {
            if (window.visualViewport) {
                return {
                    width: window.visualViewport.width,
                    height: window.visualViewport.height
                };
            }
            return {
                width: window.innerWidth,
                height: window.innerHeight
            };
        };

        // Convert hex to RGB
        const hexToRGB = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16) / 255,
                g: parseInt(result[2], 16) / 255,
                b: parseInt(result[3], 16) / 255
            } : { r: 0.98, g: 0.8, b: 0.08 };
        };

        // Create canvas
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);

        // Get WebGL2 context
        const gl = canvas.getContext('webgl2', { antialias, alpha: transparent });
        if (!gl) {
            console.error('WebGL2 not supported');
            return;
        }

        // Create renderer
        const renderer = new (THREE as any).WebGLRenderer({
            canvas: canvas,
            context: gl,
            antialias,
            alpha: transparent
        });

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(dpr);

        // Create scene and camera
        const scene = new (THREE as any).Scene();
        const camera = new (THREE as any).OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Create touch texture for liquid effect
        let touchTexture: any = null;
        if (liquid || wave) {
            touchTexture = createTouchTexture();
            if (touchTexture) {
                touchTexture.setRadiusScale(liquidRadius);
            }
        }

        // Click positions array
        const clickPosArray: any[] = [];
        for (let i = 0; i < MAX_CLICKS; i++) {
            clickPosArray.push(new (THREE as any).Vector2(-1, -1));
        }

        // Convert color
        const rgb = hexToRGB(color);

        // Vertex shader
        const VERTEX_SRC = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

        // Fragment shader
        const FRAGMENT_SRC = `
      precision highp float;

      uniform vec3  uColor;
      uniform vec2  uResolution;
      uniform float uTime;
      uniform float uPixelSize;
      uniform float uScale;
      uniform float uDensity;
      uniform float uPixelJitter;
      uniform int   uEnableRipples;
      uniform float uRippleSpeed;
      uniform float uRippleThickness;
      uniform float uRippleIntensity;
      uniform float uEdgeFade;
      uniform int   uShapeType;

      // Cursor effect uniforms
      uniform sampler2D uTouchTexture;
      uniform float uLiquidStrength;
      uniform float uLiquidWobble;
      uniform vec2 uMousePos;
      uniform float uMouseRadius;
      uniform float uWaveStrength;
      uniform float uWaveFrequency;
      uniform int uEffectLiquid;
      uniform int uEffectWave;

      const int SHAPE_SQUARE   = 0;
      const int SHAPE_CIRCLE   = 1;
      const int SHAPE_TRIANGLE = 2;
      const int SHAPE_DIAMOND  = 3;

      const int MAX_CLICKS = 10;
      uniform vec2  uClickPos[MAX_CLICKS];
      uniform float uClickTimes[MAX_CLICKS];

      varying vec2 vUv;

      float Bayer2(vec2 a) {
        a = floor(a);
        return fract(a.x / 2. + a.y * a.y * .75);
      }
      #define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
      #define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

      float hash11(float n){ return fract(sin(n)*43758.5453); }

      float vnoise(vec3 p){
        vec3 ip = floor(p);
        vec3 fp = fract(p);
        float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
        float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
        float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
        float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
        float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
        float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
        float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
        float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
        vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
        float x00 = mix(n000, n100, w.x);
        float x10 = mix(n010, n110, w.x);
        float x01 = mix(n001, n101, w.x);
        float x11 = mix(n011, n111, w.x);
        float y0  = mix(x00, x10, w.y);
        float y1  = mix(x01, x11, w.y);
        return mix(y0, y1, w.z) * 2.0 - 1.0;
      }

      float fbm2(vec2 uv, float t){
        vec3 p = vec3(uv * uScale, t);
        float amp = 1.0;
        float freq = 1.0;
        float sum = 1.0;
        for (int i = 0; i < 5; ++i){
          sum  += amp * vnoise(p * freq);
          freq *= 1.25;
          amp  *= 1.0;
        }
        return sum * 0.5 + 0.5;
      }

      float maskCircle(vec2 p, float cov){
        float r = sqrt(cov) * .25;
        float d = length(p - 0.5) - r;
        float aa = 0.5 * fwidth(d);
        return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
      }

      float maskTriangle(vec2 p, vec2 id, float cov){
        bool flip = mod(id.x + id.y, 2.0) > 0.5;
        if (flip) p.x = 1.0 - p.x;
        float r = sqrt(cov);
        float d  = p.y - r*(1.0 - p.x);
        float aa = fwidth(d);
        return cov * clamp(0.5 - d/aa, 0.0, 1.0);
      }

      float maskDiamond(vec2 p, float cov){
        float r = sqrt(cov) * 0.564;
        return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
      }

      void main(){
        vec2 baseFragCoord = gl_FragCoord.xy;
        vec2 distortOffset = vec2(0.0);
        float radius = uMouseRadius * min(uResolution.x, uResolution.y);

        // ========== EFFECT: LIQUID (additive) ==========
        if (uEffectLiquid == 1) {
          vec4 touchData = texture2D(uTouchTexture, vUv);
          float vx = touchData.r * 2.0 - 1.0;
          float vy = touchData.g * 2.0 - 1.0;
          float intensity = touchData.b;
          float wobble = 0.5 + 0.5 * sin(uTime * uLiquidWobble + intensity * 6.2831853);
          float liquidAmt = uLiquidStrength * intensity * wobble;
          distortOffset += vec2(vx, vy) * liquidAmt * uResolution;
        }

        // ========== EFFECT: WAVE (additive) ==========
        if (uEffectWave == 1 && uMousePos.x >= 0.0) {
          vec2 toMouse = uMousePos - baseFragCoord;
          float dist = length(toMouse);
          float waveRadius = radius * 2.0;
          if (dist < waveRadius) {
            float strength = 1.0 - dist / waveRadius;
            strength = strength * strength;
            float waveX = sin(baseFragCoord.y * uWaveFrequency + uTime * 4.0) * strength * uWaveStrength;
            float waveY = sin(baseFragCoord.x * uWaveFrequency + uTime * 3.5) * strength * uWaveStrength;
            distortOffset += vec2(waveX, waveY);
          }
        }

        // Apply distortion
        vec2 fragCoord = baseFragCoord + distortOffset - uResolution * 0.5;

        float pixelSize = uPixelSize;
        float aspectRatio = uResolution.x / uResolution.y;

        vec2 pixelId = floor(fragCoord / pixelSize);
        vec2 pixelUV = fract(fragCoord / pixelSize);

        float cellPixelSize = 8.0 * pixelSize;
        vec2 cellId = floor(fragCoord / cellPixelSize);
        vec2 cellCoord = cellId * cellPixelSize;
        vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

        float base = fbm2(uv, uTime * 0.05);
        base = base * 0.5 - 0.65;

        float feed = base + (uDensity - 0.5) * 0.3;

        float speed     = uRippleSpeed;
        float thickness = uRippleThickness;
        const float dampT     = 1.0;
        const float dampR     = 10.0;

        if (uEnableRipples == 1) {
          for (int i = 0; i < MAX_CLICKS; ++i){
            vec2 pos = uClickPos[i];
            if (pos.x < 0.0) continue;
            float cellPixelSize = 8.0 * pixelSize;
            vec2 cuv = (((pos - uResolution * .5 - cellPixelSize * .5) / (uResolution))) * vec2(aspectRatio, 1.0);
            float t = max(uTime - uClickTimes[i], 0.0);
            float r = distance(uv, cuv);
            float waveR = speed * t;
            float ring  = exp(-pow((r - waveR) / thickness, 2.0));
            float atten = exp(-dampT * t) * exp(-dampR * r);
            feed = max(feed, ring * atten * uRippleIntensity);
          }
        }

        float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
        float bw = step(0.5, feed + bayer);

        float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
        float jitterScale = 1.0 + (h - 0.5) * uPixelJitter;
        float coverage = bw * jitterScale;
        float M;
        if      (uShapeType == SHAPE_CIRCLE)   M = maskCircle (pixelUV, coverage);
        else if (uShapeType == SHAPE_TRIANGLE) M = maskTriangle(pixelUV, pixelId, coverage);
        else if (uShapeType == SHAPE_DIAMOND)  M = maskDiamond(pixelUV, coverage);
        else                                   M = coverage;

        if (uEdgeFade > 0.0) {
          vec2 norm = gl_FragCoord.xy / uResolution;
          float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
          float fade = smoothstep(0.0, uEdgeFade, edge);
          M *= fade;
        }

        vec3 color = uColor;
        gl_FragColor = vec4(color, M);
      }
    `;

        // Create uniforms
        const uniforms = {
            uResolution: { value: new (THREE as any).Vector2(0, 0) },
            uTime: { value: 0 },
            uColor: { value: new (THREE as any).Vector3(rgb.r, rgb.g, rgb.b) },
            uClickPos: { value: clickPosArray },
            uClickTimes: { value: new Float32Array(MAX_CLICKS) },
            uShapeType: { value: SHAPE_MAP[variant] },
            uPixelSize: { value: pixelSize * dpr },
            uScale: { value: patternScale },
            uDensity: { value: patternDensity },
            uPixelJitter: { value: pixelSizeJitter },
            uEnableRipples: { value: enableRipples ? 1 : 0 },
            uRippleSpeed: { value: rippleSpeed },
            uRippleThickness: { value: rippleThickness },
            uRippleIntensity: { value: rippleIntensityScale },
            uEdgeFade: { value: edgeFade },
            // Cursor effect uniforms
            uTouchTexture: { value: touchTexture?.texture || null },
            uLiquidStrength: { value: liquidStrength },
            uLiquidWobble: { value: liquidWobbleSpeed },
            uMousePos: { value: new (THREE as any).Vector2(-1, -1) },
            uMouseRadius: { value: 0.25 },
            uWaveStrength: { value: waveStrength },
            uWaveFrequency: { value: waveFrequency },
            uEffectLiquid: { value: liquid ? 1 : 0 },
            uEffectWave: { value: wave ? 1 : 0 }
        };

        // Create material
        const material = new (THREE as any).ShaderMaterial({
            vertexShader: VERTEX_SRC,
            fragmentShader: FRAGMENT_SRC,
            uniforms: uniforms,
            transparent: transparent,
            depthTest: false,
            depthWrite: false
        });

        // Create geometry and mesh
        const geometry = new (THREE as any).PlaneGeometry(2, 2);
        const quad = new (THREE as any).Mesh(geometry, material);
        scene.add(quad);

        // Animation variables
        const clock = new (THREE as any).Clock();
        const timeOffset = Math.random() * 1000;
        let clickIndex = 0;
        let raf = 0;
        let isVisible = true;

        // Set size function with layout awareness
        const getSize = () => {
            if (respectLayout) {
                // Try to find the target element
                const targetElement = document.querySelector(targetSelector) as HTMLElement;
                if (targetElement) {
                    const rect = targetElement.getBoundingClientRect();
                    return {
                        width: rect.width,
                        height: rect.height,
                        left: rect.left,
                        top: rect.top
                    };
                }
            }

            // Fallback to viewport
            const viewport = getViewportSize();
            return {
                width: viewport.width,
                height: viewport.height,
                left: 0,
                top: 0
            };
        };

        const setSize = () => {
            const size = getSize();
            const w = size.width;
            const h = size.height;

            renderer.setSize(w, h, false);
            uniforms.uResolution.value.set(canvas.width, canvas.height);
            uniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio();

            // Position canvas correctly
            canvas.style.position = 'absolute';
            canvas.style.left = `${size.left}px`;
            canvas.style.top = `${size.top}px`;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
        };

        // Map to pixels function
        const mapToPixels = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const fx = (e.clientX - rect.left) * scaleX;
            const fy = (rect.height - (e.clientY - rect.top)) * scaleY;
            return {
                fx,
                fy,
                normX: (e.clientX - rect.left) / rect.width,
                normY: (e.clientY - rect.top) / rect.height
            };
        };

        // Event handlers
        const onPointerDown = (e: PointerEvent) => {
            const { fx, fy } = mapToPixels(e);
            uniforms.uClickPos.value[clickIndex].set(fx, fy);
            uniforms.uClickTimes.value[clickIndex] = uniforms.uTime.value;
            clickIndex = (clickIndex + 1) % MAX_CLICKS;
            console.log('Pointer down at:', fx, fy);
        };

        const onPointerMove = (e: PointerEvent) => {
            const { fx, fy, normX, normY } = mapToPixels(e);

            // Update mouse position for all effects
            uniforms.uMousePos.value.set(fx, fy);

            // Update touch texture when liquid effect is active
            if (touchTexture && (liquid || wave)) {
                touchTexture.addTouch({ x: normX, y: 1 - normY });
            }

            // Debug logging
            if (Math.random() < 0.1) { // Log 10% of moves to avoid spam
                console.log('Pointer move at:', fx, fy, 'Effects:', { liquid, wave });
            }
        };

        const onPointerLeave = () => {
            uniforms.uMousePos.value.set(-1, -1);
            if (touchTexture) {
                touchTexture.reset();
            }
            console.log('Pointer left canvas');
        };

        // Animation loop
        const animate = () => {
            raf = requestAnimationFrame(animate);

            if (!isVisible) return;

            uniforms.uTime.value = timeOffset + clock.getElapsedTime() * speed;

            // Update touch texture for liquid/wave effects
            if (touchTexture && (liquid || wave)) {
                touchTexture.update();
            }

            renderer.render(scene, camera);
        };

        // Initialize
        setSize();
        requestAnimationFrame(setSize);
        animate();

        // Store event handlers for cleanup
        const handleWindowPointerMove = (e: PointerEvent) => {
            if (!respectLayout) {
                onPointerMove(e);
                return;
            }

            // Check if pointer is within target area
            const targetElement = document.querySelector(targetSelector) as HTMLElement;
            if (targetElement) {
                const rect = targetElement.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    onPointerMove(e);
                }
            }
        };

        const handleWindowPointerDown = (e: PointerEvent) => {
            if (!respectLayout) {
                onPointerDown(e);
                return;
            }

            // Check if pointer is within target area
            const targetElement = document.querySelector(targetSelector) as HTMLElement;
            if (targetElement) {
                const rect = targetElement.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    onPointerDown(e);
                }
            }
        };

        // Add event listeners to canvas
        canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
        canvas.addEventListener('pointermove', onPointerMove, { passive: true });
        canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

        // Also add window-level event listeners as backup
        window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
        window.addEventListener('pointerdown', handleWindowPointerDown, { passive: true });

        window.addEventListener('resize', setSize);
        window.addEventListener('orientationchange', () => setTimeout(setSize, 100));
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', setSize);
        }

        document.addEventListener('visibilitychange', () => {
            isVisible = !document.hidden;
            if (!document.hidden) {
                clock.start();
            }
        });

        // Store scene reference
        sceneRef.current = {
            renderer,
            scene,
            camera,
            material,
            uniforms,
            touchTexture,
            raf
        };

        // Cleanup
        return () => {
            if (raf) {
                cancelAnimationFrame(raf);
            }

            window.removeEventListener('resize', setSize);
            window.removeEventListener('orientationchange', () => setTimeout(setSize, 100));
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', setSize);
            }
            window.removeEventListener('pointermove', handleWindowPointerMove);
            window.removeEventListener('pointerdown', handleWindowPointerDown);
            document.removeEventListener('visibilitychange', () => {
                isVisible = !document.hidden;
                if (!document.hidden) {
                    clock.start();
                }
            });

            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerleave', onPointerLeave);

            if (container.contains(canvas)) {
                container.removeChild(canvas);
            }

            renderer.dispose();
            geometry.dispose();
            material.dispose();
        };
    }, [
        variant,
        pixelSize,
        color,
        antialias,
        patternScale,
        patternDensity,
        pixelSizeJitter,
        enableRipples,
        rippleIntensityScale,
        rippleThickness,
        rippleSpeed,
        speed,
        edgeFade,
        liquid,
        liquidStrength,
        liquidRadius,
        liquidWobbleSpeed,
        wave,
        waveStrength,
        waveFrequency,
        transparent,
        respectLayout,
        targetSelector
    ]);

    return (
        <div
            ref={containerRef}
            className={`pixel-blast-container ${className ?? ''}`}
            style={style}
            aria-label="PixelBlast interactive background"
        />
    );
};

export default PixelBlast;
