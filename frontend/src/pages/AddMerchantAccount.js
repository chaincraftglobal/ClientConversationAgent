import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { merchantAPI } from '../services/api';

const AddMerchantAccount = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const [formData, setFormData] = useState({
        merchant_name: '',
        email: '',
        password: '',
        notification_email: '',
        reminder_email: '',
        imap_host: 'imap.gmail.com',
        imap_port: 993,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        selected_gateways: [],
        working_hours_start: '09:00',
        working_hours_end: '21:00',
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        timezone: 'Asia/Kolkata'
    });

    const paymentGateways = [
        'eVirtualPay',
        'Fiserv',
        'PayU',
        'Razorpay',
        'Stripe',
        'PayPal',
        'Square',
        'Authorize.Net',
        'Adyen',
        'Worldpay'
    ];

    const weekDays = [
        { value: 'monday', label: 'Monday' },
        { value: 'tuesday', label: 'Tuesday' },
        { value: 'wednesday', label: 'Wednesday' },
        { value: 'thursday', label: 'Thursday' },
        { value: 'friday', label: 'Friday' },
        { value: 'saturday', label: 'Saturday' },
        { value: 'sunday', label: 'Sunday' }
    ];

    const handleGatewayToggle = (gateway) => {
        setFormData(prev => {
            const selected = prev.selected_gateways.includes(gateway)
                ? prev.selected_gateways.filter(g => g !== gateway)
                : [...prev.selected_gateways, gateway];
            return { ...prev, selected_gateways: selected };
        });
    };

    const handleDayToggle = (day) => {
        setFormData(prev => {
            const days = prev.working_days.includes(day)
                ? prev.working_days.filter(d => d !== day)
                : [...prev.working_days, day];
            return { ...prev, working_days: days };
        });
    };

    const handleTestCredentials = async () => {
        if (!formData.email || !formData.password) {
            alert('Please enter email and password first');
            return;
        }

        setTesting(true);
        try {
            const response = await merchantAPI.testCredentials({
                email: formData.email,
                password: formData.password,
                imap_host: formData.imap_host,
                imap_port: formData.imap_port
            });
            alert('✅ ' + response.data.message);
        } catch (error) {
            alert('❌ Test failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.selected_gateways.length === 0) {
            alert('Please select at least one payment gateway');
            return;
        }

        if (formData.working_days.length === 0) {
            alert('Please select at least one working day');
            return;
        }

        setSaving(true);
        try {
            await merchantAPI.addAccount(formData);
            alert('✅ Merchant account added successfully!');
            navigate('/merchants');
        } catch (error) {
            console.error('Error adding account:', error);
            alert('❌ Failed to add merchant account: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
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
                    <h1 className="text-2xl font-bold text-gray-900">➕ Add Merchant Account</h1>
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
                        <button onClick={() => navigate('/clients')} className="text-gray-600 hover:text-gray-900">
                            Clients
                        </button>
                        <button onClick={() => navigate('/assignments')} className="text-gray-600 hover:text-gray-900">
                            Assignments
                        </button>
                        <button onClick={() => navigate('/payment-gateway')} className="text-gray-600 hover:text-gray-900">
                            💳 Payment Monitor
                        </button>
                        <button onClick={() => navigate('/merchants')} className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">
                            📧 Merchant Manager
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Form */}
            <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">📝 Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name *</label>
                                    <input
                                        type="text"
                                        value={formData.merchant_name}
                                        onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                                        required
                                        placeholder="e.g., Tech Startup LLC"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Email *</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        placeholder="merchant@example.com"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Password *</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        placeholder="App password"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <button
                                        type="button"
                                        onClick={handleTestCredentials}
                                        disabled={testing}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {testing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Testing...
                                            </>
                                        ) : (
                                            '🧪 Test Credentials'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Notification Settings */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">📧 Notification Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notification Email *</label>
                                    <input
                                        type="email"
                                        value={formData.notification_email}
                                        onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                                        required
                                        placeholder="your@email.com"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Get instant forwards of payment gateway emails</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Email *</label>
                                    <input
                                        type="email"
                                        value={formData.reminder_email}
                                        onChange={(e) => setFormData({ ...formData, reminder_email: e.target.value })}
                                        required
                                        placeholder="reminder@email.com"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Get reminders if you don't reply</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Gateways */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">💳 Select Payment Gateways to Monitor *</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {paymentGateways.map(gateway => (
                                    <label key={gateway} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.selected_gateways.includes(gateway)}
                                            onChange={() => handleGatewayToggle(gateway)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{gateway}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Only emails from selected gateways will be tracked</p>
                        </div>

                        {/* Working Hours */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">⏰ Working Hours</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        value={formData.working_hours_start}
                                        onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                    <input
                                        type="time"
                                        value={formData.working_hours_end}
                                        onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                                    <select
                                        value={formData.timezone}
                                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Asia/Kolkata">India (IST)</option>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">US Eastern</option>
                                        <option value="America/Los_Angeles">US Pacific</option>
                                        <option value="Europe/London">UK</option>
                                    </select>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">No replies will be sent outside working hours</p>
                        </div>

                        {/* Working Days */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">📅 Working Days *</h3>
                            <div className="flex flex-wrap gap-3">
                                {weekDays.map(day => (
                                    <label key={day.value} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.working_days.includes(day.value)}
                                            onChange={() => handleDayToggle(day.value)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{day.label}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">No actions on non-working days</p>
                        </div>

                        {/* Advanced Settings (Collapsed) */}
                        <div>
                            <details className="border rounded-lg p-4">
                                <summary className="cursor-pointer font-medium text-gray-700">⚙️ Advanced Settings (Optional)</summary>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Host</label>
                                        <input
                                            type="text"
                                            value={formData.imap_host}
                                            onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Port</label>
                                        <input
                                            type="number"
                                            value={formData.imap_port}
                                            onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                                        <input
                                            type="text"
                                            value={formData.smtp_host}
                                            onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                                        <input
                                            type="number"
                                            value={formData.smtp_port}
                                            onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </details>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex gap-4 pt-4 border-t">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                            >
                                {saving ? 'Saving...' : '✅ Add Merchant Account'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/merchants')}
                                className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-medium"
                            >
                                ❌ Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AddMerchantAccount;