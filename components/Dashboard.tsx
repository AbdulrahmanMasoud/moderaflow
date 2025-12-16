import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, CheckCircle2, XCircle } from 'lucide-react';
import { Metric } from '../types';

const data = [
  { name: '00:00', messages: 12 },
  { name: '04:00', messages: 5 },
  { name: '08:00', messages: 45 },
  { name: '12:00', messages: 89 },
  { name: '16:00', messages: 120 },
  { name: '20:00', messages: 65 },
  { name: '23:59', messages: 30 },
];

const recentActivity = [
  { id: 1, user: 'John Doe', message: 'Where is my order?', sentiment: 'Neutral', status: 'Auto-Replied', time: '2m ago' },
  { id: 2, user: 'Sarah Smith', message: 'This product is terrible!', sentiment: 'Negative', status: 'Flagged', time: '15m ago' },
  { id: 3, user: 'Mike Ross', message: 'Thanks for the help.', sentiment: 'Positive', status: 'Resolved', time: '1h ago' },
  { id: 4, user: 'Emily Blunt', message: 'Do you ship to Canada?', sentiment: 'Neutral', status: 'Auto-Replied', time: '2h ago' },
];

export const Dashboard: React.FC = () => {
  const metrics: Metric[] = [
    { label: 'Total Volume', value: '1,234', change: 12.5, trend: 'up' },
    { label: 'Avg. Response Time', value: '1.2s', change: -8.2, trend: 'down' }, // down is good for time
    { label: 'Escalation Rate', value: '2.4%', change: 0.4, trend: 'up' },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 mt-1">Overview of your moderation workflow.</p>
        </div>
        <div className="flex gap-2">
            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                System Operational
            </span>
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                n8n Connected
            </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              {stat.trend === 'up' ? 
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${idx === 1 ? 'bg-green-100 text-green-700' : (stat.label === 'Escalation Rate' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}`}>
                    {stat.change > 0 ? '+' : ''}{stat.change}%
                </span>
                :
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {stat.change}%
                </span>
              }
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-base font-semibold text-slate-900 mb-6">Message Volume (24h)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', color: '#fff', borderRadius: '6px', border: 'none' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="messages" 
                stroke="#000000" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorMessages)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-900">Recent Workflow Executions</h3>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
        </div>
        <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-medium">
                <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Message Snippet</th>
                    <th className="px-6 py-3">Sentiment</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3 text-right">Time</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {recentActivity.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{row.user}</td>
                        <td className="px-6 py-4 truncate max-w-[200px]">{row.message}</td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                ${row.sentiment === 'Negative' ? 'bg-red-50 text-red-700' : 
                                  row.sentiment === 'Positive' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                {row.sentiment}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                {row.status === 'Flagged' ? <XCircle size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-green-500" />}
                                <span>{row.status}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-400">{row.time}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};