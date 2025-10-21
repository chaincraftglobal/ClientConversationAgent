const pool = require('../config/database');
const paymentGatewayScraper = require('./paymentGatewayScraper');
const paymentEmailService = require('./paymentEmailService');

class PaymentGatewayOrchestrator {

    /**
     * Main function - Run complete check
     */
    async runCheck() {
        const logId = await this.startCheckLog();

        try {
            console.log('\n🚀 Starting Payment Gateway Check...\n');

            // Get admin email from settings
            const settings = await this.getSettings();
            if (!settings || !settings.is_enabled) {
                console.log('⚠️ Payment gateway monitoring is disabled');
                return;
            }

            const adminEmail = settings.admin_email;

            // Step 1: Login
            await paymentGatewayScraper.login();

            // Step 2: Navigate to transactions
            await paymentGatewayScraper.navigateToTransactions();

            // Step 3: Scrape transactions
            const scrapedData = await paymentGatewayScraper.scrapeTransactions();

            // Step 4: Process success transactions (extract details)
            const successDetails = await paymentGatewayScraper.processSuccessTransactions(
                scrapedData.transactions
            );

            // Step 5: Store transactions in database
            const storedTransactions = await this.storeTransactions(
                successDetails,
                scrapedData.transactions.filter(t => t.status === 'failed')
            );

            // Step 6: Send thank you emails to customers
            let thankYouSentCount = 0;
            for (const transaction of storedTransactions.successTransactions) {
                if (transaction.customer_email && !transaction.thank_you_email_sent) {
                    try {
                        await paymentEmailService.sendThankYouEmail(
                            transaction.customer_email,
                            transaction.customer_name,
                            {
                                amount: transaction.amount,
                                transaction_id: transaction.transaction_id,
                                date: transaction.transaction_date,
                                payment_method: transaction.payment_method
                            }
                        );

                        // Mark as sent
                        await pool.query(
                            'UPDATE payment_transactions SET thank_you_email_sent = true, thank_you_email_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
                            [transaction.id]
                        );

                        thankYouSentCount++;
                    } catch (error) {
                        console.error(`Failed to send thank you email to ${transaction.customer_email}:`, error);
                    }
                }
            }

            console.log(`\n📧 Sent ${thankYouSentCount} thank you email(s) to customers\n`);

            // Step 7: Send summary emails to admin

            // Send failed transactions summary if any
            if (scrapedData.summary.failed > 0) {
                await paymentEmailService.sendFailedTransactionsSummary(
                    scrapedData.summary.failed,
                    scrapedData.listScreenshotPath,
                    adminEmail
                );
            }

            // Send success transactions summary if any
            if (scrapedData.summary.success > 0) {
                await paymentEmailService.sendSuccessTransactionsSummary(
                    scrapedData.summary.success,
                    storedTransactions.successTransactions.map(t => ({
                        customer_name: t.customer_name,
                        customer_email: t.customer_email,
                        amount: t.amount,
                        thank_you_sent: t.thank_you_email_sent
                    })),
                    adminEmail
                );
            }

            // Close browser
            await paymentGatewayScraper.close();

            // Update check log
            await this.completeCheckLog(logId, {
                total: scrapedData.summary.total,
                success: scrapedData.summary.success,
                failed: scrapedData.summary.failed,
                newTransactions: storedTransactions.newCount,
                screenshotPath: scrapedData.listScreenshotPath,
                status: 'success'
            });

            console.log('\n✅ Payment Gateway Check Complete!\n');

            return {
                success: true,
                summary: scrapedData.summary,
                newTransactions: storedTransactions.newCount,
                thankYouEmailsSent: thankYouSentCount
            };

        } catch (error) {
            console.error('\n❌ Payment Gateway Check Failed:', error);

            // Close browser on error
            await paymentGatewayScraper.close();

            // Update log with error
            await this.completeCheckLog(logId, {
                status: 'failed',
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Store transactions in database
     */
    async storeTransactions(successTransactions, failedTransactions) {
        const stored = {
            successTransactions: [],
            failedTransactions: [],
            newCount: 0
        };

        console.log('\n💾 Storing transactions in database...\n');

        // Store success transactions
        for (const transaction of successTransactions) {
            try {
                const details = transaction.extractedDetails?.details || {};

                // Try to extract customer info and amount from details
                const customerName = details.fields['Customer Name'] ||
                    details.fields['Name'] ||
                    details.fields['Customer'] ||
                    transaction.cells[1] || 'Unknown';

                const customerEmail = details.fields['Email'] ||
                    details.fields['Customer Email'] ||
                    transaction.cells[2] || null;

                const amount = details.fields['Amount'] ||
                    details.fields['Total'] ||
                    transaction.cells[3] || null;

                const transactionId = details.fields['Transaction ID'] ||
                    details.fields['ID'] ||
                    details.fields['Reference'] ||
                    `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Check if transaction already exists
                const existing = await pool.query(
                    'SELECT id FROM payment_transactions WHERE transaction_id = $1',
                    [transactionId]
                );

                if (existing.rows.length > 0) {
                    console.log(`⚠️ Transaction ${transactionId} already exists, skipping`);
                    stored.successTransactions.push(existing.rows[0]);
                    continue;
                }

                // Insert new transaction
                const result = await pool.query(
                    `INSERT INTO payment_transactions (
                        transaction_id, customer_name, customer_email, amount,
                        status, transaction_details, screenshot_path
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *`,
                    [
                        transactionId,
                        customerName,
                        customerEmail,
                        amount,
                        'success',
                        JSON.stringify(details),
                        transaction.extractedDetails?.screenshotPath
                    ]
                );

                stored.successTransactions.push(result.rows[0]);
                stored.newCount++;

                console.log(`✅ Stored success transaction: ${transactionId}`);

            } catch (error) {
                console.error('Error storing success transaction:', error);
            }
        }

        // Store failed transactions
        for (const transaction of failedTransactions) {
            try {
                const transactionId = `FAILED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const result = await pool.query(
                    `INSERT INTO payment_transactions (
                        transaction_id, status, transaction_details
                    ) VALUES ($1, $2, $3)
                    RETURNING *`,
                    [
                        transactionId,
                        'failed',
                        JSON.stringify({ cells: transaction.cells, rowHTML: transaction.rowHTML })
                    ]
                );

                stored.failedTransactions.push(result.rows[0]);

                console.log(`✅ Stored failed transaction: ${transactionId}`);

            } catch (error) {
                console.error('Error storing failed transaction:', error);
            }
        }

        console.log(`\n💾 Stored ${stored.newCount} new transaction(s)\n`);

        return stored;
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
     * Start check log
     */
    async startCheckLog() {
        const result = await pool.query(
            'INSERT INTO payment_check_logs (check_started_at) VALUES (CURRENT_TIMESTAMP) RETURNING id'
        );
        return result.rows[0].id;
    }

    /**
     * Complete check log
     */
    async completeCheckLog(logId, data) {
        await pool.query(
            `UPDATE payment_check_logs 
             SET check_completed_at = CURRENT_TIMESTAMP,
                 total_transactions_found = $1,
                 success_count = $2,
                 failed_count = $3,
                 new_transactions_count = $4,
                 status = $5,
                 error_message = $6,
                 screenshot_path = $7,
                 email_sent = true
             WHERE id = $8`,
            [
                data.total || 0,
                data.success || 0,
                data.failed || 0,
                data.newTransactions || 0,
                data.status || 'unknown',
                data.error || null,
                data.screenshotPath || null,
                logId
            ]
        );
    }
}

module.exports = new PaymentGatewayOrchestrator();