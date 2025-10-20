const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Generate AI response based on conversation history and project context
const generateResponse = async (agentPersona, systemPrompt, conversationHistory, newMessage, projectContext = '') => {
    try {
        // Build conversation context
        const messages = [
            {
                role: 'system',
                content: systemPrompt || `You are ${agentPersona || 'a professional AI assistant'}. 

${projectContext ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPROJECT CONTEXT (Use this information to provide accurate responses):\n${projectContext}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}

Guidelines for your responses:
- Be professional, warm, and personable
- Structure your response with clear paragraphs
- Use proper greetings (Hi/Hello + client name if known)
- Keep responses concise but informative (aim for 3-5 paragraphs)
- End with a professional closing (Best regards, Looking forward to hearing from you, etc.)
- Use bullet points when listing multiple items
- Break long paragraphs into shorter, readable ones (2-3 sentences each)
- Match the tone and formality of the client's message
- If discussing technical topics, explain clearly without being condescending
- Always be helpful and solution-oriented
- Reference the project details and requirements when relevant
- Always stay on topic related to the project
- Provide specific answers based on the project context above

IMPORTANT: Use the project context above to provide accurate, relevant responses about:
- Project scope and deliverables
- Budget and timeline
- Client requirements and expectations
- Any specific instructions or preferences
- Progress updates and status

Format your response with:
1. A warm, personalized greeting
2. Address the client's questions/concerns directly
3. Main content in clear paragraphs (2-3 sentences each)
4. Action items or next steps if applicable
5. Professional closing with your name

Remember: 
- You represent a professional service, so maintain quality and clarity
- Never make up information - only use what's in the project context
- If you don't know something, acknowledge it and offer to find out
- Be proactive in providing helpful information related to their inquiry`
            }
        ];

        // Add conversation history
        if (conversationHistory && conversationHistory.length > 0) {
            conversationHistory.forEach(msg => {
                messages.push({
                    role: msg.sender_type === 'client' ? 'user' : 'assistant',
                    content: msg.body_text
                });
            });
        }

        // Add new client message
        messages.push({
            role: 'user',
            content: newMessage
        });

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            temperature: 0.7,
            max_tokens: 800,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        return {
            success: true,
            response: completion.choices[0].message.content
        };

    } catch (error) {
        console.error('AI generation error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    generateResponse
};