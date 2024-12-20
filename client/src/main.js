import "./style.css";
import { setupGLCanvas } from "./gl-canvas";

const socket = new WebSocket("ws://localhost:3000");
setupGLCanvas(socket);
