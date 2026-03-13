"use client";

import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

const mockLeadData = [
  { name: "Seg", leads: 12 },
  { name: "Ter", leads: 19 },
  { name: "Qua", leads: 15 },
  { name: "Qui", leads: 22 },
  { name: "Sex", leads: 28 },
  { name: "Sáb", leads: 10 },
  { name: "Dom", leads: 8 },
];

const mockAdsData = [
  { name: "Semana 1", gasto: 400, cliques: 1200 },
  { name: "Semana 2", gasto: 300, cliques: 900 },
  { name: "Semana 3", gasto: 550, cliques: 1800 },
  { name: "Semana 4", gasto: 620, cliques: 2100 },
];

export function LeadsChart() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const color = isLight ? "#00a064" : "#00c882"; // Verde esmeralda (Institucional)
  const gridColor = isLight ? "#e4e4e7" : "#27272a";
  const textColor = isLight ? "#71717a" : "#a1a1aa";

  return (
    <div className="h-[250px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={mockLeadData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            cursor={{ fill: isLight ? "#f4f4f5" : "#27272a" }}
            contentStyle={{ backgroundColor: isLight ? "#fff" : "#18181b", borderColor: isLight ? "#e4e4e7" : "#27272a", borderRadius: "8px" }} 
          />
          <Bar dataKey="leads" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdsSpendChart() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const color = isLight ? "#00a064" : "#00c882"; // Verde esmeralda (Institucional)
  const gridColor = isLight ? "#e4e4e7" : "#27272a";
  const textColor = isLight ? "#71717a" : "#a1a1aa";

  return (
    <div className="h-[250px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={mockAdsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: isLight ? "#fff" : "#18181b", borderColor: isLight ? "#e4e4e7" : "#27272a", borderRadius: "8px" }} 
          />
          <Area type="monotone" dataKey="gasto" stroke={color} fillOpacity={1} fill="url(#colorGasto)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
