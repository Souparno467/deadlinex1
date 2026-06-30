import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  Zap, 
  Users, 
  ListTodo, 
  Loader2, 
  Volume2, 
  VolumeX,
  Target,
  ArrowRight,
  ShieldCheck,
  Bot
} from "lucide-react";

interface Message {
  role: "user" | "model";
  content: string;
}

interface ChiefOfStaffChatProps {
  currentUserRole: string;
  refreshState: () => void;
}

export default function ChiefOfStaffChat({ currentUserRole, refreshState }: ChiefOfStaffChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "Salutations, Chief of Staff. I am your DeadlineX AI Chief of Staff. I have mapped your team's current velocity, calendar events, and risk parameters. What immediate strategic coordination do you require?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  
  // Voice state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceCommandInput, setVoiceCommandInput] = useState("");
  const [voiceResponseText, setVoiceResponseText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [processingVoice, setProcessingVoice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voiceResponseText]);

  // Pre-configured speech synthesis helper
  const speakText = (text: string) => {
    if (!soundEnabled) return;
    try {
      window.speechSynthesis.cancel(); // Stop active speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      
      // Select a nice voice if available
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural") || v.lang.startsWith("en-US"));
      if (premiumVoice) utterance.voice = premiumVoice;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech synthesis failed:", err);
    }
  };

  // Preload voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Web Speech API Integration State
  const [isListening, setIsListening] = useState(false);
  const [activeListeningTarget, setActiveListeningTarget] = useState<"chat" | "voicePanel" | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
    }
  }, []);

  const initiateSpeechRecognition = (SpeechRecognitionClass: any, targetField: "chat" | "voicePanel") => {
    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setActiveListeningTarget(targetField);
        setRecognitionError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (targetField === "chat") {
          setInputMessage(prev => prev ? prev + " " + transcript : transcript);
        } else {
          setVoiceCommandInput(transcript);
          // Auto-execute voice actions for maximum futuristic feeling!
          handleTriggerVoiceAction(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === "not-allowed") {
          setRecognitionError("Microphone access denied. Please check your browser mic permissions.");
        } else {
          setRecognitionError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
        setActiveListeningTarget(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        setActiveListeningTarget(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setRecognitionError(`Failed to initialize speech recognition: ${err.message || err}`);
      setIsListening(false);
      setActiveListeningTarget(null);
    }
  };

  const startListening = (targetField: "chat" | "voicePanel") => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionError("Web Speech API is not supported in this browser.");
      return;
    }

    // Stop speaking if active
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      }
    } catch (e) {}

    if (isListening) {
      stopListening();
      if (activeListeningTarget !== targetField) {
        setTimeout(() => {
          initiateSpeechRecognition(SpeechRecognition, targetField);
        }, 100);
      }
    } else {
      initiateSpeechRecognition(SpeechRecognition, targetField);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setActiveListeningTarget(null);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loadingChat) return;

    if (!textToSend) setInputMessage("");

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoadingChat(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, userRole: currentUserRole })
      });

      const data = await res.json();
      if (data.response) {
        setMessages([...newMessages, { role: "model", content: data.response }]);
        // Automatically speak if voice panel is open
        if (isVoiceActive) speakText(data.response);
      } else {
        throw new Error(data.error || "CoS response failed");
      }
    } catch (err: any) {
      setMessages([...newMessages, { role: "model", content: `System Error: ${err.message || "Failed to communicate with AI Chief of Staff. Please verify GROQ_API_KEY config."}` }]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleTriggerVoiceAction = async (command: string) => {
    if (!command.trim() || processingVoice) return;

    setProcessingVoice(true);
    setVoiceResponseText("");

    try {
      const res = await fetch("/api/ai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      });

      const data = await res.json();
      if (data.success) {
        setVoiceResponseText(data.voiceReply);
        // Execute vocal speak-back!
        speakText(data.voiceReply);
        
        // Notify user about actual state change
        if (data.actionTaken) {
          refreshState();
        }
      }
    } catch (err) {
      setVoiceResponseText("Apologies, I encountered a connection issue parsing that command.");
    } finally {
      setProcessingVoice(false);
      setVoiceCommandInput("");
    }
  };

  // Presets
  const chatPresets = [
    { title: "Review bottleneck risks", prompt: "Summarize current high-risk missions and propose a corrective delegation action." },
    { title: "Draft delay email template", prompt: "Draft a brief, professional apology email from Gsouparno to the client explaining a 1-day launch delay of our Beta version." },
    { title: "Plan sprint subtasks", prompt: "Help me plan subtasks for a new mission: 'Implement Slack webhook automation'." }
  ];

  const vocalCommandPresets = [
    { title: "Delegate Beta Launch to Marcus", cmd: "Delegate the Launch Beta Version mission to Marcus Vance to clear Sarah's schedule." },
    { title: "Booster Crunch on UI Design", cmd: "Activate crunch mode boost on high fidelity redesign mission" },
    { title: "Extend Financial Report deadline", cmd: "Extend deadline by 24 hours on Finalize Financial reports" }
  ];

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[600px] shadow-xl">
      
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Bot className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="text-sm font-bold font-display text-white">Chief of Staff AI Terminal</h3>
            <p className="text-[10px] text-slate-400">Direct neural connection to your execution state</p>
          </div>
        </div>

        {/* Audio control buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition-all ${
              soundEnabled 
                ? "bg-slate-800 text-red-400 border-slate-700 hover:text-red-300" 
                : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400"
            }`}
            title={soundEnabled ? "Mute vocal speak-back" : "Unmute vocal speak-back"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
              isVoiceActive 
                ? "bg-red-500 text-white border-transparent animate-pulse" 
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Assistant</span>
          </button>
        </div>
      </div>

      {/* Conditional Sub-panel: Voice Assistant Visualizer */}
      {isVoiceActive && (
        <div className="bg-slate-950 border-b border-slate-800/80 p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              {/* Pulsing mic indicator */}
              <div className="relative">
                <div className={`absolute inset-0 rounded-full bg-red-500/20 ${speaking || processingVoice ? "animate-ping" : ""}`} />
                <div className="h-10 w-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/30">
                  <Mic className="w-4.5 h-4.5" />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-red-400 uppercase block">Proactive Voice Mode</span>
                <p className="text-xs text-slate-300">Give auditory commands to delegate, reschedule, or configure crunch boosts.</p>
              </div>
            </div>

            {/* Vocal simulation/live input */}
            <div className="w-full md:w-auto flex items-center gap-2">
              {isSpeechSupported && (
                <button
                  onClick={() => startListening("voicePanel")}
                  className={`p-2 rounded-lg border transition-all shrink-0 ${
                    isListening && activeListeningTarget === "voicePanel"
                      ? "bg-red-500 text-slate-950 border-transparent animate-pulse shadow shadow-red-500/20"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                  title={isListening && activeListeningTarget === "voicePanel" ? "Stop recording voice command" : "Speak a voice command"}
                >
                  {isListening && activeListeningTarget === "voicePanel" ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}
              <input
                type="text"
                value={voiceCommandInput}
                onChange={(e) => setVoiceCommandInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTriggerVoiceAction(voiceCommandInput)}
                placeholder="Type or speak a vocal command..."
                className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:border-red-500 w-full md:w-64"
              />
              <button
                onClick={() => handleTriggerVoiceAction(voiceCommandInput)}
                disabled={processingVoice || !voiceCommandInput.trim()}
                className="p-1.5 bg-red-500 hover:bg-red-400 text-white rounded-lg shrink-0"
              >
                {processingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Recognition live status indicator / errors */}
          {(isListening && activeListeningTarget === "voicePanel") && (
            <div className="p-2 bg-red-950/20 border border-red-500/20 rounded-lg flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest animate-pulse">
                System listening... Speak your command now.
              </span>
            </div>
          )}

          {recognitionError && (
            <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center justify-between text-xs text-red-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>{recognitionError}</span>
              </div>
              <button 
                onClick={() => setRecognitionError(null)} 
                className="text-[10px] hover:text-red-300 underline uppercase"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Quick presets for voice testing */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">Auditory Simulation Shortcuts (Iframe compatible)</span>
            <div className="flex flex-wrap gap-2">
              {vocalCommandPresets.map((v, i) => (
                <button
                  key={i}
                  id={`voice-preset-${i}`}
                  onClick={() => handleTriggerVoiceAction(v.cmd)}
                  className="bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-[10px] text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="w-3 h-3 text-red-500" />
                  <span>{v.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Reply text panel */}
          {voiceResponseText && (
            <div className="p-3 bg-red-950/10 border border-red-900/20 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg mt-0.5">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-wider block">CoS Audio Reply (Read aloud)</span>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed italic">"{voiceResponseText}"</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scrollable chat thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => {
          const isModel = m.role === "model";
          return (
            <div 
              key={i} 
              className={`flex items-start gap-3 ${isModel ? "justify-start" : "justify-end"}`}
            >
              {isModel && (
                <div className="h-8 w-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center border border-red-500/20 shrink-0 mt-0.5">
                  <Bot className="w-4.5 h-4.5" />
                </div>
              )}

              <div className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed space-y-1 ${
                isModel 
                  ? "bg-slate-950/60 text-slate-300 border border-slate-850" 
                  : "bg-red-600 text-white border border-transparent font-medium"
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>

              {!isModel && (
                <div className="h-8 w-8 bg-slate-800 text-slate-300 rounded-lg flex items-center justify-center border border-slate-700 shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loadingChat && (
          <div className="flex items-start gap-3 justify-start">
            <div className="h-8 w-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center border border-red-500/20 shrink-0 animate-pulse mt-0.5">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850/60 flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
              <span>Chief of Staff drafting brief...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset quick actions list */}
      <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/10 flex flex-wrap gap-2">
        {chatPresets.map((preset, i) => (
          <button
            key={i}
            id={`chat-preset-${i}`}
            onClick={() => handleSendMessage(preset.prompt)}
            className="text-[10px] bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-lg font-medium transition-all"
          >
            {preset.title}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col gap-2">
        {isListening && activeListeningTarget === "chat" && (
          <div className="px-1.5 flex items-center gap-2 text-xs text-red-400 font-mono animate-pulse">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="uppercase tracking-widest text-[10px]">Listening for query... Speak now (English)</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {isSpeechSupported && (
            <button
              onClick={() => startListening("chat")}
              className={`p-3 rounded-xl border transition-all shrink-0 ${
                isListening && activeListeningTarget === "chat"
                  ? "bg-red-500 text-slate-950 border-transparent animate-pulse shadow-lg shadow-red-500/20"
                  : "bg-slate-900 text-slate-400 border-slate-850 hover:text-slate-200 hover:bg-slate-850"
              }`}
              title={isListening && activeListeningTarget === "chat" ? "Stop speaking" : "Speak query via microphone"}
            >
              {isListening && activeListeningTarget === "chat" ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Consult with Chief of Staff... (Ask to write emails, draft roadmaps, or speak via mic)"
            className="bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-200 px-4 py-3 focus:outline-none focus:border-red-500 w-full"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loadingChat || !inputMessage.trim()}
            className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow shadow-red-500/10 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
