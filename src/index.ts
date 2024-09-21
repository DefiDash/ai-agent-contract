import { Request, Response, route } from './httpSupport'
import OpenAI from 'openai'

import { GenUIToolsDescription, GenUIAvailableTools } from './genuiTools'
import { APICallerToolsDescription, APICallerAvailableTools } from './apicallerTools'
import { ReturnResponse, Status } from './outputSchema'

type MessageInfo = {
    role: any,
    content: any,
    name?: any,
}

const APICallerLLMSystemContext: MessageInfo = {
    role: "system",
    content: "You are an ai tool agent that executes API calls to get the necessary functions. If all the data is already available as per the system description, then no API calling is needed" +
        "If system context is enough, you do not need to execute the tools.",   
}

const GenUILLMSystemContext: MessageInfo = {
    role: "system",
    content: "You will look at all the json responses and the predefined schemas and decide which types of chart are more suitable for displaying (Choose 1-3 of them).",
}

async function agent(openai: OpenAI, userInput: string) {

    var APICallerAgentMemory = [];
    APICallerAgentMemory.push(APICallerLLMSystemContext);
    APICallerAgentMemory.push({
        role: "user",
        content: userInput,
    });
    var APIResponsesMemory = [];

    for (let i = 0; i < 20; i++) {
        const response: any = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: APICallerAgentMemory,
            tools: APICallerToolsDescription,
        });
        console.log(APICallerAgentMemory.length);
        const { finish_reason, message } = response.choices[0]; 
        if (finish_reason === "tool_calls" && message.tool_calls) {  
            const functionName: any = message.tool_calls[0].function.name;  
            const functionToCall = APICallerAvailableTools[functionName];  
            const functionArgs = JSON.parse(message.tool_calls[0].function.arguments);  
            const functionArgsArr = Object.values(functionArgs);  
            const functionResponse: any = await functionToCall.apply(null, functionArgsArr);  
            APICallerAgentMemory.push({
                role: "system",
                name: functionName,
                content: functionResponse["description"],
            });
            APIResponsesMemory.push({
                role: "system",
                name: functionName,
                content: JSON.stringify(functionResponse["result"]),
            });
            console.log(functionResponse["description"])
        } else if (finish_reason === "stop") {
            APICallerAgentMemory.push(message);
            break;
            //return new Response(JSON.stringify(message.content));
        }
    }

    console.log(APIResponsesMemory);

    var GenUIAgentMemory = [];
    GenUIAgentMemory.push(GenUILLMSystemContext);
    GenUIAgentMemory.push({
        role: "user",
        content: JSON.stringify(APIResponsesMemory),
    });
    APIResponsesMemory.forEach(response => {
        GenUIAgentMemory.push(response);
    });

    var finalResult : ReturnResponse = new ReturnResponse(Status.success, []);

    for (let i = 0; i < 20; i++) {
        const response: any = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: GenUIAgentMemory,
            tools: GenUIToolsDescription,
        });
        const { finish_reason, message } = response.choices[0]; 
        if (finish_reason === "tool_calls" && message.tool_calls) {  
            const functionName: any = message.tool_calls[0].function.name;  
            const functionToCall = GenUIAvailableTools[functionName];  
            const functionArgs = JSON.parse(message.tool_calls[0].function.arguments);  
            const functionArgsArr = Object.values(functionArgs);  
            functionArgsArr.shift();
            const functionResponse: any = await functionToCall.apply(null, [finalResult, functionArgsArr]);  
            GenUIAgentMemory.push({
                role: "system",
                name: functionName,
                content: JSON.stringify(functionResponse),
            });
        } else if (finish_reason === "stop") {
            return new Response(JSON.stringify(finalResult));
        }
    }

    return new Response(JSON.stringify(finalResult));
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
