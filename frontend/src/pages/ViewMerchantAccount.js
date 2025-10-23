import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { merchantAPI } from '../services/api';

const ViewMerchantAccount = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [account, setAccount] = useState(null);

    useEffect(() => {
        fetchAccount();
    }, [id]);

    const fetchAccount = async () => {
        try {
            const response = await merchantAPI.getAllAccounts();
            const foundAccount = response.data.data.accounts.find(acc => acc.id === parseInt(id));
            setAccount(foundAccount);
        } catch (error) {
            console.error('Error fetching account:', error);
            alert('Failed to load merchant account');
        } finally {
            setLoading(false);
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

    if (!account) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-gray-600">Merchant account not found</p>
                    <button
                        onClick={() => navigate('/merchants')}
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Back to Merchant Manager
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">👁️ View Merchant Account</h1>
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

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow p-8">

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center mb-6 pb-4 border-b">
                        <h2 className="text-2xl font-bold text-gray-900">{account.merchant_name}</h2>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate(`/merchants/edit/${account.id}`)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                            >
                                ✏️ Edit
                            </button>
                            <button
                                onClick={() => navigate('/merchants')}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">

                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">📝 Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Merchant Name</label>
                                    <p className="text-gray-900">{account.merchant_name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Merchant Email</label>
                                    <p className="text-gray-900">{account.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {account.status}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
                                    <p className="text-gray-900">{new Date(account.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Notification Settings */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">📧 Notification Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Notification Email</label>
                                    <p className="text-gray-900">{account.notification_email || 'Not set'}</p>
                                    <p className="text-xs text-gray-500 mt-1">Instant forwards sent here</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Reminder Email</label>
                                    <p className="text-gray-900">{account.reminder_email || 'Not set'}</p>
                                    <p className="text-xs text-gray-500 mt-1">Reminders sent here</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Gateways */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">💳 Monitored Payment Gateways</h3>
                            {account.selected_gateways && account.selected_gateways.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {account.selected_gateways.map(gateway => (
                                        <span key={gateway} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                            {gateway}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">No gateways selected</p>
                            )}
                        </div>

                        {/* Working Hours */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">⏰ Working Hours</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Start Time</label>
                                    <p className="text-gray-900">{account.working_hours_start || '09:00'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">End Time</label>
                                    <p className="text-gray-900">{account.working_hours_end || '21:00'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Timezone</label>
                                    <p className="text-gray-900">{account.timezone || 'Asia/Kolkata'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Working Days */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">📅 Working Days</h3>
                            {account.working_days && account.working_days.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {account.working_days.map(day => (
                                        <span key={day} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm capitalize">
                                            {day}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">No working days configured</p>
                            )}
                        </div>

                        {/* Last Checked */}
                        {account.last_checked_at && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">🕐 Last Activity</h3>
                                <p className="text-gray-900">Last checked: {new Date(account.last_checked_at).toLocaleString()}</p>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
};

export default ViewMerchantAccount;