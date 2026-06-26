import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, officeHolidayAPI } from '../services/api';
import LoginAnnouncements from '../components/LoginAnnouncements';

const Login = () => {
  const [formData, setFormData] = useState({
    employeeId: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    employeeId: '',
    otp: '',
    newPassword: ''
  });
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const OTP_VALIDITY_SECONDS = 300;
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Modal states
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  
  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Company history slideshow images
  const slides = [
    { url: "/images/12.jpeg", title: "Hosur Office", desc: "" },
    { url: "/images/13.jpeg", title: "Chennai Office", desc: "" },
    {
      url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      title: "Engineering Excellence",
      desc: "State-of-the-art engineering solutions"
    },
    {
      url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      title: "Team Collaboration",
      desc: "Our expert team working together"
    },
    {
      url: "https://images.unsplash.com/photo-1507206130118-b5907f817163?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      title: "Innovation Hub",
      desc: "Driving innovation in construction"
    },
    {
      url: "https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      title: "Project Success",
      desc: "Successful project delivery"
    },
    
   
  ];

  const [todaysUpdates, setTodaysUpdates] = useState([]);
  const [officeHolidays, setOfficeHolidays] = useState([]);
  const [officeHolidayLoading, setOfficeHolidayLoading] = useState(false);
  const [officeHolidayYear, setOfficeHolidayYear] = useState(String(new Date().getFullYear()));

  const availableHolidayYears = useMemo(() => {
    const years = new Set();
    for (const h of officeHolidays) {
      const y = String(h?.dateISO || '').slice(0, 4);
      if (/^\d{4}$/.test(y)) years.add(y);
    }
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [officeHolidays]);

  const filteredOfficeHolidays = useMemo(() => {
    if (officeHolidayYear === 'All') return officeHolidays;
    return officeHolidays.filter((h) => String(h?.dateISO || '').startsWith(`${officeHolidayYear}-`));
  }, [officeHolidays, officeHolidayYear]);

  useEffect(() => {
    const loadUpdates = async () => {
      try {
        const active = await authAPI.announcement.getActive();
        const mapped = (active || []).map((a) => ({
          id: a._id || String(Math.random()),
          title: a.title || 'Update',
          description: a.message || '',
          time: a.startDate ? new Date(a.startDate).toLocaleDateString() : '',
          priority: 'high'
        }));
        setTodaysUpdates(mapped);
      } catch {
        setTodaysUpdates([]);
      }
    };
    loadUpdates();
  }, []);

  const formatHolidayCardDate = (dateISO) => {
    const raw = String(dateISO || '').trim();
    const parts = raw.split('-');
    if (parts.length !== 3) return raw || '';
    const year = parts[0];
    const month = Number(parts[1]);
    const day = parts[2];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = months[month - 1] || parts[1];
    return `${day}-${monthLabel}-${String(year).slice(-2)}`;
  };

  useEffect(() => {
    const loadOfficeHolidays = async () => {
      setOfficeHolidayLoading(true);
      try {
        const res = await officeHolidayAPI.list();
        const items = Array.isArray(res.data) ? res.data : [];
        const mapped = items
          .map((h) => ({
            id: String(h?.id || h?._id || ''),
            name: String(h?.name || '').trim(),
            dateISO: String(h?.dateISO || '').trim()
          }))
          .filter((h) => h.id && h.name && h.dateISO)
          .sort((a, b) => {
            const d = String(a.dateISO).localeCompare(String(b.dateISO));
            if (d !== 0) return d;
            return String(a.name).localeCompare(String(b.name));
          });
        setOfficeHolidays(mapped);
        const years = Array.from(
          new Set(
            mapped
              .map((h) => String(h?.dateISO || '').slice(0, 4))
              .filter((y) => /^\d{4}$/.test(y))
          )
        ).sort((a, b) => Number(b) - Number(a));
        const currentYear = String(new Date().getFullYear());
        const initialYear = years.includes(currentYear) ? currentYear : years[0] || currentYear;
        setOfficeHolidayYear(initialYear);
      } catch {
        setOfficeHolidays([]);
      } finally {
        setOfficeHolidayLoading(false);
      }
    };
    loadOfficeHolidays();
  }, []);


  

  // Skills data for About Us modal
  const skills = [
    { name: "Steel Detailing", percentage: 100 },
    { name: "Connection Design", percentage: 100 },
    { name: "Rebar Detailing", percentage: 90 },
    { name: "Precast Detailing & Design", percentage: 90 },
    { name: "Architectural", percentage: 80 },
    { name: "Structural", percentage: 80 },
    { name: "BIM Services", percentage: 80 },
    { name: "MEP", percentage: 80 },
    { name: "DAS Software", percentage: 90 },
    { name: "Electrical", percentage: 50 }
  ];

  // Animated background particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    // Particle class
    class Particle {
      constructor() {
        this.reset();
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = `rgba(${Math.floor(Math.random() * 100 + 155)}, ${Math.floor(Math.random() * 100 + 155)}, 255, ${Math.random() * 0.3 + 0.1})`;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Reset particle if it goes off screen
        if (this.x > canvas.width || this.x < 0 || this.y > canvas.height || this.y < 0) {
          this.reset();
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles
    const createParticles = () => {
      particles = [];
      for (let i = 0; i < 150; i++) {
        particles.push(new Particle());
      }
    };

    // Draw connections between particles
    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.strokeStyle = `rgba(100, 150, 255, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 15, 44, 0.3)');
      gradient.addColorStop(1, 'rgba(74, 20, 140, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      drawConnections();

      // Draw floating geometric shapes
      drawFloatingShapes();

      animationFrameId = requestAnimationFrame(animate);
    };

    // Draw floating geometric shapes
    const drawFloatingShapes = () => {
      const time = Date.now() * 0.001;

      // Draw rotating triangles
      ctx.save();
      ctx.translate(canvas.width * 0.2, canvas.height * 0.3);
      ctx.rotate(time * 0.2);
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 * i) / 3;
        const x = Math.cos(angle) * 40;
        const y = Math.sin(angle) * 40;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Draw rotating squares
      ctx.save();
      ctx.translate(canvas.width * 0.8, canvas.height * 0.7);
      ctx.rotate(-time * 0.2);
      ctx.strokeStyle = 'rgba(150, 100, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-30, -30, 60, 60);
      ctx.restore();

      // Draw circles
      ctx.save();
      ctx.translate(canvas.width * 0.4, canvas.height * 0.8);
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.05)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 20 + i * 15, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    // Initialize
    resizeCanvas();
    createParticles();
    animate();

    // Event listeners
    window.addEventListener('resize', resizeCanvas);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Slideshow auto-rotate
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'employeeId') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    }
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleForgotPasswordChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'employeeId') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    }
    setForgotPasswordData({
      ...forgotPasswordData,
      [e.target.name]: value
    });
  };

  const validatePassword = (password) => {
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    return specialCharRegex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Password validation
    if (!validatePassword(formData.password)) {
      setError('Password must contain at least one special character');
      setIsLoading(false);
      return;
    }

    try {
      const payload = { ...formData };
      const response = await authAPI.login(payload);
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
      window.history.replaceState(null, '', '/dashboard');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      setIsSendingOtp(true);
      await authAPI.forgotPassword({ employeeId: forgotPasswordData.employeeId });
      setForgotPasswordStep(2);
      setForgotPasswordMessage('OTP sent to your email');
      setOtpSecondsLeft(OTP_VALIDITY_SECONDS);
      setCanResendOtp(false);
    } catch (error) {
      setForgotPasswordMessage(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      setIsResetting(true);
      await authAPI.resetPassword({
        employeeId: forgotPasswordData.employeeId,
        otp: forgotPasswordData.otp,
        newPassword: forgotPasswordData.newPassword
      });
      setForgotPasswordMessage('Password reset successfully');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep(1);
        setForgotPasswordData({ employeeId: '', otp: '', newPassword: '' });
        setForgotPasswordMessage('');
      }, 2000);
    } catch (error) {
      setForgotPasswordMessage(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  useEffect(() => {
    let intervalId;
    if (showForgotPassword && forgotPasswordStep === 2 && otpSecondsLeft > 0) {
      intervalId = setInterval(() => {
        setOtpSecondsLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setCanResendOtp(true);
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showForgotPassword, forgotPasswordStep, otpSecondsLeft]);

  const handleResendOtp = async () => {
    try {
      await authAPI.forgotPassword({ employeeId: forgotPasswordData.employeeId });
      setForgotPasswordMessage('OTP resent to your email');
      setOtpSecondsLeft(OTP_VALIDITY_SECONDS);
      setCanResendOtp(false);
    } catch (error) {
      setForgotPasswordMessage(error.response?.data?.message || 'Failed to resend OTP');
    }
  };

  // About Us Modal
  const AboutUsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-white/20">
          <h2 className="text-2xl font-bold text-white text-center">
            About CALDIM Engineering
          </h2>
          <button
            onClick={() => setShowAboutUs(false)}
            className="absolute right-6 top-6 text-white hover:text-blue-300 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {/* Services */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Our Services</h3>
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl p-6 border border-white/10">
              <h4 className="text-lg font-bold text-white mb-4">Our Expertise</h4>
              <div className="space-y-4">
                {skills.map((skill, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-200 font-medium">{skill.name}</span>
                      <span className="text-white font-bold">{skill.percentage}%</span>
                    </div>
                    <div className="h-2 bg-blue-900/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
                        style={{ width: `${skill.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-2">Our Vision</h3>
              <p className="text-blue-100">
                To be a pioneering global engineering solutions organization, driving innovation and excellence in construction, manufacturing and automotive industries.
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-2">Our Mission</h3>
              <p className="text-blue-100">
                To be the premium partner of choice, delivering innovative and reliable engineering solutions that empower all industries to achieve excellence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Holidays Modal
  const HolidaysModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex justify-center md:justify-start">
              <select
                value={officeHolidayYear}
                onChange={(e) => setOfficeHolidayYear(e.target.value)}
                className="bg-white/90 border border-white/30 text-[#0A0F2C] font-semibold rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="All">All Years</option>
                {availableHolidayYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <h2 className="text-2xl font-bold text-white text-center">
              {officeHolidayYear === 'All' ? 'CALDIM HOLIDAY LIST' : `CALDIM HOLIDAY LIST ${officeHolidayYear}`}
            </h2>
            <div className="flex justify-center md:justify-end">
              <button
                onClick={() => setShowHolidays(false)}
                className="text-white hover:text-blue-300 text-xl"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOfficeHolidays.map((holiday) => (
              <div
                key={holiday.id}
                className="bg-white/10 border border-white/10 rounded-xl p-4 hover:bg-white/20 transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-white mb-1">{formatHolidayCardDate(holiday.dateISO)}</h3>
                <p className="text-blue-100 font-medium border-t border-white/10 pt-2 mt-2">{holiday.name}</p>
              </div>
            ))}
            {!officeHolidayLoading && filteredOfficeHolidays.length === 0 && (
              <div className="bg-white/10 border border-white/10 rounded-xl p-6 text-blue-100 text-center md:col-span-2">
                {officeHolidayYear === 'All'
                  ? 'No office holidays saved'
                  : `No office holidays saved for ${officeHolidayYear}`}
              </div>
            )}
            {officeHolidayLoading && filteredOfficeHolidays.length === 0 && (
              <div className="bg-white/10 border border-white/10 rounded-xl p-6 text-blue-100 text-center md:col-span-2">
                Loading...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Updates Modal
  const UpdatesModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C] rounded-2xl shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="relative p-6 border-b border-white/20">
          <h2 className="text-2xl font-bold text-white">
            UPCOMING EVENTS
          </h2>
          <button
            onClick={() => setShowUpdates(false)}
            className="absolute right-6 top-6 text-white hover:text-blue-300 text-xl"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          <div className="space-y-3 md:space-y-4">
            {todaysUpdates.length === 0 && (
              <div className="bg-white/10 rounded-xl p-5 border border-white/10 text-center text-blue-100">
                No upcoming events
              </div>
            )}
            {todaysUpdates.map((update) => (
              <div key={update.id} className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 rounded-xl p-5 border border-white/10">
                <div className="flex items-start">
                  <div className={`mr-4 mt-1 w-3 h-3 rounded-full ${update.priority === 'high' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">{update.title}</h3>
                    <p className="text-sm md:text-base text-blue-100 mb-2 md:mb-3">{update.description}</p>
                    <span className="text-xs md:text-sm text-blue-300">{update.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          
        </div>

        <div className="p-4 md:p-6 border-t border-white/20">
          <p className="text-center text-white/60 text-xs md:text-sm">
            © 2026 CALDIM Engineering Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );

  // Forgot Password Component
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C]">
        <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#0A0F2C] mb-2">
              Forgot Password
            </h1>
            <p className="text-gray-600 text-sm">Reset your account password</p>
          </div>

          <form className="space-y-4" onSubmit={forgotPasswordStep === 1 ? handleSendOtp : handleResetPassword}>
            {forgotPasswordStep === 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Employee ID</label>
                <input
                  type="text"
                  name="employeeId"
                  value={forgotPasswordData.employeeId}
                  onChange={handleForgotPasswordChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {forgotPasswordStep === 2 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">OTP</label>
                  <input
                    type="text"
                    name="otp"
                    value={forgotPasswordData.otp}
                    onChange={handleForgotPasswordChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                    {otpSecondsLeft > 0 ? (
                      <span>OTP expires in {formatTime(otpSecondsLeft)}</span>
                    ) : (
                      <span>OTP expired</span>
                    )}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={!canResendOtp}
                      className={`font-medium ${canResendOtp ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-not-allowed'}`}
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      value={forgotPasswordData.newPassword}
                      onChange={handleForgotPasswordChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {forgotPasswordMessage && (
              <div className={`text-sm p-3 rounded-lg ${forgotPasswordMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {forgotPasswordMessage}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={forgotPasswordStep === 1 ? isSendingOtp : isResetting}
                className="flex-1 bg-gradient-to-r from-[#0A0F2C] to-[#4A148C] text-white py-2 px-4 rounded-lg font-medium hover:from-[#1A237E] hover:to-[#6A1B9A] transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
              >
                {forgotPasswordStep === 1 ? (
                  isSendingOtp ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send OTP'
                  )
                ) : (
                  isResetting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting...
                    </>
                  ) : (
                    'Reset'
                  )
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modals */}
      {showAboutUs && <AboutUsModal />}
      {showHolidays && <HolidaysModal />}
      {showUpdates && <UpdatesModal />}
      
      <div className="min-h-screen flex bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C] overflow-hidden">
        {/* Left Side - Animated Login Background */}
        <div className="w-full lg:w-1/2 relative overflow-hidden">
          {/* Animated Canvas Background */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            {/* Floating particles container */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400 rounded-full animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    opacity: Math.random() * 0.3 + 0.1
                  }}
                />
              ))}
            </div>

            {/* Animated grid lines */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(90deg, transparent 95%, rgba(100, 150, 255, 0.3) 100%),
                  linear-gradient(180deg, transparent 95%, rgba(100, 150, 255, 0.3) 100%)
                `,
                backgroundSize: '50px 50px',
                animation: 'gridMove 20s linear infinite'
              }} />
            </div>

            {/* Pulsing circles */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64">
              <div className="absolute inset-0 border-2 border-blue-400/20 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
              <div className="absolute inset-8 border-2 border-purple-400/20 rounded-full animate-ping" style={{ animationDuration: '6s', animationDelay: '1s' }} />
            </div>

            {/* Scanning line */}
            {/* <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-scan" /> */}
          </div>

          <div className="relative z-10 w-full h-full flex flex-col items-center justify-top p-4 lg:p-8">
            <div className="mt-4 mb-2 flex justify-center items-center gap-4 z-20">
              <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto object-contain" />
              <div className="text-white font-bitsumishi text-left flex flex-col justify-center">
                <span className="text-white font-bold text-6xl leading-none tracking-[0.05em]">CALDIM</span>
                <span className="text-[15px] font-bold tracking-[0.18em] text-[#ff8c00] whitespace-nowrap mt-1.5 uppercase">ENGINEERING PRIVATE LIMITED</span>
              </div>
            </div>

              <div className="w-full max-w-md mt-20">
                {/* Header */}
                

                

                {/* Login Box */}
                <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/30 hover:border-white/50 transition-all duration-300">
                
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">
                      EMPLOYEE PORTAL
                  </h2>
                  
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  {/* Employee ID Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-blue-400"
                      placeholder="Enter your employee ID"
                    />
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      maxLength={16}
                      className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-blue-400 pr-10"
                      placeholder="Enter your password"
                    />
                      {formData.password.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {error}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-gray-600">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-300"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[#0A0F2C] to-[#4A148C] text-white py-3.5 rounded-lg font-bold hover:from-[#1A237E] hover:to-[#6A1B9A] transition-all duration-300 disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-[1.02] transform"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              </div>

              {/* Bottom Buttons */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {/* Holidays Calendar Button */}
                <button
                  onClick={() => setShowHolidays(true)}
                  className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-white/20 px-4 py-3 rounded-xl hover:from-blue-600/30 hover:to-purple-600/30 hover:border-white/40 transition-all duration-300 flex items-center justify-center hover:scale-[1.02] transform backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 mr-2 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <div className="text-left">
                   
                    <div className="font-medium">CALDIM HOLIDAY'S</div>
                  </div>
                </button>

                {/* Today's Updates Button */}
                <button
                  onClick={() => setShowUpdates(true)}
                  className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-white/20 px-4 py-3 rounded-xl hover:from-blue-600/30 hover:to-purple-600/30 hover:border-white/40 transition-all duration-300 flex items-center justify-center hover:scale-[1.02] transform backdrop-blur-sm"
                >
                  <div className="relative mr-2">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-centre">
                    <div className="text-xs text-blue-100"></div>
                    <div className="font-small">UPCOMING EVENTS</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-50">
            <LoginAnnouncements title="📢 Company Announcements" mode="ticker" />
          </div>
        </div>

        {/* Right Side - Photo Gallery */}
        <div 
          className="hidden lg:block lg:w-1/2 relative overflow-hidden"
          style={{ 
            maskImage: 'linear-gradient(to right, transparent, white 100px)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, white 100px)'
          }}
        >
          {/* Footer at Bottom Right (moved from left) */}
          <div className="absolute bottom-12 right-0 p-4 lg:p-6 z-20 text-right">
            <p className="text-white/60 text-xs">
              © 2026 CALDIM Engineering Pvt. Ltd. All rights reserved.
            </p>
          </div>

          {/* About Us Button */}
          <div className="absolute top-10 right-10 z-30">
            <button
              onClick={() => setShowAboutUs(true)}
              className="bg-gradient-to-r from-blue-600/40 to-purple-600/40 text-white border border-white/30 px-6 py-3 rounded-full hover:from-blue-600/50 hover:to-purple-600/50 hover:border-white/50 transition-all duration-300 backdrop-blur-sm font-bold shadow-xl hover:scale-105 transform flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              About Us
            </button>
          </div>

          


          <div className="absolute inset-0 bg-gradient-to-l from-black/40 to-transparent z-10"></div>
          
          {/* Slideshow */}
          <div className="relative w-full h-screen">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${slide.url}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>
                
                {/* Slide Content */}
                <div className="absolute bottom-20 left-10 right-10 text-white z-20">
                  <h2 className="text-5xl font-bold mb-4">
                    {slide.title}
                  </h2>
                  <p className="text-xl text-blue-200">
                    {slide.desc}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Slide Indicators */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-white w-8' 
                      : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-marquee {
          animation: marquee 60s linear infinite;
          display: inline-flex;
        }
        
        .animate-marquee:hover {
          animation-play-state: paused;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

        @keyframes gridMove {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-grid {
          animation: gridMove 20s linear infinite;
        }

        .animate-scan {
          animation: scan 3s linear infinite;
        }

        .animate-ping {
          animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>
    </>
  );
};

export default Login;
