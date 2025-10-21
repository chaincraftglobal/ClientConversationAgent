const aiService = require('./aiService');

class MessageAnalyzerService {

    /**
     * Analyze incoming message and determine optimal reply timing
     * @param {Object} params - Analysis parameters
     * @param {string} params.messageContent - The message to analyze
     * @param {Array} params.conversationHistory - Previous messages in conversation
     * @param {Object} params.assignmentSettings - Assignment reply settings
     * @param {string} params.clientTimezone - Client's timezone
     * @returns {Object} Analysis result with urgency, tone, and delay
     */
    async analyzeMessage({ messageContent, conversationHistory, assignmentSettings, clientTimezone }) {
        try {
            // Build context for AI analysis
            const analysisPrompt = this.buildAnalysisPrompt(
                messageContent,
                conversationHistory,
                assignmentSettings
            );

            // Get AI analysis
            const aiResponse = await aiService.generateResponse(analysisPrompt, {
                temperature: 0.3, // Lower temperature for more consistent analysis
                max_tokens: 300
            });

            // Parse AI response
            const analysis = this.parseAIAnalysis(aiResponse);

            // Calculate smart delay based on analysis
            const replyDelay = this.calculateSmartDelay(
                analysis,
                assignmentSettings,
                conversationHistory
            );

            // Add human-like randomness
            const finalDelay = this.addHumanRandomness(replyDelay);

            return {
                urgencyLevel: analysis.urgencyLevel,
                emotionalTone: analysis.emotionalTone,
                keyTopics: analysis.keyTopics,
                suggestedDelay: finalDelay,
                reasoning: analysis.reasoning,
                shouldReplyDuringWorkingHours: this.shouldRespectWorkingHours(analysis.urgencyLevel)
            };

        } catch (error) {
            console.error('Error analyzing message:', error);
            // Fallback to default behavior
            return this.getDefaultAnalysis(assignmentSettings);
        }
    }

    /**
     * Build prompt for AI to analyze the message
     */
    buildAnalysisPrompt(messageContent, conversationHistory, settings) {
        const historyContext = conversationHistory
            .slice(-5) // Last 5 messages
            .map(msg => `${msg.sender}: ${msg.content}`)
            .join('\n');

        return `You are analyzing a client email to determine urgency and appropriate response timing.

Conversation History:
${historyContext || 'No previous messages'}

New Message from Client:
"${messageContent}"

Analyze this message and respond ONLY with a JSON object in this exact format:
{
  "urgencyLevel": <number 1-10>,
  "emotionalTone": "<angry|frustrated|confused|neutral|happy|grateful>",
  "keyTopics": ["topic1", "topic2"],
  "reasoning": "<brief explanation of urgency level>"
}

Urgency Level Guidelines:
1-2: Casual conversation, no action needed, can wait 4-6 hours
3-4: General inquiry, normal priority, 2-3 hours
5-6: Needs response soon, questions or clarifications, 1-2 hours
7-8: Important but not critical, 30-60 minutes
9-10: URGENT - issues, problems, angry client, 10-20 minutes

Consider:
- Words like "urgent", "ASAP", "immediately", "problem", "issue" = higher urgency
- Questions = medium-high urgency (5-7)
- Thank you messages = low urgency (2-3)
- Angry tone = very high urgency (8-10)
- Confused/asking for clarification = medium urgency (5-6)

Respond ONLY with the JSON object, no other text.`;
    }

    /**
     * Parse AI response to extract analysis
     */
    parseAIAnalysis(aiResponse) {
        try {
            // Remove markdown code blocks if present
            let jsonStr = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            const analysis = JSON.parse(jsonStr);

            // Validate and set defaults
            return {
                urgencyLevel: Math.min(10, Math.max(1, analysis.urgencyLevel || 5)),
                emotionalTone: analysis.emotionalTone || 'neutral',
                keyTopics: Array.isArray(analysis.keyTopics) ? analysis.keyTopics : [],
                reasoning: analysis.reasoning || 'Standard message'
            };
        } catch (error) {
            console.error('Error parsing AI analysis:', error);
            // Return default analysis
            return {
                urgencyLevel: 5,
                emotionalTone: 'neutral',
                keyTopics: [],
                reasoning: 'Unable to analyze'
            };
        }
    }

    /**
     * Calculate smart delay based on urgency and settings
     */
    calculateSmartDelay(analysis, settings, conversationHistory) {
        const { urgencyLevel } = analysis;
        const minDelay = settings.min_reply_delay_minutes || 15;
        const maxDelay = settings.max_reply_delay_minutes || 90;

        // Map urgency to delay range
        let baseDelay;

        if (urgencyLevel >= 9) {
            // URGENT: 10-20 minutes
            baseDelay = 10 + Math.random() * 10;
        } else if (urgencyLevel >= 7) {
            // Important: 30-60 minutes
            baseDelay = 30 + Math.random() * 30;
        } else if (urgencyLevel >= 5) {
            // Normal: 1-2 hours
            baseDelay = 60 + Math.random() * 60;
        } else if (urgencyLevel >= 3) {
            // Low priority: 2-4 hours
            baseDelay = 120 + Math.random() * 120;
        } else {
            // Very low: 4-6 hours
            baseDelay = 240 + Math.random() * 120;
        }

        // Respect min/max settings
        baseDelay = Math.max(minDelay, Math.min(maxDelay, baseDelay));

        // Adjust based on conversation pattern
        if (conversationHistory.length > 0) {
            const lastReply = conversationHistory[conversationHistory.length - 1];
            const timeSinceLastReply = Date.now() - new Date(lastReply.created_at).getTime();
            const minutesSinceLastReply = timeSinceLastReply / (1000 * 60);

            // If client replied very quickly, don't reply TOO fast (seems robotic)
            if (minutesSinceLastReply < 10) {
                baseDelay = Math.max(baseDelay, 20);
            }
        }

        return Math.round(baseDelay);
    }

    /**
     * Add human-like randomness to delay
     */
    addHumanRandomness(delayMinutes) {
        // Add ±10% randomness
        const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
        let finalDelay = Math.round(delayMinutes * randomFactor);

        // Make it not perfectly round (like 3h 17m instead of exactly 3h)
        if (finalDelay > 60 && finalDelay % 30 === 0) {
            finalDelay += Math.floor(Math.random() * 15) - 7; // ±7 minutes
        }

        return Math.max(1, finalDelay); // At least 1 minute
    }

    /**
     * Determine if we should wait for working hours
     */
    shouldRespectWorkingHours(urgencyLevel) {
        // Only urgent messages (8+) can be sent outside working hours
        return urgencyLevel < 8;
    }

    /**
     * Get default analysis if AI fails
     */
    getDefaultAnalysis(settings) {
        return {
            urgencyLevel: 5,
            emotionalTone: 'neutral',
            keyTopics: [],
            suggestedDelay: settings.min_reply_delay_minutes || 30,
            reasoning: 'Default analysis used',
            shouldReplyDuringWorkingHours: true
        };
    }

    /**
     * Check if current time is within working hours for a timezone
     */
    isWithinWorkingHours(timezone, workingHoursStart = '09:00', workingHoursEnd = '18:00') {
        try {
            const now = new Date();
            const clientTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
            const currentHour = clientTime.getHours();
            const currentMinute = clientTime.getMinutes();

            const [startHour, startMinute] = workingHoursStart.split(':').map(Number);
            const [endHour, endMinute] = workingHoursEnd.split(':').map(Number);

            const currentTimeInMinutes = currentHour * 60 + currentMinute;
            const startTimeInMinutes = startHour * 60 + startMinute;
            const endTimeInMinutes = endHour * 60 + endMinute;

            return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
        } catch (error) {
            console.error('Error checking working hours:', error);
            return true; // Default to allowing if error
        }
    }

    /**
     * Calculate when to send reply considering working hours
     */
    calculateScheduledReplyTime(delayMinutes, timezone, workingHoursStart, workingHoursEnd, respectWorkingHours) {
        const scheduledTime = new Date(Date.now() + delayMinutes * 60 * 1000);

        if (!respectWorkingHours) {
            return scheduledTime;
        }

        // Check if scheduled time is within working hours
        const isInWorkingHours = this.isWithinWorkingHours(timezone, workingHoursStart, workingHoursEnd);

        if (!isInWorkingHours) {
            // Schedule for next working day start
            const clientTime = new Date(scheduledTime.toLocaleString('en-US', { timeZone: timezone }));
            const [startHour, startMinute] = workingHoursStart.split(':').map(Number);

            clientTime.setDate(clientTime.getDate() + 1);
            clientTime.setHours(startHour, startMinute + Math.floor(Math.random() * 30), 0, 0);

            return clientTime;
        }

        return scheduledTime;
    }
}

module.exports = new MessageAnalyzerService();