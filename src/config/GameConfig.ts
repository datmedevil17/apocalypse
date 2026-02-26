export type ZombieType = "Zombie_Basic" | "Zombie_Basic_Crawler" | "Zombie_Chubby" | "Zombie_Arm" | "Zombie_Ribcage";

export type CharacterType = "Sam" | "Shaun" | "Lis" | "Matt" | "Pug" | "GermanShepherd";

export interface CharacterStats {
    maxHealth: number;
    attackCooldown: number;
    rangedCooldown: number;
    speedMultiplier: number;
}

export interface PlayerStats {
    speed: number;
    runSpeed: number;
    jumpForce: number;
    damage: {
        punch: number;
        slash: number;
        slashRun: number;
        stab: number;
        stabRun: number;
        ranged: number;
    };
    attackRange: number;
}

export const PlayerConfig: PlayerStats = {
    speed: 4.5,
    runSpeed: 8,
    jumpForce: 2.0,   // First jump force
    damage: {
        punch: 20,
        slash: 35,
        slashRun: 50,
        stab: 35,
        stabRun: 50,
        ranged: 15,
    },
    attackRange: 1.5,
};

export const CharacterConfig: Record<CharacterType, CharacterStats> = {
    "Lis": {
        maxHealth: 1500,
        attackCooldown: 0,
        rangedCooldown: 0.5,
        speedMultiplier: 1.0
    },
    "Matt": {
        maxHealth: 1800,
        attackCooldown: 0,
        rangedCooldown: 0.5,
        speedMultiplier: 0.9
    },
    "Sam": {
        maxHealth: 1000,
        attackCooldown: 0.1,
        rangedCooldown: 0.1,
        speedMultiplier: 1.1
    },
    "Shaun": {
        maxHealth: 1000,
        attackCooldown: 0.1,
        rangedCooldown: 0.1,
        speedMultiplier: 1.1
    },
    "Pug": {
        maxHealth: 80,
        attackCooldown: 0,
        rangedCooldown: 0,
        speedMultiplier: 1.3
    },
    "GermanShepherd": {
        maxHealth: 120,
        attackCooldown: 0,
        rangedCooldown: 0,
        speedMultiplier: 1.2
    }
};

export interface ZombieStats {
    model: string;
    speed: number;        // Walk speed
    runSpeed: number;     // Chase speed
    health: number;       // Max HP
    damage: number;       // Damage per attack
    attackRange: number;  // Distance to trigger attack
    aggroRange: number;   // Distance to trigger chase
    attackCooldown: number; // Seconds between attacks
    animations?: Partial<Record<"idle" | "walk" | "run" | "attack" | "dead", string>>;
}

export const ZombieConfig: Record<ZombieType, ZombieStats> = {
    "Zombie_Basic": {
        model: "/models/Zombie_Basic.gltf",
        speed: 2.0,
        runSpeed: 2.0,        // Changed: zombies don't run
        health: 100,
        damage: 10,
        attackRange: 1.5,
        aggroRange: 20,
        attackCooldown: 1.5,
        animations: {
            run: "Walk",      // Changed: only walk
            attack: "Idle_Attack"
        }
    },
    "Zombie_Basic_Crawler": { // A crawler variant of the basic model
        model: "/models/Zombie_Basic.gltf",
        speed: 0.8,           // Very slow
        runSpeed: 0.8,        // Changed: crawlers don't run
        health: 50,           // Lower health for crawlers
        damage: 10,
        attackRange: 1.3,
        aggroRange: 15,
        attackCooldown: 1.8,
        animations: {
            walk: "Crawl",
            run: "Crawl",     // Continues crawling when aggroed
            attack: "Idle_Attack"
        }
    },
    "Zombie_Chubby": {
        model: "/models/Zombie_Chubby.gltf",
        speed: 1.5,           // Slower
        runSpeed: 1.5,        // Changed: zombies don't run
        health: 200,          // Tanky
        damage: 25,           // Hits harder
        attackRange: 1.8,     // Slightly larger reach
        aggroRange: 15,       // Doesn't notice as easily
        attackCooldown: 2.0,  // Slow attacks
        animations: {
            run: "Walk",      // Changed: only walk
        }
    },
    "Zombie_Arm": {
        model: "/models/Zombie_Arm.gltf",
        speed: 2.5,           // Faster walk
        runSpeed: 6.5,        // Fast runner
        health: 75,           // Fragile
        damage: 15,
        attackRange: 1.4,
        aggroRange: 25,       // Notices from far
        attackCooldown: 1.2,  // Quick attacks
    },
    "Zombie_Ribcage": {
        model: "/models/Zombie_Ribcage.gltf",
        speed: 2.2,
        runSpeed: 5.5,
        health: 80,
        damage: 12,
        attackRange: 1.5,
        aggroRange: 20,
        attackCooldown: 1.4,
    }
};

// For now, only spawn Basic, Crawler, and Chubby
export const ZOMBIE_TYPES: ZombieType[] = ["Zombie_Basic", "Zombie_Basic_Crawler", "Zombie_Chubby"];
