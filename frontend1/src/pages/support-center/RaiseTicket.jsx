import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../services/api';
import { Upload, MessageSquare, AlertCircle, Send, CheckCircle, X, FileText, ArrowLeft, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

const RaiseTicket = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    category: '',
    priority: 'Medium',
    subject: '',
    description: ''
  });

  const categories = [
    'Attendance Issue',
    'Leave Management Issue',
    'Timesheet Issue',
    'Payroll & Salary Issue',
    'PF/ESI Issue',
    'Appraisal Issue',
    'Employee Letter/Document Issue/download issues',
    'Portal Bug/Error',
    'Technical Support',
    'Exit & Relieving Process Issue',
    'HR Support',
    'General Query',
    'Other'
  ];

  const priorities = [
    { label: 'Low', color: 'bg-blue-100 text-blue-700' },
    { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { label: 'High', color: 'bg-orange-100 text-orange-700' },
    { label: 'Critical', color: 'bg-red-100 text-red-700' }
  ];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 5) {
      alert('You can only upload up to 5 files.');
      return;
    }
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const submissionData = new FormData();
    submissionData.append('category', formData.category);
    submissionData.append('priority', formData.priority);
    submissionData.append('subject', formData.subject);
    submissionData.append('description', formData.description);
    
    selectedFiles.forEach(file => {
      submissionData.append('attachments', file);
    });

    try {
      await supportAPI.createTicket(submissionData);
      setSuccess(true);
      
      // Trigger Confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F1A6F', '#7c3aed', '#3b82f6', '#10b981']
      });

      setTimeout(() => navigate('/support/my-tickets'), 3000);
    } catch (err) {
      alert('Failed to raise ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center border border-green-100 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ticket Raised Successfully!</h2>
          <p className="text-gray-600 mb-6">Our support team will look into your issue shortly. You will be redirected to your tickets list.</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full animate-progress-fast"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row">
      {/* Left Panel: Info & Aesthetics */}
      <div className="lg:w-1/3 bg-gradient-to-br from-[#1A0E2E] via-[#311145] to-[#120720] p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10 animate-stagger-1">
          <div className="flex flex-col sm:flex-row lg:flex-col gap-4 mb-12">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-violet-200 hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-semibold tracking-wide uppercase">Back to Support</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 animate-pulse-soft">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold leading-tight">
              How can we <br />
              <span className="text-violet-300">help you today?</span>
            </h1>
            <p className="text-lg text-violet-100/80 max-w-sm leading-relaxed">
              Submit your request and our specialized team will ensure a swift resolution. We're here to support your success.
            </p>
          </div>

          <div className="mt-16 space-y-8 animate-stagger-2">
            <div className="flex gap-4 hover:translate-x-2 transition-transform duration-300">
              <div className="w-10 h-10 bg-violet-400/20 rounded-full flex items-center justify-center shrink-0 border border-violet-400/30">
                <CheckCircle className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <h4 className="font-bold text-white">Fast Response</h4>
                <p className="text-sm text-violet-100/60">High priority issues are addressed within 2 hours.</p>
              </div>
            </div>
            <div className="flex gap-4 hover:translate-x-2 transition-transform duration-300">
              <div className="w-10 h-10 bg-violet-400/20 rounded-full flex items-center justify-center shrink-0 border border-violet-400/30">
                <AlertCircle className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <h4 className="font-bold text-white">Detailed Tracking</h4>
                <p className="text-sm text-violet-100/60">Real-time status updates for every ticket raised.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-12 border-t border-white/10 animate-stagger-3 flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1,2,3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#1A0E2E] bg-violet-400 flex items-center justify-center text-[10px] font-bold">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-xs text-violet-200 font-medium italic">"Dedicated to employee excellence."</p>
          </div>

          {/* New Animation GIF */}
          <div className="relative group">
            <div className="absolute inset-0 bg-violet-400/20 rounded-3xl blur-2xl group-hover:bg-violet-400/40 transition-all duration-500"></div>
            <img 
              src="https://www.stratanetworks.nz/wp-content/uploads/2021/12/animation_640_kwnxzzbe.gif" 
              alt="Support Animation" 
              className="relative z-10 w-full max-w-[200px] mx-auto rounded-2xl mix-blend-lighten opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
            />
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }}></div>
      </div>

      {/* Right Panel: The Form */}
      <div className="flex-1 p-6 lg:p-16 overflow-y-auto">
        <div className="max-w-2xl mx-auto animate-stagger-1">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Raise Ticket</h2>
              <p className="text-gray-500 text-sm mt-1">Please fill out the form below to register your concern.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/support/my-tickets')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:text-[#4F1A6F] hover:border-[#4F1A6F]/20 hover:bg-[#4F1A6F]/5 font-bold rounded-2xl shadow-sm transition-all"
              >
                <FileText className="w-4 h-4 text-[#4F1A6F]" />
                My Tickets History
              </button>
              <div className="bg-[#4F1A6F]/10 p-3 rounded-2xl animate-bounce shrink-0">
                <Sparkles className="w-5 h-5 text-[#4F1A6F]" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-stagger-2">
              <div className="space-y-2 group">
                <label className="text-sm font-bold text-gray-700 tracking-wide uppercase flex items-center gap-2 group-focus-within:text-[#4F1A6F] transition-colors">
                  Issue Category
                  <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#4F1A6F]/10 focus:border-[#4F1A6F] transition-all outline-none text-gray-800 font-medium shadow-sm appearance-none cursor-pointer hover:border-gray-300"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 tracking-wide uppercase">Priority Level</label>
                <div className="flex p-1.5 bg-gray-100 rounded-2xl gap-1">
                  {priorities.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFormData({...formData, priority: p.label})}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                        formData.priority === p.label 
                        ? `bg-white text-gray-900 shadow-md transform scale-[1.05]` 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 animate-stagger-3 group">
              <label className="text-sm font-bold text-gray-700 tracking-wide uppercase flex items-center gap-2 group-focus-within:text-[#4F1A6F] transition-colors">
                Subject Line
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Brief summary of the issue"
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#4F1A6F]/10 focus:border-[#4F1A6F] transition-all outline-none text-gray-800 font-medium shadow-sm hover:border-gray-300"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
              />
            </div>

            <div className="space-y-2 animate-stagger-4 group">
              <label className="text-sm font-bold text-gray-700 tracking-wide uppercase flex items-center gap-2 group-focus-within:text-[#4F1A6F] transition-colors">
                Full Description
                <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows="6"
                placeholder="Provide as much detail as possible..."
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#4F1A6F]/10 focus:border-[#4F1A6F] transition-all outline-none resize-none text-gray-800 font-medium shadow-sm hover:border-gray-300"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 tracking-wide uppercase">Evidence & Attachments</label>
              <div 
                onClick={() => fileInputRef.current.click()}
                className="relative group overflow-hidden bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 hover:border-[#4F1A6F] hover:bg-[#4F1A6F]/5 transition-all cursor-pointer"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-sm border border-gray-100">
                  <Upload className="w-8 h-8 text-[#4F1A6F]" />
                </div>
                <div className="text-center">
                  <p className="text-gray-900 font-bold text-lg">Drop files here or click to browse</p>
                  <p className="text-gray-500 text-sm mt-1">Upload up to 5 files (Max 10MB each)</p>
                </div>
                <div className="absolute inset-0 bg-[#4F1A6F]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-[#4F1A6F]/10 rounded-xl flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-[#4F1A6F]" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-gray-800 truncate">{file.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFile(idx)}
                        className="p-2 hover:bg-red-50 rounded-xl text-red-400 hover:text-red-600 transition-all shrink-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-gray-100">
              <div className="flex items-center gap-3 text-gray-500">
                <AlertCircle className="w-5 h-5 text-[#4F1A6F]" />
                <span className="text-xs font-medium italic">Our team typically responds within 24 hours.</span>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 sm:flex-none px-10 py-4 text-gray-500 font-bold hover:text-gray-900 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-1 sm:flex-none px-12 py-4 bg-gradient-to-r from-[#4F1A6F] to-[#2B0940] hover:from-[#5C1F82] hover:to-[#380C52] text-white font-bold rounded-2xl shadow-xl shadow-[#4F1A6F]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Submit Request
                      <Send className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RaiseTicket;
