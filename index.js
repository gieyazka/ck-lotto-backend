const { Query, Client, Users, Databases, Storage, InputFile } = require('node-appwrite');
const dayjs = require('dayjs');
const multer = require('multer');
const { hideLastFourDigits, compareArraysById } = require('./common')
const _ = require('lodash');
const client = new Client()
    .setEndpoint('https://ck.moevedigital.com/v1')
    .setProject('CKLOTTO88')
    .setKey('24ead424ec13190d269874d43c928bd5d7bd06a879ca20e64561ad02eee606ab090230456a6efaa5bcb6b09f9f5203c09f6f09c84440ec413040dc25e40335cc3bdb3682062e11e75475852b25a516b951bd844ddddec18dbf93f010aa88a9d0f40af05bfe39903eaa07ae861a6b17a69ebcd4071d25c3140aacf72d4cd5ae0b');         // Your secret API key
const users = new Users(client);
const databases = new Databases(client);
const storage = new Storage(client);
const upload = multer();
const cors = require('cors');
const express = require('express')
const app = express()
const port = 3000
app.use(cors({
    origin: '*'
}));
app.use(express.json());
app.get('/', async (req, res) => {
    // const promise = await users.list([
    //     Query.equal("title", ["Iron Man"])
    // ]);
    try {
        // const response = await databases.listDocuments('lotto', "20230825_invoice")
        const response = await databases.updateDocument('lotto', "20230825_invoice", "65002b868892923d35a7", {
            status: "transfer",
        });
        res.json(response)
    } catch (error) {
        res.json(error)
    }

})


app.post('/calWin', async (req, res) => {
    const data = (req.body)
    const { date, userId } = data
    try {
        // const getLotterDate = await databases.listDocuments('lotto', "lottery_date",
        //     [
        //         Query.equal("date", date),
        //         // Query.greaterThan("date", dayJSDAte.toISOString()),
        //         // Query.select(["lottery", "lotteryType"]),

        //         Query.limit(50000000),

        //     ]);

        // if (getLotterDate.documents.length === 0) {
        //     res.error("no lottery date");
        // }
        // const lotterDate = getLotterDate.documents[0]
        const getLotterHistory = await databases.listDocuments('lotto', "lotto_history",
            [
                Query.equal("date", date),
                Query.equal("isDelete", false),
                // Query.greaterThan("date", dayJSDAte.toISOString()),
                // Query.select(["lottery", "lotteryType"]),

                Query.limit(10),

            ]);
        if (getLotterHistory.documents.length === 0) {
            res.status(400).json("no lottery history");
            return
        }
        const lotteryHistory = getLotterHistory.documents[0].lottery_number
        const transactionDate = dayjs(date).format("YYYYMMDD")
        const promise = await databases.listDocuments('lotto', transactionDate,
            [
                Query.isNull("status"),
                // Query.greaterThan("date", dayJSDAte.toISOString()),

                Query.select(["lottery", "lotteryType"]),
                Query.limit(50000000),

            ]);
        for (let index = 0; index < promise.documents.length; index++) {
            const element = promise.documents[index];
            const { lottery, lotteryType, $id } = element
            const checkWin = lotteryHistory.toString().substr(parseInt(lotteryType) * -1) === lottery
            if (checkWin) {
                databases.updateDocument('lotto', transactionDate, $id, {
                    status: "win",
                    calBy: "userId"
                });
            }

        }

        res.json("Calculate Success");
    } catch (error) {
        console.log('error', error)
        res.status(error.code).json(error.response)
    }
})

app.post('/addUser', upload.array('files'), async (req, res) => {
    const files = req.files;
    // console.log(req.body);
    const data = JSON.parse(req.body.data)
    console.log('data', data)
    console.log('files', files[0])
    const { email, username, password, firstname, lastname, gender, tel, address, type = "customer" } = data
    try {
        const promise = await users.create('unique()', email, tel, password, firstname + " " + lastname);
        console.log('promise', promise)
        let imgData = null
        if (files[0]) {

            const promise = storage.createFile("6491ce1131561710ddb5", "unique()", InputFile.fromBuffer(files[0].buffer, files[0].originalname));
            const res = await promise.then(function (response) {
                // console.log(response); // Success
                const url = "https://ck.moevedigital.com/v1" + "/storage/buckets/" + "6491ce1131561710ddb5" + "/files/" + response['$id'] + "/view?project=CKLOTTO88"
                response.url = url
                response.status = 200
                return response
            }, function (error) {
                console.log('54', error)
                error.status = 405
                return error
            });
            if (res.status === 200) {
                imgData = (JSON.stringify({
                    url: res.url,
                    name: res.name,
                }))
            } else {
                throw new Error(res)
            }
        }
        const userRes = await databases.createDocument('lotto', 'users', promise.$id, {
            userId: promise.$id,
            avatar: imgData, email, username, firstname, lastname, gender, tel, address, type
        });
        console.log('userRes', userRes)
        res.json(userRes);
    } catch (error) {
        console.log('error', error)
        res.status(error.code).json(error.response)
    }
})

app.post('/getCustomer', async (req, res) => {
    try {
        const { pagination, textSearch } = req.body

        if (textSearch !== "") {
            const searchUsername = await databases.listDocuments('lotto', 'users',
                [
                    Query.equal('isDelete', false),
                    Query.equal('type', "customer"),
                    Query.search("username", textSearch),
                    // Query.orderDesc("startDate"),
                    Query.limit(pagination.pageSize),
                    Query.offset((pagination.pageIndex) * pagination.pageSize)
                ]);
            const searchEmail = await databases.listDocuments('lotto', 'users',
                [
                    Query.equal('isDelete', false),
                    Query.equal('type', "customer"),
                    Query.search("email", textSearch),
                    Query.limit(pagination.pageSize),
                    Query.offset((pagination.pageIndex) * pagination.pageSize)
                ]);

            const compareData = compareArraysById(searchUsername.documents, searchEmail.documents)
            res.json({
                total: compareData.length,
                documents: compareData.map(data => {
                    data.tel = hideLastFourDigits(data.tel);
                })

            })
        } else {

            const promise = await databases.listDocuments('lotto', 'users',
                [
                    Query.equal('isDelete', false),
                    Query.equal('type', "customer"),
                    // Query.orderDesc("startDate"),
                    Query.limit(pagination.pageSize),
                    Query.offset((pagination.pageIndex) * pagination.pageSize)
                ]);
            promise.documents.map(data => {
                data.tel = hideLastFourDigits(data.tel);
            })
            res.json(promise);
        }

        // console.log(response); // Success

    }


    catch (error) {
        console.log('error', error)
        res.status(error.code).json(error.response)
    }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})