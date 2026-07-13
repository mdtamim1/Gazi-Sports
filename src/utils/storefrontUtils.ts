export function convertToBengaliDigits(numStr: string): string {
  if (!numStr) return '';
  const englishToBengali: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return numStr.split('').map(char => englishToBengali[char] || char).join('');
}

export function replaceContactInfo(text: string, contactInfo: { phoneNumber: string; whatsappNumber: string; email: string; messengerUrl: string }): string {
  if (!text || !contactInfo) return text;
  
  const formattedPhone = contactInfo.phoneNumber || '';
  const formattedPhoneBengali = convertToBengaliDigits(formattedPhone);
  
  const formattedWhatsapp = contactInfo.whatsappNumber || '';
  const formattedWhatsappBengali = convertToBengaliDigits(formattedWhatsapp);

  const email = contactInfo.email || '';

  let result = text;
  
  // Replace Bengali phone number placeholders/hardcoded instances
  result = result.replace(/০১৭০০০০০০০০/g, formattedPhoneBengali || '০১৭০০০০০০০০');
  result = result.replace(/01700000000/g, formattedPhone || '01700000000');
  
  // Replace WhatsApp instances
  result = result.replace(/\+৮৮০১৭০০০০০০০০/g, formattedWhatsappBengali ? ('+' + formattedWhatsappBengali) : '+৮৮০১৭০০০০০০০০');
  result = result.replace(/8801700000000/g, formattedWhatsapp || '8801700000000');
  result = result.replace(/\+8801700000000/g, formattedWhatsapp ? ('+' + formattedWhatsapp) : '+8801700000000');
  
  // Replace emails
  result = result.replace(/support@vipcommerce\.com/g, email || 'support@vipcommerce.com');
  
  return result;
}

export function formatPageContent(text: string): string {
  if (!text) return '';
  
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n');
  
  // Check if there is any HTML tag
  const hasHtml = /<[a-z/][^>]*>/i.test(normalized);
  if (!hasHtml) {
    // Convert double newlines to paragraphs, and single newlines to <br/>
    return normalized
      .split(/\n\n+/)
      .map(para => {
        const cleaned = para.trim().replace(/\n/g, '<br />');
        return cleaned ? `<p>${cleaned}</p>` : '';
      })
      .filter(p => p !== '')
      .join('');
  }
  
  // If it has HTML, safely convert newlines in text nodes to <br />
  const parts = normalized.split(/(<[^>]+>)/g);
  const formattedParts = parts.map(part => {
    if (part.startsWith('<') && part.endsWith('>')) {
      // This is an HTML tag, don't modify newlines inside it
      return part;
    } else {
      // This is a text node. If it consists purely of whitespace/newlines,
      // leave it unchanged to prevent extra space between tags like <ul> and <li>.
      if (part.trim() === '') {
        return part;
      }
      // Otherwise, convert newlines to <br />
      return part.replace(/\n/g, '<br />');
    }
  });
  
  return formattedParts.join('');
}

