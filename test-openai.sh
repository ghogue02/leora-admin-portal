#!/bin/bash

# Test OpenAI API directly
OPENAI_KEY=$(grep "^OPENAI_API_KEY" .env.local | cut -d'"' -f2)

echo "Testing OpenAI API with gpt-5-mini..."
echo ""

curl -s https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_KEY" \
  -d '{
    "model": "gpt-5-mini",
    "messages": [{"role": "user", "content": "Say hello in 5 words"}],
    "stream": false
  }'

echo ""
echo ""
echo "Test complete"
