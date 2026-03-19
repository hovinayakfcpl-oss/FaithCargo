import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./RateUpdate.css";

const zones = ["N1","N2","N3","C1","W1","W2","S1","S2","E1","NE1","NE2"];

function RateUpdate(){

const navigate = useNavigate();

const [selectedOption,setSelectedOption] = useState("");
const [rates,setRates] = useState({});
const [message,setMessage] = useState("");
const [loading,setLoading] = useState(false);


// Create Empty Matrix
const createEmptyMatrix = ()=>{

let matrix={}

zones.forEach(f=>{
matrix[f]={}

zones.forEach(t=>{
matrix[f][t]=""
})

})

return matrix
}


// Initial Load
useEffect(()=>{
setRates(createEmptyMatrix())
},[])


// Fetch Matrix From Backend
useEffect(()=>{

if(selectedOption !== "b2b") return

fetch("http://127.0.0.1:8000/api/rates/matrix/")
.then(res=>res.json())
.then(data=>{

let matrix=createEmptyMatrix()

data.forEach(r=>{

if(matrix[r.from_zone]){
matrix[r.from_zone][r.to_zone]=r.rate
}

})

setRates(matrix)

})

},[selectedOption])


// Handle Input Change
const handleChange=(from,to,value)=>{

setRates(prev=>({

...prev,

[from]:{
...prev[from],
[to]:value
}

}))

}


// Update Matrix
const updateRate=async()=>{

setLoading(true)

let payload=[]

zones.forEach(f=>{
zones.forEach(t=>{

if(rates[f][t] !== ""){

payload.push({
from_zone:f,
to_zone:t,
rate:Number(rates[f][t])
})

}

})
})

try{

const res=await fetch(
"http://127.0.0.1:8000/api/rates/matrix/update/",
{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify(payload)
})

const data=await res.json()

setMessage(data.message || "Rates Updated Successfully")

}catch{

setMessage("Server Error")

}

setLoading(false)

}



return(

<div className="rate-page">

<h2 className="title">Faith Cargo Rate Update</h2>


<div className="checkbox-select">

<label>

<input
type="checkbox"
checked={selectedOption==="fcpl"}
onChange={()=>setSelectedOption("fcpl")}
/>

FCPL Rate

</label>

<label>

<input
type="checkbox"
checked={selectedOption==="b2b"}
onChange={()=>setSelectedOption("b2b")}
/>

BA / B2B Rate

</label>

</div>



{selectedOption==="b2b" && (

<div className="matrix-card">

<h3>Zone Rate Matrix</h3>

<table className="rate-table">

<thead>

<tr>

<th>Zone</th>

{zones.map(z=>(
<th key={z}>{z}</th>
))}

</tr>

</thead>

<tbody>

{zones.map(from=>(

<tr key={from}>

<td className="zone">{from}</td>

{zones.map(to=>(

<td key={to}>

<input
type="number"
value={rates[from]?.[to] || ""}
onChange={(e)=>handleChange(from,to,e.target.value)}
/>

</td>

))}

</tr>

))}

</tbody>

</table>

<div className="buttons">

<button onClick={updateRate}>

{loading ? "Updating..." : "Update Rate"}

</button>

<button onClick={()=>navigate("/admin")}>

Dashboard

</button>

</div>

</div>

)}



{/* RATE POLICY CARD */}

<div className="policy-card">

<h3>Faith Cargo Rate Policy</h3>

<div className="policy-grid">

<div className="policy-box">
<h4>Min Freight</h4>
<p>₹600</p>
</div>

<div className="policy-box">
<h4>Docket Charge</h4>
<p>₹50</p>
</div>

<div className="policy-box">
<h4>Fuel</h4>
<p>15%</p>
</div>

<div className="policy-box">
<h4>FOV Charge</h4>
<p>₹75 Fixed</p>
</div>

<div className="policy-box">
<h4>ODA Charge</h4>
<p>₹3/kg OR ₹650 per docket</p>
</div>

<div className="policy-box">
<h4>COD Charge</h4>
<p>₹150 OR 2.5% COD</p>
</div>

<div className="policy-box">
<h4>Handling Charge</h4>
<p>101kg+ ₹2/kg</p>
</div>

<div className="policy-box">
<h4>Appointment Delivery</h4>
<p>₹4/kg OR ₹1250</p>
</div>

<div className="policy-box">
<h4>CFT</h4>
<p>4500</p>
</div>

</div>

</div>


{message && (

<div className="message">
{message}
</div>

)}

</div>

)

}

export default RateUpdate;