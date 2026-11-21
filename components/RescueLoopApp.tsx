'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, 
  ChevronRight, ClipboardCheck, ClipboardList, Clock, Clock3, Download, 
  ExternalLink, Filter, Heart, Info, Key, Layers, Leaf, MapPin, 
  Navigation, Package, Phone, Plus, RefreshCw, Search, ShieldCheck, 
  Sparkles, Truck, Users, Volume2, X 
} from 'lucide-react';
import { authApi, donorApi, ngoApi, volunteerApi, opsApi, aiApi } from '../lib/api';

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
    { label: 'Batch RL-00124', screen: 'donation-details' },
    { label: 'All Donations', screen: 'history' }
  ],
  ngo: [
    { label: 'Overview', screen: 'ngo-overview' },
    { label: 'Incoming Offers', screen: 'offers' },
    { label: 'Review RL-00128', screen: 'offer-detail' },
    { label: 'Capacity & Intake', screen: 'requirements' },
    { label: 'History', screen: 'history' }
  ],
  volunteer: [
    { label: 'Overview', screen: 'volunteer-overview' },
    { label: 'Active Route RL-00124', screen: 'task' },
    { label: 'Delivery History', screen: 'history' }
  ],
  ops: [
    { label: 'Network Console', screen: 'ops-overview' },
    { label: 'Mission Queue', screen: 'missions' },
    { label: 'Inspect RL-00124', screen: 'mission-detail' },
    { label: 'Ledger & Audit', screen: 'history' }
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
        <button 
          type="button"
          className="icon-btn" 
          title="Live alerts" 
          onClick={() => alert('No critical dispatch bottlenecks currently.')}
        >
          <Bell size={18} />
          <span className="badge-dot" />
        </button>
        <button 
          type="button"
          className="btn btn-sm" 
          onClick={() => setScreen('login')}
          style={{ fontSize: 12, padding: '5px 10px' }}
          title="Return to Portal Login / Splash"
        >
          Portal Landing
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
          <span>
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
  setRoleAndHome: (r: Role) => void;
}) {
  const [email, setEmail] = useState('alex@abcrestaurant.com');
  const [password, setPassword] = useState('••••••••••••');
  const [remember, setRemember] = useState(true);

  const handleCustomLogin = async () => {
    const fd = new FormData();
    fd.append('username', email);
    fd.append('password', password === '••••••••••••' ? 'password123' : password);
    const res = await authApi.login(fd);
    if (res.data?.user?.role) {
      setRoleAndHome(res.data.user.role as Role);
    } else {
      onLogin();
    }
  };

  const handleDemoLogin = async (r: Role) => {
    await authApi.demoLogin(r);
    setRoleAndHome(r);
  };

  return (
    <div className="login-page">
      <div className="login-nav">
        <div className="brand">
          <span className="brand-mark"><Leaf size={18} /></span>
          <b>Rescue<span>Loop</span></b>
        </div>
        <div className="login-links">
          <a onClick={() => handleDemoLogin('donor')}>Donor Portal</a>
          <a onClick={() => handleDemoLogin('ngo')}>NGO Receiver</a>
          <a onClick={() => handleDemoLogin('volunteer')}>Volunteer App</a>
          <a onClick={() => handleDemoLogin('ops')}>Operations Console</a>
          <Button primary sm onClick={handleCustomLogin}>Sign in</Button>
        </div>
      </div>
      <div className="login-main">
        <div className="login-copy">
          <Badge tone="green">Verified Food Rescue Ecosystem</Badge>
          <h1>Zero Surplus Wasted.<br /><em>Deliver Safe, Dignified Food.</em></h1>
          <p>
            RescueLoop connects commercial food kitchens, food banks, community shelters, and trained logistics volunteers in real-time. Automated route optimization and cold-chain compliance ensure safety from pickup to handover.
          </p>
          <div className="login-stats">
            <span><b>4</b> Interconnected Roles</span>
            <span><b>1,200+</b> Meals Rescued Daily</span>
            <span><b>28 mins</b> Avg. Dispatch Time</span>
          </div>
        </div>

        <div className="login-card-container">
          <Card className="login-card">
            <small className="eyebrow">PORTAL AUTHENTICATION</small>
            <h2>Sign in to RescueLoop</h2>
            <p>Access your organization workspace to post surplus, coordinate receivers, or dispatch rescue missions.</p>

            <Input 
              label="Work Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. director@kitchen.org"
            />
            <label className="field" style={{ marginTop: 12 }}>
              <span>Security Password</span>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <div className="between" style={{ marginTop: 14, marginBottom: 18 }}>
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={remember} 
                  onChange={(e) => setRemember(e.target.checked)} 
                />
                <span>Remember this terminal</span>
              </label>
              <a onClick={() => alert('Password reset link sent to demo registered email.')}>Forgot password?</a>
            </div>

            <Button primary onClick={handleCustomLogin} className="full">
              Enter Workspace <ArrowRight size={16} />
            </Button>

            <div className="demo-account-pills">
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
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------- SCREEN 2: DONOR OVERVIEW ----------------
function DonorOverview({ 
  setScreen, 
  notify 
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  const [stats, setStats] = useState<any>(null);
  const [activeDonations, setActiveDonations] = useState<any[]>([]);

  useEffect(() => {
    donorApi.getDashboardStats().then(res => {
      if (res.data) setStats(res.data);
    });
    donorApi.getActiveDonations().then(res => {
      if (res.data && res.data.length > 0) setActiveDonations(res.data);
    });
  }, []);

  return (
    <>
      <PageHead 
        eyebrow="FOOD DONOR / CENTRAL DASHBOARD" 
        title="Good afternoon, Alex" 
        subtitle="ABC Restaurant Group · Anna Nagar Central Kitchen. All health & temperature logs are current." 
        action={
          <Button primary onClick={() => setScreen('create-donation')}>
            <Plus size={16} /> Create New Surplus Donation
          </Button>
        }
      />

      <div className="stats-grid">
        <Stat 
          label="Total Donations Rescued" 
          value={stats ? `${stats.total_donations}` : "48"} 
          note="+6 this month (100% verified)" 
          icon={<Package size={18} />} 
        />
        <Stat 
          label="Meals Redistribution" 
          value={stats ? `${stats.total_meals_rescued?.toLocaleString()}` : "2,840"} 
          note="Fed 14 local community shelters" 
          icon={<CheckCircle2 size={18} />} 
        />
        <Stat 
          label="Active Missions Today" 
          value={stats ? `${stats.active_missions}` : "3"} 
          note="2 awaiting pickup, 1 in transit" 
          icon={<Clock3 size={18} />} 
        />
        <Stat 
          label="Pending Logistics Action" 
          value={stats ? `${stats.pending_actions}` : "1"} 
          note="Review courier arrival time" 
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
            headers={['DONATION BATCH', 'QUANTITY', 'DISPATCH STATUS', 'SCHEDULED WINDOW', 'ACTION']} 
            rows={activeDonations.length > 0 ? activeDonations.map(d => [
              <div key={d.id}>
                <b>{d.code}</b>
                <small>{d.title} · {d.food_category}</small>
              </div>,
              d.quantity,
              <Badge key={`b-${d.id}`} tone={d.tone || 'blue'}>{d.status}</Badge>,
              d.pickup_window,
              <Button key={`btn-${d.id}`} sm primary onClick={() => setScreen('donation-details')}>
                View Details
              </Button>
            ]) : [
              [
                <div>
                  <b>RL-00128</b>
                  <small>Fresh vegetarian lunch boxes · Steam packaged</small>
                </div>,
                '80 meals',
                <Badge tone="blue">Courier Assigned</Badge>,
                'Today, 3:30 PM',
                <Button sm primary onClick={() => setScreen('donation-details')}>
                  View Details
                </Button>
              ],
              [
                <div>
                  <b>RL-00124</b>
                  <small>Packed rice & lentil bowls · Chilled storage</small>
                </div>,
                '150 meals',
                <Badge tone="amber">In Transit (Courier en route)</Badge>,
                'Today, 2:45 PM',
                <Button sm onClick={() => setScreen('donation-details')}>
                  View Details
                </Button>
              ],
              [
                <div>
                  <b>RL-00119</b>
                  <small>Bakery assortment & whole grain breads</small>
                </div>,
                '42 packs',
                <Badge tone="green">Delivered & Verified</Badge>,
                'Yesterday, 6:00 PM',
                <Button sm onClick={() => setScreen('donation-details')}>
                  View Receipt
                </Button>
              ]
            ]}
          />
        </Card>

        <Card>
          <SectionTitle 
            title="Today's Pickup Schedule" 
            action={<Badge tone="blue">2 scheduled pickups</Badge>}
          />
          <Timeline 
            items={[
              { title: 'Jordan Mathew (Courier) ETA at 3:30 PM', time: 'Mission RL-00128 · 80 meals' },
              { title: 'Priya S. (Volunteer Van) ETA at 5:00 PM', time: 'Mission RL-00124 · 150 meals' }
            ]}
          />
          <div className="notice">
            <ShieldCheck size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
            Please keep items stored at or below 4°C (chilled) until the courier verifies temperature and signs the digital manifest.
          </div>
        </Card>
      </div>

      <div className="split lower">
        <Card>
          <SectionTitle 
            title="Live Operational Feed" 
            action={<Badge tone="gray">Realtime</Badge>}
          />
          <Timeline 
            items={[
              { title: 'Donation RL-00128 submitted & safety checklist approved', time: 'Today, 2:14 PM' },
              { title: 'AI Matching Engine allocated 80 meals to Hope Foundation', time: 'Today, 2:18 PM' },
              { title: 'Volunteer Jordan Mathew confirmed pickup route', time: 'Today, 2:21 PM', active: true }
            ]}
          />
        </Card>

        <Card>
          <SectionTitle title="Quick Management Actions" />
          <div className="quick-grid">
            <button className="quick-action-btn" onClick={() => setScreen('create-donation')}>
              <Plus size={20} />
              <span>Create Food Donation</span>
              <small>List surplus meals from lunch or dinner services</small>
            </button>
            <button className="quick-action-btn" onClick={() => setScreen('history')}>
              <ClipboardList size={20} />
              <span>Donation History & Receipts</span>
              <small>Export certified food donation tax deduction reports</small>
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
  notify 
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  const [title, setTitle] = useState('Surplus vegetarian lunch meals');
  const [category, setCategory] = useState('Prepared meals (Cooked)');
  const [quantity, setQuantity] = useState('150 meals');
  const [prepTime, setPrepTime] = useState('21 Nov 2026, 1:00 PM');
  const [pickupTime, setPickupTime] = useState('21 Nov 2026, 5:00 PM');
  const [packaging, setPackaging] = useState('Sealed individual food-grade trays');
  const [temp, setTemp] = useState('Refrigerated (3.5°C verified)');
  const [allergens, setAllergens] = useState('Contains dairy. Vegetarian. Nut-free kitchen.');
  const [notes, setNotes] = useState('Prepared in commercial sanitary kitchen. Tamper-evident seals applied.');
  
  // Interactive checklist
  const [checks, setChecks] = useState({
    pkg: true,
    prep: true,
    temp: true,
    allergen: true,
    accuracy: true
  });

  const handleAiAutoFill = async (type: 'lunch' | 'bakery') => {
    const promptText = type === 'lunch'
      ? '150 fresh hot vegetarian lunch boxes with lentils and rice, refrigerated 3C, dairy'
      : '45 artisanal whole wheat bread baskets in sealed paper wraps, ambient';
    const res = await aiApi.intakeCopilot(promptText);
    if (res.data) {
      if (res.data.title) setTitle(res.data.title);
      if (res.data.food_category) setCategory(res.data.food_category);
      if (res.data.quantity_meals) setQuantity(`${res.data.quantity_meals} meals`);
      if (res.data.packaging_type) setPackaging(res.data.packaging_type);
      if (res.data.storage_temp) setTemp(res.data.storage_temp);
      if (res.data.allergens) setAllergens(res.data.allergens);
      notify(`AI Copilot Extracted: ${res.data.title}`);
    } else {
      if (type === 'lunch') {
        setTitle('150 Fresh Vegetarian Lunch Boxes');
        setCategory('Prepared hot/chilled meals');
        setQuantity('150 boxed meals');
        setPackaging('Individually sealed trays in insulated cartons');
        setTemp('Refrigerated at 3°C');
        setAllergens('Dairy present; vegetarian');
        notify('AI Auto-fill: Applied 150 Hot Lunch Boxes specifications');
      } else {
        setTitle('45 Assorted Artisanal Bread & Pastry Baskets');
        setCategory('Baked goods');
        setQuantity('45 family packages');
        setPackaging('Food-grade paper wraps in sealed crates');
        setTemp('Ambient storage (clean, dry)');
        setAllergens('Wheat/gluten present; nut-free');
        notify('AI Auto-fill: Applied 45 Bakery Packages specifications');
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const qtyNum = parseInt(quantity.replace(/[^0-9]/g, '')) || 150;
    const res = await donorApi.createDonation({
      title,
      food_category: category,
      quantity_meals: qtyNum,
      packaging_type: packaging,
      storage_temp: temp,
      allergens,
      handling_notes: notes,
      pickup_address: '24, 2nd Avenue, Anna Nagar, Chennai',
      on_site_contact: 'Chef Alex Rivera',
      contact_phone: '+91 98765 43210'
    });
    if (res.data?.code) {
      notify(`Donation ${res.data.code} created & stored in database! Matching engine allocated meals.`);
    } else {
      notify('Donation RL-00129 created! Recipient matching engine initiated.');
    }
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
            <Button onClick={() => { notify('Draft saved to local storage.'); }}>Save Draft</Button>
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
              <Input label="Preparation Timestamp" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
              <Input label="Latest Safe Pickup Window" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
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
              <Input label="Kitchen / Warehouse Address" value="24, 2nd Avenue, Anna Nagar, Chennai" />
              <Input label="Primary On-site Contact" value="Chef Alex Rivera" />
              <Input label="Direct Dispatch Contact Number" value="+91 98765 43210" />
              <Input label="Loading Dock Instructions" value="Enter through Service Bay 2 behind main entrance" />
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
            <p>One-click sample presets to simulate real donor inputs:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <Button sm secondary onClick={() => handleAiAutoFill('lunch')}>
                <Package size={14} /> Preset: 150 Cooked Lunch Trays
              </Button>
              <Button sm secondary onClick={() => handleAiAutoFill('bakery')}>
                <Package size={14} /> Preset: 45 Assorted Bakery Packs
              </Button>
            </div>
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
  notify 
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  return (
    <>
      <PageHead 
        eyebrow="DONOR / DONATION DETAILS / RL-00124" 
        title="Mission RL-00124 Tracking" 
        subtitle="150 Vegetarian Lunch Boxes · Split delivery to 3 community centers in Anna Nagar" 
        onBack={() => setScreen('donor-overview')}
        backLabel="Back to Donor Overview"
        action={
          <div className="actions">
            <Button onClick={() => notify('Verified Donation Tax Receipt downloaded (PDF).')}>
              <Download size={14} /> Download Receipt
            </Button>
            <Button primary onClick={() => setScreen('ops-overview')}>
              View Live Mission Radar
            </Button>
          </div>
        }
      />

      <div className="split">
        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Batch Overview: RL-00124" 
              action={<Badge tone="amber">Active · In Transit</Badge>}
            />
            <div className="metric-row">
              <b>FOOD CATEGORY<strong>Vegetarian Meals</strong><small>Nutritious cooked</small></b>
              <b>BATCH VOLUME<strong>150 Meals</strong><small>3 recipient drops</small></b>
              <b>PREPARATION<strong>Today, 1:00 PM</strong><small>Chef signed</small></b>
              <b>MAX PICKUP<strong>5:00 PM</strong><small>Freshness window</small></b>
            </div>
          </Card>

          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Automated Recipient Split Allocation" 
              subtitle="AI matching algorithm distributed 100% of volume based on shelter demand"
              action={<Badge tone="green">150 / 150 Allocated</Badge>}
            />
            <Table 
              headers={['SHELTER / RECIPIENT', 'ALLOCATED', 'CAPACITY CHECK', 'DELIVERY STATUS']} 
              rows={[
                [
                  <div>
                    <b>Hope Community Kitchen</b>
                    <small>18, 5th Street, Anna Nagar</small>
                  </div>,
                  '60 meals',
                  <Badge tone="green">Accepted (70 free)</Badge>,
                  'Drop #1 (Arriving 3:45 PM)'
                ],
                [
                  <div>
                    <b>Anna Nagar Care Centre</b>
                    <small>12, 11th Main Road, Anna Nagar</small>
                  </div>,
                  '50 meals',
                  <Badge tone="green">Accepted (60 free)</Badge>,
                  'Drop #2 (Arriving 4:15 PM)'
                ],
                [
                  <div>
                    <b>Meals for All Foundation</b>
                    <small>45, Round Table Ave, Shenoy Nagar</small>
                  </div>,
                  '40 meals',
                  <Badge tone="green">Accepted (40 free)</Badge>,
                  'Drop #3 (Arriving 4:40 PM)'
                ]
              ]}
            />
          </Card>

          <Card>
            <SectionTitle 
              title="Pickup Facility & Safety Parameters" 
              action={<Button sm onClick={() => setScreen('create-donation')}>Edit Information</Button>}
            />
            <div className="detail-grid">
              <p>
                <small>DISPATCH LOCATION</small>
                <b>24, 2nd Avenue, Anna Nagar</b>
                Chennai, Tamil Nadu 600040 (Dock 2)
              </p>
              <p>
                <small>STORAGE PREREQUISITES</small>
                <b>Refrigerated · Sealed Trays</b>
                Vegetarian · Contains dairy · Zero nuts
              </p>
            </div>
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Assigned Volunteer Courier" 
              action={<Badge tone="blue">Dispatched</Badge>}
            />
            <div className="person-row">
              <span className="avatar">JM</span>
              <div>
                <b>Jordan Mathew</b>
                <small>Two-wheeler courier · Insulated thermal carrier</small>
              </div>
            </div>
            <hr />
            <div className="between">
              <span>Courier Contact:</span>
              <b>+91 98401 22334</b>
            </div>
            <div className="between">
              <span>Current Status:</span>
              <b>En route to donor kitchen</b>
            </div>
            <div className="between">
              <span>Estimated Pickup:</span>
              <b>3:30 PM (in 15 mins)</b>
            </div>
            <Button primary className="full" style={{ marginTop: 14 }} onClick={() => setScreen('task')}>
              View Volunteer Live Manifest <ExternalLink size={14} />
            </Button>
          </Card>

          <Card>
            <SectionTitle 
              title="Rescue Progress Stepper" 
              action={<small style={{ color: '#10b981', fontWeight: 700 }}>● Active Mission</small>}
            />
            <Timeline 
              items={[
                { title: 'Donation RL-00124 Submitted by Kitchen', time: 'Today, 2:14 PM' },
                { title: 'AI Matching: 3 Shelters Confirmed Capacity', time: 'Today, 2:18 PM' },
                { title: 'Volunteer Jordan Mathew Accepted Mission', time: 'Today, 2:21 PM', active: true },
                { title: 'Pickup & Temperature Handover', time: 'Pending (ETA 3:30 PM)' },
                { title: 'Final Handover at Shelter 3', time: 'Scheduled for 4:40 PM' }
              ]}
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
  notify 
}: { 
  role: Role; 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  const ops = role === 'ops';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'transit' | 'delivered' | 'review'>('all');

  const historyData = [
    {
      id: 'RL-00124',
      name: 'ABC Restaurant · Anna Nagar',
      food: '150 Vegetarian Lunch Meals',
      quantity: '150 meals',
      stops: '3 stops',
      status: 'In transit',
      tone: 'amber' as const,
      volunteer: 'Jordan Mathew',
      date: 'Today, 2:45 PM',
      creator: 'Alex Rivera'
    },
    {
      id: 'RL-00128',
      name: 'ABC Restaurant · Anna Nagar',
      food: '80 Vegetarian Meal Trays',
      quantity: '80 meals',
      stops: '2 stops',
      status: 'Pickup assigned',
      tone: 'blue' as const,
      volunteer: 'Priya S.',
      date: 'Today, 3:30 PM',
      creator: 'Alex Rivera'
    },
    {
      id: 'RL-00131',
      name: 'Fresh Bake House · Kilpauk',
      food: '35 Artisanal Bread Packages',
      quantity: '35 packs',
      stops: '1 stop',
      status: 'Needs volunteer',
      tone: 'red' as const,
      volunteer: 'Unassigned',
      date: 'Today, 5:00 PM',
      creator: 'Elena Gomez'
    },
    {
      id: 'RL-00119',
      name: 'ABC Restaurant · Anna Nagar',
      food: '42 Bakery Assortments',
      quantity: '42 packs',
      stops: '1 stop',
      status: 'Delivered',
      tone: 'green' as const,
      volunteer: 'Rohan Verma',
      date: '20 Nov 2026',
      creator: 'Alex Rivera'
    },
    {
      id: 'RL-00112',
      name: 'Green Plate Cafe · Shenoy Nagar',
      food: '60 Rice & Curry Containers',
      quantity: '60 meals',
      stops: '2 stops',
      status: 'Delivered',
      tone: 'green' as const,
      volunteer: 'Jordan Mathew',
      date: '19 Nov 2026',
      creator: 'Sarah Kumar'
    }
  ];

  const [historyList, setHistoryList] = useState<any[]>(historyData);

  useEffect(() => {
    if (role === 'donor') {
      donorApi.getHistory().then(res => {
        if (res.data && res.data.length > 0) setHistoryList(res.data);
      });
    } else if (role === 'ngo') {
      ngoApi.getHistory().then(res => {
        if (res.data && res.data.length > 0) setHistoryList(res.data);
      });
    } else if (role === 'volunteer') {
      volunteerApi.getHistory().then(res => {
        if (res.data && res.data.length > 0) setHistoryList(res.data);
      });
    } else if (role === 'ops') {
      opsApi.getAuditLogs().then(res => {
        if (res.data && res.data.length > 0) {
          const mapped = res.data.map((log: any) => ({
            id: log.entity_id ? log.entity_id.slice(0, 8) : 'AUDIT',
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
        }
      });
    }
  }, [role]);

  const filtered = historyList.filter((item) => {
    const matchesSearch = 
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.food.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'transit') return matchesSearch && item.status.includes('transit');
    if (activeTab === 'delivered') return matchesSearch && item.status.includes('Delivered');
    if (activeTab === 'review') return matchesSearch && (item.status.includes('volunteer') || item.status.includes('assigned'));
    return matchesSearch;
  });

  return (
    <>
      <PageHead 
        eyebrow={`${roleMeta[role].label.toUpperCase()} / HISTORICAL RECORDS`} 
        title={ops ? 'Master Dispatch Archive & Telemetry' : 'Food Rescue History & Audits'} 
        subtitle={ops ? 'Comprehensive ledger of missions, automated allocations and exceptions.' : 'Review delivered rescue handovers, verify receipts and export tax deduction statements.'} 
        action={
          <Button primary onClick={() => notify('Historical export CSV compiled and downloaded.')}>
            <Download size={14} /> Export Audit Report (CSV)
          </Button>
        }
      />

      <Card>
        <div className="toolbar">
          <div className="tabs">
            <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
              All Missions ({historyData.length})
            </button>
            <button className={activeTab === 'transit' ? 'active' : ''} onClick={() => setActiveTab('transit')}>
              In Transit (1)
            </button>
            <button className={activeTab === 'delivered' ? 'active' : ''} onClick={() => setActiveTab('delivered')}>
              Delivered & Verified (2)
            </button>
            <button className={activeTab === 'review' ? 'active' : ''} onClick={() => setActiveTab('review')}>
              Needs Attention (2)
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
                <Button key={`btn-${item.id}`} sm primary onClick={() => setScreen('mission-detail')}>
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
                <Button key={`btn-${item.id}`} sm onClick={() => setScreen('donation-details')}>
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
            <ClipboardCheck size={16} /> Update Daily Receiving Capacity
          </Button>
        }
      />

      <div className="stats-grid">
        <Stat 
          label="Incoming Offers Pending" 
          value={stats ? `${stats.incoming_offers}` : "6"} 
          note="2 urgent: pickup within 90 mins" 
          icon={<Package size={18} />} 
        />
        <Stat 
          label="Meals Accepted This Week" 
          value={stats ? `${stats.meals_accepted_week}` : "420"} 
          note="Saved ~180 kg CO2 equivalent" 
          icon={<CheckCircle2 size={18} />} 
        />
        <Stat 
          label="Received Today" 
          value={stats ? `${stats.received_today}` : "110"} 
          note="Across 3 verified handovers" 
          icon={<Truck size={18} />} 
        />
        <Stat 
          label="Remaining Daily Capacity" 
          value={stats ? `${stats.available_capacity}` : "70"} 
          note={stats ? `${stats.daily_capacity - stats.available_capacity} / ${stats.daily_capacity} total capacity filled` : "110 / 180 total capacity filled"} 
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
            title="Upcoming Courier Arrivals" 
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
          <SectionTitle title="Receiving Checklist & Safety Log" />
          <div className="notice" style={{ marginTop: 0 }}>
            Before signing the digital manifest, verify that sealed lids are intact and temperature probe registers under 5°C for cooked foods.
          </div>
          <div className="quick-grid" style={{ marginTop: 14 }}>
            <button className="quick-action-btn" onClick={() => setScreen('offers')}>
              <Package size={18} />
              <span>Browse Offers Queue</span>
              <small>Respond to donors nearby</small>
            </button>
            <button className="quick-action-btn" onClick={() => setScreen('requirements')}>
              <Users size={18} />
              <span>Manage Beneficiary Counts</span>
              <small>Update family headcount</small>
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
  notify 
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'accepted' | 'declined'>('all');
  const [search, setSearch] = useState('');

  const offers = [
    {
      id: 'RL-00128',
      donor: 'ABC Restaurant',
      location: 'Anna Nagar · 1.8 km',
      food: 'Vegetarian Cooked Lunch Trays',
      quantity: '80 meals',
      window: '3:30 - 5:00 PM',
      status: 'Awaiting response',
      tone: 'amber' as const
    },
    {
      id: 'RL-00130',
      donor: 'Fresh Bake House',
      location: 'Kilpauk · 2.4 km',
      food: 'Artisanal Breads & Baguettes',
      quantity: '40 packs',
      window: '2:00 - 4:00 PM',
      status: 'New offer',
      tone: 'blue' as const
    },
    {
      id: 'RL-00124',
      donor: 'Green Plate Cafe',
      location: 'Shenoy Nagar · 1.2 km',
      food: 'Prepared Rice & Vegetable Curries',
      quantity: '60 meals',
      window: '5:00 - 6:00 PM',
      status: 'Accepted',
      tone: 'green' as const
    },
    {
      id: 'RL-00115',
      donor: 'City Caterers',
      location: 'Aminjikarai · 3.1 km',
      food: 'Packed Banquet Dinner Meals',
      quantity: '100 meals',
      window: '6:00 - 7:30 PM',
      status: 'Declined (Exceeded space)',
      tone: 'gray' as const
    }
  ];

  const [offersList, setOffersList] = useState<any[]>(offers);

  useEffect(() => {
    ngoApi.getOffers(activeTab, search).then(res => {
      if (res.data && res.data.length > 0) setOffersList(res.data);
    });
  }, [activeTab, search]);

  const filtered = offersList.filter((o) => {
    const match = o.donor.toLowerCase().includes(search.toLowerCase()) || o.food.toLowerCase().includes(search.toLowerCase());
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
              All Offers ({offers.length})
            </button>
            <button className={activeTab === 'new' ? 'active' : ''} onClick={() => setActiveTab('new')}>
              Awaiting Action (2)
            </button>
            <button className={activeTab === 'accepted' ? 'active' : ''} onClick={() => setActiveTab('accepted')}>
              Accepted (1)
            </button>
            <button className={activeTab === 'declined' ? 'active' : ''} onClick={() => setActiveTab('declined')}>
              Declined (1)
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
            <Button sm><Filter size={13} /> Filter</Button>
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
            <Button key={`btn-${item.id}`} sm primary onClick={() => setScreen('offer-detail')}>
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
  notify 
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  const [acceptedQty, setAcceptedQty] = useState('60');
  const [receivingSlot, setReceivingSlot] = useState('4:15 PM');
  const [note, setNote] = useState('Our staff kitchen coordinator will receive at rear loading bay.');

  const handleAccept = async () => {
    const qty = parseInt(acceptedQty) || 60;
    await ngoApi.respondToOffer('RL-00128', 'accept', { accepted_meals: qty, delivery_window: receivingSlot, notes: note });
    notify(`Accepted ${acceptedQty} meals from ABC Restaurant! Database record updated & courier dispatch triggered.`);
    setScreen('ngo-overview');
  };

  const handleDecline = async () => {
    await ngoApi.respondToOffer('RL-00128', 'decline');
    notify('Offer declined. The system has notified alternative shelters.');
    setScreen('offers');
  };

  return (
    <>
      <PageHead 
        eyebrow="NGO / OFFERS / RL-00128" 
        title="Review & Accept Food Donation" 
        subtitle="ABC Restaurant · 80 Meals Offered · 98% Compatibility with your Cold Storage profile" 
        onBack={() => setScreen('offers')}
        backLabel="Back to Offers"
        action={
          <div className="actions">
            <Button onClick={() => setScreen('offers')}>Back to Offers</Button>
            <Button primary onClick={handleAccept}>Accept Allocation</Button>
          </div>
        }
      />

      <div className="split">
        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Surplus Vegetarian Lunch Meals" 
              action={<Badge tone="amber">Awaiting Your Response</Badge>}
            />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1b6348' }}>
              ABC Restaurant Group · 24, 2nd Avenue, Anna Nagar (1.8 km)
            </p>
            <div className="metric-row">
              <b>TOTAL OFFERED<strong>80 Meals</strong><small>Packaged in trays</small></b>
              <b>PREPARATION TIME<strong>1:00 PM</strong><small>2 hours ago</small></b>
              <b>PICKUP WINDOW<strong>3:30 - 5:00 PM</strong><small>Today</small></b>
              <b>TRANSIT DISTANCE<strong>1.8 km</strong><small>~8 min bike delivery</small></b>
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
                <b>Prepared Hot / Cooked Meals</b>
                Freshly cooked mixed vegetable curry with steamed basmati rice.
              </p>
              <p>
                <small>PACKAGING INTEGRITY</small>
                <b>Individual Food-Grade Sealed Trays</b>
                Tamper-evident seals intact.
              </p>
              <p>
                <small>STORAGE PARAMETERS</small>
                <b>Refrigerated Storage (3.5°C)</b>
                Maintained in certified commercial cold storage.
              </p>
              <p>
                <small>ALLERGEN DISCLOSURE</small>
                <b>Contains Dairy · Vegetarian</b>
                Zero tree nuts, peanuts, or shell allergen traces.
              </p>
            </div>
          </Card>

          <Card>
            <SectionTitle 
              title="Pickup Kitchen Coordinates" 
              action={<a onClick={() => notify('Opening GPS Map View')}>View on Map <ExternalLink size={12} /></a>}
            />
            <div className="person-row">
              <MapPin size={22} color="#1b6348" />
              <div>
                <b>24, 2nd Avenue, Anna Nagar Central</b>
                <small>Contact: Chef Alex Rivera (+91 98765 43210) · Service Bay 2</small>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Confirm Quantity to Receive" 
              subtitle="Your remaining capacity today is 70 meals"
            />
            
            <div style={{ margin: '14px 0' }}>
              <label className="field">
                <span>Quantity you can safely accept (Meals)</span>
                <input 
                  type="number" 
                  value={acceptedQty} 
                  onChange={(e) => setAcceptedQty(e.target.value)} 
                  max="70"
                  min="10"
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Button sm secondary onClick={() => setAcceptedQty('60')}>Accept 60 Meals</Button>
              <Button sm secondary onClick={() => setAcceptedQty('70')}>Max Capacity (70)</Button>
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

            <Button primary className="full" onClick={handleAccept} style={{ marginBottom: 10 }}>
              <Check size={16} /> Confirm & Accept {acceptedQty} Meals
            </Button>
            <Button danger className="full" onClick={handleDecline}>
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
  notify 
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  const [isAvailable, setIsAvailable] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    volunteerApi.getDashboardStats().then(res => {
      if (res.data) {
        setStats(res.data);
        if (res.data.is_online !== undefined) setIsAvailable(res.data.is_online);
      }
    });
  }, []);

  const toggleAvailability = async () => {
    const nextVal = !isAvailable;
    setIsAvailable(nextVal);
    await volunteerApi.toggleAvailability(nextVal);
    notify(nextVal ? 'Status set to: ONLINE (Ready for pickups)' : 'Status set to: OFFLINE');
  };

  return (
    <>
      <PageHead 
        eyebrow="VOLUNTEER RESCUE COURIER / OVERVIEW" 
        title="Welcome back, Jordan" 
        subtitle="Two-wheeler Fleet #M-104 · Insulated Carrier Box verified at 40 meals max." 
        action={
          <div className="actions">
            <Button 
              className={isAvailable ? 'btn-secondary' : 'btn'} 
              onClick={toggleAvailability}
            >
              <span className={`dot-indicator ${isAvailable ? 'donor' : 'volunteer'}`} style={{ display: 'inline-block' }} />
              {isAvailable ? 'Online & Accepting Tasks' : 'Status: Offline'}
            </Button>
            <Button primary onClick={() => setScreen('task')}>
              <Navigation size={16} /> Open Active Mission Route
            </Button>
          </div>
        }
      />

      <div className="stats-grid">
        <Stat 
          label="Missions Completed" 
          value="27" 
          note="100% on-time delivery score" 
          icon={<CheckCircle2 size={18} />} 
        />
        <Stat 
          label="Meals Transported" 
          value="1,120" 
          note="Across 18 neighborhood kitchens" 
          icon={<Package size={18} />} 
        />
        <Stat 
          label="Active Assigned Tasks" 
          value="2" 
          note="1 in progress, 1 scheduled at 5 PM" 
          icon={<Clock3 size={18} />} 
        />
        <Stat 
          label="Courier Rating" 
          value="4.98 ★" 
          note="Certified Safe Food Handler" 
          icon={<ShieldCheck size={18} />} 
        />
      </div>

      <div className="split">
        <Card>
          <SectionTitle 
            title="Current Assigned Rescue Tasks" 
            action={<Badge tone="green">Active Mission</Badge>}
          />

          <div className="task-card">
            <div className="between">
              <Badge tone="amber">In Progress · Pickup Underway</Badge>
              <b style={{ color: '#1b6348' }}>ETA Pickup: 3:30 PM</b>
            </div>
            <h3>Mission RL-00124 · ABC Restaurant Group</h3>
            <p>150 Vegetarian Lunch Boxes · Multi-drop route (Hope Kitchen, Care Centre, Meals for All)</p>
            <div className="metric-row">
              <b>PICKUP TIME<strong>3:30 PM</strong><small>Anna Nagar</small></b>
              <b>STOP 1<strong>Hope Kitchen</strong><small>60 meals</small></b>
              <b>STOP 2 & 3<strong>Shelters 2 & 3</strong><small>90 meals</small></b>
              <b>CARRIER<strong>Two-wheeler</strong><small>Insulated carrier</small></b>
            </div>
            <div style={{ marginTop: 14 }}>
              <Button primary onClick={() => setScreen('task')}>
                Open Mission Manifest & GPS Route <Navigation size={14} />
              </Button>
            </div>
          </div>

          <div className="task-card">
            <div className="between">
              <Badge tone="blue">Scheduled for 5:00 PM</Badge>
              <b style={{ color: '#4b5853' }}>Starts in 1h 45m</b>
            </div>
            <h3>Mission RL-00131 · Fresh Bake House</h3>
            <p>35 Bread & Bakery Bundles · Single destination drop to Anna Nagar Care Centre</p>
            <div className="metric-row">
              <b>PICKUP TIME<strong>5:00 - 6:00 PM</strong><small>Kilpauk</small></b>
              <b>DELIVER TO<strong>Care Centre</strong><small>35 packs</small></b>
              <b>DISTANCE<strong>3.2 km</strong><small>~12 min trip</small></b>
            </div>
            <div style={{ marginTop: 14 }}>
              <Button sm onClick={() => setScreen('task')}>
                View Mission Parameters
              </Button>
            </div>
          </div>
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
              <b>Hero Electric Scooter (M-104)</b>
            </div>
            <div className="between">
              <span>Insulated Box Capacity:</span>
              <b>Up to 40 meal containers / run</b>
            </div>
            <div className="between">
              <span>Service Radius:</span>
              <b>North Chennai (5 km radius)</b>
            </div>
            <div className="between">
              <span>Clean Transport Cert:</span>
              <b>Valid through Dec 2026</b>
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
            <SectionTitle 
              title="New Mission Request Alert" 
              action={<Badge tone="amber">1 Pending Offer</Badge>}
            />
            <h3>Mission RL-00135 · City Caterers</h3>
            <p>20 Boxed Bakery Snacks · 2.1 km away in Aminjikarai</p>
            <div className="between">
              <span>Pickup Window:</span>
              <b>6:00 - 7:00 PM Today</b>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <Button onClick={() => notify('Mission declined. Assigned to nearest available runner.')}>
                Decline
              </Button>
              <Button primary onClick={() => { notify('Mission RL-00135 accepted! Added to schedule.'); setScreen('task'); }}>
                Accept Mission
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  ); 
}

// ---------------- SCREEN 11: VOLUNTEER TASK DETAILS & ROUTE ----------------
function Task({ 
  notify, 
  setScreen 
}: { 
  notify: (msg: string) => void; 
  setScreen?: (s: Screen) => void; 
}) { 
  const [currentStep, setCurrentStep] = useState(2);
  const [inspections, setInspections] = useState({
    carrier: true,
    qty: true,
    temp: true,
    seal: true
  });
  const [otp, setOtp] = useState('');

  const nextStep = async () => {
    if (currentStep === 2) {
      setCurrentStep(3);
      await volunteerApi.updateTaskStep('RL-00124', 3);
      notify('Step completed: Food picked up! In transit to Hope Community Kitchen.');
    } else if (currentStep === 3) {
      setCurrentStep(4);
      await volunteerApi.updateTaskStep('RL-00124', 4);
      notify('Arrived at Drop #1! Ready for digital handover verification.');
    } else if (currentStep === 4) {
      setCurrentStep(1);
      await volunteerApi.verifyOtp('RL-00124', {
        otp_code: otp || '4492',
        verified_qty: 60,
        temp_at_drop: 3.8,
        receiver_name: 'Sarah Kumar'
      });
      notify('Handover confirmed with OTP 4492! Mission RL-00124 marked complete in database.');
    } else {
      setCurrentStep(2);
      await volunteerApi.updateTaskStep('RL-00124', 2);
      notify('Arrived at Donor Kitchen. Ready for food inspection.');
    }
  };

  return (
    <>
      <PageHead 
        eyebrow="VOLUNTEER / MY TASKS / RL-00124" 
        title="Active Mission Manifest: RL-00124" 
        subtitle="Pickup at ABC Restaurant · 3 Drop-off Locations in Anna Nagar" 
        onBack={setScreen ? () => setScreen('volunteer-overview') : undefined}
        backLabel="Back to Volunteer Dashboard"
        action={
          <div className="actions">
            <Button onClick={() => alert('Support dispatch notified. Operations will call in 60s.')}>
              <Phone size={14} /> Contact Ops Central
            </Button>
            <Button primary onClick={nextStep}>
              {currentStep === 2 ? 'Confirm Food Collection' : currentStep === 3 ? 'Arrived at Drop #1' : 'Verify Handover'}
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
                <Badge tone={currentStep === 2 ? 'amber' : currentStep === 3 ? 'blue' : 'green'}>
                  {currentStep === 1 ? 'Step 1: Heading to Kitchen' : currentStep === 2 ? 'Step 2: Inspect & Collect' : currentStep === 3 ? 'Step 3: In Transit' : 'Step 4: Recipient Handover'}
                </Badge>
              }
            />
            <p>Assigned Courier: Jordan Mathew · Mission ID: RL-00124</p>
            <div className="metric-row">
              <b>TOTAL BATCH<strong>150 Meals</strong><small>Split across 3 drops</small></b>
              <b>DEADLINE<strong>5:00 PM</strong><small>Freshness constraint</small></b>
              <b>TRANSPORT<strong>Two-wheeler</strong><small>Insulated thermal box</small></b>
              <b>STATUS<strong>{currentStep === 2 ? 'At Kitchen' : 'In Transit'}</strong><small>GPS Active</small></b>
            </div>
          </Card>

          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Turn-by-Turn Delivery Route" 
              action={<a onClick={() => notify('Launching Google Maps Navigation')}><Navigation size={14} /> Open GPS Navigation</a>}
            />
            <div className="route-grid">
              <div>
                <small>ORIGIN (PICKUP)</small>
                <b>ABC Restaurant Group</b>
                <p>24, 2nd Avenue, Anna Nagar<br />Chef Alex Rivera · +91 98765 43210</p>
              </div>
              <div>
                <small>DROP-OFF #1</small>
                <b>Hope Community Kitchen</b>
                <p>18, 5th Street, Anna Nagar<br />Receiver: Sarah Kumar · +91 98402 44550</p>
              </div>
            </div>

            <div className="metric-row">
              <b>STOP 1 (1.8 km)<strong>60 meals</strong><small>Hope Community Kitchen</small></b>
              <b>STOP 2 (1.2 km)<strong>50 meals</strong><small>Anna Nagar Care Centre</small></b>
              <b>STOP 3 (1.5 km)<strong>40 meals</strong><small>Meals for All Foundation</small></b>
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
                <span>Count verified with donor chef: Exactly 150 sealed trays</span>
              </label>
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={inspections.temp} 
                  onChange={(e) => setInspections({ ...inspections, temp: e.target.checked })} 
                />
                <span>Infrared food surface thermometer reads ≤ 4.2°C</span>
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
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Mission Action Progression" 
              action={<Badge tone="blue">Step {currentStep} of 4</Badge>}
            />
            <Timeline 
              items={[
                { title: 'Courier Accepted Assignment', time: 'Today, 2:21 PM' },
                { title: 'Arrived at Donor Kitchen', time: 'Today, 2:38 PM', active: currentStep === 2 },
                { title: 'Food Inspected & Loaded in Carrier', time: currentStep >= 3 ? 'Completed' : 'Pending', active: currentStep === 3 },
                { title: 'Recipient Handover & OTP Verification', time: currentStep === 4 ? 'Awaiting Code' : 'Scheduled' }
              ]}
            />

            {currentStep === 4 && (
              <div style={{ marginTop: 14 }}>
                <Input 
                  label="Enter Recipient OTP Code" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="e.g. 4492" 
                />
              </div>
            )}

            <Button primary className="full" style={{ marginTop: 16 }} onClick={nextStep}>
              {currentStep === 2 ? 'Confirm Food Collection & Start Route' : currentStep === 3 ? 'Arrived at Drop #1 (Hope Kitchen)' : 'Verify Recipient Handover'}
            </Button>
            <Button 
              danger 
              className="full" 
              style={{ marginTop: 8 }}
              onClick={() => alert('Issue reported to dispatch desk. Operations will handle discrepancy.')}
            >
              Report Incident / Delay / Discrepancy
            </Button>
          </Card>

          <Card>
            <SectionTitle title="Food Handling Requirements" />
            <div className="between">
              <span>Food Type:</span>
              <b>Vegetarian meals</b>
            </div>
            <div className="between">
              <span>Packaging:</span>
              <b>Sealed trays</b>
            </div>
            <div className="between">
              <span>Storage at pickup:</span>
              <b>Chilled 3.5°C</b>
            </div>
            <div className="between">
              <span>Allergen Notice:</span>
              <b>Contains dairy</b>
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
  notify 
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  const [stats, setStats] = useState<any>(null);
  const [missionsList, setMissionsList] = useState<any[]>([]);

  useEffect(() => {
    opsApi.getNetworkStats().then(res => {
      if (res.data) setStats(res.data);
    });
    opsApi.getMissions().then(res => {
      if (res.data && res.data.length > 0) setMissionsList(res.data);
    });
  }, []);

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
          value={stats ? `${stats.active_missions}` : "12"} 
          note="4 requiring active supervision" 
          icon={<Truck size={18} />} 
        />
        <Stat 
          label="Surplus Awaiting Pickup" 
          value={stats ? `${stats.surplus_awaiting_pickup}` : "240"} 
          note="Across 5 donor kitchens" 
          icon={<Package size={18} />} 
        />
        <Stat 
          label="Active Fleet Couriers" 
          value={stats ? `${stats.active_fleet}` : "9"} 
          note="8 on two-wheelers, 1 van" 
          icon={<Navigation size={18} />} 
        />
        <Stat 
          label="Delivered Today" 
          value={stats ? `${stats.delivered_today?.toLocaleString()}` : "1,480"} 
          note="99.2% on-time freshness rating" 
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
            rows={[
              [
                <div>
                  <b>RL-00124</b>
                  <small>ABC Restaurant · 150 meals</small>
                </div>,
                <Badge tone="amber">In Transit</Badge>,
                '3 Shelters',
                'Jordan Mathew',
                '5:00 PM',
                <Button sm primary onClick={() => setScreen('mission-detail')}>
                  Inspect
                </Button>
              ],
              [
                <div>
                  <b>RL-00128</b>
                  <small>ABC Restaurant · 80 meals</small>
                </div>,
                <Badge tone="blue">Courier Assigned</Badge>,
                '2 Shelters',
                'Priya S.',
                '5:00 PM',
                <Button sm onClick={() => setScreen('mission-detail')}>
                  Inspect
                </Button>
              ],
              [
                <div>
                  <b>RL-00131</b>
                  <small>Fresh Bake House · 35 packs</small>
                </div>,
                <Badge tone="red">Awaiting Courier</Badge>,
                '1 Shelter',
                'Unassigned (SOS)',
                '6:00 PM',
                <Button sm onClick={() => setScreen('mission-detail')}>
                  Assign
                </Button>
              ]
            ]}
          />
        </Card>

        <Card>
          <SectionTitle 
            title="Live Geographic Telemetry Map" 
            action={<Badge tone="green">Chennai North Sector</Badge>}
          />
          
          <div className="map-widget">
            <svg className="map-svg" viewBox="0 0 400 240">
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="#0d1712" />
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Street roads */}
              <path d="M 40 40 L 360 80 L 340 200 L 80 180 Z" fill="none" stroke="#1d2e24" strokeWidth="6" />
              <path d="M 120 40 L 140 210" fill="none" stroke="#1d2e24" strokeWidth="4" />
              <path d="M 40 120 L 370 140" fill="none" stroke="#1d2e24" strokeWidth="4" />

              {/* Mission route line animated */}
              <path 
                d="M 100 90 L 190 115 L 290 130" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="2.5" 
                strokeDasharray="6,4" 
              />

              {/* Donor node */}
              <circle cx="100" cy="90" r="10" fill="rgba(16, 185, 129, 0.2)" />
              <circle cx="100" cy="90" r="5" fill="#10b981" />
              <text x="80" y="75" fill="#a7f3d0" fontSize="10" fontWeight="bold">ABC Restaurant</text>

              {/* Volunteer Courier node in motion */}
              <circle cx="190" cy="115" r="14" fill="rgba(245, 158, 11, 0.25)">
                <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="190" cy="115" r="6" fill="#f59e0b" />
              <text x="175" y="142" fill="#fde68a" fontSize="10" fontWeight="bold">Jordan M. (Courier)</text>

              {/* Recipient NGO node */}
              <circle cx="290" cy="130" r="10" fill="rgba(59, 130, 246, 0.2)" />
              <circle cx="290" cy="130" r="5" fill="#3b82f6" />
              <text x="270" y="115" fill="#bfdbfe" fontSize="10" fontWeight="bold">Hope Shelter</text>
            </svg>

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
            action={<Badge tone="amber">3 require attention</Badge>}
          />
          <Timeline 
            items={[
              { title: 'Mission RL-00131: Fresh Bake House surplus unassigned (45m left)', time: 'High Priority', active: true },
              { title: 'Cold-chain probe alert: Hope Foundation storage sensor OK', time: '12m ago' },
              { title: 'Traffic congestion near 2nd Avenue: Alternative route sent to Courier', time: '24m ago' }
            ]}
          />
        </Card>

        <Card>
          <SectionTitle title="Autonomous Dispatch Metrics" />
          <div className="metric-row" style={{ borderTop: 'none', paddingTop: 0 }}>
            <b>AUTO-MATCH RATE<strong>94.8%</strong><small>No manual edits</small></b>
            <b>AVG DISPATCH<strong>2.4 min</strong><small>Submission to pickup</small></b>
            <b>TEMP COMPLIANCE<strong>100%</strong><small>Zero spoilages</small></b>
            <b>DAILY CO2 SAVED<strong>540 kg</strong><small>Diverted from landfill</small></b>
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
  notify 
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  const [activeTab, setActiveTab] = useState<'all' | 'transit' | 'unassigned' | 'completed'>('all');
  const [search, setSearch] = useState('');

  const missions = [
    {
      id: 'RL-00124',
      donor: 'ABC Restaurant · Anna Nagar',
      quantity: '150 meals',
      stops: '3 stops',
      status: 'In transit',
      tone: 'amber' as const,
      courier: 'Jordan Mathew',
      deadline: '5:00 PM'
    },
    {
      id: 'RL-00128',
      donor: 'ABC Restaurant · Anna Nagar',
      quantity: '80 meals',
      stops: '2 stops',
      status: 'Pickup assigned',
      tone: 'blue' as const,
      courier: 'Priya S.',
      deadline: '5:00 PM'
    },
    {
      id: 'RL-00131',
      donor: 'Fresh Bake House · Kilpauk',
      quantity: '35 packs',
      stops: '1 stop',
      status: 'Needs volunteer',
      tone: 'red' as const,
      courier: 'Unassigned (High priority)',
      deadline: '6:00 PM'
    },
    {
      id: 'RL-00136',
      donor: 'Green Plate Cafe · Shenoy Nagar',
      quantity: '60 meals',
      stops: '2 stops',
      status: 'Needs review',
      tone: 'purple' as const,
      courier: 'AI Allocation Pending',
      deadline: '6:30 PM'
    },
    {
      id: 'RL-00119',
      donor: 'ABC Restaurant · Anna Nagar',
      quantity: '42 packs',
      stops: '1 stop',
      status: 'Delivered',
      tone: 'green' as const,
      courier: 'Rohan Verma',
      deadline: 'Completed'
    }
  ];

  const [missionsList, setMissionsList] = useState<any[]>(missions);

  useEffect(() => {
    opsApi.getMissions(activeTab, search).then(res => {
      if (res.data && res.data.length > 0) setMissionsList(res.data);
    });
  }, [activeTab, search]);

  const filtered = missionsList.filter((m) => {
    const match = m.id.toLowerCase().includes(search.toLowerCase()) || m.donor.toLowerCase().includes(search.toLowerCase());
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
              All Missions ({missions.length})
            </button>
            <button className={activeTab === 'transit' ? 'active' : ''} onClick={() => setActiveTab('transit')}>
              In Transit (1)
            </button>
            <button className={activeTab === 'unassigned' ? 'active' : ''} onClick={() => setActiveTab('unassigned')}>
              Unassigned / Review (2)
            </button>
            <button className={activeTab === 'completed' ? 'active' : ''} onClick={() => setActiveTab('completed')}>
              Completed (1)
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
            <Button sm><Filter size={13} /> Filter</Button>
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
            <Button key={`btn-${item.id}`} sm primary onClick={() => setScreen('mission-detail')}>
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
  notify 
}: { 
  setScreen: (s: Screen) => void; 
  notify: (msg: string) => void;
}) { 
  const [missionData, setMissionData] = useState<any>(null);

  useEffect(() => {
    opsApi.getMissionDetail('RL-00124').then(res => {
      if (res.data) setMissionData(res.data);
    });
  }, []); 
  return (
    <>
      <PageHead 
        eyebrow="OPERATIONS / MISSIONS / RL-00124" 
        title="Mission Inspection: RL-00124" 
        subtitle="150 Cooked Meals · ABC Restaurant to 3 Community Kitchens · Courier: Jordan Mathew" 
        onBack={() => setScreen('missions')}
        backLabel="Back to Missions Queue"
        action={
          <div className="actions">
            <Button onClick={() => notify('Emergency notification sent to all participants.')}>
              Broadcast Alert
            </Button>
            <Button primary onClick={() => setScreen('task')}>
              View Courier Manifest
            </Button>
          </div>
        }
      />

      <div className="split">
        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="ABC Restaurant – Surplus Vegetarian Meals" 
              action={<Badge tone="amber">Active · In Transit</Badge>}
            />
            <p>Created Today at 2:14 PM · Origin: 24, 2nd Avenue, Anna Nagar</p>
            <div className="metric-row">
              <b>TOTAL OFFERED<strong>150</strong><small>Meals</small></b>
              <b>ALLOCATED<strong>150</strong><small>100% matched</small></b>
              <b>RECIPIENTS<strong>3 Shelters</strong><small>All accepted</small></b>
              <b>COURIER FLEET<strong>1 Unit</strong><small>Two-wheeler</small></b>
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
              rows={[
                [
                  <div>
                    <b>Hope Community Kitchen</b>
                    <small>18, 5th Street, Anna Nagar</small>
                  </div>,
                  '60 meals',
                  '60 meals',
                  <Badge tone="green">Confirmed</Badge>,
                  '3:45 PM'
                ],
                [
                  <div>
                    <b>Anna Nagar Care Centre</b>
                    <small>12, 11th Main Road</small>
                  </div>,
                  '50 meals',
                  '50 meals',
                  <Badge tone="green">Confirmed</Badge>,
                  '4:15 PM'
                ],
                [
                  <div>
                    <b>Meals for All Foundation</b>
                    <small>45, Round Table Ave</small>
                  </div>,
                  '40 meals',
                  '40 meals',
                  <Badge tone="green">Confirmed</Badge>,
                  '4:40 PM'
                ]
              ]}
            />
          </Card>

          <Card>
            <SectionTitle 
              title="Autonomous Dispatch Decision Audit Trail" 
              action={<Badge tone="purple"><Sparkles size={12} /> AI Trace Log</Badge>}
            />
            <Timeline 
              items={[
                { title: 'Intake Agent: Verified ABC Restaurant sanitization certificate & 3.5°C cold chain.', time: '2:14 PM' },
                { title: 'Matching Engine: Ranked 6 shelters; allocated to 3 highest need facilities under 3 km.', time: '2:18 PM' },
                { title: 'Dispatch Agent: Assigned Courier Jordan Mathew based on proximity & 40-meal carrier volume.', time: '2:21 PM', active: true },
                { title: 'Recovery Monitor: Live tracking heartbeat confirmed normal trajectory.', time: '2:38 PM' }
              ]}
            />
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle 
              title="Assigned Courier Telematics" 
              action={<Badge tone="blue">En Route</Badge>}
            />
            <div className="person-row">
              <span className="avatar">JM</span>
              <div>
                <b>Jordan Mathew</b>
                <small>Courier ID #JM-902 · Hero Electric Scooter</small>
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
              <b>84% · GPS Telemetry Active</b>
            </div>
            <Button primary className="full" style={{ marginTop: 14 }} onClick={() => setScreen('task')}>
              View Courier Viewpoint <ExternalLink size={14} />
            </Button>
          </Card>

          <Card>
            <SectionTitle title="Operational Interventions" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button className="full" onClick={() => notify('Recalculating split allocations across backup shelters...')}>
                Recalculate Allocation
              </Button>
              <Button className="full" onClick={() => notify('Reassignment prompt sent to nearest standby courier.')}>
                Reassign Volunteer Courier
              </Button>
              <Button className="full" onClick={() => notify('Direct telephone bridge established with Alex (Donor) and Sarah (NGO).')}>
                Contact Participants
              </Button>
              <Button danger className="full" onClick={() => { if (confirm('Are you sure you want to abort this rescue mission?')) { notify('Mission cancelled.'); setScreen('missions'); } }}>
                Cancel Mission (Emergency Abort)
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  ); 
}

// ---------------- MASTER APPLICATION COMPONENT ----------------
export default function RescueLoopApp() {
  const [screen, setScreen] = useState<Screen>('login');
  const [role, setRole] = useState<Role>('donor');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    // Authenticate default role so initial API requests succeed
    authApi.demoLogin('donor').catch(() => {});
  }, []);

  const setRoleAndHome = (r: Role) => {
    setRole(r);
    setScreen(`${r}-overview`);
    authApi.demoLogin(r).catch(() => {});
    notify(`Switched to ${roleMeta[r].label}`);
  };

  // Content switcher
  const content = useMemo(() => {
    switch (screen) {
      case 'donor-overview':
        return <DonorOverview setScreen={setScreen} notify={notify} />;
      case 'create-donation':
        return <DonationForm setScreen={setScreen} notify={notify} />;
      case 'donation-details':
        return <DonationDetails setScreen={setScreen} notify={notify} />;
      case 'history':
        return <History role={role} setScreen={setScreen} notify={notify} />;
      case 'ngo-overview':
        return <NgoOverview setScreen={setScreen} notify={notify} />;
      case 'offers':
        return <Offers setScreen={setScreen} notify={notify} />;
      case 'offer-detail':
        return <OfferDetail setScreen={setScreen} notify={notify} />;
      case 'requirements':
        return <Requirements setScreen={setScreen} notify={notify} />;
      case 'volunteer-overview':
        return <VolunteerOverview setScreen={setScreen} notify={notify} />;
      case 'task':
        return <Task setScreen={setScreen} notify={notify} />;
      case 'ops-overview':
        return <OpsOverview setScreen={setScreen} notify={notify} />;
      case 'missions':
        return <Missions setScreen={setScreen} notify={notify} />;
      case 'mission-detail':
        return <MissionDetail setScreen={setScreen} notify={notify} />;
      default:
        return <DonorOverview setScreen={setScreen} notify={notify} />;
    }
  }, [screen, role]);

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
            onChange={(e) => {
              const target = e.target.value;
              setScreen(target);
              if (target.startsWith('donor') || target === 'create-donation' || target === 'donation-details') {
                setRole('donor');
                authApi.demoLogin('donor').catch(() => {});
                notify(`Navigated to Donor: ${target}`);
              } else if (target.startsWith('ngo') || target === 'offers' || target === 'offer-detail' || target === 'requirements') {
                setRole('ngo');
                authApi.demoLogin('ngo').catch(() => {});
                notify(`Navigated to NGO: ${target}`);
              } else if (target.startsWith('volunteer') || target === 'task') {
                setRole('volunteer');
                authApi.demoLogin('volunteer').catch(() => {});
                notify(`Navigated to Volunteer: ${target}`);
              } else if (target.startsWith('ops') || target === 'missions' || target === 'mission-detail') {
                setRole('ops');
                authApi.demoLogin('ops').catch(() => {});
                notify(`Navigated to Operations: ${target}`);
              } else {
                notify(`Navigated to: ${target}`);
              }
            }}
          >
            <option value="login">🔐 Portal Landing / Login</option>
            <optgroup label="🏢 Donor Screens">
              <option value="donor-overview">Donor Overview</option>
              <option value="create-donation">➕ Create Donation Form</option>
              <option value="donation-details">📋 Batch RL-00124 Details</option>
              <option value="history">📑 Donation History & Tax Receipts</option>
            </optgroup>
            <optgroup label="🤝 NGO Screens">
              <option value="ngo-overview">NGO Overview</option>
              <option value="offers">📦 Incoming Offers</option>
              <option value="offer-detail">🔍 Review & Accept Offer (RL-00128)</option>
              <option value="requirements">⚙️ Intake Capacity & Preferences</option>
            </optgroup>
            <optgroup label="🛵 Volunteer Screens">
              <option value="volunteer-overview">Volunteer Dashboard</option>
              <option value="task">🗺️ Active Mission & Route (RL-00124)</option>
            </optgroup>
            <optgroup label="🛰️ Operations Screens">
              <option value="ops-overview">Operations Network Telemetry</option>
              <option value="missions">📊 Central Mission Control Queue</option>
              <option value="mission-detail">🔬 Mission Details & Audit (RL-00124)</option>
            </optgroup>
          </select>
        </div>
      </div>
    </>
  );
}
