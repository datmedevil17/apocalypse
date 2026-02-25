const fs = require('fs');

function readGLTF(filename) {
    const jsonStr = fs.readFileSync(filename, 'utf8');
    const json = JSON.parse(jsonStr);
    console.log("\nFile:", filename);
    json.nodes.forEach(n => {
        console.log("Node:", n.name, "Scale:", n.scale, "Translation:", n.translation, "Mesh:", n.mesh);
    });
}

readGLTF('/home/iso/Documents/raj/app/apocalypse/public/weapons/SMG.gltf');
readGLTF('/home/iso/Documents/raj/app/apocalypse/public/weapons/WoodenBat_Barbed.gltf');
