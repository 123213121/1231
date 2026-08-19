const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// База данных сделок в памяти сервера
const deals = new Map();

// Функция нормализации текста кода
function normalizeCode(code) {
  if (!code) return '';
  return code
    .toString()
    .trim()
    .toUpperCase()
    .replace(/А/g, 'A').replace(/В/g, 'B').replace(/Е/g, 'E')
    .replace(/К/g, 'K').replace(/М/g, 'M').replace(/Н/g, 'H')
    .replace(/О/g, 'O').replace(/Р/g, 'P').replace(/С/g, 'C')
    .replace(/Т/g, 'T').replace(/Х/g, 'X');
}

// 1. API: Покупатель генерирует код
app.post('/api/buyer/create', (req, res) => {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (deals.has(code));

  const nowUtc = Date.now();
  const expiresAtUtc = nowUtc + 15 * 60 * 1000; // 15 минут

  deals.set(code, {
    code,
    status: 'pending',
    createdAt: nowUtc,
    expiresAt: expiresAtUtc
  });

  return res.json({ success: true, code, expiresAt: expiresAtUtc });
});

// 2. API: Продавец проверяет код
app.post('/api/seller/verify', (req, res) => {
  const { code } = req.body;
  const cleanCode = normalizeCode(code);
  const deal = deals.get(cleanCode);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Код не найден. Проверьте ввод.' });
  }

  if (deal.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Этот код уже был активирован!' });
  }

  if (Date.now() > deal.expiresAt) {
    deal.status = 'expired';
    return res.status(410).json({ success: false, message: 'Срок действия кода истёк.' });
  }

  deal.status = 'completed';
  return res.json({ success: true, message: 'Сделка успешно подтверждена!' });
});

// --- Отдача HTML файлов прямо из корня проекта ---

// Главная страница -> index.html (Покупатель)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Страница /seller -> seller.html (Продавец)
app.get('/seller', (req, res) => {
  res.sendFile(path.join(__dirname, 'seller.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
