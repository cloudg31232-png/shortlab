type TradeContext = {
  date: string;
  time: string;
  symbol: string;
  direction: string;
  session: string;
  scores: {
    main: number;
    technical: number;
    sentiment: number;
    eco: number;
  };
  entryTimeframe: string;
  stopLossPips: number;
  targetR: number;
  exitFrame: string;
};
type TradeImageInput = {
  kind: string;
  label: string;
  image: string;
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    structure: { type: "string" },
    orderBlock: { type: "string" },
    bosChoch: { type: "string" },
    liquidity: { type: "string" },
    fvg: { type: "string" },
    trend: { type: "string" },
    session: { type: "string" },
    score: { type: "number" },
    feedback: { type: "string" },
    costUsd: { type: "string" },
    costPhp: { type: "string" },
    createdAt: { type: "string" },
    model: { type: "string" },
  },
  required: [
    "structure",
    "orderBlock",
    "bosChoch",
    "liquidity",
    "fvg",
    "trend",
    "session",
    "score",
    "feedback",
    "costUsd",
    "costPhp",
    "createdAt",
    "model",
  ],
};

function outputText(response: any) {
  if (typeof response.output_text === "string") return response.output_text;
  const chunks = response.output?.flatMap((item: any) => item.content ?? []) ?? [];
  return chunks.map((chunk: any) => chunk.text ?? "").join("");
}

export default async function handler(request: any, response: any) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    return;
  }

  try {
    const { trade, images } = request.body as { trade?: TradeContext; images?: TradeImageInput[] };
    const validImages = (images ?? []).filter((item) => item.image?.startsWith("data:image/"));
    if (!trade || !validImages.length) {
      response.status(400).json({ error: "Trade context and at least one screenshot image are required." });
      return;
    }

    const model = process.env.OPENAI_MODEL || "gpt-5.4";
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "You are an expert Edgefinder-style trading coach. The user logs Main Score, Technical Score, Sentiment Score, and ECO Score. Positive scores mean bullish, negative scores mean bearish, and 0 means neutral. Analyze whether the chart screenshots and planned direction agree with those scores. Be strict, practical, and concise. If an image is missing or unclear, say so and reduce the score.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Analyze these trade screenshots and context. Return JSON only.

Trade context:
${JSON.stringify(trade, null, 2)}

Images attached:
${validImages.map((item, index) => `${index + 1}. ${item.label} (${item.kind})`).join("\n")}

Score from 0-100. Coach specifically on Structure, order-flow/technical confirmation, sentiment-score alignment, ECO-score alignment, liquidity, trend, session, and final feedback.
Cost estimate to display: PHP ${validImages.length * 5}-PHP ${validImages.length * 10}, based on PHP 5-PHP 10 per analyzed image.`,
              },
              ...validImages.map((item) => ({
                type: "input_image",
                image_url: item.image,
              })),
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "trade_screenshot_analysis",
            schema: analysisSchema,
            strict: true,
          },
        },
      }),
    });

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      response.status(apiResponse.status).json({ error: data.error?.message ?? "OpenAI analysis failed." });
      return;
    }

    const parsed = JSON.parse(outputText(data));
    response.status(200).json({
      analysis: {
        ...parsed,
        score: Math.max(0, Math.min(100, Math.round(Number(parsed.score)))),
        costUsd: parsed.costUsd || `$${(validImages.length * 0.09).toFixed(2)}-$${(validImages.length * 0.18).toFixed(2)}`,
        costPhp: parsed.costPhp || `PHP ${validImages.length * 5}-PHP ${validImages.length * 10}`,
        createdAt: parsed.createdAt || new Date().toISOString(),
        model,
      },
    });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Unexpected analysis error." });
  }
}
