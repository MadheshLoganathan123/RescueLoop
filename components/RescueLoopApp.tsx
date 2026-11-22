'use client';

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, 
  ChevronRight, ClipboardCheck, ClipboardList, Clock, Clock3, Download, 
  ExternalLink, Filter, Heart, Info, Key, Layers, Leaf, MapPin, 
  Navigation, Package, Phone, Plus, Radio, RefreshCw, Search, ShieldCheck, 
  Sparkles, Truck, Upload, Users, Volume2, X 
} from 'lucide-react';
import { authApi, donorApi, ngoApi, volunteerApi, opsApi, aiApi, notificationsApi, uploadsApi } from '../lib/api';
import type { MapNode } from '../lib/mapNodes';

const LiveOpsMap = dynamic(() => import('./LiveOpsMap'), {
  ssr: false,
  loading: () => <div className="map-fallback">Loading live map…</div>,
});

type Role = 'donor' | 'ngo' | 'volunteer' | 'ops';
type Screen = string;

interface RoleMeta {
  label: string;
  person: string;
  initials: string;
  subtitle: string;
  org: string;
}

const roleMeta: Record<Role, RoleMeta> = {
  donor: { 
    label: 'Donor workspace', 
    person: 'Alex Rivera', 
    initials: 'AR', 
    subtitle: 'Kitchen Director', 
    org: 'ABC Restaurant Group' 
  },
  ngo: { 
    label: 'NGO workspace', 
    person: 'Sarah Kumar', 
    initials: 'SK', 
    subtitle: 'Relief Coordinator', 
    org: 'Hope Community Foundation' 
  },
  volunteer: { 
    label: 'Volunteer workspace', 
    person: 'Jordan Mathew', 
    initials: 'JM', 
    subtitle: 'Certified Courier', 
    org: 'City Rescue Volunteers' 
  },
  ops: { 
    label: 'Operations console', 
    person: 'K. Mathew', 
    initials: 'KM', 
    subtitle: 'Network Dispatcher', 
    org: 'RescueLoop Command Central' 
  },
};

const navByRole: Record<Role, { label: string; screen: Screen }[]> = {
  donor: [
    { label: 'Overview', screen: 'donor-overview' },
    { label: 'Create Donation', screen: 'create-donation' },
    { label: 'Donation Details', screen: 'donation-details' },
    { label: 'All Donations', screen: 'history' }
  ],
  ngo: [
    { label: 'Overview', screen: 'ngo-overview' },
    { label: 'Incoming Offers', screen: 'offers' },
    { label: 'Review Offer', screen: 'offer-detail' },
    { label: 'Capacity & Intake', screen: 'requirements' },
    { label: 'History', screen: 'history' }
  ],
  volunteer: [
    { label: 'Overview', screen: 'volunteer-overview' },
    { label: 'Active Route', screen: 'task' },
    { label: 'Delivery History', screen: 'history' }
  ],
  ops: [
    { label: 'Overview', screen: 'ops-overview' },
    { label: 'Missions', screen: 'missions' },
    { label: 'Exceptions', screen: 'exceptions' },
    { label: 'Network', screen: 'network' },
    { label: 'Activity', screen: 'activity' },
  ],
};

const statusTone = {
  green: 'green',
  amber: 'amber',
  blue: 'blue',
  purple: 'purple',
  gray: 'gray',
  red: 'red'
} as const;

function Button({ 
  children, 
  primary = false, 
  secondary = false,
  danger = false,
  sm = false,
  onClick, 
  className = '',
  style,
  disabled = false,
  type = 'button'
}: { 
  children: React.ReactNode; 
  primary?: boolean; 
  secondary?: boolean;
  danger?: boolean;
  sm?: boolean;
  onClick?: () => void; 
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) {
  let styleClass = 'btn';
  if (primary) styleClass += ' btn-primary';
  else if (secondary) styleClass += ' btn-secondary';
  else if (danger) styleClass += ' btn-danger';
  if (sm) styleClass += ' btn-sm';

  return (
    <button 
      type={type}
      disabled={disabled} 
      onClick={onClick} 
      style={style}
      className={`${styleClass} ${className}`}
    >
      {children}
    </button>
  );
}

function Badge({ 
  children, 
  tone = 'gray',
  style
}: { 
  children: React.ReactNode; 
  tone?: keyof typeof statusTone;
  style?: React.CSSProperties;
}) { 
  return <span className={`badge ${statusTone[tone]}`} style={style}>• {children}</span>; 
}

function Card({ 
  children, 
  className = '',
  style
}: { 
  children: React.ReactNode; 
  className?: string;
  style?: React.CSSProperties;
}) { 
  return <section className={`card ${className}`} style={style}>{children}</section>; 
}

function SectionTitle({ 
  title, 
  subtitle, 
  action 
}: { 
  title: string; 
  subtitle?: string; 
  action?: React.ReactNode 
}) { 
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  ); 
}

function Stat({ 
  label, 
  value, 
  note, 
  icon 
}: { 
  label: string; 
  value: string; 
  note: string; 
  icon: React.ReactNode 
}) { 
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  ); 
}

function Timeline({ items }: { items: { title: string; time: string; active?: boolean }[] }) { 
  return (
    <div className="timeline">
      {items.map((item, i) => (
        <div className="timeline-item" key={item.title + i}>
          <span className={`dot ${item.active ? 'active' : i === items.length - 1 ? 'muted' : ''}`} />
          <div>
            <b>{item.title}</b>
            <small>{item.time}</small>
          </div>
        </div>
      ))}
    </div>
  ); 
}

function Table({ 
  headers, 
  rows 
}: { 
  headers: string[]; 
  rows: React.ReactNode[][] 
}) { 
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h, idx) => (
              <th key={h ? h : `col-${idx}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`row-${i}`}>
              {row.map((cell, j) => (
                <td key={`cell-${i}-${j}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ); 
}

function Input({ 
  label, 
  value, 
  defaultValue,
  onChange,
  placeholder,
  type = 'text',
  readOnly
}: { 
  label: string; 
  value?: string; 
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) { 
  return (
    <label className="field">
      <span>{label}</span>
      {onChange ? (
        <input 
          type={type} 
          value={value ?? ''} 
          onChange={onChange} 
          placeholder={placeholder} 
          readOnly={readOnly}
        />
      ) : (
        <input 
          type={type} 
          defaultValue={value ?? defaultValue ?? ''} 
          placeholder={placeholder} 
          readOnly={readOnly}
        />
      )}
    </label>
  ); 
}

function PageHead({ 
  eyebrow, 
  title, 
  subtitle, 
  action,
  onBack,
  backLabel
}: { 
  eyebrow: string; 
  title: string; 
  subtitle: string; 
  action?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}) { 
  return (
    <div className="page-head">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {onBack && (
            <button 
              type="button"
              onClick={onBack} 
              className="btn btn-sm" 
              style={{ padding: '3px 9px', fontSize: 12, height: 26 }}
              title="Return to previous screen"
            >
              ← {backLabel || 'Back'}
            </button>
          )}
          <small className="eyebrow" style={{ margin: 0 }}>{eyebrow}</small>
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <div className="actions">{action}</div>}
    </div>
  ); 
}

// ---------------- HEADER ----------------
function Header({ 
  role, 
  screen, 
  setScreen, 
  setRole 
}: { 
  role: Role; 
  screen: Screen; 
  setScreen: (s: Screen) => void; 
  setRole: (r: Role) => void;
}) {
  const meta = roleMeta[role] || roleMeta.donor;
  const navItems = navByRole[role] || navByRole.donor;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = React.useCallback(async () => {
    const res = await notificationsApi.getAll();
    if (res.data) {
      setNotifications(res.data);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="topbar">
      <div className="brand" onClick={() => setScreen('login')} title="Go to Welcome / Landing page">
        <span className="brand-mark">
          <Leaf size={18} />
        </span>
        <b>Rescue<span>Loop</span></b>
      </div>
      <nav>
        <span className="workspace-pill">{meta.label}</span>
        {navItems.map((n) => (
          <button 
            type="button"
            key={n.label} 
            className={screen === n.screen ? 'active' : ''} 
            onClick={() => setScreen(n.screen)}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <div className="header-tools">
        <div className="search">
          <Search size={15} />
          <input placeholder="Search missions, food, IDs..." />
        </div>
        <div style={{ position: 'relative' }}>
          <button 
            type="button"
            className="icon-btn" 
            title="Live alerts & notifications" 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="badge-dot" style={{ background: '#ef4444' }} />}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '110%',
              width: 320,
              background: '#0d1712',
              border: '1px solid #1f3326',
              borderRadius: 8,
              padding: 12,
              zIndex: 1000,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid #1f3326', paddingBottom: 6 }}>
                <b style={{ fontSize: 13, color: '#f3f4f6' }}>Notifications ({unreadCount} new)</b>
                {unreadCount > 0 && (
                  <button 
                    onClick={async () => {
                      await notificationsApi.markAllAsRead();
                      fetchNotifications();
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: 11, cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '8px 0', textAlign: 'center' }}>No notifications yet</p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div 
                      key={n.id} 
                      onClick={async () => {
                        if (!n.is_read) {
                          await notificationsApi.markAsRead(n.id);
                          fetchNotifications();
                        }
                      }}
                      style={{
                        padding: '6px 8px',
                        background: n.is_read ? '#111f17' : '#193023',
                        borderRadius: 6,
                        borderLeft: n.is_read ? '3px solid #374151' : '3px solid #10b981',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f9fafb' }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 2 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button 
          type="button"
          className="btn btn-sm portal-landing-btn" 
          onClick={() => setScreen('login')}
          style={{ fontSize: 12, padding: '5px 10px' }}
          title="Return to Portal Login / Splash"
        >
          Portal Landing
        </button>
        <button 
          type="button"
          className="btn btn-sm sign-out-btn" 
          onClick={() => {
            authApi.logout();
            setScreen('login');
          }}
          style={{ fontSize: 12, padding: '5px 10px', color: '#dc2626', borderColor: '#fca5a5' }}
          title="Sign out of workspace"
        >
          Sign Out
        </button>
        <div 
          className="user" 
          onClick={() => {
            const nextRole: Role = role === 'donor' ? 'ngo' : role === 'ngo' ? 'volunteer' : role === 'volunteer' ? 'ops' : 'donor';
            setRole(nextRole);
          }}
          title="Click to cycle workspace role"
        >
          <span className="avatar">{meta.initials}</span>
          <span className="user-info">
            <b>{meta.person}</b>
            <small>{meta.subtitle}</small>
          </span>
        </div>
      </div>
    </header>
  );
}

// ---------------- SCREEN 1: LOGIN ----------------
function Login({ 
  onLogin, 
  setRoleAndHome 
}: { 
  onLogin: () => void; 
  setRoleAndHome: (r: Role, skipDemo?: boolean) => void;
}) {
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'forgot' | 'reset'>('signin');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Sign in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Registration / Onboarding state
  const [regRole, setRegRole] = useState<'donor' | 'ngo' | 'volunteer'>('donor');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('+91 98765 43210');
  const [regOrgName, setRegOrgName] = useState('');
  const [regAddress, setRegAddress] = useState('Anna Nagar, Chennai');
  const [regVehicleType, setRegVehicleType] = useState('Two-wheeler');
  const [regError, setRegError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleCustomLogin = async () => {
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.error) {
        setLoginError(res.error);
        setIsLoggingIn(false);
        return;
      }
      const targetRole = (res.data?.user?.role || res.data?.role || 'donor') as Role;
      setRoleAndHome(targetRole, true);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    setRegError('');
    if (!regFullName.trim()) {
      setRegError('Full Name is required');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Work Email Address is required');
      return;
    }
    if (!regPassword.trim() || regPassword.length < 6) {
      setRegError('Password must be at least 6 characters');
      return;
    }

    setIsRegistering(true);
    try {
      const payload: any = {
        role: regRole,
        full_name: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim(),
        organization_name: regOrgName.trim() || (regRole === 'volunteer' ? 'Independent Courier' : `${regFullName}'s Organization`),
        address: regAddress.trim(),
      };
      if (regRole === 'volunteer') {
        payload.vehicle_type = regVehicleType;
      }

      const res = await authApi.register(payload);
      if (res.error) {
        setRegError(res.error);
        setIsRegistering(false);
        return;
      }

      const targetRole = regRole as Role;
      setRoleAndHome(targetRole, true);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = new URLSearchParams(window.location.search).get('reset_token');
    if (token) {
      setResetToken(token);
      setAuthMode('reset');
    }
  }, []);

  const handleForgotPassword = async () => {
    setLoginError('');
    setResetMessage('');
    if (!resetEmail.trim()) {
      setLoginError('Enter the email on the account.');
      return;
    }
    setIsResetting(true);
    const res = await authApi.forgotPassword(resetEmail.trim());
    setIsResetting(false);
    if (res.error) {
      setLoginError(res.error);
      return;
    }
    setResetMessage(res.data?.message || 'If an account exists for that email, a password reset link has been sent.');
    setAuthMode('reset');
  };

  const handleResetPassword = async () => {
    setLoginError('');
    setResetMessage('');
    if (resetPassword.length < 8) {
      setLoginError('Use at least 8 characters for the new password.');
      return;
    }
    setIsResetting(true);
    const res = await authApi.resetPassword(resetToken.trim(), resetPassword);
    setIsResetting(false);
    if (res.error) {
      setLoginError(res.error);
      return;
    }
    setPassword('');
    setResetPassword('');
    setResetToken('');
    setResetMessage(res.data?.message || 'Password updated. Sign in with the new password.');
    setAuthMode('signin');
  };

  const handleDemoLogin = async (r: Role) => {
    const res = await authApi.demoLogin(r);
    if (res.error) {
      setLoginError(res.error);
      return;
    }
    setRoleAndHome(r, true);
  };

  return (
    <div className="login-page">
      <div className="login-nav">
        <div className="brand">
          <span className="brand-mark"><Leaf size={18} /></span>
          <b>Rescue<span>Loop</span></b>
        </div>
        <div className="login-links">
          <a style={{ fontWeight: 600, color: 'var(--accent)' }} onClick={() => {}}>How it works</a>
          <a onClick={() => {}}>For organizations</a>
          <a onClick={() => {}}>Help</a>
          <a onClick={() => {}}>Contact</a>
          <Button primary sm onClick={() => setAuthMode('signin')}>Sign in</Button>
        </div>
      </div>
      <div className="login-main">
        <div className="login-copy">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#15803d', marginBottom: 20 }}>
            FOOD RESCUE NETWORK
          </div>
          <h1 style={{ lineHeight: 1.2, fontSize: 36, marginBottom: 8 }}>
            <span style={{ color: '#0f172a' }}>Move surplus food.</span><br />
            <span style={{ color: 'var(--accent, #16a34a)' }}>Deliver more good.</span>
          </h1>
          <p style={{ fontSize: 15, color: '#475569', maxWidth: 420, lineHeight: 1.6, marginBottom: 32 }}>
            RescueLoop connects food donors, community kitchens, and volunteers to coordinate safe, timely food rescue across your city.
          </p>
          <div className="login-stats">
            <div>
              <b>4</b>
              <span>Connected workspaces</span>
            </div>
            <div>
              <b>1</b>
              <span>Coordinated rescue flow</span>
            </div>
            <div>
              <b>24/7</b>
              <span>Mission visibility</span>
            </div>
          </div>
        </div>

        <div className="login-card-container">
          <Card className="login-card">
            {/* Auth Tab Navigation */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
              <button 
                type="button" 
                onClick={() => { setAuthMode('signin'); setLoginError(''); }}
                style={{
                  padding: '8px 14px',
                  fontWeight: authMode === 'signin' ? 700 : 500,
                  color: authMode === 'signin' ? '#1b6348' : '#64748b',
                  borderBottom: authMode === 'signin' ? '2px solid #1b6348' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Sign In
              </button>
              <button 
                type="button" 
                onClick={() => { setAuthMode('register'); setRegError(''); }}
                style={{
                  padding: '8px 14px',
                  fontWeight: authMode === 'register' ? 700 : 500,
                  color: authMode === 'register' ? '#1b6348' : '#64748b',
                  borderBottom: authMode === 'register' ? '2px solid #1b6348' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Create Account (Onboarding)
              </button>
            </div>

            {authMode === 'forgot' || authMode === 'reset' ? (
              <>
                <small className="eyebrow">ACCOUNT RECOVERY</small>
                <h2>{authMode === 'forgot' ? 'Reset your password' : 'Choose a new password'}</h2>
                <p>We email a one-time token. It expires in 30 minutes and can only be used once.</p>
                {loginError && (
                  <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: 6, color: '#991b1b', fontSize: 13, marginBottom: 12 }}>
                    {loginError}
                  </div>
                )}
                {resetMessage && (
                  <div style={{ padding: '8px 12px', background: '#ecfdf3', border: '1px solid #86efac', borderRadius: 6, color: '#166534', fontSize: 13, marginBottom: 12 }}>
                    {resetMessage}
                  </div>
                )}
                {authMode === 'forgot' ? (
                  <>
                    <Input
                      label="Work Email Address"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="e.g. director@kitchen.org"
                    />
                    <div style={{ marginTop: 16 }}>
                      <Button primary onClick={handleForgotPassword} disabled={isResetting} className="full">
                        {isResetting ? 'Sending reset link...' : 'Email reset link'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Input
                      label="Reset token"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste the token from the email"
                    />
                    <label className="field" style={{ marginTop: 12 }}>
                      <span>New password</span>
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                      />
                    </label>
                    <div style={{ marginTop: 16 }}>
                      <Button primary onClick={handleResetPassword} disabled={isResetting} className="full">
                        {isResetting ? 'Updating password...' : 'Update password'}
                      </Button>
                    </div>
                  </>
                )}
                <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>
                  <a onClick={() => { setAuthMode('signin'); setLoginError(''); }} style={{ color: '#1b6348', fontWeight: 600, cursor: 'pointer' }}>
                    Back to sign in
                  </a>
                </div>
              </>
            ) : authMode === 'signin' ? (
              <>
                <small className="eyebrow">WELCOME BACK</small>
                <h2>Sign in to RescueLoop</h2>
                <p>Access your workspace to manage donations, offers and rescue missions.</p>

                {loginError && (
                  <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: 6, color: '#991b1b', fontSize: 13, marginBottom: 12 }}>
                    ⚠️ {loginError}
                  </div>
                )}

                <Input 
                  label="Email address" 
                  value={email || 'alex@abcrestaurant.com'} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@abcrestaurant.com"
                />
                <label className="field" style={{ marginTop: 12 }}>
                  <span>Password</span>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingRight: 56 }}
                    />
                    <button type="button" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 12, color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                      Show
                    </button>
                  </div>
                </label>

                <div className="between" style={{ marginTop: 14, marginBottom: 18 }}>
                  <label className="custom-checkbox">
                    <input 
                      type="checkbox" 
                      checked={remember} 
                      onChange={(e) => setRemember(e.target.checked)} 
                    />
                    <span>Remember me</span>
                  </label>
                  <a onClick={() => { setAuthMode('forgot'); setLoginError(''); setResetEmail(email); }} style={{ cursor: 'pointer' }}>Forgot password?</a>
                </div>

                <Button primary onClick={handleCustomLogin} disabled={isLoggingIn} className="full">
                  {isLoggingIn ? 'Verifying Credentials...' : 'Sign in to workspace'} <ArrowRight size={16} />
                </Button>

                <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                  New to RescueLoop?{' '}
                  <a onClick={() => { setAuthMode('register'); setRegError(''); }} style={{ color: '#1b6348', fontWeight: 600, cursor: 'pointer' }}>
                    Request organization access
                  </a>
                </div>

                <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#64748b' }}>
                  <b style={{ display: 'block', marginBottom: 4, color: '#334155' }}>Hackathon demo access</b>
                  Use the workspace switcher at the bottom of any screen to explore all four roles — Donor, NGO, Volunteer, and Operations — without credentials.
                </div>

                <div className="demo-account-pills" style={{ marginTop: 16 }}>
                  <p>QUICK 1-CLICK DEMO LOGIN (SELECT ROLE):</p>
                  <div className="demo-role-buttons">
                    <button className="demo-role-btn" onClick={() => handleDemoLogin('donor')}>
                      <Package size={14} color="#1b6348" /> Donor (Kitchen)
                    </button>
                    <button className="demo-role-btn" onClick={() => handleDemoLogin('ngo')}>
                      <Heart size={14} color="#1d4ed8" /> NGO (Shelter)
                    </button>
                    <button className="demo-role-btn" onClick={() => handleDemoLogin('volunteer')}>
                      <Truck size={14} color="#b45309" /> Volunteer Courier
                    </button>
                    <button className="demo-role-btn" onClick={() => handleDemoLogin('ops')}>
                      <ShieldCheck size={14} color="#6d28d9" /> Operations Dispatch
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <small className="eyebrow">ORGANIZATION ONBOARDING</small>
                <h2>Join RescueLoop Network</h2>
                <p>Register your commercial kitchen, NGO relief centre, or join as a certified logistics courier.</p>

                {regError && (
                  <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: 6, color: '#991b1b', fontSize: 13, marginBottom: 12 }}>
                    ⚠️ {regError}
                  </div>
                )}

                {/* Role Selector Tabs */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#334155' }}>
                    Choose Participation Role
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <button 
                      type="button"
                      onClick={() => setRegRole('donor')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 6,
                        border: regRole === 'donor' ? '2px solid #1b6348' : '1px solid #cbd5e1',
                        background: regRole === 'donor' ? '#f0fdf4' : '#fff',
                        fontWeight: regRole === 'donor' ? 700 : 500,
                        color: regRole === 'donor' ? '#1b6348' : '#475569',
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <Package size={14} style={{ display: 'block', margin: '0 auto 4px' }} />
                      Donor (Kitchen)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRegRole('ngo')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 6,
                        border: regRole === 'ngo' ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                        background: regRole === 'ngo' ? '#eff6ff' : '#fff',
                        fontWeight: regRole === 'ngo' ? 700 : 500,
                        color: regRole === 'ngo' ? '#1d4ed8' : '#475569',
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <Heart size={14} style={{ display: 'block', margin: '0 auto 4px' }} />
                      NGO (Shelter)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRegRole('volunteer')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 6,
                        border: regRole === 'volunteer' ? '2px solid #b45309' : '1px solid #cbd5e1',
                        background: regRole === 'volunteer' ? '#fffbeb' : '#fff',
                        fontWeight: regRole === 'volunteer' ? 700 : 500,
                        color: regRole === 'volunteer' ? '#b45309' : '#475569',
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <Truck size={14} style={{ display: 'block', margin: '0 auto 4px' }} />
                      Volunteer Courier
                    </button>
                  </div>
                </div>

                <Input 
                  label="Contact Person / Full Name *" 
                  value={regFullName} 
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Chef Priya Sharma"
                />

                <div style={{ marginTop: 10 }}>
                  <Input 
                    label="Work Email Address *" 
                    value={regEmail} 
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. contact@kitchen.org"
                  />
                </div>

                <label className="field" style={{ marginTop: 10 }}>
                  <span>Account Password (min. 6 characters) *</span>
                  <input 
                    type="password" 
                    value={regPassword} 
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </label>

                <div style={{ marginTop: 10 }}>
                  <Input 
                    label="Mobile Phone Number" 
                    value={regPhone} 
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>

                {regRole !== 'volunteer' ? (
                  <div style={{ marginTop: 10 }}>
                    <Input 
                      label="Organization / Kitchen Name *" 
                      value={regOrgName} 
                      onChange={(e) => setRegOrgName(e.target.value)}
                      placeholder={regRole === 'donor' ? 'e.g. Royal Palace Banquet Hall' : 'e.g. Hope Shelter Home'}
                    />
                  </div>
                ) : (
                  <label className="field" style={{ marginTop: 10 }}>
                    <span>Vehicle & Transport Mode</span>
                    <select 
                      value={regVehicleType} 
                      onChange={(e) => setRegVehicleType(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      <option value="Two-wheeler">Two-wheeler (Scooter / Bike)</option>
                      <option value="Four-wheeler / Car">Four-wheeler / Passenger Car</option>
                      <option value="Refrigerated Van">Refrigerated Logistics Van</option>
                      <option value="Bicycle">Eco Bicycle Courier</option>
                    </select>
                  </label>
                )}

                <div style={{ marginTop: 10, marginBottom: 16 }}>
                  <Input 
                    label="Operating Address / City Zone" 
                    value={regAddress} 
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="e.g. 24, 2nd Avenue, Anna Nagar, Chennai"
                  />
                </div>

                <Button primary onClick={handleRegister} disabled={isRegistering} className="full">
                  {isRegistering ? 'Registering Account...' : 'Complete Registration & Enter Workspace'} <ArrowRight size={16} />
                </Button>

                <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                  Already registered?{' '}
                  <a onClick={() => { setAuthMode('signin'); setLoginError(''); }} style={{ color: '#1b6348', fontWeight: 600, cursor: 'pointer' }}>
                    Sign In
                  </a>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------- SCREEN 2: DONOR OVERVIEW ----------------
function DonorOverview({ 
  setScreen, 
  notify,
  setDonationId
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
  setDonationId: (id: string) => void;
}) { 
  const [stats, setStats] = useState<any>(null);
  const [activeDonations, setActiveDonations] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    donorApi.getDashboardStats().then(res => {
      if (res.data) setStats(res.data);
      else if (res.error) notify(res.error);
    });
    donorApi.getActiveDonations().then(res => {
      if (res.data) setActiveDonations(res.data);
      else if (res.error) notify(res.error);
    });
    donorApi.getTodayPickups().then(res => {
      if (res.data) setPickups(res.data);
      else if (res.error) notify(res.error);
    });
    donorApi.getActivityFeed().then(res => {
      if (res.data) setActivity(res.data);
      else if (res.error) notify(res.error);
    });
  }, [notify]);

  return (
    <>
      <PageHead 
        eyebrow="FOOD DONOR / CENTRAL DASHBOARD" 
        title="Good afternoon, Alex" 
        subtitle="ABC Restaurant Group · Anna Nagar Central Kitchen. All health & temperature logs are current." 
        action={
          <Button primary onClick={() => setScreen('create-donation')}>
            <Plus size={16} /> + Create donation
          </Button>
        }
      />

      <div className="stats-grid">
        <Stat 
          label="TOTAL DONATIONS" 
          value={stats ? `${stats.total_donations}` : "48"} 
          note="+6 this month" 
          icon={<Package size={18} />} 
        />
        <Stat 
          label="MEALS REDISTRIBUTED" 
          value={stats ? `${stats.total_meals_rescued?.toLocaleString()}` : "2,840"} 
          note="Across 19 completed missions" 
          icon={<CheckCircle2 size={18} />} 
        />
        <Stat 
          label="ACTIVE DONATIONS" 
          value={stats ? `${stats.active_missions}` : "3"} 
          note="2 awaiting pickup" 
          icon={<Clock3 size={18} />} 
        />
        <Stat 
          label="PENDING ACTIONS" 
          value={stats ? `${stats.pending_actions}` : "1"} 
          note="Review pickup details" 
          icon={<Bell size={18} />} 
        />
      </div>

      <div className="split">
        <Card>
          <SectionTitle 
            title="Active Rescue Donations" 
            subtitle="Track current food batch handovers in real time" 
            action={
              <Button sm onClick={() => setScreen('history')}>
                View all donations <ArrowRight size={14} />
              </Button>
            }
          />
          <Table 
            headers={['DONATION', 'QUANTITY', 'STATUS', 'PICKUP', '']} 
            rows={activeDonations.length > 0 ? activeDonations.map(d => [
              <div key={d.id}>
                <b>{d.code}</b>
                <small>{d.title}</small>
              </div>,
              d.quantity,
              <Badge key={`b-${d.id}`} tone={d.tone || 'blue'}>{d.status}</Badge>,
              d.pickup_window,
              <a key={`lnk-${d.id}`} style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--accent)' }} onClick={() => { setDonationId(d.id); setScreen('donation-details'); }}>
                View
              </a>
            ]) : [
              [
                <div key="r1"><b>RL-00128</b><small>Vegetarian lunch boxes</small></div>,
                '80 meals',
                <Badge key="b1" tone="blue">Pickup assigned</Badge>,
                'Today 3:30 PM',
                <a key="l1" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--accent)' }} onClick={() => setScreen('donation-details')}>View</a>
              ],
              [
                <div key="r2"><b>RL-00124</b><small>Packed rice meals</small></div>,
                '150 meals',
                <Badge key="b2" tone="amber">In transit</Badge>,
                'Today 2:45 PM',
                <a key="l2" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--accent)' }} onClick={() => setScreen('donation-details')}>View</a>
              ],
              [
                <div key="r3"><b>RL-00119</b><small>Bakery assortment</small></div>,
                '42 packs',
                <Badge key="b3" tone="green">Delivered</Badge>,
                'Yesterday',
                <a key="l3" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--accent)' }} onClick={() => setScreen('donation-details')}>View</a>
              ]
            ]}
          />
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <a style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--accent)' }} onClick={() => setScreen('history')}>View all donations →</a>
          </div>
        </Card>

        <Card>
          <SectionTitle 
            title="Upcoming pickups" 
            action={<Badge tone="blue">2 scheduled</Badge>}
          />
          <Timeline 
            items={pickups.length > 0 ? pickups : [
              { title: 'RL-00128 · 80 lunch boxes', time: 'Today 3:30 PM', active: true },
              { title: 'RL-00131 · 35 bakery packs', time: 'Today 5:00 PM' }
            ]}
          />
          <div className="notice" style={{ marginTop: 10 }}>
            Keep items stored correctly until the volunteer confirms pickup.
          </div>
        </Card>
      </div>

      <div className="split lower">
        <Card>
          <SectionTitle 
            title="Recent activity" 
            action={<Badge tone="gray">Live</Badge>}
          />
          <Timeline 
            items={activity.length > 0 ? activity : [
              { title: 'Donation RL-00128 submitted', time: '2:14 PM', active: true },
              { title: 'Recipient allocation completed', time: '2:16 PM' },
              { title: 'Volunteer accepted pickup', time: '2:21 PM' }
            ]}
          />
        </Card>

        <Card>
          <SectionTitle title="Quick actions" />
          <div className="quick-grid">
            <button className="quick-action-btn" onClick={() => setScreen('create-donation')}>
              <Plus size={20} />
              <span>Create a donation</span>
              <small>List surplus meals from your kitchen</small>
            </button>
            <button className="quick-action-btn" onClick={() => setScreen('history')}>
              <ClipboardList size={20} />
              <span>View donation history</span>
              <small>Export receipts and reports</small>
            </button>
          </div>
        </Card>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 3: CREATE DONATION FORM ----------------
function DonationForm({ 
  setScreen, 
  notify,
  setDonationId
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
  setDonationId: (id: string) => void;
}) { 
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [prepTime, setPrepTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [pickupTime, setPickupTime] = useState(() => new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [packaging, setPackaging] = useState('');
  const [temp, setTemp] = useState('');
  const [allergens, setAllergens] = useState('');
  const [notes, setNotes] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loadingDescription, setLoadingDescription] = useState('');
  
  // Interactive checklist
  const [checks, setChecks] = useState({
    pkg: true,
    prep: true,
    temp: true,
    allergen: true,
    accuracy: true
  });

  const handleAiAutoFill = async () => {
    if (!loadingDescription.trim()) {
      notify('Describe the donation before asking AI to extract its details.');
      return;
    }
    const res = await aiApi.intakeCopilot(loadingDescription.trim());
    if (res.error || !res.data) {
      notify(res.error || 'AI intake did not return valid donation details.');
      return;
    }
    if (res.data.title) setTitle(res.data.title);
    if (res.data.food_category) setCategory(res.data.food_category);
    if (res.data.quantity_meals != null) setQuantity(String(res.data.quantity_meals));
    if (res.data.packaging_type) setPackaging(res.data.packaging_type);
    if (res.data.storage_temp) setTemp(res.data.storage_temp);
    if (res.data.allergens) setAllergens(res.data.allergens);
    if (res.data.handling_notes) setNotes(res.data.handling_notes);
    notify(res.data.needs_clarification
      ? `Details extracted. Please confirm: ${res.data.clarifying_questions.join(' ')}`
      : 'Donation details extracted. Review them before submitting.');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const qtyNum = parseInt(quantity.replace(/[^0-9]/g, ''), 10);
    if (!title.trim() || !category.trim() || !Number.isInteger(qtyNum) || qtyNum < 1 || !pickupAddress.trim()) {
      notify('Enter a title, food category, positive quantity, and pickup address.');
      return;
    }
    if (!checks.accuracy) {
      notify('Confirm the food-safety certification before submitting.');
      return;
    }
    const res = await donorApi.createDonation({
      title: title.trim(),
      food_category: category.trim(),
      quantity_meals: qtyNum,
      packaging_type: packaging,
      storage_temp: temp,
      allergens,
      handling_notes: notes,
      prep_time: new Date(prepTime).toISOString(),
      latest_pickup_time: new Date(pickupTime).toISOString(),
      pickup_address: pickupAddress.trim(),
      on_site_contact: contactPerson.trim(),
      contact_phone: contactPhone.trim()
    });
    if (res.error || !res.data) {
      notify(res.error || 'Donation could not be created.');
      return;
    }
    setDonationId(res.data.id || res.data.code);
    notify(`Donation ${res.data.code} created and submitted for matching.`);
    setScreen('donation-details');
  };

  return (
    <>
      <PageHead 
        eyebrow="DONOR / INTAKE FORM" 
        title="Post Surplus Food Donation" 
        subtitle="Log prepared meals or fresh surplus with verified storage parameters so the AI dispatcher can route to suitable shelters." 
        onBack={() => setScreen('donor-overview')}
        backLabel="Back to Donor Overview"
        action={
          <div className="actions">
            <Button onClick={() => {
              localStorage.setItem('rescueloop_donation_draft', JSON.stringify({
                title, category, quantity, prepTime, pickupTime, packaging, temp, allergens, notes,
                pickupAddress, contactPerson, contactPhone
              }));
              notify('Donation draft saved on this device.');
            }}>Save Draft</Button>
            <Button primary onClick={handleSubmit}>Submit for Rescue Matching</Button>
          </div>
        }
      />

      <div className="split form-split">
        <Card>
          <SectionTitle 
            title="1. Surplus Food & Safety Specifications" 
            subtitle="Provide accurate handling instructions for courier transport"
          />
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <Input label="Donation Title / Summary" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input label="Food Category" value={category} onChange={(e) => setCategory(e.target.value)} />
              <Input label="Exact Quantity Available" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <Input label="Preparation Timestamp" type="datetime-local" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
              <Input label="Latest Safe Pickup Window" type="datetime-local" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
              <Input label="Packaging & Containment" value={packaging} onChange={(e) => setPackaging(e.target.value)} />
              <Input label="Storage Temperature" value={temp} onChange={(e) => setTemp(e.target.value)} />
              <Input label="Known Allergens & Diet Types" value={allergens} onChange={(e) => setAllergens(e.target.value)} />
            </div>

            <label className="field" style={{ marginBottom: 20 }}>
              <span>Handling & Kitchen Instructions</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <SectionTitle 
              title="2. Pickup Logistics & On-site Contact" 
              subtitle="Where the volunteer courier should report"
            />
            <div className="form-grid">
              <Input label="Kitchen / Warehouse Address" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
              <Input label="Primary On-site Contact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              <Input label="Direct Dispatch Contact Number" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>

            <div className="form-footer">
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={checks.accuracy} 
                  onChange={(e) => setChecks({ ...checks, accuracy: e.target.checked })} 
                />
                <span>I certify that this food complies with municipal food safety protocols.</span>
              </label>
              <Button type="button" onClick={() => notify('Draft updated.')}>Save Draft</Button>
              <Button primary type="submit">Submit for Rescue Matching</Button>
            </div>
          </form>
        </Card>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="AI Intake Copilot" 
              subtitle="Describe surplus naturally or use rapid presets" 
              action={<Badge tone="purple"><Sparkles size={12} /> Smart Form</Badge>}
            />
            <label className="field">
              <span>Describe the donation in your own words</span>
              <textarea value={loadingDescription} onChange={(e) => setLoadingDescription(e.target.value)} />
            </label>
            <Button sm secondary onClick={handleAiAutoFill} style={{ margin: '10px 0 14px' }}>
              <Sparkles size={14} /> Extract Intake Details
            </Button>
            <p className="notice" style={{ marginTop: 0 }}>
              RescueLoop AI parses quantities, storage prerequisites, and recipient matches in under 3 seconds.
            </p>
          </Card>

          <Card>
            <SectionTitle 
              title="Food Safety Compliance Checklist" 
              action={<Badge tone="green">Verified</Badge>}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={checks.pkg} 
                  onChange={(e) => setChecks({ ...checks, pkg: e.target.checked })} 
                />
                <span>Sealed food-grade containers</span>
              </label>
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={checks.prep} 
                  onChange={(e) => setChecks({ ...checks, prep: e.target.checked })} 
                />
                <span>Preparation time stamped</span>
              </label>
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={checks.temp} 
                  onChange={(e) => setChecks({ ...checks, temp: e.target.checked })} 
                />
                <span>Temperature checked below 4°C</span>
              </label>
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={checks.allergen} 
                  onChange={(e) => setChecks({ ...checks, allergen: e.target.checked })} 
                />
                <span>Allergen disclosures verified</span>
              </label>
            </div>
          </Card>
        </div>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 4: DONATION DETAILS ----------------
function DonationDetails({ 
  setScreen, 
  notify,
  donationId,
  setTaskId
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
  donationId: string | null;
  setTaskId: (id: string) => void;
}) { 
  const [donation, setDonation] = useState<any>(null);

  useEffect(() => {
    const loadDonation = async () => {
      let id = donationId;
      if (!id) {
        const active = await donorApi.getActiveDonations();
        if (active.error) {
          notify(active.error);
          return;
        }
        id = active.data?.[0]?.id || null;
      }
      if (!id) {
        const history = await donorApi.getHistory();
        if (history.error) {
          notify(history.error);
          return;
        }
        id = history.data?.[0]?.id || null;
      }
      if (!id) {
        notify('No donation records are available for this account.');
        return;
      }
      const result = await donorApi.getDonationDetails(id);
      if (result.error || !result.data) {
        notify(result.error || 'Donation details could not be loaded.');
        return;
      }
      setDonation(result.data);
    };
    loadDonation();
  }, [donationId, notify]);

  const statusTone = donation?.status === 'COMPLETED' ? 'green' : donation?.status === 'IN_TRANSIT' ? 'amber' : 'blue';
  const quantity = donation ? `${donation.quantity_meals} meals` : '—';

  return (
    <>
      <PageHead 
        eyebrow={`DONOR / DONATION DETAILS / ${donation?.code || ''}`} 
        title={donation ? `Donation ${donation.code}` : 'Donation Details'} 
        subtitle={donation ? `${donation.title} · ${donation.allocations.length} recipient allocations` : 'Loading donation record…'} 
        onBack={() => setScreen('donor-overview')}
        backLabel="Back to Donor Overview"
        action={
          <div className="actions">
            <Button 
              onClick={async () => {
                if (donation?.id) {
                  notify('Generating official PDF rescue receipt...');
                  try {
                    await donorApi.downloadReceipt(donation.id);
                    notify('Official receipt downloaded successfully.');
                  } catch (err: any) {
                    notify(err.message || 'Failed to download receipt PDF');
                  }
                }
              }} 
              disabled={!donation}
            >
              <Download size={14} /> Download Receipt (PDF)
            </Button>
            <Button onClick={() => window.print()} disabled={!donation}>
              Print View
            </Button>
            <Button primary onClick={() => setScreen('history')}>View Donation History</Button>
          </div>
        }
      />

      <div className="split">
        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title={`Batch Overview: ${donation?.code || '—'}`} 
              action={<Badge tone={statusTone}>{donation?.status?.replaceAll('_', ' ') || 'Loading'}</Badge>}
            />
            <div className="metric-row">
              <b>FOOD CATEGORY<strong>{donation?.food_category || '—'}</strong></b>
              <b>BATCH VOLUME<strong>{quantity}</strong><small>{donation?.allocations.length || 0} recipient drops</small></b>
              <b>PREPARATION<strong>{donation?.prep_time || '—'}</strong></b>
              <b>MAX PICKUP<strong>{donation?.latest_pickup || '—'}</strong></b>
            </div>
          </Card>

          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Recipient Allocations" 
              subtitle="Current allocation and acceptance state for this donation"
              action={<Badge tone="green">{donation?.allocations.length || 0} recipients</Badge>}
            />
            <Table 
              headers={['SHELTER / RECIPIENT', 'ALLOCATED', 'CAPACITY CHECK', 'DELIVERY STATUS']} 
              rows={(donation?.allocations || []).map((allocation: any, index: number) => [
                  <div>
                    <b>{allocation.ngo_name || 'Recipient'}</b>
                    <small>{allocation.address || 'Address unavailable'}</small>
                  </div>,
                  allocation.allocated_meals,
                  <Badge tone={allocation.status === 'ACCEPTED' ? 'green' : allocation.status === 'DECLINED' ? 'gray' : 'amber'}>{allocation.status}</Badge>,
                  allocation.delivery_window || `Drop #${index + 1}`
                ])}
            />
          </Card>

          <Card>
            <SectionTitle 
              title="Pickup Facility & Safety Parameters" 
            />
            <div className="detail-grid">
              <p>
                <small>DISPATCH LOCATION</small>
                <b>{donation?.pickup_address || '—'}</b>
                {donation?.contact_person || ''}
              </p>
              <p>
                <small>STORAGE PREREQUISITES</small>
                <b>{donation?.storage_temp || 'Not specified'}</b>
                {donation?.allergens || 'Allergen information not specified'}
              </p>
            </div>
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Assigned Volunteer Courier" 
              action={<Badge tone={donation?.courier?.status === 'COMPLETED' ? 'green' : 'blue'}>{donation?.courier?.status?.replaceAll('_', ' ') || 'Not assigned'}</Badge>}
            />
            {donation?.courier?.name ? <div className="person-row">
              <span className="avatar">{donation.courier.name.split(' ').map((part: string) => part[0]).join('').slice(0, 2)}</span>
              <div>
                <b>{donation.courier.name}</b>
                <small>{donation.courier.vehicle || 'Volunteer courier'}</small>
              </div>
            </div> : <p>No courier has been assigned yet.</p>}
            <hr />
            <div className="between">
              <span>Courier Contact:</span>
              <b>{donation?.courier?.phone || 'Not available'}</b>
            </div>
            <div className="between">
              <span>Current Status:</span>
              <b>{donation?.courier?.status?.replaceAll('_', ' ') || 'Awaiting dispatch'}</b>
            </div>
            <Button primary className="full" style={{ marginTop: 14 }} disabled={!donation} onClick={() => { setTaskId(donation.code); setScreen('task'); }}>
              View Volunteer Live Manifest <ExternalLink size={14} />
            </Button>
          </Card>

          <Card>
            <SectionTitle 
              title="Rescue Progress Stepper" 
              action={<small style={{ color: '#10b981', fontWeight: 700 }}>{donation?.status?.replaceAll('_', ' ') || 'Loading'}</small>}
            />
            <Timeline 
              items={donation ? [{ title: `Donation ${donation.code}: ${donation.status.replaceAll('_', ' ').toLowerCase()}`, time: donation.latest_pickup }] : []}
            />
          </Card>
        </div>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 5: HISTORY ----------------
function History({ 
  role, 
  setScreen, 
  notify,
  setDonationId,
  setOfferId,
  setTaskId,
  setMissionId
}: { 
  role: Role; 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
  setDonationId: (id: string) => void;
  setOfferId: (id: string) => void;
  setTaskId: (id: string) => void;
  setMissionId: (id: string) => void;
}) { 
  const ops = role === 'ops';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'transit' | 'delivered' | 'review'>('all');

  const [historyList, setHistoryList] = useState<any[]>([]);

  useEffect(() => {
    if (role === 'donor') {
      donorApi.getHistory().then(res => {
        if (res.data) setHistoryList(res.data);
        else if (res.error) notify(res.error);
      });
    } else if (role === 'ngo') {
      ngoApi.getHistory().then(res => {
        if (res.data) setHistoryList(res.data);
        else if (res.error) notify(res.error);
      });
    } else if (role === 'volunteer') {
      volunteerApi.getHistory().then(res => {
        if (res.data) setHistoryList(res.data);
        else if (res.error) notify(res.error);
      });
    } else if (role === 'ops') {
      opsApi.getAuditLogs().then(res => {
        if (res.data) {
          const mapped = res.data.map((log: any) => ({
            id: log.entity_id || 'AUDIT',
            uuid: log.entity_id,
            entity_type: log.entity_type,
            name: `${log.actor_role?.toUpperCase() || 'SYSTEM'}: ${log.action}`,
            food: log.details?.status ? `Status: ${log.details.status}` : 'System operation',
            quantity: log.details?.meals ? `${log.details.meals} meals` : '1 event',
            stops: log.details?.allocations ? `${log.details.allocations} drops` : 'Audit Log',
            status: 'Verified Ledger',
            tone: 'green' as const,
            volunteer: log.actor_name || 'System Auto',
            date: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            creator: log.actor_role || 'audit'
          }));
          setHistoryList(mapped);
        } else if (res.error) notify(res.error);
      });
    }
  }, [role, notify]);

  const filtered = historyList.filter((item) => {
    const matchesSearch = 
      String(item.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.food || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'transit') return matchesSearch && item.status.includes('transit');
    if (activeTab === 'delivered') return matchesSearch && item.status.includes('Delivered');
    if (activeTab === 'review') return matchesSearch && (item.status.includes('volunteer') || item.status.includes('assigned'));
    return matchesSearch;
  });

  const exportHistory = () => {
    const columns = ['id', 'name', 'food', 'quantity', 'status', 'date'];
    const csv = [
      columns.join(','),
      ...filtered.map((item) => columns.map((key) => `"${String(item[key] ?? '').replaceAll('"', '""')}"`).join(','))
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rescueloop-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHead 
        eyebrow={`${roleMeta[role].label.toUpperCase()} / HISTORICAL RECORDS`} 
        title={ops ? 'Master Dispatch Archive & Telemetry' : 'Food Rescue History & Audits'} 
        subtitle={ops ? 'Comprehensive ledger of missions, automated allocations and exceptions.' : 'Review delivered rescue handovers, verify receipts and export tax deduction statements.'} 
        action={
          <Button primary onClick={exportHistory}>
            <Download size={14} /> Export Audit Report (CSV)
          </Button>
        }
      />

      <Card>
        <div className="toolbar">
          <div className="tabs">
            <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
              All Records ({historyList.length})
            </button>
            <button className={activeTab === 'transit' ? 'active' : ''} onClick={() => setActiveTab('transit')}>
              In Transit ({historyList.filter(item => item.status?.toLowerCase().includes('transit')).length})
            </button>
            <button className={activeTab === 'delivered' ? 'active' : ''} onClick={() => setActiveTab('delivered')}>
              Delivered & Verified ({historyList.filter(item => item.status?.toLowerCase().includes('deliver')).length})
            </button>
            <button className={activeTab === 'review' ? 'active' : ''} onClick={() => setActiveTab('review')}>
              Needs Attention ({historyList.filter(item => item.status?.toLowerCase().includes('pending') || item.status?.toLowerCase().includes('assigned')).length})
            </button>
          </div>
          <div className="actions">
            <div className="search">
              <Search size={14} />
              <input 
                placeholder="Filter by ID, donor, dish..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button sm onClick={() => notify('Filter drawer opened.')}><Filter size={13} /> Filter</Button>
          </div>
        </div>

        <Table 
          headers={
            ops 
              ? ['MISSION ID / DONOR', 'VOLUME', 'ROUTE STOPS', 'STATUS', 'COURIER', 'TIMING', 'ACTION'] 
              : ['BATCH ID / ORIGIN', 'FOOD SUMMARY', 'VOLUME', 'STATUS', 'TIMESTAMP', 'ACTION']
          } 
          rows={filtered.map((item) => {
            if (ops) {
              return [
                <div key={item.id}>
                  <b>{item.id}</b>
                  <small>{item.name}</small>
                </div>,
                item.quantity,
                item.stops,
                <Badge key={`badge-${item.id}`} tone={item.tone}>{item.status}</Badge>,
                item.volunteer,
                item.date,
                <Button key={`btn-${item.id}`} sm primary onClick={() => {
                  if (item.entity_type === 'Donation') {
                    setDonationId(item.uuid || item.id);
                    setScreen('donation-details');
                  } else {
                    setMissionId(item.uuid || item.id);
                    setScreen('mission-detail');
                  }
                }}>
                  Inspect
                </Button>
              ];
            } else {
              return [
                <div key={item.id}>
                  <b>{item.id}</b>
                  <small>{item.name}</small>
                </div>,
                item.food,
                item.quantity,
                <Badge key={`badge-${item.id}`} tone={item.tone}>{item.status}</Badge>,
                item.date,
                <Button key={`btn-${item.id}`} sm onClick={() => {
                  if (role === 'donor') {
                    setDonationId(item.uuid || item.id);
                    setScreen('donation-details');
                  } else if (role === 'ngo') {
                    setOfferId(item.uuid || item.id);
                    setScreen('offer-detail');
                  } else {
                    setTaskId(item.uuid || item.id);
                    setScreen('task');
                  }
                }}>
                  View Details
                </Button>
              ];
            }
          })}
        />
      </Card>
    </>
  ); 
}

// ---------------- SCREEN 6: NGO OVERVIEW ----------------
function NgoOverview({ 
  setScreen, 
  notify 
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  const [stats, setStats] = useState<any>(null);
  const [offersList, setOffersList] = useState<any[]>([]);

  useEffect(() => {
    ngoApi.getDashboardStats().then(res => {
      if (res.data) setStats(res.data);
    });
    ngoApi.getOffers().then(res => {
      if (res.data && res.data.length > 0) setOffersList(res.data);
    });
  }, []);

  return (
    <>
      <PageHead 
        eyebrow="NGO COMMUNITY RECIPIENT / OVERVIEW" 
        title="Good afternoon, Sarah" 
        subtitle="Hope Community Foundation · Kitchen & Shelter Hub. Receiving intake is active until 6:00 PM." 
        action={
          <Button primary onClick={() => setScreen('requirements')}>
            Update requirements
          </Button>
        }
      />

      <div className="stats-grid">
        <Stat 
          label="INCOMING OFFERS" 
          value={stats ? `${stats.incoming_offers}` : "6"} 
          note="2 need a response" 
          icon={<Package size={18} />} 
        />
        <Stat 
          label="MEALS ACCEPTED" 
          value={stats ? `${stats.meals_accepted_week}` : "420"} 
          note="For this week" 
          icon={<CheckCircle2 size={18} />} 
        />
        <Stat 
          label="RECEIVED TODAY" 
          value={stats ? `${stats.received_today}` : "110"} 
          note="Across 3 deliveries" 
          icon={<Truck size={18} />} 
        />
        <Stat 
          label="AVAILABLE CAPACITY" 
          value={stats ? `${stats.available_capacity}` : "70"} 
          note={stats ? `Of ${stats.daily_capacity} meals remaining` : "Of 180 meals remaining"} 
          icon={<Users size={18} />} 
        />
      </div>

      <div className="split">
        <Card>
          <SectionTitle 
            title="Immediate Donation Offers for Your Hub" 
            subtitle="Matches based on your cold storage capacity and dietary criteria" 
            action={
              <Button sm onClick={() => setScreen('offers')}>
                View All {offersList.length > 0 ? offersList.length : 6} Offers <ArrowRight size={14} />
              </Button>
            }
          />
          <Table 
            headers={['DONOR KITCHEN', 'FOOD TYPE', 'OFFERED', 'PICKUP WINDOW', 'STATUS', 'ACTION']} 
            rows={offersList.length > 0 ? offersList.slice(0, 3).map((item) => [
              <div key={item.id}>
                <b>{item.donor}</b>
                <small>{item.location}</small>
              </div>,
              item.food,
              item.quantity,
              item.window,
              <Badge key={`b-${item.id}`} tone={item.tone || 'amber'}>{item.status}</Badge>,
              <Button key={`btn-${item.id}`} sm primary onClick={() => setScreen('offer-detail')}>
                Review Offer
              </Button>
            ]) : [
              [
                <div>
                  <b>ABC Restaurant</b>
                  <small>Anna Nagar · 1.8 km away</small>
                </div>,
                'Cooked Vegetarian Meals',
                '80 meals',
                '3:30 - 5:00 PM',
                <Badge tone="amber">Awaiting Response</Badge>,
                <Button sm primary onClick={() => setScreen('offer-detail')}>
                  Review & Accept
                </Button>
              ],
              [
                <div>
                  <b>Fresh Bake House</b>
                  <small>Kilpauk · 2.4 km away</small>
                </div>,
                'Fresh Bread & Rolls',
                '40 packs',
                '2:00 - 4:00 PM',
                <Badge tone="blue">New Match</Badge>,
                <Button sm onClick={() => setScreen('offer-detail')}>
                  Review
                </Button>
              ],
              [
                <div>
                  <b>Green Plate Cafe</b>
                  <small>Shenoy Nagar · 1.2 km away</small>
                </div>,
                'Rice & Vegetable Stew',
                '60 meals',
                '5:00 - 6:00 PM',
                <Badge tone="green">Accepted (In Transit)</Badge>,
                <Button sm onClick={() => setScreen('offer-detail')}>
                  Details
                </Button>
              ]
            ]}
          />
        </Card>

        <Card>
          <SectionTitle 
            title="Shelter Receiving Capacity Meter" 
            action={<Badge tone="green">61% Allocated</Badge>}
          />
          <div className="capacity">
            <b>Today&apos;s Intake Target</b>
            <strong>110 / 180 Meals</strong>
            <div className="progress">
              <i style={{ width: '61%' }} />
            </div>
            <div className="between">
              <span>Remaining Storage Slot:</span>
              <b>70 Meals Free</b>
            </div>
            <div className="between">
              <span>Cold Storage Facility:</span>
              <b>Chilled 4°C (3 shelves free)</b>
            </div>
            <div className="between">
              <span>Intake Hours Window:</span>
              <b>9:00 AM – 6:00 PM Today</b>
            </div>
          </div>
          <Button className="full" style={{ marginTop: 14 }} onClick={() => setScreen('requirements')}>
            Adjust Capacity & Intake Preferences
          </Button>
        </Card>
      </div>

      <div className="split lower">
        <Card>
          <SectionTitle 
            title="Upcoming deliveries" 
            action={<small style={{ color: '#10b981', fontWeight: 700 }}>2 In Flight</small>}
          />
          <Timeline 
            items={[
              { title: 'Jordan Mathew delivering 60 meals from ABC Restaurant', time: 'ETA 3:45 PM (In 25 mins)', active: true },
              { title: 'Courier arriving with 50 meals from Green Plate Cafe', time: 'ETA 5:15 PM' }
            ]}
          />
        </Card>

        <Card>
          <SectionTitle title="Recent receiving activity" />
          <Timeline
            items={[
              { title: 'Delivery from ABC Restaurant received', time: '1:45 PM · 60 meals · Jordan Mathew', active: true },
              { title: 'Allocation accepted for RL-00128', time: '2:16 PM · 80 meals offered' },
              { title: 'Capacity updated by Sarah Kumar', time: '1:58 PM' }
            ]}
          />
          <div className="quick-grid" style={{ marginTop: 14 }}>
            <button className="quick-action-btn" onClick={() => setScreen('offers')}>
              <Package size={18} />
              <span>Browse offers queue</span>
              <small>Respond to donors nearby</small>
            </button>
            <button className="quick-action-btn" onClick={() => setScreen('requirements')}>
              <Users size={18} />
              <span>Update requirements</span>
              <small>Manage capacity and preferences</small>
            </button>
          </div>
        </Card>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 7: OFFERS LIST ----------------
function Offers({ 
  setScreen, 
  notify,
  setOfferId
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
  setOfferId: (id: string) => void;
}) { 
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'accepted' | 'declined'>('all');
  const [search, setSearch] = useState('');
  const [offersList, setOffersList] = useState<any[]>([]);

  useEffect(() => {
    ngoApi.getOffers('all', search).then(res => {
      if (res.data) setOffersList(res.data);
      else if (res.error) notify(res.error);
    });
  }, [activeTab, search, notify]);

  const filtered = offersList.filter((o) => {
    const match = String(o.donor || '').toLowerCase().includes(search.toLowerCase()) || String(o.food || '').toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'new') return match && (o.status.includes('New') || o.status.includes('Awaiting'));
    if (activeTab === 'accepted') return match && o.status.includes('Accepted');
    if (activeTab === 'declined') return match && o.status.includes('Declined');
    return match;
  });

  return (
    <>
      <PageHead 
        eyebrow="NGO / DONATION OFFERS QUEUE" 
        title="Incoming Surplus Offers" 
        subtitle="Review certified surplus food available in your zone. Confirm quantities within your active storage threshold." 
        action={
          <Button primary onClick={() => setScreen('requirements')}>
            Adjust Storage Capacity
          </Button>
        }
      />

      <Card>
        <div className="toolbar">
          <div className="tabs">
            <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
              All Offers ({offersList.length})
            </button>
            <button className={activeTab === 'new' ? 'active' : ''} onClick={() => setActiveTab('new')}>
              Awaiting Action ({offersList.filter(o => o.status.includes('New') || o.status.includes('Awaiting')).length})
            </button>
            <button className={activeTab === 'accepted' ? 'active' : ''} onClick={() => setActiveTab('accepted')}>
              Accepted ({offersList.filter(o => o.status.includes('Accepted')).length})
            </button>
            <button className={activeTab === 'declined' ? 'active' : ''} onClick={() => setActiveTab('declined')}>
              Declined ({offersList.filter(o => o.status.includes('Declined')).length})
            </button>
          </div>
          <div className="actions">
            <div className="search">
              <Search size={14} />
              <input 
                placeholder="Search donor or food category..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button sm onClick={() => setSearch('')}><Filter size={13} /> Clear Search</Button>
          </div>
        </div>

        <Table 
          headers={['DONOR & DISTANCE', 'FOOD DESCRIPTION', 'VOLUME', 'PICKUP WINDOW', 'STATUS', 'ACTION']} 
          rows={filtered.map((item) => [
            <div key={item.id}>
              <b>{item.donor}</b>
              <small>{item.location}</small>
            </div>,
            item.food,
            item.quantity,
            item.window,
            <Badge key={`b-${item.id}`} tone={item.tone}>{item.status}</Badge>,
            <Button key={`btn-${item.id}`} sm primary onClick={() => { setOfferId(item.id); setScreen('offer-detail'); }}>
              Inspect Offer
            </Button>
          ])}
        />
      </Card>
    </>
  ); 
}

// ---------------- SCREEN 8: OFFER DETAIL & ACCEPTANCE ----------------
function OfferDetail({ 
  setScreen, 
  notify,
  offerId
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
  offerId: string | null;
}) { 
  const [offer, setOffer] = useState<any>(null);
  const [acceptedQty, setAcceptedQty] = useState('');
  const [receivingSlot, setReceivingSlot] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const loadOffer = async () => {
      let id = offerId;
      if (!id) {
        const offers = await ngoApi.getOffers('all');
        if (offers.error) {
          notify(offers.error);
          return;
        }
        id = offers.data?.[0]?.id || null;
      }
      if (!id) {
        notify('No donation offers are available for this account.');
        return;
      }
      const result = await ngoApi.getOfferDetail(id);
      if (result.error || !result.data) {
        notify(result.error || 'Offer details could not be loaded.');
        return;
      }
      setOffer(result.data);
      setAcceptedQty(String(result.data.quantity_offered));
      setReceivingSlot(result.data.pickup_window || '');
    };
    loadOffer();
  }, [offerId, notify]);

  const handleAccept = async () => {
    const qty = parseInt(acceptedQty, 10);
    if (!offer || !Number.isInteger(qty) || qty < 1 || qty > offer.quantity_offered) {
      notify('Enter a valid quantity not exceeding the offered allocation.');
      return;
    }
    const result = await ngoApi.respondToOffer(offer.allocation_id, 'accept', { accepted_meals: qty, delivery_window: receivingSlot, notes: note });
    if (result.error || !result.data) {
      notify(result.error || 'Offer acceptance failed.');
      return;
    }
    notify(`Accepted ${qty} meals from ${offer.donor}.`);
    setScreen('ngo-overview');
  };

  const handleDecline = async () => {
    if (!offer) return;
    const result = await ngoApi.respondToOffer(offer.allocation_id, 'decline');
    if (result.error || !result.data) {
      notify(result.error || 'Offer decline failed.');
      return;
    }
    notify('Offer declined.');
    setScreen('offers');
  };

  const mapUrl = offer?.donor_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offer.donor_address)}`
    : null;

  return (
    <>
      <PageHead 
        eyebrow={`NGO / OFFERS / ${offer?.code || ''}`} 
        title="Review & Accept Food Donation" 
        subtitle={offer ? `${offer.donor} · ${offer.quantity_offered} meals offered` : 'Loading offer details…'} 
        onBack={() => setScreen('offers')}
        backLabel="Back to Offers"
        action={
          <div className="actions">
            <Button onClick={() => setScreen('offers')}>Back to Offers</Button>
            <Button primary onClick={handleAccept} disabled={!offer || offer.current_status === 'ACCEPTED' || offer.current_status === 'DECLINED'}>Accept Allocation</Button>
          </div>
        }
      />

      <div className="split">
        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title={offer?.title || 'Donation Offer'} 
              action={<Badge tone={offer?.current_status === 'ACCEPTED' ? 'green' : offer?.current_status === 'DECLINED' ? 'gray' : 'amber'}>{offer?.current_status?.replaceAll('_', ' ') || 'Loading'}</Badge>}
            />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1b6348' }}>
              {offer?.donor || '—'} · {offer?.donor_address || 'Address unavailable'}
            </p>
            <div className="metric-row">
              <b>TOTAL OFFERED<strong>{offer?.quantity_offered ?? '—'} Meals</strong><small>{offer?.packaging || 'Packaging unspecified'}</small></b>
              <b>PREPARATION TIME<strong>{offer?.prep_time || '—'}</strong></b>
              <b>PICKUP WINDOW<strong>{offer?.pickup_window || '—'}</strong></b>
              <b>TRANSIT DISTANCE<strong>{offer?.distance ? `${offer.distance} km` : '—'}</strong></b>
            </div>
          </Card>

          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Nutritional & Storage Verification" 
              action={<Badge tone="green"><ShieldCheck size={12} /> Passed Food Safety</Badge>}
            />
            <div className="detail-grid">
              <p>
                <small>FOOD CATEGORY</small>
                <b>{offer?.food_category || 'Not specified'}</b>
              </p>
              <p>
                <small>PACKAGING INTEGRITY</small>
                <b>{offer?.packaging || 'Not specified'}</b>
              </p>
              <p>
                <small>STORAGE PARAMETERS</small>
                <b>{offer?.storage_temp || 'Not specified'}</b>
              </p>
              <p>
                <small>ALLERGEN DISCLOSURE</small>
                <b>{offer?.allergens || 'Not specified'}</b>
              </p>
            </div>
          </Card>

          <Card>
            <SectionTitle 
              title="Pickup Kitchen Coordinates" 
              action={mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer">View on Map <ExternalLink size={12} /></a> : undefined}
            />
            <div className="person-row">
              <MapPin size={22} color="#1b6348" />
              <div>
                <b>{offer?.donor_address || 'Address unavailable'}</b>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Confirm Quantity to Receive" 
              subtitle={`Maximum offered quantity: ${offer?.quantity_offered ?? '—'} meals`}
            />
            
            <div style={{ margin: '14px 0' }}>
              <label className="field">
                <span>Quantity you can safely accept (Meals)</span>
                <input 
                  type="number" 
                  value={acceptedQty} 
                  onChange={(e) => setAcceptedQty(e.target.value)} 
                  max={offer?.quantity_offered}
                  min="10"
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Button sm secondary onClick={() => setAcceptedQty(String(offer?.quantity_offered || ''))}>Accept Full Allocation</Button>
            </div>

            <Input 
              label="Preferred Delivery Window at Shelter" 
              value={receivingSlot} 
              onChange={(e) => setReceivingSlot(e.target.value)} 
            />

            <label className="field" style={{ margin: '14px 0' }}>
              <span>Special Receiving Notes for Courier</span>
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
              />
            </label>

            <Button primary className="full" onClick={handleAccept} style={{ marginBottom: 10 }} disabled={!offer || offer.current_status === 'ACCEPTED' || offer.current_status === 'DECLINED'}>
              <Check size={16} /> Confirm & Accept {acceptedQty} Meals
            </Button>
            <Button danger className="full" onClick={handleDecline} disabled={!offer || offer.current_status === 'ACCEPTED' || offer.current_status === 'DECLINED'}>
              Decline Offer (Pass to Next Shelter)
            </Button>
          </Card>

          <Card>
            <SectionTitle title="Intake Safety Notice" />
            <p className="notice" style={{ marginTop: 0 }}>
              Once accepted, RescueLoop dispatches the nearest volunteer courier with temperature monitoring insulation. Please have receiving staff available at <b>{receivingSlot}</b>.
            </p>
          </Card>
        </div>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 9: REQUIREMENTS & CAPACITY ----------------
function Requirements({ 
  notify, 
  setScreen 
}: { 
  notify: (msg: string) => void; 
  setScreen?: (s: Screen) => void; 
}) { 
  const [dailyCapacity, setDailyCapacity] = useState('180');
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('6:00 PM');
  const [foodTypes, setFoodTypes] = useState('Prepared meals, bakery items, fresh produce');
  const [dietary, setDietary] = useState('Vegetarian preferred; no alcohol-based ingredients');
  const [zones, setZones] = useState('Anna Nagar, Kilpauk, Shenoy Nagar, Aminjikarai');
  const [facilities, setFacilities] = useState({
    fridge: true,
    ambient: true,
    freeze: false,
    staff: true
  });

  useEffect(() => {
    ngoApi.getPreferences().then(res => {
      if (res.data) {
        setDailyCapacity(String(res.data.daily_capacity_meals || 180));
        setStartTime(res.data.operating_hours_start || '9:00 AM');
        setEndTime(res.data.operating_hours_end || '6:00 PM');
        if (res.data.dietary_preferences) setDietary(res.data.dietary_preferences);
        if (res.data.service_area_zones) setZones(res.data.service_area_zones);
      }
    });
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await ngoApi.updatePreferences({
      daily_capacity_meals: parseInt(dailyCapacity) || 180,
      operating_hours_start: startTime,
      operating_hours_end: endTime,
      dietary_preferences: dietary,
      service_area_zones: zones
    });
    notify('Shelter receiving parameters & capacity limits updated successfully in database!');
  };

  return (
    <>
      <PageHead 
        eyebrow="NGO / PREFERENCES & CAPACITY" 
        title="Receiving Limits & Criteria" 
        subtitle="Keep your facility capacity, operating hours and food restrictions updated so automated matching only sends what you can serve." 
        onBack={setScreen ? () => setScreen('ngo-overview') : undefined}
        backLabel="Back to NGO Overview"
        action={
          <Button primary onClick={handleSave}>
            <Check size={16} /> Save Preference Changes
          </Button>
        }
      />

      <div className="split form-split">
        <Card>
          <SectionTitle 
            title="Receiving Capacity & Dietary Settings" 
            subtitle="Configure what donations your kitchen can accommodate"
            action={<Badge tone="green">Profile Active</Badge>}
          />
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <Input 
                label="Maximum Daily Meal Intake (Meals/day)" 
                value={dailyCapacity} 
                onChange={(e) => setDailyCapacity(e.target.value)} 
              />
              <Input 
                label="Current Free Capacity Right Now" 
                value="70 meals available" 
              />
              <Input 
                label="Receiving Operating Hours (Start)" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)} 
              />
              <Input 
                label="Receiving Operating Hours (End)" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)} 
              />
              <Input 
                label="Accepted Food Classifications" 
                value={foodTypes} 
                onChange={(e) => setFoodTypes(e.target.value)} 
              />
              <Input 
                label="Beneficiary Dietary Requirements" 
                value={dietary} 
                onChange={(e) => setDietary(e.target.value)} 
              />
            </div>

            <Input 
              label="Geographic Service Area (Pickup Zones)" 
              value={zones} 
              onChange={(e) => setZones(e.target.value)} 
            />

            <h3 style={{ marginTop: 20, marginBottom: 10, fontSize: 15 }}>Verified Facility Equipment & Storage</h3>
            <div className="check-grid">
              <div 
                className={`check-item ${facilities.fridge ? 'checked' : ''}`}
                onClick={() => setFacilities({ ...facilities, fridge: !facilities.fridge })}
              >
                <input type="checkbox" checked={facilities.fridge} readOnly />
                <span>Commercial Refrigerated Storage (2° - 4°C)</span>
              </div>
              <div 
                className={`check-item ${facilities.ambient ? 'checked' : ''}`}
                onClick={() => setFacilities({ ...facilities, ambient: !facilities.ambient })}
              >
                <input type="checkbox" checked={facilities.ambient} readOnly />
                <span>Ambient Dry Pantry & Bread Racks</span>
              </div>
              <div 
                className={`check-item ${facilities.freeze ? 'checked' : ''}`}
                onClick={() => setFacilities({ ...facilities, freeze: !facilities.freeze })}
              >
                <input type="checkbox" checked={facilities.freeze} readOnly />
                <span>Deep Freeze Unit (-18°C)</span>
              </div>
              <div 
                className={`check-item ${facilities.staff ? 'checked' : ''}`}
                onClick={() => setFacilities({ ...facilities, staff: !facilities.staff })}
              >
                <input type="checkbox" checked={facilities.staff} readOnly />
                <span>Certified Food Safety Receiving Staff on-site</span>
              </div>
            </div>

            <label className="field" style={{ marginTop: 14 }}>
              <span>Special Delivery Instructions for Couriers</span>
              <textarea defaultValue="Please alert our kitchen door 15 minutes before arrival. Rear service driveway accessible from 5th Street." />
            </label>

            <div className="form-footer">
              <span>Last updated: Today at 9:10 AM by Sarah Kumar</span>
              <Button type="button" onClick={() => notify('Reset to previous configuration.')}>Discard Changes</Button>
              <Button primary type="submit">Save Requirements</Button>
            </div>
          </form>
        </Card>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Real-Time Capacity Allocation" 
              action={<Badge tone="green">Healthy Balance</Badge>}
            />
            <div className="capacity">
              <div className="metric-row" style={{ borderTop: 'none', paddingTop: 0 }}>
                <b>MAX LIMIT<strong>{dailyCapacity}</strong><small>Meals</small></b>
                <b>ALLOCATED<strong>110</strong><small>Meals</small></b>
                <b>AVAILABLE<strong>70</strong><small>Meals</small></b>
                <b>UTILIZATION<strong>61%</strong><small>Optimal</small></b>
              </div>
              <div className="progress" style={{ marginTop: 14 }}>
                <i style={{ width: '61%' }} />
              </div>
              <hr />
              <div className="between">
                <span>Today (Saturday):</span>
                <b>110 / 180 Committed</b>
              </div>
              <div className="between">
                <span>Tomorrow (Sunday):</span>
                <b>180 Free capacity</b>
              </div>
              <div className="between">
                <span>Monday:</span>
                <b>150 Free capacity</b>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle title="How AI Matching Works" />
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#4b5853' }}>
              The RescueLoop Dispatcher filters donors within a 5 km radius matching your storage temperatures and dietary preferences, preventing mismatched food or overloaded receiving docks.
            </p>
          </Card>
        </div>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 10: VOLUNTEER OVERVIEW ----------------
function VolunteerOverview({ 
  setScreen, 
  notify,
  setTaskId
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
  setTaskId: (id: string) => void;
}) { 
  const [isAvailable, setIsAvailable] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);

  useEffect(() => {
    volunteerApi.getDashboardStats().then(res => {
      if (res.data) {
        setStats(res.data);
        if (res.data.is_available !== undefined) setIsAvailable(res.data.is_available);
      } else if (res.error) notify(res.error);
    });
    volunteerApi.getActiveTasks().then(res => {
      if (res.data) setActiveTasks(res.data);
      else if (res.error) notify(res.error);
    });
  }, [notify]);

  const toggleAvailability = async () => {
    const nextVal = !isAvailable;
    const result = await volunteerApi.toggleAvailability(nextVal);
    if (result.error || !result.data) {
      notify(result.error || 'Availability could not be updated.');
      return;
    }
    setIsAvailable(result.data.is_available);
    notify(nextVal ? 'Status set to: ONLINE (Ready for pickups)' : 'Status set to: OFFLINE');
  };

  return (
    <>
      <PageHead 
        eyebrow="VOLUNTEER RESCUE COURIER / OVERVIEW" 
        title="Your volunteer workspace" 
        subtitle={stats?.vehicle_type || 'Manage your assigned rescue missions and availability.'} 
        action={
          <div className="actions">
            <Button 
              className={isAvailable ? 'btn-secondary' : 'btn'} 
              onClick={toggleAvailability}
            >
              <span className={`dot-indicator ${isAvailable ? 'donor' : 'volunteer'}`} style={{ display: 'inline-block' }} />
              {isAvailable ? 'Online & Accepting Tasks' : 'Status: Offline'}
            </Button>
            <Button primary onClick={() => {
              if (!activeTasks[0]) {
                notify('No active missions are assigned to this account.');
                return;
              }
              setTaskId(activeTasks[0].id);
              setScreen('task');
            }}>
              <Navigation size={16} /> Open Active Mission Route
            </Button>
          </div>
        }
      />

      <div className="stats-grid">
        <Stat 
          label="Missions Completed" 
          value={stats?.tasks_completed ?? '—'} 
          note="Completed missions" 
          icon={<CheckCircle2 size={18} />} 
        />
        <Stat 
          label="Meals Transported" 
          value={stats?.meals_delivered ?? '—'} 
          note="Meals delivered" 
          icon={<Package size={18} />} 
        />
        <Stat 
          label="Active Assigned Tasks" 
          value={stats?.upcoming_tasks ?? '—'} 
          note="Assigned missions" 
          icon={<Clock3 size={18} />} 
        />
        <Stat 
          label="Courier Rating" 
          value={stats?.rating ? `${stats.rating} ★` : '—'} 
          note="Volunteer rating" 
          icon={<ShieldCheck size={18} />} 
        />
      </div>

      <div className="split">
        <Card>
          <SectionTitle 
            title="Current Assigned Rescue Tasks" 
            action={<Badge tone="green">{activeTasks.length} active</Badge>}
          />

          {activeTasks.map((task) => <div className="task-card" key={task.id}>
            <div className="between">
              <Badge tone={task.status === 'IN_TRANSIT' ? 'amber' : 'blue'}>{task.status.replaceAll('_', ' ')}</Badge>
              <b style={{ color: '#1b6348' }}>Deadline: {task.deadline || '—'}</b>
            </div>
            <h3>{task.title}</h3>
            <p>{task.food_summary} · {task.stops}</p>
            <div className="metric-row">
              <b>VOLUME<strong>{task.meals}</strong></b>
              <b>STATUS<strong>{task.status.replaceAll('_', ' ')}</strong></b>
              <b>DEADLINE<strong>{task.deadline || '—'}</strong></b>
            </div>
            <div style={{ marginTop: 14 }}>
              <Button primary onClick={() => { setTaskId(task.id); setScreen('task'); }}>
                Open Mission Manifest & GPS Route <Navigation size={14} />
              </Button>
            </div>
          </div>)}
          {activeTasks.length === 0 && <p>No active missions are currently assigned.</p>}
        </Card>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Courier Availability & Gear" 
              action={
                <Badge tone={isAvailable ? 'green' : 'gray'}>
                  {isAvailable ? 'Ready for Pickup' : 'Paused'}
                </Badge>
              }
            />
            <div className="between">
              <span>Vehicle Type:</span>
              <b>{stats?.vehicle_type || 'Not specified'}</b>
            </div>
            <div className="between">
              <span>Insulated Box Capacity:</span>
              <b>{stats?.max_meal_capacity ? `Up to ${stats.max_meal_capacity} meals / run` : 'Not specified'}</b>
            </div>
            <div className="between">
              <span>Service Radius:</span>
              <b>Profile-based service radius</b>
            </div>
            <div className="between">
              <span>Clean Transport Cert:</span>
              <b>Not available</b>
            </div>
            <Button 
              className="full" 
              style={{ marginTop: 14 }}
              onClick={toggleAvailability}
            >
              Toggle Online / Offline Status
            </Button>
          </Card>

          <Card>
            <SectionTitle title="Mission Requests" />
            <p>New assignments will appear in your active mission list after dispatch.</p>
          </Card>
        </div>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 11: VOLUNTEER TASK DETAILS & ROUTE ----------------
function Task({ 
  notify, 
  setScreen,
  taskId
}: { 
  notify: (msg: string) => void; 
  setScreen?: (s: Screen) => void; 
  taskId: string | null;
}) { 
  const [task, setTask] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [inspections, setInspections] = useState({
    carrier: false,
    qty: false,
    temp: false,
    seal: false
  });
  const [otp, setOtp] = useState('');
  const [verifiedQty, setVerifiedQty] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [tempChecked, setTempChecked] = useState('');
  const [tempAtDrop, setTempAtDrop] = useState('');
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoEvidence, setPhotoEvidence] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    let watchId: number | null = null;
    if (isGpsActive && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy, speed } = position.coords;
          setGpsCoords({ lat: latitude, lng: longitude });
          await volunteerApi.updateLocation({
            latitude,
            longitude,
            accuracy: accuracy || undefined,
            speed: speed || undefined
          });
        },
        (error) => {
          console.warn('Geolocation telemetry watch notice:', error.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    }
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isGpsActive]);

  useEffect(() => {
    const loadTask = async () => {
      let id = taskId;
      if (!id) {
        const active = await volunteerApi.getActiveTasks();
        if (active.error) {
          notify(active.error);
          return;
        }
        id = active.data?.[0]?.id || null;
      }
      if (!id) {
        notify('No active missions are assigned to this account.');
        return;
      }
      const result = await volunteerApi.getTask(id);
      if (result.error || !result.data) {
        notify(result.error || 'Mission details could not be loaded.');
        return;
      }
      setTask(result.data);
      setCurrentStep(result.data.current_step);
    };
    loadTask();
  }, [taskId, notify]);

  const currentStop = task?.stops?.[task?.current_stop_index || 0];

  useEffect(() => {
    if (currentStop) {
      setVerifiedQty(String(parseInt(currentStop.meals, 10) || ''));
      setReceiverName(currentStop.receiver || '');
    }
  }, [currentStop]);

  const nextStep = async () => {
    if (!task || currentStep >= 5) return;
    if (currentStep === 4) {
      const quantity = parseInt(verifiedQty, 10);
      const dropTemperature = Number.parseFloat(tempAtDrop);
      if (!otp.trim() || !Number.isInteger(quantity) || quantity < 1 || !receiverName.trim() || !Number.isFinite(dropTemperature)) {
        notify('Enter the recipient OTP, verified quantity, receiver name, and measured temperature.');
        return;
      }
      const result = await volunteerApi.verifyOtp(task.code, {
        otp_code: otp.trim(),
        verified_qty: quantity,
        temp_at_drop: dropTemperature,
        receiver_name: receiverName.trim()
      });
      if (result.error || !result.data) {
        notify(result.error || 'Handover could not be verified.');
        return;
      }
      const refreshed = await volunteerApi.getTask(task.id);
      if (refreshed.error || !refreshed.data) {
        notify(refreshed.error || 'Handover was recorded, but mission refresh failed.');
        return;
      }
      setTask(refreshed.data);
      setCurrentStep(refreshed.data.current_step);
      setOtp('');
      notify(result.data.message || 'Recipient handover verified.');
      return;
    }
    if (currentStep === 2 && !Object.values(inspections).every(Boolean)) {
      notify('Complete every transport safety inspection before departure.');
      return;
    }
    if (currentStep === 2 && !Number.isFinite(Number.parseFloat(tempChecked))) {
      notify('Record the measured food temperature before departure.');
      return;
    }
    const next = currentStep === 1 ? 2 : currentStep === 2 ? 3 : 4;
    const result = await volunteerApi.updateTaskStep(task.code, next, {
      inspections_passed: Object.values(inspections).every(Boolean),
      temp_checked: currentStep === 2 ? Number.parseFloat(tempChecked) : undefined
    });
    if (result.error || !result.data) {
      notify(result.error || 'Mission step could not be updated.');
      return;
    }
    setCurrentStep(next);
    notify(result.data.message || 'Mission progress updated.');
  };

  const currentAddress = currentStop?.address;
  const mapUrl = task?.origin?.address && currentAddress
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(task.origin.address)}&destination=${encodeURIComponent(currentAddress)}`
    : null;

  return (
    <>
      <PageHead 
        eyebrow={`VOLUNTEER / MY TASKS / ${task?.code || ''}`} 
        title={task ? `Mission Manifest: ${task.code}` : 'Mission Manifest'} 
        subtitle={task ? `Pickup at ${task.origin?.name || 'donor'} · ${task.stops.length} recipient stops` : 'Loading assigned mission…'} 
        onBack={setScreen ? () => setScreen('volunteer-overview') : undefined}
        backLabel="Back to Volunteer Dashboard"
        action={
          <div className="actions">
            <Button primary onClick={nextStep} disabled={!task || currentStep >= 5}>
              {currentStep === 1 ? 'Arrived at Donor Kitchen' : currentStep === 2 ? 'Confirm Food Collection' : currentStep === 3 ? 'Arrived at Recipient' : currentStep === 4 ? 'Verify Handover' : 'Mission Complete'}
            </Button>
          </div>
        }
      />

      <div className="split">
        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Collect & Deliver Surplus Food" 
              action={
                <Badge tone={currentStep === 2 ? 'amber' : currentStep === 3 ? 'blue' : currentStep >= 4 ? 'green' : 'gray'}>
                  {currentStep >= 5 ? 'Mission Complete' : `Step ${currentStep} of 4`}
                </Badge>
              }
            />
            <p>{task?.origin?.name || 'Donor'} · Mission ID: {task?.code || '—'}</p>
            <div className="metric-row">
              <b>TOTAL BATCH<strong>{task?.total_meals ?? '—'} Meals</strong><small>{task?.stops?.length || 0} stops</small></b>
              <b>DEADLINE<strong>{task?.deadline || '—'}</strong></b>
              <b>TRANSPORT<strong>{task?.transport || '—'}</strong><small>{task?.carrier_volume || ''}</small></b>
              <b>STATUS<strong>{task?.status?.replaceAll('_', ' ') || 'Loading'}</strong></b>
            </div>
          </Card>

          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Turn-by-Turn Delivery Route" 
              action={mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer"><Navigation size={14} /> Open GPS Navigation</a> : undefined}
            />
            <div className="route-grid">
              <div>
                <small>ORIGIN (PICKUP)</small>
                <b>{task?.origin?.name || 'Donor'}</b>
                <p>{task?.origin?.address || 'Address unavailable'}<br />{task?.origin?.contact || ''} {task?.origin?.phone || ''}</p>
              </div>
              <div>
                <small>DROP-OFF #{(task?.current_stop_index || 0) + 1}</small>
                <b>{currentStop?.name || 'Recipient'}</b>
                <p>{currentStop?.address || 'Address unavailable'}<br />Receiver: {currentStop?.receiver || 'Not specified'} · {currentStop?.phone || ''}</p>
              </div>
            </div>

            <div className="metric-row">
              {(task?.stops || []).map((stop: any, index: number) => (
                <b key={`${stop.stop_number}-${stop.name}`}>STOP {stop.stop_number}<strong>{stop.meals}</strong><small>{stop.name}{index === task.current_stop_index ? ' · Current' : ''}</small></b>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Pre-Transport Safety & Temperature Check" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={inspections.carrier} 
                  onChange={(e) => setInspections({ ...inspections, carrier: e.target.checked })} 
                />
                <span>Insulated thermal transport container sanitized & pre-cooled</span>
              </label>
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={inspections.qty} 
                  onChange={(e) => setInspections({ ...inspections, qty: e.target.checked })} 
                />
                <span>Quantity verified with donor representative</span>
              </label>
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={inspections.temp} 
                  onChange={(e) => setInspections({ ...inspections, temp: e.target.checked })} 
                />
                <span>Food temperature recorded within safe handling limits</span>
              </label>
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={inspections.seal} 
                  onChange={(e) => setInspections({ ...inspections, seal: e.target.checked })} 
                />
                <span>Tamper seals inspected on each outer crate</span>
              </label>
            </div>
            <Input label="Measured temperature at pickup (°C)" type="number" value={tempChecked} onChange={(e) => setTempChecked(e.target.value)} />
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Mission Action Progression" 
              action={<Badge tone="blue">{currentStep >= 5 ? 'Completed' : `Step ${currentStep} of 4`}</Badge>}
            />
            <Timeline 
              items={[
                { title: 'Mission assigned', time: currentStep > 1 ? 'Completed' : 'Pending', active: currentStep === 1 },
                { title: 'Pickup inspection and collection', time: currentStep > 2 ? 'Completed' : currentStep === 2 ? 'In progress' : 'Pending', active: currentStep === 2 },
                { title: 'Transit to recipient', time: currentStep > 3 ? 'Completed' : currentStep === 3 ? 'In progress' : 'Pending', active: currentStep === 3 },
                { title: `Handover at ${currentStop?.name || 'recipient'}`, time: currentStep === 4 ? 'Awaiting code' : currentStep > 4 ? 'Completed' : 'Pending', active: currentStep === 4 }
              ]}
            />

            {currentStep === 4 && (
              <div style={{ marginTop: 14 }}>
                <Input 
                  label="Enter Recipient OTP Code" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="Code provided by recipient" 
                />
                <Input label="Verified quantity (meals)" type="number" value={verifiedQty} onChange={(e) => setVerifiedQty(e.target.value)} />
                <Input label="Receiver name" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
                <Input label="Measured temperature at handover (°C)" type="number" value={tempAtDrop} onChange={(e) => setTempAtDrop(e.target.value)} />
              </div>
            )}

            <Button primary className="full" style={{ marginTop: 16 }} onClick={nextStep} disabled={!task || currentStep >= 5}>
              {currentStep === 1 ? 'Confirm Arrival at Donor' : currentStep === 2 ? 'Confirm Food Collection & Start Route' : currentStep === 3 ? `Arrived at ${currentStop?.name || 'Recipient'}` : currentStep === 4 ? 'Verify Recipient Handover' : 'Mission Complete'}
            </Button>
          </Card>

          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Courier Live GPS Telemetry" 
              action={
                <Badge tone={isGpsActive ? 'green' : 'gray'}>
                  {isGpsActive ? '🛰️ Live Telemetry Active' : 'Telemetry Standby'}
                </Badge>
              }
            />
            <div className="between">
              <span>Automatic Location Broadcast:</span>
              <Button 
                sm 
                primary={!isGpsActive}
                onClick={() => {
                  const nextState = !isGpsActive;
                  setIsGpsActive(nextState);
                  notify(nextState ? 'GPS telemetry broadcasting enabled' : 'GPS telemetry paused');
                }}
              >
                {isGpsActive ? 'Pause GPS' : '📡 Broadcast GPS'}
              </Button>
            </div>
            {gpsCoords ? (
              <div style={{ marginTop: 10, fontSize: 12, color: '#10b981' }}>
                Active Fix: {gpsCoords.lat.toFixed(5)}° N, {gpsCoords.lng.toFixed(5)}° E
              </div>
            ) : (
              <p style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>Enable broadcast to transmit high-precision live route telemetry to Operations Command Central.</p>
            )}
          </Card>

          <Card style={{ marginBottom: 20 }}>
            <SectionTitle title="Verification & Photo Evidence" />
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>Capture camera inspection or handover verification photo evidence:</p>
            <input 
              type="file" 
              accept="image/*"
              disabled={uploadingPhoto}
              style={{ fontSize: 12, width: '100%', marginBottom: 8 }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingPhoto(true);
                notify('Uploading photo evidence...');
                const res = await uploadsApi.uploadPhoto(file);
                setUploadingPhoto(false);
                if (res.data?.url) {
                  setPhotoEvidence(res.data.url);
                  notify('Photo evidence uploaded and stored.');
                } else {
                  notify(res.error || 'Photo upload failed');
                }
              }}
            />
            {uploadingPhoto && <p style={{ fontSize: 12, color: '#f59e0b' }}>Uploading image...</p>}
            {photoEvidence && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#10b981' }}>
                ✓ Evidence linked: <a href={photoEvidence} target="_blank" rel="noreferrer" style={{ color: '#10b981', textDecoration: 'underline' }}>View Evidence File</a>
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle title="Food Handling Requirements" />
            <div className="between">
              <span>Food Type:</span>
              <b>{task?.title || '—'}</b>
            </div>
            <div className="between">
              <span>Packaging:</span>
              <b>{task?.stops ? `${task.stops.length} recipient stop(s)` : '—'}</b>
            </div>
            <div className="between">
              <span>Storage at pickup:</span>
              <b>{task?.origin?.address || '—'}</b>
            </div>
            <div className="between">
              <span>Allergen Notice:</span>
              <b>{currentStop?.address || '—'}</b>
            </div>
          </Card>
        </div>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 12: OPERATIONS CONSOLE (NETWORK & DISPATCH) ----------------
function OpsOverview({ 
  setScreen, 
  notify,
  setMissionId
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
  setMissionId: (id: string) => void;
}) { 
  const [stats, setStats] = useState<any>(null);
  const [missionsList, setMissionsList] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);

  useEffect(() => {
    opsApi.getNetworkStats().then(res => {
      if (res.data) setStats(res.data);
      else if (res.error) notify(res.error);
    });
    opsApi.getMissions().then(res => {
      if (res.data) setMissionsList(res.data);
      else if (res.error) notify(res.error);
    });
    const loadTelemetry = () => {
      opsApi.getTelemetryNodes().then(res => {
        if (res.data) setTelemetry(res.data);
        else if (res.error) notify(res.error);
      });
    };
    loadTelemetry();
    const telemetryTimer = window.setInterval(loadTelemetry, 15000);
    opsApi.getExceptions().then(res => {
      if (res.data) setExceptions(res.data);
      else if (res.error) notify(res.error);
    });
    return () => window.clearInterval(telemetryTimer);
  }, [notify]);

  return (
    <>
      <PageHead 
        eyebrow="OPERATIONS COMMAND / NETWORK CONSOLE" 
        title="Live Rescue Operations Command" 
        subtitle="Real-time telematics, AI recipient allocation engine and active courier telemetry across Chennai North." 
        action={
          <div className="actions">
            <Button onClick={() => notify('Automated dispatch optimization refreshed.')}>
              <RefreshCw size={14} /> Recalculate Routes
            </Button>
            <Button primary onClick={() => setScreen('missions')}>
              Open Mission Control Queue
            </Button>
          </div>
        }
      />

      <div className="stats-grid">
        <Stat 
          label="Active Rescue Missions" 
          value={stats ? `${stats.active_missions}` : "—"} 
          note={`${stats?.open_exceptions ?? 0} open exceptions`} 
          icon={<Truck size={18} />} 
        />
        <Stat 
          label="Surplus Awaiting Pickup" 
          value={stats ? `${stats.meals_awaiting_pickup}` : "—"} 
          note="Meals awaiting pickup" 
          icon={<Package size={18} />} 
        />
        <Stat 
          label="Active Fleet Couriers" 
          value={stats ? `${stats.active_fleet_couriers}` : "—"} 
          note="Available fleet couriers" 
          icon={<Navigation size={18} />} 
        />
        <Stat 
          label="Delivered Today" 
          value={stats ? `${stats.completed_today}` : "—"} 
          note={stats?.on_time_freshness_rate ? `${stats.on_time_freshness_rate} on-time freshness` : "Completed today"} 
          icon={<CheckCircle2 size={18} />} 
        />
      </div>

      <div className="split">
        <Card>
          <SectionTitle 
            title="Live Rescue Mission Dispatch Queue" 
            subtitle="Autonomous matching & courier routing pipeline" 
            action={
              <Button sm onClick={() => setScreen('missions')}>
                Open Full Control Queue <ArrowRight size={14} />
              </Button>
            }
          />
          <Table 
            headers={['MISSION & DONOR', 'STATUS', 'RECIPIENTS', 'COURIER', 'DEADLINE', 'ACTION']} 
            rows={missionsList.slice(0, 8).map((item) => [
              <div key={item.id}>
                <b>{item.id}</b>
                <small>{item.donor}</small>
              </div>,
              <Badge tone={item.tone}>{item.status}</Badge>,
              item.stops,
              item.courier,
              item.deadline || '—',
              <Button sm primary onClick={() => { setMissionId(item.uuid || item.id); setScreen('mission-detail'); }}>
                Inspect
              </Button>
            ])}
          />
        </Card>

        <Card>
          <SectionTitle 
            title="Live Geographic Telemetry Map" 
            action={<Badge tone="green">Chennai North Sector</Badge>}
          />
          
          <div className="map-widget">
            <LiveOpsMap nodes={telemetry as MapNode[]} />

            <div className="map-legend">
              <span><span className="dot-indicator donor" /> Donor Kitchen</span>
              <span><span className="dot-indicator volunteer" /> Volunteer Courier</span>
              <span><span className="dot-indicator ngo" /> Shelter Receiver</span>
            </div>
          </div>

          <div className="between" style={{ marginTop: 10 }}>
            <span>Sector Status:</span>
            <b>Zero road blockages · Clear transit corridors</b>
          </div>
        </Card>
      </div>

      <div className="split lower">
        <Card>
          <SectionTitle 
            title="Operational Exceptions & Dispatch Alerts" 
            action={<Badge tone={exceptions.filter(e => e.status === 'OPEN').length ? 'amber' : 'green'}>{exceptions.filter(e => e.status === 'OPEN').length} require attention</Badge>}
          />
          {exceptions.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>No active dispatch exceptions. Operations running nominally.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {exceptions.slice(0, 6).map((item) => (
                <div 
                  key={item.id} 
                  style={{ 
                    padding: 10, 
                    background: item.status === 'OPEN' ? '#261b17' : '#111f17', 
                    borderRadius: 6, 
                    borderLeft: item.status === 'OPEN' ? '4px solid #ef4444' : '4px solid #10b981',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f9fafb' }}>
                      {item.type}: {item.description}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      Severity: <b style={{ color: item.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b' }}>{item.severity}</b> · Status: {item.status}
                    </div>
                  </div>
                  {item.status === 'OPEN' && (
                    <Button 
                      sm 
                      onClick={async () => {
                        notify('Resolving operational exception...');
                        const res = await opsApi.resolveException(item.id, 'RESOLVED', 'Dispatcher verified and resolved operational condition.');
                        if (res.data) {
                          notify('Exception resolved successfully.');
                          opsApi.getExceptions().then(r => r.data && setExceptions(r.data));
                        } else {
                          notify(res.error || 'Failed to resolve exception');
                        }
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle title="Autonomous Dispatch Metrics" />
          <div className="metric-row" style={{ borderTop: 'none', paddingTop: 0 }}>
            <b>AUTO-MATCH RATE<strong>{stats?.auto_match_rate || '—'}</strong></b>
            <b>OPEN EXCEPTIONS<strong>{stats?.open_exceptions ?? '—'}</strong></b>
            <b>TEMP COMPLIANCE<strong>{stats?.on_time_freshness_rate || '—'}</strong></b>
            <b>COMPLETED TODAY<strong>{stats?.completed_today ?? '—'}</strong></b>
          </div>
          <Button primary className="full" style={{ marginTop: 16 }} onClick={() => setScreen('missions')}>
            Open Central Dispatch Pipeline
          </Button>
        </Card>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 13: OPERATIONS MISSIONS QUEUE ----------------
function Missions({ 
  setScreen, 
  notify,
  setMissionId
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
  setMissionId: (id: string) => void;
}) { 
  const [activeTab, setActiveTab] = useState<'all' | 'transit' | 'unassigned' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [missionsList, setMissionsList] = useState<any[]>([]);

  useEffect(() => {
    opsApi.getMissions(activeTab, search).then(res => {
      if (res.data) setMissionsList(res.data);
      else if (res.error) notify(res.error);
    });
  }, [activeTab, search, notify]);

  const filtered = missionsList.filter((m) => {
    const match = String(m.id || '').toLowerCase().includes(search.toLowerCase()) || String(m.donor || '').toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'transit') return match && m.status.includes('transit');
    if (activeTab === 'unassigned') return match && (m.status.includes('Needs') || m.status.includes('Unassigned'));
    if (activeTab === 'completed') return match && m.status.includes('Delivered');
    return match;
  });

  return (
    <>
      <PageHead 
        eyebrow="OPERATIONS / MISSIONS QUEUE" 
        title="Mission Control Central" 
        subtitle="Full operational dispatch ledger. Monitor live courier trajectories and intervene for unassigned surplus." 
        action={
          <div className="actions">
            <Button onClick={() => notify('Mission queue exported.')}>
              <Download size={14} /> Export Queue
            </Button>
            <Button primary onClick={() => setScreen('create-donation')}>
              + Manual Mission Creation
            </Button>
          </div>
        }
      />

      <Card>
        <div className="toolbar">
          <div className="tabs">
            <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
              All Missions ({missionsList.length})
            </button>
            <button className={activeTab === 'transit' ? 'active' : ''} onClick={() => setActiveTab('transit')}>
              In Transit ({missionsList.filter(m => m.status.includes('Transit')).length})
            </button>
            <button className={activeTab === 'unassigned' ? 'active' : ''} onClick={() => setActiveTab('unassigned')}>
              Unassigned / Review ({missionsList.filter(m => m.status.includes('Unassigned') || m.status.includes('Dispatch')).length})
            </button>
            <button className={activeTab === 'completed' ? 'active' : ''} onClick={() => setActiveTab('completed')}>
              Completed ({missionsList.filter(m => m.status.includes('Completed')).length})
            </button>
          </div>
          <div className="actions">
            <div className="search">
              <Search size={14} />
              <input 
                placeholder="Search ID, kitchen, courier..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button sm onClick={() => setSearch('')}><Filter size={13} /> Clear Search</Button>
          </div>
        </div>

        <Table 
          headers={['MISSION ID / DONOR', 'VOLUME', 'ROUTE STOPS', 'STATUS', 'COURIER', 'DEADLINE', 'ACTION']} 
          rows={filtered.map((item) => [
            <div key={item.id}>
              <b>{item.id}</b>
              <small>{item.donor}</small>
            </div>,
            item.quantity,
            item.stops,
            <Badge key={`b-${item.id}`} tone={item.tone}>{item.status}</Badge>,
            item.courier,
            item.deadline,
            <Button key={`btn-${item.id}`} sm primary onClick={() => { setMissionId(item.uuid || item.id); setScreen('mission-detail'); }}>
              Inspect Mission
            </Button>
          ])}
        />
      </Card>
    </>
  ); 
}

// ---------------- SCREEN 14: OPERATIONS MISSION DETAIL ----------------
function MissionDetail({ 
  setScreen, 
  notify,
  missionId
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
  missionId: string | null;
}) { 
  const [missionData, setMissionData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      let id = missionId;
      if (!id) {
        const missions = await opsApi.getMissions();
        if (missions.error) {
          notify(missions.error);
          return;
        }
        id = missions.data?.[0]?.uuid || missions.data?.[0]?.id || null;
      }
      if (!id) {
        notify('No mission records are available.');
        return;
      }
      const result = await opsApi.getMissionDetail(id);
      if (result.error || !result.data) {
        notify(result.error || 'Mission details could not be loaded.');
        return;
      }
      setMissionData(result.data);
    };
    load();
  }, [missionId, notify]);

  const reassign = async () => {
    if (!missionData) return;
    const result = await opsApi.reassignMission(missionData.code);
    if (result.error) notify(result.error);
    else notify(result.data?.message || 'Mission reassignment completed.');
  };

  const abortMission = async () => {
    if (!missionData) return;
    if (!confirm('Are you sure you want to abort this rescue mission?')) return;
    const result = await opsApi.abortMission(missionData.code);
    if (result.error) notify(result.error);
    else {
      notify('Mission cancelled.');
      setScreen('missions');
    }
  };
  return (
    <>
      <PageHead 
        eyebrow={`OPERATIONS / MISSIONS / ${missionData?.code || ''}`} 
        title={`Mission Inspection: ${missionData?.code || '—'}`} 
        subtitle={missionData ? `${missionData.total_meals} meals · ${missionData.total_stops} recipient stops · ${missionData.courier?.name || 'Courier unassigned'}` : 'Loading mission record…'} 
        onBack={() => setScreen('missions')}
        backLabel="Back to Missions Queue"
        action={
          <div className="actions">
            <Button onClick={() => notify('Emergency notification sent to all participants.')}>
              Broadcast Alert
            </Button>
            <Button primary onClick={() => setScreen('missions')}>Back to Mission Queue</Button>
          </div>
        }
      />

      <div className="split">
        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title={missionData?.title || 'Surplus Donation'} 
              action={<Badge tone={missionData?.status === 'COMPLETED' ? 'green' : 'amber'}>{missionData?.status?.replaceAll('_', ' ') || 'Loading'}</Badge>}
            />
            <p>Created at {missionData?.created_at || '—'}</p>
            <div className="metric-row">
              <b>TOTAL OFFERED<strong>{missionData?.total_meals ?? '—'}</strong><small>Meals</small></b>
              <b>RECIPIENTS<strong>{missionData?.total_stops ?? '—'}</strong><small>Shelter stops</small></b>
              <b>COURIER FLEET<strong>{missionData?.courier?.name ? '1 Unit' : 'Unassigned'}</strong><small>{missionData?.courier?.vehicle || '—'}</small></b>
              <b>STATUS<strong>{missionData?.status?.replaceAll('_', ' ') || '—'}</strong></b>
            </div>
          </Card>

          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Recipient Split Multi-Drop Ledger" 
              subtitle="Optimized sequentially for shortest path & hot meal preservation"
              action={<Badge tone="green">Capacity Confirmed</Badge>}
            />
            <Table 
              headers={['RECIPIENT SHELTER', 'REQUESTED', 'ALLOCATED', 'STATUS', 'ARRIVAL']} 
              rows={(missionData?.allocations || []).map((allocation: any) => [
                <div>
                  <b>{allocation.recipient || 'Recipient'}</b>
                  <small>{allocation.address || 'Address unavailable'}</small>
                </div>,
                `${allocation.requested || '—'} meals`,
                allocation.allocated || '—',
                <Badge tone={allocation.status === 'DELIVERED' ? 'green' : allocation.status === 'DECLINED' ? 'gray' : 'amber'}>{allocation.status}</Badge>,
                allocation.arrival || '—'
              ])}
            />
          </Card>

          <Card>
            <SectionTitle 
              title="Autonomous Dispatch Decision Audit Trail" 
              action={<Badge tone="purple"><Sparkles size={12} /> AI Trace Log</Badge>}
            />
            <Timeline 
              items={(missionData?.agent_runs || []).map((run: any) => ({
                title: run.title,
                time: run.time,
                active: run.agent === 'dispatch'
              }))}
            />
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Assigned Courier Telematics" 
              action={<Badge tone="blue">{missionData?.status?.replaceAll('_', ' ') || 'Not assigned'}</Badge>}
            />
            <div className="person-row">
              <span className="avatar">{missionData?.courier?.name ? missionData.courier.name.split(' ').map((part: string) => part[0]).join('').slice(0, 2) : '—'}</span>
              <div>
                <b>{missionData?.courier?.name || 'Unassigned'}</b>
                <small>{missionData?.courier?.vehicle || 'No volunteer assigned'}</small>
              </div>
            </div>
            <div className="between" style={{ marginTop: 14 }}>
              <span>Task Accepted:</span>
              <b>2:23 PM</b>
            </div>
            <div className="between">
              <span>Pickup ETA:</span>
              <b>3:30 PM (in 12 mins)</b>
            </div>
            <div className="between">
              <span>Vehicle Battery:</span>
              <b>{missionData?.courier?.phone || 'Not available'}</b>
            </div>
          </Card>

          <Card>
            <SectionTitle title="Operational Interventions" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button className="full" onClick={reassign}>
                Reassign Volunteer Courier
              </Button>
              <Button danger className="full" onClick={abortMission}>
                Cancel Mission (Emergency Abort)
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 17: NETWORK MANAGEMENT ----------------
function NetworkManagement({
  setScreen,
  notify
}: {
  setScreen: (s: Screen) => void;
  notify: (msg: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'ngos' | 'volunteers' | 'donors'>('ngos');
  const [networkData, setNetworkData] = useState<{ ngos: any[]; volunteers: any[]; donors: any[] }>({
    ngos: [],
    volunteers: [],
    donors: []
  });
  const [search, setSearch] = useState('');

  const loadNetwork = React.useCallback(async () => {
    const res = await opsApi.getNetwork();
    if (res.data) {
      setNetworkData(res.data);
    } else if (res.error) {
      notify(res.error);
    }
  }, [notify]);

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  return (
    <>
      <PageHead 
        eyebrow="OPERATIONS / NETWORK DIRECTORY" 
        title="Rescue Logistics & Partner Network" 
        subtitle="Live registry of partner donor facilities, shelter distribution capacities, and verified volunteer couriers."
        action={
          <div className="actions">
            <Button onClick={loadNetwork}>
              <RefreshCw size={14} /> Refresh Network
            </Button>
            <Button primary onClick={() => setScreen('ops-overview')}>
              Back to Operations Console
            </Button>
          </div>
        }
      />

      <div className="stats-grid">
        <Stat 
          label="Registered Recipient NGOs" 
          value={`${networkData.ngos.length}`} 
          note={`${networkData.ngos.filter(n => n.is_verified).length} verified organizations`} 
          icon={<Heart size={18} />} 
        />
        <Stat 
          label="Active Volunteer Couriers" 
          value={`${networkData.volunteers.length}`} 
          note={`${networkData.volunteers.filter(v => v.is_available).length} currently on route/available`} 
          icon={<Users size={18} />} 
        />
        <Stat 
          label="Partner Food Donors" 
          value={`${networkData.donors.length}`} 
          note="Commercial food kitchens" 
          icon={<Package size={18} />} 
        />
        <Stat 
          label="Network Daily Meal Capacity" 
          value={`${networkData.ngos.reduce((acc, curr) => acc + (curr.capacity_meals || 0), 0)}`} 
          note="Combined shelter storage" 
          icon={<CheckCircle2 size={18} />} 
        />
      </div>

      <Card>
        <div className="toolbar">
          <div className="tabs">
            <button className={activeTab === 'ngos' ? 'active' : ''} onClick={() => setActiveTab('ngos')}>
              Recipient NGOs ({networkData.ngos.length})
            </button>
            <button className={activeTab === 'volunteers' ? 'active' : ''} onClick={() => setActiveTab('volunteers')}>
              Volunteer Couriers ({networkData.volunteers.length})
            </button>
            <button className={activeTab === 'donors' ? 'active' : ''} onClick={() => setActiveTab('donors')}>
              Donor Kitchens ({networkData.donors.length})
            </button>
          </div>
          <div className="actions">
            <div className="search">
              <Search size={14} />
              <input 
                placeholder="Search organization, courier, phone..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {activeTab === 'ngos' && (
          <Table 
            headers={['ORGANIZATION & CONTACT', 'MEAL CAPACITY', 'STATUS', 'VERIFICATION', 'ACTIVE OFFERS', 'ACTIONS']}
            rows={networkData.ngos
              .filter(n => (n.name || '').toLowerCase().includes(search.toLowerCase()) || (n.address || '').toLowerCase().includes(search.toLowerCase()))
              .map((ngo) => [
                <div key={ngo.id}>
                  <b>{ngo.name}</b>
                  <small>{ngo.contact_name || 'Contact'} · {ngo.phone || ngo.email}</small>
                </div>,
                `${ngo.capacity_meals || 0} meals / day`,
                <Badge key={`status-${ngo.id}`} tone={ngo.is_active ? 'green' : 'gray'}>{ngo.is_active ? 'Active' : 'Inactive'}</Badge>,
                <Badge key={`verif-${ngo.id}`} tone={ngo.is_verified ? 'blue' : 'amber'}>{ngo.is_verified ? 'Verified Partner' : 'Pending Verification'}</Badge>,
                `${ngo.active_offers_count || 0} active`,
                <Button 
                  key={`btn-${ngo.id}`}
                  sm 
                  onClick={async () => {
                    const res = await opsApi.updateNgoNetwork(ngo.id, { is_verified: !ngo.is_verified });
                    if (res.data) {
                      notify(`Updated ${ngo.name} verification status.`);
                      loadNetwork();
                    } else {
                      notify(res.error || 'Update failed');
                    }
                  }}
                >
                  {ngo.is_verified ? 'Unverify' : 'Verify'}
                </Button>
              ])
            }
          />
        )}

        {activeTab === 'volunteers' && (
          <Table 
            headers={['COURIER & VEHICLE', 'AVAILABILITY', 'RATING', 'COMPLETED RESCUES', 'TELEMETRY STATUS', 'ACTIONS']}
            rows={networkData.volunteers
              .filter(v => (v.name || '').toLowerCase().includes(search.toLowerCase()) || (v.vehicle_type || '').toLowerCase().includes(search.toLowerCase()))
              .map((vol) => [
                <div key={vol.id}>
                  <b>{vol.name}</b>
                  <small>{vol.vehicle_type || 'Bicycle / Foot'} · {vol.phone}</small>
                </div>,
                <Badge key={`status-${vol.id}`} tone={vol.is_available ? 'green' : 'gray'}>{vol.is_available ? 'Available' : 'Offline'}</Badge>,
                `★ ${vol.rating || 5.0}`,
                `${vol.total_rescues || 0} missions`,
                vol.current_lat && vol.current_lon ? (
                  <span key={`fix-${vol.id}`} style={{ fontSize: 11, color: '#10b981' }}>Fix: {Number(vol.current_lat).toFixed(4)}°, {Number(vol.current_lon).toFixed(4)}°</span>
                ) : (
                  <span key={`nofix-${vol.id}`} style={{ fontSize: 11, color: '#9ca3af' }}>No live GPS signal</span>
                ),
                <Button 
                  key={`btn-${vol.id}`}
                  sm 
                  onClick={async () => {
                    const res = await opsApi.updateVolunteerNetwork(vol.id, { is_verified: !vol.is_verified });
                    if (res.data) {
                      notify(`Updated courier ${vol.name} verification.`);
                      loadNetwork();
                    } else {
                      notify(res.error || 'Update failed');
                    }
                  }}
                >
                  {vol.is_verified ? 'Revoke Badge' : 'Verify Courier'}
                </Button>
              ])
            }
          />
        )}

        {activeTab === 'donors' && (
          <Table 
            headers={['DONOR ESTABLISHMENT', 'TYPE', 'CONTACT', 'ADDRESS', 'ACTIVE DONATIONS']}
            rows={networkData.donors
              .filter(d => (d.name || '').toLowerCase().includes(search.toLowerCase()) || (d.address || '').toLowerCase().includes(search.toLowerCase()))
              .map((d) => [
                <div key={d.id}>
                  <b>{d.name}</b>
                </div>,
                <Badge key={`badge-${d.id}`} tone="blue">{d.type || 'Restaurant'}</Badge>,
                `${d.contact_name || 'Kitchen Staff'} (${d.phone || '—'})`,
                d.address || '—',
                `${d.active_donations_count || 0} batches active`
              ])
            }
          />
        )}
      </Card>
    </>
  );
}

// ---------------- MASTER APPLICATION COMPONENT ----------------
export default function RescueLoopApp() {
  const [screen, setScreen] = useState<Screen>('login');
  const [role, setRole] = useState<Role>('donor');
  const [donationId, setDonationId] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const notify = React.useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const setRoleAndHome = async (r: Role, skipDemo?: boolean) => {
    if (!skipDemo) {
      const result = await authApi.demoLogin(r);
      if (result.error) {
        notify(result.error);
        return;
      }
    }
    setRole(r);
    setScreen(`${r}-overview`);
    notify(`Switched to ${roleMeta[r]?.label || r}`);
  };

  // Content switcher
  const content = useMemo(() => {
    switch (screen) {
      case 'donor-overview':
        return <DonorOverview setScreen={setScreen} notify={notify} setDonationId={setDonationId} />;
      case 'create-donation':
        return <DonationForm setScreen={setScreen} notify={notify} setDonationId={setDonationId} />;
      case 'donation-details':
        return <DonationDetails setScreen={setScreen} notify={notify} donationId={donationId} setTaskId={setTaskId} />;
      case 'history':
        return <History role={role} setScreen={setScreen} notify={notify} setDonationId={setDonationId} setOfferId={setOfferId} setTaskId={setTaskId} setMissionId={setMissionId} />;
      case 'ngo-overview':
        return <NgoOverview setScreen={setScreen} notify={notify} />;
      case 'offers':
        return <Offers setScreen={setScreen} notify={notify} setOfferId={setOfferId} />;
      case 'offer-detail':
        return <OfferDetail setScreen={setScreen} notify={notify} offerId={offerId} />;
      case 'requirements':
        return <Requirements setScreen={setScreen} notify={notify} />;
      case 'volunteer-overview':
        return <VolunteerOverview setScreen={setScreen} notify={notify} setTaskId={setTaskId} />;
      case 'task':
        return <Task setScreen={setScreen} notify={notify} taskId={taskId} />;
      case 'ops-overview':
        return <OpsOverview setScreen={setScreen} notify={notify} setMissionId={setMissionId} />;
      case 'missions':
        return <Missions setScreen={setScreen} notify={notify} setMissionId={setMissionId} />;
      case 'mission-detail':
        return <MissionDetail setScreen={setScreen} notify={notify} missionId={missionId} />;
      case 'network':
        return <NetworkManagement setScreen={setScreen} notify={notify} />;
      default:
        return <DonorOverview setScreen={setScreen} notify={notify} setDonationId={setDonationId} />;
    }
  }, [screen, role, donationId, offerId, taskId, missionId]);

  return (
    <>
      {toastMessage && (
        <div className="toast-notice">
          <Info size={16} color="#10b981" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            style={{ background: 'transparent', color: '#889e92', padding: 0, marginLeft: 8 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {screen === 'login' ? (
        <Login onLogin={() => setScreen('donor-overview')} setRoleAndHome={setRoleAndHome} />
      ) : (
        <>
          <Header 
            role={role} 
            screen={screen} 
            setScreen={setScreen} 
            setRole={setRoleAndHome} 
          />
          <main className="app-main">{content}</main>
        </>
      )}

      {/* Floating Demo Role Switcher Dock */}
      <div className="role-switcher-dock">
        <span className="dock-label">Workspace:</span>
        {(['donor', 'ngo', 'volunteer', 'ops'] as Role[]).map((r) => (
          <button 
            key={r} 
            className={r === role && screen !== 'login' ? 'selected' : ''} 
            onClick={() => setRoleAndHome(r)}
          >
            {r === 'donor' && <Package size={14} />}
            {r === 'ngo' && <Heart size={14} />}
            {r === 'volunteer' && <Truck size={14} />}
            {r === 'ops' && <ShieldCheck size={14} />}
            <span>{r === 'donor' ? 'Donor' : r === 'ngo' ? 'NGO' : r === 'volunteer' ? 'Volunteer' : 'Operations'}</span>
          </button>
        ))}

        <div className="dock-screen-select">
          <select 
            value={screen} 
            aria-label="Jump to screen"
            onChange={async (e) => {
              const target = e.target.value;
              let targetRole: Role | null = null;
              if (target.startsWith('donor') || target === 'create-donation' || target === 'donation-details') {
                targetRole = 'donor';
              } else if (target.startsWith('ngo') || target === 'offers' || target === 'offer-detail' || target === 'requirements') {
                targetRole = 'ngo';
              } else if (target.startsWith('volunteer') || target === 'task') {
                targetRole = 'volunteer';
              } else if (target.startsWith('ops') || target === 'missions' || target === 'mission-detail') {
                targetRole = 'ops';
              }

              if (targetRole && targetRole !== role) {
                await authApi.demoLogin(targetRole).catch(() => {});
                setRole(targetRole);
              }
              setScreen(target);
              notify(`Navigated to: ${target}`);
            }}
          >
            <option value="login">🔐 Portal Landing / Login</option>
            <optgroup label="🏢 Donor Screens">
              <option value="donor-overview">Donor Overview</option>
              <option value="create-donation">➕ Create Donation Form</option>
              <option value="donation-details">📋 Donation Details</option>
              <option value="history">📑 Donation History & Tax Receipts</option>
            </optgroup>
            <optgroup label="🤝 NGO Screens">
              <option value="ngo-overview">NGO Overview</option>
              <option value="offers">📦 Incoming Offers</option>
              <option value="offer-detail">🔍 Review & Accept Offer</option>
              <option value="requirements">⚙️ Intake Capacity & Preferences</option>
            </optgroup>
            <optgroup label="🛵 Volunteer Screens">
              <option value="volunteer-overview">Volunteer Dashboard</option>
              <option value="task">🗺️ Active Mission & Route</option>
            </optgroup>
            <optgroup label="🛰️ Operations Screens">
              <option value="ops-overview">Operations Network Telemetry</option>
              <option value="missions">📊 Central Mission Control Queue</option>
              <option value="mission-detail">🔬 Mission Details & Audit</option>
            </optgroup>
          </select>
        </div>
      </div>
    </>
  );
}
