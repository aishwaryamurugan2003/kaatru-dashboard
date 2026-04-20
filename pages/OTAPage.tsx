import React, { useState } from "react";
import { useOTA } from "../hooks/useOTA";
import OTAUpload from "../components/OTAUpload";
import OTAStatus from "../components/OTAStatus";
import OTAProgress from "../components/OTAProgress";

const OTAPage: React.FC = () => {
  const { uploadFirmware, triggerOTA, otaStatus, progress, errorMsg, currentVersion, targetVersion } = useOTA();
  
  const [otaDeviceClass, setOtaDeviceClass] = useState<string>("");
  const [otaDeviceGroup, setOtaDeviceGroup] = useState<string>("default");
  const [otaVersion, setOtaVersion] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!otaDeviceClass || !selectedFile) {
      alert("Please provide Device ID and File");
      return;
    }
    await uploadFirmware(otaDeviceClass, otaDeviceGroup, selectedFile);
  };

  const handleTrigger = async () => {
    if (!otaDeviceClass || !otaVersion) {
      alert("Please provide Device ID and Version");
      return;
    }
    await triggerOTA(otaDeviceClass, otaVersion);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-800 mb-6">
        OTA Firmware Update
      </h1>

      <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold tracking-tight text-gray-800 mb-4 border-b pb-2">
          Target Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Device ID / Target</label>
              <input
                type="text"
                placeholder="e.g. dev-alpha-101"
                className="w-full border px-3 py-2 rounded-lg"
                value={otaDeviceClass}
                onChange={(e) => setOtaDeviceClass(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Device Group (Optional)</label>
              <input
                type="text"
                placeholder="e.g. group_a"
                className="w-full border px-3 py-2 rounded-lg"
                value={otaDeviceGroup}
                onChange={(e) => setOtaDeviceGroup(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Version</label>
              <input
                type="text"
                placeholder="e.g. 1.2.0"
                className="w-full border px-3 py-2 rounded-lg"
                value={otaVersion}
                onChange={(e) => setOtaVersion(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Firmware Binary</label>
              <OTAUpload
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                disabled={otaStatus === "uploading" || otaStatus === "updating"}
              />
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !otaDeviceClass || otaStatus === "uploading" || otaStatus === "updating"}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                Upload Firmware
              </button>
              
              <button
                onClick={handleTrigger}
                disabled={!otaVersion || !otaDeviceClass || otaStatus === "uploading" || otaStatus === "updating"}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                Trigger OTA Update
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 border rounded-xl">
             <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-2">Monitoring</h3>
             <OTAStatus
               status={otaStatus}
               currentVersion={currentVersion}
               targetVersion={targetVersion}
               errorMsg={errorMsg}
             />
             <OTAProgress progress={progress} />

             <div className="mt-8 text-xs text-gray-400">
               <p className="mb-1"><strong>Flow Execution:</strong></p>
               <ol className="list-decimal pl-4 space-y-1">
                 <li>Upload binary against Device / Group</li>
                 <li>Trigger sets version on User side</li>
                 <li>Device fetches required version</li>
                 <li>Device finishes update and acknowledges target</li>
               </ol>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTAPage;
