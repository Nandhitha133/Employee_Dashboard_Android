import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../services/api';
import { 
  Search, ChevronRight, AlertCircle, 
  Download, ListFilter, ArrowLeft
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AllTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const priorityParam = params.get('priority');
    if (statusParam) setStatusFilter(statusParam);
    if (priorityParam) setPriorityFilter(priorityParam);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      
      const res = await supportAPI.getAllTickets(params);
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

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.employeeId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.employeeId?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const downloadPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text('Employee Support Queue', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableColumn = [
      "S.No", 
      "Ticket ID", 
      "Employee ID", 
      "Employee Name", 
      "Division", 
      "Location", 
      "Subject", 
      "Priority", 
      "Status", 
      "Created", 
      "Resolved Date", 
      "Closed Date"
    ];
    const tableRows = [];

    filteredTickets.forEach((ticket, index) => {
      const resolvedEntry = ticket.history?.find(h => h.status === 'Resolved');
      const resolvedDate = resolvedEntry 
        ? new Date(resolvedEntry.updatedAt).toLocaleDateString('en-GB') 
        : (ticket.resolution?.resolvedAt ? new Date(ticket.resolution.resolvedAt).toLocaleDateString('en-GB') : '-');

      const closedEntry = ticket.history?.find(h => h.status === 'Closed');
      const closedDate = closedEntry 
        ? new Date(closedEntry.updatedAt).toLocaleDateString('en-GB') 
        : '-';

      const ticketData = [
        index + 1,
        ticket.ticketId,
        ticket.employeeId?.employeeId || 'N/A',
        ticket.employeeId?.name || 'N/A',
        ticket.employeeId?.division || 'N/A',
        ticket.employeeId?.location || 'N/A',
        ticket.subject,
        ticket.priority,
        ticket.status,
        new Date(ticket.createdAt).toLocaleDateString('en-GB'),
        resolvedDate,
        closedDate
      ];
      tableRows.push(ticketData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [38, 39, 96], textColor: [255, 255, 255] },
      styles: { fontSize: 8 }
    });

    doc.save(`Support_Queue_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="max-w-full mx-auto px-6 py-8">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/admin/support/dashboard')} 
        className="flex items-center gap-2 text-[#262760] hover:text-indigo-700 transition-colors mb-6 group text-sm font-semibold"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Support Queue</h1>
          <p className="text-gray-600 mt-1">Manage and resolve all employee support tickets.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadPDF} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-600 flex items-center gap-2">
            <Download className="w-5 h-5" />
            <span className="text-sm font-semibold">Download PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-6 bg-gray-50/50 border-b border-gray-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#262760] text-white whitespace-nowrap">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">S.No</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Ticket ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Employee ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Employee Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Division</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Created</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Resolved Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Closed Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="12" className="p-20 text-center font-medium text-gray-500">Loading...</td></tr>
              ) : filteredTickets.length === 0 ? (
                <tr><td colSpan="12" className="p-20 text-center font-medium text-gray-500">No tickets found.</td></tr>
              ) : (
                filteredTickets.map((ticket, index) => {
                  const resolvedEntry = ticket.history?.find(h => h.status === 'Resolved');
                  const resolvedDate = resolvedEntry 
                    ? new Date(resolvedEntry.updatedAt).toLocaleDateString('en-GB') 
                    : (ticket.resolution?.resolvedAt ? new Date(ticket.resolution.resolvedAt).toLocaleDateString('en-GB') : '-');

                  const closedEntry = ticket.history?.find(h => h.status === 'Closed');
                  const closedDate = closedEntry 
                    ? new Date(closedEntry.updatedAt).toLocaleDateString('en-GB') 
                    : '-';

                  return (
                    <tr key={ticket._id} className="hover:bg-gray-50 transition-all group whitespace-nowrap">
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">{ticket.ticketId}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">{ticket.employeeId?.employeeId || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">{ticket.employeeId?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">{ticket.employeeId?.division || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">{ticket.employeeId?.location || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800 truncate max-w-xs">{ticket.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${ticket.priority === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(ticket.createdAt).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{resolvedDate}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{closedDate}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllTickets;
