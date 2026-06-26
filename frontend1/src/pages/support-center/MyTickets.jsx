import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../services/api';
import { Plus, Search, Filter, Clock, CheckCircle2, AlertCircle, ChevronRight, MessageSquare, ArrowLeft } from 'lucide-react';

const MyTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await supportAPI.getMyTickets();
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'In Review': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Assigned': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Resolved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Closed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Reopened': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'All' || ticket.status === filter;
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-full mx-auto px-6 py-8">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/support/raise-ticket')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-all group mb-6 font-bold"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#262760]" />
        <span className="text-sm tracking-wide uppercase">Back to Raise Ticket</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Tickets</h1>
          <p className="text-gray-600 mt-1">Track and manage your reported issues.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Tickets</p>
          <p className="text-2xl font-bold text-gray-800">{tickets.length}</p>
        </div>
        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
          <p className="text-sm font-medium text-blue-600 mb-1">Open Issues</p>
          <p className="text-2xl font-bold text-blue-800">{tickets.filter(t => t.status === 'Open').length}</p>
        </div>
        <div className="bg-green-50 p-5 rounded-2xl border border-green-100 shadow-sm">
          <p className="text-sm font-medium text-green-600 mb-1">Resolved</p>
          <p className="text-2xl font-bold text-green-800">{tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length}</p>
        </div>
        <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 shadow-sm">
          <p className="text-sm font-medium text-orange-600 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-orange-800">{tickets.filter(t => ['In Review', 'Assigned'].includes(t.status)).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Filters and Search */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by ID or Subject..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="In Review">In Review</option>
              <option value="Assigned">Assigned</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Reopened">Reopened</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Tickets List */}
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-20 text-center">
              <div className="inline-block w-10 h-10 border-4 border-[#262760] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500 font-medium">Loading your tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No tickets found</h3>
              <p className="text-gray-500">
                {searchQuery || filter !== 'All' 
                  ? "Try adjusting your search or filters." 
                  : "You haven't raised any support tickets yet."}
              </p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <div
                key={ticket._id}
                onClick={() => navigate(`/support/tickets/${ticket._id}`)}
                className="group p-6 hover:bg-gray-50 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex gap-5">
                  <div className={`mt-1 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    ticket.priority === 'Critical' ? 'bg-red-50 text-red-600' : 
                    ticket.priority === 'High' ? 'bg-orange-50 text-orange-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {ticket.status === 'Resolved' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">{ticket.ticketId}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {ticket.subject}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5" />
                        {ticket.category}
                      </span>
                      <span>•</span>
                      <span>Raised on {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {ticket.priority === 'Critical' && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            CRITICAL
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pl-16 md:pl-0">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Last Update</p>
                    <p className="text-sm font-medium text-gray-700">{new Date(ticket.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="p-2 rounded-full bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MyTickets;
