const puppeteer = require('puppeteer');
const pool = require('../config/database');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

// Encryption (same as agents)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
const ALGORITHM = 'aes-256-cbc';

const decrypt = (text) => {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

class PaymentGatewayScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.screenshotDir = path.join(__dirname, '../../uploads/payment_screenshots');
        this.ensureScreenshotDir();
    }

    // Helper to wait (replacement for deprecated waitForTimeout)
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async ensureScreenshotDir() {
        try {
            await fs.mkdir(this.screenshotDir, { recursive: true });
        } catch (error) {
            console.error('Error creating screenshot directory:', error);
        }
    }

    /**
     * Initialize browser and login to payment gateway
     */
    async login() {
        try {
            console.log('🌐 Launching browser...');

            // Launch browser
            this.browser = await puppeteer.launch({
                headless: true, // Set to false to see the browser (for debugging)
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            this.page = await this.browser.newPage();

            // Set viewport
            await this.page.setViewport({ width: 1920, height: 1080 });

            // Get credentials from database
            const credsResult = await pool.query(
                'SELECT * FROM payment_gateway_credentials WHERE is_active = true LIMIT 1'
            );

            if (credsResult.rows.length === 0) {
                throw new Error('No active payment gateway credentials found');
            }

            const credentials = credsResult.rows[0];
            const password = decrypt(credentials.password_encrypted);

            console.log(`🔐 Logging in to ${credentials.login_url}...`);

            // Navigate to login page
            await this.page.goto(credentials.login_url, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            // Wait for login form
            await this.page.waitForSelector('input[name="username"], input[type="email"], input#username', { timeout: 10000 });

            // Enter username (try different selectors)
            const usernameEntered = await this.tryEnterUsername(credentials.username);
            if (!usernameEntered) {
                throw new Error('Could not find username field');
            }

            // Enter password (try different selectors)
            const passwordEntered = await this.tryEnterPassword(password);
            if (!passwordEntered) {
                throw new Error('Could not find password field');
            }

            console.log('📝 Credentials entered, submitting form...');

            // Click login button (try different selectors)
            await this.clickLoginButton();

            console.log('⏳ Waiting 2 minutes for dashboard to load...');
            await this.wait(120000);

            // Take dashboard screenshot
            console.log('📸 Taking dashboard screenshot...');
            const dashboardScreenshotPath = path.join(
                this.screenshotDir,
                `dashboard_${Date.now()}.png`
            );
            await this.page.screenshot({
                path: dashboardScreenshotPath,
                fullPage: true
            });
            console.log(`✅ Dashboard screenshot saved: ${dashboardScreenshotPath}`);
            console.log('✅ Login successful! Dashboard loaded.');

            return dashboardScreenshotPath;  // ✅ Must return the screenshot path

        } catch (error) {
            console.error('❌ Login failed:', error.message);
            throw error;
        }
    }

    async tryEnterUsername(username) {
        const usernameSelectors = [
            'input[name="username"]',
            'input[type="email"]',
            'input#username',
            'input[name="email"]',
            'input#email'
        ];

        for (const selector of usernameSelectors) {
            try {
                const element = await this.page.$(selector);
                if (element) {
                    await element.type(username, { delay: 100 });
                    console.log(`✅ Username entered using selector: ${selector}`);
                    return true;
                }
            } catch (err) {
                continue;
            }
        }
        return false;
    }

    async tryEnterPassword(password) {
        const passwordSelectors = [
            'input[name="password"]',
            'input[type="password"]',
            'input#password'
        ];

        for (const selector of passwordSelectors) {
            try {
                const element = await this.page.$(selector);
                if (element) {
                    await element.type(password, { delay: 100 });
                    console.log(`✅ Password entered using selector: ${selector}`);
                    return true;
                }
            } catch (err) {
                continue;
            }
        }
        return false;
    }

    async clickLoginButton() {
        const buttonSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:contains("Login")',
            'button:contains("Sign In")',
            'input[value="Login"]',
            '.btn-login',
            '#login-button'
        ];

        for (const selector of buttonSelectors) {
            try {
                const element = await this.page.$(selector);
                if (element) {
                    await element.click();
                    console.log(`✅ Login button clicked using selector: ${selector}`);
                    return true;
                }
            } catch (err) {
                continue;
            }
        }

        // If no button found, try pressing Enter
        await this.page.keyboard.press('Enter');
        console.log('✅ Pressed Enter to submit form');
        return true;
    }

    /**
     * Navigate to transactions page
     */
    /**
     * Navigate to transactions page
     */
    async navigateToTransactions() {
        try {
            console.log('📊 Navigating directly to Transactions page URL...');

            // Navigate directly to transactions page
            await this.page.goto('https://evirtualpay.com/v2/vp_interface/transactions', {
                waitUntil: 'networkidle2',
                timeout: 180000  // 3 minutes timeout
            });

            console.log('⏳ Waiting 1 minute before interacting with page...');
            await this.wait(60000);

            // Take screenshot of transactions page
            console.log('📸 Taking transactions page screenshot...');
            const transactionsScreenshotPath = path.join(
                this.screenshotDir,
                `transactions_page_${Date.now()}.png`
            );
            await this.page.screenshot({
                path: transactionsScreenshotPath,
                fullPage: true
            });
            console.log(`✅ Transactions page screenshot saved: ${transactionsScreenshotPath}`);

            console.log('✅ Transactions page loaded!');

            return true;

        } catch (error) {
            console.error('❌ Failed to navigate to transactions:', error.message);
            throw error;
        }
    }

    /**
     * Apply date filters on transactions page
     * @param {string} filterType - 'weekly', 'monthly', or 'all'
     */
    /**
     * Apply date filters on transactions page
     * @param {string} filterType - 'weekly', 'monthly', or 'all'
     */
    async applyDateFilters(filterType = 'all') {
        try {
            if (filterType === 'all') {
                console.log('📊 No date filter applied - showing all transactions');
                return true;
            }

            console.log(`📅 Applying ${filterType} date filter...`);

            const today = new Date();
            let fromDate, toDate;

            if (filterType === 'weekly') {
                // Last 7 days
                fromDate = new Date(today);
                fromDate.setDate(today.getDate() - 7);
                toDate = new Date(today);
                console.log(`📅 Weekly filter: ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}`);
            } else if (filterType === 'monthly') {
                // Current month (1st to today)
                fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                toDate = new Date(today);
                console.log(`📅 Monthly filter: ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}`);
            }

            // Format dates as dd/mm/yyyy
            const formatDate = (date) => {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            };

            const fromDateStr = formatDate(fromDate);
            const toDateStr = formatDate(toDate);

            console.log(`📝 Filling date fields: From ${fromDateStr} to ${toDateStr}`);

            // Wait a bit before interacting
            await this.wait(5000);

            // Method 1: Try clicking and typing into date fields
            try {
                // Get all date input fields
                const dateInputs = await this.page.$$('input[placeholder*="dd/mm/yyyy"]');

                if (dateInputs.length >= 2) {
                    console.log(`✅ Found ${dateInputs.length} date input fields`);

                    // Fill From Date (first input)
                    console.log('📝 Filling From Date field...');
                    await dateInputs[0].click({ clickCount: 3 }); // Triple click to select all
                    await this.wait(500);
                    await dateInputs[0].type(fromDateStr, { delay: 100 });
                    await this.wait(1000);
                    console.log(`✅ From Date filled: ${fromDateStr}`);

                    // Fill To Date (second input)
                    console.log('📝 Filling To Date field...');
                    await dateInputs[1].click({ clickCount: 3 }); // Triple click to select all
                    await this.wait(500);
                    await dateInputs[1].type(toDateStr, { delay: 100 });
                    await this.wait(1000);
                    console.log(`✅ To Date filled: ${toDateStr}`);

                    // Take screenshot of filled form
                    console.log('📸 Taking screenshot of filled date form...');
                    const filledFormPath = path.join(
                        this.screenshotDir,
                        `date_form_filled_${Date.now()}.png`
                    );
                    await this.page.screenshot({
                        path: filledFormPath,
                        fullPage: false
                    });
                    console.log(`✅ Form screenshot saved: ${filledFormPath}`);

                } else {
                    console.log('⚠️ Could not find 2 date input fields');
                    return false;
                }
            } catch (error) {
                console.error('❌ Error filling date fields:', error);
                return false;
            }

            // Click Filter button
            console.log('🔍 Looking for Filter button...');
            await this.wait(2000);

            try {
                // Try to find and click filter button using evaluate
                const clicked = await this.page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const filterBtn = buttons.find(btn => btn.textContent.trim() === 'Filter');
                    if (filterBtn) {
                        filterBtn.click();
                        return true;
                    }
                    return false;
                });

                if (clicked) {
                    console.log('✅ Filter button clicked!');
                } else {
                    console.log('⚠️ Could not find or click Filter button');
                    return false;
                }
            } catch (error) {
                console.error('❌ Error clicking filter button:', error);
                return false;
            }

            console.log('⏳ Waiting 3 minutes for filtered results to load...');
            await this.wait(180000);

            // Take screenshot after filtering
            console.log('📸 Taking screenshot of filtered results...');
            const filteredResultsPath = path.join(
                this.screenshotDir,
                `filtered_results_${Date.now()}.png`
            );
            await this.page.screenshot({
                path: filteredResultsPath,
                fullPage: true
            });
            console.log(`✅ Filtered results screenshot saved: ${filteredResultsPath}`);

            console.log('✅ Date filter applied successfully!');
            return true;

        } catch (error) {
            console.error('❌ Failed to apply date filters:', error.message);
            return false;
        }
    }

    /**
     * Scrape transactions from the page
     */
    async scrapeTransactions() {
        try {
            console.log('🔍 Scraping transactions from page...');

            // Take screenshot of transaction list
            const listScreenshotPath = path.join(
                this.screenshotDir,
                `transaction_list_${Date.now()}.png`
            );
            await this.page.screenshot({
                path: listScreenshotPath,
                fullPage: true
            });
            console.log(`📸 Transaction list screenshot saved: ${listScreenshotPath}`);

            // Try to find the transactions table
            const transactions = await this.page.evaluate(() => {
                const results = [];

                // Try to find table rows (common selectors)
                const rows = document.querySelectorAll('table tbody tr, .transaction-row, .data-row');

                rows.forEach((row, index) => {
                    try {
                        const cells = row.querySelectorAll('td, .cell');

                        if (cells.length === 0) return;

                        // Extract text from all cells
                        const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());

                        // Look for status indicators
                        const rowHTML = row.innerHTML.toLowerCase();
                        let status = 'unknown';

                        if (rowHTML.includes('success') || rowHTML.includes('completed') ||
                            rowHTML.includes('approved') || rowHTML.includes('paid')) {
                            status = 'success';
                        } else if (rowHTML.includes('fail') || rowHTML.includes('decline') ||
                            rowHTML.includes('rejected') || rowHTML.includes('error')) {
                            status = 'failed';
                        }

                        // Check for status in cell text
                        cellTexts.forEach(text => {
                            const lower = text.toLowerCase();
                            if (lower === 'success' || lower === 'completed' || lower === 'approved') {
                                status = 'success';
                            } else if (lower === 'failed' || lower === 'declined' || lower === 'rejected') {
                                status = 'failed';
                            }
                        });

                        // Look for action button (eye icon)
                        const actionButton = row.querySelector('button[title*="view"], button[title*="detail"], .action-btn, .eye-icon, button i.fa-eye');
                        const hasActionButton = actionButton !== null;

                        results.push({
                            rowIndex: index,
                            cells: cellTexts,
                            status: status,
                            hasActionButton: hasActionButton,
                            rowHTML: row.outerHTML
                        });
                    } catch (err) {
                        console.error('Error parsing row:', err);
                    }
                });

                return results;
            });

            console.log(`📋 Found ${transactions.length} transaction(s)`);

            // Count by status
            const successCount = transactions.filter(t => t.status === 'success').length;
            const failedCount = transactions.filter(t => t.status === 'failed').length;
            const unknownCount = transactions.filter(t => t.status === 'unknown').length;

            console.log(`✅ Success: ${successCount}`);
            console.log(`❌ Failed: ${failedCount}`);
            console.log(`❓ Unknown: ${unknownCount}`);

            return {
                transactions,
                summary: {
                    total: transactions.length,
                    success: successCount,
                    failed: failedCount,
                    unknown: unknownCount
                },
                listScreenshotPath
            };

        } catch (error) {
            console.error('❌ Failed to scrape transactions:', error.message);
            throw error;
        }
    }

    /**
     * Extract details from a single success transaction
     */
    async extractTransactionDetails(rowIndex) {
        try {
            console.log(`🔍 Extracting details for transaction row ${rowIndex}...`);

            // Try to find and click the eye/action button in this row
            const clicked = await this.page.evaluate((index) => {
                const rows = document.querySelectorAll('table tbody tr, .transaction-row, .data-row');
                const row = rows[index];

                if (!row) return false;

                // Try different selectors for action button
                const buttonSelectors = [
                    'button[title*="view"]',
                    'button[title*="detail"]',
                    '.action-btn',
                    '.eye-icon',
                    'button i.fa-eye',
                    'i.fa-eye',
                    'button.btn-sm',
                    'a[title*="view"]',
                    '.btn-info'
                ];

                for (const selector of buttonSelectors) {
                    const button = row.querySelector(selector);
                    if (button) {
                        // Click the button or its parent if it's an icon
                        const clickTarget = button.tagName === 'I' ? button.parentElement : button;
                        clickTarget.click();
                        return true;
                    }
                }

                // Try finding any button in the last cell (action column is usually last)
                const cells = row.querySelectorAll('td');
                if (cells.length > 0) {
                    const lastCell = cells[cells.length - 1];
                    const button = lastCell.querySelector('button, a');
                    if (button) {
                        button.click();
                        return true;
                    }
                }

                return false;
            }, rowIndex);

            if (!clicked) {
                console.log('⚠️ Could not find or click action button');
                return null;
            }

            console.log('✅ Action button clicked, waiting for popup...');

            // Wait for popup/modal to appear
            await this.wait(2000);

            // Extract details from popup
            const details = await this.page.evaluate(() => {
                const result = {
                    allText: '',
                    fields: {}
                };

                // Try to find modal/popup
                const modalSelectors = [
                    '.modal-body',
                    '.popup-content',
                    '.dialog-content',
                    '[role="dialog"]',
                    '.transaction-details'
                ];

                let modal = null;
                for (const selector of modalSelectors) {
                    modal = document.querySelector(selector);
                    if (modal) break;
                }

                if (modal) {
                    result.allText = modal.textContent.trim();

                    // Try to extract key-value pairs
                    const labels = modal.querySelectorAll('label, .label, dt, .field-label, strong');
                    labels.forEach(label => {
                        const key = label.textContent.trim().replace(':', '');
                        let value = '';

                        // Try different ways to find the value
                        if (label.nextElementSibling) {
                            value = label.nextElementSibling.textContent.trim();
                        } else if (label.parentElement && label.parentElement.nextElementSibling) {
                            value = label.parentElement.nextElementSibling.textContent.trim();
                        }

                        if (key && value) {
                            result.fields[key] = value;
                        }
                    });

                    // Also try table format in modal
                    const rows = modal.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length >= 2) {
                            const key = cells[0].textContent.trim().replace(':', '');
                            const value = cells[1].textContent.trim();
                            if (key && value) {
                                result.fields[key] = value;
                            }
                        }
                    });
                }

                return result;
            });

            // Take screenshot of popup
            const detailScreenshotPath = path.join(
                this.screenshotDir,
                `transaction_detail_${rowIndex}_${Date.now()}.png`
            );

            await this.page.screenshot({
                path: detailScreenshotPath,
                fullPage: false
            });

            console.log(`📸 Transaction detail screenshot saved: ${detailScreenshotPath}`);

            // Close popup/modal
            await this.page.evaluate(() => {
                // Try to find and click close button
                const closeSelectors = [
                    '.modal .close',
                    '[data-dismiss="modal"]',
                    '.popup-close',
                    'button:contains("Close")',
                    '.btn-close'
                ];

                for (const selector of closeSelectors) {
                    const closeBtn = document.querySelector(selector);
                    if (closeBtn) {
                        closeBtn.click();
                        return true;
                    }
                }

                // Try ESC key
                return false;
            });

            // If close button not found, press Escape
            await this.page.keyboard.press('Escape');
            await this.wait(1000);

            console.log('✅ Transaction details extracted');

            return {
                rowIndex,
                details,
                screenshotPath: detailScreenshotPath
            };

        } catch (error) {
            console.error(`❌ Failed to extract details for row ${rowIndex}:`, error.message);
            return null;
        }
    }

    /**
     * Process all success transactions and extract their details
     */
    async processSuccessTransactions(transactions) {
        const successDetails = [];

        const successTransactions = transactions.filter(t => t.status === 'success');

        console.log(`\n🎯 Processing ${successTransactions.length} successful transaction(s)...`);

        for (const transaction of successTransactions) {
            const details = await this.extractTransactionDetails(transaction.rowIndex);
            if (details) {
                successDetails.push({
                    ...transaction,
                    extractedDetails: details
                });
            }

            // Small delay between transactions
            await this.wait(1000);
        }

        return successDetails;
    }

    /**
     * Close browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }
}

module.exports = new PaymentGatewayScraper();