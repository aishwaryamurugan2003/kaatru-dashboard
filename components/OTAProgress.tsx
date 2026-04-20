import React from "react";

interface OTAProgressProps {
  progress: number;
}

const OTAProgress: React.FC<OTAProgressProps> = ({ progress }) => {
  if (progress === 0) return null;

  return (
    <div className="w-full mt-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-gray-600">Progress</span>
        <span className="font-medium text-gray-600">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default OTAProgress;
