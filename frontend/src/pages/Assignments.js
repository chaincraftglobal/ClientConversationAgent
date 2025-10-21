import React, { useState, useEffect } from 'react';
import { assignmentAPI, agentAPI, clientAPI, messageAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Assignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [agents, setAgents] = useState([]);
    const [clients, setClients] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);
    const [pendingReplies, setPendingReplies] = useState({}); // ✅ ADD THIS

    const [formData, setFormData] = useState({
        agent_id: '',
        client_id: '',
        project_name: '',
        project_description: '',
        project_brief: '',
        conversation_instructions: '',
        key_points: '',
        client_requirements: '',
        budget: '',
        deadline: ''
    });

    const navigate = useNavigate();
    const { user, logout } = useAuth();

    useEffect(() => {
        fetchData();
        fetchPendingReplies();

        // Refresh pending replies every 10 seconds
        const interval = setInterval(fetchPendingReplies, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [assignmentsRes, agentsRes, clientsRes] = await Promise.all([
                assignmentAPI.getAll(),
                agentAPI.getAll(),
                clientAPI.getAll()
            ]);
            setAssignments(assignmentsRes.data.data.assignments);
            setAgents(agentsRes.data.data.agents);
            setClients(clientsRes.data.data.clients);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingReplies = async () => {
        try {
            const response = await messageAPI.getPendingReplies();
            const repliesMap = {};
            response.data.data.pendingReplies.forEach(reply => {
                repliesMap[reply.assignment_id] = reply;
            });
            setPendingReplies(repliesMap);
        } catch (error) {
            console.error('Error fetching pending replies:', error);
        }
    };

    const fetchMessages = async (assignmentId) => {
        try {
            const response = await messageAPI.getByAssignment(assignmentId);
            setMessages(response.data.data.messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleViewChat = async (assignment) => {
        setSelectedAssignment(assignment);
        await fetchMessages(assignment.id);
        setShowChatModal(true);
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
            await assignmentAPI.create(formData);
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error creating assignment:', error);
            alert(error.response?.data?.message || 'Failed to create assignment');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this assignment?')) {
            try {
                await assignmentAPI.delete(id);
                fetchData();
            } catch (error) {
                console.error('Error deleting assignment:', error);
                alert('Failed to delete assignment');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            agent_id: '',
            client_id: '',
            project_name: '',
            project_description: '',
            project_brief: '',
            conversation_instructions: '',
            key_points: '',
            client_requirements: '',
            budget: '',
            deadline: ''
        });
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Assignments & Conversations</h1>
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
                        <button className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">
                            Assignments
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">All Assignments ({assignments.length})</h2>
                    <button
                        onClick={() => navigate('/assignments/create')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        + Create Assignment
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <p className="text-gray-500 text-lg">No assignments yet. Create your first assignment!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assignments.map((assignment) => (
                            <div key={assignment.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">{assignment.project_name || 'Untitled Project'}</h3>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${assignment.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {assignment.status}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center text-sm">
                                        <span className="text-gray-500 w-20">Agent:</span>
                                        <span className="font-medium text-gray-900">{assignment.agent_name}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <span className="text-gray-500 w-20">Client:</span>
                                        <span className="font-medium text-gray-900">{assignment.client_name}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <span className="text-gray-500 w-20">Company:</span>
                                        <span className="text-gray-700">{assignment.client_company || '-'}</span>
                                    </div>
                                </div>

                                {/* Reply Settings Badges */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        💬 {assignment.reply_tone_preference || 'professional'}
                                    </span>
                                    {assignment.enable_smart_timing !== false && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            🤖 Smart Timing
                                        </span>
                                    )}
                                    {assignment.min_reply_delay_minutes && assignment.max_reply_delay_minutes && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            ⏱️ {assignment.min_reply_delay_minutes}-{assignment.max_reply_delay_minutes}min
                                        </span>
                                    )}
                                </div>

                                {/* ✅ ADD THIS - Live Reply Status */}
                                {pendingReplies[assignment.id] && (
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">⏳</span>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-blue-900">
                                                    Replying in {pendingReplies[assignment.id].minutes_until_reply} minutes
                                                </p>
                                                <p className="text-xs text-blue-700">
                                                    Urgency: {pendingReplies[assignment.id].urgency_level}/10 •
                                                    Tone: {pendingReplies[assignment.id].emotional_tone}
                                                </p>
                                            </div>
                                            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                                                {pendingReplies[assignment.id].reply_status}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {assignment.project_description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{assignment.project_description}</p>
                                )}

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => navigate(`/chat/${assignment.id}`)}
                                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold"
                                    >
                                        💬 View Chat
                                    </button>
                                    <button
                                        onClick={() => handleDelete(assignment.id)}
                                        className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Assignment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                        <h3 className="text-xl font-bold mb-4">Create New Assignment</h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
                                    <select
                                        name="agent_id"
                                        value={formData.agent_id}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Select Agent</option>
                                        {agents.map(agent => (
                                            <option key={agent.id} value={agent.id}>{agent.name} ({agent.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                                    <select
                                        name="client_id"
                                        value={formData.client_id}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Select Client</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.name} ({client.email})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Project Basic Info */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">📋 Project Information</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                                        <input
                                            type="text"
                                            name="project_name"
                                            value={formData.project_name}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            placeholder="e.g., Real Estate CRM Development"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                                            <input
                                                type="text"
                                                name="budget"
                                                value={formData.budget}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                                placeholder="e.g., $2,880.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                                            <input
                                                type="date"
                                                name="deadline"
                                                value={formData.deadline}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
                                        <textarea
                                            name="project_description"
                                            value={formData.project_description}
                                            onChange={handleInputChange}
                                            rows="2"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            placeholder="Brief overview of the project..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Project Brief */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">📄 Detailed Project Brief</h4>
                                <p className="text-sm text-gray-600 mb-3">Complete project details, scope, and deliverables</p>
                                <textarea
                                    name="project_brief"
                                    value={formData.project_brief}
                                    onChange={handleInputChange}
                                    rows="5"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="Example:
- Real Estate CRM Software (Standard Edition)
- 3-Month Support included
- Optional future modifications (2-3 days dev time, no extra cost)
- Database design for property listings
- User management system
- Reporting dashboard
- Mobile responsive design"
                                />
                            </div>

                            {/* Client Requirements */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">✅ Client Requirements & Expectations</h4>
                                <textarea
                                    name="client_requirements"
                                    value={formData.client_requirements}
                                    onChange={handleInputChange}
                                    rows="4"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="Example:
- Must support 1000+ property listings
- Integration with Google Maps
- Email notification system
- Admin and agent role separation
- Export data to Excel/PDF
- Payment gateway integration"
                                />
                            </div>

                            {/* AI Conversation Instructions */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">🤖 AI Conversation Instructions</h4>
                                <p className="text-sm text-gray-600 mb-3">Tell the AI how to handle this client and project</p>
                                <textarea
                                    name="conversation_instructions"
                                    value={formData.conversation_instructions}
                                    onChange={handleInputChange}
                                    rows="5"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="Example:
- Be professional but friendly
- Client is in real estate business in Philippines
- Already paid $2,880.00 on October 15, 2025
- Project is currently in development
- Expected delivery within 24 hours with installation guide
- Client prefers WhatsApp for urgent matters
- Respond within 2-3 hours during business hours
- Always confirm requirements before proceeding
- Update client weekly on progress"
                                />
                            </div>

                            {/* Key Discussion Points */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">🎯 Key Points to Remember</h4>
                                <textarea
                                    name="key_points"
                                    value={formData.key_points}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="Example:
- Client is experienced in real estate
- Lives in Cebu City, Philippines
- Prefers detailed technical explanations
- Available for calls Monday-Friday 9 AM - 6 PM PHT
- Wants weekly progress updates"
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
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                                >
                                    Create Assignment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {showChatModal && selectedAssignment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
                        {/* Chat Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold">{selectedAssignment.project_name || 'Conversation'}</h3>
                                    <p className="text-sm opacity-90">
                                        {selectedAssignment.agent_name} ↔ {selectedAssignment.client_name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowChatModal(false)}
                                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                            {messages.length === 0 ? (
                                <div className="text-center text-gray-500 py-12">
                                    No messages yet. The conversation will appear here.
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-lg p-4 ${message.sender_type === 'agent'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white text-gray-900 shadow'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-sm">
                                                    {message.sender_type === 'agent' ? '🤖 Agent' : '👤 Client'}
                                                </span>
                                                <span className={`text-xs ${message.sender_type === 'agent' ? 'text-blue-100' : 'text-gray-500'}`}>
                                                    {formatDate(message.email_sent_at || message.email_received_at || message.created_at)}
                                                </span>
                                            </div>
                                            {message.subject && (
                                                <div className={`font-semibold mb-2 ${message.sender_type === 'agent' ? 'text-blue-100' : 'text-gray-700'}`}>
                                                    {message.subject}
                                                </div>
                                            )}
                                            <div className="whitespace-pre-wrap">{message.body_text}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Close Button */}
                        <div className="p-4 border-t bg-white rounded-b-lg">
                            <button
                                onClick={() => setShowChatModal(false)}
                                className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assignments;