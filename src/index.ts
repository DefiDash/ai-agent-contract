import { Request, Response, route } from './httpSupport'

import { ChatAnthropic,  } from "@langchain/anthropic";

import { APICallerTools, APICallerToolsExecutor } from './apicallerTools';
import { GenUITools, GenUIToolsExecutor } from './genuiTools';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { DataColumn, ReturnResponse, Status } from './outputSchema';


type MessageInfo = {
    role: any,
    content: any,
    name?: any,
}

const APICallerLLMSystemContext: MessageInfo = {
    role: "system",
    content: "You are an ai tool agent that executes API calls to get the necessary functions. If all the data is already available as per the system description, then no API calling is needed. If no data needs to be fetched anymore, the agent can end" +
        "If system context is enough, you do not need to execute the tools.",   
}

const GenUILLMSystemContext: MessageInfo = {
    role: "system",
    content: "You are a UI Composer Agent. Using the user query and available data, please generate visualizations using the available functions",
}

async function agent(apikey: string, userInput: string): Promise<Response>{
    const llm = new ChatAnthropic({
        model: "claude-3-5-sonnet-20240620",
        temperature: 0,
        apiKey: apikey,
      });

    // Call API with LLM
    var apicaller_prompt_template = ChatPromptTemplate.fromMessages(
        [
            ["system", APICallerLLMSystemContext.content],
            ["placeholder","{chat_history}"],
            ["user", "{input}"],
            ["placeholder","{agent_scratchpad}"],
        ]
    )

    const APICallerLLM = llm.bindTools(APICallerTools)
    var apicaller_prompt = await apicaller_prompt_template.invoke({
        input: userInput
    })
    const APICaller_Result = await APICallerLLM.invoke(apicaller_prompt)
    var system_content = ""
    if (APICaller_Result.tool_calls) {
        for (const tool_call of APICaller_Result.tool_calls) {
            const functionName = tool_call.name;
            const functionToCall = APICallerToolsExecutor.find(tool => tool.name === functionName);
            console.log(functionName)
            if (functionToCall) {
                const args = Array.isArray(tool_call.args) ? tool_call.args : [tool_call.args];
                console.log(JSON.stringify(tool_call.args));
                var result = await functionToCall.exec(JSON.stringify(tool_call.args));
                system_content += result + "\n";
                console.log(result)
            }
        }
    }
    

    //Compose Visualization with LLM
    var genui_prompt_template = ChatPromptTemplate.fromMessages(
        [
            ["system", GenUILLMSystemContext.content + "\n \n" + system_content],
            ["placeholder","{chat_history}"],
            ["user", "{input}"],
            ["placeholder","{agent_scratchpad}"],
        ]
    )
    const GenUILLM = llm.bindTools(GenUITools)
    var genui_prompt = await genui_prompt_template.invoke({
        input: userInput
    })
    const genui_result = await GenUILLM.invoke(genui_prompt)
    var final_response = new ReturnResponse(Status.success, [])
    if (genui_result.tool_calls) {
        for (const tool_call of genui_result.tool_calls) {
            const functionName = tool_call.name;
            const functionToCall = GenUIToolsExecutor.find(tool => tool.name === functionName);
            console.log(functionName)
            if (functionToCall) {
                const args = Array.isArray(tool_call.args) ? tool_call.args : [tool_call.args];
                const value = functionToCall.exec(args[0] as { assetName: string; price: number; changePercentage: number; values: DataColumn[]; data: { x: string; y: number; }[][]; })
                final_response.response.push(JSON.stringify(value)) + "\n";
            }
        }
    }
    console.log(final_response)
    return new Response(final_response.generateResponse())
}

/*
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
                role: "assistant",
                name: functionName,
                content: functionResponse["result"]["description"]
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
        content: userInput
    }
    )
    GenUIAgentMemory.push({
        role: "system",
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
            console.log(functionResponse)
        } else if (finish_reason === "stop") {
            return new Response(JSON.stringify(finalResult));
        }
    }

    return new Response(JSON.stringify(finalResult));
  }*/

async function GET(req: Request): Promise<Response> {
    let result = { message: '' }
    const secrets = req.secret || {}
    const queries = req.queries
    const claudeApiKey = (secrets.claudeApiKey) ? secrets.claudeApiKey as string : ''
    
    /*const openai = new OpenAI({ 
        baseURL: "https://api.red-pill.ai/v1",
        apiKey: redpillApiKey 
    })*/
    console.log("Claude API Key" + claudeApiKey)
    const query = (queries.chatQuery) ? queries.chatQuery[0] as string : 'Who are you?'

    return await agent(claudeApiKey, query)

}

async function POST(req: Request): Promise<Response> {
    return new Response(JSON.stringify({message: 'Post Implementation Test'}))
}

export default async function main(request: string) {
    return await route({ GET, POST }, request)
}
