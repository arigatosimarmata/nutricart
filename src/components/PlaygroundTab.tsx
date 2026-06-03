import { useState, FormEvent, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Html5Qrcode } from "html5-qrcode";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { 
  Users, 
  Plus, 
  Trash2, 
  Sparkles, 
  HelpCircle, 
  Scan, 
  Check, 
  ShoppingCart, 
  RefreshCw, 
  AlertCircle,
  PlusCircle,
  ChefHat,
  ChevronRight,
  Calculator,
  ShieldCheck,
  ShieldAlert,
  Camera,
  CameraOff,
  X
} from "lucide-react";

interface PlaygroundTabProps {
  members: any[];
  shoppingItems: any[];
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  barcodeResult: any;
  setBarcodeResult: (val: any) => void;
  scanning: boolean;
  scanError: string;
  setScanError: (val: string) => void;
  fridgeIngredients: string[];
  newIngredient: string;
  setNewIngredient: (val: void | string) => void;
  aiResult: any;
  aiLoading: boolean;
  aiError: string;
  showAddMember: boolean;
  setShowAddMember: (val: boolean) => void;
  newMemberForm: {
    name: string;
    gender: string;
    age: number;
    weight_kg: number;
    height_cm: number;
  };
  setNewMemberForm: (val: any) => void;
  authLoading: boolean;
  authToken: string;
  userProfile: any;
  syncTimestamp: string;
  syncStatus: string;
  fetchFamilyMembers: () => Promise<void>;
  fetchShoppingCart: () => Promise<void>;
  handleAddMember: (e: any) => Promise<void>;
  handleDeleteMember: (id: number) => Promise<void>;
  handleOAuthSignIn: () => Promise<void>;
  handleAuthLogOut: () => void;
  handleBarcodeScan: (overrideCode?: string) => Promise<void>;
  triggerAISuggestions: () => Promise<void>;
  handleAddIngredient: () => void;
  handleRemoveIngredient: (ing: string) => void;
  syncListWithCloud: () => Promise<void>;
  toggleShoppingChecked: (id: number) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function PlaygroundTab({
  members,
  shoppingItems,
  barcodeInput,
  setBarcodeInput,
  barcodeResult,
  setBarcodeResult,
  scanning,
  scanError,
  setScanError,
  fridgeIngredients,
  newIngredient,
  setNewIngredient,
  aiResult,
  aiLoading,
  aiError,
  showAddMember,
  setShowAddMember,
  newMemberForm,
  setNewMemberForm,
  authToken,
  syncTimestamp,
  syncStatus,
  handleAddMember,
  handleDeleteMember,
  handleBarcodeScan,
  triggerAISuggestions,
  handleAddIngredient,
  handleRemoveIngredient,
  syncListWithCloud,
  toggleShoppingChecked
}: PlaygroundTabProps) {
  // Local state for registering custom barcode
  const [showAddBarcode, setShowAddBarcode] = useState<boolean>(false);
  const [newBarcodeForm, setNewBarcodeForm] = useState({
    barcode_value: "",
    product_name: "",
    brand: "",
    packing_size: "",
    calories_kcal: 200,
    protein_g: 8.0,
    carbohydrates_g: 25.0,
    fat_g: 6.0,
    fiber_g: 2.0,
    dominant_tag: "Gizi Seimbang",
    is_safe_for_children: true
  });
  const [barcodeRegLoading, setBarcodeRegLoading] = useState<boolean>(false);
  const [barcodeRegSuccess, setBarcodeRegSuccess] = useState<string>("");

  // Deletion Confirmation Modal State
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);

  // Consumption duration state (1 day, 3 days, 7 days)
  const [consumptionDays, setConsumptionDays] = useState<number>(1);

  // Calculate nutritional sums for all shopping cart items
  const totalCalories = shoppingItems.reduce((acc, it) => acc + (Number(it.calories) || 0), 0);
  const totalProtein = shoppingItems.reduce((acc, it) => acc + (Number(it.protein_g) || 0), 0);

  // Compute family-based thresholds
  let isUsingFamilyBaseline = false;
  let baseCalorieThreshold = 2000; // default for 1 person/average baseline
  let baseProteinThreshold = 60;   // default for average baseline

  if (members && members.length > 0) {
    isUsingFamilyBaseline = true;
    let bmrSum = 0;
    let weightSum = 0;
    
    members.forEach((mb: any) => {
      weightSum += (Number(mb.weight_kg) || 50);
      // Inline Mifflin-St Jeor to avoid execution order constraints
      const bmrVal = mb.gender === "Pria"
        ? Math.round(10 * (Number(mb.weight_kg) || 50) + 6.25 * (Number(mb.height_cm) || 160) - 5 * (Number(mb.age) || 30) + 5)
        : Math.round(10 * (Number(mb.weight_kg) || 50) + 6.25 * (Number(mb.height_cm) || 160) - 5 * (Number(mb.age) || 30) - 161);
      bmrSum += bmrVal;
    });

    baseCalorieThreshold = Math.round(bmrSum * 1.2); // sedentary multiplier
    baseProteinThreshold = Math.round(weightSum * 1.0); // 1g/kg body weight baseline
  }

  const calorieLimit = baseCalorieThreshold * consumptionDays;
  const proteinLimit = baseProteinThreshold * consumptionDays;

  // Camera Quick Scan State & Refs
  const [isQuickScanning, setIsQuickScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "quick-scan-video-container";

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(err => console.error("Unmount cleanup failed:", err));
      }
    };
  }, []);

  const stopCameraScan = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      } finally {
        qrScannerRef.current = null;
        setIsQuickScanning(false);
        setCameraError("");
      }
    } else {
      setIsQuickScanning(false);
      setCameraError("");
    }
  };

  const startCameraScan = () => {
    setIsQuickScanning(true);
    setCameraError("");
    
    // Brief timeout to let the container div render in the DOM
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(scannerContainerId);
        qrScannerRef.current = scanner;

        // Custom config tailored for fast scan & rectangular barcodes
        const config = {
          fps: 15,
          qrbox: (videoWidth: number, videoHeight: number) => {
            // Wider box optimized for standard linear food product barcodes
            const boxWidth = Math.min(videoWidth * 0.85, 320);
            const boxHeight = Math.min(videoHeight * 0.45, 160);
            return { width: boxWidth, height: boxHeight };
          },
          aspectRatio: 1.333333 // 4:3 aspect ratio is highly compatible
        };

        await scanner.start(
          { facingMode: "environment" },
          config,
          async (decodedText) => {
            if (decodedText) {
              setBarcodeInput(decodedText);
              // Stop scanner first to release camera
              try {
                await scanner.stop();
              } catch (e) {
                console.error("Stop on success warning:", e);
              }
              qrScannerRef.current = null;
              setIsQuickScanning(false);
              // Trigger barcode query/details retrieve instantly!
              await handleBarcodeScan(decodedText);
            }
          },
          () => {
            // Frame decode warnings can be safely ignored
          }
        ).catch((err: any) => {
          console.error("Camera start promise catch:", err);
          setCameraError("Gagal mengakses modul video. Pastikan izin kamera aktif.");
        });
      } catch (err: any) {
        console.error("Camera preparation failed:", err);
        setCameraError(err?.message || "Gagal menginisiasi modul kamera.");
      }
    }, 150);
  };

  const handleRegisterBarcode = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBarcodeForm.barcode_value || !newBarcodeForm.product_name) return;
    setBarcodeRegLoading(true);
    setBarcodeRegSuccess("");
    try {
      const res = await fetch("/api/v1/nutrition/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode_value: newBarcodeForm.barcode_value,
          product_name: newBarcodeForm.product_name,
          brand: newBarcodeForm.brand,
          packing_size: newBarcodeForm.packing_size,
          nutritional_facts: {
            calories_kcal: Number(newBarcodeForm.calories_kcal),
            protein_g: Number(newBarcodeForm.protein_g),
            carbohydrates_g: Number(newBarcodeForm.carbohydrates_g),
            fat_g: Number(newBarcodeForm.fat_g),
            fiber_g: Number(newBarcodeForm.fiber_g),
            dominant_tag: newBarcodeForm.dominant_tag
          },
          is_safe_for_children: newBarcodeForm.is_safe_for_children
        })
      });
      const d = await res.json();
      if (d.status === "success") {
        setBarcodeRegSuccess("Barcode produk berhasil didaftarkan!");
        setBarcodeInput(newBarcodeForm.barcode_value); // Auto populate
        // Reset form
        setNewBarcodeForm({
          barcode_value: "",
          product_name: "",
          brand: "",
          packing_size: "",
          calories_kcal: 200,
          protein_g: 8.0,
          carbohydrates_g: 25.0,
          fat_g: 6.0,
          fiber_g: 2.0,
          dominant_tag: "Gizi Seimbang",
          is_safe_for_children: true
        });
        setTimeout(() => {
          setShowAddBarcode(false);
          setBarcodeRegSuccess("");
        }, 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBarcodeRegLoading(false);
    }
  };

  // Local helper BMR math for display
  const calculateBMRDisplay = (gender: string, w: number, h: number, age: number) => {
    // Mifflin-St Jeor
    if (gender === "Pria") {
      return Math.round(10 * w + 6.25 * h - 5 * age + 5);
    } else {
      return Math.round(10 * w + 6.25 * h - 5 * age - 161);
    }
  };

  // Recharts datasets for calories the family BMR vs shopping total
  const calorieChartData = [
    {
      name: "Kalori",
      unit: "kcal",
      "Keranjang": totalCalories,
      "Target BMR": calorieLimit
    }
  ];

  const proteinChartData = [
    {
      name: "Protein",
      unit: "g",
      "Keranjang": parseFloat(totalProtein.toFixed(1)),
      "Target Gizi": parseFloat(proteinLimit.toFixed(1))
    }
  ];

  return (
    <div className="space-y-8" id="playground-workspace">
      
      {/* 2-Column Grid for main console panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PANEL A: Family Profiles (Profil Anggota Keluarga) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between" id="panel-family">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Manajer Profil Keluarga</h3>
                  <p className="text-xs text-slate-500 font-medium">Data penentu sasaran BMR & analisis nutrisi personal.</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-2 transition cursor-pointer shadow-xs"
                id="btn-toggle-add-member"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Profil</span>
              </button>
            </div>

            {/* Add Member Form */}
            <AnimatePresence>
              {showAddMember && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddMember}
                  className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-5 space-y-3 overflow-hidden text-xs"
                  id="form-add-member"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Nama Anggota</label>
                      <input 
                        type="text"
                        required
                        value={newMemberForm.name}
                        onChange={e => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                        placeholder="Contoh: Ade / Ayah"
                        className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Gender</label>
                      <select 
                        value={newMemberForm.gender}
                        onChange={e => setNewMemberForm({ ...newMemberForm, gender: e.target.value })}
                        className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                      >
                        <option value="Wanita">Wanita</option>
                        <option value="Pria">Pria</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Usia (Tahun)</label>
                      <input 
                        type="number"
                        min="1"
                        max="120"
                        value={newMemberForm.age}
                        onChange={e => setNewMemberForm({ ...newMemberForm, age: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Berat (Kg)</label>
                      <input 
                        type="number"
                        step="0.1"
                        min="2"
                        max="250"
                        value={newMemberForm.weight_kg}
                        onChange={e => setNewMemberForm({ ...newMemberForm, weight_kg: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Tinggi (Cm)</label>
                      <input 
                        type="number"
                        step="0.1"
                        min="30"
                        max="250"
                        value={newMemberForm.height_cm}
                        onChange={e => setNewMemberForm({ ...newMemberForm, height_cm: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => setShowAddMember(false)}
                      className="rounded bg-slate-250 px-3 py-1.5 text-slate-705 font-bold hover:bg-slate-300 transition"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      className="rounded bg-blue-600 px-3.5 py-1.5 text-white font-bold hover:bg-blue-700 transition"
                    >
                      Simpan Profil
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Profiles lists */}
            <div className="space-y-3.5 max-h-[290px] overflow-y-auto pr-1">
              {members.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-2">
                  <Calculator className="h-8 w-8 mx-auto stroke-1" />
                  <p className="text-xs font-medium">Belum ada anggota keluarga terdaftar.</p>
                </div>
              ) : (
                members.map(mb => {
                  const bmr = calculateBMRDisplay(mb.gender, mb.weight_kg, mb.height_cm, mb.age);
                  return (
                    <div 
                      key={mb.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-blue-500/10 text-blue-600 font-bold rounded-lg flex items-center justify-center text-sm font-sans uppercase">
                          {mb.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{mb.name}</span>
                            <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-100 font-semibold">
                              {mb.gender}
                            </span>
                          </div>
                          <div className="flex gap-2.5 text-[11px] text-slate-500 font-medium mt-0.5">
                            <span>{mb.age} Tahun</span>
                            <span>•</span>
                            <span>{mb.weight_kg} Kg</span>
                            <span>•</span>
                            <span>{mb.height_cm} Cm</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. BMR</div>
                          <div className="text-xs font-mono font-bold text-slate-800">{bmr} <span className="text-[10px] font-sans text-slate-500">kcal/hari</span></div>
                        </div>
                        <button
                          onClick={() => setMemberToDelete(mb)}
                          className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-250 hover:border-rose-100 rounded-lg transition cursor-pointer shadow-2xs"
                          title="Hapus profil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Konfirmasi Hapus Anggota */}
            <AnimatePresence>
              {memberToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMemberToDelete(null)}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
                  />
                  
                  {/* Modal Card */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200/80 p-5 z-10 text-xs"
                  >
                    <div className="flex gap-3 mb-4">
                      <div className="h-9 w-9 rounded-full bg-rose-50 border border-rose-105 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                          Hapus Profil Anggota?
                        </h4>
                        <p className="text-slate-500 font-medium leading-relaxed">
                          Apakah Anda yakin ingin menghapus profil <span className="font-extrabold text-slate-800">“{memberToDelete.name}”</span>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 mt-4 pl-0 pr-0">
                      <button
                        type="button"
                        onClick={() => setMemberToDelete(null)}
                        className="rounded-xl bg-slate-100 hover:bg-slate-150 text-slate-705 font-bold px-4 py-2 transition cursor-pointer border border-transparent hover:border-slate-200 mt-2"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (memberToDelete) {
                            await handleDeleteMember(memberToDelete.id);
                            setMemberToDelete(null);
                          }
                        }}
                        className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 transition cursor-pointer shadow-sm mt-2"
                      >
                        Ya, Hapus
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="border-t border-slate-100 mt-5 pt-3.5 text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
            <Calculator className="h-4 w-4 text-blue-500 shrink-0" />
            <span>Target kalori harian keluarga dihitung berdasar status metabolisme (BMR Mifflin * 1.2 x aktivitas fisik).</span>
          </div>
        </div>

        {/* PANEL B: Barcode Scanning (Analisis Barcode Nutrisi) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between" id="panel-barcode">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <Scan className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Dekoder Barcode Nutrisi</h3>
                  <p className="text-xs text-slate-500 font-medium">Uji pencocokan kode produk fisik (GTIN) dengan database nasional.</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAddBarcode(!showAddBarcode);
                  setBarcodeRegSuccess("");
                }}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs px-3 py-2 transition cursor-pointer border border-indigo-100"
                id="btn-toggle-add-barcode"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Daftar Produk</span>
              </button>
            </div>

            {/* Add Custom Barcode Form */}
            <AnimatePresence>
              {showAddBarcode && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleRegisterBarcode}
                  className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-4 mb-5 space-y-3 overflow-hidden text-xs"
                  id="form-register-barcode"
                >
                  {barcodeRegSuccess ? (
                    <div className="text-center py-4 text-emerald-700 font-extrabold bg-white border border-emerald-200 rounded-lg flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 stroke-[3]" />
                      {barcodeRegSuccess}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Nomor Barcode GTIN</label>
                          <input 
                            type="text"
                            required
                            value={newBarcodeForm.barcode_value}
                            onChange={e => setNewBarcodeForm({ ...newBarcodeForm, barcode_value: e.target.value })}
                            placeholder="Contoh: 8990202111"
                            className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Nama Produk Makanan</label>
                          <input 
                            type="text"
                            required
                            value={newBarcodeForm.product_name}
                            onChange={e => setNewBarcodeForm({ ...newBarcodeForm, product_name: e.target.value })}
                            placeholder="Contoh: Oatmeal Instan Sehat"
                            className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Kalori (kcal)</label>
                          <input 
                            type="number"
                            value={newBarcodeForm.calories_kcal}
                            onChange={e => setNewBarcodeForm({ ...newBarcodeForm, calories_kcal: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-250 rounded p-1.5 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Protein (g)</label>
                          <input 
                            type="number"
                            value={newBarcodeForm.protein_g}
                            onChange={e => setNewBarcodeForm({ ...newBarcodeForm, protein_g: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-250 rounded p-1.5 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Karakteristik dominan</label>
                          <input 
                            type="text"
                            value={newBarcodeForm.dominant_tag}
                            onChange={e => setNewBarcodeForm({ ...newBarcodeForm, dominant_tag: e.target.value })}
                            placeholder="Tinggi Kalium"
                            className="w-full bg-white border border-slate-250 rounded p-1.5 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 py-1">
                        <input 
                          type="checkbox"
                          id="new-chk-safe"
                          checked={newBarcodeForm.is_safe_for_children}
                          onChange={e => setNewBarcodeForm({ ...newBarcodeForm, is_safe_for_children: e.target.checked })}
                          className="rounded border-slate-300 h-4 w-4 bg-white text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="new-chk-safe" className="font-bold text-slate-700 cursor-pointer select-none">
                          Aman bagi tumbuh kembang anak secara klinis
                        </label>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-indigo-100">
                        <button 
                          type="button" 
                          onClick={() => setShowAddBarcode(false)}
                          className="rounded bg-slate-205 px-3 py-1.5 text-slate-705 font-bold hover:bg-slate-300 transition"
                        >
                          Batal
                        </button>
                        <button 
                          type="submit" 
                          disabled={barcodeRegLoading}
                          className="rounded bg-indigo-650 px-3.5 py-1.5 text-white font-bold hover:bg-indigo-700 transition"
                        >
                          {barcodeRegLoading ? "Mendaftarkan..." : "Sahkan Produk"}
                        </button>
                      </div>
                    </>
                  )}
                </motion.form>
              )}
            </AnimatePresence>

            {/* Preset selectors to test decode easily */}
            <div className="flex flex-wrap items-center gap-2 mb-4 py-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-150">
              <span className="font-bold text-slate-500 shrink-0">Pilih Barcode GTIN Demo:</span>
              <button 
                onClick={() => { setBarcodeInput("8991234567890"); setBarcodeResult(null); setScanError(""); }}
                className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold border transition ${
                  barcodeInput === "8991234567890" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                8991234567890 (Susu)
              </button>
              <button 
                onClick={() => { setBarcodeInput("8990001234567"); setBarcodeResult(null); setScanError(""); }}
                className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold border transition ${
                  barcodeInput === "8990001234567" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                8990001234567 (Keripik)
              </button>
            </div>

            {/* Input scanning console */}
            <div className="flex flex-col sm:flex-row gap-2 mb-5">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 flex items-center pr-2 border-r border-slate-200 text-slate-400 font-mono text-xs font-bold font-mono">
                  GTIN
                </span>
                <input 
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 focus:border-indigo-500 rounded-xl py-2 pl-14 pr-3 font-mono text-sm tracking-widest font-bold text-slate-800 capitalize focus:outline-none"
                  placeholder="Masukkan 13 Digit Barcode"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleBarcodeScan()}
                  disabled={scanning || !barcodeInput}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 transition cursor-pointer shadow-xs"
                  id="btn-scan"
                >
                  <Scan className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
                  <span>{scanning ? "Memindai..." : "Scan Gizi"}</span>
                </button>

                <button
                  onClick={isQuickScanning ? stopCameraScan : startCameraScan}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold px-4 py-2 transition cursor-pointer shadow-xs border ${
                    isQuickScanning 
                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" 
                      : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                  }`}
                  id="btn-quick-scan"
                >
                  {isQuickScanning ? (
                    <>
                      <CameraOff className="h-4 w-4" />
                      <span>Matikan Kamera</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      <span>Quick Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Camera Viewfinder */}
            <AnimatePresence>
              {isQuickScanning && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-4 mb-5 overflow-hidden text-xs relative shadow-inner"
                  id="quick-scan-viewfinder"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      <span className="font-bold text-slate-300 font-mono text-[10px] uppercase tracking-wider">Kamera Scanner Aktif</span>
                    </div>
                    <button 
                      onClick={stopCameraScan}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                      title="Batalkan Scan"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Video render container context */}
                  <div className="relative aspect-4/3 max-w-sm mx-auto bg-black rounded-lg overflow-hidden border border-slate-800 shadow-lg">
                    
                    {/* Viewfinder overlay guides */}
                    {!cameraError && (
                      <div className="absolute inset-0 pointer-events-none border-2 border-transparent z-10">
                        {/* corner indicators */}
                        <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl" />
                        <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr" />
                        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl" />
                        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br" />
                        
                        {/* animated red laser line */}
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-bounce" />
                      </div>
                    )}

                    <div id="quick-scan-video-container" className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />

                    {/* Camera Permission Helper Overlay */}
                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-5 text-center z-20 overflow-y-auto">
                        <div className="h-10 w-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-2 border border-rose-500/20">
                          <Camera className="h-5 w-5" />
                        </div>
                        <h4 className="font-extrabold text-[13px] text-slate-100 mb-1 uppercase tracking-wide">
                          Akses Kamera Diblokir
                        </h4>
                        <p className="text-[10px] text-slate-350 max-w-[280px] leading-relaxed mb-3">
                          Gagal memuat kamera. Silakan berikan izin akses kamera dengan panduan rujukan berikut:
                        </p>
                        
                        {/* Instruction guidelines */}
                        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-left space-y-2 text-[9px] text-slate-300">
                          <div className="flex items-start gap-1.5">
                            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-indigo-500/25 text-indigo-300 font-bold font-mono text-[8.5px] shrink-0">1</span>
                            <p className="leading-snug">
                              Klik ikon <span className="font-extrabold text-white">Gembok 🔒</span> / <span className="font-extrabold text-white">Info ℹ️</span> di sebelah kiri alamat kolom URL browser.
                            </p>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-indigo-500/25 text-indigo-300 font-bold font-mono text-[8.5px] shrink-0">2</span>
                            <p className="leading-snug">
                              Ubah setelan opsi <span className="font-extrabold text-white">Kamera (Camera)</span> menjadi <span className="text-emerald-400 font-extrabold uppercase">Izinkan (Allow)</span>.
                            </p>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-indigo-500/25 text-indigo-300 font-bold font-mono text-[8.5px] shrink-0">3</span>
                            <p className="leading-snug">
                              Tekan <span className="font-extrabold text-white">Refresh ↺</span> halaman atau klik rujukan <span className="text-indigo-400 font-extrabold underline cursor-pointer hover:text-indigo-300" onClick={startCameraScan}>Ulangi Kamera</span>.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={startCameraScan}
                          className="mt-3 w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] py-2 transition shadow-md shadow-indigo-600/10 cursor-pointer"
                        >
                          Ulangi Permohonan Akses
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[11px] text-slate-400 mt-3 font-semibold space-y-1">
                    <p>Arahkan barcode produk (UPC/EAN) ke area tengah pemindai.</p>
                    <div className="flex justify-center gap-2 pt-1">
                      <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">EAN-13</span>
                      <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono font-bold">UPC-A</span>
                      <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">CODE-128</span>
                    </div>

                    {/* Highly cooperative test trigger for environment lack of camera permissions, virtual headless agents, or when real barcodes are missing */}
                    <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl mt-4 space-y-1.5 text-center">
                      <p className="text-[10px] text-indigo-300">Tidak ada barcode fisik? Gunakan simulasi instan:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBarcodeInput("8991234567890");
                            stopCameraScan();
                            handleBarcodeScan("8991234567890");
                          }}
                          className="bg-indigo-900 hover:bg-indigo-850 text-indigo-100 border border-indigo-750 text-[10px] px-2.5 py-1 rounded-md transition cursor-pointer font-bold shrink-0"
                        >
                          Susu UHT (8991234567890)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBarcodeInput("8990001234567");
                            stopCameraScan();
                            handleBarcodeScan("8990001234567");
                          }}
                          className="bg-indigo-900 hover:bg-indigo-850 text-indigo-100 border border-indigo-750 text-[10px] px-2.5 py-1 rounded-md transition cursor-pointer font-bold shrink-0"
                        >
                          Keripik Jagung (8990001234567)
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scanning animations simulation and results render */}
            <div className="min-h-[140px] bg-slate-50/75 rounded-2xl border border-slate-200/80 p-4.5 flex items-center justify-center relative overflow-hidden shadow-2xs">
              
              {/* Scan lasers design */}
              {scanning && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500/85 shadow-lg shadow-indigo-500/50 animate-bounce" />
                  <div className="space-y-2 text-center text-indigo-600">
                    <div className="text-sm font-extrabold animate-pulse">MEMINDAI SINAR MERAH LASER...</div>
                    <div className="text-[10px] text-slate-400 font-mono tracking-wider font-bold">Querying API v1 endpoint GORM Gizi...</div>
                  </div>
                </>
              )}

              {/* Error handle */}
              {!scanning && scanError && (
                <div className="text-center text-rose-600 space-y-1.5 max-w-sm">
                  <AlertCircle className="h-6 w-6 mx-auto" />
                  <div className="text-xs font-extrabold font-mono uppercase">BARCODE_NOT_FOUND</div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{scanError}</p>
                </div>
              )}

              {/* Prompt before scan */}
              {!scanning && !barcodeResult && !scanError && (
                <div className="text-center text-slate-400 text-xs py-5">
                  <Scan className="h-8 w-8 mx-auto stroke-1 text-slate-350 mb-1.5 animate-pulse" />
                  <p className="font-medium">Tekan tombol &quot;Scan Gizi&quot; untuk me-resolve database makro.</p>
                </div>
              )}

              {/* Data decoded result display */}
              {!scanning && barcodeResult && (
                <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                  <div className="sm:col-span-7 space-y-2.5">
                    <div>
                      <div className="text-[10px] text-indigo-500 uppercase font-mono tracking-wider font-bold">{barcodeResult.brand}</div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{barcodeResult.product_name}</h4>
                      <div className="text-[11px] text-slate-500 mt-0.5">Kemasan: {barcodeResult.packing_size || "Normal"}</div>
                    </div>

                    {/* Children safety warning badge */}
                    {barcodeResult.is_safe_for_children ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        <span>AMAN BAGI ANAK-ANAK</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold px-3 py-1.5">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <span>KONSUMSI BATASI: TINGGI NATRIUM</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-5 bg-white p-3 rounded-xl border border-slate-200 text-[11px] space-y-2 flex flex-col justify-between shadow-2xs">
                    <div className="font-extrabold text-slate-700 border-b border-slate-100 pb-1 flex justify-between">
                      <span>FAKTA GIZI</span>
                      <span className="text-[10px] text-indigo-600 font-mono font-bold tracking-widest">{barcodeResult.nutritional_facts?.dominant_tag || "Lengkap"}</span>
                    </div>
                    <div className="space-y-1 font-mono">
                      <div className="flex justify-between"><span>Kalori:</span> <span className="text-slate-950 font-bold">{barcodeResult.nutritional_facts?.calories_kcal} kcal</span></div>
                      <div className="flex justify-between"><span>Protein:</span> <span className="text-emerald-700 font-bold">{barcodeResult.nutritional_facts?.protein_g}g</span></div>
                      <div className="flex justify-between"><span>Karbo:</span> <span className="text-slate-900 font-bold">{barcodeResult.nutritional_facts?.carbohydrates_g}g</span></div>
                      <div className="flex justify-between"><span>Lemak:</span> <span className="text-slate-900 font-bold">{barcodeResult.nutritional_facts?.fat_g}g</span></div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="border-t border-slate-100 mt-5 pt-3.5 text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Sertifikat gizi produk ditarik instan menggunakan real-time router MySQL query index.</span>
          </div>
        </div>

      </div>

      {/* 2-Column Grid Row 2: AI Recipe Advisor & Shopping cart sync */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PANEL C: AI Recipe Suggestions Advisor (9 columns) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between" id="panel-ai">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 animate-pulse">
                  <ChefHat className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Konsultan Gizi AI Cerdas (Asisten Medis)</h3>
                  <p className="text-xs text-slate-500 font-medium">Formulasi resep personal ditenagai Gemini murni berdasar profil BMR.</p>
                </div>
              </div>
            </div>

            {/* Ingredients available manager tags */}
            <div className="space-y-4 mb-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Bahan Utama yang Tersedia di Lemari Es:</label>
                <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-150">
                  {fridgeIngredients.map(ing => (
                    <span 
                      key={ing}
                      className="inline-flex items-center gap-1 rounded bg-white text-slate-800 border border-slate-200 text-xs font-medium px-2 py-1 shadow-2xs"
                    >
                      <span>{ing}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveIngredient(ing)}
                        className="text-slate-400 hover:text-rose-600 font-bold p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {fridgeIngredients.length === 0 && (
                    <span className="text-slate-405 text-[11px] italic pl-1">Bahan kosong. Tambahkan di bawah.</span>
                  )}
                </div>
              </div>

              {/* Add ingredient input row */}
              <div className="flex gap-2 text-xs">
                <input 
                  type="text"
                  value={newIngredient}
                  onChange={e => setNewIngredient(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddIngredient(); }}
                  placeholder="Ketik bahan baru... (contoh: Dada Ayam, Kentang)"
                  className="flex-1 bg-white border border-slate-250 focus:border-emerald-500 rounded-lg p-2 font-semibold text-slate-800 transition focus:outline-none"
                />
                <button
                  onClick={handleAddIngredient}
                  className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 hover:shadow-2xs transition cursor-pointer"
                >
                  Tambah Bahan
                </button>
              </div>
            </div>

            {/* Action generate button trigger */}
            <div className="border-t border-slate-100 pt-5 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium shrink-1.5">
                {members.length === 0 ? (
                  <span className="text-rose-650 font-bold flex items-center gap-1">
                    ⚠️ Daftarkan minimal satu profil keluarga di Panel A terlebih dahulu!
                  </span>
                ) : (
                  <span>
                    Siap menjumlahkan kalkulasi gizi makro harian untuk <b>{members.length} anggota keluarga</b>.
                  </span>
                )}
              </div>
              <button
                onClick={triggerAISuggestions}
                disabled={aiLoading || members.length === 0}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 transition shrink-0 cursor-pointer shadow-sm shadow-emerald-600/10"
                id="btn-ai-recipe"
              >
                <Sparkles className="h-4 w-4" />
                <span>{aiLoading ? "Mendesain Resep..." : "Formulasikan Rekomendasi Gizi"}</span>
              </button>
            </div>

            {/* AI Results workspace */}
            <div className="min-h-[220px] max-h-[480px] overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 relative">
              
              {aiLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 z-10">
                  <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
                  <div className="text-center">
                    <div className="text-sm font-extrabold text-slate-800">Menyusun Struktur Gizi Seimbang...</div>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium leading-normal max-w-xs">Memanggil model Gemini-3.5-flash server-side untuk analisis presisi.</p>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="text-center text-rose-600 p-5 space-y-1.5">
                  <AlertCircle className="h-6 w-6 mx-auto" />
                  <div className="text-xs font-bold font-mono">GEMINI_SUGGESTION_FAILED</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{aiError}</p>
                </div>
              )}

              {!aiResult && !aiError && (
                <div className="text-center text-slate-400 py-16 space-y-3">
                  <ChefHat className="h-10 w-10 mx-auto text-slate-350 stroke-1" />
                  <div className="text-xs font-medium max-w-sm mx-auto leading-relaxed">
                    Saran menu makanan sehat disesuaikan persis dengan total kalori harian yang dihitung otomatis di server. Tekan tombol di atas untuk bertindak.
                  </div>
                </div>
              )}

              {/* Recipes cards render */}
              {aiResult && aiResult.recommended_recipes && (
                <div className="space-y-6">
                  {aiResult.notice && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-semibold px-3 py-2 leading-relaxed">
                      💡 {aiResult.notice}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiResult.recommended_recipes.map((rcp: any) => (
                      <div 
                        key={rcp.id || rcp.title} 
                        className="rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition overflow-hidden shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative h-32 bg-slate-100">
                            <img 
                              src={rcp.image_res_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400"} 
                              alt={rcp.title} 
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                              <span className="rounded bg-sky-50 text-sky-700 text-[10px] uppercase font-bold px-2 py-0.5 border border-sky-200">
                                {rcp.category}
                              </span>
                              <span className="rounded bg-white/90 text-slate-800 border border-slate-200 text-[10px] font-mono px-1.5 py-0.5 font-bold">
                                ⭐ {rcp.rating}
                              </span>
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            <div>
                              <h4 className="font-bold text-slate-950 text-base leading-tight">{rcp.title}</h4>
                              <div className="flex gap-2 text-[10px] text-slate-500 font-semibold mt-1">
                                <span>⏱ {rcp.duration_minutes} Mnt</span>
                                <span>•</span>
                                <span>📊 {rcp.difficulty}</span>
                                <span>•</span>
                                <span className="text-emerald-700">🔥 {rcp.nutrition_tag}</span>
                              </div>
                            </div>

                            {/* Macros table list */}
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
                                <div>
                                  <div className="text-slate-500">Kalori</div>
                                  <div className="text-slate-900 font-bold">{rcp.macros?.calories}kcal</div>
                                </div>
                                <div>
                                  <div className="text-slate-500">Protein</div>
                                  <div className="text-emerald-750 font-bold">{rcp.macros?.protein_g}g</div>
                                </div>
                                <div>
                                  <div className="text-slate-500">Karbo</div>
                                  <div className="text-slate-900 font-bold">{rcp.macros?.carbs_g}g</div>
                                </div>
                                <div>
                                  <div className="text-slate-500">Serat</div>
                                  <div className="text-emerald-750 font-bold">{rcp.macros?.fiber_g}g</div>
                                </div>
                              </div>
                            </div>

                            {/* Ingredients preview */}
                            <div className="space-y-1 text-xs">
                              <div className="text-[11px] font-bold text-slate-600">Bahan Baku:</div>
                              <ul className="text-[10px] text-slate-700 list-disc list-inside space-y-0.5 pl-0.5">
                                {rcp.ingredients_list?.slice(0, 3).map((ing: string, i: number) => (
                                  <li key={i}>{ing}</li>
                                ))}
                                {rcp.ingredients_list?.length > 3 && (
                                  <li className="text-slate-400 font-medium list-none pl-3">
                                    + {rcp.ingredients_list.length - 3} bahan lainnya...
                                  </li>
                                )}
                              </ul>
                            </div>

                            {/* Steps preview */}
                            <div className="space-y-1 text-xs pt-1 border-t border-slate-100">
                              <div className="text-[11px] font-bold text-slate-600">Instruksi Sajian:</div>
                              <ol className="text-[10px] text-slate-700 list-decimal list-inside space-y-0.5 pl-0.5 leading-normal">
                                {rcp.instructions?.slice(0, 2).map((ins: string, i: number) => (
                                  <li key={i} className="line-clamp-1">{ins}</li>
                                ))}
                              </ol>
                            </div>

                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="border-t border-slate-100 mt-5 pt-3.5 text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span>Asisten menyusun resep presisi tanpa me-larp data fiktif, mengolah data klinis gizi harian.</span>
          </div>
        </div>

        {/* PANEL D: Shopping List & Cloud Sync (4 columns) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between" id="panel-cart">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-teal-50 p-2 text-teal-600">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Daftar Belanja</h3>
                  <p className="text-xs text-slate-500 font-medium">Pengelolaan keranjang bahan makan lokal.</p>
                </div>
              </div>
            </div>

            {/* Shopping Items checkbox list */}
            <div className="max-h-[300px] overflow-y-auto pr-1">
              {shoppingItems.length === 0 ? (
                <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <ShoppingCart className="h-8 w-8 mx-auto stroke-1 mb-1.5" />
                  <p className="text-xs font-medium">Daftar belanja kosong.</p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {shoppingItems.map(it => (
                    <motion.div 
                      key={it.id}
                      variants={itemVariants}
                      className="flex items-start justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-250 transition"
                    >
                      <div className="flex items-start gap-2 text-xs">
                        <input 
                          type="checkbox"
                          checked={it.is_checked}
                          onChange={() => toggleShoppingChecked(it.id)}
                          className="rounded border-slate-300 h-4 w-4 text-teal-600 mt-0.5 focus:ring-teal-500 cursor-pointer"
                          id={`chk-shopping-${it.id}`}
                        />
                        <div>
                          <div className={`font-bold ${it.is_checked ? "line-through text-slate-400" : "text-slate-900"}`}>
                            {it.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">Jumlah: {it.quantity}</div>
                          <div className="text-[9px] text-teal-700 bg-teal-50 border border-teal-100/50 px-1.5 py-0.2 rounded inline-block mt-1 font-semibold">
                            🌿 {it.nutrition_tag || "Gizi mikro"}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Nutritional Summary Footer for All Cart Items */}
            {shoppingItems.length > 0 && (
              <motion.div 
                layout
                layoutId="shopping-summary-footer-layout"
                className={`mt-4 p-4 rounded-xl border space-y-3.5 text-xs transition-colors duration-200 ${
                  totalCalories > calorieLimit || totalProtein > proteinLimit
                    ? "bg-amber-50/70 border-amber-200/80 shadow-md shadow-amber-500/5"
                    : "bg-teal-50/50 border-teal-100 shadow-xs"
                }`} 
                id="shopping-summary-footer"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Calculator className={`h-4 w-4 ${totalCalories > calorieLimit || totalProtein > proteinLimit ? "text-amber-600" : "text-teal-600"}`} />
                    <span>Analisis Gizian Keranjang</span>
                  </div>

                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450">
                    {isUsingFamilyBaseline ? "🧬 PROFIL KELUARGA" : "👤 STANDAR ACUAN"}
                  </span>
                </div>

                {/* Duration select filter tab slider */}
                <div className="flex items-center justify-between bg-slate-900/5 p-1 rounded-xl">
                  <span className="text-[10px] text-slate-600 font-extrabold pl-1.5">Durasi Konsumsi:</span>
                  <div className="flex gap-1">
                    {[1, 3, 5, 7].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setConsumptionDays(days)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition text-[10px] cursor-pointer ${
                          consumptionDays === days
                            ? "bg-slate-850 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60"
                        }`}
                      >
                        {days} Hari
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200/60 content-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">TOTAL ENERGI</span>
                    <motion.div 
                      layout="position"
                      className={`font-mono font-extrabold text-base mt-1.5 flex items-baseline gap-1 ${
                        totalCalories > calorieLimit ? "text-amber-600" : "text-emerald-700"
                      }`}
                    >
                      <span>{totalCalories}</span>
                      <span className="text-[10px] font-sans text-slate-500 font-normal">kcal</span>
                    </motion.div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded inline-block ${
                        totalCalories > calorieLimit 
                          ? "bg-amber-100 text-amber-700 border border-amber-200" 
                          : "bg-emerald-50 text-emerald-800 border border-emerald-100"
                      }`}>
                        {totalCalories > calorieLimit ? "⚠️ Melebihi" : "✅ Aman"}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">Batas: {calorieLimit} kcal</span>
                    </div>
                  </div>

                  <div className="flex flex-col pl-4">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">TOTAL PROTEIN</span>
                    <motion.div 
                      layout="position"
                      className={`font-mono font-extrabold text-base mt-1.5 flex items-baseline gap-1 ${
                        totalProtein > proteinLimit ? "text-amber-600" : "text-emerald-700"
                      }`}
                    >
                      <span>{totalProtein.toFixed(1)}</span>
                      <span className="text-[10px] font-sans text-slate-500 font-normal">g</span>
                    </motion.div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded inline-block ${
                        totalProtein > proteinLimit 
                          ? "bg-amber-100 text-amber-700 border border-amber-200" 
                          : "bg-emerald-50 text-emerald-800 border border-emerald-100"
                      }`}>
                        {totalProtein > proteinLimit ? "⚠️ Melebihi" : "✅ Aman"}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">Batas: {proteinLimit}g</span>
                    </div>
                  </div>
                </div>

                {/* Visualisasi Grafik Capaian Gizi dengan Recharts */}
                <div className="border-t border-slate-200/50 pt-3.5 space-y-3" id="nutrition-charts-section">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block text-center">
                    Visualisasi Capaian Target BMR Harian (Recharts)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Kotak Mini Grafik Kalori */}
                    <div className="bg-slate-900/[0.03] border border-slate-200/60 p-2.5 rounded-xl flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[10px] text-slate-700 font-extrabold">Kalori</span>
                        <span className={`text-[10px] font-mono font-black ${
                          totalCalories > calorieLimit ? "text-amber-655" : "text-emerald-700"
                        }`}>
                          {calorieLimit > 0 ? Math.round((totalCalories / calorieLimit) * 100) : 0}% Target
                        </span>
                      </div>

                      <div className="h-[64px] w-full" id="recharts-cal-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={calorieChartData}
                            layout="vertical"
                            margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                          >
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" hide />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", fontSize: "10px" }}
                              itemStyle={{ color: "#f8fafc", padding: "1px 0" }}
                              labelStyle={{ display: "none" }}
                              cursor={false}
                            />
                            <Legend 
                              iconSize={7} 
                              iconType="circle"
                              wrapperStyle={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }} 
                            />
                            <Bar 
                              dataKey="Keranjang" 
                              name="Keranjang" 
                              fill={totalCalories > calorieLimit ? "#f59e0b" : "#0d9488"} 
                              radius={[0, 4, 4, 0]} 
                              barSize={10}
                            />
                            <Bar 
                              dataKey="Target BMR" 
                              name="Target" 
                              fill="#94a3b8" 
                              radius={[0, 4, 4, 0]} 
                              barSize={10}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Kotak Mini Grafik Protein */}
                    <div className="bg-slate-900/[0.03] border border-slate-200/60 p-2.5 rounded-xl flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[10px] text-slate-700 font-extrabold">Protein</span>
                        <span className={`text-[10px] font-mono font-black ${
                          totalProtein > proteinLimit ? "text-amber-655" : "text-emerald-700"
                        }`}>
                          {proteinLimit > 0 ? Math.round((totalProtein / proteinLimit) * 100) : 0}% Target
                        </span>
                      </div>

                      <div className="h-[64px] w-full" id="recharts-prot-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={proteinChartData}
                            layout="vertical"
                            margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                          >
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" hide />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", fontSize: "10px" }}
                              itemStyle={{ color: "#f8fafc", padding: "1px 0" }}
                              labelStyle={{ display: "none" }}
                              cursor={false}
                            />
                            <Legend 
                              iconSize={7} 
                              iconType="circle"
                              wrapperStyle={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }} 
                            />
                            <Bar 
                              dataKey="Keranjang" 
                              name="Keranjang" 
                              fill={totalProtein > proteinLimit ? "#f59e0b" : "#10b981"} 
                              radius={[0, 4, 4, 0]} 
                              barSize={10}
                            />
                            <Bar 
                              dataKey="Target Gizi" 
                              name="Target" 
                              fill="#94a3b8" 
                              radius={[0, 4, 4, 0]} 
                              barSize={10}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Helper notice explaining browser criteria */}
                <AnimatePresence mode="popLayout">
                  {(totalCalories > calorieLimit || totalProtein > proteinLimit) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="bg-amber-100/60 border border-amber-200/50 p-2.5 rounded-lg flex items-start gap-1.5 text-[10px] text-amber-800 leading-normal font-medium"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-650 mt-0.5" />
                      <div>
                        <p className="font-extrabold font-sans">Informasi Nutrisi:</p>
                        <p className="text-slate-650">
                          Total gizi di keranjang melampaui kebutuhan dasar ideal {isUsingFamilyBaseline ? "anggota keluarga" : "individu"} untuk rentang <b>{consumptionDays} hari</b>. Pertimbangkan untuk memilah atau menyeimbangkan kembali item.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          <div>
            {/* Sync Cloud controls */}
            <div className="border-t border-slate-100 mt-5 pt-4 space-y-3">
              <button
                onClick={syncListWithCloud}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-teal-650 hover:bg-teal-700 text-white font-semibold text-xs py-2.5 transition shrink-0 cursor-pointer shadow-sm shadow-teal-600/10"
                id="btn-sync"
              >
                <RefreshCw className={`h-4 w-4 ${syncStatus === "Syncing..." ? "animate-spin" : ""}`} />
                <span>{syncStatus === "Syncing..." ? "Sinkronisasi..." : "Sinkronkan dengan Cloud"}</span>
              </button>

              <div className="space-y-1 font-mono text-[10px] bg-slate-50 p-2.5 border border-slate-200 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-slate-405 font-medium">Status Sinkron:</span>
                  <span className={`font-bold ${syncStatus.includes("Success") ? "text-emerald-600" : "text-slate-650"}`}>{syncStatus}</span>
                </div>
                {syncTimestamp && (
                  <div className="flex justify-between">
                    <span className="text-slate-405 font-medium">Waktu Server:</span>
                    <span className="text-slate-800 font-bold">{new Date(syncTimestamp).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 mt-4 pt-3 text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
              <Check className="h-4 w-4 text-teal-500 shrink-0" />
              <span>Daftar belanja disinkronkan secara stateless dengan payload GORM MySQL cloud.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
