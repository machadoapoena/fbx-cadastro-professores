import React, { useState, useEffect } from "react";
import { 
  Search, Phone, MapPin, BookOpen, Trophy, Loader2, 
  ChevronDown, ExternalLink, RefreshCw, FileSpreadsheet, ShieldCheck, Info
} from "lucide-react";
import { REGIOES_ADMINISTRATIVAS } from "../utils/regions";

interface PublicTrainer {
  id: string;
  name: string;
  phone: string;
  administrativeRegion: string;
  fideTitle: string;
  specialties: {
    pedagogical: boolean;
    highPerformance: boolean;
  };
  availability: string[];
}

export default function PublicTalentBank() {
  const [data, setData] = useState<PublicTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [filterTitle, setFilterTitle] = useState("");

  const fetchPublicData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/public-registrations");
      if (!response.ok) {
        throw new Error("Não foi possível carregar os dados.");
      }
      const result = await response.json();
      setData(result || []);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao carregar o banco de talentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData();
  }, []);

  // Filter Logic
  const filteredData = data.filter((item) => {
    // 1. Text Search
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      !term ||
      item.name.toLowerCase().includes(term) ||
      item.phone.toLowerCase().includes(term) ||
      item.administrativeRegion.toLowerCase().includes(term) ||
      item.fideTitle.toLowerCase().includes(term);

    // 2. Region Filter
    const matchesRegion = !filterRegion || item.administrativeRegion === filterRegion;

    // 3. Specialty Filter
    let matchesSpecialty = true;
    if (filterSpecialty === "pedagogical") {
      matchesSpecialty = item.specialties.pedagogical;
    } else if (filterSpecialty === "highPerformance") {
      matchesSpecialty = item.specialties.highPerformance;
    }

    // 4. FIDE Title Filter
    const matchesTitle = !filterTitle || item.fideTitle === filterTitle;

    return matchesSearch && matchesRegion && matchesSpecialty && matchesTitle;
  });

  // Unique FIDE titles present in current loaded dataset
  const UNIQUE_TITLES = Array.from(new Set(data.map((item) => item.fideTitle))).filter(Boolean).sort();

  return (
    <div className="min-h-screen bg-[#fdfdfc] text-slate-900 font-sans flex flex-col" id="public-talent-root">
      {/* Editorial Header Panel */}
      <header className="bg-[#0f172a] text-white py-12 px-6 border-b border-slate-800 relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-900 via-[#C5A880] to-slate-900" />
        
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img 
              src="/logo_fbx.png" 
              alt="FBX Logo" 
              className="h-16 w-16 object-contain bg-white p-1 rounded-xl shadow-md border border-slate-700" 
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="font-serif font-bold tracking-tight text-xl text-white block">FBX</span>
              <span className="text-[9px] uppercase tracking-wider text-[#C5A880] font-semibold font-mono">Federação Brasiliense de Xadrez</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-semibold font-mono">
              Banco de Talentos Público
            </span>
            <h1 className="text-2xl md:text-3xl font-serif italic font-bold text-slate-100">
              Professores Credenciados
            </h1>
            <p className="text-slate-400 text-xs max-w-md">
              Lista oficial e atualizada em tempo real dos profissionais cadastrados na FBX habilitados a lecionar xadrez no Distrito Federal.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* Advisory banner for more info */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900" id="public-info-advisory">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-950">Precisa de mais informações sobre algum professor ou treinador?</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Caso queira obter informações detalhadas sobre a atuação, currículo ou referências de qualquer profissional credenciado, por favor entre em contato diretamente com a <strong>Federação Brasiliense de Xadrez (FBX)</strong>.
            </p>
          </div>
        </div>

        {/* Table Filters Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4" id="public-filters-container">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">Pesquisa de Profissionais</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exibindo {filteredData.length} de {data.length} professores encontrados
              </p>
            </div>

            <button
              onClick={fetchPublicData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Sincronizar da Planilha
            </button>
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
                placeholder="Pesquisar por nome ou telefone..."
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

        {/* List Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#C5A880] mb-2" />
            <p className="text-xs text-slate-500 font-medium">Buscando banco de profissionais sincronizado com a planilha...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50/50 border border-red-100 rounded-2xl p-8 text-center text-red-800">
            <p className="font-semibold text-sm">Não foi possível carregar o banco de talentos.</p>
            <p className="text-xs text-red-600/80 mt-1">{error}</p>
            <button
              onClick={fetchPublicData}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum profissional cadastrado encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Experimente limpar seus filtros ou termos de busca.</p>
          </div>
        ) : (
          <>
            {/* Desktop and Tablet Tabular List */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <th className="px-5 py-3.5 font-semibold">Profissional</th>
                      <th className="px-4 py-3.5 font-semibold">Região (RA)</th>
                      <th className="px-4 py-3.5 font-semibold">Contato</th>
                      <th className="px-4 py-3.5 text-center font-semibold">Titulação</th>
                      <th className="px-4 py-3.5 font-semibold">Atuação</th>
                      <th className="px-5 py-3.5 text-right font-semibold">Conectar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Name */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {item.name}
                            <span className="inline-flex items-center text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm font-mono font-medium">
                              Credenciado
                            </span>
                          </div>
                        </td>
                        {/* Region */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
                            {item.administrativeRegion}
                          </span>
                        </td>
                        {/* Phone */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-slate-800 font-medium">{item.phone}</span>
                        </td>
                        {/* Title */}
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.fideTitle === "Nenhuma" 
                              ? "bg-slate-100 text-slate-600 border border-slate-200" 
                              : "bg-[#C5A880]/10 text-[#C5A880] border border-[#C5A880]/30"
                          }`}>
                            {item.fideTitle}
                          </span>
                        </td>
                        {/* Specialty tags */}
                        <td className="px-4 py-4 space-y-1">
                          {item.specialties.pedagogical && (
                            <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[9px] font-semibold mr-1">
                              Pedagógico
                            </span>
                          )}
                          {item.specialties.highPerformance && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[9px] font-semibold">
                              Alto Rendimento
                            </span>
                          )}
                        </td>
                        {/* Connection action */}
                        <td className="px-5 py-4 text-right">
                          <a
                            href={`https://wa.me/55${item.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Phone className="w-3 h-3" />
                            WhatsApp
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards Layout */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredData.map((item) => (
                <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{item.name}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-medium border border-emerald-100">
                          Credenciado FBX
                        </span>
                        {item.fideTitle !== "Nenhuma" && (
                          <span className="text-[9px] text-[#C5A880] bg-[#C5A880]/10 px-1.5 py-0.5 rounded font-mono font-bold border border-[#C5A880]/20">
                            {item.fideTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/55${item.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full border border-emerald-100 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Região</div>
                      <div className="font-medium text-slate-800 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
                        {item.administrativeRegion}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Telefone</div>
                      <div className="font-mono text-slate-800 font-medium mt-0.5">{item.phone}</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold mb-1">Especialidade</div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.specialties.pedagogical && (
                        <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                          <BookOpen className="w-3 h-3 text-[#C5A880]" /> Pedagogia do Xadrez
                        </span>
                      )}
                      {item.specialties.highPerformance && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                          <Trophy className="w-3 h-3 text-[#C5A880]" /> Alto Rendimento
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={`https://wa.me/55${item.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Entrar em contato via WhatsApp
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 text-xs py-8 px-6 text-center border-t border-slate-800">
        <div className="max-w-6xl mx-auto space-y-2">
          <p>© 2026 Federação Brasiliense de Xadrez. Todos os direitos reservados.</p>
          <p className="text-[10px] text-slate-500">
            Filiada à Confederação Brasileira de Xadrez (CBX) • Brasília, Distrito Federal
          </p>
        </div>
      </footer>
    </div>
  );
}
