import React, { useState } from "react";
import { 
  User, Mail, Phone, Instagram, Award, MapPin, 
  BookOpen, Trophy, Calendar, CheckCircle, ChevronRight, 
  ChevronLeft, AlertCircle, FileText, Loader2, Sparkles
} from "lucide-react";
import { REGIOES_ADMINISTRATIVAS } from "../utils/regions";

interface TrainerFormProps {
  onSuccess: () => void;
}

export default function TrainerForm({ onSuccess }: TrainerFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    birthDate: "",
    phone: "",
    email: "",
    instagram: "",
    fideTitle: "Nenhuma",
    specialties: {
      pedagogical: false,
      highPerformance: false,
    },
    availability: [] as string[],
    administrativeRegion: "",
    bio: "",
    notes: "",
  });

  // CPF Masking
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    // Apply CPF mask (000.000.000-00)
    let formatted = value;
    if (value.length > 9) {
      formatted = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
    } else if (value.length > 6) {
      formatted = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
    } else if (value.length > 3) {
      formatted = `${value.slice(0, 3)}.${value.slice(3)}`;
    }
    
    setFormData({ ...formData, cpf: formatted });
  };

  // Phone Masking (61) 98888-8888
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    let formatted = value;
    if (value.length > 10) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 6) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
    } else if (value.length > 2) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      formatted = `(${value}`;
    }
    
    setFormData({ ...formData, phone: formatted });
  };

  const handleInstagramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim();
    if (value && !value.startsWith("@")) {
      value = "@" + value;
    }
    setFormData({ ...formData, instagram: value });
  };

  const toggleSpecialty = (key: "pedagogical" | "highPerformance") => {
    setFormData({
      ...formData,
      specialties: {
        ...formData.specialties,
        [key]: !formData.specialties[key],
      },
    });
  };

  const toggleAvailability = (time: string) => {
    const current = [...formData.availability];
    const index = current.indexOf(time);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(time);
    }
    setFormData({ ...formData, availability: current });
  };

  // Validations per step
  const validateStep = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.name.trim()) {
        setErrorMsg("Por favor, insira o nome completo.");
        return false;
      }
      const cpfDigits = formData.cpf.replace(/\D/g, "");
      if (cpfDigits.length !== 11) {
        setErrorMsg("Por favor, insira um CPF válido (11 dígitos).");
        return false;
      }
      if (!formData.birthDate) {
        setErrorMsg("Por favor, insira sua data de nascimento.");
        return false;
      }
      const phoneDigits = formData.phone.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        setErrorMsg("Por favor, insira um telefone de contato válido com DDD.");
        return false;
      }
      if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setErrorMsg("Por favor, insira um endereço de e-mail válido.");
        return false;
      }
    } else if (step === 2) {
      if (!formData.specialties.pedagogical && !formData.specialties.highPerformance) {
        setErrorMsg("Selecione pelo menos uma área de atuação (Xadrez Pedagógico ou Alto Rendimento).");
        return false;
      }
    } else if (step === 3) {
      if (!formData.administrativeRegion) {
        setErrorMsg("Por favor, selecione sua Região Administrativa de atuação.");
        return false;
      }
      if (formData.availability.length === 0) {
        setErrorMsg("Por favor, indique pelo menos um período de disponibilidade de horário.");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    setErrorMsg(null);
    setStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Ocorreu um erro ao processar o cadastro.");
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Helper translations for UI Availability
  const AVAILABILITY_OPTIONS = [
    { id: "morning", label: "Manhã (08h - 12h)" },
    { id: "afternoon", label: "Tarde (12h - 18h)" },
    { id: "night", label: "Noite (18h - 22h)" },
    { id: "weekend", label: "Finais de Semana" },
  ];

  const FIDE_TITLES = [
    "Nenhuma",
    "Mestre Nacional (NM)",
    "Candidato a Mestre (CM)",
    "Mestre FIDE (FM)",
    "Mestre Internacional (IM)",
    "Grande Mestre (GM)",
  ];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden" id="trainer-registration-card">
      {/* Visual Header Grid Panel */}
      <div className="bg-[#0f172a] text-white p-6 sm:p-8 relative border-b border-slate-800">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,#C5A880_0%,transparent_60%)] opacity-20 pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-0.5 bg-[#C5A880] text-slate-950 font-mono text-[10px] font-bold rounded-full uppercase tracking-wider">
            DF Central de Cadastro
          </span>
          <span className="text-slate-500 font-mono text-[10px]">V1.0</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif italic tracking-tight text-[#FAF9F6]">
          Ficha do Profissional
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md">
          Preencha com atenção os dados para indicações oficiais da Federação Brasiliense de Xadrez.
        </p>

        {/* Dynamic Chess-themed Step Progress Bar */}
        <div className="mt-8 flex items-center justify-between relative">
          {/* Progress bar line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-slate-800 z-0 rounded-full" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#C5A880] transition-all duration-300 ease-in-out z-0 rounded-full"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />

          {/* Steps */}
          {[1, 2, 3].map((s) => (
            <div key={s} className="z-10 flex flex-col items-center">
              <button
                type="button"
                onClick={() => s < step && setStep(s)}
                disabled={s >= step}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-xs transition-all duration-300 ${
                  step === s
                    ? "bg-[#C5A880] text-slate-950 ring-4 ring-slate-800 scale-110 shadow-lg"
                    : step > s
                    ? "bg-slate-800 text-[#C5A880] border border-[#C5A880]/30 cursor-pointer hover:bg-slate-700"
                    : "bg-slate-800/60 text-slate-600 cursor-not-allowed"
                }`}
              >
                {step > s ? <CheckCircle className="w-4 h-4 text-[#C5A880]" /> : s}
              </button>
              <span className={`text-[10px] font-semibold mt-2 tracking-wider uppercase font-sans transition-colors ${
                step === s ? "text-[#C5A880]" : "text-slate-500"
              }`}>
                {s === 1 ? "Identificação" : s === 2 ? "Atuação & Perfil" : "Horários & Locais"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6" id="fbx-registration-form">
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 animate-fade-in" id="error-alert">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{errorMsg}</div>
          </div>
        )}

        {/* STEP 1: IDENTIFICATION & CONTACT */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in" id="form-step-1">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-serif font-bold italic text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-[#C5A880]" />
                Dados Pessoais e de Contato
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Insira suas informações de contato primárias.</p>
            </div>

            {/* Name Field */}
            <div className="space-y-1">
              <label htmlFor="name-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Nome Completo <span className="text-amber-600">*</span>
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="name-input"
                  required
                  placeholder="Seu nome completo para indicações"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            {/* Grid for CPF & Birth Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CPF Field */}
              <div className="space-y-1">
                <label htmlFor="cpf-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  CPF <span className="text-amber-600">*</span>
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="cpf-input"
                    required
                    placeholder="000.000.000-00"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm font-mono"
                    value={formData.cpf}
                    onChange={handleCpfChange}
                  />
                </div>
                <p className="text-[10px] text-slate-400">Exclusivo para controle interno da FBX.</p>
              </div>

              {/* Birth Date Field */}
              <div className="space-y-1">
                <label htmlFor="birthdate-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Data de Nascimento <span className="text-amber-600">*</span>
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    id="birthdate-input"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm font-mono cursor-pointer"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                </div>
                <p className="text-[10px] text-slate-400">Necessário para controle de faixa etária.</p>
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="email-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                E-mail de Contato <span className="text-amber-600">*</span>
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  id="email-input"
                  required
                  placeholder="exemplo@gmail.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Grid for Telephone & Instagram */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone Field */}
              <div className="space-y-1">
                <label htmlFor="phone-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Telefone / WhatsApp <span className="text-amber-600">*</span>
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="phone-input"
                    required
                    placeholder="(61) 98888-8888"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm font-mono"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                  />
                </div>
              </div>

              {/* Instagram Field */}
              <div className="space-y-1">
                <label htmlFor="instagram-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Instagram
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Instagram className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="instagram-input"
                    placeholder="@fbxadrez"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    onBlur={handleInstagramChange}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PROFESSIONAL PROFILE */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in" id="form-step-2">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-serif font-bold italic text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#C5A880]" />
                Atuação e Qualificações
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Defina sua categoria profissional e suas qualificações como enxadrista.</p>
            </div>

            {/* FIDE Title Select Box */}
            <div className="space-y-1">
              <label htmlFor="fide-title-select" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Titulação FIDE ou Nacional
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Award className="h-4 w-4 text-[#C5A880]" />
                </div>
                <select
                  id="fide-title-select"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm appearance-none cursor-pointer"
                  value={formData.fideTitle}
                  onChange={(e) => setFormData({ ...formData, fideTitle: e.target.value })}
                >
                  {FIDE_TITLES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronRight className="h-4 w-4 transform rotate-90" />
                </div>
              </div>
            </div>

            {/* Specialties - Custom Chess Checkboxes */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Áreas de Atuação Prática <span className="text-amber-600">*</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pedagogical Card Option */}
                <div 
                  onClick={() => toggleSpecialty("pedagogical")}
                  className={`p-4 border rounded-xl cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.specialties.pedagogical 
                      ? "border-[#C5A880] bg-[#C5A880]/5 ring-1 ring-[#C5A880] shadow-[0_4px_12px_rgba(197,168,128,0.05)]" 
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                  id="specialty-pedagogical"
                >
                  <div className={`mt-0.5 rounded-full p-2 shrink-0 ${formData.specialties.pedagogical ? "bg-[#C5A880] text-slate-950" : "bg-slate-100 text-slate-600"}`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">Xadrez Pedagógico</span>
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={formData.specialties.pedagogical}
                        readOnly
                      />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Escolas, projetos sociais, aulas de iniciação, oficinas culturais e desenvolvimento cognitivo.
                    </p>
                  </div>
                </div>

                {/* High Performance Card Option */}
                <div 
                  onClick={() => toggleSpecialty("highPerformance")}
                  className={`p-4 border rounded-xl cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.specialties.highPerformance 
                      ? "border-[#C5A880] bg-[#C5A880]/5 ring-1 ring-[#C5A880] shadow-[0_4px_12px_rgba(197,168,128,0.05)]" 
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                  id="specialty-highperformance"
                >
                  <div className={`mt-0.5 rounded-full p-2 shrink-0 ${formData.specialties.highPerformance ? "bg-[#C5A880] text-slate-950" : "bg-slate-100 text-slate-600"}`}>
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">Alto Rendimento</span>
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={formData.specialties.highPerformance}
                        readOnly
                      />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Treinamento de táticas, teoria de aberturas, preparação mental, análise de partidas e torneios competitivos.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio Field */}
            <div className="space-y-1">
              <label htmlFor="bio-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Breve Currículo / Histórico de Trabalho
              </label>
              <textarea
                id="bio-input"
                rows={3}
                placeholder="Exemplo: Professor na rede pública há 5 anos, campeão brasiliense sub-20 em 2018, coordeno oficina de xadrez na RA de Taguatinga..."
                className="block w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
              <p className="text-[10px] text-slate-400">Ajuda a federação a escolher o profissional ideal para a oportunidade certa.</p>
            </div>
          </div>
        )}

        {/* STEP 3: REGION & AVAILABILITY */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in" id="form-step-3">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-serif font-bold italic text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#C5A880]" />
                Disponibilidade e Região de Atendimento
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Indique as localidades do Distrito Federal e horários que você pode assumir aulas.</p>
            </div>

            {/* Region Select Box */}
            <div className="space-y-1">
              <label htmlFor="region-select" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Região Administrativa (RA Principal) <span className="text-amber-600">*</span>
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-[#C5A880]" />
                </div>
                <select
                  id="region-select"
                  required
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm appearance-none cursor-pointer"
                  value={formData.administrativeRegion}
                  onChange={(e) => setFormData({ ...formData, administrativeRegion: e.target.value })}
                >
                  <option value="" disabled>Selecione a Região do DF</option>
                  {REGIOES_ADMINISTRATIVAS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronRight className="h-4 w-4 transform rotate-90" />
                </div>
              </div>
            </div>

            {/* Availability Selection Buttons */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Disponibilidade de Horários <span className="text-amber-600">*</span>
              </label>
              
              <div className="grid grid-cols-2 gap-3" id="availability-grid">
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const isSelected = formData.availability.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleAvailability(opt.id)}
                      className={`py-3 px-4 border rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#C5A880] bg-[#C5A880]/10 text-slate-900 ring-1 ring-[#C5A880]"
                          : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <Calendar className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#C5A880]" : "text-slate-400"}`} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400">Você pode selecionar mais de uma opção se houver horários livres flexíveis.</p>
            </div>

            {/* Notes Field */}
            <div className="space-y-1">
              <label htmlFor="notes-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Observações Especiais ou Preferências de Horário
              </label>
              <textarea
                id="notes-input"
                rows={2}
                placeholder="Exemplo: Tenho maior facilidade de locomoção se for próximo a estações de metrô. Posso dar aulas em escolas particulares às terças-feiras..."
                className="block w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all text-sm"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Form Footer Action Buttons */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-6" id="form-actions-footer">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg flex items-center gap-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              id="back-button"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
          ) : (
            <div className="w-1" /> // spacer to push next button right
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-2 text-xs font-semibold transition-colors shadow-xs ml-auto cursor-pointer"
              id="next-button"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#C5A880] hover:bg-[#b59870] disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-bold rounded-lg flex items-center gap-2 text-xs transition-colors shadow-xs ml-auto cursor-pointer"
              id="submit-button"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando dados...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Enviar Cadastro
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
