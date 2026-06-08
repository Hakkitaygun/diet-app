import React, { useCallback, useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import './App.css';

// ============= CONTEXT =============
const AuthContext = React.createContext();

function calculateAgeFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

function defaultBirthDateFromAge(age) {
  if (!age) return '';
  const today = new Date();
  const year = today.getFullYear() - age;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const REMINDER_DAYS = [
  { index: 0, label: 'Pazartesi' },
  { index: 1, label: 'Sali' },
  { index: 2, label: 'Carsamba' },
  { index: 3, label: 'Persembe' },
  { index: 4, label: 'Cuma' },
  { index: 5, label: 'Cumartesi' },
  { index: 6, label: 'Pazar' }
];

const REMINDER_MEALS = [
  { key: 'breakfast', label: 'Kahvalti' },
  { key: 'lunch', label: 'Ogle' },
  { key: 'dinner', label: 'Aksam' },
  { key: 'snack', label: 'Ara Ogun' }
];

// ============= AUTH PROVIDER =============
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const verifyToken = useCallback(async () => {
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
  }, [token]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token, verifyToken]);

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

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============= STATS PAGE =============
function StatsPage({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/stats/monthly`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="page-container">
      <h1>📊 Aylık İstatistikler</h1>
      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : stats ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: '#ffebee', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Ortalama Kalori</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#c62828', marginTop: '10px' }}>
                {stats.stats.avgCalories}
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>kcal/gün</div>
            </div>
            <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Maksimum Kalori</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2', marginTop: '10px' }}>
                {stats.stats.maxCalories}
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>kcal</div>
            </div>
            <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Takip Edilen Günler</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c', marginTop: '10px' }}>
                {stats.stats.daysTracked}/{stats.stats.totalDays}
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>gün</div>
            </div>
          </div>

          {stats.data && stats.data.length > 0 && (
            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '10px' }}>
              <h2>Günlük Kalori Trendi</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.data.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="totalCalories" stroke="#e53935" name="Kalori" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <p className="empty-state">İstatistik verisi bulunamadı</p>
      )}
    </div>
  );
}
// ============= HISTORY PAGE =============
function HistoryPage({ token }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/food-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const deleteFood = async (id) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/food/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistory(history.filter(h => h._id !== id));
      }
    } catch (err) {
      console.error('Error deleting food:', err);
    }
  };

  const groupedByDay = {};
  history.forEach(item => {
    const day = new Date(item.date).toLocaleDateString('tr-TR');
    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day].push(item);
  });

  return (
    <div className="page-container">
      <h1>📜 Yemek Geçmişi</h1>
      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : Object.keys(groupedByDay).length > 0 ? (
        Object.entries(groupedByDay).reverse().map(([day, foods]) => (
          <div key={day} style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#1976d2', marginBottom: '10px' }}>{day}</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {foods.map((food, idx) => (
                <div key={idx} style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <strong>{food.name}</strong>
                    <br/>
                    <small>{food.mealType === 'breakfast' ? 'Kahvaltı' : food.mealType === 'lunch' ? 'Öğle' : food.mealType === 'dinner' ? 'Akşam' : 'Ara Öğün'}</small>
                  </div>
                  <div>🔥 {food.calories}kcal</div>
                  <div>🥩 {food.protein}g</div>
                  <div>🍞 {food.carbs}g</div>
                  <button 
                    onClick={() => deleteFood(food._id)}
                    style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="empty-state">Henüz yemek kaydı yok</p>
      )}
    </div>
  );
}
// ============= EXERCISE PAGE =============
function ExercisePage({ token }) {
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState('moderate');
  const [todayExercises, setTodayExercises] = useState(null);
  const [message, setMessage] = useState('');

  const fetchTodayExercises = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/exercise/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodayExercises(data);
      }
    } catch (err) {
      console.error('Error fetching exercises:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchTodayExercises();
  }, [fetchTodayExercises]);

  const handleAddExercise = async () => {
    if (!activity.trim()) {
      setMessage('❌ Aktivite adı girin');
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/add-exercise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activity, duration: parseInt(duration), intensity })
      });

      if (res.ok) {
        setMessage('✓ Egzersiz kaydedildi');
        setActivity('');
        setDuration(30);
        setIntensity('moderate');
        setTimeout(() => fetchTodayExercises(), 500);
      }
    } catch (err) {
      setMessage('❌ Hata: ' + err.message);
    }
  };

  return (
    <div className="page-container">
      <h1>🏃 Egzersiz Takibi</h1>

      <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
        <h2>Egzersiz Ekle</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '15px' }}>
          <div>
            <label>Aktivite</label>
            <input 
              type="text" 
              value={activity} 
              onChange={(e) => setActivity(e.target.value)}
              placeholder="Örn: Koşu, Yüzme"
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label>Süre (dakika)</label>
            <input 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label>Yoğunluk</label>
            <select 
              value={intensity} 
              onChange={(e) => setIntensity(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc' }}
            >
              <option value="light">Hafif</option>
              <option value="moderate">Orta</option>
              <option value="intense">Yoğun</option>
            </select>
          </div>
        </div>
        <button onClick={handleAddExercise} style={{ marginTop: '15px', padding: '10px 20px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          ➕ Egzersiz Ekle
        </button>
        {message && <div style={{ marginTop: '10px', padding: '10px', backgroundColor: message.startsWith('✓') ? '#c8e6c9' : '#ffcdd2', borderRadius: '5px' }}>{message}</div>}
      </div>

      {todayExercises && (
        <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '10px' }}>
          <h2>Bugünkü Aktiviteler</h2>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
            🔥 {todayExercises.totalCaloriesBurned} kalori yakıldı / ⏱️ {todayExercises.totalDuration} dakika
          </div>
          {todayExercises.exercises && todayExercises.exercises.length > 0 ? (
            <div>
              {todayExercises.exercises.map((exercise, idx) => (
                <div key={idx} style={{ backgroundColor: '#fff', padding: '12px', marginBottom: '10px', borderRadius: '5px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                  <div><strong>{exercise.activity}</strong></div>
                  <div>{exercise.duration} dk</div>
                  <div>{exercise.intensity === 'light' ? 'Hafif' : exercise.intensity === 'moderate' ? 'Orta' : 'Yoğun'}</div>
                  <div>🔥 {exercise.caloriesBurned}kcal</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Bugün egzersiz kaydı yok</p>
          )}
        </div>
      )}
    </div>
  );
}
// ============= FAVORITES PAGE =============
function FavoritesPage({ user, token }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favoriteFoods || []);
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const removeFavorite = async (foodName) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/favorites/${encodeURIComponent(foodName)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFavorites(favorites.filter(f => f !== foodName));
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  return (
    <div className="page-container">
      <h1>❤️ Favori Yemekler</h1>
      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : favorites.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          {favorites.map((food, idx) => (
            <div key={idx} style={{ backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>{food}</div>
              <button 
                onClick={() => removeFavorite(food)}
                style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">Henüz favori yemek eklenmedi. Yemek analiz ederken favorilere ekleyin.</p>
      )}
    </div>
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
  const initialBirthDate = user?.profile?.birthDate || defaultBirthDateFromAge(user?.profile?.age || 25);
  const [profile, setProfile] = useState(user?.profile || {
    height: 170,
    weight: 70,
    age: 25,
    birthDate: initialBirthDate,
    gender: 'male',
    activityLevel: 1.5,
    goal: 'lose', // lose, gain, maintain
    goalWeight: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const calculateTDEE = () => {
    const { height, weight, gender, activityLevel } = profile;
    const age = calculateAgeFromBirthDate(profile.birthDate) || profile.age || 25;
    
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

    const computedAge = calculateAgeFromBirthDate(profile.birthDate) || profile.age || 25;
    const payload = {
      ...profile,
      age: computedAge
    };

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setMessage('✓ Profil güncellendi!');
        onProfileUpdate(data.user || data);
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
  const bmiValue = parseFloat(bmi) || 0;
  const bmiScaleMin = 15;
  const bmiScaleMax = 35;
  const bmiPosition = Math.min(100, Math.max(0, ((bmiValue - bmiScaleMin) / (bmiScaleMax - bmiScaleMin)) * 100));
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
          <label>Doğum Tarihi</label>
          <input
            type="date"
            value={profile.birthDate || ''}
            onChange={(e) => setProfile({...profile, birthDate: e.target.value})}
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

        <div className="form-group">
          <label>Hedef Kilo (kg)</label>
          <input
            type="number"
            value={profile.goalWeight}
            onChange={(e) => setProfile({...profile, goalWeight: parseFloat(e.target.value)})}
            min="30"
            max="200"
            step="0.5"
            placeholder="Örn: 72"
          />
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
          <div className="bmi-scale">
            <span className="bmi-scale-label">Zayıf</span>
            <span className="bmi-scale-label">Normal</span>
            <span className="bmi-scale-label">Fazla</span>
            <span className="bmi-scale-label">Obez</span>
            <div className="bmi-scale-track">
              <div className="bmi-scale-marker" style={{ left: `${bmiPosition}%` }}></div>
            </div>
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
  const [todayWater, setTodayWater] = useState(null);
  const [todayExercise, setTodayExercise] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);

  const fetchTodayLog = useCallback(async () => {
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
    }
  }, [token]);

  const fetchWaterToday = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/water/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodayWater(data);
      }
    } catch (err) {
      console.error('Fetch water error:', err);
    }
  }, [token]);

  const fetchWeeklyData = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/week`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWeeklyData(data);
      }
    } catch (err) {
      console.error('Fetch weekly error:', err);
    }
  }, [token]);

  const fetchTodayExercise = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/exercise/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodayExercise(data);
      }
    } catch (err) {
      console.error('Fetch exercise error:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchTodayLog();
    fetchWaterToday();
    fetchWeeklyData();
    fetchTodayExercise();
  }, [fetchTodayLog, fetchWaterToday, fetchWeeklyData, fetchTodayExercise]);

  const addWater = async (amount) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/add-water`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        await fetchWaterToday();
      }
    } catch (err) {
      console.error('Add water error:', err);
    }
  };

  const profile = user?.profile || {};
  const tdee = Math.round(
    (profile.gender === 'male' 
      ? 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * (profile.age || 25))
      : 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * (profile.age || 25))
    ) * (profile.activityLevel || 1.5)
  );

  const calorieTarget = profile.goal === 'lose' ? Math.round(tdee * 0.85) : profile.goal === 'gain' ? Math.round(tdee * 1.15) : tdee;
  const totalCalories = todayLog?.foods?.reduce((sum, f) => sum + (f.calories || 0), 0) || 0;
  const burnedCalories = todayExercise?.totalCaloriesBurned || 0;
  const netCalories = totalCalories - burnedCalories;
  const totalProtein = todayLog?.foods?.reduce((sum, f) => sum + (f.protein || 0), 0) || 0;
  const totalCarbs = todayLog?.foods?.reduce((sum, f) => sum + (f.carbs || 0), 0) || 0;
  const totalFat = todayLog?.foods?.reduce((sum, f) => sum + (f.fat || 0), 0) || 0;
  const remaining = calorieTarget - totalCalories;
  const progressPercent = Math.min(100, (totalCalories / (calorieTarget || 1)) * 100);
  const proteinTarget = Math.round((calorieTarget * 0.3) / 4);
  const carbsTarget = Math.round((calorieTarget * 0.4) / 4);
  const fatTarget = Math.round((calorieTarget * 0.3) / 9);
  const mealSections = [
    { key: 'breakfast', label: 'Kahvaltı' },
    { key: 'lunch', label: 'Öğle' },
    { key: 'dinner', label: 'Akşam' },
    { key: 'snack', label: 'Ara Öğün' },
    { key: 'other', label: 'Diğer' }
  ];
  const foodsByMeal = mealSections.reduce((acc, section) => {
    acc[section.key] = [];
    return acc;
  }, {});
  (todayLog?.foods || []).forEach((food) => {
    const mealType = food.mealType || 'other';
    if (!foodsByMeal[mealType]) {
      foodsByMeal.other.push(food);
    } else {
      foodsByMeal[mealType].push(food);
    }
  });

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

        <div className="stat-card highlight">
          <div className="stat-label">Net Kalori</div>
          <div className="stat-value">{netCalories}</div>
          <div className="stat-description">Alınan {totalCalories} - Yakılan {burnedCalories}</div>
        </div>
      </div>

      <div className="macro-bars">
        <div className="macro-bar">
          <div className="macro-bar-header">Protein</div>
          <div className="macro-bar-track">
            <div className="macro-bar-fill protein" style={{ width: `${Math.min(100, (totalProtein / (proteinTarget || 1)) * 100)}%` }}></div>
          </div>
          <div className="macro-bar-value">{totalProtein}g / {proteinTarget}g</div>
        </div>
        <div className="macro-bar">
          <div className="macro-bar-header">Karbonhidrat</div>
          <div className="macro-bar-track">
            <div className="macro-bar-fill carbs" style={{ width: `${Math.min(100, (totalCarbs / (carbsTarget || 1)) * 100)}%` }}></div>
          </div>
          <div className="macro-bar-value">{totalCarbs}g / {carbsTarget}g</div>
        </div>
        <div className="macro-bar">
          <div className="macro-bar-header">Yağ</div>
          <div className="macro-bar-track">
            <div className="macro-bar-fill fat" style={{ width: `${Math.min(100, (totalFat / (fatTarget || 1)) * 100)}%` }}></div>
          </div>
          <div className="macro-bar-value">{totalFat}g / {fatTarget}g</div>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{width: `${progressPercent}%`}}>
          <span className="progress-text">%{Math.round(progressPercent)}</span>
        </div>
      </div>

      {/* Water Tracker Card */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '10px' }}>
        <h2>💧 Su Takibi</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
              {todayWater?.totalWater || 0}ml / {todayWater?.waterGoal || 2000}ml
            </div>
            <div style={{ fontSize: '14px', color: '#555', marginTop: '5px' }}>
              %{todayWater?.percentage || 0} tamamlandı
            </div>
          </div>
        </div>
        <div style={{ marginBottom: '15px', backgroundColor: '#fff', borderRadius: '5px', height: '20px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#1976d2', height: '100%', width: `${Math.min(100, (todayWater?.percentage || 0))}%`, transition: 'width 0.3s' }}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[250, 500, 750, 1000].map((amount) => (
            <button
              key={amount}
              onClick={() => addWater(amount)}
              style={{
                padding: '10px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              +{amount}ml
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Summary Card */}
      {weeklyData?.summary && (
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f3e5f5', borderRadius: '10px' }}>
          <h2>📊 Bu Haftanın Özeti</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Ortalama Kalori</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7b1fa2' }}>
                {weeklyData.summary.avgCalories}
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>kcal/gün</div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>En İyi Gün</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2' }}>
                {weeklyData.summary.bestDay ? weeklyData.summary.bestDay.date : '-'}
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                {weeklyData.summary.bestDay ? `${weeklyData.summary.bestDay.calories}kcal` : ''}
              </div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', textAlign: 'center', gridColumn: '1/-1' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Hedef Tutturma Oranı</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: weeklyData.summary.goalAdherencePercent >= 70 ? '#388e3c' : '#d32f2f' }}>
                %{weeklyData.summary.goalAdherencePercent}
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                {weeklyData.summary.totalDays} gün içinde
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Trend Chart */}
      {weeklyData?.weekData && weeklyData.weekData.length > 0 && (
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff3e0', borderRadius: '10px' }}>
          <h2>📈 Haftalık Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData.weekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalCalories" stroke="#e53935" name="Kalori" />
              <Line type="monotone" dataKey="totalProtein" stroke="#1e88e5" name="Protein (g)" />
              <Line type="monotone" dataKey="totalCarbs" stroke="#43a047" name="Karbohidrat (g)" />
              <Line type="monotone" dataKey="totalFat" stroke="#fb8c00" name="Yağ (g)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2>Günün Yemekleri</h2>
      {todayLog?.foods?.length > 0 ? (
        <div className="meal-sections">
          {mealSections.map((section) => (
            foodsByMeal[section.key].length > 0 ? (
              <div key={section.key} className="meal-section">
                <h3>{section.label}</h3>
                <div className="food-list">
                  {foodsByMeal[section.key].map((food, idx) => (
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
              </div>
            ) : null
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
  const [mealType, setMealType] = useState('lunch');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [editedResult, setEditedResult] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState('');
  const [addedFoods, setAddedFoods] = useState([]);
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechConfirmation, setSpeechConfirmation] = useState(null);
  const [showManualBarcode, setShowManualBarcode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const restartTimerRef = useRef(null);
  const speechRestartCountRef = useRef(0);
  const speechLastResultAtRef = useRef(0);
  const scannerRef = useRef(null);
  const scanHandledRef = useRef(false);
  const scannerStateRef = useRef('idle');
  const [isScanning, setIsScanning] = useState(false);
  const previewStreamRef = useRef(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const normalizeSpeechFoodText = (rawText) => {
    let text = String(rawText || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[.,!?;:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Normalize Turkish diacritics and common ASR variants.
    text = text
      .replace(/i̇/g, 'i')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/û/g, 'u')
      .replace(/\bcanga\b/g, 'canga')
      .replace(/\bcanğa\b/g, 'canga')
      .replace(/\bcangaa\b/g, 'canga')
      .replace(/\bdoner\b/g, 'döner')
      .replace(/\bwhooper\b/g, 'whopper')
      .replace(/\bvopper\b/g, 'whopper')
      .replace(/\bvapır\b/g, 'whopper')
      .replace(/\bbik\s*king\b/g, 'big king')
      .replace(/\bbing\s*king\b/g, 'big king')
      .replace(/\bbin\s*king\b/g, 'big king')
      .replace(/\bbig\s*ging\b/g, 'big king')
      .replace(/\bbig\s*kin\b/g, 'big king')
      .replace(/\bbig\s*kink\b/g, 'big king')
      .replace(/\bbig\s*keng\b/g, 'big king')
      .replace(/\bbig\s*kin[gk]\b/g, 'big king')
      .replace(/\bbic\s*king\b/g, 'big king')
      .replace(/\bbikgink\b/g, 'big king')
      .replace(/\bbigking\b/g, 'big king')
      .replace(/\bmenu\b/g, 'menü')
      .replace(/\bmeni\b/g, 'menü')
      .replace(/\bmeni̇\b/g, 'menü')
      .replace(/\bmenüu\b/g, 'menü')
      .replace(/\bmeniye\b/g, 'menü')
      .replace(/\bking\s+menü\b/g, 'big king menü')
      .replace(/\sbig\s+big\s+/g, ' big ')
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  };

  const scoreSpeechCandidate = (candidateText, confidence) => {
    const text = String(candidateText || '').toLowerCase();
    let bonus = 0;

    if (text.includes('big king')) bonus += 0.35;
    if (text.includes('menü') || text.includes('menu')) bonus += 0.15;
    if (/(burger\s*king|whopper|kral|doner|döner|pizza|hamburger|ayran)/.test(text)) bonus += 0.1;

    return (Number(confidence) || 0) + bonus;
  };

  const applySpeechInput = (text) => {
    const finalText = String(text || '').trim();
    if (!finalText) return;

    setError('');
    setSearchTerm(finalText);
    setInterimTranscript('');
    setSpeechConfirmation(null);

    // Sesli komut sonrası otomatik analiz yok; kullanıcı Analiz Et'e basar.
    shouldKeepListeningRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_e) {
        // ignore stop race errors
      }
    }
    setIsListening(false);
  };

  useEffect(() => {
    const stored = localStorage.getItem('recentFoods');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionAvailable(false);
      return;
    }

    setRecognitionAvailable(true);
    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.interimResults = true;
    recognition.maxAlternatives = 10;
    recognition.continuous = false;

    const clearRestartTimer = () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    };

    const scheduleRecognitionRestart = (reason = 'retry') => {
      if (!shouldKeepListeningRef.current || !recognitionRef.current) return;

      clearRestartTimer();

      const cappedCount = Math.min(speechRestartCountRef.current, 6);
      const delay = reason === 'network'
        ? Math.min(8000, 1200 * (2 ** cappedCount))
        : Math.min(4000, 600 + cappedCount * 400);

      restartTimerRef.current = setTimeout(() => {
        if (!recognitionRef.current || !shouldKeepListeningRef.current) return;
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (_restartErr) {
          // browser may still be transitioning state
        }
      }, delay);
    };

    recognition.onresult = (event) => {
      speechLastResultAtRef.current = Date.now();
      speechRestartCountRef.current = 0;

      let interim = '';
      let maxConfidence = 0;
      const finalCandidates = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const primaryTranscript = event.results[i][0].transcript;
        const primaryConfidence = event.results[i][0].confidence || 0;
        
        if (event.results[i].isFinal) {
          if (primaryConfidence > maxConfidence) {
            maxConfidence = primaryConfidence;
          }

          for (let j = 0; j < event.results[i].length; j++) {
            const altTranscript = event.results[i][j].transcript;
            const altConfidence = event.results[i][j].confidence || primaryConfidence;
            const normalized = normalizeSpeechFoodText(altTranscript);
            if (normalized) {
              finalCandidates.push({
                text: normalized,
                confidence: altConfidence,
                score: scoreSpeechCandidate(normalized, altConfidence)
              });
            }
          }
        } else {
          interim += primaryTranscript;
        }
      }

      setInterimTranscript(interim);

      const bestCandidate = finalCandidates.reduce((best, current) => {
        if (!best) return current;
        return current.score > best.score ? current : best;
      }, null);

      const bestText = bestCandidate?.text || '';
      const bestScore = bestCandidate?.score || 0;
      const bestConfidence = bestCandidate?.confidence || 0;

      if (bestText && bestScore > 0.45) {
        // Yüksek güvenli sonuç - sadece kutuya yaz
        applySpeechInput(bestText);
      } else if (bestText && (bestScore > 0.35 || maxConfidence > 0.3)) {
        // Orta güvenli sonuç - doğrulama iste
        setSpeechConfirmation({
          text: bestText,
          confidence: (bestConfidence * 100).toFixed(0)
        });
      } else if (bestText) {
        // Düşük güvenli sonuç - doğrulama iste
        setSpeechConfirmation({
          text: bestText,
          confidence: (bestConfidence * 100).toFixed(0)
        });
      }
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        speechRestartCountRef.current += 1;
        scheduleRecognitionRestart('normal');
        return;
      }

      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onerror = (e) => {
      console.error('SpeechRecognition error', e);
      const errCode = String(e?.error || 'unknown');

      if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
        setError('Mikrofon izni kapalı. Tarayıcıdan mikrofon iznini açıp tekrar deneyin.');
        shouldKeepListeningRef.current = false;
        setIsListening(false);
      } else if (errCode === 'audio-capture') {
        setError('Mikrofon bulunamadı. Kulaklık/mikrofon bağlantısını kontrol edin.');
        shouldKeepListeningRef.current = false;
        setIsListening(false);
      } else if (errCode === 'network') {
        speechRestartCountRef.current += 1;
        if (speechRestartCountRef.current <= 4) {
          setError('Ses servisinde ağ hatası var, yeniden bağlanılıyor...');
          scheduleRecognitionRestart('network');
        } else {
          shouldKeepListeningRef.current = false;
          setIsListening(false);
          setError('Ses servisine bağlanılamadı (network). Chrome kullanıp internet bağlantısını kontrol edin.');
        }
      } else if (errCode === 'no-speech') {
        // Sessizlikte açık kalan modda otomatik yeniden denemeye izin ver.
        const idleFor = Date.now() - (speechLastResultAtRef.current || 0);
        if (idleFor > 25000) {
          setError('Ses algılanamadı, mikrofona daha yakın konuşun.');
        }
      } else {
        setError('Sesli komutta hata oluştu: ' + errCode);
      }

      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      clearRestartTimer();
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.stop();
        } catch (_stopErr) {
          // ignore stop errors on unmount
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      scannerStateRef.current = 'stopping';
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear().catch(() => {});
          scannerRef.current = null;
          scannerStateRef.current = 'idle';
        });
      } else {
        scannerStateRef.current = 'idle';
      }
    };
  }, []);

  const saveRecentSearch = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((item) => item !== trimmed)].slice(0, 6);
    setRecentSearches(updated);
    localStorage.setItem('recentFoods', JSON.stringify(updated));
  };

  const analyzeFood = async (term) => {
    if (!term.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setIsEditMode(false);
    saveRecentSearch(term);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/foods/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ foodDescription: term })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.nutrition);
        setEditedResult({ ...data.nutrition });
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

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      shouldKeepListeningRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript('');
    } else {
      try {
        shouldKeepListeningRef.current = true;
        speechRestartCountRef.current = 0;
        speechLastResultAtRef.current = Date.now();
        setError('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Could not start recognition', err);
        setError('Sesli komut başlatılamadı. Sayfayı yenileyip mikrofon iznini kontrol edin.');
      }
    }
  };

  const getErrorMessage = (err) => {
    if (!err) return 'Bilinmeyen hata';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch (_e) {
      return 'Bilinmeyen hata';
    }
  };

  const formatScannedProductName = (product, fallbackCode) => {
    const rawName = String(product?.product_name || product?.generic_name || fallbackCode || '').trim();
    const brand = String(product?.brands || product?.brand || '').trim();

    if (!rawName) {
      return fallbackCode;
    }

    if (!brand) {
      return rawName;
    }

    const primaryBrand = brand.split(',')[0].trim();
    const normalizedName = rawName.toLowerCase();
    const normalizedBrand = primaryBrand.toLowerCase();

    if (!normalizedBrand || normalizedName.includes(normalizedBrand)) {
      return rawName;
    }

    return `${primaryBrand} ${rawName}`.trim();
  };

  const cleanupScanner = async () => {
    if (!scannerRef.current) {
      scannerStateRef.current = 'idle';
      return;
    }

    if (scannerStateRef.current === 'stopping') {
      return;
    }

    scannerStateRef.current = 'stopping';
    try {
      await scannerRef.current.stop();
    } catch (stopErr) {
      const msg = getErrorMessage(stopErr).toLowerCase();
      if (!msg.includes('not running') && !msg.includes('paused') && !msg.includes('under transition')) {
        console.warn('Scanner stop warning:', stopErr);
      }
    }

    try {
      await scannerRef.current.clear();
    } catch (_clearErr) {
      // ignore clear errors
    }

    scannerRef.current = null;
    scannerStateRef.current = 'idle';
  };

  const startPreview = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Tarayıcı kamera API desteklemiyor');
      const devices = await Html5Qrcode.getCameras().catch(() => []);
      const preferred = devices.find((d) => d.id === selectedCameraId) || devices[0];
      const constraints = preferred ? { video: { deviceId: { exact: preferred.id } } } : { video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      previewStreamRef.current = stream;
      const video = document.getElementById('camera-preview');
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      setIsPreviewing(true);
    } catch (err) {
      console.error('Preview error', err);
      setError('Önizleme açılamadı: ' + (err.message || err));
      setIsPreviewing(false);
    }
  };

  const stopPreview = async () => {
    try {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop());
        previewStreamRef.current = null;
      }
      const video = document.getElementById('camera-preview');
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    } catch (_e) {}
    setIsPreviewing(false);
  };

  const isFrontCameraLabel = (label) => /front|user|facetime/i.test(label || '');

  const handleCameraChange = async (event) => {
    const nextId = event.target.value;
    setSelectedCameraId(nextId);
    if (isScanning) {
      await stopBarcodeScan();
      await startBarcodeScan();
    }
  };

  const startBarcodeScan = async () => {
    if (scannerStateRef.current !== 'idle') return;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tarayiciniz kamera API desteklemiyor');
      }

      scannerStateRef.current = 'starting';
      setIsScanning(true);
      setError('');
      scanHandledRef.current = false;

      // Ensure scanner container is mounted in DOM before initializing camera
      await new Promise((resolve) => setTimeout(resolve, 50));

      const container = document.getElementById('barcode-reader');
      if (!container) {
        throw new Error('Tarayici alani hazir degil');
      }

      container.innerHTML = '';

      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;

      const processBarcode = async (code) => {
        try {
          const response = await fetch(
            `${process.env.REACT_APP_API_URL}/foods/barcode/${encodeURIComponent(code)}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );

          if (!response.ok) {
            setManualBarcode(code);
            setShowManualBarcode(true);
            return;
          }

          const data = await response.json();
          if (data.found && data.product) {
            const name = formatScannedProductName(data.product, code);
            setSearchTerm(name);
            analyzeFood(name);
          } else {
            // Ürün bulunamadı - manuel giriş seçeneği göster
            setManualBarcode(code);
            setShowManualBarcode(true);
          }
        } catch (err) {
          console.error('Barcode lookup error', err);
          setManualBarcode(code);
          setShowManualBarcode(true);
        }
      };

      const scanSuccess = async (decodedText) => {
        if (scanHandledRef.current) return;
        scanHandledRef.current = true;

        const code = String(decodedText || '').trim();
        await stopBarcodeScan();
        await processBarcode(code);
      };

      const scanConfig = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => ({
          width: Math.min(420, Math.floor(viewfinderWidth * 0.9)),
          height: Math.min(200, Math.floor(viewfinderHeight * 0.4))
        }),
        aspectRatio: 1.777,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        disableFlip: true
      };

      let cameraConfig = { facingMode: { ideal: 'environment' } };
      let shouldDisableFlip = true;

      const devices = await Html5Qrcode.getCameras().catch(() => []);
      if (Array.isArray(devices) && devices.length > 0) {
        setAvailableCameras(devices);
        const preferred = devices.find((device) => device.id === selectedCameraId)
          || devices.find((device) => /back|rear|environment/i.test(device.label || ''))
          || devices[0];

        if (preferred?.id && preferred.id !== selectedCameraId) {
          setSelectedCameraId(preferred.id);
        }

        if (preferred?.id) {
          cameraConfig = { deviceId: { exact: preferred.id } };
          shouldDisableFlip = !isFrontCameraLabel(preferred.label);
        }
      }

      scanConfig.disableFlip = shouldDisableFlip;
      await scanner.start(cameraConfig, scanConfig, scanSuccess, () => {});
      scannerStateRef.current = 'running';
    } catch (err) {
      console.error('Camera error', err);
      setIsScanning(false);
      setError('Kamera açılamadı: ' + getErrorMessage(err));
      setShowManualBarcode(true);
      await cleanupScanner();
    }
  };

  const stopBarcodeScan = async () => {
    setIsScanning(false);
    await cleanupScanner();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    analyzeFood(searchTerm);
  };

  const handleAddFood = async () => {
    if (!result) return;

    try {
      const finalResult = isEditMode ? editedResult : result;
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/add-food`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: searchTerm,
          mealType,
          ...finalResult
        })
      });

      if (res.ok) {
        setAddedFoods([...addedFoods, { name: searchTerm, ...finalResult }]);
        setSearchTerm('');
        setResult(null);
        setEditedResult(null);
        setIsEditMode(false);
        onFoodAdded?.();
      }
    } catch (err) {
      setError('Yemek eklenemedi: ' + err.message);
    }
  };

  const addFavorite = async (foodName) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ foodName })
      });
      const data = await res.json();
      if (res.ok) {
        setFavoriteMessage('✓ Favorilere eklendi');
      } else {
        setFavoriteMessage(data.message || '❌ Favorilere eklenemedi');
      }
    } catch (err) {
      setFavoriteMessage('❌ Hata: ' + err.message);
    }
  };

  return (
    <div className="page-container">
      <h1>🔍 Gıda Arama</h1>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder={isListening ? (interimTranscript || "🎤 Dinleniyor...") : "Örn: Tavuk döner pide, 2 dilim ekmek, 1 bardak süt..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          style={{ opacity: isListening ? 0.7 : 1, transition: 'opacity 0.2s' }}
        />
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          className="meal-select"
        >
          <option value="breakfast">Kahvaltı</option>
          <option value="lunch">Öğle</option>
          <option value="dinner">Akşam</option>
          <option value="snack">Ara Öğün</option>
          <option value="other">Diğer</option>
        </select>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? '🔄 Analiz Ediliyor...' : '🔍 Analiz Et'}
        </button>
        <button
          type="button"
          onClick={toggleListening}
          disabled={!recognitionAvailable}
          className="btn-mic"
          aria-pressed={isListening}
          style={{ marginLeft: '8px' }}
        >
          {isListening ? '⏹️ Durdur' : '🎤 Sesli'}
        </button>
        <button
          type="button"
          onClick={() => { isScanning ? stopBarcodeScan() : startBarcodeScan(); }}
          className="btn-mic"
          style={{ marginLeft: '8px' }}
        >
          {isScanning ? '⏹️ Durdur Tara' : '📷 Barkod Tara'}
        </button>
      </form>

      <div style={{ marginTop: '12px', display: isScanning ? 'block' : 'none' }}>
        <div id="barcode-reader" style={{ width: '100%', maxWidth: '640px', minHeight: '280px', borderRadius: '8px', overflow: 'hidden' }} />
        <div style={{ marginTop: '10px' }}>
          <video id="camera-preview" style={{ width: '100%', maxWidth: '420px', borderRadius: '8px', background: '#000' }} muted playsInline />
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => isPreviewing ? stopPreview() : startPreview()} className="btn-secondary">
              {isPreviewing ? 'Önizlemeyi Durdur' : 'Kamera Önizlemesi'}
            </button>
            <button type="button" onClick={() => { stopPreview(); stopBarcodeScan(); }} className="btn-secondary">
              Durdur Hepsini
            </button>
          </div>
        </div>
        {availableCameras.length > 1 && (
          <div style={{ marginTop: '10px', maxWidth: '420px' }}>
            <label style={{ display: 'block', marginBottom: '6px' }}>Kamera Secimi</label>
            <select
              value={selectedCameraId}
              onChange={handleCameraChange}
              style={{ width: '100%', padding: '8px', borderRadius: '6px' }}
            >
              {availableCameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Kamera ${camera.id.slice(-4)}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={{ marginTop: '8px' }}><small>Barkod algılanana kadar kamerayı yiyeceğe doğru tutun.</small></div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!result && !loading && addedFoods.length === 0 && (
        <div className="empty-search-panel">
          <div className="empty-search-section">
            <h3>Sık Tüketilenler</h3>
            <div className="quick-buttons">
              {['1 porsiyon karniyarik', '1 kase yogurt', '2 dilim ekmek', '1 tabak mercimek', '1 bardak ayran', '1 bardak su'].map((item) => (
                <button key={item} type="button" className="quick-button" onClick={() => {
                  setSearchTerm(item);
                  analyzeFood(item);
                }}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          {recentSearches.length > 0 && (
            <div className="empty-search-section">
              <h3>Son Arananlar</h3>
              <div className="quick-buttons">
                {recentSearches.map((item) => (
                  <button key={item} type="button" className="quick-button ghost" onClick={() => {
                    setSearchTerm(item);
                    analyzeFood(item);
                  }}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="food-result-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>{searchTerm}</h3>
            <button 
              className={isEditMode ? 'btn-secondary' : 'btn-primary'} 
              onClick={() => setIsEditMode(!isEditMode)}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {isEditMode ? '✓ Tamam' : '✏️ Düzelt'}
            </button>
          </div>
          <div className="nutrition-grid">
            <div className="nutrition-item">
              <span className="nutrition-label">Kalori</span>
              {isEditMode ? (
                <input 
                  type="number" 
                  value={editedResult.calories} 
                  onChange={(e) => setEditedResult({...editedResult, calories: parseInt(e.target.value) || 0})}
                  className="nutrition-edit-input"
                  style={{ width: '80px', padding: '5px', fontSize: '16px', fontWeight: 'bold' }}
                />
              ) : (
                <span className="nutrition-value">{result.calories}</span>
              )}
              <span className="nutrition-unit">kcal</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Protein</span>
              {isEditMode ? (
                <input 
                  type="number" 
                  step="0.1"
                  value={editedResult.protein} 
                  onChange={(e) => setEditedResult({...editedResult, protein: parseFloat(e.target.value) || 0})}
                  className="nutrition-edit-input"
                  style={{ width: '80px', padding: '5px', fontSize: '16px', fontWeight: 'bold' }}
                />
              ) : (
                <span className="nutrition-value">{result.protein}</span>
              )}
              <span className="nutrition-unit">g</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Karbohidrat</span>
              {isEditMode ? (
                <input 
                  type="number" 
                  step="0.1"
                  value={editedResult.carbs} 
                  onChange={(e) => setEditedResult({...editedResult, carbs: parseFloat(e.target.value) || 0})}
                  className="nutrition-edit-input"
                  style={{ width: '80px', padding: '5px', fontSize: '16px', fontWeight: 'bold' }}
                />
              ) : (
                <span className="nutrition-value">{result.carbs}</span>
              )}
              <span className="nutrition-unit">g</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Yağ</span>
              {isEditMode ? (
                <input 
                  type="number" 
                  step="0.1"
                  value={editedResult.fat} 
                  onChange={(e) => setEditedResult({...editedResult, fat: parseFloat(e.target.value) || 0})}
                  className="nutrition-edit-input"
                  style={{ width: '80px', padding: '5px', fontSize: '16px', fontWeight: 'bold' }}
                />
              ) : (
                <span className="nutrition-value">{result.fat}</span>
              )}
              <span className="nutrition-unit">g</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Fiber</span>
              {isEditMode ? (
                <input 
                  type="number" 
                  step="0.1"
                  value={editedResult.fiber || 0} 
                  onChange={(e) => setEditedResult({...editedResult, fiber: parseFloat(e.target.value) || 0})}
                  className="nutrition-edit-input"
                  style={{ width: '80px', padding: '5px', fontSize: '16px', fontWeight: 'bold' }}
                />
              ) : (
                <span className="nutrition-value">{result.fiber || 0}</span>
              )}
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

          {result.baseAmount && (
            <div className="micronutrients">
              <h4>Baz Alinan Miktar:</h4>
              <p>{result.baseAmount}</p>
            </div>
          )}

          <button onClick={handleAddFood} className="btn-success">
            ✓ Günlüğe Ekle
          </button>
          <button
            onClick={() => addFavorite(searchTerm)}
            className="btn-secondary"
            style={{ marginLeft: '10px' }}
          >
            ❤️ Favoriye Ekle
          </button>
          {favoriteMessage && <div style={{ marginTop: '10px' }}>{favoriteMessage}</div>}
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

      {/* Sesli Komut Doğrulama Modal */}
      {speechConfirmation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-color)',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '400px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            textAlign: 'center'
          }}>
            <h3>Sesli Komut Doğrulaması</h3>
            <p style={{ marginBottom: '15px' }}>
              Duyduğunuz: <strong>"{speechConfirmation.text}"</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--secondary-text)', marginBottom: '20px' }}>
              Güvenilirlik: {speechConfirmation.confidence}%
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  applySpeechInput(speechConfirmation.text);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✓ Kabul Et
              </button>
              <button
                onClick={() => {
                  setSpeechConfirmation(null);
                  setInterimTranscript('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✗ Reddet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interim Sesli Komut Göstergesi */}
      {isListening && interimTranscript && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--primary)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '24px',
          zIndex: 1000,
          maxWidth: '80%',
          textAlign: 'center',
          wordWrap: 'break-word',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
        }}>
          🎤 Dinleniyor: "{interimTranscript}"
        </div>
      )}

      {/* Manuel Barkod Girişi Modal */}
      {showManualBarcode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-color)',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '400px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h3>📷 Barkod Okuma</h3>
            <p style={{ marginBottom: '15px', fontSize: '14px' }}>
              {manualBarcode ? `Taranan: ${manualBarcode}` : 'Barkodu kamerada okuyamadı. Lütfen manuel olarak girin:'}
            </p>
            <input
              type="text"
              placeholder="Barkod numarasını girin"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                boxSizing: 'border-box',
                marginBottom: '15px',
                fontSize: '14px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowManualBarcode(false);
                  setManualBarcode('');
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'var(--secondary-bg)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕ İptal
              </button>
              <button
                onClick={async () => {
                  if (manualBarcode.trim()) {
                    setShowManualBarcode(false);
                    setSearchTerm(manualBarcode.trim());
                    analyzeFood(manualBarcode.trim());
                    setManualBarcode('');
                  }
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✓ Analiz Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoAnalyzePage({ token }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [editedResult, setEditedResult] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState('');
  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [savingLog, setSavingLog] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError('');
    setSaveMessage('');
    const fallbackName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Fotoğraftan analiz';
    setFoodName(fallbackName || 'Fotoğraftan analiz');
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Dosya okunamadi'));
    reader.readAsDataURL(file);
  });

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError('');
    setResult(null);
    setIsEditMode(false);

    try {
      const base64 = await fileToBase64(selectedFile);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/foods/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: selectedFile.type
        })
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data.nutrition);
        setEditedResult({ ...data.nutrition });
        setSaveMessage('');
      } else {
        setError(data.message || 'Analiz basarisiz oldu');
      }
    } catch (err) {
      console.error(err?.response?.data || err.message);
      setError('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLog = async () => {
    if (!result) return;
    setSavingLog(true);
    setSaveMessage('');

    try {
      const finalResult = isEditMode ? editedResult : result;
      const res = await fetch(`${process.env.REACT_APP_API_URL}/logs/add-food`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: foodName?.trim() || 'Fotoğraftan analiz',
          mealType,
          calories: finalResult.calories,
          protein: finalResult.protein,
          carbs: finalResult.carbs,
          fat: finalResult.fat,
          fiber: finalResult.fiber,
          micronutrients: finalResult.micronutrients || []
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSaveMessage('✓ Günlüğe eklendi');
        setResult(null);
        setEditedResult(null);
        setIsEditMode(false);
        setSelectedFile(null);
        setFoodName('');
      } else {
        setSaveMessage(data.message || '❌ Günlüğe eklenemedi');
      }
    } catch (err) {
      setSaveMessage('❌ Günlüğe eklenemedi: ' + err.message);
    } finally {
      setSavingLog(false);
    }
  };

  const addFavorite = async () => {
    const favoriteName = foodName?.trim() || 'Fotoğraftan analiz';
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ foodName: favoriteName })
      });
      const data = await res.json();
      if (res.ok) {
        setFavoriteMessage('✓ Favorilere eklendi');
      } else {
        setFavoriteMessage(data.message || '❌ Favorilere eklenemedi');
      }
    } catch (err) {
      setFavoriteMessage('❌ Hata: ' + err.message);
    }
  };

  return (
    <div className="page-container">
      <h1>📸 Fotoğrafla Analiz</h1>

      <div className="photo-uploader">
        <label className="photo-drop">
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <div>
            <div className="photo-title">Fotoğraf Yükle</div>
            <div className="photo-subtitle">JPG, PNG veya HEIC</div>
          </div>
        </label>

        {previewUrl && (
          <div className="photo-preview">
            <img src={previewUrl} alt="Yemek onizleme" />
          </div>
        )}

        <button className="btn-primary" onClick={handleAnalyze} disabled={loading || !selectedFile}>
          {loading ? 'Analiz Ediliyor...' : 'Analiz Et'}
        </button>

        {error && <div className="error-message">{error}</div>}
      </div>

      {result && (
        <div className="food-result-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Fotoğraf Sonucu</h3>
            <button 
              className={isEditMode ? 'btn-secondary' : 'btn-primary'} 
              onClick={() => setIsEditMode(!isEditMode)}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {isEditMode ? '✓ Tamam' : '✏️ Düzelt'}
            </button>
          </div>
          
          <div className="nutrition-grid">
            <div className="nutrition-item">
              <span className="nutrition-label">Kalori</span>
              {isEditMode ? (
                <input 
                  type="number" 
                  value={editedResult.calories} 
                  onChange={(e) => setEditedResult({...editedResult, calories: parseInt(e.target.value) || 0})}
                  className="nutrition-edit-input"
                  style={{ width: '80px', padding: '5px', fontSize: '16px', fontWeight: 'bold' }}
                />
              ) : (
                <span className="nutrition-value">{result.calories}</span>
              )}
              <span className="nutrition-unit">kcal</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Protein</span>
              {isEditMode ? (
                <input 
                  type="number" 
                  step="0.1"
                  value={editedResult.protein} 
                  onChange={(e) => setEditedResult({...editedResult, protein: parseFloat(e.target.value) || 0})}
                  className="nutrition-edit-input"
                  style={{ width: '80px', padding: '5px', fontSize: '16px', fontWeight: 'bold' }}
                />
              ) : (
                <span className="nutrition-value">{result.protein}</span>
              )}
              <span className="nutrition-unit">g</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Karbohidrat</span>
              {isEditMode ? (
                <input 
                  type="number" 
                  step="0.1"
                  value={editedResult.carbs} 
                  onChange={(e) => setEditedResult({...editedResult, carbs: parseFloat(e.target.value) || 0})}
                  className="nutrition-edit-input"
                  style={{ width: '80px', padding: '5px', fontSize: '16px', fontWeight: 'bold' }}
                />
              ) : (
                <span className="nutrition-value">{result.carbs}</span>
              )}
              <span className="nutrition-unit">g</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Yağ</span>
              {isEditMode ? (
                <input 
                  type="number" 
                  step="0.1"
                  value={editedResult.fat} 
                  onChange={(e) => setEditedResult({...editedResult, fat: parseFloat(e.target.value) || 0})}
                  className="nutrition-edit-input"
                  style={{ width: '80px', padding: '5px', fontSize: '16px', fontWeight: 'bold' }}
                />
              ) : (
                <span className="nutrition-value">{result.fat}</span>
              )}
              <span className="nutrition-unit">g</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">Fiber</span>
              {isEditMode ? (
                <input 
                  type="number" 
                  step="0.1"
                  value={editedResult.fiber || 0} 
                  onChange={(e) => setEditedResult({...editedResult, fiber: parseFloat(e.target.value) || 0})}
                  className="nutrition-edit-input"
                  style={{ width: '80px', padding: '5px', fontSize: '16px', fontWeight: 'bold' }}
                />
              ) : (
                <span className="nutrition-value">{result.fiber || 0}</span>
              )}
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

          {result.baseAmount && (
            <div className="micronutrients">
              <h4>Baz Alinan Miktar:</h4>
              <p>{result.baseAmount}</p>
            </div>
          )}

          <div className="photo-log-controls">
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="Yemek adı"
              className="search-input"
            />
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="meal-select"
            >
              <option value="breakfast">Kahvaltı</option>
              <option value="lunch">Öğle</option>
              <option value="dinner">Akşam</option>
              <option value="snack">Ara Öğün</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          <button onClick={handleAddToLog} className="btn-success" disabled={savingLog}>
            {savingLog ? 'Ekleniyor...' : '✓ Günlüğe Ekle'}
          </button>
          <button onClick={addFavorite} className="btn-secondary" style={{ marginLeft: '10px' }}>
            ❤️ Favoriye Ekle
          </button>
          {favoriteMessage && <div style={{ marginTop: '10px' }}>{favoriteMessage}</div>}

          {saveMessage && (
            <div className={`message ${saveMessage.startsWith('✓') ? 'success' : 'error'}`}>{saveMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============= WEEKLY PLANNER PAGE =============
function WeeklyPlannerPage({ user, token }) {
  const [favorites, setFavorites] = useState('');
  const [allergies, setAllergies] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [planData, setPlanData] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [comparePlans, setComparePlans] = useState({});
  const [compareIds, setCompareIds] = useState([]);
  const [reminderGrid, setReminderGrid] = useState({});
  const [reminderSaving, setReminderSaving] = useState(false);

  const profile = user?.profile || {};
  const computedAge = calculateAgeFromBirthDate(profile.birthDate) || profile.age || 25;
  const goalLabels = {
    lose: 'Zayıflama',
    maintain: 'Kilo Sabitlemek',
    gain: 'Kilo Alma'
  };

  const calculateCalorieTarget = () => {
    const height = Number(profile.height) || 170;
    const weight = Number(profile.weight) || 70;
    const activityLevel = Number(profile.activityLevel) || 1.5;
    const gender = profile.gender || 'male';

    let bmr;
    if (gender === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * computedAge);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * computedAge);
    }

    const tdee = Math.round(bmr * activityLevel);
    if (profile.goal === 'lose') return Math.round(tdee * 0.85);
    if (profile.goal === 'gain') return Math.round(tdee * 1.15);
    return tdee;
  };

  const calorieTarget = calculateCalorieTarget();
  const goalText = goalLabels[profile.goal] || 'Genel Sağlık';

  const storageKey = user?.id ? `weeklyPlan:${user.id}` : 'weeklyPlan:guest';

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.favorites) setFavorites(parsed.favorites);
      if (parsed?.allergies) setAllergies(parsed.allergies);
      if (parsed?.dislikes) setDislikes(parsed.dislikes);
      if (parsed?.planData) setPlanData(parsed.planData);
      if (parsed?.checkedItems) setCheckedItems(parsed.checkedItems);
    } catch (err) {
      console.error('Weekly plan restore error:', err);
    }
  }, [storageKey]);

  useEffect(() => {
    const payload = {
      favorites,
      allergies,
      dislikes,
      planData,
      checkedItems
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [favorites, allergies, dislikes, planData, checkedItems, storageKey]);

  const fetchWeeklyPlans = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/planner/weekly-plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWeeklyPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Weekly plans fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchWeeklyPlans();
    }
  }, [token, fetchWeeklyPlans]);

  const handleGeneratePlan = async () => {
    try {
      setLoading(true);
      setMessage('');
      setPlanData(null);

      // En az favori gerekli
      if (!favorites.trim()) {
        setMessage('❌ Lütfen en az bir favori yemek girin');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/planner/weekly-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          favorites,
          allergies,
          dislikes,
          calorieTarget,
          goalText
        })
      });

      if (!response.ok) {
        const error = await response.json();
        setMessage(`❌ Hata: ${error.message}`);
        return;
      }

      const data = await response.json();
      setPlanData(data.plan);
      setMessage('✓ Haftalık plan başarıyla oluşturuldu!');
      setCheckedItems({});
      if (data.savedPlan) {
        setWeeklyPlans((prev) => [data.savedPlan, ...prev]);
      }
    } catch (error) {
      console.error('Plan generation error:', error);
      setMessage(`❌ Plan oluşturma hatası: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleToggleDay = (dayIndex) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
  };

  const handleLoadSavedPlan = async (planId) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/planner/weekly-plan/${planId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setPlanData(data.plan);
      setMessage('✓ Kaydedilmiş plan yüklendi');
      setCheckedItems({});
      if (data.params) {
        setFavorites(data.params.favorites || '');
        setAllergies(data.params.allergies || '');
        setDislikes(data.params.dislikes || '');
      }
    } catch (err) {
      console.error('Load saved plan error:', err);
    }
  };

  const handleDeleteSavedPlan = async (planId) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/planner/weekly-plan/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setWeeklyPlans((prev) => prev.filter((plan) => plan.id !== planId));
        setCompareIds((prev) => prev.filter((id) => id !== planId));
        setComparePlans((prev) => {
          const next = { ...prev };
          delete next[planId];
          return next;
        });
      }
    } catch (err) {
      console.error('Delete saved plan error:', err);
    }
  };

  const handleToggleCompare = async (planId) => {
    if (compareIds.includes(planId)) {
      setCompareIds((prev) => prev.filter((id) => id !== planId));
      return;
    }

    if (compareIds.length >= 2) {
      setMessage('❌ En fazla iki plan karşılaştırabilirsiniz');
      return;
    }

    setCompareIds((prev) => [...prev, planId]);
    if (comparePlans[planId]) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/planner/weekly-plan/${planId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComparePlans((prev) => ({
          ...prev,
          [planId]: data
        }));
      }
    } catch (err) {
      console.error('Compare plan fetch error:', err);
    }
  };

  const getDailyTotals = (plan) => {
    const daily = {};
    const days = plan?.plan?.haftalik_plan || [];
    days.forEach((day) => {
      daily[day.gun] = day.gunluk_toplam_kalori || 0;
    });
    return daily;
  };

  const compareData = compareIds
    .map((id) => comparePlans[id])
    .filter(Boolean);

  const buildDefaultGrid = useCallback(() => {
    const grid = {};
    REMINDER_DAYS.forEach((day) => {
      grid[day.index] = {};
      REMINDER_MEALS.forEach((meal) => {
        grid[day.index][meal.key] = { time: '', enabled: false };
      });
    });
    return grid;
  }, []);

  const mapRemindersToGrid = useCallback((reminders) => {
    const grid = buildDefaultGrid();
    (reminders || []).forEach((item) => {
      if (!grid[item.dayIndex] || !grid[item.dayIndex][item.mealType]) return;
      grid[item.dayIndex][item.mealType] = {
        time: item.time || '',
        enabled: item.enabled !== false
      };
    });
    return grid;
  }, [buildDefaultGrid]);

  useEffect(() => {
    setReminderGrid(buildDefaultGrid());
  }, [buildDefaultGrid]);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/planner/reminders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReminderGrid(mapRemindersToGrid(data.reminders));
        }
      } catch (err) {
        console.error('Reminder fetch error:', err);
      }
    };

    if (token) {
      fetchReminders();
    }
  }, [token, mapRemindersToGrid]);

  const updateReminderCell = (dayIndex, mealKey, updates) => {
    setReminderGrid((prev) => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        [mealKey]: {
          ...prev[dayIndex][mealKey],
          ...updates
        }
      }
    }));
  };

  const handleSaveReminders = async () => {
    try {
      setReminderSaving(true);
      const reminders = [];
      REMINDER_DAYS.forEach((day) => {
        REMINDER_MEALS.forEach((meal) => {
          const cell = reminderGrid?.[day.index]?.[meal.key];
          if (!cell?.time || !cell.enabled) return;
          reminders.push({
            dayIndex: day.index,
            mealType: meal.key,
            time: cell.time,
            enabled: true
          });
        });
      });

      const res = await fetch(`${process.env.REACT_APP_API_URL}/planner/reminders`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reminders })
      });

      if (res.ok) {
        setMessage('✓ Hatirlaticilar kaydedildi');
      } else {
        setMessage('❌ Hatirlatici kaydedilemedi');
      }
    } catch (err) {
      console.error('Reminder save error:', err);
      setMessage('❌ Hatirlatici kaydedilemedi');
    } finally {
      setReminderSaving(false);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Tarayiciniz bildirimleri desteklemiyor');
      return;
    }

    if (!window.isSecureContext) {
      setMessage('❌ Bildirimler yalnizca guvenli baglamda calisir (https veya localhost)');
      return;
    }

    if (Notification.permission === 'denied') {
      setMessage('❌ Bildirim izni daha once reddedildi. Tarayici ayarlarindan izin verin.');
      return;
    }

    setMessage('⌛ Bildirim izni isteniyor...');

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setMessage('❌ Bildirim izni verilmedi');
      return;
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          registration = await navigator.serviceWorker.register('/service-worker.js');
        }
        if (!registration) {
          setMessage('❌ Service Worker kaydi basarisiz');
          return;
        }

        const readyRegistration = await navigator.serviceWorker.ready;
        registration = readyRegistration || registration;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const publicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';
          if (!publicKey) {
            alert('❌ VAPID public key bulunamadi');
            return;
          }
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });
        }

        await fetch(`${process.env.REACT_APP_API_URL}/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ subscription: subscription.toJSON() })
        });

        setMessage('✓ Bildirim izni ve abonelik tamamlandi');
      } catch (err) {
        console.error('Push subscription error:', err);
        setMessage('❌ Bildirim aboneligi basarisiz');
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📋 Haftalık Diyet Planı</h1>
        <p>Kişisel özelliklerinize uygun 7 günlük diyet planı oluşturun</p>
      </div>

      {/* Plan Oluşturma Formu */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2>📝 Plan Parametreleri</h2>
        
        <div className="form-group">
          <label>Profil Bilgileri:</label>
          <div style={{ 
            backgroundColor: 'var(--input-bg)', 
            padding: '12px', 
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <p>🎯 <strong>Hedef Kalori:</strong> {calorieTarget} kcal/gün</p>
            <p>🏆 <strong>Hedef:</strong> {goalText}</p>
            <p>👤 <strong>Cinsiyet:</strong> {profile.gender === 'male' ? 'Erkek' : 'Kadın'}</p>
            <p>📏 <strong>Kilo:</strong> {profile.weight || '-'} kg</p>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="favorites">Favori Yemekleriniz *</label>
          <textarea
            id="favorites"
            placeholder="Örn: Tavuk döner, Kuru fasulye, Yoğurt..."
            value={favorites}
            onChange={(e) => setFavorites(e.target.value)}
            style={{ minHeight: '80px' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="allergies">Alerjileri Olan Besinler</label>
          <textarea
            id="allergies"
            placeholder="Örn: Yer fıstığı, Deniz ürünleri..."
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            style={{ minHeight: '80px' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="dislikes">Sevmediğiniz/Tüketmediğiniz Besinler</label>
          <textarea
            id="dislikes"
            placeholder="Örn: Mantar, Kereviz..."
            value={dislikes}
            onChange={(e) => setDislikes(e.target.value)}
            style={{ minHeight: '80px' }}
          />
        </div>

        <button
          onClick={handleGeneratePlan}
          disabled={loading || !favorites}
          className="btn-primary"
          style={{ width: '100%', padding: '12px' }}
        >
          {loading ? '⏳ Plan Oluşturuluyor...' : '🎯 Planı Oluştur'}
        </button>

        {message && (
          <div style={{
            marginTop: '15px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: message.startsWith('✓') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            color: message.startsWith('✓') ? '#4CAF50' : '#f44336',
            border: `1px solid ${message.startsWith('✓') ? '#4CAF50' : '#f44336'}`
          }}>
            {message}
          </div>
        )}
      </div>

      {/* Haftalık Plan Gösterimi */}
      {planData && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2>📅 Haftalık Plan</h2>
          
          {planData.haftalik_plan && planData.haftalik_plan.map((day, dayIndex) => (
            <div key={dayIndex} style={{ marginBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
              <button
                onClick={() => handleToggleDay(dayIndex)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'var(--input-bg)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>
                  📅 {day.gun} - {day.gunluk_toplam_kalori} kcal
                </span>
                <span>{expandedDay === dayIndex ? '▼' : '▶'}</span>
              </button>

              {expandedDay === dayIndex && (
                <div style={{ paddingLeft: '15px', marginBottom: '15px' }}>
                  {day.ogunler && day.ogunler.map((meal, mealIndex) => (
                    <div
                      key={mealIndex}
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '10px',
                        borderLeft: '4px solid var(--primary-color)'
                      }}
                    >
                      <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                        🍽️ {meal.ogun_tipi}
                      </p>
                      <p style={{ margin: '0 0 5px 0' }}>
                        <strong>{meal.yemek_adi}</strong> - {meal.kalori} kcal
                      </p>
                      <p style={{ margin: '0', fontSize: '12px', color: 'var(--secondary-text)' }}>
                        {meal.makro_ozet}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alışveriş Listesi */}
      {planData && planData.alisveris_listesi && (
        <div className="card">
          <h2>🛒 Haftalık Alışveriş Listesi</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {planData.alisveris_listesi.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  backgroundColor: checkedItems[index] ? 'rgba(76, 175, 80, 0.1)' : 'var(--input-bg)',
                  borderRadius: '8px',
                  border: checkedItems[index] ? '2px solid #4CAF50' : '1px solid var(--border-color)',
                  textDecoration: checkedItems[index] ? 'line-through' : 'none',
                  opacity: checkedItems[index] ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={checkedItems[index] || false}
                    onChange={() => handleToggleItem(index)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                      {item.urun}
                    </p>
                    <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: 'var(--secondary-text)' }}>
                      📦 {item.miktar}
                    </p>
                    <p style={{ margin: '0', fontSize: '11px', color: 'var(--tertiary-text)' }}>
                      {item.kategori}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hatırlatıcı Saatleri */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h2>🔔 Haftalik Hatirlaticilar</h2>
        <p style={{ marginBottom: '12px', color: 'var(--secondary-text)', fontSize: '14px' }}>
          Gun ve ogun bazli saatleri ayarlayin. Bildirimler tarayici kapaliyken de gelebilir.
        </p>
        <div style={{ display: 'grid', gap: '10px' }}>
          {REMINDER_DAYS.map((day) => (
            <div key={day.index} style={{ backgroundColor: 'var(--input-bg)', padding: '12px', borderRadius: '8px' }}>
              <strong>{day.label}</strong>
              <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                {REMINDER_MEALS.map((meal) => {
                  const cell = reminderGrid?.[day.index]?.[meal.key] || { time: '', enabled: false };
                  return (
                    <div key={meal.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px', gap: '10px', alignItems: 'center' }}>
                      <span>{meal.label}</span>
                      <input
                        type="time"
                        value={cell.time}
                        onChange={(e) => updateReminderCell(day.index, meal.key, { time: e.target.value })}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        <input
                          type="checkbox"
                          checked={cell.enabled}
                          onChange={(e) => updateReminderCell(day.index, meal.key, { enabled: e.target.checked })}
                        />
                        Aktif
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveReminders}
          className="btn-primary"
          style={{ width: '100%', padding: '12px', marginTop: '15px' }}
          disabled={reminderSaving}
        >
          {reminderSaving ? 'Kaydediliyor...' : 'Hatirlaticilari Kaydet'}
        </button>
        <button
          onClick={handleEnableNotifications}
          className="btn-secondary"
          style={{ width: '100%', padding: '12px', marginTop: '10px' }}
        >
          🔔 Bildirim Izni ve Abonelik
        </button>
      </div>

      {/* Kaydedilen Planlar */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h2>🗂️ Kaydedilen Planlar</h2>
        {historyLoading ? (
          <div className="loading">Yükleniyor...</div>
        ) : weeklyPlans.length === 0 ? (
          <p className="empty-state">Henüz kaydedilmiş plan yok</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {weeklyPlans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'grid',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <strong>{new Date(plan.createdAt).toLocaleDateString('tr-TR')}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                      🎯 {plan.params?.calorieTarget || '-'} kcal • 🏆 {plan.params?.goalText || '-'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleLoadSavedPlan(plan.id)} className="btn-secondary">
                      Görüntüle
                    </button>
                    <button onClick={() => handleToggleCompare(plan.id)} className="btn-primary">
                      {compareIds.includes(plan.id) ? 'Seçildi' : 'Karşılaştır'}
                    </button>
                    <button
                      onClick={() => handleDeleteSavedPlan(plan.id)}
                      className="btn-secondary"
                      style={{ backgroundColor: '#f44336', color: '#fff' }}
                    >
                      Sil
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tertiary-text)' }}>
                  Favoriler: {plan.params?.favorites || '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Karşılaştırma */}
      {compareData.length === 2 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h2>📊 Plan Karşılaştırma</h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            {(() => {
              const [a, b] = compareData;
              const aTotals = getDailyTotals(a);
              const bTotals = getDailyTotals(b);
              const allDays = Array.from(new Set([...Object.keys(aTotals), ...Object.keys(bTotals)]));
              return allDays.map((day) => (
                <div
                  key={day}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr',
                    gap: '10px',
                    padding: '10px',
                    backgroundColor: 'var(--input-bg)',
                    borderRadius: '6px'
                  }}
                >
                  <div><strong>{day}</strong></div>
                  <div>{aTotals[day] || 0} kcal</div>
                  <div>{bTotals[day] || 0} kcal</div>
                  <div style={{ fontWeight: 'bold' }}>
                    {(aTotals[day] || 0) - (bTotals[day] || 0)}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= SETTINGS PAGE =============
function SettingsPage({ user, token, onLogout }) {
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('tr');
  const [fontSize, setFontSize] = useState('normal');
  const [message, setMessage] = useState('');
  const [reminders, setReminders] = useState([]);
  const [newReminderLabel, setNewReminderLabel] = useState('Su Hatırlatıcısı');
  const [newReminderTime, setNewReminderTime] = useState('12:00');
  const timersRef = useRef({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/users/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTheme(data.theme || 'light');
          setLanguage(data.language || 'tr');
          setFontSize(data.fontSize || 'normal');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    fetchSettings();
  }, [token]);

  useEffect(() => {
    // load reminders from localStorage
    const stored = localStorage.getItem('reminders');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setReminders(parsed || []);
      } catch (e) {
        console.error('reminders load error', e);
      }
    }
  }, []);

  const triggerReminder = useCallback(async (rem) => {
    // Try Push API first (persistent)
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Send to backend via Push API
          await fetch(`${process.env.REACT_APP_API_URL}/push/notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title: rem.label, body: `Saat: ${rem.time}` })
          });
          return;
        }
      } catch (e) {
        console.error('Push notification error', e);
      }
    }

    // Fallback to local notification
    if (window.Notification && Notification.permission === 'granted') {
      try {
        new Notification(rem.label || 'Hatırlatma', { body: `Saat: ${rem.time}` });
      } catch (e) {
        alert(`${rem.label} - ${rem.time}`);
      }
    } else {
      alert(`${rem.label} - ${rem.time}`);
    }
  }, [token]);

  useEffect(() => {
    // schedule reminders whenever they change
    Object.values(timersRef.current).forEach(id => clearTimeout(id));
    timersRef.current = {};

    reminders.forEach((rem) => {
      const now = new Date();
      const [hh, mm] = rem.time.split(':').map(Number);
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const diff = next.getTime() - now.getTime();
      const id = setTimeout(() => {
        triggerReminder(rem);
        // reschedule next occurrence in 24h
        timersRef.current[rem.id] = setInterval(() => triggerReminder(rem), 24 * 60 * 60 * 1000);
      }, diff);
      timersRef.current[rem.id] = id;
    });

    return () => {
      Object.values(timersRef.current).forEach(id => clearTimeout(id));
    };
  }, [reminders, triggerReminder]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return alert('Tarayıcınız bildirimleri desteklemiyor');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      alert('Bildirim izni verilmedi');
      return;
    }

    // Subscribe to push notifications
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          // Generate VAPID keys (for production, these should come from backend)
          const publicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';
          if (!publicKey) {
            alert('❌ VAPID public key bulunamadi');
            return;
          }
          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });

          // Save subscription to backend
          const res = await fetch(`${process.env.REACT_APP_API_URL}/push/subscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subscription: newSubscription.toJSON() })
          });

          if (res.ok) {
            alert('✓ Bildirim aboneliği başarılı');
          } else {
            alert('❌ Abonelik kaydedilemedi');
          }
        } else {
          alert('✓ Zaten bildirim abonesi');
        }
      } catch (err) {
        console.error('Push subscription error', err);
        alert('❌ Abonelik hatası: ' + err.message);
      }
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const saveRemindersToStorage = (list) => {
    localStorage.setItem('reminders', JSON.stringify(list));
  };

  const addReminder = () => {
    const id = Date.now().toString();
    const rem = { id, label: newReminderLabel || 'Hatırlatma', time: newReminderTime };
    const updated = [...reminders, rem];
    setReminders(updated);
    saveRemindersToStorage(updated);
  };

  const removeReminder = (id) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    saveRemindersToStorage(updated);
  };

  const updateSettings = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme, language, fontSize, unit: 'metric' })
      });
      if (res.ok) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        setMessage('✓ Ayarlar güncellendi');
      }
    } catch (err) {
      setMessage('❌ Hata: ' + err.message);
    }
  };

  const profile = user?.profile || {};

  return (
    <div className="page-container">
      <h1>⚙️ Ayarlar</h1>

      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
        <h2>👤 Profil Bilgileri</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div><label>Yaş</label><div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{profile.age || '-'}</div></div>
          <div><label>Cinsiyet</label><div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{profile.gender === 'male' ? 'Erkek' : profile.gender === 'female' ? 'Kadın' : '-'}</div></div>
          <div><label>Boy</label><div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{profile.height || '-'} cm</div></div>
          <div><label>Kilo</label><div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{profile.weight || '-'} kg</div></div>
          <div><label>Hedef Kilo</label><div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{profile.goalWeight || '-'} kg</div></div>
          <div><label>Hedef</label><div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{profile.goal === 'lose' ? 'Kilo Ver' : profile.goal === 'gain' ? 'Kilo Al' : 'Koru'}</div></div>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
        <h2>🎨 Tema Ayarları</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
          <div>
            <label>Tema</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px' }}>
              <option value="light">Açık Tema</option>
              <option value="dark">Koyu Tema</option>
            </select>
          </div>
          <div>
            <label>Yazı Boyutu</label>
            <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px' }}>
              <option value="small">Küçük</option>
              <option value="normal">Normal</option>
              <option value="large">Büyük</option>
            </select>
          </div>
          <div>
            <label>Dil</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px' }}>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <button onClick={updateSettings} style={{ marginTop: '15px', padding: '10px 20px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          💾 Ayarları Kaydet
        </button>
      </div>

      <div style={{ backgroundColor: '#ffebee', padding: '20px', borderRadius: '10px' }}>
        <h2>🚪 Oturum</h2>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          Çıkış Yap
        </button>
      </div>

      <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
        <h2>⏰ Hatırlatıcılar</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
          <input type="text" value={newReminderLabel} onChange={(e) => setNewReminderLabel(e.target.value)} style={{ flex: '1', padding: '8px' }} />
          <input type="time" value={newReminderTime} onChange={(e) => setNewReminderTime(e.target.value)} style={{ padding: '8px' }} />
          <button onClick={addReminder} style={{ padding: '8px 12px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '5px' }}>➕ Ekle</button>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={requestNotificationPermission} style={{ padding: '8px 12px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '5px' }}>🔔 Bildirim İzni İste</button>
        </div>
        <div>
          {reminders.length === 0 && <div style={{ color: '#666' }}>Henüz hatırlatıcı yok</div>}
          {reminders.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <div>{r.label} — {r.time}</div>
              <div>
                <button onClick={() => removeReminder(r.id)} style={{ padding: '6px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px' }}>Sil</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {message && <div style={{ marginTop: '20px', padding: '10px', backgroundColor: message.startsWith('✓') ? '#c8e6c9' : '#ffcdd2', borderRadius: '5px' }}>{message}</div>}
    </div>
  );
}

// ============= ANA UYGULAMA =============
function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, token, login, logout, loading, updateUser } = React.useContext(AuthContext);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.setAttribute('data-theme', savedTheme);

    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(err => {
        console.error('Service Worker registration failed:', err);
      });
    }
  }, []);
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
          <button onClick={() => setCurrentPage('dashboard')} className={currentPage === 'dashboard' ? 'active' : ''}>📊 Dashboard</button>
          <button onClick={() => setCurrentPage('food')} className={currentPage === 'food' ? 'active' : ''}>🔍 Arama</button>
          <button onClick={() => setCurrentPage('photo')} className={currentPage === 'photo' ? 'active' : ''}>📸 Foto</button>
          <button onClick={() => setCurrentPage('exercise')} className={currentPage === 'exercise' ? 'active' : ''}>🏃 Egzersiz</button>
          <button onClick={() => setCurrentPage('planner')} className={currentPage === 'planner' ? 'active' : ''}>📋 Haftalık Plan</button>
          <button onClick={() => setCurrentPage('history')} className={currentPage === 'history' ? 'active' : ''}>📜 Geçmiş</button>
          <button onClick={() => setCurrentPage('favorites')} className={currentPage === 'favorites' ? 'active' : ''}>❤️ Favori</button>
          <button onClick={() => setCurrentPage('stats')} className={currentPage === 'stats' ? 'active' : ''}>📈 İstatistik</button>
          <button onClick={() => setCurrentPage('profile')} className={currentPage === 'profile' ? 'active' : ''}>👤 Profil</button>
          <button onClick={() => setCurrentPage('settings')} className={currentPage === 'settings' ? 'active' : ''}>⚙️ Ayarlar</button>
          <button onClick={logout} className="logout-btn">🚪 Çıkış Yap</button>
        </div>
      </nav>

      <main className="main-content">
        {currentPage === 'dashboard' && <DashboardPage user={user} token={token} />}
        {currentPage === 'food' && <FoodSearchPage user={user} token={token} onFoodAdded={() => setCurrentPage('dashboard')} />}
        {currentPage === 'photo' && <PhotoAnalyzePage token={token} />}
        {currentPage === 'exercise' && <ExercisePage token={token} />}
        {currentPage === 'planner' && <WeeklyPlannerPage user={user} token={token} />}
        {currentPage === 'history' && <HistoryPage token={token} />}
        {currentPage === 'favorites' && <FavoritesPage user={user} token={token} />}
        {currentPage === 'stats' && <StatsPage token={token} />}
        {currentPage === 'profile' && <ProfilePage user={user} token={token} onProfileUpdate={updateUser} />}
        {currentPage === 'settings' && <SettingsPage user={user} token={token} onLogout={logout} />}
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
