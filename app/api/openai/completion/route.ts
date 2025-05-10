import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt, temperature = 0.3 } = body

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt is required",
        },
        { status: 400 },
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key is not configured")
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key is not configured",
        },
        { status: 500 },
      )
    }

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        temperature,
      })

      return NextResponse.json({
        success: true,
        data: text,
      })
    } catch (aiError: any) {
      console.error("OpenAI API error:", aiError)

      // Return a more detailed error message
      return NextResponse.json(
        {
          success: false,
          error: `OpenAI API error: ${aiError.message || "Unknown error"}`,
          details: aiError.stack || "No stack trace available",
        },
        { status: 502 },
      )
    }
  } catch (error: any) {
    console.error("Server error in OpenAI completion route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        details: error.stack || "No stack trace available",
      },
      { status: 500 },
    )
  }
}
