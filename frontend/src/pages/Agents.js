import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { agentAPI, testConnectionAPI } from '../services/api';

const Agents = () => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        email_password: '',
        email_provider: 'gmail',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        imap_host: 'imap.gmail.com',
        imap_port: 993,
        persona_description: '',
        system_prompt: '',
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
        signature_name: '',
        signature_title: '',
        signature_company: '',
        signature_phone: '',
        signature_website: '',
        signature_style: 'professional'
    });
    const [editingId, setEditingId] = useState(null);

    const navigate = useNavigate();
    const { user, logout } = useAuth();

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const response = await agentAPI.getAll();
            setAgents(response.data.data.agents);
        } catch (error) {
            console.error('Error fetching agents:', error);
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
                await agentAPI.update(editingId, formData);
            } else {
                await agentAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            fetchAgents();
        } catch (error) {
            console.error('Error saving agent:', error);
            alert(error.response?.data?.message || 'Failed to save agent');
        }
    };

    const handleEdit = (agent) => {
        setEditingId(agent.id);
        setFormData({
            name: agent.name || '',
            email: agent.email || '',
            email_password: '',
            email_provider: agent.email_provider || 'gmail',
            smtp_host: agent.smtp_host || 'smtp.gmail.com',
            smtp_port: agent.smtp_port || 587,
            imap_host: agent.imap_host || 'imap.gmail.com',
            imap_port: agent.imap_port || 993,
            persona_description: agent.persona_description || '',
            system_prompt: agent.system_prompt || '',
            phone: agent.phone || '',
            address: agent.address || '',
            city: agent.city || '',
            country: agent.country || '',
            profession: agent.profession || '',
            business_type: agent.business_type || '',
            product_purchased: agent.product_purchased || '',
            amount_paid: agent.amount_paid || '',
            date_of_payment: agent.date_of_payment ? agent.date_of_payment.split('T')[0] : '',
            project_type: agent.project_type || '',
            support_duration: agent.support_duration || '',
            development_status: agent.development_status || 'pending',
            expected_delivery: agent.expected_delivery ? agent.expected_delivery.split('T')[0] : '',
            signature_name: agent.signature_name || '',
            signature_title: agent.signature_title || '',
            signature_company: agent.signature_company || '',
            signature_phone: agent.signature_phone || '',
            signature_website: agent.signature_website || '',
            signature_style: agent.signature_style || 'professional'
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this agent?')) {
            try {
                await agentAPI.delete(id);
                fetchAgents();
            } catch (error) {
                console.error('Error deleting agent:', error);
                alert('Failed to delete agent');
            }
        }
    };

    const handleTestConnection = async () => {
        if (!formData.email || !formData.email_password) {
            alert('Please enter email and password first!');
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const response = await testConnectionAPI.testFull({
                email: formData.email,
                password: formData.email_password,
                provider: formData.email_provider,
                smtp_host: formData.smtp_host,
                smtp_port: formData.smtp_port,
                imap_host: formData.imap_host,
                imap_port: formData.imap_port
            });

            setTestResult({
                success: true,
                message: response.data.message,
                results: response.data.results
            });
        } catch (error) {
            setTestResult({
                success: false,
                message: error.response?.data?.message || 'Connection test failed',
                results: error.response?.data?.results
            });
        } finally {
            setTesting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            email_password: '',
            email_provider: 'gmail',
            smtp_host: 'smtp.gmail.com',
            smtp_port: 587,
            imap_host: 'imap.gmail.com',
            imap_port: 993,
            persona_description: '',
            system_prompt: '',
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
            expected_delivery: ''
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
                    <h1 className="text-2xl font-bold text-gray-900">Agents Management</h1>
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
                        <button className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">
                            Agents
                        </button>
                        <button onClick={() => navigate('/clients')} className="text-gray-600 hover:text-gray-900">
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
                    <h2 className="text-xl font-semibold">All Agents ({agents.length})</h2>
                    <button
                        onClick={() => navigate('/agents/create')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        + Create Agent
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : agents.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <p className="text-gray-500 text-lg">No agents yet. Create your first agent!</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {agents.map((agent) => (
                                    <tr key={agent.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{agent.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{agent.email_provider}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{agent.phone || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${agent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {agent.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => handleEdit(agent)} className="text-blue-600 hover:text-blue-900 mr-4">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDelete(agent.id)} className="text-red-600 hover:text-red-900">
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
                            {editingId ? 'Edit Agent' : 'Create New Agent'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Agent Details Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">🤖 Agent Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., Agent Alex"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., Project Manager"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                                        <input
                                            type="text"
                                            name="business_type"
                                            value={formData.business_type}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., Software Development"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Email Configuration Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">📧 Email Configuration</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="agent@gmail.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email Password / App Password *
                                        </label>
                                        <input
                                            type="password"
                                            name="email_password"
                                            value={formData.email_password}
                                            onChange={handleInputChange}
                                            required={!editingId}
                                            placeholder={editingId ? 'Leave blank to keep current' : 'App password'}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Provider</label>
                                        <select
                                            name="email_provider"
                                            value={formData.email_provider}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="gmail">Gmail</option>
                                            <option value="outlook">Outlook / Hotmail</option>
                                            <option value="yahoo">Yahoo Mail</option>
                                            <option value="custom">Custom SMTP</option>
                                        </select>
                                    </div>

                                </div>

                                {/* Test Connection Button */}
                                <div className="col-span-2">
                                    <button
                                        type="button"
                                        onClick={handleTestConnection}
                                        disabled={testing || !formData.email || !formData.email_password}
                                        className={`w-full px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${testing
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700 text-white'
                                            }`}
                                    >
                                        {testing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Testing Connection...
                                            </>
                                        ) : (
                                            <>
                                                🔌 Test Email Connection
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Test Results */}
                                {testResult && (
                                    <div className={`col-span-2 p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                        }`}>
                                        <p className={`font-semibold mb-2 ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                            {testResult.message}
                                        </p>
                                        {testResult.results && (
                                            <div className="text-sm space-y-1">
                                                <div className={testResult.results.smtp?.success ? 'text-green-700' : 'text-red-700'}>
                                                    {testResult.results.smtp?.message}
                                                </div>
                                                <div className={testResult.results.imap?.success ? 'text-green-700' : 'text-red-700'}>
                                                    {testResult.results.imap?.message}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Street address"
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
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="City"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                            <input
                                                type="text"
                                                name="country"
                                                value={formData.country}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="Country"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Configuration Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">🧠 AI Configuration</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Persona Description</label>
                                    <textarea
                                        name="persona_description"
                                        value={formData.persona_description}
                                        onChange={handleInputChange}
                                        rows="2"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Professional and friendly AI assistant specializing in real estate projects"
                                    />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                                    <textarea
                                        name="system_prompt"
                                        value={formData.system_prompt}
                                        onChange={handleInputChange}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., You are a helpful project manager assistant. Be professional and respond within 24 hours..."
                                    />
                                </div>
                            </div>

                            {/* Service Details Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">💼 Service Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Product/Service Offered</label>
                                        <input
                                            type="text"
                                            name="product_purchased"
                                            value={formData.product_purchased}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., CRM Software Development"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Rate</label>
                                        <input
                                            type="text"
                                            name="amount_paid"
                                            value={formData.amount_paid}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., $50/hour or $2000/project"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
                                        <input
                                            type="text"
                                            name="project_type"
                                            value={formData.project_type}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., Web Development, CRM Systems"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Support Duration</label>
                                        <input
                                            type="text"
                                            name="support_duration"
                                            value={formData.support_duration}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., 3 Months, 1 Year"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            name="date_of_payment"
                                            value={formData.date_of_payment}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            name="development_status"
                                            value={formData.development_status}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="active">Active</option>
                                            <option value="on_break">On Break</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Email Signature Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">✍️ Email Signature (Human-like)</h4>
                                <p className="text-sm text-gray-600 mb-4">Create a natural, personalized signature that doesn't look like AI/bot</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                        <input
                                            type="text"
                                            name="signature_name"
                                            value={formData.signature_name}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., Alex Johnson"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                        <input
                                            type="text"
                                            name="signature_title"
                                            value={formData.signature_title}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., Senior Project Manager"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                        <input
                                            type="text"
                                            name="signature_company"
                                            value={formData.signature_company}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., TechSolutions Inc."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input
                                            type="text"
                                            name="signature_phone"
                                            value={formData.signature_phone}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., +1 (555) 123-4567"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                        <input
                                            type="text"
                                            name="signature_website"
                                            value={formData.signature_website}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., www.company.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Signature Style</label>
                                        <select
                                            name="signature_style"
                                            value={formData.signature_style}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="professional">Professional</option>
                                            <option value="casual">Casual & Friendly</option>
                                            <option value="minimal">Minimal</option>
                                            <option value="corporate">Corporate</option>
                                        </select>
                                    </div>
                                </div>
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
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                                >
                                    {editingId ? 'Update' : 'Create'} Agent
                                </button>
                            </div>



                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Agents;