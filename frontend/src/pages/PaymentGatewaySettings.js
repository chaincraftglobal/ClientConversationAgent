import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentGatewayAPI } from '../services/api';

const PaymentGatewaySettings = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checking, setChecking] = useState(false);

    const [credentials, setCredentials] = useState({
        login_url: 'https://evirtualpay.com/v2/vp_interface/login',
        username: '',
        password: ''
    });

    const [schedule, setSchedule] = useState({
        check_interval_hours: 3,
        admin_email: '',
        is_enabled: false
    });

    const [summary, setSummary] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [credentialsRes, scheduleRes, summaryRes] = await Promise.all([
                paymentGatewayAPI.getCredentials(),
                paymentGatewayAPI.getSchedule(),
                paymentGatewayAPI.getDashboardSummary()
            ]);

            if (credentialsRes.data.data) {
                setCredentials({
                    ...credentials,
                    login_url: credentialsRes.data.data.login_url,
                    username: credentialsRes.data.data.username
                });
            }

            if (scheduleRes.data.data) {
                setSchedule(scheduleRes.data.data);
            }

            setSummary(summaryRes.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCredentials = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await paymentGatewayAPI.saveCredentials(credentials);
            alert('✅ Credentials saved successfully!');
        } catch (error) {
            console.error('Error saving credentials:', error);
            alert('❌ Failed to save credentials');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSchedule = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await paymentGatewayAPI.updateSchedule(schedule);
            alert('✅ Schedule updated successfully!');
            await fetchData();
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('❌ Failed to save schedule');
        } finally {
            setSaving(false);
        }
    };

    const handleRunManualCheck = async () => {
        if (!window.confirm('Run payment gateway check now? This may take 1-2 minutes.')) {
            return;
        }

        setChecking(true);

        try {
            const response = await paymentGatewayAPI.runManualCheck();
            alert(`✅ Check completed!\n\nTotal: ${response.data.data.summary.total}\nSuccess: ${response.data.data.summary.success}\nFailed: ${response.data.data.summary.failed}`);
            await fetchData();
        } catch (error) {
            console.error('Error running check:', error);
            alert('❌ Check failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setChecking(false);
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
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">💳 Payment Gateway Monitor</h1>
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
                        <button className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">
                            Payment Monitor
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

                {/* Dashboard Summary */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600">Total Transactions</p>
                                    <p className="text-3xl font-bold text-gray-900">{summary.counts.total_count}</p>
                                </div>
                                <div className="text-4xl">📊</div>
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm text-green-700">Success</p>
                                    <p className="text-3xl font-bold text-green-900">{summary.counts.success_count}</p>
                                </div>
                                <div className="text-4xl">✅</div>
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm text-red-700">Failed</p>
                                    <p className="text-3xl font-bold text-red-900">{summary.counts.failed_count}</p>
                                </div>
                                <div className="text-4xl">❌</div>
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm text-blue-700">Status</p>
                                    <p className="text-lg font-bold text-blue-900">
                                        {schedule.is_enabled ? '✅ Active' : '⏸️ Paused'}
                                    </p>
                                </div>
                                <div className="text-4xl">⏰</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Last Check Info */}
                {summary?.lastCheck && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h3 className="text-lg font-semibold mb-4">Last Check</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-gray-600">Started</p>
                                <p className="font-medium">{new Date(summary.lastCheck.check_started_at).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Completed</p>
                                <p className="font-medium">{summary.lastCheck.check_completed_at ? new Date(summary.lastCheck.check_completed_at).toLocaleString() : 'In progress...'}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Found</p>
                                <p className="font-medium">{summary.lastCheck.total_transactions_found} transactions</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Status</p>
                                <p className={`font-medium ${summary.lastCheck.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {summary.lastCheck.status}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Gateway Credentials */}
                <div className="bg-white rounded-lg shadow p-8 mb-8">
                    <h2 className="text-xl font-semibold mb-4">🔐 Gateway Credentials</h2>
                    <form onSubmit={handleSaveCredentials} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Login URL</label>
                            <input
                                type="url"
                                value={credentials.login_url}
                                onChange={(e) => setCredentials({ ...credentials, login_url: e.target.value })}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={credentials.username}
                                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    placeholder="Enter password to update"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Credentials'}
                        </button>
                    </form>
                </div>

                {/* Schedule Settings */}
                <div className="bg-white rounded-lg shadow p-8 mb-8">
                    <h2 className="text-xl font-semibold mb-4">⏰ Schedule Settings</h2>
                    <form onSubmit={handleSaveSchedule} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check Interval</label>
                                <select
                                    value={schedule.check_interval_hours}
                                    onChange={(e) => setSchedule({ ...schedule, check_interval_hours: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={3}>Every 3 hours</option>
                                    <option value={4}>Every 4 hours</option>
                                    <option value={5}>Every 5 hours</option>
                                    <option value={10}>Every 10 hours</option>
                                    <option value={12}>Every 12 hours</option>
                                    <option value={24}>Every 24 hours (Daily)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                                <input
                                    type="email"
                                    value={schedule.admin_email}
                                    onChange={(e) => setSchedule({ ...schedule, admin_email: e.target.value })}
                                    required
                                    placeholder="admin@example.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={schedule.is_enabled}
                                onChange={(e) => setSchedule({ ...schedule, is_enabled: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <label className="text-sm font-medium text-gray-700">Enable Automated Checking</label>
                        </div>
                        {schedule.next_run_at && (
                            <p className="text-sm text-gray-600">
                                Next scheduled check: {new Date(schedule.next_run_at).toLocaleString()}
                            </p>
                        )}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Schedule'}
                            </button>
                            <button
                                type="button"
                                onClick={handleRunManualCheck}
                                disabled={checking}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {checking ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Checking...
                                    </>
                                ) : (
                                    '▶️ Run Check Now'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Recent Transactions */}
                {summary?.recentTransactions && summary.recentTransactions.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-8">
                        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thank You</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {summary.recentTransactions.map((transaction) => (
                                        <tr key={transaction.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(transaction.discovered_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.customer_name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.amount || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${transaction.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {transaction.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {transaction.thank_you_email_sent ? '✅ Sent' : '⏳ Pending'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PaymentGatewaySettings;