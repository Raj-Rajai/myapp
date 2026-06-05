import React from "react";
import axios from "axios";
import { useState } from "react";
const Registration = () => { 
    const [playerName, setPlayerName] = useState("");
    const [age, setAge] = useState("");
    const [position, setPosition] = useState("");
    const [club, setClub] = useState("");
    const [transferValue, setTransferValue] = useState("");
    const [image, setImage] = useState("");
    const [setError] = useState("");
    
    const insert_data = async () => {
        try{
            const respose = await axios.post("https://myapp-3y37.onrender.com/add_player", {playerName: playerName, age: age, position: position, club: club, transferValue: transferValue, image: image
            });
            console.log("Player data submitted successfully:", respose.data);
        } catch (error) {
            console.error("Error submitting player data:", error);
        }
    };
    const Validation = (e) => {
        e.preventDefault();
        if (!playerName || !age || !position || !club || !transferValue || !image) {
            setError("All fields are required");
        } else {
            insert_data();
        }
    };
    return (
        <div className="myregistration">
            <h1>Player Registration</h1>
            <form onSubmit={Validation}>
                <div>
                    <label>Player Name</label>
                    <input onChange={(e)=>{setPlayerName(e.target.value)}} type="text" placeholder="Player Name" required/><br/><br/>
                </div>
                <div>
                    <label>Age</label>
                    <input onChange={(e)=>{setAge(e.target.value)}} type="number" placeholder="Age" required/><br/><br/>
                </div> 
                <div>
                    <label>Position</label>
                    <input onChange={(e)=>{setPosition(e.target.value)}} type="text" placeholder="Position" required/><br/><br/>
                </div>
                <div>
                    <label>Club</label>
                    <input onChange={(e)=>{setClub(e.target.value)}} type="text" placeholder="Club" required/><br/><br/>
                </div>
                <div>
                    <label>Transfer Value</label>
                    <input onChange={(e)=>{setTransferValue(e.target.value)}} type="text" placeholder="Transfer Value" required/><br/><br/>
                </div>
                <div>
                    <label>Image URL</label>
                    <input onChange={(e)=>{setImage(e.target.value)}} type="text" placeholder="Image URL" required/><br/><br/>
                </div>
                    <button type="submit">Register</button>
            </form>
        </div>
    );
}
export default Registration;
