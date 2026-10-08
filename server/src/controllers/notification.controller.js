import * as notificationService from '../services/notification.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getNotifications = async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const userId = req.user.id;
    const { unreadOnly, priority, type, page, limit } = req.query;

    const result = await notificationService.getNotifications(hospitalId, userId, {
      unreadOnly,
      priority,
      type,
      page,
      limit,
    });

    return sendSuccess(res, result, 'Notifications retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const userId = req.user.id;

    const unreadCount = await notificationService.getUnreadCount(hospitalId, userId);
    return sendSuccess(res, { unreadCount }, 'Unread count retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const userId = req.user.id;
    const { id } = req.params;

    const updated = await notificationService.markAsRead(hospitalId, userId, id);
    return sendSuccess(res, updated, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const userId = req.user.id;

    const result = await notificationService.markAllAsRead(hospitalId, userId);
    return sendSuccess(res, result, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

export const getPreferences = async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const prefs = await notificationService.getNotificationPreferences(hospitalId);
    return sendSuccess(res, prefs, 'Notification preferences retrieved');
  } catch (err) {
    next(err);
  }
};

export const updatePreferences = async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const updated = await notificationService.updateNotificationPreferences(hospitalId, req.body);
    return sendSuccess(res, updated, 'Notification preferences updated');
  } catch (err) {
    next(err);
  }
};
