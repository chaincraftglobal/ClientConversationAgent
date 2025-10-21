import React, { useState, useEffect } from 'react';
import { clientAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        profession: '',
        business_type: '',
        product_purchased: '',
        amount_paid: '',
        date_of_payment: '',
        project_type: '',
        support_duration: '',
        development_status: 'pending',
        expected_delivery: '',
        notes: ''
    });
    const [editingId, setEditingId] = useState(null);

    const navigate = useNavigate();
    const { user, logout } = useAuth();

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await clientAPI.getAll();
            setClients(response.data.data.clients);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await clientAPI.update(editingId, formData);
            } else {
                await clientAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            fetchClients();
        } catch (error) {
            console.error('Error saving client:', error);
            alert(error.response?.data?.message || 'Failed to save client');
        }
    };

    const handleEdit = (client) => {
        setEditingId(client.id);
        setFormData({
            name: client.name,
            email: client.email,
            company: client.company || '',
            phone: client.phone || '',
            address: client.address || '',
            city: client.city || '',
            country: client.country || '',
            profession: client.profession || '',
            business_type: client.business_type || '',
            product_purchased: client.product_purchased || '',
            amount_paid: client.amount_paid || '',
            date_of_payment: client.date_of_payment || '',
            project_type: client.project_type || '',
            support_duration: client.support_duration || '',
            development_status: client.development_status || 'pending',
            expected_delivery: client.expected_delivery || '',
            notes: client.notes || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this client?')) {
            try {
                await clientAPI.delete(id);
                fetchClients();
            } catch (error) {
                console.error('Error deleting client:', error);
                alert('Failed to delete client');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            company: '',
            phone: '',
            address: '',
            city: '',
            country: '',
            profession: '',
            business_type: '',
            product_purchased: '',
            amount_paid: '',
            date_of_payment: '',
            project_type: '',
            support_duration: '',
            development_status: 'pending',
            expected_delivery: '',
            notes: ''
        });
        setEditingId(null);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Clients Management</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-600">{user?.full_name || user?.email}</span>
                        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white shadow-sm mt-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8 py-4">
                        <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
                            Overview
                        </button>
                        <button onClick={() => navigate('/agents')} className="text-gray-600 hover:text-gray-900">
                            Agents
                        </button>
                        <button className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">
                            Clients
                        </button>
                        <button onClick={() => navigate('/assignments')} className="text-gray-600 hover:text-gray-900">
                            Assignments
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">All Clients ({clients.length})</h2>
                    <button
                        onClick={() => navigate('/clients/create')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        + Create Client
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                    </div>
                ) : clients.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <p className="text-gray-500 text-lg">No clients yet. Create your first client!</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timezone</th>  {/* ✅ ADD THIS */}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {clients.map((client) => (
                                    <tr key={client.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{client.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{client.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{client.company || '-'}</div>
                                        </td>
                                        {/* ✅ ADD THIS */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{client.timezone || 'UTC'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => handleEdit(client)} className="text-blue-600 hover:text-blue-900 mr-4">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDelete(client.id)} className="text-red-600 hover:text-red-900">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold mb-6 text-gray-900 border-b pb-3">
                            {editingId ? 'Edit Client' : 'Create New Client'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Personal Details Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">👤 Personal Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="e.g., Joven Tan"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="client@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                                        <input
                                            type="text"
                                            name="profession"
                                            value={formData.profession}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="e.g., Real Estate Agent"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">📍 Address Details</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="Unit 1607, 16th Floor, The Persimmon Studios..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                                placeholder="e.g., Mandaue"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                            <input
                                                type="text"
                                                name="country"
                                                value={formData.country}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                                placeholder="e.g., Philippines"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Business Details Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">🏢 Business Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                        <input
                                            type="text"
                                            name="company"
                                            value={formData.company}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="Company Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                                        <input
                                            type="text"
                                            name="business_type"
                                            value={formData.business_type}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="e.g., Real Estate"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Purchase Details Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">💰 Purchase Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Purchased</label>
                                        <input
                                            type="text"
                                            name="product_purchased"
                                            value={formData.product_purchased}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="e.g., Real Estate CRM Software"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (USD)</label>
                                        <input
                                            type="text"
                                            name="amount_paid"
                                            value={formData.amount_paid}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="$2,880.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Payment</label>
                                        <input
                                            type="date"
                                            name="date_of_payment"
                                            value={formData.date_of_payment}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Project Details Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">🧩 Project Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
                                        <input
                                            type="text"
                                            name="project_type"
                                            value={formData.project_type}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="e.g., Real Estate CRM (Standard Edition)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Support Duration</label>
                                        <input
                                            type="text"
                                            name="support_duration"
                                            value={formData.support_duration}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="e.g., 3 Months"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Development Status</label>
                                        <select
                                            name="development_status"
                                            value={formData.development_status}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="on_hold">On Hold</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                                        <input
                                            type="date"
                                            name="expected_delivery"
                                            value={formData.expected_delivery}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Notes Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">📝 Additional Notes</h4>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows="4"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="Optional: Any additional information, special requirements, or notes about this client..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                                >
                                    {editingId ? 'Update' : 'Create'} Client
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;