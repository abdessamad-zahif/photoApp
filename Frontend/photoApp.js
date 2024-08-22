"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = 3000;
// Middleware to parse JSON bodies. This enables the app to read data from JSON requests.
app.use(express_1.default.json());
// Serve static files (like HTML, CSS, JavaScript) from the 'public' directory.
app.use("/", express_1.default.static(__dirname + '/public'));
// Start the server on the defined port and log a message to the console once the server is running.
app.listen(port, () => { console.log('Server running on port: ' + port); });
