import express, {Express} from 'express';

const app: Express = express();
const port:number = 3000;

// Middleware to parse JSON bodies. This enables the app to read data from JSON requests.
app.use(express.json());

// Serve static files (like HTML, CSS, JavaScript) from the 'public' directory.
app.use("/", express.static(__dirname+'/public'));

// Start the server on the defined port and log a message to the console once the server is running.
app.listen(port, () => { console.log('Server running on port: ' + port)});
