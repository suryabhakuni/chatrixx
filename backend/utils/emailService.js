const nodemailer = require('nodemailer');

// Create a transporter
let transporter;

/**
 * Initialize the email service
 */
const initializeEmailService = () => {
  // Check if email configuration is provided
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('Email service not configured. Email notifications will be disabled.');
    return;
  }

  try {
    // Create a transporter using SMTP
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Verify connection
    transporter.verify((error) => {
      if (error) {
        console.error('Email service error:', error);
      } else {
        console.log('Email service is ready');
      }
    });
  } catch (error) {
    console.error('Failed to initialize email service:', error);
  }
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @returns {Promise} - Nodemailer send result
 */
const sendEmail = async (options) => {
  try {
    if (!transporter) {
      console.log('Email service not initialized. Skipping email send.');
      return { accepted: [], rejected: [options.to], pending: false, response: 'Email service not initialized' };
    }

    const { to, subject, text, html } = options;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Chatrixx'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@chatrixx.com'}>`,
      to,
      subject,
      text,
      html
    };

    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    // Return a mock response instead of throwing
    return { accepted: [], rejected: [options.to], pending: false, response: error.message };
  }
};

/**
 * Send a notification email
 * @param {Object} user - User to notify
 * @param {Object} notification - Notification data
 * @returns {Promise} - Email send result
 */
const sendNotificationEmail = async (user, notification) => {
  try {
    // Check if user has an email
    if (!user || !user.email) {
      console.log('User has no email address. Skipping notification email.');
      return { accepted: [], rejected: ['no-email'], pending: false, response: 'User has no email address' };
    }

    const { title, body, type, data } = notification;

    // Create email content based on notification type
    let emailSubject = title;
    let emailText = body;
    let emailHtml = `<p>${body}</p>`;

    // Customize email based on notification type
    if (type === 'new_message') {
      const { senderName, conversationName } = data || {};
      emailSubject = `New message from ${senderName || 'a user'}`;
      emailText = `You have a new message from ${senderName || 'a user'} in ${conversationName || 'a conversation'}`;
      emailHtml = `
        <h2>New Message</h2>
        <p>You have a new message from <strong>${senderName || 'a user'}</strong> in <strong>${conversationName || 'a conversation'}</strong>.</p>
        <p>Message: ${body}</p>
        <p>Login to the app to view and reply.</p>
      `;
    } else if (type === 'connection_request') {
      const { senderName } = data || {};
      emailSubject = `Connection request from ${senderName || 'a user'}`;
      emailText = `${senderName || 'A user'} sent you a connection request`;
      emailHtml = `
        <h2>Connection Request</h2>
        <p><strong>${senderName || 'A user'}</strong> sent you a connection request.</p>
        <p>Login to the app to accept or decline.</p>
      `;
    }

    // Send the email
    return await sendEmail({
      to: user.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });
  } catch (error) {
    console.error('Error sending notification email:', error);
    // Return a mock response instead of throwing
    return { accepted: [], rejected: [user?.email || 'unknown'], pending: false, response: error.message };
  }
};

module.exports = {
  initializeEmailService,
  sendEmail,
  sendNotificationEmail
};
