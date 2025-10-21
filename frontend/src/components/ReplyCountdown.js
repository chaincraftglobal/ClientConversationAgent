import React, { useState, useEffect } from 'react';

const ReplyCountdown = ({ assignmentId }) => {
    const [replyStatus, setReplyStatus] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [loading, setLoading] = useState(true);

    // Fetch reply status
    useEffect(() => {
        fetchReplyStatus();
        const interval = setInterval(fetchReplyStatus, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, [assignmentId]);

    // Update countdown every second
    useEffect(() => {
        if (replyStatus && replyStatus.hasReplyPending) {
            const interval = setInterval(() => {
                const now = new Date().getTime();
                const scheduledTime = new Date(replyStatus.replyStatus.scheduled_reply_time).getTime();
                const diff = Math.max(0, scheduledTime - now);
                setTimeRemaining(diff);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [replyStatus]);

    const fetchReplyStatus = async () => {
        try {
            const response = await fetch(`/api/messages/reply-status/${assignmentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setReplyStatus(data.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching reply status:', error);
            setLoading(false);
        }
    };

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

    const getStatusDisplay = () => {
        if (!replyStatus || !replyStatus.hasReplyPending) {
            return null;
        }

        const status = replyStatus.replyStatus.reply_status;
        const urgency = replyStatus.replyStatus.urgency_level;
        const tone = replyStatus.replyStatus.emotional_tone;

        if (status === 'analyzing') {
            return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div>
                            <p className="font-semibold text-blue-900">🤔 Agent is analyzing message...</p>
                            <p className="text-sm text-blue-700">Determining urgency and optimal reply time</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (status === 'scheduled') {
            const urgencyColor = urgency >= 8 ? 'red' : urgency >= 5 ? 'yellow' : 'green';
            const urgencyBg = urgency >= 8 ? 'bg-red-50 border-red-200' : urgency >= 5 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
            const urgencyText = urgency >= 8 ? 'text-red-900' : urgency >= 5 ? 'text-yellow-900' : 'text-green-900';

            return (
                <div className={`${urgencyBg} border rounded-lg p-4 mb-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className={`font-bold text-lg ${urgencyText}`}>
                                ⏳ Agent will reply in: {formatTime(timeRemaining)}
                            </p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Urgency: {urgency}/10
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Tone: {tone}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Scheduled: {new Date(replyStatus.replyStatus.scheduled_reply_time).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (status === 'sending') {
            return (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="animate-pulse">
                            <span className="text-2xl">✍️</span>
                        </div>
                        <div>
                            <p className="font-semibold text-green-900">Agent is sending reply now...</p>
                            <p className="text-sm text-green-700">Email being composed and sent</p>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    if (loading) {
        return null;
    }

    return getStatusDisplay();
};

export default ReplyCountdown;