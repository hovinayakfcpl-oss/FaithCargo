import React, { useState } from "react";
import "./B2BRateCalculator.css";

function B2BRateCalculator() {

const [form,setForm] = useState({
origin:"",
destination:"",
weight:"",
invoiceValue:"",
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
setForm({...form,[name]: type==="checkbox"?checked:value})
}

// DIM
const handleDimChange = (i,e)=>{
const {name,value} = e.target
const newDims=[...dimensions]
newDims[i][name]=value
setDimensions(newDims)
}

const addBox = ()=> setDimensions([...dimensions,{qty:1,length:"",width:"",height:""}])

// ================= CALCULATE =================
const calculateRate = async ()=>{

setLoading(true)

let volumetric=0

dimensions.forEach(b=>{
const v=(b.length*b.width*b.height*b.qty)/5000
volumetric+=Number(v)
})

const res = await fetch("https://faithcargo.onrender.com/api/rates/b2b/calculate/",{
method:"POST",
headers:{ "Content-Type":"application/json"},
body: JSON.stringify({
...form,
weight:Number(form.weight),
invoiceValue:Number(form.invoiceValue),
dimensions
})
})

const data = await res.json()

const gst = data.total_charge * 0.18

setResult({
...data,
gst: gst.toFixed(2),
total_final: (data.total_charge + gst).toFixed(2),
volumetric: volumetric.toFixed(2)
})

setLoading(false)
}

// ================= UI =================
return(

<div className="main">

<h2 className="title">FCPL Rate Calculator</h2>

<div className="container">

{/* ================= FORM ================= */}
<div className="form-card">

<div className="row">
<input placeholder="Origin Pincode *" name="origin" value={form.origin} onChange={handleChange}/>
<input placeholder="Destination Pincode *" name="destination" value={form.destination} onChange={handleChange}/>
</div>

<div className="row">
<select name="paymentMode" value={form.paymentMode} onChange={handleChange}>
<option>Prepaid</option>
<option>COD</option>
<option>ToPay</option>
</select>

<input placeholder="Approx Weight (Kg) *" name="weight" value={form.weight} onChange={handleChange}/>
</div>

<input placeholder="Invoice Value *" name="invoiceValue" value={form.invoiceValue} onChange={handleChange}/>

{/* DIMENSIONS */}
<div className="dim-box">

<h4>Dimensions in cms</h4>

{dimensions.map((d,i)=>(
<div key={i} className="dim-row">
<input placeholder="Qty" name="qty" value={d.qty} onChange={(e)=>handleDimChange(i,e)}/>
<input placeholder="L" name="length" value={d.length} onChange={(e)=>handleDimChange(i,e)}/>
<input placeholder="H" name="height" value={d.height} onChange={(e)=>handleDimChange(i,e)}/>
<input placeholder="W" name="width" value={d.width} onChange={(e)=>handleDimChange(i,e)}/>
</div>
))}

<button className="add-btn" onClick={addBox}>+ Add Box</button>

</div>

{/* CHECKBOX */}
<div className="checkbox-row">
<label><input type="checkbox" name="insurance" onChange={handleChange}/> Insurance</label>
<label><input type="checkbox" name="appointment" onChange={handleChange}/> Appointment</label>
</div>

<button className="calc-btn" onClick={calculateRate}>
{loading ? "Calculating..." : "Calculate"}
</button>

</div>

{/* ================= RESULT ================= */}
<div className="result-card">

<h3 className="result-title">Fill Details and Check Rate</h3>

{result && (

<div className="rate-card">

{/* HEADER */}
<div className="rate-header">

<div className="logo">FCPL</div>

<div className="info">
<h3>FCPL Lite 🚚</h3>
<p>Charged Wt : {result.chargeable_weight} Kg</p>
</div>

<div className="price">
<h2>₹ {result.total_final}</h2>
<p>Min Amt: 350 + GST</p>
</div>

</div>

<button className="bifurcation-btn">
Charges Bifurcation ↓
</button>

{/* DETAILS */}
<div className="details">

<div className="row"><span>Zone</span><span>{result.from_zone} → {result.to_zone}</span></div>

<div className="row"><span>Weight Charge</span><span>₹ {result.freight_charge}</span></div>

<div className="row"><span>Docket Charge</span><span>₹ {result.docket_charge}</span></div>

<div className="row"><span>Fuel Surcharge (15%)</span><span>₹ {result.fuel_charge}</span></div>

<div className="row"><span>Insurance</span><span>₹ {result.insurance_charge}</span></div>

<div className="row"><span>Appointment</span><span>₹ {result.appointment_charge}</span></div>

{result.is_oda && (
<div className="row oda">
<span>ODA Charge</span>
<span>₹ {result.oda_charge}</span>
</div>
)}

<div className="row total">
<span>GST (18%)</span>
<span>₹ {result.gst}</span>
</div>

</div>

</div>

)}

</div>

</div>

</div>

)
}

export default B2BRateCalculator;