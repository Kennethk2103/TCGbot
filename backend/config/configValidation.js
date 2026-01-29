import packConfig from "./packConfig.json" assert { type: "json" };

function validatePackConfig({ slotOdds, pityThreshold }) {
    console.log("Validating Config files");
    if (!Array.isArray(slotOdds)) {
        throw new Error("slotOdds must be an array");
    }

    slotOdds.forEach((slot, i) => {
        const total = slot.reduce((sum, r) => sum + r.chance, 0);
        if (total !== 100) {
            throw new Error(`Slot ${i + 1} odds must total 100`);
        }
    });

    if (typeof pityThreshold !== "number" || pityThreshold < 0) {
        throw new Error("Invalid pityThreshold");
    }
    console.log("Config files validated successfully");
}

validatePackConfig(packConfig);
