import React, { useState, useEffect, useMemo, useRef } from 'react';
import { marked } from 'marked';
import { 
  Coins, 
  Dices, 
  RotateCw, 
  BarChart3, 
  Table as TableIcon, 
  Settings, 
  MessageSquare, 
  Bot, 
  User, 
  Download, 
  RefreshCcw, 
  Play,
  ChevronRight,
  HelpCircle,
  Trophy,
  History,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { callGeminiAI } from './services/geminiService';

// --- Types ---
type SimulationType = 'coin' | 'dice' | 'wheel';

interface TrialResult {
  id: string;
  type: SimulationType;
  outcome: string;
  timestamp: number;
}

interface Character {
  name: string;
  role: string;
  avatar: string;
  color: string;
}

// --- Constants ---
const CHARACTERS: Record<string, Character> = {
  robot: { name: 'Robot', role: 'Trợ lý thông minh', avatar: '🤖', color: 'bg-blue-500' },
  mai: { name: 'Mai', role: 'Bạn học chăm chỉ', avatar: '👧', color: 'bg-pink-500' },
  viet: { name: 'Việt', role: 'Bạn học năng động', avatar: '👦', color: 'bg-orange-500' },
};

const COLORS = ['#4A90E2', '#FF9500', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const WHEEL_OPTIONS = ['Đỏ', 'Xanh dương', 'Xanh lá', 'Vàng', 'Cam', 'Tím'];

// Character-themed wheel colors
const WHEEL_COLORS: Record<string, string[]> = {
  robot: ['#0d47a1', '#1565c0', '#1976d2', '#1e88e5', '#2196f3', '#42a5f5'],
  mai: ['#880e4f', '#ad1457', '#c2185b', '#d81b60', '#e91e63', '#ec407a'],
  viet: ['#bf360c', '#d84315', '#e64a19', '#f4511e', '#ff5722', '#ff6e40'],
};

// Character-themed chart colors
const CHART_COLORS: Record<string, string[]> = {
  robot: ['#42a5f5', '#4fc3f7', '#00bcd4', '#26c6da', '#80deea', '#b2ebf2'],
  mai: ['#ec407a', '#f48fb1', '#ce93d8', '#ba68c8', '#f06292', '#e91e63'],
  viet: ['#ff9800', '#ffc107', '#ff5722', '#ff7043', '#ffb74d', '#ffe082'],
};

// Dice dots layout helper
const DICE_DOTS: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

// --- Components ---

export default function App() {
  const [activeTab, setActiveTab] = useState<SimulationType>('coin');
  const [results, setResults] = useState<TrialResult[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiChat, setAiChat] = useState<{ role: 'ai' | 'user', text: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [currentCharacter, setCurrentCharacter] = useState<keyof typeof CHARACTERS>('robot');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChat]);

  // Load initial AI greeting
  useEffect(() => {
    if (aiChat.length === 0) {
      setAiChat([{ 
        role: 'ai', 
        text: `Chào bạn! Mình là ${CHARACTERS[currentCharacter].name}. Hôm nay chúng mình cùng khám phá thế giới xác suất thú vị nhé! Bạn muốn thử tung đồng xu, gieo xúc xắc hay quay vòng quay may mắn?` 
      }]);
    }
  }, [currentCharacter]);

  const handleSimulate = async (count: number = 1) => {
    setIsSimulating(true);
    const newResults: TrialResult[] = [];
    
    // For single simulation, add a delay for animation feel
    const delay = count === 1 ? 800 : 0;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    for (let i = 0; i < count; i++) {
      let outcome = '';
      if (activeTab === 'coin') {
        outcome = Math.random() > 0.5 ? 'Mặt ngửa (H)' : 'Mặt sấp (T)';
      } else if (activeTab === 'dice') {
        outcome = `Mặt ${Math.floor(Math.random() * 6) + 1}`;
      } else {
        outcome = WHEEL_OPTIONS[Math.floor(Math.random() * WHEEL_OPTIONS.length)];
      }

      newResults.push({
        id: Math.random().toString(36).substr(2, 9),
        type: activeTab,
        outcome,
        timestamp: Date.now()
      });
    }

    setResults(prev => [...newResults, ...prev]);
    setIsSimulating(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    const filteredResults = results.filter(r => r.type === activeTab);
    
    filteredResults.forEach(r => {
      counts[r.outcome] = (counts[r.outcome] || 0) + 1;
    });

    const total = filteredResults.length;
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0'
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [results, activeTab]);

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setShowSettings(false);
  };

  const handleAiChat = async () => {
    if (!userInput.trim()) return;
    
    const userMsg = userInput;
    setUserInput('');
    setAiChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAiLoading(true);

    const prompt = `Bạn đang đóng vai nhân vật ${CHARACTERS[currentCharacter].name} (${CHARACTERS[currentCharacter].role}) trong một ứng dụng học toán xác suất cho học sinh. 
    Học sinh vừa hỏi: "${userMsg}". 
    Dữ liệu thí nghiệm hiện tại (${activeTab}): ${JSON.stringify(stats)}.
    Hãy trả lời một cách thân thiện, dễ hiểu, khuyến khích học sinh và giải thích các khái niệm toán học nếu cần. Trả lời bằng tiếng Việt.`;

    const response = await callGeminiAI(prompt);
    setIsAiLoading(false);

    if (response) {
      setAiChat(prev => [...prev, { role: 'ai', text: response }]);
    } else {
      setAiChat(prev => [...prev, { role: 'ai', text: "Xin lỗi, mình đang gặp chút trục trặc khi kết nối. Bạn kiểm tra lại API Key nhé!" }]);
    }
  };

  const exportReport = () => {
    const reportContent = ` BÁO CÁO THÍ NGHIỆM XÁC SUẤT
-----------------------------------
Loại thí nghiệm: ${activeTab === 'coin' ? 'Tung đồng xu' : activeTab === 'dice' ? 'Gieo xúc xắc' : 'Vòng quay may mắn'}
Tổng số lần thực hiện: ${results.filter(r => r.type === activeTab).length}
Thời gian: ${new Date().toLocaleString('vi-VN')}

KẾT QUẢ CHI TIẾT:
${stats.map(s => `- ${s.name}: ${s.value} lần (${s.percentage}%)`).join('\n')}

GHI CHÚ:
Xác suất thực nghiệm tiến dần đến xác suất lý thuyết khi số lần thử tăng lên.
-----------------------------------
Học cùng ${CHARACTERS[currentCharacter].name}`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-xac-suat-${activeTab}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full glass-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-md">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight gradient-text">Xác Suất Vui Nhộn</h1>
            <p className="text-xs text-slate-500 font-medium">Học Toán cùng Robot, Mai & Việt</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors relative"
          >
            <Settings size={20} className="text-slate-600" />
            {!apiKey && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Simulation Controls & Visuals */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tabs */}
          <div className="flex p-1 bg-slate-200/50 rounded-2xl gap-1">
            {(['coin', 'dice', 'wheel'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300",
                  activeTab === type 
                    ? "bg-white text-primary shadow-sm scale-100" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                {type === 'coin' && <Coins size={18} />}
                {type === 'dice' && <Dices size={18} />}
                {type === 'wheel' && <RotateCw size={18} />}
                <span className="capitalize">
                  {type === 'coin' ? 'Đồng xu' : type === 'dice' ? 'Xúc xắc' : 'Vòng quay'}
                </span>
              </button>
            ))}
          </div>

          {/* Simulation Area */}
          <div className={cn(
            "glass-card rounded-3xl p-8 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden transition-all duration-500",
            `sim-area-${currentCharacter}`
          )}>
            <div className="absolute top-4 left-4 flex gap-2">
              {Object.entries(CHARACTERS).map(([key, char]) => (
                <button
                  key={key}
                  onClick={() => setCurrentCharacter(key as any)}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all border-2 backdrop-blur-sm",
                    currentCharacter === key 
                      ? "border-primary scale-110 shadow-lg bg-white/80" 
                      : "border-transparent opacity-50 grayscale bg-white/30 hover:opacity-70 hover:grayscale-0"
                  )}
                  title={char.name}
                >
                  {char.avatar}
                </button>
              ))}
            </div>

            {/* Character name indicator */}
            <div className="absolute top-4 right-4">
              <div className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md",
                CHARACTERS[currentCharacter].color
              )}>
                {CHARACTERS[currentCharacter].avatar} {CHARACTERS[currentCharacter].name}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + currentCharacter}
                initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotate: 20 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="relative flex flex-col items-center"
              >
                {/* === COIN === */}
                {activeTab === 'coin' && (
                  <motion.div
                    animate={isSimulating ? { 
                      rotateY: [0, 360, 720], 
                      y: [0, -120, 0],
                      scale: [1, 1.1, 1]
                    } : {}}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className={`coin-${currentCharacter}`}
                    style={{ perspective: '800px' }}
                  >
                    <span className="coin-symbol">
                      {results.length > 0 && results[0].type === 'coin' && !isSimulating 
                        ? (results[0].outcome.includes('H') ? 'H' : 'T') 
                        : currentCharacter === 'robot' ? '⚙' : currentCharacter === 'mai' ? '✿' : '★'}
                    </span>
                  </motion.div>
                )}

                {/* === DICE === */}
                {activeTab === 'dice' && (() => {
                  const diceValue = results.length > 0 && results[0].type === 'dice' && !isSimulating
                    ? parseInt(results[0].outcome.replace('Mặt ', ''))
                    : 0;
                  
                  return (
                    <motion.div
                      animate={isSimulating ? { 
                        rotate: [0, 90, 180, 270, 360], 
                        x: [0, 30, -30, 15, 0], 
                        y: [0, -60, -30, -50, 0],
                        scale: [1, 1.1, 0.9, 1.05, 1]
                      } : {}}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className={`dice-${currentCharacter}`}
                    >
                      {diceValue > 0 ? (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gridTemplateRows: 'repeat(3, 1fr)',
                          width: '100%',
                          height: '100%',
                          padding: '16px',
                          position: 'relative',
                          zIndex: 1,
                        }}>
                          {[0, 1, 2].map(row => 
                            [0, 1, 2].map(col => {
                              const hasDot = DICE_DOTS[diceValue]?.some(
                                ([r, c]) => r === row && c === col
                              );
                              return (
                                <div 
                                  key={`${row}-${col}`} 
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {hasDot && (
                                    <motion.div 
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: 0.1 * (row * 3 + col), type: 'spring' }}
                                      className="dice-dot" 
                                    />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <span className="dice-number">
                            {currentCharacter === 'robot' ? '?' : currentCharacter === 'mai' ? '♡' : '🎲'}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })()}

                {/* === WHEEL === */}
                {activeTab === 'wheel' && (
                  <motion.div
                    animate={isSimulating ? { rotate: [0, 1440 + Math.random() * 360] } : {}}
                    transition={{ duration: 2, ease: [0.15, 0.85, 0.35, 1] }}
                    className={`wheel-${currentCharacter}`}
                  >
                    <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                      {WHEEL_OPTIONS.map((opt, i) => {
                        const angle = (i * 360) / WHEEL_OPTIONS.length;
                        const endAngle = ((i + 1) * 360) / WHEEL_OPTIONS.length;
                        const startRad = (angle - 90) * (Math.PI / 180);
                        const endRad = (endAngle - 90) * (Math.PI / 180);
                        const x1 = 100 + 100 * Math.cos(startRad);
                        const y1 = 100 + 100 * Math.sin(startRad);
                        const x2 = 100 + 100 * Math.cos(endRad);
                        const y2 = 100 + 100 * Math.sin(endRad);
                        const largeArc = endAngle - angle > 180 ? 1 : 0;

                        // Label position
                        const midRad = ((angle + endAngle) / 2 - 90) * (Math.PI / 180);
                        const labelX = 100 + 62 * Math.cos(midRad);
                        const labelY = 100 + 62 * Math.sin(midRad);
                        const labelRotation = (angle + endAngle) / 2;

                        const colors = WHEEL_COLORS[currentCharacter] || COLORS;

                        return (
                          <g key={opt}>
                            <path
                              d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                              fill={colors[i % colors.length]}
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth="1"
                            />
                            <text
                              x={labelX}
                              y={labelY}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="11"
                              fontWeight="bold"
                              transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
                              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                            >
                              {opt}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    <div className="wheel-center">
                      {currentCharacter === 'mai' && <span>♡</span>}
                    </div>
                    <div className="wheel-pointer" />
                  </motion.div>
                )}

                {/* Result badge */}
                {results.length > 0 && results[0].type === activeTab && !isSimulating && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`result-badge result-badge-${currentCharacter} mt-6`}
                  >
                    <span>🎯</span>
                    <span>{results[0].outcome}</span>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Sparkle particles on simulation */}
            <AnimatePresence>
              {isSimulating && (
                <>
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={`sparkle-${i}`}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0], 
                        scale: [0, 1.5, 0],
                        x: (Math.random() - 0.5) * 200,
                        y: (Math.random() - 0.5) * 200,
                      }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="absolute"
                      style={{
                        top: '50%',
                        left: '50%',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: currentCharacter === 'robot' ? '#4fc3f7' 
                          : currentCharacter === 'mai' ? '#f48fb1' : '#ffc107',
                        boxShadow: `0 0 10px ${currentCharacter === 'robot' ? 'rgba(79,195,247,0.8)' 
                          : currentCharacter === 'mai' ? 'rgba(244,143,177,0.8)' : 'rgba(255,193,7,0.8)'}`,
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>

            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <button
                disabled={isSimulating}
                onClick={() => handleSimulate(1)}
                className={cn(
                  "px-8 py-3 rounded-2xl text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 disabled:opacity-50",
                  currentCharacter === 'robot' ? 'bg-gradient-to-r from-blue-600 to-cyan-500' :
                  currentCharacter === 'mai' ? 'bg-gradient-to-r from-pink-500 to-rose-400' :
                  'bg-gradient-to-r from-orange-500 to-amber-400'
                )}
              >
                <Play size={20} fill="currentColor" />
                Thử ngay
              </button>
              
              <div className="flex items-center bg-white rounded-2xl border p-1 shadow-sm">
                {[10, 50, 100, 1000].map(size => (
                  <button
                    key={size}
                    onClick={() => setBatchSize(size)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                      batchSize === size ? "bg-slate-100 text-primary" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    x{size}
                  </button>
                ))}
                <button
                  disabled={isSimulating}
                  onClick={() => handleSimulate(batchSize)}
                  className="ml-2 px-6 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  Chạy loạt
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  Biểu đồ hình quạt
                </h3>
                <div className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-500">
                  Thời gian thực
                </div>
              </div>
              
              <div className="h-64 w-full">
                {stats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        animationDuration={500}
                      >
                        {stats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={(CHART_COLORS[currentCharacter] || COLORS)[index % (CHART_COLORS[currentCharacter] || COLORS).length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <History size={40} strokeWidth={1.5} />
                    <p className="text-sm font-medium">Chưa có dữ liệu thí nghiệm</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2">
                  <TableIcon size={20} className="text-secondary" />
                  Bảng thống kê
                </h3>
                <button 
                  onClick={clearResults}
                  className="text-xs font-bold text-error hover:underline flex items-center gap-1"
                >
                  <RefreshCcw size={12} />
                  Xóa hết
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Kết quả</th>
                      <th className="px-4 py-3">Số lần</th>
                      <th className="px-4 py-3">Tỉ lệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.map((row, idx) => (
                      <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: (CHART_COLORS[currentCharacter] || COLORS)[idx % (CHART_COLORS[currentCharacter] || COLORS).length] }} />
                          {row.name}
                        </td>
                        <td className="px-4 py-3 font-medium">{row.value}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-slate-100 rounded-lg font-bold text-slate-600">
                            {row.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {stats.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                          Thực hiện thí nghiệm để xem bảng
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <button 
                onClick={exportReport}
                disabled={stats.length === 0}
                className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 font-bold hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download size={18} />
                Xuất báo cáo thí nghiệm
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Tutor & Learning Guide */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* AI Tutor Panel */}
          <div className="glass-card rounded-3xl flex flex-col h-[600px] shadow-xl overflow-hidden">
            <div className={cn("p-4 flex items-center gap-3 text-white", CHARACTERS[currentCharacter].color)}>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                {CHARACTERS[currentCharacter].avatar}
              </div>
              <div>
                <h3 className="font-bold">{CHARACTERS[currentCharacter].name}</h3>
                <p className="text-xs opacity-80">{CHARACTERS[currentCharacter].role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {aiChat.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={cn(
                    "flex gap-2 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm",
                    msg.role === 'ai' ? CHARACTERS[currentCharacter].color + " text-white" : "bg-slate-200 text-slate-600"
                  )}>
                    {msg.role === 'ai' ? CHARACTERS[currentCharacter].avatar : <User size={14} />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm leading-relaxed prose prose-slate prose-sm max-w-none",
                    msg.role === 'ai' ? "bg-slate-100 text-slate-800 rounded-tl-none" : "bg-primary text-white rounded-tr-none"
                  )}
                    dangerouslySetInnerHTML={{ __html: msg.role === 'ai' ? marked.parse(msg.text) : msg.text }}
                  />
                </motion.div>
              ))}
              {isAiLoading && (
                <div className="flex gap-2">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm animate-pulse", CHARACTERS[currentCharacter].color)}>
                    {CHARACTERS[currentCharacter].avatar}
                  </div>
                  <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t bg-slate-50">
              <div className="relative">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAiChat()}
                  placeholder="Hỏi mình về bài học nhé..."
                  className="w-full pl-4 pr-12 py-3 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary transition-all bg-white text-sm"
                />
                <button
                  onClick={handleAiChat}
                  disabled={isAiLoading || !userInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-2">
                Sử dụng Gemini AI để hỗ trợ học tập
              </p>
            </div>
          </div>

          {/* Learning Tips */}
          <div className="glass-card rounded-3xl p-6 bg-linear-to-br from-primary/5 to-secondary/5 border-primary/10">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <HelpCircle size={20} className="text-primary" />
              Bạn có biết?
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-lg">💡</div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong>Luật số lớn:</strong> Khi bạn thực hiện thí nghiệm càng nhiều lần (ví dụ 1000 lần), tỉ lệ thực tế sẽ càng gần với xác suất lý thuyết.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-lg">🎲</div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Xác suất lý thuyết của mỗi mặt xúc xắc là <strong>1/6 ≈ 16.7%</strong>. Hãy thử gieo 1000 lần xem kết quả có gần con số này không nhé!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass-card rounded-3xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="text-primary" />
                  Cấu hình hệ thống
                </h2>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Nhập API Key của bạn..."
                      className="w-full pl-4 pr-12 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 px-1">
                    Lấy key tại <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary underline">Google AI Studio</a>. Key được lưu an toàn trong trình duyệt của bạn.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveApiKey}
                    className="w-full py-4 rounded-2xl gradient-bg text-white font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="p-6 text-center text-slate-400 text-xs border-t bg-white">
        <p>© 2026 Xác Suất Vui Nhộn - Công cụ học tập số bám sát chương trình GDPT mới</p>
        <p className="mt-1">Thiết kế cho học sinh Tiểu học & THCS Việt Nam</p>
      </footer>
    </div>
  );
}
