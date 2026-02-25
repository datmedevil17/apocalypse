const fs = require('fs');
const bat = JSON.parse(fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/weapons/WoodenBat_Barbed.gltf', 'utf8'));
const smg = JSON.parse(fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/weapons/SMG.gltf', 'utf8'));

console.log('Bat scale:', bat.nodes[0].scale, 'Bat translation:', bat.nodes[0].translation);
console.log('SMG scale:', smg.nodes[0].scale, 'SMG translation:', smg.nodes[0].translation);

const batAcc = bat.accessors[bat.meshes[0].primitives[0].attributes.POSITION];
const smgAcc = smg.accessors[smg.meshes[0].primitives[0].attributes.POSITION];

console.log('Bat size: max', batAcc.max, 'min', batAcc.min);
console.log('SMG size: max', smgAcc.max, 'min', smgAcc.min);
