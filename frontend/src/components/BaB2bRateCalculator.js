import React, { useState } from "react";
import "./B2BRateCalculator.css";

function B2BRateCalculator(){

const [form,setForm] = useState({
origin:"",
destination:"",
weight:"",
invoiceValue:"",
codAmount:"",
paymentMode:"Prepaid",
insurance:false,
appointment:false
})

const [dimensions,setDimensions] = useState([
{qty:1,length:"",width:"",height:""}
])

const [result,setResult] = useState(null)
const [loading,setLoading] = useState(false)

// INPUT
const handleChange = (e)=>{
const {name,value,type,checked} = e.target
setForm({
...form,
[name]: type==="checkbox" ? checked : value
})
}

// DIM
const handleDimChange = (i,e)=>{
const {name,value} = e.target
const newDims = [...dimensions]
newDims[i][name] = value
setDimensions(newDims)
}

// CALCULATE
const calculateRate = async ()=>{

setLoading(true)
setResult(null)

// volumetric
let volumetric = 0
let totalQty = 0

dimensions.forEach(b=>{
const v = (b.length * b.width * b.height * b.qty)/4000
volumetric += Number(v)
totalQty += Number(b.qty)
})

try{

const res = await fetch("https://faithcargo.onrender.com/api/rates/b2b/calculate/",{
method:"POST",
headers:{ "Content-Type":"application/json"},
body: JSON.stringify({
origin:form.origin,
destination:form.destination,
weight:Number(form.weight),
invoiceValue:Number(form.invoiceValue),
insurance:form.insurance,
appointment:form.appointment,
dimensions:dimensions
})
})

const data = await res.json()

if(data.error){
alert(data.error)
return
}

// weights
const actual = Number(form.weight)
const chargeable = Math.max(actual, volumetric)

// base
let total = Number(data.total_charge)

// FOV
const fov = 75
total += fov

// GST
const gst = total * 0.18

// COD
let cod = 0
if(form.paymentMode==="COD" || form.paymentMode==="ToPay"){
cod = 150
total += cod
}

// handling
let handling = 0
if(totalQty === 1 && chargeable > 70){
handling = 750
total += handling
}

// insurance
let insurance = 0
if(form.insurance){
insurance = Number(form.invoiceValue) * 0.02
total += insurance
}

// appointment
let appointment = 0
if(form.appointment){
appointment = 1500
total += appointment
}

// final
total += gst

setResult({
...data,
actual,
volumetric: volumetric.toFixed(2),
chargeable: chargeable.toFixed(2),
gst: gst.toFixed(2),
fov,
cod,
handling,
insurance,
appointment,
final: total.toFixed(2)
})

}catch{
alert("Server Error")
}

setLoading(false)
}

return(

<div className="main">

<div className="big-card">

<h2>FCPL Rate Calculator</h2>

<div className="layout">

{/* CALCULATOR */}
<div className="card calc">

<input placeholder="Origin Pincode" name="origin" onChange={handleChange}/>
<input placeholder="Destination Pincode" name="destination" onChange={handleChange}/>

<select name="paymentMode" onChange={handleChange}>
<option>Prepaid</option>
<option>COD</option>
<option>ToPay</option>
</select>

<input placeholder="Weight" name="weight" onChange={handleChange}/>
<input placeholder="Invoice Value" name="invoiceValue" onChange={handleChange}/>

{/* COD INPUT */}
{(form.paymentMode==="COD" || form.paymentMode==="ToPay") && (
<input placeholder="COD Amount" name="codAmount" onChange={handleChange}/>
)}

{/* DIMENSIONS */}
<div className="dim">
<h4>Dimensions</h4>

{dimensions.map((d,i)=>(
<div key={i} className="dim-row">
<input placeholder="Qty" name="qty" onChange={(e)=>handleDimChange(i,e)}/>
<input placeholder="L" name="length" onChange={(e)=>handleDimChange(i,e)}/>
<input placeholder="W" name="width" onChange={(e)=>handleDimChange(i,e)}/>
<input placeholder="H" name="height" onChange={(e)=>handleDimChange(i,e)}/>
</div>
))}

</div>

{/* CHECK */}
<div className="check">
<label><input type="checkbox" name="insurance" onChange={handleChange}/> Insurance</label>
<label><input type="checkbox" name="appointment" onChange={handleChange}/> Appointment</label>
</div>

<button onClick={calculateRate}>
{loading ? "Calculating..." : "Calculate"}
</button>

</div>

{/* RESULT */}
<div className="card result">

{result ? (

<div className="result-box">

<h4>₹ {result.final}</h4>

{/* ODA */}
{result.is_oda && (
<div style={{color:"yellow",textAlign:"center",marginBottom:"6px"}}>
⚠️ ODA Location
</div>
)}

<div className="row"><span>Zone</span><span>{result.from_zone} → {result.to_zone}</span></div>
<div className="row"><span>Actual</span><span>{result.actual} Kg</span></div>
<div className="row"><span>Volumetric</span><span>{result.volumetric} Kg</span></div>
<div className="row"><span>Chargeable</span><span>{result.chargeable} Kg</span></div>

<div className="row"><span>Freight</span><span>₹ {result.freight_charge}</span></div>
<div className="row"><span>Docket</span><span>₹ 100</span></div>
<div className="row"><span>Fuel (15%)</span><span>₹ {result.fuel_charge}</span></div>

{/* ODA */}
{result.is_oda && (
<div className="row"><span>ODA</span><span>₹ {result.oda_charge}</span></div>
)}

{form.insurance && (
<div className="row"><span>Insurance</span><span>₹ {result.insurance}</span></div>
)}

{form.appointment && (
<div className="row"><span>Appointment</span><span>₹ {result.appointment}</span></div>
)}

<div className="row"><span>FOV</span><span>₹ 75</span></div>

{result.cod > 0 && (
<div className="row"><span>COD</span><span>₹ 150</span></div>
)}

{result.handling > 0 && (
<div className="row"><span>Handling</span><span>₹ 750</span></div>
)}

<div className="row"><span>GST</span><span>₹ {result.gst}</span></div>

</div>

) : (
<p>Fill Details and Check Rate</p>
)}

</div>

</div>

</div>

</div>

)
}

export default B2BRateCalculator;