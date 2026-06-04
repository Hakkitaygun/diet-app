# 🥗 Diyet Rehberi Uygulaması - Kurulum Rehberi

Çoklu cihazlı, Gemini API entegre, tam veritabanı destekli diyet takip uygulaması.

---

## 📋 Sistem Gereksinimleri

- **Node.js**: v14 veya üzeri
- **npm** veya **yarn**: v6 veya üzeri
- **MongoDB**: v4.4 veya üzeri (veya MongoDB Atlas bulut hesabı)
- **Gemini API Key**: Google AI Studio'dan ücretsiz alabilirsiniz

---

## 🚀 Hızlı Kurulum (5 Dakika)

### 1️⃣ BACKEND KURULUMU

```bash
# Proje dizinine git
cd diet-app-backend

# Bağımlılıkları yükle
npm install

# .env dosyasını düzenle
# MONGODB_URI, JWT_SECRET, GEMINI_API_KEY'i ayarla

# Sunucuyu başlat
npm start
```

✓ Sunucu `http://localhost:5000` adresinde çalışıyor

### 2️⃣ FRONTEND KURULUMU

```bash
cd diet-app-frontend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
echo "REACT_APP_API_URL=http://localhost:5000" > .env

# Uygulamayı başlat
npm start
```

✓ Frontend `http://localhost:3000` adresinde açılıyor

---

## 🔑 Gemini API Kurulumu

### Adım 1: API Key Almak

1. Google AI Studio'ya git: https://aistudio.google.com/app/apikey
2. **"Get API Key"** tıkla
3. **"Create API Key in new project"** seç
4. API Key'i kopyala

### Adım 2: .env'ye Ekle

```
GEMINI_API_KEY=sk-_______________________
```

### Adım 3: Test Et

Uygulamada "Gıda Arama" sayfasında "Tavuk döner pide" yazıp dene.

---

## 🗄️ MongoDB Kurulumu

### Seçenek A: Yerel MongoDB (Windows/Mac/Linux)

```bash
# MongoDB Community Edition'ı indir ve kur
# https://www.mongodb.com/try/download/community

# Terminal/CMD'de başlat
mongod

# .env'de şu adresi kullan:
MONGODB_URI=mongodb://localhost:27017/diet-app
```

### Seçenek B: MongoDB Atlas (Bulut)

1. https://www.mongodb.com/cloud/atlas'a git
2. Ücretsiz hesap oluştur
3. Cluster oluştur (M0 - ücretsiz)
4. Connection String'i kopyala
5. .env'de kullan:

```
MONGODB_URI=mongodb+srv://username:password@cluster0.abc123.mongodb.net/diet-app
```

---

## 📊 Uygulamanın Özellikleri

### 🔐 Kimlik Doğrulama
- Email/Şifre ile kayıt
- JWT token tabanlı oturum
- Güvenli şifre hash (bcrypt)

### 👤 Profil Yönetimi
- Boy, kilo, yaş, cinsiyet
- Aktivite seviyesi (hareketsiz → 2x spor)
- Hedef (zayıflama, kilo sabitlemek, kilo alma)

### 📈 Kalori Hesaplaması
**Harris-Benedict Formülü ile:**
```
BMR (Bazal Metabolik Hız) hesaplanır
TDEE = BMR × Aktivite Seviyesi
Hedef Kalori = TDEE × (0.85 zayıflama / 1.0 sabit / 1.15 kilo alma)
```

### 🍎 Gıda Analizi (Gemini API)
Kullanıcı yemek yazıyor → Gemini API analiz ediyor → Besin değerleri gösteriliyor:
- Kalori (kcal)
- Protein (g)
- Karbohidrat (g)
- Yağ (g)
- Fiber (g)
- Vitaminler & Mineraller

### 📋 Günlük Takip
- Bugünün yemeklerini listele
- Kalori ilerleme çubuğu
- Kalan kalori hesapla
- Makro besinleri göster

---

## 🛠️ API Endpoints

### Kimlik Doğrulama
```
POST /auth/register
POST /auth/login
GET /auth/me (Protected)
```

### Kullanıcı Profili
```
PUT /users/profile (Protected)
```

### Gıda
```
POST /foods/analyze (Protected)
  Body: { foodDescription: "string" }
  Response: { calories, protein, carbs, fat, fiber, micronutrients }
```

### Günlük Log
```
POST /logs/add-food (Protected)
GET /logs/today (Protected)
GET /logs/week (Protected)
DELETE /logs/:id (Protected)
```

---

## 📱 Örnek Kullanım Akışı

1. **Kayıt Ol**
   - Email: user@example.com
   - Şifre: Secure123!

2. **Profil Ayarla**
   - Boy: 180 cm
   - Kilo: 80 kg
   - Yaş: 25
   - Cinsiyet: Erkek
   - Aktivite: Orta Aktif (3-5 gün spor)
   - Hedef: Zayıflama

3. **Kalori Hedefi Görüntüle**
   - TDEE: ~2800 kcal
   - Hedef: ~2400 kcal (%15 açık)

4. **Gıda Ekle**
   - "Tavuk döner pide, 1 bardak çay"
   - Gemini analiz eder → 450 kcal, 25g protein...
   - Günlüğe ekle

5. **İlerlemeyi Takip Et**
   - Dashboard'da günlük kalori gösteriliyor
   - Kalan 1950 kcal
   - Diğer yemekleri ekle

---

## 🔧 Gelişmiş Ayarlar

### Development Mode (Otomatik Yeniden Başlatma)

```bash
# Backend
npm run dev

# Frontend
npm start
```

### Production Deploy

```bash
# Backend
npm install -g pm2
pm2 start server.js --name "diet-app"

# Frontend
npm run build
# 'build' klasörünün içeriğini web sunucusuna yükle
```

### Veritabanı Backup

```bash
# MongoDB Atlas'dan otomatik yapılır

# Yerel MongoDB'den manual backup:
mongodump --uri "mongodb://localhost:27017/diet-app" --out backup/
```

---

## 🐛 Sorun Giderme

### "GEMINI_API_KEY undefined" Hatası
```
✓ .env dosyasında GEMINI_API_KEY ayarladın mı?
✓ Server'ı yeniden başlat (npm start)
✓ API Key'in geçerli mi? (https://aistudio.google.com/app/apikey)
```

### "MongoDB Connection Failed"
```
✓ MongoDB çalışıyor mu? (mongod komutunu çalıştır)
✓ MONGODB_URI doğru mu?
✓ Atlas hesabında IP whitelist ayarlandı mı?
```

### CORS Hatası
```
✓ Backend'te CORS aktif mı? (server.js'de var)
✓ Frontend API_URL doğru mu? (http://localhost:5000)
✓ Backend ve frontend ayrı portlarda mı?
```

### "Invalid Token" Hatası
```
✓ JWT_SECRET backend'te consistent mi?
✓ Token localStorage'da kaydedildi mi?
✓ Token süresi dolmadı mı? (30 gün)
```

---

## 🎯 Gelecek Özellikler

- [ ] Google/Apple ile giriş
- [ ] Fotodan yemek tanıma (Gemini Vision)
- [ ] Diyet planları ve öneriler
- [ ] Sosyal paylaşım
- [ ] Mobil uygulama (React Native)
- [ ] Beslenme danışmanı entegrasyonu
- [ ] AI-destekli workout önerileri

---

## 📞 Destek

Sorun yaşıyorsan:
1. SETUP_GUIDE.md'deki "Sorun Giderme" bölümünü kontrol et
2. Konsol hata mesajlarını oku
3. GitHub Issues'e git

---

## 📄 Lisans

MIT License - Açık kaynak olarak kullan istersen kullan!

---

**Başarılar! 🚀 Diyet hedeflerine ulaşabilirsin!**
