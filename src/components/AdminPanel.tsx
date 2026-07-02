import React, { useState, useEffect } from "react";
import { 
  Lock, ArrowLeft, Search, Filter, Trash2, Download, 
  Copy, FileSpreadsheet, Eye, User, Phone, Mail, Instagram, 
  MapPin, Calendar, BookOpen, Trophy, Award, Key, Loader2, 
  CheckCircle, ChevronDown, Check, Send, AlertTriangle, ExternalLink, RefreshCw
} from "lucide-react";
import { TrainerRegistration } from "../types";
import { REGIOES_ADMINISTRATIVAS } from "../utils/regions";
import { initAuth, googleSignIn, logoutGoogle } from "../lib/firebase";
import { User as FirebaseUser } from "firebase/auth";

interface AdminPanelProps {
  onBackToForm: () => void;
}

const googleScriptCode = `function doGet(e) {
  if (!e) {
    return ContentService.createTextOutput("ATENÇÃO: Você executou a função doGet diretamente pelo editor do Google Apps Script. Isso é normal! Para testar o funcionamento real, você precisa implantar como 'App da Web' (Web App) e usar a URL gerada.")
      .setMimeType(ContentService.MimeType.TEXT);
  }
  return ContentService.createTextOutput(JSON.stringify({ 
    "status": "online", 
    "message": "Serviço de integração FBX ativo! Pronto para receber cadastros via requisições POST." 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput(JSON.stringify({ 
      "result": "error", 
      "error": "Nenhum dado recebido. Se você clicou em 'Executar' no editor do Apps Script, isto é normal porque o editor não envia dados. O script deve ser chamado pelo aplicativo principal via POST." 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Se a planilha estiver vazia, adiciona o cabeçalho automaticamente
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "ID",
        "Nome",
        "CPF",
        "Data de Nascimento",
        "Telefone",
        "E-mail",
        "Instagram",
        "Título FIDE",
        "Região Administrativa",
        "Pedagógico",
        "Alto Rendimento",
        "Disponibilidade",
        "Biografia",
        "Observações",
        "Data de Cadastro"
      ]);
    }

    var data = JSON.parse(e.postData.contents);
    
    // Extrai os campos do profissional
    var id = data.id || "";
    var name = data.name || "";
    var cpf = data.cpf || "";
    var birthDate = data.birthDate || "";
    var phone = data.phone || "";
    var email = data.email || "";
    var instagram = data.instagram || "";
    var fideTitle = data.fideTitle || "Nenhuma";
    var administrativeRegion = data.administrativeRegion || "";
    
    var pedagogical = "Não";
    var highPerformance = "Não";
    if (data.specialties) {
      if (data.specialties.pedagogical) pedagogical = "Sim";
      if (data.specialties.highPerformance) highPerformance = "Sim";
    }
    
    var availability = "";
    if (Array.isArray(data.availability)) {
      availability = data.availability.map(function(a) {
        if (a === "morning") return "Manhã";
        if (a === "afternoon") return "Tarde";
        if (a === "night") return "Noite";
        return "Finais de Semana";
      }).join(", ");
    }
    
    var bio = data.bio || "";
    var notes = data.notes || "";
    var createdAtFormatted = "";
    if (data.createdAt) {
      createdAtFormatted = new Date(data.createdAt).toLocaleDateString("pt-BR");
    } else {
      createdAtFormatted = new Date().toLocaleDateString("pt-BR");
    }
    
    // Adiciona uma linha na planilha com os campos mapeados
    sheet.appendRow([
      id,
      name,
      cpf,
      birthDate,
      phone,
      email,
      instagram,
      fideTitle,
      administrativeRegion,
      pedagogical,
      highPerformance,
      availability,
      bio,
      notes,
      createdAtFormatted
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function AdminPanel({ onBackToForm }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [data, setData] = useState<TrainerRegistration[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerRegistration | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all"); // 'all', 'pedagogical', 'highPerformance'
  const [filterTitle, setFilterTitle] = useState("");

  // Google Sheets Integration State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetName, setSpreadsheetName] = useState<string | null>(null);
  const [googleScriptUrl, setGoogleScriptUrl] = useState<string | null>(null);
  const [googleScriptUrlInput, setGoogleScriptUrlInput] = useState("");
  const [showScriptInstructions, setShowScriptInstructions] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSheetsLoading, setIsSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [sheetsSuccess, setSheetsSuccess] = useState<string | null>(null);
  
  // Script connection test state
  const [isTestingScript, setIsTestingScript] = useState(false);
  const [scriptTestResult, setScriptTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load token from localStorage on mount and init Firebase Auth
  useEffect(() => {
    const savedToken = localStorage.getItem("fbx_admin_token");
    let currentFbxToken = "";
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      currentFbxToken = savedToken;
      fetchRegistrations(savedToken);
      fetchGoogleConfig(undefined, savedToken); // Load spreadsheet configuration regardless of Google Auth
    }

    // Initialize Firebase Google Auth listener
    const unsubscribe = initAuth(
      (user, gToken) => {
        setGoogleUser(user);
        setGoogleToken(gToken);
        fetchGoogleConfig(gToken, currentFbxToken || token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );

    return () => unsubscribe();
  }, [token]);

  const fetchGoogleConfig = async (gToken?: string, fbxAuthToken?: string) => {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const config = await response.json();
        setSpreadsheetId(config.spreadsheetId || null);
        setGoogleScriptUrl(config.googleScriptUrl || null);
        setGoogleScriptUrlInput(config.googleScriptUrl || "");
        
        if (config.spreadsheetId) {
          setSpreadsheetName("Planilha Vinculada");
        }

        const activeToken = gToken || googleToken;
        const activeFbxToken = fbxAuthToken || token;
        
        if (config.spreadsheetId && activeToken) {
          fetchSpreadsheetDetails(config.spreadsheetId, activeToken);
        }

        // Auto-sync using our backend sync-from-sheet route on load (requires only admin credentials, no Google auth)
        if (config.spreadsheetId && activeFbxToken) {
          try {
            const syncRes = await fetch("/api/config/sync-from-sheet", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${activeFbxToken}`
              }
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData.success && syncData.registrations) {
                setData(syncData.registrations);
                console.log(`Auto-synchronized ${syncData.registrations.length} registrations on load.`);
              }
            }
          } catch (autoErr) {
            console.error("Auto sync on load failed:", autoErr);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching Google config:", err);
    }
  };

  const fetchSpreadsheetDetails = async (sheetId: string, accessToken: string) => {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const details = await res.json();
        setSpreadsheetName(details.properties?.title || "Planilha do Google");
      } else {
        setSpreadsheetName("Planilha inacessível ou removida");
      }
    } catch (err) {
      console.error("Error getting spreadsheet details:", err);
    }
  };

  const autoSyncFromGoogleSheets = async (sheetId: string, accessToken: string, fbxAuthToken: string) => {
    if (!sheetId || !accessToken || !fbxAuthToken) return;
    try {
      let sheetName = "Cadastros";
      const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (metadataRes.ok) {
        const metadata = await metadataRes.json();
        const firstSheetTitle = metadata.sheets?.[0]?.properties?.title;
        if (firstSheetTitle) {
          sheetName = firstSheetTitle;
        }
      }

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A2:O1000`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!res.ok) return;

      const result = await res.json();
      const rows = result.values || [];
      if (rows.length === 0) return;

      const importedRegistrations: TrainerRegistration[] = rows.map((row: any[]) => {
        const id = row[0] && row[0].toString().trim().startsWith("tr_") 
          ? row[0].toString().trim() 
          : "tr_" + Math.random().toString(36).substring(2, 11);
        
        const name = row[1] ? row[1].toString().trim() : "";
        const cpf = row[2] ? row[2].toString().trim() : "";
        
        const birthDateRaw = row[3] ? row[3].toString().trim() : "";
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

        const phone = row[4] ? row[4].toString().trim() : "";
        const email = row[5] ? row[5].toString().trim().toLowerCase() : "";
        const instagram = row[6] ? row[6].toString().trim() : "";
        const fideTitle = row[7] ? row[7].toString().trim() : "Nenhuma";
        const administrativeRegion = row[8] ? row[8].toString().trim() : "";
        
        const pedagogical = row[9] ? row[9].toString().trim().toLowerCase() === "sim" : false;
        const highPerformance = row[10] ? row[10].toString().trim().toLowerCase() === "sim" : false;

        const availabilityRaw = row[11] ? row[11].toString().trim() : "";
        const availability: string[] = [];
        if (availabilityRaw) {
          const parts = availabilityRaw.split(",").map((s) => s.trim().toLowerCase());
          if (parts.some((p) => p.includes("manhã"))) availability.push("morning");
          if (parts.some((p) => p.includes("tarde"))) availability.push("afternoon");
          if (parts.some((p) => p.includes("noite"))) availability.push("night");
          if (parts.some((p) => p.includes("final") || p.includes("fim"))) availability.push("weekend");
        }

        const bio = row[12] ? row[12].toString().trim() : "";
        const notes = row[13] ? row[13].toString().trim() : "";
        
        const createdAtRaw = row[14] ? row[14].toString().trim() : "";
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

        return {
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
        };
      }).filter((item) => item.name && item.cpf);

      if (importedRegistrations.length === 0) return;

      const syncRes = await fetch("/api/registrations/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${fbxAuthToken}`
        },
        body: JSON.stringify({ registrations: importedRegistrations })
      });

      if (syncRes.ok) {
        setData(importedRegistrations);
        console.log(`Auto-synchronized ${importedRegistrations.length} registrations silently from Google Sheets.`);
      }
    } catch (err) {
      console.error("Auto sync error:", err);
    }
  };

  const fetchRegistrations = async (authToken: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/registrations", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const list = await response.json();
        setData(list);
      } else {
        // Stale token
        localStorage.removeItem("fbx_admin_token");
        setIsAuthenticated(false);
        setLoginError("Sua sessão expirou. Por favor, faça login novamente.");
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (response.ok && result.token) {
        localStorage.setItem("fbx_admin_token", result.token);
        setToken(result.token);
        setIsAuthenticated(true);
        fetchRegistrations(result.token);
        fetchGoogleConfig();
      } else {
        setLoginError(result.error || "Senha inválida.");
      }
    } catch (err) {
      setLoginError("Erro de conexão. Certifique-se de que o servidor está rodando.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("fbx_admin_token");
    setToken("");
    setIsAuthenticated(false);
    setData([]);
  };

  const handleGoogleLogin = async () => {
    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccess(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        setSheetsSuccess(`Conta Google vinculada com sucesso: ${result.user.email}`);
        fetchGoogleConfig(result.accessToken);
      }
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      if (err?.code === "auth/popup-closed-by-user" || err?.message?.includes("popup-closed-by-user")) {
        setSheetsError(
          "A janela de login do Google foi fechada ou bloqueada. Se o popup não abriu, por favor permita popups para este site nas configurações do seu navegador ou clique em 'Abrir em nova aba' (no canto superior direito da tela de visualização do AI Studio) para fazer o login sem restrições de iframe."
        );
      } else if (err?.code === "auth/cancelled-popup-request" || err?.message?.includes("cancelled-popup-request")) {
        setSheetsError("Uma solicitação de login já está em andamento. Aguarde ou atualize a página.");
      } else {
        setSheetsError(`Falha na autenticação do Google: ${err?.message || "Tente novamente."}`);
      }
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      setSheetsSuccess("Conta Google desconectada.");
    } catch (err) {
      console.error("Google sign out failed:", err);
    }
  };

  const handleCreateSpreadsheet = async () => {
    if (!googleToken) return;
    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccess(null);
    try {
      const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          properties: {
            title: "Credenciamento de Professores - FBX"
          },
          sheets: [
            {
              properties: {
                title: "Cadastros"
              }
            }
          ]
        })
      });

      if (res.ok) {
        const result = await res.json();
        const sheetId = result.spreadsheetId;
        
        // Save spreadsheetId on server config
        const saveRes = await fetch("/api/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` // server admin token
          },
          body: JSON.stringify({ spreadsheetId: sheetId })
        });

        if (saveRes.ok) {
          setSpreadsheetId(sheetId);
          setSpreadsheetName(result.properties?.title || "Credenciamento de Professores - FBX");
          setSheetsSuccess("Planilha criada e vinculada com sucesso no seu Google Drive!");
        } else {
          throw new Error("Falha ao salvar a configuração da planilha no servidor.");
        }
      } else {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Falha ao criar planilha no Google Drive.");
      }
    } catch (err: any) {
      console.error("Create spreadsheet error:", err);
      setSheetsError(err.message || "Ocorreu um erro ao criar a planilha.");
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleLinkExistingSpreadsheet = async (sheetIdInput: string) => {
    if (!googleToken) return;
    let sheetId = sheetIdInput.trim();
    if (sheetId.includes("docs.google.com/spreadsheets")) {
      const match = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) sheetId = match[1];
    }

    if (!sheetId) {
      setSheetsError("ID ou URL da planilha inválido.");
      return;
    }

    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccess(null);

    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title`, {
        headers: { Authorization: `Bearer ${googleToken}` },
      });

      if (!res.ok) {
        throw new Error("Planilha não encontrada ou você não possui permissão de leitura.");
      }

      const details = await res.json();
      
      const saveRes = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ spreadsheetId: sheetId })
      });

      if (saveRes.ok) {
        setSpreadsheetId(sheetId);
        setSpreadsheetName(details.properties?.title || "Planilha Vinculada");
        setSheetsSuccess("Planilha vinculada com sucesso!");
      } else {
        throw new Error("Falha ao salvar a configuração da planilha no servidor.");
      }
    } catch (err: any) {
      console.error("Link spreadsheet error:", err);
      setSheetsError(err.message || "Não foi possível vincular a planilha.");
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleUnlinkSpreadsheet = async () => {
    const confirmed = window.confirm("Tem certeza que deseja desvincular a planilha atual? Os cadastros permanecerão no seu Google Drive, mas a sincronização automática será desativada.");
    if (!confirmed) return;

    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccess(null);

    try {
      const saveRes = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ spreadsheetId: null })
      });

      if (saveRes.ok) {
        setSpreadsheetId(null);
        setSpreadsheetName(null);
        setSheetsSuccess("Planilha desvinculada com sucesso.");
      } else {
        throw new Error("Falha ao salvar a configuração no servidor.");
      }
    } catch (err: any) {
      setSheetsError(err.message || "Erro ao desvincular a planilha.");
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleSaveGoogleScriptUrl = async (url: string) => {
    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccess(null);
    try {
      const cleanUrl = url.trim();
      const saveRes = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ googleScriptUrl: cleanUrl || null })
      });

      if (saveRes.ok) {
        setGoogleScriptUrl(cleanUrl || null);
        setSheetsSuccess(cleanUrl ? "URL do Google Apps Script salva com sucesso! Sincronização automática em tempo real ativa." : "Sincronização automática desativada.");
      } else {
        throw new Error("Falha ao salvar a configuração no servidor.");
      }
    } catch (err: any) {
      console.error("Save googleScriptUrl error:", err);
      setSheetsError(err.message || "Não foi possível salvar o URL.");
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleTestScriptConnection = async () => {
    if (!googleScriptUrlInput.trim()) {
      alert("Por favor, insira uma URL de Script para testar.");
      return;
    }
    setIsTestingScript(true);
    setScriptTestResult(null);
    setSheetsError(null);
    setSheetsSuccess(null);
    try {
      const response = await fetch("/api/config/test-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ googleScriptUrl: googleScriptUrlInput.trim() })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setScriptTestResult({
          success: true,
          message: "Conexão de teste estabelecida com sucesso! O Google Apps Script processou a chamada, inseriu uma linha de teste na planilha, e a URL foi ativada automaticamente."
        });
        
        // Auto-save the URL on successful connection test
        const cleanUrl = googleScriptUrlInput.trim();
        try {
          const saveRes = await fetch("/api/config", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ googleScriptUrl: cleanUrl || null })
          });
          if (saveRes.ok) {
            setGoogleScriptUrl(cleanUrl || null);
          }
        } catch (saveErr) {
          console.error("Failed to auto-save URL after test:", saveErr);
        }
      } else {
        setScriptTestResult({
          success: false,
          message: resData.error || resData.details || "O Google Apps Script retornou um erro ao processar os dados."
        });
      }
    } catch (err: any) {
      console.error("Test connection error:", err);
      setScriptTestResult({
        success: false,
        message: err.message || "Falha ao se comunicar com o Google Apps Script. Verifique se o URL está correto e se foi implantado como público (Qualquer um)."
      });
    } finally {
      setIsTestingScript(false);
    }
  };

  const handleExportToGoogleSheets = async () => {
    if (!googleToken || !spreadsheetId) return;

    const confirmed = window.confirm(
      "Deseja realmente exportar todos os cadastros para a planilha conectada? Isto irá limpar o conteúdo existente na planilha e escrever os registros atuais."
    );
    if (!confirmed) return;

    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccess(null);

    try {
      let sheetName = "Cadastros";
      
      const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      if (metadataRes.ok) {
        const metadata = await metadataRes.json();
        const firstSheetTitle = metadata.sheets?.[0]?.properties?.title;
        if (firstSheetTitle) {
          sheetName = firstSheetTitle;
        }
      }

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:O1000:clear`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${googleToken}` }
        }
      );

      const headers = [
        "ID", 
        "Nome Completo", 
        "CPF", 
        "Data de Nascimento", 
        "Telefone", 
        "E-mail", 
        "Instagram", 
        "Titulação FIDE", 
        "Região Administrativa", 
        "Pedagógico (Sim/Não)", 
        "Alto Rendimento (Sim/Não)", 
        "Disponibilidade", 
        "Currículo/Bio", 
        "Observações", 
        "Data Cadastro"
      ];

      const rows = data.map((item) => [
        item.id,
        item.name,
        item.cpf,
        item.birthDate || "",
        item.phone,
        item.email,
        item.instagram || "",
        item.fideTitle || "Nenhuma",
        item.administrativeRegion,
        item.specialties.pedagogical ? "Sim" : "Não",
        item.specialties.highPerformance ? "Sim" : "Não",
        item.availability.map(a => a === "morning" ? "Manhã" : a === "afternoon" ? "Tarde" : a === "night" ? "Noite" : "Finais de Semana").join(", "),
        item.bio || "",
        item.notes || "",
        item.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-BR") : ""
      ]);

      const valueRange = {
        range: `${sheetName}!A1:O${data.length + 1}`,
        majorDimension: "ROWS",
        values: [headers, ...rows]
      };

      const putRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:O${data.length + 1}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${googleToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(valueRange)
        }
      );

      if (putRes.ok) {
        setSheetsSuccess(`Sincronização concluída com sucesso! ${data.length} cadastros exportados para a planilha.`);
      } else {
        const errData = await putRes.json();
        throw new Error(errData.error?.message || "Falha ao gravar os dados na planilha.");
      }
    } catch (err: any) {
      console.error("Export to Sheets error:", err);
      setSheetsError(err.message || "Erro ao exportar dados para o Google Sheets.");
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleImportFromGoogleSheets = async () => {
    if (!googleToken || !spreadsheetId) return;

    const confirmed = window.confirm(
      "Deseja realmente ler e importar todos os cadastros da planilha do Google? Isto irá atualizar o banco de dados do aplicativo com todas as linhas, novos registros ou alterações feitas diretamente na planilha."
    );
    if (!confirmed) return;

    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccess(null);

    try {
      let sheetName = "Cadastros";
      const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      if (metadataRes.ok) {
        const metadata = await metadataRes.json();
        const firstSheetTitle = metadata.sheets?.[0]?.properties?.title;
        if (firstSheetTitle) {
          sheetName = firstSheetTitle;
        }
      }

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:O1000`,
        {
          headers: { Authorization: `Bearer ${googleToken}` }
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Não foi possível ler as linhas da planilha.");
      }

      const result = await res.json();
      const rows = result.values || [];

      if (rows.length === 0) {
        throw new Error("Nenhum cadastro encontrado na planilha (as linhas de dados estão vazias).");
      }

      const importedRegistrations: TrainerRegistration[] = rows.map((row: any[]) => {
        const id = row[0] && row[0].toString().trim().startsWith("tr_") 
          ? row[0].toString().trim() 
          : "tr_" + Math.random().toString(36).substring(2, 11);
        
        const name = row[1] ? row[1].toString().trim() : "";
        const cpf = row[2] ? row[2].toString().trim() : "";
        
        const birthDateRaw = row[3] ? row[3].toString().trim() : "";
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

        const phone = row[4] ? row[4].toString().trim() : "";
        const email = row[5] ? row[5].toString().trim().toLowerCase() : "";
        const instagram = row[6] ? row[6].toString().trim() : "";
        const fideTitle = row[7] ? row[7].toString().trim() : "Nenhuma";
        const administrativeRegion = row[8] ? row[8].toString().trim() : "";
        
        const pedagogical = row[9] ? row[9].toString().trim().toLowerCase() === "sim" : false;
        const highPerformance = row[10] ? row[10].toString().trim().toLowerCase() === "sim" : false;

        const availabilityRaw = row[11] ? row[11].toString().trim() : "";
        const availability: string[] = [];
        if (availabilityRaw) {
          const parts = availabilityRaw.split(",").map((s) => s.trim().toLowerCase());
          if (parts.some((p) => p.includes("manhã"))) availability.push("morning");
          if (parts.some((p) => p.includes("tarde"))) availability.push("afternoon");
          if (parts.some((p) => p.includes("noite"))) availability.push("night");
          if (parts.some((p) => p.includes("final") || p.includes("fim"))) availability.push("weekend");
        }

        const bio = row[12] ? row[12].toString().trim() : "";
        const notes = row[13] ? row[13].toString().trim() : "";
        
        const createdAtRaw = row[14] ? row[14].toString().trim() : "";
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

        return {
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
        };
      }).filter((item) => item.name && item.cpf);

      if (importedRegistrations.length === 0) {
        throw new Error("Não foi possível mapear nenhum cadastro válido da planilha. Certifique-se de que os campos Nome e CPF estão preenchidos.");
      }

      const syncRes = await fetch("/api/registrations/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ registrations: importedRegistrations })
      });

      if (syncRes.ok) {
        setData(importedRegistrations);
        setSheetsSuccess(`Importação concluída! Sincronizados ${importedRegistrations.length} cadastros da planilha para o banco local.`);
      } else {
        const errData = await syncRes.json();
        throw new Error(errData.error || "Erro ao salvar os registros importados no servidor.");
      }
    } catch (err: any) {
      console.error("Import from Sheets error:", err);
      setSheetsError(err.message || "Erro ao importar dados do Google Sheets.");
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/registrations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setData((prev) => prev.filter((item) => item.id !== id));
        setShowDeleteConfirm(null);
        if (selectedTrainer?.id === id) {
          setSelectedTrainer(null);
        }
      } else {
        const result = await response.json();
        alert(result.error || "Erro ao deletar registro.");
      }
    } catch (err) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter Logic
  const filteredData = data.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cpf.replace(/\D/g, "").includes(searchTerm.replace(/\D/g, "")) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.replace(/\D/g, "").includes(searchTerm.replace(/\D/g, "")) ||
      item.instagram.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRegion = !filterRegion || item.administrativeRegion === filterRegion;
    
    const matchesSpecialty = 
      filterSpecialty === "all" ||
      (filterSpecialty === "pedagogical" && item.specialties.pedagogical) ||
      (filterSpecialty === "highPerformance" && item.specialties.highPerformance);

    const matchesTitle = !filterTitle || item.fideTitle === filterTitle;

    return matchesSearch && matchesRegion && matchesSpecialty && matchesTitle;
  });

  // Calculate Statistics
  const totalCount = data.length;
  const pedagogicalCount = data.filter((item) => item.specialties.pedagogical).length;
  const highPerformanceCount = data.filter((item) => item.specialties.highPerformance).length;
  
  // Find top administrative region
  const regionCounts: Record<string, number> = {};
  data.forEach((item) => {
    regionCounts[item.administrativeRegion] = (regionCounts[item.administrativeRegion] || 0) + 1;
  });
  let topRegion = "Nenhuma";
  let topRegionCount = 0;
  Object.entries(regionCounts).forEach(([region, count]) => {
    if (count > topRegionCount) {
      topRegion = region;
      topRegionCount = count;
    }
  });

  // Export to Google Sheets as TSV (Tab Separated Values)
  const handleCopyToClipboard = () => {
    if (filteredData.length === 0) return;

    // Headers matching requirements
    const headers = [
      "Nome Completo", "CPF", "Data de Nascimento", "Telefone", "E-mail", "Instagram", 
      "Titulação FIDE", "Xadrez Pedagógico", "Xadrez Alto Rendimento", 
      "Região Administrativa (RA)", "Disponibilidade", "Currículo/Bio", "Observações", "Data Cadastro"
    ];

    const rows = filteredData.map((item) => [
      item.name,
      item.cpf,
      item.birthDate ? new Date(item.birthDate + "T00:00:00").toLocaleDateString("pt-BR") : "-",
      item.phone,
      item.email,
      item.instagram || "-",
      item.fideTitle,
      item.specialties.pedagogical ? "SIM" : "NÃO",
      item.specialties.highPerformance ? "SIM" : "NÃO",
      item.administrativeRegion,
      item.availability.map(a => a === "morning" ? "Manhã" : a === "afternoon" ? "Tarde" : a === "night" ? "Noite" : "Fim de Semana").join(", "),
      item.bio || "-",
      item.notes || "-",
      new Date(item.createdAt).toLocaleDateString("pt-BR")
    ]);

    const tsvContent = [
      headers.join("\t"),
      ...rows.map((row) => row.join("\t"))
    ].join("\n");

    navigator.clipboard.writeText(tsvContent).then(() => {
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 5000);
    });
  };

  // Download Standard UTF-8 CSV File with BOM for perfect opening in Excel
  const handleDownloadCSV = () => {
    if (filteredData.length === 0) return;

    const headers = [
      "ID", "Nome Completo", "CPF", "Data de Nascimento", "Telefone", "E-mail", "Instagram", 
      "Titulação FIDE", "Xadrez Pedagógico", "Xadrez Alto Rendimento", 
      "Região Administrativa", "Disponibilidade", "Currículo/Bio", "Data Cadastro"
    ];

    const rows = filteredData.map((item) => [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.cpf}"`,
      `"${item.birthDate ? new Date(item.birthDate + "T00:00:00").toLocaleDateString("pt-BR") : "-"}"`,
      `"${item.phone}"`,
      `"${item.email}"`,
      `"${item.instagram}"`,
      `"${item.fideTitle}"`,
      item.specialties.pedagogical ? "Sim" : "Não",
      item.specialties.highPerformance ? "Sim" : "Não",
      `"${item.administrativeRegion}"`,
      `"${item.availability.map(a => a === "morning" ? "Manhã" : a === "afternoon" ? "Tarde" : a === "night" ? "Noite" : "Finais de Semana").join(", ")}"`,
      `"${(item.bio || "").replace(/"/g, '""')}"`,
      `"${new Date(item.createdAt).toLocaleDateString("pt-BR")}"`
    ]);

    // UTF-8 BOM
    const BOM = "\uFEFF";
    const csvContent = BOM + [
      headers.join(";"),
      ...rows.map((row) => row.join(";"))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `profissionais_fbx_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Standard Titles list for filtering
  const UNIQUE_TITLES = Array.from(new Set(data.map((item) => item.fideTitle))).filter(Boolean).sort();

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8" id="fbx-admin-root">
      {/* Top Banner Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <button
          onClick={onBackToForm}
          className="self-start inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white hover:bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Formulário
        </button>

        {isAuthenticated && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Sessão Autorizada
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
            >
              Sair do Painel
            </button>
          </div>
        )}
      </div>

      {/* ACCESS CODE CARD GATED VIEW */}
      {!isAuthenticated ? (
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-8 text-center mt-12" id="admin-login-card">
          <div className="mx-auto w-12 h-12 bg-[#C5A880]/10 text-[#C5A880] rounded-full flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-serif font-bold italic text-slate-900">Painel do Administrador (FBX)</h3>
          <p className="text-slate-500 text-xs mt-1.5 mb-6 leading-relaxed">
            Área restrita para visualização dos contatos e exportação de planilhas. Insira a senha de acesso configurada pela Federação.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1 text-left">
              <label htmlFor="admin-password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Senha de Administrador <span className="text-[#C5A880] font-mono font-medium">(Padrão: fbx2026)</span>
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  id="admin-password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {loginError && (
              <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5 flex items-center gap-1.5 justify-center">
                <AlertTriangle className="w-4 h-4" />
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Entrar no Painel"
              )}
            </button>
          </form>
        </div>
      ) : (
        /* FULL ADMINISTRATOR INTERFACE */
        <div className="space-y-6" id="admin-panel-dashboard">
          {/* Stats Bento Grid Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-dashboard-grid">
            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
              <div className="text-xs text-slate-500 font-medium">Cadastros Totais</div>
              <div className="text-2xl sm:text-3xl font-serif font-bold italic text-slate-900 mt-1">{totalCount}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">✓ Banco de dados ativo</div>
            </div>

            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[#C5A880]" /> Xadrez Pedagógico
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold italic text-slate-900 mt-1">{pedagogicalCount}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                {totalCount > 0 ? `${Math.round((pedagogicalCount / totalCount) * 100)}% do banco` : "0%"}
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-[#C5A880]" /> Alto Rendimento
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold italic text-slate-900 mt-1">{highPerformanceCount}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                {totalCount > 0 ? `${Math.round((highPerformanceCount / totalCount) * 100)}% do banco` : "0%"}
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] col-span-2 md:col-span-1">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#C5A880]" /> Maior Demanda RA
              </div>
              <div className="text-base font-bold text-slate-900 mt-2 truncate">{topRegion}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{topRegionCount} instrutores</div>
            </div>
          </div>

          {/* Copy Paste Info Banner */}
          {showCopySuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 text-green-800 animate-bounce" id="clipboard-toast">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
              <div>
                <h4 className="font-bold text-sm">Dados Copiados com Sucesso!</h4>
                <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                  Os dados foram formatados em formato compatível com planilhas. Agora, **abra o seu Google Sheets (ou Excel)**, selecione a célula **A1** e aperte **Ctrl + V** (ou Cmd + V) para colar a tabela completa com as colunas certas!
                </p>
              </div>
            </div>
          )}

          {/* GOOGLE SHEETS INTEGRATION CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4" id="google-sheets-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold italic text-slate-900">Sincronização Google Sheets</h3>
                  <p className="text-xs text-slate-500">Conecte sua conta Google para salvar e ler os dados de uma planilha</p>
                </div>
              </div>

              {googleUser ? (
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Conectado como</span>
                    <span className="text-xs font-semibold text-slate-700">{googleUser.email}</span>
                  </div>
                  <button
                    onClick={handleGoogleLogout}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  disabled={isSheetsLoading}
                  className="gsi-material-button self-start sm:self-auto"
                  style={{ margin: 0 }}
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents text-xs font-bold">Vincular Conta Google</span>
                  </div>
                </button>
              )}
            </div>

            {sheetsError && (
              <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{sheetsError}</div>
              </div>
            )}

            {sheetsSuccess && (
              <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>{sheetsSuccess}</div>
              </div>
            )}

            {googleUser ? (
              <div className="space-y-4">
                {spreadsheetId ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#C5A880] font-mono block">Planilha Vinculada</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-800">{spreadsheetName || "Carregando..."}</span>
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-slate-600 inline-flex items-center"
                          title="Abrir planilha em nova guia"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono truncate max-w-md">ID: {spreadsheetId}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleExportToGoogleSheets}
                        disabled={isSheetsLoading || data.length === 0}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        title="Sobrescrever planilha com dados do app"
                      >
                        {isSheetsLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 rotate-45" />
                        )}
                        Exportar p/ Google Sheets
                      </button>
                      <button
                        onClick={handleImportFromGoogleSheets}
                        disabled={isSheetsLoading}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        title="Carregar dados da planilha para o app"
                      >
                        {isSheetsLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Importar do Google Sheets
                      </button>
                      <button
                        onClick={handleUnlinkSpreadsheet}
                        disabled={isSheetsLoading}
                        className="px-2.5 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold rounded-lg text-xs cursor-pointer transition-colors border border-transparent hover:border-red-100"
                      >
                        Desvincular Planilha
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 text-center space-y-4">
                    <div className="max-w-md mx-auto space-y-1.5">
                      <p className="text-sm font-bold text-slate-700">Nenhuma planilha vinculada para sincronização</p>
                      <p className="text-xs text-slate-500">
                        Crie uma nova planilha no seu Google Drive com um clique, ou cole o ID de uma planilha que você já possui para vinculá-la.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 flex-wrap max-w-lg mx-auto">
                      <button
                        onClick={handleCreateSpreadsheet}
                        disabled={isSheetsLoading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        {isSheetsLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        )}
                        Criar Nova Planilha
                      </button>

                      <div className="h-4 w-[1px] bg-slate-300 hidden sm:block" />

                      <div className="flex items-center gap-1 w-full sm:w-auto">
                        <input
                          type="text"
                          placeholder="ID ou link do Google Sheets"
                          className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg w-full sm:w-48 focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                          id="existing-sheet-input"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleLinkExistingSpreadsheet((e.target as HTMLInputElement).value);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const el = document.getElementById("existing-sheet-input") as HTMLInputElement;
                            if (el) handleLinkExistingSpreadsheet(el.value);
                          }}
                          disabled={isSheetsLoading}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Vincular ID
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center">
                <p className="text-xs text-slate-500">
                  Vincule sua conta Google para salvar os cadastros de professores diretamente no Google Drive e ler as alterações feitas lá.
                </p>
              </div>
            )}

            {/* Sincronização Automática via Google Apps Script */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4 text-left">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Sincronização Automática em Tempo Real (Sem Autenticação)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Como sua planilha é compartilhada publicamente para edição, você pode fazer com que cada novo cadastro caia nela <strong>instantaneamente e de forma automática</strong> sem precisar de login ou cliques extras!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Cole aqui a URL da Web App do Google Apps Script (https://script.google.com/.../exec)"
                  className="px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-lg flex-1 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                  value={googleScriptUrlInput}
                  onChange={(e) => {
                    setGoogleScriptUrlInput(e.target.value);
                    setScriptTestResult(null); // Clear test result on change
                  }}
                />
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleTestScriptConnection}
                    disabled={isTestingScript || !googleScriptUrlInput.trim()}
                    className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 min-w-[100px]"
                  >
                    {isTestingScript ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Testar Conexão"
                    )}
                  </button>
                  <button
                    onClick={() => handleSaveGoogleScriptUrl(googleScriptUrlInput)}
                    disabled={isSheetsLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center min-w-[90px]"
                  >
                    {isSheetsLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Salvar URL"
                    )}
                  </button>
                </div>
              </div>

              {scriptTestResult && (
                <div className={`text-xs border rounded-xl p-3 flex items-start gap-2 ${
                  scriptTestResult.success 
                    ? "text-emerald-800 bg-emerald-50/50 border-emerald-100" 
                    : "text-red-700 bg-red-50/50 border-red-100"
                }`}>
                  {scriptTestResult.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  )}
                  <div>
                    <p className="font-bold">{scriptTestResult.success ? "Sucesso no Teste!" : "Erro na Conexão"}</p>
                    <p className="mt-0.5 font-normal text-slate-600 leading-normal">{scriptTestResult.message}</p>
                  </div>
                </div>
              )}

              {googleScriptUrl && (
                <div className="text-xs text-slate-600 bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Sincronização em tempo real ativa! Novos cadastros cairão na planilha na hora.</span>
                  </div>
                  <button
                    onClick={() => {
                      setGoogleScriptUrlInput("");
                      handleSaveGoogleScriptUrl("");
                    }}
                    className="text-red-600 hover:text-red-700 font-semibold"
                  >
                    Desativar
                  </button>
                </div>
              )}

              {/* Toggle Instructions button */}
              <div>
                <button
                  onClick={() => setShowScriptInstructions(!showScriptInstructions)}
                  className="text-xs text-[#C5A880] hover:text-[#b59870] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  {showScriptInstructions ? "Ocultar instruções de instalação" : "Como configurar o Google Apps Script na planilha? (Passo a passo rápido)"}
                </button>
              </div>

              {showScriptInstructions && (
                <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/50 space-y-4 text-xs text-slate-600 leading-relaxed">
                  <div className="space-y-2">
                    <p className="font-bold text-slate-700">Siga estes 5 passos simples:</p>
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>
                        No seu Google Sheets, clique no menu superior em <strong>Extensões</strong> (Extensions) e depois em <strong>Apps Script</strong>.
                      </li>
                      <li>
                        Apague qualquer código que estiver lá e cole o seguinte código:
                      </li>
                    </ol>
                  </div>

                  {/* Code Block with Copy */}
                  <div className="relative bg-slate-900 rounded-lg p-3 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-60">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(googleScriptCode);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 2000);
                      }}
                      className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-sans cursor-pointer"
                    >
                      {copiedScript ? "Copiado!" : "Copiar Código"}
                    </button>
                    <pre className="whitespace-pre">{googleScriptCode}</pre>
                  </div>

                  <div className="space-y-2">
                    <ol className="list-decimal pl-4 space-y-2" start={3}>
                      <li>
                        Clique no botão azul <strong>Implantar</strong> (ou <strong>Deploy</strong>) no topo direito, selecione <strong>Nova implantação</strong> (New deployment).
                      </li>
                      <li>
                        Clique na engrenagem ao lado de "Selecionar tipo" e escolha <strong>App da Web</strong> (Web App).
                      </li>
                      <li>
                        Configure assim:
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li><strong>Descrição:</strong> Cadastro FBX</li>
                          <li><strong>Executar como:</strong> Eu (seu e-mail)</li>
                          <li><strong>Quem tem acesso:</strong> Qualquer um (ou "Anyone")</li>
                        </ul>
                      </li>
                      <li>
                        Clique em <strong>Implantar</strong>. O Google pedirá para autorizar o script (pode clicar em "Avançado" e "Acessar...").
                      </li>
                      <li>
                        Copie a <strong>URL do App da Web</strong> gerada e cole no campo acima! Clique em "Salvar URL" e pronto!
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Filters Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4" id="filters-container">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Title */}
              <div>
                <h3 className="text-base font-serif font-bold italic text-slate-900">Banco de Talentos FBX</h3>
                <p className="text-xs text-slate-500">Exibindo {filteredData.length} de {totalCount} profissionais cadastrados</p>
              </div>

              {/* Action Buttons to Export */}
              <div className="flex items-center gap-2 flex-wrap">
                {spreadsheetId && (
                  <button
                    onClick={async () => {
                      setIsSheetsLoading(true);
                      setSheetsError(null);
                      setSheetsSuccess(null);
                      try {
                        const res = await fetch("/api/config/sync-from-sheet", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                          }
                        });
                        const resData = await res.json();
                        if (res.ok && resData.success) {
                          setData(resData.registrations || []);
                          setSheetsSuccess(resData.message || "Lista de talentos atualizada com a planilha com sucesso!");
                        } else {
                          throw new Error(resData.error || "Falha ao sincronizar.");
                        }
                      } catch (err: any) {
                        setSheetsError(err.message || "Falha ao sincronizar.");
                      } finally {
                        setIsSheetsLoading(false);
                      }
                    }}
                    disabled={isSheetsLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Carregar dados em tempo real da planilha conectada"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSheetsLoading ? "animate-spin" : ""}`} />
                    Atualizar da Planilha
                  </button>
                )}
                <button
                  onClick={handleCopyToClipboard}
                  disabled={filteredData.length === 0}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Copiar no formato de planilha para dar Ctrl+V no Google Sheets"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar p/ Google Sheets (Ctrl+V)
                </button>
                <button
                  onClick={handleDownloadCSV}
                  disabled={filteredData.length === 0}
                  className="px-4 py-2 bg-[#C5A880] hover:bg-[#b59870] disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Baixar arquivo .CSV compatível com Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Planilha (CSV)
                </button>
              </div>
            </div>

            {/* Grid Search & Select fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar por nome, CPF, e-mail, fone..."
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] text-xs transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* RA dropdown */}
              <div className="relative">
                <select
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] text-xs appearance-none cursor-pointer transition-all"
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                >
                  <option value="">Região: Todas</option>
                  {REGIOES_ADMINISTRATIVAS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Specialty dropdown */}
              <div className="relative">
                <select
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] text-xs appearance-none cursor-pointer transition-all"
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                >
                  <option value="all">Atuação: Todas</option>
                  <option value="pedagogical">Xadrez Pedagógico</option>
                  <option value="highPerformance">Alto Rendimento</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* FIDE Title dropdown */}
              <div className="relative">
                <select
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] text-xs appearance-none cursor-pointer transition-all"
                  value={filterTitle}
                  onChange={(e) => setFilterTitle(e.target.value)}
                >
                  <option value="">Titulação: Todas</option>
                  {UNIQUE_TITLES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Desktop Tabular List / Mobile Layout Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] overflow-hidden" id="admin-table-wrapper">
            {loading ? (
              <div className="p-12 text-center" id="admin-table-loading">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#C5A880] mb-2" />
                <p className="text-xs text-slate-500">Buscando banco de profissionais na federação...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="p-12 text-center text-slate-400" id="admin-table-empty">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Nenhum profissional cadastrado encontrado</p>
                <p className="text-xs text-slate-400 mt-1">Experimente limpar seus filtros ou termos de busca.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <th className="px-5 py-3 font-semibold">Profissional</th>
                      <th className="px-4 py-3 font-semibold">Local (RA)</th>
                      <th className="px-4 py-3 font-semibold">Contato</th>
                      <th className="px-4 py-3 text-center font-semibold">Titulação</th>
                      <th className="px-4 py-3 font-semibold">Atuação</th>
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Name & CPF */}
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            CPF: {item.cpf} • Nasc: {item.birthDate ? new Date(item.birthDate + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
                          </div>
                        </td>
                        {/* RA Region */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                            <MapPin className="w-3 h-3 text-[#C5A880]" />
                            {item.administrativeRegion}
                          </span>
                        </td>
                        {/* Contact details */}
                        <td className="px-4 py-3.5 space-y-0.5">
                          <div className="font-mono text-slate-800">{item.phone}</div>
                          <div className="text-slate-500 font-mono truncate max-w-xs">{item.email}</div>
                        </td>
                        {/* FIDE Title */}
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.fideTitle === "Nenhuma" 
                              ? "bg-slate-100 text-slate-600 border border-slate-200" 
                              : "bg-[#C5A880]/10 text-[#C5A880] border border-[#C5A880]/30"
                          }`}>
                            {item.fideTitle}
                          </span>
                        </td>
                        {/* Specialty Tags */}
                        <td className="px-4 py-3.5 space-y-1">
                          {item.specialties.pedagogical && (
                            <span className="inline-flex items-center gap-0.5 bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[9px] font-semibold mr-1">
                              Pedagógico
                            </span>
                          )}
                          {item.specialties.highPerformance && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[9px] font-semibold">
                              Alto Rendimento
                            </span>
                          )}
                        </td>
                        {/* Actions buttons column */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedTrainer(item)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Ver Detalhes Completos"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(item.id)}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="Remover Registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* EXPANDED PROFESSIONAL DETAIL MODAL */}
          {selectedTrainer && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="trainer-detail-modal">
              <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6">
                
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A880] font-mono">
                      Ficha Completa do Profissional
                    </span>
                    <h4 className="text-xl font-serif font-bold italic text-slate-900 mt-1">{selectedTrainer.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {selectedTrainer.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTrainer(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body Info Columns */}
                <div className="space-y-4">
                  {/* Grid fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">CPF</div>
                      <div className="font-mono text-slate-900 mt-1 font-semibold">{selectedTrainer.cpf}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Nascimento</div>
                      <div className="font-mono text-slate-900 mt-1 font-semibold">
                        {selectedTrainer.birthDate 
                          ? new Date(selectedTrainer.birthDate + "T00:00:00").toLocaleDateString("pt-BR") 
                          : "Não informado"}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Cadastrado Em</div>
                      <div className="text-slate-900 mt-1 font-semibold">
                        {new Date(selectedTrainer.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>

                  {/* Grid Contact Cards with Link Launchers */}
                  <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                    <h5 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5">Contatos e Redes</h5>
                    
                    <div className="space-y-2 text-xs">
                      {/* Phone WhatsApp link */}
                      <a
                        href={`https://wa.me/55${selectedTrainer.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 bg-white hover:bg-[#C5A880]/5 rounded-lg border border-slate-200 transition-colors text-slate-800 hover:border-[#C5A880]"
                      >
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-[#C5A880]" />
                          <span className="font-mono font-medium text-slate-900">{selectedTrainer.phone}</span>
                        </div>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          <Send className="w-2.5 h-2.5" /> Chamar WhatsApp
                        </span>
                      </a>

                      {/* Email link */}
                      <a
                        href={`mailto:${selectedTrainer.email}`}
                        className="flex items-center justify-between p-2 bg-white hover:bg-[#C5A880]/5 rounded-lg border border-slate-200 transition-colors text-slate-800 hover:border-[#C5A880]"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#C5A880]" />
                          <span className="font-mono text-slate-900 truncate max-w-[220px]">{selectedTrainer.email}</span>
                        </div>
                        <span className="text-[9px] bg-sky-55 text-sky-800 font-bold px-1.5 py-0.5 rounded-md">
                          Enviar E-mail
                        </span>
                      </a>

                      {/* Instagram link */}
                      {selectedTrainer.instagram ? (
                        <a
                          href={`https://instagram.com/${selectedTrainer.instagram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-white hover:bg-[#C5A880]/5 rounded-lg border border-slate-200 transition-colors text-slate-800 hover:border-[#C5A880]"
                        >
                          <div className="flex items-center gap-2">
                            <Instagram className="w-4 h-4 text-[#C5A880]" />
                            <span className="font-medium text-slate-900">{selectedTrainer.instagram}</span>
                          </div>
                          <span className="text-[9px] bg-pink-50 text-pink-700 font-bold px-1.5 py-0.5 rounded-md">
                            Ver Perfil
                          </span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200/50 text-slate-400">
                          <Instagram className="w-4 h-4" />
                          <span>Instagram não informado</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Specialty and RA */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Atuação</div>
                      <div className="mt-1.5 space-y-1">
                        {selectedTrainer.specialties.pedagogical && (
                          <div className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium text-[10px] w-full">
                            <BookOpen className="w-3 h-3 text-[#C5A880]" /> Pedagogia do Xadrez
                          </div>
                        )}
                        {selectedTrainer.specialties.highPerformance && (
                          <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-medium text-[10px] w-full">
                            <Trophy className="w-3 h-3 text-[#C5A880]" /> Alto Rendimento
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Região DF (Atendimento)</div>
                      <div className="mt-1.5 font-bold text-slate-900 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
                        {selectedTrainer.administrativeRegion}
                      </div>
                    </div>
                  </div>

                  {/* Hours Availability */}
                  <div>
                    <div className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mb-1.5">Disponibilidade de Horário</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTrainer.availability.map((av) => (
                        <span key={av} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#C5A880]" />
                          {av === "morning" ? "Manhã" : av === "afternoon" ? "Tarde" : av === "night" ? "Noite" : "Fins de Semana"}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Resume Curriculum Bio */}
                  {selectedTrainer.bio && (
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Histórico de Trabalho / Currículo</div>
                      <p className="text-xs text-slate-800 bg-slate-50 border border-slate-100 p-3 rounded-lg leading-relaxed font-sans italic">
                        "{selectedTrainer.bio}"
                      </p>
                    </div>
                  )}

                  {/* Extra Notes */}
                  {selectedTrainer.notes && (
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Observações Adicionais</div>
                      <p className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-dashed border-slate-200">
                        {selectedTrainer.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal actions footer */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(selectedTrainer.id);
                    }}
                    className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Registro
                  </button>
                  <button
                    onClick={() => setSelectedTrainer(null)}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CRITICAL DELETE CONFIRMATION DRAWER/DIALOG */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-fade-in" id="delete-confirm-modal">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-red-100 text-center space-y-4">
                <div className="mx-auto w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold italic text-slate-900 text-base">Confirmar Exclusão?</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Você está prestes a apagar o cadastro deste professor de xadrez permanentemente. Esta ação não poderá ser desfeita.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    disabled={actionLoading !== null}
                    className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    disabled={actionLoading !== null}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    {actionLoading !== null ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Confirmar Excluir"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
