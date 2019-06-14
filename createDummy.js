const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('bson').ObjectID;
const faker = require('faker');
const fs = require('fs');

const DB_URL = JSON.parse(fs.readFileSync('config.json', 'utf8')).DB_URL;
const DB_NAME = "test";

const connectDatabase = async () => {
    const client = await MongoClient.connect(DB_URL, { useNewUrlParser: true }).catch(e => console.log(e));
    if (!client) {
        return false;
    }

    return client.db(DB_NAME);
}

const createDummyData = async () => {
    const db = await connectDatabase();
    if (!db) {
        console.error("Can't connect to database");
        process.exit(1);
    }

    const nHealthCenter = 30;
    const nClinic = 30;
    const nDoctor = 20;
    const nSchedule = 100;

    const types = [
        "acute care", "addiction treatment",
        "rural hospital", "rehabilitation hospital",
        "urban hospital", "pyschiatric hospital"
    ]
    const healthCenterIds = [...Array(nHealthCenter).keys()].map(() => new ObjectID());
    const clinicIds = [...Array(nClinic).keys()].map(() => new ObjectID());
    const doctorIds = [...Array(nDoctor).keys()].map(() => new ObjectID());

    const generateDoctor = (id) => {
        return {
            _id: id,
            name: faker.name.findName(),
            active: Math.random() >= 0.5,
            bookingsAvailable: Math.random() >= 0.5,
            isOnline: Math.random() >= 0.5
        }
    }

    const generateHealthCenter = (id) => {
        return {
            _id: id,
            name: faker.company.companyName(),
            description: faker.lorem.sentence(),
            type: types[Math.floor(Math.random() * types.length)],
            telephone: faker.phone.phoneNumber(),
            addressDetail: faker.address.streetAddress()

        }
    }

    const generateClinic = (id) => {
        return {
            _id: id,
            healthCenter: [...new Set([...Array(Math.floor(Math.random() * 10)).keys()].map(() => healthCenterIds[Math.floor(Math.random() * healthCenterIds.length)]))]
        }
    }

    const generateSchedule = () => {
        const randomDay = Math.floor(Math.random() * 2);
        const randomHour = Math.floor(Math.random() * 12);

        return {
            clinicId: clinicIds[Math.floor(Math.random() * clinicIds.length)],
            doctorId: doctorIds[Math.floor(Math.random() * doctorIds.length)],
            date: moment().add(randomDay, 'days').format('YYYY-MM-DD'),
            endTime: moment().add(randomHour, 'hours').locale('id').format('HH:mm')
        }
    };

    _ = healthCenterIds.map(async (i) => await db.collection("health-center").insertOne(generateHealthCenter(i)));
    _ = doctorIds.map(async (i) => await db.collection("doctor").insertOne(generateDoctor(i)));
    _ = clinicIds.map(async (i) => await db.collection("clinic").insertOne(generateClinic(i)));
    _ = [...Array(nSchedule).keys()].map(async (i) => await db.collection("doctorScheduleMongo").insertOne(generateSchedule()));

    // shutdown this program after all the dummy data had been created
    let nh = await db.collection("health-center").countDocuments();
    while (nh < nHealthCenter) {
        nh = await db.collection("health-center").countDocuments();
    }

    let nd = await db.collection("doctor").countDocuments();
    while (nd < nDoctor) {
        nd = await db.collection("doctor").countDocuments();
    }

    let nc = await db.collection("clinic").countDocuments();
    while (nc < nClinic) {
        nc = await db.collection("clinic").countDocuments();
    }

    let ns = await db.collection("doctorScheduleMongo").countDocuments();
    while (ns < nSchedule) {
        ns = await db.collection("doctorScheduleMongo").countDocuments();
    }

    process.exit(0);
};

createDummyData();