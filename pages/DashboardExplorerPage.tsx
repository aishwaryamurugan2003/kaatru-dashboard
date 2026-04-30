import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService, Endpoint } from "../services/api";
import {
  FolderOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import Loading from "../components/Loading";

const DashboardExplorerPage: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [view, setView] = useState<"grid" | "list">("grid");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await apiService.get(Endpoint.GROUP_ALL);
        const raw = res?.data;

        let data: any[] = [];

        if (Array.isArray(raw)) {
          data = raw;
        } else if (Array.isArray(raw?.group)) {
          data = raw.group;
        } else if (Array.isArray(raw?.data)) {
          data = raw.data;
        } else {
          console.warn("Unexpected API response:", raw);
          data = [];
        }

        const filtered = data.filter(
          (g: any) => Number(g.status) === 1 && g.id && g.id !== "NULL"
        );
        setGroups(filtered);
        setFilteredGroups(filtered);
      } catch (err) {
        console.error("Failed to load groups", err);
        setError("Failed to load groups");
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Search + Sort
  useEffect(() => {
    let temp = [...groups];

    if (search) {
      temp = temp.filter((g) =>
        (g.name || g.group_name || "")
          .toString()
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    if (sort === "name") {
      temp.sort((a, b) =>
        (a.name || a.group_name || "").localeCompare(
          b.name || b.group_name || ""
        )
      );
    }

    setFilteredGroups(temp);
  }, [search, sort, groups]);

  const handleGroupClick = (group: any) => {
    navigate(`/dashboard/${group.id}`, {
      state: { groupName: group.name },
    });
  };

  if (loading) {
    return <Loading fullScreen text="Loading groups..." />;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 font-semibold text-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="px-4 pb-5 space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Dashboards
        </h1>
      </div>

      {/* ✅ THEME-AWARE TOP BAR */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-3">

        {/* SEARCH */}
        <div className="relative">
          <SearchOutlined className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for dashboards and folders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-900 
                       text-sm text-gray-800 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* CONTROLS */}
        <div className="flex items-center justify-between flex-wrap gap-3">

          {/* LEFT */}
          {/* <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 
                               text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
              Filter by tag
            </button>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-blue-500" />
              Starred
            </label>
          </div> */}

          {/* RIGHT */}
          <div className="flex items-center gap-2">

            {/* ✅ VIEW TOGGLE WORKING */}
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-md border ${view === "grid"
                ? "bg-blue-500 text-white"
                : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
            >
              <AppstoreOutlined />
            </button>

            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-md border ${view === "list"
                ? "bg-blue-500 text-white"
                : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
            >
              <UnorderedListOutlined />
            </button>

            {/* SORT */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-900 text-sm"
            >
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">

        {filteredGroups.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No groups found
          </div>
        ) : view === "grid" ? (
          // ✅ GRID VIEW
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className="group cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 
                           bg-gray-50 dark:bg-gray-900 
                           p-4 transition-all hover:shadow-md hover:-translate-y-1"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 mb-3">
                  <FolderOutlined className="text-blue-600 text-xl" />
                </div>

                <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {group.name || group.group_name}
                </div>

                <div className="text-xs text-gray-500 mt-1 truncate">
                  {group.id}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ✅ LIST VIEW
          <div className="space-y-2">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 
                           hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <FolderOutlined className="text-blue-500 text-lg" />
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {group.name || group.group_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardExplorerPage;