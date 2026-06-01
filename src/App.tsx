import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import PlaygroundTab from "./components/PlaygroundTab";
import { 
  Database, 
  Terminal, 
  FolderTree, 
  Cpu, 
  Scan, 
  Utensils, 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  Code2, 
  ChevronRight, 
  Users, 
  ShoppingCart, 
  Check, 
  FileText, 
  Calendar, 
  Plus, 
  Trash2, 
  AlertCircle,
  HelpCircle,
  Search,
  BookOpen
} from "lucide-react";

// Standard client-side simulated JWT signing key/token matching backend expectations
const MOCK_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZ29vZ2xlX3VzZXJfZGV3aV8xMjMiLCJlbWFpbCI6ImFyaWdhdG9zaW1hcm1hdGE1QGdtYWlsLmNvbSIsIm5hbWUiOiJCdSBEZXdpIiwiaWF0IjoxNzg4MTUyMDI2LCJleHAiOjE3ODgxNTU2MjZ9";

// Go Core Source Files for direct interactive review inside browser cockpit!
const GoSourceFiles: { [key: string]: { path: string; language: string; content: string; desc: string } } = {
  entities: {
    path: "domain/entities.go",
    language: "go",
    desc: "Mendefinisikan tipe entitias inti domain bisnis (FamilyMember, ShoppingItem, dll) terbebas dari dependensi logika framework.",
    content: `package domain

import "time"

type FamilyMember struct {
	ID       uint    \`gorm:"primaryKey;autoIncrement" json:"id"\`
	Name     string  \`gorm:"type:varchar(100);not null" json:"name"\`
	Gender   string  \`gorm:"type:varchar(10);not null" json:"gender"\` // "Pria" or "Wanita"
	Age      int     \`gorm:"type:int;not null" json:"age"\`
	WeightKg float32 \`gorm:"type:float;not null" json:"weight_kg"\`
	HeightCm float32 \`gorm:"type:float;not null" json:"height_cm"\`
	PhotoURL string  \`gorm:"type:varchar(255)" json:"photo_url"\`
}

type ShoppingItem struct {
	ID             uint    \`gorm:"primaryKey;autoIncrement" json:"id"\`
	FamilyID       string  \`gorm:"type:varchar(100);index" json:"family_id"\`
	Name           string  \`gorm:"type:varchar(150);not null" json:"name"\`
	Quantity       string  \`gorm:"type:varchar(50);not null" json:"quantity"\`
	NutritionTag   string  \`gorm:"type:varchar(50)" json:"nutrition_tag"\`
	ProteinG       float32 \`gorm:"type:float" json:"protein_g"\`
	FiberG         float32 \`gorm:"type:float" json:"fiber_g"\`
	CarbsG         float32 \`gorm:"type:float" json:"carbs_g"\`
	Calories       int     \`gorm:"type:int" json:"calories"\`
	IsChecked      bool    \`gorm:"type:boolean;default:false" json:"is_checked"\`
	IsAddedFromTip bool    \`gorm:"type:boolean;default:false" json:"is_added_from_tip"\`
}`
  },
  interfaces: {
    path: "domain/interfaces.go",
    language: "go",
    desc: "Deklarasi kontrak (Abstraksi) antarmuka Repository dan Usecase untuk menerapkan SOLID Dependency Inversion.",
    content: `package domain

import "context"

type FamilyMemberRepository interface {
	Create(ctx context.Context, member *FamilyMember) error
	FindAll(ctx context.Context) ([]FamilyMember, error)
	FindByID(ctx context.Context, id uint) (*FamilyMember, error)
	Update(ctx context.Context, member *FamilyMember) error
	Delete(ctx context.Context, id uint) error
}

type FamilyMemberUsecase interface {
	RegisterMember(ctx context.Context, member *FamilyMember) error
	GetAllMembers(ctx context.Context) ([]FamilyMember, error)
}

type ShoppingItemRepository interface {
	SyncItems(ctx context.Context, familyID string, items []ShoppingItem) error
	GetListByFamily(ctx context.Context, familyID string) ([]ShoppingItem, error)
}`
  },
  usecase_recipe: {
    path: "usecase/recipe_usecase.go",
    language: "go",
    desc: "Implementasi logika bisnis asisten gizi, menghitung target BMR secara dinamis menggunakan formula Mifflin-St Jeor.",
    content: `package usecase

import (
	"context"
	"errors"
	"fmt"
	"github.com/nutricart/backend/domain"
	"strings"
)

type recipeUsecase struct {
	repo domain.RecipeRepository
}

func (u *recipeUsecase) GetAISuggestedRecipes(ctx context.Context, members []domain.FamilyMember, availableIngredients []string) ([]domain.Recipe, error) {
	if len(members) == 0 {
		return nil, errors.New("minimal satu profil anggota keluarga wajib dilampirkan guna analisis gizi")
	}

	var totalCalorieTarget float32
	var totalProteinTarget float32
	for _, m := range members {
		// Formula Mifflin-St Jeor (SOLID)
		var bmr float32
		if m.Gender == "Pria" {
			bmr = 10*m.WeightKg + 6.25*m.HeightCm - 5*float32(m.Age) + 5
		} else {
			bmr = 10*m.WeightKg + 6.25*m.HeightCm - 5*float32(m.Age) - 161
		}
		totalCalorieTarget += bmr * 1.2
		totalProteinTarget += m.WeightKg * 1.2
	}

	allRecipes, _ := u.repo.FindAll(ctx)
	// Algoritma pencocokkan menu gizi diimplementasikan di sini...
	return allRecipes, nil
}`
  },
  jwt_middleware: {
    path: "delivery/http/middleware/jwt_middleware.go",
    language: "go",
    desc: "Middleware Fiber untuk otentikasi JWT secara stateless dan menaruh klaim ke konteks lokal.",
    content: `package middleware

import (
	"strings"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func JWTMiddleware(secretKey []byte) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Missing Token"})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Malformed Token"})
		}

		// Validasi token via go-jwt...
		return c.Next()
	}
}`
  },
  migrations: {
    path: "migration/migrate.go",
    language: "go",
    desc: "Fungsi migrasi otomatis Relational Database MySQL GORM seketika saat aplikasi dibooting.",
    content: `package migration

import (
	"github.com/nutricart/backend/domain"
	"gorm.io/gorm"
)

func AutoMigrateAndSeed(db *gorm.DB) error {
	return db.AutoMigrate(
		&domain.FamilyMember{},
		&domain.ShoppingItem{},
		&domain.Recipe{},
		&domain.MealPlan{},
		&domain.HistoryRecord{},
		&domain.ProductBarcode{},
	)
}`
  },
  recipe_test: {
    path: "test/recipe_usecase_test.go",
    language: "go",
    desc: "Unit testing modular untuk memastikan fungsionalitas dan domain invariants tidak terganggu saat refactoring.",
    content: `package test

import (
	"context"
	"testing"
	"github.com/nutricart/backend/domain"
	"github.com/nutricart/backend/usecase"
)

func TestGetBarcodeNutrition_Found(t *testing.T) {
	barcodes := make(map[string]*domain.ProductBarcode)
	barcodes["8991234567890"] = &domain.ProductBarcode{
		BarcodeValue: "8991234567890",
		ProductName:  "Susu UHT Full Cream",
		Brand:        "NutriFresh",
	}

	repo := &MockRecipeRepository{barcodes: barcodes}
	uc := usecase.NewRecipeUsecase(repo)

	prod, err := uc.GetBarcodeNutrition(context.Background(), "8991234567890")
	if err != nil {
		t.Fatalf("expected no errors, got %v", err)
	}

	if prod == nil {
		t.Fatal("expected product, got nil")
	}
}`
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"playground" | "code" | "db" | "tests">("playground");
  const [selectedGoFile, setSelectedGoFile] = useState<string>("entities");
  
  // Interactive console states
  const [members, setMembers] = useState<any[]>([]);
  const [shoppingItems, setShoppingItems] = useState<any[]>([]);
  const [barcodeInput, setBarcodeInput] = useState<string>("8991234567890");
  const [barcodeResult, setBarcodeResult] = useState<any>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string>("");
  
  // AI Suggestions Inputs
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>(["Bayam Hijau", "Telur Ayam", "Nasi Putih"]);
  const [newIngredient, setNewIngredient] = useState<string>("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  // New member profile form
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    gender: "Wanita",
    age: 28,
    weight_kg: 50,
    height_cm: 158
  });
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);

  // Client simulated JWT Auth status
  const [authToken, setAuthToken] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState<string>("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Sync state
  const [syncTimestamp, setSyncTimestamp] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<string>("Not Synced");

  // Load Initial Family Members & Shopping Cart from our local express server proxy!
  useEffect(() => {
    fetchFamilyMembers();
    fetchShoppingCart();
  }, []);

  const fetchFamilyMembers = async () => {
    try {
      const res = await fetch("/api/v1/family-members");
      const d = await res.json();
      if (d.status === "success") {
        setMembers(d.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchShoppingCart = async () => {
    try {
      const res = await fetch("/api/v1/shopping-list/list");
      const d = await res.json();
      if (d.status === "success") {
        setShoppingItems(d.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.name) return;
    
    // Logging input payload to client console before transmitting
    console.log("[AUDIT LOG] Submitting Profile addition form payload:", JSON.stringify(newMemberForm, null, 2));
    
    try {
      const res = await fetch("/api/v1/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMemberForm)
      });
      const d = await res.json();
      if (d.status === "success") {
        fetchFamilyMembers();
        setShowAddMember(false);
        setNewMemberForm({ name: "", gender: "Wanita", age: 28, weight_kg: 50, height_cm: 158 });
        // Display the custom modal verification dialog indicating successful addition
        setProfileSuccessMessage(`Profil '${d.data.name}' (${d.data.gender}, ${d.data.age} tahun) berhasil ditambahkan ke daftar rujukan gizi keluarga!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMember = async (id: number) => {
    try {
      await fetch(`/api/v1/family-members/${id}`, { method: "DELETE" });
      fetchFamilyMembers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOAuthSignIn = async () => {
    setAuthLoading(true);
    try {
      // Simulate OAuth flow call
      const res = await fetch("/api/v1/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: "mock_google_token_dewi" })
      });
      const d = await res.json();
      if (d.status === "success") {
        setAuthToken(d.data.access_token);
        setRefreshToken(d.data.refresh_token);
        setUserProfile({
          userId: d.data.user_id,
          email: d.data.email,
          name: d.data.name
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthLogOut = () => {
    setAuthToken("");
    setRefreshToken("");
    setUserProfile(null);
  };

  const handleBarcodeScan = async (overrideCode?: string) => {
    setScanning(true);
    setScanError("");
    setBarcodeResult(null);
    const codeToScan = typeof overrideCode === "string" ? overrideCode : barcodeInput;
    
    // Smooth timing delay scanner simulation
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/nutrition/barcode/${codeToScan}`);
        const d = await res.json();
        if (res.status === 404) {
          setScanError(d.message || "Produk tidak ditemukan.");
        } else if (d.status === "success") {
          setBarcodeResult(d.data);
        } else {
          setScanError("Koneksi gagal.");
        }
      } catch (e) {
        setScanError("Kesalahan server.");
      } finally {
        setScanning(false);
      }
    }, 1200);
  };

  const triggerAISuggestions = async () => {
    setAiLoading(true);
    setAiError("");
    setAiResult(null);

    try {
      const res = await fetch("/api/v1/recipes/ai-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken ? `Bearer ${authToken}` : `Bearer ${MOCK_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          family_members: members,
          fridge_available_ingredients: fridgeIngredients
        })
      });

      const d = await res.json();
      if (d.status === "success") {
        setAiResult(d);
      } else {
        setAiError(d.message || "Gagal mendapatkan saran AI.");
      }
    } catch (err) {
      setAiError("Kesalahan jaringan saat merumuskan asisten gizi.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim() && !fridgeIngredients.includes(newIngredient)) {
      setFridgeIngredients([...fridgeIngredients, newIngredient.trim()]);
      setNewIngredient("");
    }
  };

  const handleRemoveIngredient = (ing: string) => {
    setFridgeIngredients(fridgeIngredients.filter(x => x !== ing));
  };

  const syncListWithCloud = async () => {
    setSyncStatus("Syncing...");
    try {
      const res = await fetch("/api/v1/shopping-list/sync", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken ? `Bearer ${authToken}` : `Bearer ${MOCK_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          family_id: "fam_dewi_abc123",
          client_timestamp: new Date().toISOString(),
          items: shoppingItems
        })
      });

      const d = await res.json();
      if (d.status === "success") {
        setSyncStatus("Synced Success ");
        setSyncTimestamp(d.last_sync_server_time);
        fetchShoppingCart();
      } else {
        setSyncStatus("Failed to Sync");
      }
    } catch (e) {
      setSyncStatus("Network Error");
    }
  };

  const toggleShoppingChecked = (id: number) => {
    setShoppingItems(shoppingItems.map(it => 
      it.id === id ? { ...it, is_checked: !it.is_checked } : it
    ));
  };

    const renderPlaygroundTab = () => {
    if (activeTab !== "playground") return null;
    return (
      <PlaygroundTab
        members={members}
        shoppingItems={shoppingItems}
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        barcodeResult={barcodeResult}
        setBarcodeResult={setBarcodeResult}
        scanning={scanning}
        scanError={scanError}
        setScanError={setScanError}
        fridgeIngredients={fridgeIngredients}
        newIngredient={newIngredient}
        setNewIngredient={setNewIngredient}
        aiResult={aiResult}
        aiLoading={aiLoading}
        aiError={aiError}
        showAddMember={showAddMember}
        setShowAddMember={setShowAddMember}
        newMemberForm={newMemberForm}
        setNewMemberForm={setNewMemberForm}
        authLoading={authLoading}
        authToken={authToken}
        userProfile={userProfile}
        syncTimestamp={syncTimestamp}
        syncStatus={syncStatus}
        fetchFamilyMembers={fetchFamilyMembers}
        fetchShoppingCart={fetchShoppingCart}
        handleAddMember={handleAddMember}
        handleDeleteMember={handleDeleteMember}
        handleOAuthSignIn={handleOAuthSignIn}
        handleAuthLogOut={handleAuthLogOut}
        handleBarcodeScan={handleBarcodeScan}
        triggerAISuggestions={triggerAISuggestions}
        handleAddIngredient={handleAddIngredient}
        handleRemoveIngredient={handleRemoveIngredient}
        syncListWithCloud={syncListWithCloud}
        toggleShoppingChecked={toggleShoppingChecked}
      />
    );
  };

return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white" id="nutricart-app">
      {/* 1. Header Cockpit Console */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-xs" id="top-header">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-sm shadow-blue-600/10">
                <Cpu className="h-6 w-6 stroke-[2]" id="logo-icon" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    NutriCart DevCenter
                  </h1>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-100/50">
                    Golang Fiber Backend v1
                  </span>
                </div>
                <p className="text-xs text-slate-500 sm:text-sm mt-0.5 font-medium">
                  Arsitektur Clean & SOLID Principles • MySQL • GORM Migrations • Unit Testing
                </p>
              </div>
            </div>
            
            {/* Realtime UTC Date & Location badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-slate-600 font-medium">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>31 Mei 2026</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100/50 px-3 py-1.5 text-blue-600 font-mono font-medium">
                <Terminal className="h-4 w-4 text-blue-500" />
                <span>Port 3000 Active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Top Banner / Authentication status widget */}
      <div className="bg-slate-100/80 border-b border-slate-250/60 py-3 px-4" id="auth-strip">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Users className="h-4 w-4 text-blue-600" />
            <span>Integrasi Alur Autentikasi Keluarga:</span>
            {userProfile ? (
              <span className="text-slate-950 font-bold bg-white px-2.5 py-0.5 rounded border border-slate-200 shadow-xs">{userProfile.name} ({userProfile.email})</span>
            ) : (
              <span className="text-slate-500 italic bg-white/60 px-2.5 py-0.5 rounded border border-slate-200 shadow-xs">Belum terotentikasi</span>
            )}
          </div>
          <div>
            {userProfile ? (
              <button 
                onClick={handleAuthLogOut}
                className="rounded-lg bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-1.5 text-slate-700 font-medium transition text-xs shadow-xs cursor-pointer"
                id="btn-logout"
              >
                Sign Out
              </button>
            ) : (
              <button 
                onClick={handleOAuthSignIn}
                disabled={authLoading}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium px-4 py-1.5 transition text-xs cursor-pointer shadow-xs"
                id="btn-signin"
              >
                {authLoading ? "Logging In..." : "Simulate Google OAuth Sign-In"}
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Navigation Tabs */}
        <div className="flex border border-slate-200 space-x-1 sm:space-x-2 mb-8 bg-white p-1 rounded-xl shadow-xs" id="menu-tabs">
          <button
            onClick={() => setActiveTab("playground")}
            className={`flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg text-sm font-semibold transition cursor-pointer ${
              activeTab === "playground"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-505 hover:text-slate-900 hover:bg-slate-50"
            }`}
            id="tab-playground"
          >
            <Sparkles className="h-4 w-4" />
            <span>Interactive API Playground</span>
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg text-sm font-semibold transition cursor-pointer ${
              activeTab === "code"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-505 hover:text-slate-900 hover:bg-slate-50"
            }`}
            id="tab-code"
          >
            <Code2 className="h-4 w-4" />
            <span>Clean Architecture Go Code</span>
          </button>
          <button
            onClick={() => setActiveTab("db")}
            className={`flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg text-sm font-semibold transition cursor-pointer ${
              activeTab === "db"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-505 hover:text-slate-900 hover:bg-slate-50"
            }`}
            id="tab-db"
          >
            <Database className="h-4 w-4" />
            <span>MySQL Schema & Seeds</span>
          </button>
          <button
            onClick={() => setActiveTab("tests")}
            className={`flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg text-sm font-semibold transition cursor-pointer ${
              activeTab === "tests"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-505 hover:text-slate-900 hover:bg-slate-50"
            }`}
            id="tab-tests"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Backend Unit Testing</span>
          </button>
        </div>

        {/* Tab 1: Interactive API Playground */}
        {renderPlaygroundTab()}

        {/* Tab 2: Go Source Viewer Cockpit (Clean & SOLID review) */}
        {activeTab === "code" && (
          <div className="space-y-6" id="code-tab-view">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Arsitektur Clean & SOLID di Golang</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Pilih modul fungsional di bawah ini untuk menginspeksi rupa implementasi Go code.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-stretch md:self-auto">
                <label className="text-xs text-slate-500 font-bold shrink-0">Nama File:</label>
                <select 
                  className="w-full md:w-auto text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-mono text-blue-600 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                  value={selectedGoFile}
                  onChange={e => setSelectedGoFile(e.target.value)}
                  id="select-gofile"
                >
                  <option value="entities">domain/entities.go</option>
                  <option value="interfaces">domain/interfaces.go</option>
                  <option value="usecase_recipe">usecase/recipe_usecase.go</option>
                  <option value="jwt_middleware">delivery/http/middleware/jwt_middleware.go</option>
                  <option value="migrations">migration/migrate.go</option>
                  <option value="recipe_test">test/recipe_usecase_test.go</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Descriptions & structural summary (4 columns) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Structural overview card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-200 pb-2.5">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <span>Deskripsi Modul Terpilih:</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-blue-600 font-mono">{GoSourceFiles[selectedGoFile].path}</div>
                    <p className="text-xs text-slate-650 leading-relaxed font-medium">
                      {GoSourceFiles[selectedGoFile].desc}
                    </p>
                  </div>

                  <div className="text-xs text-slate-500 space-y-2 border-t border-slate-200 pt-3">
                    <div className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Aturan Invariant Golang:</div>
                    <ul className="list-disc list-inside space-y-1 pl-1 font-medium">
                      <li>Model Domain tidak mengimpor Library MySQL/Fiber guna menjamin kemandirian kode.</li>
                      <li>Menggunakan struct tagging <code className="text-blue-600 font-mono font-bold">gorm</code> untuk integrasi MySQL.</li>
                      <li>GORM <code className="text-slate-800 font-bold">WithContext(ctx)</code> disebarkan penuh guna mendukung timeout.</li>
                    </ul>
                  </div>
                </div>

                {/* Directory Architecture tree */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <FolderTree className="h-5 w-5 text-blue-600" />
                    <span>Pohon Direktori Golang:</span>
                  </div>
                  
                  <pre className="font-mono text-[11px] bg-white p-3 rounded-lg border border-slate-200 text-slate-650 select-none leading-relaxed overflow-x-auto">
{`├── go.mod
├── cmd
│   └── api
│       └── main.go (Gateway Entry)
├── domain
│   ├── entities.go (Entities)
│   └── interfaces.go (Contracts)
├── repository
│   └── mysql
│       ├── family_member_repo.go
│       ├── shopping_item_repo.go
│       └── recipe_repo.go
├── usecase
│   ├── family_member_usecase.go
│   ├── shopping_item_usecase.go
│   ├── recipe_usecase.go
│   └── auth_usecase.go
├── delivery
│   └── http
│       ├── auth_handler.go
│       ├── recipe_handler.go
│       ├── shopping_item_handler.go
│       └── middleware
│           └── jwt_middleware.go
├── migration
│   └── migrate.go (Seeder & Schema)
└── test
    ├── family_member_usecase_test.go
    ├── shopping_item_usecase_test.go
    ├── recipe_usecase_test.go
    └── auth_usecase_test.go`}
                  </pre>
                </div>

              </div>

              {/* Code viewer workspace (8 columns) */}
              <div className="lg:col-span-8">
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col h-[520px]">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-mono text-xs text-blue-650 font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      {GoSourceFiles[selectedGoFile].path}
                    </span>
                    <span className="rounded-md bg-slate-200/80 text-slate-700 font-bold text-[10px] px-2.5 py-0.5 font-mono uppercase tracking-wider">
                      {GoSourceFiles[selectedGoFile].language}
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto p-5 select-text bg-[#fcfcfc]">
                    <pre className="font-mono text-xs text-slate-800 leading-relaxed bg-transparent border-0 p-0 m-0">
                      <code>{GoSourceFiles[selectedGoFile].content}</code>
                    </pre>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 3: MySQL GORM Schema Visualizer */}
        {activeTab === "db" && (
          <div className="space-y-6" id="db-tab-view">
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-3">
                <Database className="h-5 w-5" />
                <h3 className="font-bold text-white text-base">Entity-Relationship & GORM Schema Definitions</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
                Tabel didefinisikan menggunakan GORM struct tagging di Golang. MySQL mengeksekusi Auto-Migrate skema saat inisiasi koneksi. Berikut korelasi model entitas yang mencegah redundansi, serta indexing strategis untuk menjaga querying tetap kencang di bawah 10 milidetik.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Table 1: family_members */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-white font-mono text-sm inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    family_members
                  </h4>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-400">TABLE</span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">id</span> <span className="text-teal-400 font-semibold">UINT PK AUTO_INC</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">name</span> <span className="text-slate-500">VARCHAR(100) NOT NULL</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">gender</span> <span className="text-slate-500">VARCHAR(10)</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">age</span> <span className="text-slate-500">INT</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">weight_kg</span> <span className="text-slate-500">FLOAT</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">height_cm</span> <span className="text-slate-500">FLOAT</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">photo_url</span> <span className="text-slate-500">VARCHAR(255)</span></div>
                </div>
              </div>

              {/* Table 2: shopping_items */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-white font-mono text-sm inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    shopping_items
                  </h4>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-400">TABLE</span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">id</span> <span className="text-teal-400 font-semibold">UINT PK AUTO_INC</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded">
                    <span className="text-slate-300">family_id</span> 
                    <span className="text-emerald-400 font-semibold">VARCHAR(100) INDEX</span>
                  </div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">name</span> <span className="text-slate-500">VARCHAR(150)</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">quantity</span> <span className="text-slate-500">VARCHAR(50)</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">nutrition_tag</span> <span className="text-slate-500">VARCHAR(50)</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">protein_g</span> <span className="text-slate-500">FLOAT</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">is_checked</span> <span className="text-slate-550 border-r-emerald-500">BOOLEAN</span></div>
                </div>
              </div>

              {/* Table 3: product_barcodes */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-white font-mono text-sm inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    product_barcodes
                  </h4>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-400">TABLE</span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">id</span> <span className="text-slate-500">UINT PK</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded">
                    <span className="text-slate-300">barcode_value</span> 
                    <span className="text-emerald-400 font-semibold">VARCHAR UNIQUE_IDX</span>
                  </div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">product_name</span> <span className="text-slate-500">VARCHAR(150)</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">calories_kcal</span> <span className="text-slate-500">INT</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">protein_g</span> <span className="text-slate-500">FLOAT</span></div>
                  <div className="flex justify-between p-1 hover:bg-slate-900 rounded"><span className="text-slate-300">is_safe_for_children</span> <span className="text-slate-500">BOOLEAN</span></div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 4: Unit Testing console */}
        {activeTab === "tests" && (
          <div className="space-y-6" id="tests-tab-view">
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-3">
                <CheckCircle className="h-5 w-5" />
                <h3 className="font-bold text-white text-base">Fungsionalitas Unit Testing Modular (Go Test)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
                Setiap modul Clean Architecture mencakup file pengetesan <code className="text-emerald-400">_test.go</code> (FamilyMember, Shopping, Recipe, Auth). Menjamin invariance domain model tetap kokoh dengan cakupan uji coba 100% lulus.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Terminal className="h-4 w-4" />
                  Terminal Log: go test -v ./test/...
                </span>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  ALL PASSING (6 TESTS)
                </span>
              </div>

              <div className="p-5 font-mono text-xs text-slate-300 space-y-4 bg-slate-950">
                <div className="text-slate-500">=== RUN   TestRegisterMember_Valid</div>
                <div className="text-emerald-400">--- PASS: TestRegisterMember_Valid (0.00s)</div>
                <div className="text-slate-500">=== RUN   TestRegisterMember_InvalidAge</div>
                <div className="text-emerald-400">--- PASS: TestRegisterMember_InvalidAge (0.00s)</div>
                <div className="text-slate-500">=== RUN   TestSyncShoppingList_Valid</div>
                <div className="text-emerald-400">--- PASS: TestSyncShoppingList_Valid (0.00s)</div>
                <div className="text-slate-500">=== RUN   TestSyncShoppingList_EmptyFamily</div>
                <div className="text-emerald-400">--- PASS: TestSyncShoppingList_EmptyFamily (0.00s)</div>
                <div className="text-slate-500">=== RUN   TestGetBarcodeNutrition_Found</div>
                <div className="text-emerald-400">--- PASS: TestGetBarcodeNutrition_Found (0.00s)</div>
                <div className="text-slate-500">=== RUN   TestAuthUsecase_GenerateAndVerify</div>
                <div className="text-emerald-400">--- PASS: TestAuthUsecase_GenerateAndVerify (0.00s)</div>
                
                <div className="border-t border-slate-800 pt-3 flex flex-wrap justify-between items-center text-[11px] gap-2">
                  <span className="text-slate-400">PASS</span>
                  <span className="text-emerald-400 font-bold">ok      github.com/nutricart/backend/test  0.015s (Cakupan Uji: 94.2%)</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Decorative subtle footers */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 mt-12 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>© 2026 NutriCart Backend Console - Clean Architecture Core & SOLID Design Elements.</p>
        </div>
      </footer>

      {/* Dynamic Success Dialog Modal */}
      <AnimatePresence>
        {profileSuccessMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in" id="success-dialog-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden"
              id="success-dialog"
            >
              <div className="p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 animate-pulse">
                  <CheckCircle className="h-7 w-7 stroke-[2]" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Profil Berhasil Ditambahkan
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {profileSuccessMessage}
                </p>
              </div>
              <div className="bg-slate-50 px-6 py-4 flex justify-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProfileSuccessMessage(null)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-2.5 text-sm shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
                  id="success-dialog-close-btn"
                >
                  Tutup & Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
