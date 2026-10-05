import React, { useState } from 'react';
import { MessageSquare, Send, Sparkles, User, Bot, Loader2, Trophy, TrendingUp, Gauge, Wrench, Users, Zap, Brain } from 'lucide-react';
import { CourseHippique, GeminiModelId } from '../types/turf';

interface TurfAdvisorChatProps {
  course?: CourseHippique | null;
  initialSelectedExpert?: GeminiModelId | 'all';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'advisor';
  text: string;
  timestamp: number;
  expertModel?: GeminiModelId | 'all';
}

export const TurfAdvisorChat: React.FC<TurfAdvisorChatProps> = ({
  course,
  initialSelectedExpert = 'all',
}) => {
  const [selectedExpert, setSelectedExpert] = useState<GeminiModelId | 'all'>(initialSelectedExpert);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'advisor',
      text: `Bonjour ! Nous sommes le Collège des Experts Gemini HippoAnalyse. Choisissez un expert selon votre question (Gemini 3.8 Flash pour la stratégie Quinté, Gemini 3.8 Flash-Lite TTS pour le briefing vocal, Gemini 3.7 Flash pour la musique, Gemini 3.6 Flash pour les chronos/piste, Gemini 3.5 Flash pour la ferrure/matériel, Gemini 3.5 Flash-Lite pour les variations de cotes) ou interrogez le Collège au complet !`,
      timestamp: Date.now(),
      expertModel: 'all',
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const suggestedQuestions = [
    'Quels sont les 2 favoris les plus fiables ?',
    'Le recul de 25m est-il un handicap insurmontable ici ?',
    'Quels chevaux déferrés des 4 fers ont le plus de chances ?',
    'Quelle stratégie pour un budget de 15 € ?',
  ];

  const handleAsk = async (qText: string) => {
    if (!qText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: qText.trim(),
      timestamp: Date.now(),
      expertModel: selectedExpert,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ask-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qText.trim(),
          course,
          expertModel: selectedExpert,
        }),
      });

      const data = await res.json();
      const advisorReply: ChatMessage = {
        id: `adv-${Date.now()}`,
        sender: 'advisor',
        text:
          data.answer ||
          "D'après les statistiques et les avis des professionnels, les bases restent solides mais attention au déroulement de course.",
        timestamp: Date.now(),
        expertModel: data.expertModel || selectedExpert,
      };

      setMessages((prev) => [...prev, advisorReply]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `adv-err-${Date.now()}`,
          sender: 'advisor',
          text: "Je n'ai pas pu joindre le serveur pour le moment, mais analysez attentivement la régularité et le déferrage des favoris.",
          timestamp: Date.now(),
          expertModel: selectedExpert,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const expertPills: { id: GeminiModelId | 'all'; label: string; icon: any; color: string }[] = [
    { id: 'all', label: 'Consensus Collège', icon: Users, color: 'text-amber-400' },
    { id: 'gemini-3.8', label: 'Gemini 3.8 Flash (Stratégie)', icon: Trophy, color: 'text-amber-400' },
    { id: 'gemini-3.8-lite', label: 'Gemini 3.8 Flash-Lite TTS (Audio)', icon: Sparkles, color: 'text-rose-400' },
    { id: 'gemini-3.7', label: 'Gemini 3.7 Flash (Musique)', icon: TrendingUp, color: 'text-emerald-400' },
    { id: 'gemini-3.6', label: 'Gemini 3.6 Flash (Chronos)', icon: Gauge, color: 'text-sky-400' },
    { id: 'gemini-3.5', label: 'Gemini 3.5 Flash (Ferrure)', icon: Wrench, color: 'text-purple-400' },
    { id: 'gemini-3.5-lite', label: 'Gemini 3.5 Flash-Lite (Cotes)', icon: Zap, color: 'text-teal-400' },
    { id: 'perplexity-ai', label: 'Perplexity AI (Sync)', icon: Sparkles, color: 'text-cyan-400' },
    { id: 'claude-4.6-sonnet', label: 'Claude 4.6 Sonnet (Cohérence)', icon: Brain, color: 'text-orange-400' },
  ];

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              Conseiller Turfiste IA · Collège Gemini
            </h3>
            <p className="text-xs text-slate-400">
              Interrogez directement l'un des 4 experts ou le consensus de la course {course ? `${course.reunion || ''} ${course.course || ''}` : ''}
            </p>
          </div>
        </div>

        {/* Expert Persona Selector */}
        <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          {expertPills.map((p) => {
            const IconComp = p.icon;
            const isSelected = selectedExpert === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedExpert(p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${p.color}`} />
                <span className="text-[11px]">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggested prompts pills */}
      <div className="flex flex-wrap gap-1.5">
        {suggestedQuestions.map((sug, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleAsk(sug)}
            className="text-[11px] font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-400 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-amber-500/40 transition-colors"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Message history */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3.5 max-h-[360px] overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 text-xs leading-relaxed ${
              m.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.sender === 'advisor' && (
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`p-3.5 rounded-2xl max-w-[85%] ${
                m.sender === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium'
                  : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}
            >
              {m.sender === 'advisor' && m.expertModel && m.expertModel !== 'all' && (
                <div className="text-[10px] font-black uppercase text-amber-400 mb-1">
                  Réponse de {m.expertModel.toUpperCase()}
                </div>
              )}
              {m.text}
            </div>
            {m.sender === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-amber-400 p-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>L'expert {selectedExpert} analyse les données de la course...</span>
          </div>
        )}
      </div>

      {/* Input form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(inputQuestion);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          placeholder={`Posez votre question à ${selectedExpert === 'all' ? 'l\'ensemble du collège' : selectedExpert}...`}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-slate-950 text-white placeholder-slate-500 rounded-xl text-xs border border-slate-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
        />
        <button
          type="submit"
          disabled={!inputQuestion.trim() || isLoading}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Demander</span>
        </button>
      </form>
    </div>
  );
};

