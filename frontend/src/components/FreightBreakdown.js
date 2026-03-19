import React from "react"

function FreightBreakdown({data}){

if(!data) return null

return(

<div>

<h3>Freight Breakdown</h3>

<p>Freight : ₹{data.freight}</p>

<p>Docket : ₹{data.docket}</p>

<p>Fuel : ₹{data.fuel}</p>

<p>ODA : ₹{data.oda_charge}</p>

<p>Insurance : ₹{data.insurance}</p>

<hr/>

<h2>Total : ₹{data.total_charge}</h2>

</div>

)

}

export default FreightBreakdown