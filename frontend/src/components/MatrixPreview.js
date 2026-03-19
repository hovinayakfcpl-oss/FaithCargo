import React,{useEffect,useState} from "react"

const zones = ["N1","N2","N3","C1","W1","W2","S1","S2","E1","NE1","NE2"]

function MatrixPreview(){

const [matrix,setMatrix] = useState({})

useEffect(()=>{

fetch("https://faithcargo.onrender.com/api/rates/matrix/")
.then(res=>res.json())
.then(data=>{

let m = {}

zones.forEach(f=>{

m[f] = {}

zones.forEach(t=>{

m[f][t] = "-"

})

})

data.forEach(r=>{

m[r.from_zone][r.to_zone] = r.rate

})

setMatrix(m)

})

},[])

return(

<table border="1">

<thead>

<tr>

<th>Zone</th>

{zones.map(z=>(<th key={z}>{z}</th>))}

</tr>

</thead>

<tbody>

{zones.map(from=>(

<tr key={from}>

<td>{from}</td>

{zones.map(to=>(

<td key={to}>{matrix[from]?.[to]}</td>

))}

</tr>

))}

</tbody>

</table>

)

}

export default MatrixPreview