import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { TrainerRegistration } from "./src/types";

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "registrations.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "fbx2026";

// Ensure data file exists with empty array
if (!fs.existsSync(DATA_FILE)) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
    console.log("Initialized registrations.json");
  } catch (error) {
    console.error("Error creating registrations.json:", error);
  }
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

start();
