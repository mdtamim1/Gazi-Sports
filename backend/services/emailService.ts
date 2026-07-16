import nodemailer from 'nodemailer';

// ---- Nodemailer transporter (Gmail SMTP) ----
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (not regular password)
    },
  });
};

const STORE_NAME = process.env.STORE_NAME || 'Gazi Sports';
const STORE_URL = process.env.STORE_URL || 'https://gazisports.com';
const STORE_LOGO = `${STORE_URL}/logo.png`;
const FROM_EMAIL = `"${STORE_NAME}" <${process.env.EMAIL_USER}>`;

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
      <p class="unsubscribe">আর ইমেইল পেতে না চাইলে <a href="${STORE_URL}/unsubscribe">এখানে ক্লিক করুন</a></p>
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
    <h2>🎉 সাবস্ক্রিপশন সফল!</h2>
    <p>আপনাকে <strong>${STORE_NAME}</strong>-এর নিউজলেটারে স্বাগতম! এখন থেকে আপনি পাবেন:</p>
    <div>
      <span class="tag">🔥 এক্সক্লুসিভ অফার</span>
      <span class="tag">🆕 নতুন পণ্যের আপডেট</span>
      <span class="tag">🎁 বিশেষ কুপন কোড</span>
      <span class="tag">⚡ ফ্ল্যাশ সেল নোটিশ</span>
    </div>
    <hr class="divider" />
    <p>এখনই কেনাকাটা শুরু করুন এবং সেরা ডিলগুলো উপভোগ করুন।</p>
    <a href="${STORE_URL}" class="btn">🛍️ শপ করুন এখনই</a>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `🎉 ${STORE_NAME}-এ স্বাগতম! আপনার সাবস্ক্রিপশন সফল`,
      html: emailTemplate(content),
    });
    console.log(`[EmailService] Welcome email sent to: ${email}`);
    return true;
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
        <div style="font-size: 0.78rem; color: #6b7280; margin-top: 2px;">${item.quantity}টি × ৳${item.price.toFixed(2)}</div>
      </div>
      <div style="font-weight: 800; font-size: 0.88rem; color: #111827; text-align: right;">
        ৳${(item.price * item.quantity).toFixed(2)}
      </div>
    </div>
  `).join('');

  const content = `
    <h2 style="color: #111827; margin-bottom: 8px;">🛍️ অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!</h2>
    <p>প্রিয় <strong>${customerName}</strong>, আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে। খুব শীঘ্রই আমাদের প্রতিনিধি কল করে অর্ডারটি কনফার্ম করবে।</p>
    
    <div style="background: #f3f4f6; padding: 16px; border-radius: 12px; margin-bottom: 20px; font-size: 0.82rem; line-height: 1.6; color: #374151;">
      <h3 style="margin: 0 0 8px; font-size: 0.88rem; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">অর্ডার বিবরণী:</h3>
      <div><b>অর্ডার আইডি:</b> ${orderId}</div>
      <div><b>তারিখ:</b> ${new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div><b>পেমেন্ট পদ্ধতি:</b> ${paymentMethod}</div>
      <div><b>ডেলিভারি ঠিকানা:</b> ${address}</div>
      <div><b>মোবাইল নম্বর:</b> ${phone}</div>
    </div>

    <h3 style="font-size: 0.92rem; color: #111827; margin-bottom: 12px; border-bottom: 1.5px solid #111827; padding-bottom: 4px;">অর্ডারকৃত পণ্যসমূহ:</h3>
    ${itemsHtml}

    <div style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 0.85rem; line-height: 1.6; color: #4b5563;">
      <div style="display: flex; justify-content: space-between;">
        <span>উপমোট (Subtotal):</span>
        <span style="font-weight: 700; color: #111827;">৳${subtotal.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 4px;">
        <span>ডেলিভারি চার্জ:</span>
        <span style="font-weight: 700; color: #111827;">৳${deliveryCharge.toFixed(2)}</span>
      </div>
      ${discount > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-top: 4px; color: #dc2626;">
        <span>ডিসকাউন্ট:</span>
        <span>-৳${discount.toFixed(2)}</span>
      </div>` : ''}
      <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1rem; border-top: 2px solid #111827; padding-top: 8px; margin-top: 8px; color: #e11d48;">
        <span>সর্বমোট (Total):</span>
        <span>৳${total.toFixed(2)}</span>
      </div>
    </div>

    <hr class="divider" />
    <p>আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!</p>
    <a href="${STORE_URL}" class="btn" style="color: white !important;">🛍️ আরও শপ করুন</a>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `🛍️ ${STORE_NAME} - অর্ডার রশিদ (Order Confirmation #${orderId})`,
      html: emailTemplate(content),
    });
    console.log(`[EmailService] Order confirmation email sent to: ${email}`);
    return true;
  } catch (err) {
    console.error('[EmailService] Failed to send order confirmation email:', err);
    return false;
  }
};


