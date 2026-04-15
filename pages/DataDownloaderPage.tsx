import React, { useState } from "react";
import { apiService } from "../services/api";

const DataDownloader: React.FC = () => {
  const [form, setForm] = useState({
    startTime: "",
    endTime: "",
    device: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  try {
    const res = await apiService.downloadData(form);

    console.log("API SUCCESS:", res); // 🔍 debug

    if (res && res.message) {
      setMessage(`✅ ${res.message} (Job ID: ${res.job_id})`);
    } else {
      setMessage("⚠️ Unexpected response from server");
    }

  } catch (error: any) {
    console.error("REAL ERROR:", error);

    const errMsg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to submit request";

    setMessage(`❌ ${errMsg}`);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
        
        {/* Title */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
          Data Downloader
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Start Time */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              Start Time (IST)
            </label>
            <input
              type="datetime-local"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              End Time (IST)
            </label>
            <input
              type="datetime-local"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          {/* Device */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              Device
            </label>
            <input
              type="text"
              name="device"
              value={form.device}
              onChange={handleChange}
              placeholder="Enter device (e.g. SG77)"
              className="w-full p-3 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email"
              className="w-full p-3 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition duration-200"
          >
            {loading ? "Submitting..." : "Download Data"}
          </button>

          {/* Message */}
          {message && (
            <p className="text-center text-sm mt-2 text-gray-600 dark:text-gray-300">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default DataDownloader;