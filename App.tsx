
import React, { useState, useEffect, useMemo } from 'react';
import { READING_PLAN, PHASES, QUARTER_INFO, MONTH_NAMES, getReadingForDate, getPhaseProgress, getWeeklyPending } from './data/readingPlan';
import { BIBLE_DICTIONARY } from './data/dictionary';
import { UserProgress, ReadingEntry, Phase, Reminder, DictionaryTerm, Quarter, DailyGoalProgress } from './types';
import { 
  BookOpen, CheckCircle, Calendar, Trophy, MessageSquare, 
  Settings as SettingsIcon, Book, ArrowRight, Star, Heart, Flame,
  Search, Info, ArrowLeft, RefreshCw, Sparkles, Map, Layout,
  Bell, Plus, Trash2, Clock, ChevronRight, Download, CloudOff,
  Share2, Bookmark, Check, CloudDownload, X, Globe, List, Quote,
  Target, Zap, Sun, Moon, Anchor, Compass, Mountain
} from 'lucide-react';
import { generateSundayDevotional, getMessianicConnection, searchDictionaryTerm, generateWeeklyPhrase } from './services/geminiService';
import { fetchBibleText, saveTextOffline, isDownloaded, removeDownloaded } from './services/bibleService';

// --- Components ---

const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = {
    sm: 'h-10 md:h-12 w-auto',
    md: 'h-20 w-auto',
    lg: 'h-32 md:h-40 w-auto'
  };

  return (
    <div className="flex items-center justify-center">
      <img 
        src="https://i.postimg.cc/xT5qhsYJ/2.png" 
        alt="Jornada Bíblica Logo" 
        className={`${sizes[size]} object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500 ease-out`}
      />
    </div>
  );
};

const ProgressBar: React.FC<{ progress: number; label: string; sub: string }> = ({ progress, label, sub }) => (
  <div className="mb-6 group">
    <div className="flex justify-between items-end mb-2">
      <div>
        <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{label}</h4>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{sub}</p>
      </div>
      <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{progress}%</span>
    </div>
    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50 p-0.5 shadow-inner">
      <div 
        className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  </div>
);

const ViewHeader: React.FC<{ title: string; onBack?: () => void; subtitle?: string }> = ({ title, onBack, subtitle }) => (
  <div className="flex items-center gap-4 mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
    {onBack && (
      <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600 hover:scale-110 active:scale-95 transition-all">
        <ArrowLeft size={20} />
      </button>
    )}
    <div className="flex-1">
      <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{title}</h2>
      {subtitle && <p className="text-sm font-medium text-slate-500 mt-1">{subtitle}</p>}
    </div>
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; action?: React.ReactNode }> = ({ icon, title, action }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm">
        {icon}
      </div>
      <h3 className="font-black text-slate-800 text-lg tracking-tight">{title}</h3>
    </div>
    {action}
  </div>
);

const Footer: React.FC = () => (
  <footer className="mt-20 pb-12 text-center px-6 border-t border-slate-100 pt-12 max-w-lg mx-auto">
    <div className="flex justify-center gap-4 mb-8">
      <div className="w-2 h-2 rounded-full bg-indigo-200"></div>
      <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
      <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
    </div>
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed mb-2">
      @2026 - Jornada Bíblica - By Decleones Andrade
    </p>
    <p className="text-[12px] font-black text-indigo-500 uppercase italic tracking-tighter">
      Deus é Bom O TEMPO TODO Deus é bom
    </p>
  </footer>
);

// --- Main App ---

const App: React.FC = () => {
  const [user, setUser] = useState<UserProgress | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'dashboard' | 'reading' | 'devotional' | 'badges' | 'settings' | 'dictionary' | 'fullSchedule' | 'goals' | 'context' | 'prayer'>('dashboard');
  
  const [readingInfo, setReadingInfo] = useState<ReadingEntry | undefined>(undefined);
  const [bibleText, setBibleText] = useState("");
  const [loadingBible, setLoadingBible] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [reflection, setReflection] = useState("");
  const [devotional, setDevotional] = useState<any>(null);
  const [loadingDevotional, setLoadingDevotional] = useState(false);
  
  const [messiahText, setMessiahText] = useState("");
  const [isMessiahConnecting, setIsMessiahConnecting] = useState(false);

  const [searchDict, setSearchDict] = useState("");
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResult, setOnlineResult] = useState<DictionaryTerm | null>(null);

  const [phraseOfDay, setPhraseOfDay] = useState("");
  const [loadingPhrase, setLoadingPhrase] = useState(false);

  const pendingReadings = useMemo(() => user ? getWeeklyPending(currentDate, user.completedDates) : [], [user, currentDate]);
  const currentPhase = useMemo(() => readingInfo ? PHASES.find(p => p.id === readingInfo.phaseId) : null, [readingInfo]);

  const filteredDictionary = useMemo(() => {
    return BIBLE_DICTIONARY.filter(d => 
      d.term.toLowerCase().includes(searchDict.toLowerCase()) || 
      d.definition.toLowerCase().includes(searchDict.toLowerCase())
    ).sort((a, b) => a.term.localeCompare(b.term));
  }, [searchDict]);

  // Initial Load
  useEffect(() => {
    const saved = localStorage.getItem('jornada_biblica_user');
    if (saved) {
      const loadedUser = JSON.parse(saved);
      const todayStr = new Date().toISOString().split('T')[0];
      if (loadedUser.dailyGoalProgress?.date !== todayStr) {
        loadedUser.dailyGoalProgress = { date: todayStr, readingDone: false, prayerDone: false, extraDone: false };
      }
      setUser(loadedUser);
      const today = getReadingForDate(new Date());
      const lastDateStr = loadedUser.lastViewedDate || today?.date || "01-05";
      const matched = READING_PLAN.find(r => r.date === lastDateStr);
      setReadingInfo(matched || today);
    }
  }, []);

  useEffect(() => {
    if (user && readingInfo && !phraseOfDay) loadPhrase();
  }, [user, readingInfo]);

  const loadPhrase = async () => {
    if (!readingInfo) return;
    setLoadingPhrase(true);
    const phrase = await generateWeeklyPhrase(readingInfo.focus);
    setPhraseOfDay(phrase);
    setLoadingPhrase(false);
  };

  useEffect(() => {
    if (view === 'reading' && readingInfo && !readingInfo.isMeditationDay) loadReadingContent();
  }, [view, readingInfo, user?.version]);

  const loadReadingContent = async () => {
    if (!readingInfo) return;
    setLoadingBible(true);
    setBibleText("");
    try {
      const text = await fetchBibleText(readingInfo.reading, user?.version || "ARC");
      setBibleText(text);
      setIsCached(isDownloaded(readingInfo.reading, user?.version || "ARC"));
    } catch (err) {
      setBibleText("Erro ao carregar texto.");
    } finally {
      setLoadingBible(false);
    }
  };

  const saveProgress = (updatedUser: UserProgress) => {
    setIsSyncing(true);
    setUser(updatedUser);
    localStorage.setItem('jornada_biblica_user', JSON.stringify(updatedUser));
    setTimeout(() => setIsSyncing(false), 800);
  };

  const handleDownload = () => {
    if (!readingInfo || !bibleText || loadingBible) return;
    if (isCached) {
      removeDownloaded(readingInfo.reading, user?.version || "ARC");
      setIsCached(false);
    } else {
      saveTextOffline(readingInfo.reading, user?.version || "ARC", bibleText);
      setIsCached(true);
    }
  };

  const handleCompleteReading = (dateKeyOverride?: string) => {
    if (!user || (!readingInfo && !dateKeyOverride)) return;
    const dateKey = dateKeyOverride || readingInfo!.date;
    const updatedDates = user.completedDates.includes(dateKey) ? user.completedDates : [...user.completedDates, dateKey];
    const updatedReflections = { ...user.reflections, [dateKey]: reflection };
    let newBadges = [...user.badges];
    if (updatedDates.length === 1 && !newBadges.includes('Explorador')) newBadges.push('Explorador');
    PHASES.forEach(p => {
      const prog = getPhaseProgress(p.id, updatedDates);
      if (prog.percentage === 100 && !newBadges.includes(p.name)) newBadges.push(p.name);
    });
    saveProgress({ ...user, completedDates: updatedDates, reflections: updatedReflections, badges: newBadges, lastViewedDate: dateKey });
    setReflection("");
    setMessiahText("");
    setView('dashboard');
  };

  const toggleDailyGoal = (type: 'readingDone' | 'prayerDone' | 'extraDone') => {
    if (!user) return;
    const updatedProgress = { ...user.dailyGoalProgress, [type]: !user.dailyGoalProgress[type] };
    saveProgress({ ...user, dailyGoalProgress: updatedProgress });
  };

  const updateGoalConfig = (type: keyof UserProgress['dailyGoalsConfig'], value: number) => {
    if (!user) return;
    const updatedConfig = { ...user.dailyGoalsConfig, [type]: value };
    saveProgress({ ...user, dailyGoalsConfig: updatedConfig });
  };

  const loadDevotionalContent = async () => {
    if (!readingInfo || !user) return;
    if (user.savedDevotionals[readingInfo.date]) {
      setDevotional(user.savedDevotionals[readingInfo.date]);
      return;
    }
    setLoadingDevotional(true);
    const lastSixReadings = READING_PLAN
      .slice(Math.max(0, READING_PLAN.indexOf(readingInfo) - 6), READING_PLAN.indexOf(readingInfo))
      .map(r => r.reading);
    const data = await generateSundayDevotional(lastSixReadings, readingInfo.focus);
    if (data) {
      setDevotional(data);
      saveProgress({
        ...user,
        savedDevotionals: { ...user.savedDevotionals, [readingInfo.date]: data }
      });
    }
    setLoadingDevotional(false);
  };

  const handleOnlineSearch = async () => {
    if (!searchDict.trim() || isSearchingOnline) return;
    setIsSearchingOnline(true);
    const res = await searchDictionaryTerm(searchDict);
    if (res) setOnlineResult(res);
    setIsSearchingOnline(false);
  };

  const handleOnboarding = (name: string) => {
    const todayReading = getReadingForDate(new Date()) || READING_PLAN[0];
    const todayStr = new Date().toISOString().split('T')[0];
    saveProgress({
      userName: name, completedDates: [], reflections: {}, startDate: new Date().toISOString(), version: "ARC", badges: [], reminders: [], savedDevotionals: {}, lastViewedDate: todayReading.date,
      dailyGoalsConfig: { readingMinutes: 15, prayerMinutes: 10, extraChapters: 1 },
      dailyGoalProgress: { date: todayStr, readingDone: false, prayerDone: false, extraDone: false }
    });
    setReadingInfo(todayReading);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-white">
        <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-700 text-center">
            <Logo size="lg" />
            <h1 className="text-5xl font-black text-slate-900 mt-8 mb-3 tracking-tighter">Jornada Bíblica</h1>
            <p className="text-slate-500 font-bold text-lg mb-10">Inicie seu plano anual hoje.</p>
            <form onSubmit={(e) => { e.preventDefault(); handleOnboarding((e.currentTarget.elements.namedItem('name') as HTMLInputElement).value); }}>
              <input name="name" required className="w-full px-8 py-5 rounded-[1.75rem] border-2 border-slate-100 mb-8 outline-none focus:border-indigo-500 text-xl font-bold bg-slate-50" placeholder="Seu Nome" />
              <button className="w-full py-6 bg-slate-900 text-white rounded-[1.75rem] font-black text-lg flex items-center justify-center gap-4 hover:bg-indigo-600 transition-all">Iniciar Jornada <ArrowRight /></button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] pb-48">
      <header className="bg-white/80 backdrop-blur-3xl border-b border-slate-100 px-6 py-4 sticky top-0 z-[100]">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('dashboard')}><Logo size="sm" /></div>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setView('context')} className={`p-3 rounded-2xl transition-all ${view === 'context' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}><Compass size={22} /></button>
            <button onClick={() => setView('dictionary')} className={`p-3 rounded-2xl transition-all ${view === 'dictionary' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}><Search size={22} /></button>
            <button onClick={() => setView('settings')} className={`p-3 rounded-2xl transition-all ${view === 'settings' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}><SettingsIcon size={22} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-12">
        {view === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-1000">
            <section className="bg-gradient-to-br from-indigo-50 to-white p-12 rounded-[3.5rem] border border-indigo-100 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6"><Quote size={24} className="text-indigo-600" /><span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Mensagem do Dia</span></div>
                {loadingPhrase ? <div className="h-20 animate-pulse bg-indigo-100/50 rounded-2xl"></div> : <p className="text-3xl font-black text-slate-900 leading-tight italic">"{phraseOfDay}"</p>}
              </div>
              <Sparkles className="absolute top-10 right-10 text-indigo-100 opacity-50" size={120} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50">
                  <SectionTitle icon={<Flame size={20} />} title="Status" />
                  {currentPhase && <ProgressBar label={currentPhase.name} sub={`FASE ${currentPhase.id} de 10`} progress={getPhaseProgress(currentPhase.id, user.completedDates).percentage} />}
                </div>
                <div className="bg-indigo-600 text-white p-8 rounded-[3rem] shadow-xl">
                   <div className="flex items-center justify-between mb-6"><Target size={24} /><button onClick={() => setView('goals')} className="text-[10px] font-black uppercase bg-white/20 px-3 py-1 rounded-full">Meta Diária</button></div>
                   <div className="space-y-4">
                      {[{ label: 'Leitura', k: 'readingDone', i: Book }, { label: 'Oração', k: 'prayerDone', i: Heart }, { label: 'Extras', k: 'extraDone', i: Plus }].map(g => (
                        <div key={g.k} className="flex items-center gap-3"><div className={`p-2 rounded-xl ${user.dailyGoalProgress[g.k as keyof DailyGoalProgress] ? 'bg-emerald-400' : 'bg-white/10'}`}><g.i size={16} /></div><span className={`text-sm font-bold ${user.dailyGoalProgress[g.k as keyof DailyGoalProgress] ? 'line-through opacity-60' : ''}`}>{g.label}</span></div>
                      ))}
                   </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                {readingInfo ? (
                  <section className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-12"><span className="px-5 py-2 bg-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-100">{readingInfo.isMeditationDay ? "MEDITAÇÃO" : "PLANO DE HOJE"}</span></div>
                      <div className="mb-12"><h3 className="text-6xl font-black mb-6 tracking-tighter">{readingInfo.reading}</h3><p className="text-indigo-400 font-bold italic text-xl">Foco: {readingInfo.focus}</p></div>
                      {!user.completedDates.includes(readingInfo.date) ? (
                        <button onClick={() => setView(readingInfo.isMeditationDay ? 'devotional' : 'prayer')} className="px-16 py-7 bg-white text-slate-900 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-4 hover:bg-indigo-50 transition-all">
                            {readingInfo.isMeditationDay ? 'Ver Devocional' : 'Iniciar Leitura'} <ArrowRight />
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-4 px-10 py-6 bg-indigo-600/20 rounded-[2.5rem] border-2 border-indigo-600/30 text-indigo-400 font-black text-2xl"><Check /> Concluído</div>
                      )}
                    </div>
                  </section>
                ) : <div className="p-12 bg-white rounded-[4rem] border-2 border-dashed border-slate-200 text-center"><Calendar size={48} className="text-slate-200 mx-auto mb-4" /><p className="text-slate-400 font-bold">Cronograma Finalizado.</p></div>}
              </div>
            </div>
            <Footer />
          </div>
        )}

        {view === 'fullSchedule' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
            <ViewHeader title="Cronograma" subtitle="Plano Anual Completo" onBack={() => setView('dashboard')} />
            {[Quarter.Q1, Quarter.Q2, Quarter.Q3, Quarter.Q4].map(q => {
              const info = QUARTER_INFO[q];
              return (
                <section key={q} className="bg-white rounded-[3rem] shadow-xl border border-slate-50 overflow-hidden">
                  <div className="bg-amber-400/10 p-10 border-b border-amber-400/10">
                    <h3 className="text-3xl font-black text-slate-900 mb-2">{q}</h3>
                    <p className="text-slate-600 font-bold">{info.focus}</p>
                  </div>
                  <div className="p-8 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          <th className="p-4">Data</th>
                          <th className="p-4">Leitura</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {READING_PLAN.filter(r => r.quarter === q).map(r => (
                          <tr 
                            key={r.date} 
                            onClick={() => { setReadingInfo(r); setView(r.isMeditationDay ? 'devotional' : 'prayer'); }}
                            className="border-t border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="p-4 text-xs font-black text-slate-400">{r.date}</td>
                            <td className={`p-4 font-black ${r.isMeditationDay ? 'text-amber-600' : 'text-slate-800'}`}>{r.reading}</td>
                            <td className="p-4">
                              {user.completedDates.includes(r.date) ? <CheckCircle size={18} className="text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {view === 'devotional' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-700 pb-20">
             <ViewHeader title="Devocional do Dia" subtitle="Meditação e Descanso" onBack={() => setView('dashboard')} />
             <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-50">
                {!devotional && !loadingDevotional && (
                    <div className="text-center py-20">
                        <Moon size={48} className="text-indigo-200 mx-auto mb-6" />
                        <button onClick={loadDevotionalContent} className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl">Gerar Devocional com IA</button>
                    </div>
                )}
                {loadingDevotional && (
                    <div className="text-center py-20">
                        <RefreshCw className="animate-spin text-indigo-600 mx-auto mb-6" size={48} />
                        <p className="font-black text-indigo-400 uppercase tracking-widest">Preparando o banquete espiritual...</p>
                    </div>
                )}
                {devotional && (
                    <div className="prose prose-slate max-w-none">
                        <h3 className="text-4xl font-black mb-6 text-slate-900">{devotional.title}</h3>
                        <div className="bg-indigo-50 p-8 rounded-[2rem] italic font-serif text-2xl text-indigo-900 mb-10">"{devotional.verse}"</div>
                        <p className="text-xl text-slate-600 leading-relaxed mb-12">{devotional.reflection}</p>
                        <h4 className="font-black text-slate-900 mb-6">Ações Práticas:</h4>
                        <ul className="space-y-4 mb-12">
                            {devotional.practicalPoints.map((p: string, i: number) => <li key={i} className="flex gap-4 font-bold text-slate-700"><CheckCircle className="text-emerald-500 shrink-0" /> {p}</li>)}
                        </ul>
                        <div className="p-10 bg-slate-900 text-white rounded-[3rem] italic font-serif text-xl">{devotional.prayer}</div>
                        <button onClick={() => handleCompleteReading()} className="w-full mt-12 py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl">Finalizar Descanso</button>
                    </div>
                )}
             </div>
          </div>
        )}

        {view === 'prayer' && (
          <div className="max-w-2xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-1000">
             <div className="p-10 bg-indigo-50 rounded-full text-indigo-600 mb-10 animate-pulse"><Anchor size={64} /></div>
             <h2 className="text-5xl font-black text-slate-900 mb-6">Momento de Preparação</h2>
             <p className="text-xl text-slate-500 font-medium mb-12 max-w-md">"Abre, Senhor, os meus olhos, para que veja as maravilhas da tua lei." (Salmos 119:18)</p>
             <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-2xl mb-12 w-full text-left">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">Sugestão de Oração</p>
                <p className="text-2xl font-serif text-slate-800 leading-relaxed italic">"Espírito Santo, aquieta o meu coração agora. Remove as distrações do meu dia e fala comigo através das Escrituras. Que esta leitura não seja apenas informação, mas transformação."</p>
             </div>
             <button onClick={() => setView('reading')} className="px-20 py-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-indigo-600 transition-all flex items-center gap-4">Estou pronto <Sparkles /></button>
          </div>
        )}

        {view === 'context' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">
             <ViewHeader title="Centro de Contexto" subtitle="Atlas e Linha do Tempo" onBack={() => setView('dashboard')} />
             <div className="space-y-12">
                <section className="bg-white p-12 rounded-[4rem] shadow-xl border border-slate-50">
                   <SectionTitle icon={<Mountain size={20} />} title="A Jornada da Redenção" />
                   <div className="relative mt-16 pb-20 overflow-x-auto">
                      <div className="flex items-center gap-10 min-w-[1200px] px-10">
                         {PHASES.map((p, idx) => {
                            const prog = getPhaseProgress(p.id, user.completedDates);
                            const isCurrent = currentPhase?.id === p.id;
                            return (
                               <div key={p.id} className="relative flex flex-col items-center group w-64">
                                  {idx !== PHASES.length -1 && <div className="absolute top-10 left-[50%] w-full h-1 bg-slate-100 z-0"></div>}
                                  <div className={`relative z-10 w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all ${prog.percentage === 100 ? 'bg-emerald-500 text-white shadow-emerald-200' : isCurrent ? 'bg-indigo-600 text-white animate-bounce' : 'bg-white border-4 border-slate-100 text-slate-300'} shadow-xl`}>
                                     {prog.percentage === 100 ? <Check size={32} /> : <span className="font-black text-2xl">{p.id}</span>}
                                  </div>
                                  <h4 className="mt-6 font-black text-slate-900 text-lg">{p.name}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase text-center mt-2 px-4">{p.description}</p>
                                  {isCurrent && <div className="mt-4 px-4 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase">Você está aqui</div>}
                               </div>
                            );
                         })}
                      </div>
                   </div>
                </section>
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl flex flex-col items-center text-center">
                      <Map size={48} className="text-indigo-400 mb-6" />
                      <h3 className="text-3xl font-black mb-4">Atlas Bíblico</h3>
                      <p className="text-slate-400 mb-10">Visualize os desertos, as rotas de Paulo e o Tabernáculo conforme lê.</p>
                      <button className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] font-black">Abrir Mapas</button>
                   </div>
                   <div className="bg-indigo-50 p-12 rounded-[4rem] shadow-inner border border-indigo-100 flex flex-col items-center text-center">
                      <Anchor size={48} className="text-indigo-600 mb-6" />
                      <h3 className="text-3xl font-black text-slate-900 mb-4">Marcos Históricos</h3>
                      <p className="text-indigo-900/60 mb-10">Entenda a política e a cultura dos povos da época em cada fase.</p>
                      <button className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black">Explorar Linha</button>
                   </div>
                </section>
             </div>
             <Footer />
          </div>
        )}

        {view === 'reading' && readingInfo && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-12 duration-700 pb-20">
            <ViewHeader title={readingInfo.reading} subtitle={`Versão: ${user.version}`} onBack={() => setView('dashboard')} />
            <div className="bg-white rounded-[4rem] p-10 md:p-20 shadow-2xl border border-slate-50 mb-12">
              {loadingBible ? <div className="py-40 flex flex-col items-center justify-center gap-10"><div className="w-16 h-16 border-[6px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div><p className="font-black text-sm uppercase text-indigo-400">Escutando os céus...</p></div> : (
                <div className="prose prose-slate max-w-none">
                  <div className="flex items-center justify-between mb-16"><span className="px-5 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">{user.version}</span><button onClick={handleDownload} className={`p-4 rounded-2xl ${isDownloaded(readingInfo.reading, user.version) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>{isDownloaded(readingInfo.reading, user.version) ? <Check /> : <Download />}</button></div>
                  <p className="text-2xl md:text-3xl leading-[1.8] text-slate-800 font-serif whitespace-pre-wrap">{bibleText || "Texto não disponível."}</p>
                </div>
              )}
              <div className="mt-20 pt-16 border-t border-slate-100">
                <button disabled={isMessiahConnecting} onClick={async () => { setIsMessiahConnecting(true); const res = await getMessianicConnection(readingInfo.reading); setMessiahText(res || ""); setIsMessiahConnecting(false); }} className="flex items-center gap-6 w-full p-10 bg-indigo-50 text-indigo-900 rounded-[3rem] group">
                  <div className="p-4 bg-white rounded-2xl group-hover:scale-110 transition-transform"><Sparkles className="text-indigo-600" /></div>
                  <div className="text-left"><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">O Fio Escarlate</p><p className="text-2xl font-black">Conexão Messiânica</p></div>
                  {isMessiahConnecting ? <RefreshCw className="animate-spin ml-auto" /> : <ChevronRight className="ml-auto" />}
                </button>
                {messiahText && <div className="mt-8 p-10 bg-indigo-900 text-indigo-100 rounded-[3.5rem] text-lg font-serif animate-in zoom-in-95">{messiahText}</div>}
              </div>
            </div>
            <div className="bg-white rounded-[4rem] p-12 shadow-xl"><textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="O que Deus falou hoje?" className="w-full h-48 p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 outline-none text-xl font-bold mb-8" /><button onClick={() => handleCompleteReading()} className="w-full py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl">Concluir Leitura</button></div>
          </div>
        )}

        {view === 'badges' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">
            <ViewHeader title="Conquistas" subtitle="Galeria de Honra" onBack={() => setView('dashboard')} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[{ name: 'Explorador', desc: 'Início da jornada', icon: Map, color: 'text-amber-500' }, { name: 'Fiel Mensal', desc: '30 dias seguidos', icon: Star, color: 'text-rose-500' }, ...PHASES.map(p => ({ name: p.name, desc: `Fase ${p.name}`, icon: Trophy, color: 'text-emerald-500' }))].map(badge => {
                const isEarned = user.badges.includes(badge.name);
                return (
                  <div key={badge.name} className={`p-8 rounded-[3rem] border-2 flex flex-col items-center text-center ${isEarned ? 'bg-white border-indigo-100 shadow-xl' : 'bg-slate-50 opacity-40'}`}>
                    <div className={`p-6 rounded-[2rem] mb-6 ${isEarned ? 'bg-indigo-50' : 'bg-slate-200'}`}><badge.icon size={48} className={isEarned ? badge.color : 'text-slate-400'} /></div>
                    <h4 className="font-black text-lg mb-2">{badge.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400">{badge.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'goals' && (
          <div className="max-w-3xl mx-auto animate-in fade-in duration-700 pb-20">
            <ViewHeader title="Metas Diárias" onBack={() => setView('dashboard')} />
            <div className="space-y-8">
               <section className="bg-white p-12 rounded-[4rem] shadow-2xl">
                  <SectionTitle icon={<CheckCircle size={20} />} title="Progresso de Hoje" />
                  {[{ id: 'readingDone', label: `Leitura (${user.dailyGoalsConfig.readingMinutes} min)`, icon: Clock }, { id: 'prayerDone', label: `Oração (${user.dailyGoalsConfig.prayerMinutes} min)`, icon: Heart }, { id: 'extraDone', label: `Extras (${user.dailyGoalsConfig.extraChapters} cap.)`, icon: BookOpen }].map(goal => {
                    const isDone = user.dailyGoalProgress[goal.id as keyof DailyGoalProgress];
                    return (
                      <button key={goal.id} onClick={() => toggleDailyGoal(goal.id as any)} className={`w-full flex items-center justify-between p-8 rounded-[2.5rem] mb-4 ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-6"><goal.icon size={28} /><span className="text-xl font-black">{goal.label}</span></div>
                        <Check className={isDone ? 'text-white' : 'text-transparent'} />
                      </button>
                    );
                  })}
               </section>
               <section className="bg-slate-900 text-white p-12 rounded-[4rem]">
                  <SectionTitle icon={<SettingsIcon size={20} className="text-white" />} title="Configurar" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
                     {[{ id: 'readingMinutes', label: 'Leitura', step: 5 }, { id: 'prayerMinutes', label: 'Oração', step: 5 }, { id: 'extraChapters', label: 'Extras', step: 1 }].map(cfg => (
                       <div key={cfg.id} className="bg-white/5 p-8 rounded-[3rem] text-center">
                          <p className="text-[10px] font-black uppercase opacity-60 mb-4">{cfg.label}</p>
                          <div className="flex items-center justify-center gap-6">
                             <button onClick={() => updateGoalConfig(cfg.id as any, user.dailyGoalsConfig[cfg.id as keyof UserProgress['dailyGoalsConfig']] - cfg.step)}>-</button>
                             <span className="text-3xl font-black">{user.dailyGoalsConfig[cfg.id as keyof UserProgress['dailyGoalsConfig']]}</span>
                             <button onClick={() => updateGoalConfig(cfg.id as any, user.dailyGoalsConfig[cfg.id as keyof UserProgress['dailyGoalsConfig']] + cfg.step)}>+</button>
                          </div>
                       </div>
                     ))}
                  </div>
               </section>
            </div>
          </div>
        )}

        {view === 'dictionary' && (
          <div className="max-w-3xl mx-auto animate-in fade-in duration-700 pb-20">
            <ViewHeader title="Dicionário" onBack={() => setView('dashboard')} />
            <div className="flex gap-4 mb-12"><input value={searchDict} onChange={(e) => setSearchDict(e.target.value)} placeholder="Buscar termo..." className="flex-1 p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 text-xl font-bold" /><button onClick={handleOnlineSearch} className="px-10 bg-indigo-600 text-white rounded-[2.5rem] font-black">IA</button></div>
            <div className="space-y-6">
              {onlineResult && <div className="bg-indigo-950 p-12 rounded-[3.5rem] text-white animate-in zoom-in-95"><h4 className="text-4xl font-black mb-4">{onlineResult.term}</h4><p className="text-xl leading-relaxed">{onlineResult.definition}</p></div>}
              {filteredDictionary.map((item, idx) => <div key={idx} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm"><h4 className="text-2xl font-black mb-2">{item.term}</h4><p className="text-slate-600 font-medium">{item.definition}</p></div>)}
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-3xl mx-auto animate-in fade-in duration-700">
            <ViewHeader title="Configurações" onBack={() => setView('dashboard')} />
            <div className="bg-white p-12 rounded-[4rem] shadow-xl space-y-12">
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-6">Tradução</label><div className="grid grid-cols-3 gap-4">{["ARC", "KJV", "SCOFIELD"].map(v => <button key={v} onClick={() => saveProgress({...user, version: v as any})} className={`py-6 rounded-[2rem] border-4 font-black ${user.version === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{v}</button>)}</div></div>
              <div className="pt-12 border-t"><button onClick={() => { if(confirm("Resetar Jornada?")) { localStorage.clear(); window.location.reload(); } }} className="w-full py-6 text-rose-500 font-black border-4 border-rose-50 rounded-[2.5rem]">Apagar Tudo</button></div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-10 left-6 right-6 z-[200]">
        <div className="max-w-xl mx-auto bg-slate-900/95 backdrop-blur-2xl p-4 rounded-[3rem] shadow-2xl border border-white/10 flex justify-between items-center">
          {[{ id: 'dashboard', i: Layout, l: 'Início' }, { id: 'fullSchedule', i: Calendar, l: 'Plano' }, { id: 'badges', i: Trophy, l: 'Troféus' }, { id: 'goals', i: Target, l: 'Metas' }].map((item) => {
            const isActive = view === item.id || (item.id === 'fullSchedule' && view === 'devotional');
            return <button key={item.id} onClick={() => setView(item.id as any)} className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-[2.5rem] transition-all duration-500 ${isActive ? 'bg-indigo-600 text-white scale-110 -translate-y-2' : 'text-slate-500'}`}><item.i size={22} /><span className="text-[9px] font-black uppercase tracking-widest">{item.l}</span></button>;
          })}
        </div>
      </nav>
    </div>
  );
};

export default App;
