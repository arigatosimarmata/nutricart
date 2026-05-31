import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory data mimicking MySQL database schemas for interactive demo console
let familyMembers = [
  { id: 1, name: "Bu Dewi", gender: "Wanita", age: 35, weight_kg: 55, height_cm: 160, photo_url: "" },
  { id: 2, name: "Anak 1 (Budi)", gender: "Pria", age: 8, weight_kg: 25, height_cm: 120, photo_url: "" }
];

let shoppingCart = [
  { id: 1, family_id: "fam_dewi_abc123", name: "Bayam Hijau", quantity: "2 Ikat", nutrition_tag: "Sumber Zat Besi", protein_g: 4.0, fiber_g: 10.0, carbs_g: 6.0, calories: 80, is_checked: true, is_added_from_tip: false },
  { id: 2, family_id: "fam_dewi_abc123", name: "Telur Ayam", quantity: "1 Kg", nutrition_tag: "Tinggi Protein", protein_g: 60.0, fiber_g: 0.0, carbs_g: 5.0, calories: 700, is_checked: false, is_added_from_tip: false },
];

let barcodesDb: { [key: string]: any } = {
  "8991234567890": {
    barcode_value: "8991234567890",
    product_name: "Susu UHT Full Cream (1L)",
    brand: "NutriFresh",
    packing_size: "1 Liter",
    nutritional_facts: {
      calories_kcal: 600,
      protein_g: 32.0,
      carbohydrates_g: 48.0,
      fat_g: 32.0,
      fiber_g: 0.0,
      dominant_tag: "Tinggi Kalsium"
    },
    is_safe_for_children: true
  },
  "8990001234567": {
    barcode_value: "8990001234567",
    product_name: "Keripik Kentang Renyah Bergaram",
    brand: "Chippy",
    packing_size: "100 Gram",
    nutritional_facts: {
      calories_kcal: 540,
      protein_g: 5.0,
      carbohydrates_g: 52.0,
      fat_g: 34.0,
      fiber_g: 3.0,
      dominant_tag: "Tinggi Natrium & Lemak Jenuh"
    },
    is_safe_for_children: false
  }
};

// Simulated JWT Access + Refresh Session
const MOCK_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZ29vZ2xlX3VzZXJfZGV3aV8xMjMiLCJlbWFpbCI6ImFyaWdhdG9zaW1hcm1hdGE1QGdtYWlsLmNvbSIsIm5hbWUiOiJCdSBEZXdpIiwiaWF0IjoxNzg4MTUyMDI2LCJleHAiOjE3ODgxNTU2MjZ9";
const MOCK_REFRESH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZ29vZ2xlX3VzZXJfZGV3aV8xMjMiLCImY2xpZW50X3RpbWVzdGFtcCI6IjIwMjYtMDUtMzFUMDM6MjA6MjZaIn0";

// --- API LAYER CONTROLLERS (REST CONTRACTS) ---

// 1. Google OAuth Authentication Simulate
app.post("/api/v1/auth/google", (req, res) => {
  const { id_token } = req.body;
  if (!id_token) {
    return res.status(400).json({
      status: "error",
      error_code: "MISSING_ID_TOKEN",
      message: "Google id_token wajib disertakan."
    });
  }

  return res.status(200).json({
    status: "success",
    data: {
      user_id: "google_user_dewi_123",
      email: "arigatosimarmata5@gmail.com",
      name: "Bu Dewi",
      access_token: MOCK_ACCESS_TOKEN,
      refresh_token: MOCK_REFRESH_TOKEN
    }
  });
});

// Auth token refresh simulation
app.post("/api/v1/auth/refresh", (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token || refresh_token !== MOCK_REFRESH_TOKEN) {
    return res.status(401).json({
      status: "error",
      error_code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token tidak valid atau telah kedaluwarsa."
    });
  }

  return res.status(200).json({
    status: "success",
    data: {
      access_token: MOCK_ACCESS_TOKEN
    }
  });
});

// 2. Barcode Scanning Nutrition Fact Provider
app.get("/api/v1/nutrition/barcode/:barcode_val", (req, res) => {
  const { barcode_val } = req.params;
  const product = barcodesDb[barcode_val];

  if (!product) {
    return res.status(404).json({
      status: "error",
      error_code: "BARCODE_NOT_FOUND",
      message: "Kode barcode produk belum terdaftar dalam basis gizi rujukan nasional."
    });
  }

  return res.json({
    status: "success",
    data: product
  });
});

// Custom Barcode addition to help playground
app.post("/api/v1/nutrition/barcode", (req, res) => {
  const { barcode_value, product_name, brand, packing_size, nutritional_facts, is_safe_for_children } = req.body;
  if (!barcode_value || !product_name) {
    return res.status(400).json({ status: "error", message: "Barcode value and product name required" });
  }

  barcodesDb[barcode_value] = {
    barcode_value,
    product_name,
    brand: brand || "Generic",
    packing_size: packing_size || "1 Unit",
    nutritional_facts: nutritional_facts || {
      calories_kcal: 150,
      protein_g: 5,
      carbohydrates_g: 20,
      fat_g: 5,
      fiber_g: 1,
      dominant_tag: "Custom Tag"
    },
    is_safe_for_children: is_safe_for_children !== undefined ? is_safe_for_children : true
  };

  return res.status(201).json({ status: "success", data: barcodesDb[barcode_value] });
});

// 3. AISuggestRecipes Endpoint (Using Server-Side Gemini API SDK)
app.post("/api/v1/recipes/ai-suggest", async (req, res) => {
  const { family_members, fridge_available_ingredients } = req.body;

  if (!family_members || family_members.length === 0) {
    return res.status(400).json({
      status: "error",
      error_code: "EMPTY_FAMILY_MEMBERS",
      message: "Daftar profil keluarga tidak boleh kosong untuk memformulasikan nutrisi asisten cerdas."
    });
  }

  const ingredientsList = fridge_available_ingredients || [];

  // Initialize server-side Gemini client
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY" || geminiKey === "") {
    // Premium Simulated fallback when API key is missing, ensuring high resilience (SOLID)
    const mealName = ingredientsList.length > 0 ? ingredientsList.join(" & ") : "Soto Ayam Campur";
    return res.json({
      status: "success",
      generated_at: new Date().toISOString(),
      recommended_recipes: [
        {
          id: 101,
          title: `Tumis Sehat NutriCart ${mealName}`,
          category: "Sarapan",
          duration_minutes: 20,
          difficulty: "Mudah",
          macros: {
            calories: 320,
            protein_g: 16.0,
            carbs_g: 45.0,
            fiber_g: 8.5
          },
          nutrition_tag: "Tinggi Serat",
          ingredients_list: [
            ...ingredientsList.map((ing: string) => `${ing}, 150 gram`),
            "Telur Puyuh, 4 butir",
            "Minyak Zaitun Cair, 1 sdt"
          ],
          instructions: [
            "Bersihkan seluruh bahan makanan mentah dengan air mengalir secara higienis.",
            "Iris tipis banyam hijau segar atau bahan tersedia lainnya.",
            "Panaskan sedikit wajan anti lengket, gongso telur puyuh hingga setengah matang.",
            "Satukan bayam, siram penyedap dan lada halus secukupnya, sajikan hangat."
          ],
          rating: 4.8,
          image_res_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=400"
        }
      ],
      notice: "Menyajikan resep asisten simulasi luring. Masukkan kunci GEMINI_API_KEY di menu Secrets untuk mengaktifkan AI asli."
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const userPrompt = `Analisislah profil gizi anggota keluarga: ${JSON.stringify(family_members)}.
    Serta bahan pangan yang tersedia di lemari es saat ini: ${JSON.stringify(ingredientsList)}.
    Ramu dan buatlah sebuah koleksi rekomendasi masakan sehat (1 atau 2 resep) yang dirancang personal agar cocok secara medis dan gizi mikro/makro keluarga ini.
    Berikan respons dalam bentuk JSON array yang mewakili resep rekomendasi tersebut.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: `Anda adalah asisten konsultan gizi klinis profesional (Nutritional Dietitian AI).
        Anda harus menyusun saran resep makanan sehat dengan mengutamakan penyembuhan korelasi gizi mikro/makro harian dan memformat keluaran menjadi JSON murni yang valid.
        JSON wajib berupa array objek dengan struktur properti persis seperti berikut:
        [
          {
            "id": 201,
            "title": "Nama Menarik Bergizi (Bahasa Indonesia)",
            "category": "Sarapan" | "Makan Siang" | "Makan Malam",
            "duration_minutes": 25,
            "difficulty": "Mudah" | "Sedang",
            "macros": {
              "calories": 350,
              "protein_g": 18.2,
              "carbs_g": 50.0,
              "fiber_g": 6.8
            },
            "nutrition_tag": "Tinggi Serat" | "Tinggi Protein" | "Kaya Zat Besi",
            "ingredients_list": ["Susu UHT, 200 ml", "Telur rebus, 1 butir"],
            "instructions": ["Langkah instruksi 1", "Langkah instruksi 2"],
            "rating": 4.9,
            "image_res_url": "tautan_gambar_unsplash_makanan"
          }
        ]
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              duration_minutes: { type: Type.INTEGER },
              difficulty: { type: Type.STRING },
              macros: {
                type: Type.OBJECT,
                properties: {
                  calories: { type: Type.INTEGER },
                  protein_g: { type: Type.NUMBER },
                  carbs_g: { type: Type.NUMBER },
                  fiber_g: { type: Type.NUMBER }
                },
                required: ["calories", "protein_g", "carbs_g", "fiber_g"]
              },
              nutrition_tag: { type: Type.STRING },
              ingredients_list: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              instructions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              rating: { type: Type.NUMBER },
              image_res_url: { type: Type.STRING }
            },
            required: ["id", "title", "category", "duration_minutes", "difficulty", "macros", "nutrition_tag", "ingredients_list", "instructions", "rating", "image_res_url"]
          }
        }
      }
    });

    const outputText = response.text || "[]";
    const recommended_recipes = JSON.parse(outputText);

    return res.json({
      status: "success",
      generated_at: new Date().toISOString(),
      recommended_recipes
    });

  } catch (error: any) {
    console.error("Gemini Recommendation Process Failed: ", error);
    return res.status(500).json({
      status: "error",
      error_code: "GEMINI_ERROR",
      message: "Gagal merumuskan asisten gizi cerdas AI: " + error.message
    });
  }
});

// 4. Shopping List Sync
app.put("/api/v1/shopping-list/sync", (req, res) => {
  const { family_id, client_timestamp, items } = req.body;

  if (!family_id) {
    return res.status(400).json({
      status: "error",
      error_code: "MISSING_FAMILY_ID",
      message: "Kolom family_id wajib disertakan untuk sinkronisasi."
    });
  }

  // Syncing list back inside in-memory cache
  if (items && Array.isArray(items)) {
    shoppingCart = items.map((it: any, index: number) => ({
      id: it.id || index + 10,
      family_id,
      name: it.name,
      quantity: it.quantity || "1 Unit",
      nutrition_tag: it.nutrition_tag || "Gizi Seimbang",
      protein_g: Number(it.protein_g) || 0,
      fiber_g: Number(it.fiber_g) || 0,
      carbs_g: Number(it.carbs_g) || 0,
      calories: Number(it.calories) || 0,
      is_checked: !!it.is_checked,
      is_added_from_tip: !!it.is_added_from_tip
    }));
  }

  return res.json({
    status: "success",
    last_sync_server_time: new Date().toISOString(),
    action_taken: "merged",
    current_shopping_items_count: shoppingCart.length,
    message: "Daftar belanja keluarga berhasil tersimpan di awan secara sinkron."
  });
});

app.get("/api/v1/shopping-list/list", (req, res) => {
  return res.json({
    status: "success",
    data: shoppingCart
  });
});

// 5. Family Profiles management routes for the interactive console
app.get("/api/v1/family-members", (req, res) => {
  return res.json({ status: "success", data: familyMembers });
});

app.post("/api/v1/family-members", (req, res) => {
  const { name, gender, age, weight_kg, height_cm } = req.body;
  if (!name || !gender) {
    return res.status(400).json({ status: "error", message: "Name and Gender are required" });
  }

  const newMember = {
    id: familyMembers.length > 0 ? Math.max(...familyMembers.map(m => m.id)) + 1 : 1,
    name,
    gender,
    age: Number(age) || 30,
    weight_kg: Number(weight_kg) || 60,
    height_cm: Number(height_cm) || 165,
    photo_url: ""
  };

  familyMembers.push(newMember);
  return res.status(201).json({ status: "success", data: newMember });
});

app.delete("/api/v1/family-members/:id", (req, res) => {
  const { id } = req.params;
  familyMembers = familyMembers.filter(m => m.id !== Number(id));
  return res.json({ status: "success", message: "Family member removed successfully" });
});

// --- ENHANCED VITE EXTRAS ---

async function startServer() {
  // Vite dev middleware integrations
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
