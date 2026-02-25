const fs = require('fs');

const raw = fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/models/Characters_Lis-transformed.glb');
const chunkLen = raw.readUInt32LE(12);
const json = JSON.parse(raw.toString('utf8', 20, 20 + chunkLen));

const meshesWithNames = [];
json.nodes.forEach(n => {
    if (n.mesh !== undefined) {
        meshesWithNames.push(n.name);
    }
});

console.log("Meshes defined in GLTF nodes:", meshesWithNames);

// Let's also print ALL node names that are NOT bones:
const nonBones = json.nodes
    .map(n => n.name)
    .filter(n => n && !n.match(/Bone|mixamorig|Armature/i));
console.log("\nAll Non-Bone Node Names:", nonBones);
