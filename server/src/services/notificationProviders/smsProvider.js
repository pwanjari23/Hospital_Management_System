/**
 * Replaceable SMS Notification Provider
 * Gracefully logs outgoing SMS and simulates provider delivery (e.g. Twilio, Gupshup).
 * Missing credentials or unconfigured provider will never throw errors or halt workflows.
 */
export const smsProvider = {
  name: 'SMS',
  async send(params = {}) {
    const { recipientPhone, to, phone, message } = params;
    const targetPhone = recipientPhone || to || phone;
    try {
      if (!targetPhone) {
        return {
          success: false,
          channel: 'SMS',
          reason: 'No recipient phone specified',
        };
      }

      return {
        success: true,
        channel: 'SMS',
        recipient: targetPhone,
        messagePreview: message ? message.slice(0, 50) : '',
        dispatchedAt: new Date(),
        referenceId: `SMS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
    } catch (err) {
      return {
        success: false,
        channel: 'SMS',
        error: err.message,
      };
    }
  },
};

export default smsProvider;
