const mongoose = require('mongoose');
const user_schema = new mongoose.Schema({
    username: String,
    email: String,  
    password: String
});
const user_model = mongoose.model("User", user_schema);
module.exports = {user_model};