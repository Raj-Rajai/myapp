require('dotenv').config();
console.log("URI:", process.env.MONGODB_URI);
require('./db/config');

const express = require('express');
const cors = require('cors');
const {user_model} = require('./db/users');

const app = express();
//const path = require('path');
//const { wait } = require('@testing-library/user-event/dist/utils');
// const staticPath = path.join(__dirname, 'public');// with this we are displaying the static files in the public folder, 

app.use(cors());
app.use(express.json());
app.post("/submit_user_data",async (req, res) => {
    try {
        const user = user_model(req.body);
        const awaite = await user.save();
        res.send(awaite);
    } 
    catch (error) {
        console.error("Error saving user data:", error);
        res.status(500).send("Error saving user data");
    }
// app.get('/', (req, res) => {
//     res.sendFile(path.join(staticPath, 'login.html'));//displaying frontend file in the backend server.
// app.get('/', (req, res) => {
//     res.send('Printing Hello World from Express');
// });
// app.get('/index', (req, res) => {
//     res.send('This is the index page');
// });
});
app.listen(5000);