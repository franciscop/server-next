import authMod from "../auth/index.js";
import assets from "./assets.js";
import timer from "./timer.js";
import openapi from "./openapi.js";

const auth = authMod.middle;
export { assets, auth, timer, openapi };
