import React, { useRef } from "react";
import { NavLink } from "react-router-dom";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  isExpanded: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, to, isExpanded }) => (
  <li>
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center p-3 my-1 rounded-lg transition-colors duration-200 
        ${
          isActive
            ? "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-200"
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`
      }
    >
      {icon}
      <span
        className={`ml-4 font-medium transition-opacity duration-200 ${
          isExpanded ? "opacity-100" : "opacity-0"
        }`}
      >
        {label}
      </span>
    </NavLink>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  return (
    <aside
      ref={sidebarRef}
      className={`absolute left-0 top-0 z-30 flex h-screen flex-col bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 
      ${isOpen ? "translate-x-0" : "-translate-x-full"} 
      ${isOpen ? "w-64" : "lg:w-20"}`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 h-16">
        <div
          className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${
            isOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
          }`}
        >
          <div className="h-8 w-8 flex-shrink-0 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            BrandLogo
          </h1>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hidden lg:block focus:outline-none transition-colors"
        >
          {isOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          <NavItem
            to="/dashboard"
            isExpanded={isOpen}
            label="Home"
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            }
          />

          <NavItem
            to="/dashboard"
            isExpanded={isOpen}
            label="Data Analysis"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
            }
          />

          <NavItem
            to="/data-downloader"
            isExpanded={isOpen}
            label="Data Downloader"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            }
          />

          <NavItem
            to="/device-admin"
            isExpanded={isOpen}
            label="Device Administration"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
          />
          {/* <NavItem
  to="/data-visualization"
  isExpanded={isOpen}
  label="Data Visualization"
  icon={
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 3v18m4-12v12m4-6v6M3 9h4v12H3z"
      />
    </svg>
  }
/> */}
<NavItem
  to="/realtime-dashboard"
  isExpanded={isOpen}
  label="Realtime Dashboard"
  icon={
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 3v18h18M9 17v-6m4 6V7m4 10v-4"
      />
    </svg>
  }
/>
<NavItem
  to="/chart-customization"
  isExpanded={isOpen}
  label="Chart Customization"
  icon={
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 19V5m6 14V9m6 10V3"
      />
    </svg>
  }
/>


        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
