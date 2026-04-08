import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import {
  Truck, MapPin, Package, FileText, Plus, Trash2,
  Calculator, CheckCircle, Printer, Upload, RefreshCw
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

/* ============================
   🔥 DOCKET PRINT COMPONENT
============================ */
const Docket = ({ data, lr }) => {
  const barcodeRef = useRef();

  useEffect(() => {
    if (lr && barcodeRef.current) {
      JsBarcode(barcodeRef.current, lr, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: false
      });
    }
  }, [lr]);

  return (
    <div className="docket-container print-only">
      <div className="docket-header">
        <div className="docket-logo-box">
          <img src={logo} className="docket-logo-img" />
          <div>
            <h2>FAITH CARGO PVT LTD</h2>
            <p className="docket-tagline">ISO CERTIFIED LOGISTICS</p>
          </div>
        </div>

        <div className="docket-lr-meta">
          <div className="lr-header-box">LR COPY</div>
          <canvas ref={barcodeRef}></canvas>
          <div className="lr-number-display">{lr}</div>
        </div>
      </div>

      <div className="docket-address-grid">
        <div className="address-box">
          <div className="box-label">FROM</div>
          <h3>{data.pickup.name}</h3>
          <p>{data.pickup.address}</p>
          <p>{data.pickup.city} - {data.pickup.pincode}</p>
        </div>

        <div className="address-box">
          <div className="box-label">TO</div>
          <h3>{data.delivery.name}</h3>
          <p>{data.delivery.address}</p>
          <p>{data.delivery.city} - {data.delivery.pincode}</p>
        </div>
      </div>

      <table className="docket-main-table">
        <thead>
          <tr>
            <th>PKG</th>
            <th>MATERIAL</th>
            <th>WT</th>
            <th>CHARGED WT</th>
            <th>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{data.boxes}</td>
            <td>{data.material}</td>
            <td>{data.weight}</td>
            <td>{data.chargedWeight}</td>
            <td>₹ {data.freight}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/* ============================
   🔥 LABEL PRINT
============================ */
const Label = ({ lr, cityFrom, cityTo }) => {
  const ref = useRef();

  useEffect(() => {
    if (lr && ref.current) {
      JsBarcode(ref.current, lr, { width: 3, height: 70 });
    }
  }, [lr]);

  return (
    <div className="print-only">
      <h2>FAITH CARGO</h2>
      <canvas ref={ref}></canvas>
      <h3>{cityFrom} → {cityTo}</h3>
    </div>
  );
};

/* ============================
   🚀 MAIN COMPONENT
============================ */
export default function CreateOrder() {

  const [pickup, setPickup] = useState({});
  const [delivery, setDelivery] = useState({});
  const [boxes, setBoxes] = useState([]);
  const [invoices, setInvoices] = useState([
    { id: 1, no: "", value: "", file: null }
  ]);

  const [material, setMaterial] = useState("");
  const [weight, setWeight] = useState("");
  const [freight, setFreight] = useState(0);

  const [lr, setLR] = useState("");
  const [loading, setLoading] = useState(false);
  const [printType, setPrintType] = useState("");

  /* ============================
     📦 VOLUMETRIC (CM / 4000)
  ============================ */
  const volWeight = useMemo(() => {
    let total = 0;
    boxes.forEach(b => {
      total += (b.l * b.w * b.h) / 4000;
    });
    return total.toFixed(2);
  }, [boxes]);

  const chargedWeight = Math.max(weight || 0, volWeight);

  /* ============================
     💰 FREIGHT API CALL
  ============================ */
  const calculateFreight = async () => {
    try {
      const res = await fetch("/api/calculate-freight/", {
        method: "POST",
        body: JSON.stringify({
          origin: pickup.pincode,
          destination: delivery.pincode,
          weight: chargedWeight
        })
      });

      const data = await res.json();
      if (data.success) setFreight(data.total_charge);
    } catch {
      alert("Freight API Error");
    }
  };

  /* ============================
     📤 CREATE ORDER
  ============================ */
  const createOrder = async () => {
    setLoading(true);

    const formData = {
      pickup,
      delivery,
      material,
      weight,
      invoices,
    };

    const res = await fetch("/api/create-order/", {
      method: "POST",
      body: JSON.stringify(formData)
    });

    const data = await res.json();

    setLR(data.lr_number);
    setLoading(false);
  };

  /* ============================
     🖨 PRINT
  ============================ */
  const handlePrint = (type) => {
    setPrintType(type);
    setTimeout(() => window.print(), 500);
  };

  /* ============================
     🎯 UI
  ============================ */
  return (
    <div className="order-wrapper">

      {/* LEFT FORM */}
      <div className="main-content">

        <div className="page-header">
          <h1>Create Order</h1>
        </div>

        {/* PICKUP */}
        <div className="premium-card">
          <div className="card-top red-accent">
            <MapPin /> Pickup
          </div>

          <div className="card-body">
            <input placeholder="Name"
              onChange={e => setPickup({ ...pickup, name: e.target.value })} />

            <input placeholder="Address"
              onChange={e => setPickup({ ...pickup, address: e.target.value })} />

            <input placeholder="Pincode"
              onChange={e => setPickup({ ...pickup, pincode: e.target.value })} />
          </div>
        </div>

        {/* DELIVERY */}
        <div className="premium-card">
          <div className="card-top red-accent">
            <MapPin /> Delivery
          </div>

          <div className="card-body">
            <input placeholder="Name"
              onChange={e => setDelivery({ ...delivery, name: e.target.value })} />

            <input placeholder="Address"
              onChange={e => setDelivery({ ...delivery, address: e.target.value })} />

            <input placeholder="Pincode"
              onChange={e => setDelivery({ ...delivery, pincode: e.target.value })} />
          </div>
        </div>

        {/* BOX DIMENSIONS */}
        <div className="premium-card">
          <div className="card-top">
            <Package /> Dimensions (CM)
          </div>

          <div className="card-body">
            <button onClick={() => setBoxes([...boxes, { l: 0, w: 0, h: 0 }])}>
              + Add Box
            </button>

            {boxes.map((b, i) => (
              <div key={i}>
                <input placeholder="L" onChange={e => {
                  let x = [...boxes]; x[i].l = e.target.value; setBoxes(x);
                }} />
                <input placeholder="W" onChange={e => {
                  let x = [...boxes]; x[i].w = e.target.value; setBoxes(x);
                }} />
                <input placeholder="H" onChange={e => {
                  let x = [...boxes]; x[i].h = e.target.value; setBoxes(x);
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* INVOICE + UPLOAD */}
        <div className="premium-card">
          <div className="card-top dark-accent">
            <FileText /> Invoice Upload
          </div>

          <div className="card-body">
            {invoices.map((inv) => (
              <div key={inv.id} className="dynamic-inv-row">

                <input placeholder="Invoice No"
                  onChange={e => inv.no = e.target.value} />

                <input placeholder="Value"
                  onChange={e => inv.value = e.target.value} />

                <input type="file"
                  onChange={e => inv.file = e.target.files[0]} />

                <button onClick={() =>
                  setInvoices(invoices.filter(i => i.id !== inv.id))
                }>
                  <Trash2 size={14} />
                </button>

              </div>
            ))}

            <button onClick={() =>
              setInvoices([...invoices, { id: Date.now() }])
            }>
              <Plus /> Add Invoice
            </button>
          </div>
        </div>

        {/* FREIGHT */}
        <button className="final-submit-btn" onClick={calculateFreight}>
          <Calculator /> Calculate Freight
        </button>

        {/* CREATE */}
        <button className="final-submit-btn"
          onClick={createOrder}
          disabled={loading}>

          {loading ? <RefreshCw className="spin" /> : "Generate LR"}
        </button>

        {/* PRINT OPTIONS */}
        {lr && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>LR Generated</h2>
              <div className="lr-id-display">{lr}</div>

              <div className="modal-actions">
                <button className="action-btn print"
                  onClick={() => handlePrint("docket")}>
                  <Printer /> Print Docket
                </button>

                <button className="action-btn print"
                  onClick={() => handlePrint("label")}>
                  <Printer /> Print Label
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* PRINT AREA */}
      {printType === "docket" && (
        <Docket data={{
          pickup,
          delivery,
          material,
          weight,
          chargedWeight,
          freight,
          boxes: boxes.length
        }} lr={lr} />
      )}

      {printType === "label" && (
        <Label lr={lr}
          cityFrom={pickup.city}
          cityTo={delivery.city} />
      )}
    </div>
  );
}