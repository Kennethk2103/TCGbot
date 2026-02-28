import { createRequire } from "module";
const require = createRequire(import.meta.url);

const packConfig = require("./packConfig.json");

export default packConfig;
