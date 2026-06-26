import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../services/api';
import { 
  BarChart, Activity, CheckCircle, Clock, 
  AlertTriangle, MessageCircle, ArrowUpRight, Filter,
  XCircle, RefreshCw
} from 'lucide-react';

const SupportDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await supportAPI.getDashboardStats();
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-10 h-10 border-4 border-[#262760] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const cards = [
    { title: 'Total Tickets', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-l-blue-500', filterKey: 'all', activeBg: 'bg-blue-100', activeRing: 'ring-blue-400' },
    { title: 'Open Tickets', value: stats.open, icon: MessageCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-l-amber-500', filterKey: 'Open', activeBg: 'bg-amber-100', activeRing: 'ring-amber-400' },
    { title: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-l-emerald-500', filterKey: 'Resolved', activeBg: 'bg-emerald-100', activeRing: 'ring-emerald-400' },
    { title: 'Closed', value: stats.closed, icon: XCircle, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-l-slate-500', filterKey: 'Closed', activeBg: 'bg-slate-100', activeRing: 'ring-slate-400' },
    { title: 'Reopen Tickets', value: stats.reopened, icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-l-purple-500', filterKey: 'Reopened', activeBg: 'bg-purple-100', activeRing: 'ring-purple-400' },
    { title: 'High Priority', value: stats.highPriority, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-l-rose-500', filterKey: 'HighPriority', activeBg: 'bg-rose-100', activeRing: 'ring-rose-400' },
  ];

  // Filter the recent tickets based on the active filter
  const filteredTickets = (stats.recent || []).filter((ticket) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'HighPriority') return ticket.priority === 'High' || ticket.priority === 'Critical';
    return ticket.status === activeFilter;
  });

  // Determine label for the active filter
  const activeLabel = cards.find(c => c.filterKey === activeFilter)?.title || 'All Tickets';

  return (
    <div className="max-w-full mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Support Dashboard</h1>
          <p className="text-gray-600 mt-1">Analytics and overview of support activity.</p>
        </div>
        <button 
          onClick={() => navigate('/admin/support/all-tickets')}
          className="px-6 py-2.5 bg-[#262760] text-white font-bold rounded-xl shadow-lg hover:bg-[#1e2b58] transition-all flex items-center gap-2"
        >
          View All Tickets
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {cards.map((card, i) => {
          const isActive = activeFilter === card.filterKey;
          return (
            <div 
              key={i} 
              onClick={() => setActiveFilter(card.filterKey)}
              className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${card.border} border-y border-r border-gray-100 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${isActive ? `ring-2 ${card.activeRing} ${card.activeBg} shadow-md -translate-y-1` : ''}`}
            >
              <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center mb-4`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.title}</p>
              <p className="text-3xl font-black text-gray-800 mt-1">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tickets */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-gray-800 text-lg">
                {activeFilter === 'all' ? 'Recently Raised Issues' : activeLabel}
              </h2>
              {activeFilter !== 'all' && (
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                  {filteredTickets.length} result{filteredTickets.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeFilter !== 'all' && (
                <button 
                  onClick={() => setActiveFilter('all')}
                  className="text-sm font-bold text-rose-500 hover:underline flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Clear Filter
                </button>
              )}
              <button 
                onClick={() => navigate('/admin/support/all-tickets')}
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                View Full List
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Filter className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-bold text-sm">No tickets found for "{activeLabel}"</p>
                <p className="text-xs mt-1">Try selecting a different category above.</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div 
                  key={ticket._id} 
                  onClick={() => navigate(`/admin/support/tickets/${ticket._id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${
                      ticket.priority === 'Critical' ? 'bg-red-500' : 
                      ticket.priority === 'High' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">{ticket.subject}</h3>
                      <p className="text-xs text-gray-400 font-medium">Raised by {ticket.employeeId?.name} • {ticket.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      ticket.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                      ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                      ticket.status === 'Closed' ? 'bg-slate-100 text-slate-600' :
                      ticket.status === 'Reopened' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ticket.status}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Filters / Summary */}
      </div>
    </div>
  );
};

export default SupportDashboard;
