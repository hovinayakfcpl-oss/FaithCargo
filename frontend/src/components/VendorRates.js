import React, { useState } from "react";
import "./VendorRateCalculator.css";

// Contracts
import PDLOGISTICS_CONTRACT from "../data/contracts/PDLOGISTICS.json";
import GATIALLCARGO_CONTRACT from "../data/contracts/GATIALLCARGO.json";
import RIVIGO_CONTRACT from "../data/contracts/RIVIGO.json";
import VXPRESS_CONTRACT from "../data/contracts/VXPRESS.json";
import DELIHVERY_CONTRACT from "../data/contracts/DELIHVERY.json";

// Pincodes
import PDLOGISTICS_PINCODES from "../data/pincodes/PDLOGISTICS.json";
import GATIALLCARGO_PINCODES from "../data/pincodes/GATIALLCARGO.json";
import RIVIGO_PINCODES from "../data/pincodes/RIVIGO.json";
import VXPRESS_PINCODES from "../data/pincodes/VXPRESS.json";
import DELIHVERY_PINCODES from "../data/pincodes/DELIHVERY.json";

const vendorContracts = {
  PDLOGISTICS: PDLOGISTICS_CONTRACT,
  GATIALLCARGO: GATIALLCARGO_CONTRACT,
  RIVIGO: RIVIGO_CONTRACT,
  VXPRESS: VXPRESS_CONTRACT,
  DELIHVERY: DELIHVERY_CONTRACT,
};

const vendorPincodes = {
  PDLOGISTICS: PDLOGISTICS_PINCODES,
  GATIALLCARGO: GATIALLCARGO_PINCODES,
  RIVIGO: RIVIGO_PINCODES,
  VXPRESS: VXPRESS_PINCODES,
  DELIHVERY: DELIHVERY_PINCODES,
};

// Helper for ODA check
const matchODA = (vendorName, destination) => {
  const pincodeList = vendorPincodes[vendorName];
  if (!pincodeList) return "No";

  if (Array.isArray(pincodeList)) {
    const match = pincodeList.find(
      (entry) =>
        (entry.Pincode || entry.pincode)?.toString() === destination &&
        (entry.ODA === true || entry.oda === true)
    );
    return match ? "Yes" : "No";
  }

  if (typeof pincodeList === "object") {
    return pincodeList[destination] === true ? "Yes" : "No";
  }

  return "No";
};

function VendorRateCalculator() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState("Prepaid");
  const [weight, setWeight] = useState("");
  const [invoice, setInvoice] = useState("");
  const [dimensions, setDimensions] = useState([{ qty: 1, length: "", width: "", height: "" }]);
  const [results, setResults] = useState([]);

  const addDimension = () => {
    setDimensions([...dimensions, { qty: 1, length: "", width: "", height: "" }]);
  };

  const updateDimension = (index, field, value) => {
    const newDims = [...dimensions];
    newDims[index][field] = value;
    setDimensions(newDims);
  };

  const calculateRates = () => {
    if (!pickup || !destination || !weight) {
      alert("Please fill mandatory fields!");
      return;
    }

    const calcResults = [];

    Object.keys(vendorContracts).forEach((vendorName) => {
      const contract = vendorContracts[vendorName];
      let perKgRate = 0;

      if (vendorName === "VXPRESS") {
        // VXPRESS special handling
        const rateMatrix = contract.rate_matrix;
        // Removed unused 'zones' variable to clear ESLint warning
        
        const originZone = Object.keys(rateMatrix)[0]; 
        const destZone = Object.keys(rateMatrix[originZone])[0]; 
        perKgRate = rateMatrix[originZone][destZone];
      } else {
        // Generic handling for other vendors
        const rateStructures = contract.rates || contract.freight_rates || contract.base_rates;
        if (!rateStructures) return;

        const originZones = Object.keys(rateStructures);
        if (originZones.length === 0) return;
        const originZone = originZones[0];

        const destZones = Object.keys(rateStructures[originZone]);
        if (destZones.length === 0) return;
        const destZone = destZones[0];

        const perKgRateObj = rateStructures[originZone][destZone];
        if (typeof perKgRateObj === "object") {
          const firstKey = Object.keys(perKgRateObj)[0];
          perKgRate = perKgRateObj[firstKey];
        } else {
          perKgRate = perKgRateObj;
        }
      }

      // Volumetric weight calculation
      let volumetricWeight = 0;
      dimensions.forEach((dim) => {
        if (dim.length && dim.width && dim.height && dim.qty) {
          volumetricWeight += (Number(dim.length) * Number(dim.width) * Number(dim.height) * Number(dim.qty)) / 5000;
        }
      });

      const chargeableWeight = Math.max(Number(weight), volumetricWeight);
      const weightCharge = perKgRate * chargeableWeight;

      const docketCharge =
        contract.extra_charges?.docket_charge ||
        contract.vas_charges?.docket_charge ||
        contract.charges?.basic_docket ||
        contract.contract?.terms?.cn_charge ||
        75;

      const baseFreight = weightCharge + docketCharge;
      const fscPercent = parseFloat(
        contract.extra_charges?.fsc_percent ||
        contract.vas_charges?.fsc ||
        contract.contract?.terms?.fuel_surcharge?.percentage ||
        0
      );

      const fuelSurcharge = (fscPercent / 100) * baseFreight;
      const total = baseFreight + fuelSurcharge;

      let modeCharge = 0;
      if (mode === "COD")
        modeCharge =
          contract.extra_charges?.dod ||
          contract.vas_charges?.cod_charges ||
          contract.charges?.cod_dod ||
          125;
      if (mode === "ToPay")
        modeCharge = contract.extra_charges?.to_pay || contract.vas_charges?.fod_to_pay || 200;

      const gst = total * 0.18;
      const grandTotal = total + gst + modeCharge;

      const odaStatus = matchODA(vendorName, destination);

      calcResults.push({
        vendorName,
        total: grandTotal,
        breakdown: {
          perKgRate,
          volumetricWeight,
          chargeableWeight,
          weightCharge,
          docketCharge,
          fuelSurcharge,
          gst,
          modeCharge,
          oda: odaStatus,
        },
      });
    });

    setResults(calcResults);
  };

  return (
    <div className="vendor-rate-page">
      <h2 className="title">📦 Vendor Rate Calculator</h2>

      <div className="big-card">
        <div className="calculator-container">
          <div className="form-card">
            <div className="row">
              <div className="col">
                <label>Origin Pincode *</label>
                <input type="text" value={pickup} onChange={(e) => setPickup(e.target.value)} />
              </div>
              <div className="col">
                <label>Destination Pincode *</label>
                <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} />
              </div>
            </div>

            <label>Payment Mode *</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="Prepaid">Prepaid</option>
              <option value="COD">COD</option>
              <option value="ToPay">ToPay</option>
            </select>

            <div className="row">
              <div className="col small">
                <label>Weight (Kg) *</label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <div className="col small">
                <label>Invoice Value</label>
                <input type="number" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
              </div>
            </div>

            {dimensions.map((dim, idx) => (
              <div key={idx} className="row">
                <div className="col small">
                  <label>Qty</label>
                  <input type="number" value={dim.qty} onChange={(e) => updateDimension(idx, "qty", e.target.value)} />
                </div>
                <div className="col small">
                  <label>L</label>
                  <input type="number" value={dim.length} onChange={(e) => updateDimension(idx, "length", e.target.value)} />
                </div>
                <div className="col small">
                  <label>W</label>
                  <input type="number" value={dim.width} onChange={(e) => updateDimension(idx, "width", e.target.value)} />
                </div>
                <div className="col small">
                  <label>H</label>
                  <input type="number" value={dim.height} onChange={(e) => updateDimension(idx, "height", e.target.value)} />
                </div>
              </div>
            ))}
            <button className="add-btn" onClick={addDimension}>+ Add Dimension</button>

            <div className="btn-group">
              <button className="calc-btn" onClick={calculateRates}>Calculate</button>
              <button className="reset-btn" onClick={() => window.location.reload()}>Reset</button>
              <button className="back-btn">Back</button>
            </div>
          </div>

          <div className="main-result-card">
            {results.length === 0 ? (
              <p style={{ color: "#d32f2f" }}>Enter shipment details and click Calculate</p>
            ) : (
              <div className="result-grid">
                {results.map((vendor, idx) => (
                  <div key={idx} className="vendor-card">
                    <h3 className="vendor-name">{vendor.vendorName}</h3>
                    <p className="total-price">Total: ₹{vendor.total.toFixed(2)}</p>

                    <div className="contract-card">
                      <p>Per Kg Rate: ₹{vendor.breakdown.perKgRate.toFixed(2)}</p>
                      <p>Weight Charge: ₹{vendor.breakdown.weightCharge.toFixed(2)}</p>
                      <p>Volumetric Weight: {vendor.breakdown.volumetricWeight.toFixed(2)} Kg</p>
                      <p>Chargeable Weight: {vendor.breakdown.chargeableWeight.toFixed(2)} Kg</p>
                      <p>Docket: ₹{vendor.breakdown.docketCharge.toFixed(2)}</p>
                      <p>Fuel: ₹{vendor.breakdown.fuelSurcharge.toFixed(2)}</p>
                      <p>GST: ₹{vendor.breakdown.gst.toFixed(2)}</p>
                      <p>Mode Charge: ₹{vendor.breakdown.modeCharge.toFixed(2)}</p>
                      <p>
                        ODA:{" "}
                        <span className={vendor.breakdown.oda === "Yes" ? "oda-yes" : "oda-no"}>
                          {vendor.breakdown.oda}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VendorRateCalculator;