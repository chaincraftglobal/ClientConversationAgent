import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { merchantAPI } from '../services/api';

const MerchantDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('card'); // ✅ ADD THIS - 'card' or 'list'

    const [dashboardData, setDashboardData] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [conversations, setConversations] = useState([]);


    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [dashboardRes, accountsRes, conversationsRes] = await Promise.all([
                merchantAPI.getDashboard(),
                merchantAPI.getAllAccounts(),
                merchantAPI.getAllConversations()
            ]);

            setDashboardData(dashboardRes.data.data);
            setAccounts(accountsRes.data.data.accounts);
            setConversations(conversationsRes.data.data.conversations);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleMarkAsReplied = async (conversationId) => {
        if (!window.confirm('Mark this conversation as replied?')) return;
        try {
            await merchantAPI.markAsReplied(conversationId);
            alert('✅ Marked as replied! Follow-up scheduled for 18 hours.');
            fetchData();
        } catch (error) {
            console.error('Error marking as replied:', error);
            alert('❌ Failed to mark as replied');
        }
    };

  const handleSnooze = async (conversationId) => {
    const hours = prompt('Snooze reminder for how many hours?', '3');
    if (!hours) return;
    
    try {
        const hoursNum = parseInt(hours);
        const minutes = hoursNum * 60; // ✅ Convert to minutes
        
        await merchantAPI.snoozeReminder(conversationId, minutes); // ✅ Send minutes
        alert(`✅ Reminder snoozed for ${hoursNum} hour(s)`);
        fetchData();
    } catch (error) {
        console.error('Error snoozing reminder:', error);
        alert('❌ Failed to snooze reminder');
    }
};

    const handleDeleteAccount = async (accountId) => {
        if (!window.confirm('Delete this merchant account? This will delete all conversations too!')) return;
        try {
            await merchantAPI.deleteAccount(accountId);
            alert('✅ Merchant account deleted');
            fetchData();
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('❌ Failed to delete account');
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
                    <h1 className="text-2xl font-bold text-gray-900">📧 Merchant Email Manager</h1>
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
                        <button onClick={() => navigate('/dashboard')} className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">
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
                        <button onClick={() => navigate('/merchants')} className="text-gray-600 hover:text-gray-900">
                            📧 Merchant Manager
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

                {/* Dashboard Summary */}
                {dashboardData && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600">Active Accounts</p>
                                    <p className="text-3xl font-bold text-gray-900">{dashboardData.accountCount}</p>
                                </div>
                                <div className="text-4xl">📧</div>
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm text-red-700">Need Reply</p>
                                    <p className="text-3xl font-bold text-red-900">{dashboardData.stats.need_reply_count}</p>
                                </div>
                                <div className="text-4xl">⏰</div>
                            </div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm text-yellow-700">Awaiting Response</p>
                                    <p className="text-3xl font-bold text-yellow-900">{dashboardData.stats.awaiting_count}</p>
                                </div>
                                <div className="text-4xl">📤</div>
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm text-blue-700">Pending Reminders</p>
                                    <p className="text-3xl font-bold text-blue-900">{dashboardData.pendingReminders}</p>
                                </div>
                                <div className="text-4xl">🔔</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Merchant Accounts Section */}
                {/* Merchant Accounts Section */}
                <div className="bg-white rounded-lg shadow p-8 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Merchant Accounts</h2>
                        <div className="flex gap-3">
                            {/* View Toggle */}
                            <div className="flex bg-gray-200 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('card')}
                                    className={`px-3 py-1 rounded ${viewMode === 'card' ? 'bg-white shadow' : ''}`}
                                >
                                    📇 Cards
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                                >
                                    📋 List
                                </button>
                            </div>
                            <button
                                onClick={() => navigate('/merchants/add')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                ➕ Add Merchant Account
                            </button>
                        </div>
                    </div>

                    {accounts.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No merchant accounts yet. Add your first one!</p>
                    ) : (
                        <>
                            {/* Card View */}
                            {viewMode === 'card' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {accounts.map(account => (
                                        <div key={account.id} className="border rounded-lg p-4 hover:shadow-md transition">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-lg">{account.merchant_name}</h3>
                                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {account.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-1">{account.email}</p>
                                            <p className="text-xs text-gray-500 mb-3">→ {account.notification_email}</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => navigate(`/merchants/view/${account.id}`)}
                                                    className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                                >
                                                    👁️ View
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/merchants/edit/${account.id}`)}
                                                    className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAccount(account.id)}
                                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* List View */}
                            {viewMode === 'list' && (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notification Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {accounts.map(account => (
                                                <tr key={account.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-medium text-gray-900">{account.merchant_name}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {account.email}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {account.notification_email}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {account.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => navigate(`/merchants/view/${account.id}`)}
                                                                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                                            >
                                                                👁️ View
                                                            </button>
                                                            <button
                                                                onClick={() => navigate(`/merchants/edit/${account.id}`)}
                                                                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAccount(account.id)}
                                                                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Conversations Need Reply */}
                <div className="bg-white rounded-lg shadow p-8">
                    <h2 className="text-xl font-semibold mb-4">Conversations Needing Reply</h2>

                    {conversations.filter(c => c.reply_required && !c.reply_sent).length === 0 ? (
                        <p className="text-gray-500 text-center py-8">🎉 All caught up! No replies needed.</p>
                    ) : (
                        <div className="space-y-4">
                            {conversations.filter(c => c.reply_required && !c.reply_sent).map(conversation => (
                                <div key={conversation.id} className="border rounded-lg p-4 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-blue-600">{conversation.merchant_name}</span>
                                                {conversation.pending_reminders > 0 && (
                                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                                        {conversation.pending_reminders} reminder(s)
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600"><strong>From:</strong> {conversation.from_email}</p>
                                            <p className="text-sm font-medium mt-1">{conversation.subject}</p>
                                            <p className="text-xs text-gray-500 mt-2">{conversation.body_text?.substring(0, 150)}...</p>
                                            <p className="text-xs text-gray-400 mt-2">
                                                Received: {new Date(conversation.email_received_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <button
                                                onClick={() => handleMarkAsReplied(conversation.id)}
                                                className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm"
                                            >
                                                ✅ Mark Replied
                                            </button>
                                            <button
                                                onClick={() => handleSnooze(conversation.id)}
                                                className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 text-sm"
                                            >
                                                ⏰ Snooze
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>


        </div>
    );
};

export default MerchantDashboard;