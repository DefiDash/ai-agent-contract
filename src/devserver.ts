import express from 'express';
import {ReturnResponse, TableSchema, Status} from './outputSchema'

const app = express();
const port = 5000;

app.use(express.json());

app.post('/post', (req, res) => {
    const data = req.body;
    console.log('Received data:', data);
    res.send('Data received');
});

app.listen(port, () => {
    var exampleTable = new TableSchema(["Hello", "World"], [["12345", "yes"],["1234", "no"]])
    return new ReturnResponse(
        Status.success, 
        [
            exampleTable
        ]
    ).generateResponse()
});