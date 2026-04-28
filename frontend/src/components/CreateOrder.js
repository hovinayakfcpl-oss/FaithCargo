import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2,
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Box, Info, Navigation, CreditCard, 
  Upload, File, Image, X, TrendingUp, Clock, Train, Plane,
  Save, Download, Eye, Award, Gem, Crown, Settings, 
  ToggleLeft, ToggleRight, Building, Hash, Tag,
  Barcode, Layers, CheckSquare, Square,
  ArrowRight, Warehouse, Building2, Phone, Mail, Globe,
  Percent, DollarSign, Scale, Weight, Ruler,
  Stamp, Circle, Star, HelpCircle, Search,
  RefreshCw, Activity, CheckCircle2, Timer,
  Bookmark, SaveAll, Copy, Edit, Trash, Check, ChevronDown, ChevronUp, 
  FolderOpen, LogOut, UserCircle
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

// ============================================
// 🔐 AUTHENTICATION CHECK
// ============================================
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [clientRates, setClientRates] = useState(null);
  const [clientPolicy, setClientPolicy] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const clientToken = localStorage.getItem("clientToken");
    const userRoleStorage = localStorage.getItem("userRole");
    const username = localStorage.getItem("username");
    const clientId = localStorage.getItem("clientId");
    
    if (token && token !== "undefined" && token !== "null" && token !== "") {
      setIsAuthenticated(true);
      setUserRole(userRoleStorage === "admin" ? "admin" : "staff");
      setUser({ username: username || "Admin", role: userRoleStorage === "admin" ? "admin" : "staff", clientId: null });
      setLoading(false);
      return;
    }
    
    if (clientToken && clientToken !== "undefined" && clientToken !== "null" && clientId) {
      const clientData = {
        clientId: clientId,
        companyName: localStorage.getItem("clientName") || username || "Client",
        username: localStorage.getItem("username") || clientId.toLowerCase(),
        email: localStorage.getItem("clientEmail") || "",
        phone: localStorage.getItem("clientPhone") || ""
      };
      setUser(clientData);
      setUserRole("client");
      setIsAuthenticated(true);
      
      const fetchRates = async () => {
        try {
          const ratesRes = await fetch(`https://faithcargo.onrender.com/api/rates/client/${clientId}/`);
          if (ratesRes.ok) {
            const ratesData = await ratesRes.json();
            setClientRates(ratesData.zone_rates || []);
            setClientPolicy(ratesData.policy || null);
          }
        } catch (err) {
          console.error("Rates fetch error:", err);
        }
      };
      fetchRates();
      setLoading(false);
      return;
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("clientToken");
    localStorage.removeItem("clientId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    localStorage.removeItem("clientName");
    localStorage.removeItem("clientEmail");
    localStorage.removeItem("clientPhone");
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  return { user, isAuthenticated, loading, userRole, clientRates, clientPolicy, logout };
};

// ============================================
// 💰 FREIGHT CALCULATOR
// ============================================
const FreightCalculator = ({ weight, origin, destination, bookingMode, clientPolicy, clientRates, userRole, onCalculate }) => {
  const [freight, setFreight] = useState(null);
  const [loading, setLoading] = useState(false);

  const getZoneFromPincode = (pincode) => {
    const firstDigit = pincode?.charAt(0);
    const zoneMap = {
      '1': 'N1', '2': 'N2', '3': 'N3',
      '4': 'C1', '5': 'W1', '6': 'W2',
      '7': 'S1', '8': 'S2', '9': 'E1',
      '0': 'NE1'
    };
    return zoneMap[firstDigit] || 'NE2';
  };

  const getRate = (originZone, destZone) => {
    if (userRole === "client" && clientRates && clientRates.length > 0) {
      const rate = clientRates.find(r => r.from_zone === originZone && r.to_zone === destZone);
      if (rate) return rate.rate;
    }
    switch(bookingMode) {
      case 'air': return 45;
      case 'express': return 25;
      case 'rail': return 15;
      default: return 18;
    }
  };

  useEffect(() => {
    const calculateFreight = async () => {
      if (weight > 0 && origin && destination && origin.length === 6 && destination.length === 6) {
        setLoading(true);
        const originZone = getZoneFromPincode(origin);
        const destZone = getZoneFromPincode(destination);
        const ratePerKg = getRate(originZone, destZone);
        
        const charges = (userRole === "client" && clientPolicy) ? clientPolicy : {
          minFreight: 650,
          docketCharge: 100,
          fuelPercent: 10,
          fovCharge: 75,
          gstPercent: 18
        };
        
        const baseFreight = weight * ratePerKg;
        const fuelSurcharge = baseFreight * (charges.fuelPercent / 100);
        const gst = (baseFreight + fuelSurcharge + (charges.docketCharge || 100) + (charges.fovCharge || 75)) * (charges.gstPercent / 100);
        const docketCharge = charges.docketCharge || 100;
        const fovCharge = charges.fovCharge || 75;
        
        let total = baseFreight + fuelSurcharge + gst + docketCharge + fovCharge;
        if (total < charges.minFreight) total = charges.minFreight;
        
        const freightResult = {
          baseFreight: Math.round(baseFreight),
          fuelSurcharge: Math.round(fuelSurcharge),
          gst: Math.round(gst),
          docketCharge,
          fovCharge,
          total: Math.round(total),
          ratePerKg: ratePerKg.toFixed(2),
          fromZone: originZone,
          toZone: destZone,
          isCustomRate: userRole === "client" && clientRates?.length > 0
        };
        
        setFreight(freightResult);
        if (onCalculate) onCalculate(freightResult);
        setLoading(false);
      }
    };
    calculateFreight();
  }, [weight, origin, destination, bookingMode, clientPolicy, clientRates, userRole]);

  if (!origin || !destination || weight === 0) return null;

  return (
    <div className="freight-card-modern">
      <div className="freight-header">
        <Calculator size={18} />
        <span>Freight Calculator</span>
        {freight?.isCustomRate && <span className="custom-badge">⭐ Custom Rate</span>}
        {loading && <span className="loading-badge">Calculating...</span>}
      </div>
      {freight && !loading && (
        <div className="freight-body">
          <div className="route-badges">
            <span className="zone-badge">{freight.fromZone} → {freight.toZone}</span>
            <span className="rate-badge">₹{freight.ratePerKg}/kg</span>
          </div>
          <div className="freight-row"><span>Base Freight</span><span>₹{freight.baseFreight.toLocaleString()}</span></div>
          <div className="freight-row"><span>Fuel Surcharge</span><span>₹{freight.fuelSurcharge.toLocaleString()}</span></div>
          <div className="freight-row"><span>GST (18%)</span><span>₹{freight.gst.toLocaleString()}</span></div>
          <div className="freight-row"><span>Docket + FOV</span><span>₹{freight.docketCharge + freight.fovCharge}</span></div>
          <div className="freight-row total"><span>Total Freight</span><span className="total-amount">₹{freight.total.toLocaleString()}</span></div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 🏷️ STAMP IMAGE COMPONENT
// ============================================
const StampImage = () => {
  const [imgError, setImgError] = useState(false);
  
  if (imgError) {
    return (
      <div className="stamp-fallback">
        <div className="stamp-circle">
          <div className="stamp-outer">
            <div className="stamp-inner">
              <span className="stamp-title">FAITH CARGO</span>
              <span className="stamp-sub">PVT LTD</span>
              <div className="stamp-line"></div>
              <span className="stamp-auth">AUTHORIZED</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <img 
      src={require("../assets/stamp.png")} 
      alt="Company Stamp" 
      className="stamp-image"
      onError={() => setImgError(true)}
    />
  );
};

// ============================================
// 🎨 DOCKET COMPONENT (A4 Size - 70% Page)
// ============================================
const PrintDocket = React.forwardRef(({ data, lrNumber, totalValue, ewayBill, awbNumber, bookingMode, showFreight, freightData, status, clientId, userRole }, ref) => {
  const barcodeRef = useRef(null);
  const [barcodeImageUrl, setBarcodeImageUrl] = useState("");
  
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      try {
        const canvas = barcodeRef.current;
        JsBarcode(canvas, lrNumber, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          font: "monospace",
          margin: 10,
          textAlign: "center",
          background: "#ffffff",
          lineColor: "#000000"
        });
        setBarcodeImageUrl(canvas.toDataURL("image/png"));
      } catch (err) {
        console.error("Barcode error:", err);
      }
    }
  }, [lrNumber]);

  const getModeText = () => {
    switch(bookingMode) {
      case 'air': return 'AIR EXPRESS';
      case 'rail': return 'RAIL CARGO';
      case 'express': return 'SPEED POST';
      default: return 'SURFACE TRANSPORT';
    }
  };

  const getStatusText = () => {
    switch(status) {
      case 'delivered': return 'DELIVERED';
      case 'in_transit': return 'IN TRANSIT';
      case 'out_for_delivery': return 'OUT FOR DELIVERY';
      case 'picked': return 'PICKED UP';
      default: return 'BOOKED';
    }
  };

  const getDimensionsText = () => {
    if (!data?.orderDetails?.dimensions || data.orderDetails.dimensions.length === 0) return "—";
    return data.orderDetails.dimensions.map(d => `${d.quantity} x (${d.length}×${d.width}×${d.height})`).join(", ");
  };

  const safeData = {
    pickup: data?.pickup || { name: "", address: "", pincode: "", contact: "", city: "", state: "", gstin: "" },
    delivery: data?.delivery || { name: "", address: "", pincode: "", contact: "", city: "", state: "", gstin: "" },
    orderDetails: data?.orderDetails || { material: "", weight: 0, boxesCount: 0, hsnCode: "", dimensions: [] },
    invoices: data?.invoices || [],
    volWeight: data?.volWeight || 0,
    chargedWeight: data?.chargedWeight || 0
  };

  return (
    <div ref={ref} className="print-docket-a4">
      <canvas ref={barcodeRef} style={{ display: 'none' }} width="350" height="80"></canvas>
      
      {/* Watermark */}
      <div className="docket-watermark">FCPL</div>
      
      {/* Border Frame */}
      <div className="docket-border"></div>
      
      {/* Header */}
      <div className="docket-header">
        <div className="header-left">
          <div className="lr-label">CONSIGNMENT NOTE</div>
          {barcodeImageUrl && <img src={barcodeImageUrl} alt="Barcode" className="barcode-img" />}
          <div className="lr-number">{lrNumber || "DRAFT"}</div>
          <div className="awb-row">AWB: <strong>{awbNumber || "N/A"}</strong></div>
          <div className="status-row">{getStatusText()}</div>
          <div className="date-row">{new Date().toLocaleDateString('en-IN')}</div>
        </div>
        <div className="header-right">
          <img src={logo} alt="FCPL" className="brand-logo" />
          <h2>FAITH CARGO PVT LTD</h2>
          <p>ISO 9001:2015 & ISO 14001:2015 CERTIFIED</p>
          <div className="company-contact">
            <span>4/15, Kirti Nagar Industrial Area, New Delhi - 110015</span>
            <span>📞 +91 9818641504 | ✉️ care@faithcargo.com</span>
            <span>GST: 07AAFCF2947K1ZD | CIN: U60231DL2021PTC384521</span>
          </div>
        </div>
      </div>

      {/* Parties Section */}
      <div className="docket-parties">
        <div className="party-box sender">
          <div className="party-title">📤 CONSIGNOR (Sender)</div>
          <div className="party-content">
            <h4>{safeData.pickup.name || "____________________"}</h4>
            <p>{safeData.pickup.address || "Address not provided"}</p>
            <div className="party-contact-row">
              <span>📮 {safeData.pickup.pincode || "______"}</span>
              <span>📍 {safeData.pickup.city || "_____"}, {safeData.pickup.state || "_____"}</span>
              <span>📞 {safeData.pickup.contact || "_________"}</span>
              {safeData.pickup.gstin && <span>GST: {safeData.pickup.gstin}</span>}
            </div>
          </div>
        </div>
        <div className="party-arrow">→</div>
        <div className="party-box receiver">
          <div className="party-title">📥 CONSIGNEE (Receiver)</div>
          <div className="party-content">
            <h4>{safeData.delivery.name || "____________________"}</h4>
            <p>{safeData.delivery.address || "Address not provided"}</p>
            <div className="party-contact-row">
              <span>📮 {safeData.delivery.pincode || "______"}</span>
              <span>📍 {safeData.delivery.city || "_____"}, {safeData.delivery.state || "_____"}</span>
              <span>📞 {safeData.delivery.contact || "_________"}</span>
              {safeData.delivery.gstin && <span>GST: {safeData.delivery.gstin}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Shipment Details Table */}
      <div className="docket-shipment">
        <table className="shipment-table">
          <thead>
            <tr><th>PKGS</th><th>DESCRIPTION</th><th>HSN</th><th>ACTUAL WT</th><th>VOL WT</th><th>CHARGED WT</th><th>MODE</th><th>DIMENSIONS</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-center">{safeData.orderDetails.boxesCount || 0}</td>
              <td className="text-left"><strong>{safeData.orderDetails.material || "GENERAL CARGO"}</strong><div className="goods-note">Said to contain</div></td>
              <td className="text-center">{safeData.orderDetails.hsnCode || "1234"}</td>
              <td className="text-center">{safeData.orderDetails.weight || 0} kg</td>
              <td className="text-center">{safeData.volWeight} kg</td>
              <td className="text-center"><strong>{safeData.chargedWeight} kg</strong></td>
              <td className="text-center"><div className="mode-badge">{getModeText()}</div></td>
              <td className="text-center small-text">{getDimensionsText()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Invoice & Freight Section */}
      <div className="docket-bottom">
        <div className="invoice-box">
          <div className="box-title">INVOICE DETAILS</div>
          {safeData.invoices?.filter(inv => inv.no).map((inv, idx) => (
            <div key={idx} className="invoice-row"><span>{inv.no}</span><span>₹{parseFloat(inv.value).toLocaleString()}</span></div>
          ))}
          <div className="invoice-total"><span>TOTAL VALUE:</span><strong>₹{totalValue?.toLocaleString() || 0}</strong></div>
          {ewayBill && <div className="eway-bill">E-WAY BILL: {ewayBill}</div>}
        </div>
        
        {showFreight && freightData && (
          <div className="freight-box">
            <div className="box-title">FREIGHT BREAKDOWN</div>
            <div className="freight-row-line"><span>Base Freight:</span><span>₹{freightData.baseFreight?.toLocaleString()}</span></div>
            <div className="freight-row-line"><span>Fuel Surcharge:</span><span>₹{freightData.fuelSurcharge?.toLocaleString()}</span></div>
            <div className="freight-row-line"><span>GST:</span><span>₹{freightData.gst?.toLocaleString()}</span></div>
            <div className="freight-row-line"><span>Docket + FOV:</span><span>₹{(freightData.docketCharge || 100) + (freightData.fovCharge || 75)}</span></div>
            <div className="freight-total"><span>TOTAL:</span><span>₹{freightData.total?.toLocaleString()}</span></div>
            <div className="rate-note">Rate: ₹{freightData.ratePerKg}/kg | {freightData.fromZone} → {freightData.toZone}</div>
          </div>
        )}
      </div>

      {/* Stamp & Signature */}
      <div className="docket-stamp-sign">
        <div className="stamp-container">
          <StampImage />
        </div>
        <div className="signature-container">
          <div className="sign-line"></div>
          <p>Receiver's Signature</p>
          <div className="sign-line second"></div>
          <p>Authorized Signatory</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="docket-instructions">
        <h4>📋 IMPORTANT INSTRUCTIONS</h4>
        <div className="instructions-grid">
          <div className="instruction"><span>⏰</span> Transit time: 2-5 business days</div>
          <div className="instruction"><span>📄</span> Documents: Tax Invoice, E-Way Bill</div>
          <div className="instruction"><span>🛡️</span> Insurance recommended for high value</div>
          <div className="instruction"><span>📞</span> Support: 9818641504</div>
        </div>
      </div>

      {/* Footer */}
      <div className="docket-footer">
        <div className="footer-copies">
          <span>📄 ORIGINAL - CONSIGNOR</span>
          <span>📄 DUPLICATE - CONSIGNEE</span>
          <span>📄 TRIPLICATE - OFFICE</span>
        </div>
        <div className="footer-website">🌐 www.faithcargo.com | 📞 9818641504 | ✉️ care@faithcargo.com</div>
      </div>
    </div>
  );
});

// ============================================
// 📎 INVOICE UPLOAD COMPONENT
// ============================================
const InvoiceUpload = ({ onUpload, uploadedFiles = [], setUploadedFiles }) => {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState(uploadedFiles);

  const handleUpload = (fileList) => {
    const newFiles = Array.from(fileList).map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      size: (f.size / 1024).toFixed(2),
      file: f,
      url: URL.createObjectURL(f)
    }));
    const updated = [...files, ...newFiles];
    setFiles(updated);
    setUploadedFiles && setUploadedFiles(updated);
    onUpload && onUpload(updated);
  };

  const removeFile = (id) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    setUploadedFiles && setUploadedFiles(updated);
    onUpload && onUpload(updated);
  };

  return (
    <div className="upload-modern">
      <div className={`upload-area ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); }}>
        <input type="file" id="invoice-files-modern" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUpload(e.target.files)} style={{ display: 'none' }} />
        <label htmlFor="invoice-files-modern" className="upload-label">
          <Upload size={24} />
          <span>Upload Invoices</span>
          <small>PDF, JPG, PNG (Max 5MB)</small>
        </label>
      </div>
      {files.length > 0 && (
        <div className="file-list-modern">
          <h4>{files.length} Invoice(s)</h4>
          {files.map(f => (
            <div key={f.id} className="file-item">
              <File size={14} />
              <span className="file-name">{f.name}</span>
              <button onClick={() => removeFile(f.id)} className="remove-file"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// 📦 DIMENSION INPUT COMPONENT
// ============================================
const DimensionInput = ({ dimensions, setDimensions, setTotalBoxes }) => {
  const [dimensionGroups, setDimensionGroups] = useState(dimensions || []);

  const addDimensionGroup = () => {
    setDimensionGroups([...dimensionGroups, { id: Date.now(), quantity: 1, length: "", width: "", height: "" }]);
  };

  const updateDimensionGroup = (id, field, value) => {
    setDimensionGroups(dimensionGroups.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const removeDimensionGroup = (id) => {
    setDimensionGroups(dimensionGroups.filter(g => g.id !== id));
  };

  const totalBoxes = dimensionGroups.reduce((sum, g) => sum + (parseInt(g.quantity) || 0), 0);
  
  useEffect(() => {
    setDimensions(dimensionGroups);
    setTotalBoxes(totalBoxes);
  }, [dimensionGroups, totalBoxes, setDimensions, setTotalBoxes]);

  return (
    <div className="dimension-modern">
      <div className="dimension-header">
        <span><Layers size={16} /> Package Dimensions (CM)</span>
        <button type="button" className="add-dim-btn" onClick={addDimensionGroup}><Plus size={14} /> Add</button>
      </div>
      {dimensionGroups.map((group, idx) => (
        <div key={group.id} className="dimension-group">
          <div className="dim-group-header">
            <span>Type {idx + 1}</span>
            <button className="remove-dim-group" onClick={() => removeDimensionGroup(group.id)}><Trash2 size={14} /></button>
          </div>
          <div className="dim-inputs">
            <input type="number" placeholder="Qty" value={group.quantity} onChange={e => updateDimensionGroup(group.id, 'quantity', e.target.value)} />
            <input type="number" placeholder="L (cm)" value={group.length} onChange={e => updateDimensionGroup(group.id, 'length', e.target.value)} />
            <input type="number" placeholder="W (cm)" value={group.width} onChange={e => updateDimensionGroup(group.id, 'width', e.target.value)} />
            <input type="number" placeholder="H (cm)" value={group.height} onChange={e => updateDimensionGroup(group.id, 'height', e.target.value)} />
          </div>
        </div>
      ))}
      {dimensionGroups.length === 0 && <div className="no-dimensions"><Info size={14} /> Click "Add" to add package dimensions</div>}
      {totalBoxes > 0 && <div className="total-boxes">Total Packages: <strong>{totalBoxes}</strong></div>}
    </div>
  );
};

// ============================================
// 💾 SAVED ADDRESSES COMPONENT
// ============================================
const SavedAddresses = ({ onSelectAddress, currentAddress }) => {
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressList, setShowAddressList] = useState(false);
  const [addressName, setAddressName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    const addresses = JSON.parse(localStorage.getItem('savedShipperAddresses') || '[]');
    setSavedAddresses(addresses);
  }, []);

  const saveAddressToLocal = () => {
    if (!currentAddress.name || !currentAddress.address) {
      alert("Please fill address details first!");
      return;
    }
    if (!addressName.trim()) {
      alert("Please enter a name for this address");
      return;
    }
    
    const newAddress = {
      id: Date.now(),
      name: addressName,
      companyName: currentAddress.name,
      contact: currentAddress.contact,
      address: currentAddress.address,
      pincode: currentAddress.pincode,
      city: currentAddress.city,
      state: currentAddress.state,
      gstin: currentAddress.gstin,
      createdAt: new Date().toISOString()
    };
    const updated = [...savedAddresses, newAddress];
    setSavedAddresses(updated);
    localStorage.setItem('savedShipperAddresses', JSON.stringify(updated));
    setShowSaveModal(false);
    setAddressName("");
    alert("Address saved successfully!");
  };

  const deleteAddress = (id) => {
    const updated = savedAddresses.filter(addr => addr.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem('savedShipperAddresses', JSON.stringify(updated));
  };

  const selectAddress = (address) => {
    onSelectAddress({
      name: address.companyName,
      contact: address.contact,
      address: address.address,
      pincode: address.pincode,
      city: address.city,
      state: address.state,
      gstin: address.gstin || ""
    });
    setShowAddressList(false);
  };

  return (
    <div className="saved-addresses-modern">
      <div className="address-buttons">
        <button type="button" className="addr-btn" onClick={() => setShowAddressList(!showAddressList)}>
          <FolderOpen size={14} /> {showAddressList ? "Hide Saved" : "Show Saved"}
        </button>
        <button type="button" className="addr-btn save-btn" onClick={() => setShowSaveModal(true)}>
          <SaveAll size={14} /> Save Current
        </button>
      </div>

      {showAddressList && savedAddresses.length > 0 && (
        <div className="address-list">
          <h4>Saved Consignor Addresses</h4>
          {savedAddresses.map(addr => (
            <div key={addr.id} className="address-card">
              <div className="address-info">
                <strong>{addr.companyName}</strong>
                <span>{addr.address}</span>
                <span>{addr.city}, {addr.state} - {addr.pincode}</span>
                <span>📞 {addr.contact}</span>
              </div>
              <div className="address-actions">
                <button className="use-addr" onClick={() => selectAddress(addr)}><Check size={12} /> Use</button>
                <button className="del-addr" onClick={() => deleteAddress(addr.id)}><Trash size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSaveModal && (
        <div className="save-modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="save-modal" onClick={e => e.stopPropagation()}>
            <h3>Save Consignor Address</h3>
            <input type="text" placeholder="Address name (e.g., Office Delhi)" value={addressName} onChange={e => setAddressName(e.target.value)} />
            <div className="modal-buttons">
              <button className="cancel" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className="save" onClick={saveAddressToLocal}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 🚀 MAIN CREATE ORDER COMPONENT (Redesigned)
// ============================================
export default function CreateOrder() {
  const { user, isAuthenticated, loading: authLoading, userRole, clientPolicy, clientRates, logout } = useAuth();
  
  const [dimensions, setDimensions] = useState([]);
  const [totalPackages, setTotalPackages] = useState(0);
  const [showLR, setShowLR] = useState(false);
  const [lrNumber, setLrNumber] = useState("");
  const [awbNumber, setAwbNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [ewayBill, setEwayBill] = useState("");
  const [apiError, setApiError] = useState("");
  const [bookingMode, setBookingMode] = useState("surface");
  const [freightData, setFreightData] = useState(null);
  const [isManualLR, setIsManualLR] = useState(false);
  const [manualLRNumber, setManualLRNumber] = useState("");
  const [showFreightOnDocket, setShowFreightOnDocket] = useState(true);
  const [shipmentStatus, setShipmentStatus] = useState("booked");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  const printDocketRef = useRef(null);

  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gstin: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gstin: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", hsnCode: "1234" });
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "" }]);

  const totalInvoiceValue = useMemo(() => invoices.reduce((s, inv) => s + (parseFloat(inv.value) || 0), 0), [invoices]);
  
  const volWeight = useMemo(() => {
    let totalVol = 0;
    dimensions.forEach(dim => {
      const qty = parseInt(dim.quantity) || 0;
      const l = parseFloat(dim.length) || 0;
      const w = parseFloat(dim.width) || 0;
      const h = parseFloat(dim.height) || 0;
      totalVol += (l * w * h) / 4000 * qty;
    });
    return totalVol.toFixed(2);
  }, [dimensions]);
  
  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volWeight));
  const needsEwayBill = totalInvoiceValue >= 50000;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [authLoading, isAuthenticated]);

  const fetchLocation = async (pin, type) => {
    if (pin?.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data?.[0]?.Status === "Success") {
          const po = data[0].PostOffice[0];
          const loc = { state: po.State, city: po.District };
          type === "pickup" ? setPickup(p => ({ ...p, ...loc })) : setDelivery(d => ({ ...d, ...loc }));
        }
      } catch (err) {}
    }
  };

  const handleSelectSavedAddress = (address) => {
    setPickup(address);
  };

  const handleCreateOrder = async () => {
    if (!isAuthenticated) {
      alert("Please login first!");
      window.location.href = "/";
      return;
    }
    
    if (needsEwayBill && !ewayBill) return alert("E-Way Bill required for invoice > ₹50,000");
    if (!pickup.name || !delivery.name || !orderDetails.weight) return alert("Fill all mandatory fields");
    if (!pickup.pincode || !delivery.pincode) return alert("Enter valid 6-digit pincodes");
    if (isManualLR && !manualLRNumber) return alert("Enter Manual LR Number");

    setLoading(true);
    setApiError("");

    const calculatedFreight = freightData?.total || 0;

    const orderData = {
      clientId: userRole === "client" ? user?.clientId : null,
      freight_amount: calculatedFreight,
      pickupName: pickup.name,
      pickupAddress: pickup.address,
      pickupPincode: pickup.pincode,
      pickupContact: pickup.contact,
      pickupGstin: pickup.gstin,
      deliveryName: delivery.name,
      deliveryAddress: delivery.address,
      deliveryPincode: delivery.pincode,
      deliveryContact: delivery.contact,
      deliveryGstin: delivery.gstin,
      material: orderDetails.material || "General Cargo",
      hsn: orderDetails.hsnCode,
      boxes: totalPackages,
      weight: parseFloat(chargedWeight),
      actual_weight: parseFloat(orderDetails.weight || 0),
      volumetric_weight: parseFloat(volWeight),
      total_value: totalInvoiceValue,
      eway_bill: needsEwayBill ? ewayBill : "",
      booking_mode: bookingMode,
      dimensions: dimensions,
      invoices: invoices.filter(inv => inv.no && inv.value).map(inv => ({ invoice_no: inv.no, invoice_value: parseFloat(inv.value) }))
    };

    try {
      const response = await fetch("https://faithcargo.onrender.com/api/shipments/create-order/", {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(orderData)
      });
      const result = await response.json();

      if (result.success) {
        setLrNumber(result.lr_number);
        setAwbNumber(result.awb);
        setShipmentStatus("booked");
        setShowLR(true);
      } else {
        setApiError(result.error || "Failed");
        alert("Error: " + result.error);
      }
    } catch (error) {
      setApiError("Network error");
      alert("Network error! Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDocket = () => {
    const printContent = printDocketRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Faith Cargo - Consignment Note ${lrNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              background: #e2e8f0; 
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            .print-docket-a4 {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: white;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              position: relative;
              padding: 15px;
            }
            .docket-watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 80px;
              font-weight: 900;
              color: rgba(220, 38, 38, 0.03);
              white-space: nowrap;
              z-index: 0;
              pointer-events: none;
              letter-spacing: 8px;
            }
            .docket-border {
              position: absolute;
              top: 8px;
              left: 8px;
              right: 8px;
              bottom: 8px;
              border: 2px solid #dc2626;
              pointer-events: none;
              border-radius: 12px;
              z-index: 1;
            }
            .docket-header {
              display: flex;
              justify-content: space-between;
              padding: 12px 16px;
              border-bottom: 2px solid #dc2626;
              margin-bottom: 15px;
              position: relative;
              z-index: 2;
            }
            .header-left .lr-label { font-size: 10px; font-weight: bold; color: #64748b; letter-spacing: 1px; margin-bottom: 5px; }
            .barcode-img { margin: 5px 0; width: 250px; height: auto; }
            .lr-number { font-size: 22px; font-weight: 900; color: #dc2626; font-family: monospace; letter-spacing: 2px; }
            .status-row { display: inline-block; margin-top: 8px; padding: 3px 12px; border-radius: 20px; font-size: 9px; font-weight: bold; background: #10b981; color: white; }
            .header-right { text-align: right; }
            .brand-logo { height: 55px; width: auto; margin-bottom: 5px; }
            .header-right h2 { font-size: 13px; font-weight: 900; margin: 0; color: #1e293b; }
            .company-contact { font-size: 7px; color: #475569; margin-top: 5px; display: flex; flex-direction: column; gap: 2px; }
            .docket-parties { display: flex; gap: 20px; padding: 0 16px; margin-bottom: 15px; position: relative; z-index: 2; }
            .party-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .party-title { background: #f8fafc; padding: 6px 10px; font-size: 9px; font-weight: bold; border-bottom: 1px solid #e2e8f0; }
            .party-content { padding: 8px 10px; }
            .party-content h4 { font-size: 10px; margin-bottom: 4px; }
            .party-content p { font-size: 8px; color: #475569; margin-bottom: 6px; }
            .party-contact-row { display: flex; flex-wrap: wrap; gap: 6px; font-size: 7px; padding-top: 4px; border-top: 1px dashed #e2e8f0; }
            .party-arrow { display: flex; align-items: center; font-size: 20px; color: #dc2626; }
            .docket-shipment { padding: 0 16px; margin-bottom: 12px; position: relative; z-index: 2; }
            .shipment-table { width: 100%; border-collapse: collapse; font-size: 8px; }
            .shipment-table th { background: #f8fafc; padding: 6px; font-weight: bold; border: 1px solid #e2e8f0; }
            .shipment-table td { padding: 6px; border: 1px solid #e2e8f0; text-align: center; }
            .mode-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 7px; font-weight: bold; background: #dc2626; color: white; }
            .docket-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 0 16px; margin-bottom: 12px; position: relative; z-index: 2; }
            .invoice-box, .freight-box { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .box-title { background: #f8fafc; padding: 6px 10px; font-size: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0; }
            .invoice-row, .freight-row-line { display: flex; justify-content: space-between; padding: 4px 10px; font-size: 7px; border-bottom: 1px solid #f1f5f9; }
            .invoice-total, .freight-total { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 8px; font-weight: bold; background: #fef3c7; }
            .eway-bill { padding: 4px 10px; font-size: 7px; background: #f0fdf4; color: #166534; }
            .rate-note { padding: 4px 10px; font-size: 6px; text-align: center; background: #f1f5f9; }
            .docket-stamp-sign { display: flex; justify-content: space-between; align-items: center; padding: 0 16px; margin: 15px 0; position: relative; z-index: 2; }
            .stamp-container { width: 100px; height: 100px; }
            .stamp-image { width: 100%; height: auto; object-fit: contain; }
            .signature-container { text-align: center; }
            .sign-line { width: 180px; height: 1px; background: #000; margin: 5px auto; }
            .docket-instructions { margin: 0 16px 12px 16px; padding: 10px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981; position: relative; z-index: 2; }
            .instructions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
            .instruction { font-size: 7px; display: flex; gap: 6px; align-items: center; }
            .docket-footer { padding: 8px 16px; background: #0f172a; color: white; font-size: 6px; position: relative; z-index: 2; border-radius: 0 0 10px 10px; }
            .footer-copies { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .stamp-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
            .stamp-circle { width: 90px; height: 90px; border-radius: 50%; border: 2px solid #dc2626; display: flex; align-items: center; justify-content: center; }
            @media print {
              body { background: white; padding: 0; margin: 0; }
              .print-docket-a4 { box-shadow: none; margin: 0; }
            }
          </style>
        </head>
        <body>${printContent.outerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const displayName = userRole === "admin" ? "Admin" : (user?.companyName || user?.username);

  return (
    <div className="create-order-modern">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <img src={logo} alt="FCPL" />
          <div>
            <h1>FAITH CARGO PVT LTD</h1>
            <p>Create Consignment Note</p>
          </div>
        </div>
        <div className="header-user">
          <UserCircle size={20} />
          <span>{displayName}</span>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {apiError && <div className="error-banner"><AlertCircle size={18} /> {apiError}</div>}

        <div className="form-grid">
          {/* Left Column - Pickup & Delivery */}
          <div className="form-column">
            {/* Consignor Section */}
            <div className="form-card">
              <div className="card-header"><MapPin size={18} color="#dc2626" /> Consignor (Sender)</div>
              <div className="card-body">
                <SavedAddresses onSelectAddress={handleSelectSavedAddress} currentAddress={pickup} />
                <div className="input-row">
                  <div className="input-group"><label>Company / Name *</label><input value={pickup.name} onChange={e => setPickup({...pickup, name: e.target.value.toUpperCase()})} placeholder="Enter sender name" /></div>
                  <div className="input-group"><label>Mobile *</label><input type="tel" maxLength={10} value={pickup.contact} onChange={e => setPickup({...pickup, contact: e.target.value})} placeholder="10 digit mobile" /></div>
                </div>
                <div className="input-group full"><label>Address *</label><textarea rows={2} value={pickup.address} onChange={e => setPickup({...pickup, address: e.target.value})} placeholder="Full address" /></div>
                <div className="input-row">
                  <div className="input-group"><label>Pincode *</label><input maxLength={6} value={pickup.pincode} onChange={e => { setPickup({...pickup, pincode: e.target.value}); fetchLocation(e.target.value, 'pickup'); }} placeholder="6 digit" /></div>
                  <div className="input-group"><label>City & State</label><input className="readonly" value={pickup.city ? `${pickup.city}, ${pickup.state}` : ""} readOnly /></div>
                </div>
                <div className="input-group"><label>GSTIN</label><input value={pickup.gstin} onChange={e => setPickup({...pickup, gstin: e.target.value.toUpperCase()})} placeholder="15 digit GSTIN" maxLength={15} /></div>
              </div>
            </div>

            {/* Consignee Section */}
            <div className="form-card">
              <div className="card-header"><Truck size={18} color="#dc2626" /> Consignee (Receiver)</div>
              <div className="card-body">
                <div className="input-row">
                  <div className="input-group"><label>Receiver Name *</label><input value={delivery.name} onChange={e => setDelivery({...delivery, name: e.target.value.toUpperCase()})} placeholder="Enter receiver name" /></div>
                  <div className="input-group"><label>Mobile *</label><input type="tel" maxLength={10} value={delivery.contact} onChange={e => setDelivery({...delivery, contact: e.target.value})} placeholder="10 digit mobile" /></div>
                </div>
                <div className="input-group full"><label>Address *</label><textarea rows={2} value={delivery.address} onChange={e => setDelivery({...delivery, address: e.target.value})} placeholder="Full address" /></div>
                <div className="input-row">
                  <div className="input-group"><label>Pincode *</label><input maxLength={6} value={delivery.pincode} onChange={e => { setDelivery({...delivery, pincode: e.target.value}); fetchLocation(e.target.value, 'delivery'); }} placeholder="6 digit" /></div>
                  <div className="input-group"><label>City & State</label><input className="readonly" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} readOnly /></div>
                </div>
                <div className="input-group"><label>GSTIN</label><input value={delivery.gstin} onChange={e => setDelivery({...delivery, gstin: e.target.value.toUpperCase()})} placeholder="15 digit GSTIN" maxLength={15} /></div>
              </div>
            </div>
          </div>

          {/* Right Column - Shipment Details */}
          <div className="form-column">
            <div className="form-card">
              <div className="card-header"><Package size={18} color="#dc2626" /> Shipment Details</div>
              <div className="card-body">
                <div className="input-group full"><label>Material Description</label><input placeholder="e.g., Industrial Tools, Textile" onChange={e => setOrderDetails({...orderDetails, material: e.target.value.toUpperCase()})} /></div>
                
                <div className="mode-selector">
                  <label>Booking Mode *</label>
                  <div className="mode-options">
                    <button type="button" className={`mode ${bookingMode === 'surface' ? 'active' : ''}`} onClick={() => setBookingMode('surface')}><Truck size={14} /> Surface</button>
                    <button type="button" className={`mode ${bookingMode === 'air' ? 'active' : ''}`} onClick={() => setBookingMode('air')}><Plane size={14} /> Air</button>
                    <button type="button" className={`mode ${bookingMode === 'rail' ? 'active' : ''}`} onClick={() => setBookingMode('rail')}><Train size={14} /> Rail</button>
                    <button type="button" className={`mode ${bookingMode === 'express' ? 'active' : ''}`} onClick={() => setBookingMode('express')}><TrendingUp size={14} /> Express</button>
                  </div>
                </div>

                <div className="input-group"><label>Actual Weight (Kg) *</label><input type="number" step="0.1" value={orderDetails.weight} onChange={e => setOrderDetails({...orderDetails, weight: e.target.value})} placeholder="Weight" /></div>
                
                <DimensionInput dimensions={dimensions} setDimensions={setDimensions} setTotalBoxes={setTotalPackages} />
                
                <div className="weight-summary">
                  <span>Volumetric: <strong>{volWeight} kg</strong></span>
                  <span>Charged: <strong>{chargedWeight} kg</strong></span>
                </div>
              </div>
            </div>

            <div className="form-card">
              <div className="card-header between">
                <div><FileText size={18} color="#dc2626" /> Invoice Details</div>
                <button className="add-invoice" onClick={() => setInvoices([...invoices, { id: Date.now(), no: "", value: "" }])}><Plus size={14} /> Add</button>
              </div>
              <div className="card-body">
                {invoices.map(inv => (
                  <div key={inv.id} className="invoice-row-modern">
                    <input placeholder="Invoice No" value={inv.no} onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, no: e.target.value.toUpperCase()} : i))} />
                    <input type="number" placeholder="Value ₹" value={inv.value} onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, value: e.target.value} : i))} />
                    <button className="remove-invoice" onClick={() => setInvoices(invoices.filter(i => i.id !== inv.id))}><Trash2 size={14} /></button>
                  </div>
                ))}
                
                <InvoiceUpload onUpload={(files) => console.log("Uploaded:", files)} uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} />
                
                {needsEwayBill && (
<div className="eway-alert">
  <div className="eway-header">
    <AlertCircle size={14} />
    <span>E-Way Bill Required (Invoice &gt; ₹50,000)</span>
  </div>
  <input 
    type="text"
    placeholder="12 Digit E-Way Bill No." 
    value={ewayBill} 
    onChange={(e) => setEwayBill(e.target.value.toUpperCase())} 
    maxLength={12} 
  />
</div>
                )}
                
                <FreightCalculator 
                  weight={chargedWeight} 
                  origin={pickup.pincode} 
                  destination={delivery.pincode} 
                  bookingMode={bookingMode}
                  clientPolicy={clientPolicy}
                  clientRates={clientRates}
                  userRole={userRole}
                  onCalculate={setFreightData} 
                />
                
                <div className="settings-row">
                  <div className="setting"><label>Manual LR Number</label><button className={`toggle ${isManualLR ? 'on' : 'off'}`} onClick={() => setIsManualLR(!isManualLR)}>{isManualLR ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button></div>
                  {isManualLR && <input className="manual-lr" placeholder="Enter LR Number" value={manualLRNumber} onChange={e => setManualLRNumber(e.target.value.toUpperCase())} />}
                  <div className="setting"><label>Show Freight on Docket</label><button className={`toggle ${showFreightOnDocket ? 'on' : 'off'}`} onClick={() => setShowFreightOnDocket(!showFreightOnDocket)}>{showFreightOnDocket ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button></div>
                </div>
              </div>
            </div>

            <button className={`generate-btn ${loading ? 'loading' : ''}`} onClick={handleCreateOrder} disabled={loading}>
              {loading ? <Clock size={20} className="spin" /> : <Crown size={20} />}
              {loading ? "Generating..." : "Generate Consignment Note"}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Modal for Generated LR */}
        {showLR && (
          <div className="modal-overlay" onClick={() => setShowLR(false)}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
              <div className="modal-icon"><CheckCircle size={60} color="#10b981" /></div>
              <h2>Consignment Generated!</h2>
              <div className="modal-lr">{isManualLR ? manualLRNumber : lrNumber}</div>
              <div className="modal-awb">AWB: {awbNumber}</div>
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <PrintDocket 
                  key={lrNumber} 
                  ref={printDocketRef} 
                  data={{pickup, delivery, orderDetails, invoices, chargedWeight, volWeight, dimensions}} 
                  lrNumber={isManualLR ? manualLRNumber : lrNumber} 
                  totalValue={totalInvoiceValue} 
                  ewayBill={ewayBill} 
                  awbNumber={awbNumber} 
                  bookingMode={bookingMode} 
                  showFreight={showFreightOnDocket} 
                  freightData={freightData} 
                  status={shipmentStatus} 
                  uploadedInvoices={uploadedFiles}
                  clientId={userRole === "client" ? user?.clientId : null}
                  userRole={userRole}
                />
              </div>
              <div className="modal-buttons">
                <button className="modal-btn print" onClick={handlePrintDocket}><Printer size={16} /> Print Docket</button>
                <button className="modal-btn new" onClick={() => window.location.reload()}><Plus size={16} /> New Booking</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}