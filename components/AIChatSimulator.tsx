import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Bot, User, AlertCircle, Database, Zap, ArrowRight, MessageCircle, Trash2, History } from 'lucide-react';
import { simulateModerationResponse } from '../services/geminiService';
import { SimulationResult, SimulationHistoryItem } from '../types';

export const AIChatSimulator: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<SimulationHistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SimulationHistoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load "Database" content on mount
  useEffect(() => {
    const saved = localStorage.getItem('moderaflow_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
        // Select the last item by default if exists
        if (parsed.length > 0) {
          setSelectedItem(parsed[parsed.length - 1]);
        }
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Auto-scroll to bottom when history updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    // Don't clear selectedItem immediately so we can see previous context while loading new one? 
    // Or clear it to show "Thinking"? Let's clear to show progress.
    setSelectedItem(null);

    try {
      const response = await simulateModerationResponse(input);
      
      const newItem: SimulationHistoryItem = {
        id: Date.now().toString(),
        input: input,
        result: response,
        timestamp: new Date().toISOString()
      };

      const updatedHistory = [...history, newItem];
      setHistory(updatedHistory);
      setSelectedItem(newItem);
      setInput(''); // Clear input for next message

      // Persist to "Database"
      localStorage.setItem('moderaflow_history', JSON.stringify(updatedHistory));

    } catch (err) {
      setError("API Error: Ensure your Gemini API Key is set in the environment.");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to delete all simulation history?")) {
      setHistory([]);
      setSelectedItem(null);
      localStorage.removeItem('moderaflow_history');
    }
  };

  const handleSelectHistory = (item: SimulationHistoryItem) => {
    setSelectedItem(item);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6 max-w-7xl mx-auto">
        {/* Left Col: Chat Interface */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                        <MessageCircle size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">Messenger Preview</h3>
                        <p className="text-xs text-slate-500">Live Simulation Environment</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Bot Active</span>
                    {history.length > 0 && (
                        <button 
                            onClick={clearHistory}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Clear History"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
            
            <div 
                ref={scrollRef}
                className="flex-1 bg-slate-50 p-6 flex flex-col gap-6 overflow-y-auto"
            >
                {history.length === 0 && !loading && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <History size={48} className="mb-2" />
                        <p>No history. Start a simulation!</p>
                    </div>
                )}

                {history.map((item) => (
                    <div 
                        key={item.id} 
                        className={`flex flex-col gap-2 group cursor-pointer transition-opacity ${selectedItem?.id === item.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                        onClick={() => handleSelectHistory(item)}
                    >
                        {/* User Bubble */}
                        <div className="flex justify-end">
                            <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm text-sm">
                                {item.input}
                            </div>
                        </div>
                        {/* AI Bubble */}
                        <div className="flex justify-start">
                             <div className="flex items-end gap-2 max-w-[80%]">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center">
                                    <Bot size={14} className="text-slate-500" />
                                </div>
                                <div className={`border p-3 rounded-2xl rounded-tl-sm shadow-sm text-sm ${selectedItem?.id === item.id ? 'bg-white border-blue-200 ring-2 ring-blue-100' : 'bg-white border-slate-200'}`}>
                                    <p className="text-slate-800">{item.result.suggestedReply}</p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                            item.result.sentiment === 'Positive' ? 'bg-green-100 text-green-700' :
                                            item.result.sentiment === 'Negative' ? 'bg-red-100 text-red-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {item.result.sentiment}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Loading State */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                           <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                           <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                           <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={handleSimulate} className="relative">
                    <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 px-5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        placeholder="Type a message to simulate..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button 
                        type="submit" 
                        disabled={loading || !input}
                        className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                    >
                        <ArrowRight size={16} />
                    </button>
                </form>
            </div>
        </div>

        {/* Right Col: Workflow Debugger */}
        <div className="w-[400px] flex flex-col bg-slate-900 text-slate-300 rounded-xl shadow-lg border border-slate-800 overflow-hidden hidden lg:flex">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-950">
                <Zap size={16} className="text-yellow-400" />
                <h3 className="font-semibold text-white text-sm">Workflow Context</h3>
                {selectedItem && <span className="text-xs text-slate-500 ml-auto">{new Date(selectedItem.timestamp).toLocaleTimeString()}</span>}
            </div>

            <div className="flex-1 p-4 space-y-6 overflow-y-auto font-mono text-xs">
                
                {/* Step 1: Trigger */}
                <div className="relative pl-6 border-l border-slate-700">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-green-500"></div>
                    <h4 className="text-white font-medium mb-1">Webhook Trigger</h4>
                    <p className="text-slate-500">
                        {loading ? 'Receiving message...' : selectedItem ? 'Message processed' : 'Waiting for input...'}
                    </p>
                </div>

                {/* Step 2: RAG */}
                <div className={`relative pl-6 border-l border-slate-700 transition-opacity duration-500 ${loading || selectedItem ? 'opacity-100' : 'opacity-30'}`}>
                    <div className={`absolute -left-1.5 top-0 w-3 h-3 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-slate-700'}`}></div>
                    <h4 className="text-white font-medium mb-1 flex items-center gap-2">
                        Supabase Vector Store
                        {loading && <span className="text-[10px] text-yellow-500">Querying...</span>}
                    </h4>
                    <p className="text-slate-500 mb-2">Searching for relevant context chunks...</p>
                    {selectedItem && (
                        <div className="bg-slate-800 p-2 rounded text-slate-400 border border-slate-700">
                            Context Retrieved: 3 chunks
                        </div>
                    )}
                </div>

                {/* Step 3: LLM Analysis */}
                <div className={`relative pl-6 border-l border-slate-700 transition-opacity duration-500 ${selectedItem ? 'opacity-100' : 'opacity-30'}`}>
                     <div className={`absolute -left-1.5 top-0 w-3 h-3 rounded-full ${selectedItem ? 'bg-purple-500' : 'bg-slate-700'}`}></div>
                     <h4 className="text-white font-medium mb-2">AI Analysis</h4>
                     
                     {selectedItem ? (
                         <div className="space-y-3 animate-fade-in">
                             <div>
                                 <span className="text-slate-500 block mb-1">Sentiment</span>
                                 <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                     selectedItem.result.sentiment === 'Negative' ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-green-900/50 text-green-400 border border-green-800'
                                 }`}>
                                     {selectedItem.result.sentiment}
                                 </span>
                             </div>
                             <div>
                                 <span className="text-slate-500 block mb-1">Reasoning</span>
                                 <p className="text-slate-300 leading-relaxed border-l-2 border-slate-700 pl-2">
                                     {selectedItem.result.reasoning}
                                 </p>
                             </div>
                             <div className="pt-2 mt-2 border-t border-slate-800">
                                <span className="text-slate-500 block mb-1">Generated Draft</span>
                                <p className="text-white bg-slate-800 p-2 rounded italic">"{selectedItem.result.suggestedReply}"</p>
                             </div>
                         </div>
                     ) : (
                         <p className="text-slate-500">Waiting for completion...</p>
                     )}
                </div>
            </div>
            
            {error && (
                <div className="p-3 bg-red-900/20 border-t border-red-900/50 text-red-400 text-xs flex gap-2">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}
        </div>
    </div>
  );
};
