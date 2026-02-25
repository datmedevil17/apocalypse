import * as THREE from 'three';
import fs from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Polyfill for FileReader and TextDecoder if needed in Node
const toArrayBuffer = (buf) => {
    const ab = new ArrayBuffer(buf.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
};

// Simplified parser to read materials from the actual json
function inspectGltf(filepath) {
    const data = fs.readFileSync(filepath, 'utf8');
    const json = JSON.parse(data);
    console.log(`\nInspecting \${filepath}:`);
    if (json.materials) {
        json.materials.forEach((mat, i) => {
            console.log(`Material \${i}: \${mat.name}`);
            console.log(JSON.stringify(mat, null, 2));
        });
    } else {
        console.log("No materials found!");
    }
}

inspectGltf('/home/iso/Documents/raj/app/apocalypse/public/weapons/SMG.gltf');
inspectGltf('/home/iso/Documents/raj/app/apocalypse/public/weapons/WoodenBat_Barbed.gltf');
