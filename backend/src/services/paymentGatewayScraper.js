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

            console.log('⏳ Waiting 10 seconds for dashboard to load...');

            // Wait 10 seconds as per requirement
            await this.page.waitForTimeout(10000);

            console.log('✅ Login successful! Dashboard loaded.');

            return true;

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
    async navigateToTransactions() {
        try {
            console.log('📊 Navigating to Transactions page...');

            // Try to find and click transactions link/button
            const transactionSelectors = [
                'a:contains("Transaction")',
                'a:contains("transaction")',
                'a[href*="transaction"]',
                'button:contains("Transaction")',
                'li:contains("Transaction") a',
                '.menu-item:contains("Transaction")',
                '#transactions',
                '.transactions-link'
            ];

            let clicked = false;

            // Try text-based search first
            const links = await this.page.$$('a');
            for (const link of links) {
                const text = await this.page.evaluate(el => el.textContent, link);
                if (text && text.toLowerCase().includes('transaction')) {
                    await link.click();
                    console.log(`✅ Clicked transactions link with text: "${text}"`);
                    clicked = true;
                    break;
                }
            }

            // If not found, try button
            if (!clicked) {
                const buttons = await this.page.$$('button');
                for (const button of buttons) {
                    const text = await this.page.evaluate(el => el.textContent, button);
                    if (text && text.toLowerCase().includes('transaction')) {
                        await button.click();
                        console.log(`✅ Clicked transactions button with text: "${text}"`);
                        clicked = true;
                        break;
                    }
                }
            }

            if (!clicked) {
                throw new Error('Could not find Transactions link or button');
            }

            console.log('⏳ Waiting 30 seconds for transactions page to load...');

            // Wait 30 seconds as per requirement
            await this.page.waitForTimeout(30000);

            console.log('✅ Transactions page loaded!');

            return true;

        } catch (error) {
            console.error('❌ Failed to navigate to transactions:', error.message);
            throw error;
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
            await this.page.waitForTimeout(2000);

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
            await this.page.waitForTimeout(1000);

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
            await this.page.waitForTimeout(1000);
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