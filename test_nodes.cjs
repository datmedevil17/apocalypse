const fs = require('fs');

const raw = fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/models/Characters_Lis-transformed.glb');
const chunkLen = raw.readUInt32LE(12);
const json = JSON.parse(raw.toString('utf8', 20, 20 + chunkLen));

const meshes = json.nodes
    .filter(n => n.mesh !== undefined)
    .map(n => n.name);

console.log("Lis-transformed meshes:", meshes);

const raw2 = fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/models/Characters_Lis_SingleWeapon-transformed.glb');
const chunkLen2 = raw2.readUInt32LE(12);
const json2 = JSON.parse(raw2.toString('utf8', 20, 20 + chunkLen2));

const meshes2 = json2.nodes
    .filter(n => n.mesh !== undefined)
    .map(n => n.name);

console.log("Lis_SingleWeapon-transformed meshes:", meshes2);
