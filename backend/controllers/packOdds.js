const SLOT_ODDS = [
    [
        { rarity: "Common", chance: 97 },
        { rarity: "Rare", chance: 2 },
        { rarity: "Ultra Rare", chance: 1 },
    ],
    [
        { rarity: "Common", chance: 97 },
        { rarity: "Rare", chance: 2 },
        { rarity: "Ultra Rare", chance: 1 },
    ],
    [
        { rarity: "Common", chance: 97 },
        { rarity: "Rare", chance: 2 },
        { rarity: "Ultra Rare", chance: 1 },
    ],
    [
        { rarity: "Common", chance: 75 },
        { rarity: "Rare", chance: 20 },
        { rarity: "Ultra Rare", chance: 5 },
    ],
    [
        { rarity: "Rare", chance: 85 },
        { rarity: "Ultra Rare", chance: 15 },
    ],
];

const PITY_THRESHOLD = 15;

export function getPackOdds() {
    return SLOT_ODDS;
}

export function getPityThreshold() {
    return PITY_THRESHOLD;
}