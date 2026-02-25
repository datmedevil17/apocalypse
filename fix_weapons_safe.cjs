const fs = require('fs');
const path = require('path');
const dir = '/home/iso/Documents/raj/app/apocalypse/src/components/Characters';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'Characters_Pug.tsx' && f !== 'Characters_GermanShepherd.tsx');

const safeEffect = `    useEffect(() => {
        if (!nodes.Root) return;
        nodes.Root.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                const isCustomMount = name.includes('batmesh') || name.includes('smgmesh') || name.includes('riflemesh');
                const isRanged = name.includes('cube') || name.includes('cylinder') || name.includes('gun') || name.includes('pistol') || name.includes('uzi') || name.includes('rifle') || name.includes('smg');
                const isMelee = name.includes('axe') || name.includes('bat') || name.includes('guitar') || name.includes('sword') || name.includes('knife');
                
                // Do NOT touch dynamically mounted weapons, their visibility is handled by WeaponMount.tsx
                if (isCustomMount) return;

                // Only toggle visibility if it's a recognized weapon mesh. 
                // Do NOT hide body parts (e.g. 'lis', 'shoulder', 'shoe')
                if (isRanged || isMelee) {
                    if (weaponSlot === 'Standard') {
                        child.visible = isRanged;
                    } else if (weaponSlot === 'SingleWeapon') {
                        child.visible = isMelee;
                    } else {
                        // Unarmed
                        child.visible = false;
                    }
                }
            }
        });
    }, [weaponSlot, nodes]);`;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the previous broken effect block
    const oldEffectPattern = /useEffect\(\(\) => \{\s*if \(!nodes\.Root\) return;\s*nodes\.Root\.traverse\(\(child\) => \{[\s\S]*?\}\, \[weaponSlot, nodes\]\);/g;

    if (content.match(oldEffectPattern)) {
        content = content.replace(oldEffectPattern, safeEffect);
        fs.writeFileSync(filePath, content);
        console.log("Updated visibility logic in", file);
    }
}
