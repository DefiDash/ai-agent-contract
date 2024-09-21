import { ChatCompletionTool } from "openai/resources/chat/completions";
import { TableSchema, DataColumn, ReturnResponse } from "./outputSchema";

async function getPrice(asset: string) {
    /*
    const response = await fetch("https://ipapi.co/json/");
    const locationData = await response.json();
    console.log(locationData)
    return locationData;
    */
   return {
        result: {
            asset: asset,
            price: 50000
        },
        description: "You have already fetched the data for the asset for futher processing: " + asset + ". You do not need to fetch it anymore."
   }
}

export const APICallerToolsDescription : ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "getPrice",
            description: "get the price of a particular crypto asset",
            parameters: {
                type: "object",
                properties: {
                    asset: {
                        type: "string",
                        description: "short form name of the asset"
                    }
                },
            }
        }
    }
];

export const APICallerAvailableTools: { [key: string]: ( ...args: any[]) => Promise<any> } = {
    getPrice,
};