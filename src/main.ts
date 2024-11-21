import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Timer } from 'three/addons/misc/Timer.js';
import { mapLinear, smootherstep, smoothstep } from 'three/src/math/MathUtils.js';

const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping=true;
// controls.dampingFactor=0.05;
controls.screenSpacePanning = true;

const timer = new Timer();
const api = {
    pointCount: 100000,
    shuffleAttributes: startInterpolation,
};

class Attributes {
    rotation: THREE.Quaternion;
    scale: THREE.Vector3;
    translation: THREE.Vector3;
    constructor(rotation: THREE.Quaternion, scale: THREE.Vector3, translation: THREE.Vector3) {
        this.rotation = rotation;
        this.scale = scale;
        this.translation = translation;
    }

    get matrix4() {
        return new THREE.Matrix4().compose(this.translation, this.rotation, this.scale);
    }

    set matrix4(matrix) {
        matrix.decompose(this.translation, this.rotation, this.scale);
    }
}

let currentAttributes: Attributes[] = [];
const geometry = new THREE.BufferGeometry();
let vertices = createVertices(api.pointCount);
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
const points = new THREE.Points(geometry);
scene.add(points);

let oldAttributes: Attributes[] = [];
let newAttributes: Attributes[] = [];
let startTime = 0;
let endTime = 0;

let stats: Stats;
let guiInitialized = false;

function createVertices(pointCount: number) {
    const vertices = new Float32Array(pointCount * 3);
    for (let i = 0; i < vertices.length; i++) {
        vertices[i] = Math.random() * 2 - 1;
    }
    return vertices;
}

function createAttributes(matrixCount: number) {
    const attributes = [];
    for (let i = 0; i < matrixCount; i++) {
        const rotation = new THREE.Quaternion(
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random()
        ).normalize();
        const scale = new THREE.Vector3(
            Math.random() * 0.9 + 0.1,
            Math.random() * 0.9 + 0.1,
            Math.random() * 0.9 + 0.1
        );
        const translation = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        );
        attributes.push(new Attributes(rotation, scale, translation));
    }
    return attributes;
}

function startInterpolation() {
    oldAttributes = [...currentAttributes];
    newAttributes = createAttributes(3);
    startTime = timer.getElapsed();
    endTime = startTime + 5;
}

function updateInterpolation() {
    const elapsedTime = timer.getElapsed();
    if (elapsedTime <= startTime) {
        currentAttributes = [...oldAttributes];
    } else if (elapsedTime >= endTime) {
        startInterpolation()
    } else {

        const t = smootherstep(mapLinear(elapsedTime, startTime, endTime, 0, 1), 0, 1);
        currentAttributes = oldAttributes.map((oldAttr, i) => {
            const newAttr = newAttributes[i];
            return new Attributes(
                new THREE.Quaternion().slerpQuaternions(oldAttr.rotation, newAttr.rotation, t),
                oldAttr.scale.clone().lerp(newAttr.scale, t),
                oldAttr.translation.clone().lerp(newAttr.translation, t)
            );
        });
    }
}

function updateVertices() {
    function computeMatrices(attributes: Attributes[]) {
        return attributes.map(attr => attr.matrix4.clone());
    }

    let matrices = computeMatrices(currentAttributes);

    for (let i = 0; i < vertices.length; i += 3) {
        const point = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
        const matrix = matrices[Math.floor(Math.random() * matrices.length)];
        point.applyMatrix4(matrix);

        if (!point.toArray().some(isNaN)) {
            vertices.set(point.toArray(), i);
        } else {
            console.error(`NaN detected at vertex index ${i}`);
            vertices.set([0, 0, 0], i); // Fallback to default
        }
    }
    geometry.attributes.position.needsUpdate = true;

}



function init() {
    if (!guiInitialized) {
        currentAttributes = createAttributes(3);
        startInterpolation();

        const gui = new GUI();
        gui.add(api, 'pointCount', 10000, 250000, 1).onChange(() => {
            vertices = createVertices(api.pointCount);
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        });



        stats = new Stats();
        document.body.appendChild(stats.dom);

        guiInitialized = true;
        window.addEventListener('resize', onWindowResize)
    }
}
function onWindowResize() {
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {
    init();
    stats.update();
    timer.update();
    controls.update();
    updateInterpolation();
    updateVertices();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Initialize and start animation
init();
animate();
