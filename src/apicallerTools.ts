import { z } from "zod";
import { tool } from "@langchain/core/tools";
import axios from 'axios';
import { gql  } from 'graphql-tag';
import { DocumentNode } from 'graphql';
import { stringify } from 'querystring';

export type Subgraph = 'curve' | 'uniswap';
export type Condition = 'swap' | 'pool' | 'transaction';
export type Metric = 'price' | 'tvl'  | 'volume' | 'txCount';

const SUBGRAPH_URLS: Record<Subgraph, string> = {
    curve: 'https://api.thegraph.com/subgraphs/name/curvefi/curve',
    uniswap: 'https://gateway.thegraph.com/api/02738ce46c23ea0b4fc6a8b084caec14/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV'
};

const TOP_ERC20_TOKENS: Record<string, string> = {
    'USDT': '0xdac17f958d2ee523a2206206994597c13d831ec7',
    'USDC': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    'BNB': '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
    'BUSD': '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
    'DAI': '0x6b175474e89094c44da98b954eedeac495271d0f',
    'WBTC': '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    'UNI': '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    'LINK': '0x514910771af9ca656af840dff83e8264ecf986ca',
    'MATIC': '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
    'AAVE': '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
};

function getQueryFragmentForUniswap(asset: string, metric: Metric, startTimestamp: number, endTimestamp: number): string {
    const assetAddress = TOP_ERC20_TOKENS[asset.toUpperCase()]
    switch (metric) {
        case 'price':
            return `
          token(id: "${assetAddress}") {
            derivedETH
          }
          bundle(id: "1") {
            ethPriceUSD
          }
        `;
        case 'volume':
            return `token(id: "${assetAddress}") {
            volume
          }`;
        case 'tvl':
            return `
          token(id: "${assetAddress}") {
            totalValueLocked
          }
        `;
        case 'txCount':
            return `
          pools(
          first: ${5},
          ){
          token0 {
            name
            symbol
            }
            token1 {
                name
                symbol
            }
            txCount
        }
        `;
        default:
            throw new Error(`Unsupported metric: ${metric}`);
    }
}

function generateUniswapQuery(assets: string[], metric: Metric, startTimestamp: number, endTimestamp: number): string {
    if (assets.length === 1 && assets[0].toUpperCase() === 'ETH' && metric === 'price') {
        return `
          bundle(id: "1") {
            ethPriceUSD
          }
        `;
    }
    return assets.map((asset, index) => `${asset}: ${getQueryFragmentForUniswap(asset, metric, startTimestamp, endTimestamp)}`).join('\n');
}

const getConditionFragmentForUniswap = (
    condition: Condition,
    N: number,
    timestampStart: number,
    timestampEnd: number
): string => {
    switch(condition) {
        case 'pool':
        return `pools(
            first: ${N},
            where: {createdAtBlockNumber_gte: "${timestampStart}", createdAtBlockNumber_lte: "${timestampEnd}"}
            ){
            token0Price
            token1Price
            token0 {
                name
                symbol
            }
            token1 {
                name
                symbol
            }
            txCount
            volumeUSD
            totalValueLockedUSD
            }`

        case 'swap':
        return `swaps(
                    first: ${N},
                    where: {timestamp_lte: "${timestampEnd}", timestamp_gte: "${timestampStart}"}
                ){
                    amount0
                    amount1
                    amountUSD
                    token0 {
                        name
                        symbol
                    }
                    token1 {
                        name
                        symbol
                    }
                    transaction {
                        gasPrice
                    }
                }`
        
        case 'transaction':
        return `
            transactions(
                first: ${N},
                where: {timestamp_gte: "${timestampStart}", timestamp_lte: "${timestampEnd}"}
            ){
                gasPrice
                gasUsed
                swaps {
                    amountUSD
                    token0 {
                        name
                        symbol
                        volumeUSD
                    }
                    token1 {
                        name
                        symbol
                        volumeUSD
                    }
                }
            }`
        
        default:
        throw new Error(`Unsupported condition: ${condition}`);
    }
}

function processData(data: any, assets: string[], metric: string) {
    if (assets.indexOf("ETH") > -1 && metric === 'price' && assets.length == 1) {
        console.log("d: ", data.data.bundle.ethPriceUSD)
        return { ETH: parseFloat(data.data.bundle.ethPriceUSD).toFixed(2) };
    }
    return assets.reduce((acc, asset, index) => {
        console.log("data:",data)
        const assetData = data[`${asset}`];
        console.log("asset data:", assetData)
        if (assetData) {
            const ethPriceUSD = parseFloat(data.bundle.ethPriceUSD);
            const derivedETH = parseFloat(assetData.derivedETH);
                acc[asset] = {price: (derivedETH * ethPriceUSD).toFixed(2)};
                console.log("price: ", acc)
        } else {
            const ethPriceUSD = parseFloat(data.bundle.ethPriceUSD);
            acc[asset] = {price: ethPriceUSD.toFixed(2)};
        }
        return acc;
    }, {} as Record<string, object>);
}
  
const getPriceSchema = z.object({
    asset: z.string()
});

const getAssetsWithSchema = z.object({
    condition: z.enum(['swap', 'pool', 'transaction']),
    n: z.number(),
    subgraph: z.enum(['curve', 'uniswap']),
    dateStart: z.date(),
    dateEnd: z.date()
});

const getAssetsMetricsSchema = z.object({
    assets: z.array(z.enum(['USDT', 'USDC', 'BNB', 'BUSD', 'DAI', 'WBTC', 'UNI', 'LINK', 'MATIC', 'AAVE'])),
    metric: z.enum(['price', 'tvl', 'tx', 'volume', 'txCount']),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    subgraph: z.enum(['curve', 'uniswap'])
});

const getPriceTool = tool(
    async (input): Promise<object> => {
        return {
            result: {
                type: "object",
                asset: input.asset,
                price: 50000,
                description: "The price of " + input.asset + " is " + 50000 + " USD"
            },
            description: "You have already fetched the data for the asset for futher processing: " + input.asset + ". You do not need to fetch it anymore."
       }
    },
    {
        name: "getPrice",
        description: "get the price of a particular crypto asset",
        schema: getPriceSchema
    },
)

const getAssetsWithTool = tool(
    async (input): Promise<object> => {
        return {
            result:{

            }
        }
    },
    {
        name: "getAssetsWith",
        description: "Uses this function to take the data from uniswap pool, swap, transaction from a certain date until a certain date, with certain amount of data." +
                    "The return data from swap will tell you the amount reduced and the amount added from a pair of token, with the name and symbol of the token for you to identify it. It also will tell you how much of the gas price for the swap." +
                    "The return data from pool will tell you the price of the token inside the pool and the name and symbol of the token for you to identify, as well as how many transactions occur within the pool, the volumeUSD, and the total value locked of usd." +
                    "The return data from transaction will tell you what transaction happen between the which token, how much gas price and how much gas has been used",
        schema: getAssetsWithSchema
    }
)

const getAssetsMetricsTool = tool(
    async (input): Promise<object> => {
        return {
            result:{

            }
        }
    },
    {
        name: "getAssetsMetrics",
        description: `This function retrieves a specified metric ("price", "volume", "tvl", or "txCount") for one or more ERC20 tokens listed in the TOP_ERC20_TOKENS constant, which maps token symbols to smart contract addresses, and returns an object with asset symbols (e.g., "ETH", "LINK") as keys, where each key contains another object with the requested metric: "price" returns current USD price, "volume" gives transaction volume, "tvl" shows total value locked, and "txCount" provides the number of transactions in the five largest Uniswap pools.`,
        schema: getAssetsMetricsSchema
    }
)

export const APICallerTools = [
    getAssetsMetricsTool,
    getAssetsWithTool
]

function getPrice(input: { asset: string }): Promise<string> {
    console.log(input);
    return Promise.resolve("The price of " + input.asset + " is " + 50000 + " USD");
}

interface getAssetsWithInput{
    condition: Condition,
    n: number,
    subgraph: Subgraph,
    dateStart: string,
    dateEnd: string
}

function parseGetAssetsWithInput(jsonString: string): getAssetsWithInput {
    let input: any;

    try {
        input = JSON.parse(jsonString);
    } catch (error) {
        throw new Error('Invalid JSON string');
    }

    if (!['swap', 'pool', 'transaction'].includes(input.condition)) {
        throw new Error('Invalid condition');
    }

    if (typeof input.n !== 'number') {
        throw new Error('Invalid n');
    }

    if (!['curve', 'uniswap'].includes(input.subgraph)) {
        throw new Error('Invalid subgraph');
    }

    if (isNaN(Date.parse(input.dateStart))) {
        throw new Error('Invalid dateStart');
    }

    if (isNaN(Date.parse(input.dateEnd))) {
        throw new Error('Invalid dateEnd');
    }

    return {
        condition: input.condition as Condition,
        n: input.n,
        subgraph: input.subgraph as Subgraph,
        dateStart: input.dateStart,
        dateEnd: input.dateEnd
    };
}
// Get assets with a certain condition
const getAssetsWith = async (
    jsonString: string
) => {
    const input: getAssetsWithInput = parseGetAssetsWithInput(jsonString);
    const timestampStart = Math.floor(new Date(input.dateStart).getTime() / 1000);
    console.log(input.dateStart);
    const timestampEnd = Math.floor(new Date(input.dateEnd).getTime() / 1000);
    let queryString = '';
    if (input.subgraph === 'curve') {
      //   queryString = generateCurveQuery(assets, metric, startTimestamp, endTimestamp);
      } else if (input.subgraph === 'uniswap') {
        queryString = getConditionFragmentForUniswap(input.condition, input.n, timestampStart, timestampEnd);
      }
    //const url = SUBGRAPH_URLS[input.subgraph];
    const query = `
      query {
        ${queryString}
      }
    `
    console.log(query)
    var url = "https://gateway.thegraph.com/api/02738ce46c23ea0b4fc6a8b084caec14/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";
    const requestObject = await fetch(
        url,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        }
    )

    const response = await requestObject.json();
    //const response = await axios.post("https://gateway.thegraph.com/api/02738ce46c23ea0b4fc6a8b084caec14/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV", { query });
    
    let resultString: string = "";
    switch(input.condition) {
        case 'swap':
            response.data.swaps.forEach((swap: any) => {
                resultString += "The amount of " + swap.token0.name + "("+swap.token0.symbol+")" + " reduced is " + swap.amount0 + " and the amount of " + swap.token1.name +"("+swap.token1.symbol+")" + " added is " + swap.amount1 + " with the gas price of " + swap.transaction.gasPrice + "with the amount of " + swap.amountUSD + " USD";
            });
            // Bitcoin [BTC] []
            break;
        case 'pool':
            response.data.pools.forEach((pool: any) => {
                resultString += "The price of " + pool.token0.name + " is " + pool.token0Price + " and the price of " + pool.token1.name + " is " + pool.token1Price + " with the transaction count of " + pool.txCount + " and the volume USD of " + pool.volumeUSD + " and the total value locked of USD is " + pool.totalValueLockedUSD;
            });
            break;
        case 'transaction':
            response.data.transactions.forEach((transaction: any) => {
                resultString += "The gas price of this transaction is " + transaction.gasPrice + " and the gas used is " + transaction.gasUsed;
                transaction.swaps.forEach((swap: any) => {
                    resultString += "The amount of " + swap.token0.name + " is " + swap.token0.volumeUSD + " and the amount of " + swap.token1.name + " is " + swap.token1.volumeUSD + " with the amount of " + swap.amountUSD + " USD";
                });
            });
            break;
    }
    return resultString
    
}
 
interface AssetMetricsInput{
    assets: string[],
    metric: Metric,
    startDate?: string,
    endDate?: string,
    subgraph: Subgraph
}

function parseAssetMetricsInput(jsonString: string): AssetMetricsInput {
    let input: any;

    try {
        input = JSON.parse(jsonString);
    } catch (error) {
        throw new Error('Invalid JSON string');
    }

    if (!Array.isArray(input.assets) || !input.assets.every((asset: any) => typeof asset === 'string')) {
        throw new Error('Invalid assets array');
    }

    if (!['price', 'volume', 'tvl', 'txCount'].includes(input.metric)) {
        throw new Error('Invalid metric');
    }

    if (input.startDate && isNaN(Date.parse(input.startDate))) {
        throw new Error('Invalid startDate');
    }

    if (input.endDate && isNaN(Date.parse(input.endDate))) {
        throw new Error('Invalid endDate');
    }

    if (!['uniswap', 'curve'].includes(input.subgraph)) {
        throw new Error('Invalid subgraph');
    }

    return {
        assets: input.assets,
        metric: input.metric as Metric,
        startDate: input.startDate,
        endDate: input.endDate,
        subgraph: input.subgraph as Subgraph
    };
}
 const getAssetsMetrics = async(jsonString: string): Promise<any> => {
    const input = parseAssetMetricsInput(jsonString);
    const startTimestamp = input.startDate ? Math.floor(new Date(input.startDate).getTime() / 1000) : 0;
    const endTimestamp = input.endDate? Math.floor(new Date(input.endDate).getTime() / 1000): 0;
    console.log(startTimestamp, endTimestamp);

    let queryString = '';
    let subgraphURL = '';

    if (input.subgraph === 'curve') {
        // queryString = generateCurveQuery(assets, metric);
        subgraphURL = SUBGRAPH_URLS.curve;
    } else if (input.subgraph === 'uniswap') {
        queryString = generateUniswapQuery(input.assets, input.metric, startTimestamp, endTimestamp);
        subgraphURL = SUBGRAPH_URLS.uniswap;
    }
    console.log(queryString);

    const finalQueryString = `
        query {
            ${queryString}
        }
    `;
    console.log(finalQueryString);

    var url = subgraphURL;
    const requestObject = await fetch(
        url,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: finalQueryString }),
        }
    )
    const response = await requestObject.json();

    let resultString: string = "";
    switch(input.metric) {
        case 'txCount':
            response.data.pools.forEach((pool: any) => {
                resultString += "The transaction count of " + pool.txCount + " for the pool of " + pool.token0.name + " and " + pool.token1.name + "\n";
            });
            break;
        case 'tvl':
            for(const [key,value] of Object.entries(response.data)){
                resultString += "The total value locked of " + key + " is " + (value as any).totalValueLocked + "\n";
            }
            break;
        case 'price':
            const data = processData(response.data, input.assets, input.metric);
            for(const [key,value] of Object.entries(data)){
                resultString += "The price of " + key + " is " + (value as any).price + "\n";
            }
            break;
        case 'volume':
            for(const [key,value] of Object.entries(response.data)){
                resultString += "The volume of " + key + " is " + (value as any).volume + "\n";
            }
            break;
    }

    // if(input.metric=='tvl')
    //     return processData(response.data, input.assets, input.metric);
    
    // if(input.metric=='price')
    //     return processData(response.data, input.assets, input.metric);
    //return response.data.data
    return resultString;
}

interface APICallerExecutor{
    name: string;
    exec: (input: string) => Promise<any>;
    matcher?: z.ZodSchema<any>
}

export const APICallerToolsExecutor: APICallerExecutor[] = [
    {
        name: "getAssetsWith",
        exec: getAssetsWith
    },
    {
        name: "getAssetsMetrics",
        exec: getAssetsMetrics
    }
]