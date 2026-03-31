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
  } else {
  const isOda = data.oda ?? data.is_oda;
  // 🔥 DEBUG LOG YAHAN ADD KAR
  console.log("===== API RESPONSE START =====");
  console.log("FULL DATA:", data);
  console.log("ODA FLAG:", data.oda);
  console.log("ODA CHARGE:", data.oda_charge);
  console.log("TOTAL:", data.total_charge);
  console.log("DEST:", form.destination);
  console.log("===== API RESPONSE END =====");

      // =========================
      // WEIGHT DISPLAY
      // =========================
      data.volumetric_weight = volumetric.toFixed(2);

      if (Number(form.weight) > volumetric) {
        data.chargeable_weight = Number(form.weight).toFixed(2);
        data.basis = "Actual Weight";
      } else {
        data.chargeable_weight = volumetric.toFixed(2);
        data.basis = "Volumetric Weight";
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
      let total = Number(data.total_charge) + Number(gst) + Number(fov);

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
      if (data.error) {
      setError(data.error);
      setResult(null);
      return;
    }

if (data.error) {
  setError(data.error);
  return;
}

// ensure boolean
data.is_oda = Boolean(data.is_oda);
    }

  } catch {
    setError("Server Error");
  }

  setLoading(false);
};
}

return(

<div className="main-container">

<h1 className="title">
BA & B2B Rate Calculator
</h1>

<div className="calculator-container">

{/* FORM */}

<div className="form-card">

<div className="row">

<div className="field">
<label>Origin Pincode</label>
<input name="origin" value={form.origin} onChange={handleChange}/>
</div>

<div className="field">
<label>Destination Pincode</label>
<input name="destination" value={form.destination} onChange={handleChange}/>
</div>

</div>

<div className="row">

<div className="field">
<label>Payment Mode</label>
<select name="paymentMode" value={form.paymentMode} onChange={handleChange}>
<option>Prepaid</option>
<option>COD</option>
<option>ToPay</option>
</select>
</div>

<div className="field">
<label>Approx Weight (Kg)</label>
<input type="number" name="weight" value={form.weight} onChange={handleChange}/>
</div>

</div>

{/* Invoice */}
<div className="invoice-row">
<label>Invoice Value</label>
<input
type="number"
name="invoiceValue"
value={form.invoiceValue}
onChange={handleChange}
/>
</div>

{/* ✅ COD INPUT */}
{(form.paymentMode === "COD" || form.paymentMode === "ToPay") && (
  <div className="invoice-row">
    <label>COD / ToPay Amount</label>
    <input
      type="number"
      name="codAmount"
      value={form.codAmount}
      onChange={handleChange}
    />
  </div>
)}

<h3>Dimensions</h3>

{dimensions.map((box,index)=>(

<div key={index} className="dimension-row">

<input type="number" placeholder="Qty"
name="qty"
value={box.qty}
onChange={(e)=>handleDimChange(index,e)}/>

<input type="number" placeholder="Length"
name="length"
value={box.length}
onChange={(e)=>handleDimChange(index,e)}/>

<input type="number" placeholder="Width"
name="width"
value={box.width}
onChange={(e)=>handleDimChange(index,e)}/>

<input type="number" placeholder="Height"
name="height"
value={box.height}
onChange={(e)=>handleDimChange(index,e)}/>

<button onClick={()=>removeBox(index)}>✕</button>

</div>

))}

<button className="add-btn" onClick={addBox}>
+ Add Dimension
</button>

<div className="check">

<label>
<input type="checkbox"
name="insurance"
checked={form.insurance}
onChange={handleChange}/>
Insurance
</label>

<label>
<input type="checkbox"
name="appointment"
checked={form.appointment}
onChange={handleChange}/>
Appointment
</label>

</div>

<div className="button-row">

<button className="calc-btn" onClick={calculateRate}>
{loading ? "Calculating..." : "Calculate"}
</button>

<button className="reset-btn" onClick={resetForm}>
Reset
</button>

</div>

</div>


{/* RESULT */}

<div className="result-card">

{result ? (

<div className="rate-card">

<div className="rate-header">

<div className="logo">
FCPL
</div>

<div className="rate-info">

<h3>FCPL Rate 🚚</h3>
<p>Charged Wt : {result.chargeable_weight} Kg</p>

</div>

<div className="rate-price">

<h2>₹ {result.total_with_gst}</h2>

<p>Min Amt: 650 + GST</p>

</div>

</div>

<button className="bifurcation-btn">
Charges Bifurcation ↓
</button>

<div className="charges-box">

<div className="charge-row">
<span>Zone</span>
<span>{result.from_zone} → {result.to_zone}</span>
</div>

<div className="charge-row">
<span>Actual Weight</span>
<span>{form.weight} Kg</span>
</div>

<div className="charge-row">
<span>Volumetric Weight</span>
<span>{result.volumetric_weight} Kg</span>
</div>

<div className="charge-row">
<span>Chargeable Weight</span>
<span>{result.chargeable_weight} Kg</span>
</div>

<div className="charge-row">
<span>Rate / Kg</span>
<span>₹ {result.rate_per_kg}</span>
</div>
{result.is_oda && (
  <div style={{color:"red", fontWeight:"bold"}}>
    ⚠️ This is ODA Location
  </div>
)}
<span>
  ODA Charge ({result.chargeable_weight} × 3₹ / min 650)
</span>

<div className="charge-row">
<span>Rate Charge</span>
<span>₹ {result.freight_charge} ({result.rate_per_kg}/Kg)</span>
</div>




<div className="charge-row">
<span>Fuel Surcharge (15%)</span>
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

{/* ✅ COD */}
{(form.paymentMode === "COD" || form.paymentMode === "ToPay") && (
<div className="charge-row">
<span>COD / ToPay Charge</span>
<span>₹ {result.cod_charge}</span>
</div>
)}

{/* ✅ Handling */}
{Number(result.handling_charge) > 0 && (
<div className="charge-row">
<span>Handling Charge</span>
<span>₹ {result.handling_charge}</span>
</div>

)}

</div>

</div>

) : (

<p className="placeholder">
Enter shipment details and click Calculate
</p>

)}

</div>

</div>

</div>

)



export default B2BRateCalculator;