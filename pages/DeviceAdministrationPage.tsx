import React, { useEffect, useState } from "react";
import { Table, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { apiService } from "../services/api";
import { Endpoint } from "../services/api";
import AddPermissionModal from "../components/AddPermissionModal";
import EditPermissionModal from "../components/EditPermissionModal";
import Loading from "../components/Loading";


const DeviceAdministrationPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiService.get(Endpoint.ACCESS_MANAGEMENT);
      const data = res?.data;

      if (Array.isArray(data)) {
        const normalized = data.map((u, index) => ({
          key: u.user_id || index,
          sno: index + 1,
          username: u.username || "",
          email: u.email || "",
          groups: Array.isArray(u.access)
            ? u.access.map((g) => g?.group_name || "").join(", ")
            : "",
          access: Array.isArray(u.access) ? u.access : [],
        }));

        setUsers(normalized);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.log("ACCESS MGMT ERROR:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchUsers();
  }, []);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, users]);
  const columns = [
    { title: "S.No", dataIndex: "sno", width: 80 },

    {
      title: "User",
      dataIndex: "username",
      render: (text: string, record: any) => {
        const initial = text ? text.charAt(0).toUpperCase() : "";

        // Simple hash to generated consistent avatar color
        let hash = 0;
        for (let i = 0; i < (text || "").length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
        const colors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-pink-100 text-pink-700", "bg-green-100 text-green-700", "bg-yellow-100 text-yellow-700", "bg-red-100 text-red-700"];
        const colorClass = colors[Math.abs(hash) % colors.length];

        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${colorClass}`}>
              {initial}
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-sm font-semibold text-gray-900 capitalize">
                {text}
              </span>
              <span className="text-xs text-gray-500">@{text.toLowerCase()}</span>
            </div>
          </div>
        );
      },
    },

    {
      title: "Groups",
      dataIndex: "groups",
      key: "groups",
      render: (_, record) => (
        <div className="font-sans text-sm">
          <GroupChips access={record.access} />
        </div>
      ),
    },

    {
      title: "Email Address",
      dataIndex: "email",
      render: (text: string) => (
        <span className="font-sans text-sm text-gray-700">
          {text}
        </span>
      ),
    },

    {
      title: "Actions",
      width: 120,
      render: (_, record) => (
        <div className="flex gap-4 text-xl cursor-pointer">
          <EditOutlined
            className="text-blue-600 hover:text-blue-800"
            onClick={() => setEditUser(record)}
          />
          <DeleteOutlined className="text-red-600 hover:text-red-800" />
        </div>
      ),
    },
  ];
  const GroupChips = ({ access }: { access: any[] }) => {
    const safeAccess = Array.isArray(access) ? access : [];

    if (safeAccess.length === 0) return <>—</>;

    const firstThree = safeAccess.slice(0, 3);
    const remaining = safeAccess.slice(3);

    const getBadgeStyle = (name: string) => {
      const colors = [
        "bg-purple-50 text-purple-700 border border-purple-200",
        "bg-blue-50 text-blue-700 border border-blue-200",
        "bg-indigo-50 text-indigo-700 border border-indigo-200",
        "bg-pink-50 text-pink-700 border border-pink-200",
        "bg-green-50 text-green-700 border border-green-200",
        "bg-orange-50 text-orange-700 border border-orange-200",
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    return (
      <div className="flex flex-wrap gap-2 items-center">
        {/* FIRST 3 */}
        {firstThree
          .filter((g) => g && g.group_name)
          .map((g) => (
            <span
              key={g.group_id || Math.random()} // 🔥 safe key
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBadgeStyle(g.group_name)}`}
            >
              {g.group_name}
            </span>
          ))}

        {/* REMAINING */}
        {remaining.filter((g) => g && g.group_name).length > 0 && (
          <Tooltip
            color="white"
            overlayInnerStyle={{
              padding: "8px",
              borderRadius: "8px",
              boxShadow:
                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            }}
            title={
              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                {remaining
                  .filter((g) => g && g.group_name)
                  .map((g) => (
                    <span
                      key={g.group_id || Math.random()}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBadgeStyle(g.group_name)}`}
                    >
                      {g.group_name}
                    </span>
                  ))}
              </div>
            }
          >
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-200 text-gray-700 cursor-pointer">
              +{remaining.filter((g) => g && g.group_name).length}
            </span>
          </Tooltip>
        )}
      </div>
    );
  };
  if (loading) {
    return <Loading fullScreen text="Loading device management..." />;
  }

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-800 mb-6">
        Device Management
      </h1>

      <div className="flex justify-between mb-6">
        <input
          placeholder="Search..."
          className="border px-4 py-2 rounded-lg w-1/3"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
        >
          Add Permission
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <Table
          columns={columns}
          dataSource={users.filter((u) =>
            [
              u.username || "",
              u.email || "",
              u.groups || "",
            ]
              .join(" ")
              .toLowerCase()
              .includes(searchText.toLowerCase())
          )}
          pagination={{
            pageSize: 10,
            current: currentPage,
            onChange: (page) => setCurrentPage(page),
          }}
          className="font-sans text-sm"
          rowClassName={() => "font-sans text-sm"}
        />

      </div>

      {/* ADD */}
      <AddPermissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchUsers}
      />

      {/* EDIT */}
      <EditPermissionModal
        isOpen={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onUpdated={fetchUsers}
      />
    </div>
  );
};

export default DeviceAdministrationPage;
