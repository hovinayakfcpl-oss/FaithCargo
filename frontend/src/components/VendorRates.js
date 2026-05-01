import React, { useState, useEffect, useCallback, useRef } from "react";
import "./VendorRateCalculator.css";

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://faithcargo.onrender.com";

// ============================================
// CLIENT ZONE MAPPING (Based on your image)
// ============================================

// Client zones as per your requirement
const CLIENT_ZONES = [
  "Delhi NCR", "NORTH 2", "NORTH 3", "Central", "W1", "W2", "East", "South", "NE1", "NE2", "NE3"
];

// Get client zone from pincode based on your region mapping
const getClientZoneFromPincode = (pincode) => {
  const pincodeStr = String(pincode).trim();
  
  // Delhi NCR - New Delhi, Gurgaon, Noida, Ghaziabad, Faridabad
  if (pincodeStr.startsWith('110') || pincodeStr.startsWith('122') ||
      pincodeStr.startsWith('201') || pincodeStr === '110001' || pincodeStr === '110002' ||
      pincodeStr === '110003' || pincodeStr === '122001' || pincodeStr === '122002' ||
      pincodeStr === '122003' || pincodeStr === '201301' || pincodeStr === '201302' ||
      pincodeStr === '201303' || pincodeStr === '201304' || pincodeStr === '201305') {
    return 'Delhi NCR';
  }
  
  // NORTH 3 - Srinagar specific
  const srinagarPincodes = ['190001', '190002', '190003', '190004', '190005', '190006', 
                           '190007', '190008', '190009', '190010', '190011', '190012', 
                           '190013', '190014', '190015'];
  if (srinagarPincodes.includes(pincodeStr)) {
    return 'NORTH 3';
  }
  
  // Central - Madhya Pradesh & Chhattisgarh
  if (pincodeStr.startsWith('45') || pincodeStr.startsWith('46') || pincodeStr.startsWith('47') ||
      pincodeStr.startsWith('48') || pincodeStr.startsWith('49')) {
    return 'Central';
  }
  
  // W1 - Gujarat & Daman & Diu
  if (pincodeStr.startsWith('36') || pincodeStr.startsWith('37') || pincodeStr.startsWith('38') ||
      pincodeStr.startsWith('39') || pincodeStr.startsWith('396') || pincodeStr.startsWith('362')) {
    return 'W1';
  }
  
  // W2 - Maharashtra & Goa
  if (pincodeStr.startsWith('40') || pincodeStr.startsWith('41') || pincodeStr.startsWith('42') ||
      pincodeStr.startsWith('43') || pincodeStr.startsWith('44') || pincodeStr.startsWith('403')) {
    return 'W2';
  }
  
  // South - Karnataka, AP, Pondicherry, Kerala, Tamil Nadu
  if (pincodeStr.startsWith('50') || pincodeStr.startsWith('51') || pincodeStr.startsWith('52') ||
      pincodeStr.startsWith('53') || pincodeStr.startsWith('54') || pincodeStr.startsWith('55') ||
      pincodeStr.startsWith('56') || pincodeStr.startsWith('57') || pincodeStr.startsWith('58') ||
      pincodeStr.startsWith('59') || pincodeStr.startsWith('60') || pincodeStr.startsWith('61') ||
      pincodeStr.startsWith('62') || pincodeStr.startsWith('63') || pincodeStr.startsWith('64') ||
      pincodeStr.startsWith('65') || pincodeStr.startsWith('66') || pincodeStr.startsWith('67') ||
      pincodeStr.startsWith('68') || pincodeStr.startsWith('69')) {
    return 'South';
  }
  
  // Northeast Zones
  if (pincodeStr.startsWith('78') || pincodeStr.startsWith('79')) {
    // NE1 - Guwahati, Sikkim
    if (pincodeStr.startsWith('781') || pincodeStr.startsWith('737')) {
      return 'NE1';
    }
    // NE2 - Assam (other), Manipur, Meghalaya, Tripura, Arunachal
    if (pincodeStr.startsWith('782') || pincodeStr.startsWith('783') || pincodeStr.startsWith('784') ||
        pincodeStr.startsWith('785') || pincodeStr.startsWith('786') || pincodeStr.startsWith('787') ||
        pincodeStr.startsWith('788') || pincodeStr.startsWith('789')) {
      return 'NE2';
    }
    // NE3 - Mizoram, Nagaland
    if (pincodeStr.startsWith('796') || pincodeStr.startsWith('797') || pincodeStr.startsWith('798')) {
      return 'NE3';
    }
  }
  
  // East - West Bengal, Orissa, Bihar, Jharkhand
  if (pincodeStr.startsWith('70') || pincodeStr.startsWith('71') || pincodeStr.startsWith('72') ||
      pincodeStr.startsWith('73') || pincodeStr.startsWith('74') || pincodeStr.startsWith('75') ||
      pincodeStr.startsWith('76') || pincodeStr.startsWith('77') || pincodeStr.startsWith('80') ||
      pincodeStr.startsWith('81') || pincodeStr.startsWith('82') || pincodeStr.startsWith('83')) {
    return 'East';
  }
  
  // Default NORTH 2 - Punjab, Rajasthan, Uttaranchal, Haryana (excluding NCR), UP (excluding NCR), J&K, HP
  return 'NORTH 2';
};

// ============================================
// VENDOR-SPECIFIC ZONE MAPPING (Client Zone → Vendor Zone)
// UPDATED: VXPRESS and SHIVANI VX now use standard database zone names
// ============================================

const getVendorZoneFromClientZone = (clientZone, vendorName) => {
  const vendorUpper = vendorName.toUpperCase();
  
  // GATI (12 zones: N1,N2,N3, C1, W1,W2, E1, S1, NE1,NE2)
  if (vendorUpper.includes('GATI')) {
    const mapping = {
      'Delhi NCR': 'N1',
      'NORTH 2': 'N2',
      'NORTH 3': 'N3',
      'Central': 'C1',
      'W1': 'W1',
      'W2': 'W2',
      'East': 'E1',
      'South': 'S1',
      'NE1': 'NE1',
      'NE2': 'NE2',
      'NE3': 'E1'
    };
    return mapping[clientZone] || 'N1';
  }
  
  // PD LOGISTICS (17 zones - supports all NE)
  if (vendorUpper.includes('PD LOGISTICS')) {
    const mapping = {
      'Delhi NCR': 'N1',
      'NORTH 2': 'N2',
      'NORTH 3': 'N3',
      'Central': 'C1',
      'W1': 'W1',
      'W2': 'W2',
      'East': 'E1',
      'South': 'S1',
      'NE1': 'NE1',
      'NE2': 'NE2',
      'NE3': 'NE3'
    };
    return mapping[clientZone] || 'N1';
  }
  
  // RIVIGO (12 zones)
  if (vendorUpper.includes('RIVIGO')) {
    const mapping = {
      'Delhi NCR': 'N1',
      'NORTH 2': 'N2',
      'NORTH 3': 'N3',
      'Central': 'C1',
      'W1': 'W1',
      'W2': 'W2',
      'East': 'E1',
      'South': 'S1',
      'NE1': 'NE1',
      'NE2': 'NE2',
      'NE3': 'NE2'
    };
    return mapping[clientZone] || 'N1';
  }
  
  // TRUCX DLH Lite (11 zones)
  if (vendorUpper.includes('TRUCX DLH LITE')) {
    const mapping = {
      'Delhi NCR': 'N1',
      'NORTH 2': 'N2',
      'NORTH 3': 'N3',
      'Central': 'C1',
      'W1': 'W1',
      'W2': 'W2',
      'East': 'E1',
      'South': 'S1',
      'NE1': 'NE1',
      'NE2': 'NE2',
      'NE3': 'NE2'
    };
    return mapping[clientZone] || 'N1';
  }
  
  // TRUCX DLH Dense / Cargo (16 zones)
  if (vendorUpper.includes('TRUCX DLH DENSE') || vendorUpper.includes('TRUCX DLH CARGO')) {
    const mapping = {
      'Delhi NCR': 'N1',
      'NORTH 2': 'N2',
      'NORTH 3': 'N3',
      'Central': 'C1',
      'W1': 'W1',
      'W2': 'W2',
      'East': 'E1',
      'South': 'S1',
      'NE1': 'NE1',
      'NE2': 'NE2',
      'NE3': 'NE3'
    };
    return mapping[clientZone] || 'N1';
  }
  
  // VXPRESS - NOW USING STANDARD DATABASE ZONE NAMES (N1, N2, N3, C1, W1, W2, S1, S2, E1, NE1)
  if (vendorUpper.includes('VXPRESS')) {
    const mapping = {
      'Delhi NCR': 'N1',
      'NORTH 2': 'N2',
      'NORTH 3': 'N3',
      'Central': 'C1',
      'W1': 'W1',
      'W2': 'W2',
      'East': 'E1',
      'South': 'S1',
      'NE1': 'NE1',
      'NE2': 'NE1',
      'NE3': 'NE1'
    };
    return mapping[clientZone] || 'N1';
  }
  
  // SHIVANI VX - NOW USING STANDARD DATABASE ZONE NAMES (N1, N2, N3, C1, C2, W1, W2, S1, S2, E1, E2, NE1, NE2)
  if (vendorUpper.includes('SHIVANI VX')) {
    const mapping = {
      'Delhi NCR': 'N1',
      'NORTH 2': 'N2',
      'NORTH 3': 'N3',
      'Central': 'C1',
      'W1': 'W1',
      'W2': 'W2',
      'East': 'E1',
      'South': 'S1',
      'NE1': 'NE1',
      'NE2': 'NE2',
      'NE3': 'NE2'
    };
    return mapping[clientZone] || 'N1';
  }
  
  // SHIPSHOPY BLUE DART (16 zones)
  if (vendorUpper.includes('SHIPSHOPY BLUE DART')) {
    const mapping = {
      'Delhi NCR': 'N1',
      'NORTH 2': 'N2',
      'NORTH 3': 'N3',
      'Central': 'C1',
      'W1': 'W1',
      'W2': 'W2',
      'East': 'E1',
      'South': 'S1',
      'NE1': 'NE1',
      'NE2': 'NE2',
      'NE3': 'NE3'
    };
    return mapping[clientZone] || 'N1';
  }
  
  // SHIPSHOPY DELIVERY (16 zones)
  if (vendorUpper.includes('SHIPSHOPY DELIVERY')) {
    const mapping = {
      'Delhi NCR': 'N1',
      'NORTH 2': 'N2',
      'NORTH 3': 'N3',
      'Central': 'C1',
      'W1': 'W1',
      'W2': 'W2',
      'East': 'E1',
      'South': 'S1',
      'NE1': 'NE1',
      'NE2': 'NE2',
      'NE3': 'NE3'
    };
    return mapping[clientZone] || 'N1';
  }
  
  // DELHIVERY (Standard zones)
  if (vendorUpper.includes('DELHIVERY')) {
    const mapping = {
      'Delhi NCR': 'N1',
      'NORTH 2': 'N2',
      'NORTH 3': 'N3',
      'Central': 'C1',
      'W1': 'W1',
      'W2': 'W2',
      'East': 'E1',
      'South': 'S1',
      'NE1': 'E1',
      'NE2': 'E1',
      'NE3': 'E1'
    };
    return mapping[clientZone] || 'N1';
  }
  
  // Default mapping for any other vendor
  const defaultMapping = {
    'Delhi NCR': 'N1',
    'NORTH 2': 'N2',
    'NORTH 3': 'N3',
    'Central': 'C1',
    'W1': 'W1',
    'W2': 'W2',
    'East': 'E1',
    'South': 'S1',
    'NE1': 'NE1',
    'NE2': 'NE2',
    'NE3': 'NE3'
  };
  return defaultMapping[clientZone] || 'N1';
};

// Main function to get vendor-specific zone from pincode
const getVendorZoneFromPincode = (pincode, vendorName) => {
  const clientZone = getClientZoneFromPincode(pincode);
  const vendorZone = getVendorZoneFromClientZone(clientZone, vendorName);
  console.log(`📍 Pincode ${pincode} → Client Zone: ${clientZone} → ${vendorName} Zone: ${vendorZone}`);
  return { clientZone, vendorZone };
};

// ============================================
// VENDOR-SPECIFIC ZONE LISTS
// UPDATED: VXPRESS and SHIVANI VX now use standard database zone names
// ============================================

// TRUCX DLH Lite - 11 zones
const ZONES_TRUCX_LITE = ["N1", "N2", "N3", "C1", "W1", "W2", "S1", "S2", "E1", "NE1", "NE2"];

// TRUCX DLH Dense & Cargo - 16 zones
const ZONES_TRUCX_16 = ["N1", "N2", "N3", "N4", "C1", "C2", "W1", "W2", "S1", "S2", "S3", "S4", "E1", "E2", "NE1", "NE2"];

// RIVIGO - 12 zones (includes W3)
const ZONES_RIVIGO = ["N1", "N2", "N3", "C1", "W1", "W2", "W3", "S1", "S2", "E1", "NE1", "NE2"];

// GATI - 12 zones (includes NE3)
const ZONES_GATI = ["N1", "N2", "N3", "C1", "W1", "W2", "S1", "S2", "E1", "NE1", "NE2", "NE3"];

// VXPRESS - NOW USING STANDARD DATABASE ZONE NAMES (10 zones)
// Database stores rates with these zone names: N1, N2, N3, C1, W1, W2, S1, S2, E1, NE1
const ZONES_VXPRESS = ["N1", "N2", "N3", "C1", "W1", "W2", "S1", "S2", "E1", "NE1"];

// SHIVANI VX - NOW USING STANDARD DATABASE ZONE NAMES (13 zones)
// Database stores rates with these zone names: N1, N2, N3, C1, C2, W1, W2, S1, S2, E1, E2, NE1, NE2
const ZONES_SHIVANI_VX = ["N1", "N2", "N3", "C1", "C2", "W1", "W2", "S1", "S2", "E1", "E2", "NE1", "NE2"];

// SHIPSHOPY BLUE DART & DELIVERY - 16 zones
const ZONES_SHIPSHOPY = ZONES_TRUCX_16;

// PD LOGISTICS - No standard zones (only CFT)
const ZONES_PD_LOGISTICS = [];

// DELHIVERY - 16 zones (default)
const ZONES_DEFAULT = ZONES_TRUCX_16;

// Get zones for a specific vendor
const getZonesForVendor = (vendorName) => {
  if (vendorName === "TRUCX DLH Lite") return ZONES_TRUCX_LITE;
  if (vendorName === "TRUCX DLH Dense" || vendorName === "TRUCX DLH Cargo") return ZONES_TRUCX_16;
  if (vendorName === "RIVIGO") return ZONES_RIVIGO;
  if (vendorName === "GATI") return ZONES_GATI;
  if (vendorName === "VXPRESS") return ZONES_VXPRESS;
  if (vendorName === "SHIVANI VX") return ZONES_SHIVANI_VX;
  if (vendorName === "PD LOGISTICS") return ZONES_PD_LOGISTICS;
  if (vendorName === "SHIPSHOPY BLUE DART" || vendorName === "SHIPSHOPY DELIVERY") return ZONES_SHIPSHOPY;
  return ZONES_DEFAULT;
};

// ODA Categories
const ODA_CATEGORIES = {
  'A': { rate: 2, min: 500, name: 'ODA A (₹2/kg, Min ₹500)', color: '#10b981' },
  'B': { rate: 4, min: 500, name: 'ODA B (₹4/kg, Min ₹500)', color: '#f59e0b' },
  'C': { rate: 7, min: 500, name: 'ODA C (₹7/kg, Min ₹500)', color: '#ef4444' },
  'D': { rate: 10, min: 500, name: 'ODA D (₹10/kg, Min ₹500)', color: '#8b5cf6' },
  'DEFAULT': { rate: 4, min: 500, name: 'ODA Default (₹4/kg, Min ₹500)', color: '#6b7280' }
};

// CFT vendors
const PD_LOGISTICS = "PD LOGISTICS";
const RIVIGO = "RIVIGO";

// TRUCX vendors
const TRUCX_VENDORS = ["TRUCX DLH Lite", "TRUCX DLH Dense", "TRUCX DLH Cargo"];

// Volumetric constants
const VOLUMETRIC_DIVISOR = {
  'STANDARD': 5000,
  '6CFT': 4500,
  '10CFT': 10000
};

// Vendor pincode source mapping
const VENDOR_PINCODE_SOURCE = {
  "SHIPSHOPY DELIVERY": "PD LOGISTICS",
  "TRUCX DLH Lite": "PD LOGISTICS",
  "TRUCX DLH Dense": "PD LOGISTICS",
  "TRUCX DLH Cargo": "PD LOGISTICS",
  "SHIVANI VX": "VXPRESS"
};

function VendorRateCalculator() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState("Prepaid");
  const [weight, setWeight] = useState("");
  const [invoiceValue, setInvoiceValue] = useState("");
  const [dimensions, setDimensions] = useState([{ qty: 1, length: "", width: "", height: "" }]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [showAllVendors, setShowAllVendors] = useState(true);
  const [calculationDetails, setCalculationDetails] = useState(null);
  const [originLocation, setOriginLocation] = useState("");
  const [destLocation, setDestLocation] = useState("");
  const [pincodeCache, setPincodeCache] = useState({});
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [chargedWeight, setChargedWeight] = useState(0);
  const [originClientZone, setOriginClientZone] = useState("");
  const [destClientZone, setDestClientZone] = useState("");
  const [originVendorZones, setOriginVendorZones] = useState({});
  const [destVendorZones, setDestVendorZones] = useState({});
  const [volumeCFT, setVolumeCFT] = useState(0);
  
  const abortControllerRef = useRef(null);

  const addDimension = () => {
    setDimensions([...dimensions, { qty: 1, length: "", width: "", height: "" }]);
  };

  const removeDimension = (index) => {
    const newDims = dimensions.filter((_, i) => i !== index);
    setDimensions(newDims);
  };

  const updateDimension = (index, field, value) => {
    const newDims = [...dimensions];
    newDims[index][field] = value;
    setDimensions(newDims);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (pickup && pickup.length === 6) {
      fetchPincodeLocation(pickup, "origin");
      const { clientZone } = getVendorZoneFromPincode(pickup, "STANDARD");
      setOriginClientZone(clientZone);
    }
    if (destination && destination.length === 6) {
      fetchPincodeLocation(destination, "dest");
      const { clientZone } = getVendorZoneFromPincode(destination, "STANDARD");
      setDestClientZone(clientZone);
    }
  }, [pickup, destination]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/`);
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Fetched vendors from DB:", data.map(v => ({ 
          name: v.vendor_name, 
          ratesCount: Object.keys(v.rates || {}).length,
          cft6Count: Object.keys(v.delhivery_6cft || {}).length,
          cft10Count: Object.keys(v.delhivery_10cft || {}).length
        })));
        setVendors(data);
        setSelectedVendors(data.map(v => v.vendor_name));
      } else {
        console.error("❌ API failed with status:", response.status);
        setVendors([]);
        setSelectedVendors([]);
      }
    } catch (err) {
      console.error("❌ Error fetching vendors:", err);
      setVendors([]);
      setSelectedVendors([]);
    }
  };

  const fetchPincodeLocation = async (pincode, type) => {
    if (!pincode || pincode.length !== 6) return;
    
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      if (data?.[0]?.Status === "Success") {
        const postOffice = data[0].PostOffice[0];
        const location = `${postOffice.District}, ${postOffice.State}`;
        if (type === "origin") {
          setOriginLocation(location);
        } else {
          setDestLocation(location);
        }
      }
    } catch (err) {
      console.error("Error fetching location:", err);
    }
  };

  const isValidPincode = (pincode) => {
    return pincode && pincode.length === 6 && /^\d+$/.test(pincode);
  };

  const calculateVolumetricWeight = useCallback((cftType = 'STANDARD', vendorDivisor = null) => {
    let totalVolKg = 0;
    let totalVolCFT = 0;
    
    let divisor = VOLUMETRIC_DIVISOR[cftType] || VOLUMETRIC_DIVISOR.STANDARD;
    if (vendorDivisor && vendorDivisor > 0) {
      divisor = vendorDivisor;
    }
    
    dimensions.forEach((dim) => {
      const qty = Number(dim.qty) || 0;
      const l = Number(dim.length) || 0;
      const w = Number(dim.width) || 0;
      const h = Number(dim.height) || 0;
      
      if (l > 0 && w > 0 && h > 0 && qty > 0) {
        const volumeCm3 = l * w * h * qty;
        totalVolKg += volumeCm3 / divisor;
        totalVolCFT += volumeCm3 / (30.48 * 30.48 * 30.48);
      }
    });
    
    return { volumetricWeight: totalVolKg, volumeCFT: totalVolCFT };
  }, [dimensions]);

  const checkPincodeForVendor = useCallback(async (vendor, pincode) => {
    let sourceVendorName = vendor.vendor_name;
    if (VENDOR_PINCODE_SOURCE[vendor.vendor_name]) {
      sourceVendorName = VENDOR_PINCODE_SOURCE[vendor.vendor_name];
    }
    
    const cacheKey = `${sourceVendorName}_${pincode}`;
    
    if (pincodeCache[cacheKey]) {
      return pincodeCache[cacheKey];
    }
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/vendors/check-oda/${encodeURIComponent(sourceVendorName)}/${pincode}/`,
        { signal: abortControllerRef.current?.signal }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        let result;
        
        if (vendor.vendor_name === "SHIPSHOPY BLUE DART") {
          result = {
            isServiceable: data.is_serviceable === true,
            isODA: false,
            charge: 0,
            minCharge: 0,
            category: null
          };
        } else {
          const isODA = data.is_oda === true;
          result = {
            isServiceable: data.is_serviceable !== false,
            isODA: isODA,
            charge: isODA ? (parseFloat(data.oda_charge_per_kg) || 0) : 0,
            minCharge: isODA ? (parseFloat(data.oda_min_charge) || 500) : 0,
            category: isODA ? (data.oda_category || null) : null
          };
        }
        
        setPincodeCache(prev => ({ ...prev, [cacheKey]: result }));
        return result;
      }
    } catch (err) {
      if (err.name === 'AbortError') return null;
      console.error(`Error checking pincode for ${vendor.vendor_name}:`, err);
    }
    
    if (vendor.vendor_name === "SHIPSHOPY BLUE DART") {
      return { isServiceable: false, isODA: false, charge: 0, minCharge: 0, category: null };
    }
    return { isServiceable: true, isODA: false, charge: 0, minCharge: 0, category: null };
  }, [pincodeCache]);

  // Get rate from vendor based on vendor type and its specific zones
  const getRateFromVendor = useCallback((vendor, fromZone, toZone, cftType) => {
    let rate = 0;
    const vendorName = vendor.vendor_name;
    
    console.log(`🔍 Getting rate for ${vendorName}, ${cftType}, ${fromZone}→${toZone}`);
    
    // Get vendor-specific zones for validation
    const vendorZones = getZonesForVendor(vendorName);
    
    // Check if zones are valid for this vendor
    if (vendorZones.length > 0 && (!vendorZones.includes(fromZone) || !vendorZones.includes(toZone))) {
      console.log(`⚠️ Zone mismatch for ${vendorName}: ${fromZone}→${toZone} not in vendor zones`);
      return 0;
    }
    
    // PD LOGISTICS - ONLY CFT rates (6CFT and 10CFT)
    if (vendorName === PD_LOGISTICS) {
      if (cftType === "6CFT" && vendor.delhivery_6cft) {
        rate = vendor.delhivery_6cft[fromZone]?.[toZone] || 0;
      } 
      else if (cftType === "10CFT" && vendor.delhivery_10cft) {
        rate = vendor.delhivery_10cft[fromZone]?.[toZone] || 0;
      }
      else {
        return 0;
      }
    }
    // RIVIGO - Has both CFT and Standard rates
    else if (vendorName === RIVIGO) {
      if (cftType === "6CFT" && vendor.delhivery_6cft) {
        rate = vendor.delhivery_6cft[fromZone]?.[toZone] || 0;
      } 
      else if (cftType === "10CFT" && vendor.delhivery_10cft) {
        rate = vendor.delhivery_10cft[fromZone]?.[toZone] || 0;
      }
      else {
        rate = vendor.rates[fromZone]?.[toZone] || 0;
      }
    }
    // TRUCX vendors - standard rates only
    else if (TRUCX_VENDORS.includes(vendorName)) {
      rate = vendor.rates[fromZone]?.[toZone] || 0;
    }
    // All other vendors (including VXPRESS and SHIVANI VX now) - standard rates only
    else {
      rate = vendor.rates[fromZone]?.[toZone] || 0;
    }
    
    return rate;
  }, []);

  const calculateRateForVendor = useCallback((vendor, fromZone, toZone, weight, finalODACharge, cftSize, pincodeInfo) => {
    const vendorName = vendor.vendor_name;
    const charges = vendor.charges || {};
    
    // Get rate from vendor's rate matrix
    let ratePerKg = getRateFromVendor(vendor, fromZone, toZone, cftSize);
    
    // Skip if no rate found
    if (ratePerKg === 0) {
      console.log(`⏭️ Skipping ${vendorName} ${cftSize} - no rate found`);
      return null;
    }
    
    const docketCharge = parseFloat(charges.docket_charge) || 100;
    const fscPercent = parseFloat(String(charges.fsc || "10%").replace("%", "")) || 10;
    const gstPercent = parseFloat(String(charges.gst || "18%").replace("%", "")) || 18;
    const minFreight = parseFloat(charges.min_freight) || 350;
    const minWeight = parseFloat(charges.min_weight) || 20;
    
    let effectiveWeight = Math.max(weight, minWeight);
    
    const isPD = vendorName === PD_LOGISTICS;
    const isRIVIGO = vendorName === RIVIGO;
    
    if (isPD && cftSize === "6CFT") {
      const { volumetricWeight } = calculateVolumetricWeight('6CFT');
      effectiveWeight = Math.max(effectiveWeight, volumetricWeight);
    } else if (isPD && cftSize === "10CFT") {
      const { volumetricWeight } = calculateVolumetricWeight('10CFT');
      effectiveWeight = Math.max(effectiveWeight, volumetricWeight);
    } else if (isRIVIGO && cftSize === "6CFT") {
      const { volumetricWeight } = calculateVolumetricWeight('6CFT');
      effectiveWeight = Math.max(effectiveWeight, volumetricWeight);
    } else if (isRIVIGO && cftSize === "10CFT") {
      const { volumetricWeight } = calculateVolumetricWeight('10CFT');
      effectiveWeight = Math.max(effectiveWeight, volumetricWeight);
    } else {
      const divisor = charges.divisor || 5000;
      const { volumetricWeight } = calculateVolumetricWeight('STANDARD', divisor);
      effectiveWeight = Math.max(effectiveWeight, volumetricWeight);
    }
    
    const baseFreight = effectiveWeight * ratePerKg;
    const fscAmount = baseFreight * (fscPercent / 100);
    const gstAmount = (baseFreight + fscAmount + docketCharge + finalODACharge) * (gstPercent / 100);
    
    let modeCharge = 0;
    if (mode === "COD") modeCharge = 125;
    if (mode === "ToPay") modeCharge = 200;
    
    let fovCharge = 0;
    if (invoiceValue && invoiceValue > 0) {
      fovCharge = Math.max(invoiceValue * 0.001, 100);
    }
    
    let totalFreight = baseFreight + fscAmount + docketCharge + gstAmount + modeCharge + fovCharge + finalODACharge;
    totalFreight = Math.max(totalFreight, minFreight);
    
    console.log(`✅ ${vendorName} ${cftSize}: Rate=${ratePerKg}, ODA=${finalODACharge}, Total=${totalFreight.toFixed(2)}`);
    
    return {
      vendor_name: vendorName,
      rate_per_kg: ratePerKg,
      cft_type: (isPD || isRIVIGO) && cftSize !== "Standard" ? cftSize : null,
      effective_weight: effectiveWeight,
      base_freight: baseFreight,
      docket_charge: docketCharge,
      fsc_percent: fscPercent,
      fsc_amount: fscAmount,
      gst_percent: gstPercent,
      gst_amount: gstAmount,
      mode_charge: modeCharge,
      fov_charge: fovCharge,
      oda_charge: finalODACharge,
      oda_applicable: pincodeInfo?.isODA === true && pincodeInfo.charge > 0,
      oda_category: pincodeInfo?.category,
      oda_rate_per_kg: pincodeInfo?.charge || 0,
      oda_min_charge: pincodeInfo?.minCharge || 500,
      min_freight: minFreight,
      total_freight: totalFreight
    };
  }, [mode, invoiceValue, calculateVolumetricWeight, getRateFromVendor]);

  const handleCalculate = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (!pickup || !destination || !weight) {
      alert("❌ Please fill mandatory fields: Origin, Destination, and Weight!");
      return;
    }

    if (!isValidPincode(pickup)) {
      alert("❌ Please enter a valid 6-digit origin pincode!");
      return;
    }

    if (!isValidPincode(destination)) {
      alert("❌ Please enter a valid 6-digit destination pincode!");
      return;
    }

    if (parseFloat(weight) <= 0) {
      alert("❌ Weight must be greater than 0!");
      return;
    }

    if (isCalculating) return;
    
    setIsCalculating(true);
    setLoading(true);
    
    abortControllerRef.current = new AbortController();
    
    try {
      if (vendors.length === 0) {
        console.error("❌ No vendors loaded from DB");
        alert("No vendors found. Please check API connection.");
        setLoading(false);
        setIsCalculating(false);
        return;
      }
      
      const activeVendors = vendors.filter(v => 
        (showAllVendors || selectedVendors.includes(v.vendor_name)) && v.is_active !== false
      );
      
      const calculatedResults = [];
      const actualWeight = parseFloat(weight);
      
      const pincodePromises = activeVendors.map(vendor => checkPincodeForVendor(vendor, destination));
      const pincodeResults = await Promise.all(pincodePromises);
      
      for (let i = 0; i < activeVendors.length; i++) {
        const vendor = activeVendors[i];
        const vendorName = vendor.vendor_name;
        const pincodeInfo = pincodeResults[i];
        
        if (!pincodeInfo || pincodeInfo.isServiceable === false) {
          console.log(`⏭️ ${vendorName} not serviceable for ${destination}`);
          continue;
        }
        
        let finalODACharge = 0;
        if (pincodeInfo.isODA === true && pincodeInfo.charge > 0) {
          const calculatedODA = actualWeight * pincodeInfo.charge;
          finalODACharge = Math.max(calculatedODA, pincodeInfo.minCharge || 500);
          console.log(`🔥 ODA APPLIED for ${vendorName}: ₹${finalODACharge}`);
        }
        
        // Get vendor-specific zones using the mapping function
        const { vendorZone: fromZone } = getVendorZoneFromPincode(pickup, vendorName);
        const { vendorZone: toZone } = getVendorZoneFromPincode(destination, vendorName);
        
        console.log(`📍 ${vendorName}: ${pickup}(${fromZone}) → ${destination}(${toZone})`);
        
        // PD LOGISTICS - ONLY 6CFT and 10CFT
        if (vendorName === PD_LOGISTICS) {
          const rate6CFT = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "6CFT", pincodeInfo);
          if (rate6CFT && rate6CFT.rate_per_kg > 0) {
            calculatedResults.push(rate6CFT);
          }
          
          const rate10CFT = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "10CFT", pincodeInfo);
          if (rate10CFT && rate10CFT.rate_per_kg > 0) {
            calculatedResults.push(rate10CFT);
          }
        } 
        // RIVIGO - Has both CFT and Standard
        else if (vendorName === RIVIGO) {
          const rate6CFT = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "6CFT", pincodeInfo);
          if (rate6CFT && rate6CFT.rate_per_kg > 0) {
            calculatedResults.push(rate6CFT);
          }
          
          const rate10CFT = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "10CFT", pincodeInfo);
          if (rate10CFT && rate10CFT.rate_per_kg > 0) {
            calculatedResults.push(rate10CFT);
          }
          
          const rateStandard = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "Standard", pincodeInfo);
          if (rateStandard && rateStandard.rate_per_kg > 0) {
            calculatedResults.push(rateStandard);
          }
        }
        // Other vendors (including VXPRESS and SHIVANI VX) - Standard rates only
        else {
          const rate = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "Standard", pincodeInfo);
          if (rate && rate.rate_per_kg > 0) {
            calculatedResults.push(rate);
          }
        }
      }
      
      calculatedResults.sort((a, b) => a.total_freight - b.total_freight);
      
      const { volumeCFT: totalVolumeCFT } = calculateVolumetricWeight('STANDARD');
      setVolumeCFT(totalVolumeCFT);
      
      setResults(calculatedResults);
      setCalculationDetails({
        from_pincode: pickup,
        to_pincode: destination,
        from_client_zone: originClientZone,
        to_client_zone: destClientZone,
        volume_cft: totalVolumeCFT
      });
      
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error("Calculation error:", error);
      alert("An error occurred while calculating rates. Please try again.");
    } finally {
      setLoading(false);
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    setPickup("");
    setDestination("");
    setMode("Prepaid");
    setWeight("");
    setInvoiceValue("");
    setDimensions([{ qty: 1, length: "", width: "", height: "" }]);
    setResults([]);
    setCalculationDetails(null);
    setOriginLocation("");
    setDestLocation("");
    setPincodeCache({});
    setExpandedVendor(null);
    setChargedWeight(0);
    setVolumeCFT(0);
    setOriginClientZone("");
    setDestClientZone("");
    setOriginVendorZones({});
    setDestVendorZones({});
  };

  const toggleVendorSelection = (vendorName) => {
    setSelectedVendors(prev => 
      prev.includes(vendorName) 
        ? prev.filter(v => v !== vendorName)
        : [...prev, vendorName]
    );
  };

  const toggleExpanded = (index) => {
    setExpandedVendor(expandedVendor === index ? null : index);
  };

  const getBestVendor = () => results.length > 0 ? results[0] : null;
  const bestVendor = getBestVendor();

  return (
    <div className="vendor-rate-page">
      <div className="page-header-calc">
        <h1>🚚 Vendor Rate Calculator</h1>
        <p>Compare rates across multiple logistics vendors in real-time</p>
        {destination && (
          <div className="oda-status-info">
            🔍 Checking pincode: <strong>{destination}</strong>
          </div>
        )}
      </div>

      <div className="big-card">
        <div className="calculator-container">
          <div className="form-card">
            <h3>📋 Shipment Details</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Origin Pincode *</label>
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="e.g., 110001" 
                  value={pickup} 
                  onChange={(e) => setPickup(e.target.value.replace(/\D/g, ''))} 
                />
                {originLocation && <small className="location-hint">📍 {originLocation}</small>}
                {originClientZone && <small className="zone-hint">📌 Client Zone: <strong>{originClientZone}</strong></small>}
              </div>
              <div className="form-group">
                <label>Destination Pincode *</label>
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="e.g., 212217" 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value.replace(/\D/g,''))} 
                />
                {destLocation && <small className="location-hint">📍 {destLocation}</small>}
                {destClientZone && <small className="zone-hint">📌 Client Zone: <strong>{destClientZone}</strong></small>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Payment Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="Prepaid">Prepaid</option>
                  <option value="COD">COD (+₹125)</option>
                  <option value="ToPay">ToPay (+₹200)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Actual Weight (kg) *</label>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="0.00" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Invoice Value (₹)</label>
              <input 
                type="number" 
                placeholder="0" 
                value={invoiceValue} 
                onChange={(e) => setInvoiceValue(e.target.value)} 
              />
              <small className="input-hint">FOV: 0.1% (Min ₹100)</small>
            </div>

            <div className="dimensions-section">
              <label>Package Dimensions (cm)</label>
              <div className="dimension-hint">
                <small>💡 Volumetric: 6CFT÷4500, 10CFT÷10000, Standard÷5000</small>
              </div>
              {dimensions.map((dim, idx) => (
                <div key={idx} className="dimension-row">
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    value={dim.qty} 
                    onChange={(e) => updateDimension(idx, "qty", e.target.value)} 
                  />
                  <input 
                    type="number" 
                    placeholder="L (cm)" 
                    value={dim.length} 
                    onChange={(e) => updateDimension(idx, "length", e.target.value)} 
                  />
                  <input 
                    type="number" 
                    placeholder="W (cm)" 
                    value={dim.width} 
                    onChange={(e) => updateDimension(idx, "width", e.target.value)} 
                  />
                  <input 
                    type="number" 
                    placeholder="H (cm)" 
                    value={dim.height} 
                    onChange={(e) => updateDimension(idx, "height", e.target.value)} 
                  />
                  {dimensions.length > 1 && (
                    <button className="remove-dim-btn" onClick={() => removeDimension(idx)}>✕</button>
                  )}
                </div>
              ))}
              <button className="add-dim-btn" onClick={addDimension}>
                + Add Package
              </button>
            </div>

            <div className="vendor-filter">
              <label className="filter-label">
                <input 
                  type="checkbox" 
                  checked={showAllVendors} 
                  onChange={(e) => setShowAllVendors(e.target.checked)} 
                />
                Show All Vendors
              </label>
              {!showAllVendors && (
                <div className="vendor-selector">
                  {vendors.map(vendor => (
                    <label key={vendor.vendor_name}>
                      <input 
                        type="checkbox" 
                        checked={selectedVendors.includes(vendor.vendor_name)} 
                        onChange={() => toggleVendorSelection(vendor.vendor_name)} 
                      />
                      {vendor.vendor_name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="btn-group">
              <button 
                className="calc-btn" 
                onClick={handleCalculate} 
                disabled={loading || isCalculating}
              >
                {loading ? "⏳ Calculating..." : "🔍 Calculate Rates"}
              </button>
              <button className="reset-btn" onClick={handleReset}>🔄 Reset</button>
            </div>
          </div>

          <div className="main-result-card">
            <div className="results-header">
              <h3>📊 Rate Comparison</h3>
              {calculationDetails && (
                <div className="calc-info">
                  <span>📍 {originLocation || calculationDetails.from_pincode} → {destLocation || calculationDetails.to_pincode}</span>
                  <span>Client Zones: <strong>{calculationDetails.from_client_zone} → {calculationDetails.to_client_zone}</strong></span>
                  {volumeCFT > 0 && (
                    <span>Volume: <strong>{volumeCFT.toFixed(2)} CFT</strong></span>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Calculating rates...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <p>📦 Enter shipment details and click "Calculate Rates"</p>
                <div className="example-inputs">
                  <p>💡 Try these examples:</p>
                  <button onClick={() => { setPickup("110001"); setDestination("400001"); setWeight("100"); }} className="example-btn">
                    Delhi NCR → Mumbai (W2)
                  </button>
                  <button onClick={() => { setPickup("110001"); setDestination("500001"); setWeight("50"); }} className="example-btn">
                    Delhi NCR → Hyderabad (South)
                  </button>
                  <button onClick={() => { setPickup("110001"); setDestination("700001"); setWeight("200"); }} className="example-btn">
                    Delhi NCR → Kolkata (East)
                  </button>
                  <button onClick={() => { setPickup("110001"); setDestination("781001"); setWeight("50"); }} className="example-btn">
                    Delhi NCR → Guwahati (NE1)
                  </button>
                </div>
              </div>
            ) : (
              <>
                {bestVendor && (
                  <div className="best-vendor-highlight">
                    <div className="best-badge">🏆 BEST RATE</div>
                    <div className="best-content">
                      <div className="best-vendor">{bestVendor.vendor_name}</div>
                      <div className="best-price">₹{bestVendor.total_freight?.toFixed(2)}</div>
                      <div className="best-rate">₹{bestVendor.rate_per_kg?.toFixed(2)}/kg</div>
                      {bestVendor.cft_type && (
                        <div className="best-cft-badge">{bestVendor.cft_type}</div>
                      )}
                      {bestVendor.oda_applicable && (
                        <div className="oda-highlight-badge">
                          🚚 ODA {bestVendor.oda_category || 'Applied'} (Min ₹500) +₹{bestVendor.oda_charge?.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="results-list">
                  {results.map((vendor, idx) => (
                    <div 
                      key={idx} 
                      className={`vendor-result ${bestVendor?.vendor_name === vendor.vendor_name ? 'is-best' : ''}`}
                    >
                      <div className="vendor-result-header" onClick={() => toggleExpanded(idx)}>
                        <div className="vendor-name">
                          {vendor.vendor_name}
                          {vendor.cft_type && (
                            <span className="cft-badge">{vendor.cft_type}</span>
                          )}
                          {vendor.oda_applicable ? (
                            <span className="oda-badge oda-yes">
                              🚚 ODA {vendor.oda_category || 'Yes'} (Min ₹500) +₹{vendor.oda_charge?.toFixed(2)}
                            </span>
                          ) : (
                            <span className="oda-badge oda-no">✅ No ODA</span>
                          )}
                        </div>
                        <div className="vendor-total">₹{vendor.total_freight?.toFixed(2)}</div>
                      </div>
                      
                      <div className={`vendor-breakdown ${expandedVendor === idx ? 'expanded' : ''}`}>
                        <div className="breakdown-row">
                          <span>Rate/kg:</span>
                          <strong>₹{vendor.rate_per_kg?.toFixed(2)}</strong>
                        </div>
                        <div className="breakdown-row">
                          <span>Effective Weight:</span>
                          <span>{vendor.effective_weight?.toFixed(2)} kg</span>
                        </div>
                        <div className="breakdown-row">
                          <span>Base Freight:</span>
                          <span>₹{vendor.base_freight?.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>Docket Charge:</span>
                          <span>₹{vendor.docket_charge?.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>FSC ({vendor.fsc_percent}%):</span>
                          <span>₹{vendor.fsc_amount?.toFixed(2)}</span>
                        </div>
                        {vendor.oda_applicable && (
                          <div className="breakdown-row oda-highlight">
                            <span>ODA {vendor.oda_category ? `${vendor.oda_category} (${vendor.oda_rate_per_kg}/kg, Min ₹${vendor.oda_min_charge}):` : 'Charge (Min ₹500):'}</span>
                            <span>₹{vendor.oda_charge?.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="breakdown-row">
                          <span>GST ({vendor.gst_percent}%):</span>
                          <span>₹{vendor.gst_amount?.toFixed(2)}</span>
                        </div>
                        {vendor.mode_charge > 0 && (
                          <div className="breakdown-row">
                            <span>Mode Charge:</span>
                            <span>₹{vendor.mode_charge?.toFixed(2)}</span>
                          </div>
                        )}
                        {vendor.fov_charge > 0 && (
                          <div className="breakdown-row">
                            <span>FOV/Insurance:</span>
                            <span>₹{vendor.fov_charge?.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="breakdown-row total">
                          <span>Total Freight:</span>
                          <strong>₹{vendor.total_freight?.toFixed(2)}</strong>
                        </div>
                      </div>
                      
                      {expandedVendor !== idx && (
                        <div className="expand-hint" onClick={() => toggleExpanded(idx)}>
                          <span>▼ Click to expand</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="disclaimer">
                  <small>* Rates are based on your client's zone mapping (Delhi NCR, NORTH 2, NORTH 3, Central, W1, W2, East, South, NE1, NE2, NE3). ODA charges: Min ₹500 for all vendors. PD Logistics: Only 6 CFT and 10 CFT rates apply. RIVIGO: Both CFT and Standard rates. VXPRESS & SHIVANI VX use standard zone names (N1, N2, etc.) for rate storage.</small>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VendorRateCalculator;