import React, { useEffect, useState } from "react";
import {
  Table, Button, Modal, Form, Input, Select,
  Drawer, Badge, Space, Tooltip, message,
} from "antd";
import {
  EditOutlined, DeleteOutlined, PlusOutlined,
} from "@ant-design/icons";
import { apiService, Endpoint } from "../services/api";
import Loading from "../components/Loading";

const { Option } = Select;

const DeviceManagementPage: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [sensorGroups, setSensorGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<any>(null);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [form] = Form.useForm();

  // There is no "all devices" endpoint — we show groups list as the main table
  // and let users look up individual devices by ID
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await apiService.get(Endpoint.GROUP_ALL);
      setGroups(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      message.error("Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchSensorGroups = async () => {
    try {
      const res = await apiService.get(Endpoint.SENSOR_GROUP_ALL);
      setSensorGroups(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to fetch sensor groups", error);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchSensorGroups();
  }, []);

  const handleRegister = () => {
    setEditingDevice(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingDevice(record);
    form.setFieldsValue({
      ...record,
      location_lat: record.lat,
      location_lon: record.long ?? record.longitude,
    });
    setIsModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        id: values.id,
        mac_address: values.mac_address,
        device_name: values.device_name,
        device_type: values.device_type,
        location: {
          lat: parseFloat(values.location_lat),
          long: parseFloat(values.location_lon),
        },
        wifi: values.wifi ? parseInt(values.wifi) : undefined,
        group: values.group || undefined,
        sensors: values.sensors?.reduce((acc: any, curr: any) => {
          if (curr.label && curr.sensor_id) acc[curr.label] = curr.sensor_id;
          return acc;
        }, {}),
      };

      if (editingDevice) {
        await apiService.put(Endpoint.DEVICE_REG, payload);
        message.success("Device updated successfully");
      } else {
        await apiService.post(Endpoint.DEVICE_REG, payload);
        message.success("Device registered successfully");
      }
      setIsModalVisible(false);
      fetchGroups();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      message.error(
        typeof detail === "string"
          ? detail
          : editingDevice
          ? "Failed to update device"
          : "Failed to register device"
      );
    }
  };

  const showDetail = async (deviceId: string) => {
    try {
      const res = await apiService.get(Endpoint.DEVICE_INFO, { id: deviceId });
      // backend returns { device: [...], sensors: [...] }
      const data = res?.data;
      const deviceArr = Array.isArray(data?.device) ? data.device : [];
      const meta = deviceArr[0] || {};
      const sensors = Array.isArray(data?.sensors) ? data.sensors : [];
      setCurrentDevice({ ...meta, sensors });
      setIsDetailVisible(true);
    } catch (error) {
      message.error("Failed to fetch device details");
    }
  };

  const getAvatarColor = (text: string) => {
    let hash = 0;
    for (let i = 0; i < (text || "").length; i++)
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700",
      "bg-green-100 text-green-700",
      "bg-yellow-100 text-yellow-700",
      "bg-red-100 text-red-700",
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  // Groups table — clicking a group's name shows its devices
  const groupColumns = [
    { title: "Group ID", dataIndex: "id", key: "id" },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (t: string) => <span className="font-semibold">{t}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: boolean) => (
        <Badge status={s ? "success" : "error"} text={s ? "Active" : "Inactive"} />
      ),
    },
    { title: "Server", dataIndex: "server", key: "server" },
    { title: "MQTT Topic", dataIndex: "mqtt_topic", key: "mqtt_topic" },
  ];

  if (loading) return <Loading fullScreen text="Loading..." />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Device Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleRegister}>
          Register Device
        </Button>
      </div>

      {/* ── Device lookup by ID ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <p className="text-sm font-medium text-gray-600 mb-2">Look up a device by ID</p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter device ID (e.g. SN001)"
            id="device-id-input"
            style={{ maxWidth: 300 }}
          />
          <Button
            type="primary"
            onClick={() => {
              const val = (
                document.getElementById("device-id-input") as HTMLInputElement
              )?.value?.trim();
              if (val) showDetail(val);
              else message.warning("Enter a device ID");
            }}
          >
            Fetch Device
          </Button>
        </div>
      </div>

      {/* ── Groups overview table ───────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            Groups Overview
          </p>
        </div>
        <Table
          dataSource={groups}
          columns={groupColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* ── Register / Edit Device Modal ────────────────────── */}
      <Modal
        title={editingDevice ? "Edit Device" : "Register Device"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="id" label="Device ID" rules={[{ required: true }]}>
              <Input disabled={!!editingDevice} placeholder="e.g. SN001" />
            </Form.Item>
            <Form.Item name="device_name" label="Device Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. North Gate Sensor" />
            </Form.Item>
            <Form.Item name="mac_address" label="MAC Address" rules={[{ required: true }]}>
              <Input placeholder="00:00:00:00:00:00" />
            </Form.Item>
            <Form.Item name="device_type" label="Device Type" rules={[{ required: true }]}>
              <Select placeholder="Select type">
                <Option value="stationary">Stationary</Option>
                <Option value="mobile">Mobile</Option>
                <Option value="left_mirror">Left Mirror</Option>
              </Select>
            </Form.Item>
            <Form.Item name="location_lat" label="Latitude" rules={[{ required: true }]}>
              <Input type="number" step="any" placeholder="e.g. 13.0827" />
            </Form.Item>
            <Form.Item name="location_lon" label="Longitude" rules={[{ required: true }]}>
              <Input type="number" step="any" placeholder="e.g. 80.2707" />
            </Form.Item>
            <Form.Item name="group" label="Group">
              <Select placeholder="Select group" allowClear>
                {groups.map((g) => (
                  <Option key={g.id} value={g.id}>
                    {g.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="wifi" label="WiFi ID">
              <Input type="number" placeholder="Optional WiFi ID (number)" />
            </Form.Item>
          </div>

          {/* Sensors */}
          <Form.List name="sensors">
            {(fields, { add, remove }) => (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sensors
                </label>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex gap-2 mb-2 items-baseline">
                    <Form.Item
                      {...restField}
                      name={[name, "label"]}
                      rules={[{ required: true, message: "Select sensor group" }]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Select placeholder="Sensor Group">
                        {sensorGroups.map((sg) => (
                          <Option key={sg.id} value={sg.label}>
                            {sg.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "sensor_id"]}
                      rules={[{ required: true, message: "Enter sensor ID" }]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input placeholder="Sensor ID / serial" />
                    </Form.Item>
                    <DeleteOutlined
                      onClick={() => remove(name)}
                      className="text-red-500 cursor-pointer"
                    />
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Sensor
                </Button>
              </div>
            )}
          </Form.List>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {editingDevice ? "Update" : "Register"}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Device Detail Drawer ────────────────────────────── */}
      <Drawer
        title="Device Details"
        placement="right"
        size="large"
        onClose={() => setIsDetailVisible(false)}
        open={isDetailVisible}
        extra={
          currentDevice && (
            <Button
              type="primary"
              ghost
              icon={<EditOutlined />}
              onClick={() => {
                setIsDetailVisible(false);
                handleEdit(currentDevice);
              }}
            >
              Edit
            </Button>
          )
        }
      >
        {currentDevice && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 border-b pb-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${getAvatarColor(
                  currentDevice.device_name
                )}`}
              >
                {currentDevice.device_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{currentDevice.device_name}</h2>
                <p className="text-gray-500 text-sm">{currentDevice.device}</p>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Metadata
              </h3>
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-xs text-gray-500">WiFi SSID</p>
                  <p className="text-sm font-medium">{currentDevice.ssid || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Device Type</p>
                  <p className="text-sm font-medium capitalize">
                    {currentDevice.device_type?.replace("_", " ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Group</p>
                  <p className="text-sm font-medium">{currentDevice.device_group || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">WiFi Password</p>
                  <p className="text-sm font-medium text-gray-400">••••••••</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium">
                    {currentDevice.lat ?? "—"}, {currentDevice.longitude ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Sensors */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Sensors
              </h3>
              {currentDevice.sensors && currentDevice.sensors.length > 0 ? (
                <div className="space-y-2">
                  {currentDevice.sensors.map((s: any, i: number) => (
                    <div
                      key={i}
                      className="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-100"
                    >
                      <span className="text-sm font-semibold text-gray-700">
                        {s.sensor_group}
                      </span>
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
                        {s.sensor_id}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed text-gray-400 italic">
                  No sensors configured
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default DeviceManagementPage;
