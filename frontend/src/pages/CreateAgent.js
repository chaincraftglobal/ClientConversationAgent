import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { agentAPI, testConnectionAPI } from '../services/api';

const CreateAgent = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
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

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await agentAPI.create(formData);
            navigate('/agents');
        } catch (error) {
            console.error('Error creating agent:', error);
            alert(error.response?.data?.message || 'Failed to create agent');
        } finally {
            setLoading(false);
        }
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
                    <h1 className="text-2xl font-bold text-gray-900">Create New Agent</h1>
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
                        <button onClick={() => navigate('/agents')} className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">
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
            <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Agent Information</h2>
                        <button
                            onClick={() => navigate('/agents')}
                            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                        >
                            ← Back to Agents
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Agent Details Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">🤖 Agent Details</h3>
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
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">📧 Email Configuration</h3>
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
                                        required
                                        placeholder="App password"
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                                    <button
                                        type="button"
                                        onClick={handleTestConnection}
                                        disabled={testing || !formData.email || !formData.email_password}
                                        className={`w-full px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${testing
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                            }`}
                                    >
                                        {testing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Testing...
                                            </>
                                        ) : (
                                            <>🔌 Test Connection</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Test Results */}
                            {testResult && (
                                <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
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
                        </div>

                        {/* AI Configuration Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">🧠 AI Configuration</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Persona Description</label>
                                <textarea
                                    name="persona_description"
                                    value={formData.persona_description}
                                    onChange={handleInputChange}
                                    rows="2"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Professional and friendly AI assistant"
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
                                    placeholder="e.g., You are a helpful project manager..."
                                />
                            </div>
                        </div>

                        {/* Email Signature Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">✍️ Email Signature</h3>
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

                        {/* Submit Buttons */}
                        <div className="flex justify-end gap-4 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => navigate('/agents')}
                                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Creating...
                                    </>
                                ) : (
                                    'Create Agent'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateAgent;