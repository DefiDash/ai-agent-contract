import 'dotenv/config'
import './testSupport'
import {execute} from "./testSupport";

async function test() {
    const getResult = await execute({
        method: 'GET',
        path: '/ipfs/CID',
        queries: {
            chatQuery: ["Show me the price table of ETH adn BTC"],
            // Choose from any model listed here https://platform.openai.com/docs/models
            model: ["gpt-4o"]
        },
        secret: { redpillApiKey: 'aaa' },
        headers: {},
    })
    console.log('GET RESULT:', JSON.parse(getResult))

    console.log(`Now you are ready to publish your agent, add secrets, and interact with your agent in the following steps:\n- Execute: 'npm run publish-agent'\n- Set secrets: 'npm run set-secrets'\n- Go to the url produced by setting the secrets (e.g. https://wapo-testnet.phala.network/ipfs/QmPQJD5zv3cYDRM25uGAVjLvXGNyQf9Vonz7rqkQB52Jae?key=b092532592cbd0cf)`)
}

async function testPost(){
    const postResult = await execute({
        method: 'POST',
        path: '/ipfs/CID',
        queries: {},
        secret: { redpillApiKey: 'ha' },
        headers: {},
    })
    console.log('POST RESULT:', JSON.parse(postResult))
}

async function testLocation(){

}

test().then(() => { }).catch(err => console.error(err)).finally(() => 
    console.log('Test 1 Completed')
)

testPost().then(() => { }).catch(err => console.error(err)).finally(() => 
    console.log('Test 2 Completed')
)
