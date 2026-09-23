import React, { useState } from "react";
import { Boxes, Package } from "lucide-react";
import CategoriesTab from "./CategoriesTab";
import AssetsTab from "./AssetsTab";

const AssetsManagement = () => {
  const [activeTab, setActiveTab] = useState("assets");
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-slate-900">Assets Management</h2>
          <p className="text-base text-slate-600">Track equipment, property, licenses and anything else your business owns.</p>
        </div>

        <div className="flex bg-slate-150 p-1 rounded-xl border border-slate-200 self-start md:self-auto" style={{ backgroundColor: "#f1f5f9" }}>
          <button
            onClick={() => setActiveTab("assets")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "assets"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Package size={16} />
            <span>Assets</span>
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "categories"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Boxes size={16} />
            <span>Categories</span>
          </button>
        </div>
      </div>

      {activeTab === "categories" ? (
        <CategoriesTab
          categories={categories}
          setCategories={setCategories}
          categoriesLoaded={categoriesLoaded}
          setCategoriesLoaded={setCategoriesLoaded}
        />
      ) : (
        <AssetsTab
          categories={categories}
          setCategories={setCategories}
          categoriesLoaded={categoriesLoaded}
          setCategoriesLoaded={setCategoriesLoaded}
        />
      )}
    </div>
  );
};

export default AssetsManagement;
