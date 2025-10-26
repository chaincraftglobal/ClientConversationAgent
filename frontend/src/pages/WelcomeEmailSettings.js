import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { welcomeEmailAPI } from '../services/api';
import './WelcomeEmailSettings.css';

const WelcomeEmailSettings = () => {
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const response = await welcomeEmailAPI.getConfig();
            setConfig(response.data.data);
        } catch (error) {
            console.error('Error loading config:', error);
            alert('Error loading configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!window.confirm('Save configuration changes?')) return;

        setSaving(true);
        try {
            await welcomeEmailAPI.updateConfig(config);
            alert('Configuration saved successfully!');
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Error saving configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail) {
            alert('Please enter an email address');
            return;
        }

        if (!window.confirm(`Send test email to ${testEmail}?`)) return;

        setSendingTest(true);
        try {
            await welcomeEmailAPI.testEmail(testEmail);
            alert('Test email sent successfully! Check your inbox.');
            setTestEmail('');
        } catch (error) {
            console.error('Error sending test email:', error);
            alert('Error sending test email: ' + error.message);
        } finally {
            setSendingTest(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading settings...</div>;
    }

    return (
        <div className="welcome-email-settings">
            <div className="settings-header">
                <div>
                    <button
                        className="btn-back"
                        onClick={() => navigate('/welcome-emails')}
                    >
                        ← Back to Dashboard
                    </button>
                    <h1>⚙️ Auto Thank You Email Settings</h1>
                    <p>Configure automated welcome emails for successful transactions</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="settings-form">
                {/* System Status */}
                <div className="settings-section">
                    <h2>System Status</h2>
                    <div className="form-group">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                checked={config?.is_enabled || false}
                                onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-text">
                                {config?.is_enabled ? '✅ Enabled' : '❌ Disabled'}
                            </span>
                        </label>
                        <p className="help-text">
                            When enabled, system automatically sends welcome emails for SUCCESS transactions every 6 hours
                        </p>
                    </div>
                </div>

                {/* Schedule Configuration */}
                <div className="settings-section">
                    <h2>Schedule Configuration</h2>
                    <div className="form-group">
                        <label>Check Interval (Hours)</label>
                        <input
                            type="number"
                            min="1"
                            max="24"
                            value={config?.schedule_interval_hours || 6}
                            onChange={(e) => setConfig({ ...config, schedule_interval_hours: parseInt(e.target.value) })}
                            className="form-input"
                        />
                        <p className="help-text">
                            How often to check for new SUCCESS transactions (1-24 hours). Current: Every {config?.schedule_interval_hours || 6} hours
                        </p>
                    </div>
                </div>

                {/* Email Configuration */}
                <div className="settings-section">
                    <h2>Email Configuration</h2>

                    <div className="form-group">
                        <label>Email Subject</label>
                        <input
                            type="text"
                            value={config?.subject_template || ''}
                            onChange={(e) => setConfig({ ...config, subject_template: e.target.value })}
                            className="form-input"
                            placeholder="✅ Payment Received - Thank You!"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>From Name</label>
                            <input
                                type="text"
                                value={config?.from_name || ''}
                                onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                                className="form-input"
                                placeholder="Lacewing Technologies"
                            />
                        </div>

                        <div className="form-group">
                            <label>From Email (Read-only)</label>
                            <input
                                type="email"
                                value={config?.from_email || 'sales@lacewingtech.in'}
                                className="form-input"
                                disabled
                            />
                            <p className="help-text">Configured via environment variables</p>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>CC Email</label>
                        <input
                            type="email"
                            value={config?.cc_email || ''}
                            onChange={(e) => setConfig({ ...config, cc_email: e.target.value })}
                            className="form-input"
                            placeholder="lacewinginfo@gmail.com"
                        />
                        <p className="help-text">All welcome emails will be CC'd to this address</p>
                    </div>
                </div>

                {/* SMTP Info (Read-only) */}
                <div className="settings-section">
                    <h2>SMTP Configuration (Read-only)</h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Host:</span>
                            <span className="info-value">smtp.hostinger.com</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Port:</span>
                            <span className="info-value">587</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Email:</span>
                            <span className="info-value">sales@lacewingtech.in</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Security:</span>
                            <span className="info-value">TLS</span>
                        </div>
                    </div>
                    <p className="help-text">SMTP credentials are managed via environment variables in Railway</p>
                </div>

                {/* Test Email */}
                <div className="settings-section">
                    <h2>Test Email</h2>
                    <div className="test-email-group">
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Enter email to send test"
                            className="form-input"
                        />
                        <button
                            type="button"
                            onClick={handleTestEmail}
                            disabled={sendingTest || !testEmail}
                            className="btn-test"
                        >
                            {sendingTest ? '📤 Sending...' : '📧 Send Test Email'}
                        </button>
                    </div>
                    <p className="help-text">Send a test welcome email to verify configuration</p>
                </div>

                {/* Save Button */}
                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => navigate('/welcome-emails')}
                        className="btn-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-save"
                    >
                        {saving ? '💾 Saving...' : '💾 Save Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WelcomeEmailSettings;