import React, { useState, useEffect } from 'react';
import './App.css';

// ============= CONTEXT =============
const AuthContext = React.createContext();

// ============= AUTH PROVIDER =============
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (err) {
      console.error('Token verify error:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============= PAGES =============

// LOGIN SAYFASI
function LoginPage({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await fetch(`${process.env.REACT_APP_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (res.ok) {
        onAuthSuccess(data.user, data.token);
      } else {
        setError(data.message || 'İşlem başarısız oldu');
      }
    } catch (err) {
      setError('Bağlantı hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🥗 Diyet Rehberi</h1>
        <h2>{isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading}>
            {loading ? 'Yükleniyor...' : (isLogin ? 'Giriş Yap' : 'Hesap Oluştur')}
          </button>
        </form>

        <p className="toggle-auth">
          {isLogin ? 'Hesabın yok mu? ' : 'Zaten hesaban var mı? '}
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="link-btn"
          >
            {isLogin ? 'Kaydol' : 'Giriş Yap'}
          </button>
        </p>
      </div>
    </div>
  );
}

// PROFIL AYARLARI SAYFASI
function ProfilePage({ user, token, onProfileUpdate }) {
  const [profile, setProfile] = useState(user?.profile || {
    height: 170,
    weight: 70,
    age: 25,
    gender: 'male',
    activityLevel: 1.5,
    goal: 'lose' // lose, gain, maintain
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const calculateTDEE = () => {
    const { height, weight, age, gender, activityLevel } = profile;
    
    // Harris-Benedict formülü
    let bmr;
    if (gender === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
    
    return Math.round(bmr * activityLevel);
  };

  const calculateBMI = () => {
    const { height, weight } = profile;
    return (weight / ((height / 100) ** 2)).toFixed(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      if (res.ok) {
        const data = await res.json();
        setMessage('✓ Profil güncellendi!');
        onProfileUpdate(data);
      } else {
        setMessage('❌ Güncelleme başarısız oldu');
      }
    } catch (err) {
      setMessage('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const tdee = calculateTDEE();
  const bmi = calculateBMI();
  let calorieTarget = tdee;
  
  if (profile.goal === 'lose') {
    calorieTarget = Math.round(tdee * 0.85); // %15 açık
  } else if (profile.goal === 'gain') {
    calorieTarget = Math.round(tdee * 1.15); // %15 fazla
  }

  return (
    <div className="page-container">
      <h1>Profil Ayarları</h1>
      
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label>Boy (cm)</label>
          <input
            type="number"
            value={profile.height}
            onChange={(e) => setProfile({...profile, height: parseInt(e.target.value)})}
            min="120"
            max="220"
          />
        </div>

        <div className="form-group">
          <label>Kilo (kg)</label>
          <input
            type="number"
            value={profile.weight}
            onChange={(e) => setProfile({...profile, weight: parseInt(e.target.value)})}
            min="30"
            max="200"
            step="0.5"
          />
        </div>

        <div className="form-group">
          <label>Yaş</label>
          <input
            type="number"
            value={profile.age}
            onChange={(e) => setProfile({...profile, age: parseInt(e.target.value)})}
            min="10"
            max="100"
          />
        </div>

        <div className="form-group">
          <label>Cinsiyet</label>
          <select value={profile.gender} onChange={(e) => setProfile({...profile, gender: e.target.value})}>
            <option value="male">Erkek</option>
            <option value="female">Kadın</option>
          </select>
        </div>

        <div className="form-group">
          <label>Aktivite Seviyesi</label>
          <select value={profile.activityLevel} onChange={(e) => setProfile({...profile, activityLevel: parseFloat(e.target.value)})}>
            <option value="1.2">Hareketsiz (çalışma masası işi)</option>
            <option value="1.375">Az Aktif (1-3 gün spor)</option>
            <option value="1.55">Orta Aktif (3-5 gün spor)</option>
            <option value="1.725">Çok Aktif (6-7 gün spor)</option>
            <option value="1.9">Çok Çok Aktif (günde 2 kez spor)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Hedefin</label>
          <select value={profile.goal} onChange={(e) => setProfile({...profile, goal: e.target.value})}>
            <option value="lose">Zayıflama</option>
            <option value="maintain">Kilo Sabitlemek</option>
            <option value="gain">Kilo Alma</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Kaydediliyor...' : 'Profili Güncelle'}
        </button>
      </form>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">BMI</div>
          <div className="stat-value">{bmi}</div>
          <div className="stat-description">
            {bmi < 18.5 ? 'Düşük' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Fazla' : 'Obez'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Günlük Kalori (Bakım)</div>
          <div className="stat-value">{tdee}</div>
          <div className="stat-description">kcal</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Hedef Kalori</div>
          <div className="stat-value">{calorieTarget}</div>
          <div className="stat-description">kcal</div>
        </div>
      </div>

      {message && <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>{message}</div>}
    </div>
  );
}

// DASHBOARD SAYFASI
function DashboardPage({ user, token }) {
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayLog();
  }, []);

  const fetchTodayLog = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodayLog(data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const profile = user?.profile || {};
  const tdee = Math.round(
    (profile.gender === 'male' 
      ? 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * profile.age)
      : 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * profile.age)
    ) * (profile.activityLevel || 1.5)
  );

  const calorieTarget = profile.goal === 'lose' ? Math.round(tdee * 0.85) : tdee;
  const totalCalories = todayLog?.foods?.reduce((sum, f) => sum + (f.calories || 0), 0) || 0;
  const remaining = calorieTarget - totalCalories;

  return (
    <div className="page-container">
      <h1>📊 Günlük Takip</h1>

      <div className="stats-grid">
        <div className="stat-card highlight">
          <div className="stat-label">Günlük Hedef</div>
          <div className="stat-value">{calorieTarget}</div>
          <div className="stat-description">kcal</div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">Tüketilen</div>
          <div className="stat-value" style={{color: totalCalories > calorieTarget ? '#e74c3c' : '#27ae60'}}>
            {totalCalories}
          </div>
          <div className="stat-description">kcal</div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">Kalan</div>
          <div className="stat-value" style={{color: remaining < 0 ? '#e74c3c' : '#3498db'}}>
            {Math.max(0, remaining)}
          </div>
          <div className="stat-description">kcal</div>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{width: `${Math.min(100, (totalCalories / calorieTarget) * 100)}%`}}></div>
      </div>

      <h2>Günün Yemekleri</h2>
      {todayLog?.foods?.length > 0 ? (
        <div className="food-list">
          {todayLog.foods.map((food, idx) => (
            <div key={idx} className="food-item">
              <div className="food-name">{food.name}</div>
              <div className="food-details">
                <span>🔥 {food.calories} kcal</span>
                <span>🥩 {food.protein}g protein</span>
                <span>🧈 {food.fat}g yağ</span>
                <span>🍞 {food.carbs}g karbohidrat</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">Henüz yemek eklenmedi</p>
      )}
    </div>
  );
}

// GIDA ARAMA SAYFASI
function FoodSearchPage({ user, token, onFoodAdded }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [addedFoods, setAddedFoods] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/foods/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ foodDescription: searchTerm })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.nutrition);
      } else {
        const error = await res.json();
        setError(error.message || 'Analiz başarısız oldu');
      }
    } catch (err) {
      setError('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFood = async () => {
    if (!result) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/add-food`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: searchTerm,
          ...result
        })
      });

      if (res.ok) {
        setAddedFoods([...addedFoods, { name: searchTerm, ...result }]);
        setSearchTerm('');
        setResult(null);
        onFoodAdded?.();
      }
    } catch (err) {
      setError('Yemek eklenemedi: ' + err.message);
    }
  };

  return (
    <div className="page-container">
      <h1>🔍 Gıda Arama</h1>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Örn: Tavuk döner pide, 2 dilim ekmek, 1 bardak süt..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? '🔄 Analiz Ediliyor...' : '🔍 Analiz Et'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="food-result-card">
          <h3>{searchTerm}</h3>
          <div className="nutrition-grid">
            <div className="nutrition-item">
              <span className="nutrition-label">Kalori</span>
              <span className="nutrition-value">{result.calories}</span>
              <span className="nutrition-unit">kcal</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Protein</span>
              <span className="nutrition-value">{result.protein}</span>
              <span className="nutrition-unit">g</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Karbohidrat</span>
              <span className="nutrition-value">{result.carbs}</span>
              <span className="nutrition-unit">g</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Yağ</span>
              <span className="nutrition-value">{result.fat}</span>
              <span className="nutrition-unit">g</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Fiber</span>
              <span className="nutrition-value">{result.fiber || 0}</span>
              <span className="nutrition-unit">g</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Vitamin/Mineral</span>
              <span className="nutrition-value">{result.micronutrients?.length || 0}</span>
              <span className="nutrition-unit">adet</span>
            </div>
          </div>
          
          {result.micronutrients && result.micronutrients.length > 0 && (
            <div className="micronutrients">
              <h4>Mikro Besinler:</h4>
              <p>{result.micronutrients.join(', ')}</p>
            </div>
          )}

          <button onClick={handleAddFood} className="btn-success">
            ✓ Günlüğe Ekle
          </button>
        </div>
      )}

      {addedFoods.length > 0 && (
        <div className="added-foods">
          <h3>Eklenen Yemekler</h3>
          {addedFoods.map((food, idx) => (
            <div key={idx} className="food-item">
              <span>{food.name}</span>
              <span>{food.calories} kcal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============= ANA UYGULAMA =============
function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, token, login, logout, loading } = React.useContext(AuthContext);

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (!user) {
    return <LoginPage onAuthSuccess={login} />;
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">🥗 Diyet Rehberi</div>
        <div className="navbar-menu">
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className={currentPage === 'dashboard' ? 'active' : ''}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => setCurrentPage('food')}
            className={currentPage === 'food' ? 'active' : ''}
          >
            🔍 Gıda Arama
          </button>
          <button 
            onClick={() => setCurrentPage('profile')}
            className={currentPage === 'profile' ? 'active' : ''}
          >
            ⚙️ Profil
          </button>
          <button onClick={logout} className="logout-btn">
            🚪 Çıkış Yap
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentPage === 'dashboard' && <DashboardPage user={user} token={token} />}
        {currentPage === 'food' && (
          <FoodSearchPage 
            user={user} 
            token={token}
            onFoodAdded={() => {
              // Yemek eklenince dashboard'u yenile
              setCurrentPage('dashboard');
            }}
          />
        )}
        {currentPage === 'profile' && (
          <ProfilePage 
            user={user} 
            token={token}
            onProfileUpdate={(updatedUser) => {
              // Profil güncellenince state'i güncelle
            }}
          />
        )}
      </main>
    </div>
  );
}

function AppWithProvider() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithProvider;
