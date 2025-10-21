import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignmentAPI, messageAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ReplyCountdown from '../components/ReplyCountdown';

const Chat = () => {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssignments();
    }, []);

    useEffect(() => {
        if (assignmentId && assignments.length > 0) {
            loadConversation(assignmentId);
        }
    }, [assignmentId, assignments]);

    const fetchAssignments = async () => {
        try {
            const response = await assignmentAPI.getAll();
            setAssignments(response.data.data.assignments);

            // If no assignmentId in URL, select first one
            if (!assignmentId && response.data.data.assignments.length > 0) {
                const firstId = response.data.data.assignments[0].id;
                navigate(`/chat/${firstId}`, { replace: true });
            }
        } catch (error) {
            console.error('Error fetching assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadConversation = async (id) => {
        try {
            const assignment = assignments.find(a => a.id === parseInt(id));
            setSelectedAssignment(assignment);

            const response = await messageAPI.getByAssignment(id);
            setMessages(response.data.data.messages);
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    };

    const handleSelectConversation = (id) => {
        const assignment = assignments.find(a => a.id === id);
        setSelectedAssignment(assignment);
        navigate(`/chat/${id}`);
        loadConversation(id);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Top Header */}
            <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 shadow-lg">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="hover:bg-white hover:bg-opacity-20 px-3 py-1 rounded transition"
                        >
                            ← Back
                        </button>
                        <h1 className="text-xl font-bold">Conversations</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm">{user?.full_name || user?.email}</span>
                        <button
                            onClick={handleLogout}
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Chat Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Conversations List */}
                <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="font-semibold text-gray-800">All Conversations</h2>
                        <p className="text-sm text-gray-500">{assignments.length} active chats</p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {assignments.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <p>No conversations yet.</p>
                                <button
                                    onClick={() => navigate('/assignments')}
                                    className="mt-4 text-blue-600 hover:underline"
                                >
                                    Create an assignment
                                </button>
                            </div>
                        ) : (
                            assignments.map((assignment) => (
                                <div
                                    key={assignment.id}
                                    onClick={() => handleSelectConversation(assignment.id)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${selectedAssignment?.id === assignment.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                    {assignment.client_name.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 text-sm">
                                                        {assignment.client_name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500">
                                                        Agent: {assignment.agent_name}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-2 line-clamp-1">
                                                {assignment.project_name || 'No project name'}
                                            </p>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {assignment.assigned_at ? formatDate(assignment.assigned_at) : ''}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Side - Chat Area */}
                <div className="flex-1 flex flex-col bg-gray-50">
                    {selectedAssignment ? (
                        <>
                            {/* Chat Header */}
                            <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                            {selectedAssignment.client_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-gray-900">{selectedAssignment.client_name}</h2>
                                            <p className="text-sm text-gray-500">
                                                {selectedAssignment.client_company || selectedAssignment.client_email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-700">
                                            {selectedAssignment.project_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Agent: {selectedAssignment.agent_name}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {/* ✅ ADD THIS - Reply Countdown Status */}
                                {selectedAssignment && (
                                    <ReplyCountdown assignmentId={selectedAssignment.id} />
                                )}
                                {messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center text-gray-400">
                                            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            <p className="text-lg">No messages yet</p>
                                            <p className="text-sm mt-2">The conversation will appear here</p>
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${message.sender_type === 'agent'
                                                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                                                    : 'bg-white text-gray-900'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-xs">
                                                        {message.sender_type === 'agent' ? '🤖 Agent' : '👤 Client'}
                                                    </span>
                                                    <span className={`text-xs ${message.sender_type === 'agent' ? 'text-blue-100' : 'text-gray-400'}`}>
                                                        {formatDate(message.email_sent_at || message.email_received_at || message.created_at)}
                                                    </span>
                                                </div>
                                                {message.subject && (
                                                    <div className={`font-semibold text-sm mb-2 pb-2 border-b ${message.sender_type === 'agent' ? 'border-blue-400' : 'border-gray-200'
                                                        }`}>
                                                        {message.subject}
                                                    </div>
                                                )}
                                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                                    {message.body_text}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Bottom Info Bar (No input) */}
                            <div className="bg-white border-t border-gray-200 p-4">
                                <div className="text-center text-sm text-gray-500">
                                    <p>💬 Email conversations are monitored automatically</p>
                                    <p className="text-xs mt-1">AI responds to client emails every 3 minutes</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-gray-400">
                                <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-xl font-semibold">Select a conversation</p>
                                <p className="text-sm mt-2">Choose a chat from the left to view messages</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chat;