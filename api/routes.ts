import express from "express";
import path from "path";
import fs from "fs";
import { TrainerRegistration } from "../src/types.js";

const router = express.Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "fbx2026";

const isVercel = !!process.env.VERCEL;
const BUNDLED_DATA_FILE = path.join(process.cwd(), "registrations.json");
const BUNDLED_CONFIG_FILE = path.join(process.cwd(), "config.json");

const DATA_FILE = isVercel ? path.join("/tmp", "registrations.json") : BUNDLED_DATA_FILE;
const CONFIG_FILE = isVercel ? path.join("/tmp", "config.json") : BUNDLED_CONFIG_FILE;

// Helper to ensure DATA_FILE exists (called lazily)
function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      if (isVercel && fs.existsSync(BUNDLED_DATA_FILE)) {
        try {
          fs.copyFileSync(BUNDLED_DATA_FILE, DATA_FILE);
          console.log("Copied bundled registrations.json to /tmp");
        } catch (copyErr) {
          fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
        }
      } else {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
        console.log("Initialized registrations.json");
      }
    }
  } catch (error) {
    console.error("Error ensuring DATA_FILE:", error);
  }
}

// Helper to ensure CONFIG_FILE exists (called lazily)
function ensureConfigFile() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      const defaultConfig = { spreadsheetId: null, googleScriptUrl: null };
      if (isVercel && fs.existsSync(BUNDLED_CONFIG_FILE)) {
        try {
          fs.copyFileSync(BUNDLED_CONFIG_FILE, CONFIG_FILE);
          console.log("Copied bundled config.json to /tmp");
        } catch (copyErr) {
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), "utf-8");
        }
      } else {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), "utf-8");
        console.log("Initialized config.json");
      }
    }
  } catch (error) {
    console.error("Error ensuring CONFIG_FILE:", error);
  }
}

// Helper to read registrations from file
function readRegistrations(): TrainerRegistration[] {
  try {
    ensureDataFile();
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
    ensureDataFile();
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
router.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Admin Login
router.post("/admin/login", (req, res) => {
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
router.post("/register", async (req, res) => {
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

    // Check duplicate CPF - instead of blocking, we will update the existing record
    const sanitizedCpf = cpf.replace(/\D/g, "");
    const duplicateIndex = registrations.findIndex(
      (r) => r.cpf.replace(/\D/g, "") === sanitizedCpf
    );

    // Formulate trainer profile (update if duplicate, else create new)
    const trainerId = duplicateIndex !== -1 
      ? registrations[duplicateIndex].id 
      : "tr_" + Math.random().toString(36).substring(2, 11);

    const createdAt = duplicateIndex !== -1 
      ? registrations[duplicateIndex].createdAt 
      : new Date().toISOString();

    const newTrainer: TrainerRegistration = {
      id: trainerId,
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
      createdAt: createdAt,
    };

    if (duplicateIndex !== -1) {
      registrations[duplicateIndex] = newTrainer;
      console.log(`Atualizando cadastro local para o CPF ${cpf}`);
    } else {
      registrations.push(newTrainer);
      console.log(`Adicionando novo cadastro local para o CPF ${cpf}`);
    }
    
    if (writeRegistrations(registrations)) {
      // Sincronização automática em tempo real se o Google Script URL estiver configurado
      try {
        ensureConfigFile();
        let googleScriptUrl = process.env.GOOGLE_SCRIPT_URL || null;
        if (!googleScriptUrl && fs.existsSync(CONFIG_FILE)) {
          const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
          const config = JSON.parse(configData);
          googleScriptUrl = config.googleScriptUrl || null;
        }

        if (googleScriptUrl) {
          console.log("Enviando cadastro automático para o Google Sheets via Web App:", googleScriptUrl);
          const syncRes = await fetch(googleScriptUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(newTrainer)
          });
          
          if (syncRes.ok) {
            console.log("Sincronização automática com Google Sheets concluída com sucesso!");
          } else {
            const text = await syncRes.text();
            console.error("Falha na sincronização automática. Status:", syncRes.status, text);
          }
        } else {
          console.log("Google Script URL não configurado. Cadastro salvo apenas localmente.");
        }
      } catch (syncErr) {
        console.error("Falha ao disparar sincronização automática:", syncErr);
      }

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
router.get("/registrations", authenticateAdmin, (req, res) => {
  const registrations = readRegistrations();
  res.json(registrations);
});

// Get spreadsheet configuration
router.get("/config", (req, res) => {
  try {
    ensureConfigFile();
    // 1. Check environment variable first
    let spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || null;
    let googleScriptUrl = process.env.GOOGLE_SCRIPT_URL || null;
    
    // 2. Fallback to CONFIG_FILE if environment variable is not defined
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      const config = JSON.parse(data);
      if (!spreadsheetId) spreadsheetId = config.spreadsheetId || null;
      if (!googleScriptUrl) googleScriptUrl = config.googleScriptUrl || null;
    }
    
    res.json({ spreadsheetId, googleScriptUrl });
  } catch (error) {
    console.error("Error reading config:", error);
    res.status(500).json({ error: "Erro ao ler as configurações." });
  }
});

// Update spreadsheet configuration (requires authentication)
router.post("/config", authenticateAdmin, (req, res) => {
  try {
    ensureConfigFile();
    const { spreadsheetId, googleScriptUrl } = req.body;
    
    let currentConfig = { spreadsheetId: null, googleScriptUrl: null };
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      } catch (e) {}
    }
    
    const config = { 
      spreadsheetId: spreadsheetId !== undefined ? spreadsheetId : currentConfig.spreadsheetId,
      googleScriptUrl: googleScriptUrl !== undefined ? googleScriptUrl : currentConfig.googleScriptUrl
    };
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    res.json({ 
      success: true, 
      spreadsheetId: config.spreadsheetId, 
      googleScriptUrl: config.googleScriptUrl 
    });
  } catch (error) {
    console.error("Error writing config:", error);
    res.status(500).json({ error: "Erro ao salvar as configurações." });
  }
});

// Shared helper to parse CSV from Google Sheets and sync locally
async function parseAndSyncSpreadsheet(spreadsheetId: string): Promise<TrainerRegistration[]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  console.log(`Buscando dados da planilha via CSV: ${csvUrl}`);
  
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error("Não foi possível baixar os dados da planilha. Verifique se a planilha está compartilhada como 'Qualquer pessoa com o link pode ler' (Leitor).");
  }

  const csvText = await response.text();
  
  // Auto-detect separator: commas vs semicolons
  const sample = csvText.slice(0, 1000);
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  const separator = semicolonCount > commaCount ? ';' : ',';

  // Parse CSV rows
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let inQuotes = false;
  let currentVal = "";

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentVal);
      if (currentRow.length > 0 && currentRow.some(cell => cell.trim() !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  if (currentRow.length > 0 || currentVal !== "") {
    currentRow.push(currentVal);
    if (currentRow.some(cell => cell.trim() !== "")) {
      rows.push(currentRow);
    }
  }

  if (rows.length <= 1) {
    return [];
  }

  // Skip header row
  const rowsWithoutHeader = rows.slice(1);
  const importedRegistrations: TrainerRegistration[] = [];

  for (const row of rowsWithoutHeader) {
    if (row.length < 3) continue;

    const name = row[1] ? row[1].trim() : "";
    const cpf = row[2] ? row[2].trim() : "";
    if (!name || !cpf) continue; // Skip empty rows

    const id = row[0] && row[0].trim().startsWith("tr_") 
      ? row[0].trim() 
      : "tr_" + Math.random().toString(36).substring(2, 11);

    const birthDateRaw = row[3] ? row[3].trim() : "";
    let birthDate = "";
    if (birthDateRaw) {
      if (birthDateRaw.includes("/")) {
        const parts = birthDateRaw.split("/");
        if (parts.length === 3) {
          birthDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      } else if (birthDateRaw.includes("-")) {
        birthDate = birthDateRaw;
      }
    }

    const phone = row[4] ? row[4].trim() : "";
    const email = row[5] ? row[5].trim().toLowerCase() : "";
    const instagram = row[6] ? row[6].trim() : "";
    const fideTitle = row[7] ? row[7].trim() : "Nenhuma";
    const administrativeRegion = row[8] ? row[8].trim() : "";
    
    const pedagogical = row[9] ? row[9].trim().toLowerCase() === "sim" : false;
    const highPerformance = row[10] ? row[10].trim().toLowerCase() === "sim" : false;

    const availabilityRaw = row[11] ? row[11].trim() : "";
    const availability: string[] = [];
    if (availabilityRaw) {
      const parts = availabilityRaw.split(",").map((s) => s.trim().toLowerCase());
      if (parts.some((p) => p.includes("manhã") || p.includes("morning"))) availability.push("morning");
      if (parts.some((p) => p.includes("tarde") || p.includes("afternoon"))) availability.push("afternoon");
      if (parts.some((p) => p.includes("noite") || p.includes("night"))) availability.push("night");
      if (parts.some((p) => p.includes("final") || p.includes("fim") || p.includes("fins") || p.includes("weekend") || p.includes("sábado") || p.includes("domingo"))) availability.push("weekend");
    }

    const bio = row[12] ? row[12].trim() : "";
    const notes = row[13] ? row[13].trim() : "";
    
    const createdAtRaw = row[14] ? row[14].trim() : "";
    let createdAt = new Date().toISOString();
    if (createdAtRaw) {
      if (createdAtRaw.includes("/")) {
        const parts = createdAtRaw.split("/");
        if (parts.length === 3) {
          createdAt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`).toISOString();
        }
      } else {
        const parsed = Date.parse(createdAtRaw);
        if (!isNaN(parsed)) {
          createdAt = new Date(parsed).toISOString();
        }
      }
    }

    importedRegistrations.push({
      id,
      name,
      cpf,
      birthDate,
      phone,
      email,
      instagram,
      fideTitle,
      specialties: {
        pedagogical,
        highPerformance
      },
      availability,
      administrativeRegion,
      bio,
      notes,
      createdAt
    });
  }

  if (importedRegistrations.length > 0) {
    writeRegistrations(importedRegistrations);
  }

  return importedRegistrations;
}

// Sync registrations directly from Google Sheets via CSV export (no client-side OAuth token required)
router.post("/config/sync-from-sheet", authenticateAdmin, async (req, res) => {
  try {
    ensureConfigFile();
    let spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || null;
    
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const data = fs.readFileSync(CONFIG_FILE, "utf-8");
        const config = JSON.parse(data);
        if (!spreadsheetId) spreadsheetId = config.spreadsheetId || null;
      } catch (e) {}
    }

    if (!spreadsheetId) {
      return res.status(400).json({ error: "Nenhuma planilha vinculada nas configurações do sistema." });
    }

    const importedRegistrations = await parseAndSyncSpreadsheet(spreadsheetId);

    if (importedRegistrations.length > 0) {
      console.log(`Importação concluída via helper. ${importedRegistrations.length} registros salvos.`);
      return res.json({ 
        success: true, 
        count: importedRegistrations.length, 
        message: `${importedRegistrations.length} professores carregados com sucesso diretamente da planilha!`,
        registrations: importedRegistrations
      });
    } else {
      return res.status(400).json({ error: "Nenhum cadastro válido foi encontrado na planilha." });
    }
  } catch (err: any) {
    console.error("Erro na importação da planilha:", err);
    return res.status(500).json({ error: "Erro interno no servidor ao sincronizar.", details: err.message || err.toString() });
  }
});

// GET /api/public-registrations - Expose safe registration columns for non-auth users (nome, telefone, local, titulacao, atuacao)
router.get("/public-registrations", async (req, res) => {
  try {
    ensureConfigFile();
    let spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || null;
    
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const data = fs.readFileSync(CONFIG_FILE, "utf-8");
        const config = JSON.parse(data);
        if (!spreadsheetId) spreadsheetId = config.spreadsheetId || null;
      } catch (e) {}
    }

    // Try to sync from Google Sheets in the background/sync to bring newest data
    if (spreadsheetId) {
      try {
        await parseAndSyncSpreadsheet(spreadsheetId);
        console.log("Sincronização automática para acesso público realizada com sucesso.");
      } catch (syncErr) {
        console.error("Erro na sincronização em segundo plano para acesso público:", syncErr);
        // Fallback gracefully without throwing
      }
    }

    const registrations = readRegistrations();
    
    // Selectively map only safe public attributes (nome, telefone, local, titulacao, atuacao, availability)
    const publicData = registrations.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      administrativeRegion: r.administrativeRegion,
      fideTitle: r.fideTitle,
      specialties: r.specialties,
      availability: r.availability,
    }));

    res.json(publicData);
  } catch (error: any) {
    console.error("Erro ao obter cadastros públicos:", error);
    res.status(500).json({ error: "Erro ao buscar os profissionais do banco de talentos." });
  }
});

// Test Google Apps Script Web App connection (requires authentication)
router.post("/config/test-sync", authenticateAdmin, async (req, res) => {
  try {
    const { googleScriptUrl } = req.body;
    if (!googleScriptUrl) {
      return res.status(400).json({ error: "URL do Google Script não fornecida." });
    }

    const testPayload = {
      id: "TEST-123",
      name: "Profissional de Teste (FBX)",
      cpf: "000.000.000-00",
      birthDate: "01/01/2026",
      phone: "(00) 00000-0000",
      email: "teste@fbx.com",
      instagram: "@fbx_teste",
      fideTitle: "Nenhuma",
      administrativeRegion: "Brasília",
      specialties: {
        pedagogical: true,
        highPerformance: false
      },
      availability: ["morning", "afternoon"],
      bio: "Esta é uma linha de teste enviada automaticamente para validar a integração em tempo real.",
      notes: "Sincronização configurada com sucesso!",
      createdAt: new Date().toISOString()
    };

    console.log("Testando conexão com Google Apps Script:", googleScriptUrl);
    
    const syncRes = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(testPayload)
    });

    if (syncRes.ok) {
      const responseText = await syncRes.text();
      return res.json({ 
        success: true, 
        message: "Conexão de teste bem-sucedida! Uma linha de teste foi adicionada à planilha.",
        response: responseText
      });
    } else {
      const errorText = await syncRes.text();
      return res.status(syncRes.status).json({ 
        error: `O Google Apps Script retornou status ${syncRes.status}`, 
        details: errorText 
      });
    }
  } catch (err: any) {
    console.error("Erro ao testar sincronização:", err);
    return res.status(500).json({ 
      error: "Falha de rede ao conectar com o Google Apps Script.", 
      details: err.message || err.toString() 
    });
  }
});

// Sync/Replace all registrations (requires authentication)
router.post("/registrations/sync", authenticateAdmin, (req, res) => {
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
router.delete("/registrations/:id", authenticateAdmin, (req, res) => {
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

export default router;
