import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiService, Endpoint } from "../services/api";
import {
  DashboardOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  CloseOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import Loading from "../components/Loading";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CustomFolder {
  id: string;
  name: string;
  groupId: string;
  createdBy: string;
  createdAt: number;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = "custom_dashboard_folders";

function getCurrentUser(): string {
  // Reads the username saved by LoginPage on successful login
  return localStorage.getItem("saved_username") || "anonymous";
}

function loadAllFolders(): CustomFolder[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveAllFolders(folders: CustomFolder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

// ─── Static dashboard types ───────────────────────────────────────────────────
const DASHBOARD_TYPES = [
  "Multi Device Dashboard Stationary Device",
  "Multi Device Dashboard Mobile Device",
  "Other Plots",
  "Real Time Dashboard",
  "Single Device Dashboard",
  "Single Device Dashboard V2",
];

function isMobileDevice(id: string): boolean {
  const upper = id.toUpperCase();
  return upper.startsWith("MOB") || upper.startsWith("MG");
}

function isStationaryDevice(id: string): boolean {
  return !isMobileDevice(id);
}

// ─────────────────────────────────────────────────────────────────────────────
const GroupDashboardPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = getCurrentUser();

  const [groupName, setGroupName] = useState<string>(
    location.state?.groupName || groupId || "Group"
  );
  const [loading, setLoading] = useState(!location.state?.groupName);
  const [devices, setDevices] = useState<string[]>([]);

  // ── Custom folders — scoped to this user + group ──────────────────────────
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>(() =>
    loadAllFolders().filter(
      (f) => f.groupId === groupId && f.createdBy === currentUser
    )
  );

  // ── Modal state ───────────────────────────────────────────────────────────
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const newMenuRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  /* ------------------------------------------------------------------
     FETCH GROUP NAME
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (!location.state?.groupName) {
      const fetch = async () => {
        try {
          const res = await apiService.get(Endpoint.GROUP_ALL);
          const data = Array.isArray(res.data) ? res.data : res.data?.group || [];
          const group = data.find((g: any) => g.id === groupId);
          if (group) setGroupName(group.name);
        } catch (err) {
          console.error("Failed to load group info", err);
        } finally {
          setLoading(false);
        }
      };
      fetch();
    }
  }, [groupId, location.state]);

  /* ------------------------------------------------------------------
     FETCH DEVICES
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (!groupId) return;
    const fetch = async () => {
      try {
        const res = await apiService.get(Endpoint.GROUP_DEVICES, { id: groupId });
        setDevices(res.data?.devices || []);
      } catch (err) {
        console.error("❌ Failed to fetch devices", err);
      }
    };
    fetch();
  }, [groupId]);

  const mobileDevices = devices.filter(isMobileDevice);
  const stationaryDevices = devices.filter(isStationaryDevice);

  /* ------------------------------------------------------------------
     CLOSE DROPDOWN ON OUTSIDE CLICK
  ------------------------------------------------------------------ */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node))
        setNewMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (folderModalOpen) setTimeout(() => folderInputRef.current?.focus(), 50);
  }, [folderModalOpen]);

  /* ------------------------------------------------------------------
     NAVIGATE — static dashboard
  ------------------------------------------------------------------ */
  const handleDashboardClick = (dashboardName: string) => {
    const urlFormat = dashboardName.toLowerCase().replace(/\s+/g, "-");
    let selectedDevices: string[] = [];
    if (dashboardName.includes("Stationary")) selectedDevices = stationaryDevices;
    else if (dashboardName.includes("Mobile")) selectedDevices = mobileDevices;

    navigate(`/dashboard/${groupId}/${urlFormat}`, {
      state: { devices: selectedDevices, groupName },
    });
  };

  /* ------------------------------------------------------------------
     NAVIGATE — custom folder  →  reuses MultiDeviceDashboardPage
     Pass isCustomFolder + folderId in state so the chart page knows.
  ------------------------------------------------------------------ */
  const handleCustomFolderClick = (folder: CustomFolder) => {
    navigate(`/dashboard/${groupId}/custom-folder-${folder.id}`, {
      state: {
        devices,            // all group devices — user picks inside
        groupName,
        isCustomFolder: true,
        folderId: folder.id,
        folderName: folder.name,
      },
    });
  };

  /* ------------------------------------------------------------------
     CREATE FOLDER
  ------------------------------------------------------------------ */
  const openFolderModal = () => {
    setNewMenuOpen(false);
    setFolderName("");
    setFolderError(null);
    setFolderModalOpen(true);
  };

  const closeFolderModal = () => {
    if (creating) return;
    setFolderModalOpen(false);
    setFolderName("");
    setFolderError(null);
  };

  const handleCreateFolder = async () => {
    const trimmed = folderName.trim();
    if (!trimmed) { setFolderError("Folder name cannot be empty."); return; }
    if (customFolders.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      setFolderError("A folder with this name already exists.");
      return;
    }

    try {
      setCreating(true);
      setFolderError(null);

      const newFolder: CustomFolder = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed,
        groupId: groupId!,
        createdBy: currentUser,
        createdAt: Date.now(),
      };

      // ── Save to localStorage (swap for API call when ready) ─────────────
      // API example: await apiService.post(Endpoint.CUSTOM_FOLDER_CREATE, { name: trimmed, groupId, userId: currentUser });
      const all = loadAllFolders();
      saveAllFolders([...all, newFolder]);

      setCustomFolders((prev) => [...prev, newFolder]);
      setFolderModalOpen(false);
      setFolderName("");
    } catch (err) {
      console.error("Failed to create folder", err);
      setFolderError("Failed to create folder. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  /* ------------------------------------------------------------------
     DELETE FOLDER
  ------------------------------------------------------------------ */
  const handleDeleteFolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    const all = loadAllFolders().filter((f) => f.id !== folderId);
    saveAllFolders(all);
    setCustomFolders((prev) => prev.filter((f) => f.id !== folderId));
  };

  const handleFolderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleCreateFolder();
    if (e.key === "Escape") closeFolderModal();
  };

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------ */
  if (loading) return <Loading fullScreen text="Loading group details..." />;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
          >
            <ArrowLeftOutlined />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {groupName} Dashboard
          </h1>
        </div>

        {/* New button */}
        <div className="relative" ref={newMenuRef}>
          <button
            onClick={() => setNewMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md
                       bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                       text-white text-sm font-medium transition-colors duration-150 shadow-sm"
          >
            <PlusOutlined className="text-xs" />
            New
          </button>

          {newMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50
                           w-44 rounded-lg border border-gray-200 dark:border-gray-700
                           bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
              <button
                onClick={openFolderModal}
                className="flex items-center gap-2.5 w-full px-4 py-2.5
                           text-sm text-gray-700 dark:text-gray-200
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FolderAddOutlined className="text-blue-500 text-base" />
                New Folder
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MY FOLDERS (user-specific) ───────────────────────────────────────── */}
      {customFolders.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">
            My Folders
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleCustomFolderClick(folder)}
                className="relative flex items-center gap-4 p-4 rounded-xl
                           border border-blue-100 dark:border-blue-900
                           bg-blue-50 dark:bg-blue-950/30
                           hover:border-blue-400 dark:hover:border-blue-500
                           hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg
                               text-blue-600 dark:text-blue-400
                               group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                  <FolderOpenOutlined className="text-xl" />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800 dark:text-gray-100
                                   group-hover:text-blue-600 dark:group-hover:text-blue-400
                                   transition-colors truncate block">
                    {folder.name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Custom Dashboard
                  </span>
                </div>

                {/* Delete — visible on hover */}
                <button
                  onClick={(e) => handleDeleteFolder(e, folder.id)}
                  title="Delete folder"
                  className="absolute top-2 right-2 p-1.5 rounded-md
                             text-gray-300 hover:text-red-500
                             hover:bg-red-50 dark:hover:bg-red-900/30
                             opacity-0 group-hover:opacity-100 transition-all"
                >
                  <DeleteOutlined className="text-xs" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STATIC DASHBOARD TYPES ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        {customFolders.length > 0 && (
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-1">
            Dashboard Types
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DASHBOARD_TYPES.map((dashName, idx) => (
            <div
              key={idx}
              onClick={() => handleDashboardClick(dashName)}
              className="flex items-center gap-4 p-4 rounded-xl
                         border border-gray-100 dark:border-gray-700
                         hover:border-blue-300 dark:hover:border-blue-600
                         hover:shadow-md cursor-pointer transition-all
                         bg-gray-50 dark:bg-gray-750 group"
            >
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg
                             text-blue-600 dark:text-blue-400
                             group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <DashboardOutlined className="text-xl" />
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-200
                               group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {dashName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── NEW FOLDER MODAL ─────────────────────────────────────────────────── */}
      {folderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeFolderModal(); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800
                         border border-gray-200 dark:border-gray-700
                         shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderAddOutlined className="text-blue-500 text-xl" />
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  New Folder
                </h2>
              </div>
              <button onClick={closeFolderModal} disabled={creating}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <CloseOutlined />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Folder Name
              </label>
              <input
                ref={folderInputRef}
                type="text"
                placeholder="e.g. My Custom Charts"
                value={folderName}
                onChange={(e) => { setFolderName(e.target.value); if (folderError) setFolderError(null); }}
                onKeyDown={handleFolderKeyDown}
                disabled={creating}
                className="w-full px-3 py-2.5 rounded-lg border
                           border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-900
                           text-sm text-gray-800 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           disabled:opacity-50"
              />
              {folderError && <p className="text-xs text-red-500 mt-1">{folderError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={closeFolderModal} disabled={creating}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                           text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                           disabled:opacity-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateFolder} disabled={creating || !folderName.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700
                           text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDashboardPage;
