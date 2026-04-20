import React from "react";
import { OTAStatus as StatusType } from "../hooks/useOTA";

interface OTAStatusProps {
  status: StatusType;
  currentVersion: string;
  targetVersion: string;
  errorMsg: string | null;
}

const OTAStatus: React.FC<OTAStatusProps> = ({ status, currentVersion, targetVersion, errorMsg }) => {
  const getStatusColor = () => {
    switch (status) {
      case "idle": return "bg-gray-100 text-gray-600";
      case "uploading": return "bg-blue-100 text-blue-700";
      case "updating": return "bg-yellow-100 text-yellow-700 animate-pulse";
      case "success": return "bg-green-100 text-green-700";
      case "error": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-4 p-4 border rounded-xl bg-gray-50">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-700">OTA Status</span>
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${getStatusColor()}`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="text-sm">
          <span className="block text-gray-500 text-xs">Current Version</span>
          <span className="font-medium text-gray-800">{currentVersion || "Unknown"}</span>
        </div>
        <div className="text-sm">
          <span className="block text-gray-500 text-xs">Target Version</span>
          <span className="font-medium text-gray-800">{targetVersion || "Not Set"}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
          <strong>Error: </strong> {errorMsg}
        </div>
      )}
    </div>
  );
};

export default OTAStatus;
