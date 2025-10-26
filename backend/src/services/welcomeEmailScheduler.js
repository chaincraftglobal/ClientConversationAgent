const cron = require('node-cron');
const welcomeEmailService = require('./welcomeEmailService');

class WelcomeEmailScheduler {
    constructor() {
        this.job = null;
    }

    /**
     * Start the scheduler
     */
    start() {
        // Run every 6 hours: at 00:00, 06:00, 12:00, 18:00
        // Cron format: 0 */6 * * * = Every 6 hours
        this.job = cron.schedule('0 */6 * * *', async () => {
            console.log('\n⏰ [WELCOME EMAIL SCHEDULER] Cron job triggered');
            try {
                await welcomeEmailService.processNewTransactions();
            } catch (error) {
                console.error('❌ [WELCOME EMAIL SCHEDULER] Error:', error);
            }
        });

        console.log('✅ [WELCOME EMAIL SCHEDULER] Started (runs every 6 hours: 00:00, 06:00, 12:00, 18:00)');
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.job) {
            this.job.stop();
            console.log('⏹️ [WELCOME EMAIL SCHEDULER] Stopped');
        }
    }

    /**
     * Restart the scheduler
     */
    restart() {
        this.stop();
        this.start();
        console.log('🔄 [WELCOME EMAIL SCHEDULER] Restarted');
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isRunning: this.job ? true : false,
            schedule: 'Every 6 hours (00:00, 06:00, 12:00, 18:00)',
            cronExpression: '0 */6 * * *'
        };
    }
}

module.exports = new WelcomeEmailScheduler();