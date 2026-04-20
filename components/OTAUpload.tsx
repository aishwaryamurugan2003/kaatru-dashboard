import React, { useRef } from "react";
import { UploadOutlined } from "@ant-design/icons";

interface OTAUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  selectedFile: File | null;
}

const OTAUpload: React.FC<OTAUploadProps> = ({ onFileSelect, disabled, selectedFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        accept=".bin,.zip,.tar.gz" // Generally firmware formats
      />
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        className={`px-4 py-2 border rounded-lg font-medium text-sm flex items-center gap-2
          ${disabled ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-blue-100"}`}
      >
        <UploadOutlined />
        {selectedFile ? "Change File" : "Select Firmware"}
      </button>

      {selectedFile && (
        <span className="text-sm text-gray-600 truncate max-w-[200px]" title={selectedFile.name}>
          {selectedFile.name}
        </span>
      )}
    </div>
  );
};

export default OTAUpload;
