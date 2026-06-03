import { useState } from "react"

function Counter(){
    const[count, setCount]=useState(0);
    const[name, setName]=useState("");
    return(
        <div>
        <p>Counter:{count} </p>
        <button onClick={()=>{setCount(count +1)}}>Increment </button><hr/><br />
        <button onClick={()=>{setCount(count -1)}}>Decrement </button><hr/><br />
        <button onClick={()=>{setCount(0)}}>Reset </button>
        <hr /><br /><br />
        <p>Input, {name}</p>
        <input type="text" placeholder="Enter your sentence" onChange={(e) => setName(e.target.value)}></input>
        <button onClick={()=>{setName("")}}>Reset </button>
        </div>
    )
}
export default Counter;