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