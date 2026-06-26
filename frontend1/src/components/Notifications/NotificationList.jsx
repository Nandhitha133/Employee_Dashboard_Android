import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  InformationCircleIcon, 
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { notificationAPI } from '../../services/api';

const NotificationList = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getAll();
      setNotifications(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'LOGIN':
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
      case 'TIMESHEET_SUBMIT':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      case 'TIMESHEET_APPROVED':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'TIMESHEET_REJECTED':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'LEAVE_APPLY':
        return <CalendarIcon className="h-6 w-6 text-purple-500" />;
      case 'LEAVE_APPROVED':
        return <CheckCircleIcon className="h-6 w-6 text-green-600" />;
      case 'LEAVE_REJECTED':
        return <XCircleIcon className="h-6 w-6 text-red-600" />;
      case 'EXIT_SUBMIT':
        return <ClockIcon className="h-6 w-6 text-indigo-500" />;
      case 'EXIT_APPROVED':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'EXIT_REJECTED':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'SPECIAL_PERMISSION_SUBMIT':
        return <ClockIcon className="h-6 w-6 text-teal-500" />;
      case 'SPECIAL_PERMISSION_APPROVED':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'SPECIAL_PERMISSION_REJECTED':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 max-h-[80vh] flex flex-col">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <button 
          onClick={markAllAsRead}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Mark all as read
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-2">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BellIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification._id} 
              className={`p-3 rounded-lg transition-colors ${
                notification.isRead ? 'bg-white' : 'bg-blue-50'
              } hover:bg-gray-50 border border-gray-100 cursor-pointer`}
              onClick={() => !notification.isRead && markAsRead(notification._id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-900' : 'text-blue-900'}`}>
                    {notification.title}
                  </p>
                  <p className={`text-xs mt-1 ${notification.isRead ? 'text-gray-500' : 'text-blue-700'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="flex-shrink-0">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-600"></span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-2 border-t border-gray-100 bg-gray-50 rounded-b-lg text-center">
        <button 
          onClick={onClose}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default NotificationList;
