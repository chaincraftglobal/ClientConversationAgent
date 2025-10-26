import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { welcomeEmailAPI } from '../services/api';
import './WelcomeEmailDashboard.css';

const WelcomeEmailDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [runningManual, setRunningManual] = useState(false);

    useEffect(() => {
        loadDashboard();
        const interval = setInterval(loadDashboard, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const loadDashboard = async () => {
        try {
            const [statsRes, logsRes] = await Promise.all([
                welcomeEmailAPI.getStats(),
                welcomeEmailAPI.getLogs({ limit: 20 })
            ]);

            setStats(statsRes.data.data);
            setLogs(logsRes.data.data);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRunNow = async () => {
        if (!window.confirm('Run welcome email check now?')) return;

        setRunningManual(true);
        try {
            const response = await welcomeEmailAPI.runNow();
            alert(`Success! Sent: ${response.data.data.sent}, Failed: ${response.data.data.failed}`);
            loadDashboard();
        } catch (error) {
            alert('Error running check: ' + error.message);
        } finally {
            setRunningManual(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleString();
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="welcome-email-dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>📧 Auto Thank You Email Manager</h1>
                    <p>Automated welcome emails for successful transactions</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-settings"
                        onClick={() => navigate('/welcome-emails/settings')}
                    >
                        ⚙️ Settings
                    </button>
                    <button
                        className="btn-run-now"
                        onClick={handleRunNow}
                        disabled={runningManual}
                    >
                        {runningManual ? '⏳ Running...' : '▶️ Run Now'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card blue">
                    <div className="stat-icon">📬</div>
                    <div className="stat-content">
                        <div className="stat-label">Sent Today</div>
                        <div className="stat-value">{stats?.sentToday || 0}</div>
                    </div>
                </div>

                <div className="stat-card green">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Sent</div>
                        <div className="stat-value">{stats?.sentTotal || 0}</div>
                    </div>
                </div>

                <div className="stat-card red">
                    <div className="stat-icon">❌</div>
                    <div className="stat-content">
                        <div className="stat-label">Failed Today</div>
                        <div className="stat-value">{stats?.failedToday || 0}</div>
                    </div>
                </div>

                <div className="stat-card purple">
                    <div className="stat-icon">⏰</div>
                    <div className="stat-content">
                        <div className="stat-label">Last Run</div>
                        <div className="stat-value-small">
                            {stats?.lastRunAt ? new Date(stats.lastRunAt).toLocaleTimeString() : 'Never'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule Info */}
            <div className="schedule-info">
                <div className="info-box">
                    <span className="info-label">📅 Schedule:</span>
                    <span className="info-value">Every 6 hours (00:00, 06:00, 12:00, 18:00)</span>
                </div>
                <div className="info-box">
                    <span className="info-label">⏭️ Next Run:</span>
                    <span className="info-value">{formatDate(stats?.nextRunAt)}</span>
                </div>
            </div>

            {/* Recent Logs Table */}
            <div className="logs-section">
                <h2>📋 Recent Email Logs</h2>

                {logs.length === 0 ? (
                    <div className="no-data">
                        <p>No emails sent yet</p>
                        <p>Welcome emails will appear here when SUCCESS transactions are detected</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="logs-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Email</th>
                                    <th>Amount</th>
                                    <th>Transaction ID</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id}>
                                        <td>{formatDate(log.created_at)}</td>
                                        <td>{log.customer_name || 'N/A'}</td>
                                        <td>{log.customer_email}</td>
                                        <td>₹{log.amount || 'N/A'}</td>
                                        <td><code>{log.transaction_id}</code></td>
                                        <td>
                                            <span className={`status-badge status-${log.email_status}`}>
                                                {log.email_status === 'sent' && '✅ Sent'}
                                                {log.email_status === 'failed' && '❌ Failed'}
                                                {log.email_status === 'pending' && '⏳ Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WelcomeEmailDashboard;