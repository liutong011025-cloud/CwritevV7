import { NextRequest, NextResponse } from 'next/server'
import { logApiCall } from '@/lib/log-api-call'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1'
const DIFY_API_KEY = process.env.DIFY_API_KEY || ''
// 使用letter guide的app ID，或者可以创建一个专门的语法检查机器人
const DIFY_LETTER_APP_ID = 'app-3iAjb8MCQEXkUxcjvky6lhXt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, type, recipient, occasion, bookTitle, reviewType, user_id } = body

    // 支持多种类型：letter, story, review
    const content = text || body.letter || body.story || body.review
    const contentType = type || (body.letter ? 'letter' : body.story ? 'story' : body.review ? 'review' : 'letter')

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!DIFY_API_KEY) {
      console.error('DIFY_API_KEY not configured')
      return NextResponse.json(
        { error: 'DIFY_API_KEY not configured' },
        { status: 500 }
      )
    }

    // 构建提示词，要求AI返回结构化的语法错误信息
    let contextInfo = ''
    if (contentType === 'letter') {
      contextInfo = `Letter to: ${recipient || 'Recipient'}\nOccasion: ${occasion || 'General'}`
    } else if (contentType === 'story') {
      contextInfo = `This is a creative story.`
    } else if (contentType === 'review') {
      contextInfo = `Book Review Type: ${reviewType || 'General'}\nBook Title: ${bookTitle || 'Unknown'}`
    }

    const prompt = `You are an English grammar checker. Review the following ${contentType} and identify ALL grammar, spelling, and punctuation errors.

${contextInfo}

${contentType.charAt(0).toUpperCase() + contentType.slice(1)} content:
${content}

IMPORTANT: You must return a JSON array of errors in the following exact format:
[
  {
    "start": <character_index_start>,
    "end": <character_index_end>,
    "original": "<the_incorrect_text>",
    "corrected": "<the_corrected_text>",
    "issue": "<brief_description_of_the_error>"
  }
]

Rules:
1. Only include actual errors (grammar, spelling, punctuation)
2. start and end are character positions in the original text (0-indexed)
3. original is the exact text that has the error
4. corrected is the suggested correction
5. issue is a brief explanation (e.g., "Subject-verb agreement", "Missing comma", "Spelling error")
6. If there are no errors, return an empty array: []
7. Return ONLY the JSON array, no other text before or after

Example format:
[
  {
    "start": 45,
    "end": 52,
    "original": "I are happy",
    "corrected": "I am happy",
    "issue": "Subject-verb agreement error"
  }
]`

    const url = `${DIFY_BASE_URL}/chat-messages`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DIFY_API_KEY}`,
    }

    const requestBody: any = {
      inputs: {
        content_type: contentType,
        recipient: recipient || '',
        occasion: occasion || '',
        bookTitle: bookTitle || '',
        reviewType: reviewType || '',
        content: content,
      },
      query: prompt,
      response_mode: 'blocking',
      user: user_id || 'default-user',
      app_id: DIFY_LETTER_APP_ID,
    }

    console.log('Grammar Review API Request:', JSON.stringify({
      url,
      app_id: DIFY_LETTER_APP_ID,
      user: user_id,
    }, null, 2))

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Dify API Error:', errorText)
      return NextResponse.json(
        { error: `Dify API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const aiResponse = data.answer || data.message || '[]'

    // 尝试解析JSON响应
    let errors = []
    try {
      // 尝试从响应中提取JSON数组
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        errors = JSON.parse(jsonMatch[0])
      } else {
        // 如果找不到JSON，尝试直接解析整个响应
        errors = JSON.parse(aiResponse)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      console.log('AI Response:', aiResponse)
      // 如果解析失败，返回空数组
      errors = []
    }

    // 验证错误格式
    if (!Array.isArray(errors)) {
      errors = []
    }

    // 记录 API 调用
    try {
      await logApiCall(
        user_id || 'default-user',
        'grammarReview',
        '/api/dify-letter-grammar-review',
        { type: contentType, content: content.substring(0, 100) },
        { errorCount: errors.length }
      )
    } catch (logError) {
      console.error('Error logging API call:', logError)
    }

    return NextResponse.json({
      success: true,
      errors: errors,
    })
  } catch (error) {
    console.error('Grammar Review API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
