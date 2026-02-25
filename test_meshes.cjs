const fs = require('fs');

const raw = fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/models/Characters_Lis-transformed.glb');
// glTF version 2 header is 12 bytes
// byte 12 is json chunk length
const chunkLen = raw.readUInt32LE(12);
const jsonStr = raw.toString('utf8', 20, 20 + chunkLen);
const json = JSON.parse(jsonStr);

// A node has a mesh index if it's a mesh
const meshes = json.nodes.filter(n => n.mesh !== undefined).map(n => n.name);
console.log("Lis meshes in GLB:", meshes);

const sw_raw = fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/models/Characters_Lis_SingleWeapon-transformed.glb');
const sw_chunkLen = sw_raw.readUInt32LE(12);
const sw_jsonStr = sw_raw.toString('utf8', 20, 20 + sw_chunkLen);
const sw_json = JSON.parse(sw_jsonStr);

const sw_meshes = sw_json.nodes.filter(n => n.mesh !== undefined).map(n => n.name);
console.log("Lis SW meshes in GLB:", sw_meshes);

