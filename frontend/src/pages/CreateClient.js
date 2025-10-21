import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clientAPI, testConnectionAPI } from '../services/api';

const CreateClient = () => {
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
        phone: '',
        company: '',
        address: '',
        city: '',
        country: '',
        industry: '',
        website: '',
        notes: '',
        timezone: 'UTC',              // ✅ ADD THIS
        working_hours_start: '09:00', // ✅ ADD THIS
        working_hours_end: '18:00'    // ✅ ADD THIS
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Auto-update SMTP/IMAP settings based on provider
        if (name === 'email_provider') {
            const providers = {
                gmail: {
                    smtp_host: 'smtp.gmail.com',
                    smtp_port: 587,
                    imap_host: 'imap.gmail.com',
                    imap_port: 993
                },
                outlook: {
                    smtp_host: 'smtp-mail.outlook.com',
                    smtp_port: 587,
                    imap_host: 'outlook.office365.com',
                    imap_port: 993
                },
                yahoo: {
                    smtp_host: 'smtp.mail.yahoo.com',
                    smtp_port: 587,
                    imap_host: 'imap.mail.yahoo.com',
                    imap_port: 993
                }
            };

            setFormData({
                ...formData,
                [name]: value,
                ...(providers[value] || {})
            });
        } else {
            setFormData({
                ...formData,
                [name]: value
            });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await clientAPI.create(formData);
            navigate('/clients');
        } catch (error) {
            console.error('Error creating client:', error);
            alert(error.response?.data?.message || 'Failed to create client');
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
                    <h1 className="text-2xl font-bold text-gray-900">Create New Client</h1>
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
                        <button onClick={() => navigate('/clients')} className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">
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
                        <h2 className="text-xl font-semibold text-gray-900">Client Information</h2>
                        <button
                            onClick={() => navigate('/clients')}
                            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                        >
                            ← Back to Clients
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Client Details Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">👤 Client Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., John Doe"
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                    <input
                                        type="text"
                                        name="company"
                                        value={formData.company}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Acme Corporation"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                                    <input
                                        type="text"
                                        name="industry"
                                        value={formData.industry}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Technology, Healthcare"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                    <input
                                        type="url"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="https://example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., New York"
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
                                        placeholder="e.g., USA"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone *</label>
                                    <select
                                        name="timezone"
                                        value={formData.timezone}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="UTC">UTC - Coordinated Universal Time</option>
                                        <option value="America/New_York">Eastern Time (US & Canada)</option>
                                        <option value="America/Chicago">Central Time (US & Canada)</option>
                                        <option value="America/Denver">Mountain Time (US & Canada)</option>
                                        <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                                        <option value="Europe/London">London</option>
                                        <option value="Europe/Paris">Paris, Berlin, Rome</option>
                                        <option value="Asia/Dubai">Dubai</option>
                                        <option value="Asia/Kolkata">India (Mumbai, Delhi)</option>
                                        <option value="Asia/Singapore">Singapore</option>
                                        <option value="Asia/Shanghai">China (Beijing, Shanghai)</option>
                                        <option value="Asia/Tokyo">Tokyo</option>
                                        <option value="Asia/Manila">Philippines (Manila)</option>
                                        <option value="Australia/Sydney">Sydney</option>
                                        <option value="Pacific/Auckland">Auckland</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Full address"
                                />
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
                                        placeholder="client@example.com"
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

                            {/* SMTP/IMAP Advanced Settings (Collapsible) */}
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-medium">
                                    ⚙️ Advanced SMTP/IMAP Settings (Optional)
                                </summary>
                                <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                                        <input
                                            type="text"
                                            name="smtp_host"
                                            value={formData.smtp_host}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                                        <input
                                            type="number"
                                            name="smtp_port"
                                            value={formData.smtp_port}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Host</label>
                                        <input
                                            type="text"
                                            name="imap_host"
                                            value={formData.imap_host}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Port</label>
                                        <input
                                            type="number"
                                            name="imap_port"
                                            value={formData.imap_port}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </details>

                            {/* Working Hours Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">🕐 Working Hours</h3>
                                <p className="text-sm text-gray-600 mb-4">AI will respect these hours when sending replies (unless urgent)</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                        <input
                                            type="time"
                                            name="working_hours_start"
                                            value={formData.working_hours_start}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                        <input
                                            type="time"
                                            name="working_hours_end"
                                            value={formData.working_hours_end}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Example: 9:00 AM to 6:00 PM in client's timezone
                                </p>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 Additional Notes</h3>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows="4"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Any additional information about this client..."
                            />
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex justify-end gap-4 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => navigate('/clients')}
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
                                    'Create Client'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateClient;