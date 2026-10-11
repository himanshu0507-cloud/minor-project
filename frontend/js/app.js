const { useState, useEffect } = React;

// Main Application Component
function App() {
  const [lang, setLang] = useState(localStorage.getItem("smart_fert_lang") || "en");
  const [activeTab, setActiveTab] = useState("predictor"); // 'predictor', 'book', 'my_appts', 'history', 'admin', 'auth'
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("smart_fert_user") || "null"));
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'register'
  const [authRole, setAuthRole] = useState("farmer"); // 'farmer' or 'admin'

  // Form State for Fertilizer Prediction
  const [formData, setFormData] = useState({
    crop_type: "Wheat",
    nitrogen: 80,
    phosphorus: 35,
    potassium: 35,
    soil_ph: 6.5,
    temperature: 24,
    humidity: 65
  });
  const [predictionResult, setPredictionResult] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Form State for Appointment Booking
  const [apptForm, setApptForm] = useState({
    farmer_name: "",
    contact_number: "",
    location: "",
    preferred_date: "",
    farm_size_acres: "3.5",
    soil_type: "Black Cotton Soil"
  });
  const [bookedSuccess, setBookedSuccess] = useState(null);
  const [isBooking, setIsBooking] = useState(false);

  // Lists and tracking
  const [myAppointments, setMyAppointments] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [adminAppointments, setAdminAppointments] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminFilter, setAdminFilter] = useState("All");
  const [recentNotifications, setRecentNotifications] = useState([]);
  
  // Status Update Modal State
  const [editingAppt, setEditingAppt] = useState(null);
  const [updateStatusVal, setUpdateStatusVal] = useState("Approved");
  const [adminNotesVal, setAdminNotesVal] = useState("");
  const [assignedDateVal, setAssignedDateVal] = useState("");

  // Toast notification
  const [toast, setToast] = useState(null);

  const t = window.I18N_DATA[lang] || window.I18N_DATA["en"];

  // Helper for toast messages
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Switch Language
  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem("smart_fert_lang", newLang);
  };

  // Sync user changes to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("smart_fert_user", JSON.stringify(user));
      if (user.role === "admin" && activeTab !== "admin") {
        setActiveTab("admin");
      }
    } else {
      localStorage.removeItem("smart_fert_user");
    }
  }, [user]);

  // Load appointments/history whenever relevant tab opens
  useEffect(() => {
    if (activeTab === "my_appts" && user) {
      fetchMyAppointments();
    } else if (activeTab === "history" && user) {
      fetchHistory();
    } else if (activeTab === "admin") {
      fetchAdminData();
    }
  }, [activeTab, user, adminFilter]);

  // Re-render Lucide icons
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  // API: Fetch My Appointments
  const fetchMyAppointments = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/appointments/my?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setMyAppointments(data.appointments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // API: Fetch History
  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/history?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.history);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // API: Fetch Admin Data
  const fetchAdminData = async () => {
    try {
      const query = adminFilter !== "All" ? `?status=${encodeURIComponent(adminFilter)}` : "";
      const res1 = await fetch(`/api/admin/appointments${query}`);
      const data1 = await res1.json();
      if (data1.success) {
        setAdminAppointments(data1.appointments);
      }

      const res2 = await fetch(`/api/admin/stats`);
      const data2 = await res2.json();
      if (data2.success) {
        setAdminStats(data2.stats);
        setRecentNotifications(data2.recent_notifications || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Preset soil values
  const applyPreset = (presetName) => {
    if (presetName === "wheat") {
      setFormData({ crop_type: "Wheat", nitrogen: 75, phosphorus: 30, potassium: 35, soil_ph: 6.8, temperature: 22, humidity: 60 });
    } else if (presetName === "rice") {
      setFormData({ crop_type: "Rice", nitrogen: 50, phosphorus: 20, potassium: 30, soil_ph: 6.2, temperature: 29, humidity: 82 });
    } else if (presetName === "cotton") {
      setFormData({ crop_type: "Cotton", nitrogen: 60, phosphorus: 25, potassium: 20, soil_ph: 7.6, temperature: 31, humidity: 55 });
    } else if (presetName === "sugarcane") {
      setFormData({ crop_type: "Sugarcane", nitrogen: 80, phosphorus: 30, potassium: 45, soil_ph: 6.6, temperature: 32, humidity: 75 });
    }
    showToast(`Loaded preset for ${presetName.toUpperCase()}`);
  };

  // Handle Predict
  const handlePredict = async (e) => {
    e.preventDefault();
    setIsPredicting(true);
    try {
      const payload = {
        ...formData,
        user_id: user ? user.id : null
      };
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setPredictionResult(data);
        showToast("Fertilizer recommendation generated!", "success");
      } else {
        showToast(data.message || "Failed to generate prediction", "error");
      }
    } catch (err) {
      showToast("Network error connecting to AI service", "error");
    } finally {
      setIsPredicting(false);
    }
  };

  // Handle Book Appointment
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setIsBooking(true);
    try {
      const payload = {
        ...apptForm,
        user_id: user ? user.id : null
      };
      const res = await fetch("/api/book-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setBookedSuccess(data);
        showToast(t.appt_success_title, "success");
        setApptForm({
          farmer_name: user ? user.name : "",
          contact_number: user ? user.phone : "",
          location: user ? user.location : "",
          preferred_date: "",
          farm_size_acres: "3.5",
          soil_type: "Standard Loam"
        });
      } else {
        showToast(data.message || "Booking failed", "error");
      }
    } catch (err) {
      showToast("Network error submitting appointment", "error");
    } finally {
      setIsBooking(false);
    }
  };

  // Handle Admin Status Update
  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!editingAppt) return;
    try {
      const res = await fetch("/api/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: editingAppt.id,
          status: updateStatusVal,
          admin_notes: adminNotesVal,
          assigned_date: assignedDateVal || editingAppt.preferred_date
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setEditingAppt(null);
        fetchAdminData();
      } else {
        showToast(data.message || "Status update failed", "error");
      }
    } catch (err) {
      showToast("Network error updating status", "error");
    }
  };

  // Handle Auth (Login / Register)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;

    if (authMode === "login") {
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          showToast(`Welcome back, ${data.user.name}!`);
          setActiveTab(data.user.role === "admin" ? "admin" : "predictor");
        } else {
          showToast(data.message || "Login failed", "error");
        }
      } catch (err) {
        showToast("Error during login", "error");
      }
    } else {
      const name = form.name.value;
      const phone = form.phone.value;
      const location = form.location.value;
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone, password, role: authRole, location, language: lang })
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          showToast("Registration successful!");
          setActiveTab(data.user.role === "admin" ? "admin" : "predictor");
        } else {
          showToast(data.message || "Registration failed", "error");
        }
      } catch (err) {
        showToast("Error during registration", "error");
      }
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full badge-pending">{t.status_pending}</span>;
      case "Approved":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full badge-approved">{t.status_approved}</span>;
      case "Sample Collected":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full badge-collected">{t.status_sample_collected}</span>;
      case "Testing In Progress":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full badge-testing">{t.status_testing}</span>;
      case "Completed":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full badge-completed">{t.status_completed}</span>;
      case "Rejected":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full badge-rejected">{t.status_rejected}</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-lg shadow-xl text-white font-medium flex items-center gap-3 transition-all ${toast.type === 'error' ? 'bg-red-600' : 'bg-agri-700'}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="glass-header sticky top-0 z-40 px-4 lg:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("predictor")}>
            <div className="w-10 h-10 rounded-xl bg-agri-700 text-white flex items-center justify-center text-xl shadow-md font-bold">
              🌱
            </div>
            <div>
              <h1 className="text-lg font-bold text-agri-900 leading-tight">{t.app_title}</h1>
              <p className="text-xs text-agri-700 font-medium hidden sm:block">{t.app_tagline}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab("predictor")}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${activeTab === 'predictor' ? 'bg-agri-700 text-white' : 'text-gray-700 hover:bg-agri-100'}`}
            >
              🌾 {t.nav_home}
            </button>
            <button
              onClick={() => setActiveTab("book")}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${activeTab === 'book' ? 'bg-agri-700 text-white' : 'text-gray-700 hover:bg-agri-100'}`}
            >
              🧪 {t.nav_book}
            </button>
            {user && (
              <>
                <button
                  onClick={() => setActiveTab("my_appts")}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${activeTab === 'my_appts' ? 'bg-agri-700 text-white' : 'text-gray-700 hover:bg-agri-100'}`}
                >
                  📋 {t.nav_appointments}
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${activeTab === 'history' ? 'bg-agri-700 text-white' : 'text-gray-700 hover:bg-agri-100'}`}
                >
                  📜 {t.nav_history}
                </button>
              </>
            )}
            {user && user.role === "admin" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${activeTab === 'admin' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'}`}
              >
                🛡️ {t.nav_admin}
              </button>
            )}
          </nav>

          {/* Right Controls: Language Switcher & Auth */}
          <div className="flex items-center gap-2.5">
            {/* Language Dropdown / Buttons */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
              <button
                onClick={() => changeLanguage("en")}
                className={`px-2 py-1 rounded-md font-medium ${lang === 'en' ? 'bg-white shadow text-agri-800 font-bold' : 'text-gray-600'}`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage("hi")}
                className={`px-2 py-1 rounded-md font-medium ${lang === 'hi' ? 'bg-white shadow text-agri-800 font-bold' : 'text-gray-600'}`}
              >
                हिंदी
              </button>
              <button
                onClick={() => changeLanguage("mr")}
                className={`px-2 py-1 rounded-md font-medium ${lang === 'mr' ? 'bg-white shadow text-agri-800 font-bold' : 'text-gray-600'}`}
              >
                मराठी
              </button>
            </div>

            {/* Auth Profile / Login */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-gray-800">{user.name}</span>
                  <span className="text-[10px] text-agri-700 font-bold uppercase tracking-wider">{user.role}</span>
                </div>
                <button
                  onClick={() => { setUser(null); setActiveTab("predictor"); showToast("Logged out successfully"); }}
                  className="px-2.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 font-medium"
                >
                  {t.nav_logout}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab("auth")}
                className="px-3.5 py-1.5 text-xs sm:text-sm bg-agri-700 text-white rounded-lg hover:bg-agri-800 font-medium shadow-sm"
              >
                🔑 {t.nav_login}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* ==================================================== */}
        {/* TAB 1: FERTILIZER PREDICTOR */}
        {/* ==================================================== */}
        {activeTab === "predictor" && (
          <div className="space-y-8">
            {/* Banner: If farmer DOES NOT have soil values */}
            <div className="bg-gradient-to-r from-emerald-700 via-agri-800 to-teal-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-5 border border-emerald-600">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0">
                  🧪
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">{t.no_soil_data_prompt}</h3>
                  <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                    No problem! Our certified agricultural technician can visit your field, collect samples, and perform lab testing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("book")}
                className="w-full md:w-auto px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-sm rounded-xl shadow-md transition transform hover:-translate-y-0.5 shrink-0"
              >
                📅 {t.no_soil_data_btn}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Column */}
              <div className="lg:col-span-6 space-y-6">
                <div className="glass-card rounded-2xl p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-900">{t.form_heading}</h2>
                    <span className="text-xs bg-agri-100 text-agri-800 font-bold px-2.5 py-1 rounded-full">AI Random Forest</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-6">{t.form_subheading}</p>

                  {/* Preset quick test buttons */}
                  <div className="mb-6 p-3 bg-agri-50/70 border border-agri-200 rounded-xl">
                    <span className="text-xs font-semibold text-agri-900 block mb-2">⚡ Quick Presets:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => applyPreset("wheat")}
                        className="px-2.5 py-1 text-xs bg-white text-agri-800 rounded-md border border-agri-200 hover:bg-agri-100 font-medium"
                      >
                        🌾 Wheat (Loam)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset("rice")}
                        className="px-2.5 py-1 text-xs bg-white text-agri-800 rounded-md border border-agri-200 hover:bg-agri-100 font-medium"
                      >
                        🍚 Rice (Wetland)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset("cotton")}
                        className="px-2.5 py-1 text-xs bg-white text-agri-800 rounded-md border border-agri-200 hover:bg-agri-100 font-medium"
                      >
                        🌿 Cotton (Black Soil)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset("sugarcane")}
                        className="px-2.5 py-1 text-xs bg-white text-agri-800 rounded-md border border-agri-200 hover:bg-agri-100 font-medium"
                      >
                        🎋 Sugarcane
                      </button>
                    </div>
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handlePredict} className="space-y-4">
                    {/* Crop Type */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        {t.crop_label} *
                      </label>
                      <select
                        value={formData.crop_type}
                        onChange={(e) => setFormData({ ...formData, crop_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 focus:bg-white outline-none transition"
                        required
                      >
                        <option value="Wheat">🌾 Wheat (गेंहू / गहू)</option>
                        <option value="Rice">🍚 Rice (चावल / भात)</option>
                        <option value="Maize">🌽 Maize (मक्का / मका)</option>
                        <option value="Cotton">🌿 Cotton (कपास / कापूस)</option>
                        <option value="Sugarcane">🎋 Sugarcane (गन्ना / ऊस)</option>
                        <option value="Tomato">🍅 Tomato (टमाटर / टोमॅटो)</option>
                        <option value="Potato">🥔 Potato (आलू / बटाटा)</option>
                        <option value="Groundnut">🥜 Groundnut (मूंगफली / भुईमूग)</option>
                        <option value="Pulses">🥣 Pulses (दालें / डाळी)</option>
                        <option value="Soybean">🌱 Soybean (सोयाबीन)</option>
                        <option value="Coffee">☕ Coffee (कॉफी)</option>
                        <option value="Tea">🍵 Tea (चाय / चहा)</option>
                      </select>
                    </div>

                    {/* N, P, K in 3 columns */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          {t.nitrogen_label}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.nitrogen}
                          onChange={(e) => setFormData({ ...formData, nitrogen: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-agri-500 outline-none"
                          placeholder="e.g. 75"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          {t.phosphorus_label}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.phosphorus}
                          onChange={(e) => setFormData({ ...formData, phosphorus: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-agri-500 outline-none"
                          placeholder="e.g. 35"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          {t.potassium_label}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.potassium}
                          onChange={(e) => setFormData({ ...formData, potassium: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-agri-500 outline-none"
                          placeholder="e.g. 40"
                          required
                        />
                      </div>
                    </div>

                    {/* Soil pH */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-gray-700">
                          {t.ph_label} *
                        </label>
                        <span className="text-xs font-bold text-agri-800 bg-agri-100 px-2 py-0.5 rounded">
                          {formData.soil_ph} ({formData.soil_ph < 6 ? "Acidic" : formData.soil_ph > 7.5 ? "Alkaline" : "Neutral/Optimal"})
                        </span>
                      </div>
                      <input
                        type="range"
                        min="4.0"
                        max="9.5"
                        step="0.1"
                        value={formData.soil_ph}
                        onChange={(e) => setFormData({ ...formData, soil_ph: parseFloat(e.target.value) })}
                        className="w-full accent-agri-700 h-2 bg-gray-200 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 px-0.5 mt-1">
                        <span>4.0 (Very Acidic)</span>
                        <span>7.0 (Neutral)</span>
                        <span>9.5 (Alkaline)</span>
                      </div>
                    </div>

                    {/* Optional Temperature & Humidity */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t.temp_label}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.temperature}
                          onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                          placeholder="26"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t.humidity_label}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.humidity}
                          onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                          placeholder="65"
                        />
                      </div>
                    </div>

                    {/* Submit & Reset buttons */}
                    <div className="pt-4 flex gap-3">
                      <button
                        type="submit"
                        disabled={isPredicting}
                        className="flex-1 py-3 px-4 btn-agri rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
                      >
                        {isPredicting ? "Analyzing Soil..." : `🌱 ${t.btn_predict}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ crop_type: "Wheat", nitrogen: 0, phosphorus: 0, potassium: 0, soil_ph: 6.5, temperature: 25, humidity: 60 });
                          setPredictionResult(null);
                        }}
                        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                      >
                        {t.btn_clear}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Result Column */}
              <div className="lg:col-span-6 space-y-6">
                {predictionResult ? (
                  <div className="glass-card rounded-2xl p-6 sm:p-8 border-2 border-agri-500 shadow-xl space-y-6">
                    {/* Header with confidence */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-agri-700 tracking-wider uppercase">
                          {t.result_title}
                        </span>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">
                          {predictionResult.recommended_fertilizer}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-gray-500 block">{t.confidence_score}</span>
                        <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          {predictionResult.confidence}%
                        </span>
                      </div>
                    </div>

                    {/* Dosage Highlights */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-agri-50/80 rounded-xl border border-agri-200">
                      <div>
                        <span className="text-xs text-gray-600 block">{t.dosage_level}</span>
                        <span className={`text-base font-bold ${
                          predictionResult.dosage.level === 'High' ? 'text-amber-700' :
                          predictionResult.dosage.level === 'Medium' ? 'text-agri-800' : 'text-blue-700'
                        }`}>
                          {predictionResult.dosage.level} Dosage
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600 block">{t.dosage_rate}</span>
                        <span className="text-base font-bold text-gray-900">
                          {predictionResult.dosage.kg_acre} kg / acre
                        </span>
                      </div>
                      <div className="col-span-2 text-xs text-gray-700 italic border-t border-agri-200/60 pt-2">
                        {predictionResult.dosage.description}
                      </div>
                    </div>

                    {/* Suggested Alternative Crops */}
                    <div>
                      <span className="text-xs font-bold text-gray-700 block mb-2">
                        🌾 {t.suggested_crops}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {predictionResult.suggested_crops.map((crop, idx) => (
                          <span key={idx} className="px-3 py-1 bg-amber-50 text-amber-900 text-xs font-semibold rounded-lg border border-amber-200">
                            ✓ {crop}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Nutrient Status Gauges */}
                    <div>
                      <span className="text-xs font-bold text-gray-700 block mb-2">
                        📊 {t.soil_health_assessment}
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <span className="block text-gray-500 font-medium">Nitrogen</span>
                          <span className={`font-bold ${predictionResult.nutrient_analysis.nitrogen_status === 'Deficient' ? 'text-red-600' : 'text-emerald-700'}`}>
                            {predictionResult.nutrient_analysis.nitrogen_status}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <span className="block text-gray-500 font-medium">Phosphorus</span>
                          <span className={`font-bold ${predictionResult.nutrient_analysis.phosphorus_status === 'Deficient' ? 'text-red-600' : 'text-emerald-700'}`}>
                            {predictionResult.nutrient_analysis.phosphorus_status}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <span className="block text-gray-500 font-medium">Potassium</span>
                          <span className={`font-bold ${predictionResult.nutrient_analysis.potassium_status === 'Deficient' ? 'text-red-600' : 'text-emerald-700'}`}>
                            {predictionResult.nutrient_analysis.potassium_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Soil Health Notes */}
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                      <span className="text-xs font-bold text-blue-900 block">Agronomist Recommendation:</span>
                      {predictionResult.nutrient_analysis.soil_health_notes.map((note, idx) => (
                        <p key={idx} className="text-xs text-blue-800 leading-relaxed">• {note}</p>
                      ))}
                    </div>

                    {/* Print/Save Advice button */}
                    <button
                      onClick={() => window.print()}
                      className="w-full py-2.5 border border-agri-600 text-agri-700 hover:bg-agri-50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      🖨️ {t.btn_download_report}
                    </button>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[420px] text-gray-500 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-agri-100 text-agri-700 flex items-center justify-center text-4xl">
                      🌱
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Your AI Recommendation Will Appear Here</h3>
                    <p className="text-xs text-gray-500 max-w-sm">
                      Fill in the soil parameters (N, P, K, pH) and select your target crop on the left, then click <strong>"Predict Fertilizer"</strong>.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => applyPreset("wheat")}
                        className="text-xs text-agri-700 font-bold hover:underline"
                      >
                        → Click here to load sample wheat soil values
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: BOOK SOIL TESTING APPOINTMENT */}
        {/* ==================================================== */}
        {activeTab === "book" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-md">
              <div className="text-center mb-6">
                <span className="text-3xl block mb-2">🚜</span>
                <h2 className="text-2xl font-bold text-gray-900">{t.appt_title}</h2>
                <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto">{t.appt_subheading}</p>
              </div>

              {bookedSuccess ? (
                <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-2xl text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center text-2xl mx-auto shadow-md">
                    ✓
                  </div>
                  <h3 className="text-lg font-bold text-emerald-900">{t.appt_success_title}</h3>
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 inline-block">
                    <span className="text-xs text-gray-500 block">{t.tracking_id_label}</span>
                    <span className="text-xl font-mono font-black text-emerald-800">{bookedSuccess.tracking_id}</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                    A field technician will be assigned to visit your location. You will receive an SMS and email notification upon approval.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setBookedSuccess(null);
                        if (user) setActiveTab("my_appts");
                      }}
                      className="px-5 py-2.5 bg-agri-700 hover:bg-agri-800 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                      {user ? "View in My Appointments" : "Book Another"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookAppointment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {t.farmer_name_label} *
                    </label>
                    <input
                      type="text"
                      value={apptForm.farmer_name}
                      onChange={(e) => setApptForm({ ...apptForm, farmer_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                      placeholder="e.g. Ramesh Patil"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        {t.contact_label} *
                      </label>
                      <input
                        type="tel"
                        value={apptForm.contact_number}
                        onChange={(e) => setApptForm({ ...apptForm, contact_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                        placeholder="+91-9822012345"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        {t.preferred_date_label} *
                      </label>
                      <input
                        type="date"
                        value={apptForm.preferred_date}
                        onChange={(e) => setApptForm({ ...apptForm, preferred_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {t.location_label} *
                    </label>
                    <input
                      type="text"
                      value={apptForm.location}
                      onChange={(e) => setApptForm({ ...apptForm, location: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                      placeholder="Village Name, Tehsil / Taluka, District, PIN code"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        {t.farm_size_label}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={apptForm.farm_size_acres}
                        onChange={(e) => setApptForm({ ...apptForm, farm_size_acres: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                        placeholder="3.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        {t.soil_type_label}
                      </label>
                      <select
                        value={apptForm.soil_type}
                        onChange={(e) => setApptForm({ ...apptForm, soil_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                      >
                        <option value="Black Cotton Soil">Black Cotton Soil (काळी माती)</option>
                        <option value="Alluvial Soil">Alluvial Soil (गाळाची माती)</option>
                        <option value="Red / Laterite Soil">Red / Laterite Soil (तांबडी माती)</option>
                        <option value="Sandy Loam">Sandy Loam (वालुकामय पोयटा)</option>
                        <option value="Clayey Loam">Clayey Loam (चिकण माती)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isBooking}
                      className="w-full py-3.5 btn-agri rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
                    >
                      {isBooking ? "Submitting..." : `📋 ${t.btn_submit_appt}`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: MY APPOINTMENTS */}
        {/* ==================================================== */}
        {activeTab === "my_appts" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.nav_appointments}</h2>
                <p className="text-xs text-gray-600">Track real-time status of your soil testing requests.</p>
              </div>
              <button
                onClick={() => setActiveTab("book")}
                className="px-3.5 py-2 bg-agri-700 text-white rounded-xl text-xs font-bold hover:bg-agri-800 transition"
              >
                + Book New
              </button>
            </div>

            {myAppointments.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-gray-500">
                <span className="text-3xl block mb-2">📋</span>
                <p className="text-sm font-medium">No appointment requests found.</p>
                <button
                  onClick={() => setActiveTab("book")}
                  className="mt-3 text-xs text-agri-700 font-bold hover:underline"
                >
                  Book your first soil testing appointment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myAppointments.map((appt) => (
                  <div key={appt.id} className="glass-card rounded-2xl p-5 space-y-3 border border-agri-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-agri-800 block">
                          {appt.tracking_id}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 mt-0.5">{appt.farmer_name}</h4>
                      </div>
                      <div>{renderStatusBadge(appt.status)}</div>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1 border-t border-gray-100 pt-2">
                      <p><strong>📍 Location:</strong> {appt.location}</p>
                      <p><strong>📅 Requested:</strong> {appt.preferred_date}</p>
                      {appt.assigned_date && (
                        <p className="text-emerald-700 font-semibold">
                          <strong>🗓️ Assigned Visit:</strong> {appt.assigned_date}
                        </p>
                      )}
                      <p><strong>🌱 Soil Type:</strong> {appt.soil_type || "General"}</p>
                    </div>

                    {appt.admin_notes && (
                      <div className="p-2.5 bg-gray-50 rounded-lg text-xs text-gray-700 border border-gray-200">
                        <span className="font-semibold block text-[11px] text-gray-500">Admin/Technician Remarks:</span>
                        {appt.admin_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: RECOMMENDATION HISTORY */}
        {/* ==================================================== */}
        {activeTab === "history" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t.nav_history}</h2>
              <p className="text-xs text-gray-600">Review your past soil nutrient inputs and fertilizer recommendations.</p>
            </div>

            {historyList.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-gray-500">
                <span className="text-3xl block mb-2">📜</span>
                <p className="text-sm font-medium">No previous recommendations recorded yet.</p>
                <button
                  onClick={() => setActiveTab("predictor")}
                  className="mt-3 text-xs text-agri-700 font-bold hover:underline"
                >
                  Generate your first recommendation now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {historyList.map((item) => (
                  <div key={item.id} className="glass-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-agri-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900">{item.crop_type}</span>
                        <span className="text-xs bg-agri-100 text-agri-800 font-bold px-2 py-0.5 rounded">
                          {item.recommended_fertilizer}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">
                          ({item.dosage_level} - {item.dosage_kg_acre} kg/acre)
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-x-4">
                        <span>N: {item.nitrogen}</span>
                        <span>P: {item.phosphorus}</span>
                        <span>K: {item.potassium}</span>
                        <span>pH: {item.soil_ph}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: ADMIN PORTAL */}
        {/* ==================================================== */}
        {activeTab === "admin" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t.admin_title}</h2>
                <p className="text-xs text-gray-600">{t.admin_subheading}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAdminData}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Admin Metric Cards */}
            {adminStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card rounded-xl p-4 border-l-4 border-l-agri-700">
                  <span className="text-xs text-gray-500 font-medium block">{t.stat_total_appts}</span>
                  <span className="text-2xl font-black text-gray-900">{adminStats.total_appointments}</span>
                </div>
                <div className="glass-card rounded-xl p-4 border-l-4 border-l-amber-500">
                  <span className="text-xs text-gray-500 font-medium block">{t.stat_pending}</span>
                  <span className="text-2xl font-black text-amber-600">{adminStats.pending_appointments}</span>
                </div>
                <div className="glass-card rounded-xl p-4 border-l-4 border-l-blue-600">
                  <span className="text-xs text-gray-500 font-medium block">{t.stat_approved}</span>
                  <span className="text-2xl font-black text-blue-700">{adminStats.approved_appointments}</span>
                </div>
                <div className="glass-card rounded-xl p-4 border-l-4 border-l-emerald-600">
                  <span className="text-xs text-gray-500 font-medium block">{t.stat_completed}</span>
                  <span className="text-2xl font-black text-emerald-700">{adminStats.completed_appointments}</span>
                </div>
              </div>
            )}

            {/* Appointments Management Table */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-md">
              {/* Filter Tabs */}
              <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-900">Soil Testing Requests</h3>
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  {["All", "Pending", "Approved", "Sample Collected", "Completed", "Rejected"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setAdminFilter(f)}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        adminFilter === f ? 'bg-agri-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/70 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b">
                    <tr>
                      <th className="p-3.5">Tracking ID</th>
                      <th className="p-3.5">{t.table_farmer}</th>
                      <th className="p-3.5">{t.table_location}</th>
                      <th className="p-3.5">{t.table_date}</th>
                      <th className="p-3.5">{t.table_status}</th>
                      <th className="p-3.5 text-right">{t.table_actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adminAppointments.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-400">
                          No appointments found for filter "{adminFilter}".
                        </td>
                      </tr>
                    ) : (
                      adminAppointments.map((appt) => (
                        <tr key={appt.id} className="hover:bg-agri-50/40 transition">
                          <td className="p-3.5 font-mono font-bold text-agri-900">{appt.tracking_id}</td>
                          <td className="p-3.5 font-medium">
                            <span className="font-bold text-gray-900 block">{appt.farmer_name}</span>
                            <span className="text-gray-500 text-[11px]">{appt.contact_number}</span>
                          </td>
                          <td className="p-3.5 text-gray-700 max-w-[180px] truncate" title={appt.location}>
                            {appt.location}
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold block">{appt.preferred_date}</span>
                            {appt.assigned_date && (
                              <span className="text-[10px] text-emerald-700 font-bold">
                                Assigned: {appt.assigned_date}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">{renderStatusBadge(appt.status)}</td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setEditingAppt(appt);
                                setUpdateStatusVal(appt.status === "Pending" ? "Approved" : appt.status);
                                setAdminNotesVal(appt.admin_notes || "");
                                setAssignedDateVal(appt.assigned_date || appt.preferred_date);
                              }}
                              className="px-2.5 py-1.5 bg-agri-700 hover:bg-agri-800 text-white rounded-lg font-bold text-xs shadow-sm transition"
                            >
                              ⚙️ {t.btn_update}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notification Dispatch Audit Log */}
            <div className="glass-card rounded-2xl p-6 shadow-md">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>🔔</span> {t.notif_audit_title}
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {recentNotifications.length === 0 ? (
                  <p className="text-xs text-gray-400">No notification logs recorded yet.</p>
                ) : (
                  recentNotifications.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${n.channel === 'SMS' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {n.channel}
                          </span>
                          <span className="font-semibold text-gray-800">{n.recipient}</span>
                        </div>
                        <p className="text-gray-600 text-[11px]">{n.message_content}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {n.sent_at ? new Date(n.sent_at).toLocaleTimeString() : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: ADMIN STATUS UPDATE */}
        {/* ==================================================== */}
        {editingAppt && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-200">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-gray-900">{t.modal_update_title}</h3>
                <button onClick={() => setEditingAppt(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">
                  ✕
                </button>
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                <p><strong>Tracking ID:</strong> {editingAppt.tracking_id}</p>
                <p><strong>Farmer:</strong> {editingAppt.farmer_name} ({editingAppt.contact_number})</p>
                <p><strong>Location:</strong> {editingAppt.location}</p>
              </div>

              <form onSubmit={handleUpdateStatusSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t.table_status} *</label>
                  <select
                    value={updateStatusVal}
                    onChange={(e) => setUpdateStatusVal(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-agri-500 outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved (Technician Scheduled)</option>
                    <option value="Sample Collected">Sample Collected</option>
                    <option value="Testing In Progress">Testing In Progress</option>
                    <option value="Completed">Completed (Report Ready)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t.assign_date_label}</label>
                  <input
                    type="date"
                    value={assignedDateVal}
                    onChange={(e) => setAssignedDateVal(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-agri-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t.admin_notes_label}</label>
                  <textarea
                    rows="3"
                    value={adminNotesVal}
                    onChange={(e) => setAdminNotesVal(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-agri-500 outline-none"
                    placeholder="Instructions for farmer or technician..."
                  ></textarea>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAppt(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 btn-agri text-white text-xs font-bold rounded-xl shadow"
                  >
                    Save & Dispatch Alert
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 6: AUTHENTICATION (LOGIN / REGISTER) */}
        {/* ==================================================== */}
        {activeTab === "auth" && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-lg">
              {/* Role Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl mb-6 text-xs font-bold">
                <button
                  onClick={() => setAuthRole("farmer")}
                  className={`flex-1 py-2 rounded-lg transition ${authRole === 'farmer' ? 'bg-agri-700 text-white shadow' : 'text-gray-600'}`}
                >
                  🌾 Farmer Portal
                </button>
                <button
                  onClick={() => setAuthRole("admin")}
                  className={`flex-1 py-2 rounded-lg transition ${authRole === 'admin' ? 'bg-amber-600 text-white shadow' : 'text-gray-600'}`}
                >
                  🛡️ Admin Access
                </button>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {authMode === "login" ? `${authRole === 'admin' ? 'Admin' : 'Farmer'} Login` : 'Farmer Registration'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {authMode === "login" ? "Access your saved soil tests and recommendations" : "Create an account to track your crops"}
                </p>
              </div>

              {/* Quick Fill Admin Button */}
              {authRole === "admin" && (
                <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-amber-900 font-medium">Demo Admin Credentials:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const form = document.getElementById("auth-form");
                      if (form) {
                        form.email.value = "admin@kisan.gov.in";
                        form.password.value = "admin123";
                      }
                      showToast("Pre-filled admin credentials");
                    }}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-[11px]"
                  >
                    Auto Fill
                  </button>
                </div>
              )}

              {/* Quick Fill Farmer Demo Button */}
              {authRole === "farmer" && authMode === "login" && (
                <div className="mb-4 p-2.5 bg-agri-50 border border-agri-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-agri-900 font-medium">Demo Farmer:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const form = document.getElementById("auth-form");
                      if (form) {
                        form.email.value = "farmer@kisan.gov.in";
                        form.password.value = "farmer123";
                      }
                      showToast("Pre-filled demo farmer credentials");
                    }}
                    className="px-2.5 py-1 bg-agri-700 hover:bg-agri-800 text-white rounded-md font-bold text-[11px]"
                  >
                    Auto Fill
                  </button>
                </div>
              )}

              <form id="auth-form" onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === "register" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                      <input
                        name="name"
                        type="text"
                        required
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                        placeholder="e.g. Ramesh Patel"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                      <input
                        name="phone"
                        type="tel"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                        placeholder="+91-9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Farm Location</label>
                      <input
                        name="location"
                        type="text"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                        placeholder="Village, District"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Password *</label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-agri-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-md transition ${
                      authRole === 'admin' ? 'bg-amber-600 hover:bg-amber-700' : 'btn-agri'
                    }`}
                  >
                    {authMode === "login" ? "Sign In" : "Create Account"}
                  </button>
                </div>
              </form>

              {authRole === "farmer" && (
                <div className="text-center pt-4 text-xs text-gray-600">
                  {authMode === "login" ? (
                    <p>
                      New farmer?{" "}
                      <button onClick={() => setAuthMode("register")} className="text-agri-700 font-bold hover:underline">
                        Register here
                      </button>
                    </p>
                  ) : (
                    <p>
                      Already have an account?{" "}
                      <button onClick={() => setAuthMode("login")} className="text-agri-700 font-bold hover:underline">
                        Sign in
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="glass-header border-t border-agri-200 mt-12 py-6 text-center text-xs text-gray-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-agri-900">
            <span>🌱 Smart Fertilizer Recommendation System</span>
          </div>
          <p className="text-gray-500 text-[11px]">
            Powered by Scikit-Learn Random Forest Classifier & Agricultural Science. Made for Indian Farmers.
          </p>
          <div className="flex items-center gap-4 text-agri-700 font-medium">
            <span className="cursor-pointer hover:underline" onClick={() => setActiveTab("predictor")}>{t.nav_home}</span>
            <span className="cursor-pointer hover:underline" onClick={() => setActiveTab("book")}>{t.nav_book}</span>
            <span className="cursor-pointer hover:underline" onClick={() => { setAuthRole("admin"); setActiveTab("auth"); }}>Admin</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Render into root DOM element
ReactDOM.render(<App />, document.getElementById("root"));
