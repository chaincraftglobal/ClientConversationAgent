const cron = require('node-cron');
const pool = require('../config/database');
const paymentGatewayOrchestrator = require('./paymentGatewayOrchestrator');

class PaymentGatewayScheduler {
    constructor() {
        this.task = null;
        this.isRunning = false;
    }

    /**
     * Start the scheduler
     */
    async start() {
        try {
            console.log('⏰ Starting Payment Gateway Scheduler...');

            // Get schedule settings
            const settings = await this.getSettings();

            if (!settings || !settings.is_enabled) {
                console.log('⚠️ Payment gateway scheduler is disabled');
                return;
            }

            const intervalHours = settings.check_interval_hours || 3;

            console.log(`✅ Scheduler started - checking every ${intervalHours} hour(s)`);

            // Stop existing task if any
            this.stop();

            // Create cron expression based on interval
            // Run every X hours
            const cronExpression = `0 */${intervalHours} * * *`; // Every X hours at minute 0

            this.task = cron.schedule(cronExpression, async () => {
                if (this.isRunning) {
                    console.log('⚠️ Previous check still running, skipping this cycle');
                    return;
                }

                this.isRunning = true;

                try {
                    console.log(`\n${'='.repeat(60)}`);
                    console.log(`🔔 Scheduled Payment Gateway Check Started`);
                    console.log(`   Time: ${new Date().toLocaleString()}`);
                    console.log(`${'='.repeat(60)}\n`);

                    await paymentGatewayOrchestrator.runCheck();

                    // Update last run time
                    await this.updateLastRunTime();

                } catch (error) {
                    console.error('❌ Scheduled check failed:', error);
                } finally {
                    this.isRunning = false;
                }
            });

            console.log(`📅 Next check will run in ${intervalHours} hour(s)`);

        } catch (error) {
            console.error('❌ Failed to start scheduler:', error);
        }
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            console.log('⏹️ Payment Gateway Scheduler stopped');
        }
    }

    /**
     * Restart scheduler (useful when settings change)
     */
    async restart() {
        console.log('🔄 Restarting Payment Gateway Scheduler...');
        this.stop();
        await this.start();
    }

    /**
     * Run check manually (outside of schedule)
     */
    async runManualCheck(filterType = 'all') {
        if (this.isRunning) {
            throw new Error('A check is already running. Please wait for it to complete.');
        }

        this.isRunning = true;

        try {
            console.log(`\n📌 Manual Payment Gateway Check Started (Filter: ${filterType})\n`);
            const result = await paymentGatewayOrchestrator.runCheck(filterType);
            await this.updateLastRunTime();
            return result;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Get settings from database
     */
    async getSettings() {
        const result = await pool.query(
            'SELECT * FROM payment_gateway_schedule ORDER BY id DESC LIMIT 1'
        );
        return result.rows[0] || null;
    }

    /**
     * Update last run time
     */
    async updateLastRunTime() {
        const settings = await this.getSettings();
        if (settings) {
            const intervalHours = settings.check_interval_hours || 3;
            const nextRun = new Date();
            nextRun.setHours(nextRun.getHours() + intervalHours);

            await pool.query(
                `UPDATE payment_gateway_schedule 
                 SET last_run_at = CURRENT_TIMESTAMP,
                     next_run_at = $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [nextRun, settings.id]
            );
        }
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isSchedulerActive: this.task !== null,
            isCheckRunning: this.isRunning
        };
    }
}

module.exports = new PaymentGatewayScheduler();