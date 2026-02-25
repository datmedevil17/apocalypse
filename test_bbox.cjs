const fs = require('fs');
const bat = JSON.parse(fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/weapons/WoodenBat_Barbed.gltf', 'utf8'));
const smg = JSON.parse(fs.readFileSync('/home/iso/Documents/raj/app/apocalypse/public/weapons/SMG.gltf', 'utf8'));

console.log('Bat scale:', bat.nodes[0] ? bat.nodes[0].scale : 'none', 'Bat translation:', bat.nodes[0] ? bat.nodes[0].translation : 'none');
console.log('SMG scale:', smg.nodes[0] ? smg.nodes[0].scale : 'none', 'SMG translation:', smg.nodes[0] ? smg.nodes[0].translation : 'none');

try {
    const batPosAcc = bat.accessors[bat.meshes[0].primitives[0].attributes.POSITION];
    console.log('Bat size: max', batPosAcc.max, 'min', batPosAcc.min);
} catch (e) {
    console.log('Bat size error', e.message);
}

try {
    const smgPosAcc = smg.accessors[smg.meshes[0].primitives[0].attributes.POSITION];
    console.log('SMG size: max', smgPosAcc.max, 'min', smgPosAcc.min);
} catch (e) {
    console.log('SMG size error', e.message);
}
