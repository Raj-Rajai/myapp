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

app.use(cors({origin: "https://model1project.netlify.app"}));//allowing requests from the frontend server which is running on port 3000, to the backend server which is running on port 5000. This is called cross-origin resource sharing (CORS). This is necessary because the frontend and backend are running on different ports, and the browser considers them as different origins. By default, the browser blocks requests from different origins for security reasons. By using CORS, we can allow requests from the frontend to the backend, and vice versa.
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