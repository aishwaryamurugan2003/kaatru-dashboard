import React, { useEffect, useState } from "react";
import {
  Table, Button, Modal, Form, Input, Select,
  Drawer, Badge, Space, Tooltip, message, Tag, Empty,
} from "antd";
import {
  EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined,
} from "@ant-design/icons";
import { apiService, Endpoint } from "../services/api";
import { getCache, setCache } from "../services/cache";
import Loading from "../components/Loading";

const { Option } = Select;

const DeviceManagementPage: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [sensorGroups, setSensorGroups] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group detail drawer
  const [isGroupDetailVisible, setIsGroupDetailVisible] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<any>(null);
  const [groupDetailLoading, setGroupDetailLoading] = useState(false);

  // Device detail drawer
  const [isDeviceDetailVisible, setIsDeviceDetailVisible] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<any>(null);
  const [deviceDetailLoading, setDeviceDetailLoading] = useState(false);

  // Register / Edit modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [form] = Form.useForm();

  // Device ID lookup input (controlled)
  const [lookupId, setLookupId] = useState("");

  // ── Fetch groups ─────────────────────────────────────────
  const fetchGroups = async (force = false) => {
    const cacheKey = "groups";
    if (!force) {
      const cached = getCache<any[]>(cacheKey);
      if (cached && cached.length > 0) {
        setGroups(cached);
        setInitialLoading(false);
        return;
      }
    }
    try {
      setInitialLoading(groups.length === 0);
      setRefreshing(groups.length > 0);
      const res = await apiService.get(Endpoint.GROUP_ALL);
      const result = Array.isArray(res?.data) ? res.data : [];
      setCache(cacheKey, result);
      setGroups(result);
      setError(null);
    } catch {
      message.error("Failed to fetch groups");
      setError("Failed to load data. Please try again.");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  // ── Fetch sensor groups ──────────────────────────────────
  const fetchSensorGroups = async (force = false) => {
    const cacheKey = "sensor_groups";
    if (!force) {
      const cached = getCache<any[]>(cacheKey);
      if (cached && cached.length > 0) {
        setSensorGroups(cached);
        return;
      }
    }
    try {
      const res = await apiService.get(Endpoint.SENSOR_GROUP_ALL);
      const result = Array.isArray(res?.data) ? res.data : [];
      setCache(cacheKey, result);
      setSensorGroups(result);
    } catch {
      console.error("Failed to fetch sensor groups");
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchSensorGroups();
  }, []);

  // ── Show group detail (/group?id=...) ────────────────────
  // Response shape: { group: [{...meta}], devices: ["MG1", "SG77", ...] }
  const showGroupDetail = async (groupId: string) => {
    setGroupDetailLoading(true);
    setIsGroupDetailVisible(true);
    setCurrentGroup(null);
    try {
      const res = await apiService.get(Endpoint.GROUP, { id: groupId });
      const data = res?.data;
      const groupMeta = Array.isArray(data?.group) ? data.group[0] : data?.group || {};
      const devices: string[] = Array.isArray(data?.devices) ? data.devices : [];
      setCurrentGroup({ meta: groupMeta, devices });
    } catch {
      message.error("Failed to fetch group details");
      setIsGroupDetailVisible(false);
    } finally {
      setGroupDetailLoading(false);
    }
  };

  // ── Show device detail (/device?id=...) ──────────────────
  // Response shape: { device: [{...meta}], sensors: [...] }
  // device may be [] if no metadata row exists yet
  const showDeviceDetail = async (deviceId: string) => {
    if (!deviceId?.trim()) {
      message.warning("Enter a device ID");
      return;
    }
    setDeviceDetailLoading(true);
    setIsDeviceDetailVisible(true);
    setCurrentDevice(null);
    try {
      const res = await apiService.get(Endpoint.DEVICE_INFO, { id: deviceId.trim() });
      const data = res?.data;
      const deviceArr = Array.isArray(data?.device) ? data.device : [];
      const meta = deviceArr[0] || {};
      const sensors = Array.isArray(data?.sensors) ? data.sensors : [];
      setCurrentDevice({ id: deviceId.trim(), ...meta, sensors });
    } catch {
      message.error("Failed to fetch device details");
      setIsDeviceDetailVisible(false);
    } finally {
      setDeviceDetailLoading(false);
    }
  };

  // ── Register / Edit ──────────────────────────────────────
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
      fetchGroups(true);
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

  // ── Avatar color helper ──────────────────────────────────
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

  // ── Groups table columns ─────────────────────────────────
  const groupColumns = [
    {
      title: "Group ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => (
        <button
          className="text-blue-600 font-mono text-sm hover:underline"
          onClick={() => showGroupDetail(id)}
        >
          {id}
        </button>
      ),
    },
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
      render: (s: any) => (
        <Badge
          status={s === 1 || s === true ? "success" : "error"}
          text={s === 1 || s === true ? "Active" : "Inactive"}
        />
      ),
    },
    { title: "Server", dataIndex: "server", key: "server" },
    { title: "MQTT Topic", dataIndex: "mqtt_topic", key: "mqtt_topic" },
  ];

  if (initialLoading) return <Loading fullScreen text="Loading devices..." />;

  return (
    <div className="p-6">

      {/* ── Error banner ────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between mb-4">
          <span className="text-red-600">{error}</span>
          <button
            onClick={() => window.location.reload()}
            className="text-red-600 underline text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          Device Management
          {refreshing && (
            <div className="ml-4 animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
        </h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleRegister}>
          Register Device
        </Button>
      </div>

      {/* ── Device lookup by ID ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <p className="text-sm font-medium text-gray-600 mb-2">Look up a device by ID</p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter device ID (e.g. SG77)"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            onPressEnter={() => showDeviceDetail(lookupId)}
            style={{ maxWidth: 300 }}
            prefix={<SearchOutlined className="text-gray-400" />}
          />
          <Button
            type="primary"
            loading={deviceDetailLoading}
            onClick={() => showDeviceDetail(lookupId)}
          >
            Fetch Device
          </Button>
        </div>
      </div>

      {/* ── Groups overview table ───────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            Groups Overview{" "}
            <span className="text-gray-300 font-normal ml-1">
              · Click a Group ID to see its devices
            </span>
          </p>
        </div>
        <Table
          dataSource={groups}
          columns={groupColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* ── Register / Edit Device Modal ─────────────────────── */}
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

      {/* ── Group Detail Drawer ─────────────────────────────── */}
      <Drawer
        title={
          currentGroup
            ? `Group: ${currentGroup.meta?.name || currentGroup.meta?.id || "..."}`
            : "Group Details"
        }
        placement="right"
        size="large"
        onClose={() => setIsGroupDetailVisible(false)}
        open={isGroupDetailVisible}
        loading={groupDetailLoading}
      >
        {currentGroup && (
          <div className="space-y-6">
            {/* Group meta grid */}
            <div className="grid grid-cols-2 gap-y-4 border-b pb-5">
              {(
                [
                  ["ID", currentGroup.meta?.id],
                  ["Server", currentGroup.meta?.server],
                  ["MQTT Topic", currentGroup.meta?.mqtt_topic],
                  ["Primary DB", currentGroup.meta?.primarydb],
                  ["Secondary DB", currentGroup.meta?.secondarydb],
                  [
                    "Status",
                    currentGroup.meta?.status === 1 || currentGroup.meta?.status === true
                      ? "Active"
                      : "Inactive",
                  ],
                ] as [string, string][]
              ).map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-medium">{val || "—"}</p>
                </div>
              ))}
            </div>

            {/* Device ID tags */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Devices ({currentGroup.devices.length})
              </p>
              {currentGroup.devices.length === 0 ? (
                <Empty description="No devices in this group" />
              ) : (
                <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto pr-1">
                  {currentGroup.devices.map((deviceId: string) => (
                    <Tag
                      key={deviceId}
                      className="cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors"
                      onClick={() => {
                        setIsGroupDetailVisible(false);
                        setLookupId(deviceId);
                        showDeviceDetail(deviceId);
                      }}
                    >
                      {deviceId}
                    </Tag>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3 italic">
                Click a device ID to view its details
              </p>
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Device Detail Drawer ────────────────────────────── */}
      <Drawer
        title="Device Details"
        placement="right"
        size="large"
        onClose={() => setIsDeviceDetailVisible(false)}
        open={isDeviceDetailVisible}
        loading={deviceDetailLoading}
        extra={
          currentDevice?.device_name ? (
            <Button
              type="primary"
              ghost
              icon={<EditOutlined />}
              onClick={() => {
                setIsDeviceDetailVisible(false);
                handleEdit(currentDevice);
              }}
            >
              Edit
            </Button>
          ) : null
        }
      >
        {currentDevice && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 border-b pb-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${getAvatarColor(
                  currentDevice.device_name || currentDevice.id
                )}`}
              >
                {(currentDevice.device_name || currentDevice.id)?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {currentDevice.device_name || currentDevice.id}
                </h2>
                <p className="text-gray-500 text-sm font-mono">
                  {currentDevice.device || currentDevice.id}
                </p>
                {!currentDevice.device_name && (
                  <p className="text-xs text-amber-500 mt-1">
                    No metadata found — device may not be registered yet
                  </p>
                )}
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
                  <p className="text-sm font-medium text-gray-400">
                    {currentDevice.password ? "••••••••" : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium">
                    {currentDevice.lat != null && currentDevice.longitude != null
                      ? `${currentDevice.lat}, ${currentDevice.longitude}`
                      : currentDevice.lat != null
                        ? `${currentDevice.lat}, —`
                        : "—"}
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