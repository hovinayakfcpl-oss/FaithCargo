import React, { useState } from "react";
import "./VendorManage.css";

import DELHIVERY from "../data/contracts/DELIHVERY.json";
import GATI from "../data/contracts/GATIALLCARGO.json";
import PD from "../data/contracts/PDLOGISTICS.json";
import RIVIGO from "../data/contracts/RIVIGO.json";
import VXPRESS from "../data/contracts/VXPRESS.json";

const vendorContracts = {
  DELHIVERY,
  GATI,
  PD,
  RIVIGO,
  VXPRESS
};

const zones = [
  "N1","N2","N3","Central","W1","W2","S1","S2","E","NE1","NE2","NE3",
  "North 1","North 2","West 1","West 2","South 1","South 2","East",
  "North East","North East 1","SXR","IXZ"
];

function RateMatrixTable({ vendor, contract }) {
  const initialRates = contract.rates || contract.freight_rates || {};
  const [editedRates, setEditedRates] = useState(initialRates);

  const handleChange = (setName, fromZone, toZone, value) => {
    setEditedRates(prev => ({
      ...prev,
      [setName]: {
        ...prev[setName],
        [fromZone]: {
          ...prev[setName][fromZone],
          [toZone]: value
        }
      }
    }));
  };

  const handleUpdate = () => {
    fetch(`/api/update-vendor-rate/${vendor}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editedRates)
    })
    .then(res => res.json())
    .then(data => {
      alert(`${vendor} rates updated successfully!`);
    })
    .catch(err => alert("Error updating rates: " + err));
  };

  return (
    <div className="vendor-card">
      <h3>{vendor} Contract</h3>

      {Object.keys(editedRates).map(setName => {
        const matrix = editedRates[setName];
        return (
          <div key={setName} className="rate-set">
            <h4>{setName}</h4>
            <table className="rate-matrix">
              <thead>
                <tr>
                  <th>Zone</th>
                  {zones.map(z => <th key={z}>{z}</th>)}
                </tr>
              </thead>
              <tbody>
                {zones.map(fz => (
                  <tr key={fz}>
                    <td>{fz}</td>
                    {zones.map(tz => (
                      <td key={tz}>
                        <input
                          type="number"
                          value={matrix?.[fz]?.[tz] ?? ""}
                          onChange={e => handleChange(setName, fz, tz, parseFloat(e.target.value))}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <h4>Charges</h4>
      <p>Docket : {contract.vas_charges?.docket_charge || contract.charges?.basic_docket || 0}</p>
      <p>Fuel Surcharge : {contract.vas_charges?.fsc || "0%"} </p>
      <p>Minimum Weight : {contract.vas_charges?.minimum_weight_surface || contract.charges?.minimum_weight || 0}</p>
      <p>Insurance/FOV : {contract.vas_charges?.fov || contract.charges?.owner_risk?.upto_10000 || "0%"} </p>
      <p>ODA : {contract.vas_charges?.oda_charges || contract.charges?.jk_kerala || 0}</p>
      <p>GST : {contract.vas_charges?.gst || "18%"} </p>

      <button className="update-btn" onClick={handleUpdate}>Update Rate</button>
    </div>
  );
}

function VendorManage() {
  return (
    <div className="vendor-manage-page">
      <h2 className="title">FCPL Vendor Contract Manager</h2>

      {Object.keys(vendorContracts).map(vendor => (
        <RateMatrixTable
          key={vendor}
          vendor={vendor}
          contract={vendorContracts[vendor]}
        />
      ))}
    </div>
  );
}

export default VendorManage;
