# 🧠 Gemini API Eğitim Rehberi

Gemini API'yi özel diyet uygulaması için nasıl eğiteceğin

---

## 1️⃣ PROMPT ENGINEERING TEMELLERI

### Başlangıç Prompt (Temel)

```
"Tavuk döner pide" için besin değerlerini hesapla
```

❌ **Sorun**: Çok genel, belirsiz

### İyileştirilmiş Prompt (Gelişmiş)

```
Türkçe gıda analiz uzmanı olarak davran. 
"Tavuk döner pide" (Türk usulü, normal pide boyutu, 
biftek tavuğu + salata + mayo + ketchup) 
için şu besin değerlerini JSON formatında sağla:

{
  "calories": 450,
  "protein": 25,
  "carbs": 45,
  "fat": 18,
  "fiber": 2,
  "micronutrients": ["B12", "Demir", "Fosfor"],
  "portion_size": "1 pide (~250g)",
  "confidence": "yüksek"
}
```

✅ **Avantajlar**:
- Türkçe-spesifik bilgi
- Porsiyonu açıkça belirt
- JSON formatı kesin
- İçeriği detaylandır

---

## 2️⃣ GEMİNİ API PROMPT TEMPLATES

### Template 1: Basit Gıda

```javascript
const simpleFood = async (food) => {
  const prompt = `
Besin değerleri uzmanlı gözüyle "${food}" için şu formatı dön:
JSON SADECE:
{
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "micronutrients": []
}
`;
  // API çağrısı yap
};
```

### Template 2: Kompleks Yemek

```javascript
const complexFood = async (foodDescription) => {
  const prompt = `
Yemek: "${foodDescription}"

Bileşenlerini analiz et:
1. Ana malzeme tanımla
2. Türü belirle (Türk/Batı/Uluslararası)
3. Standart porsiyonu hesapla
4. Besin değerlerini JSON ver

${foodDescription} için:
{
  "name": "yemek adı",
  "components": ["malzeme1", "malzeme2"],
  "portion": "150g veya 1 adet",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "micronutrients": [],
  "notes": "Standart hazırlama yöntemiyle"
}
`;
};
```

### Template 3: Öğün Analizi

```javascript
const mealAnalysis = async (mealDescription) => {
  const prompt = `
Öğün: "${mealDescription}"

Tüm bileşenleri teker teker analiz et, 
sonra toplamı hesapla.

{
  "meal_name": "öğün adı",
  "items": [
    { "name": "item1", "calories": 0, "protein": 0, ... },
    { "name": "item2", "calories": 0, "protein": 0, ... }
  ],
  "total": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0
  },
  "macros": {
    "carb_percent": 0,
    "protein_percent": 0,
    "fat_percent": 0
  }
}
`;
};
```

---

## 3️⃣ TÜRKÇE YEMEK VERİTABANI

Gemini'yi eğitmek için örnek Türkçe yemekler:

```javascript
const turkishFoods = {
  // Türk Mutfağı
  "manti": { calories: 250, protein: 10, carbs: 35, fat: 8 },
  "kebab (tavuk doneri)": { calories: 450, protein: 35, carbs: 45, fat: 18 },
  "kofte": { calories: 300, protein: 25, carbs: 5, fat: 20 },
  "menemen": { calories: 200, protein: 12, carbs: 15, fat: 10 },
  "borek": { calories: 280, protein: 8, carbs: 30, fat: 15 },
  "pide": { calories: 400, protein: 15, carbs: 50, fat: 15 },
  
  // Çorbalar
  "mercimek corbasi": { calories: 180, protein: 12, carbs: 25, fat: 4 },
  "tavuk corbasi": { calories: 150, protein: 15, carbs: 12, fat: 5 },
  
  // Salatalar
  "çoban salatasi": { calories: 80, protein: 3, carbs: 10, fat: 3 },
  "coban salata": { calories: 120, protein: 2, carbs: 15, fat: 6 },
  
  // Beyaz Eşya
  "sutlu kayisi": { calories: 220, protein: 4, carbs: 40, fat: 5 },
  "baklava": { calories: 350, protein: 5, carbs: 45, fat: 18 },
};
```

---

## 4️⃣ PROMPT OPTIMIZATION STRATEJİSİ

### Chain-of-Thought (Adım Adım Düşün)

```javascript
const chainOfThought = `
"Ev yapımı tavuk döner + pide" için:

Adım 1: Malzemeleri listele
- Tavuk göğsü (grili): 150g
- Pide ekmeği: 100g
- Salata: 50g
- Soslar: 30g
Toplam: ~330g

Adım 2: Her malzemenin kalorisi
- Tavuk: 165 kcal
- Pide: 260 kcal
- Salata: 25 kcal
- Soslar: 80 kcal

Adım 3: Toplam besin değerleri
- Toplam kalori: 530 kcal
- Protein: 35g (60 kcal)
- Carbs: 55g (220 kcal)
- Fat: 15g (135 kcal)

JSON Result:
{
  "calories": 530,
  "protein": 35,
  "carbs": 55,
  "fat": 15,
  "fiber": 3,
  "breakdown": [...]
}
`;
```

### Few-Shot Learning (Örnek Ver)

```javascript
const fewShot = `
Örnek 1:
Gıda: "Yumurta, 2 adet, kavrulmuş"
Sonuç: { "calories": 180, "protein": 16, "carbs": 1, "fat": 13 }

Örnek 2:
Gıda: "Ekmek, 2 dilim beyaz"
Sonuç: { "calories": 160, "protein": 4, "carbs": 32, "fat": 1 }

Şimdi buna cevap ver:
Gıda: "Kahvaltılık: Yumurta 2 adet + 2 dilim ekmek + 1 çay kaşığı tereyağı"
Sonuç:
`;
```

---

## 5️⃣ ADVANCED PROMPTS

### Makro Oranı Hesaplama

```javascript
const macroRatios = `
Besin değerlerinden makro oranları hesapla:

Input: { calories: 2000, protein: 100, carbs: 250, fat: 60 }

{
  "macros": {
    "protein": {
      "grams": 100,
      "calories": 400,
      "percentage": 20
    },
    "carbs": {
      "grams": 250,
      "calories": 1000,
      "percentage": 50
    },
    "fat": {
      "grams": 60,
      "calories": 540,
      "percentage": 27
    },
    "fiber": {
      "grams": 25,
      "note": "Karbohidratın bir parçası"
    }
  },
  "analysis": "Dengeli diyetçi ortalama 40-30-30 (carb-protein-fat) öneriliyor"
}
`;
```

### Sağlık Uyarıları

```javascript
const healthWarning = `
Gıda analizi sonrasında sağlık uyarıları ver:

Kurallar:
- Kalori > 500 kcal: "Bu yemek yüksek kaloridir"
- Sodyum > 1000mg: "Yüksek tuz uyarısı"
- Şeker > 30g: "Yüksek şeker"
- Saturated Fat > 10g: "Yüksek doymuş yağ"

Sonuç:
{
  "nutrition": {...},
  "warnings": ["string1", "string2"],
  "health_score": 7/10,
  "recommendations": [...]
}
`;
```

---

## 6️⃣ API INTEGRATION BEST PRACTICES

### Caching (Tekrarlı Sorguları Sakla)

```javascript
const foodCache = new Map();

async function getFoodNutrition(foodName) {
  // Önce cache'e bak
  if (foodCache.has(foodName)) {
    return foodCache.get(foodName);
  }

  // Gemini'den al
  const result = await callGeminiAPI(foodName);

  // Cache'ye kaydet
  foodCache.set(foodName, result);

  return result;
}
```

### Rate Limiting (Hız Sınırı)

```javascript
const queue = [];
const MAX_REQUESTS_PER_MINUTE = 60;

async function callGeminiWithQueue(prompt) {
  return new Promise((resolve) => {
    queue.push({ prompt, resolve });
    processQueue();
  });
}

async function processQueue() {
  if (queue.length === 0) return;
  
  const { prompt, resolve } = queue.shift();
  const result = await callGeminiAPI(prompt);
  resolve(result);

  // 1 saniye bekleme
  setTimeout(processQueue, 1000);
}
```

### Error Handling

```javascript
async function safeGeminiCall(foodDescription) {
  try {
    const result = await callGeminiAPI(foodDescription);
    
    // Sonucu valide et
    if (!result.calories || result.calories < 0) {
      throw new Error("Geçersiz kalori değeri");
    }

    return result;
  } catch (error) {
    console.error("Gemini API error:", error);
    
    // Fallback: Varsayılan tahmin döndür
    return getEstimatedNutrition(foodDescription);
  }
}

function getEstimatedNutrition(food) {
  // Veritabanındaki yakın gıdayı bul
  const similar = turkishFoods[food] || turkishFoods["menemen"];
  return {
    ...similar,
    estimated: true,
    confidence: "düşük"
  };
}
```

---

## 7️⃣ TESTING & OPTIMIZATION

### Test Cases

```javascript
const testCases = [
  // Basit gıdalar
  { input: "Yumurta, 1 adet", expected: "~80 kcal" },
  { input: "Ekmek, 1 dilim", expected: "~80 kcal" },
  
  // Kompleks yemekler
  { input: "Tavuk döner pide", expected: "~450 kcal" },
  { input: "Adana kebab, 1 portion", expected: "~550 kcal" },
  
  // Öğünler
  { input: "Kahvaltı: Yumurta, ekmek, peynir, çay", expected: "~350 kcal" },
];

async function testGemini() {
  for (const test of testCases) {
    const result = await callGeminiAPI(test.input);
    console.log(`${test.input}: ${result.calories} kcal`);
  }
}
```

---

## 8️⃣ PERFORMANCE İPUÇLARİ

### Hızlı Yanıtlar İçin

1. **Kısa Promptlar**: 500 characterden az tut
2. **JSON Format Ista**: Parsing hızlandırır
3. **Caching**: Sık sorulan gıdaları sakla
4. **Batch Processing**: Birden fazla sorguyu grup haline getir

### Doğruluk İçin

1. **Detaylı Descriptors**: "Tavuk döner" yerine "Türk usulü tavuk döner pide"
2. **Portion Size**: Gram veya adet belirt
3. **Cooking Method**: Kızartılmış, haşlanmış, kavrulmuş belirt
4. **Calibration**: Gerçek gıda kalorimetresi ile karşılaştır

---

## 9️⃣ ÖRNEKLERİYLE OPTIMIZASYON

### Kötü ❌ vs İyi ✅

```
❌ "Yumurta"
✅ "Sahanda pişmiş tavuk yumurtası, 2 adet, 1 çay kaşığı tereyağında"

❌ "Kahvaltı"
✅ "Kahvaltı: 2 dilim beyaz ekmek, 2 çay kaşığı sıvı tereyağ, 50g kaşar, 1 kırmızı domates, 1 bardak tam yağlı süt"

❌ "Pizza"
✅ "Pizza: Italyan usulü Margarita, 2 dilim, standart boyutlu pide pizza, mozzarella + domatesli"
```

---

## 🔟 PRODUCTION CHECKLIST

- [ ] API Key secure environment variable'da mı?
- [ ] Response validation var mı?
- [ ] Error handling var mı?
- [ ] Caching var mı?
- [ ] Rate limiting var mı?
- [ ] Logging var mı?
- [ ] Fallback mechanism var mı?
- [ ] Test cases pass mi?

---

**Gemini API'yi iyi eğitsek, kalori hesaplamada yanılmaz hale gelirsin!** 🚀
