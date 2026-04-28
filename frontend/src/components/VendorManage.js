import React, { useState, useEffect, useCallback } from "react";
import "./VendorManage.css";

// Zones for rate matrix
const ZONES = [
  "N1", "N2", "N3", "N4", "C1", "C2", "W1", "W2", 
  "S1", "S2", "S3", "S4", "E1", "E2", "NE1", "NE2", "NE3"
];

// API Base URL - CORRECT with /api/vendors prefix
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://faithcargo.onrender.com";

const DEFAULT_ODA_MIN_CHARGE = 500;
const BLUE_DART_ODA_MIN_CHARGE = 3000;

// Vendors that support CFT rates (only RIVIGO and PD LOGISTICS)
const CFT_SUPPORTED_VENDORS = ["RIVIGO", "PD LOGISTICS"];

function VendorManage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: "",
    rates: {},
    delhivery_6cft: {},
    delhivery_10cft: {},
    charges: {},
    is_active: true
  });
  const [activeTab, setActiveTab] = useState("standard");
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvVendor, setCsvVendor] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvUploading, setCsvUploading] = useState(false);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceVendor, setInvoiceVendor] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceUploading, setInvoiceUploading] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      // ✅ CORRECT URL with /api/vendors prefix
      const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/`);
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Fetched vendors from DB:", data.map(v => ({ 
          name: v.vendor_name, 
          ratesCount: Object.keys(v.rates || {}).length,
          cft6Count: Object.keys(v.delhivery_6cft || {}).length 
        })));
        
        const updatedData = data.map(vendor => {
          const charges = vendor.charges || {};
          const isBlueDart = vendor.vendor_name === "SHIPSHOPY BLUE DART";
          
          if (!charges.oda_min_charge || charges.oda_min_charge === 0) {
            charges.oda_min_charge = isBlueDart ? BLUE_DART_ODA_MIN_CHARGE : DEFAULT_ODA_MIN_CHARGE;
          }
          vendor.charges = charges;
          return vendor;
        });
        
        setVendors(updatedData);
        updateStats(updatedData);
      } else {
        console.error("❌ API failed with status:", response.status);
        setError(`API Error: ${response.status}`);
        setVendors([]);
        updateStats([]);
      }
    } catch (err) {
      console.error("❌ Error fetching vendors:", err);
      setError(err.message);
      setVendors([]);
      updateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (vendorData) => {
    const total = vendorData.length;
    const active = vendorData.filter(v => v.is_active !== false).length;
    const inactive = total - active;
    setStats({ total, active, inactive });
  };

  const hasCFTSupport = (vendorName) => {
    return CFT_SUPPORTED_VENDORS.includes(vendorName);
  };

  const openInvoiceModal = (vendor) => {
    setInvoiceVendor(vendor);
    setInvoiceFile(null);
    setInvoiceData(null);
    setShowInvoiceModal(true);
  };

  const handleInvoiceFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      setInvoiceFile(file);
      previewInvoiceData(file);
    } else {
      showNotification("Please upload a valid JSON file", "error");
    }
  };

  const previewInvoiceData = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setInvoiceData(data);
        showNotification("✅ Invoice data loaded successfully", "success");
      } catch (err) {
        showNotification("❌ Invalid JSON format", "error");
        setInvoiceData(null);
      }
    };
    reader.readAsText(file);
  };

  const uploadInvoiceData = async () => {
    if (!invoiceFile || !invoiceVendor) {
      showNotification("Please select a JSON file", "error");
      return;
    }

    if (!invoiceData) {
      showNotification("Invalid invoice data", "error");
      return;
    }

    setInvoiceUploading(true);

    try {
      // ✅ CORRECT URL with /api/vendors prefix
      const getResponse = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/${encodeURIComponent(invoiceVendor.vendor_name)}/`);
      let currentData = {};
      
      if (getResponse.ok) {
        currentData = await getResponse.json();
      }

      const updatedCharges = {
        ...currentData.charges,
        ...invoiceData
      };
      
      const isBlueDart = invoiceVendor.vendor_name === "SHIPSHOPY BLUE DART";
      if (!updatedCharges.oda_min_charge || updatedCharges.oda_min_charge === 0) {
        updatedCharges.oda_min_charge = isBlueDart ? BLUE_DART_ODA_MIN_CHARGE : DEFAULT_ODA_MIN_CHARGE;
      }

      const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/${encodeURIComponent(invoiceVendor.vendor_name)}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentData,
          charges: updatedCharges
        })
      });

      if (response.ok) {
        showNotification(`✅ Invoice uploaded successfully for ${invoiceVendor.vendor_name}!`, "success");
        setShowInvoiceModal(false);
        setInvoiceFile(null);
        setInvoiceData(null);
        fetchVendors();
      } else {
        const error = await response.json();
        showNotification(`❌ Upload failed: ${error.error || "Unknown error"}`, "error");
      }
    } catch (err) {
      showNotification(`❌ Network error: ${err.message}`, "error");
    } finally {
      setInvoiceUploading(false);
    }
  };

  const downloadCsvTemplate = (vendorName) => {
    const headers = [
      'pincode',
      'city',
      'state',
      'is_oda',
      'oda_category',
      'oda_charge_per_kg',
      'oda_min_charge',
      'is_serviceable'
    ];
    
    let sampleData = [
      ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '4', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
      ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '2', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
      ['124105', 'Jhajjar', 'Haryana', 'TRUE', 'A', '2', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
      ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
    ];
    
    if (vendorName === 'SHIPSHOPY BLUE DART') {
      sampleData = [
        ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '5', String(BLUE_DART_ODA_MIN_CHARGE), 'TRUE'],
        ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '5', String(BLUE_DART_ODA_MIN_CHARGE), 'TRUE'],
        ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
      ];
    } else if (vendorName === 'SHIPSHOPY DELIVERY') {
      sampleData = [
        ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '3', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
        ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '3', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
        ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
      ];
    } else if (vendorName === 'PD LOGISTICS') {
      sampleData = [
        ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '4', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
        ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '2', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
        ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
      ];
    } else if (vendorName === 'RIVIGO') {
      sampleData = [
        ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '4', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
        ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '2', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
        ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
      ];
    } else if (vendorName === 'SHIVANI VX') {
      sampleData = [
        ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '4.5', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
        ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '3.5', String(DEFAULT_ODA_MIN_CHARGE), 'TRUE'],
        ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
      ];
    }
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vendorName}_pincodes_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`📥 CSV template downloaded for ${vendorName}`, "success");
  };

  const openCsvModal = (vendor) => {
    setCsvVendor(vendor);
    setCsvFile(null);
    setCsvPreview([]);
    setShowCsvModal(true);
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      previewCsvData(file);
    } else {
      showNotification("Please upload a valid CSV file", "error");
    }
  };

  const previewCsvData = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      const previewData = [];
      
      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const row = {};
          headers.forEach((header, idx) => {
            row[header.trim()] = values[idx]?.trim() || '';
          });
          previewData.push(row);
        }
      }
      setCsvPreview(previewData);
    };
    reader.readAsText(file);
  };

  const uploadCsvData = async () => {
    if (!csvFile || !csvVendor) {
      showNotification("Please select a CSV file", "error");
      return;
    }
    
    setCsvUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const pincodes = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const pincodeData = {};
          
          headers.forEach((header, idx) => {
            let value = values[idx]?.trim() || '';
            
            if (header === 'is_oda' || header === 'is_serviceable') {
              value = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
            }
            if (header === 'oda_charge_per_kg' || header === 'oda_min_charge') {
              value = parseFloat(value) || 0;
            }
            
            pincodeData[header] = value;
          });
          
          if (pincodeData.pincode && String(pincodeData.pincode).length === 6) {
            pincodes.push(pincodeData);
          }
        }
      }
      
      if (pincodes.length === 0) {
        showNotification("No valid pincodes found in CSV", "error");
        setCsvUploading(false);
        return;
      }
      
      try {
        // ✅ CORRECT URL with /api/vendors prefix
        const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-pincodes/bulk-upload/${encodeURIComponent(csvVendor.vendor_name)}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pincodes: pincodes,
            replace_existing: true
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          showNotification(`✅ Uploaded ${result.created} new, updated ${result.updated} pincodes for ${csvVendor.vendor_name}`, "success");
          setShowCsvModal(false);
          setCsvFile(null);
          setCsvPreview([]);
        } else {
          const error = await response.json();
          showNotification(`❌ Upload failed: ${error.error || "Unknown error"}`, "error");
        }
      } catch (err) {
        showNotification(`❌ Network error: ${err.message}`, "error");
      } finally {
        setCsvUploading(false);
      }
    };
    
    reader.readAsText(csvFile);
  };

  const handleEditVendor = (vendor) => {
    console.log("Editing vendor:", vendor.vendor_name);
    console.log("Vendor rates from DB:", vendor.rates);
    console.log("Vendor 6CFT from DB:", vendor.delhivery_6cft);
    
    let rates = vendor.rates || {};
    let delhivery_6cft = vendor.delhivery_6cft || {};
    let delhivery_10cft = vendor.delhivery_10cft || {};
    
    setFormData({
      vendor_name: vendor.vendor_name,
      rates: rates,
      delhivery_6cft: delhivery_6cft,
      delhivery_10cft: delhivery_10cft,
      charges: vendor.charges || {},
      is_active: vendor.is_active !== false
    });
    setEditMode(true);
    setShowModal(true);
    setActiveTab("standard");
  };

  const handleAddVendor = () => {
    setSelectedVendor(null);
    setFormData({
      vendor_name: "",
      rates: {},
      delhivery_6cft: {},
      delhivery_10cft: {},
      charges: {
        docket_charge: 100,
        fsc: "10%",
        gst: "18%",
        min_freight: 350,
        fov: 75,
        min_weight: 20,
        oda_charge: 2,
        oda_min_charge: DEFAULT_ODA_MIN_CHARGE,
        divisor: 5000
      },
      is_active: true
    });
    setEditMode(false);
    setShowModal(true);
    setActiveTab("standard");
  };

  const handleRateChange = (rateType, fromZone, toZone, value) => {
    setFormData(prev => ({
      ...prev,
      [rateType]: {
        ...prev[rateType],
        [fromZone]: {
          ...prev[rateType][fromZone],
          [toZone]: parseFloat(value) || 0
        }
      }
    }));
  };

  const handleChargeChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      charges: {
        ...prev.charges,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      // ✅ CORRECT URL with /api/vendors prefix
      const url = editMode 
        ? `${API_BASE_URL}/api/vendors/vendor-rates/${encodeURIComponent(formData.vendor_name)}/`
        : `${API_BASE_URL}/api/vendors/vendor-rates/`;
      
      const method = editMode ? "PUT" : "POST";
      
      const chargesToSave = { ...formData.charges };
      const isBlueDart = formData.vendor_name === "SHIPSHOPY BLUE DART";
      if (!chargesToSave.oda_min_charge || chargesToSave.oda_min_charge === 0) {
        chargesToSave.oda_min_charge = isBlueDart ? BLUE_DART_ODA_MIN_CHARGE : DEFAULT_ODA_MIN_CHARGE;
      }
      
      const dataToSave = {
        ...formData,
        charges: chargesToSave
      };
      
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave)
      });
      
      if (response.ok) {
        showNotification(`✅ ${formData.vendor_name} rates ${editMode ? 'updated' : 'created'} successfully!`, "success");
        setShowModal(false);
        fetchVendors();
      } else {
        const errorData = await response.json();
        showNotification("❌ Error: " + (errorData.error || "Failed to save"), "error");
      }
    } catch (err) {
      showNotification("❌ Network error: " + err.message, "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteVendor = async (vendor) => {
    if (window.confirm(`⚠️ Are you sure you want to delete ${vendor.vendor_name}? This action cannot be undone.`)) {
      try {
        // ✅ CORRECT URL with /api/vendors prefix
        const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/${encodeURIComponent(vendor.vendor_name)}/`, {
          method: "DELETE"
        });
        
        if (response.ok) {
          showNotification(`✅ ${vendor.vendor_name} deleted successfully!`, "success");
          fetchVendors();
        } else {
          showNotification("❌ Failed to delete vendor", "error");
        }
      } catch (err) {
        showNotification("❌ Network error: " + err.message, "error");
      }
    }
  };

  const handleToggleStatus = async (vendor) => {
    const updatedVendor = { ...vendor, is_active: !vendor.is_active };
    try {
      // ✅ CORRECT URL with /api/vendors prefix
      const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/${encodeURIComponent(vendor.vendor_name)}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedVendor)
      });
      
      if (response.ok) {
        showNotification(`${vendor.vendor_name} ${updatedVendor.is_active ? 'activated' : 'deactivated'}`, "success");
        fetchVendors();
      } else {
        showNotification("Failed to update status", "error");
      }
    } catch (err) {
      showNotification("Network error: " + err.message, "error");
    }
  };

  const getRateValue = (rates, fromZone, toZone) => {
    const value = rates?.[fromZone]?.[toZone];
    if (value === undefined || value === null) return "";
    return value;
  };

  const copyRatesToClipboard = () => {
    let rates = {};
    if (activeTab === "standard") {
      rates = formData.rates;
    } else if (activeTab === "6cft") {
      rates = formData.delhivery_6cft;
    } else if (activeTab === "10cft") {
      rates = formData.delhivery_10cft;
    }
    
    let text = "From\\To\t" + ZONES.join("\t") + "\n";
    ZONES.forEach(fromZone => {
      text += fromZone + "\t";
      ZONES.forEach(toZone => {
        text += (rates[fromZone]?.[toZone] || "0") + "\t";
      });
      text += "\n";
    });
    navigator.clipboard.writeText(text);
    showNotification("Rates copied to clipboard!", "success");
  };

  const filteredVendors = vendors.filter(vendor => 
    vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderInvoiceModal = () => {
    if (!showInvoiceModal) return null;
    
    const isBlueDart = invoiceVendor?.vendor_name === 'SHIPSHOPY BLUE DART';
    const isShipshopyDelivery = invoiceVendor?.vendor_name === 'SHIPSHOPY DELIVERY';
    const isShivaniVX = invoiceVendor?.vendor_name === 'SHIVANI VX';
    const isTrucx = invoiceVendor?.vendor_name?.includes('TRUCX');
    
    let exampleJson = {
      "docket_charge": 100,
      "fsc": "12%",
      "gst": "18%",
      "min_freight": 380,
      "min_weight": 20,
      "oda_charge": 4,
      "oda_min_charge": DEFAULT_ODA_MIN_CHARGE,
      "divisor": 4500
    };
    
    if (isBlueDart) {
      exampleJson = {
        "docket_charge": 50,
        "fsc": "20%",
        "min_freight": 400,
        "oda_charge": 5,
        "oda_min_charge": BLUE_DART_ODA_MIN_CHARGE,
        "divisor": 4500
      };
    } else if (isShipshopyDelivery) {
      exampleJson = {
        "docket_charge": 50,
        "fsc": "10%",
        "min_freight": 350,
        "oda_charge": 3,
        "oda_min_charge": DEFAULT_ODA_MIN_CHARGE,
        "divisor": 4500
      };
    } else if (isShivaniVX) {
      exampleJson = {
        "docket_charge": 50,
        "fsc": "7%",
        "min_freight": 800,
        "oda_min_charge": DEFAULT_ODA_MIN_CHARGE,
        "divisor": 5000
      };
    } else if (isTrucx) {
      exampleJson = {
        "docket_charge": 50,
        "fsc": "10%",
        "min_freight": 350,
        "oda_charge": 3,
        "oda_min_charge": DEFAULT_ODA_MIN_CHARGE,
        "divisor": 4500
      };
    }
    
    return (
      <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
        <div className="modal-container invoice-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📄 Invoice Upload - {invoiceVendor?.vendor_name}</h2>
            <button className="close-btn" onClick={() => setShowInvoiceModal(false)}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="invoice-info-section">
              <h4>📋 Invoice JSON Format Instructions:</h4>
              <div className="json-format-box">
                <code>
                  {JSON.stringify(exampleJson, null, 2)}
                </code>
              </div>
              <div className="invoice-tips">
                <strong>💡 Tips:</strong>
                <ul>
                  <li>Upload JSON file with vendor charges</li>
                  <li>Only include fields you want to update</li>
                  <li>Existing charges will be merged</li>
                  <li><strong>Default ODA Min Charge: ₹{DEFAULT_ODA_MIN_CHARGE}</strong> for all vendors (except Blue Dart: ₹{BLUE_DART_ODA_MIN_CHARGE})</li>
                </ul>
              </div>
            </div>
            
            <div className="invoice-upload-section">
              <div className="file-upload-area">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleInvoiceFileChange}
                  id="invoice-file-input"
                  style={{ display: 'none' }}
                />
                <label htmlFor="invoice-file-input" className="file-upload-label">
                  📁 {invoiceFile ? invoiceFile.name : "Choose JSON Invoice File"}
                </label>
              </div>
              
              {invoiceData && (
                <div className="invoice-preview">
                  <h4>Preview Invoice Data:</h4>
                  <div className="preview-table-wrapper">
                    <pre className="json-preview">
                      {JSON.stringify(invoiceData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
            <button className="upload-btn" onClick={uploadInvoiceData} disabled={!invoiceFile || invoiceUploading}>
              {invoiceUploading ? "⏳ Uploading..." : "📤 Upload Invoice"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCsvModal = () => {
    if (!showCsvModal) return null;
    
    const isBlueDart = csvVendor?.vendor_name === 'SHIPSHOPY BLUE DART';
    const isShipshopyDelivery = csvVendor?.vendor_name === 'SHIPSHOPY DELIVERY';
    const isShivaniVX = csvVendor?.vendor_name === 'SHIVANI VX';
    const isPd = csvVendor?.vendor_name === 'PD LOGISTICS';
    const isRivigo = csvVendor?.vendor_name === 'RIVIGO';
    
    let odaHint = "";
    if (isBlueDart) {
      odaHint = `Blue Dart ODA: ₹5/kg (Min ₹${BLUE_DART_ODA_MIN_CHARGE})`;
    } else if (isShipshopyDelivery) {
      odaHint = `Shipshopy Delhivery ODA: ₹3/kg (Min ₹${DEFAULT_ODA_MIN_CHARGE})`;
    } else if (isShivaniVX) {
      odaHint = `Shivani VX: Standard rates, Min ODA ₹${DEFAULT_ODA_MIN_CHARGE}`;
    } else if (isPd) {
      odaHint = `PD Logistics ODA: ₹4/kg (Min ₹${DEFAULT_ODA_MIN_CHARGE})`;
    } else if (isRivigo) {
      odaHint = `RIVIGO ODA: ₹4/kg (Min ₹${DEFAULT_ODA_MIN_CHARGE})`;
    } else {
      odaHint = `Default ODA Min Charge: ₹${DEFAULT_ODA_MIN_CHARGE}`;
    }
    
    return (
      <div className="modal-overlay" onClick={() => setShowCsvModal(false)}>
        <div className="modal-container csv-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📊 CSV Upload - {csvVendor?.vendor_name}</h2>
            <button className="close-btn" onClick={() => setShowCsvModal(false)}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="csv-info-section">
              <h4>📋 CSV Format Instructions:</h4>
              <div className="csv-format-box">
                <code>
                  pincode,city,state,is_oda,oda_category,oda_charge_per_kg,oda_min_charge,is_serviceable
                </code>
                <br/>
                <code>212217,Allahabad,UP,TRUE,B,4,{DEFAULT_ODA_MIN_CHARGE},TRUE</code>
                <br/>
                <code>122502,Gurgaon,Haryana,TRUE,A,2,{DEFAULT_ODA_MIN_CHARGE},TRUE</code>
                <br/>
                <code>110001,New Delhi,Delhi,FALSE,,0,0,TRUE</code>
              </div>
              {odaHint && (
                <div className="oda-hint" style={{marginTop: '10px', padding: '8px', background: '#fef3c7', borderRadius: '8px'}}>
                  <strong>⚠️ Note:</strong> {odaHint}
                </div>
              )}
              <div className="oda-categories-info">
                <strong>ODA Categories:</strong>
                <ul>
                  <li><span className="oda-cat-a">A</span> - ₹2/kg, Min ₹200</li>
                  <li><span className="oda-cat-b">B</span> - ₹4/kg, Min ₹400</li>
                  <li><span className="oda-cat-c">C</span> - ₹7/kg, Min ₹700</li>
                  <li><span className="oda-cat-d">D</span> - ₹10/kg, Min ₹1000</li>
                </ul>
                <p style={{marginTop: '8px', fontSize: '11px', color: '#666'}}>
                  <strong>Note:</strong> Default Min ODA Charge for all vendors is <strong>₹{DEFAULT_ODA_MIN_CHARGE}</strong>
                </p>
              </div>
            </div>
            
            <div className="csv-upload-section">
              <button className="download-template-btn" onClick={() => downloadCsvTemplate(csvVendor?.vendor_name)}>
                📥 Download Template CSV
              </button>
              
              <div className="file-upload-area">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  id="csv-file-input"
                  style={{ display: 'none' }}
                />
                <label htmlFor="csv-file-input" className="file-upload-label">
                  📁 {csvFile ? csvFile.name : "Choose CSV File"}
                </label>
              </div>
              
              {csvPreview.length > 0 && (
                <div className="csv-preview">
                  <h4>Preview (First 10 rows):</h4>
                  <div className="preview-table-wrapper">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          {Object.keys(csvPreview[0] || {}).map(key => (
                            <th key={key}>{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).map((val, i) => (
                              <td key={i}>{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setShowCsvModal(false)}>Cancel</button>
            <button className="upload-btn" onClick={uploadCsvData} disabled={!csvFile || csvUploading}>
              {csvUploading ? "⏳ Uploading..." : "📤 Upload CSV"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRateMatrix = (rateType, title) => {
    const rates = formData[rateType] || {};
    
    const isCFTVendor = CFT_SUPPORTED_VENDORS.includes(formData.vendor_name);
    const isStandardTab = rateType === "rates";
    
    if (isCFTVendor && isStandardTab && Object.keys(rates).length === 0) {
      return (
        <div className="rate-matrix-container">
          <div className="matrix-header">
            <h3>{title}</h3>
          </div>
          <div className="info-message" style={{padding: '20px', textAlign: 'center', background: '#fef3c7', borderRadius: '8px'}}>
            ⚠️ {formData.vendor_name} does not use Standard Rates. Only 6 CFT and 10 CFT rates are applicable.
            <br />
            <small>Please switch to "6 CFT Rates" or "10 CFT Rates" tab above.</small>
          </div>
        </div>
      );
    }
    
    return (
      <div className="rate-matrix-container">
        <div className="matrix-header">
          <h3>{title}</h3>
          <div className="matrix-actions">
            <span className="matrix-note">* All rates are in ₹ per kg</span>
            <button className="copy-btn" onClick={copyRatesToClipboard} title="Copy to clipboard">
              📋 Copy
            </button>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="rate-matrix-table">
            <thead>
              <tr>
                <th className="from-zone-cell">From \\ To</th>
                {ZONES.map(zone => <th key={zone}>{zone}</th>)}
              </tr>
            </thead>
            <tbody>
              {ZONES.map(fromZone => {
                const rowRates = rates[fromZone] || {};
                return (
                  <tr key={fromZone}>
                    <td className="zone-cell from-zone">{fromZone}</td>
                    {ZONES.map(toZone => {
                      const rateValue = rowRates[toZone];
                      const displayValue = (rateValue !== undefined && rateValue !== null) ? rateValue : "";
                      return (
                        <td key={toZone}>
                          <input
                            type="number"
                            step="0.01"
                            className="rate-input"
                            value={displayValue}
                            onChange={(e) => handleRateChange(rateType, fromZone, toZone, e.target.value)}
                            placeholder="0.00"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderChargesSection = () => {
    const charges = formData.charges || {};
    const isRivigo = formData.vendor_name === "RIVIGO";
    const isPd = formData.vendor_name === "PD LOGISTICS";
    
    const hasCFTSupport = isRivigo || isPd;
    
    return (
      <div className="charges-section">
        <h3>📋 Additional Charges & Settings</h3>
        <div className="charges-grid">
          <div className="charge-card">
            <div className="charge-icon">📄</div>
            <div className="charge-field">
              <label>Docket Charge (₹)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.docket_charge || 0}
                onChange={(e) => handleChargeChange("docket_charge", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">⛽</div>
            <div className="charge-field">
              <label>Fuel Surcharge (%)</label>
              <input
                type="text"
                className="charge-input"
                value={charges.fsc || "10%"}
                onChange={(e) => handleChargeChange("fsc", e.target.value)}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">💰</div>
            <div className="charge-field">
              <label>GST (%)</label>
              <input
                type="text"
                className="charge-input"
                value={charges.gst || "18%"}
                onChange={(e) => handleChargeChange("gst", e.target.value)}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">📦</div>
            <div className="charge-field">
              <label>Minimum Freight (₹)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.min_freight || 350}
                onChange={(e) => handleChargeChange("min_freight", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">⚖️</div>
            <div className="charge-field">
              <label>Minimum Weight (kg)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.min_weight || 20}
                onChange={(e) => handleChargeChange("min_weight", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">🛡️</div>
            <div className="charge-field">
              <label>FOV/Insurance (₹)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.fov || 75}
                onChange={(e) => handleChargeChange("fov", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">🌍</div>
            <div className="charge-field">
              <label>ODA Charges (₹/kg)</label>
              <input
                type="number"
                step="0.01"
                className="charge-input"
                value={charges.oda_charge || 2}
                onChange={(e) => handleChargeChange("oda_charge", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">📐</div>
            <div className="charge-field">
              <label>Divisor (Volumetric)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.divisor || 5000}
                onChange={(e) => handleChargeChange("divisor", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">⚠️</div>
            <div className="charge-field">
              <label>ODA Min Charge (₹)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.oda_min_charge || DEFAULT_ODA_MIN_CHARGE}
                onChange={(e) => handleChargeChange("oda_min_charge", parseFloat(e.target.value))}
              />
              <small className="input-hint">Default: ₹{DEFAULT_ODA_MIN_CHARGE} (Blue Dart: ₹{BLUE_DART_ODA_MIN_CHARGE})</small>
            </div>
          </div>
        </div>
        
        {hasCFTSupport && (
          <div className="info-note">
            <span className="info-icon">📦</span>
            <span>This vendor supports 6 CFT and 10 CFT rate slabs only. Standard rates are NOT used.</span>
          </div>
        )}
      </div>
    );
  };

  const renderVendorCard = (vendor) => {
    const isDelhivery = vendor.vendor_name === "DELHIVERY";
    const has6CFT = vendor.delhivery_6cft && Object.keys(vendor.delhivery_6cft).length > 0;
    const has10CFT = vendor.delhivery_10cft && Object.keys(vendor.delhivery_10cft).length > 0;
    const isVxpress = vendor.vendor_name === "VXPRESS";
    const isShivaniVX = vendor.vendor_name === "SHIVANI VX";
    const isRivigo = vendor.vendor_name === "RIVIGO";
    const isBlueDart = vendor.vendor_name === "SHIPSHOPY BLUE DART";
    const isShipshopyDelivery = vendor.vendor_name === "SHIPSHOPY DELIVERY";
    const isPd = vendor.vendor_name === "PD LOGISTICS";
    const isTrucx = vendor.vendor_name?.includes('TRUCX');
    
    const showCFTBadges = isRivigo || isPd;
    const showCsvButton = isVxpress || isRivigo || isBlueDart || isShipshopyDelivery || isShivaniVX || isPd;
    const showInvoiceButton = true;
    
    const odaMinCharge = vendor.charges?.oda_min_charge || DEFAULT_ODA_MIN_CHARGE;
    const isBlueDartVendor = isBlueDart;
    const odaDisplay = isBlueDartVendor 
      ? `₹${vendor.charges?.oda_charge || 5}/kg (Min ₹${odaMinCharge})`
      : `₹${vendor.charges?.oda_charge || 2}/kg (Min ₹${odaMinCharge})`;
    
    return (
      <div className={`vendor-card ${!vendor.is_active ? 'inactive-card' : ''}`} key={vendor.id}>
        <div className="vendor-card-header">
          <div className="vendor-name-section">
            <div className={`vendor-icon ${!vendor.is_active ? 'inactive-icon' : ''}`}>
              {vendor.vendor_name.charAt(0)}
            </div>
            <h3>{vendor.vendor_name}</h3>
          </div>
          <div className="vendor-card-actions">
            <button className="edit-btn" onClick={() => handleEditVendor(vendor)} title="Edit Vendor">
              ✏️
            </button>
            {showInvoiceButton && (
              <button className="invoice-btn" onClick={() => openInvoiceModal(vendor)} title="Upload Invoice">
                📄
              </button>
            )}
            {showCsvButton && (
              <button className="csv-btn" onClick={() => openCsvModal(vendor)} title="Manage ODA Pincodes">
                📊
              </button>
            )}
            <button className="status-toggle-btn" onClick={() => handleToggleStatus(vendor)} title={vendor.is_active ? "Deactivate" : "Activate"}>
              {vendor.is_active ? "🔴" : "🟢"}
            </button>
            <button className="delete-btn" onClick={() => handleDeleteVendor(vendor)} title="Delete Vendor">
              🗑️
            </button>
          </div>
        </div>
        
        <div className="vendor-card-body">
          <div className="vendor-stats">
            <div className="stat">
              <span>Docket</span>
              <strong>₹{vendor.charges?.docket_charge || 100}</strong>
            </div>
            <div className="stat">
              <span>FSC</span>
              <strong>{vendor.charges?.fsc || "10%"}</strong>
            </div>
            <div className="stat">
              <span>GST</span>
              <strong>{vendor.charges?.gst || "18%"}</strong>
            </div>
            <div className="stat">
              <span>Min Freight</span>
              <strong>₹{vendor.charges?.min_freight || 350}</strong>
            </div>
            <div className="stat">
              <span>ODA</span>
              <strong>{odaDisplay}</strong>
            </div>
          </div>
          
          <div className="vendor-badges">
            {isDelhivery && <span className="badge delhivery-badge">🚚 Delhivery Partner</span>}
            {showCFTBadges && has6CFT && <span className="badge cft-badge">📦 6 CFT Support</span>}
            {showCFTBadges && has10CFT && <span className="badge cft-badge">📦 10 CFT Support</span>}
            {isPd && <span className="badge pd-badge">📦 Only CFT Rates (No Standard)</span>}
            {isRivigo && <span className="badge rivigo-badge">📦 CFT + Standard</span>}
            {isVxpress && <span className="badge vxpress-badge">⭐ V-Xpress ODA Ready</span>}
            {isShivaniVX && <span className="badge shivani-badge">🟣 Shivani VX</span>}
            {isBlueDart && <span className="badge bluedart-badge">🔵 Shipshopy Blue Dart</span>}
            {isShipshopyDelivery && <span className="badge delhivery-badge">📦 Shipshopy Delhivery</span>}
            {isTrucx && <span className="badge trucx-badge">🚛 TRUCX DLH</span>}
          </div>
          
          <div className="vendor-status">
            <span className={`status-badge ${vendor.is_active ? "active" : "inactive"}`}>
              {vendor.is_active ? "● Active" : "○ Inactive"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;
    
    const showCFTTabs = CFT_SUPPORTED_VENDORS.includes(formData.vendor_name);
    
    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{editMode ? `✏️ Edit ${formData.vendor_name} Rates` : "➕ Add New Vendor"}</h2>
            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
          </div>
          
          <div className="modal-body">
            {!editMode && (
              <div className="form-group">
                <label>Vendor Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({...formData, vendor_name: e.target.value.toUpperCase()})}
                  placeholder="Enter vendor name (e.g., DELHIVERY, SHIPSHOPY BLUE DART, TRUCX DLH Lite, SHIVANI VX)"
                />
              </div>
            )}
            
            <div className="tabs">
              <button className={`tab ${activeTab === "standard" ? "active" : ""}`} onClick={() => setActiveTab("standard")}>
                📊 Standard Rates
              </button>
              {showCFTTabs && (
                <>
                  <button className={`tab ${activeTab === "6cft" ? "active" : ""}`} onClick={() => setActiveTab("6cft")}>
                    📦 6 CFT Rates
                  </button>
                  <button className={`tab ${activeTab === "10cft" ? "active" : ""}`} onClick={() => setActiveTab("10cft")}>
                    📦 10 CFT Rates
                  </button>
                </>
              )}
              <button className={`tab ${activeTab === "charges" ? "active" : ""}`} onClick={() => setActiveTab("charges")}>
                ⚙️ Charges
              </button>
            </div>
            
            <div className="tab-content">
              {activeTab === "standard" && renderRateMatrix("rates", "Zone to Zone Rates (₹/kg)")}
              {activeTab === "6cft" && renderRateMatrix("delhivery_6cft", "6 CFT Rates (₹/kg)")}
              {activeTab === "10cft" && renderRateMatrix("delhivery_10cft", "10 CFT Rates (₹/kg)")}
              {activeTab === "charges" && renderChargesSection()}
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="save-btn" onClick={handleSave} disabled={saveLoading}>
              {saveLoading ? "💾 Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="vendor-manage-page">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="page-header">
        <div className="header-content">
          <h1>🚚 Vendor Rate Management</h1>
          <p>Manage zone-to-zone rates, CFT rates, ODA charges, and upload invoices for all logistics vendors</p>
        </div>
        <button className="add-vendor-btn" onClick={handleAddVendor}>
          + Add New Vendor
        </button>
      </div>
      
      <div className="stats-container">
        <div className="stat-card total">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Vendors</p>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{stats.active}</h3>
            <p>Active Vendors</p>
          </div>
        </div>
        <div className="stat-card inactive">
          <div className="stat-icon">⏸️</div>
          <div className="stat-info">
            <h3>{stats.inactive}</h3>
            <p>Inactive Vendors</p>
          </div>
        </div>
      </div>
      
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-info">
          <span>Showing {filteredVendors.length} of {vendors.length} vendors</span>
        </div>
        <button className="refresh-btn" onClick={fetchVendors} title="Refresh">
          🔄
        </button>
      </div>
      
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading vendor rates...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={fetchVendors}>Retry</button>
        </div>
      ) : (
        <div className="vendors-grid">
          {filteredVendors.length === 0 ? (
            <div className="no-results">
              <p>No vendors found matching "{searchTerm}"</p>
            </div>
          ) : (
            filteredVendors.map(vendor => renderVendorCard(vendor))
          )}
        </div>
      )}
      
      {renderModal()}
      {renderCsvModal()}
      {renderInvoiceModal()}
    </div>
  );
}

export default VendorManage;