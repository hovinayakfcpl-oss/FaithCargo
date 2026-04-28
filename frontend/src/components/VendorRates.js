import React, { useState, useEffect, useCallback, useRef } from "react";
import "./VendorRateCalculator.css";

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://faithcargo.onrender.com";

// Zones list
const ZONES = [
  "N1", "N2", "N3", "N4", "C1", "C2", "W1", "W2", 
  "S1", "S2", "S3", "S4", "E1", "E2", "NE1", "NE2", "NE3"
];

// ODA Categories (Min ₹500)
const ODA_CATEGORIES = {
  'A': { rate: 2, min: 500, name: 'ODA A (₹2/kg, Min ₹500)', color: '#10b981' },
  'B': { rate: 4, min: 500, name: 'ODA B (₹4/kg, Min ₹500)', color: '#f59e0b' },
  'C': { rate: 7, min: 500, name: 'ODA C (₹7/kg, Min ₹500)', color: '#ef4444' },
  'D': { rate: 10, min: 500, name: 'ODA D (₹10/kg, Min ₹500)', color: '#8b5cf6' },
  'DEFAULT': { rate: 4, min: 500, name: 'ODA Default (₹4/kg, Min ₹500)', color: '#6b7280' }
};

// Vendors that support CFT rates (Only RIVIGO and PD LOGISTICS)
const CFT_SUPPORTED_VENDORS = ["RIVIGO", "PD LOGISTICS"];

// TRUCX vendors (NO CFT support - only standard rates)
const TRUCX_VENDORS = ["TRUCX DLH Lite", "TRUCX DLH Dense", "TRUCX DLH Cargo"];

// Volumetric constants
const VOLUMETRIC_DIVISOR = {
  'STANDARD': 5000,
  '6CFT': 4500,
  '10CFT': 10000
};

// Default fallback rates (used only if API rate is 0)
const DEFAULT_VENDOR_RATES = {
  "DELHIVERY": 28, "GATI": 25, "PD LOGISTICS": 22,
  "RIVIGO": 24, "VXPRESS": 20, "SHIVANI VX": 20,
  "TRUCX DLH Lite": 22, "TRUCX DLH Dense": 22, "TRUCX DLH Cargo": 22,
  "SHIPSHOPY BLUE DART": 25, "SHIPSHOPY DELIVERY": 22
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
  const [originZone, setOriginZone] = useState("");
  const [destZone, setDestZone] = useState("");
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
      setOriginZone(getZoneFromPincode(pickup));
    }
    if (destination && destination.length === 6) {
      fetchPincodeLocation(destination, "dest");
      setDestZone(getZoneFromPincode(destination));
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
        console.log("Fetched vendors:", data.map(v => ({ 
          name: v.vendor_name, 
          ratesCount: Object.keys(v.rates || {}).length,
          cft6Count: Object.keys(v.delhivery_6cft || {}).length,
          cft10Count: Object.keys(v.delhivery_10cft || {}).length
        })));
        setVendors(data);
        setSelectedVendors(data.map(v => v.vendor_name));
      } else {
        setDefaultVendors();
      }
    } catch (err) {
      console.error("Error fetching vendors:", err);
      setDefaultVendors();
    }
  };

  const setDefaultVendors = () => {
    const defaultVendors = [
      { vendor_name: "DELHIVERY", is_active: true, rates: {}, delhivery_6cft: {}, delhivery_10cft: {}, charges: { docket_charge: 75, fsc: "10%", gst: "18%", min_freight: 400, min_weight: 20, oda_charge: 2, oda_min_charge: 500 } },
      { vendor_name: "GATI", is_active: true, rates: {}, charges: { docket_charge: 100, fsc: "15%", gst: "18%", min_freight: 350, min_weight: 20, oda_charge: 3, oda_min_charge: 500 } },
      { vendor_name: "PD LOGISTICS", is_active: true, rates: {}, delhivery_6cft: {}, delhivery_10cft: {}, charges: { docket_charge: 75, fsc: "10%", gst: "18%", min_freight: 400, min_weight: 20, oda_charge: 4, oda_min_charge: 500 } },
      { vendor_name: "RIVIGO", is_active: true, rates: {}, delhivery_6cft: {}, delhivery_10cft: {}, charges: { docket_charge: 85, fsc: "12%", gst: "18%", min_freight: 380, min_weight: 20, oda_charge: 4, oda_min_charge: 500 } },
      { vendor_name: "VXPRESS", is_active: true, rates: {}, charges: { docket_charge: 50, fsc: "8%", gst: "18%", min_freight: 450, min_weight: 25, oda_charge: 2, oda_min_charge: 500 } },
      { vendor_name: "SHIVANI VX", is_active: true, rates: {}, charges: { docket_charge: 50, fsc: "7%", gst: "18%", min_freight: 800, min_weight: 20, divisor: 5000, oda_min_charge: 500 } },
      { vendor_name: "TRUCX DLH Lite", is_active: true, rates: {}, charges: { docket_charge: 50, fsc: "10%", gst: "18%", min_freight: 350, min_weight: 20, divisor: 4500, oda_charge: 3, oda_min_charge: 500 } },
      { vendor_name: "TRUCX DLH Dense", is_active: true, rates: {}, charges: { docket_charge: 75, fsc: "12%", gst: "18%", min_freight: 300, min_weight: 20, divisor: 2700, oda_charge: 3, oda_min_charge: 500 } },
      { vendor_name: "TRUCX DLH Cargo", is_active: true, rates: {}, charges: { docket_charge: 50, fsc: "10%", gst: "18%", min_freight: 350, min_weight: 20, divisor: 3540, oda_charge: 3, oda_min_charge: 500 } },
      { vendor_name: "SHIPSHOPY BLUE DART", is_active: true, rates: {}, charges: { docket_charge: 50, fsc: "20%", gst: "18%", min_freight: 400, min_weight: 20, divisor: 4500, oda_charge: 0, oda_min_charge: 0 } },
      { vendor_name: "SHIPSHOPY DELIVERY", is_active: true, rates: {}, charges: { docket_charge: 50, fsc: "10%", gst: "18%", min_freight: 350, min_weight: 20, divisor: 4500, oda_charge: 3, oda_min_charge: 500 } },
    ];
    setVendors(defaultVendors);
    setSelectedVendors([
      "DELHIVERY", "GATI", "PD LOGISTICS", "RIVIGO", 
      "VXPRESS", "SHIVANI VX", "TRUCX DLH Lite", "TRUCX DLH Dense", 
      "TRUCX DLH Cargo", "SHIPSHOPY BLUE DART", "SHIPSHOPY DELIVERY"
    ]);
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

  const getZoneFromPincode = useCallback((pincode) => {
    const pincodeStr = String(pincode);
    const firstDigit = pincodeStr.charAt(0);
    
    const zoneMap = {
      '1': 'N1', '2': 'N2', '3': 'N3', '4': 'N4',
      '5': 'C1', '6': 'C2',
      '7': 'W1', '8': 'W2',
      '9': 'S1'
    };
    
    if (pincodeStr.startsWith('30')) return 'S2';
    if (pincodeStr.startsWith('31')) return 'S3';
    if (pincodeStr.startsWith('32')) return 'S4';
    if (pincodeStr.startsWith('10')) return 'E1';
    if (pincodeStr.startsWith('11')) return 'E2';
    if (pincodeStr.startsWith('12')) return 'NE1';
    if (pincodeStr.startsWith('13')) return 'NE2';
    if (pincodeStr.startsWith('14')) return 'NE3';
    
    return zoneMap[firstDigit] || 'N1';
  }, []);

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
          if (data.is_serviceable === true) {
            result = {
              isServiceable: true,
              isODA: false,
              charge: 0,
              minCharge: 0,
              category: null
            };
          } else {
            result = {
              isServiceable: false,
              isODA: false,
              charge: 0,
              minCharge: 0,
              category: null
            };
          }
        } else {
          if (data.is_oda === true) {
            result = {
              isServiceable: true,
              isODA: true,
              charge: parseFloat(data.oda_charge_per_kg) || 0,
              minCharge: parseFloat(data.oda_min_charge) || 500,
              category: data.oda_category || 'DEFAULT'
            };
          } else {
            result = {
              isServiceable: true,
              isODA: false,
              charge: 0,
              minCharge: 0,
              category: null
            };
          }
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
    return { isServiceable: true, isODA: false, charge: 0, minCharge: 500, category: null };
  }, [pincodeCache]);

  // FIXED: Get rate from vendor rates properly - PRIORITIZE CFT RATES FOR RIVIGO & PD
  const getRateFromVendor = useCallback((vendor, fromZone, toZone, cftType) => {
    let rate = 0;
    const vendorName = vendor.vendor_name;
    
    console.log(`Getting rate for ${vendorName}, ${cftType}, ${fromZone}→${toZone}`);
    
    // For RIVIGO and PD LOGISTICS - prioritize CFT rates
    if (CFT_SUPPORTED_VENDORS.includes(vendorName)) {
      // For CFT types, get from specific CFT fields
      if (cftType === "6CFT" && vendor.delhivery_6cft) {
        rate = vendor.delhivery_6cft[fromZone]?.[toZone] || 0;
        console.log(`  ✅ 6CFT rate: ${rate}`);
      } 
      else if (cftType === "10CFT" && vendor.delhivery_10cft) {
        rate = vendor.delhivery_10cft[fromZone]?.[toZone] || 0;
        console.log(`  ✅ 10CFT rate: ${rate}`);
      }
      // For Standard rate, try rates first, then 6CFT
      else if (cftType === "Standard") {
        rate = vendor.rates[fromZone]?.[toZone] || 0;
        if (rate === 0 && vendor.delhivery_6cft) {
          rate = vendor.delhivery_6cft[fromZone]?.[toZone] || 0;
        }
        console.log(`  ✅ Standard rate: ${rate}`);
      }
    } 
    // For TRUCX vendors - standard rates only
    else if (TRUCX_VENDORS.includes(vendorName)) {
      rate = vendor.rates[fromZone]?.[toZone] || 0;
      console.log(`  ✅ TRUCX Standard rate: ${rate}`);
    }
    // For other vendors - standard rates only
    else {
      rate = vendor.rates[fromZone]?.[toZone] || 0;
      console.log(`  ✅ ${vendorName} Standard rate: ${rate}`);
    }
    
    return rate;
  }, []);

  const calculateRateForVendor = useCallback((vendor, fromZone, toZone, weight, finalODACharge, cftSize, pincodeInfo) => {
    const vendorName = vendor.vendor_name;
    const charges = vendor.charges || {};
    
    // Get rate from vendor's rate matrix
    let ratePerKg = getRateFromVendor(vendor, fromZone, toZone, cftSize);
    
    // If still 0, try one more fallback
    if (ratePerKg === 0) {
      // For RIVIGO and PD, try rates field one more time
      if (CFT_SUPPORTED_VENDORS.includes(vendorName) && vendor.rates && vendor.rates[fromZone]) {
        ratePerKg = vendor.rates[fromZone][toZone] || 0;
      }
    }
    
    // If still 0, use fallback
    if (ratePerKg === 0) {
      console.warn(`⚠️ No rate found for ${vendorName} ${cftSize}: ${fromZone}→${toZone}, using fallback ₹${DEFAULT_VENDOR_RATES[vendorName] || 22}`);
      ratePerKg = DEFAULT_VENDOR_RATES[vendorName] || 22;
    }
    
    const docketCharge = parseFloat(charges.docket_charge) || 100;
    const fscPercent = parseFloat(String(charges.fsc || "10%").replace("%", "")) || 10;
    const gstPercent = parseFloat(String(charges.gst || "18%").replace("%", "")) || 18;
    const minFreight = parseFloat(charges.min_freight) || 350;
    const minWeight = parseFloat(charges.min_weight) || 20;
    
    let effectiveWeight = Math.max(weight, minWeight);
    
    const isCFTVendor = CFT_SUPPORTED_VENDORS.includes(vendorName);
    
    if (isCFTVendor && cftSize === "6CFT") {
      const { volumetricWeight } = calculateVolumetricWeight('6CFT');
      effectiveWeight = Math.max(effectiveWeight, volumetricWeight);
    } else if (isCFTVendor && cftSize === "10CFT") {
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
    
    console.log(`✅ ${vendorName} ${cftSize}: Rate=${ratePerKg}, EffectiveWt=${effectiveWeight}, Base=${baseFreight}, ODA=${finalODACharge}, Total=${totalFreight}`);
    
    return {
      vendor_name: vendorName,
      rate_per_kg: ratePerKg,
      cft_type: (isCFTVendor && cftSize !== "Standard") ? cftSize : null,
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
      const fromZone = originZone || getZoneFromPincode(pickup);
      const toZone = destZone || getZoneFromPincode(destination);
      
      console.log(`📊 Calculating: ${pickup}(${fromZone}) → ${destination}(${toZone}), Weight: ${weight}kg`);
      
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
          console.log(`🔥 ODA for ${vendorName}: ${pincodeInfo.charge}/kg × ${actualWeight}kg = ${calculatedODA}, Min ₹${pincodeInfo.minCharge}, Final: ₹${finalODACharge}`);
        }
        
        const isCFTVendor = CFT_SUPPORTED_VENDORS.includes(vendorName);
        const isTrucx = TRUCX_VENDORS.includes(vendorName);
        
        if (isCFTVendor) {
          // 6 CFT
          const rate6CFT = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "6CFT", pincodeInfo);
          if (rate6CFT && rate6CFT.rate_per_kg > 0) {
            calculatedResults.push(rate6CFT);
          }
          
          // 10 CFT
          const rate10CFT = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "10CFT", pincodeInfo);
          if (rate10CFT && rate10CFT.rate_per_kg > 0) {
            calculatedResults.push(rate10CFT);
          }
          
          // Standard
          const rateStd = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "Standard", pincodeInfo);
          if (rateStd && rateStd.rate_per_kg > 0) {
            calculatedResults.push(rateStd);
          }
        } else if (isTrucx) {
          const rate = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "Standard", pincodeInfo);
          if (rate && rate.rate_per_kg > 0) {
            calculatedResults.push(rate);
          }
        } else {
          const rate = calculateRateForVendor(vendor, fromZone, toZone, actualWeight, finalODACharge, "Standard", pincodeInfo);
          if (rate && rate.rate_per_kg > 0) {
            calculatedResults.push(rate);
          }
        }
      }
      
      calculatedResults.sort((a, b) => a.total_freight - b.total_freight);
      
      console.log(`✅ Total ${calculatedResults.length} results calculated`);
      
      setResults(calculatedResults);
      setCalculationDetails({
        from_zone: fromZone,
        to_zone: toZone,
        charged_weight: chargedWeight,
        volume_cft: volumeCFT
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
    setOriginZone("");
    setDestZone("");
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
                {originZone && <small className="zone-hint">Zone: {originZone}</small>}
              </div>
              <div className="form-group">
                <label>Destination Pincode *</label>
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="e.g., 212217" 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value.replace(/\D/g, ''))} 
                />
                {destLocation && <small className="location-hint">📍 {destLocation}</small>}
                {destZone && <small className="zone-hint">Zone: {destZone}</small>}
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
                  <span>📍 {originLocation || pickup} → {destLocation || destination}</span>
                  <span>Zone: <strong>{calculationDetails.from_zone} → {calculationDetails.to_zone}</strong></span>
                  {chargedWeight > 0 && (
                    <span>Charged Wt: <strong>{chargedWeight.toFixed(2)} kg</strong></span>
                  )}
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
                  <button onClick={() => { setPickup("110001"); setDestination("212217"); setWeight("100"); }} className="example-btn">
                    Delhi → Allahabad (ODA Test)
                  </button>
                  <button onClick={() => { setPickup("400001"); setDestination("500001"); setWeight("50"); }} className="example-btn">
                    Mumbai → Hyderabad
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
                  <small>* Rates are indicative. ODA charges: Min ₹500 for all vendors. Volumetric weight: 6CFT÷4500, 10CFT÷10000, Standard÷5000</small>
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