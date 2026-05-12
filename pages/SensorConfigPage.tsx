import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Space, message, Tabs } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { apiService, Endpoint } from "../services/api";

const SensorConfigPage: React.FC = () => {
  const [sensorGroups, setSensorGroups] = useState<any[]>([]);
  const [sensorBrands, setSensorBrands] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("groups");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchSensorGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await apiService.get(Endpoint.SENSOR_GROUP_ALL);
      setSensorGroups(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      message.error("Failed to fetch sensor groups");
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchSensorBrands = async () => {
    try {
      setLoadingBrands(true);
      const res = await apiService.get(Endpoint.SENSOR_BRAND_ALL);
      setSensorBrands(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      message.error("Failed to fetch sensor brands");
    } finally {
      setLoadingBrands(false);
    }
  };

  useEffect(() => {
    fetchSensorGroups();
    fetchSensorBrands();
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

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: "Are you sure?",
      content: "Delete this configuration item?",
      onOk: async () => {
        try {
          const endpoint =
            activeTab === "groups" ? Endpoint.SENSOR_GROUP : Endpoint.SENSOR_BRAND;
          await apiService.delete(`${endpoint}?id=${id}`);
          message.success("Item deleted");
          activeTab === "groups" ? fetchSensorGroups() : fetchSensorBrands();
        } catch (error) {
          message.error("Failed to delete item");
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const endpoint =
        activeTab === "groups" ? Endpoint.SENSOR_GROUP : Endpoint.SENSOR_BRAND;
      if (editingItem) {
        if (activeTab === "groups") {
          await apiService.put(endpoint, {
            id: editingItem.id,
            newId: values.id,
            label: values.label,
          });
        } else {
          await apiService.put(endpoint, {
            id: editingItem.id,
            newId: values.id,
            label: values.label,
          });
        }
        message.success("Item updated");
      } else {
        await apiService.post(endpoint, values);
        message.success("Item created");
      }
      setIsModalVisible(false);
      activeTab === "groups" ? fetchSensorGroups() : fetchSensorBrands();
    } catch (error) {
      message.error("Operation failed");
    }
  };

  const actionCol = (record: any) => (
    <Space size="middle">
      <Button
        type="text"
        icon={<EditOutlined className="text-blue-600" />}
        onClick={() => handleEdit(record)}
      />
      <Button
        type="text"
        icon={<DeleteOutlined className="text-red-600" />}
        onClick={() => handleDelete(record.id)}
      />
    </Space>
  );

  const groupColumns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Label", dataIndex: "label", key: "label" },
    {
      title: "Added At",
      dataIndex: "ts",
      key: "ts",
      render: (t: any) => (t ? new Date(t).toLocaleString() : "—"),
    },
    { title: "Actions", key: "actions", render: (_: any, r: any) => actionCol(r) },
  ];

  const brandColumns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Label", dataIndex: "label", key: "label" },
    { title: "Actions", key: "actions", render: (_: any, r: any) => actionCol(r) },
  ];

  const tabItems = [
    {
      key: "groups",
      label: "Sensor Groups",
      children: (
        <>
          <div className="flex justify-end mb-4">
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Group
            </Button>
          </div>
          <Table
            dataSource={sensorGroups}
            columns={groupColumns}
            rowKey="id"
            loading={loadingGroups}
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
    {
      key: "brands",
      label: "Sensor Brands",
      children: (
        <>
          <div className="flex justify-end mb-4">
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Brand
            </Button>
          </div>
          <Table
            dataSource={sensorBrands}
            columns={brandColumns}
            rowKey="id"
            loading={loadingBrands}
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sensor Configuration</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </div>

      <Modal
        title={
          editingItem
            ? `Edit ${activeTab === "groups" ? "Group" : "Brand"}`
            : `Add ${activeTab === "groups" ? "Group" : "Brand"}`
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="id" label="ID" rules={[{ required: true }]}>
            <Input placeholder="e.g. S001" />
          </Form.Item>
          <Form.Item name="label" label="Label" rules={[{ required: true }]}>
            <Input placeholder="e.g. Temperature" />
          </Form.Item>
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

export default SensorConfigPage;
