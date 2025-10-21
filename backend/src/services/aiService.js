const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Tone-specific instructions
const getToneInstructions = (tonePreference, clientEmotionalTone) => {
    const toneGuides = {
        professional: `
- Use formal, business-appropriate language
- Be courteous and respectful
- Maintain professional boundaries
- Use complete sentences and proper grammar`,

        friendly: `
- Use warm, approachable language
- Be conversational while remaining professional
- Show genuine interest and enthusiasm
- Use friendly phrases like "Great question!" or "Happy to help!"`,

        casual: `
- Use relaxed, conversational language
- Be personable and relatable
- Use contractions naturally (I'm, you're, we'll)
- Keep it light and easy-going while still being helpful`,

        empathetic: `
- Show understanding and emotional intelligence
- Acknowledge the client's feelings
- Be supportive and reassuring
- Use phrases like "I understand" or "That makes sense"`,

        direct: `
- Get straight to the point
- Be clear and concise
- Use bullet points for clarity
- Focus on facts and solutions`
    };

    let instructions = toneGuides[tonePreference] || toneGuides.professional;

    // Adjust based on client's emotional tone
    if (clientEmotionalTone === 'angry' || clientEmotionalTone === 'frustrated') {
        instructions += `

IMPORTANT - Client seems ${clientEmotionalTone}:
- Acknowledge their concerns immediately
- Apologize if appropriate
- Focus on solutions and next steps
- Be extra empathetic and understanding
- Avoid defensive language
- Show urgency in addressing their issue`;
    } else if (clientEmotionalTone === 'confused') {
        instructions += `

IMPORTANT - Client seems confused:
- Provide clear, step-by-step explanations
- Use simple language
- Offer examples if helpful
- Be patient and thorough
- Ask clarifying questions if needed`;
    } else if (clientEmotionalTone === 'happy' || clientEmotionalTone === 'grateful') {
        instructions += `

IMPORTANT - Client seems ${clientEmotionalTone}:
- Match their positive energy
- Express appreciation for their message
- Maintain the positive momentum
- Be warm and friendly`;
    }

    return instructions;
};

// Generate AI response based on conversation history, project context, and tone
const generateResponse = async (
    agentPersona,
    systemPrompt,
    conversationHistory,
    newMessage,
    projectContext = '',
    options = {}
) => {
    try {
        // Extract options
        const {
            tonePreference = 'professional',
            clientEmotionalTone = 'neutral',
            urgencyLevel = 5
        } = options;

        // Get tone-specific instructions
        const toneInstructions = getToneInstructions(tonePreference, clientEmotionalTone);

        // Adjust response urgency
        const urgencyNote = urgencyLevel >= 8
            ? '\n⚡ URGENT: This is a high-priority message. Address it immediately and show urgency in your response.'
            : urgencyLevel >= 6
                ? '\n⏰ IMPORTANT: This message needs attention soon. Prioritize addressing their concerns.'
                : '';

        // Build conversation context
        const messages = [
            {
                role: 'system',
                content: `You are ${agentPersona || 'a professional AI assistant'}. 

${projectContext ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPROJECT CONTEXT (Use this information to provide accurate responses):\n${projectContext}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}

TONE & STYLE FOR THIS RESPONSE:
${toneInstructions}
${urgencyNote}

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
- Be proactive in providing helpful information related to their inquiry
- Adjust your tone based on the client's emotional state`
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

        // Adjust temperature based on urgency and tone
        const temperature = urgencyLevel >= 8 ? 0.5 : 0.7; // More focused for urgent messages

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            temperature: temperature,
            max_tokens: 800,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        return {
            success: true,
            response: completion.choices[0].message.content,
            metadata: {
                toneUsed: tonePreference,
                clientTone: clientEmotionalTone,
                urgency: urgencyLevel
            }
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