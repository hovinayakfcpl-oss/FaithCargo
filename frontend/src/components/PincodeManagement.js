import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/common.css";

function PincodeManagement(){

const navigate = useNavigate()

const [formData,setFormData] = useState({
pincode:"",
zone:"",
isODA:false
})

const [csvFile,setCsvFile] = useState(null)

const [search,setSearch] = useState("")

const [pincodeList,setPincodeList] = useState([])

const [message,setMessage] = useState("")
const [error,setError] = useState("")

// INPUT CHANGE

const handleChange = (e)=>{

const {name,value,type,checked} = e.target

setFormData({
...formData,
[name]: type==="checkbox" ? checked : value
})

}

// ADD PINCODE

const addPincode = async ()=>{

setMessage("")
setError("")

try{

const response = await fetch("/pincode/add/",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(formData)

})

const data = await response.json()

if(data.error){

setError(data.error)

}else{

setMessage("Pincode added successfully")

setFormData({
pincode:"",
zone:"",
isODA:false
})

}

}catch{

setError("Backend server error")

}

}

// CSV IMPORT

const handleFileChange = (e)=>{

setCsvFile(e.target.files[0])

}

const importCSV = async ()=>{

if(!csvFile){

setError("Please select CSV file")
return

}

let formDataUpload = new FormData()

formDataUpload.append("file",csvFile)

try{

const response = await fetch("/api/pincode/import/",{

method:"POST",
body:formDataUpload

})

const data = await response.json()

if(data.error){

setError(data.error)

}else{

setMessage("CSV Imported: "+data.imported+" new , "+data.updated+" updated")

}

}catch{

setError("CSV import failed")

}

}

// SEARCH PINCODE

const searchPincode = async ()=>{

if(!search){

setError("Enter pincode to search")
return

}

try{

const res = await fetch("/api/pincode/search/?pincode="+search)

const data = await res.json()

setPincodeList(data)

}catch{

setError("Search failed")

}

}

// DELETE PINCODE

const deletePincode = async (pincode)=>{

if(!window.confirm("Delete this pincode?")) return

await fetch("/api/pincode/delete/",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({pincode})

})

searchPincode()

}

// UPDATE PINCODE

const updatePincode = async (item)=>{

await fetch("/api/pincode/update/",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(item)

})

setMessage("Updated successfully")

}

return(

<div className="pincode-management-page">

<h2>Pincode Management</h2>

{/* ADD PINCODE */}

<div className="card">

<h3>Add Pincode</h3>

<div className="form-grid">

<label>
Pincode
<input
type="text"
name="pincode"
value={formData.pincode}
onChange={handleChange}
/>
</label>

<label>
Zone
<input
type="text"
name="zone"
value={formData.zone}
onChange={handleChange}
/>
</label>

<label>
ODA
<input
type="checkbox"
name="isODA"
checked={formData.isODA}
onChange={handleChange}
/>
</label>

</div>

<button onClick={addPincode}>
Add Pincode
</button>

</div>

{/* CSV IMPORT */}

<div className="card">

<h3>Import Pincode CSV</h3>

<input type="file" accept=".csv" onChange={handleFileChange}/>

<button onClick={importCSV}>
Import CSV
</button>

</div>

{/* SEARCH */}

<div className="card">

<h3>Search Pincode</h3>

<input
type="text"
placeholder="Enter pincode"
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

<button onClick={searchPincode}>
Search
</button>

</div>

{/* RESULT TABLE */}

{pincodeList.length > 0 && (

<div className="card">

<h3>Pincode List</h3>

<table>

<thead>

<tr>

<th>Pincode</th>
<th>City</th>
<th>State</th>
<th>Zone</th>
<th>ODA</th>
<th>Action</th>

</tr>

</thead>

<tbody>

{pincodeList.map((p,index)=>(

<tr key={index}>

<td>{p.pincode}</td>

<td>{p.city}</td>

<td>{p.state}</td>

<td>

<input
value={p.zone}
onChange={(e)=>{

const newList=[...pincodeList]

newList[index].zone=e.target.value

setPincodeList(newList)

}}
/>

</td>

<td>

<input
type="checkbox"
checked={p.is_oda}

onChange={(e)=>{

const newList=[...pincodeList]

newList[index].is_oda=e.target.checked

setPincodeList(newList)

}}

>

</input>

</td>

<td>

<button onClick={()=>updatePincode(p)}>
Update </button>

<button onClick={()=>deletePincode(p.pincode)}>
Delete </button>

</td>

</tr>

))}

</tbody>

</table>

</div>

)}

{/* MESSAGE */}

{message && <div className="success-box">{message}</div>}
{error && <div className="error-box">{error}</div>}

<button onClick={()=>navigate("/admin")}>
Back to Dashboard </button>

</div>

)

}

export default PincodeManagement
