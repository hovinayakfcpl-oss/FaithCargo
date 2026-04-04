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
const [error,setError] = useState("")
const [loading,setLoading] = useState(false)

// INPUT
const handleChange = (e)=>{
const {name,value,type,checked} = e.target
setForm({...form,[name]: type==="checkbox" ? checked : value})
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

// RESET
const resetForm = ()=>{
setForm({
origin:"",
destination:"",
weight:"",
invoiceValue:"",
codAmount:"",
paymentMode:"Prepaid",
insurance:false,
appointment:false
})
setDimensions([{qty:1,length:"",width:"",height:""}])
setResult(null)
setError("")
}

// CALCULATE
const calculateRate = async () => {

setLoading(true)
setError("")
setResult(null)

let volumetric = 0
let totalQty = 0

dimensions.forEach(box=>{
const v = (box.length * box.width * box.height * box.qty)/5000
volumetric += Number(v)
totalQty += Number(box.qty || 0)
})

try{

const res = await fetch("https://faithcargo.onrender.com/api/rates/b2b/calculate/",{
method:"POST",
headers:{ "Content-Type":"application/json"},
body: JSON.stringify({
origin: form.origin,
destination: form.destination,
weight: Number(form.weight),
invoiceValue: Number(form.invoiceValue),
paymentMode: form.paymentMode,
insurance: form.insurance,
appointment: form.appointment,
dimensions
})
})

const data = await res.json()

if(data.error){
setError(data.error)
setLoading(false)
return
}

// ================= WEIGHT =================
const cw = Math.max(Number(form.weight), volumetric)

data.volumetric_weight = volumetric.toFixed(2)
data.chargeable_weight = cw.toFixed(2)

// ================= ODA =================
data.is_oda = data.is_oda ?? false
data.oda_charge = data.is_oda ? Number(data.oda_charge || 650) : 0

// ================= GST + FOV =================
const gst = Number(data.total_charge) * 0.18
const fov = 75

data.gst = gst.toFixed(2)
data.fov_charge = fov

let total = Number(data.total_charge) + gst + fov

// ================= COD =================
let cod = 0
if(form.paymentMode==="COD" || form.paymentMode==="ToPay"){
cod = 150
}
data.cod_charge = cod
total += cod

// ================= HANDLING =================
let handling = 0
if(totalQty === 1 && cw > 70){
handling = 750
}
data.handling_charge = handling
total += handling

// ================= FINAL =================
data.total_with_gst = total.toFixed(2)

// ✅ MOST IMPORTANT
setResult(data)

}catch{
setError("Server Error")
}

setLoading(false)
}

return(

<div className="main-container">

<h1 className="title">FCPL Rate Calculator</h1>

<div className="calculator-container">

{/* FORM */}
<div className="form-card">

<input placeholder="Origin Pincode" name="origin" value={form.origin} onChange={handleChange}/>
<input placeholder="Destination Pincode" name="destination" value={form.destination} onChange={handleChange}/>

<select name="paymentMode" value={form.paymentMode} onChange={handleChange}>
<option>Prepaid</option>
<option>COD</option>
<option>ToPay</option>
</select>

<input type="number" placeholder="Weight (Kg)" name="weight" value={form.weight} onChange={handleChange}/>

<input placeholder="Invoice Value" name="invoiceValue" value={form.invoiceValue} onChange={handleChange}/>

{/* COD INPUT */}
{(form.paymentMode==="COD" || form.paymentMode==="ToPay") && (
<input placeholder="COD Amount" name="codAmount" value={form.codAmount} onChange={handleChange}/>
)}

<h3>Dimensions</h3>

{dimensions.map((box,i)=>(
<div key={i} className="dimension-row">
<input name="qty" placeholder="Qty" value={box.qty} onChange={(e)=>handleDimChange(i,e)}/>
<input name="length" placeholder="L" value={box.length} onChange={(e)=>handleDimChange(i,e)}/>
<input name="width" placeholder="W" value={box.width} onChange={(e)=>handleDimChange(i,e)}/>
<input name="height" placeholder="H" value={box.height} onChange={(e)=>handleDimChange(i,e)}/>
<button onClick={()=>removeBox(i)}>✕</button>
</div>
))}

<button onClick={addBox}>+ Add Box</button>

<button onClick={calculateRate}>
{loading ? "Calculating..." : "Calculate"}
</button>

<button onClick={resetForm}>Reset</button>

{error && <p style={{color:"red"}}>{error}</p>}

</div>

{/* RESULT */}
<div className="result-card">

{result && (

<div className="rate-card">

<h2>₹ {result.total_with_gst}</h2>

{result.is_oda && (
<div style={{color:"red",fontWeight:"bold"}}>
⚠️ ODA Location
</div>
)}

<div className="charge-row">
<span>Freight</span>
<span>₹ {result.freight_charge}</span>
</div>

<div className="charge-row">
<span>Fuel</span>
<span>₹ {result.fuel_charge}</span>
</div>

{result.is_oda && (
<div className="charge-row">
<span>ODA</span>
<span>₹ {result.oda_charge}</span>
</div>
)}

<div className="charge-row">
<span>GST</span>
<span>₹ {result.gst}</span>
</div>

{(form.paymentMode==="COD" || form.paymentMode==="ToPay") && (
<div className="charge-row">
<span>COD</span>
<span>₹ 150</span>
</div>
)}

{result.handling_charge > 0 && (
<div className="charge-row">
<span>Handling</span>
<span>₹ 750</span>
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