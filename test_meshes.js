const fs = require('fs');
const raw = fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/models/Characters_Lis-transformed.glb');
const chunkLen = raw.readUInt32LE(12);
const jsonStr = raw.toString('utf8', 20, 20 + chunkLen);
const json = JSON.parse(jsonStr);

const meshes = json.nodes.filter(n => n.mesh !== undefined).map(n => n.name);
console.log("Meshes:", meshes);
