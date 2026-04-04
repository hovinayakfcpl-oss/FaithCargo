import React, { useState } from "react";
import "./B2BRateCalculator.css";

function B2BRateCalculator() {

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
const [show,setShow] = useState(true)

// INPUT
const handleChange = (e)=>{
  const {name,value,type,checked} = e.target
  setForm({
    ...form,
    [name]: type==="checkbox" ? checked : value
  })
}

// DIM CHANGE
const handleDimChange = (i,e)=>{
  const {name,value} = e.target
  const newDims = [...dimensions]
  newDims[i][name] = value
  setDimensions(newDims)
}

// ADD BOX
const addBox = ()=>{
  setDimensions([...dimensions,{qty:1,length:"",width:"",height:""}])
}

// REMOVE BOX
const removeBox = (index)=>{
  setDimensions(dimensions.filter((_,i)=>i!==index))
}

// CALCULATE
const calculateRate = async ()=>{

setLoading(true)
setResult(null)

let volumetric = 0
let totalQty = 0

dimensions.forEach(b=>{
  const v = (b.length * b.width * b.height * b.qty)/4000
  volumetric += Number(v || 0)
  totalQty += Number(b.qty || 0)
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
setLoading(false)
return
}

const actual = Number(form.weight)
const chargeable = Math.max(actual, volumetric)

let total = Number(data.total_charge)

const fov = 75
const docket = 100
const fuel = total * 0.15

total += fov + docket + fuel

let cod = 0
if(form.paymentMode==="COD" || form.paymentMode==="ToPay"){
cod = 150
total += cod
}

let handling = 0
if(totalQty === 1 && chargeable > 70){
handling = 750
total += handling
}

let insurance = 0
if(form.insurance){
insurance = Number(form.invoiceValue) * 0.02
total += insurance
}

let appointment = 0
if(form.appointment){
appointment = 1500
total += appointment
}

const gst = total * 0.18
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

<div className="layout">

{/* LEFT CARD */}
<div className="card">

<div className="grid2">
<input placeholder="Origin" name="origin" onChange={handleChange}/>
<input placeholder="Destination" name="destination" onChange={handleChange}/>
</div>

<div className="grid2">
<select name="paymentMode" onChange={handleChange}>
<option>Prepaid</option>
<option>COD</option>
<option>ToPay</option>
</select>

{(form.paymentMode==="COD" || form.paymentMode==="ToPay") && (
<input placeholder="COD Amount" name="codAmount" onChange={handleChange}/>
)}
</div>

<div className="grid2">
<input placeholder="Weight" name="weight" onChange={handleChange}/>
<input placeholder="Invoice Value" name="invoiceValue" onChange={handleChange}/>
</div>

{/* DIM */}
<div className="dim">
<h4>Dimensions</h4>

{dimensions.map((d,i)=>(
<div key={i} className="dim-row">

<input value={d.qty} name="qty" onChange={(e)=>handleDimChange(i,e)}/>
<input value={d.length} name="length" onChange={(e)=>handleDimChange(i,e)}/>
<input value={d.width} name="width" onChange={(e)=>handleDimChange(i,e)}/>
<input value={d.height} name="height" onChange={(e)=>handleDimChange(i,e)}/>

{dimensions.length>1 && (
<button className="remove-btn" onClick={()=>removeBox(i)}>x</button>
)}

</div>
))}

<button className="add-btn" onClick={addBox}>+ Add</button>

</div>

<div className="check">
<label><input type="checkbox" name="insurance" onChange={handleChange}/> Insurance</label>
<label><input type="checkbox" name="appointment" onChange={handleChange}/> Appointment</label>
</div>

<button className="calc-btn" onClick={calculateRate}>
{loading ? "Calculating..." : "Calculate"}
</button>

</div>

{/* RIGHT RESULT */}
<div className="card">

{result ? (

<div className="result-premium">

{/* HEADER */}
<div className="rp-header">
  <div className="rp-logo">FCPL</div>

  <div className="rp-info">
    <h3>FCPL Express</h3>
    <p>Charged Wt: {result.chargeable} Kg</p>
  </div>

  <div className="rp-price">
    ₹ {result.final}
    <span>Total Cost</span>
  </div>
</div>

{/* TOGGLE */}
<div className="rp-toggle" onClick={()=>setShow(!show)}>
  Charges Breakdown {show ? "▲" : "▼"}
</div>

{/* BODY */}
{show && (
<div className="rp-body">

<div className="rp-row"><span>Zone</span><span>{result.from_zone} → {result.to_zone}</span></div>
<div className="rp-row"><span>Actual</span><span>{result.actual} Kg</span></div>
<div className="rp-row"><span>Volumetric</span><span>{result.volumetric} Kg</span></div>

<div className="rp-row"><span>Freight</span><span>₹ {result.freight_charge}</span></div>
<div className="rp-row"><span>Docket</span><span>₹ 100</span></div>
<div className="rp-row"><span>Fuel</span><span>₹ {result.fuel_charge}</span></div>

{result.is_oda && (
<div className="rp-row"><span>ODA</span><span>₹ {result.oda_charge}</span></div>
)}

{form.insurance && (
<div className="rp-row"><span>Insurance</span><span>₹ {result.insurance}</span></div>
)}

{form.appointment && (
<div className="rp-row"><span>Appointment</span><span>₹ {result.appointment}</span></div>
)}

<div className="rp-row"><span>FOV</span><span>₹ 75</span></div>

{result.cod > 0 && (
<div className="rp-row"><span>COD</span><span>₹ 150</span></div>
)}

{result.handling > 0 && (
<div className="rp-row"><span>Handling</span><span>₹ 750</span></div>
)}

<div className="rp-row"><span>GST</span><span>₹ {result.gst}</span></div>

</div>
)}

</div>

) : (
<p className="placeholder">Fill Details and Check Rate</p>
)}

</div>

</div>

</div>

)

}

export default B2BRateCalculator;