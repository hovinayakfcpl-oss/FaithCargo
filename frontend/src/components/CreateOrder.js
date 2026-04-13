import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2,
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Box, Info, Navigation, CreditCard, 
  Upload, File, Image, X, TrendingUp, Clock, Train, Plane,
  Save, Download, Eye, Award, Gem, Crown, Settings, 
  ToggleLeft, ToggleRight, Building, Hash, Tag, FileSpreadsheet,
  Barcode, Layers, CheckSquare, Square, Printer as PrinterIcon,
  ArrowRight, Warehouse, Building2, Phone, Mail, Globe,
  Percent, DollarSign, Scale, Weight, Ruler, User, Users,
  Stamp, Circle, Star, HelpCircle, Search, Filter,
  RefreshCw, Activity, CheckCircle2, XCircle, Timer, Map, PhoneCall,
  Bookmark, SaveAll, Copy, Edit, Trash, Check, ChevronDown, ChevronUp, 
  FolderOpen
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

// Stamp Image Component with fallback
const StampImage = () => {
  const [imgError, setImgError] = useState(false);
  
  if (imgError) {
    return (
      <div className="official-stamp-fallback">
        <div className="stamp-circle">
          <div className="stamp-outer-ring">
            <div className="stamp-inner-content">
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
      className="official-stamp-image"
      onError={() => setImgError(true)}
    />
  );
};

// ============================================
// 💰 REAL FREIGHT CALCULATOR
// ============================================
const RealTimeFreightCalculator = ({ weight, origin, destination, bookingMode, onCalculate }) => {
  const [freight, setFreight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const calculateFreight = async () => {
      if (weight > 0 && origin && destination && origin.length === 6 && destination.length === 6) {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch("https://faithcargo.onrender.com/api/shipments/calculate-freight/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin, destination, weight: parseFloat(weight) })
          });
          const data = await response.json();
          
          if (data.success) {
            const multiplier = bookingMode === 'air' ? 1.5 : bookingMode === 'express' ? 1.3 : bookingMode === 'rail' ? 0.8 : 1;
            const baseFreight = data.freight_charge * multiplier;
            const fuelSurcharge = baseFreight * 0.10;
            const gst = baseFreight * 0.18;
            const docketCharge = 100;
            const fovCharge = 75;
            let total = baseFreight + fuelSurcharge + gst + docketCharge + fovCharge;
            if (total < 650) total = 650;
            
            const freightResult = {
              baseFreight: Math.round(baseFreight),
              fuelSurcharge: Math.round(fuelSurcharge),
              gst: Math.round(gst),
              docketCharge, fovCharge,
              total: Math.round(total),
              ratePerKg: (baseFreight / weight).toFixed(2),
              fromZone: data.from_zone,
              toZone: data.to_zone
            };
            setFreight(freightResult);
            if (onCalculate) onCalculate(freightResult);
          } else {
            setError(data.error || "Rate not found");
          }
        } catch (err) {
          setError("Network error");
        } finally {
          setLoading(false);
        }
      }
    };
    calculateFreight();
  }, [weight, origin, destination, bookingMode]);

  if (!origin || !destination || weight === 0) return null;

  return (
    <div className="freight-card">
      <div className="freight-card-header">
        <Calculator size={18} />
        <span>Freight Calculator</span>
        {loading && <span className="loading-badge">Calculating...</span>}
      </div>
      {error && <div className="freight-error-msg"><AlertCircle size={14} /> {error}</div>}
      {freight && !loading && (
        <div className="freight-card-body">
          <div className="route-info">
            <span className="route-badge">{freight.fromZone} → {freight.toZone}</span>
            <span className="rate-badge">₹{freight.ratePerKg}/kg</span>
          </div>
          <div className="freight-row">
            <span>Base Freight</span>
            <span>₹{freight.baseFreight.toLocaleString()}</span>
          </div>
          <div className="freight-row">
            <span>Fuel Surcharge (10%)</span>
            <span>₹{freight.fuelSurcharge.toLocaleString()}</span>
          </div>
          <div className="freight-row">
            <span>GST (18%)</span>
            <span>₹{freight.gst.toLocaleString()}</span>
          </div>
          <div className="freight-row">
            <span>Charges</span>
            <span>₹{freight.docketCharge + freight.fovCharge}</span>
          </div>
          <div className="freight-row total-row">
            <span>Total</span>
            <span className="total-amount">₹{freight.total.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 🎨 DOCKET COMPONENT - FULLY FIXED WITH WORKING BARCODE
// ============================================
const PrintDocket = React.forwardRef(({ data, lrNumber, totalValue, ewayBill, awbNumber, bookingMode, showFreight, freightData, status, uploadedInvoices }, ref) => {
  const barcodeRef = useRef(null);
  const [barcodeImageUrl, setBarcodeImageUrl] = useState("");
  
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      try {
        const canvas = barcodeRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        JsBarcode(canvas, lrNumber, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          font: "monospace",
          margin: 10,
          textAlign: "center",
          textMargin: 5,
          background: "#ffffff",
          lineColor: "#000000"
        });
        
        const imageUrl = canvas.toDataURL("image/png");
        setBarcodeImageUrl(imageUrl);
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
    return data.orderDetails.dimensions.map(d => 
      `${d.quantity} x (${d.length}×${d.width}×${d.height})`
    ).join(", ");
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
    <div ref={ref} className="print-docket">
      <div className="docket-watermark">FCPL</div>
      <div className="docket-inner-border"></div>
      
      {/* Hidden canvas for barcode generation */}
      <canvas ref={barcodeRef} style={{ display: 'none' }} width="350" height="80"></canvas>
      
      <div className="docket-header-new">
        <div className="header-left-section">
          <div className="lr-label">CONSIGNMENT NOTE</div>
          {barcodeImageUrl ? (
            <img src={barcodeImageUrl} alt="Barcode" className="barcode-image" />
          ) : (
            <div className="barcode-placeholder">Generating barcode...</div>
          )}
          <div className="lr-number-bold">{lrNumber || "DRAFT"}</div>
          <div className="awb-section">
            <span className="awb-label">AWB:</span>
            <span className="awb-value-bold">{awbNumber || "N/A"}</span>
          </div>
          <div className="status-badge-docket">{getStatusText()}</div>
          <div className="date-value-docket">{new Date().toLocaleDateString('en-IN')}</div>
        </div>
        <div className="header-right-section">
          <img src={logo} alt="FCPL" className="brand-logo-large" />
          <div className="company-details">
            <h2>FAITH CARGO PRIVATE LIMITED</h2>
            <p>ISO 9001:2015 & ISO 14001:2015 CERTIFIED</p>
            <div className="contact-details">
              <span>🏢 4/15, Kirti Nagar Industrial Area, New Delhi - 110015</span>
              <span>📞 +91 9818641504 | ✉️ care@faithcargo.com</span>
              <span>🔷 GST: 07AAFCF2947K1ZD | CIN: U60231DL2021PTC384521</span>
            </div>
          </div>
        </div>
      </div>

      <div className="parties-container">
        <div className="party sender">
          <div className="party-title">
            <div className="party-icon">📤</div>
            <div><h3>CONSIGNOR</h3><span>Sender</span></div>
          </div>
          <div className="party-content">
            <h4>{safeData.pickup.name || "____________________"}</h4>
            <p className="address-text">{safeData.pickup.address || "Address not provided"}</p>
            <div className="party-contact">
              <span>📮 {safeData.pickup.pincode || "______"}</span>
              <span>📍 {safeData.pickup.city || "_____"}, {safeData.pickup.state || "_____"}</span>
              <span>📞 {safeData.pickup.contact || "_________"}</span>
              {safeData.pickup.gstin && <span>🔷 GST: {safeData.pickup.gstin}</span>}
            </div>
          </div>
        </div>
        <div className="party-arrow-icon"><ArrowRight size={28} /></div>
        <div className="party receiver">
          <div className="party-title">
            <div className="party-icon">📥</div>
            <div><h3>CONSIGNEE</h3><span>Receiver</span></div>
          </div>
          <div className="party-content">
            <h4>{safeData.delivery.name || "____________________"}</h4>
            <p className="address-text">{safeData.delivery.address || "Address not provided"}</p>
            <div className="party-contact">
              <span>📮 {safeData.delivery.pincode || "______"}</span>
              <span>📍 {safeData.delivery.city || "_____"}, {safeData.delivery.state || "_____"}</span>
              <span>📞 {safeData.delivery.contact || "_________"}</span>
              {safeData.delivery.gstin && <span>🔷 GST: {safeData.delivery.gstin}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="shipment-wrapper">
        <table className="shipment-data-table">
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
              <td className="text-center"><div className={`mode-label mode-${bookingMode || 'surface'}`}>{getModeText()}</div></td>
              <td className="text-center small-text">{getDimensionsText()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="billing-wrapper">
        <div className="invoice-section">
          <div className="section-header">INVOICE DETAILS</div>
          <div className="invoice-items">
            {safeData.invoices?.filter(inv => inv.no).map((inv, idx) => (
              <div key={idx} className="invoice-row-line"><span>{inv.no}</span><span>₹{parseFloat(inv.value).toLocaleString()}</span></div>
            ))}
            <div className="invoice-total-line"><span>TOTAL VALUE:</span><strong>₹{totalValue?.toLocaleString() || 0}</strong></div>
            {ewayBill && <div className="eway-badge">E-WAY BILL: {ewayBill}</div>}
          </div>
        </div>
        {showFreight && freightData && (
          <div className="freight-section">
            <div className="section-header">FREIGHT BREAKDOWN</div>
            <div className="freight-items">
              <div className="freight-row-line"><span>Base Freight:</span><span>₹{freightData.baseFreight?.toLocaleString()}</span></div>
              <div className="freight-row-line"><span>Fuel Surcharge (10%):</span><span>₹{freightData.fuelSurcharge?.toLocaleString()}</span></div>
              <div className="freight-row-line"><span>GST (18%):</span><span>₹{freightData.gst?.toLocaleString()}</span></div>
              <div className="freight-row-line"><span>Docket Charge:</span><span>₹{freightData.docketCharge || 100}</span></div>
              <div className="freight-row-line total-freight"><span>TOTAL:</span><span className="total-price">₹{freightData.total?.toLocaleString()}</span></div>
              <div className="rate-note">Rate: ₹{freightData.ratePerKg}/kg | {freightData.fromZone} → {freightData.toZone}</div>
            </div>
          </div>
        )}
      </div>

      <div className="stamp-signature-wrapper-new">
        <div className="stamp-image-container">
          <StampImage />
        </div>
        <div className="signature-area">
          <div className="signature-line-item"><div className="sign-line"></div><p>Receiver's Signature</p></div>
          <div className="signature-line-item"><div className="stamp-box">FOR FAITH CARGO PVT LTD</div><p>Authorized Signatory</p></div>
        </div>
      </div>

      <div className="company-instructions">
        <h4>📋 IMPORTANT INSTRUCTIONS</h4>
        <div className="instructions-grid">
          <div className="instruction-item"><span className="instruction-icon">⏰</span><div><strong>Timely Delivery</strong><p>Transit time: 2-5 business days</p></div></div>
          <div className="instruction-item"><span className="instruction-icon">📄</span><div><strong>Documents Required</strong><p>Tax Invoice, E-Way Bill, GR Copy</p></div></div>
          <div className="instruction-item"><span className="instruction-icon">🛡️</span><div><strong>Insurance</strong><p>Recommended for high-value shipments</p></div></div>
          <div className="instruction-item"><span className="instruction-icon">📞</span><div><strong>Support</strong><p>24/7 Customer Care: 9818641504</p></div></div>
        </div>
      </div>

      <div className="terms-wrapper">
        <h4>TERMS & CONDITIONS</h4>
        <ul>
          <li>Goods carried at Owner's Risk. Insurance recommended.</li>
          <li>Claim within 7 days of delivery. Jurisdiction: Delhi Only.</li>
          <li>Transit liability as per Carriers Act, 1865.</li>
          <li>E-Way Bill mandatory for invoice &gt; ₹50,000.</li>
        </ul>
      </div>

      <div className="docket-footer">
        <div className="footer-copies"><span>📄 ORIGINAL - CONSIGNOR</span><span>📄 DUPLICATE - CONSIGNEE</span><span>📄 TRIPLICATE - OFFICE</span></div>
        <div className="footer-website"><span>🌐 www.faithcargo.com</span><span>📞 9818641504</span><span>✉️ care@faithcargo.com</span></div>
      </div>
    </div>
  );
});

// ============================================
// 📎 INVOICE UPLOAD WITH PREVIEW & DOWNLOAD
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

  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
  };

  return (
    <div className="upload-container">
      <div 
        className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); }}
      >
        <input type="file" id="invoice-files" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUpload(e.target.files)} style={{ display: 'none' }} />
        <label htmlFor="invoice-files" className="upload-label-btn">
          <Upload size={28} />
          <span>Click or Drag Invoices</span>
          <small>PDF, JPG, JPEG, PNG (Max 5MB)</small>
        </label>
      </div>
      {files.length > 0 && (
        <div className="file-list-preview">
          <h4>{files.length} Invoice(s) Uploaded</h4>
          {files.map(f => (
            <div key={f.id} className="file-preview-item">
              {f.name.match(/\.(jpg|jpeg|png)$/i) ? (
                <img src={f.url} alt={f.name} className="file-thumbnail" />
              ) : (
                <File size={16} />
              )}
              <span className="file-name">{f.name}</span>
              <small className="file-size">{f.size} KB</small>
              <div className="file-actions">
                <button onClick={() => downloadFile(f)} className="download-file" title="Download">
                  <Download size={14} />
                </button>
                <button onClick={() => removeFile(f.id)} className="remove-file" title="Remove">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// 📦 DIMENSION INPUT WITH QUANTITY OPTION
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
    <div className="dimension-panel-enhanced">
      <div className="dimension-header-enhanced">
        <span><Layers size={16} /> Package Dimensions (CM)</span>
        <button type="button" className="add-dimension-btn" onClick={addDimensionGroup}>
          <Plus size={14} /> Add Dimension Type
        </button>
      </div>
      <div className="dimension-groups">
        {dimensionGroups.map((group, idx) => (
          <div key={group.id} className="dimension-group-card">
            <div className="dimension-group-header">
              <span className="group-label">Dimension Type {idx + 1}</span>
              <button className="remove-group-btn" onClick={() => removeDimensionGroup(group.id)}>
                <Trash2 size={14} />
              </button>
            </div>
            <div className="dimension-group-inputs">
              <div className="dim-quantity">
                <label>Qty</label>
                <input type="number" min="1" value={group.quantity} onChange={e => updateDimensionGroup(group.id, 'quantity', e.target.value)} placeholder="Qty" />
              </div>
              <div className="dim-lwh">
                <label>L (cm)</label>
                <input type="number" step="0.1" value={group.length} onChange={e => updateDimensionGroup(group.id, 'length', e.target.value)} placeholder="Length" />
              </div>
              <div className="dim-lwh">
                <label>W (cm)</label>
                <input type="number" step="0.1" value={group.width} onChange={e => updateDimensionGroup(group.id, 'width', e.target.value)} placeholder="Width" />
              </div>
              <div className="dim-lwh">
                <label>H (cm)</label>
                <input type="number" step="0.1" value={group.height} onChange={e => updateDimensionGroup(group.id, 'height', e.target.value)} placeholder="Height" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {dimensionGroups.length === 0 && (
        <div className="no-dimensions-msg">
          <Info size={16} /> Click "Add Dimension Type" to add package dimensions with quantity
        </div>
      )}
      {totalBoxes > 0 && (
        <div className="total-boxes-summary">Total Packages: <strong>{totalBoxes}</strong></div>
      )}
    </div>
  );
};

// ============================================
// 💾 SAVED ADDRESSES COMPONENT FOR SHIPPER
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
    <div className="saved-addresses-container">
      <div className="address-actions-bar">
        <button type="button" className="address-action-btn saved-list-btn" onClick={() => setShowAddressList(!showAddressList)}>
          <FolderOpen size={16} />
          {showAddressList ? "Hide Saved Addresses" : "Show Saved Addresses"}
          {showAddressList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button type="button" className="address-action-btn save-current-btn" onClick={() => setShowSaveModal(true)}>
          <SaveAll size={16} />
          Save Current Address
        </button>
      </div>

      {showAddressList && savedAddresses.length > 0 && (
        <div className="address-list-dropdown">
          <h4><Bookmark size={14} /> Saved Consignor Addresses</h4>
          {savedAddresses.map(addr => (
            <div key={addr.id} className="saved-address-card">
              <div className="saved-address-info">
                <strong>{addr.companyName}</strong>
                <span>{addr.address}</span>
                <span>{addr.city}, {addr.state} - {addr.pincode}</span>
                <span>📞 {addr.contact}</span>
                {addr.gstin && <span>GST: {addr.gstin}</span>}
              </div>
              <div className="saved-address-actions">
                <button className="use-address-btn" onClick={() => selectAddress(addr)}>
                  <Check size={14} /> Use
                </button>
                <button className="delete-address-btn" onClick={() => deleteAddress(addr.id)}>
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSaveModal && (
        <div className="save-address-modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="save-address-modal" onClick={e => e.stopPropagation()}>
            <h3><SaveAll size={20} /> Save Consignor Address</h3>
            <input type="text" placeholder="Enter address name (e.g., Office Delhi, Warehouse Mumbai)" value={addressName} onChange={e => setAddressName(e.target.value)} className="address-name-input" />
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className="save-btn" onClick={saveAddressToLocal}>Save Address</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 🚀 MAIN COMPONENT
// ============================================
export default function CreateOrder() {
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
  
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [showTracking, setShowTracking] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  
  const printDocketRef = useRef(null);

  const handlePrintDocket = () => {
    const printContent = printDocketRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html><head><title>Faith Cargo - Docket ${lrNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: white; padding: 15px; }
          .print-docket { width: 200mm; min-height: 280mm; margin: 0 auto; position: relative; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .docket-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 100px; font-weight: 900; color: rgba(0,0,0,0.02); white-space: nowrap; z-index: 0; pointer-events: none; letter-spacing: 10px; }
          .docket-inner-border { position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 2px solid #d32f2f; pointer-events: none; border-radius: 8px; z-index: 1; }
          .docket-header-new { display: flex; justify-content: space-between; padding: 15px 20px; border-bottom: 3px solid #d32f2f; background: white; position: relative; z-index: 2; }
          .header-left-section { text-align: left; }
          .lr-label { font-size: 10px; font-weight: bold; color: #64748b; letter-spacing: 1px; margin-bottom: 5px; }
          .barcode-image { margin: 5px 0; background: white; width: 280px; height: auto; display: block; }
          .barcode-placeholder { width: 280px; height: 60px; background: #f0f0f0; margin: 5px 0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #999; }
          .lr-number-bold { font-size: 24px; font-weight: 900; color: #d32f2f; font-family: monospace; letter-spacing: 2px; }
          .awb-section { margin-top: 8px; }
          .awb-label { font-size: 12px; font-weight: 700; color: #475569; margin-right: 8px; }
          .awb-value-bold { font-size: 14px; font-weight: 800; color: #1e293b; }
          .status-badge-docket { display: inline-block; margin-top: 10px; padding: 4px 14px; border-radius: 20px; font-size: 9px; font-weight: bold; background: #10b981; color: white; }
          .date-value-docket { font-size: 8px; color: #64748b; margin-top: 8px; }
          .header-right-section { text-align: right; }
          .brand-logo-large { height: 60px; width: auto; margin-bottom: 8px; }
          .company-details h2 { font-size: 14px; font-weight: 900; margin: 0; color: #1a1a2e; }
          .company-details p { font-size: 8px; color: #d32f2f; font-weight: 600; margin-top: 2px; }
          .contact-details { font-size: 7px; color: #4a5568; margin-top: 5px; display: flex; flex-direction: column; gap: 2px; }
          .parties-container { display: flex; gap: 20px; padding: 15px 20px; background: #f8fafc; position: relative; z-index: 2; }
          .party { flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
          .party-title { background: #f1f5f9; padding: 8px 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e2e8f0; }
          .party-icon { width: 28px; height: 28px; background: #ffebed; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
          .party-title h3 { font-size: 11px; margin: 0; }
          .party-content { padding: 12px; }
          .party-content h4 { font-size: 11px; margin-bottom: 6px; }
          .address-text { font-size: 9px; color: #475569; margin-bottom: 8px; }
          .party-contact { display: flex; flex-wrap: wrap; gap: 8px; font-size: 8px; padding-top: 6px; border-top: 1px dashed #e2e8f0; }
          .shipment-wrapper { padding: 0 20px; margin-bottom: 15px; position: relative; z-index: 2; }
          .shipment-data-table { width: 100%; border-collapse: collapse; font-size: 9px; }
          .shipment-data-table th { background: #f1f5f9; padding: 8px; font-weight: bold; border: 1px solid #e2e8f0; }
          .shipment-data-table td { padding: 8px; border: 1px solid #e2e8f0; text-align: center; }
          .small-text { font-size: 7px; }
          .billing-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 0 20px; margin-bottom: 15px; position: relative; z-index: 2; }
          .invoice-section, .freight-section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          .section-header { background: #f8fafc; padding: 8px 12px; font-size: 9px; font-weight: bold; border-bottom: 1px solid #e2e8f0; }
          .invoice-items, .freight-items { padding: 10px; }
          .invoice-row-line, .freight-row-line { display: flex; justify-content: space-between; font-size: 8px; padding: 4px 0; }
          .stamp-signature-wrapper-new { display: flex; justify-content: space-between; align-items: center; padding: 0 20px; margin: 15px 0; position: relative; z-index: 2; }
          .stamp-image-container { width: 120px; height: 120px; }
          .official-stamp-image { width: 100%; height: auto; object-fit: contain; }
          .official-stamp-fallback { width: 100px; height: 100px; }
          .stamp-outer-ring { width: 85px; height: 85px; border-radius: 50%; border: 2.5px solid #2563eb; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
          .stamp-title { font-size: 9px; font-weight: 800; color: #2563eb; }
          .stamp-sub { font-size: 7px; font-weight: 700; color: #2563eb; }
          .stamp-line { width: 20px; height: 1px; background: #2563eb; margin: 3px auto; }
          .stamp-auth { font-size: 6px; font-weight: 600; color: #2563eb; }
          .sign-line { width: 80px; border-top: 1px solid #0f172a; margin-bottom: 4px; }
          .stamp-box { border: 1px dashed #d32f2f; padding: 5px 10px; font-size: 7px; font-weight: bold; background: #fff1f2; border-radius: 4px; }
          .company-instructions { margin: 0 20px 15px 20px; padding: 12px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981; position: relative; z-index: 2; }
          .instructions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
          .instruction-item { display: flex; gap: 8px; font-size: 7px; }
          .terms-wrapper { padding: 0 20px; margin-bottom: 15px; position: relative; z-index: 2; }
          .terms-wrapper h4 { font-size: 8px; margin-bottom: 5px; }
          .terms-wrapper ul { padding-left: 15px; font-size: 6px; }
          .docket-footer { padding: 10px 20px; background: #0f172a; color: white; display: flex; justify-content: space-between; font-size: 7px; position: relative; z-index: 2; }
          @media print { body { margin: 0; padding: 0; } .docket-watermark { print-color-adjust: exact; } .barcode-image { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
        </head><body>${printContent.outerHTML}</body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleTrackShipment = async () => {
    if (!trackingNumber) {
      alert("Please enter LR Number or AWB Number to track");
      return;
    }
    
    setTrackingLoading(true);
    setTrackingResult(null);
    
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/shipments/shipment/${trackingNumber}`);
      if (response.ok) {
        const data = await response.json();
        setTrackingResult({
          lr: data.lr,
          awb: data.awb,
          pickupName: data.pickupName,
          pickupPincode: data.pickupPincode,
          deliveryName: data.deliveryName,
          deliveryPincode: data.deliveryPincode,
          status: data.status || 'booked',
          weight: data.weight,
          material: data.material,
          totalValue: data.totalValue,
          updatedAt: data.updatedAt
        });
      } else {
        alert("Shipment not found!");
      }
    } catch (error) {
      console.error("Tracking error:", error);
      alert("Error tracking shipment");
    } finally {
      setTrackingLoading(false);
    }
  };

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
    if (needsEwayBill && !ewayBill) return alert("E-Way Bill required for invoice > ₹50,000");
    if (!pickup.name || !delivery.name || !orderDetails.weight) return alert("Fill all mandatory fields");
    if (!pickup.pincode || !delivery.pincode) return alert("Enter valid 6-digit pincodes");
    if (isManualLR && !manualLRNumber) return alert("Enter Manual LR Number");

    setLoading(true);
    setApiError("");

    const orderData = {
      pickupName: pickup.name, pickupAddress: pickup.address, pickupPincode: pickup.pincode,
      pickupContact: pickup.contact, pickupGstin: pickup.gstin,
      deliveryName: delivery.name, deliveryAddress: delivery.address, deliveryPincode: delivery.pincode,
      deliveryContact: delivery.contact, deliveryGstin: delivery.gstin,
      material: orderDetails.material || "General Cargo", hsn: orderDetails.hsnCode,
      boxes: totalPackages, weight: parseFloat(chargedWeight),
      actual_weight: parseFloat(orderDetails.weight || 0), volumetric_weight: parseFloat(volWeight),
      total_value: totalInvoiceValue, eway_bill: needsEwayBill ? ewayBill : "",
      booking_mode: bookingMode,
      dimensions: dimensions,
      invoices: invoices.filter(inv => inv.no && inv.value).map(inv => ({ invoice_no: inv.no, invoice_value: parseFloat(inv.value) }))
    };

    try {
      const response = await fetch("https://faithcargo.onrender.com/api/shipments/create-order/", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderData)
      });
      const result = await response.json();

      if (result.success) {
        setLrNumber(result.lr_number);
        setAwbNumber(result.awb);
        setShipmentStatus("booked");
        setShowLR(true);
        
        const allShipments = JSON.parse(localStorage.getItem('allShipments') || '[]');
        allShipments.unshift({
          lr: isManualLR ? manualLRNumber : result.lr_number, 
          awb: result.awb,
          route: `${pickup.pincode} → ${delivery.pincode}`, 
          value: totalInvoiceValue,
          status: 'booked', 
          date: new Date().toISOString(),
          invoices: invoices.filter(inv => inv.no && inv.value),
          uploadedFiles: uploadedFiles
        });
        localStorage.setItem('allShipments', JSON.stringify(allShipments.slice(0, 50)));
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

  const getStatusBadge = (status) => {
    const statusMap = {
      'booked': { text: '📝 Booked', class: 'status-booked', color: '#f59e0b' },
      'picked': { text: '🚚 Picked Up', class: 'status-picked', color: '#3b82f6' },
      'in_transit': { text: '🚛 In Transit', class: 'status-transit', color: '#8b5cf6' },
      'out_for_delivery': { text: '📦 Out for Delivery', class: 'status-out', color: '#ec4898' },
      'delivered': { text: '✅ Delivered', class: 'status-delivered', color: '#10b981' }
    };
    const s = statusMap[status] || statusMap.booked;
    return <span className={`status-badge ${s.class}`} style={{ backgroundColor: `${s.color}15`, color: s.color, borderLeftColor: s.color }}>{s.text}</span>;
  };

  const getTrackingTimeline = (currentStatus) => {
    const steps = [
      { key: 'booked', label: 'Booked', icon: '📝', desc: 'Order confirmed' },
      { key: 'picked', label: 'Picked Up', icon: '🚚', desc: 'Shipment collected' },
      { key: 'in_transit', label: 'In Transit', icon: '🚛', desc: 'On the way' },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: '📦', desc: 'Near destination' },
      { key: 'delivered', label: 'Delivered', icon: '✅', desc: 'Successfully delivered' }
    ];
    const currentIndex = steps.findIndex(s => s.key === currentStatus);
    
    return (
      <div className="tracking-timeline-enhanced">
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.key} className={`timeline-step-enhanced ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="timeline-icon-enhanced">
                {isCompleted ? <CheckCircle2 size={22} /> : <span className="step-icon-enhanced">{step.icon}</span>}
              </div>
              <div className="timeline-content-enhanced">
                <div className="step-label-enhanced">{step.label}</div>
                <div className="step-desc-enhanced">{step.desc}</div>
              </div>
              {idx < steps.length - 1 && <div className={`timeline-line-enhanced ${isCompleted ? 'completed' : ''}`}></div>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="create-order-page">
      <aside className="order-sidebar">
        <div className="sidebar-logo"><img src={logo} alt="FCPL" /><div className="online-indicator"></div></div>
        <nav className="sidebar-navigation">
          <div className="nav-link active"><Plus size={18} /> Create Booking</div>
          <div className="nav-link" onClick={() => { setShowTracking(!showTracking); if (!showTracking) setTrackingResult(null); }}><Search size={18} /> Live Tracking</div>
          <div className="nav-link" onClick={() => window.location.href='/shipments'}><FileText size={18} /> All Dockets</div>
          <div className="nav-link"><CreditCard size={18} /> Payments</div>
        </nav>
        <div className="sidebar-help"><Award size={24} color="#d32f2f" /><p>Support 24/7</p><span>📞 9818641504</span></div>
      </aside>

      <main className="order-main-content">
        <div className="page-title-section">
          <div><h1>Create Shipment</h1><p>Enter consignment details for LR generation</p></div>
          <div className="stats-badges"><div className="badge">⚡ Charged: {chargedWeight} Kg</div><div className="badge red">💰 Value: ₹{totalInvoiceValue.toLocaleString()}</div></div>
        </div>

        {apiError && <div className="error-notice"><AlertCircle size={18} /> {apiError}</div>}

        {showTracking && (
          <div className="tracking-section-enhanced">
            <div className="tracking-header-enhanced">
              <Activity size={24} color="#d32f2f" />
              <h3>Live Shipment Tracking</h3>
              <span className="tracking-badge-enhanced">Real-Time Updates</span>
            </div>
            <div className="tracking-input-group-enhanced">
              <input type="text" placeholder="Enter LR Number (e.g., FCPL0016) or AWB Number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())} onKeyPress={(e) => e.key === 'Enter' && handleTrackShipment()} />
              <button onClick={handleTrackShipment} disabled={trackingLoading}>
                {trackingLoading ? <RefreshCw size={18} className="spin" /> : <Search size={18} />}
                {trackingLoading ? "Tracking..." : "Track Shipment"}
              </button>
            </div>
            {trackingResult && (
              <div className="tracking-result-enhanced">
                <div className="tracking-card-enhanced">
                  <div className="tracking-card-header-enhanced">
                    <div className="tracking-numbers">
                      <span className="tracking-lr-enhanced">{trackingResult.lr}</span>
                      <span className="tracking-awb-enhanced">AWB: {trackingResult.awb}</span>
                    </div>
                    {getStatusBadge(trackingResult.status)}
                  </div>
                  
                  <div className="tracking-route-info-enhanced">
                    <div className="route-point-enhanced pickup">
                      <div className="point-icon-enhanced"><MapPin size={20} /></div>
                      <div className="point-details-enhanced">
                        <label>Pickup Location</label>
                        <p><strong>{trackingResult.pickupName || 'N/A'}</strong></p>
                        <span>Pincode: {trackingResult.pickupPincode}</span>
                      </div>
                    </div>
                    <div className="route-arrow-enhanced">
                      <div className="arrow-line"></div>
                      <Truck size={20} className="truck-icon" />
                      <div className="arrow-line"></div>
                    </div>
                    <div className="route-point-enhanced delivery">
                      <div className="point-icon-enhanced"><Truck size={20} /></div>
                      <div className="point-details-enhanced">
                        <label>Delivery Location</label>
                        <p><strong>{trackingResult.deliveryName || 'N/A'}</strong></p>
                        <span>Pincode: {trackingResult.deliveryPincode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="tracking-timeline-container-enhanced">
                    <h4><Clock size={16} /> Shipment Progress</h4>
                    {getTrackingTimeline(trackingResult.status)}
                  </div>

                  <div className="tracking-details-grid-enhanced">
                    <div className="detail-item-enhanced">
                      <Weight size={16} />
                      <div><label>Weight</label><p>{trackingResult.weight} kg</p></div>
                    </div>
                    <div className="detail-item-enhanced">
                      <Package size={16} />
                      <div><label>Material</label><p>{trackingResult.material || 'General Cargo'}</p></div>
                    </div>
                    <div className="detail-item-enhanced">
                      <DollarSign size={16} />
                      <div><label>Invoice Value</label><p>₹{trackingResult.totalValue?.toLocaleString()}</p></div>
                    </div>
                    <div className="detail-item-enhanced">
                      <Timer size={16} />
                      <div><label>Last Updated</label><p>{new Date(trackingResult.updatedAt).toLocaleString()}</p></div>
                    </div>
                  </div>

                  <div className="tracking-actions-enhanced">
                    <button className="tracking-close-enhanced" onClick={() => setTrackingResult(null)}>Close</button>
                    <button className="tracking-refresh-enhanced" onClick={handleTrackShipment}><RefreshCw size={14} /> Refresh</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="two-column-form">
          <div className="left-form-col">
            <div className="form-section">
              <div className="section-heading"><MapPin size={18} color="#d32f2f" /> Consignor (Sender)</div>
              <div className="section-body">
                <SavedAddresses onSelectAddress={handleSelectSavedAddress} currentAddress={pickup} />
                <div className="form-row">
                  <div className="form-field"><label>Company / Name *</label><input value={pickup.name} onChange={e => setPickup({...pickup, name: e.target.value.toUpperCase()})} placeholder="Enter sender name" /></div>
                  <div className="form-field"><label>Mobile Number *</label><input type="tel" maxLength={10} value={pickup.contact} onChange={e => setPickup({...pickup, contact: e.target.value})} placeholder="10 digit mobile" /></div>
                </div>
                <div className="form-field full-width"><label>Full Address *</label><textarea rows={2} value={pickup.address} onChange={e => setPickup({...pickup, address: e.target.value})} placeholder="House No, Street, Area" /></div>
                <div className="form-row">
                  <div className="form-field"><label>Pincode *</label><input maxLength={6} value={pickup.pincode} onChange={e => { setPickup({...pickup, pincode: e.target.value}); fetchLocation(e.target.value, 'pickup'); }} placeholder="6 digit" /></div>
                  <div className="form-field"><label>City & State</label><input className="readonly-field" value={pickup.city ? `${pickup.city}, ${pickup.state}` : ""} readOnly /></div>
                </div>
                <div className="form-field"><label>GSTIN (Optional)</label><input value={pickup.gstin} onChange={e => setPickup({...pickup, gstin: e.target.value.toUpperCase()})} placeholder="15 digit GSTIN" maxLength={15} /></div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-heading"><Truck size={18} color="#d32f2f" /> Consignee (Receiver)</div>
              <div className="section-body">
                <div className="form-row"><div className="form-field"><label>Receiver Name *</label><input value={delivery.name} onChange={e => setDelivery({...delivery, name: e.target.value.toUpperCase()})} placeholder="Enter receiver name" /></div><div className="form-field"><label>Mobile Number *</label><input type="tel" maxLength={10} value={delivery.contact} onChange={e => setDelivery({...delivery, contact: e.target.value})} placeholder="10 digit mobile" /></div></div>
                <div className="form-field full-width"><label>Full Address *</label><textarea rows={2} value={delivery.address} onChange={e => setDelivery({...delivery, address: e.target.value})} placeholder="House No, Street, Area" /></div>
                <div className="form-row"><div className="form-field"><label>Pincode *</label><input maxLength={6} value={delivery.pincode} onChange={e => { setDelivery({...delivery, pincode: e.target.value}); fetchLocation(e.target.value, 'delivery'); }} placeholder="6 digit" /></div><div className="form-field"><label>City & State</label><input className="readonly-field" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} readOnly /></div></div>
                <div className="form-field"><label>GSTIN (Optional)</label><input value={delivery.gstin} onChange={e => setDelivery({...delivery, gstin: e.target.value.toUpperCase()})} placeholder="15 digit GSTIN" maxLength={15} /></div>
              </div>
            </div>
          </div>

          <div className="right-form-col">
            <div className="form-section">
              <div className="section-heading"><Package size={18} color="#d32f2f" /> Shipment Details</div>
              <div className="section-body">
                <div className="form-field full-width"><label>Material Description</label><input placeholder="e.g., Industrial Tools, Textile" onChange={e => setOrderDetails({...orderDetails, material: e.target.value.toUpperCase()})} /></div>
                <div className="form-field full-width"><label>HSN Code</label><input value={orderDetails.hsnCode} onChange={e => setOrderDetails({...orderDetails, hsnCode: e.target.value})} placeholder="HSN Code" /></div>
                <div className="mode-selector"><label>Booking Mode *</label><div className="mode-options">
                  <button type="button" className={`mode-option ${bookingMode === 'surface' ? 'active' : ''}`} onClick={() => setBookingMode('surface')}><Truck size={16} /> Surface</button>
                  <button type="button" className={`mode-option ${bookingMode === 'air' ? 'active' : ''}`} onClick={() => setBookingMode('air')}><Plane size={16} /> Air</button>
                  <button type="button" className={`mode-option ${bookingMode === 'rail' ? 'active' : ''}`} onClick={() => setBookingMode('rail')}><Train size={16} /> Rail</button>
                  <button type="button" className={`mode-option ${bookingMode === 'express' ? 'active' : ''}`} onClick={() => setBookingMode('express')}><TrendingUp size={16} /> Express</button>
                </div></div>
                <div className="form-row"><div className="form-field"><label>Actual Weight (Kg) *</label><input type="number" step="0.1" value={orderDetails.weight} onChange={e => setOrderDetails({...orderDetails, weight: e.target.value})} placeholder="Weight" /></div></div>
                
                <DimensionInput dimensions={dimensions} setDimensions={setDimensions} setTotalBoxes={setTotalPackages} />
                
                <div className="weight-summary"><span>Volumetric Weight: <strong>{volWeight} kg</strong></span><span>Charged Weight: <strong>{chargedWeight} kg</strong></span></div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-heading between"><div><FileText size={18} color="#d32f2f" /> Invoice Details</div><button className="add-invoice-btn" onClick={() => setInvoices([...invoices, { id: Date.now(), no: "", value: "" }])}><Plus size={14} /> Add</button></div>
              <div className="section-body">
                {invoices.map(inv => (<div key={inv.id} className="invoice-input-row"><input placeholder="Invoice No" value={inv.no} onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, no: e.target.value.toUpperCase()} : i))} /><input type="number" placeholder="Value ₹" value={inv.value} onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, value: e.target.value} : i))} /><button className="remove-invoice-btn" onClick={() => setInvoices(invoices.filter(i => i.id !== inv.id))}><Trash2 size={14} /></button></div>))}
                <InvoiceUpload onUpload={(files) => console.log("Uploaded:", files)} uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} />
                {needsEwayBill && (<div className="eway-alert"><div className="eway-header"><AlertCircle size={16} /> E-WAY BILL REQUIRED</div><input className="eway-input-field" value={ewayBill} onChange={e => setEwayBill(e.target.value.toUpperCase())} placeholder="12 DIGIT E-WAY BILL NO." maxLength={12} /></div>)}
                <RealTimeFreightCalculator weight={chargedWeight} origin={pickup.pincode} destination={delivery.pincode} bookingMode={bookingMode} onCalculate={setFreightData} />
                <div className="settings-panel">
                  <div className="setting-row"><label>Manual LR Number</label><button className={`toggle-switch ${isManualLR ? 'on' : 'off'}`} onClick={() => setIsManualLR(!isManualLR)}>{isManualLR ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}{isManualLR ? 'Manual ON' : 'Auto'}</button></div>
                  {isManualLR && (<input className="manual-lr-input" placeholder="Enter LR Number" value={manualLRNumber} onChange={e => setManualLRNumber(e.target.value.toUpperCase())} />)}
                  <div className="setting-row"><label>Show Freight on Docket</label><button className={`toggle-switch ${showFreightOnDocket ? 'on' : 'off'}`} onClick={() => setShowFreightOnDocket(!showFreightOnDocket)}>{showFreightOnDocket ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}{showFreightOnDocket ? 'Show' : 'Hide'}</button></div>
                </div>
              </div>
            </div>

            <button className={`generate-btn ${loading ? 'loading-state' : ''}`} onClick={handleCreateOrder} disabled={loading}>{loading ? <Clock size={20} className="spin" /> : <Crown size={20} />}{loading ? "Generating LR..." : "Generate Consignment Note"}<ChevronRight size={18} /></button>
          </div>
        </div>

        {showLR && (<div className="modal-overlay" onClick={() => setShowLR(false)}><div className="modal-dialog" onClick={e => e.stopPropagation()}>
          <div className="modal-icon"><CheckCircle size={60} color="#10b981" /></div><h2>Consignment Generated!</h2>
          <div className="modal-lr-number">{isManualLR ? manualLRNumber : lrNumber}</div>
          <div className="modal-awb-number">AWB: {awbNumber}</div>
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
            />
          </div>
          <div className="modal-buttons">
            <button className="modal-btn print-btn" onClick={handlePrintDocket}><Printer size={16} /> Print Docket</button>
            <button className="modal-btn view-btn" onClick={() => window.location.href='/shipments'}><Eye size={16} /> View All</button>
            <button className="modal-btn new-btn" onClick={() => window.location.reload()}><Plus size={16} /> New</button>
          </div>
        </div></div>)}
      </main>
    </div>
  );
}