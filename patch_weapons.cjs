const fs = require('fs');
const path = require('path');
const dir = '/home/iso/Documents/raj/app/apocalypse/src/components/Characters';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'Characters_Pug.tsx' && f !== 'Characters_GermanShepherd.tsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Allow weaponSlot in props
  content = content.replace(/\{ animation, onAnimationFinished, \.\.\.props \}: any/, '{ animation, weaponSlot, onAnimationFinished, ...props }: any');

  // Add logic to hide/show meshes based on weaponSlot
  if (!content.includes('weaponSlot === \'Standard\'')) {
    const insertion = `
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
    content = content.replace(/return \(/, insertion + '\n    return (');
    fs.writeFileSync(filePath, content);
    console.log("Patched", file);
  }
}
