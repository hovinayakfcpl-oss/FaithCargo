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

// INPUT CHANGE
const handleChange = (e)=>{
const {name,value,type,checked} = e.target

setForm({
...form,
[name]: type==="checkbox" ? checked : value
})
}

// DIMENSION CHANGE
const handleDimChange = (index,e)=>{
const {name,value} = e.target
const newDims = [...dimensions]
newDims[index][name] = value
setDimensions(newDims)
}

// ADD BOX
const addBox = ()=>{
setDimensions([
...dimensions,
{qty:1,length:"",width:"",height:""}
])
}

// REMOVE BOX
const removeBox = (index)=>{
const newDims = dimensions.filter((_,i)=> i!==index)
setDimensions(newDims)
}

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
  setLoading(true);
  setError("");
  setResult(null);

  let volumetric = 0;

  dimensions.forEach(box => {
    const v = (box.length * box.width * box.height * box.qty) / 5000;
    volumetric += Number(v);
  });

  try {
    const res = await fetch("https://faithcargo.onrender.com/api/rates/b2b/calculate/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: form.origin,
        destination: form.destination,
        weight: Number(form.weight),
        invoiceValue: Number(form.invoiceValue),
        paymentMode: form.paymentMode,
        insurance: form.insurance,
        appointment: form.appointment,
        dimensions: dimensions
      })
    });

    const data = await res.json();

    if (data.error) {
      setError(data.error);
      return;
    }

    // =========================
    // WEIGHT
    // =========================
    data.volumetric_weight = volumetric.toFixed(2);

    if (Number(form.weight) > volumetric) {
      data.chargeable_weight = Number(form.weight).toFixed(2);
    } else {
      data.chargeable_weight = volumetric.toFixed(2);
    }

    // =========================
    // GST + FOV
    // =========================
    const gst = data.total_charge * 0.18;
    const fov = 75;

    data.gst = gst.toFixed(2);
    data.fov_charge = fov.toFixed(2);

    // =========================
    // TOTAL
    // =========================
    let total = Number(data.total_charge) + gst + fov;

    // =========================
    // COD / ToPay
    // =========================
    let codCharge = 0;

    if (form.paymentMode === "COD" || form.paymentMode === "ToPay") {
      const amount = Number(form.codAmount) || 0;
      const percent = amount * 0.025;
      codCharge = Math.max(150, percent);
    }

    data.cod_charge = codCharge.toFixed(2);
    total += codCharge;

    // =========================
    // HANDLING
    // =========================
    let handling = 0;

    const totalQty = dimensions.reduce((sum, b) => sum + Number(b.qty), 0);

    if (totalQty === 1 && Number(data.chargeable_weight) > 80) {
      const perKg = Number(data.chargeable_weight) * 2;
      handling = Math.max(500, perKg);
    }

    data.handling_charge = handling.toFixed(2);
    total += handling;

    // =========================
    // FINAL TOTAL
    // =========================
    data.total_with_gst = total.toFixed(2);

    // ✅ FIX
    data.is_oda = data.is_oda ?? false;

    // ✅ MAIN FIX (VERY IMPORTANT)
    setResult(data);

  } catch {
    setError("Server Error");
  }

  setLoading(false);
};

return(

<div className="main-container">

<h1 className="title">BA & B2B Rate Calculator</h1>

<div className="calculator-container">

{/* FORM */}
<div className="form-card">

<input name="origin" placeholder="Origin Pincode" value={form.origin} onChange={handleChange}/>
<input name="destination" placeholder="Destination Pincode" value={form.destination} onChange={handleChange}/>
<input type="number" name="weight" placeholder="Weight" value={form.weight} onChange={handleChange}/>

<button onClick={calculateRate}>
{loading ? "Calculating..." : "Calculate"}
</button>

</div>

{/* RESULT */}
<div className="result-card">

{result ? (

<div className="rate-card">

<h2>₹ {result.total_with_gst}</h2>

<p>Charged Wt : {result.chargeable_weight} Kg</p>

{result.is_oda && (
  <div style={{color:"red", fontWeight:"bold"}}>
    ⚠️ This is ODA Location
  </div>
)}

<div className="charge-row">
<span>Freight Charge</span>
<span>₹ {result.freight_charge}</span>
</div>

{/* ✅ ODA FIX */}
<div className="charge-row">
<span>ODA Charge ({result.chargeable_weight} × 3₹ / min 650)</span>
<span>₹ {result.is_oda ? result.oda_charge : 0}</span>
</div>

<div className="charge-row">
<span>Fuel Charge</span>
<span>₹ {result.fuel_charge}</span>
</div>

<div className="charge-row">
<span>FOV Charge</span>
<span>₹ {result.fov_charge}</span>
</div>

<div className="charge-row">
<span>GST (18%)</span>
<span>₹ {result.gst}</span>
</div>

{(form.paymentMode === "COD" || form.paymentMode === "ToPay") && (
<div className="charge-row">
<span>COD / ToPay Charge</span>
<span>₹ {result.cod_charge}</span>
</div>
)}

{Number(result.handling_charge) > 0 && (
<div className="charge-row">
<span>Handling Charge</span>
<span>₹ {result.handling_charge}</span>
</div>
)}

</div>

) : (

<p>Enter shipment details and calculate</p>

)}

</div>

</div>

</div>

)

}

export default B2BRateCalculator;