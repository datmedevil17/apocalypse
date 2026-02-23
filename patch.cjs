const fs = require('fs');
const path = require('path');

const dir = './src/components/Characters';
const files = fs.readdirSync(dir).filter(f => f.startsWith('Characters_') && f.endsWith('.tsx') && !f.includes('Pug') && !f.includes('GermanShepherd'));

files.forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');

    // add useEffect hook to hide built in weapons
    if (!content.includes('const weapons =')) {
        content = content.replace('const { actions, mixer } = useAnimations(animations, group)',
            'const { actions, mixer } = useAnimations(animations, group)\n\n    React.useEffect(() => {\n        const weapons = [\'Axe\', \'Guitar\', \'Knife\', \'Pistol\', \'SMG\'];\n        weapons.forEach(w => {\n            if (nodes[w]) nodes[w].visible = false;\n        });\n    }, [nodes]);');
    }

    // replace Hand_R with Middle1.R and Hand_L with Middle1.L
    content = content.replace(/nodes\.Hand_R/g, "nodes['Middle1.R']");
    content = content.replace(/nodes\.Hand_L/g, "nodes['Middle1.L']");

    fs.writeFileSync(path.join(dir, file), content, 'utf8');
});

console.log('patched ' + files.length + ' files');
