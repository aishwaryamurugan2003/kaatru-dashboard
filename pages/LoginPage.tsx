import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRive } from "rive-react";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { RiveComponent } = useRive({
    src: "/animations/login.riv",
    stateMachines: "State Machine 1",
    autoplay: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const url = `https://caas.kaatru.org/auth/login?username=${encodeURIComponent(
        email
      )}&password=${encodeURIComponent(password)}`;

      const response = await fetch(url, {
        method: "POST",
      });

      const data = await response.json();
      console.log("LOGIN RESPONSE:", data);

      if (response.ok && data.access_token) {
        // ✅ STORE TOKENS
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("saved_username", email);

        if (data.refresh_token) {
          localStorage.setItem("refresh_token", data.refresh_token);
        }

        navigate("/dashboard");
      } else {
        setError(
          data?.detail?.error_description ||
          data?.detail ||
          data?.message ||
          "Invalid credentials"
        );
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex bg-gray-100 font-inter">

      {/* LEFT SIDE RIVE */}
      <div className="hidden lg:flex w-1/2 bg-[#2563eb] items-center justify-center p-8">
        <div className="w-3/4 h-3/4 rounded-xl overflow-hidden shadow-lg bg-white">
          <RiveComponent />
        </div>
      </div>

      {/* RIGHT SIDE LOGIN */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-8">
        <div className="w-full max-w-md">

          <h1 className="text-3xl font-bold text-gray-800 mb-2">Log In</h1>
          <p className="text-gray-500 mb-8">
            Enter your credentials to access the dashboard.
          </p>

          {error && (
            <div className="mb-4 text-red-600 text-sm bg-red-100 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block mb-1 text-gray-700 font-medium">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="Enter username/email"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-700 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563eb] hover:bg-blue-600 text-white py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-60"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

          </form>

          <div className="mt-6 text-sm text-gray-600 flex justify-between">
            <a href="#" className="hover:text-blue-600">Forgot Password?</a>
            <a href="#" className="hover:text-blue-600">Sign Up</a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;