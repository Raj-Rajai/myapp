import React from "react";
import axios from "axios";
import { useState } from "react";
const Registration = () => { 
    const [username, setUsername] = useState(""); //assigning multiple states in one line
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [setError] = useState("");
    const insert_data = async (e) => {
        try{
            const respose = await axios.post("https://your-render-app.onrender.com/users", {username: username, email: email,password: password
            });
            console.log("User data submitted successfully:", respose.data);
        } catch (error) {
            console.error("Error submitting user data:", error);
        }
    };
    const Validation = (e) => {
        e.preventDefault();
        if (!username || !email || !password) {
            setError("All fields are required");
        } else {
            insert_data();
        }
    };
    return (
        <div className="myregistration">
            <h1>This is Registration form</h1>
            <form onSubmit={Validation}>
                <div>
                    <label>Username</label>
                    <input onChange={(e)=>{setUsername(e.target.value)}} type="text" placeholder="Username" required/><br/><br/>
                </div>
                <div>
                    <label>Email</label>
                    <input onChange={(e)=>{setEmail(e.target.value)}} type="email" placeholder="Email" required/><br/><br/>
                </div> 
                <div>
                    <label>Password</label>
                    <input onChange={(e)=>{setPassword(e.target.value)}} type="password" placeholder="Password" required/><br/><br/>
                </div>
                    <button type="submit">Register</button>
            </form>
        </div>
    );
}
export default Registration;
