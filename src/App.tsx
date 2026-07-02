import React, { useState } from "react";
import TrainerForm from "./components/TrainerForm";
import AdminPanel from "./components/AdminPanel";
import PublicTalentBank from "./components/PublicTalentBank";
import { Shield, ClipboardList, Crown, CheckCircle, ExternalLink } from "lucide-react";

type ViewState = "form" | "success" | "admin";

export default function App() {
  const [view, setView] = useState<ViewState>("form");

  const handleRegistrationSuccess = () => {
    setView("success");
  };

  const isPublicPage = window.location.pathname === "/banco-de-talentos" || window.location.pathname === "/talentos";

  if (isPublicPage) {
    return <PublicTalentBank />;
  }

  if (view === "admin") {
    return (
      <div className="min-h-screen bg-[#fdfdfc] text-slate-900 font-sans" id="app-container">
        {/* Subtle upper accent strip */}
        <div className="h-1 bg-gradient-to-r from-slate-900 via-[#C5A880] to-slate-900" />
        
        {/* Full width admin panel */}
        <main className="w-full" id="main-content">
          <AdminPanel onBackToForm={() => setView("form")} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfdfc] flex flex-col md:flex-row font-sans text-slate-900" id="app-container">
      {/* Left Sidebar: Sticky & Brand Context (Editorial Hero Panel) */}
      <aside className="w-full md:w-[380px] bg-[#0f172a] text-white p-8 md:p-12 flex flex-col justify-between shrink-0 md:sticky md:top-0 md:h-screen border-b md:border-b-0 md:border-r border-slate-800">
        <div className="space-y-8">
          {/* Logo PNG on top of heading */}
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

          <div className="space-y-4">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#C5A880] font-semibold font-mono">
              Distrito Federal
            </span>
            <h1 className="text-4xl md:text-5xl font-serif leading-[1.15] italic text-slate-100">
              Cadastro de <br/>
              <span className="text-[#C5A880] not-italic font-semibold">Professores</span> <br/>
              e Treinadores
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-[280px]">
              Banco centralizado da Federação Brasiliense de Xadrez para indicação de profissionais qualificados em Brasília.
            </p>
          </div>
        </div>

        {/* Footer info in Sidebar */}
        <div className="space-y-5 mt-12 md:mt-0">
          <div className="h-[1px] bg-slate-800 w-full" />
          <div className="flex items-center gap-3">
            <img 
              src="/logo_fbx.png" 
              alt="FBX Logo Footer" 
              className="h-10 w-10 object-contain bg-white p-0.5 rounded-lg shrink-0" 
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-semibold font-sans">
                Credenciamento Oficial
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                FBX • Filiada à CBX
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Canvas: Content Area */}
      <div className="flex-1 min-h-screen bg-[#fdfdfc] p-6 sm:p-12 flex flex-col justify-between" id="right-content-canvas">
        <div className="max-w-2xl w-full mx-auto space-y-8">
          
          {/* Header context */}
          <div className="border-b border-slate-100 pb-4 flex justify-between items-end">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold font-mono">
                {view === "form" ? "Ficha de Inscrição" : "Sucesso"}
              </span>
              <h2 className="text-xl md:text-2xl font-serif italic text-slate-800 mt-0.5">
                {view === "form" ? "Insira suas qualificações" : "Inscrição Concluída"}
              </h2>
            </div>
            
            {/* Direct Admin toggle link in header */}
            <button
              onClick={() => setView("admin")}
              className="text-xs font-semibold text-slate-400 hover:text-[#C5A880] transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              Acesso Restrito
            </button>
          </div>

          {/* Form screen */}
          {view === "form" && (
            <div className="animate-fade-in">
              <TrainerForm onSuccess={handleRegistrationSuccess} />
            </div>
          )}

          {/* Success screen */}
          {view === "success" && (
            <div className="bg-white rounded-2xl border border-slate-200/60 p-8 space-y-6 animate-fade-in max-w-xl mx-auto" id="success-screen">
              {/* Award Trophy Circle */}
              <div className="mx-auto w-20 h-20 bg-[#C5A880]/10 border border-dashed border-[#C5A880] rounded-full flex items-center justify-center text-[#C5A880] relative">
                <Crown className="w-10 h-10 animate-pulse" />
                <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 border-2 border-white">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-serif italic font-bold text-slate-900">Cadastro Enviado com Sucesso!</h3>
                <p className="text-xs text-[#C5A880] font-bold uppercase tracking-widest font-mono">
                  Seja bem-vindo ao Banco de Talentos
                </p>
                <p className="text-sm text-slate-500 leading-relaxed pt-2">
                  Seus dados, qualificações e disponibilidade regional foram guardados com segurança. A FBX utilizará esta base centralizada para futuras indicações de instrutores e coordenadores de projetos de xadrez em Brasília.
                </p>
              </div>

              {/* Checklist details of registration */}
              <div className="p-4 bg-slate-50 rounded-xl text-left text-xs space-y-2 max-w-sm mx-auto border border-slate-200/50">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-2">
                  <Shield className="w-4 h-4 text-[#C5A880]" /> Informações de Registro
                </h4>
                <div className="flex justify-between">
                  <span className="text-slate-400">Canal:</span>
                  <span className="font-semibold text-slate-800">Ficha de Instrutor DF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Validade:</span>
                  <span className="font-semibold text-emerald-600">Ativo / Regularizado</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Banco de Dados:</span>
                  <span className="font-semibold text-slate-800 font-mono">FBX centralizado</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                <button
                  onClick={() => setView("form")}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cadastrar Outro Instrutor
                </button>
                <button
                  onClick={() => window.open("https://www.fbxadrez.com.br", "_blank")}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 justify-center transition-colors cursor-pointer"
                >
                  Ir para o Site da FBX
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Dynamic Canvas Footer */}
        <footer className="max-w-2xl w-full mx-auto mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <span>© 2026 Federação Brasiliense de Xadrez. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <button
              onClick={() => setView("admin")}
              className="hover:text-[#C5A880] transition-colors font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" /> Painel Admin
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
