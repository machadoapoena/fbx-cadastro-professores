import React, { useState, useEffect } from "react";
import { 
  Lock, ArrowLeft, Search, Filter, Trash2, Download, 
  Copy, FileSpreadsheet, Eye, User, Phone, Mail, Instagram, 
  MapPin, Calendar, BookOpen, Trophy, Award, Key, Loader2, 
  CheckCircle, ChevronDown, Check, Send, AlertTriangle
} from "lucide-react";
import { TrainerRegistration } from "../types";
import { REGIOES_ADMINISTRATIVAS } from "../utils/regions";

interface AdminPanelProps {
  onBackToForm: () => void;
}

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

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("fbx_admin_token");
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchRegistrations(savedToken);
    }
  }, []);

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
