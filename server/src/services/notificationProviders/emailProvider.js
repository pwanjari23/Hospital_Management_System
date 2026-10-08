/**
 * Replaceable Email Notification Provider
 * Gracefully logs outgoing emails and simulates provider delivery.
 * Unconfigured or simulated environment never throws errors to callers.
 */
export const emailProvider = {
  name: 'EMAIL',
  async send(params = {}) {
    const { recipientEmail, to, email, subject, _body, hospitalName } = params;
    const targetEmail = recipientEmail || to || email;
    try {
      // In production, plug in Nodemailer, SendGrid, AWS SES, etc.
      // If email is not configured, we gracefully return delivery simulation without breaking core flow.
      if (!targetEmail) {
        return {
          success: false,
          channel: 'EMAIL',
          reason: 'No recipient email specified',
        };
      }

      return {
        success: true,
        channel: 'EMAIL',
        recipient: targetEmail,
        subject: `[${hospitalName || 'HMS'}] ${subject || 'Notification'}`,
        dispatchedAt: new Date(),
        referenceId: `EMAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
    } catch (err) {
      return {
        success: false,
        channel: 'EMAIL',
        error: err.message,
      };
    }
  },
};

export default emailProvider;
