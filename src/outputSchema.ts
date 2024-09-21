/// <summary>
/// This file will contain a list of all the output schemas (graphs)
/// that will be displayed and appended to the final result
/// </summary>

/// The Base Schema class that handles all the different types of schemas
class Schema {
    type: string;
    content: any[];

    constructor(type: string, content: any[]) {
        this.type = type;
        this.content = content
    }

    generateSchema(): string {
        return JSON.stringify(this);
    }
}

/// The Column class used in the TableSchema class
export class DataColumn {
    name: string;
    type: string;
    data: any[];

    constructor(name: string, type: string, data: any[]) {
        this.name = name;
        this.type = type;
        this.data = data;
    }
}

/// The Table Schema class that extends the Schema class
export class TableSchema extends Schema {
    constructor(data: DataColumn[]) {
        super("Table", data);
    }
}

/// The Price Dashboard that minimally displays the current price
export class MinimalPriceDashboardSchema {
    assetName: String;
    price: number
    changePercentage: number
    constructor(assetName: String, price: number, changePercentage: number){
        this.assetName = assetName
        this.price = price
        this.changePercentage = changePercentage
    }
}

export class LinechartDatapoint{
    x: string;
    y: number;
    constructor(x: string, y: number){
        this.x = x;
        this.y = y;
    }
}

export class LinechartSchema{
    type: string = "Linechart";
    data: LinechartDatapoint[][];
    constructor(data: LinechartDatapoint[][]){
        this.data = data;
    }
}

export enum Status {
    success = "success",
    error = "error"
}

/// The Return Response that handles the response
export class ReturnResponse {
    status: Status
    response: any[]
    constructor(status: Status, response: any[]) {
        this.status = status
        this.response = response
    }

    generateResponse(): string {
        return JSON.stringify(this.response)
    }
}