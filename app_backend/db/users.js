const mongoose = require('mongoose');
const player_schema = new mongoose.Schema({
    playerName: String,
    age: Number,
    position: String,
    club: String,
    transferValue: String,
    image: String
});
const player_model = mongoose.model("Player", player_schema);
module.exports = {player_model};