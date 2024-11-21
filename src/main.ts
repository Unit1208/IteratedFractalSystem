import './style.css'
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Timer } from 'three/addons/misc/Timer.js';
import { mapLinear } from 'three/src/math/MathUtils.js';
const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
    -aspect, aspect, 1, -1, 0.1, 10
);
camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate)
document.body.appendChild(renderer.domElement);
const timer = new Timer();
const api = {
    matrixCount: 3,
    pointCount: 10000,
    shuffleAttributes: startInterpolation,
}
class Attributes {


    constructor(
        public rotation: THREE.Quaternion,
        public scale: THREE.Vector3,
        public translation: THREE.Vector3,
    ) {

    }

    public get matrix4(): THREE.Matrix4 {
        return new THREE.Matrix4().compose(
            this.translation, this.rotation, this.scale
        )

    }
    public set matrix4(v: THREE.Matrix4) {
        v.decompose(this.translation, this.rotation, this.scale)
    }

}
window.addEventListener("load", () => {
    init();
    animate();
});

let currentAttributes: Attributes[] = []
let rand_range = (min: number = 0, max: number = 1) => Math.random() * (max - min) + min
const geometry = new THREE.BufferGeometry();
let vertices = new Float32Array(api.pointCount * 3);
vertices = vertices.map(() => rand_range(-1, 1))
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
const points = new THREE.Points(geometry);
scene.add(points);
function setMatrixes() {
    currentAttributes.forEach(_ => {
        currentAttributes.pop()
    });
    currentAttributes = create_attributes()
}
let old_attributes: Attributes[];
let new_attributes: Attributes[];
function create_attributes() {
    let n: Attributes[] = []
    for (let i = 0; i < api.matrixCount; i++) {
        let rotation = new THREE.Quaternion(rand_range(), rand_range(), rand_range(), rand_range());
        rotation=rotation.normalize()
        let scale = new THREE.Vector3(rand_range(0.1, 1), rand_range(0.1, 1), rand_range(0.1, 1));
        let translation = new THREE.Vector3(rand_range(-1, 1), rand_range(-1, 1), rand_range(-1, 1));


        let attribute: Attributes = new Attributes(
            rotation, scale, translation
        )
        n.push(attribute);
    }
    return n
}
let startTime: number;
let endTime: number;
function startInterpolation() {
    old_attributes = structuredClone(currentAttributes);
    new_attributes = create_attributes();
    startTime = timer.getElapsed();
    endTime = timer.getElapsed() + 5;
}
function updateInterpolation() {
    if (timer.getElapsed() < startTime) {
        currentAttributes = old_attributes;
    } else if (timer.getElapsed() > endTime) {
        currentAttributes = new_attributes;
    } else {
        let t = mapLinear(timer.getElapsed(), startTime, endTime, 0, 1);
        for (let i = 0; i < currentAttributes.length; i++) {
            let currentAttribute = currentAttributes[i];
            let new_attribute = new_attributes[i];
            let old_attribute = old_attributes[i];
            currentAttribute.rotation = new THREE.Quaternion().slerpQuaternions(old_attribute.rotation, new_attribute.rotation, t).normalize();
            currentAttribute.scale = new THREE.Vector3().lerpVectors(old_attribute.scale, new_attribute.scale, t)
            currentAttribute.translation = new THREE.Vector3().lerpVectors(old_attribute.translation, new_attribute.translation, t)
            currentAttributes[i] = currentAttribute;
        }
    }
}
let stats: Stats;
let initialized = false;
function init() {
    if (!initialized) {
        currentAttributes = create_attributes()
        startInterpolation()
        let gui = new GUI();
        gui.add(api, 'pointCount', 1, 100000).onChange(() => {
            vertices = new Float32Array(api.pointCount * 3).map(() => rand_range(-1, 1));
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.attributes.position.needsUpdate = true;

        });
        
        gui.add(api, 'matrixCount', 2, 5).onChange(() => {
            setMatrixes();
        })
        gui.add(api, 'shuffleAttributes')
        stats = new Stats();
        document.body.appendChild(stats.dom)
        initialized = true;
    }
}
function validateVertices(vertices:Float32Array) {
    for (let i = 0; i < vertices.length; i++) {
        if (isNaN(vertices[i])) {
            console.error(`Invalid vertex data at index ${i}`);
            vertices[i] = 0; // Fallback to a default value
        }
    }
}
function animate() {
    init()
    stats.update();
        timer.update();
        updateInterpolation();
    
        for (let index = 0; index < vertices.length; index += 3) {
            const point = new THREE.Vector3(...vertices.slice(index, index + 3));
            let attributes = currentAttributes[Math.floor(rand_range(0, api.matrixCount))];
            point.applyMatrix4(attributes.matrix4);
    
            // Validate and update the vertex
            if (!point.toArray().some(isNaN)) {
                vertices.set(point.toArray(), index);
            } else {
                console.error(`NaN detected at index ${index}`);
                vertices.set([0, 0, 0], index); // Default fallback
            }
        }
    
        validateVertices(vertices);
        geometry.attributes.position.needsUpdate = true;
    
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    
}