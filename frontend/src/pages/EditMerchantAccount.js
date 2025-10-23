import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { merchantAPI } from '../services/api';

const EditMerchantAccount = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        merchant_name: '',
        email: '',
        notification_email: '',
        reminder_email: '',
        selected_gateways: [],
        working_hours_start: '09:00',
        working_hours_end: '21:00',
        working_days: [],
        timezone: 'Asia/Kolkata',
        status: 'active'
    });

    const paymentGateways = ['eVirtualPay', 'Fiserv', 'PayU', 'Razorpay', 'Stripe', 'PayPal', 'Square', 'Authorize.Net', 'Adyen', 'Worldpay'];
    const weekDays = [
        { value: 'monday', label: 'Monday' },
        { value: 'tuesday', label: 'Tuesday' },
        { value: 'wednesday', label: 'Wednesday' },
        { value: 'thursday', label: 'Thursday' },
        { value: 'friday', label: 'Friday' },
        { value: 'saturday', label: 'Saturday' },
        { value: 'sunday', label: 'Sunday' }
    ];

    useEffect(() => {
        fetchAccount();
    }, [id]);

    const fetchAccount = async () => {
        try {
            const response = await merchantAPI.getAllAccounts();
            const account = response.data.data.accounts.find(acc => acc.id === parseInt(id));
            if (account) {
                setFormData({
                    merchant_name: account.merchant_name || '',
                    email: account.email || '',
                    notification_email: account.notification_email || '',
                    reminder_email: account.reminder_email || '',
                    selected_gateways: account.selected_gateways || [],
                    working_hours_start: account.working_hours_start || '09:00',
                    working_hours_end: account.working_hours_end || '21:00',
                    working_days: account.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                    timezone: account.timezone || 'Asia/Kolkata',
                    status: account.status || 'active'
                });
            } else {
                alert('Merchant account not found');
                navigate('/merchants');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to load account');
        } finally {
            setLoading(false);
        }
    };

    const handleGatewayToggle = (gateway) => {
        setFormData(prev => ({
            ...prev,
            selected_gateways: prev.selected_gateways.includes(gateway)
                ? prev.selected_gateways.filter(g => g !== gateway)
                : [...prev.selected_gateways, gateway]
        }));
    };

    const handleDayToggle = (day) => {
        setFormData(prev => ({
            ...prev,
            working_days: prev.working_days.includes(day)
                ? prev.working_days.filter(d => d !== day)
                : [...prev.working_days, day]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.selected_gateways.length === 0) {
            alert('Select at least one payment gateway');
            return;
        }
        if (formData.working_days.length === 0) {
            alert('Select at least one working day');
            return;
        }
        setSaving(true);
        try {
            await merchantAPI.updateAccount(id, {
                merchant_name: formData.merchant_name,
                notification_email: formData.notification_email,
                reminder_email: formData.reminder_email,
                selected_gateways: formData.selected_gateways,
                working_hours_start: formData.working_hours_start,
                working_hours_end: formData.working_hours_end,
                working_days: formData.working_days,
                timezone: formData.timezone,
                status: formData.status
            });
            alert('✅ Account updated successfully!');
            navigate('/merchants');
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Failed to update account');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">✏️ Edit Merchant Account</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-600">{user?.full_name || user?.email}</span>
                        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Logout</button>
                    </div>
                </div>
            </header>

            <nav className="bg-white shadow-sm mt-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8 py-4">
                        <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">Overview</button>
                        <button onClick={() => navigate('/agents')} className="text-gray-600 hover:text-gray-900">Agents</button>
                        <button onClick={() => navigate('/clients')} className="text-gray-600 hover:text-gray-900">Clients</button>
                        <button onClick={() => navigate('/assignments')} className="text-gray-600 hover:text-gray-900">Assignments</button>
                        <button onClick={() => navigate('/payment-gateway')} className="text-gray-600 hover:text-gray-900">💳 Payment Monitor</button>
                        <button onClick={() => navigate('/merchants')} className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">📧 Merchant Manager</button>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">

                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">📝 Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name *</label>
                                    <input type="text" value={formData.merchant_name} onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Email (Locked)</label>
                                    <input type="email" value={formData.email} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed" />
                                    <p className="text-xs text-gray-500 mt-1">🔒 Email cannot be changed</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">📧 Notification Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notification Email *</label>
                                    <input type="email" value={formData.notification_email} onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })} required placeholder="your@email.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                    <p className="text-xs text-gray-500 mt-1">Get instant forwards</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Email *</label>
                                    <input type="email" value={formData.reminder_email} onChange={(e) => setFormData({ ...formData, reminder_email: e.target.value })} required placeholder="reminder@email.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                    <p className="text-xs text-gray-500 mt-1">Get reminders</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">💳 Payment Gateways *</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {paymentGateways.map(gateway => (
                                    <label key={gateway} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.selected_gateways.includes(gateway)} onChange={() => handleGatewayToggle(gateway)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                                        <span className="text-sm text-gray-700">{gateway}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">⏰ Working Hours</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <input type="time" value={formData.working_hours_start} onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                    <input type="time" value={formData.working_hours_end} onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                                    <select value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="Asia/Kolkata">India (IST)</option>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">US Eastern</option>
                                        <option value="America/Los_Angeles">US Pacific</option>
                                        <option value="Europe/London">UK</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">📅 Working Days *</h3>
                            <div className="flex flex-wrap gap-3">
                                {weekDays.map(day => (
                                    <label key={day.value} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.working_days.includes(day.value)} onChange={() => handleDayToggle(day.value)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                                        <span className="text-sm text-gray-700">{day.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t">
                            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                                {saving ? 'Saving...' : '✅ Save Changes'}
                            </button>
                            <button type="button" onClick={() => navigate('/merchants')} className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-medium">
                                ❌ Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default EditMerchantAccount;