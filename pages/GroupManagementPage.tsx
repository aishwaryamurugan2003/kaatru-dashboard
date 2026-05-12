import React, { useEffect, useState } from "react";
import {
  Table, Button, Modal, Form, Input, Select, Drawer,
  Badge, Space, Tooltip, message, Switch, Tag, Checkbox,
} from "antd";
import {
  EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined,
  UserDeleteOutlined,
} from "@ant-design/icons";
import { apiService, Endpoint } from "../services/api";
import Loading from "../components/Loading";

const { Option } = Select;

const GroupManagementPage: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<any>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [unassignedDevices, setUnassignedDevices] = useState<any[]>([]);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsRes, serversRes] = await Promise.all([
        apiService.get(Endpoint.GROUP_ALL),
        apiService.get(Endpoint.INFRA_SERVER_ALL),
      ]);
      setGroups(Array.isArray(groupsRes?.data) ? groupsRes.data : []);
      setServers(Array.isArray(serversRes?.data) ? serversRes.data : []);
    } catch (error) {
      message.error("Failed to fetch groups or servers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddGroup = () => {
    setEditingGroup(null);
    form.resetFields();
    form.setFieldsValue({ status: true });
    setIsModalVisible(true);
  };

  const handleEditGroup = (record: any) => {
    setEditingGroup(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDeleteGroup = (id: string) => {
    Modal.confirm({
      title: "Confirm Delete",
      content: "Are you sure you want to delete this group?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await apiService.delete(Endpoint.GROUP, { id });
          message.success("Group deleted");
          fetchData();
        } catch (error) {
          message.error("Failed to delete group");
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingGroup) {
        await apiService.put(Endpoint.GROUP, { ...values, id: editingGroup.id });
        message.success("Group updated");
      } else {
        await apiService.post(Endpoint.GROUP, values);
        message.success("Group created");
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error("Operation failed");
    }
  };

  const viewGroupDetails = async (id: string) => {
    try {
      const res = await apiService.get(Endpoint.GROUP, { id });
      // backend returns { group: [...], devices: [...] }
      const data = res?.data;
      const groupInfo = Array.isArray(data?.group) ? data.group[0] : data?.group;
      setCurrentGroup({ ...groupInfo, devices: data?.devices || [] });
      setIsDrawerVisible(true);
    } catch (error) {
      message.error("Failed to load group details");
    }
  };

  const showAssignDevices = async () => {
    // There's no "all devices" endpoint — use a device ID input instead
    setSelectedDevices([]);
    setIsAssignModalVisible(true);
  };

  const handleAssignDevices = async () => {
    if (!selectedDevices.length) {
      message.warning("Enter at least one device ID");
      return;
    }
    try {
      await apiService.post(Endpoint.GROUP_DEVICE, {
        id: currentGroup.id,
        devices: selectedDevices,
      });
      message.success("Devices assigned");
      setIsAssignModalVisible(false);
      viewGroupDetails(currentGroup.id);
    } catch (error) {
      message.error("Failed to assign devices");
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await apiService.delete(Endpoint.GROUP_DEVICE, {
        group_id: currentGroup.id,
        devices: [deviceId],
      });
      message.success("Device removed from group");
      viewGroupDetails(currentGroup.id);
    } catch (error) {
      message.error("Failed to remove device");
    }
  };

  const columns = [
    { title: "Group ID", dataIndex: "id", key: "id" },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className="font-semibold">{text}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: boolean) => (
        <Badge status={status ? "success" : "error"} text={status ? "Active" : "Inactive"} />
      ),
    },
    { title: "Server", dataIndex: "server", key: "server" },
    {
      title: "MQTT Topic",
      dataIndex: "mqtt_topic",
      key: "mqtt_topic",
      render: (t: string) => <Tag color="blue">{t}</Tag>,
    },
    { title: "Primary DB", dataIndex: "primarydb", key: "primarydb" },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Tooltip title="View Details">
            <Button type="text" icon={<EyeOutlined />} onClick={() => viewGroupDetails(record.id)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined className="text-blue-600" />}
              onClick={() => handleEditGroup(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              icon={<DeleteOutlined className="text-red-600" />}
              onClick={() => handleDeleteGroup(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading) return <Loading fullScreen text="Loading groups..." />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Group Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddGroup}>
          Add Group
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <Table dataSource={groups} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
      </div>

      {/* Create / Edit Group Modal */}
      <Modal
        title={editingGroup ? "Edit Group" : "Add Group"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="id" label="Group ID" rules={[{ required: true }]}>
            <Input disabled={!!editingGroup} placeholder="e.g. G001" />
          </Form.Item>
          <Form.Item name="name" label="Group Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Chennai Office" />
          </Form.Item>
          <Form.Item name="status" label="Status" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          <Form.Item name="server" label="Host Server" rules={[{ required: true }]}>
            <Select placeholder="Select server">
              {servers.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.id} ({s.server})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="mqtt_topic" label="MQTT Topic" rules={[{ required: true }]}>
            <Input placeholder="e.g. PROD/CHN/+/SEN" />
          </Form.Item>
          <Form.Item name="primarydb" label="Primary Database" rules={[{ required: true }]}>
            <Input placeholder="e.g. ADMIN" />
          </Form.Item>
          <Form.Item name="secondarydb" label="Secondary Database">
            <Input placeholder="Optional secondary DB" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {editingGroup ? "Update" : "Create"}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Group Details Drawer */}
      <Drawer
        title="Group Details"
        size="large"
        onClose={() => setIsDrawerVisible(false)}
        open={isDrawerVisible}
      >
        {currentGroup && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xl font-bold text-blue-900">{currentGroup.name}</h2>
                <p className="text-blue-700 font-mono text-sm">{currentGroup.id}</p>
                <div className="mt-2 text-xs text-blue-600 grid grid-cols-2 gap-2">
                  <div><strong>Server:</strong> {currentGroup.server}</div>
                  <div><strong>Topic:</strong> {currentGroup.mqtt_topic}</div>
                  <div><strong>Primary DB:</strong> {currentGroup.primarydb}</div>
                  <div><strong>Status:</strong> {currentGroup.status ? "Active" : "Inactive"}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">
                  Assigned Devices ({currentGroup.devices?.length || 0})
                </h3>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<PlusOutlined />}
                  onClick={showAssignDevices}
                >
                  Add Devices
                </Button>
              </div>

              <div className="space-y-2">
                {currentGroup.devices && currentGroup.devices.length > 0 ? (
                  currentGroup.devices.map((d: string) => (
                    <div
                      key={d}
                      className="flex justify-between items-center p-3 bg-white border rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge status="processing" />
                        <span className="font-medium text-gray-700">{d}</span>
                      </div>
                      <Button
                        size="small"
                        danger
                        type="text"
                        icon={<UserDeleteOutlined />}
                        onClick={() => handleRemoveDevice(d)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-gray-50 border border-dashed rounded-lg text-gray-400">
                    No devices assigned to this group yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Assign Devices Modal — input device IDs manually */}
      <Modal
        title="Assign Devices to Group"
        open={isAssignModalVisible}
        onCancel={() => setIsAssignModalVisible(false)}
        onOk={handleAssignDevices}
        okText="Assign"
      >
        <p className="text-sm text-gray-500 mb-3">
          Enter device IDs separated by commas (e.g. SN001, SN002)
        </p>
        <Input.TextArea
          rows={4}
          placeholder="SN001, SN002, SN003"
          onChange={(e) =>
            setSelectedDevices(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
        {selectedDevices.length > 0 && (
          <p className="text-xs text-blue-600 mt-2">
            {selectedDevices.length} device(s) will be assigned
          </p>
        )}
      </Modal>
    </div>
  );
};

export default GroupManagementPage;
