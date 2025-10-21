import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { assignmentAPI, agentAPI, clientAPI } from '../services/api';

const CreateAssignment = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState([]);
    const [clients, setClients] = useState([]);

    const [formData, setFormData] = useState({
        agent_id: '',
        client_id: '',
        project_name: '',
        budget: '',
        deadline: '',
        project_description: '',
        detailed_brief: '',
        client_requirements: '',
        ai_instructions: '',
        key_points: '',
        reply_tone_preference: 'professional',  // ✅ ADD THIS
        enable_smart_timing: true,              // ✅ ADD THIS
        min_reply_delay_minutes: 15,            // ✅ ADD THIS
        max_reply_delay_minutes: 90             // ✅ ADD THIS
    });

    useEffect(() => {
        fetchAgentsAndClients();
    }, []);

    const fetchAgentsAndClients = async () => {
        try {
            const [agentsRes, clientsRes] = await Promise.all([
                agentAPI.getAll(),
                clientAPI.getAll()
            ]);
            setAgents(agentsRes.data.data.agents);
            setClients(clientsRes.data.data.clients);
        } catch (error) {
            console.error('Error fetching data:', error);
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
        setLoading(true);

        try {
            await assignmentAPI.create(formData);
            navigate('/assignments');
        } catch (error) {
            console.error('Error creating assignment:', error);
            alert(error.response?.data?.message || 'Failed to create assignment');
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
                    <h1 className="text-2xl font-bold text-gray-900">Create New Assignment</h1>
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
                        <button onClick={() => navigate('/assignments')} className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">
                            Assignments
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Assignment Details</h2>
                        <button
                            onClick={() => navigate('/assignments')}
                            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                        >
                            ← Back to Assignments
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Agent & Client Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
                                <select
                                    name="agent_id"
                                    value={formData.agent_id}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Agent</option>
                                    {agents.map(agent => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.name} ({agent.email})
                                        </option>
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} ({client.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Project Information Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Project Information</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                                    <input
                                        type="text"
                                        name="project_name"
                                        value={formData.project_name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
                                    <textarea
                                        name="project_description"
                                        value={formData.project_description}
                                        onChange={handleInputChange}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Brief overview of the project..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Detailed Project Brief Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">📝 Detailed Project Brief</h3>
                            <p className="text-sm text-gray-600 mb-4">Complete project details, scope, and deliverables</p>
                            <textarea
                                name="detailed_brief"
                                value={formData.detailed_brief}
                                onChange={handleInputChange}
                                rows="6"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder={`Example:
- Real Estate CRM Software (Standard Edition)
- 3-Month Support included
- Optional future modifications (2-3 days dev time, no extra cost)
- Database design for property listings`}
                            />
                        </div>

                        {/* Client Requirements Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">✅ Client Requirements & Expectations</h3>
                            <textarea
                                name="client_requirements"
                                value={formData.client_requirements}
                                onChange={handleInputChange}
                                rows="6"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder={`Example:
- Must support 1000+ property listings
- Integration with Google Maps
- Email notification system
- Admin panel to track properties`}
                            />
                        </div>

                        {/* AI Instructions Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">🤖 AI Conversation Instructions</h3>
                            <p className="text-sm text-gray-600 mb-4">Tell the AI how to handle this client and project</p>
                            <textarea
                                name="ai_instructions"
                                value={formData.ai_instructions}
                                onChange={handleInputChange}
                                rows="6"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder={`Example:
- Project is currently in development
- Expected delivery within 90 hours with installation guide
- Client prefers WhatsApp for urgent matters
- Respond within 2-3 hours during business hours
- Always confirm requirements before proceeding
- Update client weekly on progress`}
                            />
                        </div>

                        {/* Key Points Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">🎯 Key Points to Remember</h3>
                            <textarea
                                name="key_points"
                                value={formData.key_points}
                                onChange={handleInputChange}
                                rows="5"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder={`Example:
- Client is experienced in real estate
- Lives in Cebu City, Philippines
- Prefers early morning communication
- Very detail-oriented`}
                            />
                        </div>

                        {/* Smart Reply Settings Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">🤖 Smart Reply Settings</h3>
                            <p className="text-sm text-gray-600 mb-4">Configure how the AI should respond to this client</p>

                            <div className="space-y-4">
                                {/* Reply Tone */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reply Tone Preference</label>
                                    <select
                                        name="reply_tone_preference"
                                        value={formData.reply_tone_preference}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="professional">Professional - Formal and business-like</option>
                                        <option value="friendly">Friendly - Warm and approachable</option>
                                        <option value="casual">Casual - Relaxed and conversational</option>
                                        <option value="empathetic">Empathetic - Understanding and supportive</option>
                                        <option value="direct">Direct - Clear and to the point</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        AI will adapt its writing style based on this preference
                                    </p>
                                </div>

                                {/* Smart Timing Toggle */}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        name="enable_smart_timing"
                                        checked={formData.enable_smart_timing}
                                        onChange={(e) => setFormData({ ...formData, enable_smart_timing: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Enable Smart Reply Timing</label>
                                        <p className="text-xs text-gray-500">
                                            AI will analyze each message and decide when to reply based on urgency, emotion, and context
                                        </p>
                                    </div>
                                </div>

                                {/* Delay Range */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Minimum Delay (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            name="min_reply_delay_minutes"
                                            value={formData.min_reply_delay_minutes}
                                            onChange={handleInputChange}
                                            min="1"
                                            max="1440"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Fastest possible reply</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Maximum Delay (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            name="max_reply_delay_minutes"
                                            value={formData.max_reply_delay_minutes}
                                            onChange={handleInputChange}
                                            min="1"
                                            max="1440"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Slowest possible reply</p>
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex gap-2">
                                        <span className="text-blue-600 text-lg">💡</span>
                                        <div className="text-sm text-blue-800">
                                            <p className="font-semibold mb-1">How Smart Timing Works:</p>
                                            <ul className="list-disc list-inside space-y-1 text-xs">
                                                <li>Urgent/angry messages → Reply in 10-20 minutes</li>
                                                <li>Questions/confused → Reply in 30-60 minutes</li>
                                                <li>General conversation → Reply in 1-2 hours</li>
                                                <li>Thank you messages → Reply in 2-4 hours</li>
                                                <li>Respects working hours unless urgent (8+ urgency)</li>
                                                <li>Adds human-like randomness (e.g., 2h 17m, not exactly 2h)</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex justify-end gap-4 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => navigate('/assignments')}
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
                                    'Create Assignment'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateAssignment;