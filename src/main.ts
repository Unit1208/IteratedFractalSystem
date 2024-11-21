import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
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
controls.screenSpacePanning = true;

const timer = new Timer();

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
let point_count = 150_000;
let currentAttributes: Attributes[] = [];
const geometry = new THREE.BufferGeometry();
let vertices = createVertices(point_count);
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
const colors = new Float32Array(point_count * 3); // RGB for each vertex
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
// Create a material that uses vertex colors
const material = new THREE.PointsMaterial({
    vertexColors: true, // Enable per-vertex coloring
});

const points = new THREE.Points(geometry, material);
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
function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function updateInterpolation() {
    const elapsedTime = timer.getElapsed();
    if (elapsedTime <= startTime) {
        currentAttributes = [...oldAttributes];
    } else if (elapsedTime >= endTime) {
        startInterpolation()
    } else {

        const t = easeInOutCubic(mapLinear(elapsedTime, startTime, endTime, 0, 1));
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

    const matrices = computeMatrices(currentAttributes);
    const new_matrices = computeMatrices(newAttributes);
    for (let i = 0; i < vertices.length; i += 3) {
        const point = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
        const matrix_index = Math.floor(Math.random() * matrices.length);
        const matrix = matrices[matrix_index];
        const new_matrix = new_matrices[matrix_index]
        point.applyMatrix4(matrix);
        let new_point = point.clone().applyMatrix4(new_matrix);

        vertices.set(point.toArray(), i);

        // Compute distance from original position
        const distance = point.distanceTo(new_point);

        // Map the distance to a color gradient (e.g., blue to red)
        const color = new THREE.Color();
        color.setHSL(0.66 - 0.66 * distance / 2, 1, 0.5); // Blue (small distance) to Red (large distance)
        colors.set(color.toArray(), i);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
}




function init() {
    if (!guiInitialized) {
        currentAttributes = createAttributes(3);
        startInterpolation();
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
