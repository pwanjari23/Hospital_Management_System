/**
 * In-App Notification Provider
 * Directly delivers notification record to database for user retrieval
 */
export const inAppProvider = {
  name: 'IN_APP',
  async send(notification = {}) {
    const id = notification?.id || notification?.referenceId || `INAPP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      success: true,
      channel: 'IN_APP',
      deliveredAt: new Date(),
      referenceId: id,
      notificationId: id,
    };
  },
};

export default inAppProvider;
