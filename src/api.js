// ========================================
// Pineapple AI — API Integration
// Uses Nvidia NIM API with Gemma model
// ========================================

const MODEL_ID = 'google/gemma-2-2b-it';

const SYSTEM_PROMPT = `You are Pineapple AI, a friendly, knowledgeable, and helpful assistant. You provide clear, well-structured responses using markdown formatting when appropriate. You use headers, bullet points, numbered lists, code blocks with language specification, bold text, and other markdown features to make your responses easy to read. You are concise but thorough.`;

/**
 * Send a message to the Pineapple AI
 * @param {Array} messages - Array of { role, content } objects
 * @param {Function} onChunk - Optional callback for streaming chunks
 * @returns {{ error: string|null, output: string }}
 */
export async function sendMessage(messages, onChunk = null) {
  try {
    // Gemma doesn't support the 'system' role, so we prepend the prompt to the first user message
    const fullMessages = messages.map(m => ({ ...m }));
    if (fullMessages.length > 0 && fullMessages[0].role === 'user') {
      fullMessages[0].content = SYSTEM_PROMPT + '\n\n' + fullMessages[0].content;
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: fullMessages,
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      return { 
        error: `API returned status ${response.status}`, 
        output: null 
      };
    }

    const data = await response.json();
    
    if (data.error) {
      return { error: typeof data.error === 'string' ? data.error : data.error.message, output: null };
    }

    // Extract the text content from the response
    let outputText = '';
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      outputText = data.choices[0].message.content;
    } else if (typeof data.output === 'string') {
      outputText = data.output;
    } else {
      outputText = JSON.stringify(data.choices || data.output || data);
    }

    // Simulate streaming if callback provided
    if (onChunk && outputText) {
      await simulateStream(outputText, onChunk);
    }
    
    return { error: null, output: outputText };
  } catch (err) {
    console.error('Network error:', err);
    return { 
      error: 'Failed to connect to Pineapple AI. Please check your internet connection.', 
      output: null 
    };
  }
}

/**
 * Simulate streaming by revealing text progressively
 */
async function simulateStream(text, onChunk) {
  const words = text.split(/(\s+)/);
  let accumulated = '';
  const chunkSize = 3; // words per chunk
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join('');
    accumulated += chunk;
    onChunk(accumulated);
    await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
  }
  
  // Final complete text
  onChunk(text);
}
