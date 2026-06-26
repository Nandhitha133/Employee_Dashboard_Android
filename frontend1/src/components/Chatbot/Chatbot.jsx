import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { MessageSquare, X, Send, Bot, User, Loader2, Maximize2, Minimize2, ChevronRight } from 'lucide-react';
import api, { policyAPI } from '../../services/api';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [activePolicyId, setActivePolicyId] = useState(null);

    // Get logged-in user's name from sessionStorage
    const getUserName = () => {
        const user = sessionStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                return userData.name || 'there';
            } catch (e) {
                return 'there';
            }
        }
        return 'there';
    };

    const MAIN_MENU_OPTIONS = [
        { label: 'Employee Information', action: 'navigate', path: '/my-profile' },
        { label: 'Leave & Attendance', action: 'subnet', key: 'leave_attendance' },
        { label: 'Salary Slips', action: 'navigate', path: '/salaryslips' },
        { label: 'Company Policies', action: 'fetch_policies' },
    ];

    const LEAVE_ATTENDANCE_OPTIONS = [
        
        { label: 'Leave Application', action: 'navigate', path: '/leave-applications' },
        { label: 'Back to Main Menu', action: 'menu' }
    ];

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [fetchedPolicies, setFetchedPolicies] = useState([]);
    const [currentPolicy, setCurrentPolicy] = useState(null);
    const [isPolicyLoading, setIsPolicyLoading] = useState(false);

    const POLICY_CATEGORIES = {
        'Statutory': { icon: '🧾', keywords: ['PF', 'Gratuity', 'Bonus', 'Allowances'] },
        'Leave & Time': { icon: '🏖️', keywords: ['Leave', 'Holiday', 'Loss of Pay', 'Permission', 'Attendance'] },
        'Governance': { icon: '🛡️', keywords: ['Whistle', 'Confidentiality', 'Separation', 'Conduct', 'Ethics'] },
        'Employee Benefits': { icon: '❤️', keywords: ['Insurance', 'Reward', 'Health', 'Benefit'] }
    };

    const categorizePolicies = (policies) => {
        const categories = {
            'Statutory': [],
            'Leave & Time': [],
            'Governance': [],
            'Employee Benefits': [],
            'Other': []
        };

        policies.forEach(policy => {
            const title = (policy.title || policy.policyName || '').toLowerCase();
            let matched = false;

            for (const [cat, config] of Object.entries(POLICY_CATEGORIES)) {
                if (config.keywords.some(k => title.includes(k.toLowerCase()))) {
                    categories[cat].push(policy);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                // Determine if 'Other' is needed or force fit? 
                // Let's put remaining in Other, but only show if not empty
                categories['Other'].push(policy);
            }
        });

        return categories;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Track URL changes to update policy context
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const policyId = params.get('id');
        if (location.pathname === '/policies' && policyId) {
            setActivePolicyId(policyId);
        } else {
            setActivePolicyId(null);
        }
    }, [location]);

    // Initialize with Welcome Message and Menu
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    role: 'bot',
                    text: `Hello ${getUserName()}! I am your Caldim Assistant. How can I help you today?`,
                    options: MAIN_MENU_OPTIONS
                }
            ]);
        }
    }, [messages.length]);

    const POLICY_SUGGESTIONS = {
        'Leave': [
            "How many casual leaves do I get?",
            "DECLARED HOLIDAYS?",
            "GENERAL GUIDELINES",
            "Is leave encashment allowed?"
        ],
        'PF': [
            "PF DEDUCTION",
            "GRATUITY",
            "When can I withdraw my PF?"
        ],
        'Reward': [
            "Excellence Awards Policy",
            "Monthly Excellence Awards",
            "Half-Yearly Excellence Awards"
        ],
        'Separation': [
            "RESIGNATION & NOTICE PERIOD",
            "TYPES OF SEPARATIONS",
            "NOTICE PERIOD"
        ],
        'Deployment': [
            "DEPUTATION ALLOWANCE",
            "TRAVEL & ACCOMMODATION",
            "PER DIEM BASIS"
        ],
        'Insurance': [
            "What is the claim process?",
            "Are my parents covered?",
            "List of network hospitals"
        ],
        'Appraisal': [
            "What is the appraisal cycle?",
            "How are ratings decided?",
            "Is there a bell curve?"
        ]
    };

    const getSuggestionsForPolicy = (title) => {
        const lowerTitle = title.toLowerCase();
        for (const [key, questions] of Object.entries(POLICY_SUGGESTIONS)) {
            if (lowerTitle.includes(key.toLowerCase())) {
                return questions;
            }
        }
        return [];
    };

    const handleOptionClick = async (option) => {
        // Add user selection as a message
        setMessages(prev => [...prev, { role: 'user', text: option.label }]);

        if (option.action === 'navigate') {
            setMessages(prev => [...prev, { role: 'bot', text: `Navigating to ${option.label}...` }]);
            setTimeout(() => {
                navigate(option.path);
                setIsOpen(false); // Close chatbot on navigation optional

                // conditional follow-up based on where we navigated
                if (option.path.includes('/policies')) {
                    setCurrentPolicy(option.label); // SET CONTEXT
                    const suggestions = getSuggestionsForPolicy(option.label);
                    let suggestionText = `✅ ${option.label} loaded.\nWhat would you like to do next?`;

                    if (suggestions.length > 0) {
                        suggestionText = `✅ ${option.label} loaded.\n\n💡 You can ask things like:\n${suggestions.map(s => `• "${s}"`).join('\n')}\n\nWhat would you like to do next?`;
                    }

                    setMessages(prev => [...prev, {
                        role: 'bot',
                        text: suggestionText,
                        options: [
                            { label: '🔁 View another policy', action: 'fetch_policies' },
                            { label: '⬅️ Back to Main Menu', action: 'menu' }
                        ]
                    }]);
                } else {
                    setCurrentPolicy(null); // CLEAR CONTEXT
                    // Default for other pages
                    setMessages(prev => [...prev, {
                        role: 'bot',
                        text: 'How else can I help you?',
                        options: MAIN_MENU_OPTIONS
                    }]);
                }
            }, 800);
        } else if (option.action === 'menu') {
            setCurrentPolicy(null); // CLEAR CONTEXT
            setMessages(prev => [...prev, {
                role: 'bot',
                text: 'Here is the main menu:',
                options: MAIN_MENU_OPTIONS
            }]);
        } else if (option.action === 'subnet') {
            if (option.key === 'leave_attendance') {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: 'Choose an option for Leave & Attendance:',
                    options: LEAVE_ATTENDANCE_OPTIONS
                }]);
            }
        } else if (option.action === 'fetch_policies') {
            setCurrentPolicy(null); // CLEAR CONTEXT
            setIsPolicyLoading(true);
            setMessages(prev => [...prev, { role: 'bot', text: 'Fetching policies...' }]);

            try {
                // If we already have policies, don't refetch unless forced
                // But for now, let's fetch to be safe
                const res = await policyAPI.list();
                const policies = Array.isArray(res.data) ? res.data : [];
                setFetchedPolicies(policies); // Save for sub-menu usage

                if (policies.length > 0) {
                    const categories = categorizePolicies(policies);
                    const categoryOptions = [];

                    Object.entries(categories).forEach(([name, list]) => {
                        if (list.length > 0) {
                            const icon = POLICY_CATEGORIES[name]?.icon || '📂';
                            categoryOptions.push({
                                label: `${icon} ${name}`,
                                action: 'show_category',
                                category: name
                            });
                        }
                    });

                    categoryOptions.push({ label: '⬅️ Back to Main Menu', action: 'menu' });

                    setMessages(prev => [...prev, {
                        role: 'bot',
                        text: 'Please select a policy category:',
                        options: categoryOptions
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        role: 'bot',
                        text: 'No policies found.',
                        options: [{ label: 'Back to Main Menu', action: 'menu' }]
                    }]);
                }
            } catch (error) {
                console.error("Error fetching policies:", error);
                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: 'Failed to load policies. Please try again.',
                    options: [{ label: 'Retain Main Menu', action: 'menu' }]
                }]);
            } finally {
                setIsPolicyLoading(false);
            }
        } else if (option.action === 'show_category') {
            // Filter policies for the selected category
            const categories = categorizePolicies(fetchedPolicies);
            const selectedList = categories[option.category] || [];

            if (selectedList.length > 0) {
                const policyOptions = selectedList.map(p => ({
                    label: p.title || p.policyName || 'Untitled Policy',
                    action: 'navigate',
                    path: `/policies?id=${p._id}`
                }));

                policyOptions.push({ label: '⬅️ Back to Categories', action: 'fetch_policies' });
                // Re-triggering fetch_policies is a cheap way to show categories again since we have caching or just fast fetch.
                // Or better, we could make 'fetch_policies' check if data exists? 
                // For simplicity, just calling 'fetch_policies' ensures they see the updated list if any. 
                // Actually, to avoid re-fetching, we could have a 'show_categories_only' action, but 'fetch_policies' is fine for now.

                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: `Here are the ${option.category} policies:`,
                    options: policyOptions
                }]);
            }
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const lowerInput = input.trim().toLowerCase();

        // INTERCEPTION: If user asks for "policies" generically, show the visual menu instead of text list
        const policyKeywords = ['policies', 'company policies', 'view policies', 'list policies', 'show policies', 'all policies'];
        if (policyKeywords.includes(lowerInput)) {
            setMessages(prev => [...prev, { role: 'user', text: input }]);
            setInput('');
            handleOptionClick({ action: 'fetch_policies' });
            return;
        }

        // INTERCEPTION: Check for Category Names (Statutory, Governance, etc.)
        const categoryMap = {
            'statutory': 'Statutory',
            'governance': 'Governance',
            'employee benefits': 'Employee Benefits',
            'benefits': 'Employee Benefits',
            'leave & time': 'Leave & Time',
            'leave and time': 'Leave & Time',
            'other': 'Other'
        };

        const matchedCatKey = Object.keys(categoryMap).find(key => lowerInput === key || lowerInput.includes(key));

        if (matchedCatKey) {
            const categoryName = categoryMap[matchedCatKey];
            setMessages(prev => [...prev, { role: 'user', text: input }]);
            setInput('');
            setIsLoading(true);

            try {
                // Ensure policies are fetched
                let policies = fetchedPolicies;
                if (policies.length === 0) {
                    const res = await policyAPI.list();
                    policies = Array.isArray(res.data) ? res.data : [];
                    setFetchedPolicies(policies);
                }

                const categories = categorizePolicies(policies);
                const selectedList = categories[categoryName] || [];

                if (selectedList.length > 0) {
                    // Reuse the display logic manually since we are outside handleOptionClick context
                    const policyOptions = selectedList.map(p => ({
                        label: p.title || p.policyName || 'Untitled Policy',
                        action: 'navigate',
                        path: `/policies?id=${p._id}`
                    }));

                    policyOptions.push({ label: '⬅️ Back to Categories', action: 'fetch_policies' });

                    setMessages(prev => [...prev, {
                        role: 'bot',
                        text: `Here are the ${categoryName} policies:`,
                        options: policyOptions
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        role: 'bot',
                        text: `No policies found in ${categoryName}.`,
                        options: [{ label: 'Back to Categories', action: 'fetch_policies' }]
                    }]);
                }
            } catch (error) {
                console.error("Error fetching category:", error);
                setMessages(prev => [...prev, { role: 'bot', text: 'Failed to load policies.' }]);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const user = sessionStorage.getItem('user');
            // Use 'api' service which has baseURL configured (matches /api)
            // So default endpoint is just '/employee-chat'
            let chatEndpoint = '/employee-chat';

            if (user) {
                try {
                    const userData = JSON.parse(user);
                    if (userData.role === 'admin') chatEndpoint = '/chat';
                } catch (e) { console.error(e); }
            }

            // Send context if active
            const payload = {
                query: input,
                context: {
                    activePolicy: currentPolicy,
                    activePolicyId: activePolicyId
                }
            };

            // api instance automatically adds Authorization header
            const response = await api.post(chatEndpoint, payload);

            if (response.data.success) {
                // Determine if we should show the menu again after a text response
                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: response.data.response,
                    options: [{ label: 'Back to Main Menu', action: 'menu' }]
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: 'Sorry, I encountered an error. Please try again.',
                    options: [{ label: 'Back to Main Menu', action: 'menu' }]
                }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            // More descriptive error if available
            const errorMsg = error.response?.data?.message || 'I am sorry, I am having trouble connecting right now. Please check your connection.';
            setMessages(prev => [...prev, { role: 'bot', text: errorMsg }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all duration-300 z-50 flex items-center justify-center group"
            >
                <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-12 right-0 bg-white text-indigo-600 px-3 py-1 rounded-lg text-sm font-medium shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-indigo-100">
                    Need help? Ask me!
                </span>
            </button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] ${isMinimized ? 'h-14' : 'h-[600px]'} bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 z-50 border border-gray-100`}>
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <div className="p-1 bgColor-white/20 rounded-lg">
                        <Bot className="w-5 h-5" />
                    </div>
                    <span className="font-semibold">Caldim Assistant</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/20 rounded-md transition-colors">
                        {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-md transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`flex gap-2 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-gray-200 text-indigo-600 shadow-sm'}`}>
                                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>

                                {/* Render Options/Buttons if any */}
                                {msg.options && (
                                    <div className="mt-2 ml-10 flex flex-col gap-2 w-full max-w-[85%]">
                                        {msg.options.map((option, optIndex) => (
                                            <button
                                                key={optIndex}
                                                onClick={() => handleOptionClick(option)}
                                                className="text-left px-4 py-2 bg-white border border-indigo-100 text-indigo-600 text-sm rounded-xl shadow-sm hover:bg-indigo-50 hover:border-indigo-200 transition-all flex justify-between items-center group"
                                            >
                                                <span>{option.label}</span>
                                                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {(isLoading || isPolicyLoading) && (
                            <div className="flex justify-start">
                                <div className="flex gap-2 items-center text-gray-400 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 rounded-tl-none">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs">{isPolicyLoading ? 'Fetching data...' : 'Typing...'}</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex gap-2"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your question..."
                                className="flex-1 px-4 py-2 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || isPolicyLoading || !input.trim()}
                                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default Chatbot;
