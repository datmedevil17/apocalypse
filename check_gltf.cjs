const fs = require('fs');
const filepath = process.argv[2];
if (!filepath) { console.error("Need filepath"); process.exit(1); }

const jsonStr = fs.readFileSync(filepath, 'utf8');
const json = JSON.parse(jsonStr);

console.log("File:", filepath);
console.log('Scale:', json.nodes[0] ? json.nodes[0].scale : 'none');
console.log('Translation:', json.nodes[0] ? json.nodes[0].translation : 'none');

try {
    const mesh = json.meshes[0];
    const posAcc = json.accessors[mesh.primitives[0].attributes.POSITION];
    console.log('Size: max', posAcc.max, 'min', posAcc.min);
} catch (e) {
    console.log('Size error:', e.message);
}
