import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Activity,
  Brain,
  Calculator,
  CalendarClock,
  Check,
  Download,
  Image,
  Landmark,
  LayoutDashboard,
  LineChart as LineIcon,
  LogIn,
  Plus,
  Save,
  Sparkles,
  TableProperties,
  Target,
  Trash2,
  Upload,
  User,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import "./styles.css";

type Outcome = "Win" | "Loss" | "BE";
type Session = "Asia" | "London" | "New York" | "Overlap";
type Direction = "Long" | "Short";
type MarketMode = "Trend-following" | "Sideways / range";
type WatchStatus = "Observation" | "Waiting for confirmation" | "Being traded";
type ActiveTab = "dashboard" | "add" | "watchlist" | "archive";
type AuthMode = "signin" | "signup";
type AccountProfile = {
  id: string;
  name: string;
  accountSize: number;
  riskPercent: number;
};
type LotSettings = {
  jpyToUsd: number;
  audToUsd: number;
  activeProfileId: string;
  profiles: AccountProfile[];
};
type AiAnalysis = {
  structure: string;
  orderBlock: string;
  bosChoch: string;
  liquidity: string;
  fvg: string;
  trend: string;
  session: string;
  score: number;
  feedback: string;
  costUsd: string;
  costPhp: string;
  createdAt: string;
  model?: string;
};
type TradeImageKind = "preTrade" | "postTrade";
type TradeImage = {
  kind: TradeImageKind;
  label: string;
  image: string;
  name: string;
};
type WatchItem = {
  id: string;
  pair: string;
  status: WatchStatus;
  image?: string;
  imageName?: string;
  addedAt: string;
};
type AiStatus = "idle" | "pending" | "complete" | "error";

type Trade = {
  id: string;
  date: string;
  time: string;
  symbol: string;
  account: string;
  direction: Direction;
  session: Session;
  hasOneHourOrderBlock: boolean;
  hasLastMoveOpposite: boolean;
  hasPreviousChangeOfStructure: boolean;
  mainScore: number;
  technicalScore: number;
  sentimentScore: number;
  ecoScore: number;
  marketMode: MarketMode;
  stopLossPips: number;
  targetR: number;
  resultR: number;
  tradeDuration: string;
  endedAt?: string;
  outcome: Outcome;
  chartImage?: string;
  chartImageName?: string;
  tradeImages?: TradeImage[];
  aiAnalysis?: AiAnalysis;
  aiStatus?: AiStatus;
  aiError?: string;
  notes: string;
};

const seedTrades: Trade[] = [
  {
    id: "seed-1",
    date: "2026-06-18",
    time: "16:20",
    symbol: "EURUSD",
    account: "Main",
    direction: "Short",
    session: "London",
    hasOneHourOrderBlock: true,
    hasLastMoveOpposite: true,
    hasPreviousChangeOfStructure: true,
    mainScore: -3,
    technicalScore: -2,
    sentimentScore: -1,
    ecoScore: -1,
    marketMode: "Trend-following",
    stopLossPips: 10,
    targetR: 2,
    resultR: 1.8,
    tradeDuration: "2 days",
    endedAt: "2026-06-20T17:20:00.000Z",
    outcome: "Win",
    notes: "Bearish Edgefinder read aligned with technical pressure and session flow.",
  },
  {
    id: "seed-2",
    date: "2026-06-21",
    time: "21:10",
    symbol: "XAUUSD",
    account: "Main",
    direction: "Short",
    session: "Overlap",
    hasOneHourOrderBlock: true,
    hasLastMoveOpposite: false,
    hasPreviousChangeOfStructure: true,
    mainScore: -1,
    technicalScore: 1,
    sentimentScore: -2,
    ecoScore: 0,
    marketMode: "Trend-following",
    stopLossPips: 12,
    targetR: 2,
    resultR: -1,
    tradeDuration: "1 day",
    endedAt: "2026-06-22T21:10:00.000Z",
    outcome: "Loss",
    notes: "Bearish main read, but technical confirmation was mixed.",
  },
  {
    id: "seed-3",
    date: "2026-06-25",
    time: "20:45",
    symbol: "GBPJPY",
    account: "Main",
    direction: "Short",
    session: "Overlap",
    hasOneHourOrderBlock: true,
    hasLastMoveOpposite: true,
    hasPreviousChangeOfStructure: true,
    mainScore: -4,
    technicalScore: -3,
    sentimentScore: -2,
    ecoScore: -1,
    marketMode: "Trend-following",
    stopLossPips: 15,
    targetR: 3,
    resultR: 2.4,
    tradeDuration: "3 days",
    endedAt: "2026-06-28T20:45:00.000Z",
    outcome: "Win",
    notes: "Strong bearish score stack with clean execution and target plan.",
  },
  {
    id: "seed-4",
    date: "2026-06-28",
    time: "09:25",
    symbol: "AUDUSD",
    account: "Challenge",
    direction: "Long",
    session: "Asia",
    hasOneHourOrderBlock: true,
    hasLastMoveOpposite: true,
    hasPreviousChangeOfStructure: false,
    mainScore: 2,
    technicalScore: 1,
    sentimentScore: 1,
    ecoScore: 0,
    marketMode: "Sideways / range",
    stopLossPips: 9,
    targetR: 2,
    resultR: -0.4,
    tradeDuration: "4 days",
    endedAt: "2026-07-02T09:25:00.000Z",
    outcome: "Loss",
    notes: "Bullish read was present, but the trade did not fully follow through.",
  },
];

const blankTrade: Omit<Trade, "id"> = {
  date: new Date().toISOString().slice(0, 10),
  time: new Date().toTimeString().slice(0, 5),
  symbol: "EURUSD",
  account: "Main",
  direction: "Short",
  session: detectSession(new Date().toTimeString().slice(0, 5)),
  hasOneHourOrderBlock: true,
  hasLastMoveOpposite: true,
  hasPreviousChangeOfStructure: true,
  mainScore: -1,
  technicalScore: -1,
  sentimentScore: -1,
  ecoScore: -1,
  marketMode: "Trend-following",
  stopLossPips: 10,
  targetR: 2,
  resultR: 0,
  tradeDuration: "",
  outcome: "BE",
  tradeImages: [],
  aiAnalysis: undefined,
  aiStatus: "idle",
  aiError: "",
  notes: "",
};

const storageKey = "edgelab.trades.v2.order-block-shorts";
const legacyStorageKey = "edgelab.trades.v1";
const lotSettingsKey = "shortlab.lot-settings.v1";
const watchlistStorageKey = "edgelab.watchlist.v1";
const watchPairs = ["AUDJPY", "NZDJPY", "AUDUSD", "EURJPY", "GBPUSD", "EURUSD", "EURAUD"] as const;
const forexPairs = [
  "AUDCAD",
  "AUDCHF",
  "AUDJPY",
  "AUDNZD",
  "AUDUSD",
  "CADCHF",
  "CADJPY",
  "CHFJPY",
  "EURAUD",
  "EURCAD",
  "EURCHF",
  "EURGBP",
  "EURJPY",
  "EURNZD",
  "EURUSD",
  "GBPAUD",
  "GBPCAD",
  "GBPCHF",
  "GBPJPY",
  "GBPNZD",
  "GBPUSD",
  "NZDCAD",
  "NZDCHF",
  "NZDJPY",
  "NZDUSD",
  "USDCAD",
  "USDCHF",
  "USDJPY",
  "XAUUSD",
  "XAGUSD",
] as const;
const watchStatuses: WatchStatus[] = ["Observation", "Waiting for confirmation", "Being traded"];
const scoreFields = [
  { key: "mainScore", label: "Main Score" },
  { key: "technicalScore", label: "Technical Score" },
  { key: "sentimentScore", label: "Sentiment Score" },
  { key: "ecoScore", label: "ECO Score" },
] as const;
const imageSlots: Array<{ kind: TradeImageKind; label: string; help: string }> = [
  { kind: "preTrade", label: "Pre-trade analysis", help: "Your full chart analysis before entry. AI reviews this when you add the trade." },
  { kind: "postTrade", label: "Post-trade review", help: "Later screenshot after result and trade duration are known." },
];

const watchWindows = [
  {
    pair: "AUDJPY",
    flag: "AU/JP",
    start: "07:00",
    end: "11:00",
    display: "7:00 AM - 11:00 AM",
    rating: 5,
    why: "Tokyo session. AUD and JPY are both active. Very clean H1 OBs.",
  },
  {
    pair: "NZDJPY",
    flag: "NZ/JP",
    start: "07:00",
    end: "11:00",
    display: "7:00 AM - 11:00 AM",
    rating: 5,
    why: "Same reason. Strong Asian session movement.",
  },
  {
    pair: "AUDUSD",
    flag: "AU/US",
    start: "07:00",
    end: "10:00",
    display: "7:00 AM - 10:00 AM",
    rating: 4,
    why: "Australia open, then sometimes London continuation.",
  },
  {
    pair: "EURJPY",
    flag: "EU/JP",
    start: "14:00",
    end: "18:00",
    display: "2:00 PM - 6:00 PM",
    rating: 5,
    why: "London opens, EUR becomes active while JPY still influences.",
  },
  {
    pair: "GBPUSD",
    flag: "GB/US",
    start: "15:00",
    end: "19:00",
    display: "3:00 PM - 7:00 PM",
    rating: 5,
    why: "London is everything for GU.",
  },
  {
    pair: "EURUSD",
    flag: "EU/US",
    start: "15:00",
    end: "19:00",
    display: "3:00 PM - 7:00 PM",
    rating: 5,
    why: "Most consistent liquidity during London.",
  },
  {
    pair: "EURAUD",
    flag: "EU/AU",
    start: "14:00",
    end: "17:00",
    display: "2:00 PM - 5:00 PM",
    rating: 4,
    why: "London activates EUR; AUD leg is quieter, giving cleaner direction.",
  },
];

function loadTrades() {
  try {
    const stored = localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey);
    return stored ? normalizeTrades(JSON.parse(stored) as Partial<Trade>[]) : seedTrades;
  } catch {
    return seedTrades;
  }
}

function saveTrades(trades: Trade[]) {
  localStorage.setItem(storageKey, JSON.stringify(trades));
}

function loadWatchlist(): WatchItem[] {
  try {
    const stored = localStorage.getItem(watchlistStorageKey);
    if (!stored) return [];
    return (JSON.parse(stored) as Partial<WatchItem>[])
      .filter((item) => item.pair)
      .map((item, index) => ({
        id: item.id ?? `watch-${index}`,
        pair: String(item.pair).toUpperCase(),
        status: watchStatuses.includes(item.status as WatchStatus) ? (item.status as WatchStatus) : "Observation",
        image: item.image,
        imageName: item.imageName,
        addedAt: item.addedAt ?? new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchItem[]) {
  localStorage.setItem(watchlistStorageKey, JSON.stringify(items));
}

function loadLotSettings(): LotSettings {
  const fallback: LotSettings = {
    jpyToUsd: 0.0067,
    audToUsd: 0.66,
    activeProfileId: "profile-10k",
    profiles: [
      { id: "profile-10k", name: "10K Account", accountSize: 10000, riskPercent: 0.5 },
      { id: "profile-100k", name: "100K Account", accountSize: 100000, riskPercent: 0.5 },
    ],
  };
  try {
    const stored = localStorage.getItem(lotSettingsKey);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<LotSettings>;
    const profiles = parsed.profiles?.length ? parsed.profiles : fallback.profiles;
    return {
      ...fallback,
      ...parsed,
      profiles,
      activeProfileId: profiles.some((profile) => profile.id === parsed.activeProfileId) ? String(parsed.activeProfileId) : profiles[0].id,
    };
  } catch {
    return fallback;
  }
}

function saveLotSettings(settings: LotSettings) {
  localStorage.setItem(lotSettingsKey, JSON.stringify(settings));
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function compact(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

function tradeStartDate(trade: Pick<Trade, "date" | "time">) {
  return new Date(`${trade.date}T${trade.time || "00:00"}`);
}

function formatTradeDuration(start: Date, end: Date) {
  const totalMinutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
  if (totalMinutes < 60) return `${totalMinutes || 1}m`;
  const weeks = Math.floor(totalMinutes / 10080);
  const days = Math.floor((totalMinutes % 10080) / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (weeks) return `${weeks}w${days ? ` ${days}d` : ""}`;
  if (days) return `${days}d${hours ? ` ${hours}h` : ""}`;
  return `${hours}h${minutes ? ` ${minutes}m` : ""}`;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isWindowActive(start: string, end: string, date = new Date()) {
  const now = date.getHours() * 60 + date.getMinutes();
  return now >= timeToMinutes(start) && now < timeToMinutes(end);
}

function statusClass(status: WatchStatus) {
  if (status === "Being traded") return "trading";
  if (status === "Waiting for confirmation") return "waiting";
  return "observation";
}

function pipValuePerLot(pair: string, settings: LotSettings) {
  if (pair.endsWith("JPY")) return 1000 * settings.jpyToUsd;
  if (pair.endsWith("AUD")) return 10 * settings.audToUsd;
  return 10;
}

function calculateLotSize(pair: string, settings: LotSettings, stopLossPips: number) {
  const profile = settings.profiles.find((item) => item.id === settings.activeProfileId) ?? settings.profiles[0];
  const pipValue = pipValuePerLot(pair, settings);
  if (!stopLossPips || !pipValue) return 0;
  return ((profile.accountSize * profile.riskPercent) / 100) / (stopLossPips * pipValue);
}

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const image = document.createElement("img");
      image.onerror = () => reject(new Error("Could not load image file."));
      image.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not prepare image preview."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function detectSession(time: string): Session {
  const hour = Number(time.split(":")[0]);
  if (Number.isNaN(hour)) return "London";
  if (hour >= 7 && hour < 15) return "Asia";
  if (hour >= 15 && hour < 20) return "London";
  if (hour >= 20 && hour <= 23) return "Overlap";
  return "New York";
}

function scoreBias(value: number) {
  if (value > 0) return "Bullish";
  if (value < 0) return "Bearish";
  return "Neutral";
}

function scoreDirection(value: number): Direction | "Neutral" {
  if (value > 0) return "Long";
  if (value < 0) return "Short";
  return "Neutral";
}

function setupScore(trade: Pick<Trade, "mainScore" | "technicalScore" | "sentimentScore" | "ecoScore">) {
  const mainDirection = scoreDirection(trade.mainScore);
  if (mainDirection === "Neutral") return 0;
  return [trade.mainScore, trade.technicalScore, trade.sentimentScore, trade.ecoScore].filter((score) => scoreDirection(score) === mainDirection).length;
}

function setupRead(trade: Pick<Trade, "mainScore" | "technicalScore" | "sentimentScore" | "ecoScore">) {
  const mainBias = scoreBias(trade.mainScore);
  const alignment = setupScore(trade);
  if (mainBias === "Neutral") return "Neutral read";
  if (alignment >= 3) return `${mainBias} edge`;
  return `${mainBias} but mixed`;
}

function getTradeImage(images: TradeImage[] | undefined, kind: TradeImageKind) {
  return images?.find((image) => image.kind === kind);
}

async function requestTradeAnalysis(trade: Omit<Trade, "id"> | Trade, images: TradeImage[]) {
  const response = await fetch("/api/analyze-trade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trade: {
        date: trade.date,
        time: trade.time,
        symbol: trade.symbol,
        direction: trade.direction,
        session: detectSession(trade.time),
        scores: {
          main: trade.mainScore,
          technical: trade.technicalScore,
          sentiment: trade.sentimentScore,
          eco: trade.ecoScore,
        },
        marketMode: trade.marketMode,
      },
      images,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "AI analysis failed.");
  }
  return payload.analysis as AiAnalysis;
}

function normalizeTradeImage(image: TradeImage): TradeImage {
  if (image.kind === "postTrade") return image;
  return {
    ...image,
    kind: "preTrade",
    label: "Pre-trade analysis",
  };
}

function normalizeTrades(trades: Partial<Trade>[]): Trade[] {
  return trades.map((trade, index) => {
    const legacyTrade = trade as Partial<Trade> & { targetPlan?: string; lotSize?: number; entryTimeframe?: string; exitFrame?: string };
    const time = trade.time ?? "15:00";
    const resultR = Number(trade.resultR ?? 0);
    const targetR = Number(legacyTrade.targetR ?? blankTrade.targetR);
    const migratedImages =
      trade.tradeImages?.map(normalizeTradeImage) ??
      (trade.chartImage
        ? [
            {
              kind: "preTrade" as const,
              label: "Pre-trade analysis",
              image: trade.chartImage,
              name: trade.chartImageName || "Trade screenshot",
            },
          ]
        : []);
    return {
      ...blankTrade,
      ...trade,
      id: trade.id ?? `import-${index}`,
      time,
      direction: trade.direction === "Long" ? "Long" : "Short",
      session: detectSession(time),
      symbol: (trade.symbol ?? blankTrade.symbol).toUpperCase(),
      account: trade.account?.trim() || blankTrade.account,
      hasOneHourOrderBlock: Boolean(trade.hasOneHourOrderBlock ?? true),
      hasLastMoveOpposite: Boolean(trade.hasLastMoveOpposite ?? true),
      hasPreviousChangeOfStructure: Boolean(trade.hasPreviousChangeOfStructure ?? true),
      mainScore: Number(trade.mainScore ?? (trade.direction === "Long" ? 1 : -1)),
      technicalScore: Number(trade.technicalScore ?? (trade.direction === "Long" ? 1 : -1)),
      sentimentScore: Number(trade.sentimentScore ?? 0),
      ecoScore: Number(trade.ecoScore ?? 0),
      marketMode: trade.marketMode === "Sideways / range" ? "Sideways / range" : "Trend-following",
      stopLossPips: Number(legacyTrade.stopLossPips ?? blankTrade.stopLossPips),
      targetR,
      resultR,
      tradeDuration: trade.tradeDuration ?? "",
      endedAt: trade.endedAt,
      outcome: resultR > 0 ? "Win" : resultR < 0 ? "Loss" : "BE",
      tradeImages: migratedImages,
      aiAnalysis: trade.aiAnalysis,
      aiStatus: trade.aiStatus ?? (trade.aiAnalysis ? "complete" : "idle"),
      aiError: trade.aiError ?? "",
      notes: trade.notes ?? "",
    };
  });
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function App() {
  const [trades, setTrades] = useState<Trade[]>(loadTrades);
  const [draft, setDraft] = useState<Omit<Trade, "id">>(blankTrade);
  const [selectedSymbol, setSelectedSymbol] = useState("All");
  const [selectedAccount, setSelectedAccount] = useState("All");
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [lotSettings, setLotSettings] = useState<LotSettings>(loadLotSettings);
  const [watchlist, setWatchlist] = useState<WatchItem[]>(loadWatchlist);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [notice, setNotice] = useState<{ type: "success"; message: string } | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Trade | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ trade: Trade; image: TradeImage } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  const filteredTrades = useMemo(
    () =>
      trades.filter(
        (trade) =>
          (selectedSymbol === "All" || trade.symbol === selectedSymbol) &&
          (selectedAccount === "All" || trade.account === selectedAccount),
      ),
    [selectedAccount, selectedSymbol, trades],
  );

  const analytics = useMemo(() => buildAnalytics(filteredTrades), [filteredTrades]);
  const coach = useMemo(() => buildCoachNotes(filteredTrades), [filteredTrades]);
  const symbols = useMemo(() => ["All", ...Array.from(new Set([...watchPairs, ...trades.map((trade) => trade.symbol)]))], [trades]);
  const accounts = useMemo(() => ["All", ...Array.from(new Set(trades.map((trade) => trade.account)))], [trades]);
  const tradingWatchCount = watchlist.filter((item) => item.status === "Being traded").length;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setAuthOpen(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function updateDraft<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateLotSetting<K extends keyof LotSettings>(key: K, value: LotSettings[K]) {
    setLotSettings((current) => {
      const next = { ...current, [key]: value };
      saveLotSettings(next);
      return next;
    });
  }

  function addWatchPair(pair: string) {
    const normalized = pair.trim().toUpperCase();
    if (!normalized) return;
    if (watchlist.some((item) => item.pair === normalized)) {
      setNotice({ type: "success", message: `${normalized} is already on your watchlist.` });
      return;
    }
    const next = [
      {
        id: crypto.randomUUID(),
        pair: normalized,
        status: "Observation" as const,
        addedAt: new Date().toISOString(),
      },
      ...watchlist,
    ];
    setWatchlist(next);
    saveWatchlist(next);
    setNotice({ type: "success", message: `${normalized} added to watchlist.` });
  }

  function updateWatchItem(id: string, patch: Partial<WatchItem>) {
    setWatchlist((current) => {
      const updated = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveWatchlist(updated);
      return updated;
    });
  }

  async function attachWatchImage(id: string, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file for the watchlist pair.");
      return;
    }
    try {
      const image = await resizeImage(file);
      updateWatchItem(id, { image, imageName: file.name });
      setNotice({ type: "success", message: "Watchlist image added." });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not process watchlist image.");
    }
  }

  function deleteWatchItem(id: string) {
    const next = watchlist.filter((item) => item.id !== id);
    setWatchlist(next);
    saveWatchlist(next);
    setNotice({ type: "success", message: "Pair deleted from watchlist." });
  }

  async function attachTradeImage(kind: TradeImageKind, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file for the trade screenshot.");
      return;
    }
    try {
      const image = await resizeImage(file);
      const slot = imageSlots.find((item) => item.kind === kind);
      const nextImages = [
        ...(draft.tradeImages ?? []).filter((item) => item.kind !== kind),
        {
          kind,
          label: slot?.label ?? "Trade screenshot",
          image,
          name: file.name,
        },
      ];
      updateDraft("tradeImages", nextImages);
      updateDraft("aiAnalysis", undefined);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not process screenshot.");
    }
  }

  async function attachPostTradeImage(trade: Trade, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file for the post-trade screenshot.");
      return;
    }
    try {
      const image = await resizeImage(file);
      const slot = imageSlots.find((item) => item.kind === "postTrade");
      const tradeImages = [
        ...(trade.tradeImages ?? []).filter((item) => item.kind !== "postTrade"),
        {
          kind: "postTrade" as const,
          label: slot?.label ?? "Post-trade review",
          image,
          name: file.name,
        },
      ];
      const pending = trades.map((item) =>
        item.id === trade.id ? { ...item, tradeImages, aiStatus: "pending" as const, aiError: "" } : item,
      );
      setTrades(pending);
      saveTrades(pending);
      const updatedTrade = { ...trade, tradeImages, aiStatus: "pending" as const, aiError: "" };
      const analysis = await requestTradeAnalysis(updatedTrade, tradeImages);
      setTrades((current) => {
        const updated = current.map((item) =>
          item.id === trade.id ? { ...item, aiAnalysis: analysis, aiStatus: "complete" as const, aiError: "" } : item,
        );
        saveTrades(updated);
        return updated;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Post-trade analysis failed.";
      setTrades((current) => {
        const updated = current.map((item) => (item.id === trade.id ? { ...item, aiStatus: "error" as const, aiError: message } : item));
        saveTrades(updated);
        return updated;
      });
    }
  }

  function updateAccountProfile(id: string, patch: Partial<AccountProfile>) {
    setLotSettings((current) => {
      const next = {
        ...current,
        activeProfileId: id,
        profiles: current.profiles.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile)),
      };
      saveLotSettings(next);
      return next;
    });
  }

  function addAccountProfile() {
    setLotSettings((current) => {
      const nextProfile = {
        id: crypto.randomUUID(),
        name: `Account ${current.profiles.length + 1}`,
        accountSize: 10000,
        riskPercent: 0.5,
      };
      const next = {
        ...current,
        activeProfileId: nextProfile.id,
        profiles: [...current.profiles, nextProfile],
      };
      saveLotSettings(next);
      return next;
    });
  }

  function deleteAccountProfile(id: string) {
    setLotSettings((current) => {
      if (current.profiles.length <= 1) return current;
      const profiles = current.profiles.filter((profile) => profile.id !== id);
      const next = {
        ...current,
        profiles,
        activeProfileId: current.activeProfileId === id ? profiles[0].id : current.activeProfileId,
      };
      saveLotSettings(next);
      return next;
    });
  }

  async function addTrade(event: React.FormEvent) {
    event.preventDefault();
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisError("");
    setNotice(null);
    const resultR = Number(draft.resultR);
    const tradeId = crypto.randomUUID();
    const preTradeImages = (draft.tradeImages ?? []).filter((image) => image.kind !== "postTrade");
    const nextTrade: Trade = {
      ...draft,
      id: tradeId,
      direction: draft.direction,
      session: detectSession(draft.time),
      symbol: draft.symbol.trim().toUpperCase(),
      account: "Main",
      stopLossPips: Number(draft.stopLossPips),
      targetR: Number(draft.targetR),
      resultR,
      outcome: resultR > 0 ? "Win" : resultR < 0 ? "Loss" : "BE",
      aiStatus: preTradeImages.length ? "pending" : "idle",
      aiError: "",
    };
    const nextTrades = [nextTrade, ...trades];
    setTrades(nextTrades);
    saveTrades(nextTrades);
    setDraft({
      ...blankTrade,
      symbol: draft.symbol.trim().toUpperCase() || "EURUSD",
      account: draft.account.trim() || "Main",
    });
    if (!preTradeImages.length) {
      window.setTimeout(() => {
        setIsAnalyzing(false);
        setNotice({ type: "success", message: "Trade successfully added." });
      }, 450);
      return;
    }
    try {
      const analysis = await requestTradeAnalysis(nextTrade, preTradeImages);
      setTrades((current) => {
        const updated = current.map((trade) =>
          trade.id === tradeId ? { ...trade, aiAnalysis: analysis, aiStatus: "complete" as const, aiError: "" } : trade,
        );
        saveTrades(updated);
        return updated;
      });
      setNotice({ type: "success", message: "Trade successfully added and AI review completed." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI analysis failed.";
      setAnalysisError(message);
      setTrades((current) => {
        const updated = current.map((trade) => (trade.id === tradeId ? { ...trade, aiStatus: "error" as const, aiError: message } : trade));
        saveTrades(updated);
        return updated;
      });
      setNotice({ type: "success", message: "Trade successfully added. AI review needs attention." });
    } finally {
      setIsAnalyzing(false);
    }
  }

  function deleteTrade(id: string) {
    const nextTrades = trades.filter((trade) => trade.id !== id);
    setTrades(nextTrades);
    saveTrades(nextTrades);
    setNotice({ type: "success", message: "Trade successfully deleted from archive." });
  }

  function updateTradeResult(id: string, resultR: number) {
    const outcome: Outcome = resultR > 0 ? "Win" : resultR < 0 ? "Loss" : "BE";
    setTrades((current) => {
      const updated = current.map((trade) =>
        trade.id === id
          ? {
              ...trade,
              resultR,
              outcome,
            }
          : trade,
      );
      saveTrades(updated);
      return updated;
    });
  }

  function endTrade(id: string) {
    const endedAt = new Date();
    setTrades((current) => {
      const updated = current.map((trade) =>
        trade.id === id
          ? {
              ...trade,
              endedAt: endedAt.toISOString(),
              tradeDuration: formatTradeDuration(tradeStartDate(trade), endedAt),
            }
          : trade,
      );
      saveTrades(updated);
      return updated;
    });
    setNotice({ type: "success", message: "Trade ended and duration calculated." });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `edgelab-trades-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const normalized = normalizeTrades(JSON.parse(String(reader.result)) as Partial<Trade>[]);
        setTrades(normalized);
        saveTrades(normalized);
      } catch {
        alert("That file does not look like an EdgeLab journal export.");
      }
    };
    reader.readAsText(file);
  }

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    setAuthMessage("");
    if (!supabase) {
      setAuthMessage("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel.");
      return;
    }
    setAuthLoading(true);
    try {
      const result =
        authMode === "signin"
          ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
          : await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (result.error) throw result.error;
      setAuthMessage(authMode === "signup" ? "Account created. Check your email if confirmation is enabled." : "Signed in.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <main className="app-shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      {notice && (
        <div className={`app-notice ${notice.type}`} role="status">
          <Check size={16} />
          <span>{notice.message}</span>
        </div>
      )}
      <nav className="top-nav">
        <div className="nav-brand">
          <div className="brand-mark">EL</div>
          <div>
            <strong>EdgeLab</strong>
            <span>Edgefinder Journal</span>
          </div>
        </div>
        <div className="nav-tabs" aria-label="Primary sections">
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>
            <LayoutDashboard size={16} />
            Dashboard
          </button>
          <button className={activeTab === "add" ? "active" : ""} onClick={() => setActiveTab("add")}>
            <Plus size={16} />
            Add Trade
          </button>
          <button className={activeTab === "watchlist" ? "active" : ""} onClick={() => setActiveTab("watchlist")}>
            <CalendarClock size={16} />
            Watchlist
            {watchlist.length > 0 && <span className="tab-dot" />}
          </button>
          <button className={activeTab === "archive" ? "active" : ""} onClick={() => setActiveTab("archive")}>
            <TableProperties size={16} />
            Archive
          </button>
        </div>
        <div className="nav-account">
          <div className={`live-window ${tradingWatchCount ? "active" : ""}`}>
            <span />
            {tradingWatchCount
              ? `${tradingWatchCount} being traded`
              : watchlist.length
                ? `${watchlist.length} on watchlist`
                : "No pairs watched"}
          </div>
          <button className="login-button" title="Account options" onClick={() => setAuthOpen(true)}>
            <User size={16} />
            <span>{user?.email ? user.email.split("@")[0] : "Sign in"}</span>
          </button>
        </div>
      </nav>
      {activeTab === "dashboard" && <section className="hero">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="eyebrow">
            <Sparkles size={16} />
            Edgefinder score laboratory
          </div>
          <h1>EdgeLab</h1>
          <p>
              Track trend-following or sideways range trade ideas with Edgefinder confluence, compare technical,
            sentiment, and ECO reads, then log the result after the setup plays out.
          </p>
        </motion.div>
        <div className="hero-actions">
          <button className="icon-button primary" onClick={exportJson} title="Export journal">
            <Download size={18} />
            Export
          </button>
          <label className="icon-button ghost" title="Import journal">
            <Upload size={18} />
            Import
            <input type="file" accept="application/json" onChange={(event) => importJson(event.target.files?.[0])} />
          </label>
        </div>
      </section>}

      {activeTab === "dashboard" && (
        <>
          <section className="metrics-grid">
            <Metric icon={<Wallet />} label="Net expectancy" value={compact(analytics.totalR)} detail={`${analytics.count} trades`} />
            <Metric icon={<Target />} label="Win rate" value={percent(analytics.winRate)} detail={`${analytics.wins} wins / ${analytics.losses} losses`} />
            <Metric icon={<Check />} label="Score alignment" value={percent(analytics.setupPassRate)} detail={`${analytics.aPlusCount} aligned reads`} />
            <Metric icon={<Landmark />} label="Accounts" value={String(accounts.length - 1)} detail={selectedAccount === "All" ? "All accounts" : selectedAccount} />
          </section>

          <section className="dashboard-grid">
            <aside className="coach-panel">
              <div className="panel-header">
                <div>
                  <p className="kicker">Rules assisted</p>
                  <h2>Setup coach</h2>
                </div>
                <Brain size={24} />
              </div>
              <div className="coach-score">
                <span>{analytics.processScore}</span>
                <p>Process score</p>
              </div>
              <div className="coach-list">
                {coach.map((note) => (
                  <div className="coach-note" key={note.title}>
                    <strong>{note.title}</strong>
                    <p>{note.body}</p>
                  </div>
                ))}
              </div>
            </aside>
            <WatchlistPanel watchlist={watchlist} compactView />
          </section>

          <ChartsSection analytics={analytics} />
        </>
      )}

      {activeTab === "add" && (
      <section className="workbench single">
        <form className="trade-form" onSubmit={addTrade}>
          <div className="panel-header">
            <div>
              <p className="kicker">New trade</p>
              <h2>Capture the Edgefinder read</h2>
            </div>
            <button className="round-action" title="Save trade">
              <Save size={18} />
            </button>
          </div>

          <div className="form-grid">
            <Field label="Date">
              <input type="date" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} />
            </Field>
            <Field label="Time">
              <input type="time" value={draft.time} onChange={(event) => updateDraft("time", event.target.value)} />
            </Field>
            <Field label="Symbol">
              <input value={draft.symbol} onChange={(event) => updateDraft("symbol", event.target.value.toUpperCase())} placeholder="GBPNZD" />
            </Field>
            <Field label="Direction">
              <select value={draft.direction} onChange={(event) => updateDraft("direction", event.target.value as Direction)}>
                <option>Long</option>
                <option>Short</option>
              </select>
            </Field>
            <Field label="Market mode">
              <select value={draft.marketMode} onChange={(event) => updateDraft("marketMode", event.target.value as MarketMode)}>
                <option>Trend-following</option>
                <option>Sideways / range</option>
              </select>
            </Field>
            <Field label="Session">
              <input value={detectSession(draft.time)} readOnly />
            </Field>
          </div>

          <section className="form-section">
            <div className="section-title">
              <Activity size={18} />
              <div>
                <h3>Edgefinder scores</h3>
                <p>Positive scores are bullish. Negative scores are bearish.</p>
              </div>
            </div>
            <div className="form-grid">
              {scoreFields.map((field) => (
                <Field label={field.label} key={field.key}>
                  <ScoreInput
                    value={draft[field.key]}
                    onCommit={(value) => updateDraft(field.key, value)}
                  />
                </Field>
              ))}
            </div>
            <div className={`setup-read ${draft.mainScore >= 0 ? "complete" : "incomplete"}`}>
              <strong>{scoreBias(draft.mainScore)}</strong>
              <span>{setupScore(draft)}/4 score alignment - {setupRead(draft)}</span>
            </div>
          </section>

          <section className="screenshot-uploader">
            <div className="section-title">
              <Image size={18} />
              <div>
                <h3>Trade images</h3>
                <p>Pre-trade images analyze when you add the trade. Post-trade stays pending for later review.</p>
              </div>
            </div>
            <div className="trade-image-grid">
              {imageSlots.map((slot) => {
                const attachedImage = getTradeImage(draft.tradeImages, slot.kind);
                return (
                  <div className="trade-image-slot" key={slot.kind}>
                    <div>
                      <strong>{slot.label}</strong>
                      <p>{slot.help}</p>
                    </div>
                    {attachedImage ? (
                      <div className="screenshot-preview compact">
                        <img src={attachedImage.image} alt={attachedImage.name} />
                        <div>
                          <span>{attachedImage.name}</span>
                          <div className="screenshot-actions">
                            <label>
                              <Upload size={15} />
                              Replace
                              <input type="file" accept="image/*" onChange={(event) => attachTradeImage(slot.kind, event.target.files?.[0])} />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                updateDraft("tradeImages", (draft.tradeImages ?? []).filter((item) => item.kind !== slot.kind));
                                updateDraft("aiAnalysis", undefined);
                              }}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="screenshot-drop compact">
                        <Upload size={16} />
                        <span>Add image</span>
                        <input type="file" accept="image/*" onChange={(event) => attachTradeImage(slot.kind, event.target.files?.[0])} />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="analysis-hint">
              Initial AI review checks trend-following or sideways range structure plus Edgefinder confluence when you
              click Add Trade. Post-trade review can be analyzed later.
            </p>
            {analysisError && <p className="analysis-error">{analysisError}</p>}
            {draft.aiAnalysis && <AnalysisPanel analysis={draft.aiAnalysis} />}
          </section>
          <Field label="Notes">
            <textarea value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} rows={4} />
          </Field>
          <button className="submit-button" disabled={isAnalyzing}>
            <Plus size={18} />
            {isAnalyzing ? "Adding + analyzing..." : "Add trade"}
          </button>
        </form>
      </section>
      )}

      {activeTab === "watchlist" && (
        <WatchlistPanel
          watchlist={watchlist}
          onAddPair={addWatchPair}
          onUpdateItem={updateWatchItem}
          onAttachImage={attachWatchImage}
          onDeleteItem={deleteWatchItem}
          onPreviewImage={(item) =>
            item.image &&
            setSelectedImage({
              trade: {
                ...blankTrade,
                id: item.id,
                symbol: item.pair,
                date: item.addedAt.slice(0, 10),
                time: item.addedAt.slice(11, 16),
              },
              image: { kind: "preTrade", label: `${item.pair} watchlist image`, image: item.image, name: item.imageName ?? item.pair },
            })
          }
        />
      )}

      {activeTab === "archive" && (
      <section className="journal-panel">
        <div className="panel-header">
          <div>
            <p className="kicker">Trade archive</p>
            <h2>Evidence table</h2>
          </div>
          <div className="table-filters">
            <select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}>
              {accounts.map((account) => (
                <option key={account}>{account}</option>
              ))}
            </select>
            <select value={selectedSymbol} onChange={(event) => setSelectedSymbol(event.target.value)}>
              {symbols.map((symbol) => (
                <option key={symbol}>{symbol}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Market</th>
                <th>Edgefinder read</th>
                <th>Mode</th>
                <th>Screenshot</th>
                <th>AI review</th>
                <th>Duration</th>
                <th>Result</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade) => (
                <tr key={trade.id}>
                  <td>{trade.date}</td>
                  <td>{trade.account}</td>
                  <td>
                    <strong>{trade.symbol}</strong>
                    <span>{trade.direction} - {trade.time} - {trade.session}</span>
                  </td>
                  <td>
                    <strong>{setupRead(trade)}</strong>
                    <span>
                      Main {trade.mainScore} - Tech {trade.technicalScore} - Sent {trade.sentimentScore} - ECO {trade.ecoScore}
                    </span>
                  </td>
                  <td>
                    <strong>{trade.direction}</strong>
                    <span>{trade.marketMode}</span>
                  </td>
                  <td>
                    {trade.tradeImages?.length ? (
                      <div className="archive-shots">
                        {trade.tradeImages.map((image) => (
                          <button
                            className="archive-shot"
                            type="button"
                            title={image.name}
                            key={image.kind}
                            onClick={() => setSelectedImage({ trade, image })}
                          >
                            <img src={image.image} alt={image.name} />
                            <span>{image.label}</span>
                          </button>
                        ))}
                        <label className="archive-post-upload">
                          <Upload size={14} />
                          {getTradeImage(trade.tradeImages, "postTrade") ? "Replace post-trade" : "Add post-trade"}
                          <input type="file" accept="image/*" onChange={(event) => attachPostTradeImage(trade, event.target.files?.[0])} />
                        </label>
                      </div>
                    ) : (
                      <label className="archive-post-upload">
                        <Upload size={14} />
                        Add post-trade
                        <input type="file" accept="image/*" onChange={(event) => attachPostTradeImage(trade, event.target.files?.[0])} />
                      </label>
                    )}
                  </td>
                  <td>
                    {trade.aiAnalysis ? (
                      <button className="review-score-button" onClick={() => setSelectedAnalysis(trade)}>
                        {trade.aiAnalysis.score}/100
                      </button>
                    ) : trade.aiStatus === "pending" ? (
                      <span>Pending</span>
                    ) : trade.aiStatus === "error" ? (
                      <span title={trade.aiError}>AI error</span>
                    ) : (
                      <span>Not analyzed</span>
                    )}
                  </td>
                  <td>
                    <div className="duration-cell">
                      <strong>{trade.tradeDuration || "Open"}</strong>
                      {trade.endedAt ? (
                        <span>Ended {new Date(trade.endedAt).toLocaleDateString()}</span>
                      ) : (
                        <button type="button" onClick={() => endTrade(trade.id)}>
                          End trade
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <label className={`result-editor ${trade.resultR >= 0 ? "positive" : "negative"}`}>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={trade.resultR}
                        onBlur={(event) => {
                          const resultR = Number(event.target.value || 0);
                          updateTradeResult(trade.id, resultR);
                          setNotice({ type: "success", message: "Trade result successfully updated." });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                        aria-label={`Update result for ${trade.symbol}`}
                      />
                      <span>R</span>
                    </label>
                  </td>
                  <td>
                    <button className="delete-button" onClick={() => deleteTrade(trade.id)} title="Delete trade">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}
      {selectedAnalysis?.aiAnalysis && (
        <div className="analysis-modal" role="dialog" aria-modal="true" onClick={() => setSelectedAnalysis(null)}>
          <div className="analysis-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <p className="kicker">{selectedAnalysis.symbol} AI review</p>
                <h2>{selectedAnalysis.aiAnalysis.score}/100 setup quality</h2>
              </div>
              <button className="delete-button" onClick={() => setSelectedAnalysis(null)} title="Close AI review">
                <X size={16} />
              </button>
            </div>
            <AnalysisPanel analysis={selectedAnalysis.aiAnalysis} />
          </div>
        </div>
      )}
      {selectedImage && (
        <div className="analysis-modal" role="dialog" aria-modal="true" onClick={() => setSelectedImage(null)}>
          <div className="image-preview-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <p className="kicker">{selectedImage.trade.symbol} screenshot</p>
                <h2>{selectedImage.image.label}</h2>
              </div>
              <button className="delete-button" onClick={() => setSelectedImage(null)} title="Close screenshot preview">
                <X size={16} />
              </button>
            </div>
            <img src={selectedImage.image.image} alt={selectedImage.image.name} />
            <p>{selectedImage.image.name}</p>
          </div>
        </div>
      )}
      {isAnalyzing && (
        <div className="submit-loading-overlay" role="alert" aria-live="assertive">
          <div className="submit-loading-card">
            <div className="loading-ring">
              <Sparkles size={24} />
            </div>
            <strong>Adding your trade</strong>
            <p>Please keep this page open while EdgeLab saves the trade and completes the AI review.</p>
          </div>
        </div>
      )}
      {authOpen && (
        <div className="analysis-modal" role="dialog" aria-modal="true" onClick={() => setAuthOpen(false)}>
          <div className="auth-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <p className="kicker">Account</p>
                <h2>{user ? "Account options" : authMode === "signin" ? "Sign in" : "Create account"}</h2>
              </div>
              <button className="delete-button" onClick={() => setAuthOpen(false)} title="Close account panel">
                <X size={16} />
              </button>
            </div>
            {user ? (
              <div className="auth-signed-in">
                <User size={28} />
                <strong>{user.email}</strong>
                <button type="button" onClick={signOut}>
                  Sign out
                </button>
              </div>
            ) : (
              <form className="auth-form" onSubmit={submitAuth}>
                {!isSupabaseConfigured && (
                  <p className="analysis-error">
                    Supabase env vars are missing. Add them in Vercel, then redeploy.
                  </p>
                )}
                <Field label="Email">
                  <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
                </Field>
                <Field label="Password">
                  <input type="password" minLength={6} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required />
                </Field>
                {authMessage && <p className="auth-message">{authMessage}</p>}
                <button className="submit-button" disabled={authLoading}>
                  <LogIn size={18} />
                  {authLoading ? "Working..." : authMode === "signin" ? "Sign in" : "Create account"}
                </button>
                <button
                  className="auth-switch"
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "signin" ? "signup" : "signin");
                    setAuthMessage("");
                  }}
                >
                  {authMode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <motion.article className="metric-card" whileHover={{ y: -4 }}>
      <div className="metric-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </motion.article>
  );
}

function AnalysisPanel({ analysis }: { analysis: AiAnalysis }) {
  const items = [
    ["Structure", analysis.structure],
    ["Technical confirmation", analysis.orderBlock],
    ["Score alignment", analysis.bosChoch],
    ["Liquidity", analysis.liquidity],
    ["Execution gap", analysis.fvg],
    ["Trend", analysis.trend],
    ["Session", analysis.session],
  ];

  return (
    <div className="analysis-panel">
      <div className="analysis-score">
        <span>Setup quality</span>
        <strong>{analysis.score}/100</strong>
        <p>Estimated AI cost: {analysis.costUsd} ({analysis.costPhp})</p>
      </div>
      <div className="analysis-grid">
        {items.map(([label, body]) => (
          <div key={label}>
            <span>{label}</span>
            <p>{body}</p>
          </div>
        ))}
      </div>
      <div className="analysis-feedback">
        <strong>Coaching feedback</strong>
        <p>{analysis.feedback}</p>
      </div>
    </div>
  );
}

function WatchlistPanel({
  watchlist = [],
  onAddPair,
  onUpdateItem,
  onAttachImage,
  onDeleteItem,
  onPreviewImage,
  compactView = false,
}: {
  watchlist?: WatchItem[];
  onAddPair?: (pair: string) => void;
  onUpdateItem?: (id: string, patch: Partial<WatchItem>) => void;
  onAttachImage?: (id: string, file: File | undefined) => void;
  onDeleteItem?: (id: string) => void;
  onPreviewImage?: (item: WatchItem) => void;
  compactView?: boolean;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toUpperCase();
  const watchedPairs = new Set(watchlist.map((item) => item.pair));
  const tradingCount = watchlist.filter((item) => item.status === "Being traded").length;
  const waitingCount = watchlist.filter((item) => item.status === "Waiting for confirmation").length;
  const searchResults = normalizedQuery
    ? forexPairs.filter((pair) => pair.includes(normalizedQuery)).slice(0, 8)
    : forexPairs.slice(0, 8);

  return (
    <section className={`watchlist-panel ${compactView ? "compact" : ""}`}>
      <div className="panel-header">
        <div>
          <p className="kicker">Watchlist tracker</p>
          <h2>{compactView ? "Watchlist focus" : "Pair watchlist"}</h2>
        </div>
        <div className={`live-window ${tradingCount ? "active" : ""}`}>
          <span />
          {tradingCount ? `${tradingCount} trading` : `${watchlist.length} watched`}
        </div>
      </div>
      <div className="watch-summary-grid">
        <div className="watch-summary-card trading">
          <span>Being traded</span>
          <strong>{tradingCount}</strong>
        </div>
        <div className="watch-summary-card waiting">
          <span>Waiting confirmation</span>
          <strong>{waitingCount}</strong>
        </div>
        <div className="watch-summary-card observation">
          <span>Observation</span>
          <strong>{watchlist.filter((item) => item.status === "Observation").length}</strong>
        </div>
      </div>
      {!compactView && (
        <div className="watchlist-manager">
          <div className="watch-search">
            <Field label="Search forex pair">
              <input value={query} onChange={(event) => setQuery(event.target.value.toUpperCase())} placeholder="Search GBPNZD, EURUSD, XAUUSD..." />
            </Field>
            <div className="watch-search-results">
              {searchResults.map((pair) => {
                const isAdded = watchedPairs.has(pair);
                return (
                  <motion.button
                    type="button"
                    key={pair}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isAdded}
                    onClick={() => onAddPair?.(pair)}
                  >
                    <span>{pair}</span>
                    <strong>{isAdded ? "Added" : "Add"}</strong>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="watch-table">
            <div className="watch-table-head">
              <span>Pair</span>
              <span>Status</span>
              <span>Image</span>
              <span>Action</span>
            </div>
            {watchlist.length ? (
              watchlist.map((item) => (
                <motion.div
                  className={`watch-row ${statusClass(item.status)}`}
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div>
                    <strong>{item.pair}</strong>
                    <span>Added {item.addedAt.slice(0, 10)}</span>
                  </div>
                  <select value={item.status} onChange={(event) => onUpdateItem?.(item.id, { status: event.target.value as WatchStatus })}>
                    {watchStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <div className="watch-image-cell">
                    {item.image ? (
                      <button type="button" onClick={() => onPreviewImage?.(item)}>
                        <img src={item.image} alt={item.imageName ?? item.pair} />
                      </button>
                    ) : (
                      <span>No image</span>
                    )}
                    <label>
                      <Upload size={14} />
                      {item.image ? "Replace" : "Add"}
                      <input type="file" accept="image/*" onChange={(event) => onAttachImage?.(item.id, event.target.files?.[0])} />
                    </label>
                  </div>
                  <button className="delete-button" type="button" title="Delete pair" onClick={() => onDeleteItem?.(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="watch-empty">Search and add pairs to build your watchlist.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function LotCalculator({
  pair,
  stopLossPips,
  settings,
  onChange,
  onProfileChange,
  onAddProfile,
  onDeleteProfile,
}: {
  pair: string;
  stopLossPips: number;
  settings: LotSettings;
  onChange: <K extends keyof LotSettings>(key: K, value: LotSettings[K]) => void;
  onProfileChange: (id: string, patch: Partial<AccountProfile>) => void;
  onAddProfile: () => void;
  onDeleteProfile: (id: string) => void;
}) {
  const activeProfile = settings.profiles.find((profile) => profile.id === settings.activeProfileId) ?? settings.profiles[0];
  const riskAmount = (activeProfile.accountSize * activeProfile.riskPercent) / 100;
  const pipValue = pipValuePerLot(pair, settings);
  const lotSize = calculateLotSize(pair, settings, stopLossPips);
  const profileLots = settings.profiles.map((profile) => {
    const profileRiskAmount = (profile.accountSize * profile.riskPercent) / 100;
    const profileLotSize = stopLossPips && pipValue ? profileRiskAmount / (stopLossPips * pipValue) : 0;
    return { ...profile, riskAmount: profileRiskAmount, lotSize: profileLotSize };
  });
  const conversionNote = pair.endsWith("JPY")
    ? "JPY pairs use 1000 x (1 / USDJPY). Update this daily."
    : pair.endsWith("AUD")
      ? "EURAUD uses 10 x AUDUSD. Update AUDUSD daily."
      : "USD quote pairs use about $10 per pip per standard lot.";

  return (
    <section className="lot-calculator">
      <div className="panel-header">
        <div>
          <p className="kicker">Position sizing</p>
          <h2>Lot size calculator</h2>
        </div>
        <Calculator size={24} />
      </div>
      <div className="calculator-grid">
        <Field label="Account profile">
          <select value={settings.activeProfileId} onChange={(event) => onChange("activeProfileId", event.target.value)}>
            {settings.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="JPY to USD">
          <input type="number" min="0" step="0.0001" value={settings.jpyToUsd} onChange={(event) => onChange("jpyToUsd", Number(event.target.value))} />
        </Field>
        <Field label="AUD to USD">
          <input type="number" min="0" step="0.0001" value={settings.audToUsd} onChange={(event) => onChange("audToUsd", Number(event.target.value))} />
        </Field>
      </div>
      <div className="calculator-result">
        <div>
          <span>{activeProfile.name} risk</span>
          <strong>${riskAmount.toFixed(2)}</strong>
          <p>
            ${activeProfile.accountSize.toLocaleString()} account at {activeProfile.riskPercent}% risk.
          </p>
        </div>
        <div>
          <span>Selected lot size</span>
          <strong>{lotSize.toFixed(2)}</strong>
          <p>Using {stopLossPips || 0} pip stop loss from the trade form.</p>
        </div>
      </div>
      <div className="profile-lot-panel">
        <div className="profile-lot-head">
          <span>Account</span>
          <span>Risk</span>
          <span>Suggested lot</span>
        </div>
        {profileLots.map((profile) => (
          <button
            className={profile.id === settings.activeProfileId ? "active" : ""}
            key={profile.id}
            type="button"
            onClick={() => {
              onChange("activeProfileId", profile.id);
            }}
          >
            <span>{profile.name}</span>
            <span>${profile.riskAmount.toFixed(2)}</span>
            <strong>{profile.lotSize.toFixed(2)}</strong>
          </button>
        ))}
      </div>
      <div className="calculator-result single">
        <div>
          <span>{pair} pip value</span>
          <strong>${pipValue.toFixed(2)} / lot</strong>
          <p>{conversionNote}</p>
        </div>
      </div>
      <div className="account-profile-panel">
        <div className="section-title">
          <Wallet size={18} />
          <div>
            <h3>Account profiles</h3>
            <p>Pre-add your account sizes and risk percent. The calculator uses the selected profile above.</p>
          </div>
          <button type="button" onClick={onAddProfile}>
            <Plus size={15} />
            Add
          </button>
        </div>
        <div className="account-profile-grid">
          <div className="account-profile-head">
            <span>Name</span>
            <span>Account size</span>
            <span>Risk %</span>
            <span />
          </div>
          {settings.profiles.map((profile) => (
            <div className="account-profile-row" key={profile.id}>
              <input value={profile.name} onChange={(event) => onProfileChange(profile.id, { name: event.target.value })} />
              <input
                type="number"
                min="0"
                step="100"
                value={profile.accountSize}
                onChange={(event) => onProfileChange(profile.id, { accountSize: Number(event.target.value) })}
              />
              <input
                type="number"
                min="0"
                step="0.1"
                value={profile.riskPercent}
                onChange={(event) => onProfileChange(profile.id, { riskPercent: Number(event.target.value) })}
              />
              <button type="button" onClick={() => onDeleteProfile(profile.id)} disabled={settings.profiles.length <= 1} title="Delete account profile">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChartsSection({ analytics }: { analytics: ReturnType<typeof buildAnalytics> }) {
  return (
    <section className="charts-grid">
      <ChartPanel title="Equity curve" icon={<LineIcon size={18} />}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={analytics.equity}>
            <defs>
              <linearGradient id="equity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c084fc" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis dataKey="date" stroke="#a7a0ba" tickLine={false} axisLine={false} />
            <YAxis stroke="#a7a0ba" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="balance" stroke="#c084fc" strokeWidth={3} fill="url(#equity)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Setup quality vs outcome" icon={<Activity size={18} />}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={analytics.setupBuckets}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis dataKey="bucket" stroke="#a7a0ba" tickLine={false} axisLine={false} />
            <YAxis stroke="#a7a0ba" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="avgR" fill="#a855f7" radius={[6, 6, 0, 0]} />
            <Line type="monotone" dataKey="winRate" stroke="#22d3ee" strokeWidth={3} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Profit by session" icon={<CalendarClock size={18} />}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={analytics.sessionStats}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis dataKey="session" stroke="#a7a0ba" tickLine={false} axisLine={false} />
            <YAxis stroke="#a7a0ba" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="r" radius={[6, 6, 0, 0]}>
              {analytics.sessionStats.map((row) => (
                <Cell key={row.session} fill={row.r >= 0 ? "#34d399" : "#fb7185"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Process quality" icon={<Check size={18} />}>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={analytics.radar}>
            <PolarGrid stroke="rgba(255,255,255,.14)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#d7c8ff", fontSize: 12 }} />
            <Radar dataKey="value" stroke="#c084fc" fill="#c084fc" fillOpacity={0.36} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ScoreInput({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(nextText = text) {
    if (nextText === "" || nextText === "-") {
      onCommit(0);
      setText("0");
      return;
    }
    const parsed = Number(nextText);
    if (Number.isFinite(parsed)) onCommit(parsed);
  }

  return (
    <input
      inputMode="numeric"
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        if (/^-?\d*$/.test(next)) {
          setText(next);
          if (next !== "" && next !== "-") onCommit(Number(next));
        }
      }}
      onBlur={() => commit()}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      placeholder="-2"
    />
  );
}

function CriteriaToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`criteria-toggle ${checked ? "checked" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
      <Check size={16} />
    </label>
  );
}

function ChartPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="chart-panel">
      <div className="chart-title">
        {icon}
        <h3>{title}</h3>
      </div>
      {children}
    </article>
  );
}

function buildAnalytics(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const wins = trades.filter((trade) => trade.resultR > 0);
  const losses = trades.filter((trade) => trade.resultR < 0);
  const totalR = trades.reduce((sum, trade) => sum + trade.resultR, 0);
  const aPlusTrades = trades.filter((trade) => setupScore(trade) >= 3);
  const incompleteTrades = trades.filter((trade) => setupScore(trade) < 3);
  const setupPassRate = trades.length ? aPlusTrades.length / trades.length : 0;
  const criteriaCompletion = average(trades.map((trade) => setupScore(trade) / 4));
  const analyzedTrades = trades.filter((trade) => trade.aiAnalysis);
  const aiScoreAverage = average(analyzedTrades.map((trade) => trade.aiAnalysis?.score ?? 0));
  const processScore = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        average([
          criteriaCompletion * 100,
          analyzedTrades.length ? aiScoreAverage : criteriaCompletion * 100,
          trades.length ? (analyzedTrades.length / trades.length) * 100 : 0,
          aPlusTrades.length ? Math.max(0, average(aPlusTrades.map((trade) => trade.resultR)) * 20 + 60) : 55,
        ]),
      ),
    ),
  );

  const equity = sorted.reduce<{ date: string; balance: number }[]>((rows, trade) => {
    const previous = rows.at(-1)?.balance ?? 0;
    rows.push({ date: trade.date.slice(5), balance: Number((previous + trade.resultR).toFixed(2)) });
    return rows;
  }, []);

  const setupBuckets = [
    { bucket: "Aligned 3+", items: aPlusTrades },
    { bucket: "Mixed read", items: incompleteTrades },
  ].map(({ bucket, items }) => ({
    bucket,
    avgR: Number(average(items.map((trade) => trade.resultR)).toFixed(2)),
    winRate: Number((items.length ? items.filter((trade) => trade.resultR > 0).length / items.length : 0).toFixed(2)),
  }));

  const sessionStats = ["Asia", "London", "New York", "Overlap"].map((session) => ({
    session,
    r: Number(trades.filter((trade) => trade.session === session).reduce((sum, trade) => sum + trade.resultR, 0).toFixed(2)),
  }));

  const modeStats = ["Trend-following", "Sideways / range"].map((marketMode) => ({
    marketMode,
    r: Number(trades.filter((trade) => trade.marketMode === marketMode).reduce((sum, trade) => sum + trade.resultR, 0).toFixed(2)),
  }));

  const radar = [
    { metric: "Main", value: Math.round(Math.min(100, Math.abs(average(trades.map((trade) => trade.mainScore))) * 25)) },
    { metric: "Tech", value: Math.round(Math.min(100, Math.abs(average(trades.map((trade) => trade.technicalScore))) * 25)) },
    { metric: "Sentiment", value: Math.round(Math.min(100, Math.abs(average(trades.map((trade) => trade.sentimentScore))) * 25)) },
    { metric: "ECO", value: Math.round(Math.min(100, Math.abs(average(trades.map((trade) => trade.ecoScore))) * 25)) },
    { metric: "AI Score", value: Math.round(aiScoreAverage) },
    { metric: "Reviewed", value: trades.length ? Math.round((analyzedTrades.length / trades.length) * 100) : 0 },
  ];

  return {
    count: trades.length,
    wins: wins.length,
    losses: losses.length,
    totalR,
    winRate: trades.length ? wins.length / trades.length : 0,
    aPlusCount: aPlusTrades.length,
    setupPassRate,
    criteriaCompletion,
    processScore,
    equity,
    setupBuckets,
    sessionStats,
    modeStats,
    radar,
    aPlusR: aPlusTrades.reduce((sum, trade) => sum + trade.resultR, 0),
    incompleteR: incompleteTrades.reduce((sum, trade) => sum + trade.resultR, 0),
  };
}

function buildCoachNotes(trades: Trade[]) {
  const analytics = buildAnalytics(trades);
  const worstSession = analytics.sessionStats.sort((a, b) => a.r - b.r)[0];
  const bestMode = analytics.modeStats.sort((a, b) => b.r - a.r)[0];

  return [
    {
      title: analytics.setupPassRate >= 0.7 ? "Score alignment is strong" : "Respect mixed Edgefinder reads",
      body: `${percent(analytics.setupPassRate)} of logged trades have at least three score components aligned with the Main Score. Keep mixed reads smaller until the sample improves.`,
    },
    {
      title: analytics.aPlusR > analytics.incompleteR ? "Aligned reads are leading" : "Mixed reads are costing clarity",
      body:
        analytics.aPlusR > analytics.incompleteR
          ? `Aligned score reads are net ${compact(analytics.aPlusR)}. That is the clean sample to size from first.`
          : `Mixed score reads are net ${compact(analytics.incompleteR)}. Consider marking them as observation-only until the sample improves.`,
    },
    {
      title: bestMode ? `${bestMode.marketMode} leads` : "Mode data is early",
      body: bestMode
        ? `${bestMode.marketMode} is currently net ${compact(bestMode.r)}. Compare trend-following against sideways range trades before changing rules.`
        : "Log a few more trades before trusting mode stats.",
    },
    {
      title: `Watch ${worstSession?.session ?? "your weakest session"}`,
      body: `${worstSession?.session ?? "The weakest session"} is currently ${compact(worstSession?.r ?? 0)}. Keep session timing separate from the Edgefinder read.`,
    },
  ];
}

const tooltipStyle = {
  background: "rgba(18, 7, 31, .95)",
  border: "1px solid rgba(216, 180, 254, .24)",
  borderRadius: "8px",
  color: "#f7f1ff",
};

createRoot(document.getElementById("root")!).render(<App />);
