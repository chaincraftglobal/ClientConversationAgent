import React, { useState, useEffect } from 'react';
import { agentAPI, clientAPI, assignmentAPI, messageAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState({
        agents: 0,
        clients: 0,
        assignments: 0,
        totalMessages: 0
    });
    const [timeRange, setTimeRange] = useState('daily'); // daily, monthly, quarterly
    const [chartData, setChartData] = useState([]);
    const [agentPerformance, setAgentPerformance] = useState([]);
    const [messageDistribution, setMessageDistribution] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();
    }, [timeRange]);

    const fetchDashboardData = async () => {
        try {
            const [agentsRes, clientsRes, assignmentsRes] = await Promise.all([
                agentAPI.getAll(),
                clientAPI.getAll(),
                assignmentAPI.getAll()
            ]);

            const agents = agentsRes.data.data.agents;
            const assignments = assignmentsRes.data.data.assignments;

            // Fetch all messages for all assignments
            const messagePromises = assignments.map(a =>
                messageAPI.getByAssignment(a.id).catch(() => ({ data: { data: { messages: [] } } }))
            );
            const messagesResults = await Promise.all(messagePromises);
            const allMessages = messagesResults.flatMap(r => r.data.data.messages);

            setStats({
                agents: agentsRes.data.data.count,
                clients: clientsRes.data.data.count,
                assignments: assignmentsRes.data.data.count,
                totalMessages: allMessages.length
            });

            // Process chart data based on time range
            processChartData(allMessages, assignments, agents);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processChartData = (messages, assignments, agents) => {
        const now = new Date();
        let dataPoints = [];

        if (timeRange === 'daily') {
            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const dayMessages = messages.filter(m => {
                    const msgDate = new Date(m.created_at).toISOString().split('T')[0];
                    return msgDate === dateStr;
                });

                dataPoints.push({
                    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    messages: dayMessages.length,
                    agent: dayMessages.filter(m => m.sender_type === 'agent').length,
                    client: dayMessages.filter(m => m.sender_type === 'client').length
                });
            }
        } else if (timeRange === 'monthly') {
            // Last 6 months
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now);
                date.setMonth(date.getMonth() - i);
                const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                const monthMessages = messages.filter(m => {
                    const msgMonth = new Date(m.created_at).toISOString().slice(0, 7);
                    return msgMonth === monthStr;
                });

                dataPoints.push({
                    date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    messages: monthMessages.length,
                    agent: monthMessages.filter(m => m.sender_type === 'agent').length,
                    client: monthMessages.filter(m => m.sender_type === 'client').length
                });
            }
        } else if (timeRange === 'quarterly') {
            // Last 4 quarters
            for (let i = 3; i >= 0; i--) {
                const date = new Date(now);
                date.setMonth(date.getMonth() - (i * 3));
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                const year = date.getFullYear();

                const startMonth = (quarter - 1) * 3;
                const endMonth = startMonth + 3;

                const quarterMessages = messages.filter(m => {
                    const msgDate = new Date(m.created_at);
                    return msgDate.getFullYear() === year &&
                        msgDate.getMonth() >= startMonth &&
                        msgDate.getMonth() < endMonth;
                });

                dataPoints.push({
                    date: `Q${quarter} ${year}`,
                    messages: quarterMessages.length,
                    agent: quarterMessages.filter(m => m.sender_type === 'agent').length,
                    client: quarterMessages.filter(m => m.sender_type === 'client').length
                });
            }
        }

        setChartData(dataPoints);

        // Agent Performance
        const agentStats = agents.map(agent => {
            const agentAssignments = assignments.filter(a => a.agent_id === agent.id);
            const agentMessages = messages.filter(m =>
                agentAssignments.some(a => a.id === m.assignment_id) && m.sender_type === 'agent'
            );

            return {
                name: agent.name,
                messages: agentMessages.length,
                conversations: agentAssignments.length
            };
        });
        setAgentPerformance(agentStats);

        // Message Distribution
        const agentMsgs = messages.filter(m => m.sender_type === 'agent').length;
        const clientMsgs = messages.filter(m => m.sender_type === 'client').length;
        setMessageDistribution([
            { name: 'Agent Messages', value: agentMsgs, color: '#3B82F6' },
            { name: 'Client Messages', value: clientMsgs, color: '#10B981' }
        ]);
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
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-600">Welcome, {user?.full_name || user?.email}</span>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
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

                        <button onClick={() => navigate('/welcome-emails')}>
                            📧 Welcome Emails
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Loading analytics...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm">Total Agents</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.agents}</p>
                                    </div>
                                    <div className="bg-blue-100 p-3 rounded-full">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm">Total Clients</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.clients}</p>
                                    </div>
                                    <div className="bg-green-100 p-3 rounded-full">
                                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm">Active Conversations</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.assignments}</p>
                                    </div>
                                    <div className="bg-purple-100 p-3 rounded-full">
                                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm">Total Messages</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalMessages}</p>
                                    </div>
                                    <div className="bg-orange-100 p-3 rounded-full">
                                        <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>


                            {/* Payment Gateway Monitor Card */}

                        </div>

                        {/* Time Range Selector */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Conversation Trends</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setTimeRange('daily')}
                                        className={`px-4 py-2 rounded-lg font-medium transition ${timeRange === 'daily'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Daily
                                    </button>
                                    <button
                                        onClick={() => setTimeRange('monthly')}
                                        className={`px-4 py-2 rounded-lg font-medium transition ${timeRange === 'monthly'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setTimeRange('quarterly')}
                                        className={`px-4 py-2 rounded-lg font-medium transition ${timeRange === 'quarterly'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Quarterly
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Line Chart - Message Trends */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Activity Over Time</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="agent" stroke="#3B82F6" strokeWidth={2} name="Agent Messages" />
                                    <Line type="monotone" dataKey="client" stroke="#10B981" strokeWidth={2} name="Client Messages" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Bar Chart - Agent Performance */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={agentPerformance}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="messages" fill="#3B82F6" name="Messages Sent" />
                                        <Bar dataKey="conversations" fill="#8B5CF6" name="Conversations" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Pie Chart - Message Distribution */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Distribution</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={messageDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {messageDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;