import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Minus, Plus, LocateFixed, Pause, Play } from "lucide-react";
import { DISTRICTS } from "./districts";
const position = (lat, lon, r = 1) =>
  new THREE.Vector3(
    r * Math.cos((lat * Math.PI) / 180) * Math.cos((lon * Math.PI) / 180),
    r * Math.sin((lat * Math.PI) / 180),
    -r * Math.cos((lat * Math.PI) / 180) * Math.sin((lon * Math.PI) / 180),
  );

// Extracted from the supplied earlier index page. These public mirrors enhance
// the globe progressively; the local Natural Earth texture stays as the safe fallback.
const EARTH_TEXTURES = {
  day: [
    "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
    "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  ],
  night: [
    "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg",
    "https://unpkg.com/three-globe/example/img/earth-night.jpg",
  ],
  clouds: [
    "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-clouds.png",
    "https://unpkg.com/three-globe/example/img/earth-clouds.png",
  ],
  terrain: [
    "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png",
    "https://unpkg.com/three-globe/example/img/earth-topology.png",
  ],
  water: [
    "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-water.png",
    "https://unpkg.com/three-globe/example/img/earth-water.png",
  ],
};

function loadTexture(urls, color = false) {
  const loader = new THREE.TextureLoader();
  loader.crossOrigin = "anonymous";
  return new Promise((resolve) => {
    const tryUrl = (index) => {
      if (index >= urls.length) return resolve(null);
      loader.load(
        urls[index],
        (texture) => {
          if (color) texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        () => tryUrl(index + 1),
      );
    };
    tryUrl(0);
  });
}
export default function Earth({ district, onSelect }) {
  const host = useRef(null),
    engine = useRef(null),
    select = useRef(onSelect);
  const [status, setStatus] = useState("Preparing Earth…"),
    [rotating, setRotating] = useState(
      () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    const el = host.current;
    const hero = el.closest(".earth-hero") || el;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      queueMicrotask(() =>
        setStatus(
          "3D is unavailable on this device. Select a district below to continue.",
        ),
      );
      return;
    }
    let disposed = false,
      frame,
      target = null,
      clouds = null,
      hasDayTexture = false,
      interacting = false,
      visible = true,
      resumeAt = 0;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const hoverTarget = new THREE.Vector2(),
      hoverOffset = new THREE.Vector2();
    const viewOrbit = new THREE.Spherical();
    const resetHover = () => {
      hoverTarget.set(0, 0);
      hoverOffset.set(0, 0);
    };
    let playing = !motion.matches;
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.copy(position(22.36, 69.87, 2.65));
    // OrbitControls owns the base camera. A second camera adds a bounded visual
    // offset, so pointer following never accumulates into the user's orbit/zoom.
    const displayCamera = camera.clone();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = 1.35;
    controls.maxDistance = 4.4;
    controls.autoRotateSpeed = -0.62;
    controls.autoRotate = playing;
    controls.addEventListener("start", () => {
      target = null;
      interacting = true;
      hoverTarget.copy(hoverOffset);
      controls.autoRotate = false;
    });
    controls.addEventListener("end", () => {
      interacting = false;
      resumeAt = performance.now() + 1200;
    });
    const pause = () => {
      playing = false;
      controls.autoRotate = false;
      // Clear OrbitControls' remaining inertia when the user explicitly pauses.
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = true;
      setRotating(false);
    };
    const motionChanged = () => {
      if (motion.matches) {
        resetHover();
        pause();
      }
    };
    const pointerChanged = () => {
      if (!finePointer.matches) resetHover();
    };
    motion.addEventListener("change", motionChanged);
    finePointer.addEventListener("change", pointerChanged);
    const follow = (event) => {
      if (
        event.pointerType !== "mouse" ||
        !finePointer.matches ||
        motion.matches ||
        !playing ||
        interacting
      )
        return;
      if (event.target.closest("button, a, input, select")) {
        hoverTarget.set(0, 0);
        return;
      }
      const bounds = hero.getBoundingClientRect();
      hoverTarget.set(
        THREE.MathUtils.clamp(
          ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
          -1,
          1,
        ),
        THREE.MathUtils.clamp(
          ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
          -1,
          1,
        ),
      );
    };
    const leave = () => hoverTarget.set(0, 0);
    hero.addEventListener("pointermove", follow, { passive: true });
    hero.addEventListener("pointerleave", leave);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) hoverTarget.set(0, 0);
    });
    visibility.observe(el);
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 64),
      new THREE.MeshPhongMaterial({
        color: 0x385854,
        shininess: 16,
        specular: new THREE.Color("#295b82"),
      }),
    );
    scene.add(globe, new THREE.AmbientLight(0x719bd2, 0.55));
    const sun = new THREE.DirectionalLight(0xfff8ee, 3.2);
    sun.position.copy(position(35, 110, 5));
    const fill = new THREE.DirectionalLight(0x377ad6, 0.5);
    fill.position.set(-4, 1, 3);
    scene.add(sun, fill);
    const rim = new THREE.Mesh(
      new THREE.SphereGeometry(1.025, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader:
          "varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
        fragmentShader:
          "varying vec3 n; varying vec3 v; void main(){float a=pow(1.-abs(dot(n,v)),3.);gl_FragColor=vec4(.22,.68,1.,a*.68);}",
      }),
    );
    scene.add(rim);
    const markers = DISTRICTS.map((d) => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.017, 14, 10),
        new THREE.MeshBasicMaterial({ color: 0xff9559 }),
      );
      marker.position.copy(position(d.lat, d.lon, 1.014));
      marker.userData.id = d.id;
      scene.add(marker);
      return marker;
    });
    const points = [],
      colors = [];
    for (let i = 0; i < 6000; i++) {
      const a = i * 2.399963,
        z = 1 - (2 * (i + 0.5)) / 6000,
        r = Math.sqrt(1 - z * z);
      points.push(9 * r * Math.cos(a), 9 * z, 9 * r * Math.sin(a));
      const brightness = 0.45 + ((i * 73) % 101) / 184;
      colors.push(brightness * 0.83, brightness * 0.93, brightness);
    }
    scene.add(
      new THREE.Points(
        new THREE.BufferGeometry()
          .setAttribute("position", new THREE.Float32BufferAttribute(points, 3))
          .setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)),
        new THREE.PointsMaterial({
          vertexColors: true,
          size: 0.022,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
        }),
      ),
    );
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}ne_110m_land.json`, {
      signal: abort.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (disposed || hasDayTexture) return;
        const canvas = document.createElement("canvas");
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#10272c";
        ctx.fillRect(0, 0, 2048, 1024);
        ctx.strokeStyle = "#203d40";
        ctx.lineWidth = 1;
        for (let lon = -180; lon <= 180; lon += 15) {
          const x = ((lon + 180) / 360) * 2048;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 1024);
          ctx.stroke();
        }
        for (let lat = -75; lat <= 75; lat += 15) {
          const y = ((90 - lat) / 180) * 1024;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(2048, y);
          ctx.stroke();
        }
        ctx.fillStyle = "#6a8d7f";
        ctx.strokeStyle = "#9eb1a0";
        ctx.lineWidth = 1;
        data.features.forEach((f) => {
          const polygons =
            f.geometry.type === "Polygon"
              ? [f.geometry.coordinates]
              : f.geometry.coordinates;
          polygons.forEach((p) => {
            ctx.beginPath();
            p.forEach((ring) => {
              ring.forEach(([lon, lat], i) =>
                ctx[i ? "lineTo" : "moveTo"](
                  ((lon + 180) / 360) * 2048,
                  ((90 - lat) / 180) * 1024,
                ),
              );
              ctx.closePath();
            });
            ctx.fill("evenodd");
            ctx.stroke();
          });
        });
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        globe.material.map = texture;
        globe.material.color.set(0xffffff);
        globe.material.needsUpdate = true;
        setStatus("");
      })
      .catch(() => {
        if (!disposed && !hasDayTexture)
          setStatus(
            "Land detail unavailable. Globe controls and district selection still work.",
          );
      });
    // Apply each map independently so an unavailable optional cloud map cannot
    // hold the realistic Earth behind all five network requests.
    const applyTexture = (key, color, apply) => {
      loadTexture(EARTH_TEXTURES[key], color).then((texture) => {
        if (disposed) {
          texture?.dispose();
          return;
        }
        if (texture) apply(texture);
      });
    };
    applyTexture("day", true, (day) => {
      hasDayTexture = true;
      const material = globe.material;
      material.map?.dispose();
      material.map = day;
      material.color.set(0xffffff);
      material.specular = new THREE.Color("#2d5d92");
      material.shininess = 28;
      material.needsUpdate = true;
      setStatus("");
    });
    applyTexture("terrain", false, (terrain) => {
      globe.material.bumpMap = terrain;
      globe.material.bumpScale = 0.008;
      globe.material.needsUpdate = true;
    });
    applyTexture("water", false, (water) => {
      globe.material.specularMap = water;
      globe.material.needsUpdate = true;
    });
    applyTexture("night", true, (night) => {
      globe.material.emissiveMap = night;
      globe.material.emissive = new THREE.Color("#e7c87b");
      globe.material.emissiveIntensity = 0.45;
      globe.material.needsUpdate = true;
    });
    applyTexture("clouds", true, (cloudMap) => {
      clouds = new THREE.Mesh(
        new THREE.SphereGeometry(1.009, 96, 64),
        new THREE.MeshPhongMaterial({
          map: cloudMap,
          transparent: true,
          opacity: 0.46,
          depthWrite: false,
        }),
      );
      clouds.name = "atmospheric-cloud-layer";
      scene.add(clouds);
    });
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.zoom = Math.min(1, camera.aspect * 0.95);
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let start;
    const down = (e) => {
      start = [e.clientX, e.clientY];
    };
    const up = (e) => {
      if (!start || Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 5)
        return;
      const b = el.getBoundingClientRect();
      pointer.set(
        ((e.clientX - b.left) / b.width) * 2 - 1,
        (-(e.clientY - b.top) / b.height) * 2 + 1,
      );
      // Pick against precisely the camera used for the last visible frame.
      ray.setFromCamera(pointer, displayCamera);
      const hit = ray.intersectObjects([globe, ...markers])[0];
      if (hit?.object.userData.id)
        select.current(DISTRICTS.find((d) => d.id === hit.object.userData.id));
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    engine.current = {
      districtId: "jamnagar",
      focus: (d) => {
        engine.current.districtId = d.id;
        resetHover();
        pause();
        target = position(d.lat, d.lon, 2.65);
        if (motion.matches) {
          camera.position.copy(target);
          target = null;
        }
      },
      zoom: (factor) => {
        target = null;
        camera.position.multiplyScalar(factor).clampLength(1.35, 4.4);
      },
      rotate: () => {
        target = null;
        if (playing) {
          pause();
          return;
        }
        playing = !playing;
        resumeAt = 0;
        controls.autoRotate = playing;
        setRotating(playing);
      },
      arrow: (key) => {
        target = null;
        resetHover();
        pause();
        const s = new THREE.Spherical().setFromVector3(camera.position);
        s.theta += key === "ArrowLeft" ? -0.1 : key === "ArrowRight" ? 0.1 : 0;
        s.phi += key === "ArrowUp" ? -0.1 : key === "ArrowDown" ? 0.1 : 0;
        s.makeSafe();
        camera.position.setFromSpherical(s);
      },
    };
    let last = 0;
    const render = (time) => {
      frame = requestAnimationFrame(render);
      if (document.hidden || !visible || time - last < 25) return;
      const delta = Math.min((time - last) / 1000, 0.1);
      last = time;
      if (target) {
        camera.position.lerp(target, 0.06);
        if (camera.position.distanceTo(target) < 0.005) target = null;
      }
      controls.autoRotate = playing && !interacting && time >= resumeAt;
      if (clouds && controls.autoRotate) clouds.rotation.y += delta * 0.022;
      controls.update(delta);
      if (controls.autoRotate && finePointer.matches && !motion.matches) {
        hoverOffset.lerp(hoverTarget, 1 - Math.exp(-4.5 * delta));
        if (hoverOffset.distanceTo(hoverTarget) < 0.0001)
          hoverOffset.copy(hoverTarget);
      }
      displayCamera.copy(camera);
      viewOrbit.setFromVector3(camera.position);
      viewOrbit.theta += hoverOffset.x * 0.16;
      viewOrbit.phi += hoverOffset.y * 0.09;
      viewOrbit.makeSafe();
      displayCamera.position.setFromSpherical(viewOrbit);
      displayCamera.lookAt(0, 0, 0);
      displayCamera.updateMatrixWorld();
      // Shift the composition a little as well as changing the viewing angle.
      displayCamera.projectionMatrix.elements[8] -= hoverOffset.x * 0.055;
      displayCamera.projectionMatrix.elements[9] += hoverOffset.y * 0.035;
      displayCamera.projectionMatrixInverse
        .copy(displayCamera.projectionMatrix)
        .invert();
      fill.intensity = 0.5 + hoverOffset.x * 0.08;
      hero.style.setProperty("--earth-light-x", `${75 + hoverOffset.x * 12}%`);
      hero.style.setProperty("--earth-light-y", `${22 + hoverOffset.y * 10}%`);
      renderer.render(scene, displayCamera);
    };
    render(0);
    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", motionChanged);
      finePointer.removeEventListener("change", pointerChanged);
      hero.removeEventListener("pointermove", follow);
      hero.removeEventListener("pointerleave", leave);
      hero.style.removeProperty("--earth-light-x");
      hero.style.removeProperty("--earth-light-y");
      visibility.disconnect();
      resize.disconnect();
      controls.dispose();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          ["map", "bumpMap", "specularMap", "emissiveMap", "alphaMap"].forEach(
            (key) => o.material[key]?.dispose(),
          );
          o.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    if (engine.current && engine.current.districtId !== district.id)
      engine.current.focus(district);
  }, [district]);
  return (
    <div className="earth-stage">
      <div
        className="earth-canvas"
        ref={host}
        tabIndex={0}
        role="group"
        aria-label="Interactive Earth. Move the mouse to explore; drag to rotate, scroll to zoom. Arrow keys rotate; plus and minus zoom. Pause stops ambient motion."
        onKeyDown={(e) => {
          if (e.key.startsWith("Arrow")) {
            e.preventDefault();
            engine.current?.arrow(e.key);
          }
          if (e.key === "+" || e.key === "=") engine.current?.zoom(0.85);
          if (e.key === "-") engine.current?.zoom(1.15);
        }}
      />
      {status && (
        <p className="earth-status" role="status">
          {status}
        </p>
      )}
      <div className="earth-tools">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => engine.current?.zoom(0.85)}
        >
          <Plus size={17} />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => engine.current?.zoom(1.15)}
        >
          <Minus size={17} />
        </button>
        <button
          title="Focus selected district"
          aria-label="Focus selected district"
          onClick={() => engine.current?.focus(district)}
        >
          <LocateFixed size={17} />
        </button>
        <button
          title="Toggle Earth rotation"
          aria-label="Toggle Earth rotation"
          aria-pressed={rotating}
          onClick={() => engine.current?.rotate()}
        >
          {rotating ? <Pause size={17} /> : <Play size={17} />}
        </button>
      </div>
      <span className="earth-credit">
        Earth visuals: three-globe examples · illustrative pilot locations
      </span>
    </div>
  );
}
