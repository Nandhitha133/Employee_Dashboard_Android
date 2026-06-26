import React, { useEffect, useState } from 'react';
import { specialPermissionAPI, BASE_URL } from '../../services/api';

const AdminSpecialPermission = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('All');
  const [location, setLocation] = useState('All');
  const [division, setDivision] = useState('All');

  const load = async () => {
    try {
      setLoading(true);
      const res = await specialPermissionAPI.list({ status });
      setItems(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (_) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const approve = async (id) => {
    await specialPermissionAPI.approve(id);
    await load();
  };
  const reject = async (id) => {
    const reason = window.prompt('Rejection reason (optional)') || '';
    await specialPermissionAPI.reject(id, reason);
    await load();
  };

  const locations = ['All', ...new Set(items.map(i => i.location).filter(l => l && l !== '-'))];
  const divisions = ['All', ...new Set(items.map(i => i.division).filter(d => d && d !== '-'))];

  const filteredItems = items.filter(it => {
    const matchLoc = location === 'All' || it.location === location;
    const matchDiv = division === 'All' || it.division === division;
    return matchLoc && matchDiv;
  });

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex items-center gap-4 flex-wrap">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="p-2 border border-gray-300 rounded text-sm"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="All">All Status</option>
        </select>

        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="p-2 border border-gray-300 rounded text-sm"
        >
          {locations.map(l => <option key={l} value={l}>{l === 'All' ? 'All Locations' : l}</option>)}
        </select>

        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          className="p-2 border border-gray-300 rounded text-sm"
        >
          {divisions.map(d => <option key={d} value={d}>{d === 'All' ? 'All Divisions' : d}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b text-sm font-semibold text-gray-800">Requests</div>
        <div className="p-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-sm text-gray-500">No requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse">
                <thead className="bg-[#262760] text-white">
                  <tr>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Employee</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Location</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Division</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Prev Day On-Premises</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Date</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Shift</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Shortage Hours</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Reason</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Status</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((it) => {
                    const d = new Date(it.date);
                    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return (
                      <tr key={it._id} className="hover:bg-gray-50">
                        <td className="p-2 border text-sm">{it.employeeName} ({it.employeeId})</td>
                        <td className="p-2 border text-sm">{it.location || '-'}</td>
                        <td className="p-2 border text-sm">{it.division || '-'}</td>
                        <td className="p-2 border text-sm">
                          {(() => {
                            const val = Number(it.onPremisesHours || 0);
                            const hh = String(Math.floor(val)).padStart(2, '0');
                            const mm = String(Math.round((val - Math.floor(val)) * 60)).padStart(2, '0');
                            return `${hh}:${mm}`;
                          })()}
                        </td>
                        <td className="p-2 border text-sm">{dateStr}</td>
                        <td className="p-2 border text-sm">{it.shift || '-'}</td>
                        <td className="p-2 border text-sm">
                          {(() => {
                            const val = Number(it.totalHours || 0);
                            const hh = String(Math.floor(val)).padStart(2, '0');
                            const mm = String(Math.round((val - Math.floor(val)) * 60)).padStart(2, '0');
                            return `${hh}:${mm}`;
                          })()}
                        </td>
                        <td className="p-2 border text-sm">{it.reason}</td>
                        <td className="p-2 border text-sm">
                          <span className={`font-semibold ${it.status === 'APPROVED' ? 'text-green-600' : it.status === 'REJECTED' ? 'text-red-600' : 'text-yellow-600'}`}>{it.status}</span>
                        </td>
                        <td className="p-2 border text-sm space-x-2">
                          {it.status === 'PENDING' ? (
                            <>
                              <button onClick={() => approve(it._id)} className="px-3 py-1 rounded bg-green-600 text-white">Approve</button>
                              <button onClick={() => reject(it._id)} className="px-3 py-1 rounded bg-red-600 text-white">Reject</button>
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSpecialPermission;

