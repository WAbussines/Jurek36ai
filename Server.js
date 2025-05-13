// server.js (Backend Node.js)

// Wczytaj zmienne środowiskowe z pliku apikey.env
// Load environment variables from the apikey.env file
require('dotenv').config({ path: './apikey.env' });

// Zainstaluj Express, node-fetch i cors: npm install express node-fetch cors dotenv
// Install Express, node-fetch, and cors: npm install express node-fetch cors dotenv
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path'); // Moduł do pracy ze ścieżkami plików

const app = express();
// Użyj portu z zmiennych środowiskowych (np. z pliku apikey.env) lub domyślnego 3000
// Use the port from environment variables (e.g., from apikey.env file) or default to 3000
const port = process.env.PORT || 3000;

// Klucz API OpenRouter wczytany z zmiennych środowiskowych
// OpenRouter API key loaded from environment variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Punkt końcowy API OpenRouter
// OpenRouter API endpoint
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Middleware do parsowania JSON w ciele żądania
// Middleware to parse JSON in the request body
app.use(express.json());

// Middleware do obsługi CORS (umożliwia komunikację między frontendem i backendem działającymi na różnych adresach/portach)
// Middleware to handle CORS (allows communication between frontend and backend running on different origins/ports)
app.use(cors());

// Middleware do serwowania plików statycznych z katalogu 'public' (lub katalogu, w którym znajduje się index.html)
// Middleware to serve static files from the 'public' directory (or the directory where index.html is located)
// Jeśli index.html jest w głównym katalogu backendu, możesz użyć:
// If index.html is in the root directory of the backend, you can use:
app.use(express.static(__dirname));


// Punkt końcowy API do obsługi czatu
// API endpoint to handle chat messages
app.post('/chat', async (req, res) => {
  // Odbierz historię wiadomości i nazwę modelu z ciała żądania POST
  // Receive messages history and model name from the POST request body
  const { messages, model } = req.body;

  // Podstawowa walidacja żądania
  // Basic request validation
  if (!messages || !Array.isArray(messages) || messages.length === 0 || !model) {
    return res.status(400).json({ error: 'Invalid request: messages array and model are required.' });
  }

  // Sprawdzenie, czy klucz API jest ustawiony
  // Check if the API key is set
  if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not set in environment variables!");
      return res.status(500).json({ error: 'Server configuration error: API key not set.' });
  }

  try {
    // Wysłanie żądania do API OpenRouter
    // Sending the request to the OpenRouter API
    const apiRes = await fetch(OPENROUTER_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Nagłówek autoryzacji z kluczem API OpenRouter (bezpiecznie wczytanym na serwerze)
        // Authorization header with OpenRouter API key (securely loaded on the server)
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        // Opcjonalnie: Zidentyfikuj swoją aplikację/backend
        // Optional: Identify your app/backend
        'X-Title': 'jurek36AI Chatbot Backend'
      },
      body: JSON.stringify({
        model: model, // Użyj nazwy modelu przesłanej z frontendu
        // Use the model name sent from the frontend
        messages: messages, // Przekaż historię wiadomości do OpenRouter
        // Możesz dodać inne parametry API tutaj (np. temperature, max_tokens)
        // You can add other API parameters here (e.e., temperature, max_tokens)
      })
    });

    // Obsługa błędów odpowiedzi z API OpenRouter
    // Handling errors from the OpenRouter API response
    if (!apiRes.ok) {
      const errorData = await apiRes.json();
      console.error('OpenRouter API Error:', apiRes.status, errorData);
      // Przekaż błąd z API OpenRouter do frontendu
      // Pass the error from OpenRouter API to the frontend
      return res.status(apiRes.status).json({ error: errorData.error?.message || `Error from OpenRouter API (Status: ${apiRes.status})` });
    }

    // Parsowanie odpowiedzi z API OpenRouter
    // Parsing the response from the OpenRouter API
    const apiData = await apiRes.json();
    const botReply = apiData.choices && apiData.choices[0] &&
                     apiData.choices[0].message && apiData.choices[0].message.content;

    // Sprawdzenie, czy otrzymano odpowiedź tekstową
    // Check if a text reply was received
    if (!botReply) {
        console.warn("OpenRouter API returned no text reply:", apiData);
        return res.status(500).json({ error: 'No text reply received from the model.' });
    }

    // Wysłanie odpowiedzi bota z powrotem do frontendu w polu 'reply'
    // Sending the bot's reply back to the frontend in the 'reply' field
    res.json({ reply: botReply });

  } catch (error) {
    // Obsługa błędów po stronie backendu (np. problemy z siecią)
    // Handling errors on the backend side (e.g., network issues)
    console.error('Backend error:', error);
    res.status(500).json({ error: 'An internal server error occurred while processing your request.' });
  }
});

// Opcjonalnie: Punkt końcowy do serwowania pliku index.html (jeśli nie używasz oddzielnego hostingu statycznego)
// Optional: Endpoint to serve the index.html file (if you are not using separate static hosting)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// Uruchomienie serwera
// Starting the server
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

