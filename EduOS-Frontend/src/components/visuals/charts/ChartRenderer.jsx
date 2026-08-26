import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function ChartRenderer({ configuration = {} }) {
  const {
    chartType = 'BAR',
    title = 'Data Chart',
    xAxis = 'Label',
    yAxis = 'Value',
    data = []
  } = configuration;

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl text-center min-h-[300px]">
        <p className="text-xs text-neutral-450 font-bold uppercase tracking-wider">No chart data available to render.</p>
      </div>
    );
  }

  // Safe data mapper: ensure values are numbers
  const chartData = data.map(item => ({
    name: item.label || item.name || '',
    value: Number(item.value) || 0
  }));

  const renderChart = () => {
    switch (chartType.toUpperCase()) {
      case 'LINE':
        return (
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="name" stroke="#737373" fontSize={10} tickLine={false} />
            <YAxis stroke="#737373" fontSize={10} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '12px' }}
              labelStyle={{ color: '#f3f4f6', fontWeight: 'bold', fontSize: '11px' }}
              itemStyle={{ color: '#3b82f6', fontSize: '11px' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="value" name={yAxis} stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} />
          </LineChart>
        );

      case 'PIE':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={95}
              fill="#8884d8"
              dataKey="value"
              fontSize={9}
              fontWeight="bold"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '12px' }}
              itemStyle={{ color: '#f3f4f6', fontSize: '11px' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
          </PieChart>
        );

      case 'BAR':
      default:
        return (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="name" stroke="#737373" fontSize={10} tickLine={false} />
            <YAxis stroke="#737373" fontSize={10} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '12px' }}
              labelStyle={{ color: '#f3f4f6', fontWeight: 'bold', fontSize: '11px' }}
              itemStyle={{ color: '#10b981', fontSize: '11px' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <Bar dataKey="value" name={yAxis} fill="#10b981" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  return (
    <div className="w-full h-full min-h-[380px] p-5 flex flex-col bg-neutral-900 border border-neutral-750/30 rounded-3xl overflow-hidden shadow-2xl justify-between">
      <div className="mb-2 select-none">
        <h4 className="text-xs font-black text-neutral-100 uppercase tracking-widest">{title}</h4>
        <p className="text-[10px] text-neutral-450 uppercase font-bold mt-0.5 tracking-wider">
          Comparing {xAxis} vs {yAxis}
        </p>
      </div>

      <div className="flex-1 w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
