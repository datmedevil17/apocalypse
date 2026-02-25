import * as fs from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function readGLTF(filename) {
    const raw = fs.readFileSync(filename);
    const chunkLen = raw.readUInt32LE(12);
    const jsonStr = raw.toString('utf8', 20, 20 + chunkLen);
    const json = JSON.parse(jsonStr);
    console.log("File:", filename);
    json.nodes.forEach(n => {
        console.log("Node:", n.name, "Scale:", n.scale, "Translation:", n.translation, "Mesh:", n.mesh);
    });
}

readGLTF('/home/iso/Documents/raj/app/apocalypse/public/weapons/SMG.gltf');
readGLTF('/home/iso/Documents/raj/app/apocalypse/public/weapons/WoodenBat_Barbed.gltf');
