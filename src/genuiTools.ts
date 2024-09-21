import { ChatCompletionTool } from "openai/resources/chat/completions";
import { TableSchema, DataColumn, ReturnResponse } from "./outputSchema";

async function composeTable(returnResponse: ReturnResponse, data: DataColumn[]) {
    const table = new TableSchema(data);
    returnResponse.response.push(table);

    var titles = data.map((column) => column.name);
    return "Table for " + titles.join(", ") + " has been composed";
}

export const GenUIToolsDescription : ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "composeTable",
            description: "compose a table with arbitary amount of rows and columns with the given data on the frontend",
            parameters: {
                type: "object",
                properties: {
                    returnResponse: {
                        type: "object",
                        description: "don't consider this parameter, keep it null",
                    },
                    data: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: {
                                    type: "string",
                                    description: "name of the column"
                                },
                                type: {
                                    type: "string",
                                    description: "type of the column",
                                    enum: ["string", "number", "boolean"]
                                },
                                data: {
                                    type: "array",
                                    description: "array data of that particular column",
                                    items: {

                                    }
                                }
                            },
                            required: ["name", "type", "data"]
                        }
                    }
                },
                required: ["data"]
            },
        }
    }
];

export const GenUIAvailableTools: { [key: string]: (returnResponse: ReturnResponse, ...args: any[]) => Promise<any> } = {
    composeTable,
};