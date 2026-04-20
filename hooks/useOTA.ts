import { useState, useCallback } from "react";
import { apiService } from "../services/api";

export type OTAStatus = "idle" | "uploading" | "updating" | "success" | "error";

export const useOTA = () => {
  const [otaStatus, setOtaStatus] = useState<OTAStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [targetVersion, setTargetVersion] = useState<string>("");

  const uploadFirmware = useCallback(async (
    deviceId: string,
    deviceGroup: string,
    file: File
  ) => {
    try {
      setOtaStatus("uploading");
      setErrorMsg(null);
      setProgress(10);
      
      // Artificial progress for visual feedback
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 15, 90));
      }, 500);

      await apiService.uploadFirmware(deviceId, deviceGroup, file);
      
      clearInterval(interval);
      setProgress(100);
      // We don't mark 'success' here yet because the update phase is separate,
      // but returning true indicates upload success.
      setOtaStatus("idle");
      return true;
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "Failed to upload firmware");
      setOtaStatus("error");
      return false;
    }
  }, []);

  const triggerOTA = useCallback(async (
    deviceId: string,
    version: string
  ) => {
    try {
      setOtaStatus("updating");
      setErrorMsg(null);
      setProgress(0);
      setTargetVersion(version);

      // 1. Set running version via User API
      await apiService.setRunningVersion(deviceId, version);
      setProgress(20);

      // 2. Simulate Device Side checking for the running version
      const currentDeviceInfo = await apiService.getRunningVersion(deviceId);
      const activeVer = currentDeviceInfo?.running_version || "unknown";
      setCurrentVersion(activeVer);
      setProgress(40);

      if (activeVer !== version) {
         // 3. Fetch firmware
         await apiService.getFirmwareFile(deviceId, version);
         setProgress(80);

         // 4. Update running version after OTA
         await apiService.updateRunningVersionAfterOTA(deviceId);
      }
      
      setProgress(100);
      setOtaStatus("success");
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "OTA Update Sequence Failed");
      setOtaStatus("error");
    }
  }, []);

  const resetOTA = useCallback(() => {
    setOtaStatus("idle");
    setProgress(0);
    setErrorMsg(null);
    setCurrentVersion("");
    setTargetVersion("");
  }, []);

  return {
    uploadFirmware,
    triggerOTA,
    resetOTA,
    otaStatus,
    progress,
    errorMsg,
    currentVersion,
    targetVersion,
  };
};
