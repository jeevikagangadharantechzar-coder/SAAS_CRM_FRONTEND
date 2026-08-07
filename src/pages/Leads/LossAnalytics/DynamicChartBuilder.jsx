import React, { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend } from "recharts";
import CustomReasonsTooltip from "./CustomReasonsTooltip";
import CustomFunnel from "./CustomFunnel";
import { COLORS, STANDARD_REASONS } from "./constants";

const DynamicChartBuilder = ({ data }) => {
  const [availableFields] = useState([
    { id: "lossStage", label: "Loss Stage" },
    { id: "rejectionReason", label: "Rejection Reason" },
    { id: "industry", label: "Industry" },
    { id: "source", label: "Source" },
    { id: "leadAgeAtLossDays", label: "Lead Age (Days)" },
    { id: "followUpCountAtLoss", label: "Follow Ups" }
  ]);

  const [xAxisField, setXAxisField] = useState(null);
  const [chartType, setChartType] = useState("Bar");

  const handleDragStart = (e, field) => {
    e.dataTransfer.setData("field", JSON.stringify(field));
  };

  const handleDropXAxis = (e) => {
    e.preventDefault();
    const fieldData = e.dataTransfer.getData("field");
    if (fieldData) {
      const field = JSON.parse(fieldData);
      setXAxisField(field);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const generateDynamicChartData = () => {
    if (!xAxisField) return [];
    
    const aggregated = {};
    data.rawLeads.forEach(lead => {
      let key = lead[xAxisField.id];
      if (key === null || key === undefined || key === "") {
        key = "Unspecified Reason";
      }
      
      if (xAxisField.label === "Rejection Reason" || xAxisField.label === "Loss Stage") {
        if (key === "Unspecified Reason") return; 
      }

      let actualReason = null;
      if (xAxisField.id === "rejectionReason") {
        if (!STANDARD_REASONS.includes(key) && key !== "Others") {
          actualReason = key;
          key = "Others";
        }
      }
      if (xAxisField.id === "leadAgeAtLossDays") {
        if (key <= 7) {
          key = "0-7 days";
        } else if (key <= 30) {
          key = "8-30 days";
        } else {
          key = "30+ days";
        }
      }
      
      if (xAxisField.id === "followUpCountAtLoss") {
        if (key !== "Unspecified Reason") {
          key = key >= 5 ? "5+ Follow-ups" : `${key} Follow-ups`;
        }
      }

      if (!aggregated[key]) {
        aggregated[key] = { name: key, count: 0, customReasonsList: {} };
      }
      
      aggregated[key].count += 1;
      if (actualReason) {
        aggregated[key].customReasonsList[actualReason] = (aggregated[key].customReasonsList[actualReason] || 0) + 1;
      }
    });

    return Object.values(aggregated).sort((a, b) => b.count - a.count).slice(0, 15);
  };

  const dynamicChartData = generateDynamicChartData();

  return (
    <div className="bg-white/60 backdrop-blur-lg p-8 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white mb-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Dynamic Chart Builder</h2>
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Fields List */}
        <div className="w-full lg:w-1/4">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Available Fields (Click or Drag)</h3>

          <div className="flex flex-col gap-2 h-40 lg:h-auto lg:max-h-96 overflow-y-auto pr-2">
            {availableFields.map(field => (
              <div 
                key={field.id}
                draggable
                onClick={() => setXAxisField(field)}
                onDragStart={(e) => handleDragStart(e, field)}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-sm"
              >
                {field.label}
              </div>
            ))}
          </div>
        </div>

        {/* Chart Config & Display */}
        <div className="w-full lg:w-3/4 flex flex-col gap-4">
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div 
              onDrop={handleDropXAxis}
              onDragOver={handleDragOver}
              className={`flex-1 p-4 border-2 border-dashed rounded-xl flex items-center justify-center ${xAxisField ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-gray-50'}`}
            >
              {xAxisField ? (
                <span className="font-semibold text-indigo-700">Group By: {xAxisField.label}</span>
              ) : (
                <span className="text-gray-400">Drop Field Here for X-Axis (Group By)</span>
              )}
            </div>

            <div className="flex-1">
               <select 
                  value={chartType} 
                  onChange={(e) => setChartType(e.target.value)}
                  className="w-full p-4 border rounded-xl outline-none"
               >
                 <option value="Bar">Bar Chart</option>
                 <option value="Pie">Pie Chart</option>
                 <option value="Line">Line Chart</option>
                 <option value="Area">Area Chart</option>
                 <option value="Funnel">Funnel Chart</option>
               </select>
            </div>
          </div>

          {/* Render Dynamic Chart */}
          <div className="h-80 w-full mt-4 bg-white rounded-xl">
            {!xAxisField ? (
              <div className="h-full flex items-center justify-center text-gray-400 border rounded-xl">
                Select an X-Axis field to render chart
              </div>
            ) : dynamicChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 border rounded-xl">
                No data available
              </div>
            ) : (
              <div className="overflow-x-auto w-full h-full pb-4">
                <div className="h-full min-w-[600px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "Bar" ? (
                      <BarChart data={dynamicChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomReasonsTooltip />} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : chartType === "Pie" ? (
                      <PieChart>
                        <Pie data={dynamicChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {dynamicChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomReasonsTooltip />} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ maxHeight: '100px', overflowY: 'auto', paddingTop: "10px", display: "flex", flexWrap: "wrap", justifyContent: "center" }} />
                      </PieChart>
                    ) : chartType === "Line" ? (
                      <LineChart data={dynamicChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomReasonsTooltip />} />
                        <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{r:5, fill:"#6366f1"}} activeDot={{r: 8}} />
                      </LineChart>
                    ) : chartType === "Area" ? (
                      <AreaChart data={dynamicChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomReasonsTooltip />} />
                        <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#c4b5fd" />
                      </AreaChart>
                    ) : chartType === "Funnel" ? (
                      <CustomFunnel data={dynamicChartData} />
                    ) : null}
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicChartBuilder;
