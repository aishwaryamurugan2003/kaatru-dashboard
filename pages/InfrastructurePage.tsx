import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Space, message, Tabs, Tag } from "antd";
import { EditOutlined, PlusOutlined, GlobalOutlined, WifiOutlined } from "@ant-design/icons";
import { apiService, Endpoint } from "../services/api";
import Loading from "../components/Loading";

const InfrastructurePage: React.FC = () => {
  const [servers, setServers] = useState<any[]>([]);
  const [wifiProfiles, setWifiProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("servers");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchServers = async () => {
    try {
      const res = await apiService.get(Endpoint.INFRA_SERVER_ALL);
      setServers(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      message.error("Failed to fetch node servers");
    }
  };

  const fetchWifi = async () => {
    try {
      const res = await apiService.get(Endpoint.INFRA_WIFI_ALL);
      setWifiProfiles(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      message.error("Failed to fetch WiFi profiles");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchServers(), fetchWifi()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const endpoint =
        activeTab === "servers" ? Endpoint.INFRA_SERVER : Endpoint.INFRA_WIFI;
      if (editingItem && activeTab === "servers") {
        await apiService.put(endpoint, values);
        message.success("Server updated");
      } else {
        await apiService.post(endpoint, values);
        message.success(`${activeTab === "servers" ? "Server" : "WiFi Profile"} added`);
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error("Operation failed");
    }
  };

  const serverColumns = [
    {
      title: "Server ID",
      dataIndex: "id",
      key: "id",
      render: (t: string) => <span className="font-semibold">{t}</span>,
    },
    {
      title: "Server URL",
      dataIndex: "server",
      key: "server",
      render: (url: string) => (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline text-xs"
        >
          {url}
        </a>
      ),
    },
    {
      title: "Added At",
      dataIndex: "ts",
      key: "ts",
      render: (t: any) => (t ? new Date(t).toLocaleString() : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined className="text-blue-600" />}
            onClick={() => handleEdit(record)}
          />
        </Space>
      ),
    },
  ];

  const wifiColumns = [
    {
      title: "SSID",
      dataIndex: "ssid",
      key: "ssid",
      render: (t: string) => <span className="font-medium">{t}</span>,
    },
    {
      title: "Password",
      dataIndex: "password",
      key: "password",
      render: () => <span className="text-gray-400">••••••••</span>,
    },
    {
      title: "Security",
      key: "security",
      render: () => <Tag color="green">WPA2</Tag>,
    },
  ];

  const tabItems = [
    {
      key: "servers",
      label: (
        <span>
          <GlobalOutlined /> Node Servers
        </span>
      ),
      children: (
        <>
          <div className="flex justify-end mb-4">
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add Server
            </Button>
          </div>
          <Table
            dataSource={servers}
            columns={serverColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
    {
      key: "wifi",
      label: (
        <span>
          <WifiOutlined /> WiFi Profiles
        </span>
      ),
      children: (
        <>
          <div className="flex justify-end mb-4">
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add WiFi Profile
            </Button>
          </div>
          <Table
            dataSource={wifiProfiles}
            columns={wifiColumns}
            rowKey="ssid"
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
  ];

  if (loading) return <Loading fullScreen text="Loading infrastructure..." />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Infrastructure Management</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </div>

      <Modal
        title={
          editingItem
            ? `Edit ${activeTab === "servers" ? "Server" : "WiFi Profile"}`
            : `Add ${activeTab === "servers" ? "Server" : "WiFi Profile"}`
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {activeTab === "servers" ? (
            <>
              <Form.Item name="id" label="Server ID" rules={[{ required: true }]}>
                <Input placeholder="e.g. SRV-01" disabled={!!editingItem} />
              </Form.Item>
              <Form.Item
                name="server"
                label="Server URL"
                rules={[{ required: true }]}
              >
                <Input placeholder="e.g. node.kaatru.org" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="ssid" label="Network SSID" rules={[{ required: true }]}>
                <Input placeholder="e.g. Kaatru_Guest" />
              </Form.Item>
              <Form.Item
                name="password"
                label="Network Password"
                rules={[{ required: true }]}
              >
                <Input.Password placeholder="Enter password" />
              </Form.Item>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {editingItem ? "Update" : "Create"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InfrastructurePage;
