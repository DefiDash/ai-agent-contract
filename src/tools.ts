import { ChatCompletionTool } from "openai/resources/chat/completions";

async function getLocation() {
    const response = await fetch("https://ipapi.co/json/");
    const locationData = await response.json();
    console.log(locationData)
    return locationData;
}

export const toolsDescription : ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "getLocation",
            description: "Get the user's location based on their IP address",
            parameters: {
                type: "object",
                properties: {},
            },
        }
    },
];

export const availableTools: { [key: string]: (...args: any[]) => Promise<any> } = {
    getLocation,
};