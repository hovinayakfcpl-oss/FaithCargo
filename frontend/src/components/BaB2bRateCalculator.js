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

// ✅ PER KG RATE
const perKg = chargeable > 0 
  ? (Number(data.freight_charge) / chargeable).toFixed(2)
  : 0

// FREIGHT
const freight = Number(data.freight_charge)

// GST ONLY ON FREIGHT
const gst = freight * 0.18

// FUEL 10%
const fuel = freight * 0.10

// FIXED
const docket = 100
const fov = 75

// COD
let cod = (form.paymentMode==="COD" || form.paymentMode==="ToPay") ? 150 : 0

// HANDLING
let handling = (totalQty === 1 && chargeable > 70) ? 750 : 0

// INSURANCE
let insurance = form.insurance ? Number(form.invoiceValue) * 0.02 : 0

// APPOINTMENT
let appointment = form.appointment ? 1500 : 0

// TOTAL
let total = freight + gst + fuel + docket + fov + cod + handling + insurance + appointment

// ✅ MINIMUM FIX
if(total < 650){
  total = 650
}

setResult({
...data,
actual,
volumetric: volumetric.toFixed(2),
chargeable: chargeable.toFixed(2),
perKg,
freight,
fuel: fuel.toFixed(2),
gst: gst.toFixed(2),
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

{/* LEFT */}
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

<div className="rp-header">
  <div className="rp-logo">FCPL</div>

  <div className="rp-info">
    <h3>FCPL Express</h3>
    <p>Chargeable: {result.chargeable} Kg</p>
  </div>

  <div className="rp-price">
    ₹ {result.final}
    <span>Min ₹650 Applied</span>
  </div>
</div>

<div className="rp-toggle" onClick={()=>setShow(!show)}>
  Charges Breakdown {show ? "▲" : "▼"}
</div>

{show && (
<div className="rp-body">

<div className="rp-row"><span>Zone</span><span>{result.from_zone} → {result.to_zone}</span></div>

<div className="rp-row"><span>Actual</span><span>{result.actual} Kg</span></div>
<div className="rp-row"><span>Volumetric</span><span>{result.volumetric} Kg</span></div>
<div className="rp-row"><span>Chargeable</span><span>{result.chargeable} Kg</span></div>

<div className="rp-row">
  <span>Freight (₹ {result.perKg}/Kg)</span>
  <span>₹ {result.freight}</span>
</div>

<div className="rp-row"><span>Fuel (10%)</span><span>₹ {result.fuel}</span></div>
<div className="rp-row"><span>Docket</span><span>₹ 100</span></div>
<div className="rp-row"><span>FOV</span><span>₹ 75</span></div>

{result.is_oda && (
<div className="rp-row"><span>ODA</span><span>₹ {result.oda_charge}</span></div>
)}

{result.cod > 0 && (
<div className="rp-row"><span>COD</span><span>₹ 150</span></div>
)}

{result.handling > 0 && (
<div className="rp-row"><span>Handling</span><span>₹ 750</span></div>
)}

{form.insurance && (
<div className="rp-row"><span>Insurance</span><span>₹ {result.insurance}</span></div>
)}

{form.appointment && (
<div className="rp-row"><span>Appointment</span><span>₹ {result.appointment}</span></div>
)}

<div className="rp-row"><span>GST (18% Freight)</span><span>₹ {result.gst}</span></div>

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