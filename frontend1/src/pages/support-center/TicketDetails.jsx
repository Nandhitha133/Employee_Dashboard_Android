import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supportAPI, BASE_URL } from '../../services/api';
import { 
  Send, Paperclip, Clock, CheckCircle2, 
  AlertCircle, ArrowLeft, User, Calendar
} from 'lucide-react';

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = ['admin', 'hr'].includes(user.role);
  const isOwner = ticket && (ticket.employeeId?._id === user._id || ticket.employeeId === user._id);

  const showInReview = isAdmin && !isOwner && ticket?.status === 'Open';
  const showResolved = isAdmin && !isOwner && ['Open', 'In Review', 'Assigned'].includes(ticket?.status);
  const showClose = ticket?.status === 'Resolved';
  const showReopen = ticket?.status === 'Resolved' && (!isAdmin || isOwner);
  const hasActions = showInReview || showResolved || showClose || showReopen;

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const res = await supportAPI.getTicketById(id);
      setTicket(res.data.ticket);
      setComments(res.data.comments);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const res = await supportAPI.addComment(id, { message: newMessage });
      setComments([...comments, res.data]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      await supportAPI.updateStatus(id, { status, comment: `Status changed to ${status}` });
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="p-10 text-center">Loading...</div>;
  if (!ticket) return <div className="p-10 text-center text-red-500">Ticket not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to List
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ticket Info & Chat */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">{ticket.ticketId}</span>
                <h1 className="text-2xl font-bold text-gray-800 mt-1">{ticket.subject}</h1>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border ${
                ticket.status === 'Open' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                ticket.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-100' :
                'bg-gray-50 text-gray-700 border-gray-100'
              }`}>
                {ticket.status}
              </span>
            </div>

            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>

            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Attachments</h3>
                <div className="flex flex-wrap gap-4">
                  {ticket.attachments.map((file, idx) => (
                    <a 
                      key={idx}
                      href={`${BASE_URL}${file.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
                    >
                      <Paperclip className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700">{file.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <User className="w-4 h-4" />
                {ticket.employeeId?.name}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <Calendar className="w-4 h-4" />
                {new Date(ticket.createdAt).toLocaleDateString()}
              </div>
              <div className={`flex items-center gap-2 text-sm font-bold ${
                ticket.priority === 'Critical' ? 'text-red-600' :
                ticket.priority === 'High' ? 'text-orange-600' : 'text-blue-600'
              }`}>
                <AlertCircle className="w-4 h-4" />
                {ticket.priority} Priority
              </div>
            </div>
          </div>

          {/* Conversation */}
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4 max-h-[500px] overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2 mb-4">Conversation</h3>
            {comments.map((comment) => (
              <div 
                key={comment._id}
                className={`flex ${comment.userId._id === user._id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                  comment.userId._id === user._id 
                    ? 'bg-[#262760] text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                }`}>
                  <div className="flex justify-between items-center gap-4 mb-2">
                    <span className="text-[10px] font-bold opacity-75">{comment.userId.name}</span>
                    <span className="text-[10px] opacity-75">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm">{comment.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          {ticket.status !== 'Closed' && (
            <form onSubmit={handleSendMessage} className="relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full p-4 pr-16 rounded-2xl border border-gray-200 shadow-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent outline-none transition-all resize-none min-h-[100px]"
              />
              <button
                type="submit"
                disabled={isSending}
                className="absolute right-4 bottom-4 p-3 bg-[#262760] text-white rounded-xl hover:bg-[#1e1f4a] disabled:opacity-50 transition-all shadow-md"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>

        {/* Sidebar Actions */}
        {hasActions && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Actions</h3>
              <div className="space-y-3">
                {showInReview && (
                  <button 
                    onClick={() => updateStatus('In Review')}
                    className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Mark as In Review
                  </button>
                )}
                {showResolved && (
                  <button 
                    onClick={() => updateStatus('Resolved')}
                    className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark as Resolved
                  </button>
                )}
                {showClose && (
                  <button 
                    onClick={() => updateStatus('Closed')}
                    className="w-full py-2.5 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Close Ticket
                  </button>
                )}
                {showReopen && (
                  <button 
                    onClick={() => updateStatus('Reopened')}
                    className="w-full py-2.5 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 transition-all flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Reopen Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetails;
