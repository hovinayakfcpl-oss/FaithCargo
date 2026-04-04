import React, { useState } from "react";
import "./B2BRateCalculator.css";

function B2BRateCalculator() {

const [form,setForm] = useState({
origin:"",
destination:"",
weight:"",
invoiceValue:"",
codAmount:"",
paymentMode:"Prepaid"
})

const [dimensions,setDimensions] = useState([
{qty:1,length:"",width:"",height:""}
])

const [result,setResult] = useState(null)
const [loading,setLoading] = useState(false)
const [showDetails,setShowDetails] = useState(false)

// INPUT
const handleChange = (e)=>{
const {name,value} = e.target
setForm({...form,[name]: value})
}

// DIM
const handleDimChange = (i,e)=>{
const {name,value} = e.target
const newDims=[...dimensions]
newDims[i][name]=value
setDimensions(newDims)
}

const addBox = ()=> setDimensions([...dimensions,{qty:1,length:"",width:"",height:""}])
const removeBox = (i)=> setDimensions(dimensions.filter((_,x)=>x!==i))

// CALCULATE
const calculateRate = async ()=>{

setLoading(true)
setResult(null)

let volumetric=0
let totalQty=0

dimensions.forEach(b=>{
const v=(b.length*b.width*b.height*b.qty)/5000
volumetric+=Number(v)
totalQty+=Number(b.qty)
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

const cw = Math.max(Number(form.weight),volumetric)

data.volumetric_weight = volumetric.toFixed(2)
data.chargeable_weight = cw.toFixed(2)

// ODA
data.is_oda = data.is_oda ?? false
data.oda_charge = data.is_oda ? 650 : 0

// GST + FOV
const gst = Number(data.total_charge)*0.18
const fov = 75

let total = Number(data.total_charge)+gst+fov

// COD
let cod=0
if(form.paymentMode==="COD" || form.paymentMode==="ToPay"){
cod=150
}
total+=cod

// HANDLING
let handling=0
if(totalQty===1 && cw>70){
handling=750
}
total+=handling

setResult({
...data,
gst:gst.toFixed(2),
fov,
cod,
handling,
total:total.toFixed(2)
})

setLoading(false)
}

return(

<div className="container">

<h2 className="title">FCPL Rate Calculator</h2>

<div className="layout">

{/* FORM */}
<div className="card">

<input placeholder="Origin Pincode" name="origin" value={form.origin} onChange={handleChange}/>
<input placeholder="Destination Pincode" name="destination" value={form.destination} onChange={handleChange}/>

<select name="paymentMode" value={form.paymentMode} onChange={handleChange}>
<option>Prepaid</option>
<option>COD</option>
<option>ToPay</option>
</select>

<input placeholder="Weight (Kg)" name="weight" value={form.weight} onChange={handleChange}/>

{/* COD INPUT */}
{(form.paymentMode==="COD" || form.paymentMode==="ToPay") && (
<input placeholder="COD Amount" name="codAmount" value={form.codAmount} onChange={handleChange}/>
)}

{/* DIMENSIONS */}
<div className="dim-box">

<h4>Dimensions</h4>

{dimensions.map((d,i)=>(
<div key={i} className="dim-row">
<input name="length" placeholder="L" value={d.length} onChange={(e)=>handleDimChange(i,e)}/>
<input name="width" placeholder="W" value={d.width} onChange={(e)=>handleDimChange(i,e)}/>
<input name="height" placeholder="H" value={d.height} onChange={(e)=>handleDimChange(i,e)}/>
<input name="qty" placeholder="Qty" value={d.qty} onChange={(e)=>handleDimChange(i,e)}/>
<button onClick={()=>removeBox(i)}>X</button>
</div>
))}

<button onClick={addBox}>+ Add Box</button>

</div>

<button className="btn" onClick={calculateRate}>
{loading?"Calculating...":"Calculate"}
</button>

</div>

{/* RESULT */}
<div className="card">

{result && (

<div className="result-card">

<div className="header">
<div className="logo">FCPL</div>
<div>Charged Wt: {result.chargeable_weight}</div>
<div className="price">₹ {result.total}</div>
</div>

{result.is_oda && (
<div className="oda">⚠ ODA Location</div>
)}

<button onClick={()=>setShowDetails(!showDetails)} className="toggle">
Charges Bifurcation ↓
</button>

{showDetails && (
<div className="details">

<div>Freight <span>₹ {result.freight_charge}</span></div>
<div>Fuel <span>₹ {result.fuel_charge}</span></div>

{result.is_oda && <div>ODA <span>₹ {result.oda_charge}</span></div>}

<div>GST <span>₹ {result.gst}</span></div>

{(form.paymentMode==="COD" || form.paymentMode==="ToPay") && (
<div>COD <span>₹ 150</span></div>
)}

{result.handling>0 && (
<div>Handling <span>₹ 750</span></div>
)}

</div>
)}

</div>

)}

</div>

</div>

</div>

)
}

export default B2BRateCalculator;