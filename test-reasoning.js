require('dotenv').config();
const fetch = require('node-fetch');

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'qwen/qwen3.6-plus-preview:free';

if (!API_KEY) {
  console.error('❌ Ошибка: не задан OPENROUTER_API_KEY в .env');
  process.exit(1);
}

/**
 * Выполняет запрос к OpenRouter API
 * @param {Array} messages - массив сообщений
 * @param {boolean} enableReasoning - включать ли поле reasoning
 */
async function callOpenRouter(messages, enableReasoning = false) {
  const body = {
    model: MODEL,
    messages,
  };

  if (enableReasoning) {
    body.reasoning = { enabled: true };
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      // Опционально: заголовки для идентификации приложения в OpenRouter
      // 'HTTP-Referer': 'https://your-app.com',
      // 'X-Title': 'Your App Name',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return result.choices[0].message;
}

async function main() {
  try {
    console.log('🔍 Первый запрос: Сколько месяцев в году имеют 28 дней? Какое число делится на все от 1 до 10 без остатка?\n');

    // Первый вызов — с включённым reasoning
    const firstResponse = await callOpenRouter(
      [
        {
          role: 'user',
          content: "Сколько месяцев в году имеют 28 дней? Какое число делится на все от 1 до 10 без остатка?",
        },
      ],
      true // включаем reasoning
    );

    console.log('💭 Ответ модели (содержимое):');
    console.log(firstResponse.content);
    console.log('\n🧠 reasoning_details:', firstResponse.reasoning_details ?? 'не предоставлено');

    // Формируем историю с сохранением reasoning_details
    const conversation = [
      { role: 'user', content: "Сколько месяцев в году имеют 28 дней? Какое число делится на все от 1 до 10 без остатка?" },
      {
        role: 'assistant',
        content: firstResponse.content,
        // Сохраняем reasoning_details "как есть" для продолжения цепочки рассуждений
        ...(firstResponse.reasoning_details && {
          reasoning_details: firstResponse.reasoning_details,
        }),
      },
      { role: 'user', content: 'Are you sure? Think carefully.' },
    ];

    console.log('\n🔁 Второй запрос: продолжение рассуждений...\n');

    // Второй вызов — модель продолжает с учётом предыдущего reasoning
    const secondResponse = await callOpenRouter(conversation, false);

    console.log('✅ Финальный ответ:');
    console.log(secondResponse.content);
    if (secondResponse.reasoning_details) {
      console.log('\n🧠 Дополнительные рассуждения:');
      console.log(secondResponse.reasoning_details);
    }
  } catch (err) {
    console.error('❌ Ошибка выполнения:', err.message);
    process.exit(1);
  }
}

main();