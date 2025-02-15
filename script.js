'use strict'
/* URL / URIs / YAML данных */
// базовый URL
const URL_F1DB = 'https://raw.githubusercontent.com/f1db/f1db/refs/heads/main/src/data';

// URI каталогов с yaml данных
const URI_CIRCUITS     = 'circuits';             // трассы
const URI_CONSTRUCTORS = 'constructors';         // конструкторы
const URI_DRIVERS      = 'drivers';              // пилоты
const URI_ENGINES      = 'engine-manufacturers'; // двигатели
const URI_GRANDS_PRIX  = 'grands-prix';          // Гран При
const URI_SEASONS      = 'seasons';              // сезоны
const URI_SEASON_RACES = 'races';                // этапы

/* названия yaml-файлов данных */
const YAML_CONSTRUCTOR_STANDINGS = 'constructor-standings.yml';      // чемпионат конструкторов
const YAML_DRIVER_STANDINGS      = 'driver-standings.yml';           // чемпионат пилотов
const YAML_ENTRANTS              = 'entrants.yml';                   // список участников

const YAML_RACE              = 'race.yml';                           // информация об этапе

const YAML_RACE_QUALIFYING   = 'qualifying-results.yml'              // результаты квалификации
const YAML_RACE_RESULTS      = 'race-results.yml';                   // результаты гонки
const YAML_RACE_FLAPS        = 'fastest-laps.yml';                   // лучшие круги

const YAML_SPRINT_QUALIFYING = 'sprint-qualifying-results.yml'       // результаты квалификации спринта
const YAML_SPRINT_RESULTS    = 'sprint-race-results.yml';            // результаты  спринта

const YAMLS_RACE_RESULTS   = [YAML_RACE_QUALIFYING, YAML_RACE_RESULTS, YAML_RACE_FLAPS];
const YAMLS_SPRINT_RESULTS = [YAML_SPRINT_QUALIFYING, YAML_SPRINT_RESULTS];

const REGEXP_SPLIT = /\r?\n/;

/* текущий сезон */
const CURRENT_SEASON = 2024;

/* этапы */
const RACES  = [
    'bahrain',
    'saudi-arabia',
    'australia',
    'japan',
    'china',
    'miami',
    'emilia-romagna',
    'monaco',
    'canada',
    'spain',
    'austria',
    'great-britain',
    'hungary',
    'belgium',
    'netherlands',
    'italy',
    'azerbaijan',
    'singapore',
    'united-states',
    'mexico',
    'sao-paulo',
    'las-vegas',
    'qatar',
    'abu-dhabi',
];

/* этапы со спринтами */
const SPRINTS = [];

const _dateTime2UTC  = (date, time) => Date.length ? Date.parse(date + (time.length ? (' ' + time) : '')) : NaN;
const _race2URI      = (round, grandPrixId) => [round.toString().padStart(2, '0'), grandPrixId].join('-');

const _line2KeyValue = line => {
    if ('string' === typeof line && line.includes(':')) {
        line = line.split(':');

        let key   = line.shift().replace(/\-/, '').trim();
        let value = line.map(value => value.trim()).join(':');

        return [key, value];
    } else {
        return [null, null];
    }
}

const _parseSimpleYAML = data => {
    let tempObject = Object.create(null);

    data = data.split(REGEXP_SPLIT).filter(line => line.length > 0);

    data.forEach(line => {
        let [key, value] = _line2KeyValue(line);
        if (key) {
            tempObject[key] = value;
        }
    });

    return tempObject;
}

let currentRace = null;

const loadingCircle = document.querySelector('.loading');

const constructorsTable  = document.querySelector('#constructors');     // чемпионат конструкторов
const driversTable       = document.querySelector('#drivers');          // чемпионат пилотов
const entrantsTable      = document.querySelector('#entrants');         // участники
const racesTable         = document.querySelector('#races');            // календарь

const raceTable          = document.querySelector('#race');             // информация об этапе
const raceQualifyTable   = document.querySelector('#race-qualifying');  // результаты квалификации к гонке
const raceResultsTable   = document.querySelector('#race-results');     // результаты гонки
const sprintQualifyTable = document.querySelector('#sprint-qualifying');// результаты квалификации к спринту
const sprintResultsTable = document.querySelector('#sprint-results');   // результаты спринта

const mainTables = [constructorsTable, driversTable, entrantsTable, racesTable];
const raceTables = [raceTable, sprintQualifyTable, sprintResultsTable, raceQualifyTable, raceResultsTable];

/* Этап */
class Race {
    round;       // этап чемпионата
    schedule;    // расписание этапа
    grandPrixId; // id Гран При
    circuitId;   // id трассы
    laps;        // кол-во кругов
    distance;    // дистанция гонки
    sprint;      // флаг наличия спринта

    constructor() {
        Object.keys(this).forEach(key => this[key] = null);
    }

    circuit() {
        let circuit = this.circuitId ? Circuits.get(this.circuitId) : null;
        return circuit || null;
    }

    grandPrix() {
        let grandPrix = this.grandPrixId ? GrandsPrix.get(this.grandPrixId) : null;
        return grandPrix || null;
    }

    // присвоение значений
    update(data) {
        this.round       = Number.parseInt(data?.round, 10) || null;
        this.grandPrixId = data?.grandPrixId || null;
        this.circuitId   = data?.circuitId || null;
        this.laps        = Number.parseInt(data?.laps, 10) || null;
        this.distance    = Number.parseFloat(data?.distance) || null;

        this.schedule = Object.create(null);

        this.schedule.qualifying = _dateTime2UTC(data?.qualifyingDate || '', data?.qualifyingTime || '');
        this.schedule.race       = _dateTime2UTC(data?.date || '', data?.time || '');

        if (
            'sprintQualifyingDate' in data && 'sprintQualifyingTime' in data
            &&
            'sprintRaceDate' in data && 'sprintRaceTime' in data
        ) {
            this.sprint = true;
            this.schedule.sprintQualifying = _dateTime2UTC(data?.sprintQualifyingDate || '', data?.sprintQualifyingTime || '');
            this.schedule.sprintRace       = _dateTime2UTC(data?.sprintRaceDate || '', data?.sprintRaceTime || '');
        }
    }
}

/* справочники сущностей */
const Circuits     = new Map(); // трассы
const Constructors = new Map(); // конструкторы
const Drivers      = new Map(); // пилоты
const Engines      = new Map(); // двигатели
const GrandsPrix   = new Map(); // Гран При
const Races        = new Map(); // этапы

/* Предварительный вывод racesTable на основе RACES */
(function() {
    const tbody = racesTable.querySelector('tbody');
    const tmpl  = document.querySelector('#races-template');

    RACES.forEach((grandPrixId, i) => {
        // предварительное заполнение наборов данных
        Races.set(grandPrixId, null);
        GrandsPrix.set(grandPrixId, null);

        // предварительный вывод Calendar
        let round = i + 1;

        let tr = document.importNode(tmpl.content, true);
        let td = tr.querySelectorAll('td');

        td[0].textContent = round;

        let a  = td[3].querySelector('a');
        a.href        = _race2URI(round, grandPrixId);
        a.textContent = grandPrixId;
        a.addEventListener('click', e => {
            e.preventDefault();

            currentRace = e.target.closest('tr').dataset.id;
            loadGrandPrix();

            history.pushState(currentRace, '', currentRace);
        });

        td.forEach(el => el.style.whiteSpace = 'nowrap');
        tbody.appendChild(tr);
        tbody.lastElementChild.setAttribute('data-id', grandPrixId);
    });
})();

/* Импорт ConstructorStandings, DriverStandings, Entrants с импортом Constructors, Drivers и Engines */
/* Предварительный вывод constructorsTable, driversTable, entrantsTable */
(function() {
    const URL  = [URL_F1DB, URI_SEASONS, CURRENT_SEASON];
    const URLs = [
        [...URL, YAML_CONSTRUCTOR_STANDINGS].join('/'),
        [...URL, YAML_DRIVER_STANDINGS].join('/'),
        [...URL, YAML_ENTRANTS].join('/'),
    ];

    let ConstructorStandings = [];
    let DriverStandings      = [];
    let Entrants             = [];

    Promise.all(
        URLs.map(url => fetch(url).then(response => response.text()))
    )
    .then(results => {
        results.forEach(data => {
            let source = null; // источник данных

            if (data.includes('entrantId')) {
                source = YAML_ENTRANTS;
            } else if (data.includes('constructorId')) {
                source = YAML_CONSTRUCTOR_STANDINGS;
            } else if (data.includes('driverId')) {
                source = YAML_DRIVER_STANDINGS;
            }

            data = data.split(REGEXP_SPLIT);

            let tempObject = Object.create(null);

            for (let i = 0; i < data.length; i ++) {
                let [key, value] = _line2KeyValue(data[i]);

                switch (key) {
                    case 'position': {
                        value = Number.parseInt(value);

                        if ('position' in tempObject && 'points' in tempObject) {
                            if (YAML_CONSTRUCTOR_STANDINGS == source) {
                                ConstructorStandings.push(tempObject);
                            } else if (YAML_DRIVER_STANDINGS == source) {
                                DriverStandings.push(tempObject);
                            }

                            tempObject = Object.create(null);
                        }

                        tempObject.position = value;
                        break;
                    }

                    case 'constructorId': {
                        tempObject.constructorId = value;

                        if (Constructors.has(tempObject.constructorId)) {
                            //
                        } else {
                            // получение названия конструктора
                            Constructors.set(tempObject.constructorId, tempObject.constructorId);
                        }

                        break;
                    }

                    case 'driverId': {
                        let driverId = value;

                        if (YAML_DRIVER_STANDINGS == source) {
                            tempObject.driverId = driverId;
                        } else if (YAML_ENTRANTS == source) {
                            let [key1, value1] = _line2KeyValue(data[i + 1]); // rounds
                            let [key2, value2] = _line2KeyValue(data[i + 2]); // testDriver?

                            // у данного участника данный пилот числится только тест-пилотом
                            if ((0 == value1.length) && ('testDriver' == key2)) break;

                            tempObject.drivers.push(driverId);
                        }

                        if (Drivers.has(driverId)) break;

                        // получение имени пилота
                        let tempDriver = Object.create(null);
                        tempDriver.name = driverId;
                        tempDriver.permanentNumber = null;

                        Drivers.set(driverId, tempDriver);

                        break;
                    }

                    case 'drivers': {
                        tempObject.drivers = [];
                        break;
                    }

                    case 'engineManufacturerId': {
                        tempObject.engineId = value;

                        if (Engines.has(tempObject.engineId)) {
                            //
                        } else {
                            // получение названия двигателя
                            Engines.set(tempObject.engineId, tempObject.engineId);
                        }

                        break;
                    }

                    case 'entrantId': {
                        if ('constructorId' in tempObject && 'drivers' in tempObject && 'engineId' in tempObject) {
                            Entrants.push(tempObject);

                            tempObject = Object.create(null);
                        }
                        break;
                    }

                    case 'points': {
                        tempObject.points = parseInt(value);
                        break;
                    }
                }
            }

            if (YAML_CONSTRUCTOR_STANDINGS == source) {
                ConstructorStandings.push(tempObject);
            } else if (YAML_DRIVER_STANDINGS == source) {
                DriverStandings.push(tempObject);
            } else if (YAML_ENTRANTS == source) {
                Entrants.push(tempObject);
            }
        })
    })
    .catch(error => console.log(error))
    .finally(() => {
        const tmpl = document.querySelector('#standings-template');

        // Предварительный вывод entrantsTable
        (function() {
            // сортировка по constructorId
            Entrants = Entrants.sort((a, b) => a.constructorId.localeCompare(b.constructorId));

            const tbody = entrantsTable.querySelector('tbody');
            const constructorTmpl = document.querySelector('#entrants-constructor-template');
            const engineTmpl      = document.querySelector('#entrants-engine-template');
            const driverTmpl      = document.querySelector('#entrants-driver-template');

            Entrants.forEach(entrant => {
                let tr, td;

                // constructor & engine
                if (entrant.constructorId == entrant.engineId) {
                    tr = document.importNode(constructorTmpl.content, true);
                    td = tr.querySelectorAll('td');
                } else {
                    tr = document.importNode(engineTmpl.content, true);
                    td = tr.querySelectorAll('td');

                    td[1].textContent = entrant.engineId;
                    td[1].setAttribute('data-engine', entrant.engineId);
                }

                td[0].textContent = entrant.constructorId;
                td[0].setAttribute('data-constructor', entrant.constructorId);

                td.forEach(el => el.style.whiteSpace = 'nowrap');
                tbody.appendChild(tr);

                // пилоты
                entrant.drivers.forEach(driver => {
                    tr = document.importNode(driverTmpl.content, true);

                    td = tr.querySelectorAll('td');
                    td[1].setAttribute('data-driver', driver);
                    td[1].textContent = driver;

                    td.forEach(el => el.style.whiteSpace = 'nowrap');
                    tbody.appendChild(tr);
                });
            });

            entrantsTable.hidden = (null != currentRace);
        })();

        // Предварительный вывод constructorsTable
        (function() {
            // сортировка по position
            ConstructorStandings = ConstructorStandings.sort((a, b) => a.position - b.position);

            const tbody = constructorsTable.querySelector('tbody');

            ConstructorStandings.forEach(standing => {
                let tr = document.importNode(tmpl.content, true);
                let td = tr.querySelectorAll('td');

                td[0].textContent = standing.position;

                let innerHTML = [];

                innerHTML.push('<span data-constructor="' + standing.constructorId + '">');
                innerHTML.push(standing.constructorId);
                innerHTML.push('</span>');

                if (standing.constructorId != standing.engineId) {
                    innerHTML.push(' ');
                    innerHTML.push('<span data-engine="' + standing.engineId + '">');
                    innerHTML.push(standing.engineId);
                    innerHTML.push('</span>');
                }

                td[1].innerHTML   = innerHTML.join('');
                td[2].textContent = standing.points;

                td.forEach(el => el.style.whiteSpace = 'nowrap');
                tbody.appendChild(tr);
            });

            // импорт Constructors, Engines
            (function() {
                const URLs = [];

                Array.from(Constructors.keys()).forEach(constructorId => {
                    URLs.push([URL_F1DB, URI_CONSTRUCTORS, constructorId + '.yml'].join('/'))
                });

                Array.from(Engines.keys()).forEach(engineId => {
                    URLs.push([URL_F1DB, URI_ENGINES, engineId + '.yml'].join('/'))
                });

                Promise.all(
                    URLs.map(url => fetch(url).then(response => response.text()))
                )
                .then(results => {

                    results.forEach(data => {
                        data = _parseSimpleYAML(data);

                        if ('name' in data) {
                            if ('fullName' in data) {
                                Constructors.set(data.id, data.name);
                            } else {
                                Engines.set(data.id, data.name);
                            }
                        }
                    });

                })
                .catch(error => console.log(error))
                .finally(() => {
                    // Заполнение constructorsTable, entrantsTable
                    Constructors.forEach((name, id) =>
                        document.querySelectorAll('[data-constructor="' + id + '"]').forEach(node => node.textContent = name)
                    )

                    Engines.forEach((name, id) =>
                        document.querySelectorAll('[data-engine="' + id + '"]').forEach(node => node.textContent = name)
                    )

                    constructorsTable.hidden = (null != currentRace);
                });

            })();

        })();

        // Предварительный вывод driversTable
        (function() {
            // сортировка по position
            DriverStandings = DriverStandings.sort((a, b) => a.position - b.position);

            const tbody = driversTable.querySelector('tbody');

            DriverStandings.forEach(standing => {
                let tr = document.importNode(tmpl.content, true);
                let td = tr.querySelectorAll('td');

                td[0].textContent = standing.position;
                td[1].textContent = standing.driverId;
                td[1].setAttribute('data-driver', standing.driverId);
                td[2].textContent = standing.points;

                td.forEach(el => el.style.whiteSpace = 'nowrap');
                tbody.appendChild(tr);
            });

            // импорт Drivers
            (function() {
                const URLs = [];

                Array.from(Drivers.keys()).forEach(driverId => {
                    URLs.push([URL_F1DB, URI_DRIVERS, driverId + '.yml'].join('/'))
                });

                Promise.all(
                    URLs.map(url => fetch(url).then(response => response.text()))
                )
                .then(results => {

                    results.forEach(data => {
                        data = _parseSimpleYAML(data);

                        const tempObject = Object.create(null);

                        if ('id' in data && 'name' in data) {
                            tempObject.name = data.name;
                            tempObject.permanentNumber = data?.permanentNumber ? parseInt(data.permanentNumber) : null;

                            Drivers.set(data.id, tempObject);
                        }
                    });

                })
                .catch(error => console.log(error))
                .finally(() => {
                    // Заполнение driversTable, entrantsTable

                    entrantsTable.querySelectorAll('[data-driver]').forEach(node => {
                        let driver = Drivers.get(node.dataset.driver);
                        let td     = node.parentNode.querySelectorAll('td');

                        // Verstappen case
                        td[0].textContent = (33 == driver.permanentNumber) ? 1 : driver.permanentNumber;
                        td[1].textContent = driver.name;
                    });

                    driversTable.querySelectorAll('[data-driver]').forEach(node => {
                        node.textContent = Drivers.get(node.dataset.driver).name;
                    });

                    driversTable.hidden = (null != currentRace);
                });

            })();

        })();

    });

})();

/* Импорт Races и GrandsPrix */
/* Заполнение racesTable */
/* Импорт Circuits на основе Races */
(function () {
    const URL  = [URL_F1DB, URI_SEASONS, CURRENT_SEASON, URI_SEASON_RACES];
    const URLs = [];

    RACES.forEach((grandPrixId, i) => {
        // календарь этапов
        let round   = i + 1;
        let currURL = [...URL, _race2URI(round, grandPrixId), YAML_RACE];

        URLs.push(currURL.join('/'));
        URLs.push([URL_F1DB, URI_GRANDS_PRIX, grandPrixId + '.yml'].join('/'));
    });

    Promise.all(
        URLs.map(url => fetch(url).then(response => response.text()))
    ).then(results => {
        // Гран При
        class GrandPrix {
            id;
            name;
            fullName;

            constructor() {
                Object.keys(this).forEach(key => this[key] = null);
            }

            // присвоение значений
            update(data) {
                Object.keys(this).forEach(key => this[key] = (key in data) ? data[key] : null);
            }
        }

        results.forEach(data => {
            if (data.length > 1) {
                let tempObject = _parseSimpleYAML(data);

                if ('grandPrixId' in tempObject) {
                    // этап
                    let race = new Race();
                    race.update(tempObject);

                    if (race.grandPrixId) {
                        Races.set(race.grandPrixId, race);
                    }
                } else {
                    // Гран При
                    let grandPrix = new GrandPrix();
                    grandPrix.update(tempObject);

                    if (grandPrix.id) {
                        GrandsPrix.set(grandPrix.id, grandPrix);
                    }
                }
            }
        });

    })
    .catch(error => console.log(error))
    .finally(() => {

        // Импорт Circuits на основе Races
        (function () {
            let URLs = [];

            Array.from(Races.values()).map(race => race.circuitId).forEach(circuitId => {
                Circuits.set(circuitId, null);
                URLs.push([URL_F1DB, URI_CIRCUITS, circuitId + '.yml'].join('/'));
            });

            Promise.all(
                URLs.map(url => fetch(url).then(response => response.text()))
            ).then(data => {
                data.forEach(circuit => {
                    if (circuit.length > 1) {
                        circuit = _parseSimpleYAML(circuit);
                        if ('id' in circuit && 'fullName' in circuit) {
                            Circuits.set(circuit.id, circuit.fullName);
                        }
                    }
                });

                if (currentRace != null && Races.has(currentRace)) {
                    let race = Races.get(currentRace);
                    raceTable.querySelector('span').textContent = race.circuit();
                }
            })
            .catch(error => console.log(error))
            .finally(() => loadingCircle.hidden = true);

        })();

        const dateOptions = {day: 'numeric', year: 'numeric'};
        dateOptions.month = (document.body.clientWidth < 480) ? 'short' : 'long';
        const timeOptions = {hour: 'numeric', minute: 'numeric', hour12: false};

        // Заполнение racesTable
        Races.forEach(race => {
            let dtime = new Date(race.schedule.race - 60 * 1000 * (new Date).getTimezoneOffset());

            let tr = racesTable.querySelector('[data-id="' + race.grandPrixId + '"]');
            let td = tr.querySelectorAll('td');

            if (race.sprint) {
                td[0].innerHTML = '<span class="badge" data-badge="s">' + race.round + '</span>';
                SPRINTS.push(race.grandPrixId);
            }
            td[1].textContent = new Intl.DateTimeFormat('en-US', dateOptions).format(dtime);
            td[2].textContent = new Intl.DateTimeFormat('en-US', timeOptions).format(dtime);
            td[3].querySelector('a').textContent = race.grandPrix()?.name || race.grandPrixId;
        });

        racesTable.hidden = (null != currentRace)
    });

})();

/* back to main page */
(function () {
    let a = raceTable.querySelector('a');
    a.addEventListener('click', e => {
        e.preventDefault();

        currentRace = null;
        history.pushState(currentRace, '', document.location.pathname.split('/').slice(0, -1).join('/') + '/');

        loadGrandPrix();
    });
})();

window.addEventListener('popstate', e => {
    currentRace = e.state;
    loadGrandPrix();
});

const loadGrandPrix = () => {
    if (RACES.includes(currentRace)) {
        // загрузка Гран При
        loadingCircle.hidden = false;

        mainTables.forEach(t => t.hidden = true);

        let race = Races.get(currentRace);

        (function () {
            raceTable.querySelector('big').textContent = race.grandPrix().fullName;
            raceTable.querySelector('span').textContent = race.circuit();

            let desc = [];
            desc.push('round ' + race.round + ' of ' + RACES.length);
            desc.push(race.laps + ' laps (' + race.distance + ' km)');
            raceTable.querySelector('td').textContent = desc.join(', ');

            raceTable.hidden = false;
        })();

        const dateTimeOptions = {
            month:  'long',
            day:    'numeric',
            year:   'numeric',
            hour:   'numeric',
            minute: 'numeric',
            hour12: false
        };

        const raceURL = [URL_F1DB, URI_SEASONS, CURRENT_SEASON, URI_SEASON_RACES, _race2URI(race.round, race.grandPrixId)];

        class Result {
            position;
            driverNumber;
            driverId;
            constructorId;
            engineId; // engineManufacturerId
            q1;
            q2;
            q3;
            laps;
            time;
            gap;
            points;
            start; // start position

            constructor() {
                Object.keys(this).forEach(key => this[key] = null);
            }

            constructorEngine() {
                let value = [];
                value.push(Constructors.has(this.constructorId) ? Constructors.get(this.constructorId) : this.constructorId);
                if (this.constructorId != this.engineId) {
                    value.push(Engines.has(this.engineId) ? Engines.get(this.engineId) : this.engineId);
                }
                return value.join(' ');
            }

            // присвоение значений
            update(data) {
                Object.keys(this).forEach(key => this[key] = (key in data) ? data[key] : null);
            }
        }

        // Qualifyng Results
        (function () {
            let dateTimeCell = raceQualifyTable.querySelectorAll('thead tr th')[1];

            if (isNaN(race.schedule.qualifying)) {
                dateTimeCell.textContent = '';
            } else {
                let dtime = new Date(race.schedule.qualifying - 60 * 1000 * (new Date).getTimezoneOffset());
                dateTimeCell.textContent = new Intl.DateTimeFormat('en-US', dateTimeOptions).format(dtime);
            }

            let currURL = [...raceURL, YAML_RACE_QUALIFYING].join('/');

            fetch(currURL).then(function(response) {
                if (response.ok) {
                    return Promise.resolve(response);
                } else {
                    console.log(response.status, response.statusText);
                    return Promise.reject(new Error(response.status));
                }
            }).then(response => response.text())
            .then(data => {
                data = data.split(REGEXP_SPLIT);
                console.log(data);

                let Results = [];
                let result  = new Result();

                for (let i = 0; i < data.length; i ++) {
                    let [key, value] = _line2KeyValue(data[i]);

                    switch (key) {
                    }
                }

            }).finally(() => {
                raceQualifyTable.hidden = false
            });

        })();

        loadingCircle.hidden = true;
    } else {
        // отображение главной страницы
        currentRace = null;
        raceTables.forEach(t => t.hidden = true);
        mainTables.forEach(t => t.hidden = false);
    }
}

currentRace = document.location.pathname.split('/').pop();
currentRace = RACES.includes(currentRace) ? currentRace : null;

if (currentRace != null) {
    setTimeout(() => { loadGrandPrix() }, 2000);
}
