import { initEchoDocumentInteractions } from "./interactions/EchoDocumentInteractions.js";
import { initInteractions } from "./interactions/initInteractions.js";
import { inputManager } from "./interactions/InputManager.js";

initEchoDocumentInteractions();
// Start the unified keyboard dispatcher after every feature shard has registered.
initInteractions(inputManager);
