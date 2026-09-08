import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Briefcase,
    MapPin,
    Calendar,
    Clock,
    Users,
    Bell,
    LogOut,
    Plus,
    Check,
    X,
    FileText,
    DollarSign,
    Shield,
    Search,
    Compass,
    User,
    CheckCircle,
    AlertTriangle,
    HelpCircle,
    Building,
    Sliders,
    ChevronRight
} from 'lucide-react';

// Configure Axios Defaults
axios.defaults.baseURL = '';

export default function App() {
    // Authentication State
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

    // Navigation State
    const [activeTab, setActiveTab] = useState('dashboard'); // contractor: 'dashboard' | 'create-service', worker: 'search' | 'my-applications'

    // Auth Form State
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [role, setRole] = useState('ROLE_WORKER');

    // Profile Extras (Worker)
    const [skills, setSkills] = useState('');
    const [preferredCity, setPreferredCity] = useState('');
    // Profile Extras (Contractor)
    const [businessName, setBusinessName] = useState('');
    const [address, setAddress] = useState('');

    // Business Logic States
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [myServices, setMyServices] = useState([]);
    const [myApplications, setMyApplications] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [selectedServiceId, setSelectedServiceId] = useState(null);
    const [serviceApplications, setServiceApplications] = useState([]);

    // Radius Search Parameters
    const [searchLat, setSearchLat] = useState('12.9716'); // Mock default (Bangalore coordinates)
    const [searchLon, setSearchLon] = useState('77.5946');
    const [searchRadius, setSearchRadius] = useState('15');
    const [radiusSearchActive, setRadiusSearchActive] = useState(false);

    // New Service Form State
    const [newCategoryId, setNewCategoryId] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [newLat, setNewLat] = useState('12.9716');
    const [newLon, setNewLon] = useState('77.5946');
    const [newRequiredWorkers, setNewRequiredWorkers] = useState('3');
    const [newServiceDate, setNewServiceDate] = useState('');
    const [newStartTime, setNewStartTime] = useState('09:00');
    const [newEndTime, setNewEndTime] = useState('18:00');

    // UI States
    const [errorMessage, setErrorMessage] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
    const [toasts, setToasts] = useState([]);
    const [confirmModal, setConfirmModal] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryName, setSelectedCategoryName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Utility logic to inject Request Correlation ID
    const setupAxiosHeaders = (jwtToken) => {
        if (jwtToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
        // Generate an 8-character unique alphanumeric request correlation ID
        const correlationId = Math.random().toString(36).substring(2, 10).toUpperCase();
        axios.defaults.headers.common['X-Correlation-Id'] = correlationId;
    };

    useEffect(() => {
        if (token) {
            setupAxiosHeaders(token);
            loadBasicData();
        }
    }, [token]);

    useEffect(() => {
        const root = document.documentElement;
        const applyTheme = (t) => {
            let actual = t;
            if (t === 'system') {
                actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            root.setAttribute('data-theme', actual);
        };
        applyTheme(theme);
        localStorage.setItem('theme', theme);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (theme === 'system') applyTheme('system');
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme]);

    // Load backend details
    const loadBasicData = async () => {
        try {
            // Dynamic loading
            fetchCategories();
            if (user?.role === 'ROLE_CONTRACTOR') {
                fetchContractorServices();
            } else if (user?.role === 'ROLE_ADMIN') {
                fetchAdminServices();
            } else {
                fetchWorkerData();
            }
            fetchNotifications();
        } catch (err) {
            handleApiError(err);
        }
    };

    const fetchCategories = async () => {
        // Standard mockup categories check or retrieve if endpoints set
        // For MVP, if we don't have category controller endpoints, we can safely define dynamic ones or seed them
        try {
            // In our code initializer, we created category entity seeds. 
            // Let's retrieve from database or fall back
            setCategories([
                { id: 1, name: 'Catering', description: 'Food Serving, Bartending and Cleaning support' },
                { id: 2, name: 'Decoration & Setup', description: 'Stage decoration and lighting' },
                { id: 3, name: 'Guest Management', description: 'Hostess and seating assistants' },
                { id: 4, name: 'Promotions & Malls', description: 'Brochure help and mall volunteering' },
                { id: 5, name: 'Event Setup & Cleanup', description: 'Hauling cargo, assembly and cleanups' }
            ]);
        } catch (err) {
            console.log('Error loading categories', err);
        }
    };

    const fetchAdminServices = async () => {
        setIsLoading(true);
        try {
            setupAxiosHeaders(token);
            const res = await axios.get('/api/services');
            setMyServices(res.data);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchContractorServices = async () => {
        setIsLoading(true);
        try {
            setupAxiosHeaders(token);
            const res = await axios.get('/api/services/my-services');
            setMyServices(res.data);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchWorkerData = async () => {
        setIsLoading(true);
        try {
            setupAxiosHeaders(token);
            let res;
            if (radiusSearchActive) {
                res = await axios.get(`/api/services/search/radius?lat=${searchLat}&lon=${searchLon}&radiusKm=${searchRadius}`);
            } else {
                res = await axios.get('/api/services');
            }
            setServices(res.data);

            const appRes = await axios.get('/api/applications/my-applications');
            setMyApplications(appRes.data);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            setupAxiosHeaders(token);
            const res = await axios.get('/api/notifications');
            setNotifications(res.data);
        } catch (err) {
            console.log(err);
        }
    };

    const markNotificationRead = async (id) => {
        try {
            setupAxiosHeaders(token);
            await axios.put(`/api/notifications/${id}/read`);
            fetchNotifications();
        } catch (err) {
            console.log(err);
        }
    };

    const triggerToast = (type, message) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const handleApiError = (err) => {
        console.error(err);
        const backendMsg = err.response?.data?.message || 'A network error occurred. Please verify connections.';
        triggerToast('error', backendMsg);
        setErrorMessage(backendMsg);
        setTimeout(() => setErrorMessage(''), 5000);
    };

    const handleInfo = (msg) => {
        triggerToast('success', msg);
        setInfoMessage(msg);
        setTimeout(() => setInfoMessage(''), 5000);
    };

    // Auth Operations
    const handleAuth = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        try {
            if (isLogin) {
                const res = await axios.post('/api/auth/login', { email, password });
                const { accessToken, role: userRole, userId, email: userEmail, profileId } = res.data;

                localStorage.setItem('token', accessToken);
                const userData = { email: userEmail, role: userRole, id: userId, profileId };
                localStorage.setItem('user', JSON.stringify(userData));

                setToken(accessToken);
                setUser(userData);
                handleInfo('Welcome back to WorkBridge!');
            } else {
                const regPayload = {
                    email,
                    password,
                    role,
                    fullName,
                    phoneNumber,
                    skills: role === 'ROLE_WORKER' ? skills : undefined,
                    preferredCity: role === 'ROLE_WORKER' ? preferredCity : undefined,
                    businessName: role === 'ROLE_CONTRACTOR' ? businessName : undefined,
                    address: role === 'ROLE_CONTRACTOR' ? address : undefined
                };
                const res = await axios.post('/api/auth/register', regPayload);
                const { accessToken, role: userRole, userId, email: userEmail, profileId } = res.data;

                localStorage.setItem('token', accessToken);
                const userData = { email: userEmail, role: userRole, id: userId, profileId };
                localStorage.setItem('user', JSON.stringify(userData));

                setToken(accessToken);
                setUser(userData);
                handleInfo('Account created successfully!');
            }
        } catch (err) {
            handleApiError(err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken('');
        setUser(null);
        setServices([]);
        setMyServices([]);
        setMyApplications([]);
        setNotifications([]);
        setActiveTab('dashboard');
    };

    // Service Listing Operations (Contractor)
    const handleCreateService = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        try {
            setupAxiosHeaders(token);
            const payload = {
                categoryId: parseInt(newCategoryId || '1'),
                title: newTitle,
                description: newDescription,
                address: newAddress,
                latitude: parseFloat(newLat),
                longitude: parseFloat(newLon),
                requiredWorkers: parseInt(newRequiredWorkers),
                serviceDate: newServiceDate,
                startTime: newStartTime + ':00',
                endTime: newEndTime + ':00'
            };

            await axios.post('/api/services', payload);
            handleInfo('Event Service Listing published successfully!');
            setActiveTab('dashboard');
            fetchContractorServices();

            // Reset form variables
            setNewTitle('');
            setNewDescription('');
            setNewAddress('');
            setNewRequiredWorkers('3');
            setNewServiceDate('');
        } catch (err) {
            handleApiError(err);
        }
    };

    const cancelServiceListing = (serviceId) => {
        setConfirmModal({
            title: 'Cancel Event Listing',
            message: 'Are you sure you want to cancel this event listing? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    setupAxiosHeaders(token);
                    await axios.put(`/api/services/${serviceId}/cancel`);
                    handleInfo('Event listing marked as CANCELLED.');
                    fetchContractorServices();
                } catch (err) {
                    handleApiError(err);
                }
            }
        });
    };

    const completeServiceListing = async (serviceId) => {
        try {
            setupAxiosHeaders(token);
            await axios.put(`/api/services/${serviceId}/complete`);
            handleInfo('Event listing marked as COMPLETED.');
            fetchContractorServices();
        } catch (err) {
            handleApiError(err);
        }
    };

    // Applications Operations (Contractor side screening)
    const viewServiceApplications = async (serviceId) => {
        try {
            setupAxiosHeaders(token);
            setSelectedServiceId(serviceId);
            const res = await axios.get(`/api/services/${serviceId}/applications`);
            setServiceApplications(res.data);
        } catch (err) {
            handleApiError(err);
        }
    };

    const acceptWorkerApplication = async (appId) => {
        try {
            setupAxiosHeaders(token);
            await axios.put(`/api/applications/${appId}/accept`);
            handleInfo('Worker accepted successfully!');
            if (selectedServiceId) {
                viewServiceApplications(selectedServiceId);
            }
            fetchContractorServices();
        } catch (err) {
            handleApiError(err);
        }
    };

    const rejectWorkerApplication = async (appId) => {
        try {
            setupAxiosHeaders(token);
            await axios.put(`/api/applications/${appId}/reject`);
            handleInfo('Worker application rejected.');
            if (selectedServiceId) {
                viewServiceApplications(selectedServiceId);
            }
            fetchContractorServices();
        } catch (err) {
            handleApiError(err);
        }
    };

    // Worker Actions
    const applyForServiceListing = async (serviceId) => {
        try {
            setupAxiosHeaders(token);
            await axios.post(`/api/services/${serviceId}/applications`);
            handleInfo('Application submitted successfully!');
            fetchWorkerData();
        } catch (err) {
            handleApiError(err);
        }
    };

    const cancelMyApplication = (appId) => {
        setConfirmModal({
            title: 'Retract Application',
            message: 'Are you sure you want to retract/cancel your application? This slot may be taken by another worker.',
            onConfirm: async () => {
                try {
                    setupAxiosHeaders(token);
                    await axios.put(`/api/applications/${appId}/cancel`);
                    handleInfo('Your application has been cancelled.');
                    fetchWorkerData();
                } catch (err) {
                    handleApiError(err);
                }
            }
        });
    };

    const triggerPayout = async (appId) => {
        try {
            setupAxiosHeaders(token);
            await axios.post(`/api/payments/payout?applicationId=${appId}&amount=1500.00`);
            handleInfo('Mock payout issued to Worker (INR 1,500.00)!');
            if (selectedServiceId) {
                viewServiceApplications(selectedServiceId);
            }
        } catch (err) {
            handleApiError(err);
        }
    };

    // Utility categories mapping helper
    const getCategoryName = (catId) => {
        return categories.find(c => c.id === catId)?.name || 'Event Volunteering';
    };

    const getGroupedNotifications = () => {
        const today = [];
        const yesterday = [];
        const earlier = [];
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        const startOfYesterday = new Date(Date.now() - 86400000).setHours(0, 0, 0, 0);

        notifications.forEach(notif => {
            const date = new Date(notif.createdAt).getTime();
            if (date >= startOfToday) {
                today.push(notif);
            } else if (date >= startOfYesterday) {
                yesterday.push(notif);
            } else {
                earlier.push(notif);
            }
        });
        return { today, yesterday, earlier };
    };

    const getNotificationColorClass = (title) => {
        const t = title.toLowerCase();
        if (t.includes('accept') || t.includes('payout') || t.includes('paid')) return 'status-success';
        if (t.includes('reject') || t.includes('cancel')) return 'status-danger';
        return 'status-info';
    };

    const markAllNotificationsRead = async () => {
        const unreads = notifications.filter(n => !n.read);
        if (unreads.length === 0) return;
        try {
            setupAxiosHeaders(token);
            await Promise.all(unreads.map(n => axios.put(`/api/notifications/${n.id}/read`)));
            fetchNotifications();
            handleInfo('All notifications marked as read.');
        } catch (err) {
            console.log(err);
        }
    };

    const renderStatus = (statusName, type) => {
        const cls = statusName?.toLowerCase() || 'open';
        return <span className={`badge badge-${cls}`}>{statusName}</span>;
    };

    // Unread notifications count
    const unreadCount = notifications.filter(n => !n.read).length;
    const groupedNotifications = getGroupedNotifications();

    return (
        <div className="app-container">
            {/* Beautiful Toast System */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        {t.type === 'success' && <CheckCircle size={18} style={{ color: 'var(--success)' }} />}
                        {t.type === 'error' && <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />}
                        {t.type === 'info' && <Bell size={18} style={{ color: 'var(--info)' }} />}
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.message}</span>
                    </div>
                ))}
            </div>

            {/* Reusable Confirmation Dialog Modal */}
            {confirmModal && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />
                            <h3 className="text-h3">{confirmModal.title}</h3>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            {confirmModal.message}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unauthenticated View */}
            {!token ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1.5rem' }}>
                    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'var(--primary-glow)', borderRadius: '50%', marginBottom: '1rem' }}>
                                <Briefcase size={36} style={{ color: 'var(--primary)' }} />
                            </div>
                            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>WorkBridge</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Premium workforce partner for private events, ceremonies, and catering promotions.</p>
                        </div>

                        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {!isLogin && (
                                <>
                                    <div className="input-group">
                                        <label className="input-label">Full Name</label>
                                        <input type="text" className="input-field" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Phone Number</label>
                                        <input type="text" className="input-field" placeholder="+91 98765 43210" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Role Profile</label>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => setRole('ROLE_WORKER')}
                                                className="btn"
                                                style={{
                                                    flex: 1,
                                                    background: role === 'ROLE_WORKER' ? 'var(--primary)' : 'var(--bg-secondary)',
                                                    color: role === 'ROLE_WORKER' ? '#fff' : 'var(--text-primary)',
                                                    border: '1px solid ' + (role === 'ROLE_WORKER' ? 'var(--primary)' : 'var(--border)')
                                                }}>
                                                As Worker
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRole('ROLE_CONTRACTOR')}
                                                className="btn"
                                                style={{
                                                    flex: 1,
                                                    background: role === 'ROLE_CONTRACTOR' ? 'var(--primary)' : 'var(--bg-secondary)',
                                                    color: role === 'ROLE_CONTRACTOR' ? '#fff' : 'var(--text-primary)',
                                                    border: '1px solid ' + (role === 'ROLE_CONTRACTOR' ? 'var(--primary)' : 'var(--border)')
                                                }}>
                                                As Contractor
                                            </button>
                                        </div>
                                    </div>

                                    {role === 'ROLE_WORKER' ? (
                                        <>
                                            <div className="input-group">
                                                <label className="input-label">Skills & Certifications</label>
                                                <input type="text" className="input-field" placeholder="Catering setup, bartending, etc." value={skills} onChange={e => setSkills(e.target.value)} />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Preferred City</label>
                                                <input type="text" className="input-field" placeholder="E.g., Bangalore" value={preferredCity} onChange={e => setPreferredCity(e.target.value)} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="input-group">
                                                <label className="input-label">Agency / Business Name</label>
                                                <input type="text" className="input-field" placeholder="Royal Banquets LLC" value={businessName} onChange={e => setBusinessName(e.target.value)} required />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Business Address</label>
                                                <input type="text" className="input-field" placeholder="Full Head Office Address" value={address} onChange={e => setAddress(e.target.value)} required />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            <div className="input-group">
                                <label className="input-label">Email Address</label>
                                <input type="email" className="input-field" placeholder="email@address.com" value={email} onChange={e => setEmail(e.target.value)} required />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Password</label>
                                <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                                {isLogin ? 'Log In' : 'Sign Up'}
                            </button>
                        </form>

                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="btn btn-ghost"
                            style={{ width: '100%', marginTop: '1rem', color: 'var(--primary)' }}>
                            {isLogin ? "Don't have an account? Sign Up instead" : 'Already registered? Log In here'}
                        </button>
                    </div>
                </div>
            ) : (
                // Authenticated View
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <header className="nav-bar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Briefcase size={22} style={{ color: 'var(--primary)' }} />
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>WorkBridge</h2>
                            <span className="badge badge-open" style={{ marginLeft: '4px', textTransform: 'capitalize', fontSize: '0.65rem' }}>
                                {user?.role === 'ROLE_CONTRACTOR' ? 'Contractor portal' : user?.role === 'ROLE_ADMIN' ? 'Admin Portal' : 'Worker portal'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {/* Theme Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <select
                                    value={theme}
                                    onChange={e => setTheme(e.target.value)}
                                    className="input-field"
                                    style={{ padding: '0.2rem 0.5rem', minHeight: '34px', width: '95px', fontSize: '0.8rem' }}
                                >
                                    <option value="light">☀️ Light</option>
                                    <option value="dark">🌙 Dark</option>
                                    <option value="system">🖥️ System</option>
                                </select>
                            </div>

                            {/* Tab Navigation Controllers for desktop */}
                            <div className="desktop-nav" style={{ display: 'flex', gap: '0.25rem' }}>
                                {user?.role === 'ROLE_CONTRACTOR' || user?.role === 'ROLE_ADMIN' ? (
                                    <>
                                        <button onClick={() => { setActiveTab('dashboard'); if (user?.role === 'ROLE_ADMIN') fetchAdminServices(); else fetchContractorServices(); }} className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                            Dashboard
                                        </button>
                                        {user?.role === 'ROLE_CONTRACTOR' && (
                                            <button onClick={() => { setActiveTab('create-service'); setNewCategoryId(categories[0]?.id || '1'); }} className={`nav-link ${activeTab === 'create-service' ? 'active' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                                <Plus size={14} /> Post Event Job
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { setActiveTab('search'); fetchWorkerData(); }} className={`nav-link ${activeTab === 'search' ? 'active' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                            <Search size={14} /> Search Gigs
                                        </button>
                                        <button onClick={() => { setActiveTab('my-applications'); fetchWorkerData(); }} className={`nav-link ${activeTab === 'my-applications' ? 'active' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                            My Apps ({myApplications.length})
                                        </button>
                                    </>
                                )}

                                <button onClick={() => { setActiveTab('notifications'); fetchNotifications(); }} className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
                                    Inbox
                                    {unreadCount > 0 && (
                                        <span style={{ position: 'absolute', top: '2px', right: '-4px', background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>

                                <button onClick={() => setActiveTab('profile')} className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    Profile
                                </button>
                            </div>

                            {/* Authed User Info / Logout */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
                                <div className="desktop-nav" style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{user?.email}</p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {user?.id}</p>
                                </div>
                                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem', minHeight: '36px' }} title="Log Out">
                                    <LogOut size={14} />
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="main-content">
                        {/* Shared Tabs: Inbox Notifications & Profile */}
                        {activeTab === 'notifications' && (
                            <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3>Inbox Notifications</h3>
                                    <button onClick={markAllNotificationsRead} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Mark All Read</button>
                                </div>
                                {Object.keys(groupedNotifications).every(k => !groupedNotifications[k] || groupedNotifications[k].length === 0) ? (
                                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                                        <p style={{ color: 'var(--text-secondary)' }}>No notifications found.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {['today', 'yesterday', 'earlier'].map(group => {
                                            const list = groupedNotifications[group];
                                            if (!list || list.length === 0) return null;
                                            return (
                                                <div key={group}>
                                                    <h4 style={{ textTransform: 'capitalize', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.9rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>{group}</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        {list.map(n => (
                                                            <div key={n.id} className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: !n.read ? '4px solid var(--primary)' : '1px solid var(--border)' }}>
                                                                <div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                        <span className={`badge ${getNotificationColorClass(n.title)}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Alert</span>
                                                                        <strong style={{ fontSize: '0.9rem' }}>{n.title}</strong>
                                                                    </div>
                                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{n.message}</p>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleTimeString()}</span>
                                                                </div>
                                                                {!n.read && (
                                                                    <button onClick={() => markNotificationRead(n.id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', minHeight: '32px' }}>
                                                                        <Check size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="animate-fade-in" style={{ maxWidth: '520px', margin: '0 auto', width: '100%' }}>
                                <div className="glass-card" style={{ padding: '2rem' }}>
                                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--primary-glow)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={36} style={{ color: 'var(--primary)' }} />
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{user?.fullName || 'Mock Logged Event Worker'}</h3>
                                        <span className="badge badge-open" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>{user?.role}</span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                                        <div>
                                            <label className="input-label" style={{ fontSize: '0.75rem' }}>Registered Email Address</label>
                                            <p style={{ fontWeight: 650, fontSize: '0.9rem' }}>{user?.email}</p>
                                        </div>
                                        <div>
                                            <label className="input-label" style={{ fontSize: '0.75rem' }}>Phone Number Contact</label>
                                            <p style={{ fontWeight: 650, fontSize: '0.9rem' }}>{user?.phoneNumber || 'N/A'}</p>
                                        </div>

                                        {user?.role === 'ROLE_WORKER' ? (
                                            <>
                                                <div>
                                                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Skills & Profile Portfolio</label>
                                                    <p style={{ fontSize: '0.9rem' }}>{user?.skills || 'None'}</p>
                                                </div>
                                                <div>
                                                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Preferred Location / City</label>
                                                    <p style={{ fontSize: '0.9rem' }}>📍 {user?.preferredCity || 'Global'}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Business Entity</label>
                                                    <p style={{ fontSize: '0.9rem' }}>🏛️ {user?.businessName || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Headquarters Address</label>
                                                    <p style={{ fontSize: '0.9rem' }}>{user?.address || 'N/A'}</p>
                                                </div>
                                            </>
                                        )}

                                        <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', marginTop: '1.5rem', color: 'var(--danger)' }}>
                                            <LogOut size={14} /> Log Out Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CONTRACTOR & ADMIN DASHBOARD WORKSPACE */}
                        {(user?.role === 'ROLE_CONTRACTOR' || user?.role === 'ROLE_ADMIN') && (
                            <>
                                {activeTab === 'dashboard' && (
                                    <div className="animate-fade-in">
                                        <div className="stats-grid">
                                            <div className="glass-card stat-item">
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{user?.role === 'ROLE_ADMIN' ? 'Total Platform Listings' : 'Your Shared Listings'}</p>
                                                <div className="stat-val">{myServices.length}</div>
                                            </div>
                                            <div className="glass-card stat-item">
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Hired Crew Count</p>
                                                <div className="stat-val">
                                                    {myServices.reduce((acc, curr) => acc + (curr.acceptedWorkers || 0), 0)} / {myServices.reduce((acc, curr) => acc + (curr.requiredWorkers || 0), 0)}
                                                </div>
                                            </div>
                                            <div className="glass-card stat-item">
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Payments Status</p>
                                                <div className="stat-val" style={{ color: 'var(--success)', fontSize: '1.15rem' }}>Mock Gateway Verified (INR)</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
                                            {/* Left Listings block with skeleton fallback */}
                                            <div>
                                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>{user?.role === 'ROLE_ADMIN' ? 'All System Posted Gigs' : 'Your Event Gig Listings'}</h3>
                                                {isLoading ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        <div className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />
                                                        <div className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />
                                                    </div>
                                                ) : myServices.length === 0 ? (
                                                    <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No active roles listed currently.</p>
                                                        {user?.role === 'ROLE_CONTRACTOR' && (
                                                            <button onClick={() => { setActiveTab('create-service'); setNewCategoryId(categories[0]?.id || '1'); }} className="btn btn-primary">
                                                                <Plus size={14} /> Post Your First Event Role
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        {myServices.map(s => (
                                                            <div key={s.id} className="glass-card" style={{ padding: '1.25rem', borderLeft: selectedServiceId === s.id ? '4px solid var(--primary)' : '1px solid var(--border)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                                    <div>
                                                                        <span className="badge badge-completed" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginBottom: '4px', textTransform: 'capitalize' }}>{s.categoryName || 'General'}</span>
                                                                        <h4 style={{ fontSize: '1.05rem', margin: '4px 0 0' }}>{s.title}</h4>
                                                                    </div>
                                                                    {renderStatus(s.status, 'service')}
                                                                </div>

                                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: '1.4' }}>{s.description}</p>

                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 15px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {s.address}</div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {s.serviceDate}</div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)}</div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {s.acceptedWorkers} / {s.requiredWorkers} staff hired</div>
                                                                </div>

                                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                                                                    <button onClick={() => viewServiceApplications(s.id)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '32px' }}>
                                                                        Review Candidates
                                                                    </button>

                                                                    {(s.status === 'OPEN' || s.status === 'FILLED') && (
                                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                            <button onClick={() => completeServiceListing(s.id)} className="btn btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '32px' }}>
                                                                                Complete
                                                                            </button>
                                                                            <button onClick={() => cancelServiceListing(s.id)} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '32px' }}>
                                                                                Cancel Event
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right screening table */}
                                            <div>
                                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Recruiting Control</h3>
                                                {!selectedServiceId ? (
                                                    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                        <HelpCircle size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                                                        <p style={{ fontSize: '0.85rem' }}>Click "Review Candidates" on any gig listing to load candidate applications panel here.</p>
                                                    </div>
                                                ) : (
                                                    <div className="glass-card animate-fade-in" style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                                            <h4 style={{ fontSize: '0.95rem' }}>Applicants for Listing ID #{selectedServiceId}</h4>
                                                            <button onClick={() => setSelectedServiceId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={14} /></button>
                                                        </div>

                                                        {serviceApplications.length === 0 ? (
                                                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0', fontSize: '0.85rem' }}>No candidates have applied to this slot yet.</p>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                                {serviceApplications.map(app => (
                                                                    <div key={app.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                                                                            <strong style={{ fontSize: '0.85rem' }}>{app.workerName}</strong>
                                                                            {renderStatus(app.status, 'application')}
                                                                        </div>

                                                                        <div style={{ display: 'flex', gap: '6px', marginTop: '0.5rem' }}>
                                                                            {app.status === 'APPLIED' && (
                                                                                <>
                                                                                    <button onClick={() => acceptWorkerApplication(app.id)} className="btn btn-success" style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem', minHeight: '30px' }}>
                                                                                        Accept
                                                                                    </button>
                                                                                    <button onClick={() => rejectWorkerApplication(app.id)} className="btn btn-danger" style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem', minHeight: '30px' }}>
                                                                                        Reject
                                                                                    </button>
                                                                                </>
                                                                            )}

                                                                            {app.status === 'ACCEPTED' && (
                                                                                <button onClick={() => triggerPayout(app.id)} className="btn btn-primary" style={{ width: '100%', padding: '0.35rem', fontSize: '0.75rem', minHeight: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                                                    <DollarSign size={12} /> Disburse Mock Payout (INR 1.5K)
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'create-service' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '2rem' }} className="animate-fade-in">
                                        <div className="glass-card" style={{ padding: '2rem' }}>
                                            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Building size={20} style={{ color: 'var(--primary)' }} /> Deploy New Gig Role
                                            </h3>

                                            <form onSubmit={handleCreateService} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div className="input-group">
                                                        <label className="input-label">Event Category</label>
                                                        <select className="input-field" value={newCategoryId} onChange={e => setNewCategoryId(e.target.value)} required>
                                                            {categories.map(cat => (
                                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="input-label">Job Role Title</label>
                                                        <input type="text" className="input-field" placeholder="Bartenders, Banquet Waiters" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
                                                    </div>
                                                </div>

                                                <div className="input-group">
                                                    <label className="input-label">Gig Duties description</label>
                                                    <textarea className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} placeholder="Specify requirements, dress code, and expected hourly task metrics." value={newDescription} onChange={e => setNewDescription(e.target.value)} required />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '1rem' }}>
                                                    <div className="input-group">
                                                        <label className="input-label">Event Venue Address</label>
                                                        <input type="text" className="input-field" placeholder="Hotel Ballroom, Bangalore" value={newAddress} onChange={e => setNewAddress(e.target.value)} required />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="input-label">Min Crew Required</label>
                                                        <input type="number" className="input-field" min="1" value={newRequiredWorkers} onChange={e => setNewRequiredWorkers(e.target.value)} required />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                                    <div className="input-group">
                                                        <label className="input-label">Service Date</label>
                                                        <input type="date" className="input-field" value={newServiceDate} onChange={e => setNewServiceDate(e.target.value)} required />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="input-label">Start Time</label>
                                                        <input type="time" className="input-field" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} required />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="input-label">End Time</label>
                                                        <input type="time" className="input-field" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} required />
                                                    </div>
                                                </div>

                                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                    <h5 style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><Compass size={14} /> Geographic GPS Location Mapping</h5>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Latitude</label>
                                                            <input type="number" step="0.0001" className="input-field" value={newLat} onChange={e => setNewLat(e.target.value)} required />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Longitude</label>
                                                            <input type="number" step="0.0001" className="input-field" value={newLon} onChange={e => setNewLon(e.target.value)} required />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Publish Listing</button>
                                                    <button type="button" onClick={() => setActiveTab('dashboard')} className="btn btn-secondary">Discard & Exit</button>
                                                </div>
                                            </form>
                                        </div>

                                        {/* Real-time Preview Card panel */}
                                        <div>
                                            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Real-time Cards Preview</h3>
                                            <div className="glass-card premium-badge" style={{ padding: '1.5rem', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <span className="badge badge-completed" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                                            {categories.find(c => String(c.id) === String(newCategoryId))?.name || 'Category'}
                                                        </span>
                                                        <span className="badge badge-open">PREVIEW</span>
                                                    </div>
                                                    <h4 style={{ fontSize: '1.1rem', margin: '6px 0' }}>{newTitle || 'Untitled Gig Listing'}</h4>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', minHeight: '60px', whiteSpace: 'pre-wrap' }}>
                                                        {newDescription || 'Specify details to see them live here...'}
                                                    </p>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} /> {newAddress || 'No Address Specified'}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={12} /> {newServiceDate || 'YYYY-MM-DD'}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> {newStartTime || '00:00'} - {newEndTime || '00:00'}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={12} /> 0 / {newRequiredWorkers || 1} candidates needed</div>
                                                    </div>
                                                </div>
                                                <button disabled className="btn btn-secondary" style={{ width: '100%', marginTop: '1.5rem', cursor: 'not-allowed' }}>Publish Form to Deploy</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* WORKER WORKSPACE */}
                        {
                            user?.role === 'ROLE_WORKER' && (
                                <>
                                    {activeTab === 'search' && (
                                        <div className="animate-fade-in">
                                            {/* Radius Geographic filters */}
                                            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                                                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Sliders size={18} /> GPS Distance-Based Radius Search</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
                                                    <div>
                                                        <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Local Latitude</label>
                                                        <input type="number" step="0.00001" className="input-field" value={searchLat} onChange={e => setSearchLat(e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Local Longitude</label>
                                                        <input type="number" step="0.00001" className="input-field" value={searchLon} onChange={e => setSearchLon(e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Max Radius (KM)</label>
                                                        <input type="number" className="input-field" value={searchRadius} onChange={e => setSearchRadius(e.target.value)} />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => { setRadiusSearchActive(true); fetchWorkerData(); }}
                                                            className={`btn ${radiusSearchActive ? 'btn-primary' : 'btn-secondary'}`}
                                                            style={{ padding: '0.8rem 1.25rem', minHeight: '42px', flex: 1 }}>
                                                            <Compass size={16} /> Filter Radius
                                                        </button>
                                                        {radiusSearchActive && (
                                                            <button
                                                                onClick={() => { setRadiusSearchActive(false); fetchWorkerData(); }}
                                                                className="btn btn-secondary"
                                                                style={{ padding: '0.8rem', minHeight: '42px' }}
                                                                title="Clear Radius Filters">
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Keyword search & Category Filter Pills */}
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <input
                                                        type="text"
                                                        className="input-field"
                                                        placeholder="🔍 Search gigs by keyword (e.g., Servers, Decor)..."
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                        style={{ width: '100%', padding: '0.8rem 1rem' }}
                                                    />
                                                </div>

                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => setSelectedCategoryName('')}
                                                        className={`btn ${selectedCategoryName === '' ? 'btn-primary' : 'btn-secondary'}`}
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '32px' }}
                                                    >
                                                        All Gigs
                                                    </button>
                                                    {Array.from(new Set(services.map(s => s.categoryName).filter(Boolean))).map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setSelectedCategoryName(cat)}
                                                            className={`btn ${selectedCategoryName === cat ? 'btn-primary' : 'btn-secondary'}`}
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '32px' }}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.2rem' }}>Available Event Gigs</h3>

                                            {isLoading ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                                                    <div className="skeleton" style={{ height: '220px', borderRadius: '12px' }} />
                                                    <div className="skeleton" style={{ height: '220px', borderRadius: '12px' }} />
                                                    <div className="skeleton" style={{ height: '220px', borderRadius: '12px' }} />
                                                </div>
                                            ) : services.filter(s => {
                                                const matchesSearch = searchTerm ? (
                                                    s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
                                                ) : true;
                                                const matchesCategory = selectedCategoryName ? (
                                                    s.categoryName === selectedCategoryName
                                                ) : true;
                                                return matchesSearch && matchesCategory;
                                            }).length === 0 ? (
                                                <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
                                                    <p style={{ color: 'var(--text-secondary)' }}>No jobs found matching your current spatial/geographic queries or search filters.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                                                    {services.filter(s => {
                                                        const matchesSearch = searchTerm ? (
                                                            s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                            s.description?.toLowerCase().includes(searchTerm.toLowerCase())
                                                        ) : true;
                                                        const matchesCategory = selectedCategoryName ? (
                                                            s.categoryName === selectedCategoryName
                                                        ) : true;
                                                        return matchesSearch && matchesCategory;
                                                    }).map(s => {
                                                        const hasApplied = myApplications.some(app => app.serviceId === s.id);
                                                        return (
                                                            <div key={s.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                                <div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                                        <div>
                                                                            <span className="badge badge-completed" style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', marginBottom: '0.4rem', textTransform: 'capitalize' }}>{s.categoryName || 'General'}</span>
                                                                            <h4 style={{ fontSize: '1.1rem', margin: '4px 0 0' }}>{s.title}</h4>
                                                                        </div>
                                                                        {renderStatus(s.status, 'service')}
                                                                    </div>

                                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', minHeight: '44px', lineHeight: '1.4' }}>{s.description}</p>

                                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} /> {s.address}</div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={12} /> {s.serviceDate}</div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> {s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)}</div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={12} /> Crew Capacity: {s.acceptedWorkers} / {s.requiredWorkers} hired</div>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    {hasApplied ? (
                                                                        <button disabled className="btn btn-secondary" style={{ width: '100%', cursor: 'not-allowed', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                                            <Check size={14} /> Applied Successfully
                                                                        </button>
                                                                    ) : (
                                                                        <button onClick={() => applyForServiceListing(s.id)} disabled={s.status !== 'OPEN'} className="btn btn-primary" style={{ width: '100%' }}>
                                                                            Apply For This Gig
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'my-applications' && (
                                        <div className="animate-fade-in">
                                            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Your Applied Event Services</h3>

                                            {isLoading ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '850px' }}>
                                                    <div className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />
                                                    <div className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />
                                                </div>
                                            ) : myApplications.length === 0 ? (
                                                <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
                                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>You haven't submitted any job gig applications yet.</p>
                                                    <button onClick={() => setActiveTab('search')} className="btn btn-primary">Find a Gig Role</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '850px' }}>
                                                    {myApplications.map(app => (
                                                        <div key={app.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
                                                                    <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{app.serviceTitle}</h4>
                                                                    {renderStatus(app.status, 'application')}
                                                                </div>
                                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>Submitted: {new Date(app.appliedAt).toLocaleString()} | Service ID: #{app.serviceId}</p>
                                                            </div>

                                                            <div>
                                                                {app.status === 'APPLIED' && (
                                                                    <button onClick={() => cancelMyApplication(app.id)} className="btn btn-danger" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', minHeight: '34px' }}>
                                                                        Cancel / Retract
                                                                    </button>
                                                                )}
                                                                {app.status === 'ACCEPTED' && (
                                                                    <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <CheckCircle size={14} /> Hired & Confirmed
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )
                        }
                    </main>

                    <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', padding: '1.5rem 0', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <p>© 2026 WorkBridge Workforce Marketplace Inc. All mock logistics logs are stored in MDC database containers.</p>
                    </footer>
                </div>
            )
            }
        </div>
    );
}
