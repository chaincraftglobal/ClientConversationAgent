const cron = require('node-cron');
const { pollAllMerchants } = require('./merchantEmailPollingService');
const merchantReminderService = require('./merchantReminderService');

class MerchantScheduler {
    constructor() {
        this.pollingTask = null;
        this.reminderTask = null;
    }

    /**
     * Start all schedulers
     */
    start() {
        this.startEmailPolling();
        this.startReminderProcessing();
    }

    /**
     * Start email polling (every 3 minutes)
     */
    startEmailPolling() {
        console.log('⏰ [MERCHANT SCHEDULER] Starting email polling (every 3 minutes)...');

        // Run every 3 minutes
        this.pollingTask = cron.schedule('*/3 * * * *', async () => {
            try {
                console.log('\n⏰ [MERCHANT] Cron job triggered - polling emails');
                await pollAllMerchants();
            } catch (error) {
                console.error('❌ [MERCHANT] Polling error:', error);
            }
        });

        console.log('✅ [MERCHANT SCHEDULER] Email polling started');
    }

    /**
     * Start reminder processing (every 5 minutes)
     */
    startReminderProcessing() {
        console.log('⏰ [MERCHANT SCHEDULER] Starting reminder processing (every 5 minutes)...');

        // Run every 5 minutes
        this.reminderTask = cron.schedule('*/5 * * * *', async () => {
            try {
                console.log('\n⏰ [MERCHANT] Cron job triggered - processing reminders');
                await merchantReminderService.processReminders();
            } catch (error) {
                console.error('❌ [MERCHANT] Reminder processing error:', error);
            }
        });

        console.log('✅ [MERCHANT SCHEDULER] Reminder processing started');
    }

    /**
     * Stop all schedulers
     */
    stop() {
        if (this.pollingTask) {
            this.pollingTask.stop();
            console.log('⏹️ [MERCHANT SCHEDULER] Email polling stopped');
        }
        if (this.reminderTask) {
            this.reminderTask.stop();
            console.log('⏹️ [MERCHANT SCHEDULER] Reminder processing stopped');
        }
    }

    /**
     * Restart all schedulers
     */
    restart() {
        console.log('🔄 [MERCHANT SCHEDULER] Restarting...');
        this.stop();
        this.start();
    }
}

module.exports = new MerchantScheduler();