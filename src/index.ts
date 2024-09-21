import { Request, Response, route } from './httpSupport'

import OpenAI from 'openai'
import { toolsDescription, availableTools } from './tools'

type MessageInfo = {
    role: any,
    content: any,
    name?: any,
}

const messages: MessageInfo[] = [
    {
        role: "system",
        content: `You are a helpful assistant. Only use the functions you have been provided with.`,
    },
];

async function agent(openai: OpenAI, userInput: string) {
    messages.push({
      role: "user",
      content: userInput,
    });

    for (let i = 0; i < 5; i++) {
        const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        tools: toolsDescription,
        });

        console.log(response);
        const { finish_reason, message } = response.choices[0]; 
        if (finish_reason === "tool_calls" && message.tool_calls) {  
            const functionName = message.tool_calls[0].function.name;  
            const functionToCall = availableTools[functionName];  
            const functionArgs = JSON.parse(message.tool_calls[0].function.arguments);  
            const functionArgsArr = Object.values(functionArgs);  
            const functionResponse = await functionToCall.apply(null, functionArgsArr);  
            messages.push({
                role: "function",
                name: functionName,
                content: `The result of the last function was this: ${JSON.stringify(
                functionResponse
                )}
                `,
            });
        } else if (finish_reason === "stop") {
            messages.push(message);
            return new Response(JSON.stringify(message.content));
        }
    }
    return new Response(JSON.stringify(""))
  }

async function GET(req: Request): Promise<Response> {
    let result = { message: '' }
    const secrets = req.secret || {}
    const queries = req.queries
    const redpillApiKey = (secrets.redpillApiKey) ? secrets.redpillApiKey as string : ''
    const openai = new OpenAI({ 
        baseURL: "https://api.red-pill.ai/v1",
        apiKey: redpillApiKey 
    })
    const query = (queries.chatQuery) ? queries.chatQuery[0] as string : 'Who are you?'

    return agent(openai, query)
}

async function POST(req: Request): Promise<Response> {
    return new Response(JSON.stringify({message: 'Post Implementation Test'}))
}

export default async function main(request: string) {
    return await route({ GET, POST }, request)
}
