import React,{useState} from "react"

function ExcelUpload(){

const [file,setFile] = useState()

const upload = async()=>{

let form = new FormData()

form.append("file",file)

await fetch(

"https://faithcargo.onrender.com/api/rates/matrix/upload/",

{
method:"POST",
body:form
}

)

alert("Upload Success")

}

return(

<div>

<input type="file"
onChange={(e)=>setFile(e.target.files[0])}
/>

<button onClick={upload}>
Upload Excel
</button>

</div>

)

}

export default ExcelUpload