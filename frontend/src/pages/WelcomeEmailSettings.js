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
    const [testingSmtp, setTestingSmtp] = useState(false);
    const [smtpTestResult, setSmtpTestResult] = useState(null);

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

        if (!config.smtp_host || !config.smtp_port || !config.smtp_user || !config.smtp_password) {
            alert('Please fill in all SMTP fields (Host, Port, Email, Password)');
            return;
        }

        if (!window.confirm('Save configuration changes?')) return;

        setSaving(true);
        try {
            await welcomeEmailAPI.updateConfig(config);
            alert('Configuration saved successfully! ✅');
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Error saving configuration: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTestSMTP = async () => {
        if (!config.smtp_host || !config.smtp_port || !config.smtp_user || !config.smtp_password) {
            alert('Please fill in all SMTP fields first (Host, Port, Email, Password)');
            return;
        }

        setTestingSmtp(true);
        setSmtpTestResult(null);

        try {
            const response = await welcomeEmailAPI.testSMTPConnection({
                smtp_host: config.smtp_host,
                smtp_port: config.smtp_port,
                smtp_user: config.smtp_user,
                smtp_password: config.smtp_password,
                smtp_secure: config.smtp_secure
            });

            setSmtpTestResult({
                success: true,
                message: response.data.message
            });
        } catch (error) {
            setSmtpTestResult({
                success: false,
                message: error.response?.data?.message || error.message
            });
        } finally {
            setTestingSmtp(false);
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
            alert('Test email sent successfully! Check your inbox. ✅');
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

                {/* SMTP Configuration - EDITABLE */}
                <div className="settings-section">
                    <h2>🔧 SMTP Configuration</h2>
                    <p className="help-text" style={{ marginBottom: '20px' }}>
                        Configure your email server settings. Required for sending welcome emails.
                    </p>

                    <div className="smtp-config-grid">
                        <div className="form-group">
                            <label>SMTP Host *</label>
                            <input
                                type="text"
                                value={config?.smtp_host || ''}
                                onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                                className="form-input"
                                placeholder="smtp.hostinger.com"
                                required
                            />
                            <p className="help-text">Your email provider's SMTP server address</p>
                        </div>

                        <div className="form-group">
                            <label>SMTP Port *</label>
                            <input
                                type="number"
                                value={config?.smtp_port || 465}
                                onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) })}
                                className="form-input"
                                placeholder="465"
                                required
                            />
                            <p className="help-text">Common: 465 (SSL) or 587 (TLS)</p>
                        </div>

                        <div className="form-group">
                            <label>SMTP Email *</label>
                            <input
                                type="email"
                                value={config?.smtp_user || ''}
                                onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                                className="form-input"
                                placeholder="support@lacewingtech.in"
                                required
                            />
                            <p className="help-text">Email address used to send</p>
                        </div>

                        <div className="form-group">
                            <label>SMTP Password *</label>
                            <input
                                type="password"
                                value={config?.smtp_password || ''}
                                onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                                className="form-input"
                                placeholder="••••••••"
                                required
                            />
                            <p className="help-text">Email account password</p>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                checked={config?.smtp_secure !== false}
                                onChange={(e) => setConfig({ ...config, smtp_secure: e.target.checked })}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-text">
                                Use SSL/TLS Encryption
                            </span>
                        </label>
                        <p className="help-text">
                            Recommended: ON for port 465 (SSL), OFF for port 587 (TLS)
                        </p>
                    </div>

                    {/* SMTP Test Section */}
                    <div className="smtp-test-section">
                        <h4>🔌 Test SMTP Connection</h4>
                        <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#856404' }}>
                            Test your SMTP settings before saving to ensure they work correctly
                        </p>
                        <button
                            type="button"
                            onClick={handleTestSMTP}
                            disabled={testingSmtp}
                            className="btn-test-smtp"
                        >
                            {testingSmtp ? '🔄 Testing Connection...' : '🔌 Test SMTP Connection'}
                        </button>

                        {smtpTestResult && (
                            <div className={`test-result ${smtpTestResult.success ? 'success' : 'error'}`}>
                                {smtpTestResult.success ? '✅' : '❌'} {smtpTestResult.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Email Configuration */}
                <div className="settings-section">
                    <h2>📧 Email Template Configuration</h2>

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
                            <label>From Email (Auto-filled from SMTP)</label>
                            <input
                                type="email"
                                value={config?.smtp_user || config?.from_email || ''}
                                className="form-input"
                                disabled
                            />
                            <p className="help-text">Uses SMTP email configured above</p>
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

                {/* Test Email */}
                <div className="settings-section">
                    <h2>📤 Send Test Welcome Email</h2>
                    <p className="help-text" style={{ marginBottom: '15px' }}>
                        Send a sample welcome email to test the complete system (SMTP + Template)
                    </p>
                    <div className="test-email-group">
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Enter email to receive test"
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