const fs = require('fs');
const raw = fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/models/Characters_Lis-transformed.glb');
const chunkLen = raw.readUInt32LE(12);
const json = JSON.parse(raw.toString('utf8', 20, 20 + chunkLen));

// Print ALL node names to find where the guns are
const nodes = json.nodes.map(n => n.name).filter(Boolean);
console.log("Lis Nodes:", nodes.filter(n => !n.includes('Armature') && !n.includes('Bone') && !n.includes('mixamorig')));
