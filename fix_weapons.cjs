const fs = require('fs');
const path = require('path');
const dir = '/home/iso/Documents/raj/app/apocalypse/src/components/Characters';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'Characters_Pug.tsx' && f !== 'Characters_GermanShepherd.tsx');

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // The broken injected code:
    const badInjection = `
    useEffect(() => {
        if (!nodes.Root) return;
        nodes.Root.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                // Assume anything that is a Cube/Cylinder/Gun is ranged, others are melee
                const isRanged = name.includes('cube') || name.includes('cylinder') || name.includes('gun') || name.includes('pistol');
                
                if (weaponSlot === 'Standard') {
                    child.visible = isRanged;
                } else if (weaponSlot === 'SingleWeapon') {
                    child.visible = !isRanged;
                } else {
                    // Unarmed
                    child.visible = false;
                }
            }
        });
    }, [weaponSlot, nodes]);
`;

    // 1. Remove the bad injection that ended up inside the animation useEffect
    if (content.includes(badInjection)) {
        content = content.replace(badInjection, '');
    }

    // 2. Insert it correctly right before the main component return
    // Wait, the original bug was: `content.replace(/return \(/, insertion + '\n    return (')`
    // It matched the `return () => {` inside the useEffect!
    // Let's match `<group ref={group}` instead.

    if (!content.includes('weaponSlot === \'Standard\'')) {
        content = content.replace(/<group ref=\{group\}/, badInjection + '\n    <group ref={group}');
    }

    fs.writeFileSync(filePath, content);
    console.log("Fixed", file);
}
