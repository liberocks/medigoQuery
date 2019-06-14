const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('bson').ObjectID;
const fs = require('fs');

const DB_URL = JSON.parse(fs.readFileSync('config.json', 'utf8')).DB_URL;
const DB_NAME = "test";
const DEBUG = "--verbose" in process.argv ? true : false;

const connectDatabase = async () => {
    const client = await MongoClient.connect(DB_URL, { useNewUrlParser: true }).catch(e => console.log(e));
    if (!client) {
        return false;
    }

    return client.db(DB_NAME);
}

class Repository {
    constructor(db) {
        this.db = db;
    }

    getDoctorScheduleMongoCollection() {
        return this.db.collection("doctorScheduleMongo");
    }

    getHealthCenterClinicCollection() {
        return this.db.collection("clinic");
    }
}


async function getClinic(ids, db) {
    const repository = new Repository(db);

    // refactoring backendTest.js line 120:127
    const collection = repository.getHealthCenterClinicCollection();

    if (DEBUG) console.log("DEBUG ids : ", ids.map(id => new ObjectID(id))); //debug
    const result = await collection.aggregate([
        { '$match': { '_id': { '$in': ids.map(id => new ObjectID(id)) } } },
        { $lookup: { from: 'health-center', localField: 'healthCenter', foreignField: '_id', as: 'healthCenters' } }
    ]).toArray();

    // from backendTest.js line 128:142
    result.forEach((item) => {
        item.healthCenters.map(function (value, index) {
            // redefined output collection
            let arrKey = ['name', 'description', 'type', 'telephone', 'addressDetail', '_id']
            Object.keys(value).map(function (key) {
                if (!arrKey.includes(key)) delete value[key]
                value.id = value._id
            })

            delete value._id

            return value
        })
    });
    if (DEBUG) console.log("DEBUG result #2: ", result) // DEBUG

    return result;
}


Array.prototype.concatAll = function () {
    var results = []
    this.forEach(function (subArray) {
        subArray.forEach(function (subArrayValue) {
            results.push(subArrayValue)
        })
    })
    return results
}

const runQuery = async (query) => {
    const db = await connectDatabase();
    if (!db) {
        console.error("Can't connect to database");
        process.exit(1);
    }

    const repository = new Repository(db);

    // refactoring backendTest.js line 4:9
    let getCol = repository.getDoctorScheduleMongoCollection();
    let queryDate = {};
    let queryEndTime = { $gte: moment().locale('id').format('HH:mm') };
    let limit = 1;
    let skip = 0;
    let clinicIds = [];

    // refactoring backendTest.js line 11:19
    if (!query.date) {
        queryDate = { $gte: moment().format('YYYY-MM-DD') };
    } else {
        queryDate = query.date
        if (query.page) {
            limit = 10
            skip = 10 * (query.page - 1)
        }
    }

    // refactoring backendTest.js line 22:29
    if (!query.date) {
        try {
            clinicIds = await getCol.distinct('clinicId', { doctorId: new ObjectID(query.doctorId) });
        } catch (e) {
            console.error(e)
        }
    }
    if (DEBUG) console.log("DEBUG clinicIds : ", clinicIds) // DEBUG

    // refactoring backendTest.js line 31:44
    const result = await getCol.aggregate([
        {
            $match: {
                doctorId: new ObjectID(query.doctorId),
                date: queryDate,
                endTime: queryEndTime
            }
        },
        { $lookup: { from: 'doctor', localField: 'doctorId', foreignField: '_id', as: 'doctors' } },
        { $sort: { date: 1, endTime: 1 } },
        { $limit: limit },
        { $skip: skip }
    ]).toArray();
    if (DEBUG) console.log("DEBUG result #1 : ", result) // DEBUG

    // refactoring backendTest.js line 47:52
    let schedules = []
    let healthCenters = []
    let healthCentersArray = []
    if (query.date) clinicIds = result.map((value) => { return value.clinicId })
    if (DEBUG) console.log("DEBUG clinicIds : ", clinicIds) // DEBUG

    clinics = await getClinic(clinicIds, db)
    if (DEBUG) console.log("DEBUG clinics #1: ", clinics) // DEBUG

    // refactoring backendTest.js line 54:74
    result.forEach((value) => {
        value.id = value._id
        delete value._id
        value.booking = false
        value.doctors.forEach((el) => {
            if (el.active && el.bookingsAvailable && el.isOnline) {
                value.booking = true
            }
        })

        delete value.doctors

        clinics.forEach((val) => {
            if (val._id.str === value.clinicId.str) {
                val.healthCenters.forEach((v) => {
                    value.healthCenterId = v.id
                    value.healthCenter = v
                })
            }
        })
    })
    if (DEBUG) console.log("DEBUG result #3 : ", result) // DEBUG
    if (DEBUG) console.log("DEBUG clinics #2 : ", clinics) // DEBUG

    // from backendTest.js line 76:82
    if (!query.date) {
        clinics.forEach((val) => {
            val.healthCenters.forEach((v) => {
                healthCentersArray.push(v)
            })
        })
    }

    // from backendTest.js line 84:88
    healthCenters = healthCentersArray.filter(function (value) {
        return !this[value.id] && (this[value.id] = true)
    }, Object.create(null))

    schedules = result

    // from backendTest.js line 90:102
    // grouping list of schedule by healthCenter but default sorting by endtime from agregate
    if (query.date) {
        schedules = schedules.reduce(function (res, currentValue) {
            if (res.indexOf(currentValue.healthCenter.id) === -1) {
                res.push(currentValue.healthCenter.id)
            }
            return res
        }, []).map(function (healthCenterId) {
            return schedules.filter(function (el) {
                return el.healthCenter.id === healthCenterId
            }).map(function (el) { return el })
        }).concatAll()
    }
    if (DEBUG) console.log("DEBUG schedules : ", schedules) // DEBUG

    let data = {
        schedule: schedules.length > 0 ? schedules[0] : null,
        practiceLocations: healthCenters.length > 0 ? healthCenters : []
    }

    if (query.date) {
        return schedules; // terminate & return schedules
    } else {
        return data;// terminate & return schedules
    }
}

const inputQuery = JSON.parse(process.argv[2]);
runQuery(inputQuery).then((result) => console.log("QUERY RESULT", result));