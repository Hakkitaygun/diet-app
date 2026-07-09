// ============= DEPENDENCIES =============
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const axios = require('axios');
const cors = require('cors');
const webpush = require('web-push');
const cron = require('node-cron');
require('dotenv').config();

// ============= SETUP =============
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/diet-app';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1';
const GEMINI_VISION_API_KEY = process.env.GEMINI_VISION_API_KEY;
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash';
const GEMINI_VISION_API_VERSION = process.env.GEMINI_VISION_API_VERSION || 'v1beta';
const GEMINI_PLANNER_API_KEY = process.env.GEMINI_PLANNER_API_KEY;
const GEMINI_PLANNER_MODEL = process.env.GEMINI_PLANNER_MODEL || 'gemini-2.5-flash';
const GEMINI_PLANNER_API_VERSION = process.env.GEMINI_PLANNER_API_VERSION || 'v1';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('⚠️  VAPID keys are missing. Push notifications will be skipped.');
}

// ============= DATABASE SCHEMAS =============

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile: {
    height: Number,
    weight: Number,
    age: Number,
    birthDate: String,
    gender: String,
    activityLevel: Number,
    goal: String,
    goalWeight: Number
  },
  waterGoal: { type: Number, default: 2000 },
  macroTargets: {
    proteinPercent: { type: Number, default: 30 },
    carbsPercent: { type: Number, default: 40 },
    fatPercent: { type: Number, default: 30 }
  },
  favoriteFoods: [String],
  settings: {
    theme: { type: String, default: 'light' },
    language: { type: String, default: 'tr' },
    fontSize: { type: String, default: 'normal' },
    unit: { type: String, default: 'metric' }
  },
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  },
  reminders: [
    {
      dayIndex: Number,
      mealType: String,
      time: String,
      enabled: { type: Boolean, default: true },
      lastSentAt: Date
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

// Exercise Log Schema
const exerciseLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  activity: String,
  duration: Number,  // minutes
  intensity: String,  // light, moderate, intense
  caloriesBurned: Number
});

// Food Log Schema
const foodLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  mealType: String,
  name: String,
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  fiber: Number,
  micronutrients: [String],
  isDeleted: { type: Boolean, default: false }
});

// Water Log Schema
const waterLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  amount: Number  // in ml
});

// Weekly Plan Schema
const weeklyPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  params: {
    calorieTarget: Number,
    goalText: String,
    favorites: String,
    allergies: String,
    dislikes: String
  },
  plan: {
    type: Object,
    required: true
  }
});

const User = mongoose.model('User', userSchema);
const FoodLog = mongoose.model('FoodLog', foodLogSchema);
const WaterLog = mongoose.model('WaterLog', waterLogSchema);
const WeeklyPlan = mongoose.model('WeeklyPlan', weeklyPlanSchema);

const ExerciseLog = mongoose.model('ExerciseLog', exerciseLogSchema);
// Local fallback for environments without MongoDB
const memoryStore = {
  users: [],
  foodLogs: [],
  weeklyPlans: []
};

let useMemoryStore = false;

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ============= EXERCISE LOG HELPERS =============

async function saveExerciseLog(exerciseLogData) {
  if (useMemoryStore) {
    memoryStore.exerciseLogs = memoryStore.exerciseLogs || [];
    const exerciseLog = {
      _id: createId(),
      date: new Date(),
      ...exerciseLogData
    };
    memoryStore.exerciseLogs.push(exerciseLog);
    return exerciseLog;
  }

  const exerciseLog = new ExerciseLog(exerciseLogData);
  await exerciseLog.save();
  return exerciseLog;
}

async function findTodayExerciseLogs(userId, startOfDay, endOfDay) {
  if (useMemoryStore) {
    memoryStore.exerciseLogs = memoryStore.exerciseLogs || [];
    return memoryStore.exerciseLogs.filter((log) => {
      const logDate = new Date(log.date);
      return String(log.userId) === String(userId) && logDate >= startOfDay && logDate < endOfDay;
    });
  }

  return ExerciseLog.find({
    userId,
    date: {
      $gte: startOfDay,
      $lt: endOfDay
    }
  });
}

async function findWeekExerciseLogs(userId, weekAgo, today) {
  if (useMemoryStore) {
    memoryStore.exerciseLogs = memoryStore.exerciseLogs || [];
    return memoryStore.exerciseLogs.filter((log) => {
      const logDate = new Date(log.date);
      return String(log.userId) === String(userId) && logDate >= weekAgo && logDate <= today;
    });
  }

  return ExerciseLog.find({
    userId,
    date: {
      $gte: weekAgo,
      $lte: today
    }
  });
}

function toPlainUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    email: user.email,
    password: user.password,
    profile: user.profile,
    createdAt: user.createdAt
  };
}

function toPlainFoodLog(log) {
  if (!log) return null;
  return {
    _id: log._id,
    userId: log.userId,
    date: log.date,
    name: log.name,
    calories: log.calories,
    protein: log.protein,
    carbs: log.carbs,
    fat: log.fat,
    fiber: log.fiber,
    micronutrients: log.micronutrients
  };
}

async function findUserByEmail(email) {
  if (useMemoryStore) {
    return memoryStore.users.find((user) => user.email === email) || null;
  }

  return User.findOne({ email });
}

async function findUserById(userId) {
  if (useMemoryStore) {
    return memoryStore.users.find((user) => String(user._id) === String(userId)) || null;
  }

  return User.findById(userId);
}

async function saveUser(userData) {
  if (useMemoryStore) {
    const user = toPlainUser({
      _id: createId(),
      createdAt: new Date(),
      ...userData
    });
    memoryStore.users.push(user);
    return user;
  }

  const user = new User(userData);
  await user.save();
  return user;
}

async function updateUserProfile(userId, profile) {
  if (useMemoryStore) {
    const user = memoryStore.users.find((item) => String(item._id) === String(userId));
    if (!user) return null;
    user.profile = profile;
    return user;
  }

  return User.findByIdAndUpdate(
    userId,
    { profile },
    { new: true }
  );
}

async function saveFoodLog(foodLogData) {
  if (useMemoryStore) {
    const foodLog = toPlainFoodLog({
      _id: createId(),
      date: new Date(),
      ...foodLogData
    });
    memoryStore.foodLogs.push(foodLog);
    return foodLog;
  }

  const foodLog = new FoodLog(foodLogData);
  await foodLog.save();
  return foodLog;
}

async function findTodayFoodLogs(userId, startOfDay, endOfDay) {
  if (useMemoryStore) {
    return memoryStore.foodLogs.filter((log) => {
      const logDate = new Date(log.date);
      return String(log.userId) === String(userId) && logDate >= startOfDay && logDate < endOfDay;
    });
  }

  return FoodLog.find({
    userId,
    date: {
      $gte: startOfDay,
      $lt: endOfDay
    }
  });
}

async function findWeekFoodLogs(userId, weekAgo, today) {
  if (useMemoryStore) {
    return memoryStore.foodLogs.filter((log) => {
      const logDate = new Date(log.date);
      return String(log.userId) === String(userId) && logDate >= weekAgo && logDate <= today;
    });
  }

  return FoodLog.find({
    userId,
    date: {
      $gte: weekAgo,
      $lte: today
    }
  });
}

async function deleteFoodLogById(logId) {
  if (useMemoryStore) {
    const index = memoryStore.foodLogs.findIndex((log) => String(log._id) === String(logId));
    if (index === -1) return null;
    const [removed] = memoryStore.foodLogs.splice(index, 1);
    return removed;
  }

  return FoodLog.findByIdAndDelete(logId);
}

// ============= WATER LOG HELPERS =============

async function saveWaterLog(waterLogData) {
  if (useMemoryStore) {
    const waterLog = {
      _id: createId(),
      date: new Date(),
      ...waterLogData
    };
    memoryStore.waterLogs = memoryStore.waterLogs || [];
    memoryStore.waterLogs.push(waterLog);
    return waterLog;
  }

  const waterLog = new WaterLog(waterLogData);
  await waterLog.save();
  return waterLog;
}

async function findTodayWaterLogs(userId, startOfDay, endOfDay) {
  if (useMemoryStore) {
    memoryStore.waterLogs = memoryStore.waterLogs || [];
    return memoryStore.waterLogs.filter((log) => {
      const logDate = new Date(log.date);
      return String(log.userId) === String(userId) && logDate >= startOfDay && logDate < endOfDay;
    });
  }

  return WaterLog.find({
    userId,
    date: {
      $gte: startOfDay,
      $lt: endOfDay
    }
  });
}

async function findWeekWaterLogs(userId, weekAgo, today) {
  if (useMemoryStore) {
    memoryStore.waterLogs = memoryStore.waterLogs || [];
    return memoryStore.waterLogs.filter((log) => {
      const logDate = new Date(log.date);
      return String(log.userId) === String(userId) && logDate >= weekAgo && logDate <= today;
    });
  }

  return WaterLog.find({
    userId,
    date: {
      $gte: weekAgo,
      $lte: today
    }
  });
}

// ============= REMINDER HELPERS =============

async function updateUserReminders(userId, reminders) {
  if (useMemoryStore) {
    const user = memoryStore.users.find((item) => String(item._id) === String(userId));
    if (!user) return null;
    user.reminders = reminders;
    return user;
  }

  return User.findByIdAndUpdate(userId, { reminders }, { new: true });
}

async function findUsersWithReminders() {
  if (useMemoryStore) {
    return (memoryStore.users || []).filter((user) => Array.isArray(user.reminders) && user.reminders.length > 0);
  }

  return User.find({ reminders: { $exists: true, $ne: [] } });
}

// ============= WEEKLY PLAN HELPERS =============

async function saveWeeklyPlan(planData) {
  if (useMemoryStore) {
    memoryStore.weeklyPlans = memoryStore.weeklyPlans || [];
    const weeklyPlan = {
      _id: createId(),
      createdAt: new Date(),
      ...planData
    };
    memoryStore.weeklyPlans.push(weeklyPlan);
    return weeklyPlan;
  }

  const weeklyPlan = new WeeklyPlan(planData);
  await weeklyPlan.save();
  return weeklyPlan;
}

async function findWeeklyPlansByUser(userId) {
  if (useMemoryStore) {
    memoryStore.weeklyPlans = memoryStore.weeklyPlans || [];
    return memoryStore.weeklyPlans
      .filter((plan) => String(plan.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return WeeklyPlan.find({ userId }).sort({ createdAt: -1 });
}

async function findWeeklyPlanById(planId) {
  if (useMemoryStore) {
    memoryStore.weeklyPlans = memoryStore.weeklyPlans || [];
    return memoryStore.weeklyPlans.find((plan) => String(plan._id) === String(planId)) || null;
  }

  return WeeklyPlan.findById(planId);
}

async function deleteWeeklyPlanById(planId) {
  if (useMemoryStore) {
    memoryStore.weeklyPlans = memoryStore.weeklyPlans || [];
    const index = memoryStore.weeklyPlans.findIndex((plan) => String(plan._id) === String(planId));
    if (index === -1) return null;
    const [removed] = memoryStore.weeklyPlans.splice(index, 1);
    return removed;
  }

  return WeeklyPlan.findByIdAndDelete(planId);
}

// ============= MIDDLEWARE =============

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token bulunamadı' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Geçersiz token' });
    req.user = user;
    next();
  });
};

// ============= AUTH ROUTES =============

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre gereklidir' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email zaten kullanılmaktadır' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await saveUser({
      email,
      password: hashedPassword,
      profile: {
        height: 170,
        weight: 70,
        age: 25,
        gender: 'male',
        activityLevel: 1.5,
        goal: 'lose'
      }
    });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Kayıt başarılı',
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/logs/food-history', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const logs = await findWeekFoodLogs(req.user.userId, thirtyDaysAgo, today);
    res.json({
      history: logs.reverse()
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre gereklidir' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Email veya şifre hatalı' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Email veya şifre hatalı' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Giriş başarılı',
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    res.json({
      id: user._id,
      email: user.email,
      profile: user.profile
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// ============= USER ROUTES =============

app.put('/users/profile', authenticateToken, async (req, res) => {
  try {
    const { height, weight, age, birthDate, gender, activityLevel, goal, goalWeight } = req.body;

    const user = await updateUserProfile(req.user.userId, {
      height,
      weight,
      age,
      birthDate,
      gender,
      activityLevel,
      goal,
      goalWeight
    });

    res.json({
      message: 'Profil güncellendi',
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// ============= GEMINI API INTEGRATION =============

async function analyzeFoodWithGemini(foodDescription) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY ayarlanmamış');
  }

  const endpointCandidates = [
    { apiVersion: GEMINI_API_VERSION, model: GEMINI_MODEL },
    { apiVersion: 'v1beta', model: GEMINI_MODEL },
    { apiVersion: 'v1beta', model: 'gemini-1.5-flash' }
  ].filter(
    (candidate, index, arr) =>
      arr.findIndex(
        (item) =>
          item.apiVersion === candidate.apiVersion && item.model === candidate.model
      ) === index
  );

  const prompt = `
Sen uzman bir Turk diyetisyensin. Kullanici net gramaj, adet veya "restoran" belirtmedikce her zaman standart ev yapimi, az yagli, tek kisilik ortalama porsiyon baz al.
Asla porsiyonu buyutme. Varsayim yaptiginda baz alinan miktari acik yaz.
Sadece JSON dondur.

Ornek:
Girdi: "1 porsiyon karniyarik"
Cikti:
{
  "calories": 230,
  "protein": 12,
  "carbs": 10,
  "fat": 15,
  "fiber": 5,
  "micronutrients": ["Demir", "Potasyum"],
  "base_amount": "1 orta boy patlican, yaklasik 220 g"
}

"${foodDescription}" icin asagidaki bilgileri JSON formatinda sagla:
- Kalori (kcal)
- Protein (g)
- Karbohidrat (g)
- Yag (g)
- Fiber (g)
- Onemli vitamin ve mineraller (dizi)
- Baz alinan miktar (metin)

Yanıt formati:
{
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "micronutrients": ["Vitamin C", "Potasyum", "Kalsiyum"],
  "base_amount": ""
}
`;

  try {
    let response;
    let lastError = null;

    for (const candidate of endpointCandidates) {
      try {
        response = await axios.post(
          `https://generativelanguage.googleapis.com/${candidate.apiVersion}/models/${candidate.model}:generateContent`,
          {
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2
            }
          },
          {
            headers: {
              'x-goog-api-key': GEMINI_API_KEY
            }
          }
        );

        if (
          candidate.apiVersion !== GEMINI_API_VERSION ||
          candidate.model !== GEMINI_MODEL
        ) {
          console.warn(
            `Gemini fallback kullanildi: ${candidate.apiVersion}/${candidate.model}`
          );
        }
        break;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        if (status === 404) {
          continue;
        }
        throw error;
      }
    }

    if (!response) {
      throw lastError || new Error('Gemini API yanit vermedi');
    }

    const responseText = response.data.candidates[0].content.parts[0].text;
    
    // JSON'u çıkart
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON bulunamadı');
    }

    const nutritionData = JSON.parse(jsonMatch[0]);
    
    return {
      calories: Math.round(nutritionData.calories || 0),
      protein: Math.round(nutritionData.protein || 0),
      carbs: Math.round(nutritionData.carbs || 0),
      fat: Math.round(nutritionData.fat || 0),
      fiber: Math.round(nutritionData.fiber || 0),
      micronutrients: nutritionData.micronutrients || [],
      baseAmount: nutritionData.base_amount || ''
    };
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw error;
  }
}

function normalizeVisionNutrition(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const calories = Number(raw.calories ?? raw.kalori ?? 0);
  const protein = Number(raw.protein ?? raw.protein_g ?? 0);
  const carbs = Number(raw.carbs ?? raw.karbonhidrat ?? 0);
  const fat = Number(raw.fat ?? raw.yag ?? 0);
  const fiber = Number(raw.fiber ?? raw.lif ?? 0);
  const baseAmount = raw.base_amount ?? raw.baz_alinan_miktar ?? '';
  const micronutrientsRaw = raw.micronutrients ?? raw.mikro_besinler ?? [];
  const micronutrients = Array.isArray(micronutrientsRaw)
    ? micronutrientsRaw
    : String(micronutrientsRaw)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    calories: Math.round(calories || 0),
    protein: Math.round(protein || 0),
    carbs: Math.round(carbs || 0),
    fat: Math.round(fat || 0),
    fiber: Math.round(fiber || 0),
    micronutrients,
    baseAmount
  };
}

function extractJsonFromModelText(text) {
  if (!text) {
    throw new Error('Model yaniti bos');
  }

  let cleaned = String(text).trim();

  // Remove markdown fences like ```json ... ```.
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (_err) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Model yanitinda JSON bulunamadi');
    }
    return JSON.parse(jsonMatch[0]);
  }
}

async function analyzeFoodImageWithGemini(imageBase64, mimeType) {
  if (!GEMINI_VISION_API_KEY) {
    throw new Error('GEMINI_VISION_API_KEY ayarlanmamış');
  }

  const systemPrompt =
    'Sen uzman bir Turk diyetisyensin. Gonderilen fotografdaki yemegi analiz et. ' +
    'Turkiye\'deki standart ev yemekleri kulturunu ve porsiyon boyutlarini (tabak/kase buyuklugune gore) tahmin et. ' +
    'Aksi bariz belli degilse yemekleri az yagli ve standart ev yapimi olarak varsay. ' +
    'Ciktiyi SADECE asagidaki JSON formatinda ver, markdown veya ekstra metin kullanma:' +
    '{"kalori": 0, "protein": 0, "karbonhidrat": 0, "yag": 0, "fiber": 0, "mikro_besinler": "string", "baz_alinan_miktar": "Fotograftan tahmin edilen porsiyon ve icerik aciklamasi"}';

  const imageData = imageBase64.replace(/^data:[^;]+;base64,/, '');

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/${GEMINI_VISION_API_VERSION}/models/${GEMINI_VISION_MODEL}:generateContent`,
    {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: imageData
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2
      }
    },
    {
      headers: {
        'x-goog-api-key': GEMINI_VISION_API_KEY
      }
    }
  );

  const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error('Gorsel analiz yaniti bos');
  }

  const nutritionData = extractJsonFromModelText(responseText);
  const normalized = normalizeVisionNutrition(nutritionData);
  if (!normalized) {
    throw new Error('Gorsel analiz JSONu gecersiz');
  }

  return normalized;
}

// ============= WEEKLY PLANNER =============

async function generateWeeklyPlanWithGemini(plannerData) {
  if (!GEMINI_PLANNER_API_KEY) {
    throw new Error('GEMINI_PLANNER_API_KEY ayarlanmamış');
  }

  const { calorieTarget, goalText, allergies, dislikes, favorites } = plannerData;

  const systemPrompt = `Sen uzman bir diyetisyensin. Kullanıcının günlük hedef kalorisi: ${calorieTarget} kcal, Hedefi: ${goalText}. Kullanıcının alerjileri: ${allergies || 'Yok'}, Sevmediği besinler: ${dislikes || 'Yok'}, Favori yemekleri: ${favorites || 'Yok'}.
Kurallar:
- Her gunun toplam kalorisi hedefe yakin olmali: ${calorieTarget} kcal hedefinin %95-%105 araliginda.
- "gunluk_toplam_kalori" ogun kalorilerinin toplami ile tutarli olmalidir.
- Hedefin altina bariz sekilde dusme; ortalama gunluk kalori hedefe yakin olsun.
Bu verileri analiz ederek SADECE aşağıdaki JSON formatında 7 günlük bir diyet planı ve bu planın tam ölçülü haftalık alışveriş listesini oluştur. Başka hiçbir metin veya markdown kullanma:

{
  "haftalik_plan": [
    {
      "gun": "Pazartesi",
      "ogunler": [
        { "ogun_tipi": "Kahvaltı", "yemek_adi": "Yulaf Lapası", "kalori": 350, "makro_ozet": "15g Protein, 40g Karb, 10g Yağ" },
        { "ogun_tipi": "Öğle", "yemek_adi": "Izgara Tavuk Salata", "kalori": 450, "makro_ozet": "40g Protein, 10g Karb, 15g Yağ" }
      ],
      "gunluk_toplam_kalori": 1800
    }
  ],
  "alisveris_listesi": [
    { "kategori": "Sebze & Meyve", "urun": "Domates", "miktar": "1 kg" },
    { "kategori": "Et & Şarküteri", "urun": "Tavuk Göğsü", "miktar": "1.5 kg" }
  ]
}`;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/${GEMINI_PLANNER_API_VERSION}/models/${GEMINI_PLANNER_MODEL}:generateContent`,
    {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2
      }
    },
    {
      headers: {
        'x-goog-api-key': GEMINI_PLANNER_API_KEY
      }
    }
  );

  const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error('Plan oluşturma yanıtı boş');
  }

  const planData = extractJsonFromModelText(responseText);
  if (!planData.haftalik_plan || !planData.alisveris_listesi) {
    throw new Error('Plan verisi eksik veya geçersiz');
  }

  const minDaily = Math.round(calorieTarget * 0.95);
  const maxDaily = Math.round(calorieTarget * 1.05);

  planData.haftalik_plan.forEach((day) => {
    const mealTotal = (day.ogunler || []).reduce((sum, meal) => sum + (Number(meal.kalori) || 0), 0);
    if (!day.gunluk_toplam_kalori || Math.abs(day.gunluk_toplam_kalori - mealTotal) > 50) {
      day.gunluk_toplam_kalori = mealTotal;
    }
  });

  const outOfRange = planData.haftalik_plan.some((day) => {
    const total = Number(day.gunluk_toplam_kalori) || 0;
    return total < minDaily || total > maxDaily;
  });

  if (outOfRange) {
    throw new Error('Plan hedef kaloriye uzak olusturuldu, lutfen tekrar deneyin');
  }

  return planData;
}

// ============= FOOD ROUTES =============

app.post('/foods/analyze', authenticateToken, async (req, res) => {
  try {
    const { foodDescription } = req.body;

    if (!foodDescription) {
      return res.status(400).json({ message: 'Gıda açıklaması gereklidir' });
    }

    const nutrition = await analyzeFoodWithGemini(foodDescription);

    res.json({
      message: 'Analiz başarılı',
      nutrition
    });
  } catch (error) {
    console.error('Food analysis error:', error);
    res.status(500).json({ 
      message: 'Gıda analizi başarısız oldu: ' + error.message 
    });
  }
});

app.post('/foods/analyze-image', authenticateToken, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ message: 'Fotograf gereklidir' });
    }

    const nutrition = await analyzeFoodImageWithGemini(imageBase64, mimeType);

    res.json({
      message: 'Analiz başarılı',
      nutrition
    });
  } catch (error) {
    console.error('Image analysis error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Gorsel analiz basarisiz oldu: ' + error.message
    });
  }
});

// ============= PLANNER ROUTES =============

app.post('/planner/weekly-plan', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Planner request received:', {
      user: req.user.userId,
      body: req.body,
      headers: Object.keys(req.headers)
    });

    const { favorites, allergies, dislikes, calorieTarget, goalText } = req.body;

    if (!calorieTarget || !goalText) {
      return res.status(400).json({ message: 'Hedef kalori ve hedef tipi gereklidir' });
    }

    const planData = await generateWeeklyPlanWithGemini({
      calorieTarget,
      goalText,
      allergies: allergies || '',
      dislikes: dislikes || '',
      favorites: favorites || ''
    });

    const savedPlan = await saveWeeklyPlan({
      userId: req.user.userId,
      params: {
        calorieTarget,
        goalText,
        favorites: favorites || '',
        allergies: allergies || '',
        dislikes: dislikes || ''
      },
      plan: planData
    });

    res.json({
      message: 'Haftalık plan oluşturuldu',
      plan: planData,
      savedPlan: {
        id: savedPlan._id,
        createdAt: savedPlan.createdAt,
        params: savedPlan.params
      }
    });
  } catch (error) {
    console.error('❌ Weekly planner error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Haftalık plan oluşturulamadı: ' + error.message
    });
  }
});

app.get('/planner/reminders', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    res.json({ reminders: user?.reminders || [] });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.put('/planner/reminders', authenticateToken, async (req, res) => {
  try {
    const { reminders } = req.body;
    if (!Array.isArray(reminders)) {
      return res.status(400).json({ message: 'Hatırlatıcı listesi gereklidir' });
    }

    const sanitized = reminders.map((item) => ({
      dayIndex: Number(item.dayIndex),
      mealType: String(item.mealType || ''),
      time: String(item.time || ''),
      enabled: item.enabled !== false,
      lastSentAt: item.lastSentAt ? new Date(item.lastSentAt) : undefined
    }));

    const user = await updateUserReminders(req.user.userId, sanitized);
    res.json({ message: 'Hatırlatıcılar güncellendi', reminders: user?.reminders || sanitized });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/planner/weekly-plans', authenticateToken, async (req, res) => {
  try {
    const plans = await findWeeklyPlansByUser(req.user.userId);
    const response = plans.map((plan) => ({
      id: plan._id,
      createdAt: plan.createdAt,
      params: plan.params
    }));
    res.json({ plans: response });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/planner/weekly-plan/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await findWeeklyPlanById(req.params.id);
    if (!plan || String(plan.userId) !== String(req.user.userId)) {
      return res.status(404).json({ message: 'Plan bulunamadı' });
    }

    res.json({
      id: plan._id,
      createdAt: plan.createdAt,
      params: plan.params,
      plan: plan.plan
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.delete('/planner/weekly-plan/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await findWeeklyPlanById(req.params.id);
    if (!plan || String(plan.userId) !== String(req.user.userId)) {
      return res.status(404).json({ message: 'Plan bulunamadı' });
    }

    await deleteWeeklyPlanById(req.params.id);
    res.json({ message: 'Plan silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// ============= FOOD LOG ROUTES =============

app.post('/logs/add-food', authenticateToken, async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, fiber, micronutrients, mealType } = req.body;

    const foodLog = await saveFoodLog({
      userId: req.user.userId,
      mealType,
      name,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      micronutrients
    });

    res.status(201).json({
      message: 'Yemek eklendi',
      foodLog
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/logs/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const foods = await findTodayFoodLogs(req.user.userId, today, tomorrow);

    const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);

    res.json({
      date: today.toISOString().split('T')[0],
      foods,
      totalCalories
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/logs/week', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const logs = await findWeekFoodLogs(req.user.userId, weekAgo, today);
    const waterLogs = await findWeekWaterLogs(req.user.userId, weekAgo, today);

    // Group food by day
    const groupedByDay = {};
    logs.forEach(log => {
      const day = new Date(log.date).toISOString().split('T')[0];
      if (!groupedByDay[day]) {
        groupedByDay[day] = { 
          date: day, 
          foods: [], 
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalWater: 0
        };
      }
      groupedByDay[day].foods.push(log);
      groupedByDay[day].totalCalories += log.calories || 0;
      groupedByDay[day].totalProtein += log.protein || 0;
      groupedByDay[day].totalCarbs += log.carbs || 0;
      groupedByDay[day].totalFat += log.fat || 0;
    });

    // Add water to each day
    waterLogs.forEach(log => {
      const day = new Date(log.date).toISOString().split('T')[0];
      if (groupedByDay[day]) {
        groupedByDay[day].totalWater += log.amount || 0;
      }
    });

    const weekData = Object.values(groupedByDay);

    // Calculate aggregated stats
    const totalCalories = weekData.reduce((sum, day) => sum + day.totalCalories, 0);
    const avgCalories = weekData.length > 0 ? Math.round(totalCalories / weekData.length) : 0;
    const bestDay = weekData.length > 0 ? weekData.reduce((best, day) => 
      day.totalCalories > best.totalCalories ? day : best
    ) : null;
    
    const goalCalories = 2000; // Default daily goal
    const daysOnGoal = weekData.filter(day => day.totalCalories > 0 && day.totalCalories <= goalCalories).length;
    const goalAdherencePercent = weekData.length > 0 ? Math.round((daysOnGoal / weekData.length) * 100) : 0;

    res.json({
      weekData,
      summary: {
        avgCalories,
        bestDay: bestDay ? { date: bestDay.date, calories: bestDay.totalCalories } : null,
        goalAdherencePercent,
        totalDays: weekData.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.post('/logs/add-water', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Geçerli bir miktar girin' });
    }

    const waterLog = await saveWaterLog({
      userId: req.user.userId,
      amount
    });

    res.status(201).json({
      message: 'Su kaydı eklendi',
      waterLog
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/logs/water/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const waterLogs = await findTodayWaterLogs(req.user.userId, today, tomorrow);
    const totalWater = waterLogs.reduce((sum, log) => sum + (log.amount || 0), 0);

    const user = await findUserById(req.user.userId);
    const waterGoal = user?.waterGoal || 2000;

    res.json({
      date: today.toISOString().split('T')[0],
      totalWater,
      waterGoal,
      percentage: Math.round((totalWater / waterGoal) * 100)
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.put('/users/water-goal', authenticateToken, async (req, res) => {
  try {
    const { waterGoal } = req.body;

    if (!waterGoal || waterGoal <= 0) {
      return res.status(400).json({ message: 'Geçerli bir hedef girin' });
    }

    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const updatedUser = await updateUserProfile(req.user.userId, {
      ...user.profile,
      waterGoal
    });

    if (useMemoryStore) {
      user.waterGoal = waterGoal;
    }

    res.json({
      message: 'Su hedefi güncellendi',
      waterGoal
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.delete('/logs/:id', authenticateToken, async (req, res) => {
  try {
    const foodLog = await deleteFoodLogById(req.params.id);

    if (!foodLog) {
      return res.status(404).json({ message: 'Log bulunamadı' });
    }

    res.json({ message: 'Log silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// ============= DATABASE CONNECTION =============

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✓ MongoDB bağlantısı başarılı');
}).catch((error) => {
  useMemoryStore = true;
  console.error('✗ MongoDB bağlantı hatası:', error.message);
  console.log('↪ Yerel hafıza deposu kullanılıyor');
});

// ============= ERROR HANDLING =============

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Sunucu hatası' });
});

// ============= SETTINGS ROUTES =============
app.put('/users/settings', authenticateToken, async (req, res) => {
  try {
    const { theme, language, fontSize, unit } = req.body;
    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    if (useMemoryStore) {
      user.settings = { ...user.settings, theme, language, fontSize, unit };
    } else {
      await User.findByIdAndUpdate(req.user.userId, { settings: { ...user.settings, theme, language, fontSize, unit } });
    }
    res.json({ message: 'Ayarlar güncellendi', settings: user.settings });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/users/settings', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    res.json(user.settings || { theme: 'light', language: 'tr', fontSize: 'normal', unit: 'metric' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/logs/stats/monthly', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const logs = await findWeekFoodLogs(req.user.userId, thirtyDaysAgo, today);

    // Group food by day
    const groupedByDay = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      groupedByDay[dateStr] = {
        date: dateStr,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0
      };
    }

    logs.forEach(log => {
      const day = new Date(log.date).toISOString().split('T')[0];
      if (groupedByDay[day]) {
        groupedByDay[day].totalCalories += log.calories || 0;
        groupedByDay[day].totalProtein += log.protein || 0;
        groupedByDay[day].totalCarbs += log.carbs || 0;
        groupedByDay[day].totalFat += log.fat || 0;
      }
    });

    const data = Object.values(groupedByDay);
    const allCalories = data.map(d => d.totalCalories);
    const avgCalories = data.length > 0 ? Math.round(allCalories.reduce((a, b) => a + b, 0) / data.length) : 0;
    const maxCalories = Math.max(...allCalories, 0);
    const daysTracked = data.filter(d => d.totalCalories > 0).length;
    const goalCalories = 2000;
    const adherencePercent = data.length > 0 ? Math.round((daysTracked / data.length) * 100) : 0;

    res.json({
      data,
      stats: {
        avgCalories,
        maxCalories,
        daysTracked,
        totalDays: data.length,
        adherencePercent
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});
// ============= FAVORITES ROUTES =============
app.post('/users/favorites', authenticateToken, async (req, res) => {
  try {
    const { foodName } = req.body;
    if (!foodName) return res.status(400).json({ message: 'Yemek adı gereklidir' });
    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    if (useMemoryStore) {
      if (!user.favoriteFoods) user.favoriteFoods = [];
      if (!user.favoriteFoods.includes(foodName)) {
        user.favoriteFoods.push(foodName);
      }
    } else {
      await User.findByIdAndUpdate(req.user.userId, { $addToSet: { favoriteFoods: foodName } });
    }
    res.json({ message: 'Favorilere eklendi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/users/favorites', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    res.json({ favoriteFoods: user.favoriteFoods || [] });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// ============= EXERCISE ROUTES =============
app.post('/logs/add-exercise', authenticateToken, async (req, res) => {
  try {
    const { activity, duration, intensity, caloriesBurned } = req.body;
    const exerciseLog = await saveExerciseLog({
      userId: req.user.userId,
      activity,
      duration,
      intensity,
      caloriesBurned: caloriesBurned || Math.round(duration * 5)
    });
    res.status(201).json({ message: 'Egzersiz kaydedildi', exerciseLog });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.get('/logs/exercise/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const exercises = await findTodayExerciseLogs(req.user.userId, today, tomorrow);
    const totalCaloriesBurned = exercises.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0);
    const totalDuration = exercises.reduce((sum, e) => sum + (e.duration || 0), 0);
    res.json({ date: today.toISOString().split('T')[0], exercises, totalCaloriesBurned, totalDuration });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// ============= PUSH NOTIFICATION ROUTES =============
app.post('/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: 'Geçerli subscription gereklidir' });
    }

    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    if (useMemoryStore) {
      user.pushSubscription = subscription;
    } else {
      await User.findByIdAndUpdate(req.user.userId, { pushSubscription: subscription });
    }

    res.json({ message: 'Push subscription kaydedildi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

app.post('/push/notify', authenticateToken, async (req, res) => {
  try {
    const { title, body } = req.body;
    const user = await findUserById(req.user.userId);
    if (!user || !user.pushSubscription || !user.pushSubscription.endpoint) {
      return res.status(400).json({ message: 'Kullanıcı push subscription\'a sahip değil' });
    }

    const payload = JSON.stringify({
      title: title || 'Diyet Rehberi',
      body: body || 'Hatırlatıcı',
      tag: 'reminder'
    });

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      await webpush.sendNotification(user.pushSubscription, payload);
    }

    res.json({ message: 'Bildirim gönderimi yapıldı' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

const sendReminderNotification = async (user, reminder) => {
  if (!user?.pushSubscription?.endpoint) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const mealLabels = {
    breakfast: 'Kahvaltı',
    lunch: 'Öğle',
    dinner: 'Akşam',
    snack: 'Ara Öğün'
  };

  const payload = JSON.stringify({
    title: 'Öğün Hatırlatıcısı',
    body: `${mealLabels[reminder.mealType] || 'Öğün'} zamanı!`,
    tag: 'meal-reminder'
  });

  try {
    await webpush.sendNotification(user.pushSubscription, payload);
  } catch (error) {
    const statusCode = error?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      if (useMemoryStore) {
        user.pushSubscription = null;
      } else {
        await User.findByIdAndUpdate(user._id, { pushSubscription: null });
      }
      return;
    }
    throw error;
  }
};

const getDayIndex = (date) => {
  // JS: 0 Sunday. We want Monday=0.
  return (date.getDay() + 6) % 7;
};

cron.schedule('* * * * *', async () => {
  if (!useMemoryStore && mongoose.connection.readyState !== 1) {
    return;
  }

  const now = new Date();
  const currentDay = getDayIndex(now);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  try {
    const users = await findUsersWithReminders();
    for (const user of users) {
      const reminders = Array.isArray(user.reminders) ? user.reminders : [];
      let updated = false;

      for (const reminder of reminders) {
        if (!reminder?.enabled) continue;
        if (reminder.dayIndex !== currentDay) continue;
        if (reminder.time !== currentTime) continue;

        const lastSent = reminder.lastSentAt ? new Date(reminder.lastSentAt) : null;
        if (lastSent && lastSent.toDateString() === now.toDateString() && lastSent.getHours() === now.getHours() && lastSent.getMinutes() === now.getMinutes()) {
          continue;
        }

        await sendReminderNotification(user, reminder);
        reminder.lastSentAt = now;
        updated = true;
      }

      if (updated) {
        if (useMemoryStore) {
          user.reminders = reminders;
        } else {
          await User.findByIdAndUpdate(user._id, { reminders });
        }
      }
    }
  } catch (error) {
    console.error('Reminder scheduler error:', error.message);
  }
});

// ============= HISTORY ROUTES =============
app.delete('/logs/food/:id', authenticateToken, async (req, res) => {
  try {
    if (useMemoryStore) {
      const log = memoryStore.foodLogs.find(l => String(l._id) === String(req.params.id));
      if (!log) return res.status(404).json({ message: 'Log bulunamadı' });
      log.isDeleted = true;
    } else {
      await FoodLog.findByIdAndUpdate(req.params.id, { isDeleted: true });
    }
    res.json({ message: 'Yemek silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// ============= START SERVER =============

app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
