import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { DataColumn, LinechartSchema, MinimalPriceDashboardSchema, TableSchema } from "./outputSchema";

const composeMinimalPriceDashboardSchema = z.object({
    assetName: z.string(),
    price: z.number(),
    changePercentage: z.number()
})

const composeLinechartSchema = z.object({
    data: z.array(z.array(z.object({
        x: z.string(),
        y: z.number()
    })))
})

const composeTableSchema = z.object({
    values: z.array(z.object({
        name: z.string(),
        type: z.string(),
        data: z.array(z.string())
    }))
})

const composeMinimalPriceDashboardTool = tool(
    async(input): Promise<object> => {
        return {
            result: {
                type: "object",
                asset: input.assetName,
                price: input.price,
                changePercentage: input.changePercentage,
                description: "The price of " + input.assetName + " is " + 50000 + " USD"
            },
            description: "A minimal dashboard has been created for the asset: " + input.assetName + ". You do not need to create it anymore."
       }
    },
    {
        name: "composeMinimalPriceDashboard",
        description: "creates a minimal dashboard that displays the assetName, price and change percentage. assetName = short form name of the crypto asset, price = current known price, change percentage = current known change percentage",
        schema: composeMinimalPriceDashboardSchema
    }
)

const composeTableTool = tool(
    async(input): Promise<object> => {
        return {
            result: {
                type: "object",
                values: input.values,
                description: "A table has been created with the given data"
            },
            description: "A table has been created with the given data"
       }
    },
    {
        name: "composeTable",
        description: "creates a table with the given data",
        schema: composeTableSchema
    }
)

const composeLinechartTool = tool(
    async(input): Promise<object> => {
        return {
            result: {
                type: "object",
                data: input.data,
                description: "A linechart has been created with the given data"
            },
            description: "A linechart has been created with the given data"
       }
    },
    {
        name: "composeLinechart",
        description: "creates a linechart with the given data. The parameter is a multidimensional array where each array is a datapoint with x and y values",
        schema: composeLinechartSchema
    }
)

export const GenUITools = [
    composeMinimalPriceDashboardTool,
    composeTableTool,
    composeLinechartTool
]

function composeMinimalPriceDashboardExecutor(input: { assetName: string, price: number, changePercentage: number }){
    const priceDashboardSchema = new MinimalPriceDashboardSchema(input.assetName, input.price, input.changePercentage);
    return priceDashboardSchema;
}

function composeTableExecutor(input: { values: DataColumn[] }){
    const table = new TableSchema(input.values);
    return table;
}

function composeLinechartExecutor(input: { data: { x: string, y: number }[][] }){
    console.log(input.data)
    const linechart = new LinechartSchema(input.data);
    return linechart;
}

export const GenUIToolsExecutor = [
    {
        name: "composeMinimalPriceDashboard",
        exec: composeMinimalPriceDashboardExecutor,
        matcher: composeMinimalPriceDashboardSchema
    },
    {
        name: "composeTable",
        exec: composeTableExecutor,
        matcher: composeTableSchema
    },
    {
        name: "composeLinechart",
        exec: composeLinechartExecutor,
        matcher: composeLinechartSchema
    }
]