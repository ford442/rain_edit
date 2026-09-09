import { initEchoDocumentInteractions } from "./interactions/EchoDocumentInteractions.js";
import { initDepthGestures } from "./interactions/initDepthGestures.js";
import { initInteractions } from "./interactions/initInteractions.js";
import { inputManager } from "./interactions/InputManager.js";

initEchoDocumentInteractions();
initDepthGestures(inputManager);
// Start the unified keyboard dispatcher after every feature shard has registered.
initInteractions(inputManager);
