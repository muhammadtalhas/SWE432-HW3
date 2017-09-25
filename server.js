let fetch = require('node-fetch');
let express = require('express');
let bodyParser = require('body-parser');

//NASA Api constants
const baseURL = "https://api.nasa.gov/neo/rest/v1/feed?";
const apiKey = "aQrVloEcD9iUyUxAuWup8KodIyE0RyeLQNZQmUjx";

// Will hold cached data
let cachedData = [];
// Express
let app = express();


// function to build URI with passed in params. Defaulted endDate will be startDate
buildURI = (startDate, endDate = 0) => {
    return (endDate !== 0) ? `${baseURL}start_date=${startDate}&end_date=${endDate}&detailed=false&api_key=${apiKey}` : `${baseURL}start_date=${startDate}&end_date=${startDate}&detailed=false&api_key=${apiKey}`
};

// A single astroid data
class nearEarthObject {
    constructor(name, magnitude = 0, diameter_feet = -1, hazard, date, velocity, distance_miles, orbit = null) {
        this.name = name;
        this.magnitude = magnitude;
        this.diameter = diameter_feet;
        this.hazard = hazard;
        this.date = date;
        this.velocity = velocity;
        this.distance = distance_miles;
        this.orbit = orbit;
    }
}

// One single day
class day {
    constructor(date, nearearthobjectsarray = []) {
        this.date = date;
        this.nearearthobjectsarray = nearearthobjectsarray;
        // Use this to add a new astroid
        this.addNeo = (NEO) => {
            this.nearearthobjectsarray.push(NEO);
        }
    }
}

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Default port is 8080
let port = process.env.PORT || 8080;

// GET returns data on a specifc date. Will be looked up once then added to cache for future requests
app.get('/date/:date', (req, res) => {
    for (let date of cachedData) {
        if (req.params.date === date.date) {
            res.send(date);
            return; // return stops further execution
        }
    }
    fetch(buildURI(req.params.date)).then(function (response) {
        return response.json();
    }).then(function (response) {
        let object = response["near_earth_objects"][req.params.date];
        let newDate = new day(req.params.date);
        for (let objs of object) {
            let dia = objs.estimated_diameter;
            let close = objs.close_approach_data[0];
            let NEO = new nearEarthObject(objs.name, objs.absolute_magnitude_h, dia.feet, objs.is_potentially_hazardous_asteroid,
                close.close_approach_date, close.relative_velocity, close.miss_distance.miles, close.orbiting_body);
            newDate.addNeo(NEO);
        }
        cachedData.push(newDate);
        res.send(newDate)
    })
})

app.get('/asteroid/fastest/:date', (req, res) => {
    for (let date of cachedData) {
        if (req.params.date === date.date) {
            let responseNEO = null
            date.nearearthobjectsarray.map((NEO) => {
                if (responseNEO === null) {
                    responseNEO = NEO;
                } else {
                    if (NEO.velocity > responseNEO.velocity) {
                        responseNEO = NEO;
                    }
                }
            });
            res.send(responseNEO);
            return; // return stops further execution
        }
    }
    fetch(buildURI(req.params.date)).then(function (response) {
        return response.json();
    }).then(function (response) {
        let object = response["near_earth_objects"][req.params.date];
        let newDate = new day(req.params.date);
        for (let objs of object) {
            let dia = objs.estimated_diameter;
            let close = objs.close_approach_data[0];
            let NEO = new nearEarthObject(objs.name, objs.absolute_magnitude_h, dia.feet, objs.is_potentially_hazardous_asteroid,
                close.close_approach_date, close.relative_velocity, close.miss_distance.miles, close.orbiting_body);
            newDate.addNeo(NEO);
        }
        cachedData.push(newDate);

        let responseNEO = null
        newDate.nearearthobjectsarray.map((NEO) => {
            if (responseNEO === null) {
                responseNEO = NEO;
            } else {
                if (NEO.velocity > responseNEO.velocity) {
                    responseNEO = NEO;
                }
            }
        });
        res.send(responseNEO)
    })
})

app.get('/asteroid/hazard/:date', (req, res) => {
    for (let date of cachedData) {
        if (req.params.date === date.date) {
            let responseArr = []
            date.nearearthobjectsarray.map((NEO) => {
                if (NEO.hazard) {
                    responseArr.push(NEO)
                }
            });
            if (responseArr.length !== 0) {
                res.send(responseArr);
            } else {
                res.send({"error": "No Hazards!"})
            }
            return; // return stops further execution
        }
    }
    fetch(buildURI(req.params.date)).then(function (response) {
        return response.json();
    }).then(function (response) {
        let object = response["near_earth_objects"][req.params.date];
        let newDate = new day(req.params.date);
        for (let objs of object) {
            let dia = objs.estimated_diameter;
            let close = objs.close_approach_data[0];
            let NEO = new nearEarthObject(objs.name, objs.absolute_magnitude_h, dia.feet, objs.is_potentially_hazardous_asteroid,
                close.close_approach_date, close.relative_velocity, close.miss_distance.miles, close.orbiting_body);
            newDate.addNeo(NEO);
        }
        cachedData.push(newDate);

        let responseArr = []
        newDate.nearearthobjectsarray.map((NEO) => {
            if (NEO.hazard) {
                responseArr.push(NEO)
            }
        });
        if (responseArr.length !== 0) {
            res.send(responseArr);
        } else {
            res.send({"error": "No Hazards!"})
        }
    })
})

app.get('/asteroid/averageSpeed/:date', (req, res) => {
    for (let date of cachedData) {
        if (req.params.date === date.date) {
            let avgMPH = 0;
            let avgKPH = 0;
            let avgKPS = 0;
            let count = 0;
            date.nearearthobjectsarray.map((NEO) => {
                avgMPH += parseFloat(NEO.velocity.miles_per_hour);
                avgKPH += parseFloat(NEO.velocity.kilometers_per_hour);
                avgKPS += parseFloat(NEO.velocity.kilometers_per_second);
                count++
            });

            avgMPH /= count
            avgKPH /= count
            avgKPS /= count
            res.send({
                "date": req.params.date,
                "avgMPH": avgMPH,
                "avgKPH": avgKPH,
                "avgKPS": avgKPS
            })
            return; // return stops further execution
        }
    }
    fetch(buildURI(req.params.date)).then(function (response) {
        return response.json();
    }).then(function (response) {
        let object = response["near_earth_objects"][req.params.date];
        let newDate = new day(req.params.date);
        for (let objs of object) {
            let dia = objs.estimated_diameter;
            let close = objs.close_approach_data[0];
            let NEO = new nearEarthObject(objs.name, objs.absolute_magnitude_h, dia.feet, objs.is_potentially_hazardous_asteroid,
                close.close_approach_date, close.relative_velocity, close.miss_distance.miles, close.orbiting_body);
            newDate.addNeo(NEO);
        }
        cachedData.push(newDate);

        let avgMPH = 0;
        let avgKPH = 0;
        let avgKPS = 0;
        let count = 0;
        newDate.nearearthobjectsarray.map((NEO) => {
            avgMPH += parseFloat(NEO.velocity.miles_per_hour);
            avgKPH += parseFloat(NEO.velocity.kilometers_per_hour);
            avgKPS += parseFloat(NEO.velocity.kilometers_per_second);
            count++;
        });

        avgMPH = avgMPH / count;
        avgKPH = avgKPH / count;
        avgKPS = avgKPS / count;
        res.send({
            "date": req.params.date,
            "avgMPH": avgMPH,
            "avgKPH": avgKPH,
            "avgKPS": avgKPS
        })
    })
})

app.get('/asteroid/averageDistance/:date', (req, res) => {
    for (let date of cachedData) {
        if (req.params.date === date.date) {
            let avgDis = 0;
            let count = 0;
            date.nearearthobjectsarray.map((NEO) => {
                avgDis += parseFloat(NEO.distance);
                count++
            });

            avgDis /= count
            res.send({
                "date": req.params.date,
                "avgDis_miles": avgDis,
            })
            return; // return stops further execution
        }
    }
    fetch(buildURI(req.params.date)).then(function (response) {
        return response.json();
    }).then(function (response) {
        let object = response["near_earth_objects"][req.params.date];
        let newDate = new day(req.params.date);
        for (let objs of object) {
            let dia = objs.estimated_diameter;
            let close = objs.close_approach_data[0];
            let NEO = new nearEarthObject(objs.name, objs.absolute_magnitude_h, dia.feet, objs.is_potentially_hazardous_asteroid,
                close.close_approach_date, close.relative_velocity, close.miss_distance.miles, close.orbiting_body);
            newDate.addNeo(NEO);
        }
        cachedData.push(newDate);

        let avgDis = 0;
        let count = 0;
        newDate.nearearthobjectsarray.map((NEO) => {
            avgDis += parseFloat(NEO.distance);
            count++
        });

        avgDis /= count
        res.send({
            "date": req.params.date,
            "avgDis_miles": avgDis,
        })
    })
})

app.post('/asteroid/addNew/:date', (req, res) => {
        if (req.params.date &&
            req.body.name &&
            req.body.date &&
            req.body.hazard !== null &&
            req.body.distance &&
            req.body.velocity.miles_per_hour &&
            req.body.velocity.kilometers_per_hour &&
            req.body.velocity.kilometers_per_second) {

            for (let date of cachedData) {
                if (req.params.date === date.date) {

                    for (let obj of date.nearearthobjectsarray) {
                        if (obj.name === req.body.name) {
                            res.sendStatus(400)
                            return;
                        }
                    }

                    let newName = req.body.name;
                    let newMagnitude = (req.body.magnitude) ? req.body.magnitude : null;
                    let newDiameter = (req.body.diameter) ? req.body.diameter : null;
                    let newHazard = req.body.hazard;
                    let newDateVal = req.params.date;
                    let newVelocity = req.body.velocity;
                    let newDistance = req.body.distance;
                    let newOrbit = (req.body.orbit) ? req.body.orbit : null;

                    let newNeo = new nearEarthObject(newName, newMagnitude, newDiameter, newHazard, newDateVal, newVelocity, newDistance, newOrbit)

                    date.nearearthobjectsarray.push(newNeo);
                    res.sendStatus(200);
                    return;
                }
            }
            fetch(buildURI(req.params.date)).then(function (response) {
                return response.json();
            }).then(function (response) {
                let object = response["near_earth_objects"][req.params.date];
                let newDate = new day(req.params.date);
                for (let objs of object) {
                    let dia = objs.estimated_diameter;
                    let close = objs.close_approach_data[0];
                    let NEO = new nearEarthObject(objs.name, objs.absolute_magnitude_h, dia.feet, objs.is_potentially_hazardous_asteroid,
                        close.close_approach_date, close.relative_velocity, close.miss_distance.miles, close.orbiting_body);
                    newDate.addNeo(NEO);
                }
                let newName = req.body.name;
                let newMagnitude = (req.body.magnitude) ? req.body.magnitude : null;
                let newDiameter = (req.body.diameter) ? req.body.diameter : null;
                let newHazard = req.body.hazard;
                let newDateVal = req.params.date;
                let newVelocity = req.body.velocity;
                let newDistance = req.body.distance;
                let newOrbit = (req.body.orbit) ? req.body.orbit : null;

                let newNeo = new nearEarthObject(newName, newMagnitude, newDiameter, newHazard, newDateVal, newVelocity, newDistance, newOrbit)

                for (let obj of newDate.nearearthobjectsarray) {
                    if (obj.name === req.body.name) {
                        cachedData.push(newDate);
                        res.sendStatus(400)
                        return;
                    }
                }
                newDate.nearearthobjectsarray.push(newNeo);
                cachedData.push(newDate);
                res.sendStatus(200)
                return;
            })


        } else {
            res.sendStatus(400)
        }
    }
)

app.put('/asteroid/update/:date', (req, res) => {
    if (req.params.date &&
        req.body.name &&
        req.body.date &&
        req.body.hazard !== null &&
        req.body.distance &&
        req.body.velocity.miles_per_hour &&
        req.body.velocity.kilometers_per_hour &&
        req.body.velocity.kilometers_per_second) {

        for (let date of cachedData) {
            if (req.params.date === date.date) {
                for (let index in date.nearearthobjectsarray) {
                    if (date.nearearthobjectsarray[index].name === req.body.name) {

                        let newName = req.body.name;
                        let newMagnitude = (req.body.magnitude) ? req.body.magnitude : null;
                        let newDiameter = (req.body.diameter) ? req.body.diameter : null;
                        let newHazard = req.body.hazard;
                        let newDateVal = req.params.date;
                        let newVelocity = req.body.velocity;
                        let newDistance = req.body.distance;
                        let newOrbit = (req.body.orbit) ? req.body.orbit : null;

                        let newNeo = new nearEarthObject(newName, newMagnitude, newDiameter, newHazard, newDateVal, newVelocity, newDistance, newOrbit)

                        date.nearearthobjectsarray.splice(index, 1);
                        date.nearearthobjectsarray.push(newNeo);
                        res.sendStatus(200)
                        return;

                    }
                }
                res.sendStatus(400)
                return
            }
        }
        fetch(buildURI(req.params.date)).then(function (response) {
            return response.json();
        }).then(function (response) {
            let object = response["near_earth_objects"][req.params.date];
            let newDate = new day(req.params.date);
            for (let objs of object) {
                let dia = objs.estimated_diameter;
                let close = objs.close_approach_data[0];
                let NEO = new nearEarthObject(objs.name, objs.absolute_magnitude_h, dia.feet, objs.is_potentially_hazardous_asteroid,
                    close.close_approach_date, close.relative_velocity, close.miss_distance.miles, close.orbiting_body);
                newDate.addNeo(NEO);
            }
            let newName = req.body.name;
            let newMagnitude = (req.body.magnitude) ? req.body.magnitude : null;
            let newDiameter = (req.body.diameter) ? req.body.diameter : null;
            let newHazard = req.body.hazard;
            let newDateVal = req.params.date;
            let newVelocity = req.body.velocity;
            let newDistance = req.body.distance;
            let newOrbit = (req.body.orbit) ? req.body.orbit : null;

            let newNeo = new nearEarthObject(newName, newMagnitude, newDiameter, newHazard, newDateVal, newVelocity, newDistance, newOrbit)

            for (let index in newDate.nearearthobjectsarray) {
                if (newDate.nearearthobjectsarray[index].name === req.body.name) {
                    newDate.nearearthobjectsarray.splice(index, 1);
                    newDate.nearearthobjectsarray.push(newNeo)
                    cachedData.push(newDate);
                    res.sendStatus(200)
                    return;
                }
            }
            cachedData.push(newDate);
            res.sendStatus(400)
            return;
        })
    } else {
        res.sendStatus(400)
    }
})


app.delete('/date/delete/:date', (req, res) => {
    for (let index in cachedData) {
        if (cachedData[index].date === req.params.date){
            cachedData.splice(index, 1);
            res.sendStatus(200)
            return;
        }
    }
    res.sendStatus(400);
})

app.listen(port, function () {
    console.log("( ͡° ͜ʖ ͡°) Hi! Im Mr. Lenny. Visit me on " + port)
});
