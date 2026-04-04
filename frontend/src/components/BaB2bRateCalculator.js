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

    // WEIGHT
    data.volumetric_weight = volumetric.toFixed(2);
    data.chargeable_weight = Math.max(Number(form.weight), volumetric).toFixed(2);

    // ODA
    data.is_oda = data.is_oda ?? false;
    data.oda_charge = data.is_oda ? Number(data.oda_charge || 650) : 0;

    // GST + FOV
    const gst = Number(data.total_charge) * 0.18;
    const fov = 75;

    data.gst = gst.toFixed(2);
    data.fov_charge = fov.toFixed(2);

    let total = Number(data.total_charge) + gst + fov;

    // COD
    let codCharge = 0;
    if (form.paymentMode === "COD" || form.paymentMode === "ToPay") {
      const amount = Number(form.codAmount) || 0;
      codCharge = Math.max(150, amount * 0.025);
    }

    data.cod_charge = codCharge.toFixed(2);
    total += codCharge;

    // HANDLING
    let handling = 0;
    const totalQty = dimensions.reduce((sum, b) => sum + Number(b.qty), 0);

    if (totalQty === 1 && Number(data.chargeable_weight) > 80) {
      handling = Math.max(500, Number(data.chargeable_weight) * 2);
    }

    data.handling_charge = handling.toFixed(2);
    total += handling;

    data.total_with_gst = total.toFixed(2);

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

{/* DIMENSIONS UI */}
<h4>Dimensions</h4>

{dimensions.map((dim,i)=>(
<div key={i} className="dim-row">
<input name="length" placeholder="L" value={dim.length} onChange={(e)=>handleDimChange(i,e)}/>
<input name="width" placeholder="W" value={dim.width} onChange={(e)=>handleDimChange(i,e)}/>
<input name="height" placeholder="H" value={dim.height} onChange={(e)=>handleDimChange(i,e)}/>
<input name="qty" placeholder="Qty" value={dim.qty} onChange={(e)=>handleDimChange(i,e)}/>

<button onClick={()=>removeBox(i)}>❌</button>
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

{result ? (

<div className="invoice-card">

<h2>₹ {result.total_with_gst}</h2>

{result.is_oda && <div className="oda-alert">⚠️ ODA Location</div>}

<table>
<tbody>

<tr><td>Freight</td><td>₹ {result.freight_charge}</td></tr>
<tr><td>Fuel</td><td>₹ {result.fuel_charge}</td></tr>
<tr><td>ODA</td><td>₹ {result.oda_charge}</td></tr>
<tr><td>GST</td><td>₹ {result.gst}</td></tr>

{Number(result.handling_charge) > 0 && (
<tr><td>Handling</td><td>₹ {result.handling_charge}</td></tr>
)}

</tbody>
</table>

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