// Professional HTML Email Template with Human-Like Signatures
const createEmailTemplate = (agent, messageBody) => {
    const signatureName = agent.signature_name || agent.name;
    const signatureTitle = agent.signature_title || '';
    const signatureCompany = agent.signature_company || agent.business_type || '';
    const signaturePhone = agent.signature_phone || agent.phone || '';
    const signatureWebsite = agent.signature_website || '';
    const signatureStyle = agent.signature_style || 'professional';

    // Get signature HTML based on style
    const signatureHTML = getSignatureByStyle(
        signatureStyle,
        signatureName,
        signatureTitle,
        signatureCompany,
        agent.email,
        signaturePhone,
        signatureWebsite
    );

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #000000; margin: 0; padding: 20px;">
    <div style="max-width: 650px;">
        ${formatMessageBody(messageBody)}
        
        ${signatureHTML}
    </div>
</body>
</html>
  `;
};

// Format message body with proper paragraphs
const formatMessageBody = (text) => {
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    return paragraphs.map(p => {
        const formatted = p.trim().replace(/\n/g, '<br>');
        return `<p style="margin: 0 0 15px 0; color: #333;">${formatted}</p>`;
    }).join('');
};

// Get signature HTML based on style
const getSignatureByStyle = (style, name, title, company, email, phone, website) => {
    switch (style) {
        case 'casual':
            return getCasualSignature(name, title, company, email, phone, website);
        case 'minimal':
            return getMinimalSignature(name, title, company, email, phone, website);
        case 'corporate':
            return getCorporateSignature(name, title, company, email, phone, website);
        default:
            return getProfessionalSignature(name, title, company, email, phone, website);
    }
};

// Professional Signature (Natural, not robotic)
const getProfessionalSignature = (name, title, company, email, phone, website) => {
    return `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600; color: #1f2937;">${name}</p>
        ${title ? `<p style="margin: 0 0 2px 0; font-size: 14px; color: #6b7280;">${title}</p>` : ''}
        ${company ? `<p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 500; color: #4b5563;">${company}</p>` : ''}
        
        <div style="font-size: 13px; color: #6b7280; line-height: 1.8;">
            <div style="margin: 3px 0;">📧 <a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a></div>
            ${phone ? `<div style="margin: 3px 0;">📱 ${phone}</div>` : ''}
            ${website ? `<div style="margin: 3px 0;">🌐 <a href="https://${website}" style="color: #3b82f6; text-decoration: none;">${website}</a></div>` : ''}
        </div>
    </div>
  `;
};

// Casual & Friendly Signature
const getCasualSignature = (name, title, company, email, phone, website) => {
    return `
    <div style="margin-top: 25px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0; font-size: 15px; color: #4b5563;">Cheers,</p>
        <p style="margin: 8px 0 3px 0; font-size: 17px; font-weight: 600; color: #1f2937;">${name}</p>
        ${title ? `<p style="margin: 0; font-size: 13px; color: #6b7280; font-style: italic;">${title}${company ? ` @ ${company}` : ''}</p>` : ''}
        
        <div style="margin-top: 12px; font-size: 13px; color: #6b7280;">
            <div>✉️ ${email}</div>
            ${phone ? `<div>☎️ ${phone}</div>` : ''}
            ${website ? `<div>🔗 ${website}</div>` : ''}
        </div>
    </div>
  `;
};

// Minimal Signature (Very clean and simple)
const getMinimalSignature = (name, title, company, email, phone, website) => {
    return `
    <div style="margin-top: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 5px 0; font-size: 15px; color: #374151;">${name}</p>
        ${title || company ? `<p style="margin: 0 0 10px 0; font-size: 13px; color: #9ca3af;">${title}${title && company ? ' · ' : ''}${company}</p>` : ''}
        <p style="margin: 0; font-size: 13px; color: #6b7280;">${email}${phone ? ` · ${phone}` : ''}</p>
    </div>
  `;
};

// Corporate Signature (More formal)
const getCorporateSignature = (name, title, company, email, phone, website) => {
    return `
    <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-left: 4px solid #3b82f6; font-family: 'Georgia', 'Times New Roman', serif;">
        <table cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td style="padding-right: 20px; vertical-align: top;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                </td>
                <td style="vertical-align: top;">
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; color: #1f2937;">${name}</p>
                    ${title ? `<p style="margin: 0 0 2px 0; font-size: 13px; color: #6b7280;">${title}</p>` : ''}
                    ${company ? `<p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #3b82f6;">${company}</p>` : ''}
                    
                    <div style="font-size: 12px; color: #6b7280; line-height: 1.6;">
                        <div>E: <a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a></div>
                        ${phone ? `<div>T: ${phone}</div>` : ''}
                        ${website ? `<div>W: <a href="https://${website}" style="color: #3b82f6; text-decoration: none;">${website}</a></div>` : ''}
                    </div>
                </td>
            </tr>
        </table>
    </div>
  `;
};

module.exports = {
    createEmailTemplate
};