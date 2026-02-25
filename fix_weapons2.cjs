const fs = require('fs');
const path = require('path');
const dir = '/home/iso/Documents/raj/app/apocalypse/src/components/Characters';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'Characters_Pug.tsx' && f !== 'Characters_GermanShepherd.tsx');

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // The current broken block:
    const brokenPattern = /return \(\n\s*useEffect\(\(\) => \{[\s\S]*?\}\, \[weaponSlot, nodes\]\);\n\n\s*<group ref=\{group\}/;

    // Extract the useEffect body that's sitting inside the return
    if (brokenPattern.test(content)) {
        content = content.replace(brokenPattern, (match) => {
            // Strip the `return (\n    ` part off the front
            const effectBlock = match.replace(/return \(\n\s*/, '').replace(/\n\s*<group ref=\{group\}/, '');
            // Place it before the return
            return `${effectBlock}\n\n  return (\n    <group ref={group}`;
        });
        fs.writeFileSync(filePath, content);
        console.log("Fixed return in", file);
    }
}
