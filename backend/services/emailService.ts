import nodemailer from 'nodemailer';
import https from 'https';

// ---- Nodemailer transporter (Supports dynamic SMTP config) ----
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true'; // true for port 465, false for 587
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;

  // If using Gmail, use Nodemailer's built-in Gmail helper
  if (host.includes('gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Custom SMTP server configuration (e.g., Brevo, Zoho Mail, cPanel)
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const STORE_NAME = process.env.STORE_NAME || 'Gazi Sports';
const STORE_URL = process.env.STORE_URL || 'https://gazisports24.com';
const STORE_LOGO = `${STORE_URL}/logo.png`;
const FROM_EMAIL = `"${STORE_NAME}" <${process.env.EMAIL_USER}>`;

const sendMailHelper = async (to: string, subject: string, html: string): Promise<boolean> => {
  const emailPass = process.env.EMAIL_PASS || '';
  
  if (emailPass.startsWith('xkeysib-')) {
    console.log('[EmailService] Detected Brevo API Key. Sending email via Brevo Web API...');
    return new Promise((resolve) => {
      const data = JSON.stringify({
        sender: {
          name: STORE_NAME,
          email: process.env.EMAIL_USER || 'orders@gazisports24.com',
        },
        to: [
          {
            email: to,
          },
        ],
        subject: subject,
        htmlContent: html,
      });

      const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': emailPass,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(data),
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else {
            console.error(`[EmailService] API Send Fail: Status ${res.statusCode}, Body: ${responseData}`);
            resolve(false);
          }
        });
      });

      req.on('error', (e) => {
        console.error('[EmailService] API request error:', e);
        resolve(false);
      });

      req.write(data);
      req.end();
    });
  }

  // Fallback to Nodemailer SMTP
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
  return true;
};

// ---- HTML email base template ----
const emailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${STORE_NAME}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #111827; padding: 28px 32px; text-align: center; }
    .header img { height: 52px; object-fit: contain; }
    .header h1 { color: #e11d48; font-size: 1.1rem; margin: 8px 0 0; letter-spacing: 2px; font-weight: 800; }
    .body { padding: 32px; color: #1f2937; }
    .body h2 { font-size: 1.3rem; font-weight: 800; margin: 0 0 12px; color: #111827; }
    .body p { font-size: 0.92rem; line-height: 1.7; color: #4b5563; margin: 0 0 16px; }
    .btn { display: inline-block; background: #e11d48; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 100px; font-weight: 700; font-size: 0.9rem; margin-top: 8px; }
    .divider { border: none; border-top: 1px solid #f3f4f6; margin: 24px 0; }
    .tag { display: inline-block; background: #fef2f2; color: #e11d48; border-radius: 100px; padding: 4px 12px; font-size: 0.78rem; font-weight: 700; margin: 4px 4px 4px 0; }
    .product-card { display: flex; gap: 12px; align-items: center; background: #f9fafb; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
    .product-img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
    .product-info { flex: 1; }
    .product-name { font-weight: 700; font-size: 0.88rem; color: #111827; margin: 0 0 4px; }
    .product-price { color: #e11d48; font-weight: 800; font-size: 0.9rem; }
    .footer { background: #111827; padding: 20px 32px; text-align: center; }
    .footer p { color: #6b7280; font-size: 0.75rem; margin: 4px 0; }
    .footer a { color: #9ca3af; text-decoration: none; }
    .unsubscribe { font-size: 0.7rem; color: #6b7280; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="${STORE_LOGO}" alt="${STORE_NAME}" onerror="this.style.display='none'" />
      <h1>${STORE_NAME.toUpperCase()}</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
      <p><a href="${STORE_URL}">${STORE_URL}</a></p>
      <p class="unsubscribe">To unsubscribe from our emails, <a href="${STORE_URL}/unsubscribe">click here</a></p>
    </div>
  </div>
</body>
</html>
`;

// ---- Welcome email (on subscribe) ----
export const sendWelcomeEmail = async (email: string): Promise<boolean> => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[EmailService] EMAIL_USER or EMAIL_PASS not set in .env, skipping email.');
    return false;
  }

  const content = `
    <h2>🎉 Subscription Successful!</h2>
    <p>Welcome to <strong>${STORE_NAME}</strong>'s newsletter! From now on, you'll receive:</p>
    <div>
      <span class="tag">🔥 Exclusive Offers</span>
      <span class="tag">🆕 New Product Updates</span>
      <span class="tag">🎁 Special Coupon Codes</span>
      <span class="tag">⚡ Flash Sale Alerts</span>
    </div>
    <hr class="divider" />
    <p>Start shopping now and enjoy the best deals.</p>
    <a href="${STORE_URL}" class="btn">🛍️ Shop Now</a>
  `;

  try {
    const success = await sendMailHelper(email, `🎉 Welcome to ${STORE_NAME}! Your subscription was successful`, emailTemplate(content));
    if (success) {
      console.log(`[EmailService] Welcome email sent to: ${email}`);
    }
    return success;
  } catch (err) {
    console.error('[EmailService] Failed to send welcome email:', err);
    return false;
  }
};

// ---- Order Confirmation email ----
export const sendOrderConfirmationEmail = async (
  email: string, 
  orderId: string, 
  customerName: string, 
  items: any[], 
  subtotal: number, 
  deliveryCharge: number, 
  discount: number, 
  total: number,
  paymentMethod: string,
  phone: string,
  address: string
): Promise<boolean> => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[EmailService] EMAIL_USER or EMAIL_PASS not set in .env, skipping order confirmation email.');
    return false;
  }

  // Only send if we have a valid-looking email
  if (!email || !email.includes('@')) {
    console.log(`[EmailService] Skipping confirmation email since no valid email address is provided (${email}).`);
    return false;
  }

  const itemsHtml = items.map(item => `
    <div class="product-card" style="display: flex; justify-content: space-between; align-items: center; background: #f9fafb; border-radius: 8px; padding: 10px; margin-bottom: 8px; border: 1px solid #f3f4f6;">
      <div>
        <div style="font-weight: 700; font-size: 0.85rem; color: #111827;">${item.name} (${item.size || 'Free Size'})</div>
        <div style="font-size: 0.78rem; color: #6b7280; margin-top: 2px;">${item.quantity} pcs × ৳${item.price.toFixed(2)}</div>
      </div>
      <div style="font-weight: 800; font-size: 0.88rem; color: #111827; text-align: right;">
        ৳${(item.price * item.quantity).toFixed(2)}
      </div>
    </div>
  `).join('');

  const content = `
    <h2 style="color: #111827; margin-bottom: 8px;">🛍️ Your order has been received successfully!</h2>
    <p>Dear <strong>${customerName}</strong>, your order has been placed successfully. Our representative will call you shortly to confirm the order.</p>
    
    <div style="background: #f3f4f6; padding: 16px; border-radius: 12px; margin-bottom: 20px; font-size: 0.82rem; line-height: 1.6; color: #374151;">
      <h3 style="margin: 0 0 8px; font-size: 0.88rem; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">Order Summary:</h3>
      <div><b>Order ID:</b> ${orderId}</div>
      <div><b>Date:</b> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div><b>Payment Method:</b> ${paymentMethod}</div>
      <div><b>Delivery Address:</b> ${address}</div>
      <div><b>Mobile Number:</b> ${phone}</div>
    </div>

    <h3 style="font-size: 0.92rem; color: #111827; margin-bottom: 12px; border-bottom: 1.5px solid #111827; padding-bottom: 4px;">Ordered Items:</h3>
    ${itemsHtml}

    <div style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 0.85rem; line-height: 1.6; color: #4b5563;">
      <div style="display: flex; justify-content: space-between;">
        <span>Subtotal:</span>
        <span style="font-weight: 700; color: #111827;">৳${subtotal.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 4px;">
        <span>Delivery Charge:</span>
        <span style="font-weight: 700; color: #111827;">৳${deliveryCharge.toFixed(2)}</span>
      </div>
      ${discount > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-top: 4px; color: #dc2626;">
        <span>Discount:</span>
        <span>-৳${discount.toFixed(2)}</span>
      </div>` : ''}
        <span>Total:</span>
        <span>৳${total.toFixed(2)}</span>
      </div>
    </div>

    <hr class="divider" />
    <p>Thank you for shopping with us!</p>
    <a href="${STORE_URL}" class="btn" style="color: white !important;">🛍️ Shop More</a>
  `;

  try {
    const success = await sendMailHelper(email, `🛍️ ${STORE_NAME} - Order Confirmation #${orderId}`, emailTemplate(content));
    if (success) {
      console.log(`[EmailService] Order confirmation email sent to: ${email}`);
    }
    return success;
  } catch (err) {
    console.error('[EmailService] Failed to send order confirmation email:', err);
    return false;
  }
};


