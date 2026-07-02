import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { TrainerRegistration } from "./src/types";

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "fbx2026";

const isVercel = !!process.env.VERCEL;
const BUNDLED_DATA_FILE = path.join(process.cwd(), "registrations.json");
const BUNDLED_CONFIG_FILE = path.join(process.cwd(), "config.json");

const DATA_FILE = isVercel ? path.join("/tmp", "registrations.json") : BUNDLED_DATA_FILE;
const CONFIG_FILE = isVercel ? path.join("/tmp", "config.json") : BUNDLED_CONFIG_FILE;

// Ensure DATA_FILE exists safely (especially in read-only Vercel environment)
try {
  if (!fs.existsSync(DATA_FILE)) {
    if (isVercel && fs.existsSync(BUNDLED_DATA_FILE)) {
      fs.copyFileSync(BUNDLED_DATA_FILE, DATA_FILE);
      console.log("Copied bundled registrations.json to /tmp");
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
      console.log("Initialized registrations.json");
    }
  }
} catch (error) {
  console.error("Error setting up DATA_FILE:", error);
}

// Ensure CONFIG_FILE exists safely
try {
  if (!fs.existsSync(CONFIG_FILE)) {
    if (isVercel && fs.existsSync(BUNDLED_CONFIG_FILE)) {
      fs.copyFileSync(BUNDLED_CONFIG_FILE, CONFIG_FILE);
      console.log("Copied bundled config.json to /tmp");
    } else {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ spreadsheetId: null }, null, 2), "utf-8");
      console.log("Initialized config.json");
    }
  }
} catch (error) {
  console.error("Error setting up CONFIG_FILE:", error);
}

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to read registrations from file
function readRegistrations(): TrainerRegistration[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data) as TrainerRegistration[];
  } catch (error) {
    console.error("Error reading registrations:", error);
    return [];
  }
}

// Helper to write registrations to file
function writeRegistrations(data: TrainerRegistration[]): boolean {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing registrations:", error);
    return false;
  }
}

// Authentication middleware for administrative endpoints
function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Acesso não autorizado. Token ausente." });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (token === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(403).json({ error: "Senha de administração inválida." });
  }
}

// --- API ROUTES ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Admin Login
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Senha é obrigatória." });
  }

  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    return res.status(401).json({ error: "Senha incorreta. Tente novamente." });
  }
});

// Submit a new registration
app.post("/api/register", (req, res) => {
  try {
    const {
      name,
      cpf,
      birthDate,
      phone,
      email,
      instagram,
      fideTitle,
      specialties,
      availability,
      administrativeRegion,
      bio,
      notes,
    } = req.body;

    // Validate required fields
    if (!name || !cpf || !birthDate || !phone || !email || !administrativeRegion) {
      return res.status(400).json({ error: "Por favor, preencha todos os campos obrigatórios." });
    }

    // Read current database
    const registrations = readRegistrations();

    // Check duplicate CPF
    const sanitizedCpf = cpf.replace(/\D/g, "");
    const duplicate = registrations.find(
      (r) => r.cpf.replace(/\D/g, "") === sanitizedCpf
    );
    if (duplicate) {
      return res.status(400).json({
        error: "Este CPF já possui um cadastro ativo. Caso precise alterar, entre em contato com a federação.",
      });
    }

    // Formulate new trainer
    const newTrainer: TrainerRegistration = {
      id: "tr_" + Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      cpf: cpf.trim(),
      birthDate: birthDate ? birthDate.trim() : "",
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      instagram: instagram ? instagram.trim() : "",
      fideTitle: fideTitle || "Nenhuma",
      specialties: {
        pedagogical: !!specialties?.pedagogical,
        highPerformance: !!specialties?.highPerformance,
      },
      availability: Array.isArray(availability) ? availability : [],
      administrativeRegion,
      bio: bio ? bio.trim() : "",
      notes: notes ? notes.trim() : "",
      createdAt: new Date().toISOString(),
    };

    registrations.push(newTrainer);
    
    if (writeRegistrations(registrations)) {
      return res.status(201).json({ success: true, data: newTrainer });
    } else {
      return res.status(500).json({ error: "Erro interno ao salvar os dados." });
    }
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Get all registrations (requires authentication)
app.get("/api/registrations", authenticateAdmin, (req, res) => {
  const registrations = readRegistrations();
  res.json(registrations);
});

// Get spreadsheet configuration
app.get("/api/config", (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return res.json({ spreadsheetId: null });
    }
    const data = fs.readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(data);
    res.json(config);
  } catch (error) {
    console.error("Error reading config:", error);
    res.status(500).json({ error: "Erro ao ler as configurações." });
  }
});

// Update spreadsheet configuration (requires authentication)
app.post("/api/config", authenticateAdmin, (req, res) => {
  try {
    const { spreadsheetId } = req.body;
    const config = { spreadsheetId: spreadsheetId || null };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    res.json({ success: true, spreadsheetId: config.spreadsheetId });
  } catch (error) {
    console.error("Error writing config:", error);
    res.status(500).json({ error: "Erro ao salvar as configurações." });
  }
});

// Sync/Replace all registrations (requires authentication)
app.post("/api/registrations/sync", authenticateAdmin, (req, res) => {
  try {
    const { registrations } = req.body;
    if (!Array.isArray(registrations)) {
      return res.status(400).json({ error: "Dados inválidos. Esperava-se uma lista de registros." });
    }
    
    if (writeRegistrations(registrations)) {
      res.json({ success: true, count: registrations.length });
    } else {
      res.status(500).json({ error: "Erro ao atualizar o arquivo de registros." });
    }
  } catch (error) {
    console.error("Error syncing registrations:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Delete a registration (requires authentication)
app.delete("/api/registrations/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const registrations = readRegistrations();
  const initialLength = registrations.length;
  
  const filtered = registrations.filter((r) => r.id !== id);
  if (filtered.length === initialLength) {
    return res.status(404).json({ error: "Registro não encontrado." });
  }

  if (writeRegistrations(filtered)) {
    return res.json({ success: true, message: "Registro removido com sucesso." });
  } else {
    return res.status(500).json({ error: "Erro ao atualizar banco de dados." });
  }
});

// --- VITE DEV AND PRODUCTION HANDLING ---

async function start() {
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!isVercel) {
  start();
}

export default app;
